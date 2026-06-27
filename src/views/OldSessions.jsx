import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { gymApi } from '../lib/gymApi.js';
import SummaryModal from '../components/SummaryModal.jsx';
import LeafBack from '../components/LeafBack.jsx';
import { IconLink } from '../components/Icons.jsx';

export default function OldSessions() {
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(null); // full session object

  useEffect(() => { api.listSessions().then(setSessions).catch(() => {}); }, []);

  async function view(id) {
    const full = await api.getSession(id);
    if (!full.payload) {
      full.payload = {
        shots: full.shots || [],
        series: full.series || [],
        skillFocus: full.skillFocus || [],
        mode: full.mode || 'dry'
      };
    } else {
      full.payload.mode = full.mode || 'dry';
    }
    setOpen(full);
  }

  const shotItems = sessions.map((s) => ({ kind: 'shot', date: (s.started_at || s.date || '').split('T')[0], s }));
  const feed = shotItems.sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <LeafBack to="/shoot" label="Shoot" />
      <h2 style={{ marginBottom: '24px' }}>Your Activity Feed</h2>
      <div className="grid">
        {feed.map((item) => {


          const s = item.s;
          const ts = s.started_at || s.created_at || s.date;
          const dateStr = ts ? new Date(ts.replace(' ', 'T')).toLocaleDateString() : 'Unknown';
          
          let calculatedSkillShots = 0;
          if (s.skillFocus && s.skillFocus.length > 0) {
            const chunkedTables = [];
            let currentTable = [];
            let currentSeen = new Set();
            s.skillFocus.forEach((row) => {
              if (currentSeen.has(row.skillId || row.name)) {
                chunkedTables.push(currentTable);
                currentTable = [];
                currentSeen.clear();
              }
              currentTable.push(row);
              currentSeen.add(row.skillId || row.name);
            });
            if (currentTable.length > 0) chunkedTables.push(currentTable);

            chunkedTables.forEach(table => {
              let maxCols = 0;
              table.forEach(row => {
                let filled = 0;
                row.cells.forEach(c => { if (c && c !== '') filled++; });
                if (filled > maxCols) maxCols = filled;
              });
              calculatedSkillShots += maxCols;
            });
          }

          let totalShots = s.total_shots || 0;
          if (totalShots === 0) {
            totalShots = (s.shots?.length || (s.series ? s.series.reduce((sum, ser) => sum + (ser.shots?.length || 0), 0) : 0));
            totalShots = Math.max(totalShots, calculatedSkillShots);
          }
          
          const hasShots = s.hasShots ?? (totalShots > 0);
          const skillsTrained = s.skillsTrained || (s.skillFocus ? [...new Set(s.skillFocus.map(sf => sf.name))] : []);

          const isMatch = s.focus === 'match';
          const typeTags = isMatch ? ['Live Match'] : [s.mode === 'dry' ? 'Dry Fire' : 'Live Fire'];
          if (!isMatch && hasShots) typeTags.push('Shot Calling');
          if (!isMatch && skillsTrained && skillsTrained.length > 0) typeTags.push('Skill Focus');

          if (s.mode === 'mental') {
            return (
              <div className="card feed-card" key={s.id} style={{ borderLeft: '4px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent)' }}>Mental Training</h3>
                  <span className="muted" style={{ fontSize: '0.85rem', marginLeft: '12px' }}>{dateStr}</span>
                </div>
                
                <div className="stat-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="stat-item">
                    <span className="stat-label">Total Time</span>
                    <span className="stat-value">{Math.floor((s.duration_seconds || 0) / 60)}m {(s.duration_seconds || 0) % 60}s</span>
                  </div>
                </div>

                {s.comments && (
                  <div style={{ margin: '16px 0', padding: '12px', background: 'var(--panel-2)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' }}>
                    <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text)' }}>"{s.comments}"</p>
                  </div>
                )}

                <button onClick={() => view(s.id)} style={{ width: '100%', marginTop: '8px' }}>View Notes</button>
              </div>
            );
          }

          return (
          <div className="card feed-card" key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{typeTags.join(' + ')}</h3>
              <span className="muted" style={{ fontSize: '0.85rem', marginLeft: '12px' }}>{dateStr}</span>
            </div>
            
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">Shots</span>
                <span className="stat-value">{totalShots}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Time</span>
                <span className="stat-value">{Math.floor((s.duration_seconds || 0) / 60)}m {(s.duration_seconds || 0) % 60}s</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pace</span>
                <span className="stat-value">{totalShots ? ((s.duration_seconds || 0) / totalShots).toFixed(1) : 0}s / shot</span>
              </div>
              
              {skillsTrained && skillsTrained.length > 0 && (
                <div className="stat-item" style={{ gridColumn: 'span 3', marginTop: '8px' }}>
                  <span className="stat-label" style={{ marginBottom: '4px' }}>Skills Trained</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                    {skillsTrained.map((skill, i) => (
                      <span key={i} style={{ display: 'inline-block', background: 'var(--panel-2)', padding: '2px 8px', borderRadius: '4px', marginRight: '6px', marginBottom: '6px', border: '1px solid var(--line)' }}>
                        {skill}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {(s.comments || s.match_observation) && (
              <div style={{ margin: '16px 0', padding: '12px', background: 'var(--panel-2)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' }}>
                <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text)' }}>"{s.match_observation || s.comments}"</p>
              </div>
            )}

            {s.drive_link && (
              <a className="session-link" href={s.drive_link} target="_blank" rel="noopener noreferrer">
                <IconLink size={15} /> {isMatch ? 'Match video / photos' : 'Session video / photos'}
              </a>
            )}

            <button onClick={() => view(s.id)} style={{ width: '100%', marginTop: '8px' }}>View Analysis</button>
          </div>
          );
        })}
        {feed.length === 0 && <p className="muted">No activities found. Go shoot!</p>}
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
