import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { IconHome, IconTarget, IconPlay, IconPause, IconList, IconUser } from './Icons.jsx';

export default function NavBar({ onLogout }) {
  const { running, seconds, finishRequested, play, pause, mode, setMode, focus, setFocus } = useSession();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [tempMode, setTempMode] = useState('dry');
  const [tempFocus, setTempFocus] = useState('shot');
  
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
      setTempMode(mode);
      setTempFocus(focus);
      setShowModal(true);
    } else {
      if (running) pause();
      else play();
    }
  };

  const startSession = () => {
    setMode(tempMode);
    setFocus(tempFocus);
    play();
    setShowModal(false);
    navigate('/active');
  };

  return (
    <>
      <div className="top-bar">
        <span className="brand-logo">SHOOTLOG</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(running || seconds > 0) && (
            <button className="secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '999px', borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => navigate('/active')}>
              View Session
            </button>
          )}
          <button className="secondary logout-btn" onClick={onLogout}>Logout</button>
        </div>
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
          <button className={`nav-fab ${running ? 'running' : (seconds > 0 ? 'paused' : '')}`} onClick={handleFabClick}>
            {running || seconds > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                 {running ? <IconPause size={20} /> : <IconPlay size={20} />}
                 <span className="fab-timer" style={{ fontSize: '0.8rem', color: running ? 'var(--accent)' : 'var(--muted)' }}>{formatTime(seconds)}</span>
              </div>
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

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ width: '100%', maxWidth: '380px', padding: '24px 20px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.4rem' }}>Start New Session</h2>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Training Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={tempFocus === 'shot' ? '' : 'secondary'} 
                  style={{ flex: 1 }} 
                  onClick={() => setTempFocus('shot')}
                >
                  Shot Calling
                </button>
                <button 
                  className={tempFocus === 'skill' ? '' : 'secondary'} 
                  style={{ flex: 1 }} 
                  onClick={() => setTempFocus('skill')}
                >
                  Skill Focus
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label>Mode</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={tempMode === 'dry' ? '' : 'secondary'} 
                  style={{ flex: 1 }} 
                  onClick={() => setTempMode('dry')}
                >
                  Dry Fire
                </button>
                <button 
                  className={tempMode === 'live' ? '' : 'secondary'} 
                  style={{ flex: 1 }} 
                  onClick={() => setTempMode('live')}
                >
                  Live Fire
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={startSession}>
                <IconPlay size={18} /> Start
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
