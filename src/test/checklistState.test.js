// src/test/checklistState.test.js — client-owned checklist tick state (spec §6).
// The agent owns the checklist ITEMS (today.checklist[]); the CLIENT owns which are ticked. Tick
// state is per-day (keyed by date) and durable across reloads, synchronous for no-flash first paint.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTicks, toggleTick, isTicked } from '../lib/checklistState.js';

beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe('checklistState', () => {
  it('starts empty for a date', () => {
    expect(loadTicks('2026-06-27')).toEqual({});
    expect(isTicked('2026-06-27', 'dryfire')).toBe(false);
  });

  it('toggles an item ticked, then unticked, persisting across reads', () => {
    toggleTick('2026-06-27', 'dryfire');
    expect(isTicked('2026-06-27', 'dryfire')).toBe(true);
    toggleTick('2026-06-27', 'dryfire');
    expect(isTicked('2026-06-27', 'dryfire')).toBe(false);
  });

  it('keeps tick state separate per day', () => {
    toggleTick('2026-06-27', 'mobility');
    expect(isTicked('2026-06-27', 'mobility')).toBe(true);
    expect(isTicked('2026-06-28', 'mobility')).toBe(false);
  });

  it('never throws on corrupt stored JSON (treats as empty)', () => {
    localStorage.setItem('jarvis.checklist.2026-06-27', '{ not json');
    expect(loadTicks('2026-06-27')).toEqual({});
  });
});
