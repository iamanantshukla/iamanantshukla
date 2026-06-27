// src/lib/sessionKinds.js — the session-type taxonomy shared by the checklist, the session brief,
// and the capture screen so the "what am I about to do" badge is consistent everywhere.
//
// kind -> { label (human badge text), tone (a --color token name for the badge) }.
export const SESSION_KINDS = {
  match:    { label: 'Live Match',  tone: 'bad' },    // a scored competition simulation
  live:     { label: 'Live Fire',   tone: 'accent' }, // live shot-calling
  dry:      { label: 'Dry Fire',    tone: 'call' },   // dry shot-calling
  skill:    { label: 'Skill Focus', tone: 'good' },
  mental:   { label: 'Mental',      tone: 'warn' },   // imagery / regulation reps
  offline:  { label: 'Offline',     tone: 'muted' },  // a timed physical block (e.g. wall holding)
  gym:      { label: 'Gym',         tone: 'good' },
  journal:  { label: 'Check-in',    tone: 'muted' },
  recovery: { label: 'Recovery',    tone: 'good' },
};

export function kindMeta(kind) {
  return SESSION_KINDS[kind] || { label: 'Session', tone: 'muted' };
}
