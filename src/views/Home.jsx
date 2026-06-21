// src/views/Home.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { gymApi } from '../lib/gymApi.js';
import { getPlanForDate } from '../lib/gymPlan.js';
import { getPebbleVoice, FALLBACK_VOICE } from '../lib/pebbleVoice.js';
import { localDateString } from '../lib/gymDates.js';
import Pebble from '../components/Pebble.jsx';
import WeekStrip from '../components/WeekStrip.jsx';
import { IconDumbbell, IconTarget, IconNotebook, IconChevronRight } from '../components/Icons.jsx';

export default function Home() {
  const navigate = useNavigate();
  const today = localDateString(new Date());
  const [selected, setSelected] = useState(today);
  const [voice, setVoice] = useState(FALLBACK_VOICE);
  const [stats, setStats] = useState(null);

  useEffect(() => { getPebbleVoice().then(setVoice); }, []);
  useEffect(() => { api.getStats(selected).then(setStats).catch(() => {}); }, [selected]);

  const plan = getPlanForDate(selected);
  const isFuture = selected > today;
  const greeting = selected === today ? 'Today' : (isFuture ? 'Looking ahead' : 'Past day');
  const week = stats?.week;
  const gymDays = Math.min(5, week?.gym?.sessions || 0); // capped at 5/week

  const agendaTitle = plan.dayKey === 'rest' ? 'Rest day — recover' : plan.title;

  return (
    <div className="home">
      <header className="home-head">
        <Pebble size={40} expression="happy" />
        <div>
          <div className="home-date muted">{new Date(selected + 'T00:00:00').toDateString()}</div>
          <h1 className="home-greet">Morning, Anant</h1>
        </div>
      </header>

      <WeekStrip anchor={new Date(selected + 'T00:00:00')} selected={selected} onSelect={setSelected} dots={{}} />

      <div className="says-card">
        <div className="says-tag"><Pebble size={18} variant="face" /> Pebble says</div>
        <div className="says-text">{voice}</div>
      </div>

      <div className="section-label">{greeting}</div>
      <button className="agenda-row" onClick={() => navigate('/gym')}>
        <span className="agenda-ic accent"><IconDumbbell size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">{agendaTitle}</span>
          <span className="agenda-s">{plan.exercises.length ? `${plan.exercises.length} exercises` : 'No workout today'}</span></span>
        <IconChevronRight size={18} className="agenda-chev" />
      </button>
      <button className="agenda-row" onClick={() => navigate('/shoot')}>
        <span className="agenda-ic good"><IconTarget size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">Shooting session</span>
          <span className="agenda-s">Tap to start</span></span>
        <IconChevronRight size={18} className="agenda-chev" />
      </button>
      <button className="agenda-row" onClick={() => navigate('/journal')}>
        <span className="agenda-ic warn"><IconNotebook size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">Daily journal</span>
          <span className="agenda-s">Sleep, run, notes</span></span>
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
