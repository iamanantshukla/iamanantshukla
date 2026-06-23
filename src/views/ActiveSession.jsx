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
  const isMatch = s.focus === 'match';
  const [subtab, setSubtab] = useState(s.focus === 'skill' ? 'skill' : 'shot'); // 'shot' | 'skill'
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

  useEffect(() => { if (s.focus === 'shot' || s.focus === 'skill') setSubtab(s.focus); }, [s.focus]);

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

  // extra: { reflection, drive_link, sius_file_name, sius_file_text, match_observation }
  async function save(comments, manualShots, extra = {}) {
    setSaving(true); setMsg('');
    try {
      await api.saveSession({
        mode: s.mode,
        focus: s.focus,
        duration_seconds: s.seconds,
        series: s.series,
        skillFocus: s.skillFocus,
        comments,
        manual_shots: Number(manualShots) || 0,
        live_notes: s.liveNotes,
        ...extra,
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

  const modeLabel = s.mode === 'mental' ? 'Mental Training' : (isMatch ? 'Live Match' : (s.mode === 'dry' ? 'Dry Fire' : 'Live Fire'));

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
        {s.mode !== 'mental' && (
          <div className="subtabs">
            {!isMatch && (
              <>
                <button className={subtab === 'shot' ? 'active' : ''} onClick={() => setSubtab('shot')}>Shot Calling</button>
                <button className={subtab === 'skill' ? 'active' : ''} onClick={() => setSubtab('skill')}>Skill Focus</button>
              </>
            )}
            {isMatch && <span className="session-mode" style={{ alignSelf: 'center' }}>Match string in progress</span>}
            <div style={{ flex: 1 }} />
            <button className="secondary" onClick={() => setNoteOpen((o) => !o)}><IconPlus size={16} /> Note</button>
          </div>
        )}

        {noteOpen && (
          <div className="live-note">
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder={isMatch ? "What's going through your mind right now? (e.g. lost focus after a 7, reset routine)" : "What did you feel this shot? (e.g. pulled left, grip slipped)"} />
            <button onClick={addNote}>Save note</button>
          </div>
        )}
        {s.liveNotes.length > 0 && (
          <ul className="live-note-list">
            {s.liveNotes.map((n, i) => (
              <li key={i}>
                {(n.series || n.t != null) && (
                  <span className="note-meta">{n.series ? `Series ${n.series}` : ''}{n.series && n.t != null ? ' · ' : ''}{n.t != null ? fmt(n.t) : ''}</span>
                )}
                {n.text}
              </li>
            ))}
          </ul>
        )}
        {msg && <p className="muted">{msg}</p>}

        {s.mode === 'mental' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Mental Training</h2>
            <p style={{ color: 'var(--muted)', maxWidth: '400px' }}>
              Close your eyes and visualize the scenario. 
              The timer is running. Tap End when you have completed your visualization sets.
            </p>
          </div>
        ) : isMatch ? (
          <div className="match-panel">
            <IconTarget size={40} />
            <h3 style={{ margin: '12px 0 4px' }}>Live Match</h3>
            <p className="muted" style={{ maxWidth: 360 }}>
              Shoot your string. Tap <strong>Note</strong> whenever something goes through your mind so you can trace
              how your focus moved through the match. End the session to add your SIUS file, a video link, your scores,
              and your match observation.
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}

        <div className="session-footer">
          <button className="secondary discard-link" onClick={() => setConfirmDiscard(true)}>Discard session</button>
        </div>
      </div>

      {showSummary && (
        <SummaryModal
          session={{ series: s.series, skillFocus: s.skillFocus, mode: s.mode }}
          activeTab={isMatch ? 'match' : subtab}
          focus={s.focus}
          mode={s.mode}
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
