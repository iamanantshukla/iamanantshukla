// client/src/test/api.drive.test.js — the Drive-first facade (lib/api.js) over fakes.
//
// Uses the createApi factory with a fake driveClient (an in-memory folder of JSON files) plus the
// shared in-memory cache/outbox storage. Asserts the seam contracts from specs A + C:
//   - saveSession enqueues durably, persists through the outbox, and is readable back;
//   - offline (driveClient throws) keeps the write queued and loses nothing; it drains on recovery;
//   - triggerDailyReview / triggerWeeklyReview write a pending MARKER (not an agent call);
//   - getStats aggregates day/week/month from the sharded data.

import { describe, it, expect, beforeEach } from 'vitest';
import { createApi } from '../lib/api.js';
import { inMemoryCache } from '../lib/idbCache.js';
import { setAccessToken } from '../lib/auth.js';

// A fake Drive client: an in-memory folder { id -> { name, content } }. Mirrors the interface
// createDriveStore expects. `failing` flag makes every call throw (simulates offline / dead token).
function fakeDriveClient() {
  let auto = 1;
  const files = new Map(); // id -> { name, json, etag }
  const state = { failing: false, calls: 0 };

  function guard() {
    state.calls += 1;
    if (state.failing) {
      const err = new Error('network down');
      err.status = 0;
      throw err;
    }
  }

  return {
    _state: state,
    _files: files,
    async listFolder() {
      guard();
      return [...files.entries()].map(([id, f]) => ({ id, name: f.name }));
    },
    async readFile(id) {
      guard();
      const f = files.get(id);
      return f ? { json: f.json, etag: f.etag } : null;
    },
    async createFile(_folderId, name, json) {
      guard();
      const id = `f${auto++}`;
      files.set(id, { name, json, etag: `e${auto}` });
      return { id, etag: `e${auto}` };
    },
    async updateFile(id, json) {
      guard();
      const f = files.get(id);
      const etag = `e${auto++}`;
      files.set(id, { name: f ? f.name : id, json, etag });
      return { id, etag };
    },
  };
}

function buildApi(drive) {
  return createApi({
    driveClient: drive,
    cache: inMemoryCache(),
    outboxStorage: memoryStorage(),
    authManager: null, // exercise the no-auth path directly (token handling is unit-tested in shared)
    folderId: 'TEST_FOLDER',
    now: () => '2026-06-15T08:00:00.000Z',
  });
}

function memoryStorage() {
  const store = new Map();
  return {
    async getAll() { return [...store.values()]; },
    async put(item) { store.set(item.seq, item); },
    async delete(seq) { store.delete(seq); },
  };
}

beforeEach(() => {
  setAccessToken('test-token');
});

describe('Drive-first api facade', () => {
  it('saveSession enqueues, persists, and is readable', async () => {
    const drive = fakeDriveClient();
    const api = buildApi(drive);

    const saved = await api.saveSession({
      mode: 'live',
      focus: 'shot',
      duration_seconds: 1800,
      manual_shots: 40,
      comments: 'good group',
      date: '2026-06-15T07:30:00.000Z',
      reflection: { confidence: 4, went_well: 'follow-through' },
      live_notes: [{ t: 83, series: 1, text: 'pulled left' }],
    });

    // returned record has an id and a view-compat started_at
    expect(saved.id).toBeTruthy();
    expect(saved.started_at).toBe('2026-06-15T07:30:00.000Z');
    // outbox drained (online) -> nothing left queued
    expect(await api._pending()).toHaveLength(0);

    // readable back through the store, full payload preserved (goal #8)
    const list = await api.listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].comments).toBe('good group');
    expect(list[0].reflection.went_well).toBe('follow-through');
    expect(list[0].live_notes[0].text).toBe('pulled left');

    const one = await api.getSession(saved.id);
    expect(one.total_shots).toBe(40);
  });

  it('offline keeps the write queued and loses nothing; drains on recovery', async () => {
    const drive = fakeDriveClient();
    const api = buildApi(drive);
    drive._state.failing = true;

    const saved = await api.saveSession({
      mode: 'live',
      duration_seconds: 600,
      manual_shots: 10,
      date: '2026-06-15T09:00:00.000Z',
    });
    expect(saved.id).toBeTruthy();

    // The write is safe in the outbox, not lost, even though every Drive call threw.
    const pending = await api._pending();
    expect(pending).toHaveLength(1);
    expect(pending[0].entity).toBe('sessions');

    // Recover: Drive comes back, drain flushes the queue, the session lands exactly once.
    drive._state.failing = false;
    const result = await api._drain();
    expect(result.drained).toBe(1);
    expect(await api._pending()).toHaveLength(0);

    const list = await api.listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(saved.id);

    // Idempotent: draining again (or a duplicate enqueue) does not create a second record.
    await api._drain();
    expect((await api.listSessions())).toHaveLength(1);
  });

  it('exposes the sync surface: pendingCount, drainNow, and file export/import round-trip', async () => {
    const drive = fakeDriveClient();
    const api = buildApi(drive);
    drive._state.failing = true; // offline

    await api.saveSession({ mode: 'live', manual_shots: 10, date: '2026-06-15T09:00:00.000Z' });
    expect(await api.pendingCount()).toBe(1);

    // Export the queue to a local-file-shaped payload (the "save locally" fallback).
    const exported = await api.exportOutbox();
    expect(exported).toHaveLength(1);
    expect(exported[0].entity).toBe('sessions');

    // drainNow while offline is non-throwing and leaves the item queued.
    await api.drainNow();
    expect(await api.pendingCount()).toBe(1);

    // Recover, drain, synced.
    drive._state.failing = false;
    await api.drainNow();
    expect(await api.pendingCount()).toBe(0);
    expect(await api.listSessions()).toHaveLength(1);

    // Re-importing the earlier export is idempotent (dedupeKey) — no duplicate record.
    const n = await api.importOutbox(exported);
    expect(n).toBe(1);
    expect(await api.listSessions()).toHaveLength(1);
  });

  it('triggerDailyReview writes a pending marker (no agent call)', async () => {
    const drive = fakeDriveClient();
    const api = buildApi(drive);

    const res = await api.triggerDailyReview('2026-06-15');
    expect(res.status).toBe('pending');

    // The marker is a journal record with ai_review_status pending — readable by any device.
    const review = await api.getDailyReview('2026-06-15');
    expect(review.ai_review_status).toBe('pending');
    expect(review.ai_review).toBe('');

    // Weekly trigger writes a reviews-shard marker keyed by week_start_date.
    const wk = await api.triggerWeeklyReview('2026-06-15');
    expect(wk.status).toBe('pending');
    const weekly = await api.getWeeklyReview('2026-06-15');
    expect(weekly.status).toBe('pending');
  });

  it('getStats aggregates day / week / month from sharded data', async () => {
    const drive = fakeDriveClient();
    const api = buildApi(drive);

    await api.saveSession({ mode: 'live', duration_seconds: 3600, manual_shots: 30, date: '2026-06-15T07:00:00.000Z' });
    await api.saveSession({ mode: 'live', duration_seconds: 1800, manual_shots: 20, date: '2026-06-15T12:00:00.000Z' });
    await api.saveJournal('2026-06-15', { gym: true, gym_muscles: 'legs', running: true, running_kms: '5 km', sleeping_hours: '8', mood: 'good', energy: 4 });

    const stats = await api.getStats('2026-06-15');
    // day: both sessions are on the 15th
    expect(stats.day.sessions.totalShots).toBe(50);
    expect(stats.day.sessions.totalHours).toBe(1.5);
    expect(stats.day.gym.sessions).toBe(1);
    expect(stats.day.running.sessions).toBe(1);
    expect(stats.day.running.kms).toBe(5);
    expect(stats.day.sleep.avgHours).toBe(8);
    expect(stats.day.checkin.energy.avg).toBe(4);
    // week/month windows contain the same single day, so they aggregate the same totals
    expect(stats.week.sessions.totalShots).toBe(50);
    expect(stats.month.sessions.totalShots).toBe(50);
  });

  it('addSkill persists to the skills singleton and lists back', async () => {
    const drive = fakeDriveClient();
    const api = buildApi(drive);

    const skill = await api.addSkill('Grip', 'Consistent pressure');
    expect(skill.id).toBeTruthy();
    expect(await api._pending()).toHaveLength(0);

    const skills = await api.listSkills();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('Grip');
  });
});
