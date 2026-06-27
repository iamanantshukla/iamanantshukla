// src/test/targetGeometry.test.js — the ISSF target geometry + zoom-invariant tap mapping (§4.3).
// The spec's model: a FIXED 170mm viewBox, real ISSF ring dimensions, a sub-1:1 DRAWN pellet, and
// zoom as a uniform CSS transform of the whole picture (the viewBox + pellet radius never change).
// Because the viewBox is fixed and the CSS transform scales the rendered box uniformly, a tap maps
// to the same mm coordinate at every zoom — so the score never depends on zoom or pellet draw size.
import { describe, it, expect } from 'vitest';
import {
  VIEWBOX_MM, DRAWN_PELLET_RADIUS_MM, TRUE_PELLET_RADIUS_MM, ringRadiusMm, tapToMm,
} from '../lib/targetGeometry.js';

describe('targetGeometry', () => {
  it('uses the real ISSF 170mm viewBox', () => {
    expect(VIEWBOX_MM).toBe(170);
  });

  it('draws the pellet slightly UNDER true scale for on-screen precision (not 1:1)', () => {
    expect(TRUE_PELLET_RADIUS_MM).toBe(2.25);
    expect(DRAWN_PELLET_RADIUS_MM).toBeLessThan(TRUE_PELLET_RADIUS_MM);
    expect(DRAWN_PELLET_RADIUS_MM).toBeCloseTo(1.8, 5);
  });

  it('ring radii follow 5.75mm 10-ring + 8mm per step', () => {
    expect(ringRadiusMm(10)).toBe(5.75);
    expect(ringRadiusMm(9)).toBe(13.75);
    expect(ringRadiusMm(1)).toBe(77.75);
  });

  // tapToMm(px, py, rect) maps a pointer position (relative to the rendered SVG box) to target mm,
  // y-up, centre origin. rect is the getBoundingClientRect of the (possibly CSS-scaled) element.
  it('maps the centre of the box to the target centre (0,0) at any rendered size', () => {
    expect(tapToMm(100, 100, { width: 200, height: 200 })).toEqual({ x: 0, y: 0 });
    // a larger rendered box (e.g. CSS zoom 2x) -> same centre maps to (0,0)
    expect(tapToMm(200, 200, { width: 400, height: 400 })).toEqual({ x: 0, y: 0 });
  });

  it('is ZOOM-INVARIANT: the same fractional point yields the same mm at any rendered scale', () => {
    // 75% across, 50% down on a 200px box...
    const a = tapToMm(150, 100, { width: 200, height: 200 });
    // ...and the identical fractional point on a 2x-CSS-scaled 400px box must give the SAME mm.
    const b = tapToMm(300, 200, { width: 400, height: 400 });
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });

  it('maps the right edge to +half-viewBox mm and flips y to up', () => {
    const r = tapToMm(200, 0, { width: 200, height: 200 }); // top-right corner
    expect(r.x).toBeCloseTo(VIEWBOX_MM / 2, 5);   // +85mm
    expect(r.y).toBeCloseTo(VIEWBOX_MM / 2, 5);   // top -> +85mm (y-up)
  });
});
