import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { scoreFromMm } from '../lib/scoring.js';

const SessionCtx = createContext(null);
export const useSession = () => useContext(SessionCtx);

const emptySeries = (index) => ({ index, shots: [] });

export function SessionProvider({ children }) {
  const [mode, setMode] = useState('dry');
  const [focus, setFocus] = useState('shot'); // 'shot' | 'skill'
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [series, setSeries] = useState([emptySeries(0)]);
  const [currentSeries, setCurrentSeries] = useState(0);
  const [armedActual, setArmedActual] = useState(null);
  const [skillFocus, setSkillFocus] = useState([]); // [{skillId,name,cells:[]}]
  const [finishRequested, setFinishRequested] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (running) {
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(timer.current);
    }
  }, [running]);

  const play = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const stop = useCallback(() => { setRunning(false); setFinishRequested(true); }, []);

  // Add a CALL shot at mm-coords to the current series (max 10 -> ignored).
  const logCall = useCallback((mm) => {
    setSeries((prev) => {
      const copy = prev.map((s) => ({ ...s, shots: [...s.shots] }));
      const cur = copy[currentSeries];
      if (cur.shots.length >= 10) return prev; // full; UI should page first
      const n = cur.shots.length + 1;
      const { score, dir } = scoreFromMm(mm);
      cur.shots.push({ n, call: { ...mm, score, dir }, actual: null });
      return copy;
    });
  }, [currentSeries]);

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
  }, [armedActual]);

  const armActual = useCallback((seriesIndex, shotN) => setArmedActual({ seriesIndex, shotN }), []);

  const ensureSeries = useCallback((index) => {
    setSeries((prev) => (prev[index] ? prev : [...prev, emptySeries(index)]));
  }, []);

  const reset = useCallback(() => {
    setSeries([emptySeries(0)]); setCurrentSeries(0); setArmedActual(null);
    setSkillFocus([]); setSeconds(0); setRunning(false); setFinishRequested(false);
  }, []);

  const value = {
    mode, setMode, focus, setFocus, seconds, running, play, pause, stop,
    series, currentSeries, setCurrentSeries, ensureSeries,
    armedActual, armActual, logCall, logActual,
    skillFocus, setSkillFocus, reset,
    finishRequested, setFinishRequested,
  };
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
