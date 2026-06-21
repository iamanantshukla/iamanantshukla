// src/lib/gymPlan.js — hardcoded 5-day split. Not user-editable yet (see UI_UPDATE.md).
// prescription: { sets, repMin, repMax } ; note: optional coaching cue.
const ex = (name, sets, repMin, repMax, note) => ({ name, prescription: { sets, repMin, repMax }, note: note || '' });

export const GYM_PLAN = {
  day1: { title: 'Day 1 · Lower Body Foundation & Knee Rehab', subtitle: 'Quads, Glutes & VMO',
    exercises: [
      ex('Terminal Knee Extensions (TKEs)', 4, 15, 20, 'Do first to pump blood into the knee; squeeze quad hard at lockout. Per leg.'),
      ex('Barbell Back Squats', 4, 5, 8, 'Root feet, neutral pelvis.'),
      ex('Barbell Hip Thrusts', 3, 10, 12, 'Trains glutes for the posterior pelvic lock.'),
      ex('Bulgarian Split Squats', 3, 8, 10, 'Per leg.'),
      ex('Standing Calf Raises', 4, 15, 20),
    ] },
  day2: { title: 'Day 2 · Athletic Back, Biceps & Neck Stability', subtitle: 'Lats, Rhomboids, Biceps, Cervical Spine',
    exercises: [
      ex('Pull-Ups or Lat Pulldowns', 4, 8, 10),
      ex('Barbell Rows or Pendlay Rows', 3, 8, 10),
      ex('Face Pulls', 4, 15, 15, 'Strict 3-second isometric hold at peak contraction.'),
      ex('Neck Isometric Holds', 3, 10, 15, 'Seconds per side; press palm against head and resist.'),
      ex('Dumbbell Incline Curls', 3, 10, 12),
    ] },
  day3: { title: 'Day 3 · Deep Core, Pelvic Stability & Wrist Correction', subtitle: 'Obliques, Lower Abs, Forearm',
    exercises: [
      ex('Weighted Planks (PPT Focus)', 3, 45, 60, 'Seconds. Actively squeeze glutes and tuck pelvis.'),
      ex('Dead Bugs', 3, 15, 15, 'Per side.'),
      ex("Suitcase Carries (One-Arm Farmer's Walk)", 3, 20, 20, 'Meters per side.'),
      ex('Dumbbell Radial & Ulnar Deviation', 3, 12, 15, 'Each way; pulls left-skewed wrist to neutral.'),
      ex('Pallof Press', 3, 12, 12, 'Per side.'),
    ] },
  day4: { title: 'Day 4 · Posterior Chain & Shooting Specifics', subtitle: 'Hamstrings, Rear Delts, Static Endurance',
    exercises: [
      ex('Romanian Deadlifts (RDLs)', 4, 8, 10),
      ex('Lying Leg Curls', 3, 12, 12),
      ex('Rear Delt Cable Flyes', 3, 15, 15),
      ex('Dumbbell Isometric Lateral Hold', 3, 1, 1, 'Max time in shooting stance at 90°, pelvic lock applied.'),
    ] },
  day5: { title: 'Day 5 · High-Fatigue Upper Body', subtitle: 'The Max Gap Day — Chest, Shoulders, Triceps, Grip',
    exercises: [
      ex('Barbell Bench Press', 4, 6, 8),
      ex('Seated Dumbbell Overhead Press', 3, 8, 10),
      ex('Weighted Dips or Close-Grip Bench', 3, 10, 10),
      ex('Cable Tricep Pushdowns', 3, 12, 15),
      ex("Farmer's Walks (Heavy)", 4, 30, 30, 'Meters; maximal grip fatigue.'),
      ex('Reverse Barbell Curls', 3, 12, 12),
    ] },
};

const WEEKDAY_TO_DAY = { 1: 'day1', 2: 'day2', 3: 'rest', 4: 'day3', 5: 'day4', 6: 'day5', 0: 'rest' };

export function dayKeyForWeekday(weekday) {
  return WEEKDAY_TO_DAY[weekday] ?? 'rest';
}

// dateStr 'YYYY-MM-DD' -> { dayKey, title, subtitle, exercises } ; rest day has empty exercises.
export function getPlanForDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const dayKey = dayKeyForWeekday(weekday);
  if (dayKey === 'rest') return { dayKey: 'rest', title: 'Rest day', subtitle: 'Recover', exercises: [] };
  return { dayKey, ...GYM_PLAN[dayKey] };
}
