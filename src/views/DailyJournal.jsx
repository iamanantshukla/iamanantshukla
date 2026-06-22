import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api.js';
import WeekStrip from '../components/WeekStrip.jsx';
import { localDateString, weekDays } from '../lib/gymDates.js';
import { getPlanForDate } from '../lib/gymPlan.js';
import { gymApi } from '../lib/gymApi.js';
import { IconRun, IconDumbbell, IconMoon, IconPencil } from '../components/Icons.jsx';

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

  // Per-day dots for the week of the selected day: 'done' if a workout was logged
  // that day, else 'plan' if a workout is scheduled (non-rest day), else 'none'.
  const dots = useMemo(() => {
    const result = {};
    for (const d of weekDays(new Date(dateStr + 'T00:00:00'))) {
      const ds = localDateString(d);
      if (gymApi.getWorkoutForDate(ds)) result[ds] = 'done';
      else if (getPlanForDate(ds).dayKey !== 'rest') result[ds] = 'plan';
    }
    return result;
  }, [dateStr, gymApi.listWorkouts().length]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage('');
      try {
        const [jRes, sRes] = await Promise.all([
          api.getJournal(dateStr),
          api.listSessions(dateStr)
        ]);
        const loadedGym = jRes.gym === 1;
        const loadedGymMuscles = jRes.gym_muscles || '';
        // Auto-fill the gym summary from a logged workout (spec §7) so the day reads
        // as "complete" without re-typing. Only pre-fills in-memory form state when the
        // journal has no gym data yet; does not overwrite saved gym_muscles or auto-save.
        const workout = gymApi.getWorkoutForDate(dateStr);
        const prefillGym = workout && !loadedGym && !loadedGymMuscles;
        setJournal({
          running: jRes.running === 1,
          running_kms: jRes.running_kms || '',
          gym: prefillGym ? true : loadedGym,
          gym_muscles: prefillGym ? (workout.dayTitle || '') : loadedGymMuscles,
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
      <WeekStrip
        anchor={dateObj}
        selected={dateStr}
        onSelect={(ds) => setDateObj(new Date(ds + 'T00:00:00'))}
        dots={dots}
      />

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

                {s.live_notes && s.live_notes.length > 0 && (
                  <ul className="live-note-list" style={{ marginTop: 8 }}>
                    {s.live_notes.map((n, i) => <li key={i}>{n.text}</li>)}
                  </ul>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IconRun size={16} /> Running</span>
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
                <label style={{ display: 'block', marginBottom: '8px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IconMoon size={16} /> Total Sleeping hours (hh:mm or text)</span></label>
                <input
                  type="text"
                  placeholder="e.g. 7 hours 30 mins"
                  value={journal.sleeping_hours}
                  onChange={(e) => setJournal({ ...journal, sleeping_hours: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IconPencil size={16} /> Observation</span></label>
                <textarea
                  placeholder="Reflections on the day..."
                  value={journal.observation}
                  onChange={(e) => setJournal({ ...journal, observation: e.target.value })}
                  style={{ width: '100%', minHeight: '160px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '12px', borderRadius: 'var(--radius)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Journal'}</button>
                <button className="secondary" onClick={async () => {
                  try {
                    alert('Triggering daily review... Check the Shoot -> Reviews tab for progress.');
                    await api.triggerDailyReview(dateStr);
                  } catch(e) { alert(e.message); }
                }}>Trigger Daily AI Review</button>
                <button className="secondary" onClick={async () => {
                  try {
                    alert('Triggering weekly trend review... Check the Shoot -> Reviews tab for progress.');
                    // Compute monday of current dateStr
                    const d = new Date(dateStr + 'T00:00:00');
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                    d.setDate(diff);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dayStr = String(d.getDate()).padStart(2, '0');
                    await api.triggerWeeklyReview(`${y}-${m}-${dayStr}`);
                  } catch(e) { alert(e.message); }
                }}>Trigger Weekly AI Review</button>
              </div>
              {message && <span style={{ marginLeft: '16px', display: 'block', marginTop: '12px' }} className="muted">{message}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
