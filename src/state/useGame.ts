import { useCallback, useMemo, useReducer } from "react";
import { api, type GuessResponse, type RoundPayload, type RoundResult } from "../api";

export type Phase = "start" | "loading" | "playing" | "result" | "summary" | "error";

export interface GameState {
  phase: Phase;
  sessionId: string | null;
  round: RoundPayload | null;
  roundNumber: number;
  totalRounds: number;
  results: RoundResult[];
  lastResult: GuessResponse["result"] | null;
  /** Whether the just-answered round was the final one. */
  finished: boolean;
  /** Staged next-round payload, set when a guess response arrives. */
  pendingNext: RoundPayload | null;
  totalScore: number;
  error: string | null;
}

type Action =
  | { type: "START_GAME" }
  | { type: "GAME_READY"; sessionId: string; round: RoundPayload; totalRounds: number }
  | { type: "GUESS_SUBMITTED"; result: GuessResponse }
  | { type: "NEXT_ROUND" }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

const initialState: GameState = {
  phase: "start",
  sessionId: null,
  round: null,
  roundNumber: 0,
  totalRounds: 5,
  results: [],
  lastResult: null,
  finished: false,
  pendingNext: null,
  totalScore: 0,
  error: null,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START_GAME":
      return { ...initialState, phase: "loading" };
    case "GAME_READY":
      return {
        ...state,
        phase: "playing",
        sessionId: action.sessionId,
        round: action.round,
        roundNumber: action.round.round,
        totalRounds: action.totalRounds,
        pendingNext: null,
        error: null,
      };
    case "GUESS_SUBMITTED": {
      const results = [...state.results, action.result.result];
      return {
        ...state,
        phase: "result",
        results,
        lastResult: action.result.result,
        finished: action.result.finished,
        pendingNext: action.result.nextRound ?? null,
        totalScore: results.reduce((s, r) => s + r.score, 0),
      };
    }
    case "NEXT_ROUND": {
      if (state.finished || !state.pendingNext) {
        return { ...state, phase: "summary" };
      }
      return {
        ...state,
        phase: "playing",
        round: state.pendingNext,
        roundNumber: state.pendingNext.round,
        pendingNext: null,
      };
    }
    case "ERROR":
      return { ...state, phase: "error", error: action.message };
    case "RESET":
      return initialState;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startGame = useCallback(async () => {
    dispatch({ type: "START_GAME" });
    try {
      const res = await api.newGame();
      dispatch({ type: "GAME_READY", sessionId: res.sessionId, round: res.round, totalRounds: res.totalRounds });
    } catch (e) {
      dispatch({ type: "ERROR", message: e instanceof Error ? e.message : "Failed to start game" });
    }
  }, []);

  const submitGuess = useCallback(
    async (lat: number, lng: number) => {
      if (!state.sessionId) return;
      try {
        const res = await api.submitGuess(state.sessionId, lat, lng);
        dispatch({ type: "GUESS_SUBMITTED", result: res });
      } catch (e) {
        dispatch({ type: "ERROR", message: e instanceof Error ? e.message : "Failed to submit guess" });
      }
    },
    [state.sessionId],
  );

  const nextRound = useCallback(() => dispatch({ type: "NEXT_ROUND" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const progress = useMemo(
    () => ({ answered: state.results.length, total: state.totalRounds }),
    [state.results.length, state.totalRounds],
  );

  return { state, progress, startGame, submitGuess, nextRound, reset };
}
