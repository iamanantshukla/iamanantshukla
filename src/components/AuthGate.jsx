import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { IS_LOCAL } from '../lib/config.js';
import { loadGis, requestToken } from '../lib/googleAuth.js';
import { IconTarget } from './Icons.jsx';

// AuthGate — the single, Google-OAuth-only sign-in gate for BOTH build targets (sub-project B §3.3.2).
//
// Post sub-project A the laptop authenticates as the user via OAuth exactly like the iPad, so the
// old local-server password step is gone. The grant flow lives in lib/googleAuth.js so the SAME
// path serves first login (here), silent mid-session refresh, and interactive re-login (SyncContext).
// On success: api.setAccessToken({access_token,expiresAt}) then onAuthed().
export function AuthGate({ onAuthed }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadGis().catch(() => setError('Could not load Google sign-in')); }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const tok = await requestToken({ silent: false }); // { access_token, expiresAt }
      await api.setAccessToken(tok);
      onAuthed();
    } catch (err) {
      setBusy(false);
      setError((err && err.message) || 'Google Login failed');
    }
  };

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={handleLogin}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><IconTarget size={22} /> Air Pistol Journal</h1>
        <p>{IS_LOCAL ? 'Drive Sync' : 'Cloud Portal · Drive Sync'}</p>

        {error && <div className="error" style={{ marginBottom: '16px', color: '#ff6b6b' }}>{error}</div>}

        <button className="primary" disabled={busy} type="submit">
          {busy ? 'Authenticating...' : 'Log in with Google'}
        </button>
      </form>
    </div>
  );
}

export default AuthGate;
