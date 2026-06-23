import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api.js';
import WeekStrip from '../components/WeekStrip.jsx';
import Pebble from '../components/Pebble.jsx';
import { localDateString, weekDays } from '../lib/gymDates.js';
import { getPlanForDate } from '../lib/gymPlan.js';
import { gymApi } from '../lib/gymApi.js';
import { IconRun, IconDumbbell, IconMoon, IconCheck, IconLink } from '../components/Icons.jsx';

function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Mood model: ordered low -> great. Each maps to a distinct Pebble expression and a
// short, in-voice affirmation. This is the SINGLE source of truth — the greeting face
// is looked up from here so the mood button and the greeting Pebble always agree.
const MOODS = [
  { key: 'low',   label: 'Low',   expression: 'sad' },
  { key: 'down',  label: 'Down',  expression: 'sleepy' },
  { key: 'okay',  label: 'Okay',  expression: 'neutral' },
  { key: 'good',  label: 'Good',  expression: 'happy' },
  { key: 'great', label: 'Great', expression: 'proud' },
];

const MOOD_AFFIRMATION = {
  '':     'Take a quiet minute for yourself. Tap how today felt and we will go from there.',
  low:    'Heavy days happen. You still showed up here, and that is enough for now. Be gentle with yourself.',
  down:   'Not every day is a good one, and that is okay. Logging it is a small kind thing to do for future you.',
  okay:   'A steady, ordinary day. Those add up to more than they seem. Let us note what mattered.',
  good:   'Good days are worth marking. Let us capture what went right so you can do it again.',
  great:  'Love to see it. Days like this are fuel, so let us remember exactly why it felt great.',
};

// Pebble expression for the greeting, derived from the single MOODS source of truth so
// the greeting face matches the picked mood button exactly. Neutral until a mood is set.
function greetingExpression(mood) {
  const m = MOODS.find((x) => x.key === mood);
  return m ? m.expression : 'neutral';
}

// Derive a session's display fields from the stored shape (saveSession persists
// mode/duration_seconds/series/skillFocus/manual_shots/live_notes/started_at, NOT
// total_shots/date/hasShots/skillsTrained). Mirrors OldSessions.jsx so the feed shows
// real shot counts, times, and skills instead of "Invalid Date" / blanks.
function deriveSession(s) {
  let totalShots = s.total_shots || 0;
  if (totalShots === 0) {
    const fromSeries = s.series ? s.series.reduce((sum, ser) => sum + (ser.shots?.length || 0), 0) : 0;
    totalShots = (s.shots?.length || fromSeries) + (Number(s.manual_shots) || 0);
  }
  const hasShots = s.hasShots ?? (totalShots > 0);
  const skillsTrained = s.skillsTrained || (s.skillFocus ? [...new Set(s.skillFocus.map((sf) => sf.name).filter(Boolean))] : []);
  const ts = s.started_at || s.created_at || s.date;
  return { totalShots, hasShots, skillsTrained, ts };
}

// Controlled tag vocabulary (retrieval layer). No emoji — plain words.
const TAG_VOCAB = ['competition', 'travel', 'illness', 'PR', 'deload', 'breakthrough', 'low-sleep', 'rest', 'conflict'];

// Segmented 1-N tap control writing a number (0 = not set). Optional `hint` clarifies
// the scale's direction (e.g. "low to high") so logged values stay interpretable later.
function JrScale({ label, value, max, onChange, hint }) {
  const items = [];
  for (let i = 1; i <= max; i++) items.push(i);
  return (
    <div className="jr-scale-row">
      <span className="jr-scale-label">{label}{hint && <small className="jr-scale-hint">{hint}</small>}</span>
      <div className="jr-scale" role="group" aria-label={hint ? `${label}, ${hint}` : label}>
        {items.map((n) => (
          <button
            key={n}
            type="button"
            className={value === n ? 'on' : ''}
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? 0 : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// Labeled single-line reflection input.
function JrPrompt({ label, placeholder, value, onChange }) {
  return (
    <div className="jr-prompt form-group">
      <label>{label}</label>
      <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// One averaged signal tile for the weekly trends card. `stat` is { avg, count };
// renders a dash when nobody logged it that week so empty signals read honestly.
function JrTrend({ label, stat, max }) {
  const has = stat && stat.count > 0;
  return (
    <div className="jr-trend">
      <div className="jr-trend-val">{has ? stat.avg : '–'}{has && max ? <small>/{max}</small> : null}</div>
      <div className="jr-trend-label">{label}</div>
    </div>
  );
}

export default function DailyJournal() {
  const [dateObj, setDateObj] = useState(new Date());
  const [journal, setJournal] = useState({
    running: false,
    running_kms: '',
    gym: false,
    gym_muscles: '',
    sleeping_hours: '',
    observation: '',
    // structured check-in fields (additive)
    mood: '',
    energy: 0,
    body: 0,
    stress: 0,
    sleep_quality: 0,
    training_rpe: 0,
    shooting_feel: 0,
    highlight: '',
    challenge: '',
    lesson: '',
    gratitude: '',
    tomorrow_focus: '',
    tags: []
  });
  const [sessions, setSessions] = useState([]);
  const [carryover, setCarryover] = useState(''); // yesterday's tomorrow_focus
  const [weekCheckin, setWeekCheckin] = useState(null); // week rollup of structured signals
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false); // drives the proud post-save says-card
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
      setSaved(false);
      try {
        // Compute yesterday's date string for the carry-over of tomorrow_focus.
        const prev = new Date(dateStr + 'T00:00:00');
        prev.setDate(prev.getDate() - 1);
        const prevStr = getLocalDateString(prev);
        const [jRes, sRes, prevRes] = await Promise.all([
          api.getJournal(dateStr),
          api.listSessions(dateStr),
          api.getJournal(prevStr)
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
          observation: jRes.observation || '',
          // structured fields, read defensively so legacy/empty days are safe
          mood: jRes.mood || '',
          energy: Number(jRes.energy) || 0,
          body: Number(jRes.body) || 0,
          stress: Number(jRes.stress) || 0,
          sleep_quality: Number(jRes.sleep_quality) || 0,
          training_rpe: Number(jRes.training_rpe) || 0,
          shooting_feel: Number(jRes.shooting_feel) || 0,
          highlight: jRes.highlight || '',
          challenge: jRes.challenge || '',
          lesson: jRes.lesson || '',
          gratitude: jRes.gratitude || '',
          tomorrow_focus: jRes.tomorrow_focus || '',
          tags: Array.isArray(jRes.tags) ? jRes.tags : []
        });
        setCarryover((prevRes && prevRes.tomorrow_focus) || '');
        setSessions(sRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateStr]);

  // Week rollup of the structured check-in signals (reads the new fields back over
  // time — the "long-term tracking" surface). Refreshes after a save via `saved`.
  useEffect(() => {
    api.getStats(dateStr)
      .then((s) => setWeekCheckin(s && s.week ? s.week.checkin : null))
      .catch(() => setWeekCheckin(null));
  }, [dateStr, saved]);

  function set(field, value) {
    setJournal((j) => ({ ...j, [field]: value }));
    setSaved(false);
  }

  function toggleTag(tag) {
    setJournal((j) => {
      const has = j.tags.includes(tag);
      return { ...j, tags: has ? j.tags.filter((t) => t !== tag) : [...j.tags, tag] };
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      await api.saveJournal(dateStr, journal);
      setMessage('Journal saved successfully.');
      setSaved(true);
    } catch (e) {
      setMessage('Failed to save journal.');
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  const moodExpr = greetingExpression(journal.mood);

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
              const { totalShots, hasShots, skillsTrained, ts } = deriveSession(s);
              const isMatch = s.focus === 'match';
              const typeTags = isMatch ? ['Live Match'] : [s.mode === 'dry' ? 'Dry Fire' : 'Live Fire'];
              if (!isMatch && hasShots) typeTags.push('Shot Calling');
              if (!isMatch && skillsTrained && skillsTrained.length > 0) typeTags.push('Skill Focus');
              const timeLabel = ts ? new Date(String(ts).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const dur = s.duration_seconds || 0;

              return (
              <div className="card feed-card" key={s.id} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{typeTags.join(' + ')}</h3>
                  {timeLabel && <span className="muted" style={{ fontSize: '0.85rem' }}>{timeLabel}</span>}
                </div>

                <div className="stat-grid" style={{ marginBottom: '12px' }}>
                  <div className="stat-item">
                    <span className="stat-label">Shots</span>
                    <span className="stat-value">{totalShots}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Time</span>
                    <span className="stat-value">{Math.floor(dur / 60)}m {dur % 60}s</span>
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
                  <div style={{ background: 'var(--panel-2)', padding: '12px', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)', fontSize: '0.9em', whiteSpace: 'pre-wrap' }}>
                    <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text)' }}>"{s.match_observation || s.comments}"</p>
                  </div>
                )}

                {s.drive_link && (
                  <a className="session-link" href={s.drive_link} target="_blank" rel="noopener noreferrer" style={{ marginTop: 10 }}>
                    <IconLink size={15} /> {isMatch ? 'Match video / photos' : 'Session video / photos'}
                  </a>
                )}

                {s.live_notes && s.live_notes.length > 0 && (
                  <ul className="live-note-list" style={{ marginTop: 8 }}>
                    {s.live_notes.map((n, i) => (
                      <li key={i}>
                        {(n.series || n.t != null) && (
                          <span className="note-meta">{n.series ? `Series ${n.series}` : ''}{n.series && n.t ? ' · ' : ''}{n.t ? `${String(Math.floor(n.t / 60)).padStart(2, '0')}:${String(n.t % 60).padStart(2, '0')}` : ''}</span>
                        )}
                        {n.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )})}
          </div>
        </div>

        <div className="card">
          <h2>Daily check-in</h2>
          {loading ? <p>Loading...</p> : (
            <div className="jr-shell">

              {/* 1. Pebble greeting + affirmation */}
              <div className="says-card jr-greeting">
                <div className="says-tag"><Pebble size={18} variant="face" expression={moodExpr} /> Pebble says</div>
                <div className="says-text">{MOOD_AFFIRMATION[journal.mood] || MOOD_AFFIRMATION['']}</div>
              </div>

              {/* Carry-over: yesterday's intention */}
              {carryover && (
                <div className="jr-carryover">
                  <div className="jr-carryover-tag">Yesterday you said tomorrow's focus was</div>
                  <div className="jr-carryover-text">{carryover}</div>
                </div>
              )}

              {/* 2. Mood */}
              <div className="jr-section">
                <div className="jr-section-head">How did today feel?</div>
                <div className="jr-mood-row">
                  {MOODS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className={`jr-mood-btn${journal.mood === m.key ? ' selected' : ''}`}
                      aria-pressed={journal.mood === m.key}
                      aria-label={m.label}
                      onClick={() => set('mood', journal.mood === m.key ? '' : m.key)}
                    >
                      <Pebble size={34} variant="face" expression={m.expression} />
                      <span className="jr-mood-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Feeling scales */}
              <div className="jr-section">
                <div className="jr-section-head"><Pebble size={18} variant="face" expression="neutral" /> How are you feeling?</div>
                <JrScale label="Energy" hint="drained to buzzing" max={5} value={journal.energy} onChange={(v) => set('energy', v)} />
                <JrScale label="Body" hint="sore to fresh" max={5} value={journal.body} onChange={(v) => set('body', v)} />
                <JrScale label="Stress" hint="calm to tense" max={5} value={journal.stress} onChange={(v) => set('stress', v)} />
              </div>

              {/* 4. Movement & training */}
              <div className="jr-section">
                <div className="jr-section-head"><Pebble size={18} variant="face" expression="focused" /> Movement &amp; training</div>

                <label className="jr-check">
                  <input type="checkbox" checked={journal.running} onChange={(e) => set('running', e.target.checked)} />
                  <span className="jr-check-label"><IconRun size={16} /> Ran today</span>
                </label>
                {journal.running && (
                  <input
                    type="text"
                    placeholder="e.g. 5 kms"
                    value={journal.running_kms}
                    onChange={(e) => set('running_kms', e.target.value)}
                    style={{ marginTop: '8px', width: '100%' }}
                  />
                )}

                <label className="jr-check" style={{ marginTop: '12px' }}>
                  <input type="checkbox" checked={journal.gym} onChange={(e) => set('gym', e.target.checked)} />
                  <span className="jr-check-label"><IconDumbbell size={16} /> Gym today</span>
                </label>
                {journal.gym && (
                  <input
                    type="text"
                    placeholder="Gym focus (auto-filled from your logged workout)"
                    value={journal.gym_muscles}
                    onChange={(e) => set('gym_muscles', e.target.value)}
                    style={{ marginTop: '8px', width: '100%' }}
                  />
                )}

                <JrScale label="Effort (RPE)" hint="easy to maximal" max={10} value={journal.training_rpe} onChange={(v) => set('training_rpe', v)} />
                <JrScale label="Shooting" hint="off to dialed in" max={5} value={journal.shooting_feel} onChange={(v) => set('shooting_feel', v)} />
              </div>

              {/* 5. Sleep */}
              <div className="jr-section">
                <div className="jr-section-head"><Pebble size={18} variant="face" expression="sleepy" /> Sleep</div>
                <div className="form-group">
                  <label><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IconMoon size={16} /> Hours slept</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 7 hours 30 mins"
                    value={journal.sleeping_hours}
                    onChange={(e) => set('sleeping_hours', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <JrScale label="How rested?" hint="wrecked to refreshed" max={5} value={journal.sleep_quality} onChange={(v) => set('sleep_quality', v)} />
              </div>

              {/* 6. Reflection */}
              <div className="jr-section">
                <div className="jr-section-head"><Pebble size={18} variant="face" expression="neutral" /> Worth remembering</div>
                <JrPrompt label="One thing that went well" placeholder="What is one thing that went well?" value={journal.highlight} onChange={(v) => set('highlight', v)} />
                <JrPrompt label="Biggest challenge" placeholder="What was hard today?" value={journal.challenge} onChange={(v) => set('challenge', v)} />
                <JrPrompt label="A lesson" placeholder="Anything you would do differently?" value={journal.lesson} onChange={(v) => set('lesson', v)} />
                <JrPrompt label="Grateful for" placeholder="One thing you are grateful for" value={journal.gratitude} onChange={(v) => set('gratitude', v)} />
                <p className="jr-privacy">Just for you. Your journal stays private.</p>
              </div>

              {/* 7. Looking ahead */}
              <div className="jr-section">
                <div className="jr-section-head"><Pebble size={18} variant="face" expression="focused" /> Looking ahead</div>
                <JrPrompt label="Tomorrow's #1 focus" placeholder="What matters most tomorrow?" value={journal.tomorrow_focus} onChange={(v) => set('tomorrow_focus', v)} />
                <div className="jr-tags">
                  {TAG_VOCAB.map((tag) => {
                    const on = journal.tags.includes(tag);
                    return (
                      <button key={tag} type="button" className={`jr-tag${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleTag(tag)}>
                        {on && <IconCheck size={13} />} {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 8. Overflow */}
              <div className="jr-section">
                <div className="jr-section-head"><Pebble size={18} variant="face" expression="resting" /> Anything else?</div>
                <textarea
                  placeholder="Anything else worth remembering? (optional)"
                  value={journal.observation}
                  onChange={(e) => set('observation', e.target.value)}
                  style={{ width: '100%', minHeight: '120px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '12px', borderRadius: 'var(--radius)' }}
                />
              </div>

              {/* 9. Save + AI reviews */}
              {saved && (
                <div className="says-card jr-save-says">
                  <div className="says-tag"><Pebble size={18} variant="face" expression="proud" /> Pebble says</div>
                  <div className="says-text">You showed up today — that counts. Saved.</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
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

              {/* 10. This week — read the structured signals back over time (long-term tracking) */}
              {weekCheckin && weekCheckin.daysLogged > 0 && (
                <div className="jr-section jr-trends">
                  <div className="jr-section-head"><Pebble size={18} variant="face" expression="focused" /> This week · {weekCheckin.daysLogged} {weekCheckin.daysLogged === 1 ? 'day' : 'days'} logged</div>
                  <div className="jr-trend-grid">
                    <JrTrend label="Energy" stat={weekCheckin.energy} max={5} />
                    <JrTrend label="Body" stat={weekCheckin.body} max={5} />
                    <JrTrend label="Stress" stat={weekCheckin.stress} max={5} />
                    <JrTrend label="Rested" stat={weekCheckin.sleepQuality} max={5} />
                    <JrTrend label="Effort" stat={weekCheckin.trainingRpe} max={10} />
                    <JrTrend label="Shooting" stat={weekCheckin.shootingFeel} max={5} />
                  </div>
                  {weekCheckin.topTags && weekCheckin.topTags.length > 0 && (
                    <div className="jr-trend-tags">
                      {weekCheckin.topTags.map(({ tag, count }) => (
                        <span key={tag} className="jr-trend-tag">{tag} <small>×{count}</small></span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
