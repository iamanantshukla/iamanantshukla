import { useSession } from '../context/SessionContext.jsx';

function fmt(total) {
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Timer() {
  const { seconds, running, play, pause, stop } = useSession();
  return (
    <div className="mode">
      <span className="timer">{fmt(seconds)}</span>
      {!running
        ? <button className="secondary" onClick={play} aria-label="Play">▶</button>
        : <button className="secondary" onClick={pause} aria-label="Pause">⏸</button>}
      <button className="secondary" onClick={stop} aria-label="Stop">⏹</button>
    </div>
  );
}
