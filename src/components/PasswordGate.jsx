import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

export default function PasswordGate({ onAuthed }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Load Google script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const handleLogin = () => {
    setBusy(true);
    const client = google.accounts.oauth2.initTokenClient({
      client_id: '235655418368-kqfijrs3pkiugp1ji5brr727jkfqqh77.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/drive',
      callback: async (res) => {
        if (res && res.access_token) {
          await api.setAccessToken(res.access_token);
          onAuthed();
        } else {
          setBusy(false);
          alert('Login failed');
        }
      }
    });
    client.requestAccessToken();
  };

  return (
    <div className="gate">
      <div className="gate-card">
        <h1>🎯 Air Pistol Journal</h1>
        <p>Cloud Portal</p>
        <button className="primary" onClick={handleLogin} disabled={busy}>
          {busy ? 'Loading Data...' : 'Log in with Google'}
        </button>
      </div>
    </div>
  );
}
