// src/lib/googleAuth.js — the single Google Identity Services (GIS) token client (sub-project C).
//
// One place owns sign-in so BOTH the first login (AuthGate) and the mid-session re-acquire
// (authManager.withAuth silent re-auth + relogin) call the same flow. Previously the only grant
// path lived inside AuthGate, so when the ~1h token expired mid-session there was nothing for
// withAuth to call — that is the gap this closes.
//
// requestToken({ silent }):
//   - silent: true  -> attempt a NO-popup token refresh (GIS prompt: '' / 'none'); resolves with a
//     fresh token if the user still has a live Google session, else rejects (the caller then
//     surfaces a re-login prompt). This is what makes a >1h session keep saving without interaction
//     when possible.
//   - silent: false -> the interactive popup grant (explicit "sign in again").
// Returns { access_token, expiresAt } where expiresAt is ms-epoch (GIS expires_in is seconds).

const CLIENT_ID = '235655418368-kqfijrs3pkiugp1ji5brr727jkfqqh77.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive';

let gisLoading = null;

// Load the GIS script once (idempotent). Resolves when google.accounts.oauth2 is available.
export function loadGis() {
  if (typeof window !== 'undefined' && window.google && window.google.accounts && window.google.accounts.oauth2) {
    return Promise.resolve();
  }
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') { reject(new Error('no document')); return; }
    const existing = document.querySelector('script[data-gis]');
    const onload = () => resolve();
    if (existing) { existing.addEventListener('load', onload); if (window.google) resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true; s.setAttribute('data-gis', '1');
    s.onload = onload;
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.body.appendChild(s);
  });
  return gisLoading;
}

const toExpiry = (res) => {
  const secs = Number(res && res.expires_in);
  return Number.isFinite(secs) && secs > 0 ? Date.now() + secs * 1000 : null;
};

// requestToken({ silent }) -> Promise<{ access_token, expiresAt }>
export async function requestToken({ silent = false } = {}) {
  await loadGis();
  return new Promise((resolve, reject) => {
    let settled = false;
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      // Silent: '' tells GIS to skip the consent UI and use the existing session if possible.
      // Interactive: undefined lets GIS show the account/consent popup.
      prompt: silent ? '' : undefined,
      callback: (res) => {
        settled = true;
        if (res && res.access_token) resolve({ access_token: res.access_token, expiresAt: toExpiry(res) });
        else reject(new Error('No access token returned'));
      },
      error_callback: (err) => {
        settled = true;
        const e = new Error((err && (err.message || err.type)) || 'Token request failed');
        e.silentFailed = silent; // the caller distinguishes "silent could not refresh" from a hard error
        reject(e);
      },
    });
    try {
      client.requestAccessToken();
    } catch (err) {
      if (!settled) reject(err);
    }
  });
}
