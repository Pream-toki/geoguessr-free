import { Router } from "express";
import { gameStore, type RoundRecord, type RoundResult } from "./gameStore";
import { pickPanoLocation, seedCount } from "./picker";
import { REGIONS } from "./regions";
import { scoreGuess, totalScore } from "./scoring";

const ROUNDS_PER_GAME = 5;

export interface RouteDeps {
  pick: typeof pickPanoLocation;
}

function publicRound(s: { rounds: RoundRecord[]; currentRound: number }, index: number): RoundPayload {
  return { round: index + 1, imageId: s.rounds[index].imageId };
}

interface RoundPayload {
  round: number;
  imageId: string;
}

export function createRouter(token: string, deps?: Partial<RouteDeps>): Router {
  const pick = deps?.pick ?? pickPanoLocation;
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, seeds: seedCount(), regions: REGIONS.length });
  });

  router.post("/game/new", async (_req, res) => {
    const rounds: RoundRecord[] = [];
    for (let i = 0; i < ROUNDS_PER_GAME; i++) {
      const loc = await pick({ token });
      if (!loc) {
        return res.status(502).json({ error: "Could not find panorama locations. Check MAPILLARY_TOKEN and try again." });
      }
      rounds.push({ imageId: loc.imageId, truth: { lat: loc.lat, lng: loc.lng } });
    }
    const session = gameStore.create(rounds);
    res.json({
      sessionId: session.id,
      round: publicRound(session, 0),
      totalRounds: ROUNDS_PER_GAME,
    });
  });

  router.post("/game/:id/guess", (req, res) => {
    const session = gameStore.get(req.params.id);
    if (!session) return res.status(404).json({ error: "Game not found" });

    const { lat, lng } = req.body ?? {};
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng must be finite numbers" });
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: "lat/lng out of range" });
    }

    const outcome = gameStore.recordGuess(session.id, { lat, lng }, scoreGuess);
    if (!outcome) return res.status(409).json({ error: "Round already answered or game finished" });

    const { result, nextRound, finished } = outcome;
    const results: RoundResult[] = session.results;
    const payload: {
      result: RoundResult;
      finished: boolean;
      nextRound?: RoundPayload;
      totalScore?: number;
    } = { result, finished };

    if (!finished && nextRound >= 0) payload.nextRound = publicRound(session, nextRound);
    if (finished) payload.totalScore = totalScore(results.map((r) => r.score));

    res.json(payload);
  });

  router.get("/game/:id/summary", (req, res) => {
    const session = gameStore.get(req.params.id);
    if (!session) return res.status(404).json({ error: "Game not found" });
    if (session.results.length < session.rounds.length) {
      return res.status(409).json({ error: "Game not finished yet" });
    }
    res.json({
      sessionId: session.id,
      results: session.results,
      totalScore: totalScore(session.results.map((r) => r.score)),
    });
  });

  return router;
}
