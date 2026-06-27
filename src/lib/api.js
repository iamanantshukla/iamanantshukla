// client/src/lib/api.js — THE single Drive-first data facade (sub-projects A.10 + B + C).
//
// This replaces the two divergent api.js files (client = local Node+SQLite; hosted = whole-DB
// Drive blob) with ONE facade built on the shared, unit-tested layers:
//   - createDriveStore  (shared/driveStore.js)  — month-sharded, manifest-indexed Drive store
//   - createOutbox      (shared/outbox.js)      — durable, idempotent, FIFO write queue
//   - createAuthManager (shared/authManager.js) — token lifecycle + retry-after-reauth
//   - createDriveClient (./driveClient.js)      — browser Drive REST client
//   - createIdbCache    (./idbCache.js)         — IndexedDB shard cache (degrades to memory)
//
// The public method names are preserved EXACTLY so the existing views need no changes:
//   me, login, logout, setAccessToken, getLockOwner, takeLock,
//   listSkills, addSkill, listSessions, getSession, saveSession, updateSessionComments,
//   getJournal, saveJournal, getStats, getDailyReview, getWeeklyReview,
//   triggerDailyReview, triggerWeeklyReview, cancelDailyReview, cancelWeeklyReview
//
// Layering (spec C §3):
//   writes:  view -> outbox.enqueue (durable, returns immediately) -> drain -> DriveStore.upsertRecord -> withAuth -> Drive
//   reads:   view -> DriveStore.loadRecent/listShard (cache-first) -> withAuth -> Drive
//
// "Request a review" is NOT an agent call (the frontend has no agent code, spec B/D): it writes a
// pending MARKER into the Drive store. The laptop agent polls the marker and writes the result back
// into reviews-*/journals. Any device can request; the laptop fulfils.

import {
  getAccessToken,
  setAccessToken as setToken,
  getStoredToken,
  clearAccessToken,
} from './auth.js';
import { requestToken } from './googleAuth.js';
import { gymApi } from './gymApi.js';
import { createDriveStore } from '../../../shared/driveStore.js';
import { createOutbox } from '../../../shared/outbox.js';
import { createAuthManager, ReauthRequiredError } from '../../../shared/authManager.js';
import { normalizeSession } from '../../../shared/driveModel.js';
import { scoreFromMm } from '../../../shared/scoring.js';
import { createDriveClient, resolveFolderId } from './driveClient.js';
import { createIdbCache } from './idbCache.js';

// ---- date helpers (kept local; mirror hosted/src/lib/api.js's stat windows) ----

function todayIso() {
  return new Date().toISOString();
}
function todayDate() {
  return new Date().toISOString().split('T')[0];
}

// ---- stats (ported verbatim from hosted/src/lib/api.js calculateStats) ----

function parseKms(str) {
  if (!str) return 0;
  const match = String(str).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function parseSleepHours(str) {
  if (!str) return 0;
  const num = parseFloat(str);
  if (!isNaN(num) && num.toString().trim() === String(str).trim()) return num;
  const hrMatch = String(str).match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
  const minMatch = String(str).match(/(\d+(?:\.\d+)?)\s*(?:min|m)/i);
  let hrs = hrMatch ? parseFloat(hrMatch[1]) : 0;
  let mins = minMatch ? parseFloat(minMatch[1]) : 0;
  if (!hrMatch && !minMatch) {
    const match = String(str).match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return hrs + mins / 60;
}

function avgField(journals, field) {
  let sum = 0;
  let count = 0;
  journals.forEach((j) => {
    const n = Number(j[field]);
    if (n > 0) {
      sum += n;
      count++;
    }
  });
  return { avg: count > 0 ? Math.round((sum / count) * 10) / 10 : 0, count };
}

function calculateStats(journals, sessions) {
  let gymSessions = 0;
  let gymMuscles = [];
  let runningSessions = 0;
  let runningKms = 0;
  let sleepSum = 0;
  let sleepCount = 0;
  let sessionDurationSeconds = 0;
  let sessionShots = 0;
  let moodCount = 0;
  const tagCounts = {};

  journals.forEach((j) => {
    if (j.gym === true || j.gym === 1) {
      gymSessions++;
      if (j.gym_muscles) gymMuscles.push(j.gym_muscles);
    }
    if (j.running === true || j.running === 1) {
      runningSessions++;
      runningKms += parseKms(j.running_kms);
    }
    const sleep = parseSleepHours(j.sleeping_hours);
    if (sleep > 0) {
      sleepSum += sleep;
      sleepCount++;
    }
    if (j.mood) moodCount++;
    if (Array.isArray(j.tags)) {
      j.tags.forEach((t) => {
        if (t) tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    }
  });

  sessions.forEach((s) => {
    sessionDurationSeconds += s.duration_seconds || 0;
    sessionShots += s.total_shots || (s.shots ? s.shots.length : 0);
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag, count]) => ({ tag, count }));

  return {
    gym: { sessions: gymSessions, muscles: [...new Set(gymMuscles)].join(', ') },
    running: { sessions: runningSessions, kms: Math.round(runningKms * 100) / 100 },
    sleep: { avgHours: sleepCount > 0 ? Math.round((sleepSum / sleepCount) * 10) / 10 : 0, count: sleepCount },
    sessions: { totalHours: Math.round((sessionDurationSeconds / 3600) * 10) / 10, totalShots: sessionShots },
    checkin: {
      daysLogged: moodCount,
      energy: avgField(journals, 'energy'),
      body: avgField(journals, 'body'),
      stress: avgField(journals, 'stress'),
      sleepQuality: avgField(journals, 'sleep_quality'),
      trainingRpe: avgField(journals, 'training_rpe'),
      shootingFeel: avgField(journals, 'shooting_feel'),
      topTags,
    },
  };
}

// ---- view-compat shaping ----

// Views read `s.started_at` (with `|| s.created_at || s.date` fallbacks). The new session record
// keys on `date`/`created_at`, so expose `started_at` on read without changing the stored shape.
function withStartedAt(session) {
  if (!session) return session;
  if (session.started_at) return session;
  return { ...session, started_at: session.date || session.created_at };
}

// Empty journal shape (matches hosted/src/lib/api.js getJournal default so views read cleanly).
function emptyJournal(date) {
  return {
    date,
    running: 0,
    running_kms: '',
    gym: 0,
    gym_muscles: '',
    sleeping_hours: '',
    observation: '',
    mood: '',
    energy: 0,
    body: 0,
    stress: 0,
    sleep_quality: 0,
    training_rpe: 0,
    shooting_feel: 0,
    highlight: '',
    challenge: '',
    lesson: '',
    gratitude: '',
    tomorrow_focus: '',
    tags: [],
    ai_review: '',
    ai_review_status: 'none',
  };
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// week (Mon..Sun) and month ranges for a target date — ported from hosted getStats.
function weekRange(targetDate) {
  const dateObj = new Date(targetDate);
  const day = dateObj.getDay();
  const diffToMonday = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(dateObj.setDate(diffToMonday));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
}
function monthRange(targetDate) {
  const parts = targetDate.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const lastDay = new Date(year, month, 0).getDate();
  return [`${parts[0]}-${parts[1]}-01`, `${parts[0]}-${parts[1]}-${String(lastDay).padStart(2, '0')}`];
}

// ============================================================================
// Facade construction
// ============================================================================

// IndexedDB-backed storage for the outbox (getAll/put/delete by seq). Degrades to a Map.
async function createOutboxStorage() {
  if (typeof indexedDB === 'undefined' || !indexedDB) return memoryOutboxStorage();
  const DB = 'jarvis-outbox';
  const STORE = 'queue';
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'seq' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return memoryOutboxStorage();
  }
  const run = (mode, fn) =>
    new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let out;
      Promise.resolve(fn(store)).then((r) => { out = r; }).catch(reject);
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
    });
  const toP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return {
    async getAll() { return (await run('readonly', (s) => toP(s.getAll()))) || []; },
    async put(item) { await run('readwrite', (s) => s.put(item)); },
    async delete(seq) { await run('readwrite', (s) => s.delete(seq)); },
  };
}

function memoryOutboxStorage() {
  const store = new Map();
  return {
    async getAll() { return [...store.values()]; },
    async put(item) { store.set(item.seq, item); },
    async delete(seq) { store.delete(seq); },
  };
}

// createApi(deps) — the testable factory. Production wires the browser implementations; tests inject
// fakes (fake driveClient + in-memory cache/storage). Returns the public facade.
export function createApi({
  driveClient,
  cache,
  outboxStorage,
  authManager,
  folderId = resolveFolderId(),
  now = todayIso,
} = {}) {
  const drive = driveClient;
  const store = createDriveStore({ drive, cache, folderId, now });

  // Writer the outbox drains through: an idempotent DriveStore upsert/putSingleton, wrapped in
  // withAuth so a 401 at drain time triggers silent re-auth + one retry (spec C §5.2).
  async function writeItem(item) {
    const run = async () => {
      if (item.op === 'putSingleton') {
        return store.putSingleton(item.entity, item.payload);
      }
      // Each sharded entity is keyed/dated by its own field so upsert is idempotent:
      //   sessions  -> id (uuid),       dated by `date`
      //   journals  -> date,            dated by `date`
      //   gym       -> date,            dated by `date`
      //   reviews   -> week_start_date, dated by `week_start_date` (weekly review markers/results)
      const keying = {
        sessions: { dateField: 'date', idField: 'id' },
        journals: { dateField: 'date', idField: 'date' },
        gym: { dateField: 'date', idField: 'date' },
        reviews: { dateField: 'week_start_date', idField: 'week_start_date' },
      };
      const { dateField, idField } = keying[item.entity] || { dateField: 'date', idField: 'id' };
      return store.upsertRecord(item.entity, item.payload, { dateField, idField });
    };
    if (authManager && typeof authManager.withAuth === 'function') return authManager.withAuth(run);
    return run();
  }

  const outbox = createOutbox({ storage: outboxStorage, writer: writeItem, now });

  // Enqueue durably, then attempt a drain. The drain failing (offline / needsLogin) is NOT an error
  // the caller sees — the item is safe in the outbox and will drain later (spec C §2 "never silent",
  // §5.3 offline). We swallow only the drain's transport/auth rejection, never the enqueue.
  async function enqueueAndTryDrain(item) {
    const stored = await outbox.enqueue(item);
    try {
      await outbox.drain();
    } catch (err) {
      if (!(err instanceof ReauthRequiredError)) {
        // Surface non-auth drain errors to the console; the item remains queued either way.
        // (The pending-sync UI in E renders queued state; A/C contract: never lose, only delay.)
        if (typeof console !== 'undefined') console.warn('outbox drain deferred:', err && err.message);
      }
    }
    return stored;
  }

  // Read a singleton through withAuth (reads still need a live token).
  function readThroughAuth(fn) {
    if (authManager && typeof authManager.withAuth === 'function') return authManager.withAuth(fn);
    return fn();
  }

  // ---- reviews helpers --------------------------------------------------

  // Daily reviews live on the journal record (ai_review*, matching the legacy shape the view reads).
  // Weekly reviews live in the reviews shard keyed by week_start_date.
  async function readJournal(date) {
    const list = await readThroughAuth(() => store.listShard('journals', periodFor(date)));
    return (list || []).find((j) => j.date === date) || null;
  }

  async function readWeeklyReview(weekStartDate) {
    const list = await readThroughAuth(() => store.listShard('reviews', periodFor(weekStartDate)));
    return (list || []).find((r) => r.week_start_date === weekStartDate) || null;
  }

  // ---- the public facade ------------------------------------------------

  const api = {
    // --- auth / identity ---
    setAccessToken: async (token) => {
      setToken(token);
      await gymApi.init();
    },

    me: async () => {
      return { authed: !!getAccessToken(), localAuthed: !!getAccessToken() };
    },

    // GIS owns sign-in; login is a no-op compatibility shim (hosted parity).
    login: async () => ({ authed: true }),

    logout: async () => {
      clearAccessToken();
    },

    // --- lock (multi-device single-writer; lock.json singleton) ---
    getLockOwner: () => {
      const lock = api._lockCache;
      return lock ? lock.owner : 'hosted';
    },

    takeLock: async () => {
      const lock = { owner: 'this-device', device: 'browser', takenAt: now() };
      await enqueueAndTryDrain({ entity: 'lock', op: 'putSingleton', date: now(), payload: lock });
      api._lockCache = lock;
      return lock;
    },

    // --- agent-written singletons (read-only here; the laptop agent writes them) ---
    // pebble.json (home line + mental scenarios), today.json (the daily mission), campaign.json
    // (the season plan). E reads these cache-first via DriveStore; it never writes them.
    getSingleton: async (name) => {
      return readThroughAuth(() => store.getSingleton(name));
    },

    // --- skills (singleton catalogue) ---
    listSkills: async () => {
      const skills = await readThroughAuth(() => store.getSingleton('skills'));
      return Array.isArray(skills) ? skills : [];
    },

    addSkill: async (name, expectation) => {
      const skills = (await readThroughAuth(() => store.getSingleton('skills'))) || [];
      const skill = { id: generateId(), name, expectation };
      const next = [...skills, skill];
      // Skills are a singleton, but go through the outbox so the write is durable-before-network.
      await enqueueAndTryDrain({ entity: 'skills', op: 'putSingleton', id: skill.id, payload: next });
      return skill;
    },

    // --- sessions ---
    listSessions: async (date = '') => {
      const all = await readThroughAuth(() => store.loadRecent('sessions', now()));
      let list = (all || []).map(withStartedAt);
      if (date) list = list.filter((s) => (s.started_at || s.date || '').startsWith(date));
      return list.sort((a, b) => new Date(b.started_at || b.date) - new Date(a.started_at || a.date));
    },

    getSession: async (id) => {
      const all = await readThroughAuth(() => store.loadRecent('sessions', now()));
      const s = (all || []).find((x) => String(x.id) === String(id));
      if (!s) throw new Error('Not found');
      return withStartedAt(s);
    },

    saveSession: async (payload) => {
      const nowIso = now();
      const record = normalizeSession(
        { ...payload, date: payload.date || nowIso },
        { scoreFn: scoreFromMm, nowIso, id: payload.id || generateId() },
      );
      await enqueueAndTryDrain({ entity: 'sessions', op: 'append', id: record.id, date: record.date, payload: record });
      return withStartedAt(record);
    },

    updateSessionComments: async (id, comments) => {
      const all = await readThroughAuth(() => store.loadRecent('sessions', now()));
      const s = (all || []).find((x) => String(x.id) === String(id));
      if (!s) return null;
      const updated = { ...s, comments };
      await enqueueAndTryDrain({ entity: 'sessions', op: 'append', id: updated.id, date: updated.date, payload: updated });
      return withStartedAt(updated);
    },

    // --- journals ---
    getJournal: async (date) => {
      const j = await readJournal(date);
      if (!j) return emptyJournal(date);
      return { ...j, running: j.running ? 1 : 0, gym: j.gym ? 1 : 0 };
    },

    saveJournal: async (date, payload) => {
      const existing = await readJournal(date);
      const mapped = {
        ...(existing || {}),
        ...payload,
        date,
        running: payload.running === true || payload.running === 1,
        gym: payload.gym === true || payload.gym === 1,
      };
      await enqueueAndTryDrain({ entity: 'journals', op: 'append', date, payload: mapped });
      return mapped;
    },

    // --- stats (day / week / month windows, calculateStats ported from hosted) ---
    getStats: async (date = '') => {
      const targetDate = date || todayDate();
      const journals = (await readThroughAuth(() => store.loadRecent('journals', now()))) || [];
      const sessions = ((await readThroughAuth(() => store.loadRecent('sessions', now()))) || []).map(withStartedAt);

      const inRange = (d, lo, hi) => d >= lo && d <= hi;
      const sessDate = (s) => (s.started_at || s.date || '').split('T')[0];

      const dayJournals = journals.filter((j) => j.date === targetDate);
      const daySessions = sessions.filter((s) => (s.started_at || s.date || '').startsWith(targetDate));

      const [mon, sun] = weekRange(targetDate);
      const weekJournals = journals.filter((j) => inRange(j.date, mon, sun));
      const weekSessions = sessions.filter((s) => inRange(sessDate(s), mon, sun));

      const [first, last] = monthRange(targetDate);
      const monthJournals = journals.filter((j) => inRange(j.date, first, last));
      const monthSessions = sessions.filter((s) => inRange(sessDate(s), first, last));

      return {
        day: calculateStats(dayJournals, daySessions),
        week: calculateStats(weekJournals, weekSessions),
        month: calculateStats(monthJournals, monthSessions),
      };
    },

    // --- reviews (read) ---
    getDailyReview: async (date) => {
      const j = await readJournal(date);
      if (!j || !j.ai_review) {
        // A pending marker (no result yet) still surfaces as a status so the view's poll continues.
        return {
          ai_review: '',
          ai_review_status: j && j.ai_review_status ? j.ai_review_status : 'none',
          ai_review_progress: (j && j.ai_review_progress) || null,
        };
      }
      return {
        ai_review: j.ai_review,
        ai_review_status: j.ai_review_status || 'completed',
        ai_review_progress: j.ai_review_progress || null,
      };
    },

    getWeeklyReview: async (weekStartDate) => {
      const w = await readWeeklyReview(weekStartDate);
      if (!w) return { review: '', status: 'none', progress: null };
      return { review: w.review || '', status: w.status || 'completed', progress: w.progress || null };
    },

    // --- reviews (trigger = write a pending MARKER; the laptop agent fulfils, spec B/D) ---
    triggerDailyReview: async (date) => {
      const existing = (await readJournal(date)) || emptyJournal(date);
      const marker = { ...existing, date, ai_review_status: 'pending', ai_review_progress: null };
      await enqueueAndTryDrain({ entity: 'journals', op: 'append', date, payload: marker });
      return { status: 'pending' };
    },

    triggerWeeklyReview: async (weekStartDate) => {
      const existing = (await readWeeklyReview(weekStartDate)) || { week_start_date: weekStartDate };
      const marker = { ...existing, week_start_date: weekStartDate, status: 'pending', progress: null };
      await enqueueAndTryDrain({ entity: 'reviews', op: 'append', date: weekStartDate, payload: marker });
      return { status: 'pending' };
    },

    cancelDailyReview: async (date) => {
      const existing = await readJournal(date);
      if (existing) {
        const marker = { ...existing, ai_review_status: 'none', ai_review_progress: null };
        await enqueueAndTryDrain({ entity: 'journals', op: 'append', date, payload: marker });
      }
      return { status: 'none' };
    },

    cancelWeeklyReview: async (weekStartDate) => {
      const existing = await readWeeklyReview(weekStartDate);
      if (existing) {
        const marker = { ...existing, week_start_date: weekStartDate, status: 'none', progress: null };
        await enqueueAndTryDrain({ entity: 'reviews', op: 'append', date: weekStartDate, payload: marker });
      }
      return { status: 'none' };
    },

    // --- sync / resilience surface (sub-project C; consumed by SyncContext) ---
    // How many writes are still waiting to reach Drive (0 = fully synced).
    pendingCount: async () => (await outbox.pending()).length,
    // The queued items (for a detail list / backup).
    pendingItems: async () => outbox.pending(),
    // Force a drain attempt now (Retry button / online / focus / interval). Resolves to the
    // drain result; never throws for a queued/offline item (only a non-auth transport error).
    drainNow: async () => {
      try { return await outbox.drain(); }
      catch (err) {
        if (err instanceof ReauthRequiredError) return { needsLogin: true };
        throw err;
      }
    },
    // Subscribe to auth-state changes (authed | needsLogin) so the UI can pop a re-login prompt.
    onAuthState: (cb) => (authManager && authManager.onAuthStateChange ? authManager.onAuthStateChange(cb) : () => {}),
    authState: () => (authManager && authManager.getState ? authManager.getState() : 'authed'),
    // Interactive re-login: re-acquire a token via the popup, then re-run every queued write.
    relogin: async () => {
      if (authManager && authManager.relogin) await authManager.relogin();
      // relogin re-runs the auth-queued ops; also drain the durable outbox for anything deferred.
      return api.drainNow();
    },
    // Local-file fallback: serialize the pending queue to a JSON-able array, and re-import later.
    exportOutbox: async () => outbox.pending(),
    importOutbox: async (items) => {
      let n = 0;
      for (const it of items || []) { await outbox.importItem(it); n++; }
      await api.drainNow();
      return n;
    },

    // --- test/diagnostic seams (not part of the view contract) ---
    _store: store,
    _outbox: outbox,
    _drain: () => outbox.drain(),
    _pending: () => outbox.pending(),
    _lockCache: null,
  };

  return api;
}

// `periodOf` is in driveModel but we only need YYYY-MM from a date here; keep a tiny local copy so
// the facade does not import the whole model just for this (and tolerates date-only strings).
function periodFor(dateStr) {
  const m = String(dateStr || '').match(/^(\d{4})-(\d{2})/);
  if (!m) return new Date().toISOString().slice(0, 7);
  return `${m[1]}-${m[2]}`;
}

// ============================================================================
// Production singleton: wire the browser implementations lazily.
// ============================================================================

// The auth manager wraps auth.js (the sessionStorage-persisted token) so every DriveStore call
// goes through withAuth. requestToken is now backed by the real GIS client (googleAuth.js), so a
// token that expires mid-session triggers a genuine SILENT re-acquire; if that silent refresh
// fails (no live Google session), withAuth raises ReauthRequiredError and the SyncContext shows a
// re-login prompt that calls relogin() (interactive grant) and re-runs the queued writes.
function buildAuthManager() {
  return createAuthManager({
    requestToken: async ({ silent } = {}) => {
      const tok = await requestToken({ silent: !!silent }); // { access_token, expiresAt }
      setToken(tok); // persist to sessionStorage with expiry
      return tok;
    },
    getStoredToken: () => getStoredToken(),
    setStoredToken: (token) => { if (token && token.access_token) setToken(token); },
  });
}

let realApi = null;
let initPromise = null;

async function ensureRealApi() {
  if (realApi) return realApi;
  if (!initPromise) {
    initPromise = (async () => {
      const cache = await createIdbCache();
      const outboxStorage = await createOutboxStorage();
      const authManager = buildAuthManager();
      const driveClient = createDriveClient({ getToken: getAccessToken });
      realApi = createApi({ driveClient, cache, outboxStorage, authManager });
      return realApi;
    })();
  }
  return initPromise;
}

// Public `api`: a thin proxy that lazily initialises the real facade on first use. The async init
// (IndexedDB open) is awaited per call so view code keeps its existing `await api.x()` shape.
function makeMethod(name) {
  return async (...args) => {
    const a = await ensureRealApi();
    return a[name](...args);
  };
}

export const api = {
  setAccessToken: makeMethod('setAccessToken'),
  me: makeMethod('me'),
  login: makeMethod('login'),
  logout: makeMethod('logout'),
  getLockOwner: () => (realApi ? realApi.getLockOwner() : 'hosted'),
  takeLock: makeMethod('takeLock'),
  getSingleton: makeMethod('getSingleton'),
  listSkills: makeMethod('listSkills'),
  addSkill: makeMethod('addSkill'),
  listSessions: makeMethod('listSessions'),
  getSession: makeMethod('getSession'),
  saveSession: makeMethod('saveSession'),
  updateSessionComments: makeMethod('updateSessionComments'),
  getJournal: makeMethod('getJournal'),
  saveJournal: makeMethod('saveJournal'),
  getStats: makeMethod('getStats'),
  getDailyReview: makeMethod('getDailyReview'),
  getWeeklyReview: makeMethod('getWeeklyReview'),
  triggerDailyReview: makeMethod('triggerDailyReview'),
  triggerWeeklyReview: makeMethod('triggerWeeklyReview'),
  cancelDailyReview: makeMethod('cancelDailyReview'),
  cancelWeeklyReview: makeMethod('cancelWeeklyReview'),
  // sync / resilience (sub-project C)
  pendingCount: makeMethod('pendingCount'),
  pendingItems: makeMethod('pendingItems'),
  drainNow: makeMethod('drainNow'),
  relogin: makeMethod('relogin'),
  exportOutbox: makeMethod('exportOutbox'),
  importOutbox: makeMethod('importOutbox'),
  // onAuthState needs the live authManager subscription, so resolve the real api first.
  onAuthState: (cb) => {
    let off = () => {};
    ensureRealApi().then((a) => { off = a.onAuthState(cb); });
    return () => off();
  },
  authState: () => (realApi ? realApi.authState() : 'authed'),
};

// startAutoDrain — drain the outbox whenever connectivity/attention returns, plus a slow timer
// while items remain queued. Returns a stop() to unsubscribe. Mounted by SyncContext (sub-project C).
export function startAutoDrain({ intervalMs = 30000 } = {}) {
  if (typeof window === 'undefined') return () => {};
  let timer = null;
  const tick = () => { api.drainNow().catch(() => {}); };
  const onOnline = () => tick();
  const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', tick);
  timer = setInterval(async () => {
    try { if ((await api.pendingCount()) > 0) tick(); } catch { /* not ready yet */ }
  }, intervalMs);
  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', tick);
    if (timer) clearInterval(timer);
  };
}
