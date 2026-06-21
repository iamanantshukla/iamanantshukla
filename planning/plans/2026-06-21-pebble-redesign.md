# Pebble Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the air-pistol training log into "Pebble" — a warm-dark, character-driven Safari web app with an agenda-first home, a new Gym tracker tab, a Shoot hub, and a restyled journal — preserving every existing feature.

**Architecture:** React 18 + react-router-dom (HashRouter) SPA. Google Drive is the datastore. Existing shooting data stays in its current Drive file; gym workouts and the "Pebble says" voice each get their own Drive file (placeholder ids). Logic lives in pure modules under `src/lib/` (TDD-tested with Vitest); presentational components under `src/components/` and `src/views/` are verified by render tests + `npm run build`.

**Tech Stack:** React 18.3, react-router-dom 6.22, Vite 5.4, Vitest 2.1 + @testing-library/react + jsdom. Plain CSS (`src/styles.css`, CSS variables). No new dependencies.

**Spec:** `planning/specs/2026-06-21-pebble-redesign-design.md`

---

## File Structure

**New — logic (`src/lib/`):**
- `auth.js` — single source of the Google access token (shared by both Drive data layers; avoids circular imports).
- `scoring.js` — **vendored** local ISSF scoring (replaces broken `../../../shared/scoring.js` re-export).
- `gymPlan.js` — hardcoded 5-day split; `dayKeyForWeekday`, `getPlanForDate`.
- `gymDates.js` — Mon–Sun week math used by WeekStrip + gym/home (`mondayOf`, `weekDays`, `localDateString`).
- `gymApi.js` — gym Drive file sync + workout CRUD + history; writes a journal gym flag on save.
- `pebbleVoice.js` — reads the Pebble-says Drive file, static fallback.

**New — components (`src/components/`):**
- `Pebble.jsx` — SVG character with `size`/`variant`/`expression`.
- `WeekStrip.jsx` — Mon–Sun day row, paged by week.
- `QuickStartSheet.jsx` — center-button bottom sheet.
- `RunningSessionBar.jsx` — pinned live timer + pause/resume.
- `SetStepper.jsx` — weight/reps stepper row (0.5 kg increments).
- `ExerciseCard.jsx` — one gym exercise card.
- `RestDayCard.jsx` — Pebble rest-day card.

**New — views (`src/views/`):**
- `Home.jsx` — today board (replaces DashboardView as landing).
- `Shoot.jsx` — hub wrapper (Session/Feed/Skills/Reviews).
- `Gym/GymToday.jsx`, `Gym/GymHistory.jsx`, `Gym/GymProgress.jsx` — gym sub-screens.

**Modified:**
- `src/styles.css` — warm-dark tokens + new component styles.
- `src/components/Icons.jsx` — add icon set (Pencil, Shoe/Run, Notebook, Plus, ChevronLeft/Right, Check, Coffee/Rest).
- `src/lib/api.js` — use `auth.js` for the token; kick gym sync on login; keep all existing behavior.
- `src/context/SessionContext.jsx` — add `liveNotes` + `addLiveNote`; include in reset.
- `src/views/ActiveSession.jsx` — in-session note affordance; pass `liveNotes` to save + summary.
- `src/components/SummaryModal.jsx` — restyle; display `liveNotes`.
- `src/components/NavBar.jsx` — 4 tabs + Pebble center button; remove FAB timer (moves to RunningSessionBar); start modal → QuickStartSheet.
- `src/App.jsx` — new routes + redirects; mount RunningSessionBar.
- `src/views/DailyJournal.jsx` — restyle + WeekStrip + show session comments/notes.
- `src/views/OldSessions.jsx`, `SkillsCatalogue.jsx`, `ReviewsView.jsx` — restyle, re-homed under Shoot; Feed merges gym workouts.

**Deleted/retired:** `DashboardView.jsx` (replaced by `Home.jsx`; remove after routes switch). `CoachView.jsx` / `TrainingPlanView.jsx` kept (reachable via Home ▸ More).

**New docs:** `UI_UPDATE.md` (repo root).

---

# Phase 0 — Foundation (build stays green)

### Task 1: Vendor ISSF scoring locally

**Files:**
- Modify: `src/lib/scoring.js`
- Test: `src/test/scoring.test.js`

- [ ] **Step 1: Replace the broken re-export with the real implementation**

Overwrite `src/lib/scoring.js` with the vendored module (copied from the sibling `shared/scoring.js`, now self-contained):

```js
// src/lib/scoring.js — ISSF 10m Air Pistol decimal scoring (pure functions, ESM).
// Vendored locally so this client builds standalone (no external shared/ dependency).

export const TEN_RING_RADIUS_MM = 5.75;   // 11.5mm diameter
export const RING_RADIUS_STEP_MM = 8;     // each integer ring is +8mm radius outward
export const PELLET_RADIUS_MM = 2.25;     // 4.5mm pellet diameter
const ONE_RING_OUTER_RADIUS_MM = TEN_RING_RADIUS_MM + 8 * RING_RADIUS_STEP_MM; // 69.75
const INNER_TEN_RADIUS_MM = 2.5;          // within this, call it "Center"

export function scoreFromDistance(distMm) {
  const edge = Math.max(0, distMm - PELLET_RADIUS_MM);
  if (edge > ONE_RING_OUTER_RADIUS_MM) return 0;
  const raw = 10.9 - (edge / RING_RADIUS_STEP_MM);
  const clamped = Math.max(0, Math.min(10.9, raw));
  return Math.round(clamped * 10) / 10;
}

const OCTANTS = ['Right', 'High-Right', 'High', 'High-Left', 'Left', 'Low-Left', 'Low', 'Low-Right'];

export function directionFromVector({ x, y }) {
  const dist = Math.hypot(x, y);
  if (dist <= INNER_TEN_RADIUS_MM) return 'Center';
  let deg = Math.atan2(y, x) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  const idx = Math.round(deg / 45) % 8;
  return OCTANTS[idx];
}

export function scoreFromMm({ x, y }) {
  const dist = Math.hypot(x, y);
  return { score: scoreFromDistance(dist), dir: directionFromVector({ x, y }) };
}
```

- [ ] **Step 2: Write real value tests** (replace whatever the file currently asserts)

```js
// src/test/scoring.test.js
import { describe, it, expect } from 'vitest';
import { scoreFromDistance, directionFromVector, scoreFromMm } from '../lib/scoring.js';

describe('scoring', () => {
  it('scores a dead-center shot at 10.9 / Center', () => {
    expect(scoreFromMm({ x: 0, y: 0 })).toEqual({ score: 10.9, dir: 'Center' });
  });
  it('drops one full point per 8mm ring step (pellet-gauged)', () => {
    // distance = pellet radius + one ring step => edge 8mm => 10.9 - 1 = 9.9
    expect(scoreFromDistance(2.25 + 8)).toBe(9.9);
  });
  it('returns 0 beyond the 1-ring outer radius', () => {
    expect(scoreFromDistance(200)).toBe(0);
  });
  it('labels direction by octant with y-up', () => {
    expect(directionFromVector({ x: 10, y: 0 })).toBe('Right');
    expect(directionFromVector({ x: 0, y: 10 })).toBe('High');
    expect(directionFromVector({ x: -10, y: 0 })).toBe('Left');
  });
});
```

- [ ] **Step 3: Run tests, expect PASS**

Run: `npm test -- src/test/scoring.test.js`
Expected: PASS (4 tests).

- [ ] **Step 4: Verify the app still builds standalone**

Run: `npm run build`
Expected: build succeeds (previously failed to resolve `../../../shared/scoring.js`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.js src/test/scoring.test.js
git commit -m "fix: vendor ISSF scoring locally so client builds standalone"
```

---

### Task 2: Warm-dark theme tokens

**Files:**
- Modify: `src/styles.css:1-14` (the `:root` block)

- [ ] **Step 1: Replace the `:root` variables**

```css
:root {
  --bg: #17140F;
  --panel: #221D17;
  --panel-2: #2A241D;
  --line: #342C22;
  --text: #F0EBE2;
  --muted: #9A8F7E;
  --accent: #FF6A3D;
  --accent-2: #E0552E;
  --good: #52C2A0;
  --warn: #FFB02E;
  --bad: #D9483B;
  --radius: 16px;
}
```

- [ ] **Step 2: Build to confirm no breakage**

Run: `npm run build`
Expected: PASS. (Existing components recolor automatically via the variables.)

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: warm-dark theme tokens (Pebble palette)"
```

---

### Task 3: Extend the icon set (remove emoji dependence)

**Files:**
- Modify: `src/components/Icons.jsx` (append new exports)

- [ ] **Step 1: Append new line-icons** (all `currentColor`, 24px default, matching the existing prop signature `{ size, className }`)

```jsx
export const IconNotebook = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M9 4v16M12 9h4M12 13h4"/>
  </svg>
);
export const IconPencil = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);
export const IconRun = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="13" cy="4" r="2"/><path d="M4 17l3-1 2-4 4 2 1 5"/><path d="M9 12l-2-3 4-2 3 3 3 1"/>
  </svg>
);
export const IconPlus = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
export const IconMinus = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
export const IconCheck = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
export const IconChevronLeft = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
export const IconChevronRight = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
export const IconRest = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 8h14a3 3 0 0 1 0 6h-1"/><path d="M3 8v9h13"/><path d="M7 4c0 1-1 1-1 2M11 4c0 1-1 1-1 2"/>
  </svg>
);
```

- [ ] **Step 2: Build to confirm valid JSX**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Icons.jsx
git commit -m "feat: add icon set to replace emoji glyphs"
```

---

### Task 4: Pebble character component

**Files:**
- Create: `src/components/Pebble.jsx`
- Test: `src/test/pebble.test.jsx`

- [ ] **Step 1: Write a render test**

```jsx
// src/test/pebble.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Pebble from '../components/Pebble.jsx';

describe('Pebble', () => {
  it('renders an svg at the requested size', () => {
    const { container } = render(<Pebble size={48} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('width')).toBe('48');
  });
  it('changes eyes for the sleepy expression without erroring', () => {
    const { container } = render(<Pebble expression="sleepy" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL** (module not found)

Run: `npm test -- src/test/pebble.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement Pebble**

```jsx
// src/components/Pebble.jsx
// The Pebble character: rounded coral pebble body, cream belly, dot eyes, triangle beak.
// variant: 'full' (body) | 'face' (head only, for tiny contexts)
// expression: 'neutral' | 'happy' | 'sleepy' | 'focused' | 'resting'
export default function Pebble({ size = 40, variant = 'full', expression = 'neutral', className = '' }) {
  const eye = (cx) => {
    if (expression === 'sleepy' || expression === 'resting') {
      return <path key={cx} d={`M${cx - 4} 46 q4 4 8 0`} fill="none" stroke="#17140F" strokeWidth="2.4" strokeLinecap="round" />;
    }
    if (expression === 'happy') {
      return <path key={cx} d={`M${cx - 4} 47 q4 -5 8 0`} fill="none" stroke="#17140F" strokeWidth="2.4" strokeLinecap="round" />;
    }
    const r = expression === 'focused' ? 2.6 : 3.6;
    return <circle key={cx} cx={cx} cy="46" r={r} fill="#17140F" />;
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="Pebble">
      <path d="M50 10 C72 10 84 28 84 52 C84 78 70 90 50 90 C30 90 16 78 16 52 C16 28 28 10 50 10 Z" fill="var(--accent)" />
      {variant === 'full' && <ellipse cx="50" cy="58" rx="20" ry="26" fill="#FBE9DD" />}
      {eye(42)}
      {eye(58)}
      <path d="M46 54 L54 54 L50 60 Z" fill="var(--warn)" />
      {expression === 'happy' && <path d="M50 8 C57 8 60 2 56 0 C53 4 50 4 50 8 Z" fill="var(--accent)" />}
    </svg>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `npm test -- src/test/pebble.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Pebble.jsx src/test/pebble.test.jsx
git commit -m "feat: Pebble character component with expressions"
```

---

# Phase 1 — Data layer (TDD, no UI yet)

### Task 5: Shared auth token module + api.js refactor

**Files:**
- Create: `src/lib/auth.js`
- Modify: `src/lib/api.js:1` and `:118-145` (token handling)

- [ ] **Step 1: Create `auth.js`**

```js
// src/lib/auth.js — single source of the Google Drive access token,
// shared by api.js (shooting) and gymApi.js (gym) without circular imports.
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };
```

- [ ] **Step 2: Refactor `api.js` to use it.** At the top, replace `let accessToken = null;` (line 1) with:

```js
import { getAccessToken, setAccessToken as setToken, clearAccessToken } from './auth.js';
```

Then replace every bare `accessToken` reference in `syncFromDrive`/`syncToDrive` with `getAccessToken()`, and update the three methods:

```js
  setAccessToken: async (token) => {
    setToken(token);
    await syncFromDrive();
  },
  // logout:
  logout: async () => {
    clearAccessToken();
    initialized = false;
  },
```

(`me()` becomes `return { authed: !!getAccessToken() && initialized };`.)

- [ ] **Step 3: Build + run existing tests**

Run: `npm run build && npm test`
Expected: PASS (no behavior change to shooting features).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.js src/lib/api.js
git commit -m "refactor: extract access token into shared auth module"
```

---

### Task 6: Gym plan data

**Files:**
- Create: `src/lib/gymPlan.js`
- Test: `src/test/gymPlan.test.js`

- [ ] **Step 1: Write tests**

```js
// src/test/gymPlan.test.js
import { describe, it, expect } from 'vitest';
import { GYM_PLAN, dayKeyForWeekday, getPlanForDate } from '../lib/gymPlan.js';

describe('gymPlan', () => {
  it('maps weekdays to the right day key (0=Sun..6=Sat)', () => {
    expect(dayKeyForWeekday(1)).toBe('day1'); // Mon
    expect(dayKeyForWeekday(2)).toBe('day2'); // Tue
    expect(dayKeyForWeekday(3)).toBe('rest'); // Wed
    expect(dayKeyForWeekday(4)).toBe('day3'); // Thu
    expect(dayKeyForWeekday(5)).toBe('day4'); // Fri
    expect(dayKeyForWeekday(6)).toBe('day5'); // Sat
    expect(dayKeyForWeekday(0)).toBe('rest'); // Sun
  });
  it('returns a workout with exercises for a training day', () => {
    const plan = getPlanForDate('2026-06-20'); // a Friday -> day4
    expect(plan.dayKey).toBe('day4');
    expect(plan.exercises.length).toBeGreaterThan(0);
    expect(plan.exercises[0]).toHaveProperty('name');
    expect(plan.exercises[0].prescription).toHaveProperty('sets');
  });
  it('returns rest for Sunday', () => {
    expect(getPlanForDate('2026-06-21').dayKey).toBe('rest'); // Sunday
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- src/test/gymPlan.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `gymPlan.js`** (full 5-day split from the spec)

```js
// src/lib/gymPlan.js — hardcoded 5-day split. Not user-editable yet (see UI_UPDATE.md).
// prescription: { sets, repMin, repMax } ; note: optional coaching cue.
const ex = (name, sets, repMin, repMax, note) => ({ name, prescription: { sets, repMin, repMax }, note: note || '' });

export const GYM_PLAN = {
  day1: { title: 'Day 1 · Lower Body Foundation & Knee Rehab', subtitle: 'Quads, Glutes & VMO',
    exercises: [
      ex('Terminal Knee Extensions (TKEs)', 4, 15, 20, 'Do first to pump blood into the knee; squeeze quad hard at lockout. Per leg.'),
      ex('Barbell Back Squats', 4, 5, 8, 'Root feet, neutral pelvis.'),
      ex('Barbell Hip Thrusts', 3, 10, 12, 'Trains glutes for the posterior pelvic lock.'),
      ex('Bulgarian Split Squats', 3, 8, 10, 'Per leg.'),
      ex('Standing Calf Raises', 4, 15, 20),
    ] },
  day2: { title: 'Day 2 · Athletic Back, Biceps & Neck Stability', subtitle: 'Lats, Rhomboids, Biceps, Cervical Spine',
    exercises: [
      ex('Pull-Ups or Lat Pulldowns', 4, 8, 10),
      ex('Barbell Rows or Pendlay Rows', 3, 8, 10),
      ex('Face Pulls', 4, 15, 15, 'Strict 3-second isometric hold at peak contraction.'),
      ex('Neck Isometric Holds', 3, 10, 15, 'Seconds per side; press palm against head and resist.'),
      ex('Dumbbell Incline Curls', 3, 10, 12),
    ] },
  day3: { title: 'Day 3 · Deep Core, Pelvic Stability & Wrist Correction', subtitle: 'Obliques, Lower Abs, Forearm',
    exercises: [
      ex('Weighted Planks (PPT Focus)', 3, 45, 60, 'Seconds. Actively squeeze glutes and tuck pelvis.'),
      ex('Dead Bugs', 3, 15, 15, 'Per side.'),
      ex("Suitcase Carries (One-Arm Farmer's Walk)", 3, 20, 20, 'Meters per side.'),
      ex('Dumbbell Radial & Ulnar Deviation', 3, 12, 15, 'Each way; pulls left-skewed wrist to neutral.'),
      ex('Pallof Press', 3, 12, 12, 'Per side.'),
    ] },
  day4: { title: 'Day 4 · Posterior Chain & Shooting Specifics', subtitle: 'Hamstrings, Rear Delts, Static Endurance',
    exercises: [
      ex('Romanian Deadlifts (RDLs)', 4, 8, 10),
      ex('Lying Leg Curls', 3, 12, 12),
      ex('Rear Delt Cable Flyes', 3, 15, 15),
      ex('Dumbbell Isometric Lateral Hold', 3, 1, 1, 'Max time in shooting stance at 90°, pelvic lock applied.'),
    ] },
  day5: { title: 'Day 5 · High-Fatigue Upper Body', subtitle: 'The Max Gap Day — Chest, Shoulders, Triceps, Grip',
    exercises: [
      ex('Barbell Bench Press', 4, 6, 8),
      ex('Seated Dumbbell Overhead Press', 3, 8, 10),
      ex('Weighted Dips or Close-Grip Bench', 3, 10, 10),
      ex('Cable Tricep Pushdowns', 3, 12, 15),
      ex("Farmer's Walks (Heavy)", 4, 30, 30, 'Meters; maximal grip fatigue.'),
      ex('Reverse Barbell Curls', 3, 12, 12),
    ] },
};

const WEEKDAY_TO_DAY = { 1: 'day1', 2: 'day2', 3: 'rest', 4: 'day3', 5: 'day4', 6: 'day5', 0: 'rest' };

export function dayKeyForWeekday(weekday) {
  return WEEKDAY_TO_DAY[weekday] ?? 'rest';
}

// dateStr 'YYYY-MM-DD' -> { dayKey, title, subtitle, exercises } ; rest day has empty exercises.
export function getPlanForDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const dayKey = dayKeyForWeekday(weekday);
  if (dayKey === 'rest') return { dayKey: 'rest', title: 'Rest day', subtitle: 'Recover', exercises: [] };
  return { dayKey, ...GYM_PLAN[dayKey] };
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- src/test/gymPlan.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gymPlan.js src/test/gymPlan.test.js
git commit -m "feat: hardcoded 5-day gym plan with weekday mapping"
```

---

### Task 7: Week/date helpers

**Files:**
- Create: `src/lib/gymDates.js`
- Test: `src/test/gymDates.test.js`

- [ ] **Step 1: Write tests**

```js
// src/test/gymDates.test.js
import { describe, it, expect } from 'vitest';
import { localDateString, mondayOf, weekDays } from '../lib/gymDates.js';

describe('gymDates', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(localDateString(new Date(2026, 5, 21))).toBe('2026-06-21'); // 21 Jun 2026 (Sun)
  });
  it('finds the Monday of the week for a Sunday', () => {
    // 21 Jun 2026 is a Sunday -> Monday is 15 Jun
    expect(localDateString(mondayOf(new Date(2026, 5, 21)))).toBe('2026-06-15');
  });
  it('finds the Monday for a mid-week day', () => {
    // 18 Jun 2026 is a Thursday -> Monday 15 Jun
    expect(localDateString(mondayOf(new Date(2026, 5, 18)))).toBe('2026-06-15');
  });
  it('returns 7 days Mon..Sun', () => {
    const days = weekDays(new Date(2026, 5, 18));
    expect(days.map(localDateString)).toEqual([
      '2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20','2026-06-21'
    ]);
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `npm test -- src/test/gymDates.test.js` → FAIL.

- [ ] **Step 3: Implement**

```js
// src/lib/gymDates.js — Monday-anchored week math for WeekStrip, Home and Gym.
export function localDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();                 // 0=Sun..6=Sat
  const diff = wd === 0 ? -6 : 1 - wd;   // shift back to Monday
  x.setDate(x.getDate() + diff);
  return x;
}
export function weekDays(d) {
  const mon = mondayOf(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return day;
  });
}
```

- [ ] **Step 4: Run, expect PASS.** Run: `npm test -- src/test/gymDates.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gymDates.js src/test/gymDates.test.js
git commit -m "feat: Monday-anchored week date helpers"
```

---

### Task 8: Gym Drive data layer

**Files:**
- Create: `src/lib/gymApi.js`
- Test: `src/test/gymApi.test.js`

- [ ] **Step 1: Write tests with mocked fetch + auth**

```js
// src/test/gymApi.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setAccessToken } from '../lib/auth.js';
import { gymApi } from '../lib/gymApi.js';

describe('gymApi', () => {
  beforeEach(() => { setAccessToken('test-token'); gymApi._reset(); });

  it('lastForExercise returns the most recent logged sets for a name', async () => {
    gymApi._seed([
      { id: 1, date: '2026-06-13', exercises: [{ name: 'Bench', sets: [{ weightKg: 60, reps: 8 }] }] },
      { id: 2, date: '2026-06-20', exercises: [{ name: 'Bench', sets: [{ weightKg: 62.5, reps: 8 }] }] },
    ]);
    const last = gymApi.lastForExercise('Bench');
    expect(last.date).toBe('2026-06-20');
    expect(last.sets[0].weightKg).toBe(62.5);
  });

  it('saveWorkout computes total volume and persists', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const w = await gymApi.saveWorkout({
      date: '2026-06-21', dayKey: 'day5', dayTitle: 'Day 5',
      exercises: [{ name: 'Bench', prescription: { sets: 4, repMin: 6, repMax: 8 }, sets: [
        { weightKg: 60, reps: 8 }, { weightKg: 60, reps: 8 },
      ] }],
      durationSeconds: 1800,
    });
    expect(w.totalVolumeKg).toBe(960); // 60*8 + 60*8
    expect(fetchMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `npm test -- src/test/gymApi.test.js` → FAIL.

- [ ] **Step 3: Implement `gymApi.js`** (mirrors `api.js` sync; placeholder file id)

```js
// src/lib/gymApi.js — gym workouts in a SEPARATE Drive file.
// NOTE: replace the placeholder file id below (tracked in UI_UPDATE.md) to enable persistence.
import { getAccessToken } from './auth.js';

const GYM_DRIVE_FILE_ID = 'PLACEHOLDER_GYM_DRIVE_FILE_ID';
let store = { workouts: [] };
let initialized = false;

async function syncFromDrive() {
  const token = getAccessToken();
  if (!token || GYM_DRIVE_FILE_ID.startsWith('PLACEHOLDER')) { initialized = true; return; }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${GYM_DRIVE_FILE_ID}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) { try { store = { workouts: [], ...(await res.json()) }; } catch { /* empty file */ } }
  initialized = true;
}
async function syncToDrive() {
  const token = getAccessToken();
  if (!token || GYM_DRIVE_FILE_ID.startsWith('PLACEHOLDER')) return;
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${GYM_DRIVE_FILE_ID}?uploadType=media`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(store),
  });
}
const genId = (seed) => `${Date.parse('2026-01-01') + store.workouts.length}-${seed || store.workouts.length}`;
const volume = (exs) => exs.reduce((t, e) => t + (e.sets || []).reduce((s, set) => s + (set.weightKg || 0) * (set.reps || 0), 0), 0);

export const gymApi = {
  init: syncFromDrive,
  listWorkouts: () => [...store.workouts].sort((a, b) => (a.date < b.date ? 1 : -1)),
  getWorkoutForDate: (date) => store.workouts.find((w) => w.date === date) || null,
  lastForExercise: (name) => {
    const matches = store.workouts
      .filter((w) => (w.exercises || []).some((e) => e.name === name))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!matches.length) return null;
    const w = matches[0];
    const e = w.exercises.find((x) => x.name === name);
    return { date: w.date, sets: e.sets || [] };
  },
  saveWorkout: async (payload) => {
    const totalVolumeKg = volume(payload.exercises || []);
    const existingIdx = store.workouts.findIndex((w) => w.date === payload.date);
    const workout = {
      id: existingIdx >= 0 ? store.workouts[existingIdx].id : genId(payload.dayKey),
      started_at: payload.started_at || `${payload.date}T00:00:00.000Z`,
      ended_at: payload.ended_at || `${payload.date}T00:00:00.000Z`,
      ...payload,
      totalVolumeKg,
    };
    if (existingIdx >= 0) store.workouts[existingIdx] = workout;
    else store.workouts.push(workout);
    await syncToDrive();
    return workout;
  },
  // test helpers
  _reset: () => { store = { workouts: [] }; initialized = false; },
  _seed: (workouts) => { store = { workouts }; initialized = true; },
};
```

- [ ] **Step 4: Run, expect PASS.** Run: `npm test -- src/test/gymApi.test.js` → PASS.

- [ ] **Step 5: Wire gym sync into login.** In `api.js` `setAccessToken`, after `await syncFromDrive();` add gym init (import at top: `import { gymApi } from './gymApi.js';`):

```js
  setAccessToken: async (token) => {
    setToken(token);
    await syncFromDrive();
    await gymApi.init();
  },
```

(No circular import: `gymApi.js` imports only `auth.js`.)

- [ ] **Step 6: Build + full test run, commit**

Run: `npm run build && npm test`
Expected: PASS.

```bash
git add src/lib/gymApi.js src/test/gymApi.test.js src/lib/api.js
git commit -m "feat: gym Drive data layer (placeholder file id)"
```

---

### Task 9: Pebble voice loader

**Files:**
- Create: `src/lib/pebbleVoice.js`
- Test: `src/test/pebbleVoice.test.js`

- [ ] **Step 1: Write tests**

```js
// src/test/pebbleVoice.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setAccessToken } from '../lib/auth.js';
import { getPebbleVoice, FALLBACK_VOICE } from '../lib/pebbleVoice.js';

describe('pebbleVoice', () => {
  beforeEach(() => setAccessToken('t'));
  it('falls back to the static line when the file is empty/unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await getPebbleVoice()).toBe(FALLBACK_VOICE);
  });
  it('returns the drive text when present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: 'Nice grip work today.' }) }));
    expect(await getPebbleVoice()).toBe('Nice grip work today.');
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `npm test -- src/test/pebbleVoice.test.js` → FAIL.

- [ ] **Step 3: Implement**

```js
// src/lib/pebbleVoice.js — the home "Pebble says" status text.
// Sourced from a SEPARATE Drive file (currently empty / placeholder; see UI_UPDATE.md).
import { getAccessToken } from './auth.js';

const PEBBLE_VOICE_FILE_ID = 'PLACEHOLDER_PEBBLE_VOICE_FILE_ID';
export const FALLBACK_VOICE = "You're doing great. Keep showing up — small honest reps add up.";

export async function getPebbleVoice() {
  const token = getAccessToken();
  if (!token || PEBBLE_VOICE_FILE_ID.startsWith('PLACEHOLDER')) return FALLBACK_VOICE;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${PEBBLE_VOICE_FILE_ID}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return FALLBACK_VOICE;
    const data = await res.json();
    return (data && data.text && String(data.text).trim()) ? data.text : FALLBACK_VOICE;
  } catch {
    return FALLBACK_VOICE;
  }
}
```

- [ ] **Step 4: Run, expect PASS.** Run: `npm test -- src/test/pebbleVoice.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pebbleVoice.js src/test/pebbleVoice.test.js
git commit -m "feat: Pebble voice loader with static fallback"
```

---

# Phase 2 — Shared components & navigation shell

### Task 10: WeekStrip component

**Files:**
- Create: `src/components/WeekStrip.jsx`
- Test: `src/test/weekStrip.test.jsx`

- [ ] **Step 1: Write a render test**

```jsx
// src/test/weekStrip.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WeekStrip from '../components/WeekStrip.jsx';

describe('WeekStrip', () => {
  it('renders 7 day buttons for the anchored week', () => {
    render(<WeekStrip anchor={new Date(2026, 5, 18)} selected="2026-06-18" onSelect={() => {}} dots={{}} />);
    // Mon..Sun dates 15..21
    ['15','16','17','18','19','20','21'].forEach((d) => expect(screen.getByText(d)).toBeTruthy());
  });
  it('calls onSelect with the date string when a day is tapped', () => {
    const onSelect = vi.fn();
    render(<WeekStrip anchor={new Date(2026, 5, 18)} selected="2026-06-18" onSelect={onSelect} dots={{}} />);
    fireEvent.click(screen.getByText('20'));
    expect(onSelect).toHaveBeenCalledWith('2026-06-20');
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `npm test -- src/test/weekStrip.test.jsx` → FAIL.

- [ ] **Step 3: Implement** (all 7 days fit width; `‹ ›` page by week; `dots` maps dateStr → 'done'|'plan'|'none')

```jsx
// src/components/WeekStrip.jsx
import { useState } from 'react';
import { weekDays, localDateString, mondayOf } from '../lib/gymDates.js';
import { IconChevronLeft, IconChevronRight } from './Icons.jsx';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function WeekStrip({ anchor = new Date(), selected, onSelect, dots = {} }) {
  const [weekAnchor, setWeekAnchor] = useState(mondayOf(anchor));
  const days = weekDays(weekAnchor);
  const today = localDateString(new Date());
  const shiftWeek = (n) => { const d = new Date(weekAnchor); d.setDate(d.getDate() + n * 7); setWeekAnchor(mondayOf(d)); };
  const range = `${days[0].getDate()}–${days[6].getDate()} ${MONTHS[days[6].getMonth()]}`;
  return (
    <div className="week-strip">
      <div className="week-strip-head">
        <span className="week-range">{range}</span>
        <span className="week-arrows">
          <button className="icon-btn" aria-label="Previous week" onClick={() => shiftWeek(-1)}><IconChevronLeft size={16} /></button>
          <button className="icon-btn" aria-label="Next week" onClick={() => shiftWeek(1)}><IconChevronRight size={16} /></button>
        </span>
      </div>
      <div className="week-row">
        {days.map((d, i) => {
          const ds = localDateString(d);
          const cls = ['week-day'];
          if (ds === today) cls.push('today');
          if (ds === selected) cls.push('selected');
          return (
            <button key={ds} className={cls.join(' ')} onClick={() => onSelect(ds)}>
              <span className="wd-name">{DOW[i]}</span>
              <span className="wd-num">{d.getDate()}</span>
              <span className={`wd-dot ${dots[ds] || 'none'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add WeekStrip styles to `src/styles.css`** (append at end)

```css
/* Week strip */
.week-strip { margin: 8px 0 4px; }
.week-strip-head { display:flex; justify-content:space-between; align-items:center; padding:4px 2px 8px; }
.week-range { font-size:.8rem; font-weight:800; color:var(--muted); }
.week-arrows { display:flex; gap:6px; }
.icon-btn { width:30px; min-height:30px; padding:0; display:grid; place-items:center; background:var(--panel); border:1px solid var(--line); color:var(--text); border-radius:9px; }
.week-row { display:flex; gap:5px; }
.week-day { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; gap:3px; background:var(--panel); border:1px solid var(--line); border-radius:13px; padding:8px 0; color:var(--text); min-height:auto; }
.week-day .wd-name { font-size:.5rem; font-weight:800; color:var(--muted); text-transform:uppercase; }
.week-day .wd-num { font-size:.95rem; font-weight:800; }
.week-day .wd-dot { width:5px; height:5px; border-radius:50%; }
.week-day .wd-dot.done { background:var(--good); }
.week-day .wd-dot.plan { background:var(--muted); opacity:.5; }
.week-day .wd-dot.none { background:transparent; }
.week-day.today { background:var(--accent); border-color:var(--accent); }
.week-day.today .wd-name, .week-day.today .wd-num { color:#fff; }
.week-day.selected:not(.today) { border-color:var(--accent); background:rgba(255,106,61,.14); }
```

- [ ] **Step 5: Run test + build**

Run: `npm test -- src/test/weekStrip.test.jsx && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/WeekStrip.jsx src/test/weekStrip.test.jsx src/styles.css
git commit -m "feat: WeekStrip Mon-Sun calendar component"
```

---

### Task 11: SetStepper component (0.5 kg increments)

**Files:**
- Create: `src/components/SetStepper.jsx`
- Test: `src/test/setStepper.test.jsx`

- [ ] **Step 1: Write tests** (weight steps by 0.5, reps by 1, no negatives)

```jsx
// src/test/setStepper.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetStepper from '../components/SetStepper.jsx';

describe('SetStepper', () => {
  it('increments weight by 0.5', () => {
    const onChange = vi.fn();
    render(<SetStepper label="Weight" unit="kg" value={62.5} step={0.5} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('increase Weight'));
    expect(onChange).toHaveBeenCalledWith(63);
  });
  it('does not go below zero', () => {
    const onChange = vi.fn();
    render(<SetStepper label="Reps" value={0} step={1} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('decrease Reps'));
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `npm test -- src/test/setStepper.test.jsx` → FAIL.

- [ ] **Step 3: Implement**

```jsx
// src/components/SetStepper.jsx
import { IconPlus, IconMinus } from './Icons.jsx';

export default function SetStepper({ label, unit, value, step = 1, onChange }) {
  const dec = () => onChange(Math.max(0, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.round((value + step) * 100) / 100);
  return (
    <div className="stepper-row">
      <span className="stepper-label">{label}</span>
      <div className="stepper-seg">
        <button aria-label={`decrease ${label}`} onClick={dec}><IconMinus size={18} /></button>
        <span className="stepper-val">{value}{unit ? <small> {unit}</small> : null}</span>
        <button aria-label={`increase ${label}`} onClick={inc}><IconPlus size={18} /></button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add stepper styles to `src/styles.css`**

```css
/* Set stepper */
.stepper-row { display:flex; align-items:center; gap:10px; margin-top:10px; }
.stepper-label { font-size:.7rem; color:var(--muted); text-transform:uppercase; font-weight:800; width:52px; }
.stepper-seg { flex:1; display:flex; align-items:center; justify-content:space-between; background:var(--bg); border:1px solid var(--line); border-radius:999px; padding:5px; }
.stepper-seg button { width:38px; height:38px; min-height:38px; padding:0; border-radius:50%; background:var(--panel-2); color:var(--accent); display:grid; place-items:center; }
.stepper-val { font-size:1rem; font-weight:800; }
.stepper-val small { font-size:.7rem; color:var(--muted); font-weight:700; }
```

- [ ] **Step 5: Run test + build, commit**

Run: `npm test -- src/test/setStepper.test.jsx && npm run build` → PASS.

```bash
git add src/components/SetStepper.jsx src/test/setStepper.test.jsx src/styles.css
git commit -m "feat: SetStepper with 0.5kg weight increments"
```

---

### Task 12: SessionContext — live notes

**Files:**
- Modify: `src/context/SessionContext.jsx`
- Test: `src/test/sessionContext.test.jsx` (extend existing)

- [ ] **Step 1: Add a test for live notes** (append to the existing describe block)

```jsx
// add inside src/test/sessionContext.test.jsx
import { act, renderHook } from '@testing-library/react';
import { SessionProvider, useSession } from '../context/SessionContext.jsx';

it('accumulates live notes during a session and clears on reset', () => {
  const wrapper = ({ children }) => <SessionProvider>{children}</SessionProvider>;
  const { result } = renderHook(() => useSession(), { wrapper });
  act(() => result.current.addLiveNote('pulled left on shot 7'));
  expect(result.current.liveNotes.map(n => n.text)).toContain('pulled left on shot 7');
  act(() => result.current.reset());
  expect(result.current.liveNotes).toEqual([]);
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `npm test -- src/test/sessionContext.test.jsx` → FAIL.

- [ ] **Step 3: Implement.** In `SessionContext.jsx`:
  - Add state: `const [liveNotes, setLiveNotes] = useState([]);` (near other useState calls).
  - Add callback:
    ```js
    const addLiveNote = useCallback((text) => {
      if (!text || !text.trim()) return;
      setLiveNotes((prev) => [...prev, { t: 0, text: text.trim() }]);
    }, []);
    ```
    (Note: avoid `Date.now()`; store insertion order. If a wall-clock stamp is wanted later, pass it from the caller.)
  - In `reset`, add `setLiveNotes([]);`.
  - Add `liveNotes, addLiveNote` to the `value` object.

- [ ] **Step 4: Run, expect PASS.** Run: `npm test -- src/test/sessionContext.test.jsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context/SessionContext.jsx src/test/sessionContext.test.jsx
git commit -m "feat: in-session live notes in SessionContext"
```

---

### Task 13: RunningSessionBar component

**Files:**
- Create: `src/components/RunningSessionBar.jsx`

- [ ] **Step 1: Implement** (pinned above nav while a session is active; shows timer + pause/resume; tap returns to Shoot)

```jsx
// src/components/RunningSessionBar.jsx
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { IconPlay, IconPause } from './Icons.jsx';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function RunningSessionBar() {
  const { running, seconds, play, pause } = useSession();
  const navigate = useNavigate();
  if (!running && seconds === 0) return null; // no active session
  return (
    <div className="running-bar" onClick={() => navigate('/shoot')}>
      <span className="running-dot" />
      <span className="running-label">{running ? 'Session running' : 'Paused'}</span>
      <span className="running-timer">{fmt(seconds)}</span>
      <button
        className="running-toggle"
        aria-label={running ? 'Pause' : 'Resume'}
        onClick={(e) => { e.stopPropagation(); running ? pause() : play(); }}
      >
        {running ? <IconPause size={18} /> : <IconPlay size={18} />}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add styles to `src/styles.css`**

```css
/* Running session bar (pinned just above bottom nav) */
.running-bar { position:fixed; left:0; right:0; bottom:80px; z-index:49; display:flex; align-items:center; gap:10px; margin:0 12px; padding:10px 14px; background:var(--panel); border:1px solid var(--accent); border-radius:14px; box-shadow:0 6px 16px rgba(0,0,0,.4); cursor:pointer; }
.running-dot { width:9px; height:9px; border-radius:50%; background:var(--accent); }
.running-label { font-weight:700; font-size:.85rem; }
.running-timer { margin-left:auto; font-weight:800; font-variant-numeric:tabular-nums; color:var(--accent); }
.running-toggle { width:38px; height:38px; min-height:38px; padding:0; border-radius:50%; display:grid; place-items:center; }
```

- [ ] **Step 3: Build, commit**

Run: `npm run build` → PASS.

```bash
git add src/components/RunningSessionBar.jsx src/styles.css
git commit -m "feat: RunningSessionBar with pause/resume timer"
```

---

### Task 14: QuickStartSheet component

**Files:**
- Create: `src/components/QuickStartSheet.jsx`

- [ ] **Step 1: Implement** (bottom sheet; starts a shooting session with mode+focus, or routes to gym/journal). Reuses SessionContext start logic from old NavBar.

```jsx
// src/components/QuickStartSheet.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { IconTarget, IconDumbbell, IconNotebook } from './Icons.jsx';

export default function QuickStartSheet({ open, onClose }) {
  const { setMode, setFocus, play } = useSession();
  const navigate = useNavigate();
  const [mode, setLocalMode] = useState('dry');     // 'dry' | 'live'
  const [focus, setLocalFocus] = useState('shot');  // 'shot' | 'skill'
  if (!open) return null;

  const startSession = () => {
    setMode(mode); setFocus(focus); play();
    onClose(); navigate('/shoot');
  };
  const go = (path) => { onClose(); navigate(path); };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" />
        <h3 className="sheet-title">Start something</h3>

        <div className="sheet-card">
          <div className="sheet-card-head"><IconTarget size={18} /> Shooting session</div>
          <div className="seg-row">
            <button className={mode === 'dry' ? '' : 'secondary'} onClick={() => setLocalMode('dry')}>Dry Fire</button>
            <button className={mode === 'live' ? '' : 'secondary'} onClick={() => setLocalMode('live')}>Live Fire</button>
          </div>
          <div className="seg-row">
            <button className={focus === 'shot' ? '' : 'secondary'} onClick={() => setLocalFocus('shot')}>Shot Calling</button>
            <button className={focus === 'skill' ? '' : 'secondary'} onClick={() => setLocalFocus('skill')}>Skill Focus</button>
          </div>
          <button className="sheet-go" onClick={startSession}>Start session</button>
        </div>

        <button className="sheet-link" onClick={() => go('/gym')}><IconDumbbell size={18} /> Today's workout</button>
        <button className="sheet-link" onClick={() => go('/journal')}><IconNotebook size={18} /> Journal entry</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add styles to `src/styles.css`**

```css
/* Quick-start bottom sheet */
.sheet-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:flex-end; z-index:60; backdrop-filter:blur(2px); }
.sheet { width:100%; background:var(--panel); border-radius:22px 22px 0 0; border:1px solid var(--line); padding:10px 16px calc(24px + env(safe-area-inset-bottom)); }
.sheet-grabber { width:40px; height:4px; border-radius:2px; background:var(--line); margin:6px auto 12px; }
.sheet-title { font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--muted); margin:0 0 12px; }
.sheet-card { background:var(--bg); border:1px solid var(--line); border-radius:16px; padding:14px; margin-bottom:12px; }
.sheet-card-head { display:flex; align-items:center; gap:8px; font-weight:800; margin-bottom:12px; }
.seg-row { display:flex; gap:8px; margin-bottom:10px; }
.seg-row button { flex:1; }
.sheet-go { width:100%; margin-top:4px; }
.sheet-link { width:100%; display:flex; align-items:center; gap:10px; justify-content:flex-start; background:var(--bg); border:1px solid var(--line); color:var(--text); margin-bottom:9px; }
```

- [ ] **Step 3: Build, commit**

Run: `npm run build` → PASS.

```bash
git add src/components/QuickStartSheet.jsx src/styles.css
git commit -m "feat: QuickStartSheet for center nav button"
```

---

### Task 15: NavBar redesign (4 tabs + Pebble center)

**Files:**
- Rewrite: `src/components/NavBar.jsx`
- Modify: `src/styles.css` (bottom nav already exists; adjust FAB → Pebble disc)

- [ ] **Step 1: Rewrite NavBar** (4 NavLinks + center Pebble button opening QuickStartSheet; remove the old timer-FAB logic — timer now lives in RunningSessionBar)

```jsx
// src/components/NavBar.jsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Pebble from './Pebble.jsx';
import QuickStartSheet from './QuickStartSheet.jsx';
import { IconHome, IconDumbbell, IconTarget, IconNotebook } from './Icons.jsx';

export default function NavBar({ onLogout }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const link = (to, Icon, label) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={23} /><span>{label}</span>
    </NavLink>
  );
  return (
    <>
      <div className="top-bar">
        <span className="brand-logo">PEBBLE</span>
        <button className="secondary logout-btn" onClick={onLogout}>Logout</button>
      </div>

      <nav className="bottom-nav">
        {link('/home', IconHome, 'Home')}
        {link('/gym', IconDumbbell, 'Gym')}
        <div className="nav-fab-container">
          <button className="nav-fab pebble-fab" aria-label="Quick start" onClick={() => setSheetOpen(true)}>
            <Pebble size={40} variant="face" expression="happy" />
          </button>
        </div>
        {link('/shoot', IconTarget, 'Shoot')}
        {link('/journal', IconNotebook, 'Journal')}
      </nav>

      <QuickStartSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Adjust the FAB style** in `src/styles.css` (replace the `.nav-fab` background block so the Pebble disc reads cleanly). Add:

```css
.nav-fab.pebble-fab { background:var(--accent); border:4px solid var(--bg); display:grid; place-items:center; padding:0; }
.nav-fab.pebble-fab:hover { transform:scale(1.05); }
```

- [ ] **Step 3: Build, commit**

Run: `npm run build` → PASS.

```bash
git add src/components/NavBar.jsx src/styles.css
git commit -m "feat: 4-tab nav with Pebble center button"
```

---

### Task 16: App routing + redirects + RunningSessionBar mount

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Rewrite the routes block** (new homes + redirects from old paths; mount RunningSessionBar inside the router)

```jsx
// src/App.jsx — replace imports of view components and the <Routes> block.
import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api.js';
import { SessionProvider } from './context/SessionContext.jsx';
import PasswordGate from './components/PasswordGate.jsx';
import LockGate from './components/LockGate.jsx';
import NavBar from './components/NavBar.jsx';
import RunningSessionBar from './components/RunningSessionBar.jsx';
import Home from './views/Home.jsx';
import Shoot from './views/Shoot.jsx';
import GymToday from './views/Gym/GymToday.jsx';
import GymHistory from './views/Gym/GymHistory.jsx';
import GymProgress from './views/Gym/GymProgress.jsx';
import DailyJournal from './views/DailyJournal.jsx';
import CoachView from './views/CoachView.jsx';
import TrainingPlanView from './views/TrainingPlanView.jsx';

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [lockOwner, setLockOwner] = useState(null);
  useEffect(() => {
    api.me().then((r) => { setAuthed(r.authed); if (r.authed) setLockOwner(api.getLockOwner()); })
      .catch(() => setAuthed(false));
  }, []);
  if (authed === null) return <div className="loading">Loading…</div>;
  if (!authed) return <PasswordGate onAuthed={() => { setAuthed(true); setLockOwner(api.getLockOwner()); }} />;
  if (lockOwner !== 'hosted') return <LockGate owner={lockOwner} onLocked={() => setLockOwner('hosted')} />;

  return (
    <HashRouter>
      <SessionProvider>
        <NavBar onLogout={async () => { await api.logout(); setAuthed(false); }} />
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/gym" element={<GymToday />} />
            <Route path="/gym/history" element={<GymHistory />} />
            <Route path="/gym/progress" element={<GymProgress />} />
            <Route path="/shoot" element={<Shoot />} />
            <Route path="/journal" element={<DailyJournal />} />
            <Route path="/coach" element={<CoachView />} />
            <Route path="/plan" element={<TrainingPlanView />} />
            {/* redirects from old paths so existing hash links keep working */}
            <Route path="/dashboard" element={<Navigate to="/home" replace />} />
            <Route path="/active" element={<Navigate to="/shoot" replace />} />
            <Route path="/sessions" element={<Navigate to="/shoot?tab=feed" replace />} />
            <Route path="/skills" element={<Navigate to="/shoot?tab=skills" replace />} />
          </Routes>
        </main>
        <RunningSessionBar />
      </SessionProvider>
    </HashRouter>
  );
}
```

- [ ] **Step 2: Build will fail until Home/Shoot/Gym views exist** — that's expected; the next tasks create them. Do NOT commit yet. Proceed to Task 17.

---

# Phase 3 — Views (each ends green)

### Task 17: Home view (today board)

**Files:**
- Create: `src/views/Home.jsx`

- [ ] **Step 1: Implement** (header + Pebble + WeekStrip + "Pebble says" + agenda + week stats; gym days clamped to 5)

```jsx
// src/views/Home.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { gymApi } from '../lib/gymApi.js';
import { getPlanForDate } from '../lib/gymPlan.js';
import { getPebbleVoice, FALLBACK_VOICE } from '../lib/pebbleVoice.js';
import { localDateString } from '../lib/gymDates.js';
import Pebble from '../components/Pebble.jsx';
import WeekStrip from '../components/WeekStrip.jsx';
import { IconDumbbell, IconTarget, IconNotebook, IconChevronRight } from '../components/Icons.jsx';

export default function Home() {
  const navigate = useNavigate();
  const today = localDateString(new Date());
  const [selected, setSelected] = useState(today);
  const [voice, setVoice] = useState(FALLBACK_VOICE);
  const [stats, setStats] = useState(null);

  useEffect(() => { getPebbleVoice().then(setVoice); }, []);
  useEffect(() => { api.getStats(selected).then(setStats).catch(() => {}); }, [selected]);

  const plan = getPlanForDate(selected);
  const isFuture = selected > today;
  const greeting = selected === today ? 'Today' : (isFuture ? 'Looking ahead' : 'Past day');
  const week = stats?.week;
  const gymDays = Math.min(5, week?.gym?.sessions || 0); // capped at 5/week

  const agendaTitle = plan.dayKey === 'rest' ? 'Rest day — recover' : plan.title;

  return (
    <div className="home">
      <header className="home-head">
        <Pebble size={40} expression="happy" />
        <div>
          <div className="home-date muted">{new Date(selected + 'T00:00:00').toDateString()}</div>
          <h1 className="home-greet">Morning, Anant</h1>
        </div>
      </header>

      <WeekStrip anchor={new Date(selected + 'T00:00:00')} selected={selected} onSelect={setSelected} dots={{}} />

      <div className="says-card">
        <div className="says-tag"><Pebble size={18} variant="face" /> Pebble says</div>
        <div className="says-text">{voice}</div>
      </div>

      <div className="section-label">{greeting}</div>
      <button className="agenda-row" onClick={() => navigate('/gym')}>
        <span className="agenda-ic accent"><IconDumbbell size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">{agendaTitle}</span>
          <span className="agenda-s">{plan.exercises.length ? `${plan.exercises.length} exercises` : 'No workout today'}</span></span>
        <IconChevronRight size={18} className="agenda-chev" />
      </button>
      <button className="agenda-row" onClick={() => navigate('/shoot')}>
        <span className="agenda-ic good"><IconTarget size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">Shooting session</span>
          <span className="agenda-s">Tap to start</span></span>
        <IconChevronRight size={18} className="agenda-chev" />
      </button>
      <button className="agenda-row" onClick={() => navigate('/journal')}>
        <span className="agenda-ic warn"><IconNotebook size={18} /></span>
        <span className="agenda-body"><span className="agenda-t">Daily journal</span>
          <span className="agenda-s">Sleep, run, notes</span></span>
        <IconChevronRight size={18} className="agenda-chev" />
      </button>

      <div className="section-label">This week</div>
      <div className="home-tiles">
        <Tile v={week?.sleep?.avgHours ?? 0} u="h" l="Avg sleep" />
        <Tile v={week?.sessions?.totalShots ?? 0} l="Shots" />
        <Tile v={gymDays} l="Gym days" />
        <Tile v={week?.running?.kms ?? 0} u="km" l="Run" />
      </div>

      <button className="more-link" onClick={() => navigate('/coach')}>More · Coach &amp; Plan</button>
    </div>
  );
}
function Tile({ v, u, l }) {
  return <div className="home-tile"><div className="tile-v">{v}{u ? <small> {u}</small> : null}</div><div className="tile-l">{l}</div></div>;
}
```

- [ ] **Step 2: Add Home styles to `src/styles.css`**

```css
/* Home */
.home-head { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
.home-greet { font-size:1.15rem; font-weight:800; margin:1px 0 0; }
.home-date { font-size:.7rem; }
.says-card { background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:13px 14px; margin-top:8px; }
.says-tag { display:flex; align-items:center; gap:6px; font-size:.6rem; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--accent); margin-bottom:6px; }
.says-text { font-size:.82rem; line-height:1.5; color:var(--text); }
.section-label { font-size:.6rem; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; color:var(--muted); margin:18px 0 9px; }
.agenda-row { width:100%; display:flex; align-items:center; gap:11px; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:12px; margin-bottom:9px; color:var(--text); text-align:left; }
.agenda-ic { width:32px; height:32px; border-radius:9px; display:grid; place-items:center; flex:none; }
.agenda-ic.accent { background:rgba(255,106,61,.16); color:var(--accent); }
.agenda-ic.good { background:rgba(82,194,160,.16); color:var(--good); }
.agenda-ic.warn { background:rgba(255,176,46,.16); color:var(--warn); }
.agenda-body { display:flex; flex-direction:column; }
.agenda-t { font-size:.85rem; font-weight:700; }
.agenda-s { font-size:.7rem; color:var(--muted); margin-top:2px; }
.agenda-chev { margin-left:auto; color:var(--muted); }
.home-tiles { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.home-tile { background:var(--panel); border:1px solid var(--line); border-radius:13px; padding:12px; }
.tile-v { font-size:1.2rem; font-weight:800; color:var(--accent); }
.tile-v small { font-size:.7rem; color:var(--muted); }
.tile-l { font-size:.6rem; color:var(--muted); margin-top:4px; text-transform:uppercase; letter-spacing:.5px; }
.more-link { width:100%; margin-top:18px; background:transparent; border:1px solid var(--line); color:var(--muted); }
```

- [ ] **Step 3: Build** — still fails until Shoot + Gym views exist. Proceed.

- [ ] **Step 4: Commit (after Task 20 build passes; see note).** Hold commit; continue.

---

### Task 18: Shoot hub view

**Files:**
- Create: `src/views/Shoot.jsx`
- Reuse: `ActiveSession`, `OldSessions`, `SkillsCatalogue`, `ReviewsView` (rendered inside sub-tabs)

- [ ] **Step 1: Implement** (sub-tab state seeded from `?tab=` query; default Session)

```jsx
// src/views/Shoot.jsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ActiveSession from './ActiveSession.jsx';
import OldSessions from './OldSessions.jsx';
import SkillsCatalogue from './SkillsCatalogue.jsx';
import ReviewsView from './ReviewsView.jsx';

const TABS = [
  { key: 'session', label: 'Session' },
  { key: 'feed', label: 'Feed' },
  { key: 'skills', label: 'Skills' },
  { key: 'reviews', label: 'Reviews' },
];

export default function Shoot() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'session');
  return (
    <div className="shoot-hub">
      <h1 className="hub-title">10m Air Pistol</h1>
      <div className="hub-subtabs">
        {TABS.map(t => (
          <button key={t.key} className={`hub-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: tab === 'session' ? 'block' : 'none' }}><ActiveSession /></div>
      {tab === 'feed' && <OldSessions />}
      {tab === 'skills' && <SkillsCatalogue />}
      {tab === 'reviews' && <ReviewsView />}
    </div>
  );
}
```

(Session stays mounted via `display:none` to preserve its in-progress state; the others mount on demand.)

- [ ] **Step 2: Add hub styles to `src/styles.css`**

```css
/* Shoot hub */
.hub-title { font-size:1.3rem; font-weight:800; margin:0 0 4px; }
.hub-subtabs { display:flex; gap:7px; overflow-x:auto; margin:12px 0 16px; }
.hub-tab { font-size:.78rem; font-weight:800; padding:8px 13px; border-radius:999px; background:var(--panel); border:1px solid var(--line); color:var(--muted); white-space:nowrap; min-height:auto; }
.hub-tab.active { background:rgba(255,106,61,.16); border-color:var(--accent); color:var(--accent); }
```

- [ ] **Step 3: Build** — fails until Gym views exist. Proceed.

---

### Task 19: Gym Today view (progress bar + exercise cards)

**Files:**
- Create: `src/components/ExerciseCard.jsx`
- Create: `src/components/RestDayCard.jsx`
- Create: `src/views/Gym/GymToday.jsx`

- [ ] **Step 1: Implement `RestDayCard.jsx`**

```jsx
// src/components/RestDayCard.jsx
import Pebble from './Pebble.jsx';
export default function RestDayCard({ onLogAnyway }) {
  return (
    <div className="rest-card">
      <Pebble size={64} expression="resting" />
      <h2>Rest day</h2>
      <p className="muted">Recover well — sleep, mobility, light walk. Pebble's taking it easy too.</p>
      <button className="secondary" onClick={onLogAnyway}>Log a workout anyway</button>
    </div>
  );
}
```

- [ ] **Step 2: Implement `ExerciseCard.jsx`** (last-session reference, green-outline done pills, current-set steppers, Log set)

```jsx
// src/components/ExerciseCard.jsx
import { useState } from 'react';
import SetStepper from './SetStepper.jsx';
import { gymApi } from '../lib/gymApi.js';
import { IconCheck } from './Icons.jsx';

export default function ExerciseCard({ exercise, sets, onLogSet }) {
  const last = gymApi.lastForExercise(exercise.name);
  const lastText = last ? last.sets.map(s => `${s.weightKg}kg × ${s.reps}`).join(', ') : 'No previous data';
  const startWeight = last?.sets?.[0]?.weightKg ?? 0;
  const startReps = last?.sets?.[0]?.reps ?? exercise.prescription.repMin;
  const [weight, setWeight] = useState(startWeight);
  const [reps, setReps] = useState(startReps);
  const p = exercise.prescription;

  return (
    <div className="ex-card">
      <div className="ex-head">
        <div><div className="ex-name">{exercise.name}</div>
          <div className="ex-presc">{p.sets} × {p.repMin}{p.repMax !== p.repMin ? `–${p.repMax}` : ''} reps</div></div>
        <span className="ex-count">{sets.length} / {p.sets}</span>
      </div>
      {exercise.note ? <div className="ex-note">{exercise.note}</div> : null}
      <div className="ex-last">Last: {lastText}</div>

      {sets.map((s, i) => (
        <div className="set-pill" key={i}><span>{s.weightKg} kg × {s.reps}</span><span className="set-check"><IconCheck size={13} /></span></div>
      ))}

      <div className="ex-divider" />
      <div className="now-label">Set {sets.length + 1}</div>
      <SetStepper label="Weight" unit="kg" value={weight} step={0.5} onChange={setWeight} />
      <SetStepper label="Reps" value={reps} step={1} onChange={setReps} />
      <button className="log-set" onClick={() => onLogSet({ weightKg: weight, reps })}>Log set {sets.length + 1}</button>
    </div>
  );
}
```

- [ ] **Step 3: Implement `GymToday.jsx`** (progress bar + horizontal card scroller + finish)

```jsx
// src/views/Gym/GymToday.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlanForDate } from '../../lib/gymPlan.js';
import { gymApi } from '../../lib/gymApi.js';
import { api } from '../../lib/api.js';
import { localDateString } from '../../lib/gymDates.js';
import ExerciseCard from '../../components/ExerciseCard.jsx';
import RestDayCard from '../../components/RestDayCard.jsx';
import { IconChevronRight } from '../../components/Icons.jsx';

export default function GymToday() {
  const navigate = useNavigate();
  const today = localDateString(new Date());
  const plan = getPlanForDate(today);
  const [forceLog, setForceLog] = useState(false);
  // logged[name] = array of {weightKg, reps}
  const [logged, setLogged] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const exercises = plan.exercises;
  const totalPlannedSets = useMemo(() => exercises.reduce((t, e) => t + e.prescription.sets, 0), [exercises]);
  const doneSets = Object.values(logged).reduce((t, arr) => t + arr.length, 0);
  const totalVolume = Object.values(logged).flat().reduce((t, s) => t + s.weightKg * s.reps, 0);

  if (plan.dayKey === 'rest' && !forceLog) return <RestDayCard onLogAnyway={() => setForceLog(true)} />;

  const logSet = (name, set) => setLogged((prev) => ({ ...prev, [name]: [...(prev[name] || []), set] }));

  const finish = async () => {
    setSaving(true);
    try {
      await gymApi.saveWorkout({
        date: today, dayKey: plan.dayKey, dayTitle: plan.title,
        exercises: exercises.map((e, i) => ({ name: e.name, prescription: e.prescription, order: i, sets: logged[e.name] || [] })),
        durationSeconds: 0,
      });
      // Mark the journal gym flag for this date so Home's "gym days" stat stays accurate
      // (Home counts journals where gym===true; see api.calculateStats). Preserve other fields.
      const existing = await api.getJournal(today);
      await api.saveJournal(today, { ...existing, gym: true, gym_muscles: existing.gym_muscles || plan.subtitle });
      setSavedMsg('Workout saved.');
    } catch (e) { setSavedMsg(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="gym-today">
      <div className="gym-head">
        <div className="muted gym-date">{new Date(today + 'T00:00:00').toDateString()}</div>
        <h1 className="gym-title">{plan.title}</h1>
        <div className="muted gym-sub">{plan.subtitle}</div>
      </div>

      <div className="gym-progress">
        <div className="gp-top"><span className="gp-label">Workout progress</span><span className="gp-val">{doneSets} / {totalPlannedSets} sets</span></div>
        <div className="gp-bar"><i style={{ width: totalPlannedSets ? `${Math.min(100, (doneSets / totalPlannedSets) * 100)}%` : '0%' }} /></div>
        <div className="gp-sub muted">{Math.round(totalVolume)} kg lifted</div>
      </div>

      <div className="gym-subnav">
        <button className="secondary" onClick={() => navigate('/gym/history')}>History</button>
        <button className="secondary" onClick={() => navigate('/gym/progress')}>Progress</button>
      </div>

      <div className="ex-scroller">
        {exercises.map((e) => (
          <ExerciseCard key={e.name} exercise={e} sets={logged[e.name] || []} onLogSet={(set) => logSet(e.name, set)} />
        ))}
      </div>

      <button className="finish-workout" onClick={finish} disabled={saving || doneSets === 0}>
        {saving ? 'Saving…' : 'Finish workout'}
      </button>
      {savedMsg && <p className="muted" style={{ textAlign: 'center' }}>{savedMsg}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Add gym styles to `src/styles.css`**

```css
/* Gym today */
.gym-title { font-size:1.2rem; font-weight:800; margin:2px 0; }
.gym-date, .gym-sub { font-size:.72rem; }
.gym-progress { margin:14px 0; }
.gp-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:7px; }
.gp-label { font-size:.6rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--muted); }
.gp-val { font-size:.75rem; font-weight:800; color:var(--accent); }
.gp-bar { height:9px; background:var(--panel-2); border-radius:999px; overflow:hidden; }
.gp-bar i { display:block; height:100%; background:linear-gradient(90deg,var(--accent),var(--warn)); border-radius:999px; transition:width .3s ease; }
.gp-sub { font-size:.7rem; margin-top:6px; }
.gym-subnav { display:flex; gap:8px; margin-bottom:12px; }
.gym-subnav button { flex:1; }
.ex-scroller { display:flex; gap:14px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:6px; }
.ex-card { scroll-snap-align:center; flex:0 0 290px; background:var(--panel); border:1px solid var(--line); border-radius:20px; padding:16px; }
.ex-head { display:flex; justify-content:space-between; align-items:flex-start; }
.ex-name { font-size:.95rem; font-weight:800; }
.ex-presc { font-size:.72rem; color:var(--muted); margin-top:3px; }
.ex-count { font-size:.62rem; font-weight:800; color:var(--muted); background:var(--bg); border:1px solid var(--line); border-radius:999px; padding:4px 9px; }
.ex-note { font-size:.68rem; color:var(--warn); margin-top:8px; }
.ex-last { font-size:.7rem; color:var(--muted); margin-top:9px; }
.set-pill { display:flex; align-items:center; justify-content:space-between; border:1.5px solid var(--good); color:var(--good); background:rgba(82,194,160,.07); border-radius:12px; padding:10px 12px; font-weight:800; font-size:.82rem; margin-top:9px; }
.set-check { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--good); display:grid; place-items:center; }
.ex-divider { height:1px; background:var(--line); margin:14px 0 4px; }
.now-label { font-size:.6rem; font-weight:800; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin-top:8px; }
.log-set { width:100%; margin-top:13px; }
.finish-workout { width:100%; margin-top:16px; }
.rest-card { text-align:center; padding:40px 20px; display:flex; flex-direction:column; align-items:center; gap:12px; }
```

- [ ] **Step 5: Build** — still fails until GymHistory + GymProgress exist. Proceed to Task 20.

---

### Task 20: Gym History & Progress views

**Files:**
- Create: `src/views/Gym/GymHistory.jsx`
- Create: `src/views/Gym/GymProgress.jsx`

- [ ] **Step 1: Implement `GymHistory.jsx`**

```jsx
// src/views/Gym/GymHistory.jsx
import { gymApi } from '../../lib/gymApi.js';
export default function GymHistory() {
  const workouts = gymApi.listWorkouts();
  return (
    <div>
      <h1 className="hub-title">Gym history</h1>
      {workouts.length === 0 && <p className="muted">No workouts logged yet.</p>}
      {workouts.map((w) => (
        <div className="card" key={w.id} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{w.dayTitle}</strong><span className="muted">{w.date}</span>
          </div>
          <div className="muted" style={{ fontSize: '.75rem', marginTop: 6 }}>
            {w.exercises.filter(e => (e.sets || []).length).map(e => e.name).join(' · ') || 'No sets logged'}
          </div>
          <div className="muted" style={{ fontSize: '.75rem', marginTop: 4 }}>{Math.round(w.totalVolumeKg)} kg total</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement `GymProgress.jsx`** (per-exercise last vs best weight)

```jsx
// src/views/Gym/GymProgress.jsx
import { gymApi } from '../../lib/gymApi.js';
import { GYM_PLAN } from '../../lib/gymPlan.js';

function maxWeight(name) {
  let best = 0, lastDate = null, lastBest = 0;
  gymApi.listWorkouts().forEach((w) => {
    const e = (w.exercises || []).find(x => x.name === name);
    if (!e) return;
    const top = Math.max(0, ...(e.sets || []).map(s => s.weightKg || 0));
    if (top > best) best = top;
    if (!lastDate) { lastDate = w.date; lastBest = top; } // listWorkouts is newest-first
  });
  return { best, last: lastBest, lastDate };
}

export default function GymProgress() {
  const names = [...new Set(Object.values(GYM_PLAN).flatMap(d => d.exercises.map(e => e.name)))];
  return (
    <div>
      <h1 className="hub-title">Progress</h1>
      {names.map((name) => {
        const { best, last, lastDate } = maxWeight(name);
        return (
          <div className="card" key={name} style={{ marginBottom: 10 }}>
            <strong style={{ fontSize: '.9rem' }}>{name}</strong>
            <div className="muted" style={{ fontSize: '.75rem', marginTop: 6 }}>
              Last: {last ? `${last} kg (${lastDate})` : '—'} · Best: {best ? `${best} kg` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Build the whole app — expect PASS now** (Home, Shoot, Gym×3 all exist)

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit the routing + all new views together**

```bash
git add src/App.jsx src/views/Home.jsx src/views/Shoot.jsx src/views/Gym/ src/components/ExerciseCard.jsx src/components/RestDayCard.jsx src/styles.css
git commit -m "feat: Home board, Shoot hub, Gym tab (today/history/progress)"
```

---

### Task 21: In-session notes in ActiveSession

**Files:**
- Modify: `src/views/ActiveSession.jsx`

- [ ] **Step 1: Add a collapsible note field + pass notes to save.** Near the top of the component add state and a handler:

```jsx
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const addNote = () => { if (noteText.trim()) { s.addLiveNote(noteText); setNoteText(''); setNoteOpen(false); } };
```

In the `.subtabs` row, add a "Note" button before "Finish Session":

```jsx
        <button className="secondary" onClick={() => setNoteOpen(o => !o)}>+ Note</button>
```

Right under the subtabs, render the field and the running note list:

```jsx
      {noteOpen && (
        <div className="live-note">
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="What did you feel this shot? (e.g. pulled left, grip slipped)" />
          <button onClick={addNote}>Save note</button>
        </div>
      )}
      {s.liveNotes.length > 0 && (
        <ul className="live-note-list">{s.liveNotes.map((n, i) => <li key={i}>{n.text}</li>)}</ul>
      )}
```

- [ ] **Step 2: Include notes in the saved payload.** In `save()`, add `live_notes: s.liveNotes,` to the `api.saveSession({...})` object.

- [ ] **Step 3: Pass notes into the summary.** Update the `<SummaryModal ... />` props to include `liveNotes={s.liveNotes}`.

- [ ] **Step 4: Add styles to `src/styles.css`**

```css
.live-note { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:12px; margin-bottom:14px; }
.live-note textarea { min-height:64px; margin-bottom:8px; }
.live-note-list { list-style:none; padding:0; margin:0 0 16px; }
.live-note-list li { background:var(--panel-2); border-left:3px solid var(--accent); border-radius:8px; padding:8px 12px; margin-bottom:6px; font-size:.82rem; }
```

- [ ] **Step 5: Build + run tests, commit**

Run: `npm run build && npm test` → PASS.

```bash
git add src/views/ActiveSession.jsx src/styles.css
git commit -m "feat: in-session shot notes in active session"
```

---

### Task 22: SummaryModal — show live notes (keep end-of-session comment)

**Files:**
- Modify: `src/components/SummaryModal.jsx`

- [ ] **Step 1: Accept and render live notes.** Add `liveNotes = []` to the destructured props. Just above the "Session Comments" `form-group`, insert:

```jsx
        {liveNotes.length > 0 && (
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px' }}>In-session notes</label>
            <ul className="live-note-list">{liveNotes.map((n, i) => <li key={i}>{n.text}</li>)}</ul>
          </div>
        )}
```

(The existing "Session Comments" textarea and Save flow are unchanged — the end-of-session overall comment stays.)

- [ ] **Step 2: Build, commit**

Run: `npm run build` → PASS.

```bash
git add src/components/SummaryModal.jsx
git commit -m "feat: show in-session notes in session summary"
```

---

### Task 23: Journal restyle — WeekStrip + session comments reference

**Files:**
- Modify: `src/views/DailyJournal.jsx`

- [ ] **Step 1: Replace the prev/next day bar with WeekStrip.** Import `WeekStrip` and `localDateString` from `../components/WeekStrip.jsx` / `../lib/gymDates.js`. Replace the `.subtabs` date-nav block (lines ~76-81) with:

```jsx
      <WeekStrip
        anchor={dateObj}
        selected={dateStr}
        onSelect={(ds) => setDateObj(new Date(ds + 'T00:00:00'))}
        dots={{}}
      />
```

(Keep `dateObj`/`dateStr` state; `getLocalDateString` can be replaced by `localDateString` import, or left as-is.)

- [ ] **Step 2: Surface session comments + live notes as reference** when writing the journal. In the "Activities on this day" column, for each session card that has `comments` or `live_notes`, show them (comments block already exists; add notes):

```jsx
                {s.live_notes && s.live_notes.length > 0 && (
                  <ul className="live-note-list" style={{ marginTop: 8 }}>
                    {s.live_notes.map((n, i) => <li key={i}>{n.text}</li>)}
                  </ul>
                )}
```

- [ ] **Step 3: Build, commit**

Run: `npm run build` → PASS.

```bash
git add src/views/DailyJournal.jsx
git commit -m "feat: journal uses WeekStrip and surfaces session notes"
```

---

### Task 24: Feed merges gym workouts + restyle pass

**Files:**
- Modify: `src/views/OldSessions.jsx`

- [ ] **Step 1: Merge gym workouts into the feed.** Import `gymApi`. After loading shooting sessions, build a combined, date-sorted list where gym workouts render as activity cards (dumbbell icon, day title, total kg, set count) and shooting sessions render as today. Concretely, where the component maps sessions, also map `gymApi.listWorkouts()` into cards and interleave by date (both have a date/started_at; sort descending). Add a `type` discriminator so each renders its own card body.

```jsx
// sketch — adapt to the file's existing structure:
import { gymApi } from '../lib/gymApi.js';
// ...
const gymItems = gymApi.listWorkouts().map(w => ({ kind: 'gym', date: w.date, w }));
const shotItems = sessions.map(s => ({ kind: 'shot', date: (s.started_at || s.date || '').split('T')[0], s }));
const feed = [...gymItems, ...shotItems].sort((a, b) => (a.date < b.date ? 1 : -1));
// render: feed.map(item => item.kind === 'gym' ? <GymCard .../> : <ExistingSessionCard .../>)
```

Render a simple gym card inline:

```jsx
// gym card body
<div className="card feed-card" key={`g-${item.w.id}`} style={{ marginBottom: 16 }}>
  <div style={{ display:'flex', justifyContent:'space-between' }}>
    <strong>{item.w.dayTitle}</strong><span className="muted">{item.date}</span>
  </div>
  <div className="muted" style={{ fontSize:'.8rem', marginTop:8 }}>
    {item.w.exercises.filter(e => (e.sets||[]).length).length} exercises · {Math.round(item.w.totalVolumeKg)} kg
  </div>
</div>
```

- [ ] **Step 2: Build, commit**

Run: `npm run build` → PASS.

```bash
git add src/views/OldSessions.jsx
git commit -m "feat: activity feed includes gym workouts"
```

---

### Task 25: Remove dead DashboardView, verify no stale imports

**Files:**
- Delete: `src/views/DashboardView.jsx`

- [ ] **Step 1: Confirm nothing imports it**

Run: `grep -rn "DashboardView" src/`
Expected: no results (App.jsx no longer references it after Task 16).

- [ ] **Step 2: Delete the file and build**

```bash
git rm src/views/DashboardView.jsx
npm run build
```
Expected: build PASS.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove DashboardView (replaced by Home)"
```

---

### Task 25b: Reorder exercises within a day (persisted)

**Files:**
- Modify: `src/lib/gymApi.js` (add order override get/set)
- Test: `src/test/gymApi.test.js` (extend)
- Modify: `src/views/Gym/GymToday.jsx` (apply order + up/down controls)

- [ ] **Step 1: Add a test for order persistence** (append to the existing describe block)

```js
it('persists a per-day exercise order override', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  await gymApi.setOrder('day5', ['Reverse Barbell Curls', 'Barbell Bench Press']);
  expect(gymApi.getOrder('day5')).toEqual(['Reverse Barbell Curls', 'Barbell Bench Press']);
  expect(gymApi.getOrder('day1')).toEqual([]); // none set
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `npm test -- src/test/gymApi.test.js` → FAIL.

- [ ] **Step 3: Implement in `gymApi.js`.** Add `orderOverrides: {}` to the initial `store` (i.e. `let store = { workouts: [], orderOverrides: {} };` and in `_reset`/`_seed` and the `syncFromDrive` default spread, ensure `orderOverrides` defaults to `{}`). Add two methods to the `gymApi` object:

```js
  getOrder: (dayKey) => store.orderOverrides?.[dayKey] || [],
  setOrder: async (dayKey, names) => {
    store.orderOverrides = { ...(store.orderOverrides || {}), [dayKey]: names };
    await syncToDrive();
  },
```

Also update `_seed` to preserve overrides: `_seed: (workouts, orderOverrides = {}) => { store = { workouts, orderOverrides }; initialized = true; }`.

- [ ] **Step 4: Run, expect PASS.** Run: `npm test -- src/test/gymApi.test.js` → PASS.

- [ ] **Step 5: Apply the order + add up/down controls in `GymToday.jsx`.** After computing `plan`, derive an ordered exercise list and keep it in state:

```jsx
  const applyOrder = (exs, dayKey) => {
    const order = gymApi.getOrder(dayKey);
    if (!order.length) return exs;
    const byName = Object.fromEntries(exs.map((e) => [e.name, e]));
    const ordered = order.map((n) => byName[n]).filter(Boolean);
    exs.forEach((e) => { if (!order.includes(e.name)) ordered.push(e); }); // append any new
    return ordered;
  };
  const [orderedExercises, setOrderedExercises] = useState(() => applyOrder(plan.exercises, plan.dayKey));

  const move = (idx, dir) => {
    const next = [...orderedExercises];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrderedExercises(next);
    gymApi.setOrder(plan.dayKey, next.map((e) => e.name));
  };
```

Then replace `exercises.map(...)` in the scroller with `orderedExercises.map((e, idx) => ...)` and pass `onMoveUp={() => move(idx, -1)}` / `onMoveDown={() => move(idx, 1)}` to `ExerciseCard`. In `ExerciseCard.jsx`, add two small buttons in `.ex-head` (e.g. `‹`/`›` or up/down chevrons via `IconChevronLeft`/`IconChevronRight` rotated) that call those props. (`totalPlannedSets` and the progress math stay based on `exercises`/`orderedExercises` — both have the same prescriptions, so totals are unchanged.)

- [ ] **Step 6: Build + tests, commit**

Run: `npm run build && npm test` → PASS.

```bash
git add src/lib/gymApi.js src/test/gymApi.test.js src/views/Gym/GymToday.jsx src/components/ExerciseCard.jsx
git commit -m "feat: reorder exercises within a gym day (persisted)"
```

---

# Phase 4 — Docs & final verification

### Task 26: UI_UPDATE.md

**Files:**
- Create: `UI_UPDATE.md` (repo root)

- [ ] **Step 1: Write the file**

```markdown
# UI Update Log — Pebble Redesign

## Done
- Warm-dark theme tokens (coral accent replacing Strava orange).
- Pebble character (SVG, expressions) — header, "Pebble says", nav center button, rest card.
- No emojis in UI — replaced with SVG line-icons (`Icons.jsx`).
- 4-tab nav (Home · Gym · Pebble center · Shoot · Journal) + quick-start sheet.
- Home "today board": week strip (Mon–Sun, paged), Pebble-says voice, agenda, weekly stats.
- Gym tab: hardcoded 5-day plan, swipeable exercise cards, 0.5 kg steppers, green-outline done pills, progress bar, history & progress sub-screens, rest-day card.
- Shoot hub: Session / Feed / Skills / Reviews sub-tabs.
- In-session shot notes + end-of-session comment, both surfaced into the journal.
- Pause/resume timer preserved via the running-session bar.
- Mode (dry/live) × Focus (shot/skill) kept independent.
- Vendored ISSF scoring locally (build no longer depends on external `shared/`).
- Activity feed merges gym workouts; home "gym days" capped at 5/week.

## Pending / placeholders to fill
- **Gym Drive file id** — set `GYM_DRIVE_FILE_ID` in `src/lib/gymApi.js` (currently `PLACEHOLDER_GYM_DRIVE_FILE_ID`). Until set, gym data is in-memory only (not persisted).
- **"Pebble says" Drive file id** — set `PEBBLE_VOICE_FILE_ID` in `src/lib/pebbleVoice.js` (currently `PLACEHOLDER_PEBBLE_VOICE_FILE_ID`). Until set, home shows the static fallback line.
- **AI generation** for daily/weekly reviews and the Pebble voice — still external/disabled in this client (display only).
- **In-app gym plan editing** (swap exercises / edit sets-reps / add custom days) — not built; plan is hardcoded in `src/lib/gymPlan.js`. (Note: reordering exercises *within* a day IS supported and persisted.)
- **Gym Progress charts** — currently last-vs-best text only; richer trends later.
- **Auto-fill journal gym summary from logged workout** — wired minimally; expand to populate `gym_muscles` from the day's target.

## Notes
- `vite.config.js` builds into `docs/` with `emptyOutDir`, which wipes anything under `docs/` on every build. Planning docs were therefore relocated to top-level `planning/` (specs + plans) so builds never destroy them. Do NOT put working docs under `docs/`.
```

- [ ] **Step 2: Commit**

```bash
git add UI_UPDATE.md
git commit -m "docs: add UI_UPDATE.md with placeholders and pending work"
```

---

### Task 27: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites PASS (scoring, pebble, gymPlan, gymDates, gymApi, pebbleVoice, weekStrip, setStepper, sessionContext).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: PASS, output in `docs/`.

- [ ] **Step 3: Manual smoke test** (dev server)

Run: `npm run dev`, open the local URL. Verify: Home shows week strip + Pebble + agenda; nav has 4 tabs + Pebble center; Gym shows today's plan (or rest card) and a set can be logged; Shoot sub-tabs switch and a session can start/pause/resume; Journal shows the week strip. No emoji anywhere.

- [ ] **Step 4: Final commit if any smoke fixes were needed**

```bash
git add -A && git commit -m "chore: redesign smoke-test fixes"
```

---

## Notes for the implementer
- **Date determinism in tests:** never assert on `new Date()` directly; the helper tests construct explicit dates. App code may call `new Date()` at runtime (fine), but keep it out of pure tested functions.
- **Drive placeholders are intentional:** with placeholders unset, `gymApi`/`pebbleVoice` degrade gracefully (in-memory / fallback) so the app is fully usable offline-of-Drive for those features.
- **Preserve existing shooting behavior:** `TargetCanvas`, `SeriesPanel`, `SkillFocusTable`, `SessionContext` series logic, and `SummaryModal` scoring are unchanged except where a task says otherwise. Restyling is via shared CSS variables — avoid hard-coded colors in JSX where a class works.
