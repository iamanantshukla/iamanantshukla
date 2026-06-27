import { useState } from 'react';
import { TEN_RING_RADIUS_MM, RING_RADIUS_STEP_MM, PELLET_RADIUS_MM } from '../lib/scoring.js';

const SPAN = 80;
const ringRadius = (ring) => TEN_RING_RADIUS_MM + (10 - ring) * RING_RADIUS_STEP_MM;
const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Structured post-session reflection prompts for shot-calling and live-match sessions.
// (Skill-focus sessions reflect through their own per-skill grid, so they skip this.)
const TECHNIQUE_PROMPTS = [
  { key: 'shot_routine', label: 'Shot routine' },
  { key: 'follow_through', label: 'Follow-through' },
  { key: 'trigger_control', label: 'Trigger control' },
  { key: 'sight_alignment', label: 'Sight alignment' },
  { key: 'grip_pressure', label: 'Grip pressure' },
  { key: 'stance_stability', label: 'Stance & stability' },
];
const MENTAL_PROMPTS = [
  { key: 'focus_concentration', label: 'Focus & concentration' },
  { key: 'confidence', label: 'Confidence level' },
  { key: 'handling_distraction', label: 'Handling distractions' },
  { key: 'execution_routine', label: 'Execution of routine' },
];

// Tap-only 1-5 rating row writing a number (0 = not rated).
function RatingRow({ label, value, onChange }) {
  return (
    <div className="jr-scale-row">
      <span className="jr-scale-label">{label}</span>
      <div className="jr-scale" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={value === n ? 'on' : ''} aria-pressed={value === n}
            onClick={() => onChange(value === n ? 0 : n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function Overlay({ points, color, solid }) {
  return (
    <svg viewBox={`${-SPAN} ${-SPAN} ${SPAN * 2} ${SPAN * 2}`} width="100%"
      style={{ aspectRatio: '1 / 1' }}>
      <rect x={-SPAN} y={-SPAN} width={SPAN * 2} height={SPAN * 2} fill="#0b0e12" rx="3" />
      <circle cx="0" cy="0" r={ringRadius(7)} fill="#11161c" />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => (
        <circle key={r} cx="0" cy="0" r={ringRadius(r)} fill="none" stroke="#3a4654" strokeWidth="0.3" />
      ))}
      {points.map((p, i) => solid
        ? <circle key={i} cx={p.x} cy={-p.y} r={PELLET_RADIUS_MM} fill={color} opacity="0.85" />
        : <circle key={i} cx={p.x} cy={-p.y} r={PELLET_RADIUS_MM} fill="none" stroke={color} strokeWidth="0.6" />
      )}
    </svg>
  );
}

export default function SummaryModal({ session, activeTab, focus, mode, onClose, onSave, saving, initialComments = '', onSaveComments, liveNotes = [] }) {
  const [comments, setComments] = useState(initialComments);
  const [manualShots, setManualShots] = useState('');
  const [savingComments, setSavingComments] = useState(false);
  // Structured reflection + match attachments (only collected when saving a session).
  const [reflection, setReflection] = useState({});
  const [wentWell, setWentWell] = useState('');
  const [workOn, setWorkOn] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [matchObservation, setMatchObservation] = useState('');
  const [siusName, setSiusName] = useState('');
  const [siusText, setSiusText] = useState('');
  const rate = (key, val) => setReflection((r) => ({ ...r, [key]: val }));

  const isMatch = focus === 'match' || activeTab === 'match';
  const isLive = mode === 'live' || isMatch;
  // Reflection questionnaire applies to shot-calling and match sessions (not skill focus).
  const showReflection = !!onSave && (isMatch || activeTab === 'shot');

  const onReadSius = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSiusName(file.name);
    const reader = new FileReader();
    reader.onload = () => setSiusText(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => setSiusText('');
    reader.readAsText(file);
  };

  const buildExtra = () => ({
    reflection: { ...reflection, went_well: wentWell, work_on: workOn },
    drive_link: driveLink.trim(),
    sius_file_name: siusName,
    sius_file_text: siusText,
    match_observation: matchObservation.trim(),
  });
  const calls = [], actuals = [];
  let callSum = 0, actualSum = 0, callN = 0, actualN = 0;
  for (const s of session.series || []) {
    for (const shot of s.shots) {
      if (shot.call) { calls.push(shot.call); callSum += shot.call.score; callN++; }
      if (shot.actual) { actuals.push(shot.actual); actualSum += shot.actual.score; actualN++; }
    }
  }

  const hasShots = callN > 0 || actualN > 0;
  const hasSkills = session.skillFocus && session.skillFocus.length > 0;

  let showSkills = false;
  let showShots = false;

  if (activeTab === 'match') {
    // A live match has no target/skill grid — just reflection + footer + notes.
  } else if (activeTab === 'skill') {
    showSkills = true;
  } else if (activeTab === 'shot') {
    showShots = true;
  } else {
    // If no activeTab is provided (e.g., viewing an old session), show what data we have.
    // If we have both, show both.
    if (hasSkills) showSkills = true;
    if (hasShots || (!hasShots && !hasSkills)) showShots = true; // default to shots if empty
  }

  // Helper to chunk skills
  const chunkedTables = [];
  let skillShots = 0;

  if (showSkills && hasSkills) {
    let currentTable = [];
    let currentSeen = new Set();
    session.skillFocus.forEach((row) => {
      if (currentSeen.has(row.skillId)) {
        chunkedTables.push(currentTable);
        currentTable = [];
        currentSeen.clear();
      }
      currentTable.push(row);
      currentSeen.add(row.skillId);
    });
    if (currentTable.length > 0) chunkedTables.push(currentTable);

    chunkedTables.forEach(table => {
      let maxCols = 0;
      table.forEach(row => {
        let filled = 0;
        row.cells.forEach(c => { if (c !== '') filled++; });
        if (filled > maxCols) maxCols = filled;
      });
      skillShots += maxCols;
    });
  }

  const hasRecordedShots = callN > 0 || actualN > 0 || skillShots > 0;
  const showBoth = showSkills && showShots;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: showBoth ? '800px' : '500px' }}>
        <h2>Session Summary</h2>
        
        <div style={{ maxHeight: '70vh', overflowY: 'auto', margin: '16px 0' }}>
          {session.mode !== 'mental' && showShots && (
            <div className="summary-cols">
              <div>
                <h3>Calls (hollow)</h3>
                <Overlay points={calls} color="#2f81f7" solid={false} />
                <p className="muted">{callN} shots · total {callSum.toFixed(1)}
                  {callN ? ` · avg ${(callSum / callN).toFixed(1)}` : ''}</p>
              </div>
              <div>
                <h3>Actuals (solid)</h3>
                <Overlay points={actuals} color="#f85149" solid />
                <p className="muted">{actualN} shots · total {actualSum.toFixed(1)}
                  {actualN ? ` · avg ${(actualSum / actualN).toFixed(1)}` : ''}</p>
              </div>
            </div>
          )}

          {session.mode !== 'mental' && showSkills && (
            <div style={{ marginTop: showShots ? '24px' : '0' }}>
              {showShots && <hr style={{ marginBottom: '16px', borderColor: 'var(--line)' }} />}
              {chunkedTables.length === 0 ? <p className="muted">No skills recorded.</p> : (
                chunkedTables.map((tableRows, idx) => (
                  <div key={idx} style={{ marginBottom: 16 }}>
                    {chunkedTables.length > 1 && <h4 style={{ marginBottom: 4 }}>Set {idx + 1}</h4>}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '4px' }}>Skill</th>
                          {Array.from({ length: 10 }, (_, i) => <th key={i} style={{ padding: '4px' }}>{i + 1}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row, ri) => (
                          <tr key={ri}>
                            <td style={{ padding: '4px' }}>{row.name}</td>
                            {row.cells.map((c, ci) => (
                              <td key={ci} style={{ padding: '4px' }}>
                                <div style={{
                                  width: '100%', minWidth: '16px', height: '20px', borderRadius: '4px',
                                  background: c === 'green' ? 'var(--good)' : c === 'red' ? 'var(--bad)' : c === 'yellow' ? 'var(--warn)' : 'transparent',
                                  border: c === '' ? '1px solid var(--line)' : 'none'
                                }} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {liveNotes.length > 0 && (
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px' }}>{isMatch ? 'How your mind moved through the match' : 'In-session notes'}</label>
            <ul className="live-note-list">
              {liveNotes.map((n, i) => (
                <li key={i}>
                  {(n.series || n.t != null) && (
                    <span className="note-meta">{n.series ? `Series ${n.series}` : ''}{n.series && n.t != null ? ' · ' : ''}{n.t != null ? fmtClock(n.t) : ''}</span>
                  )}
                  {n.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Structured reflection questionnaire — shot-calling + live-match sessions. */}
        {showReflection && (
          <div className="form-group jr-reflection">
            <h3 style={{ margin: '4px 0 0' }}>How did it feel?</h3>
            <div className="ref-group-label">Technique</div>
            {TECHNIQUE_PROMPTS.map((p) => (
              <RatingRow key={p.key} label={p.label} value={reflection[p.key] || 0} onChange={(v) => rate(p.key, v)} />
            ))}
            <div className="ref-group-label">Mind &amp; execution</div>
            {MENTAL_PROMPTS.map((p) => (
              <RatingRow key={p.key} label={p.label} value={reflection[p.key] || 0} onChange={(v) => rate(p.key, v)} />
            ))}
            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>What went well?</label>
              <textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)}
                placeholder="What worked today?"
                style={{ width: '100%', minHeight: '60px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '8px', borderRadius: '8px' }} />
            </div>
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>What to work on?</label>
              <textarea value={workOn} onChange={(e) => setWorkOn(e.target.value)}
                placeholder="One thing to improve next time"
                style={{ width: '100%', minHeight: '60px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '8px', borderRadius: '8px' }} />
            </div>
          </div>
        )}

        {onSave ? (
          <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
            {!hasRecordedShots && session.mode !== 'mental' && !isMatch && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Total Shots / Reps</label>
                <input
                  type="number"
                  value={manualShots}
                  onChange={e => setManualShots(e.target.value)}
                  placeholder="e.g. 50"
                  style={{ width: '100%' }}
                />
              </div>
            )}
            <label style={{ display: 'block', marginBottom: '8px' }}>{session.mode === 'mental' ? 'How did you feel?' : (isMatch ? 'Quick comment' : 'Session Comments')}</label>
            <textarea
              style={{ width: '100%', minHeight: '80px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={session.mode === 'mental' ? "E.g. Struggled to visualize the trigger squeeze, felt very calm..." : "Immediate observations from the session..."}
            />
          </div>
        ) : (
          <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>{session.mode === 'mental' ? 'How did you feel?' : 'Session Comments'}</label>
            <textarea
              style={{ width: '100%', minHeight: '80px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={session.mode === 'mental' ? "E.g. Struggled to visualize the trigger squeeze, felt very calm..." : "Immediate observations from the session..."}
            />
            {comments !== initialComments && (
              <button
                style={{ marginTop: '8px' }}
                disabled={savingComments}
                onClick={async () => {
                  if (onSaveComments) {
                    setSavingComments(true);
                    await onSaveComments(comments);
                    setSavingComments(false);
                  }
                }}
              >
                {savingComments ? 'Saving...' : 'Save Comments'}
              </button>
            )}
          </div>
        )}

        {/* Match / live-fire footer: SIUS results file, video link, and match observation. */}
        {onSave && isLive && (
          <div className="form-group jr-match-footer">
            <h3 style={{ margin: '4px 0 0' }}>{isMatch ? 'Match record' : 'Live fire record'}</h3>
            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>SIUS results file</label>
              <input type="file" accept=".csv,.txt,.json,.xml,text/*" onChange={onReadSius} style={{ width: '100%' }} />
              {siusName && <p className="muted" style={{ marginTop: '6px' }}>Attached: {siusName}{siusText ? ` (${siusText.length} chars)` : ''}</p>}
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Video / photos link (Drive)</label>
              <input type="url" value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..." style={{ width: '100%' }} />
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Match observation</label>
              <textarea value={matchObservation} onChange={(e) => setMatchObservation(e.target.value)}
                placeholder="Your overall read of the match — what happened, conditions, decisions…"
                style={{ width: '100%', minHeight: '80px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '8px', borderRadius: '8px' }} />
            </div>
          </div>
        )}

        {onSave ? (
          <div className="row">
            <button onClick={() => onSave(comments, manualShots, buildExtra())} disabled={saving}>{saving ? 'Saving…' : 'Save Session'}</button>
            <button className="secondary" onClick={onClose}>{session.mode === 'mental' ? 'Keep Meditating' : 'Keep Shooting'}</button>
          </div>
        ) : (
          <div className="row">
            <button onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
