import { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../lib/api.js';
import TargetCanvas from '../components/TargetCanvas.jsx';
import SeriesPanel from '../components/SeriesPanel.jsx';
import SkillFocusTable from '../components/SkillFocusTable.jsx';
import SummaryModal from '../components/SummaryModal.jsx';

export default function ActiveSession() {
  const s = useSession();
  const [subtab, setSubtab] = useState(s.focus || 'shot'); // 'shot' | 'skill'
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const shots = s.series[s.currentSeries]?.shots || [];

  useEffect(() => {
    if (s.finishRequested) {
      setShowSummary(true);
      s.setFinishRequested(false);
    }
  }, [s.finishRequested, s]);

  useEffect(() => {
    if (s.focus) {
      setSubtab(s.focus);
    }
  }, [s.focus]);

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
        manual_shots: Number(manualShots) || 0
      });
      setShowSummary(false);
      s.reset();
      setMsg('Session saved.');
    } catch (e) {
      setMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="subtabs">
        <button className={subtab === 'shot' ? 'active' : ''} onClick={() => setSubtab('shot')}>Shot Calling</button>
        <button className={subtab === 'skill' ? 'active' : ''} onClick={() => setSubtab('skill')}>Skill Focus</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowSummary(true)}>Finish Session</button>
      </div>
      {msg && <p className="muted">{msg}</p>}

      {/* Both subtabs stay mounted; we only hide to preserve state. */}
      <div style={{ display: subtab === 'shot' ? 'block' : 'none' }}>
        <div className="shotcall">
          <div className="target-wrap">
            <div className="series-nav">
              <button className="secondary" onClick={prevSeries} disabled={s.currentSeries === 0}>←</button>
              <span>Series {s.currentSeries + 1} · {shots.length}/10
                {s.armedActual ? ' · placing ACTUAL' : ''}</span>
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

      {showSummary && (
        <SummaryModal
          session={{ series: s.series, skillFocus: s.skillFocus }}
          activeTab={subtab}
          onClose={() => setShowSummary(false)}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
  );
}
