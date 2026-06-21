import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { IconHome, IconTarget, IconPlay, IconList, IconUser } from './Icons.jsx';

export default function NavBar({ onLogout }) {
  const { running, seconds, finishRequested, play } = useSession();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (finishRequested) {
      navigate('/active');
    }
  }, [finishRequested, navigate]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFabClick = () => {
    if (!running && seconds === 0) {
      play();
    }
    navigate('/active');
  };

  return (
    <>
      <div className="top-bar">
        <span className="brand-logo">SHOOTLOG</span>
        <button className="secondary logout-btn" onClick={onLogout}>Logout</button>
      </div>

      <nav className="bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IconHome size={22} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/skills" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IconTarget size={22} />
          <span>Skills</span>
        </NavLink>
        
        <div className="nav-fab-container">
          <button className={`nav-fab ${running || seconds > 0 ? 'running' : ''}`} onClick={handleFabClick}>
            {running || seconds > 0 ? (
              <span className="fab-timer">{formatTime(seconds)}</span>
            ) : (
              <IconPlay size={28} />
            )}
          </button>
        </div>

        <NavLink to="/sessions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IconList size={22} />
          <span>Feed</span>
        </NavLink>
        <NavLink to="/journal" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IconUser size={22} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </>
  );
}
