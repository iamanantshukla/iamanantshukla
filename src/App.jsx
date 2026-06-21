import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api.js';
import { SessionProvider } from './context/SessionContext.jsx';
import PasswordGate from './components/PasswordGate.jsx';
import LockGate from './components/LockGate.jsx';
import NavBar from './components/NavBar.jsx';
import ActiveSession from './views/ActiveSession.jsx';
import OldSessions from './views/OldSessions.jsx';
import SkillsCatalogue from './views/SkillsCatalogue.jsx';
import DailyJournal from './views/DailyJournal.jsx';
import ReviewsView from './views/ReviewsView.jsx';
import DashboardView from './views/DashboardView.jsx';
import CoachView from './views/CoachView.jsx';
import TrainingPlanView from './views/TrainingPlanView.jsx';

export default function App() {
  const [authed, setAuthed] = useState(null); // null=loading
  const [lockOwner, setLockOwner] = useState(null);

  useEffect(() => { 
    api.me().then((r) => {
      setAuthed(r.authed);
      if (r.authed) setLockOwner(api.getLockOwner());
    }).catch(() => setAuthed(false)); 
  }, []);

  if (authed === null) return <div className="loading">Loading…</div>;
  if (!authed) return <PasswordGate onAuthed={() => { setAuthed(true); setLockOwner(api.getLockOwner()); }} />;
  if (lockOwner !== 'hosted') return <LockGate owner={lockOwner} onLocked={() => setLockOwner('hosted')} />;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider>
        <NavBar onLogout={async () => { await api.logout(); setAuthed(false); }} />
        <main className="content">
          <Routes>
            {/* Phase 1 Setup: Map old views to new routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/sessions" element={<OldSessions />} />
            <Route path="/active" element={<ActiveSession />} />
            <Route path="/skills" element={<SkillsCatalogue />} />
            <Route path="/journal" element={<DailyJournal />} />
            
            {/* Future routes for Phase 3/4 */}
            <Route path="/coach" element={<CoachView />} /> 
            <Route path="/plan" element={<TrainingPlanView />} /> 
          </Routes>
        </main>
      </SessionProvider>
    </BrowserRouter>
  );
}
