// src/views/Home.jsx — the 10-second daily ritual (spec §4.1). Verdict-first, with an explicit
// tickable checklist. Top→bottom: header (breathing Pebble + greeting + countdown chip), the Pebble
// verdict card (hero), today's checklist (X-of-N + ring), the continuity thread, the season strip,
// and the Tip of the Day (mindset theme).
//
// No-flash (locked decision #5): the verdict line + mission come from JarvisContext, which renders
// the last-cached value synchronously on first paint. The continuity thread first-paints from the
// engagement records already cached on the device.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { gymApi } from '../lib/gymApi.js';
import { localDateString } from '../lib/gymDates.js';
import { checklistItems } from '../lib/checklistItems.js';
import { computeContinuity } from '../lib/continuity.js';
import { phaseName, currentPhaseType } from '../lib/phases.js';
import Pebble from '../components/Pebble.jsx';
import Checklist from '../components/Checklist.jsx';
import SessionBrief from '../components/SessionBrief.jsx';
import TipOfDay from '../components/TipOfDay.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { useJarvis } from '../context/JarvisContext.jsx';

const BAND_LABEL = { green: 'Ready', amber: 'Caution', red: 'Recover' };

export default function Home() {
  const navigate = useNavigate();
  const { startSession } = useSession();
  const jarvis = useJarvis();
  const today = localDateString(new Date());
  
  const [selectedDate, setSelectedDate] = useState(today);
  const mission = useMemo(() => {
    if (selectedDate === today) return jarvis.mission;
    if (!jarvis.planWeek || !jarvis.planWeek.days) return null;
    return jarvis.planWeek.days.find(d => d.date === selectedDate) || null;
  }, [selectedDate, today, jarvis.mission, jarvis.planWeek]);

  // Continuity: consecutive engaged (journal OR session OR gym) or prescribed-rest days. Computed
  // client-side from the records already on the device; recomputed when those resolve.
  const [engaged, setEngaged] = useState(() => new Set());
  useEffect(() => {
    let active = true;
    Promise.all([
      api.listSessions().catch(() => []),
      api.getStats().catch(() => null),
    ]).then(([sessions]) => {
      if (!active) return;
      const set = new Set();
      for (const s of sessions || []) {
        const d = (s.started_at || s.date || '').split('T')[0];
        if (d) set.add(d);
      }
      for (const w of gymApi.listWorkouts() || []) {
        const d = (w.date || '').split('T')[0];
        if (d) set.add(d);
      }
      // journals: a logged mood/observation counts as engagement; read recent days cheaply.
      setEngaged(set);
    });
    return () => { active = false; };
  }, []);

  // Rest days the agent marked (today.json + plan-week could mark more; today is enough for the head).
  const restDays = useMemo(() => {
    const s = new Set();
    if (mission && mission.shooting && mission.shooting.module === 'rest') s.add(mission.date || today);
    return s;
  }, [mission, today]);

  const continuity = useMemo(
    () => computeContinuity({ today, engaged, restDays }),
    [today, engaged, restDays],
  );

  // If a workout is already logged today, its title labels the gym item (reflects what happened).
  const loggedGymTitle = useMemo(() => {
    const w = gymApi.getWorkoutForDate(selectedDate);
    return w ? w.dayTitle : null;
  }, [selectedDate, gymApi.listWorkouts().length]);
  const { tasks: items } = useMemo(
    () => checklistItems(mission, { date: selectedDate, gymTitle: loggedGymTitle, scenario: jarvis.mentalScenario }),
    [mission, selectedDate, loggedGymTitle, jarvis.mentalScenario],
  );
  const band = mission && (mission.readinessBand || (mission.readiness && mission.readiness.band));
  const daysToRace = jarvis.campaign && jarvis.campaign.daysToRace;
  const [brief, setBrief] = useState(null); // the session item whose brief is open

  // Tapping a checklist item's Start: training sessions open a brief first; the check-in goes
  // straight to the journal (no brief needed for a form).
  const startFromChecklist = (item) => {
    const t = item.start && item.start.type;
    if (t === 'journal') { navigate('/journal'); return; }
    if (!t) return; // no in-app action (e.g. a recovery note)
    setBrief(item); // session — show the brief, then Begin launches it
  };

  // Begin the session described by the brief, routing by its start type.
  const beginBriefed = (item) => {
    setBrief(null);
    const start = item.start || {};
    if (start.type === 'gym') { navigate('/gym'); return; }
    if (start.type === 'offline') {
      startSession('offline', 'offline', { label: item.label, detail: item.detail, durationMin: start.durationMin });
      navigate('/session');
      return;
    }
    if (start.type === 'session') {
      // Carry any suggested skills so a skill-focus session pre-loads its grid (non-restrictively).
      startSession(start.mode || 'dry', start.focus || 'shot', start.skills ? { skills: start.skills } : null);
      navigate('/session');
    }
  };

  return (
    <div className="home">
      <header className="home-head">
        <Pebble size={44} expression={jarvis.expression} className="pebble-breathe" idle />
        <div className="home-head-text">
          <div className="home-date muted" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{new Date(selectedDate + 'T00:00:00').toDateString()}</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'transparent',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  padding: 0,
                  outline: 'none',
                  cursor: 'pointer',
                  width: '20px',
                  height: '20px',
                  position: 'absolute',
                  opacity: 0,
                  zIndex: 2
                }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none', opacity: 0.7 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
          </div>
          <h1 className="home-greet">Morning, Anant</h1>
        </div>
        {daysToRace != null ? (
          <button className="countdown-chip" onClick={() => navigate('/campaign')}>
            {daysToRace}d · Nationals
          </button>
        ) : null}
      </header>

      {/* Verdict card — the hero. Pre-computed pebble.json line, spoken as Pebble, with the
          readiness band color and a one-line "yesterday's read". */}
      <div className={`verdict-card${band ? ` band-${band}` : ''}`}>
        <div className="verdict-tag">
          <Pebble size={18} variant="face" expression={jarvis.expression} /> Pebble
          {band ? <span className={`verdict-band band-${band}`}>{BAND_LABEL[band] || band}</span> : null}
        </div>
        <div className="verdict-text">{jarvis.line}</div>
        {mission && mission.headline && mission.headline !== jarvis.line ? (
          <div className="verdict-yesterday muted">{mission.headline}</div>
        ) : null}
      </div>

      {/* Today's checklist — the tickable list of everything due (agent items, client tick state). */}
      <Checklist date={selectedDate} items={items} onStart={startFromChecklist} />

      {/* Continuity thread — faint, forgiving presence; never a flame counter / no red X. */}
      <div className={`continuity continuity-${continuity.state}`}>
        {continuity.state === 'amber'
          ? "One day off the line — tomorrow we don't miss twice."
          : continuity.count > 0
            ? `Shown up ${continuity.count} ${continuity.count === 1 ? 'day' : 'days'} running.`
            : 'A fresh start. Show up today.'}
      </div>

      {/* Season strip → Campaign dashboard. Shows the human phase name (never the raw 'restart' id). */}
      {jarvis.campaign ? (
        <button className="season-strip" onClick={() => navigate('/campaign')}>
          <span className="season-phase">{phaseName(currentPhaseType(jarvis.campaign))}<small className="muted"> · campaign</small></span>
          <span className="season-go">See my growth ›</span>
        </button>
      ) : null}

      {/* Tip of the Day — the mindset / life-attitude theme. */}
      <TipOfDay />

      {/* Session brief — tapping Start on a session opens this first (objective + detail + volume). */}
      {brief ? (
        <SessionBrief item={brief} onBegin={beginBriefed} onClose={() => setBrief(null)} />
      ) : null}
    </div>
  );
}
