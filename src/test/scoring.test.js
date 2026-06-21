// src/test/scoring.test.js
import { describe, it, expect } from 'vitest';
import { scoreFromDistance, directionFromVector, scoreFromMm } from '../lib/scoring.js';

describe('scoring', () => {
  it('scores a dead-center shot at 10.9 / Center', () => {
    expect(scoreFromMm({ x: 0, y: 0 })).toEqual({ score: 10.9, dir: 'Center' });
  });
  it('drops one full point per 8mm ring step (pellet-gauged)', () => {
    // distance = pellet radius + one ring step => edge 8mm => 10.9 - 1 = 9.9
    expect(scoreFromDistance(2.25 + 8)).toBe(9.9);
  });
  it('returns 0 beyond the 1-ring outer radius', () => {
    expect(scoreFromDistance(200)).toBe(0);
  });
  it('labels direction by octant with y-up', () => {
    expect(directionFromVector({ x: 10, y: 0 })).toBe('Right');
    expect(directionFromVector({ x: 0, y: 10 })).toBe('High');
    expect(directionFromVector({ x: -10, y: 0 })).toBe('Left');
  });
});
