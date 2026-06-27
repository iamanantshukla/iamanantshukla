// src/lib/continuity.js — the forgiving continuity thread + never-miss-twice (spec §5).
//
// CLIENT-OWNED, never agent-owned: it reads the engagement records already on the device (journals,
// sessions, gym) plus the agent's rest markers, and derives a calm "shown up N days" presence — NOT
// a flame counter, no red X. The state machine is deliberately forgiving:
//   - a day is "covered" if it is ENGAGED (journal OR session OR gym logged) OR prescribed REST.
//   - ONE missed non-rest day  -> held "amber, not broken"; the count is kept.
//   - TWO consecutive missed non-rest days -> the run resets (never-miss-twice).
//
// Pure + deterministic (today injected) so it unit-tests cleanly and first-paints from the mirror.

// "YYYY-MM-DD" minus n days, in UTC (date-only math; no TZ drift for whole-day keys).
function minusDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) - n * 86400000;
  const dt = new Date(t);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

// computeContinuity({ today, engaged:Set, restDays:Set }) -> { count, state, broken }
//   state: 'active' (today covered) | 'amber' (one day off, run preserved) | 'broken' (reset).
export function computeContinuity({ today, engaged = new Set(), restDays = new Set() }) {
  const covered = (iso) => engaged.has(iso) || restDays.has(iso);

  const todayCovered = covered(today);
  const yesterday = minusDays(today, 1);
  const yesterdayCovered = covered(yesterday);
  const hasHistory = engaged.size > 0 || restDays.size > 0;

  // Never-miss-twice transition: today missed AND yesterday missed -> the run is broken. But a
  // brand-new user with NO history hasn't broken anything — show a calm zero, not a "reset".
  if (!todayCovered && !yesterdayCovered) {
    if (!hasHistory) return { count: 0, state: 'amber', broken: false };
    return { count: 0, state: 'broken', broken: true };
  }

  // Count the consecutive covered days ending at the most recent covered day (today if covered,
  // else yesterday — the held run during a single miss).
  let cursor = todayCovered ? today : yesterday;
  let count = 0;
  // Bound the walk to a year so a corrupt set can never loop unboundedly.
  for (let i = 0; i < 366; i++) {
    if (!covered(cursor)) break;
    count += 1;
    cursor = minusDays(cursor, 1);
  }

  // 'active' when today is covered; 'amber' when today is missed but the run is preserved (one miss).
  return { count, state: todayCovered ? 'active' : 'amber', broken: false };
}
