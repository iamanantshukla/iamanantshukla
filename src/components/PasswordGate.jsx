// PasswordGate is retired (sub-project B §3.3.2): the local-server password step was an artifact
// of the old SQLite server that sub-project A eliminated. Both targets now authenticate via Google
// OAuth through AuthGate. This file remains only as a compatibility re-export so any lingering
// import path keeps resolving; new code should import AuthGate directly.
export { AuthGate, AuthGate as default } from './AuthGate.jsx';
