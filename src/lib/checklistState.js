// src/lib/checklistState.js — client-owned, per-day checklist tick state (spec §6).
//
// The agent owns the checklist ITEMS (today.checklist[]); the CLIENT owns which are ticked. Ticking
// is a fast, offline-true, score-blind closure moment, so it lives on the device — durable across
// reloads (synchronous localStorage, no-flash) and keyed per day so yesterday's ticks never leak
// into today. Degrades to a no-op when storage is unavailable (private mode / SSR / tests).

const PREFIX = 'jarvis.checklist.';

function store() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    return localStorage;
  } catch {
    return null;
  }
}

// Read the tick map for a date: { itemId: true }. Returns {} when none / corrupt / unavailable.
export function loadTicks(date) {
  const s = store();
  if (!s) return {};
  try {
    const raw = s.getItem(PREFIX + date);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return (v && typeof v === 'object') ? v : {};
  } catch {
    return {};
  }
}

export function isTicked(date, id) {
  return !!loadTicks(date)[id];
}

// Toggle an item's tick for a date; returns the new tick map. Persists immediately.
export function toggleTick(date, id) {
  const ticks = loadTicks(date);
  if (ticks[id]) delete ticks[id];
  else ticks[id] = true;
  const s = store();
  if (s) {
    try { s.setItem(PREFIX + date, JSON.stringify(ticks)); }
    catch { /* quota / disabled: non-fatal, the tick just won't persist this run */ }
  }
  return ticks;
}
