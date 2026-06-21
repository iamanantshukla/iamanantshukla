import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import Timer from './Timer.jsx';

export default function NavBar({ onLogout }) {
  const { mode, setMode, finishRequested } = useSession();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (finishRequested) {
      navigate('/active');
    }
  }, [finishRequested, navigate]);

  const navItem = (to, label) => (
    <NavLink 
      to={to} 
      className={({ isActive }) => (isActive ? 'active' : '')}
    >
      {label}
    </NavLink>
  );

  return (
    <nav className="nav">
      <span className="brand">STRAVA / SHOOT</span>
      <div className="spacer" style={{ flex: 1 }}></div>
      <div className="tabs-pill">
        {navItem('/dashboard', 'Dashboard')}
        {navItem('/skills', 'Skills')}
        {navItem('/sessions', 'Feed')}
        {navItem('/coach', 'AI Coach')}
        {navItem('/plan', 'Training Plan')}
      </div>
      <div className="spacer" style={{ flex: 1 }}></div>
      <div className="toggle" role="group" aria-label="Training mode">
        <button className={mode === 'live' ? 'on' : ''} onClick={() => setMode('live')}>Live</button>
        <button className={mode === 'dry' ? 'on' : ''} onClick={() => setMode('dry')}>Dry</button>
      </div>
      <Timer />
      <button className="primary" onClick={() => navigate('/active')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '999px', fontWeight: 600, cursor: 'pointer', marginLeft: '8px' }}>Start Session</button>
      <button className="secondary" onClick={onLogout} style={{ marginLeft: '8px' }}>Logout</button>
    </nav>
  );
}
