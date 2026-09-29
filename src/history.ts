export interface GameHistoryEntry {
  date: number;
  totalScore: number;
  rounds: number[];
}

const KEY = "geoguessr-free-history";
const MAX_ENTRIES = 10;

export function loadHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is GameHistoryEntry =>
        !!e &&
        typeof (e as GameHistoryEntry).date === "number" &&
        typeof (e as GameHistoryEntry).totalScore === "number" &&
        Array.isArray((e as GameHistoryEntry).rounds),
    );
  } catch {
    return [];
  }
}

export function saveGame(entry: GameHistoryEntry): GameHistoryEntry[] {
  const history = [entry, ...loadHistory()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    // storage unavailable (private mode etc.) — ignore
  }
  return history;
}

export function bestScore(history: GameHistoryEntry[]): number {
  return history.reduce((best, e) => Math.max(best, e.totalScore), 0);
}

export function formatScore(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString("en-US")} km`;
}
