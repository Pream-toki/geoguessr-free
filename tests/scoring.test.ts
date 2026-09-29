import { describe, expect, it } from "vitest";
import {
  MAX_ROUND_SCORE,
  SCALE_KM,
  haversineKm,
  scoreForDistance,
  scoreGuess,
  totalScore,
} from "../server/scoring";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm({ lat: 48.85, lng: 2.35 }, { lat: 48.85, lng: 2.35 })).toBeCloseTo(0, 10);
  });

  it("matches the known Paris → London distance (~344 km)", () => {
    const d = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 51.5074, lng: -0.1278 });
    expect(d).toBeGreaterThan(340);
    expect(d).toBeLessThan(348);
  });

  it("is symmetric", () => {
    const a = { lat: -33.86, lng: 151.2 };
    const b = { lat: 40.71, lng: -74.0 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });

  it("handles antimeridian crossing (1° apart across ±180°)", () => {
    const d = haversineKm({ lat: 0, lng: 179.5 }, { lat: 0, lng: -179.5 });
    // 1° of longitude at the equator ≈ 111.2 km
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112.5);
  });

  it("caps at roughly half Earth's circumference", () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(d).toBeGreaterThan(20000);
    expect(d).toBeLessThan(20016);
  });
});

describe("scoreForDistance", () => {
  it("scores a perfect 5000 at zero distance", () => {
    expect(scoreForDistance(0)).toBe(MAX_ROUND_SCORE);
  });

  it("scores a perfect 5000 within the 25 m perfect threshold", () => {
    expect(scoreForDistance(0.025)).toBe(MAX_ROUND_SCORE);
    expect(scoreForDistance(0.01)).toBe(MAX_ROUND_SCORE);
  });

  it("decays exponentially with distance", () => {
    const d1000 = scoreForDistance(1000); // ~5000 · e^(-10·1000/14912)
    const d5000 = scoreForDistance(5000);
    const d10000 = scoreForDistance(10000);
    expect(d1000).toBeGreaterThan(2300);
    expect(d1000).toBeLessThan(2800);
    expect(d5000).toBeLessThan(d1000);
    expect(d10000).toBeLessThan(d5000);
    expect(d10000).toBeGreaterThan(0);
  });

  it("never exceeds 5000 or goes below 0", () => {
    expect(scoreForDistance(-5)).toBe(0);
    expect(scoreForDistance(NaN)).toBe(0);
    expect(scoreForDistance(20015)).toBeGreaterThanOrEqual(0);
    expect(scoreForDistance(20015)).toBeLessThanOrEqual(MAX_ROUND_SCORE);
  });

  it("is non-increasing over a distance sweep", () => {
    let prev = MAX_ROUND_SCORE;
    for (let km = 0; km <= 20015; km += 113) {
      const s = scoreForDistance(km);
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });

  it("respects a custom scale (smaller scale = harsher drop-off)", () => {
    const custom = 1000;
    expect(scoreForDistance(100, custom)).toBeLessThan(scoreForDistance(100, SCALE_KM));
  });
});

describe("scoreGuess", () => {
  it("returns both distance and score", () => {
    const r = scoreGuess({ lat: 48.8566, lng: 2.3522 }, { lat: 48.8566, lng: 2.3522 });
    expect(r.distanceKm).toBeCloseTo(0, 10);
    expect(r.score).toBe(MAX_ROUND_SCORE);
  });
});

describe("totalScore", () => {
  it("sums round scores toward the 25,000 maximum", () => {
    expect(totalScore([5000, 5000, 5000, 5000, 5000])).toBe(25000);
    expect(totalScore([])).toBe(0);
    expect(totalScore([1000, 2000, 500])).toBe(3500);
  });
});
