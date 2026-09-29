import { formatScore } from "../history";

interface Props {
  roundNumber: number;
  totalRounds: number;
  totalScore: number;
  best?: number;
}

export default function Hud({ roundNumber, totalRounds, totalScore, best }: Props) {
  return (
    <div className="hud">
      <div className="hud-chip">
        Round <strong>{roundNumber}</strong>/{totalRounds}
      </div>
      <div className="hud-chip">
        Score <strong>{formatScore(totalScore)}</strong>
      </div>
      {best !== undefined && best > 0 && <div className="hud-chip subtle">Best {formatScore(best)}</div>}
    </div>
  );
}
