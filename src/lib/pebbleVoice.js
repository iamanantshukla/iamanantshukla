// src/lib/pebbleVoice.js — the static fallback for Pebble's home "verdict" line.
//
// The LIVE verdict is the agent-written `pebble.json` singleton, loaded cache-first by
// JarvisContext (api.getSingleton('pebble')). That is the single source of truth. This module no
// longer fetches a second, separate Drive file — that duplicate source was only ever consumed by
// the now-deleted TrainingPlanView and invited a split-brain between pebble.json and pebble-voice.json
// (spec §3 cleanup: "consolidate the duplicate Pebble voice source onto pebble.json").
//
// All that remains here is the true static fallback that renders ONCE when there is no cache and no
// remote value (JarvisContext.jsx:16/32/80), so the home line is never blank.
export const FALLBACK_VOICE = "You're doing great. Keep showing up — small honest reps add up.";
