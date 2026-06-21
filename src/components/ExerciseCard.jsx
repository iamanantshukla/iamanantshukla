// src/components/ExerciseCard.jsx
import { useState } from 'react';
import SetStepper from './SetStepper.jsx';
import { gymApi } from '../lib/gymApi.js';
import { IconCheck, IconChevronLeft, IconChevronRight } from './Icons.jsx';

export default function ExerciseCard({ exercise, sets, onLogSet, onMoveUp, onMoveDown }) {
  const last = gymApi.lastForExercise(exercise.name);
  const lastText = last ? last.sets.map(s => `${s.weightKg}kg × ${s.reps}`).join(', ') : 'No previous data';
  const startWeight = last?.sets?.[0]?.weightKg ?? 0;
  const startReps = last?.sets?.[0]?.reps ?? exercise.prescription.repMin;
  const [weight, setWeight] = useState(startWeight);
  const [reps, setReps] = useState(startReps);
  const p = exercise.prescription;

  return (
    <div className="ex-card">
      <div className="ex-head">
        <div><div className="ex-name">{exercise.name}</div>
          <div className="ex-presc">{p.sets} × {p.repMin}{p.repMax !== p.repMin ? `–${p.repMax}` : ''} reps</div></div>
        <div className="ex-head-right">
          <span className="ex-count">{sets.length} / {p.sets}</span>
          {(onMoveUp || onMoveDown) && (
            <span className="ex-reorder">
              <button type="button" className="ex-move" aria-label="Move up" onClick={onMoveUp}><IconChevronLeft size={16} /></button>
              <button type="button" className="ex-move" aria-label="Move down" onClick={onMoveDown}><IconChevronRight size={16} /></button>
            </span>
          )}
        </div>
      </div>
      {exercise.note ? <div className="ex-note">{exercise.note}</div> : null}
      <div className="ex-last">Last: {lastText}</div>

      {sets.map((s, i) => (
        <div className="set-pill" key={i}><span>{s.weightKg} kg × {s.reps}</span><span className="set-check"><IconCheck size={13} /></span></div>
      ))}

      <div className="ex-divider" />
      <div className="now-label">Set {sets.length + 1}</div>
      <SetStepper label="Weight" unit="kg" value={weight} step={0.5} onChange={setWeight} />
      <SetStepper label="Reps" value={reps} step={1} onChange={setReps} />
      <button className="log-set" onClick={() => onLogSet({ weightKg: weight, reps })}>Log set {sets.length + 1}</button>
    </div>
  );
}
