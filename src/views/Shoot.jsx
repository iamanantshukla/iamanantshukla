// src/views/Shoot.jsx — shooting hub. Default tab "Today" shows today's training plan
// and a "Start new session" button that opens the full-screen activity-mode session.
// The actual logging session is NOT a tab here anymore (it lives at /session).
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import TrainingPlanView from './TrainingPlanView.jsx';
import OldSessions from './OldSessions.jsx';
import SkillsCatalogue from './SkillsCatalogue.jsx';
import ReviewsView from './ReviewsView.jsx';
import { IconPlay } from '../components/Icons.jsx';

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'feed', label: 'Feed' },
  { key: 'skills', label: 'Skills' },
  { key: 'reviews', label: 'Reviews' },
];

export default function Shoot() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { startSession } = useSession();
  const initial = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'today';
  const [tab, setTab] = useState(initial);

  const beginSession = () => {
    // Default to the previous flow's dry / shot-calling; user can still toggle in-session.
    startSession('dry', 'shot');
    navigate('/session');
  };

  return (
    <div className="shoot-hub">
      <div className="hub-head">
        <h1 className="hub-title">10m Air Pistol</h1>
        <button className="hub-start" onClick={beginSession}><IconPlay size={16} /> Start new session</button>
      </div>
      <div className="hub-subtabs">
        {TABS.map((t) => (
          <button key={t.key} className={`hub-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {tab === 'today' && <TrainingPlanView />}
      {tab === 'feed' && <OldSessions />}
      {tab === 'skills' && <SkillsCatalogue />}
      {tab === 'reviews' && <ReviewsView />}
    </div>
  );
}
