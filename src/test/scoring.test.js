import { describe, it, expect } from 'vitest';
import { scoreFromMm } from '../lib/scoring.js';

describe('client scoring re-export', () => {
  it('scores center high', () => {
    expect(scoreFromMm({ x: 0, y: 0 }).score).toBeGreaterThanOrEqual(10.8);
  });
  it('labels direction', () => {
    expect(scoreFromMm({ x: 0, y: 20 }).dir).toBe('High');
  });
});
