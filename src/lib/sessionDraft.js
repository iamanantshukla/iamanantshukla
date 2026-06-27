// client/src/lib/sessionDraft.js — the in-progress capture draft (spec §0 rule #5 / §4.3).
//
// The capture screen (ActiveSession + SessionContext) is otherwise pure in-memory React state, so a
// reload mid-series bounces to /shoot and silently loses everything (the bug at ActiveSession.jsx:29).
// This persists the live capture on EVERY interaction and rehydrates it on mount, so a reload (or an
// accidental nav) restores the session exactly where it was.
//
// SYNCHRONOUS localStorage (same approach as singletonCache) so the draft is readable on the very
// first paint — no async flash before the series reappears. Degrades to a no-op when storage is
// unavailable (private mode / SSR / tests), so the app never crashes; it just loses cross-reload
// persistence, which is the pre-existing behaviour.
//
// The draft also carries `startedAt` (session start) and `firstShotAt` (first call/actual placed):
// these timestamps unblock the capture-latency success metric (§8) once they reach the Drive payload.

const KEY = 'jarvis-session-draft';

function store() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    return localStorage;
  } catch {
    return null;
  }
}

// Read the persisted draft synchronously. Returns the parsed draft object, or null when there is
// none / storage is unavailable / the stored value is corrupt (never throws).
export function loadDraft() {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Persist the current draft. Called on every capture interaction (tap, note, series change, tick).
export function saveDraft(draft) {
  const s = store();
  if (!s) return;
  try {
    if (draft == null) s.removeItem(KEY);
    else s.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* quota / disabled storage: non-fatal — the in-memory state is still authoritative this run */
  }
}

// Remove the draft (on save or discard) so a fresh session never rehydrates a stale one.
export function clearDraft() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}
