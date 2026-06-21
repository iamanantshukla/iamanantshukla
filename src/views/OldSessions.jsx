import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import SummaryModal from '../components/SummaryModal.jsx';

export default function OldSessions() {
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(null); // full session object

  useEffect(() => { api.listSessions().then(setSessions).catch(() => {}); }, []);

  async function view(id) {
    const full = await api.getSession(id);
    setOpen(full);
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Your Activity Feed</h2>
      <div className="grid">
        {sessions.map((s) => {
          const typeTags = [s.mode === 'dry' ? 'Dry Fire' : 'Live Fire'];
          if (s.hasShots) typeTags.push('Shot Calling');
          if (s.skillsTrained && s.skillsTrained.length > 0) typeTags.push('Skill Focus');

          return (
          <div className="card feed-card" key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{typeTags.join(' + ')}</h3>
              <span className="muted" style={{ fontSize: '0.85rem', marginLeft: '12px' }}>{new Date(s.date).toLocaleDateString()}</span>
            </div>
            
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">Shots</span>
                <span className="stat-value">{s.total_shots}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Time</span>
                <span className="stat-value">{Math.floor(s.duration_seconds / 60)}m {s.duration_seconds % 60}s</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pace</span>
                <span className="stat-value">{s.total_shots ? (s.duration_seconds / s.total_shots).toFixed(1) : 0}s / shot</span>
              </div>
              
              {s.skillsTrained && s.skillsTrained.length > 0 && (
                <div className="stat-item" style={{ gridColumn: 'span 3', marginTop: '8px' }}>
                  <span className="stat-label" style={{ marginBottom: '4px' }}>Skills Trained</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                    {s.skillsTrained.map((skill, i) => (
                      <span key={i} style={{ display: 'inline-block', background: 'var(--panel-2)', padding: '2px 8px', borderRadius: '4px', marginRight: '6px', marginBottom: '6px', border: '1px solid var(--line)' }}>
                        {skill}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {s.comments && (
              <div style={{ margin: '16px 0', padding: '12px', background: 'var(--panel-2)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' }}>
                <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text)' }}>"{s.comments}"</p>
              </div>
            )}

            <button onClick={() => view(s.id)} style={{ width: '100%', marginTop: '8px' }}>View Analysis</button>
          </div>
          );
        })}
        {sessions.length === 0 && <p className="muted">No activities found. Go shoot!</p>}
      </div>

      {open && (
        <SummaryModal
          session={open.payload}
          initialComments={open.comments}
          onSaveComments={async (comments) => {
            await api.updateSessionComments(open.id, comments);
            // Update local state to reflect changes without a full refetch
            setOpen({ ...open, comments });
            setSessions(sessions.map(s => s.id === open.id ? { ...s, comments } : s));
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
