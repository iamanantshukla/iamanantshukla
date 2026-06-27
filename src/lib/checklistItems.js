// src/lib/checklistItems.js — resolve the Home "today's checklist" into RICH, per-session items (§4.1).
//
// Each session is its own item carrying everything the session-brief needs:
//   { id, label, kind, objective, detail, volume, start }
//     kind    — a session-kind key (see sessionKinds.js): match|live|dry|skill|mental|offline|gym|journal|recovery
//     objective — one short line: what this session is FOR
//     detail  — the fuller prescription / exercise list shown on the brief
//     volume  — the expected training volume (shots, sets×reps, or duration)
//     start   — how to launch after the brief: { type:'session', mode, focus } | { type:'gym' }
//               | { type:'offline', durationMin } | { type:'journal' } | null
//
// Source of truth for WHICH items is the agent-authored today.checklist[] when present (it owns the
// items + wording); we ENRICH each by its domain from the mission + the gym plan. When the agent
// hasn't written a checklist, we derive one from the mission domains so the feature still works.
import { getPlanForDate } from './gymPlan.js';
import { prescribedStart } from './prescription.js';

// Derive the shooting session kind + start payload from the prescribed (mode, focus, skills).
function shootingKind(mission) {
  const { mode, focus, skills } = prescribedStart(mission);
  const start = { type: 'session', mode, focus };
  if (skills && skills.length) start.skills = skills; // suggested skills to train (skill-focus)
  if (focus === 'match') return { kind: 'match', start };
  if (focus === 'skill') return { kind: 'skill', start };
  if (mode === 'mental') return { kind: 'mental', start };
  return { kind: mode === 'live' ? 'live' : 'dry', start };
}

// A short duration estimate ("65 min" / "20 min") pinned to the right of each task. Parsed from the
// prescription text when it states a time ("~1.5h", "90 min"), else a sensible default per kind.
function parseMinutes(text) {
  const t = String(text || '');
  const h = t.match(/(\d+(?:\.\d+)?)\s*h(?:our|r)?s?\b/i);
  if (h) return Math.round(Number(h[1]) * 60);
  const m = t.match(/(\d+)\s*min/i);
  if (m) return Number(m[1]);
  return null;
}
function durationLabel(mins) {
  return mins ? `${mins} min` : '';
}
function defaultMinutes(kind) {
  switch (kind) {
    case 'match': return 75;     // a full 60-shot simulation + setup
    case 'live': return 60;
    case 'dry': return 45;
    case 'skill': return 45;
    case 'mental': return 15;
    case 'gym': return 60;
    case 'offline': return 20;
    case 'journal': return 5;
    default: return null;
  }
}

// Expected shot volume from the prescription text ("2x10" -> 20 shots; "60 shots" -> 60), else a
// sensible qualitative fallback by kind.
function shootingVolume(prescription, kind) {
  const text = String(prescription || '');
  const grid = text.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (grid) return `${Number(grid[1]) * Number(grid[2])} shots`;
  const shots = text.match(/(\d+)\s*shots?/i);
  if (shots) return `${shots[1]} shots`;
  if (kind === 'match') return '60-shot match';
  // No explicit shot count — describe the volume from what the prescription actually says: a time
  // budget ("~1.5h"), and whether it's scoreless / perfect-shot work, so it's never a bare placeholder.
  const mins = parseMinutes(text);
  const scoreless = /\bscoreless|no scoring|no score\b/.test(text);
  const perfectShot = /perfect-?shot|deliberate|take all the time/.test(text);
  const bits = [];
  if (mins) bits.push(mins >= 60 ? `${(mins / 60).toFixed(mins % 60 ? 1 : 0)}h block` : `${mins} min block`);
  if (perfectShot) bits.push('perfect-shot reps');
  else if (kind === 'skill') bits.push('technique reps');
  else if (kind === 'dry') bits.push('routine reps');
  if (scoreless) bits.push('scoreless');
  return bits.length ? bits.join(' · ') : (kind === 'dry' || kind === 'skill' ? 'reps + routine' : 'live series');
}

// Gym volume summary from the plan day's exercises: "6 exercises · 20 sets".
function gymVolume(exercises = []) {
  const sets = exercises.reduce((n, e) => n + (e.prescription ? e.prescription.sets || 0 : 0), 0);
  return `${exercises.length} exercises · ${sets} sets`;
}

// "Day 5 · High-Fatigue Upper Body" -> "Gym · High-Fatigue Upper Body".
function gymLabel(title) {
  const tail = String(title || '').split('·').slice(1).join('·').trim();
  return tail ? `Gym · ${tail}` : 'Gym session';
}

// A "generic" agent block carries no real coaching intent of its own — it's a placeholder the gym
// plan day name should replace. A SPECIFIC block (e.g. 'mobility-only', 'recovery') is a deliberate
// readiness downgrade the coach wrote, and it must NOT be overridden by the heavy scheduled day.
const GENERIC_BLOCKS = new Set(['support', 'support-strength', 'phase-default', 'gym', 'strength', '']);
function isGenericBlock(block) {
  const b = String(block || '').toLowerCase().trim();
  return GENERIC_BLOCKS.has(b);
}

// The PERMANENT gym item, built straight from the weekday plan (independent of the agent). Always
// present and titled with today's exact gym day heading ("Gym · High-Fatigue Upper Body"), 60 min
// default. Returns null on a REST day (gym is hidden entirely). A LOGGED workout's title overrides
// the scheduled one so Home reflects what actually happened.
function gymItem(date, gymTitle) {
  if (!date && !gymTitle) return null; // need a weekday to resolve today's gym day
  const plan = date ? getPlanForDate(date) : null;
  const isRest = plan && plan.dayKey === 'rest';
  if (isRest && !gymTitle) return null; // rest day -> no gym task
  const exercises = (plan && plan.exercises) || [];
  return {
    id: 'gym',
    label: gymLabel(gymTitle || (plan && plan.title)),
    kind: 'gym',
    objective: (plan && plan.subtitle) || 'Strength & conditioning for the hold',
    detail: exercises.map((e) => e.name).join(' · '),
    volume: exercises.length ? gymVolume(exercises) : 'log your sets',
    duration: durationLabel(defaultMinutes('gym')),
    start: { type: 'gym' },
  };
}

// Build a physical item from the AGENT's mission block — used only for offline holds / advisory
// support (the gym session itself is the permanent plan-driven gymItem above).
function physicalItem(mission, date, gymTitle, authoredLabel) {
  const block = mission.physical && mission.physical.block;

  // The gym SESSION is the permanent plan-driven gymItem; here we only surface the agent's block when
  // it adds something beyond it: a concrete timed HOLD (wall hold, isometric, plank, carry, endurance)
  // is a real OFFLINE task; a named downgrade (mobility / core-balance / recovery) is ADVISORY context
  // shown under the verdict. A generic 'support' block adds nothing over the gym task -> skip it.
  if (block && block !== 'rest') {
    const text = `${block} ${authoredLabel || ''}`.toLowerCase();
    const mins = parseMinutes(block) || parseMinutes(authoredLabel);
    const isTaskHold = /\bhold|isometric|plank|carry|endurance|wall\b/.test(text) || !!mins;
    const label = authoredLabel || titleCase(block);
    if (isTaskHold) {
      return {
        id: 'physical', label, kind: 'offline',
        objective: mission.physical.reason || 'Support work for the shooting',
        detail: block,
        volume: mins ? `${mins} min` : 'timed block',
        duration: durationLabel(mins || defaultMinutes('offline')),
        start: { type: 'offline', durationMin: mins || null },
      };
    }
    if (isGenericBlock(block)) return null; // 'support'/'phase-default' add nothing over the gym task
    return { id: 'physical', label, kind: 'recovery', advisory: true,
      objective: mission.physical.reason || 'Support work — do it when it fits, not a tracked session.',
      detail: block, volume: '', duration: '', start: null };
  }
  return null;
}

function titleCase(s) {
  return String(s).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Enrich a single agent-authored checklist item (thin: {id,label,domain,start}) by its domain.
function enrich(item, mission, date, gymTitle, scenario) {
  const domain = item.domain;
  if (domain === 'shooting' && mission.shooting) {
    const { kind, start } = shootingKind(mission);
    return {
      id: item.id || 'shooting',
      // Title is set by the numbering pass -> "Shooting: Session N". The agent's specific wording
      // (item.label) becomes the objective on the brief; phases/skills live in the detail.
      label: '',
      kind,
      objective: item.label || mission.shooting.module || 'Today\'s shooting block',
      detail: mission.shooting.prescription || mission.shooting.module || '',
      volume: shootingVolume(mission.shooting.prescription, kind),
      duration: durationLabel(parseMinutes(mission.shooting.prescription) || defaultMinutes(kind)),
      // Suggested skills to train this session (skill-focus) — shown on the brief.
      skills: start.skills || null,
      start,
    };
  }
  if (domain === 'physical') {
    const phys = physicalItem(mission, date, gymTitle, item.label);
    if (phys) return { ...phys, id: item.id || phys.id };
    return null;
  }
  if (domain === 'journal') {
    return { id: item.id || 'checkin', label: 'Daily Journal', kind: 'journal',
      objective: item.label && item.label !== 'Daily Journal' ? item.label : 'Close the day; set tomorrow\'s focus',
      detail: 'Log how today felt, your sleep, and one line for tomorrow — Pebble reads it overnight.',
      volume: '', duration: durationLabel(defaultMinutes('journal')), start: { type: 'journal' } };
  }
  // A mental-rehearsal item launches the timer-only mental session. The detail prefers the resolved
  // scenario TEXT (passed in via opts) over the bare scenario_ref so the brief previews what to run.
  if (domain === 'mental') {
    const scenarioText = scenario || (mission.mental && mission.mental.scenario) || '';
    // Label is set by finalize() to "Shooting: Mental Visualisation"; the scenario lives in detail.
    return { id: item.id || 'mental', label: '', kind: 'mental',
      objective: 'Run the scenario in full detail — see and feel each shot before you fire it.',
      // Show the scenario preview when present; otherwise a clear instruction so it's never empty.
      detail: scenarioText
        ? `${scenarioText.slice(0, 160)}${scenarioText.length > 160 ? '…' : ''}`
        : 'Sit quietly and rehearse your match: settle into your stance, run your pre-shot routine, and watch each shot break clean. Pebble adds a specific scenario on match-prep days.',
      volume: 'timed', duration: durationLabel(defaultMinutes('mental')),
      start: { type: 'session', mode: 'mental', focus: 'shot' } };
  }
  // recovery / "log X" / anything else: keep the agent's wording. If the agent pointed it at the
  // journal (e.g. "log sleep hours"), keep that route; otherwise it's a no-launch reminder.
  const journalRoute = item.start === 'journal' || /\blog\b|sleep|hydrat/i.test(item.label || '');
  return {
    id: item.id || item.label,
    label: item.label,
    kind: domain === 'recovery' ? 'recovery' : 'journal',
    objective: item.label,
    detail: '',
    volume: '',
    start: journalRoute ? { type: 'journal' } : null,
  };
}

// One real session == one checklist item. The agent should describe an internal phase breakdown in
// the prescription (the brief renders it), NOT split one block into several launchable tasks. But
// older/again-generated today.json may still list multiple shooting items that all resolve to the
// SAME single shooting block — collapse those to the first so we never show "do this block twice".
function collapseSameSession(items) {
  const out = [];
  const seenLaunch = new Set();
  for (const it of items) {
    const s = it.start || {};
    // Only collapse launchable shooting/mental sessions (mode+focus). gym/offline/journal pass through.
    if (s.type === 'session') {
      const key = `${s.mode}:${s.focus}`;
      if (seenLaunch.has(key)) continue; // same session already represented — drop the duplicate
      seenLaunch.add(key);
    }
    out.push(it);
  }
  return out;
}

// Number the shooting sessions and finalize titles, then split ADVISORY items (mobility/recovery
// guidance) out of the tracked task list. Tasks render in the checklist; advisories render under the
// Pebble verdict. Titles: shooting -> "Shooting: Session N" (a session may mix dry+live phases, so the
// title names no fire mode — the brief carries the phase/skill detail); mental -> "Shooting: Mental
// Visualisation"; gym/offline keep their own label; journal -> "Daily Journal".
function finalize(items) {
  const collapsed = collapseSameSession(items);
  const fireKinds = new Set(['dry', 'live', 'match', 'skill']); // launchable shooting fire sessions
  let n = 0;
  const tasks = [];
  const advisories = [];
  for (const it of collapsed) {
    if (it.advisory) { advisories.push(it); continue; }
    if (fireKinds.has(it.kind)) {
      n += 1;
      tasks.push({ ...it, label: `Shooting: Session ${n}` });
    } else if (it.kind === 'mental') {
      tasks.push({ ...it, label: 'Shooting: Mental Visualisation' });
    } else {
      tasks.push(it);
    }
  }
  return { tasks, advisories };
}

// Returns { tasks, advisories }. `tasks` are tracked checklist sessions; `advisories` are guidance
// (mobility/recovery) the Home screen shows under the verdict instead of as tickable tasks.
export function checklistItems(mission, { date, gymTitle, scenario } = {}) {
  if (!mission) return { tasks: [], advisories: [] };

  // The permanent gym task (today's gym day from the plan; null on a rest day). Injected once, after
  // shooting, regardless of what the agent wrote — gym is a standing daily commitment.
  const gym = gymItem(date, gymTitle);
  const insertGym = (list) => {
    if (!gym) return list;
    // Place gym right after the last shooting item (before mental/journal); else at the front.
    const fireKinds = new Set(['dry', 'live', 'match', 'skill']);
    let idx = -1;
    list.forEach((it, i) => { if (fireKinds.has(it.kind)) idx = i; });
    const at = idx >= 0 ? idx + 1 : 0;
    return [...list.slice(0, at), gym, ...list.slice(at)];
  };

  // Agent owns the items + wording — enrich each by domain (its physical items become advisory /
  // offline only; the gym session itself is the permanent gymItem).
  if (Array.isArray(mission.checklist) && mission.checklist.length) {
    let enriched = mission.checklist.map((it) => enrich(it, mission, date, gymTitle, scenario)).filter(Boolean);
    // Drop any enriched gym item from the agent path (gym is injected permanently below, deduped).
    enriched = enriched.filter((i) => i.kind !== 'gym');
    enriched = insertGym(enriched);
    // If a mental session is prescribed (a scenario exists) but the agent didn't add a mental item,
    // inject one so the visualization always appears on the daily checklist (insert before check-in).
    const hasMental = enriched.some((i) => i.kind === 'mental');
    const hasScenario = !!scenario || (mission.mental && (mission.mental.scenario || mission.mental.scenario_ref));
    if (!hasMental && hasScenario) {
      const mentalItem = enrich({ domain: 'mental', label: 'Mental — visualization' }, mission, date, gymTitle, scenario);
      const checkinIdx = enriched.findIndex((i) => i.kind === 'journal');
      if (checkinIdx >= 0) enriched.splice(checkinIdx, 0, mentalItem);
      else enriched.push(mentalItem);
    }
    return finalize(enriched);
  }

  // Nothing planned yet — still show the standing gym task (unless rest), nothing else.
  if (!mission.shooting && !mission.physical && !mission.mental) {
    return finalize(gym ? [gym, enrich({ domain: 'journal', label: 'Evening check-in' }, mission, date, gymTitle, scenario)] : []);
  }

  // Fallback: derive from the mission domains, ordered shooting -> gym -> physical -> mental -> check-in.
  let items = [];
  if (mission.shooting && mission.shooting.module && mission.shooting.module !== 'rest') {
    items.push(enrich({ domain: 'shooting' }, mission, date, gymTitle, scenario));
  }
  items = insertGym(items);
  const phys = physicalItem(mission, date, gymTitle);
  if (phys) items.push(phys);
  // A prescribed mental session (a scenario exists) is its own task — the visualization block.
  if (scenario || (mission.mental && (mission.mental.scenario || mission.mental.scenario_ref))) {
    items.push(enrich({ domain: 'mental', label: 'Mental — visualization' }, mission, date, gymTitle, scenario));
  }
  items.push(enrich({ domain: 'journal', label: 'Evening check-in' }, mission, date, gymTitle, scenario));
  return finalize(items.filter(Boolean));
}
