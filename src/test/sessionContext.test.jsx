import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SessionProvider, useSession } from '../context/SessionContext.jsx';

const wrapper = ({ children }) => <SessionProvider>{children}</SessionProvider>;

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
});
