// client/src/lib/driveClient.js — the browser Google Drive REST client (sub-project A.10 / C).
//
// This is the thin Drive wrapper that createDriveStore (shared/driveStore.js) expects to be
// INJECTED. It speaks the Drive v3 REST API directly over fetch using the user's OAuth bearer
// token, so the same DriveStore logic runs identically on GitHub Pages and the local build —
// no Node, no SQLite, no server round-trip (spec A.1 "OAuth-as-you everywhere").
//
// Interface (exactly what createDriveStore calls):
//   listFolder(folderId)             -> [{ id, name }]
//   readFile(fileId)                 -> { json, etag } | null
//   createFile(folderId, name, json) -> { id, etag }
//   updateFile(fileId, json, etag)   -> { id, etag }
//
// The bearer token is pulled lazily from the injected getToken() (authManager / auth.js) on every
// call so a token refreshed by withAuth is always the one used. A 401 is surfaced as an error with
// `status = 401` so authManager.isAuthError can detect it and drive the silent-reauth + retry path.
//
// Folder id resolves from VITE_JARVIS_FOLDER_ID with a constant fallback so the app boots even
// before the user has pasted their own folder id into config.

// Constant fallback folder id (the user's JarvisV2/ Drive folder). Overridable via
// VITE_JARVIS_FOLDER_ID (see client/.env). The app (signed in as the user via OAuth) discovers
// every file inside this folder by name and bootstraps/migrates it on first run.
export const DEFAULT_FOLDER_ID = '1A9Q6l9j3AyVxAPvLPYbYyEcM4tcki_LU';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export function resolveFolderId() {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return env.VITE_JARVIS_FOLDER_ID || DEFAULT_FOLDER_ID;
}

function authError(status, message) {
  const err = new Error(message || `Drive request failed (${status})`);
  err.status = status;
  return err;
}

// createDriveClient({ getToken, fetchImpl }) — getToken() returns the current access token string
// (or null). fetchImpl defaults to the global fetch so tests can inject a fake.
export function createDriveClient({ getToken, fetchImpl } = {}) {
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  if (!doFetch) throw new Error('createDriveClient: no fetch available');
  const token = typeof getToken === 'function' ? getToken : () => null;

  function authHeaders(extra = {}) {
    const t = token();
    if (!t) throw authError(401, 'No Drive access token');
    return { Authorization: `Bearer ${t}`, ...extra };
  }

  async function ensureOk(res, what) {
    if (res.status === 401) throw authError(401, `Unauthorized (${what})`);
    if (!res.ok) {
      let msg = `Drive ${what} failed (${res.status})`;
      try {
        const body = await res.json();
        if (body && body.error && body.error.message) msg = body.error.message;
      } catch { /* non-JSON body */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
  }

  // List every file directly in folderId (name + id). Paginates so a folder with many month
  // shards is fully resolved. trashed=false so deleted files never shadow a live one.
  async function listFolder(folderId) {
    const out = [];
    let pageToken = '';
    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'nextPageToken,files(id,name)',
        pageSize: '1000',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const res = await doFetch(`${DRIVE_FILES}?${params.toString()}`, { headers: authHeaders() });
      await ensureOk(res, 'listFolder');
      const body = await res.json();
      for (const f of body.files || []) out.push({ id: f.id, name: f.name });
      pageToken = body.nextPageToken || '';
    } while (pageToken);
    return out;
  }

  // Read a file's JSON content + its etag (for optimistic concurrency). Returns null on 404.
  async function readFile(fileId) {
    const res = await doFetch(`${DRIVE_FILES}/${fileId}?alt=media`, { headers: authHeaders() });
    if (res.status === 404) return null;
    await ensureOk(res, 'readFile');
    const etag = res.headers && typeof res.headers.get === 'function' ? res.headers.get('etag') : null;
    let json;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { json, etag: etag || undefined };
  }

  // Create a new JSON file inside folderId via a multipart upload (metadata + content in one call).
  async function createFile(folderId, name, json) {
    const boundary = 'jarvis-' + Math.random().toString(36).slice(2);
    const metadata = { name, parents: [folderId], mimeType: 'application/json' };
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      `${JSON.stringify(json)}\r\n` +
      `--${boundary}--`;
    const res = await doFetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': `multipart/related; boundary=${boundary}` }),
      body,
    });
    await ensureOk(res, 'createFile');
    const out = await res.json();
    return { id: out.id, etag: out.etag || undefined };
  }

  // Overwrite an existing file's content. The etag (If-Match) makes this conditional so a stale
  // write is rejected (Drive returns 412); DriveStore re-reads and merges (spec A.8).
  async function updateFile(fileId, json, etag) {
    const headers = authHeaders({ 'Content-Type': 'application/json' });
    if (etag) headers['If-Match'] = etag;
    const res = await doFetch(`${DRIVE_UPLOAD}/${fileId}?uploadType=media&fields=id`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(json),
    });
    await ensureOk(res, 'updateFile');
    const out = await res.json();
    const newEtag = res.headers && typeof res.headers.get === 'function' ? res.headers.get('etag') : null;
    return { id: out.id || fileId, etag: newEtag || out.etag || undefined };
  }

  return { listFolder, readFile, createFile, updateFile };
}
