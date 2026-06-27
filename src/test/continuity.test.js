// src/test/continuity.test.js — the forgiving continuity thread + never-miss-twice (spec §5).
// Client-computed (never agent-owned): count = consecutive ENGAGED days (journal OR session OR gym)
// or prescribed-rest (rest auto-counts). ONE missed non-rest day holds "amber, not broken" (count
// kept, state 'amber'); a SECOND consecutive missed non-rest day resets the run.
import { describe, it, expect } from 'vitest';
import { computeContinuity } from '../lib/continuity.js';

// engaged set: 'YYYY-MM-DD' strings the athlete logged something on.
// restDays set: days the agent marked as prescribed rest (auto-count).
const days = (...d) => new Set(d);

describe('computeContinuity', () => {
  it('counts consecutive engaged days up to and including today', () => {
    const r = computeContinuity({
      today: '2026-06-27',
      engaged: days('2026-06-25', '2026-06-26', '2026-06-27'),
      restDays: days(),
    });
    expect(r.count).toBe(3);
    expect(r.state).toBe('active');
    expect(r.broken).toBe(false);
  });

  it('auto-counts a prescribed rest day inside the run', () => {
    const r = computeContinuity({
      today: '2026-06-27',
      engaged: days('2026-06-25', '2026-06-27'), // 26th not engaged...
      restDays: days('2026-06-26'),              // ...but it was prescribed rest
    });
    expect(r.count).toBe(3);
    expect(r.state).toBe('active');
  });

  it('holds "amber, not broken" after ONE missed non-rest day (count kept)', () => {
    // Today (27th) not engaged and not rest; the run up to the 26th still stands.
    const r = computeContinuity({
      today: '2026-06-27',
      engaged: days('2026-06-24', '2026-06-25', '2026-06-26'),
      restDays: days(),
    });
    expect(r.state).toBe('amber');
    expect(r.broken).toBe(false);
    expect(r.count).toBe(3); // not reset on the first miss
  });

  it('resets the run after a SECOND consecutive missed non-rest day', () => {
    // Both the 26th and 27th missed (and not rest) -> never-miss-twice transition fires.
    const r = computeContinuity({
      today: '2026-06-27',
      engaged: days('2026-06-23', '2026-06-24', '2026-06-25'),
      restDays: days(),
    });
    expect(r.state).toBe('broken');
    expect(r.broken).toBe(true);
    expect(r.count).toBe(0);
  });

  it('a fresh user with no history is a calm zero, never a flashing reset', () => {
    const r = computeContinuity({ today: '2026-06-27', engaged: days(), restDays: days() });
    expect(r.count).toBe(0);
    expect(r.state).toBe('amber'); // one day "off the line", not broken
    expect(r.broken).toBe(false);
  });

  it('counts today when engaged even with no prior history', () => {
    const r = computeContinuity({ today: '2026-06-27', engaged: days('2026-06-27'), restDays: days() });
    expect(r.count).toBe(1);
    expect(r.state).toBe('active');
  });
});
