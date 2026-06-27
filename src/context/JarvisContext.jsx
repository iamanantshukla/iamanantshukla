// client/src/context/JarvisContext.jsx — the single pervasive Jarvis/Pebble layer (spec E §3.3).
//
// One context loads the agent-written singletons (pebble.json + today.json + campaign.json) once,
// CACHE-FIRST, and is the single source for every Pebble appearance: the home line, today's
// mission, the season strip, and the state-aware expression.
//
// NO FLASH (spec E goal #5 / locked decision #5): on first synchronous render we read the
// last-known value from the synchronous localStorage mirror (singletonCache) and render it
// IMMEDIATELY — never a placeholder string that visibly swaps. A background refresh via
// api.getSingleton(...) (DriveStore, cache-first over IndexedDB) then compares, and we swap state
// ONLY when the value genuinely changed. If there is no cache and no token, the true static
// fallback (FALLBACK_VOICE) renders once with no later swap.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { FALLBACK_VOICE } from '../lib/pebbleVoice.js';
import { fallbackTip } from '../lib/tipPool.js';
import {
  readCachedSingleton,
  writeCachedSingleton,
  singletonChanged,
} from '../lib/singletonCache.js';

const JarvisCtx = createContext(null);
export const useJarvis = () => useContext(JarvisCtx) || EMPTY_JARVIS;

// A safe default so components used outside the provider (e.g. isolated unit tests) never crash.
const EMPTY_JARVIS = {
  pebble: null,
  mission: null,
  campaign: null,
  sims: null,
  line: FALLBACK_VOICE,
  mentalScenario: null,
  expression: 'neutral',
  freshness: null,
  tip: fallbackTip(),
};

// pickExpression(state) — deterministic, state-derived expression (spec §2 expression-state map).
// One owner so every Pebble appearance is consistent. Priority, strongest signal first:
//   1. genuine concern / low energy (sleepy then sad)   — a worry is louder than a plan
//   2. earned pride (proud)                              — score-blind mission.completed only
//   3. session-active / unready focus (focused)          — amber/red readiness band
//   4. prescribed rest (resting)
//   5. self-reported upbeat mood (happy)
//   6. neutral (default)
// `concern` is the NEW agent-written today.json flag: 'sleep' -> sleepy, any other truthy -> sad.
export function pickExpression(state = {}) {
  const { mood, readinessBand, missionComplete, isRestDay, concern } = state;
  // 1. Low-energy / poor-sleep poles win first — pair with adjacent text at the call site (§2 a11y).
  if (mood === 'down' || concern === 'sleep') return 'sleepy';
  if (mood === 'low' || concern) return 'sad';
  // 2. Earned pride beats a self-reported good mood; gated on the score-blind flag, never the score.
  if (missionComplete) return 'proud';
  // 3. An active/unready day reads as focused.
  if (readinessBand === 'red' || readinessBand === 'amber') return 'focused';
  // 4. A prescribed rest day.
  if (isRestDay) return 'resting';
  // 5. A genuinely good self-reported day.
  if (mood === 'great' || mood === 'good') return 'happy';
  return 'neutral';
}

// Human "last planned X ago" stamp from an ISO timestamp. Never throws.
export function freshnessStamp(iso, now = Date.now()) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function lineFrom(pebble) {
  const t = pebble && pebble.text && String(pebble.text).trim();
  return t || FALLBACK_VOICE;
}

// Local-date "YYYY-MM-DD" for today's journal key (mirrors gymDates.localDateString; kept inline so
// the context has no view-layer import). Injectable for tests via the `today` prop.
function localToday() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function JarvisProvider({ children, today = localToday() }) {
  // First paint: seed from the synchronous cache so there is NEVER a placeholder→real swap.
  const [pebble, setPebble] = useState(() => readCachedSingleton('pebble'));
  const [mission, setMission] = useState(() => readCachedSingleton('today'));
  const [campaign, setCampaign] = useState(() => readCachedSingleton('campaign'));
  const [planWeek, setPlanWeek] = useState(() => readCachedSingleton('plan-week'));
  // sims = the Campaign dashboard aggregates (§4.2): agent-written, read-only, cache-first.
  const [sims, setSims] = useState(() => readCachedSingleton('sims'));
  // Today's logged mood drives the happy/sad/sleepy Pebble (§2). It lives on the journal record,
  // not a singleton, so there is no synchronous mirror — it resolves async and only ever upgrades
  // the expression (never flashes the line). Starts null = "no mood signal yet".
  const [mood, setMood] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // Background refresh, cache-first via DriveStore. Swap ONLY on a real change (goal #5).
    const refresh = (name, current, setter) => {
      api.getSingleton(name)
        .then((next) => {
          if (!mounted.current || next == null) return;
          if (singletonChanged(current, next)) {
            writeCachedSingleton(name, next);
            setter(next);
          }
        })
        .catch(() => { /* keep cached value; sync banner surfaces staleness (spec E §7) */ });
    };
    refresh('pebble', pebble, setPebble);
    refresh('today', mission, setMission);
    refresh('campaign', campaign, setCampaign);
    refresh('plan-week', planWeek, setPlanWeek);
    refresh('sims', sims, setSims);
    // Read today's journal mood so the Pebble expression matches how the day actually felt (§2).
    // Best-effort: a missing journal / offline read leaves the expression on its agent-derived value.
    api.getJournal(today)
      .then((j) => { if (mounted.current && j && j.mood) setMood(j.mood); })
      .catch(() => { /* no mood signal; fall back to agent-derived expression */ });
    return () => { mounted.current = false; };
    // Run once on mount; intentionally not re-running on every value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => {
    const line = lineFrom(pebble);
    const scenarios = (pebble && Array.isArray(pebble.mental_scenarios)) ? pebble.mental_scenarios : [];
    const expression = pickExpression({
      mood,
      readinessBand: mission && (mission.readinessBand || (mission.readiness && mission.readiness.band)),
      // Score-blind adherence flag the agent writes onto today.json (§6); never session.score.
      missionComplete: !!(mission && (mission.completed || (mission.mission && mission.mission.completed))),
      // Poor-sleep / recovery concern flag the agent writes onto today.json (§2): 'sleep' -> sleepy.
      concern: mission && mission.concern,
      isRestDay: !!(mission && mission.shooting && mission.shooting.module === 'rest'),
    });
    return {
      pebble,
      mission,
      campaign,
      planWeek,
      sims,
      line,
      mentalScenario: scenarios[0] || (mission && mission.mental && mission.mental.scenario) || null,
      mentalScenarios: scenarios,
      expression,
      freshness: freshnessStamp(mission && (mission.plannedAt || mission.updatedAt)),
      // Tip of the Day: the agent-written pebble.daily_tip when present (fresh, personalized,
      // theme-persistent); otherwise the static theme-block fallback so the footer is never empty.
      tip: (pebble && pebble.daily_tip) ? pebble.daily_tip : fallbackTip(),
    };
  }, [pebble, mission, campaign, planWeek, sims, mood]);

  return <JarvisCtx.Provider value={value}>{children}</JarvisCtx.Provider>;
}
