import { useState } from "react";
import MapView from "./MapView";

interface Props {
  onGuess: (lat: number, lng: number) => void;
  disabled?: boolean;
}

export default function GuessMap({ onGuess, disabled }: Props) {
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const confirm = () => {
    if (!guess || disabled) return;
    onGuess(guess.lat, guess.lng);
    setGuess(null);
  };

  return (
    <div className={`guess-map ${collapsed ? "collapsed" : ""}`}>
      {collapsed ? (
        <button className="btn expand-btn" onClick={() => setCollapsed(false)}>
          Show map
        </button>
      ) : (
        <>
          <div className="map-shell">
            <MapView
              markers={guess ? [{ lat: guess.lat, lng: guess.lng, color: "#e94856" }] : []}
              onMapClick={(lat, lng) => setGuess({ lat, lng })}
              className="guess-map-canvas"
            />
          </div>
          <div className="map-actions">
            <button className="btn ghost" onClick={() => setCollapsed(true)}>
              Hide
            </button>
            <button className="btn primary" onClick={confirm} disabled={!guess || disabled}>
              {guess ? "Guess" : "Click the map to place your pin"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
