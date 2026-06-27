// src/test/gymApi.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setAccessToken } from '../lib/auth.js';
import { gymApi } from '../lib/gymApi.js';

describe('gymApi', () => {
  // Real (non-placeholder) file id so syncToDrive/syncFromDrive exercise the fetch path.
  beforeEach(() => { setAccessToken('test-token'); gymApi.setFileId('real-gym-file-id'); gymApi._reset(); });

  it('lastForExercise returns the most recent logged sets for a name', async () => {
    gymApi._seed([
      { id: 1, date: '2026-06-13', exercises: [{ name: 'Bench', sets: [{ weightKg: 60, reps: 8 }] }] },
      { id: 2, date: '2026-06-20', exercises: [{ name: 'Bench', sets: [{ weightKg: 62.5, reps: 8 }] }] },
    ]);
    const last = gymApi.lastForExercise('Bench');
    expect(last.date).toBe('2026-06-20');
    expect(last.sets[0].weightKg).toBe(62.5);
  });

  it('saveWorkout computes total volume and persists', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const w = await gymApi.saveWorkout({
      date: '2026-06-21', dayKey: 'day5', dayTitle: 'Day 5',
      exercises: [{ name: 'Bench', prescription: { sets: 4, repMin: 6, repMax: 8 }, sets: [
        { weightKg: 60, reps: 8 }, { weightKg: 60, reps: 8 },
      ] }],
      durationSeconds: 1800,
    });
    expect(w.totalVolumeKg).toBe(960); // 60*8 + 60*8
    expect(fetchMock).toHaveBeenCalled();
  });

  it('persists a per-day exercise order override', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await gymApi.setOrder('day5', ['Reverse Barbell Curls', 'Barbell Bench Press']);
    expect(gymApi.getOrder('day5')).toEqual(['Reverse Barbell Curls', 'Barbell Bench Press']);
    expect(gymApi.getOrder('day1')).toEqual([]); // none set
  });
});
