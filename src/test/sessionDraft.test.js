// src/test/sessionDraft.test.js — the in-progress capture draft (spec §0 rule #5 / §4.3).
// A capture must persist on every interaction so a reload never loses a series; the draft also
// carries session-start + first-shot timestamps that unblock the capture-latency metric (§8).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDraft, saveDraft, clearDraft } from '../lib/sessionDraft.js';

beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe('sessionDraft', () => {
  it('returns null when there is no draft', () => {
    expect(loadDraft()).toBeNull();
  });

  it('round-trips a draft synchronously (reload never loses data)', () => {
    const draft = {
      mode: 'live', focus: 'shot',
      series: [{ index: 0, shots: [{ n: 1, call: { x: 0, y: 0, score: 10.9, dir: 'C' }, actual: null }] }],
      currentSeries: 0, skillFocus: [], liveNotes: [], seconds: 12,
      startedAt: '2026-06-27T09:00:00.000Z', firstShotAt: '2026-06-27T09:00:05.000Z',
    };
    saveDraft(draft);
    const back = loadDraft();
    expect(back.series[0].shots[0].call.score).toBe(10.9);
    expect(back.startedAt).toBe('2026-06-27T09:00:00.000Z');
    expect(back.firstShotAt).toBe('2026-06-27T09:00:05.000Z');
    expect(back.seconds).toBe(12);
  });

  it('clears the draft', () => {
    saveDraft({ series: [], mode: 'dry', focus: 'shot' });
    expect(loadDraft()).not.toBeNull();
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('never throws on corrupt stored JSON (returns null)', () => {
    localStorage.setItem('jarvis-session-draft', '{ not json ');
    expect(loadDraft()).toBeNull();
  });
});
