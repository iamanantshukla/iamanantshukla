// src/views/Gym/GymHistory.jsx
import { gymApi } from '../../lib/gymApi.js';
import LeafBack from '../../components/LeafBack.jsx';
export default function GymHistory() {
  const workouts = gymApi.listWorkouts();
  return (
    <div>
      <LeafBack to="/gym" label="Gym" />
      <h1 className="hub-title">Gym history</h1>
      {workouts.length === 0 && <p className="muted">No workouts logged yet.</p>}
      {workouts.map((w) => (
        <div className="card" key={w.id} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{w.dayTitle}</strong><span className="muted">{w.date}</span>
          </div>
          <div className="muted" style={{ fontSize: '.75rem', marginTop: 6 }}>
            {w.exercises.filter(e => (e.sets || []).length).map(e => e.name).join(' · ') || 'No sets logged'}
          </div>
          <div className="muted" style={{ fontSize: '.75rem', marginTop: 4 }}>{Math.round(w.totalVolumeKg)} kg total</div>
        </div>
      ))}
    </div>
  );
}
