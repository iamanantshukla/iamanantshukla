// src/components/ShotCapture.jsx — the iPad-first call→actuals capture surface (spec §4.3).
//
// Layout: two columns (CSS handles the landscape split — target hero ~1.6x the right panel).
//   Left  (hero): series nav (‹ Series N · X/10 ›), the large tappable target, zoom, a contextual hint.
//   Right        : the Call/Actuals mode toggle, live stats, the shot-by-shot string table, an edit
//                  sub-toggle, Undo + the primary action, and a "mark as miss" link.
//
// Flow (owner-specified, exact):
//   - CALL pass (default): each target tap marks the call for the next uncalled shot and auto-advances.
//   - ACTUALS pass: switch to "Mark actuals" OR tap a row to select it, then tap where it landed.
//   - EDIT a shot: tap its row to select; a Call/Actual sub-toggle picks which marker a tap moves.
//   - Undo removes the last call; "mark as miss" records a coordinate-less zero for the armed shot.
import { useState } from 'react';
import TargetCanvas from './TargetCanvas.jsx';
import { useSession } from '../context/SessionContext.jsx';

// One decimal, tabular; em-dash when empty.
const fmtScore = (pt) => (pt ? (pt.miss ? 'miss' : pt.score.toFixed(1)) : '—');

export default function ShotCapture() {
  const s = useSession();
  const [mode, setMode] = useState('call');   // 'call' | 'actual'  (the pass)
  const [editMarker, setEditMarker] = useState('actual'); // which marker a tap moves when a row is selected
  const shots = s.series[s.currentSeries]?.shots || [];

  // The currently "selected" shot for editing/actuals (armedActual or armedCall in this series).
  const armed = s.armedActual && s.armedActual.seriesIndex === s.currentSeries ? s.armedActual
    : s.armedCall && s.armedCall.seriesIndex === s.currentSeries ? s.armedCall : null;

  // A target tap routes by the current pass + any armed row.
  function onTap(mm) {
    if (s.armedActual) { s.logActual(mm); return; }          // placing an actual on a selected row
    if (s.armedCall) { s.editShot(s.currentSeries, s.armedCall.shotN, 'call', mm); s.armCall(null); return; }
    if (mode === 'actual') {
      // "Mark actuals" pass with no row armed: arm the first shot still missing its actual.
      const next = shots.find((sh) => sh.call && !sh.actual);
      if (next) { s.armActual(s.currentSeries, next.n); }
      return;
    }
    s.logCall(mm); // CALL pass: append + auto-advance
  }

  // Tap a row to select it: in the actuals pass arm its actual; in edit, arm whichever marker the
  // sub-toggle points at.
  function selectRow(shotN, hasCall) {
    if (editMarker === 'call') { s.armCall(s.currentSeries, shotN); return; }
    if (hasCall) s.armActual(s.currentSeries, shotN);
  }

  const prevSeries = () => { if (s.currentSeries > 0) s.setCurrentSeries(s.currentSeries - 1); };
  const nextSeries = () => { const n = s.currentSeries + 1; s.ensureSeries(n); s.setCurrentSeries(n); };

  // Live stats for the current series.
  const called = shots.filter((sh) => sh.call).length;
  const scored = shots.filter((sh) => sh.actual);
  const seriesScore = scored.reduce((t, sh) => t + (sh.actual.score || 0), 0);
  const avg = scored.length ? (seriesScore / scored.length) : 0;
  const matches = shots.filter((sh) => sh.call && sh.actual && !sh.actual.miss
    && Math.hypot(sh.call.x - sh.actual.x, sh.call.y - sh.actual.y) <= 5).length;
  const callMatchPct = scored.length ? Math.round((matches / scored.length) * 100) : 0;

  const hint = s.armedActual ? 'Tap where the shot ACTUALLY landed'
    : s.armedCall ? 'Tap the new CALL position'
    : mode === 'actual' ? 'Tap a row, then tap where it landed'
    : 'Tap where you FELT each shot went';

  return (
    <div className="shotcapture">
      {/* LEFT — the target hero */}
      <div className="capture-hero">
        <div className="series-nav">
          <button className="secondary" onClick={prevSeries} disabled={s.currentSeries === 0} aria-label="Previous series">‹</button>
          <span>Series {s.currentSeries + 1} · {called}/10</span>
          <button className="secondary" onClick={nextSeries} aria-label="Next series">›</button>
        </div>
        <TargetCanvas shots={shots} onTap={onTap} armed={!!s.armedActual || !!s.armedCall} />
        <div className="capture-hint muted">{hint}</div>
      </div>

      {/* RIGHT — controls + string table */}
      <div className="capture-panel">
        <div className="capture-modes" role="tablist" aria-label="Capture pass">
          <button role="tab" aria-selected={mode === 'call'} className={mode === 'call' ? 'active' : ''}
            onClick={() => { setMode('call'); s.armActual(null); s.armCall(null); }}>Call</button>
          <button role="tab" aria-selected={mode === 'actual'} className={mode === 'actual' ? 'active' : ''}
            onClick={() => { setMode('actual'); }}>Mark actuals</button>
        </div>

        <div className="capture-stats">
          <div className="cstat"><span className="cstat-v">{seriesScore.toFixed(1)}</span><span className="cstat-l">Series</span></div>
          <div className="cstat"><span className="cstat-v">{avg.toFixed(1)}</span><span className="cstat-l">Avg</span></div>
          <div className="cstat"><span className="cstat-v">{callMatchPct}%</span><span className="cstat-l">Call-match</span></div>
        </div>

        <table className="string-table">
          <tbody>
            {Array.from({ length: 10 }, (_, i) => shots.find((sh) => sh.n === i + 1) || { n: i + 1 }).map((sh) => {
              const isArmed = armed && armed.shotN === sh.n;
              return (
                <tr key={sh.n} className={`string-row${isArmed ? ' armed' : ''}${sh.call ? '' : ' empty'}`}
                    onClick={() => sh.call && selectRow(sh.n, !!sh.call)}>
                  <td className="sr-n">{sh.n}</td>
                  <td className="sr-call">{fmtScore(sh.call)}</td>
                  <td className="sr-actual">{fmtScore(sh.actual)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Edit sub-toggle: which marker a tap moves once a row is selected. */}
        <div className="capture-edit">
          <span className="muted">Edit moves:</span>
          <button className={editMarker === 'call' ? 'active' : ''} onClick={() => setEditMarker('call')}>Call</button>
          <button className={editMarker === 'actual' ? 'active' : ''} onClick={() => setEditMarker('actual')}>Actual</button>
        </div>

        <div className="capture-actions">
          <button className="secondary" onClick={s.undoLast} disabled={!called}>Undo</button>
          {s.armedActual ? (
            <button className="secondary mark-miss" onClick={s.markMiss}>Mark as miss</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
