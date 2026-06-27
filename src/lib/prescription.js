// src/lib/prescription.js — resolve the session to launch from today.json's shooting block.
//
// Returns { mode, focus, skills? } where mode ∈ {dry,live,mental}, focus ∈ {shot,skill,match}.
//
// PREFERRED: the agent declares it machine-readably — shooting.focus / shooting.mode (+ optional
// shooting.skills[]). When present, those win, no guessing.
// FALLBACK (older today.json / agent didn't declare): classify the human module + prescription text.
//   A technique block (NPA, hold, trigger, release, follow-through, grip, sight, stance, breathing)
//   is SKILL-FOCUS dry-fire, and we DERIVE the skills from the cues so the skill grid is pre-loaded —
//   rather than defaulting such a block to plain shot-calling.
const DEFAULT = { mode: 'dry', focus: 'shot' };

function hay(shooting) {
  return `${shooting.module || ''} ${shooting.prescription || ''}`.toLowerCase();
}

// Technique-skill cues -> canonical skill names (match the shooting skills catalogue wording).
const SKILL_CUES = [
  { re: /\bnpa\b|natural point of aim|point of aim/, name: 'Natural Point of Aim' },
  { re: /\bhold\b|hold-?time|hold time|stability|steadiness/, name: 'Hold' },
  { re: /\btrigger\b|release|let-?off/, name: 'Trigger Control' },
  { re: /follow.?through/, name: 'Follow-Through' },
  { re: /\bgrip\b|wrist/, name: 'Grip' },
  { re: /sight|alignment|sight picture/, name: 'Sight Alignment' },
  { re: /\bstance\b|balance|posture/, name: 'Stance' },
  { re: /breathing|breath/, name: 'Breathing' },
];

// Derive the distinct skills mentioned in a technique block, in cue order.
function deriveSkills(text) {
  const out = [];
  for (const { re, name } of SKILL_CUES) if (re.test(text) && !out.includes(name)) out.push(name);
  return out;
}

export function prescribedStart(mission) {
  const shooting = mission && mission.shooting;
  if (!shooting) return { ...DEFAULT };

  // 1) The agent declared it — trust the machine-readable fields.
  const declaredFocus = shooting.focus;
  const declaredMode = shooting.mode;
  if (declaredFocus === 'match') return { mode: 'live', focus: 'match' };
  if (declaredFocus === 'skill') {
    return { mode: declaredMode === 'live' ? 'live' : 'dry', focus: 'skill',
      skills: Array.isArray(shooting.skills) ? shooting.skills : deriveSkills(hay(shooting)) };
  }
  if (declaredFocus === 'shot') {
    return { mode: declaredMode === 'live' ? 'live' : declaredMode === 'mental' ? 'mental' : (shooting.scored ? 'live' : 'dry'), focus: 'shot' };
  }
  if (declaredMode === 'mental') return { mode: 'mental', focus: 'shot' };

  // 2) Fallback: classify the human text.
  const text = hay(shooting);

  // Mental rehearsal / imagery — a real AT-the-dream session with no shots.
  if (/\bmental\b|imagery|rehearsal|visuali/.test(text)) return { mode: 'mental', focus: 'shot' };

  // Match / competition simulation — a scored live string.
  if (/\bmatch\b|comp-?sim|competition|simulation|final(s)?\b/.test(text)) return { mode: 'live', focus: 'match' };

  // Technique work -> skill-focus dry, with the skills derived from the cues. (Checked BEFORE the
  // generic scored->live rule so an unscored hold/trigger/NPA block lands on the skill grid.)
  const skills = deriveSkills(text);
  if (skills.length || /\bskill\b|scatt|technique|diagnostic/.test(text)) {
    // A scored technique block can still be live (e.g. SCATT on live fire); default dry otherwise.
    return { mode: shooting.scored === true || /\blive\b/.test(text) ? 'live' : 'dry', focus: 'skill',
      skills: skills.length ? skills : undefined };
  }

  // A scored block, or text that explicitly calls for live fire, is live shot-calling.
  if (shooting.scored === true || /\blive\b|live-fire|live fire/.test(text)) return { mode: 'live', focus: 'shot' };

  // Everything else (plain dry-process, blank-target, phase-default with no cue) is dry shot-calling.
  return { ...DEFAULT };
}
