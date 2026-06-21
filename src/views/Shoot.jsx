// src/views/Shoot.jsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ActiveSession from './ActiveSession.jsx';
import OldSessions from './OldSessions.jsx';
import SkillsCatalogue from './SkillsCatalogue.jsx';
import ReviewsView from './ReviewsView.jsx';

const TABS = [
  { key: 'session', label: 'Session' },
  { key: 'feed', label: 'Feed' },
  { key: 'skills', label: 'Skills' },
  { key: 'reviews', label: 'Reviews' },
];

export default function Shoot() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'session');
  return (
    <div className="shoot-hub">
      <h1 className="hub-title">10m Air Pistol</h1>
      <div className="hub-subtabs">
        {TABS.map(t => (
          <button key={t.key} className={`hub-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: tab === 'session' ? 'block' : 'none' }}><ActiveSession /></div>
      {tab === 'feed' && <OldSessions />}
      {tab === 'skills' && <SkillsCatalogue />}
      {tab === 'reviews' && <ReviewsView />}
    </div>
  );
}
