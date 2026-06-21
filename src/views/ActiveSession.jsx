import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../lib/api.js';
import TargetCanvas from '../components/TargetCanvas.jsx';
import SeriesPanel from '../components/SeriesPanel.jsx';
import SkillFocusTable from '../components/SkillFocusTable.jsx';
import SummaryModal from '../components/SummaryModal.jsx';
import { IconPlay, IconPause, IconPlus, IconTarget } from '../components/Icons.jsx';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Full-screen "activity mode" shooting session (Strava-style). It renders outside the
// app nav (see App.jsx) and can only be left via End Session (save) or Discard.
export default function ActiveSession() {
  const s = useSession();
  const navigate = useNavigate();
  const [subtab, setSubtab] = useState(s.focus || 'shot'); // 'shot' | 'skill'
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const addNote = () => { if (noteText.trim()) { s.addLiveNote(noteText); setNoteText(''); setNoteOpen(false); } };

  // If we land here with no active session (e.g. direct nav / reload), bounce to Shoot.
  useEffect(() => {
    if (!s.sessionActive) navigate('/shoot', { replace: true });
  }, [s.sessionActive, navigate]);

  const shots = s.series[s.currentSeries]?.shots || [];

  useEffect(() => {
    if (s.finishRequested) {
      setShowSummary(true);
      s.setFinishRequested(false);
    }
  }, [s.finishRequested, s]);

  useEffect(() => { if (s.focus) setSubtab(s.focus); }, [s.focus]);

  function onTap(mm) {
    if (s.armedActual) s.logActual(mm);
    else s.logCall(mm);
  }
  function prevSeries() { if (s.currentSeries > 0) s.setCurrentSeries(s.currentSeries - 1); }
  function nextSeries() {
    const next = s.currentSeries + 1;
    s.ensureSeries(next);
    s.setCurrentSeries(next);
  }

  async function save(comments, manualShots) {
    setSaving(true); setMsg('');
    try {
      await api.saveSession({
        mode: s.mode,
        duration_seconds: s.seconds,
        series: s.series,
        skillFocus: s.skillFocus,
        comments,
        manual_shots: Number(manualShots) || 0,
        live_notes: s.liveNotes,
      });
      setShowSummary(false);
      s.reset();           // clears sessionActive -> leaves activity mode
      navigate('/shoot');
    } catch (e) {
      setMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    s.reset();
    navigate('/shoot');
  }

  const modeLabel = s.mode === 'dry' ? 'Dry Fire' : 'Live Fire';

  return (
    <div className="session-fullscreen">
      {/* Activity header: identity + live timer + controls */}
      <header className="session-bar">
        <div className="session-id">
          <IconTarget size={18} />
          <span className="session-mode">{modeLabel}</span>
        </div>
        <span className="session-timer">{fmt(s.seconds)}</span>
        <div className="session-controls">
          <button className="session-icon-btn" aria-label={s.running ? 'Pause' : 'Resume'} onClick={() => (s.running ? s.pause() : s.play())}>
            {s.running ? <IconPause size={18} /> : <IconPlay size={18} />}
          </button>
          <button className="session-end" onClick={() => { s.pause(); setShowSummary(true); }}>End</button>
        </div>
      </header>

      <div className="session-body">
        <div className="subtabs">
          <button className={subtab === 'shot' ? 'active' : ''} onClick={() => setSubtab('shot')}>Shot Calling</button>
          <button className={subtab === 'skill' ? 'active' : ''} onClick={() => setSubtab('skill')}>Skill Focus</button>
          <div style={{ flex: 1 }} />
          <button className="secondary" onClick={() => setNoteOpen((o) => !o)}><IconPlus size={16} /> Note</button>
        </div>

        {noteOpen && (
          <div className="live-note">
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="What did you feel this shot? (e.g. pulled left, grip slipped)" />
            <button onClick={addNote}>Save note</button>
          </div>
        )}
        {s.liveNotes.length > 0 && (
          <ul className="live-note-list">{s.liveNotes.map((n, i) => <li key={i}>{n.text}</li>)}</ul>
        )}
        {msg && <p className="muted">{msg}</p>}

        {/* Both subtabs stay mounted; hide to preserve state. */}
        <div style={{ display: subtab === 'shot' ? 'block' : 'none' }}>
          <div className="shotcall">
            <div className="target-wrap">
              <div className="series-nav">
                <button className="secondary" onClick={prevSeries} disabled={s.currentSeries === 0}>←</button>
                <span>Series {s.currentSeries + 1} · {shots.length}/10{s.armedActual ? ' · placing ACTUAL' : ''}</span>
                <button className="secondary" onClick={nextSeries}>→</button>
              </div>
              <TargetCanvas shots={shots} onTap={onTap} armed={!!s.armedActual} />
            </div>
            <SeriesPanel />
          </div>
        </div>

        <div style={{ display: subtab === 'skill' ? 'block' : 'none' }}>
          <SkillFocusTable />
        </div>

        <div className="session-footer">
          <button className="secondary discard-link" onClick={() => setConfirmDiscard(true)}>Discard session</button>
        </div>
      </div>

      {showSummary && (
        <SummaryModal
          session={{ series: s.series, skillFocus: s.skillFocus }}
          activeTab={subtab}
          liveNotes={s.liveNotes}
          onClose={() => setShowSummary(false)}
          onSave={save}
          saving={saving}
        />
      )}

      {confirmDiscard && (
        <div className="modal-backdrop" onClick={() => setConfirmDiscard(false)}>
          <div className="modal" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
            <h2>Discard session?</h2>
            <p className="muted">This session won't be saved. Shots, skills and notes will be lost.</p>
            <div className="row">
              <button className="secondary" onClick={() => setConfirmDiscard(false)}>Keep going</button>
              <button onClick={discard} style={{ background: 'var(--bad)' }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
