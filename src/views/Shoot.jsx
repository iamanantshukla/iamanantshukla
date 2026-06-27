// src/views/Shoot.jsx — the shooting hub (spec E §4.5). NO internal tab-bar (the old four-tab
// mini-app fought the flat bottom-nav). The hub shows today's shooting plan + the one Start action,
// and links out to Feed / Skills / Reviews as LEAF routes (/shoot/feed, /shoot/skills,
// /shoot/reviews). The actual logging session lives full-screen at /session.
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { useJarvis } from '../context/JarvisContext.jsx';
import { prescribedStart } from '../lib/prescription.js';
import Pebble from '../components/Pebble.jsx';
import { IconPlay, IconChevronRight } from '../components/Icons.jsx';

export default function Shoot() {
  const navigate = useNavigate();
  const { startSession } = useSession();
  const jarvis = useJarvis();
  const shooting = jarvis.mission && jarvis.mission.shooting;

  const beginSession = () => {
    // Launch the prescribed session from today.json (falls back to dry / shot-calling); the
    // user can still toggle mode/focus in-session.
    const { mode, focus } = prescribedStart(jarvis.mission);
    startSession(mode, focus);
    navigate('/session');
  };

  const leaf = (path, label) => (
    <button className="agenda-row" onClick={() => navigate(path)}>
      <span className="agenda-body"><span className="agenda-t">{label}</span></span>
      <IconChevronRight size={18} className="agenda-chev" />
    </button>
  );

  return (
    <div className="shoot-hub">
      <div className="hub-head">
        <Pebble size={32} variant="face" expression={jarvis.expression} />
        <h1 className="hub-title">10m Air Pistol</h1>
        <button className="hub-start" onClick={beginSession}><IconPlay size={16} /> Start session</button>
      </div>

      <div className="says-card">
        <div className="says-text">
          {shooting ? (shooting.prescription || shooting.module) : "Today's plan will appear once the planner has run."}
        </div>
      </div>

      <div className="section-label">More</div>
      {leaf('/shoot/feed', 'Past sessions')}
      {leaf('/shoot/skills', 'Skills')}
      {leaf('/shoot/reviews', 'AI reviews')}
    </div>
  );
}
