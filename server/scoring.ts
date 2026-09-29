export interface LatLng {
  lat: number;
  lng: number;
}

/** Earth radius used by GeoGuessr (km). */
export const EARTH_RADIUS_KM = 6371;
/** Maximum points per round. */
export const MAX_ROUND_SCORE = 5000;
/** Fixed global scale D (km) ≈ half Earth's circumference; keeps scoring fair across games. */
export const SCALE_KM = 14912;
/** Any guess within this distance (25 m) scores a perfect 5000. */
export const PERFECT_THRESHOLD_KM = 0.025;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two coordinates using the Haversine formula.
 * Returns kilometers. Correctly handles antimeridian crossings.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/**
 * GeoGuessr-style score: S = 5000 · e^(−10 · d / D).
 * Distances of 25 m or less always score the maximum. Never returns more than
 * 5000 or less than 0; NaN/negative inputs score 0.
 */
export function scoreForDistance(distanceKm: number, scaleKm: number = SCALE_KM): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  if (distanceKm <= PERFECT_THRESHOLD_KM) return MAX_ROUND_SCORE;
  const raw = MAX_ROUND_SCORE * Math.exp((-10 * distanceKm) / scaleKm);
  return Math.max(0, Math.min(MAX_ROUND_SCORE, Math.round(raw)));
}

export interface RoundScoreResult {
  distanceKm: number;
  score: number;
}

/** Score a guess against the true location. */
export function scoreGuess(guess: LatLng, truth: LatLng, scaleKm: number = SCALE_KM): RoundScoreResult {
  const distanceKm = haversineKm(guess, truth);
  return { distanceKm, score: scoreForDistance(distanceKm, scaleKm) };
}

/** Sum a list of round scores. */
export function totalScore(scores: number[]): number {
  return scores.reduce((sum, s) => sum + s, 0);
}
