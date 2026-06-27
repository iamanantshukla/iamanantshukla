import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { api } from './lib/api.js';
import { THIS_DEVICE } from './lib/config.js';
import { SessionProvider, useSession } from './context/SessionContext.jsx';
import { JarvisProvider } from './context/JarvisContext.jsx';
import { SyncProvider } from './context/SyncContext.jsx';
import AuthGate from './components/AuthGate.jsx';
import LockGate from './components/LockGate.jsx';
import NavBar from './components/NavBar.jsx';
import Home from './views/Home.jsx';
import Shoot from './views/Shoot.jsx';
import OldSessions from './views/OldSessions.jsx';
import SkillsCatalogue from './views/SkillsCatalogue.jsx';
import ReviewsView from './views/ReviewsView.jsx';
import ActiveSession from './views/ActiveSession.jsx';
import GymToday from './views/Gym/GymToday.jsx';
import GymHistory from './views/Gym/GymHistory.jsx';
import GymProgress from './views/Gym/GymProgress.jsx';
import DailyJournal from './views/DailyJournal.jsx';
import CampaignView from './views/CampaignView.jsx';

// Legacy `/shoot?tab=…` links → the new leaf paths (spec E §6 migration shim). Reads the query
// once and redirects so saved `…/#/shoot?tab=reviews` links still land correctly.
function ShootTabRedirect() {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  const map = { feed: '/shoot/feed', skills: '/shoot/skills', reviews: '/shoot/reviews' };
  return <Navigate to={map[tab] || '/shoot'} replace />;
}

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
              {/* ── Canonical: one path per destination (spec E §3.2) ── */}
              <Route path="/" element={<Home />} />
              <Route path="/shoot" element={<ShootTabRedirectOrHub />} />
              <Route path="/shoot/feed" element={<OldSessions />} />
              <Route path="/shoot/skills" element={<SkillsCatalogue />} />
              <Route path="/shoot/reviews" element={<ReviewsView />} />
              <Route path="/session" element={<Navigate to="/shoot" replace />} />
              <Route path="/gym" element={<GymToday />} />
              <Route path="/gym/history" element={<GymHistory />} />
              <Route path="/gym/progress" element={<GymProgress />} />
              <Route path="/journal" element={<DailyJournal />} />
              <Route path="/campaign" element={<CampaignView />} />

              {/* ── Legacy redirect table — kept one release so PWA shortcuts / deep links survive ── */}
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/plan" element={<Navigate to="/" replace />} />
              <Route path="/season" element={<Navigate to="/campaign" replace />} />
              <Route path="/coach" element={<Navigate to="/" replace />} />
              <Route path="/active" element={<Navigate to="/session" replace />} />
              <Route path="/sessions" element={<Navigate to="/shoot/feed" replace />} />
              <Route path="/skills" element={<Navigate to="/shoot/skills" replace />} />

              {/* Unknown paths fall through to Home, never a blank screen (spec E §7). */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      )}
    </>
  );
}

// /shoot resolves to the hub, unless a legacy ?tab= query is present (then redirect to the leaf).
function ShootTabRedirectOrHub() {
  const [params] = useSearchParams();
  if (params.get('tab')) return <ShootTabRedirect />;
  return <Shoot />;
}

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [lockOwner, setLockOwner] = useState(null);

  useEffect(() => {
    api.me().then((r) => {
      setAuthed(r.authed);
      // The lock owner is a Drive singleton (lock.json) read identically on both targets.
      setLockOwner(r.authed ? api.getLockOwner() : THIS_DEVICE);
    }).catch(() => {
      setAuthed(false);
      setLockOwner(THIS_DEVICE);
    });
  }, []);

  if (authed === null || lockOwner === null) return <div className="loading">Loading…</div>;
  if (!authed) return <AuthGate onAuthed={() => setAuthed(true)} />;
  if (lockOwner !== THIS_DEVICE) return <LockGate owner={lockOwner} onLocked={() => setLockOwner(THIS_DEVICE)} />;

  return (
    <HashRouter>
      <SyncProvider>
        <SessionProvider>
          <JarvisProvider>
            <AppShell onLogout={async () => { await api.logout(); setAuthed(false); }} />
          </JarvisProvider>
        </SessionProvider>
      </SyncProvider>
    </HashRouter>
  );
}
