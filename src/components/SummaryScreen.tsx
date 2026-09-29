import MapView, { type MapMarker } from "./MapView";
import { formatDistance, formatScore, type GameHistoryEntry } from "../history";
import type { RoundResult } from "../api";

interface Props {
  results: RoundResult[];
  totalScore: number;
  isNewBest: boolean;
  history: GameHistoryEntry[];
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function SummaryScreen({ results, totalScore, isNewBest, history, onPlayAgain, onHome }: Props) {
  const markers: MapMarker[] = results.flatMap((r) => [
    { lat: r.guess.lat, lng: r.guess.lng, color: "#e94856", shape: "dot" as const },
    { lat: r.truth.lat, lng: r.truth.lng, color: "#2ecc71", shape: "dot" as const },
  ]);

  return (
    <div className="screen summary-screen">
      <div className="summary-card">
        <h1>{isNewBest ? "🏆 New personal best!" : "Game over"}</h1>
        <div className="total-score">
          <span className="score-value">{formatScore(totalScore)}</span>
          <span className="score-unit">/ 25,000 points</span>
        </div>

        <MapView markers={markers} className="summary-map" fitKey={results.length} />

        <table className="rounds-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Distance</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.round}>
                <td>{r.round}</td>
                <td>{formatDistance(r.distanceKm)}</td>
                <td className={r.score >= 5000 ? "perfect" : ""}>{formatScore(r.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {history.length > 1 && (
          <div className="history-strip">
            {history
              .slice(1, 6)
              .reverse()
              .map((h, i) => (
                <div key={i} className="history-bar" style={{ height: `${Math.max(8, (h.totalScore / 25000) * 72)}px` }}>
                  <span>{(h.totalScore / 1000).toFixed(1)}k</span>
                </div>
              ))}
          </div>
        )}

        <div className="summary-actions">
          <button className="btn ghost" onClick={onHome}>
            Home
          </button>
          <button className="btn primary big" onClick={onPlayAgain}>
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
