// src/views/Gym/GymToday.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlanForDate } from '../../lib/gymPlan.js';
import { gymApi } from '../../lib/gymApi.js';
import { api } from '../../lib/api.js';
import { localDateString } from '../../lib/gymDates.js';
import ExerciseCard from '../../components/ExerciseCard.jsx';
import RestDayCard from '../../components/RestDayCard.jsx';
import { IconChevronRight } from '../../components/Icons.jsx';

export default function GymToday() {
  const navigate = useNavigate();
  const today = localDateString(new Date());
  const plan = getPlanForDate(today);
  const [forceLog, setForceLog] = useState(false);
  // logged[name] = array of {weightKg, reps}
  const [logged, setLogged] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const exercises = plan.exercises;
  const applyOrder = (exs, dayKey) => {
    const order = gymApi.getOrder(dayKey);
    if (!order.length) return exs;
    const byName = Object.fromEntries(exs.map((e) => [e.name, e]));
    const ordered = order.map((n) => byName[n]).filter(Boolean);
    exs.forEach((e) => { if (!order.includes(e.name)) ordered.push(e); }); // append any new
    return ordered;
  };
  const [orderedExercises, setOrderedExercises] = useState(() => applyOrder(plan.exercises, plan.dayKey));

  const move = (idx, dir) => {
    const next = [...orderedExercises];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrderedExercises(next);
    gymApi.setOrder(plan.dayKey, next.map((e) => e.name));
  };
  const totalPlannedSets = useMemo(() => exercises.reduce((t, e) => t + e.prescription.sets, 0), [exercises]);
  const doneSets = Object.values(logged).reduce((t, arr) => t + arr.length, 0);
  const totalVolume = Object.values(logged).flat().reduce((t, s) => t + s.weightKg * s.reps, 0);

  if (plan.dayKey === 'rest' && !forceLog) return <RestDayCard onLogAnyway={() => setForceLog(true)} />;

  const logSet = (name, set) => setLogged((prev) => ({ ...prev, [name]: [...(prev[name] || []), set] }));

  const finish = async () => {
    setSaving(true);
    try {
      await gymApi.saveWorkout({
        date: today, dayKey: plan.dayKey, dayTitle: plan.title,
        exercises: exercises.map((e, i) => ({ name: e.name, prescription: e.prescription, order: i, sets: logged[e.name] || [] })),
        durationSeconds: 0,
      });
      // Mark the journal gym flag for this date so Home's "gym days" stat stays accurate
      // (Home counts journals where gym===true; see api.calculateStats). Preserve other fields.
      const existing = await api.getJournal(today);
      await api.saveJournal(today, { ...existing, gym: true, gym_muscles: existing.gym_muscles || plan.subtitle });
      setSavedMsg('Workout saved.');
    } catch (e) { setSavedMsg(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="gym-today">
      <div className="gym-head">
        <div className="muted gym-date">{new Date(today + 'T00:00:00').toDateString()}</div>
        <h1 className="gym-title">{plan.title}</h1>
        <div className="muted gym-sub">{plan.subtitle}</div>
      </div>

      <div className="gym-progress">
        <div className="gp-top"><span className="gp-label">Workout progress</span><span className="gp-val">{doneSets} / {totalPlannedSets} sets</span></div>
        <div className="gp-bar"><i style={{ width: totalPlannedSets ? `${Math.min(100, (doneSets / totalPlannedSets) * 100)}%` : '0%' }} /></div>
        <div className="gp-sub muted">{Math.round(totalVolume)} kg lifted</div>
      </div>

      <div className="gym-subnav">
        <button className="secondary" onClick={() => navigate('/gym/history')}>History</button>
        <button className="secondary" onClick={() => navigate('/gym/progress')}>Progress</button>
      </div>

      <div className="ex-scroller">
        {orderedExercises.map((e, idx) => (
          <ExerciseCard key={e.name} exercise={e} sets={logged[e.name] || []} onLogSet={(set) => logSet(e.name, set)}
            onMoveUp={() => move(idx, -1)} onMoveDown={() => move(idx, 1)} />
        ))}
      </div>

      <button className="finish-workout" onClick={finish} disabled={saving || doneSets === 0}>
        {saving ? 'Saving…' : 'Finish workout'}
      </button>
      {savedMsg && <p className="muted" style={{ textAlign: 'center' }}>{savedMsg}</p>}
    </div>
  );
}
