import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { scoreFromMm } from '../lib/scoring.js';
import { loadDraft, saveDraft, clearDraft } from '../lib/sessionDraft.js';

const SessionCtx = createContext(null);
export const useSession = () => useContext(SessionCtx);

const emptySeries = (index) => ({ index, shots: [] });
const nowIso = () => new Date().toISOString();

export function SessionProvider({ children }) {
  // Read any persisted in-progress capture ONCE per mount, synchronously, so a reload rehydrates the
  // session on the first paint instead of bouncing to /shoot and losing the series (spec §0 rule #5).
  // Read per-mount (not at module load) so a remount genuinely re-reads what's on disk.
  const [draft0] = useState(loadDraft);
  const [mode, setMode] = useState(() => (draft0 && draft0.mode) || 'dry');
  const [focus, setFocus] = useState(() => (draft0 && draft0.focus) || 'shot'); // 'shot' | 'skill' | 'match'
  const [seconds, setSeconds] = useState(() => (draft0 && draft0.seconds) || 0);
  const [running, setRunning] = useState(false);
  const [series, setSeries] = useState(() => (draft0 && draft0.series) || [emptySeries(0)]);
  const [currentSeries, setCurrentSeries] = useState(() => (draft0 && draft0.currentSeries) || 0);
  const [armedActual, setArmedActual] = useState(null);
  const [armedCall, setArmedCall] = useState(null); // edit-a-shot: a tap moves THIS shot's call
  const [skillFocus, setSkillFocus] = useState(() => (draft0 && draft0.skillFocus) || []); // [{skillId,name,cells:[]}]
  const [finishRequested, setFinishRequested] = useState(false);
  const [liveNotes, setLiveNotes] = useState(() => (draft0 && draft0.liveNotes) || []);
  const [sessionActive, setSessionActive] = useState(() => !!(draft0 && draft0.sessionActive)); // full-screen activity mode
  const [sessionMeta, setSessionMeta] = useState(() => (draft0 && draft0.sessionMeta) || null); // {label,durationMin} for offline/brief
  // Capture-latency timestamps (§8): when the session started, and when the first shot was placed.
  const startedAt = useRef((draft0 && draft0.startedAt) || null);
  const firstShotAt = useRef((draft0 && draft0.firstShotAt) || null);
  const timer = useRef(null);

  const [id, setId] = useState(() => (draft0 && draft0.id) || null);

  useEffect(() => {
    if (running) {
      let lastTick = Date.now();
      timer.current = setInterval(() => {
        const now = Date.now();
        const delta = Math.round((now - lastTick) / 1000);
        if (delta >= 1) {
          setSeconds((s) => s + delta);
          lastTick += delta * 1000;
        }
      }, 1000);
      return () => clearInterval(timer.current);
    }
  }, [running]);

  // Draft-on-every-write: persist the live capture whenever any captured field changes, so a reload
  // never loses data. Only while a session is active (a reset writes the cleared state, then the
  // sessionActive flag drops and we stop mirroring). Timestamps live in refs, read at save time.
  useEffect(() => {
    if (!sessionActive) return;
    saveDraft({
      id, mode, focus, seconds, series, currentSeries, skillFocus, liveNotes, sessionActive, sessionMeta,
      startedAt: startedAt.current, firstShotAt: firstShotAt.current,
    });
  }, [id, mode, focus, seconds, series, currentSeries, skillFocus, liveNotes, sessionActive, sessionMeta]);

  // Stamp the first-shot time the first time a shot is recorded (drives the tap->first-shot metric).
  const markFirstShot = useCallback(() => { if (!firstShotAt.current) firstShotAt.current = nowIso(); }, []);

  const play = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const stop = useCallback(() => { setRunning(false); setFinishRequested(true); }, []);

  // Begin a fresh full-screen session with the chosen mode/focus.
  // focus 'match' is a live competition string: timer + notes only (no target/skill grid),
  //   and always implies live fire.
  // focus 'offline' is a timed physical block (e.g. wall holding): timer + notes only, like a mental
  //   session but for physical work. Optional `meta` ({ label, durationMin }) is kept for the header.
  const startSession = useCallback((nextMode = 'dry', nextFocus = 'shot', meta = null) => {
    setId(null);
    setSeries([emptySeries(0)]); setCurrentSeries(0); setArmedActual(null); setArmedCall(null);
    // Seed suggested skills (skill-focus) as pending rows — resolved against the catalogue at render
    // (non-restrictive: a skill not in the catalogue is still listed, the user can add it). Each row
    // carries the suggested name; skillId is null until matched/added.
    const seedSkills = (meta && Array.isArray(meta.skills) ? meta.skills : [])
      .map((name) => ({ skillId: null, name, suggested: true, cells: Array(10).fill('') }));
    setSkillFocus(seedSkills);
    setLiveNotes([]); setSeconds(0); setFinishRequested(false);
    // match -> live; offline -> its own mode so the UI renders the timer-only surface.
    setMode(nextFocus === 'match' ? 'live' : nextFocus === 'offline' ? 'offline' : nextMode);
    setFocus(nextFocus);
    setSessionMeta(meta);
    startedAt.current = nowIso(); firstShotAt.current = null;
    setSessionActive(true); setRunning(true);
  }, []);

  // Add a CALL shot at mm-coords to the current series (max 10 -> ignored).
  const logCall = useCallback((mm) => {
    setSeries((prev) => {
      const copy = prev.map((s) => ({ ...s, shots: [...s.shots] }));
      const cur = copy[currentSeries];
      if (cur.shots.length >= 10) return prev; // full; UI should page first
      const n = cur.shots.length + 1;
      const { score, dir } = scoreFromMm(mm);
      cur.shots.push({ n, call: { ...mm, score, dir }, actual: null });
      markFirstShot(); // stamp inside the updater, where we KNOW a shot was added
      return copy;
    });
  }, [currentSeries, markFirstShot]);

  // Place an ACTUAL on the armed shot.
  const logActual = useCallback((mm) => {
    if (!armedActual) return;
    setSeries((prev) => {
      const copy = prev.map((s) => ({ ...s, shots: s.shots.map((sh) => ({ ...sh })) }));
      const s = copy[armedActual.seriesIndex];
      const shot = s?.shots.find((sh) => sh.n === armedActual.shotN);
      if (shot) {
        const { score, dir } = scoreFromMm(mm);
        shot.actual = { ...mm, score, dir };
      }
      return copy;
    });
    setArmedActual(null);
    markFirstShot();
  }, [armedActual, markFirstShot]);

  // Arm a shot's ACTUAL for placement; call with null (or no args) to DISARM.
  const armActual = useCallback((seriesIndex, shotN) => {
    setArmedActual(seriesIndex == null ? null : { seriesIndex, shotN });
    if (seriesIndex != null) setArmedCall(null); // only one marker armed at a time
  }, []);

  // Undo the LAST call in the current series (accidental tap). No-op on an empty series.
  const undoLast = useCallback(() => {
    setSeries((prev) => {
      const copy = prev.map((s) => ({ ...s, shots: [...s.shots] }));
      const cur = copy[currentSeries];
      if (!cur || cur.shots.length === 0) return prev;
      cur.shots.pop();
      return copy;
    });
  }, [currentSeries]);

  // Move a specific shot's CALL or ACTUAL marker to a new mm position, recomputing its score/dir.
  // Used by edit-a-shot: select a row, pick which marker the next target tap moves.
  const editShot = useCallback((seriesIndex, shotN, kind, mm) => {
    if (kind !== 'call' && kind !== 'actual') return;
    setSeries((prev) => {
      const copy = prev.map((s) => ({ ...s, shots: s.shots.map((sh) => ({ ...sh })) }));
      const shot = copy[seriesIndex]?.shots.find((sh) => sh.n === shotN);
      if (shot) {
        const { score, dir } = scoreFromMm(mm);
        shot[kind] = { ...mm, score, dir };
      }
      return copy;
    });
  }, []);

  // Mark the armed shot's ACTUAL as a coordinate-less miss (the shot left the paper). The shared
  // recompute preserves it as a scored-zero result (driveModel.recomputeSeries).
  const markMiss = useCallback(() => {
    if (!armedActual) return;
    setSeries((prev) => {
      const copy = prev.map((s) => ({ ...s, shots: s.shots.map((sh) => ({ ...sh })) }));
      const shot = copy[armedActual.seriesIndex]?.shots.find((sh) => sh.n === armedActual.shotN);
      if (shot) shot.actual = { miss: true };
      return copy;
    });
    setArmedActual(null);
  }, [armedActual]);

  // Arm a shot's CALL for editing; call with null (or no args) to DISARM.
  const armCall = useCallback((seriesIndex, shotN) => {
    setArmedCall(seriesIndex == null ? null : { seriesIndex, shotN });
    if (seriesIndex != null) setArmedActual(null);
  }, []);

  // Capture an in-the-moment note tagged with elapsed time and the current series, so the
  // saved notes read as a timeline of how the mind moved through the series/shots/string.
  const addLiveNote = useCallback((text) => {
    if (!text || !text.trim()) return;
    setLiveNotes((prev) => [...prev, { t: seconds, series: currentSeries + 1, text: text.trim() }]);
  }, [seconds, currentSeries]);

  const ensureSeries = useCallback((index) => {
    setSeries((prev) => (prev[index] ? prev : [...prev, emptySeries(index)]));
  }, []);

  const reset = useCallback(() => {
    setId(null);
    setSeries([emptySeries(0)]); setCurrentSeries(0); setArmedActual(null); setArmedCall(null);
    setSkillFocus([]); setSeconds(0); setRunning(false); setFinishRequested(false);
    setLiveNotes([]); setSessionActive(false); setSessionMeta(null);
    startedAt.current = null; firstShotAt.current = null;
    clearDraft(); // a fresh session must never rehydrate the just-finished one
  }, []);

  const value = {
    id, mode, setMode, focus, setFocus, seconds, running, play, pause, stop,
    series, currentSeries, setCurrentSeries, ensureSeries,
    armedActual, armActual, logCall, logActual,
    // edit-a-shot + call→actuals flow primitives (§4.3)
    armedCall, armCall, undoLast, editShot, markMiss,
    skillFocus, setSkillFocus, reset,
    finishRequested, setFinishRequested,
    liveNotes, addLiveNote,
    sessionActive, startSession, sessionMeta,
    // Capture-latency timestamps (§8); the save path forwards these to the Drive session payload.
    getStartedAt: () => startedAt.current,
    getFirstShotAt: () => firstShotAt.current,
  };
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
