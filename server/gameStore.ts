import { randomUUID } from "node:crypto";

export interface RoundRecord {
  imageId: string;
  /** True location — server-only until the round is answered. */
  truth: { lat: number; lng: number };
}

export interface RoundResult {
  round: number;
  imageId: string;
  truth: { lat: number; lng: number };
  guess: { lat: number; lng: number };
  distanceKm: number;
  score: number;
}

export interface GameSession {
  id: string;
  rounds: RoundRecord[];
  results: RoundResult[];
  createdAt: number;
  /** -1 = awaiting guess for current round. */
  currentRound: number;
}

export class GameStore {
  private sessions = new Map<string, GameSession>();

  create(rounds: RoundRecord[]): GameSession {
    const session: GameSession = {
      id: randomUUID(),
      rounds,
      results: [],
      createdAt: Date.now(),
      currentRound: 0,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): GameSession | undefined {
    return this.sessions.get(id);
  }

  recordGuess(
    id: string,
    guess: { lat: number; lng: number },
    scoreRound: (guess: { lat: number; lng: number }, truth: { lat: number; lng: number }) => { distanceKm: number; score: number },
  ): { result: RoundResult; nextRound: number; finished: boolean } | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.currentRound < 0 || session.currentRound >= session.rounds.length) return null;
    if (session.results.length !== session.currentRound) return null; // already answered

    const round = session.rounds[session.currentRound];
    const { distanceKm, score } = scoreRound(guess, round.truth);
    const result: RoundResult = {
      round: session.currentRound + 1,
      imageId: round.imageId,
      truth: round.truth,
      guess,
      distanceKm,
      score,
    };
    session.results.push(result);

    const finished = session.results.length === session.rounds.length;
    session.currentRound = finished ? -1 : session.currentRound + 1;
    return { result, nextRound: session.currentRound, finished };
  }

  /** Drop sessions older than 24h to keep memory bounded. */
  prune(maxAgeMs = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [id, session] of this.sessions) {
      if (session.createdAt < cutoff) this.sessions.delete(id);
    }
  }
}

export const gameStore = new GameStore();
