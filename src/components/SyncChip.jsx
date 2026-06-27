// src/components/SyncChip.jsx — the top-bar sync status chip + dialog (replaces the Logout button
// and the standalone sync bar). A colored dot conveys state at a glance:
//   green  = synced (everything saved to Drive)
//   yellow = pending writes waiting to sync (safe on this device)
//   red    = something's wrong (session expired / needs sign-in)
// Tapping opens a dialog that EXPLAINS the state and offers the relevant actions (Sign in / Retry),
// plus the always-available Backup / Restore, and Logout.
import { useRef, useState } from 'react';
import { useSync } from '../context/SyncContext.jsx';

function ago(iso) {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function SyncChip({ onLogout }) {
  const sync = useSync();
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  if (!sync) return null;

  const { pending, authState, lastSyncedAt, busy, retry, relogin, downloadBackup, importBackup } = sync;

  // Resolve the traffic-light state.
  const tone = authState === 'needsLogin' ? 'red' : pending > 0 ? 'yellow' : 'green';
  const chipLabel = tone === 'red' ? 'Sign in' : tone === 'yellow' ? `${pending} pending` : 'Synced';
  const title = tone === 'red' ? 'Sync paused' : tone === 'yellow' ? 'Syncing…' : 'All saved';
  const explain = tone === 'red'
    ? `Your session expired. ${pending > 0 ? `${pending} change(s) are` : 'Your work is'} safe on this device — sign in again to save them to Drive.`
    : tone === 'yellow'
      ? `${pending} change${pending === 1 ? '' : 's'} saved on this device and waiting to reach Drive. They'll sync automatically; you can retry now or save a local backup.`
      : `Everything is saved to Drive${lastSyncedAt ? ` — last synced ${ago(lastSyncedAt)}` : ''}.`;

  const onBackup = async () => {
    const n = await downloadBackup();
    setMsg(n > 0 ? `Saved ${n} pending item(s) to a file.` : 'Nothing pending — saved an empty backup.');
  };
  const onImport = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try { setMsg(`Imported ${await importBackup(file)} item(s); syncing.`); }
    catch (err) { setMsg(`Import failed: ${(err && err.message) || 'bad file'}`); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <>
      <button className={`sync-chip sync-chip--${tone}`} onClick={() => { setMsg(''); setOpen(true); }}
              aria-label={`Sync status: ${title}`} aria-haspopup="dialog">
        <span className="sync-dot" aria-hidden="true" />
        <span className="sync-chip__label">{chipLabel}</span>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="sync-dlg-head">
              <span className={`sync-dot sync-dot--lg sync-chip--${tone}`} aria-hidden="true" />
              <h3 style={{ margin: 0 }}>{title}</h3>
            </div>
            <p style={{ lineHeight: 1.5 }}>{explain}</p>

            <div className="row" style={{ marginTop: 12 }}>
              {tone === 'red' ? (
                <button disabled={busy} onClick={relogin}>{busy ? 'Signing in…' : 'Sign in again'}</button>
              ) : tone === 'yellow' ? (
                <button disabled={busy} onClick={retry}>{busy ? 'Syncing…' : 'Retry now'}</button>
              ) : null}
              <button className="secondary" onClick={onBackup}>Backup</button>
              <button className="secondary" onClick={() => fileRef.current && fileRef.current.click()}>Restore</button>
              <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImport} />
            </div>

            {msg && <p className="muted" style={{ marginTop: 10 }}>{msg}</p>}

            <button className="secondary sync-dlg-logout" onClick={onLogout}>Log out</button>
          </div>
        </div>
      )}
    </>
  );
}
