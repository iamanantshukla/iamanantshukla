# UI Update Log — Pebble Redesign

This file tracks what the Pebble redesign changed and what's still pending (placeholders to fill, future features). Spec: `planning/specs/2026-06-21-pebble-redesign-design.md`. Plan: `planning/plans/2026-06-21-pebble-redesign.md`.

## Done

**Character & theme**
- **Pebble** character — inline SVG (`src/components/Pebble.jsx`) with `size` / `variant` (`full`|`face`) / `expression` (`neutral`|`happy`|`sleepy`|`focused`|`resting`|`proud`|`sad`). Used in the header, the "Pebble says" panel, the nav center button, the gym rest-day card, and the journal mood picker (each of the 5 moods maps to a visually distinct face: low→sad, down→sleepy, okay→neutral, good→happy, great→proud).
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

**Shoot** (`src/views/Shoot.jsx`) — hub with sub-tabs: **Today** (today's training plan via `TrainingPlanView`), **Feed**, **Skills**, **Reviews**, plus a **"Start new session"** button. The live logging session is no longer a tab — it opens full-screen (see below). Mode (dry/live) and Focus (shot/skill) remain independent.

**Full-screen session (activity mode)** — the actual shot-calling / skill-focus logging session now runs full-screen at `/session` (Strava-style): the nav bar is hidden and you can only leave via **End Session** (→ summary → save) or **Discard** (with confirm). Reached from the Pebble center button (QuickStartSheet) and the Shoot tab's "Start new session". State is driven by `SessionContext.startSession()` / `sessionActive`; the in-session header has the live timer + pause/resume; ending the session pauses the timer so the saved duration is accurate. (The old pinned RunningSessionBar was removed — the session is always full-screen.)

**Shooting training flow** — the Home "Shooting training" row opens today's **shooting training plan** (`/plan`, `TrainingPlanView` — also shown as the Shoot ▸ Today tab). Its "Start Timer & Log Session" button enters the full-screen session. Note: `TrainingPlanView` is still a static mock (hardcoded days/modules) — making it a real per-day shooting plan is pending (see below).

**Reviews** (`src/views/ReviewsView.jsx`) — revamped: removed the big Performance Dashboard; now a home-style **WeekStrip day scroll** + **daily/weekly switch**. Selecting a day updates that day's review. The weekly tab shows "Weekly Trend will be generated on Sunday." until the week (Mon–Sun, containing the selected day) has ended; week math is timezone-safe (reuses `gymDates.mondayOf`).

**Daily Journal revamp** (`src/views/DailyJournal.jsx`) — the single observation textarea is now a calm, ~2-minute mood-first guided check-in (right column of `journal-layout`; the read-only Activities feed stays in the left column). The right card stacks rounded `.jr-section` sub-cards: a Pebble "says" greeting whose tone/expression react to the picked mood, an optional carry-over of yesterday's tomorrow_focus, a 5-face mood picker (low→great, one tap, coral highlight ring), tap-only 1–5/1–10 `.jr-scale` segmented controls for the quantitative signals (energy, body, stress, training RPE, shooting feel, sleep quality), the existing running/gym Movement controls (gym auto-fill prefill untouched), the free-text `sleeping_hours`, single-line reflection prompts (highlight/challenge/lesson/gratitude), a tomorrow_focus line + controlled tag chips, and the existing `observation` textarea demoted to an optional "Anything else" card. New fields are additive (`mood`, `energy`, `body`, `stress`, `sleep_quality`, `training_rpe`, `shooting_feel`, `highlight`, `challenge`, `lesson`, `gratitude`, `tomorrow_focus`, `tags`) — auto-persisted via `saveJournal`'s spread and read with safe defaults from `getJournal`. The 1–5/1–10 scales carry direction hints ("drained to buzzing", "calm to tense", etc.) so values stay interpretable months later. On a successful save Pebble responds in-voice with the **`proud`** expression. **Long-term tracking surface:** `calculateStats`/`getStats` now also roll up the structured signals (avg energy/body/stress/rested/effort/shooting + top tags), and the journal shows a **"This week · N days logged"** trends card that reads them back (refreshes after each save) — so the captured data is actually surfaced over time, not just stored. All existing behavior preserved: WeekStrip + dots, the sessions feed (now with correct shot counts/time/skills derived from the stored session shape — `started_at`/`series`/`skillFocus` — instead of the old "Invalid Date"/blank bug), gym prefill, Save + saved/failed message, and both AI-review buttons. Nothing is required — minimum entry is tap a mood + Save. New CSS is namespaced `.jr-*` only, reusing existing tokens. No emoji. Test: `src/test/dailyJournal.test.jsx`.

**Branding** — favicon + apple-touch-icon are the Pebble mark (`public/pebble.svg`); page title is "Pebble · Training Journal". All dates come from the browser (`new Date()`), nothing hardcoded.

**Shooting session preservation & notes**
- Shot-calling target, skill-focus grid, series nav, pause/resume timer all preserved.
- **In-session notes** (`SessionContext.liveNotes` / `addLiveNote`) — now **tagged with the current series + elapsed timestamp** (`{ series, t, text }`), so the saved notes read as a timeline of how the mind moved through the series/shots/string. Shown with a "Series N · MM:SS" meta line in the session, summary, and journal feed (older untagged notes still render).
- **End-of-session comment** — the existing Session Comments field in `SummaryModal` is kept.
- Both surface in the **Journal** (`src/views/DailyJournal.jsx`, now with a `WeekStrip` day picker) as reference while reflecting.

**Live Match session type + structured reflection** (new)
- **Third session type — Live Match** (`focus: 'match'`, always live fire): a competition string with **timer + in-the-moment notes only** (no target canvas / skill grid). Startable from the center Pebble sheet (`QuickStartSheet`: Practice ↔ Live Match toggle). `ActiveSession` renders a calm match panel for it.
- **Structured end-of-session reflection** (`SummaryModal`, for **shot-calling and match** sessions; skill-focus keeps its per-skill grid): tap-only 1–5 ratings for **technique** (shot routine, follow-through, trigger control, sight alignment, grip pressure, stance & stability) and **mind & execution** (focus & concentration, **confidence level**, handling distractions, execution of routine), plus "what went well?" / "what to work on?" text. Saved as `reflection {}` on the session.
- **Live / match record footer** (any live-fire or match session): **SIUS results file input** (stored as `sius_file_name` + `sius_file_text`), a **Drive video/photos link** (`drive_link`), and a **match observation** (`match_observation`). The Drive link surfaces as a clickable "Match/Session video / photos" chip (`IconLink`) on the Feed and Journal activity cards; the match observation shows as the card quote.
- All new session fields (`focus`, `reflection`, `drive_link`, `sius_file_name`, `sius_file_text`, `match_observation`) are **additive** — persisted by `saveSession`'s spread and read defensively, so existing sessions are unaffected. New `proud`/`sad` Pebble faces and these flows have tests (`sessionContext.test.jsx`, `summaryModal.test.jsx`). No emoji; new CSS reuses existing tokens.

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
- **Real per-day shooting training plan** — `TrainingPlanView` (`/plan`, reached from the Home "Shooting training" row) is currently a static mock with hardcoded days/modules/challenges. A real per-weekday shooting plan (analogous to `gymPlan.js`) is pending.
- **Gym Progress charts** — currently last-vs-best text only; richer trend charts later.
- **Journal gym auto-summary** — finishing a workout sets the journal `gym` flag and a default `gym_muscles` (the day subtitle); could be expanded to richer per-muscle detail.

## Notes
- `vite.config.js` builds into `docs/` with `emptyOutDir`, which wipes `docs/` on every build. Planning docs therefore live under top-level `planning/`, never under `docs/`. Don't put working docs under `docs/`.
