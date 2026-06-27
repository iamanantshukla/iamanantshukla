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
