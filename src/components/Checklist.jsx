// src/components/Checklist.jsx — Home's "today's checklist" (spec §4.1): card-style tickable list
// with an X-of-N counter + progress ring. Each task is a card: checkbox + a colored domain-icon tile
// + bold title + a muted meta line (just the duration — richer detail lives in the session brief) +
// a coral action pill (Start / Log / Open) or a "done" stamp. The agent owns the ITEMS; the CLIENT
// owns the tick state. The next undone item auto-highlights as "now" (coral border).
import { useState } from 'react';
import { loadTicks, toggleTick } from '../lib/checklistState.js';
import {
  IconCheck, IconChevronRight, IconTarget, IconDumbbell, IconNotebook, IconMoon, IconRun,
} from './Icons.jsx';
import Pebble from './Pebble.jsx';

// Per-kind domain icon + tint (background tint token) + the action verb on the pill.
function kindVisual(kind) {
  switch (kind) {
    case 'match':
    case 'live':
    case 'dry':
    case 'skill':
      return { Icon: IconTarget, tint: 'rgba(255,106,61,.16)', color: 'var(--accent)', verb: 'Start' };
    case 'mental':
      return { peb: true, tint: 'rgba(255,176,46,.16)', color: 'var(--warn)', verb: 'Start' };
    case 'gym':
      return { Icon: IconDumbbell, tint: 'rgba(82,194,160,.16)', color: 'var(--good)', verb: 'Log' };
    case 'offline':
      return { Icon: IconRun, tint: 'rgba(82,194,160,.16)', color: 'var(--good)', verb: 'Start' };
    case 'journal':
      return { Icon: IconMoon, tint: 'rgba(255,176,46,.16)', color: 'var(--warn)', verb: 'Open' };
    default:
      return { Icon: IconNotebook, tint: 'var(--panel-2)', color: 'var(--muted)', verb: 'Open' };
  }
}

// A small SVG ring showing done/total.
function ProgressRing({ done, total }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? done / total : 0;
  return (
    <svg className="checklist-ring" width="34" height="34" viewBox="0 0 34 34" role="img"
         aria-label={`${done} of ${total} done`}>
      <circle cx="17" cy="17" r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
      <circle cx="17" cy="17" r={r} fill="none" stroke="var(--good)" strokeWidth="3"
              strokeLinecap="round" strokeDasharray={c}
              strokeDashoffset={c * (1 - frac)} transform="rotate(-90 17 17)" />
    </svg>
  );
}

export default function Checklist({ date, items = [], onStart, onTick }) {
  // Tick state is read once into local state; toggles persist immediately + re-render.
  const [ticks, setTicks] = useState(() => loadTicks(date));
  if (!items.length) return null;

  const done = items.filter((i) => ticks[i.id]).length;
  // The first undone item is "now" — the auto-highlight focus.
  const nowId = items.find((i) => !ticks[i.id])?.id;

  const handleToggle = (id) => {
    const next = toggleTick(date, id);
    setTicks({ ...next });
    if (onTick) onTick(id, !!next[id]);
  };

  return (
    <section className="checklist" aria-label="Today's checklist">
      <div className="checklist-head">
        <ProgressRing done={done} total={items.length} />
        <div>
          <h2 className="checklist-title">Today</h2>
          <span className="checklist-count muted">{done} of {items.length} done</span>
        </div>
      </div>

      <ul className="checklist-items">
        {items.map((item) => {
          const checked = !!ticks[item.id];
          const isNow = !checked && item.id === nowId;
          const v = kindVisual(item.kind);
          return (
            <li key={item.id} className={`task${checked ? ' done' : ''}${isNow ? ' now' : ''}`}>
              <button
                className="task-box"
                role="checkbox"
                aria-checked={checked}
                aria-label={`${checked ? 'Untick' : 'Tick'} ${item.label}`}
                onClick={() => handleToggle(item.id)}
              >
                {checked ? <IconCheck size={13} /> : null}
              </button>
              <span className="task-ic" style={{ background: v.tint, color: v.color }}>
                {v.peb ? <Pebble size={18} variant="face" expression="focused" /> : <v.Icon size={16} />}
              </span>
              <div className="task-body">
                <div className="task-ttl">{item.label}</div>
                {item.duration ? <div className="task-meta">{item.duration}</div> : null}
              </div>
              {checked ? (
                <span className="task-stamp">done</span>
              ) : item.start ? (
                <button className="task-act" onClick={() => onStart && onStart(item)}>
                  {v.verb} <IconChevronRight size={13} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
