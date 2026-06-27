import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { useJarvis } from '../context/JarvisContext.jsx';
import { api } from '../lib/api.js';
import ShotCapture from '../components/ShotCapture.jsx';
import SkillFocusTable from '../components/SkillFocusTable.jsx';
import SummaryModal from '../components/SummaryModal.jsx';
import SaveCelebration from '../components/SaveCelebration.jsx';
import { IconPlay, IconPause, IconPlus, IconTarget } from '../components/Icons.jsx';

// Process stats for the celebration — SCORE-BLIND (call-match, avg, shots), never the ISSF score as
// the praise trigger. Computed from the just-saved series before reset clears it.
function processStats(series = []) {
  let scored = 0, scoreSum = 0, matched = 0, matchable = 0;
  for (const ser of series) {
    for (const sh of ser.shots || []) {
      if (sh.actual && !sh.actual.miss) { scored += 1; scoreSum += sh.actual.score || 0; }
      if (sh.call && sh.actual && !sh.actual.miss) {
        matchable += 1;
        if (Math.hypot(sh.call.x - sh.actual.x, sh.call.y - sh.actual.y) <= 5) matched += 1;
      }
    }
  }
  const stats = [];
  if (matchable) stats.push({ label: 'Call-match', value: `${Math.round((matched / matchable) * 100)}%` });
  if (scored) stats.push({ label: 'Avg', value: (scoreSum / scored).toFixed(1) });
  stats.push({ label: 'Shots', value: String(scored || series.reduce((n, s) => n + (s.shots ? s.shots.length : 0), 0)) });
  return stats;
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Full-screen "activity mode" shooting session (Strava-style). It renders outside the
// app nav (see App.jsx) and can only be left via End Session (save) or Discard.
export default function ActiveSession() {
  const s = useSession();
  const jarvis = useJarvis();
  const navigate = useNavigate();
  const isMatch = s.focus === 'match';
  const [subtab, setSubtab] = useState(s.focus === 'skill' ? 'skill' : 'shot'); // 'shot' | 'skill'
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [celebration, setCelebration] = useState(null); // post-save Pebble moment (§4.4)
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const addNote = () => { if (noteText.trim()) { s.addLiveNote(noteText); setNoteText(''); setNoteOpen(false); } };

  // If we land here with no active session (e.g. direct nav / reload), bounce to Shoot — UNLESS a
  // post-save celebration is showing (the save just reset the session on purpose).
  useEffect(() => {
    if (!s.sessionActive && !celebration) navigate('/shoot', { replace: true });
  }, [s.sessionActive, celebration, navigate]);

  useEffect(() => {
    if (s.finishRequested) {
      setShowSummary(true);
      s.setFinishRequested(false);
    }
  }, [s.finishRequested, s]);

  useEffect(() => { if (s.focus === 'shot' || s.focus === 'skill') setSubtab(s.focus); }, [s.focus]);

  // Shot-calling capture (target, series nav, call→actuals flow, edit, undo, mark-miss) is fully
  // encapsulated in <ShotCapture/>.

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
        // Capture-latency timestamps (§8): session start + first shot placed.
        started_at: s.getStartedAt ? s.getStartedAt() : undefined,
        first_shot_at: s.getFirstShotAt ? s.getFirstShotAt() : undefined,
        ...extra,
      });
      // Capture the celebration data BEFORE reset clears the series. The proud state is SCORE-BLIND:
      // it fires on the agent's mission.completed flag (§4.4 / §6), never on session.score.
      const stats = processStats(s.series);
      const earned = !!(jarvis.mission && (jarvis.mission.completed
        || (jarvis.mission.mission && jarvis.mission.mission.completed)));
      setShowSummary(false);
      s.reset();           // clears sessionActive + the persisted draft -> leaves activity mode
      setCelebration({
        earned,
        line: earned ? jarvis.line : 'Logged. Recovery and reps both count.',
        continuityDay: 0, // continuity is computed on Home; a future pass can thread it here
        stats,
      });
    } catch (e) {
      setMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Leave the celebration (and the full-screen session) for the chosen destination.
  function leaveCelebration(to = '/shoot') {
    setCelebration(null);
    navigate(to);
  }

  function discard() {
    s.reset();
    navigate('/shoot');
  }

  const isOffline = s.mode === 'offline' || s.focus === 'offline';
  // An offline session (and mental) is timer-only: no target/skill grid.
  const isTimerOnly = s.mode === 'mental' || isOffline;
  const modeLabel = isOffline ? (s.sessionMeta && s.sessionMeta.label) || 'Offline Session'
    : s.mode === 'mental' ? 'Mental Training'
    : (isMatch ? 'Live Match' : (s.mode === 'dry' ? 'Dry Fire' : 'Live Fire'));

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
        {!isTimerOnly && (
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

        {isOffline ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--accent)', marginBottom: '12px' }}>{modeLabel}</h2>
            {s.sessionMeta && s.sessionMeta.detail ? (
              <p style={{ color: 'var(--text)', maxWidth: 400, marginBottom: 8 }}>{s.sessionMeta.detail}</p>
            ) : null}
            <p style={{ color: 'var(--muted)', maxWidth: '400px' }}>
              The timer is running. Work through your block{s.sessionMeta && s.sessionMeta.durationMin ? ` (~${s.sessionMeta.durationMin} min)` : ''};
              tap <strong>Note</strong> for anything worth remembering, and End when you're done.
            </p>
          </div>
        ) : s.mode === 'mental' ? (
          <div className="mental-panel">
            <h2 style={{ color: 'var(--accent)', marginBottom: '12px' }}>Mental Training</h2>
            {jarvis.mentalScenario ? (
              <blockquote className="mental-scenario">{jarvis.mentalScenario}</blockquote>
            ) : (
              <blockquote className="mental-scenario">
                Sit quietly and rehearse your match: settle into your stance, run your full pre-shot
                routine, and watch each shot break clean. (Pebble adds a specific scenario on match-prep days.)
              </blockquote>
            )}
            <p className="muted" style={{ maxWidth: '420px', marginTop: 12 }}>
              {jarvis.mentalScenario ? 'Read it, close your eyes, and run it in full detail — see and feel each shot.' : 'Close your eyes and run it in full detail — see and feel each shot.'}
              {' '}The timer is running; tap <strong>Note</strong> for anything worth remembering, and End when your sets are done.
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
              <ShotCapture />
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
          /* Offline + mental are timer-only: reuse the mental shape so no shot/skill grid renders. */
          session={{ series: s.series, skillFocus: s.skillFocus, mode: isOffline ? 'mental' : s.mode }}
          activeTab={isMatch ? 'match' : isOffline ? 'offline' : subtab}
          focus={s.focus}
          mode={isOffline ? 'mental' : s.mode}
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

      {celebration && (
        <SaveCelebration
          earned={celebration.earned}
          line={celebration.line}
          continuityDay={celebration.continuityDay}
          stats={celebration.stats}
          onAddFeel={() => leaveCelebration('/journal')}
          onReview={() => leaveCelebration('/shoot/reviews')}
          onClose={() => leaveCelebration('/shoot')}
        />
      )}
    </div>
  );
}
