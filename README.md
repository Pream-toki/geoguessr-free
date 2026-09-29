# GeoGuessr-Free

A 100% free GeoGuessr-style geography game. You're dropped into a random 360° street-level
panorama somewhere on Earth — look around, read the clues, and drop a pin on the world map.
The closer your guess, the more points you score.

No paid APIs. No Google keys. Built on **Mapillary** open imagery and **OpenStreetMap/CARTO** tiles.

## Features

- 5-round Classic mode with authentic GeoGuessr scoring: `S = 5000 · e^(−10·d/D)`
  (Haversine distance, 25 m perfect-guess threshold, 25,000 max game)
- Real 360° panoramas via `mapillary-js`, explorable (pan / zoom / move)
- Collapsible Leaflet guess map with custom pins
- Per-round result screen: score, distance, guess→truth line
- Game summary: all rounds on one map, per-round breakdown, personal-best tracking (localStorage)
- Keyboard submit (Space), responsive layout, dark theme
- Anti-cheat by design: true coordinates live only on the server and are revealed after each guess

## Quick start

```bash
# 1. Install
npm install

# 2. Get a free Mapillary token (takes ~2 minutes)
#    https://www.mapillary.com/dashboard/developers → register an app → copy the client token
cp .env.example .env        # then paste your token into VITE_MAPILLARY_TOKEN

# 3. (Recommended) Build the seed pool of verified panoramas (~2–5 min)
npm run seed

# No token yet? The server auto-runs in DEMO MODE: the full game loop works
# with simulated locations (the panorama pane shows a placeholder) so you can
# test scoring, maps, and UI before adding a token.

# 4. Play
npm run dev                 # server on :3001, client on :5173
```

Open http://localhost:5173 and hit **Play now**.

## How it works

```
Browser (React SPA)
 ├─ PanoViewer   → mapillary-js (streams imagery with the public client token)
 ├─ GuessMap     → Leaflet + CARTO Voyager tiles (free, no key)
 └─ /api/*       → Express (proxied by Vite in dev)
                    ├─ POST /api/game/new        → 5 random pano locations, returns round 1
                    ├─ POST /api/game/:id/guess  → scores the guess, reveals the truth
                    └─ GET  /api/game/:id/summary→ final results
```

**Location picking** is two-tier: an instant, machine-verified seed file
(`server/seeds/locations.json`, built by `npm run seed`) with a live
Mapillary bbox-query fallback (`is_pano=true`) across ~48 curated regions.

**Scoring** lives in `server/scoring.ts` and is fully unit-tested
(`tests/scoring.test.ts`): Haversine distance at R = 6371 km, fixed scale
D = 14,912 km, exponential decay, 25 m perfect threshold.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Express API + Vite client with hot reload |
| `npm run seed` | Rebuild the verified panorama seed file from Mapillary |
| `npm test` | Vitest suite (scoring, picker, API integration) |
| `npm run typecheck` | `tsc --noEmit` over client + server |
| `npm run build` | Production client build |

## Notes & licenses

- Mapillary imagery is © Mapillary contributors, CC-BY-SA — attribution is shown in-game.
- Map tiles © OpenStreetMap contributors, tiles © CARTO.
- The Mapillary free token has generous limits (~50k tile requests/day) — irrelevant for personal play.
- Game sessions are in-memory (24 h prune). Restarting the server abandons running games.
- Mapillary coverage varies by region; the curated region pool + widening retry box keeps
  location picking reliable, and the region list in `server/regions.ts` is trivially editable.

## Ideas for v2

NM/NMPZ difficulties, timers, shareable challenge links with friend leaderboards,
country streak mode, live 1v1 duels with HP bars.
