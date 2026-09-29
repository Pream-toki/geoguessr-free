import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouter } from "../server/routes";
import { gameStore, type GameSession } from "../server/gameStore";
import { pickPanoLocation, fetchImageCoords, resetSeedCache, seedCount, type PickerDeps } from "../server/picker";
import { REGIONS, pickRandomRegion, randomPointInRegion } from "../server/regions";

const TOKEN = "test-token";

describe("picker", () => {
  beforeEach(() => resetSeedCache());

  function mockFetch(responses: Array<{ status?: number; body: unknown }>) {
    let call = 0;
    const fetchFn = vi.fn(async () => {
      const r = responses[Math.min(call, responses.length - 1)];
      call++;
      return {
        ok: (r.status ?? 200) >= 200 && (r.status ?? 200) < 300,
        status: r.status ?? 200,
        json: async () => r.body,
      } as unknown as Response;
    });
    return fetchFn;
  }

  it("picks from the seed file when available", async () => {
    resetSeedCache();
    // Temporarily point the seed loader at a temp file is not exposed;
    // instead we ensure seedCount() reflects the real file (may be 0 pre-build).
    const seeds = seedCount();
    const deps: PickerDeps = {
      token: TOKEN,
      fetchFn: mockFetch([]), // live queries return nothing
      rng: () => 0.99, // force the live path (rng > 1/4)
      maxAttempts: 1,
    };
    const result = await pickPanoLocation(deps);
    if (seeds === 0) {
      expect(result).toBeNull();
    } else {
      expect(result).not.toBeNull();
      expect(typeof result!.imageId).toBe("string");
    }
  });

  it("falls back to live bbox query when seeds are empty", async () => {
    resetSeedCache();
    const deps: PickerDeps = {
      token: TOKEN,
      fetchFn: mockFetch([
        {
          body: {
            data: [
              {
                id: "img-1",
                is_pano: true,
                computed_geometry: { coordinates: [2.35, 48.85] },
              },
            ],
          },
        },
      ]),
      rng: () => 0.99,
      maxAttempts: 2,
    };
    const result = await pickPanoLocation(deps);
    expect(result).not.toBeNull();
    expect(result!.imageId).toBe("img-1");
    expect(result!.lat).toBeCloseTo(48.85, 5);
    expect(result!.lng).toBeCloseTo(2.35, 5);
  });

  it("retries with widening boxes until a pano is found", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { data: [] } },
      { status: 200, body: { data: [] } },
      {
        status: 200,
        body: {
          data: [
            { id: "img-2", is_pano: true, computed_geometry: { coordinates: [-74.0, 40.71] } },
          ],
        },
      },
    ]);
    const result = await pickPanoLocation({
      token: TOKEN,
      fetchFn: fetchFn as unknown as typeof fetch,
      rng: () => 0.99,
      maxAttempts: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.imageId).toBe("img-2");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("returns null when all attempts fail", async () => {
    const result = await pickPanoLocation({
      token: TOKEN,
      fetchFn: mockFetch([{ body: { data: [] } }]),
      rng: () => 0.99,
      maxAttempts: 2,
    });
    expect(result).toBeNull();
  });

  it("fetchImageCoords returns coordinates for a valid image", async () => {
    const fetchFn = mockFetch([
      { body: { id: "img-9", is_pano: true, computed_geometry: { coordinates: [13.4, 52.52] } } },
    ]);
    const loc = await fetchImageCoords(fetchFn as unknown as typeof fetch, TOKEN, "img-9");
    expect(loc).not.toBeNull();
    expect(loc!.lat).toBeCloseTo(52.52, 5);
  });
});

describe("game API routes", () => {
  function setup(seedResults: Array<{ imageId: string; lat: number; lng: number } | null>) {
    const pick = vi.fn(async () => seedResults.length ? seedResults.shift()! : null);
    const router = createRouter(TOKEN, { pick });
    return { router, pick };
  }

  async function callJson(
    router: ReturnType<typeof createRouter>,
    method: "post" | "get",
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: any }> {
    // Minimal request simulation through the router layer.
    const { default: express } = await import("express");
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    const server = app.listen(0);
    await new Promise((r) => server.on("listening", r));
    const addr = server.address() as { port: number };
    const res = await fetch(`http://127.0.0.1:${addr.port}${path}`, {
      method: method.toUpperCase(),
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      console.error(`[callJson] non-JSON response for ${method.toUpperCase()} ${path}: status=${res.status} text=${JSON.stringify(text.slice(0, 200))}`);
    }
    await new Promise((r) => server.close(r));
    return { status: res.status, body: json };
  }

  beforeEach(() => {
    // Isolate sessions between tests.
    (gameStore as unknown as { sessions: Map<string, GameSession> }).sessions.clear();
  });

  it("creates a game and returns only imageId (no coordinates leak)", async () => {
    const picks = [
      { imageId: "a1", lat: 10, lng: 20 },
      { imageId: "b2", lat: -10, lng: 30 },
      { imageId: "c3", lat: 0, lng: 0 },
      { imageId: "d4", lat: 45, lng: -45 },
      { imageId: "e5", lat: -33, lng: 151 },
    ];
    const { router } = setup(picks);
    const { status, body } = await callJson(router, "post", "/api/game/new");
    expect(status).toBe(200);
    expect(body.round.imageId).toBe("a1");
    expect(JSON.stringify(body)).not.toContain('"lat"');
    expect(JSON.stringify(body)).not.toContain('"lng"');
  });

  it("returns 502 when the picker can't find locations", async () => {
    const { router } = setup([null]);
    const { status, body } = await callJson(router, "post", "/api/game/new");
    expect(status).toBe(502);
    expect(body.error).toMatch(/panorama/i);
  });

  it("scores a guess, reveals truth, and returns the next round", async () => {
    const picks = [
      { imageId: "a1", lat: 10, lng: 20 },
      { imageId: "b2", lat: -10, lng: 30 },
      { imageId: "c3", lat: 0, lng: 0 },
      { imageId: "d4", lat: 45, lng: -45 },
      { imageId: "e5", lat: -33, lng: 151 },
    ];
    const { router } = setup(picks);
    const created = await callJson(router, "post", "/api/game/new");
    const sessionId = created.body.sessionId;

    const guessed = await callJson(router, "post", `/api/game/${sessionId}/guess`, { lat: 10, lng: 20 });
    expect(guessed.status).toBe(200);
    expect(guessed.body.result.score).toBe(5000); // exact hit
    expect(guessed.body.result.truth).toEqual({ lat: 10, lng: 20 });
    expect(guessed.body.nextRound.imageId).toBe("b2");
    expect(JSON.stringify(guessed.body.nextRound)).not.toContain('"lat"');
  });

  it("rejects invalid guesses with 400", async () => {
    const { router } = setup([
      { imageId: "a1", lat: 10, lng: 20 },
      { imageId: "b2", lat: -10, lng: 30 },
      { imageId: "c3", lat: 0, lng: 0 },
      { imageId: "d4", lat: 45, lng: -45 },
      { imageId: "e5", lat: -33, lng: 151 },
    ]);
    const created = await callJson(router, "post", "/api/game/new");
    const sessionId = created.body.sessionId;

    const bad = await callJson(router, "post", `/api/game/${sessionId}/guess`, { lat: "x", lng: 20 });
    expect(bad.status).toBe(400);
    const outOfRange = await callJson(router, "post", `/api/game/${sessionId}/guess`, { lat: 91, lng: 0 });
    expect(outOfRange.status).toBe(400);
  });

  it("rejects guesses after the game is finished with 409", async () => {
    const { router } = setup([
      { imageId: "a1", lat: 10, lng: 20 },
      { imageId: "b2", lat: -10, lng: 30 },
      { imageId: "c3", lat: 0, lng: 0 },
      { imageId: "d4", lat: 45, lng: -45 },
      { imageId: "e5", lat: -33, lng: 151 },
    ]);
    const created = await callJson(router, "post", "/api/game/new");
    const sessionId = created.body.sessionId;

    for (const [lat, lng] of [
      [10, 20],
      [-10, 30],
      [0, 0],
      [45, -45],
      [-33, 151],
    ]) {
      const res = await callJson(router, "post", `/api/game/${sessionId}/guess`, { lat, lng });
      expect(res.status).toBe(200);
    }
    const extra = await callJson(router, "post", `/api/game/${sessionId}/guess`, { lat: 10, lng: 20 });
    expect(extra.status).toBe(409);
  });

  it("completes a full 5-round game and returns the summary", async () => {
    const picks = [
      { imageId: "a1", lat: 10, lng: 20 },
      { imageId: "b2", lat: -10, lng: 30 },
      { imageId: "c3", lat: 0, lng: 0 },
      { imageId: "d4", lat: 45, lng: -45 },
      { imageId: "e5", lat: -33, lng: 151 },
    ];
    const { router } = setup(picks);
    const created = await callJson(router, "post", "/api/game/new");
    const sessionId = created.body.sessionId;

    const truths: Array<[number, number]> = [
      [10, 20],
      [-10, 30],
      [0, 0],
      [45, -45],
      [-33, 151],
    ];
    let total = 0;
    for (const [lat, lng] of truths) {
      const res = await callJson(router, "post", `/api/game/${sessionId}/guess`, { lat, lng });
      expect(res.status).toBe(200);
      total += res.body.result.score;
    }
    expect(total).toBe(25000);

    const summary = await callJson(router, "get", `/api/game/${sessionId}/summary`);
    expect(summary.status).toBe(200);
    expect(summary.body.totalScore).toBe(25000);
    expect(summary.body.results).toHaveLength(5);
  });

  it("404s for unknown sessions", async () => {
    const { router } = setup([]);
    const res = await callJson(router, "post", "/api/game/nope/guess", { lat: 0, lng: 0 });
    expect(res.status).toBe(404);
  });
});

describe("regions", () => {
  it("has valid bboxes with west<east and south<north", () => {
    for (const r of REGIONS) {
      const [w, s, e, n] = r.bbox;
      expect(w).toBeLessThan(e);
      expect(s).toBeLessThan(n);
      expect(Math.abs(w)).toBeLessThanOrEqual(180);
      expect(Math.abs(e)).toBeLessThanOrEqual(180);
      expect(Math.abs(s)).toBeLessThanOrEqual(90);
      expect(Math.abs(n)).toBeLessThanOrEqual(90);
    }
  });

  it("pickRandomRegion stays inside its bbox", () => {
    const region = pickRandomRegion(() => 0.5);
    const p = randomPointInRegion(region, () => 0.5);
    const [w, s, e, n] = region.bbox;
    expect(p.lng).toBeGreaterThanOrEqual(w);
    expect(p.lng).toBeLessThanOrEqual(e);
    expect(p.lat).toBeGreaterThanOrEqual(s);
    expect(p.lat).toBeLessThanOrEqual(n);
  });
});
