import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api.js';
import { SessionProvider, useSession } from './context/SessionContext.jsx';
import PasswordGate from './components/PasswordGate.jsx';
import LockGate from './components/LockGate.jsx';
import NavBar from './components/NavBar.jsx';
import Home from './views/Home.jsx';
import Shoot from './views/Shoot.jsx';
import ActiveSession from './views/ActiveSession.jsx';
import GymToday from './views/Gym/GymToday.jsx';
import GymHistory from './views/Gym/GymHistory.jsx';
import GymProgress from './views/Gym/GymProgress.jsx';
import DailyJournal from './views/DailyJournal.jsx';
import CoachView from './views/CoachView.jsx';
import TrainingPlanView from './views/TrainingPlanView.jsx';

// The routed app. When a full-screen session is active, the nav chrome is hidden so the
// session takes over the whole screen (Strava-style) and can only be left via End/Discard.
function AppShell({ onLogout }) {
  const { sessionActive } = useSession();
  return (
    <>
      {!sessionActive && <NavBar onLogout={onLogout} />}
      {sessionActive ? (
        <Routes>
          <Route path="/session" element={<ActiveSession />} />
          <Route path="*" element={<Navigate to="/session" replace />} />
        </Routes>
      ) : (
        <>
          <main className="content">
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/gym" element={<GymToday />} />
              <Route path="/gym/history" element={<GymHistory />} />
              <Route path="/gym/progress" element={<GymProgress />} />
              <Route path="/shoot" element={<Shoot />} />
              <Route path="/session" element={<Navigate to="/shoot" replace />} />
              <Route path="/journal" element={<DailyJournal />} />
              <Route path="/coach" element={<CoachView />} />
              <Route path="/plan" element={<TrainingPlanView />} />
              {/* redirects from old paths so existing hash links keep working */}
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/active" element={<Navigate to="/shoot" replace />} />
              <Route path="/sessions" element={<Navigate to="/shoot?tab=feed" replace />} />
              <Route path="/skills" element={<Navigate to="/shoot?tab=skills" replace />} />
            </Routes>
          </main>
        </>
      )}
    </>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [lockOwner, setLockOwner] = useState(null);
  useEffect(() => {
    api.me().then((r) => { setAuthed(r.authed); if (r.authed) setLockOwner(api.getLockOwner()); })
      .catch(() => setAuthed(false));
  }, []);
  if (authed === null) return <div className="loading">Loading…</div>;
  if (!authed) return <PasswordGate onAuthed={() => { setAuthed(true); setLockOwner(api.getLockOwner()); }} />;
  if (lockOwner !== 'hosted') return <LockGate owner={lockOwner} onLocked={() => setLockOwner('hosted')} />;

  return (
    <HashRouter>
      <SessionProvider>
        <AppShell onLogout={async () => { await api.logout(); setAuthed(false); }} />
      </SessionProvider>
    </HashRouter>
  );
}
