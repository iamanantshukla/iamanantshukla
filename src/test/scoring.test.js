// src/test/scoring.test.js
import { describe, it, expect } from 'vitest';
import { scoreFromDistance, directionFromVector, scoreFromMm } from '../lib/scoring.js';

describe('scoring', () => {
  // score = clamp(11 - mm/8, 0, 10.9), measured from the MARKER CENTRE. The 4.5mm pellet's credit is
  // baked into the slope (10.0 at 8mm = the 5.75mm 10-ring + 2.25mm pellet), so the score is
  // independent of how large the pellet is DRAWN on screen.
  it('scores a dead-center shot at 10.9 / Center', () => {
    expect(scoreFromMm({ x: 0, y: 0 })).toEqual({ score: 10.9, dir: 'Center' });
  });
  it('scores 10.0 at the 10/9 boundary (8mm from centre = ring + pellet)', () => {
    expect(scoreFromDistance(8)).toBe(10.0);
  });
  it('drops one full point per 8mm outward', () => {
    expect(scoreFromDistance(16)).toBe(9.0); // 9/8 boundary
    expect(scoreFromDistance(72)).toBe(2.0); // 2/1 boundary
    expect(scoreFromDistance(80)).toBe(1.0); // outer edge of the 1-ring
  });
  it('is a miss (0) once the pellet no longer touches the 1-ring', () => {
    expect(scoreFromDistance(80.8)).toBe(0); // just past the 1-ring outer edge
    expect(scoreFromDistance(200)).toBe(0);
  });
  it('labels direction by octant with y-up', () => {
    expect(directionFromVector({ x: 10, y: 0 })).toBe('Right');
    expect(directionFromVector({ x: 0, y: 10 })).toBe('High');
    expect(directionFromVector({ x: -10, y: 0 })).toBe('Left');
  });
});
