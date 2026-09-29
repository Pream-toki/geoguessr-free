export interface RoundPayload {
  round: number;
  imageId: string;
}

export interface RoundResult {
  round: number;
  imageId: string;
  truth: { lat: number; lng: number };
  guess: { lat: number; lng: number };
  distanceKm: number;
  score: number;
}

export interface GuessResponse {
  result: RoundResult;
  finished: boolean;
  nextRound?: RoundPayload;
  totalScore?: number;
}

export interface NewGameResponse {
  sessionId: string;
  round: RoundPayload;
  totalRounds: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export const api = {
  newGame: () =>
    request<NewGameResponse>("/api/game/new", { method: "POST" }),

  submitGuess: (sessionId: string, lat: number, lng: number) =>
    request<GuessResponse>(`/api/game/${sessionId}/guess`, {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),

  summary: (sessionId: string) =>
    request<{ sessionId: string; results: RoundResult[]; totalScore: number }>(
      `/api/game/${sessionId}/summary`,
    ),
};
