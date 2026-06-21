// src/components/RunningSessionBar.jsx
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { IconPlay, IconPause } from './Icons.jsx';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function RunningSessionBar() {
  const { running, seconds, play, pause } = useSession();
  const navigate = useNavigate();
  if (!running && seconds === 0) return null; // no active session
  return (
    <div className="running-bar" onClick={() => navigate('/shoot')}>
      <span className="running-dot" />
      <span className="running-label">{running ? 'Session running' : 'Paused'}</span>
      <span className="running-timer">{fmt(seconds)}</span>
      <button
        className="running-toggle"
        aria-label={running ? 'Pause' : 'Resume'}
        onClick={(e) => { e.stopPropagation(); running ? pause() : play(); }}
      >
        {running ? <IconPause size={18} /> : <IconPlay size={18} />}
      </button>
    </div>
  );
}
