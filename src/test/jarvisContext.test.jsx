// src/test/jarvisContext.test.jsx — the no-flash regression (spec E goal #5 / §8).
// Seed the synchronous singleton cache, mount the provider, and assert the cached line is the FIRST
// text rendered (never FALLBACK_VOICE), and that a same-value background refresh causes no swap.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { writeCachedSingleton } from '../lib/singletonCache.js';
import { FALLBACK_VOICE } from '../lib/pebbleVoice.js';

// Control the background refresh deterministically.
const getSingleton = vi.fn();
const getJournal = vi.fn();
vi.mock('../lib/api.js', () => ({
  api: {
    getSingleton: (...a) => getSingleton(...a),
    getJournal: (...a) => getJournal(...a),
  },
}));

import { JarvisProvider, useJarvis, pickExpression, freshnessStamp } from '../context/JarvisContext.jsx';
import { fallbackTip } from '../lib/tipPool.js';

function Probe() {
  const j = useJarvis();
  return <div data-testid="line">{j.line}</div>;
}

function TipProbe() {
  const j = useJarvis();
  return <div data-testid="tip">{j.tip ? `${j.tip.theme}:${j.tip.id}` : 'none'}</div>;
}

function ExprProbe() {
  const j = useJarvis();
  return <div data-testid="expr">{j.expression}</div>;
}

beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
  getSingleton.mockReset();
  getJournal.mockReset();
  getJournal.mockResolvedValue(null);
});
afterEach(() => { vi.clearAllMocks(); });

describe('JarvisContext no-flash', () => {
  it('renders the cached line on the FIRST paint (never the fallback flash)', async () => {
    writeCachedSingleton('pebble', { text: 'Cached: nice grip work.', mental_scenarios: [] });
    // Background refresh returns the SAME content -> no swap expected.
    getSingleton.mockImplementation(async (name) =>
      name === 'pebble' ? { text: 'Cached: nice grip work.', mental_scenarios: [] } : null,
    );

    const { getByTestId } = render(<JarvisProvider><Probe /></JarvisProvider>);
    // The very first rendered text is the cached value, NOT the fallback.
    const firstText = getByTestId('line').textContent;
    expect(firstText).toBe('Cached: nice grip work.');
    expect(firstText).not.toBe(FALLBACK_VOICE);
    // Let the same-value background refresh resolve; the line must NOT swap.
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(getByTestId('line').textContent).toBe('Cached: nice grip work.');
  });

  it('swaps exactly once when the background fetch returns a CHANGED line', async () => {
    writeCachedSingleton('pebble', { text: 'Old line.', mental_scenarios: [] });
    getSingleton.mockImplementation(async (name) =>
      name === 'pebble' ? { text: 'New line from Drive.', mental_scenarios: [] } : null,
    );

    const { getByTestId } = render(<JarvisProvider><Probe /></JarvisProvider>);
    // First paint shows the cached value.
    expect(getByTestId('line').textContent).toBe('Old line.');
    // After the background refresh resolves, it swaps to the new line.
    await waitFor(() => expect(getByTestId('line').textContent).toBe('New line from Drive.'));
  });

  it('falls back to FALLBACK_VOICE once when there is no cache and no remote value', async () => {
    getSingleton.mockResolvedValue(null);
    const { getByTestId } = render(<JarvisProvider><Probe /></JarvisProvider>);
    expect(getByTestId('line').textContent).toBe(FALLBACK_VOICE);
    // Give the (null-returning) refresh a tick; the line must remain the fallback, no swap.
    await act(async () => { await Promise.resolve(); });
    expect(getByTestId('line').textContent).toBe(FALLBACK_VOICE);
  });

  it('pickExpression is deterministic and state-derived', () => {
    expect(pickExpression({ readinessBand: 'red' })).toBe('focused');
    expect(pickExpression({ readinessBand: 'amber' })).toBe('focused');
    expect(pickExpression({ missionComplete: true })).toBe('proud');
    expect(pickExpression({ isRestDay: true })).toBe('resting');
    expect(pickExpression({ mood: 'low' })).toBe('sad');
    expect(pickExpression({})).toBe('neutral');
  });

  it('pickExpression covers the full §2 expression-state map', () => {
    // sleepy: poor-sleep concern or "down" mood (concern outranks a green band)
    expect(pickExpression({ mood: 'down' })).toBe('sleepy');
    expect(pickExpression({ concern: 'sleep', readinessBand: 'green' })).toBe('sleepy');
    // sad: genuine concern flag (non-sleep) or "low" mood
    expect(pickExpression({ concern: 'recovery' })).toBe('sad');
    // happy: good/great mood on an otherwise-quiet day
    expect(pickExpression({ mood: 'good' })).toBe('happy');
    expect(pickExpression({ mood: 'great' })).toBe('happy');
    // proud beats a happy mood (earned > self-reported) but never fires on score alone
    expect(pickExpression({ mood: 'good', missionComplete: true })).toBe('proud');
    // a low mood is a stronger signal than a focused band
    expect(pickExpression({ mood: 'low', readinessBand: 'amber' })).toBe('sad');
  });

  it('freshnessStamp renders a human "X ago" and never throws', () => {
    const now = Date.parse('2026-06-26T12:00:00.000Z');
    expect(freshnessStamp('2026-06-26T06:00:00.000Z', now)).toBe('6h ago');
    expect(freshnessStamp(null)).toBeNull();
    expect(freshnessStamp('not-a-date')).toBeNull();
  });
});

describe('JarvisContext live expression wiring (§2)', () => {
  it("reflects today's journal mood in the global Pebble expression", async () => {
    writeCachedSingleton('pebble', { text: 'x', mental_scenarios: [] });
    getSingleton.mockResolvedValue(null);
    getJournal.mockResolvedValue({ mood: 'great' });

    const { getByTestId } = render(<JarvisProvider><ExprProbe /></JarvisProvider>);
    await waitFor(() => expect(getByTestId('expr').textContent).toBe('happy'));
  });

  it('fires the proud expression on the score-blind today.completed flag', async () => {
    writeCachedSingleton('pebble', { text: 'x', mental_scenarios: [] });
    writeCachedSingleton('today', { readinessBand: 'green', completed: true });
    getSingleton.mockImplementation(async (name) =>
      name === 'today' ? { readinessBand: 'green', completed: true } : null,
    );
    getJournal.mockResolvedValue(null);

    const { getByTestId } = render(<JarvisProvider><ExprProbe /></JarvisProvider>);
    await waitFor(() => expect(getByTestId('expr').textContent).toBe('proud'));
  });

  it('maps the agent concern flag to the sad/sleepy expression', async () => {
    writeCachedSingleton('pebble', { text: 'x', mental_scenarios: [] });
    writeCachedSingleton('today', { readinessBand: 'amber', concern: 'sleep' });
    getSingleton.mockImplementation(async (name) =>
      name === 'today' ? { readinessBand: 'amber', concern: 'sleep' } : null,
    );
    getJournal.mockResolvedValue(null);

    const { getByTestId } = render(<JarvisProvider><ExprProbe /></JarvisProvider>);
    await waitFor(() => expect(getByTestId('expr').textContent).toBe('sleepy'));
  });
});

describe('Tip of the Day', () => {
  it('uses the agent-written pebble.daily_tip when present', async () => {
    writeCachedSingleton('pebble', {
      text: 'x', mental_scenarios: [],
      daily_tip: { id: 'umpire-the-shot', theme: 'letting-go-of-judgment', text: 'Describe, do not judge.', day_in_block: 3, block_length: 6 },
    });
    getSingleton.mockResolvedValue(null);
    const { getByTestId } = render(<JarvisProvider><TipProbe /></JarvisProvider>);
    expect(getByTestId('tip').textContent).toBe('letting-go-of-judgment:umpire-the-shot');
  });

  it('falls back to the static theme-block tip when no daily_tip exists', async () => {
    writeCachedSingleton('pebble', { text: 'x', mental_scenarios: [] }); // no daily_tip
    getSingleton.mockResolvedValue(null);
    const { getByTestId } = render(<JarvisProvider><TipProbe /></JarvisProvider>);
    const shown = getByTestId('tip').textContent;
    expect(shown).not.toBe('none');
    // it is a real fallback practice (theme:id shape)
    expect(shown).toMatch(/^[a-z-]+:[a-z0-9-]+$/);
  });

  it('fallbackTip holds one theme across a 6-day block (no daily topic jump)', () => {
    // Two consecutive days inside the same block must share the theme.
    const d1 = new Date('2026-01-01T00:00:00Z'); // doy 1
    const d2 = new Date('2026-01-02T00:00:00Z'); // doy 2 (same block of 6)
    const t1 = fallbackTip(d1);
    const t2 = fallbackTip(d2);
    expect(t1.theme).toBe(t2.theme);            // same theme held
    expect(t2.day_in_block).toBe(t1.day_in_block + 1); // advances within the block
  });
});
