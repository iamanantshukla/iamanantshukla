# UI Update Log — Pebble Redesign

This file tracks what the Pebble redesign changed and what's still pending (placeholders to fill, future features). Spec: `planning/specs/2026-06-21-pebble-redesign-design.md`. Plan: `planning/plans/2026-06-21-pebble-redesign.md`.

## Done

**Character & theme**
- **Pebble** character — inline SVG (`src/components/Pebble.jsx`) with `size` / `variant` (`full`|`face`) / `expression` (`neutral`|`happy`|`sleepy`|`focused`|`resting`). Used in the header, the "Pebble says" panel, the nav center button, and the gym rest-day card.
- **Warm-dark theme** — coral accent replacing Strava orange; tokens in `src/styles.css` `:root`.
- **No emojis in the UI** — all iconography is SVG line-icons in `src/components/Icons.jsx`.

**Navigation**
- 4-tab bottom nav + center Pebble button: Home · Gym · (Pebble) · Shoot · Journal (`src/components/NavBar.jsx`).
- Center button opens a quick-start bottom sheet (`src/components/QuickStartSheet.jsx`): start shooting session (dry/live × shot/skill), today's workout, or journal entry.
- Running shooting session shows a pinned timer + pause/resume bar (`src/components/RunningSessionBar.jsx`) — the pause/resume capability moved here from the old FAB.
- Routes (`src/App.jsx`): `/home` `/gym` `/gym/history` `/gym/progress` `/shoot` `/journal` `/coach` `/plan`. Old paths redirect: `/dashboard→/home`, `/active→/shoot`, `/sessions→/shoot?tab=feed`, `/skills→/shoot?tab=skills`.

**Home** (`src/views/Home.jsx`) — agenda-first "today board": header + Pebble, Mon–Sun `WeekStrip` (paged by week), "Pebble says" status, today's agenda (gym/shoot/journal), and this-week stat tiles. Gym days capped at 5/week.

**Gym** (new) — `src/views/Gym/`:
- `GymToday.jsx`: hardcoded 5-day plan (`src/lib/gymPlan.js`), global progress bar, swipeable exercise cards (`ExerciseCard.jsx`) with 0.5 kg steppers (`SetStepper.jsx`), green-outline done pills, last-session reference. Rest days show `RestDayCard.jsx` (can still log a workout). Finishing a workout writes the journal gym flag so home stats stay accurate.
- Exercise order within a day is reorderable and persisted (`gymApi.getOrder/setOrder`).
- `GymHistory.jsx` (past workouts), `GymProgress.jsx` (per-exercise last vs best).

**Shoot** (`src/views/Shoot.jsx`) — hub with sub-tabs: Session (the preserved shot-calling + skill-focus active session), Feed, Skills, Reviews. Mode (dry/live) and Focus (shot/skill) remain independent.

**Shooting session preservation & notes**
- Shot-calling target, skill-focus grid, series nav, pause/resume timer all preserved.
- **In-session shot notes** (`SessionContext.liveNotes` / `addLiveNote`) — capture in-the-moment feelings during a session; saved on the session (`live_notes`) and shown in the summary.
- **End-of-session comment** — the existing Session Comments field in `SummaryModal` is kept.
- Both surface in the **Journal** (`src/views/DailyJournal.jsx`, now with a `WeekStrip` day picker) as reference while reflecting.

**Activity feed** (`src/views/OldSessions.jsx`) — merges gym workouts with shooting sessions, date-sorted.

**Data layer**
- Vendored ISSF scoring locally (`src/lib/scoring.js`) — the app now builds standalone (previously depended on an external `shared/scoring.js`).
- `src/lib/auth.js` — shared Google access token.
- `src/lib/gymApi.js` — gym workouts in a separate Drive file.
- `src/lib/pebbleVoice.js` — home status text from a separate Drive file, with static fallback.

**Test infra** — added `src/test/setup.js` (RTL cleanup) + `vite.config.js` `globals`/`setupFiles` so render tests don't leak DOM between cases.

## Pending / placeholders to fill

- **Gym Drive file id** — currently `PLACEHOLDER_GYM_DRIVE_FILE_ID` in `src/lib/gymApi.js`. To enable gym persistence: either replace the `gymFileId` default with the real Drive file id, or call `gymApi.setFileId('<real-id>')` after login (e.g. in `api.setAccessToken`). Until set, gym data is **in-memory only** (lost on reload).
- **"Pebble says" Drive file id** — currently `PLACEHOLDER_PEBBLE_VOICE_FILE_ID` in `src/lib/pebbleVoice.js`. To enable dynamic home status: replace the `pebbleVoiceFileId` default with the real id, or call `setPebbleVoiceFileId('<real-id>')` after login. The Drive file should contain JSON `{ "text": "..." }`. Until set, home shows the static `FALLBACK_VOICE` line.
- **AI generation** for daily/weekly reviews and the Pebble voice — still external/disabled in this client (display only; `api.triggerDailyReview`/`triggerWeeklyReview` remain stubbed).
- **In-app gym plan editing** (swap exercises / edit sets-reps / add custom days) — not built; the plan is hardcoded in `src/lib/gymPlan.js`. (Reordering exercises *within* a day IS supported and persisted.)
- **Gym Progress charts** — currently last-vs-best text only; richer trend charts later.
- **Journal gym auto-summary** — finishing a workout sets the journal `gym` flag and a default `gym_muscles` (the day subtitle); could be expanded to richer per-muscle detail.

## Notes
- `vite.config.js` builds into `docs/` with `emptyOutDir`, which wipes `docs/` on every build. Planning docs therefore live under top-level `planning/`, never under `docs/`. Don't put working docs under `docs/`.
