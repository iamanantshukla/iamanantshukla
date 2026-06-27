// src/context/SyncContext.jsx — the resilience nerve-centre (sub-project C).
//
// Tracks how many writes are still waiting to reach Drive (the outbox), the auth state
// (authed | needsLogin), and the last successful sync time. Runs auto-drain on
// reconnect/focus/interval (api.startAutoDrain), surfaces a re-login need, and exposes the
// actions the SyncStatus UI calls: retry, relogin, downloadBackup, importBackup.
//
// Why this exists: a save that fails (offline / expired token) is committed to the durable
// IndexedDB outbox and NEVER dropped — but the athlete needs to SEE that and be able to act on
// it (retry, re-login, or save a local file). This context is that visible layer.

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api, startAutoDrain } from '../lib/api.js';

const SyncCtx = createContext(null);
export const useSync = () => useContext(SyncCtx);

const POLL_MS = 4000;

export function SyncProvider({ children }) {
  const [pending, setPending] = useState(0);
  const [authState, setAuthState] = useState('authed'); // 'authed' | 'needsLogin'
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const prevPending = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const n = await api.pendingCount();
      // A drop to zero means everything just synced — stamp the time.
      if (prevPending.current > 0 && n === 0) setLastSyncedAt(new Date().toISOString());
      prevPending.current = n;
      setPending(n);
    } catch { /* api not ready yet */ }
  }, []);

  // Subscribe to auth-state changes (the authManager fires 'needsLogin' when silent re-auth fails).
  useEffect(() => {
    const off = api.onAuthState((s) => setAuthState(s));
    return () => off && off();
  }, []);

  // Auto-drain (online + focus + interval) and a light poll to keep the badge current.
  useEffect(() => {
    const stop = startAutoDrain({ intervalMs: 30000 });
    const poll = setInterval(refresh, POLL_MS);
    refresh();
    return () => { stop(); clearInterval(poll); };
  }, [refresh]);

  const retry = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.drainNow();
      if (res && res.needsLogin) setAuthState('needsLogin');
      await refresh();
    } finally { setBusy(false); }
  }, [refresh]);

  const relogin = useCallback(async () => {
    setBusy(true);
    try {
      await api.relogin();          // interactive popup + re-run queued writes
      setAuthState('authed');
      await refresh();
    } catch { /* user dismissed; stays needsLogin */ }
    finally { setBusy(false); }
  }, [refresh]);

  // Local-file fallback: download the pending queue so data is safe even with no Drive/token.
  const downloadBackup = useCallback(async () => {
    const items = await api.exportOutbox();
    const payload = { kind: 'jarvis-outbox-backup', exportedAt: new Date().toISOString(), items };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    return items.length;
  }, []);

  const importBackup = useCallback(async (file) => {
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
      const n = await api.importOutbox(items);
      await refresh();
      return n;
    } finally { setBusy(false); }
  }, [refresh]);

  const value = {
    pending, authState, lastSyncedAt, busy,
    isSynced: pending === 0 && authState === 'authed',
    retry, relogin, downloadBackup, importBackup, refresh,
  };
  return <SyncCtx.Provider value={value}>{children}</SyncCtx.Provider>;
}
