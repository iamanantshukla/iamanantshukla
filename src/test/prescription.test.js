// src/test/prescription.test.js — the FAB / Shoot / checklist "Start" resolves the session to launch.
// Preferred path: the agent DECLARES shooting.focus/mode (+ optional skills) machine-readably.
// Fallback: classify the human module/prescription text — and recognise technique work (NPA, hold,
// trigger, release, follow-through, grip, sight, stance) as a SKILL-FOCUS dry session, deriving the
// skills from those cues rather than defaulting to plain shot-calling.
import { describe, it, expect } from 'vitest';
import { prescribedStart } from '../lib/prescription.js';

describe('prescribedStart', () => {
  it('falls back to dry/shot when there is no mission (agent has not run)', () => {
    expect(prescribedStart(null)).toMatchObject({ mode: 'dry', focus: 'shot' });
    expect(prescribedStart({})).toMatchObject({ mode: 'dry', focus: 'shot' });
    expect(prescribedStart({ shooting: null })).toMatchObject({ mode: 'dry', focus: 'shot' });
  });

  it('uses the agent-declared focus/mode verbatim when present', () => {
    expect(prescribedStart({ shooting: { focus: 'skill', mode: 'dry', skills: ['hold', 'trigger'] } }))
      .toMatchObject({ mode: 'dry', focus: 'skill', skills: ['hold', 'trigger'] });
    expect(prescribedStart({ shooting: { focus: 'match', mode: 'live' } }))
      .toMatchObject({ mode: 'live', focus: 'match' });
    // an explicit declaration overrides what the free text would have guessed
    expect(prescribedStart({ shooting: { focus: 'shot', mode: 'live', module: 'hold-endurance' } }))
      .toMatchObject({ mode: 'live', focus: 'shot' });
  });

  it('a scored shot-calling block implies live fire', () => {
    expect(prescribedStart({ shooting: { module: 'volume', prescription: '3x10 scored series', scored: true } }))
      .toMatchObject({ mode: 'live', focus: 'shot' });
  });

  it('a match / simulation module starts a match string (which implies live)', () => {
    expect(prescribedStart({ shooting: { module: 'match-format', scored: true } }))
      .toMatchObject({ mode: 'live', focus: 'match' });
    expect(prescribedStart({ shooting: { module: 'comp-sim', prescription: 'full 60-shot simulation' } }))
      .toMatchObject({ mode: 'live', focus: 'match' });
  });

  it('a mental-rehearsal module starts a mental session', () => {
    expect(prescribedStart({ shooting: { module: 'mental-rehearsal', scored: false } }))
      .toMatchObject({ mode: 'mental', focus: 'shot' });
  });

  it('classifies a technique block as SKILL-FOCUS dry and derives the skills', () => {
    // the real case: NPA reset + hold-time + clean release + held follow-through.
    const r = prescribedStart({
      module: undefined,
      shooting: {
        module: 'npa-holdtime-rebaseline',
        prescription: 'reset your natural point of aim, run a hold-time test, then deliberate dry reps with clean release and held follow-through',
        scored: false,
      },
    });
    expect(r.mode).toBe('dry');
    expect(r.focus).toBe('skill');
    expect(r.skills).toEqual(expect.arrayContaining(['Natural Point of Aim', 'Hold', 'Trigger Control', 'Follow-Through']));
  });

  it('an explicit skill / SCATT module is skill-focus dry', () => {
    expect(prescribedStart({ shooting: { module: 'scatt-skill-block', scored: false } }))
      .toMatchObject({ mode: 'dry', focus: 'skill' });
  });

  it('a plain dry-process / blank-target block stays dry shot-calling (no technique cues)', () => {
    expect(prescribedStart({ shooting: { module: 'dry-process', prescription: 'routine grooving, slow reps' } }))
      .toMatchObject({ mode: 'dry', focus: 'shot' });
  });

  it('reads the prescription text when the module is the generic phase-default', () => {
    expect(prescribedStart({ shooting: { module: 'phase-default', prescription: '3x10 live series, full routine' } }))
      .toMatchObject({ mode: 'live', focus: 'shot' });
  });
});
