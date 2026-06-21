import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DailyJournal() {
  const [dateObj, setDateObj] = useState(new Date());
  const [journal, setJournal] = useState({
    running: false,
    running_kms: '',
    gym: false,
    gym_muscles: '',
    sleeping_hours: '',
    observation: ''
  });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const dateStr = getLocalDateString(dateObj);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage('');
      try {
        const [jRes, sRes] = await Promise.all([
          api.getJournal(dateStr),
          api.listSessions(dateStr)
        ]);
        setJournal({
          running: jRes.running === 1,
          running_kms: jRes.running_kms || '',
          gym: jRes.gym === 1,
          gym_muscles: jRes.gym_muscles || '',
          sleeping_hours: jRes.sleeping_hours || '',
          observation: jRes.observation || ''
        });
        setSessions(sRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateStr]);

  function shiftDay(days) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + days);
    setDateObj(d);
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      await api.saveJournal(dateStr, journal);
      setMessage('Journal saved successfully.');
    } catch (e) {
      setMessage('Failed to save journal.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="subtabs" style={{ marginBottom: '24px' }}>
        <button onClick={() => shiftDay(-1)}>← Previous</button>
        <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{dateObj.toLocaleDateString()}</span>
        <button onClick={() => shiftDay(1)}>Next →</button>
        <button onClick={() => setDateObj(new Date())} style={{ marginLeft: '16px' }}>Today</button>
      </div>

      <div className="journal-layout">
        <div>
          <h2 style={{ marginBottom: '24px' }}>Activities on this day</h2>
          <div>
            {sessions.length === 0 && <p className="muted">No activities recorded.</p>}
            {sessions.map((s) => {
              const typeTags = [s.mode === 'dry' ? 'Dry Fire' : 'Live Fire'];
              if (s.hasShots) typeTags.push('Shot Calling');
              if (s.skillsTrained && s.skillsTrained.length > 0) typeTags.push('Skill Focus');

              return (
              <div className="card feed-card" key={s.id} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{typeTags.join(' + ')}</h3>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <div className="stat-grid" style={{ marginBottom: '12px' }}>
                  <div className="stat-item">
                    <span className="stat-label">Shots</span>
                    <span className="stat-value">{s.total_shots}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Time</span>
                    <span className="stat-value">{Math.floor(s.duration_seconds / 60)}m {s.duration_seconds % 60}s</span>
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
                  <div style={{ background: 'var(--panel-2)', padding: '12px', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)', fontSize: '0.9em', whiteSpace: 'pre-wrap' }}>
                    <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text)' }}>"{s.comments}"</p>
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>

        <div className="card">
          <h2>Daily Journal</h2>
          {loading ? <p>Loading...</p> : (
            <div style={{ marginTop: '16px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={journal.running}
                    onChange={(e) => setJournal({ ...journal, running: e.target.checked })}
                  />
                  Running
                </label>
                {journal.running && (
                  <input
                    type="text"
                    placeholder="e.g. 5 kms"
                    value={journal.running_kms}
                    onChange={(e) => setJournal({ ...journal, running_kms: e.target.value })}
                    style={{ marginTop: '8px', width: '100%' }}
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={journal.gym}
                    onChange={(e) => setJournal({ ...journal, gym: e.target.checked })}
                  />
                  Gym
                </label>
                {journal.gym && (
                  <input
                    type="text"
                    placeholder="Muscle groups targeted (e.g. Chest and Triceps)"
                    value={journal.gym_muscles}
                    onChange={(e) => setJournal({ ...journal, gym_muscles: e.target.value })}
                    style={{ marginTop: '8px', width: '100%' }}
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Total Sleeping hours (hh:mm or text)</label>
                <input
                  type="text"
                  placeholder="e.g. 7 hours 30 mins"
                  value={journal.sleeping_hours}
                  onChange={(e) => setJournal({ ...journal, sleeping_hours: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Observation</label>
                <textarea
                  placeholder="Reflections on the day..."
                  value={journal.observation}
                  onChange={(e) => setJournal({ ...journal, observation: e.target.value })}
                  style={{ width: '100%', minHeight: '160px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '12px', borderRadius: 'var(--radius)' }}
                />
              </div>

              <button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Journal'}</button>
              {message && <span style={{ marginLeft: '16px' }} className="muted">{message}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
