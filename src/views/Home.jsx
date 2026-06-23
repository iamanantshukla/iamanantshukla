// src/views/Home.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { gymApi } from '../lib/gymApi.js';
import { getPlanForDate } from '../lib/gymPlan.js';
import { getPebbleVoice, FALLBACK_VOICE } from '../lib/pebbleVoice.js';
import { localDateString, weekDays } from '../lib/gymDates.js';
import Pebble from '../components/Pebble.jsx';
import WeekStrip from '../components/WeekStrip.jsx';
import { IconDumbbell, IconTarget, IconNotebook, IconChevronRight } from '../components/Icons.jsx';
import { useSession } from '../context/SessionContext.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { startSession } = useSession();
  const today = localDateString(new Date());
  const [selected, setSelected] = useState(today);
  const [pebbleData, setPebbleData] = useState({ text: FALLBACK_VOICE, mental_scenarios: [] });
  const [stats, setStats] = useState(null);
  const [dayJournal, setDayJournal] = useState(null);
  const [daySessions, setDaySessions] = useState([]);
  const [lastSession, setLastSession] = useState(null);

  useEffect(() => { getPebbleVoice().then(setPebbleData); }, []);
  useEffect(() => { api.getStats(selected).then(setStats).catch(() => {}); }, [selected]);

  // Load the selected day's journal + shooting sessions, plus the most recent
  // past session (across all dates) for a "last avg" hint. Robust to async +
  // missing data: any failure leaves the safe defaults in place.
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getJournal(selected), api.listSessions(selected)])
      .then(([journal, sessions]) => {
        if (cancelled) return;
        setDayJournal(journal);
        setDaySessions(Array.isArray(sessions) ? sessions : []);
      })
      .catch(() => { /* keep defaults */ });
    api.listSessions('')
      .then((all) => {
        if (cancelled) return;
        const list = Array.isArray(all) ? all : [];
        // listSessions('') is sorted newest-first; pick the newest with shots.
        const recent = list.find((s) => (s.total_shots || (s.shots ? s.shots.length : 0)) > 0) || null;
        setLastSession(recent);
      })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, [selected]);

  const plan = getPlanForDate(selected);

  // Per-day dots for the week of `selected`: 'done' if a workout was logged that
  // day, else 'plan' if a workout is scheduled (non-rest day), else 'none'.
  const dots = useMemo(() => {
    const result = {};
    for (const d of weekDays(new Date(selected + 'T00:00:00'))) {
      const ds = localDateString(d);
      if (gymApi.getWorkoutForDate(ds)) result[ds] = 'done';
      else if (getPlanForDate(ds).dayKey !== 'rest') result[ds] = 'plan';
    }
    return result;
  }, [selected, gymApi.listWorkouts().length]);

  const isFuture = selected > today;
  const greeting = selected === today ? 'Today' : (isFuture ? 'Looking ahead' : 'Past day');
  const week = stats?.week;
  const gymDays = Math.min(5, week?.gym?.sessions || 0); // capped at 5/week

  const agendaTitle = plan.dayKey === 'rest' ? 'Rest day — recover' : plan.title;

  // ── Data-driven agenda subtext ──────────────────────────────────────────
  const isRest = plan.dayKey === 'rest';
  const loggedWorkout = gymApi.getWorkoutForDate(selected);
  const gymDone = !!loggedWorkout;

  // Gym row subtext: future days read as planned; past/today prefer logged state.
  let gymSub;
  if (isFuture) {
    gymSub = isRest ? 'Rest day — recover' : `Planned: ${plan.title}`;
  } else if (gymDone) {
    const n = (loggedWorkout.exercises || []).length;
    gymSub = n ? `${n} exercises · logged` : 'Logged';
  } else if (isRest) {
    gymSub = 'No workout today';
  } else {
    gymSub = plan.exercises.length ? `${plan.exercises.length} exercises` : 'No workout today';
  }

  // Shooting row subtext: sessions logged for the selected day, else a hint.
  // The row opens today's shooting training plan (you start the session from there).
  const shootCount = daySessions.length;
  let shootSub;
  if (shootCount > 0) {
    shootSub = `${shootCount} session${shootCount === 1 ? '' : 's'} logged · view plan`;
  } else if (lastSession) {
    const lastShots = lastSession.total_shots || (lastSession.shots ? lastSession.shots.length : 0);
    shootSub = lastShots ? `Last: ${lastShots} shots · view today's plan` : "View today's plan";
  } else {
    shootSub = "View today's plan";
  }

  // Journal row subtext: logged if any meaningful field is present.
  const journalLogged = !!(dayJournal && (dayJournal.gym || dayJournal.running ||
    dayJournal.sleeping_hours || dayJournal.observation));
  const journalSub = journalLogged ? 'Logged' : 'Not logged yet';

  return (
    <div className="home">
      <header className="home-head">
        <Pebble size={40} expression="happy" />
        <div>
          <div className="home-date muted">{new Date(selected + 'T00:00:00').toDateString()}</div>
          <h1 className="home-greet">Morning, Anant</h1>
        </div>
      </header>

      <WeekStrip anchor={new Date(selected + 'T00:00:00')} selected={selected} onSelect={setSelected} dots={dots} />

      <div className="says-card">
        <div className="says-tag"><Pebble size={18} variant="face" /> Pebble says</div>
        <div className="says-text">{pebbleData.text}</div>
        

      </div>

      <div className="section-label">{greeting}</div>
      <button className="agenda-row" onClick={() => navigate('/gym')}>
        <span className="agenda-ic accent"><IconDumbbell size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">{agendaTitle}{gymDone ? ' ✓' : ''}</span>
          <span className="agenda-s">{gymSub}</span></span>
        <IconChevronRight size={18} className="agenda-chev" />
      </button>
      <button className="agenda-row" onClick={() => navigate('/plan')}>
        <span className="agenda-ic good"><IconTarget size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">Shooting training{shootCount > 0 ? ' ✓' : ''}</span>
          <span className="agenda-s">{shootSub}</span></span>
        <IconChevronRight size={18} className="agenda-chev" />
      </button>
      <button className="agenda-row" onClick={() => navigate('/journal')}>
        <span className="agenda-ic warn"><IconNotebook size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">Daily journal{journalLogged ? ' ✓' : ''}</span>
          <span className="agenda-s">{journalSub}</span></span>
        <IconChevronRight size={18} className="agenda-chev" />
      </button>

      <div className="section-label">This week</div>
      <div className="home-tiles">
        <Tile v={week?.sleep?.avgHours ?? 0} u="h" l="Avg sleep" />
        <Tile v={week?.sessions?.totalShots ?? 0} l="Shots" />
        <Tile v={gymDays} l="Gym days" />
        <Tile v={week?.running?.kms ?? 0} u="km" l="Run" />
      </div>

      <button className="more-link" onClick={() => navigate('/coach')}>More · Coach &amp; Plan</button>
    </div>
  );
}
function Tile({ v, u, l }) {
  return <div className="home-tile"><div className="tile-v">{v}{u ? <small> {u}</small> : null}</div><div className="tile-l">{l}</div></div>;
}
