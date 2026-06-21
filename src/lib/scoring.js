// Re-export the shared authoritative scoring module so the client and server
// share one implementation. Vite resolves this relative path at build time.
export * from '../../../shared/scoring.js';
