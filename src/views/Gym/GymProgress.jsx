// src/views/Gym/GymProgress.jsx
import { gymApi } from '../../lib/gymApi.js';
import { GYM_PLAN } from '../../lib/gymPlan.js';

function maxWeight(name) {
  let best = 0, lastDate = null, lastBest = 0;
  gymApi.listWorkouts().forEach((w) => {
    const e = (w.exercises || []).find(x => x.name === name);
    if (!e) return;
    const top = Math.max(0, ...(e.sets || []).map(s => s.weightKg || 0));
    if (top > best) best = top;
    if (!lastDate) { lastDate = w.date; lastBest = top; } // listWorkouts is newest-first
  });
  return { best, last: lastBest, lastDate };
}

export default function GymProgress() {
  const names = [...new Set(Object.values(GYM_PLAN).flatMap(d => d.exercises.map(e => e.name)))];
  return (
    <div>
      <h1 className="hub-title">Progress</h1>
      {names.map((name) => {
        const { best, last, lastDate } = maxWeight(name);
        return (
          <div className="card" key={name} style={{ marginBottom: 10 }}>
            <strong style={{ fontSize: '.9rem' }}>{name}</strong>
            <div className="muted" style={{ fontSize: '.75rem', marginTop: 6 }}>
              Last: {last ? `${last} kg (${lastDate})` : '—'} · Best: {best ? `${best} kg` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
