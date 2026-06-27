// src/components/ExerciseCard.jsx
import { useState } from 'react';
import SetStepper from './SetStepper.jsx';
import { gymApi } from '../lib/gymApi.js';
import { IconCheck } from './Icons.jsx';

export default function ExerciseCard({ exercise, sets, onLogSet }) {
  const last = gymApi.lastForExercise(exercise.name);
  // "last 30kg ×5" — the top set from the previous session, shown top-right.
  const lastTop = last?.sets?.[0];
  const startWeight = lastTop?.weightKg ?? 0;
  const startReps = lastTop?.reps ?? exercise.prescription.repMin;
  const [weight, setWeight] = useState(startWeight);
  const [reps, setReps] = useState(startReps);
  const p = exercise.prescription;
  const setNo = sets.length + 1;
  // "target X reps" — show the rep range from the prescription.
  const targetReps = p.repMax !== p.repMin ? `${p.repMin}–${p.repMax}` : `${p.repMin}`;

  return (
    <div className="ex-card">
      <div className="ex-head">
        <div className="ex-head-l">
          <div className="ex-name">{exercise.name}</div>
          <div className="ex-presc">Set {setNo} · target {targetReps} reps</div>
        </div>
        <div className="ex-head-right">
          {lastTop ? (
            <span className="ex-last-top">last <strong>{lastTop.weightKg}kg ×{lastTop.reps}</strong></span>
          ) : <span className="ex-last-top muted">first time</span>}
        </div>
      </div>
      {exercise.note ? <div className="ex-note">{exercise.note}</div> : null}

      {sets.map((s, i) => (
        <div className="set-pill" key={i}>
          <span>Set {i + 1} · {s.weightKg} × {s.reps}</span>
          <span className="set-check"><IconCheck size={13} /></span>
        </div>
      ))}

      <SetStepper label="Weight" unit="kg" value={weight} step={0.5} onChange={setWeight} />
      <SetStepper label="Reps" value={reps} step={1} onChange={setReps} />
      <button className="log-set" onClick={() => onLogSet({ weightKg: weight, reps })}>
        Log set {setNo} · {weight}kg × {reps}
      </button>
    </div>
  );
}
