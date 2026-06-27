// client/src/lib/idbCache.js — IndexedDB-backed shard cache (sub-project A.6).
//
// Implements the `cache` interface createDriveStore expects:
//   get(key)                 -> { value, updatedAt } | null
//   set(key, value, updatedAt) -> void
//   meta()                   -> { key: updatedAt, ... }
//
// Keyed by `entity:period` (e.g. "sessions:2026-06"), storing the shard JSON plus the manifest
// updatedAt it was fetched at. On load, DriveStore compares each shard's manifest updatedAt to the
// cached one and only re-fetches shards whose updatedAt advanced (the fast path) — so repeat visits
// are instant. Pure browser IndexedDB, so it works identically on GitHub Pages and locally.
//
// Degrades to an in-memory Map when indexedDB is unavailable (private-mode / SSR / tests), so the
// app never crashes — it just loses cross-reload persistence (spec C error-handling: never pretend
// durability we do not have, but never crash).

const DB_NAME = 'jarvis-cache';
const STORE = 'shards';
const DB_VERSION = 1;

function inMemoryCache() {
  const store = new Map();
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async set(key, value, updatedAt) {
      store.set(key, { value, updatedAt });
    },
    async meta() {
      const o = {};
      for (const [k, v] of store) o[k] = v.updatedAt;
      return o;
    },
    persistent: false,
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // keyPath 'key' = `${entity}:${period}`; value record { key, value, updatedAt }.
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('indexedDB.open failed'));
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; }).catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error || new Error('idb transaction failed'));
    t.onabort = () => reject(t.error || new Error('idb transaction aborted'));
  });
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// createIdbCache() — async factory. Resolves to an IndexedDB-backed cache, or transparently to the
// in-memory fallback if IndexedDB is missing or the open fails. The returned object exposes
// `.persistent` so the UI can warn when offline durability is degraded (spec C).
export async function createIdbCache() {
  if (typeof indexedDB === 'undefined' || !indexedDB) return inMemoryCache();

  let db;
  try {
    db = await openDb();
  } catch {
    return inMemoryCache();
  }

  return {
    persistent: true,
    async get(key) {
      try {
        const rec = await tx(db, 'readonly', (store) => reqToPromise(store.get(key)));
        if (!rec) return null;
        return { value: rec.value, updatedAt: rec.updatedAt };
      } catch {
        return null;
      }
    },
    async set(key, value, updatedAt) {
      try {
        await tx(db, 'readwrite', (store) => store.put({ key, value, updatedAt }));
      } catch {
        /* a cache write failure is non-fatal: the next read re-fetches from Drive */
      }
    },
    async meta() {
      try {
        const all = await tx(db, 'readonly', (store) => reqToPromise(store.getAll()));
        const o = {};
        for (const rec of all || []) o[rec.key] = rec.updatedAt;
        return o;
      } catch {
        return {};
      }
    },
  };
}

// Exposed for tests and for the IndexedDB-unavailable fallback path.
export { inMemoryCache };
