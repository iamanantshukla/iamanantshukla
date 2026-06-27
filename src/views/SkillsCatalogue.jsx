import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import LeafBack from '../components/LeafBack.jsx';

export default function SkillsCatalogue() {
  const [skills, setSkills] = useState([]);
  const [name, setName] = useState('');
  const [expectation, setExpectation] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function load() { api.listSkills().then(setSkills).catch(() => {}); }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await api.addSkill(name.trim(), expectation.trim());
      setName(''); setExpectation('');
      load();
    } catch (e2) {
      setErr(e2.message || 'Failed to add skill');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <LeafBack to="/shoot" label="Shoot" />
      <h2>Skills Catalogue</h2>
      <form className="form card" onSubmit={add} style={{ marginBottom: 20 }}>
        <h3>Add New Skill</h3>
        <label>Skill Name
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Trigger Squeeze" required />
        </label>
        <label>Expectation
          <textarea rows={4} value={expectation} onChange={(e) => setExpectation(e.target.value)}
            placeholder="Describe what perfect execution feels/looks like…" required />
        </label>
        {err && <div className="error">{err}</div>}
        <button disabled={busy || !name.trim() || !expectation.trim()}>
          {busy ? 'Saving…' : 'Save Skill'}</button>
      </form>

      <div className="grid">
        {skills.map((s) => (
          <div className="card" key={s.id}>
            <h3>{s.name}</h3>
            <p className="muted">{s.expectation}</p>
          </div>
        ))}
        {skills.length === 0 && <p className="muted">No skills yet — add your first above.</p>}
      </div>
    </div>
  );
}
