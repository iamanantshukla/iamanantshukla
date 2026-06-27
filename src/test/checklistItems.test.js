// src/test/checklistItems.test.js — resolve the Home checklist into { tasks, advisories }.
// Tasks are tracked sessions: shooting -> "Shooting: Session N", mental -> "Shooting: Mental
// Visualisation", journal -> "Daily Journal", each with a duration. Advisory physical (mobility /
// recovery) splits OUT to the verdict footer; a real gym day or a timed hold stays a task.
import { describe, it, expect } from 'vitest';
import { checklistItems } from '../lib/checklistItems.js';

describe('checklistItems', () => {
  it('numbers shooting sessions and titles mental + journal per the format', () => {
    const mission = {
      shooting: { module: 'volume', prescription: '2x10 live series', scored: true },
      mental: { scenario_ref: 'pebble.json' },
      checklist: [
        { id: 's', label: 'Live series', domain: 'shooting' },
        { id: 'm', label: 'Mental — visualization', domain: 'mental' },
        { id: 'c', label: 'Evening check-in', domain: 'journal' },
      ],
    };
    // No date -> the permanent gym task is omitted (it needs a weekday); just the agent items.
    const { tasks } = checklistItems(mission, { scenario: 'Final shot to win.' });
    expect(tasks.map((t) => t.label)).toEqual([
      'Shooting: Session 1',
      'Shooting: Mental Visualisation',
      'Daily Journal',
    ]);
    // the agent's specific wording survives as the objective on the shooting session
    expect(tasks[0].objective).toBe('Live series');
    // each task has a duration string
    expect(tasks.every((t) => typeof t.duration === 'string' && t.duration.length > 0)).toBe(true);
  });

  it('adds the permanent Gym task (today\'s gym day, 60 min) after shooting; hidden on rest days', () => {
    const mission = {
      shooting: { module: 'volume', prescription: '2x10 live', scored: true },
      checklist: [{ id: 's', label: 'Live', domain: 'shooting' }, { id: 'c', label: 'check', domain: 'journal' }],
    };
    // Friday 2026-06-26 -> day4 in the split: gym appears, titled + 60 min, right after shooting.
    const fri = checklistItems(mission, { date: '2026-06-26' }).tasks;
    const gym = fri.find((t) => t.kind === 'gym');
    expect(gym).toBeTruthy();
    expect(gym.label.startsWith('Gym · ')).toBe(true);
    expect(gym.duration).toBe('60 min');
    expect(fri.indexOf(gym)).toBe(1); // after the single shooting session
    // Sunday 2026-06-28 is a rest day -> no gym task.
    const sun = checklistItems(mission, { date: '2026-06-28' }).tasks;
    expect(sun.some((t) => t.kind === 'gym')).toBe(false);
  });

  it('returns empty for a missing/empty mission', () => {
    expect(checklistItems(null)).toEqual({ tasks: [], advisories: [] });
    expect(checklistItems({})).toEqual({ tasks: [], advisories: [] });
  });

  it('moves a mobility / recovery block to advisories, not the task list', () => {
    // Sunday 2026-06-28 is a rest day in the split, so the block isn't a scheduled gym day.
    const { tasks, advisories } = checklistItems(
      { physical: { block: 'mobility-only', reason: 'amber readiness' } },
      { date: '2026-06-28' },
    );
    expect(advisories.some((a) => /mobility/i.test(a.label))).toBe(true);
    expect(tasks.some((t) => /mobility/i.test(t.label))).toBe(false);
  });

  it('keeps a real scheduled gym day (generic block) as a task with a duration', () => {
    // Friday 2026-06-26 -> day4; a generic 'support' block defers to the plan day name.
    const { tasks } = checklistItems({ physical: { block: 'support' } }, { date: '2026-06-26' });
    const gym = tasks.find((t) => t.kind === 'gym');
    expect(gym).toBeTruthy();
    expect(gym.label.startsWith('Gym · ')).toBe(true);
    expect(gym.duration).toMatch(/min/);
  });

  it('keeps a timed hold (e.g. wall holding) as an offline TASK, not advisory', () => {
    const { tasks, advisories } = checklistItems(
      { physical: { block: '20 min wall holding' } }, { date: '2026-06-28' },
    );
    expect(tasks.some((t) => t.kind === 'offline')).toBe(true);
    expect(advisories.length).toBe(0);
    expect(tasks.find((t) => t.kind === 'offline').duration).toBe('20 min');
  });

  it('a technique shooting block resolves to skill-focus dry and still titles as a session', () => {
    const { tasks } = checklistItems({
      shooting: { module: 'npa-holdtime', prescription: 'reset NPA, hold-time, clean release, follow-through', scored: false },
    });
    const s = tasks.find((t) => t.kind === 'skill');
    expect(s.label).toBe('Shooting: Session 1');
    expect(s.start).toMatchObject({ type: 'session', mode: 'dry', focus: 'skill' });
    expect(s.skills).toEqual(expect.arrayContaining(['Hold', 'Trigger Control', 'Follow-Through']));
  });

  it('injects a mental visualisation task when a scenario exists but the agent omitted it', () => {
    const mission = {
      mental: { scenario_ref: 'pebble.json' },
      checklist: [{ id: 'c', label: 'Evening check-in', domain: 'journal' }],
    };
    const { tasks } = checklistItems(mission, { scenario: 'Final shot.' });
    expect(tasks.some((t) => t.label === 'Shooting: Mental Visualisation')).toBe(true);
  });
});
