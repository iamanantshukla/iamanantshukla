# Pebble Redesign — Design Spec

**Date:** 2026-06-21
**App:** `shooting-log-client` (repo: `iamanantshukla`) — a personal daily-training journal used as a Safari web app on iPad / Mac / iPhone.
**Goal:** Full visual + structural redesign that gives the app a character ("Pebble" the penguin), a calmer "what do I do today" home, and a new Gym tracker — without hiding any existing feature.

---

## 1. Vision & Principles

Turn a functional-but-generic shooting log into a **personal daily companion** with a light, friendly character — in the spirit of rabbit.tech's minimal mascot and Estyl's soft "AI companion" blob, but as a penguin named **Pebble**.

Design principles:
- **Pocket-notebook feel** — warm, simple, calm. Big tap targets (44px+ minimum, larger where possible) because the app is used hands-on, often on iPad.
- **Character without a real AI** — Pebble is present (header avatar, the "Pebble says" voice, the center nav button) even though no live AI runs in this client. Today the voice is static; the wiring comes later.
- **Redesign around features, never hide them** — every existing capability (shot calling, skill focus, sessions feed, skills catalogue, AI reviews, daily journal, the future Coach/Plan stubs) keeps a clear home in the new structure.
- **Glance, then deep-dive** — home is an overview ("today board" + how I'm doing); each item drills into its full screen.

---

## 2. The Character — Pebble

- **Name:** Pebble (a pebble-shaped penguin), evolved from the working name "Pingu."
- **Form:** a rounded coral "pebble" body with a small head-tuft, cream belly, two dot eyes, and a small triangle beak. Abstract enough to read as a friendly companion/logo, concrete enough to be a penguin. (Locked from the "Pebble" blob option.)
- **Where Pebble appears:**
  - **Home header avatar** (top-left, next to the greeting).
  - **"Pebble says" voice panel** on home (see §5).
  - **Center nav button** — Pebble's face in a solid coral disc; tapping opens the quick-start menu.
  - **Empty / rest states** — e.g. the Gym rest-day card.
- **Art delivery:** a single inline SVG component (`Pebble.jsx`) with size + variant props (`full` body for headers/FAB, `face` for tiny contexts), so it scales crisply from 24px to 80px. No raster assets.

---

## 3. Visual Theme — "Dark & Warm" (Option C)

Keep dark mode (OLED-friendly, familiar) but shift from the cold Strava-orange palette to a **warm** one. Update the CSS variables in `src/styles.css`:

| Token | Old | New | Use |
|---|---|---|---|
| `--bg` | `#0A0A0B` | `#17140F` | warm near-black background |
| `--panel` | `#161619` | `#221D17` | cards |
| `--panel-2` | `#212126` | `#2A241D` | insets, steppers |
| `--line` | `#2E2E36` | `#342C22` | borders |
| `--text` | `#F0F0F5` | `#F0EBE2` | warm off-white |
| `--muted` | `#90909A` | `#9A8F7E` | warm grey |
| `--accent` | `#FC4C02` | `#FF6A3D` | warm coral (replaces Strava orange) |
| `--accent-2` | `#E34402` | `#E0552E` | coral pressed/hover |
| `--good` | `#47C44D` | `#52C2A0` | teal-green (done states, ✓ outlines) |
| `--warn` | `#F5A623` | `#FFB02E` | amber (Pebble beak, warnings) |
| `--bad` | `#D9291B` | `#D9483B` | warm red |
| `--radius` | `12px` | `16px` | softer corners (cards 16–20px) |

Typography keeps Inter. Spacing opens up slightly (more padding, more breathing room). Buttons stay ≥44px min-height; primary buttons are coral, large pill/rounded shapes.

This is a **palette + component restyle**, not a rewrite of the CSS architecture. The existing class-based `styles.css` approach is kept and extended.

---

## 4. Information Architecture & Navigation

### Bottom nav — 4 tabs + center Pebble button

```
[ Home ]  [ Gym ]  ( ＋ Pebble )  [ Shoot ]  [ Journal ]
```

- **Icons:** line/outline style, ~24px, label beneath. Coral when active, warm-grey otherwise.
  - Home = house · Gym = dumbbell · Shoot = target/crosshair · Journal = notebook.
  - **Center = Pebble's face** in a coral disc, raised above the bar. Replaces the old play/timer FAB.
- **Center button behavior:** opens a **quick-start bottom sheet**:
  - 🎯 **Shooting session** — choose dry/live + shot-calling/skill-focus, then start (this is the old NavBar start-session modal, relocated into the sheet).
  - 🏋️ **Today's workout** — jumps into the Gym → Today screen for the current split day.
  - 📓 **Journal entry** — opens today's journal.
- **Active-session affordance (timer must NOT be lost):** the old design used the center FAB as the play/pause timer. Since the center button is now Pebble/quick-start, the running session and its **pause/resume timer** move to a **persistent running-session bar** pinned just above the bottom nav whenever a session is active. The bar shows the live MM:SS timer (tabular nums) and a **pause/resume** toggle, and tapping it returns to **Shoot ▸ Session**. The underlying `SessionContext` `play`/`pause`/`seconds`/`running` state is unchanged — only the control's location moves. This preserves the existing pause/resume behavior.

### Where every existing feature lives (nothing dropped)

| Feature (old route) | New home |
|---|---|
| Dashboard (`/dashboard`) | **Home** tab — redesigned (see §5) |
| Active session (`/active`) | **Shoot ▸ Session** sub-tab + launched from center sheet |
| Old sessions feed (`/sessions`) | **Shoot ▸ Feed** sub-tab |
| Skills catalogue (`/skills`) | **Shoot ▸ Skills** sub-tab |
| AI Reviews (`ReviewsView`) | **Shoot ▸ Reviews** sub-tab |
| Daily journal (`/journal`) | **Journal** tab — redesigned (see §7) |
| Coach (`/coach`, future stub) | **Home ▸ More** |
| Training plan (`/plan`, future stub) | **Home ▸ More** |
| — new — | **Gym** tab (see §6) |

Routing stays on `HashRouter`. New/updated routes:
`/home`, `/gym` (+ `/gym/history`, `/gym/progress`), `/shoot` (with sub-tab state for session/feed/skills/reviews), `/journal`, and kept `/coach`, `/plan` reachable via Home ▸ More. `/` redirects to `/home`. Old paths (`/dashboard`, `/sessions`, `/active`, `/skills`) should redirect to their new homes so existing bookmarks/hash links don't break.

---

## 5. Home — the "Today Board" (Layout A)

Agenda-first overview. Top to bottom:

1. **Header** — Pebble avatar + greeting ("Morning, Anant") + date.
2. **Week calendar strip** — a single row showing **Monday → Sunday** of the current week. All 7 days fit across the screen width (no horizontal scroll needed to see the week); single-letter day labels + date number. It is a **rolling window paged by week** via `‹ ›` arrows (and shows the week range, e.g. "16–22 Jun").
   - Today = coral pill.
   - A small dot under each day: **green = something done/logged**, **grey = planned (workout scheduled)**, **none = rest day**.
   - **Tapping a day** changes the board below to that day: a future day shows what's **planned** (header softens to "Looking ahead / Planned"); a past day shows what was **logged** (✓ on completed items). Today is the default.
3. **"Pebble says" panel** — a card with a "🐧 Pebble says" label and a short status line ("You're doing great — recovery's solid…"). **Static text for now**, later sourced from a dedicated Drive file (see §8). This is the Garmin-style "how you're doing" word.
4. **Today (agenda)** — the day's actionable items as large tappable rows, each → its deep-dive:
   - 🏋️ today's gym day (e.g. "Day 5 · Upper Body — 6 lifts") → Gym ▸ Today
   - 🎯 shooting session ("Tap to start · last 9.4 avg") → Shoot ▸ Session
   - 📓 daily journal ("Not logged yet") → Journal
5. **This week (stats)** — compact stat tiles (avg sleep, shots, gym days, run km) with trend hints (▲ 6%). These reuse `api.getStats()` week rollups (already computed in `api.js`).

The old `DashboardView` mockup content (hardcoded "Recent Sessions" list and "Skill Confidence Breakdown" with fake values) is **removed**; the embedded `ReviewsView` moves to Shoot ▸ Reviews. Home stats come from real data only.

---

## 6. Gym Tab — the new feature

### Plan model
The 5-day split is **hardcoded data** for now (shipped as a constant, e.g. `src/lib/gymPlan.js`), mapping weekday → day:

- **Mon → Day 1** Lower Body Foundation & Knee Rehab (TKEs, Back Squats, Hip Thrusts, Bulgarian Split Squats, Standing Calf Raises)
- **Tue → Day 2** Athletic Back, Biceps & Neck Stability (Pull-Ups/Lat Pulldowns, Barbell/Pendlay Rows, Face Pulls, Neck Isometric Holds, Incline DB Curls)
- **Wed → Rest**
- **Thu → Day 3** Deep Core, Pelvic Stability & Wrist Correction (Weighted Planks, Dead Bugs, Suitcase Carries, DB Radial/Ulnar Deviation, Pallof Press)
- **Fri → Day 4** Posterior Chain & Shooting Specifics (RDLs, Lying Leg Curls, Rear Delt Cable Flyes, DB Isometric Lateral Hold)
- **Sat → Day 5** High-Fatigue Upper Body / "Max Gap Day" (Bench Press, Seated DB OHP, Weighted Dips/Close-Grip Bench, Cable Tricep Pushdowns, Farmer's Walks, Reverse Barbell Curls)
- **Sun → Rest**

Each exercise carries its prescription (sets × rep-range) and any coaching note from the plan (e.g. "Crucial: do these first…"). The plan itself is **not editable in-app** for now (logged as pending in `UI_UPDATE.md`), **but the order of exercises within a given day is reorderable** by the user (drag/reorder), persisted per user.

### Today screen (default sub-tab)
- **Header:** date + day title + day subtitle (e.g. "Day 5 · High-Fatigue Upper Body — The Max Gap Day").
- **Global workout progress bar** at the top: gradient fill, "X / Y sets", plus a sub-line ("N of M exercises · elapsed time · total kg lifted").
- **Position dots** indicating which exercise card is in view.
- **Side-scroll exercise cards** (swipe horizontally; next card peeks at the edge). Each card (B2 style) shows:
  - Exercise name + prescription ("4 × 6–8 reps") + set counter ("2 / 4").
  - **Last session** reference ("Last: 60kg × 8, 8, 7, 6"). *(No automatic progression suggestion — just show last, per decision. The earlier green "try Xkg" hint is removed.)*
  - **Completed sets** as **green-outline pills** ("62.5 kg × 8 ✓") — outline, not filled.
  - **Current set logger:** two pill-stepper rows — **Weight** and **Reps** — each with large circular −/+ buttons, then a full-width coral **"Log set"** button.
  - **Weight stepper increment = 500 g (0.5 kg).** Reps increment = 1.
- **Rest days (Wed/Sun):** show a friendly **Pebble rest card** ("Rest day — recover"). The user may still pick and log any day's workout if they train anyway. The home "gym days" count is **capped at 5 / week** regardless of extra sessions.

### History sub-tab
List of past workouts by day and week (date, day name, key lifts, total volume). Tap → that workout's logged detail.

### Progress sub-tab
Per-exercise trends: weight and volume over time, last vs best. (Scope: simple per-exercise list with last/best and a small trend; richer charts can come later.)

### Gym data flow
- Workouts are stored in a **separate Drive file** from the shooting data (placeholder file id — see §8), via a parallel data layer (`gymApi` or an extension of `api.js`).
- A completed workout also: **appears in the Activity Feed** (Shoot ▸ Feed, alongside shooting sessions) and **counts toward the Home "gym days" stat** (so home/journal stay accurate). The existing journal "gym" boolean + muscles can be auto-derived from the logged workout.

### Set log data shape (illustrative)
```
workout = {
  id, date, dayKey: 'day5', dayTitle, started_at, ended_at,
  exercises: [
    { name, prescription: {sets, repMin, repMax}, order,
      sets: [ { weightKg: 62.5, reps: 8, done: true }, ... ] }
  ],
  totalVolumeKg, durationSeconds
}
```

---

## 7. Shoot Tab (hub) & Journal Tab

### Shoot — sub-tabs: Session · Feed · Skills · Reviews
- **Session (default):** "Start new session" + a "pick up where you left" card (last session summary). Launches the existing active-session screen, **restyled to the new theme but functionally preserved in full**:
  - **Shot Calling ↔ Skill Focus inner toggle** — both panels stay mounted (state preserved when switching), exactly as today (`ActiveSession.jsx`). Shot Calling = the tap-to-log call-vs-actual SVG target with ISSF scoring, series navigation (←/→, 10 shots/series), and `SeriesPanel` arming. Skill Focus = the green/red/yellow grading grid (`SkillFocusTable`) with auto-spawning sets. Neither is dropped.
  - **Pause/resume timer** is always visible during the session (via the running-session bar, §4) so the session can be paused and resumed.
  - **Mode and focus are independent (keep both axes):** every session has a **Mode = Dry Fire | Live Fire** AND a **Focus = Shot Calling | Skill Focus**, chosen independently. Any combination is valid — Dry+Shot, Dry+Skill, Live+Shot, Live+Skill. The start picker (in the center sheet and the Session sub-tab) offers both choices separately, and the Focus can still be toggled mid-session via the inner Shot↔Skill toggle while Mode stays as set. This matches the existing `SessionContext` model (`mode` and `focus` are separate fields) and must not be collapsed into a single choice. Mode is recorded on the saved session and shown on feed/summary cards.
  - **In-session shot notes (NEW):** a lightweight, always-reachable note field *during* the session so the shooter can capture what they felt in the moment ("pulled left on shot 7, grip slipped"). These are timestamped/append-style jottings, distinct from the final summary comment. They are stored on the session (e.g. `live_notes`) and surface in the end-of-session summary and the journal. Implementation should make this a low-friction control (e.g. a small "＋ note" affordance / collapsible field) that does not interrupt logging shots.
- **Feed:** the existing sessions feed (`OldSessions`), restyled; now also includes completed **gym workouts** as activity cards.
- **Skills:** the existing `SkillsCatalogue` (add skill + "perfect execution" expectation), restyled.
- **Reviews:** the existing `ReviewsView` (daily/weekly AI review display, status polling, progress tracker, markdown render). Generation stays stubbed/disabled in this client (unchanged behavior); display works when data exists.

#### Two distinct comment streams (both preserved/added)
1. **In-session shot notes (NEW)** — written *during* a live session to remember in-the-moment feelings per shot/series (see Session sub-tab above). Stored as `live_notes` on the session.
2. **End-of-session comment (EXISTING — keep)** — the "Session Comments" textarea already in `SummaryModal` ("Immediate observations from the session…"), saved via `saveSession`/`updateSessionComments`. This is the overall reflection captured when finishing. It must remain in the redesigned summary, restyled.
- **Journal hand-off:** both the live notes and the end-of-session comment are surfaced when writing the **Daily Journal** for that day (alongside the auto-filled gym/shooting summaries), so the user can gather what they felt across sessions while reflecting. The journal "Notes/observation" stays the user's own free-text; the session comments are shown as reference context, not overwritten.

### Journal — restyled `DailyJournal`
- **Week-day picker** (same Mon–Sun strip pattern as home) to choose the day.
- That day's fields with large, friendly inputs: 😴 **Sleep**, 🏃 **Run (km)**, 🏋️ **Gym summary**, 📝 **Notes/observation**.
- **Auto-fill:** gym and shooting summaries for the day drop in automatically from their logs, so the day is "complete" without re-typing. Manual fields remain editable.
- Keeps the existing `api.getJournal` / `api.saveJournal` data model (running, running_kms, gym, gym_muscles, sleeping_hours, observation), extended so the gym summary can be populated from a logged workout.

---

## 8. Data Layer & Backend Notes

- **Existing shooting data** stays in the current Google Drive file (`api.js`, file id `10T_qKiCLiS8EAUW4zYDOidJV45K6BtQM`), same OAuth + single-writer lock, same `dataStore` shape (`sessions`, `journals`, `skills`, `reviews`).
- **Gym data → a NEW, separate Drive file.** File id is a **placeholder** for now; the user will supply the real id. Tracked in `UI_UPDATE.md`. The gym data layer mirrors the existing sync pattern (`syncFromDrive`/`syncToDrive`).
- **"Pebble says" home text → a separate Drive file**, currently **empty**; the home reads it and falls back to a friendly static string ("You're doing great…") when empty. File id is a **placeholder**, tracked in `UI_UPDATE.md`. This is the future hook for a Garmin-style AI status.
- All three Drive integrations share the same access token from the Google login (`drive` scope already requested in `PasswordGate`).

### Known issue to fix during implementation
`src/lib/scoring.js` re-exports from `../../../shared/scoring.js`, which does **not** resolve inside this repo (the real file lives in a sibling workspace `workspace-shooting-log/shared/scoring.js`). Standalone `npm run build` / `npm test` will fail to resolve it. The redesign must make scoring self-contained — **vendor a local `src/lib/scoring.js`** (copy the ~60-line ISSF implementation in) so the app builds on its own. (Behavior must match the existing module: `scoreFromDistance`, `directionFromVector`, `scoreFromMm`, 10-ring 5.75mm, 8mm step, 2.25mm pellet radius, 8-octant directions.)

### Build output caveat
`vite.config.js` sets `outDir: 'docs'` with `emptyOutDir`. This spec lives under `docs/superpowers/specs/` and is committed to git, so a build won't lose it from history — but a local `npm run build` would wipe the working copy. During implementation, consider moving the spec out of `docs/` or excluding it; not a blocker.

---

## 9. UI_UPDATE.md (to be created at repo root)

A living doc capturing what changed and what's pending. It must include:
- **Done:** theme tokens, Pebble character/avatar, nav restructure, Home today-board, Gym tab + logging, Shoot hub, Journal restyle, local scoring vendoring.
- **Pending / placeholders to fill:**
  - **Gym Drive file id** — `<PLACEHOLDER_GYM_DRIVE_FILE_ID>` (replace with real id to enable gym persistence).
  - **"Pebble says" Drive file id** — `<PLACEHOLDER_PEBBLE_VOICE_FILE_ID>` (empty for now; enables dynamic home status text).
  - In-app **gym plan editing** (swap exercises / edit sets-reps / custom days) — not built yet.
  - **AI generation** for reviews + Pebble voice — still external/disabled in this client.
  - Gym **Progress** charts — basic now, richer later.

---

## 10. Component / File Plan (high level)

New:
- `src/components/Pebble.jsx` — the SVG character (size + variant props).
- `src/components/WeekStrip.jsx` — Mon–Sun calendar row (used by Home + Journal).
- `src/components/QuickStartSheet.jsx` — center-button bottom sheet.
- `src/views/Home.jsx` — today board (replaces `DashboardView` as the landing view).
- `src/views/Gym/` — `GymToday.jsx` (progress bar + card carousel), `ExerciseCard.jsx`, `SetStepper.jsx`, `GymHistory.jsx`, `GymProgress.jsx`, `RestDayCard.jsx`.
- `src/views/Shoot.jsx` — hub wrapper with Session/Feed/Skills/Reviews sub-tabs.
- `src/lib/gymPlan.js` — hardcoded 5-day plan data.
- `src/lib/gymApi.js` (or extend `api.js`) — gym Drive file sync + feed/stats wiring.
- `src/lib/pebbleVoice.js` — reads the Pebble-says Drive file with static fallback.
- `src/lib/scoring.js` — **vendored** local ISSF scoring (replaces the broken external re-export).

Updated:
- `src/styles.css` — new warm-dark tokens + new component styles.
- `src/App.jsx` — new routes + redirects from old paths.
- `src/components/NavBar.jsx` — 4 tabs + Pebble center button; session-start modal moves into QuickStartSheet.
- `src/views/DailyJournal.jsx` — restyle + WeekStrip + auto-fill.
- `src/views/OldSessions.jsx`, `SkillsCatalogue.jsx`, `ReviewsView.jsx` — restyle, re-home under Shoot.

Kept (functionally), restyled to the new theme — and the live-timer / focus-toggle / comment behaviors explicitly preserved:
- `SessionContext.jsx` — unchanged state model (`mode`, `focus`, `seconds`, `running`, `play`/`pause`, series, skillFocus). Extend only to hold `live_notes`.
- `ActiveSession.jsx` — keep Shot↔Skill inner toggle (both panels stay mounted), series nav, Finish. Add the in-session note affordance.
- `NavBar.jsx` — repurposed: the play/pause FAB timer logic moves into the new **running-session bar**; pause/resume preserved.
- `TargetCanvas.jsx`, `SeriesPanel.jsx`, `SkillFocusTable.jsx` — restyled only.
- `SummaryModal.jsx` — keep the end-of-session "Session Comments" textarea + manual-shots field; restyle; also display the in-session `live_notes`.
- `PasswordGate.jsx`, `LockGate.jsx` — restyled only.

New small component: `RunningSessionBar.jsx` — the pinned timer + pause/resume + "return to session" control shown while a session is active.

---

## 11. Out of Scope (this pass)
- Live AI generation (reviews or Pebble voice) — UI + placeholders only.
- In-app gym plan editing.
- Multi-user / real auth changes (keep current Google Drive + lock model).
- Rich analytics/charting beyond basic per-exercise trends.
