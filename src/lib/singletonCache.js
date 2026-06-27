// client/src/lib/singletonCache.js — a tiny SYNCHRONOUS last-value cache for the Jarvis singletons
// (pebble.json / today.json / campaign.json).
//
// Why this exists (spec E goal #5, "no flash"): the IndexedDB shard cache (idbCache.js) is the
// source of truth for shard data, but it is asynchronous — a component cannot read it during its
// first synchronous render. To render the LAST-KNOWN value on the very first paint (so the user
// never sees a placeholder swap to real text), we mirror the last fetched singleton into
// localStorage, which IS synchronously readable at mount. The async DriveStore read then refreshes
// in the background and we swap only if the value actually changed.
//
// Degrades safely: if localStorage is unavailable (private mode / SSR / tests without jsdom storage)
// every call no-ops and returns null, so callers fall back to their static defaults without crashing.

const PREFIX = 'jarvis.singleton.';

function store() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    return localStorage;
  } catch {
    return null;
  }
}

// Read the last cached value for a singleton synchronously. Returns the parsed value, or null.
export function readCachedSingleton(name) {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + name);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Persist the latest value for a singleton (called after a successful background refresh).
export function writeCachedSingleton(name, value) {
  const s = store();
  if (!s) return;
  try {
    if (value == null) s.removeItem(PREFIX + name);
    else s.setItem(PREFIX + name, JSON.stringify(value));
  } catch {
    /* quota / disabled storage: non-fatal, the next refresh re-fetches */
  }
}

// Stable structural compare so we only trigger a re-render/swap on a REAL change (goal #5: never
// swap when the background fetch returns the same content).
export function singletonChanged(a, b) {
  if (a === b) return false;
  try {
    return JSON.stringify(a) !== JSON.stringify(b);
  } catch {
    return true;
  }
}
