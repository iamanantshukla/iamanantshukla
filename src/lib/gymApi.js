// src/lib/gymApi.js — gym workouts in a SEPARATE Drive file.
// NOTE: replace the placeholder file id below (tracked in UI_UPDATE.md) to enable persistence.
import { getAccessToken } from './auth.js';

// Drive file id. Defaults to a placeholder so the app degrades to in-memory until a
// real id is set (paste it in here, or call gymApi.setFileId(id) at runtime). See UI_UPDATE.md.
let gymFileId = 'PLACEHOLDER_GYM_DRIVE_FILE_ID';
const usingPlaceholder = () => gymFileId.startsWith('PLACEHOLDER');
let store = { workouts: [], orderOverrides: {} };
let initialized = false;

async function syncFromDrive() {
  const token = getAccessToken();
  if (!token || usingPlaceholder()) { initialized = true; return; }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${gymFileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) { try { store = { workouts: [], orderOverrides: {}, ...(await res.json()) }; } catch { /* empty file */ } }
  initialized = true;
}
async function syncToDrive() {
  const token = getAccessToken();
  if (!token || usingPlaceholder()) return;
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${gymFileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(store),
  });
}
const genId = (seed) => `${Date.parse('2026-01-01') + store.workouts.length}-${seed || store.workouts.length}`;
const volume = (exs) => exs.reduce((t, e) => t + (e.sets || []).reduce((s, set) => s + (set.weightKg || 0) * (set.reps || 0), 0), 0);

export const gymApi = {
  init: syncFromDrive,
  setFileId: (id) => { if (id) gymFileId = id; },
  listWorkouts: () => [...store.workouts].sort((a, b) => (a.date < b.date ? 1 : -1)),
  getWorkoutForDate: (date) => store.workouts.find((w) => w.date === date) || null,
  lastForExercise: (name) => {
    const matches = store.workouts
      .filter((w) => (w.exercises || []).some((e) => e.name === name))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!matches.length) return null;
    const w = matches[0];
    const e = w.exercises.find((x) => x.name === name);
    return { date: w.date, sets: e.sets || [] };
  },
  saveWorkout: async (payload) => {
    const totalVolumeKg = volume(payload.exercises || []);
    const existingIdx = store.workouts.findIndex((w) => w.date === payload.date);
    const workout = {
      id: existingIdx >= 0 ? store.workouts[existingIdx].id : genId(payload.dayKey),
      started_at: payload.started_at || `${payload.date}T00:00:00.000Z`,
      ended_at: payload.ended_at || `${payload.date}T00:00:00.000Z`,
      ...payload,
      totalVolumeKg,
    };
    if (existingIdx >= 0) store.workouts[existingIdx] = workout;
    else store.workouts.push(workout);
    await syncToDrive();
    return workout;
  },
  getOrder: (dayKey) => store.orderOverrides?.[dayKey] || [],
  setOrder: async (dayKey, names) => {
    store.orderOverrides = { ...(store.orderOverrides || {}), [dayKey]: names };
    await syncToDrive();
  },
  // test helpers
  _reset: () => { store = { workouts: [], orderOverrides: {} }; initialized = false; },
  _seed: (workouts, orderOverrides = {}) => { store = { workouts, orderOverrides }; initialized = true; },
};
