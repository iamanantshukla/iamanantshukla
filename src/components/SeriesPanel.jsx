import { useSession } from '../context/SessionContext.jsx';

function cellText(pt) {
  if (!pt) return '—';
  return `${pt.score.toFixed(1)} · ${pt.dir}`;
}

export default function SeriesPanel() {
  const { series, currentSeries, armedActual, armActual } = useSession();
  const shots = series[currentSeries]?.shots || [];
  const rows = Array.from({ length: 10 }, (_, i) => shots.find((s) => s.n === i + 1) || { n: i + 1 });

  return (
    <div className="series-panel">
      {rows.map((shot) => {
        const isArmed = armedActual
          && armedActual.seriesIndex === currentSeries
          && armedActual.shotN === shot.n;
        const canArm = !!shot.call; // can only place actual after a call exists
        return (
          <div className="slot" key={shot.n}>
            <span className="num">{shot.n}</span>
            <div className="cell">
              <div className="label">Call</div>
              {cellText(shot.call)}
            </div>
            <div
              className={`cell ${isArmed ? 'armed' : ''}`}
              role="button"
              onClick={() => canArm && armActual(currentSeries, shot.n)}
              style={{ opacity: canArm ? 1 : 0.5 }}
            >
              <div className="label">Actual {isArmed ? '(tap target)' : ''}</div>
              {cellText(shot.actual)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
