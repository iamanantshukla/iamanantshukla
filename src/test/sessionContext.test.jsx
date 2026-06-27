import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SessionProvider, useSession } from '../context/SessionContext.jsx';
import { loadDraft } from '../lib/sessionDraft.js';

const wrapper = ({ children }) => <SessionProvider>{children}</SessionProvider>;

beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe('SessionContext', () => {
  it('logs calls and arms actuals', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.logCall({ x: 0, y: 0 }));
    expect(result.current.series[0].shots).toHaveLength(1);
    expect(result.current.series[0].shots[0].call.score).toBeGreaterThanOrEqual(10.8);

    act(() => result.current.armActual(0, 1));
    expect(result.current.armedActual).toEqual({ seriesIndex: 0, shotN: 1 });

    act(() => result.current.logActual({ x: 200, y: 0 }));
    expect(result.current.series[0].shots[0].actual.score).toBe(0);
    expect(result.current.armedActual).toBeNull();
  });

  it('caps a series at 10 calls', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => { for (let i = 0; i < 12; i++) result.current.logCall({ x: 0, y: 0 }); });
    expect(result.current.series[0].shots).toHaveLength(10);
  });

  it('accumulates live notes during a session and clears on reset', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.addLiveNote('pulled left on shot 7'));
    expect(result.current.liveNotes.map(n => n.text)).toContain('pulled left on shot 7');
    act(() => result.current.reset());
    expect(result.current.liveNotes).toEqual([]);
  });

  it('tags live notes with the current series', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.ensureSeries(1));
    act(() => result.current.setCurrentSeries(1));
    act(() => result.current.addLiveNote('reset after a wide shot'));
    const note = result.current.liveNotes[0];
    expect(note.text).toBe('reset after a wide shot');
    expect(note.series).toBe(2); // currentSeries 1 -> displayed Series 2
    expect(typeof note.t).toBe('number');
  });

  it('starts a live-match session as live fire with focus=match', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.startSession('dry', 'match'));
    expect(result.current.focus).toBe('match');
    expect(result.current.mode).toBe('live'); // match always implies live fire
    expect(result.current.sessionActive).toBe(true);
  });

  it('persists a draft on every capture interaction (reload-safe)', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.startSession('live', 'shot'));
    act(() => result.current.logCall({ x: 0, y: 0 }));
    const draft = loadDraft();
    expect(draft).not.toBeNull();
    expect(draft.sessionActive).toBe(true);
    expect(draft.series[0].shots).toHaveLength(1);
    // a session-start + first-shot timestamp are captured for the capture-latency metric (§8)
    expect(typeof draft.startedAt).toBe('string');
    expect(typeof draft.firstShotAt).toBe('string');
  });

  it('rehydrates an in-progress draft on mount so a reload restores the session', () => {
    // First provider: start a session and place a shot, then unmount.
    const first = renderHook(() => useSession(), { wrapper });
    act(() => first.result.current.startSession('live', 'shot'));
    act(() => first.result.current.logCall({ x: 0, y: 0 }));
    first.unmount();
    // A fresh provider (simulating a reload) must come up already active with the shot restored.
    const second = renderHook(() => useSession(), { wrapper });
    expect(second.result.current.sessionActive).toBe(true);
    expect(second.result.current.series[0].shots).toHaveLength(1);
  });

  it('clears the draft on reset so a new session never rehydrates a stale one', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.startSession('live', 'shot'));
    act(() => result.current.logCall({ x: 0, y: 0 }));
    expect(loadDraft()).not.toBeNull();
    act(() => result.current.reset());
    expect(loadDraft()).toBeNull();
  });

  it('undo removes the last call in the current series', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.startSession('live', 'shot'));
    act(() => result.current.logCall({ x: 0, y: 0 }));
    act(() => result.current.logCall({ x: 5, y: 5 }));
    expect(result.current.series[0].shots).toHaveLength(2);
    act(() => result.current.undoLast());
    expect(result.current.series[0].shots).toHaveLength(1);
    // and again down to empty, then a no-op
    act(() => result.current.undoLast());
    expect(result.current.series[0].shots).toHaveLength(0);
    act(() => result.current.undoLast());
    expect(result.current.series[0].shots).toHaveLength(0);
  });

  it('editShot moves a specific shot\'s call marker and recomputes its score', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.startSession('live', 'shot'));
    act(() => result.current.logCall({ x: 50, y: 0 })); // a low-ish call
    const before = result.current.series[0].shots[0].call.score;
    act(() => result.current.editShot(0, 1, 'call', { x: 0, y: 0 })); // move it to centre
    const after = result.current.series[0].shots[0].call.score;
    expect(after).toBeGreaterThan(before);
    expect(after).toBe(10.9);
  });

  it('markMiss sets the armed shot\'s actual to a coordinate-less scored-zero miss', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.startSession('live', 'shot'));
    act(() => result.current.logCall({ x: 0, y: 0 }));
    act(() => result.current.armActual(0, 1));
    act(() => result.current.markMiss());
    const shot = result.current.series[0].shots[0];
    expect(shot.actual).toEqual({ miss: true });
    expect(result.current.armedActual).toBeNull();
  });
});
