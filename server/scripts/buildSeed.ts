/**
 * Seed builder — run with `npm run seed`.
 *
 * Queries the Mapillary Graph API across curated regions, collects panoramic
 * image IDs, dedupes them (by sequence and by location grid), verifies each
 * candidate directly, and writes server/seeds/locations.json.
 */
import "dotenv/config";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { REGIONS } from "../regions";

const GRAPH_API = "https://graph.mapillary.com";
const TOKEN = process.env.VITE_MAPILLARY_TOKEN ?? process.env.MAPILLARY_TOKEN ?? "";

if (!TOKEN) {
  console.error("No MAPILLARY token found. Copy .env.example to .env and set VITE_MAPILLARY_TOKEN.");
  process.exit(1);
}

interface Candidate {
  imageId: string;
  lat: number;
  lng: number;
  region?: string;
  sequenceId?: string;
}

const TARGET_PER_REGION = 10;
// Each query covers only a 50 m radius, so sample generously per region.
const SAMPLES_PER_REGION = 45;
const SEPARATORS_MS = 150;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bboxPoint(rng: () => number, bbox: [number, number, number, number]): { lat: number; lng: number } {
  const [w, s, e, n] = bbox;
  return { lng: w + rng() * (e - w), lat: s + rng() * (n - s) };
}

async function queryPanos(lat: number, lng: number, _spanDeg: number): Promise<Candidate[]> {
  // lat/lng/radius form: the only query shape reliably accepted for client
  // tokens (bbox hits a data-volume guard). Radius capped at 50 meters.
  const url =
    `${GRAPH_API}/images` +
    `?access_token=${encodeURIComponent(TOKEN)}` +
    `&lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&radius=50` +
    `&is_pano=true&fields=id,computed_geometry,geometry,is_pano,sequence_id&limit=100`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      data?: Array<{
        id: string;
        is_pano?: boolean;
        sequence_id?: string;
        computed_geometry?: { coordinates: [number, number] } | null;
        geometry?: { coordinates: [number, number] } | null;
      }>;
    };
    const out: Candidate[] = [];
    for (const img of body.data ?? []) {
      const g = img.computed_geometry ?? img.geometry;
      if (!img.id || img.is_pano === false || !g?.coordinates) continue;
      const [lng2, lat2] = g.coordinates;
      if (typeof lat2 !== "number" || typeof lng2 !== "number") continue;
      if (Math.abs(lat2) > 85 || Math.abs(lng2) > 180) continue;
      out.push({ imageId: img.id, lat: lat2, lng: lng2, sequenceId: img.sequence_id });
    }
    return out;
  } catch {
    return [];
  }
}

/** Verify one image id directly against the API (guards against stale/edge results). */
async function verify(imageId: string): Promise<boolean> {
  const url = `${GRAPH_API}/${imageId}?access_token=${encodeURIComponent(TOKEN)}&fields=id,is_pano,computed_geometry,geometry`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return false;
    const img = (await res.json()) as {
      id?: string;
      is_pano?: boolean;
      computed_geometry?: { coordinates: [number, number] } | null;
      geometry?: { coordinates: [number, number] } | null;
    };
    const g = img.computed_geometry ?? img.geometry;
    return !!img.id && img.is_pano !== false && !!g?.coordinates;
  } catch {
    return false;
  }
}

function gridKey(lat: number, lng: number, cellDeg = 0.05): string {
  return `${Math.round(lat / cellDeg)}:${Math.round(lng / cellDeg)}`;
}

async function main() {
  console.log(`Building seed from ${REGIONS.length} regions (target ${TARGET_PER_REGION} verified panos each)...\n`);
  const verifiedAll: Candidate[] = [];
  const seenSequences = new Set<string>();
  const seenImages = new Set<string>();

  for (const region of REGIONS) {
    const seenGrids = new Set<string>();
    const candidates: Candidate[] = [];

    for (let i = 0; i < SAMPLES_PER_REGION; i++) {
      const { lat, lng } = bboxPoint(Math.random, region.bbox);
      const found = await queryPanos(lat, lng, 0);
      for (const c of found) {
        if (seenImages.has(c.imageId)) continue;
        seenImages.add(c.imageId);
        const key = gridKey(c.lat, c.lng);
        if (seenGrids.has(key)) continue;
        seenGrids.add(key);
        candidates.push({ ...c, region: region.id });
      }
      await sleep(SEPARATORS_MS);
    }

    // Verify candidates until we hit the target.
    let verified = 0;
    for (const c of candidates) {
      if (verified >= TARGET_PER_REGION) break;
      if (c.sequenceId && seenSequences.has(c.sequenceId)) continue;
      if (!(await verify(c.imageId))) continue;
      if (c.sequenceId) seenSequences.add(c.sequenceId);
      verifiedAll.push(c);
      verified++;
    }
    console.log(`  ${region.id.padEnd(8)} ${region.name.padEnd(26)} verified: ${verified}`);

    // Incremental write: the seed file is useful even if the run stops early.
    const outDir = path.join(process.cwd(), "server", "seeds");
    mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "locations.json");
    let existing: Array<{ imageId: string }> = [];
    if (existsSync(outFile)) {
      try {
        existing = JSON.parse(readFileSync(outFile, "utf-8"));
      } catch {
        existing = [];
      }
    }
    const have = new Set(existing.map((e) => e.imageId));
    const fresh = verifiedAll.filter((c) => !have.has(c.imageId));
    const merged = [
      ...existing,
      ...fresh.map((c) => ({ imageId: c.imageId, lat: c.lat, lng: c.lng, region: c.region })),
    ];
    writeFileSync(outFile, JSON.stringify(merged, null, 1));
    console.log(`    seed file now holds ${merged.length} panos`);
  }

  const outFile = path.join(process.cwd(), "server", "seeds", "locations.json");
  const finalCount = existsSync(outFile) ? (JSON.parse(readFileSync(outFile, "utf-8")) as unknown[]).length : 0;
  console.log(`\nDone. Seed file holds ${finalCount} verified panos at ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
