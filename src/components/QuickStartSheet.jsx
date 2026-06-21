// src/components/QuickStartSheet.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { IconTarget, IconDumbbell, IconNotebook } from './Icons.jsx';

export default function QuickStartSheet({ open, onClose }) {
  const { setMode, setFocus, play } = useSession();
  const navigate = useNavigate();
  const [mode, setLocalMode] = useState('dry');     // 'dry' | 'live'
  const [focus, setLocalFocus] = useState('shot');  // 'shot' | 'skill'
  if (!open) return null;

  const startSession = () => {
    setMode(mode); setFocus(focus); play();
    onClose(); navigate('/shoot');
  };
  const go = (path) => { onClose(); navigate(path); };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" />
        <h3 className="sheet-title">Start something</h3>

        <div className="sheet-card">
          <div className="sheet-card-head"><IconTarget size={18} /> Shooting session</div>
          <div className="seg-row">
            <button className={mode === 'dry' ? '' : 'secondary'} onClick={() => setLocalMode('dry')}>Dry Fire</button>
            <button className={mode === 'live' ? '' : 'secondary'} onClick={() => setLocalMode('live')}>Live Fire</button>
          </div>
          <div className="seg-row">
            <button className={focus === 'shot' ? '' : 'secondary'} onClick={() => setLocalFocus('shot')}>Shot Calling</button>
            <button className={focus === 'skill' ? '' : 'secondary'} onClick={() => setLocalFocus('skill')}>Skill Focus</button>
          </div>
          <button className="sheet-go" onClick={startSession}>Start session</button>
        </div>

        <button className="sheet-link" onClick={() => go('/gym')}><IconDumbbell size={18} /> Today's workout</button>
        <button className="sheet-link" onClick={() => go('/journal')}><IconNotebook size={18} /> Journal entry</button>
      </div>
    </div>
  );
}
