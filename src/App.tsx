import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import PanoViewer from "./components/PanoViewer";
import GuessMap from "./components/GuessMap";
import Hud from "./components/Hud";
import ResultOverlay from "./components/ResultOverlay";
import StartScreen from "./components/StartScreen";
import SummaryScreen from "./components/SummaryScreen";
import { useGame } from "./state/useGame";
import { bestScore, loadHistory, saveGame, type GameHistoryEntry } from "./history";

export default function App() {
  const { state, startGame, submitGuess, nextRound, reset } = useGame();
  const [history, setHistory] = useState<GameHistoryEntry[]>(() => loadHistory());
  const [mapillaryToken, setMapillaryToken] = useState<string>(
    () => import.meta.env.VITE_MAPILLARY_TOKEN ?? "",
  );

  // Prefer the token served by our API (env-agnostic, swappable without rebuild).
  useEffect(() => {
    api.config().then((c) => {
      if (c.mapillaryToken) setMapillaryToken(c.mapillaryToken);
    }).catch(() => undefined);
  }, []);

  // Persist finished games once, when the summary phase is entered.
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  useEffect(() => {
    if (state.phase !== "summary" || !state.sessionId || state.sessionId === savedSessionId) return;
    setHistory(
      saveGame({
        date: Date.now(),
        totalScore: state.totalScore,
        rounds: state.results.map((r) => r.score),
      }),
    );
    setSavedSessionId(state.sessionId);
  }, [state.phase, state.sessionId, state.totalScore, state.results, savedSessionId]);

  const best = bestScore(history);
  // history[0] is the game just played; a "new best" must beat all earlier ones.
  const previousBest = bestScore(history.slice(1));
  const isNewBest = useMemo(
    () => state.phase === "summary" && state.totalScore > 0 && state.totalScore > previousBest,
    [state.phase, state.totalScore, previousBest],
  );

  // Keyboard: Space confirms a placed guess, advances rounds, or replays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "BUTTON" || tag === "INPUT") return;
      e.preventDefault();
      if (state.phase === "playing") {
        document.querySelector<HTMLButtonElement>(".guess-map .btn.primary:not(:disabled)")?.click();
      } else if (state.phase === "result" || state.phase === "summary" || state.phase === "error") {
        const advance = document.querySelector<HTMLButtonElement>(
          ".overlay .btn.primary, .summary-actions .btn.primary",
        );
        advance?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase]);

  if (state.phase === "start") {
    return <StartScreen history={history} onStart={startGame} />;
  }

  if (state.phase === "summary") {
    return (
      <SummaryScreen
        results={state.results}
        totalScore={state.totalScore}
        isNewBest={isNewBest}
        history={history}
        onPlayAgain={startGame}
        onHome={reset}
      />
    );
  }

  // loading / playing / result / error all render the game screen.
  return (
    <div className="game-screen">
      <PanoViewer imageId={state.round?.imageId ?? null} token={mapillaryToken} />

      <Hud
        roundNumber={
          state.phase === "result"
            ? state.results.length
            : Math.min(state.results.length + 1, state.totalRounds)
        }
        totalRounds={state.totalRounds}
        totalScore={state.totalScore}
        best={best}
      />

      {state.round && <GuessMap onGuess={submitGuess} disabled={state.phase !== "playing"} />}

      {state.phase === "result" && state.lastResult && (
        <ResultOverlay
          result={state.lastResult}
          roundNumber={state.results.length}
          totalRounds={state.totalRounds}
          onNext={nextRound}
        />
      )}

      {state.phase === "error" && (
        <div className="overlay">
          <div className="error-panel">
            <h2>Something went wrong</h2>
            <p>{state.error}</p>
            <div className="summary-actions">
              <button className="btn ghost" onClick={reset}>
                Home
              </button>
              <button className="btn primary" onClick={startGame}>
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
