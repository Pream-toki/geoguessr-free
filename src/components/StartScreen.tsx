import { bestScore, formatScore, type GameHistoryEntry } from "../history";

interface Props {
  history: GameHistoryEntry[];
  onStart: () => void;
}

export default function StartScreen({ history, onStart }: Props) {
  const best = bestScore(history);
  return (
    <div className="screen start-screen">
      <div className="start-card">
        <div className="logo-pin" aria-hidden>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="#1a73e8" />
            <path d="M50 22a20 20 0 0 1 20 20c0 14-20 36-20 36S30 56 30 42a20 20 0 0 1 20-20z" fill="#fff" />
            <circle cx="50" cy="42" r="8" fill="#1a73e8" />
          </svg>
        </div>
        <h1>
          Geo<span className="accent">Guessr</span>-Free
        </h1>
        <p className="tagline">You're somewhere on Earth. Look around. Guess where.</p>

        {history.length > 0 && (
          <p className="best-line">
            🏆 Best game: <strong>{formatScore(best)}</strong> / 25,000
          </p>
        )}

        <button className="btn primary big" onClick={onStart}>
          Play now
        </button>

        <div className="rules">
          <h2>How it works</h2>
          <ol>
            <li>You get 5 rounds of random 360° panoramas from around the world.</li>
            <li>Drag to look around, scroll to zoom. Read signs, plates, plants, poles — anything.</li>
            <li>Drop a pin on the map where you think you are, then confirm.</li>
            <li>Closer = more points. Under 25 m is a perfect 5,000. 25,000 wins the game.</li>
          </ol>
          <p className="fine-print">
            Imagery © Mapillary contributors (CC-BY-SA) · Map © OpenStreetMap contributors, tiles © CARTO
          </p>
        </div>
      </div>
    </div>
  );
}
