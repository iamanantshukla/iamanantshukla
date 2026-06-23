// src/components/QuickStartSheet.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { IconTarget, IconDumbbell, IconNotebook } from './Icons.jsx';

export default function QuickStartSheet({ open, onClose }) {
  const { startSession } = useSession();
  const navigate = useNavigate();
  const [kind, setKind] = useState('practice');     // 'practice' | 'match'
  const [mode, setLocalMode] = useState('dry');     // 'dry' | 'live' (practice only)
  const [focus, setLocalFocus] = useState('shot');  // 'shot' | 'skill' (practice only)
  if (!open) return null;

  const begin = () => {
    // A match is a live competition string (timer + notes only); practice keeps mode + focus.
    if (kind === 'match') startSession('live', 'match');
    else startSession(mode, focus);
    onClose(); navigate('/session');
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
            <button className={kind === 'practice' ? '' : 'secondary'} onClick={() => setKind('practice')}>Practice</button>
            <button className={kind === 'match' ? '' : 'secondary'} onClick={() => setKind('match')}>Live Match</button>
          </div>

          {kind === 'practice' ? (
            <>
              <div className="seg-row">
                <button className={mode === 'dry' ? '' : 'secondary'} onClick={() => setLocalMode('dry')}>Dry Fire</button>
                <button className={mode === 'live' ? '' : 'secondary'} onClick={() => setLocalMode('live')}>Live Fire</button>
              </div>
              <div className="seg-row">
                <button className={focus === 'shot' ? '' : 'secondary'} onClick={() => setLocalFocus('shot')}>Shot Calling</button>
                <button className={focus === 'skill' ? '' : 'secondary'} onClick={() => setLocalFocus('skill')}>Skill Focus</button>
              </div>
            </>
          ) : (
            <p className="muted" style={{ fontSize: '.8rem', margin: '0 0 10px' }}>
              A live competition string: timer and in-the-moment notes only. Attach your SIUS file, a video link, and your match observation at the end.
            </p>
          )}

          <button className="sheet-go" onClick={begin}>Start {kind === 'match' ? 'match' : 'session'}</button>
        </div>

        <button className="sheet-link" onClick={() => go('/gym')}><IconDumbbell size={18} /> Today's workout</button>
        <button className="sheet-link" onClick={() => go('/journal')}><IconNotebook size={18} /> Journal entry</button>
      </div>
    </div>
  );
}
