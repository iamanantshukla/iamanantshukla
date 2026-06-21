import { useState } from 'react';
import { api } from '../lib/api.js';

export default function LockGate({ owner, onLocked }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const takeLock = async () => {
    setBusy(true);
    setError('');
    try {
      await api.takeLock();
      onLocked();
    } catch (e) {
      setError('Failed to take lock: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-card">
        <h1>🔒 Lock Active</h1>
        <p>The <strong>{owner}</strong> UI currently has the active lock.</p>
        <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1.5rem' }}>
          Taking the lock will download the latest changes from remote to synchronize this device, then lock it for your use.
        </p>
        {error && <div className="error">{error}</div>}
        <button className="primary" onClick={takeLock} disabled={busy}>
          {busy ? 'Syncing & Taking Lock...' : 'Sync Remote & Take Lock'}
        </button>
      </div>
    </div>
  );
}
