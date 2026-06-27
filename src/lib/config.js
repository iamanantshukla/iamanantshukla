// client/src/lib/config.js — the single build-target resolver (sub-project B).
//
// One source tree, two build outputs, selected at build time by VITE_BUILD_TARGET:
//   - 'local' : laptop build, served at '/',              outDir dist/, shows agent triggers
//   - 'pages' : GitHub Pages build, served at the subpath, outDir docs/, no agent triggers
//
// Feature code NEVER reads import.meta.env directly; it imports the constants below so the
// target vocabulary lives in exactly one place. Vite statically replaces import.meta.env.* at
// build time, so the unused branch (e.g. the agent-trigger UI on the pages build) is tree-shaken.
//
// Vitest reads vite.config's env too; an unset flag resolves to 'local' here, which is the
// canonical default (matches vite.config.js's default).

export const PAGES_BASE = '/iamanantshukla/';

export const BUILD_TARGET = import.meta.env.VITE_BUILD_TARGET || 'local';

// Any value other than the explicit 'local' is treated as pages semantics (per spec B §5:
// a typo'd flag builds as the pages variant rather than silently behaving as local).
export const IS_LOCAL = BUILD_TARGET === 'local';
export const IS_PAGES = !IS_LOCAL;

// Lock-owner identity written into / compared against Drive lock.json. Uses the same vocabulary
// as BUILD_TARGET so there is one set of literals: 'local' on the laptop, 'pages' on the iPad.
export const THIS_DEVICE = IS_LOCAL ? 'local' : 'pages';

// Public base path the bundle is served under (mirrors vite.config.js base per target).
export const BASE_PATH = IS_LOCAL ? '/' : PAGES_BASE;
