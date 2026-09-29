import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pickRandomRegion, randomPointInRegion, type Region } from "./regions";

const GRAPH_API = "https://graph.mapillary.com";

export interface PanoLocation {
  imageId: string;
  lat: number;
  lng: number;
}

interface SeedRecord {
  imageId: string;
  lat: number;
  lng: number;
  region?: string;
}

let seedCache: SeedRecord[] | null = null;

function loadSeeds(): SeedRecord[] {
  if (seedCache) return seedCache;
  try {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "seeds", "locations.json");
    const parsed = JSON.parse(readFileSync(file, "utf-8")) as SeedRecord[];
    seedCache = Array.isArray(parsed) ? parsed.filter((s) => s && typeof s.imageId === "string") : [];
  } catch {
    seedCache = [];
  }
  return seedCache;
}

/** Test hook: reset memoized seed data. */
export function resetSeedCache(): void {
  seedCache = null;
}

export interface PickerDeps {
  token: string;
  fetchFn?: typeof fetch;
  rng?: () => number;
  /** Max attempts before giving up (each attempt = 1 Mapillary query, 50 m radius). */
  maxAttempts?: number;
  /** Max consecutive seed picks before forcing a live refresh. */
  seedStreakLimit?: number;
}

interface ApiImage {
  id: string;
  computed_geometry?: { coordinates: [number, number] } | null;
  geometry?: { coordinates: [number, number] } | null;
  is_pano?: boolean;
}

function coordsOf(img: ApiImage): [number, number] | null {
  const g = img.computed_geometry ?? img.geometry;
  if (!g || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return null;
  const [lng, lat] = g.coordinates;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

async function queryPanoInBox(
  fetchFn: typeof fetch,
  token: string,
  lat: number,
  lng: number,
  _spanDeg = 0.02,
): Promise<PanoLocation | null> {
  // NOTE: the lat/lng/radius form is the only query shape reliably accepted
  // by the Mapillary Graph API for client tokens (bbox triggers a data-volume
  // guard). Radius is meters, capped at 50.
  const url =
    `${GRAPH_API}/images` +
    `?access_token=${encodeURIComponent(token)}` +
    `&lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&radius=50` +
    `&is_pano=true&fields=id,computed_geometry,geometry,is_pano&limit=100`;
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: ApiImage[] };
    const images = Array.isArray(body?.data) ? body.data : [];
    const panos = images
      .filter((img) => img.is_pano !== false && !!img.id)
      .map((img) => ({ img, c: coordsOf(img) }))
      .filter((x): x is { img: ApiImage; c: [number, number] } => x.c !== null);
    if (panos.length === 0) return null;
    const chosen = panos[Math.floor(Math.random() * panos.length)];
    return { imageId: chosen.img.id, lat: chosen.c[0], lng: chosen.c[1] };
  } catch {
    return null;
  }
}

function pickFromSeeds(deps: PickerDeps): PanoLocation | null {
  const seeds = loadSeeds();
  if (seeds.length === 0) return null;
  const s = seeds[Math.floor(deps.rng!() * seeds.length)];
  return { imageId: s.imageId, lat: s.lat, lng: s.lng };
}

/**
 * Pick a random panoramic location:
 * 1. Try the seed file (instant, machine-verified panos).
 * 2. Occasionally skip seeds to keep variety, then fall back to live
 *    Mapillary bbox queries with a widening search box.
 * Returns null only if everything fails.
 */
export async function pickPanoLocation(deps: PickerDeps): Promise<PanoLocation | null> {
  const fetchFn = deps.fetchFn ?? fetch;
  const rng = deps.rng ?? Math.random;
  const maxAttempts = deps.maxAttempts ?? 30;
  const seedStreakLimit = deps.seedStreakLimit ?? 4;
  const fullDeps: PickerDeps = { ...deps, fetchFn, rng };

  // Tier 1: seeds — but sometimes go live to keep the pool fresh.
  if (rng() > 1 / seedStreakLimit) {
    const seeded = pickFromSeeds(fullDeps);
    if (seeded) return seeded;
  }

  // Tier 2: live Mapillary queries around random points in curated regions.
  // Each query only covers a 50 m radius, so we take more attempts.
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const region: Region = pickRandomRegion(rng);
    const { lat, lng } = randomPointInRegion(region, rng);
    const found = await queryPanoInBox(fetchFn, deps.token, lat, lng);
    if (found) return found;
  }
  return null;
}

/** Fetch the canonical computed geometry of one image directly from the API. */
export async function fetchImageCoords(fetchFn: typeof fetch, token: string, imageId: string): Promise<PanoLocation | null> {
  const url = `${GRAPH_API}/${imageId}?access_token=${encodeURIComponent(token)}&fields=id,computed_geometry,geometry,is_pano`;
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const img = (await res.json()) as ApiImage;
    const c = coordsOf(img);
    return c ? { imageId: img.id, lat: c[0], lng: c[1] } : null;
  } catch {
    return null;
  }
}

export function seedCount(): number {
  return loadSeeds().length;
}

/**
 * DEMO MODE picker — lets the whole game loop run (and be tested) without a
 * Mapillary token. Returns well-separated fake locations; image IDs are not
 * real, so the panorama viewer will show its error panel. Enable with
 * DEMO_MODE=1. Never used unless explicitly requested.
 */
export function makeDemoPicker(): typeof pickPanoLocation {
  const demoLocations: PanoLocation[] = [
    { imageId: "demo-paris", lat: 48.8584, lng: 2.2945 },
    { imageId: "demo-nyc", lat: 40.7484, lng: -73.9857 },
    { imageId: "demo-tokyo", lat: 35.6586, lng: 139.7454 },
    { imageId: "demo-sydney", lat: -33.8568, lng: 151.2153 },
    { imageId: "demo-cairo", lat: 29.9792, lng: 31.1342 },
    { imageId: "demo-rio", lat: -22.9519, lng: -43.2105 },
    { imageId: "demo-capetown", lat: -33.9249, lng: 18.4241 },
  ];
  let index = 0;
  return async () => {
    const loc = demoLocations[index % demoLocations.length];
    index++;
    return loc;
  };
}
