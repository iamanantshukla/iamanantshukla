// src/lib/auth.js — the Google Drive access token store, shared by api.js (DriveStore) and
// gymApi.js. Now persisted to sessionStorage with an expiry so a reload mid-session does not
// force a re-login (sub-project C). sessionStorage (not localStorage) by design: the token is
// scoped to the tab/session and cleared when the browser session ends — never written to Drive
// or localStorage.
//
// Token shape kept in memory: { access_token, expiresAt } where expiresAt is ms-epoch (or null
// if unknown). getAccessToken() returns the raw string for back-compat with existing callers.

const KEY = 'jarvis_drive_token';

let token = null; // { access_token, expiresAt } | null

function load() {
  if (token) return token;
  try {
    const raw = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(KEY);
    if (raw) token = JSON.parse(raw);
  } catch { /* sessionStorage unavailable (private mode / SSR) */ }
  return token;
}

function persist() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (token && token.access_token) sessionStorage.setItem(KEY, JSON.stringify(token));
    else sessionStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

// Accept either a raw string (legacy callers) or a { access_token, expiresAt } object.
export const setAccessToken = (t) => {
  if (!t) { token = null; persist(); return; }
  if (typeof t === 'string') token = { access_token: t, expiresAt: token?.expiresAt ?? null };
  else token = { access_token: t.access_token, expiresAt: t.expiresAt ?? null };
  persist();
};

export const getAccessToken = () => {
  const t = load();
  return t ? t.access_token : null;
};

// Full record (for authManager: expiry checks live in shared/authManager.js).
export const getStoredToken = () => {
  const t = load();
  return t && t.access_token ? { access_token: t.access_token, expiresAt: t.expiresAt ?? null } : null;
};

export const clearAccessToken = () => { token = null; persist(); };
