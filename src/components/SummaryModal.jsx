import { useState } from 'react';
import { TEN_RING_RADIUS_MM, RING_RADIUS_STEP_MM, PELLET_RADIUS_MM } from '../lib/scoring.js';

const SPAN = 80;
const ringRadius = (ring) => TEN_RING_RADIUS_MM + (10 - ring) * RING_RADIUS_STEP_MM;

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

export default function SummaryModal({ session, activeTab, onClose, onSave, saving, initialComments = '', onSaveComments, liveNotes = [] }) {
  const [comments, setComments] = useState(initialComments);
  const [manualShots, setManualShots] = useState('');
  const [savingComments, setSavingComments] = useState(false);
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
  
  if (activeTab === 'skill') {
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
          {showShots && (
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

          {showSkills && (
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
            <label style={{ display: 'block', marginBottom: '8px' }}>In-session notes</label>
            <ul className="live-note-list">{liveNotes.map((n, i) => <li key={i}>{n.text}</li>)}</ul>
          </div>
        )}

        {onSave ? (
          <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
            {!hasRecordedShots && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Total Shots / Reps (Dry Fire)</label>
                <input 
                  type="number" 
                  value={manualShots} 
                  onChange={e => setManualShots(e.target.value)} 
                  placeholder="e.g. 50"
                  style={{ width: '100%' }}
                />
              </div>
            )}
            <label style={{ display: 'block', marginBottom: '8px' }}>Session Comments</label>
            <textarea
              style={{ width: '100%', minHeight: '80px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Immediate observations from the session..."
            />
          </div>
        ) : (
          <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Session Comments</label>
            <textarea
              style={{ width: '100%', minHeight: '80px', background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px' }}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Immediate observations from the session..."
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

        {onSave ? (
          <div className="row">
            <button onClick={() => onSave(comments, manualShots)} disabled={saving}>{saving ? 'Saving…' : 'Save Session'}</button>
            <button className="secondary" onClick={onClose}>Keep Shooting</button>
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
