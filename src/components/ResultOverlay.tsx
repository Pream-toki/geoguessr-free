import MapView from "./MapView";
import { formatDistance, formatScore } from "../history";
import type { RoundResult } from "../api";

interface Props {
  result: RoundResult;
  roundNumber: number;
  totalRounds: number;
  onNext: () => void;
}

export default function ResultOverlay({ result, roundNumber, totalRounds, onNext }: Props) {
  const perfect = result.score >= 5000;
  return (
    <div className="overlay">
      <div className="result-panel">
        <div className="result-headline">
          <div className="result-score">
            <span className={`score-value ${perfect ? "perfect" : ""}`}>{formatScore(result.score)}</span>
            <span className="score-unit">points</span>
          </div>
          <div className="result-distance">
            {perfect ? "🎯 Perfect!" : "You were"}{" "}
            <strong>{formatDistance(result.distanceKm)}</strong>
            {perfect ? "" : " away"}
          </div>
        </div>

        <MapView
          markers={[
            { lat: result.guess.lat, lng: result.guess.lng, color: "#e94856", shape: "dot" },
            { lat: result.truth.lat, lng: result.truth.lng, color: "#2ecc71", shape: "dot" },
          ]}
          line={[
            [result.guess.lat, result.guess.lng],
            [result.truth.lat, result.truth.lng],
          ]}
          className="result-map"
        />

        <button className="btn primary big" onClick={onNext} autoFocus>
          {roundNumber >= totalRounds ? "See final results" : "Next round"}
        </button>
      </div>
    </div>
  );
}
