/**
 * Curated pool of regions with reliable Mapillary panoramic coverage.
 * Boxes are [west, south, east, north] and deliberately cover cities/roads
 * where community 360° imagery is dense.
 */
export interface Region {
  id: string;
  name: string;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  weight: number;
}

export const REGIONS: Region[] = [
  { id: "us-nyc", name: "New York, USA", bbox: [-74.05, 40.58, -73.75, 40.9], weight: 2 },
  { id: "us-la", name: "Los Angeles, USA", bbox: [-118.55, 33.7, -118.1, 34.2], weight: 2 },
  { id: "us-chi", name: "Chicago, USA", bbox: [-87.85, 41.7, -87.55, 42.0], weight: 1 },
  { id: "us-mia", name: "Miami, USA", bbox: [-80.35, 25.6, -80.08, 25.95], weight: 1 },
  { id: "ca-tor", name: "Toronto, Canada", bbox: [-79.65, 43.55, -79.1, 43.85], weight: 1 },
  { id: "uk-lon", name: "London, UK", bbox: [-0.45, 51.38, 0.15, 51.65], weight: 2 },
  { id: "fr-par", name: "Paris, France", bbox: [2.2, 48.78, 2.5, 48.95], weight: 2 },
  { id: "fr-lyon", name: "Lyon, France", bbox: [4.7, 45.68, 5.0, 45.85], weight: 1 },
  { id: "de-ber", name: "Berlin, Germany", bbox: [13.1, 52.35, 13.6, 52.62], weight: 2 },
  { id: "de-muc", name: "Munich, Germany", bbox: [11.4, 48.06, 11.7, 48.24], weight: 1 },
  { id: "nl-ams", name: "Amsterdam, Netherlands", bbox: [4.78, 52.28, 5.05, 52.44], weight: 1 },
  { id: "be-bru", name: "Brussels, Belgium", bbox: [4.25, 50.76, 4.52, 50.92], weight: 1 },
  { id: "ch-zur", name: "Zurich, Switzerland", bbox: [8.45, 47.32, 8.63, 47.44], weight: 1 },
  { id: "at-vie", name: "Vienna, Austria", bbox: [16.15, 48.1, 16.55, 48.32], weight: 1 },
  { id: "it-rom", name: "Rome, Italy", bbox: [12.4, 41.8, 12.6, 42.0], weight: 2 },
  { id: "it-mil", name: "Milan, Italy", bbox: [9.1, 45.42, 9.28, 45.55], weight: 1 },
  { id: "es-mad", name: "Madrid, Spain", bbox: [-3.78, 40.32, -3.55, 40.52], weight: 2 },
  { id: "es-bcn", name: "Barcelona, Spain", bbox: [2.05, 41.32, 2.25, 41.45], weight: 1 },
  { id: "pt-lis", name: "Lisbon, Portugal", bbox: [-9.25, 38.68, -8.98, 38.82], weight: 1 },
  { id: "pl-waw", name: "Warsaw, Poland", bbox: [20.85, 52.1, 21.25, 52.35], weight: 1 },
  { id: "cz-pra", name: "Prague, Czechia", bbox: [14.28, 49.95, 14.6, 50.12], weight: 1 },
  { id: "gr-atn", name: "Athens, Greece", bbox: [23.6, 37.9, 23.85, 38.05], weight: 1 },
  { id: "tr-ist", name: "Istanbul, Türkiye", bbox: [28.6, 40.95, 29.25, 41.15], weight: 1 },
  { id: "ru-spb", name: "St. Petersburg, Russia", bbox: [30.1, 59.85, 30.5, 60.05], weight: 1 },
  { id: "dk-cph", name: "Copenhagen, Denmark", bbox: [12.35, 55.6, 12.65, 55.78], weight: 1 },
  { id: "se-sto", name: "Stockholm, Sweden", bbox: [17.9, 59.25, 18.2, 59.42], weight: 1 },
  { id: "no-osl", name: "Oslo, Norway", bbox: [10.6, 59.85, 10.85, 60.0], weight: 1 },
  { id: "fi-hel", name: "Helsinki, Finland", bbox: [24.85, 60.12, 25.15, 60.28], weight: 1 },
  { id: "jp-tky", name: "Tokyo, Japan", bbox: [139.55, 35.55, 139.85, 35.8], weight: 2 },
  { id: "jp-osa", name: "Osaka, Japan", bbox: [135.4, 34.6, 135.6, 34.75], weight: 1 },
  { id: "kr-seo", name: "Seoul, South Korea", bbox: [126.85, 37.45, 127.15, 37.65], weight: 1 },
  { id: "tw-tpe", name: "Taipei, Taiwan", bbox: [121.47, 24.98, 121.62, 25.12], weight: 1 },
  { id: "th-bkk", name: "Bangkok, Thailand", bbox: [100.4, 13.65, 100.75, 13.9], weight: 1 },
  { id: "sg-sin", name: "Singapore", bbox: [103.7, 1.25, 104.0, 1.45], weight: 1 },
  { id: "in-del", name: "Delhi, India", bbox: [77.0, 28.4, 77.35, 28.7], weight: 1 },
  { id: "in-blr", name: "Bengaluru, India", bbox: [77.5, 12.85, 77.75, 13.1], weight: 1 },
  { id: "il-tlv", name: "Tel Aviv, Israel", bbox: [34.75, 32.0, 34.85, 32.12], weight: 1 },
  { id: "ae-dxb", name: "Dubai, UAE", bbox: [55.2, 25.1, 55.45, 25.3], weight: 1 },
  { id: "za-pta", name: "Pretoria, South Africa", bbox: [28.05, -25.8, 28.3, -25.65], weight: 1 },
  { id: "br-sao", name: "São Paulo, Brazil", bbox: [-46.75, -23.68, -46.55, -23.5], weight: 2 },
  { id: "br-rio", name: "Rio de Janeiro, Brazil", bbox: [-43.35, -22.98, -43.15, -22.85], weight: 1 },
  { id: "ar-bue", name: "Buenos Aires, Argentina", bbox: [-58.55, -34.72, -58.32, -34.52], weight: 1 },
  { id: "cl-scl", name: "Santiago, Chile", bbox: [-70.75, -33.6, -70.55, -33.4], weight: 1 },
  { id: "co-bog", name: "Bogotá, Colombia", bbox: [-74.2, 4.55, -74.02, 4.75], weight: 1 },
  { id: "mx-cmx", name: "Mexico City, Mexico", bbox: [-99.25, 19.35, -99.0, 19.55], weight: 1 },
  { id: "au-syd", name: "Sydney, Australia", bbox: [151.0, -34.05, 151.3, -33.75], weight: 2 },
  { id: "au-mel", name: "Melbourne, Australia", bbox: [144.85, -37.95, 145.1, -37.75], weight: 1 },
  { id: "nz-akl", name: "Auckland, New Zealand", bbox: [174.6, -37.05, 174.9, -36.75], weight: 1 },
];

/** Weighted-random region selection. */
export function pickRandomRegion(rng: () => number = Math.random): Region {
  const total = REGIONS.reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total;
  for (const region of REGIONS) {
    roll -= region.weight;
    if (roll <= 0) return region;
  }
  return REGIONS[REGIONS.length - 1];
}

/** Random coordinate uniformly inside a region's bbox. */
export function randomPointInRegion(region: Region, rng: () => number = Math.random): { lat: number; lng: number } {
  const [w, s, e, n] = region.bbox;
  return {
    lng: w + rng() * (e - w),
    lat: s + rng() * (n - s),
  };
}
