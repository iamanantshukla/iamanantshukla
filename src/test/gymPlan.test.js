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
    const plan = getPlanForDate('2026-06-19'); // 19 Jun 2026 is a Friday -> day4
    expect(plan.dayKey).toBe('day4');
    expect(plan.exercises.length).toBeGreaterThan(0);
    expect(plan.exercises[0]).toHaveProperty('name');
    expect(plan.exercises[0].prescription).toHaveProperty('sets');
  });
  it('returns rest for Sunday', () => {
    expect(getPlanForDate('2026-06-21').dayKey).toBe('rest'); // Sunday
  });
});
