// src/lib/targetGeometry.js — ISSF 10m air-pistol target geometry + zoom-invariant tap mapping (§4.3).
//
// The spec's model, exactly:
//   - a FIXED viewBox in millimetres (170mm square), centred on the bull.
//   - real ISSF ring dimensions: 5.75mm 10-ring radius, +8mm radius per ring step.
//   - the DRAWN pellet marker is slightly UNDER true 4.5mm scale (radius ~1.8mm, not 2.25mm) so it
//     reads lighter and is more precise on screen.
//   - ZOOM is a uniform CSS transform of the whole picture — the viewBox and the drawn pellet radius
//     NEVER change, so the pellet-to-ring ratio stays physically true at every zoom.
//
// Why the score is zoom-invariant: scoring reads the mm coordinate (from the marker CENTRE), and the
// tap->mm mapping below uses only the rendered box's fractional position. A CSS transform scales the
// rendered box uniformly, so getBoundingClientRect grows/shrinks proportionally and the same physical
// point maps to the same fraction -> the same mm -> the same score, at every zoom. (See scoring.js,
// which also measures from the marker centre, so the score is independent of the drawn pellet size.)

import { TEN_RING_RADIUS_MM, RING_RADIUS_STEP_MM, PELLET_RADIUS_MM } from './scoring.js';

// Fixed mm viewBox side. 170mm comfortably frames the full target (1-ring outer ~77.75mm radius).
export const VIEWBOX_MM = 170;

export const TRUE_PELLET_RADIUS_MM = PELLET_RADIUS_MM; // 2.25mm — the physical gauge (scoring only)
export const DRAWN_PELLET_RADIUS_MM = 1.8;             // sub-1:1 on-screen marker (reads lighter)

export const ZOOM_MIN = 1.0;
export const ZOOM_MAX = 3.0;
export const ZOOM_STEP = 0.5;

// Ring radius in mm (10 = innermost 5.75mm, 1 = outermost 77.75mm).
export function ringRadiusMm(ring) {
  return TEN_RING_RADIUS_MM + (10 - ring) * RING_RADIUS_STEP_MM;
}

// Map a pointer position (px, py relative to the rendered SVG box's top-left) to target mm, y-up,
// origin at centre. `rect` is the element's getBoundingClientRect (already reflects any CSS zoom
// transform), so this is correct at every zoom level. Rounded to 0.1mm to match capture precision.
export function tapToMm(px, py, rect) {
  const fx = px / rect.width;            // 0..1 across
  const fy = py / rect.height;           // 0..1 down
  const x = fx * VIEWBOX_MM - VIEWBOX_MM / 2;
  const y = -(fy * VIEWBOX_MM - VIEWBOX_MM / 2); // flip to y-up
  // `+ 0` normalizes -0 -> 0 so coords serialize/compare cleanly.
  return { x: Math.round(x * 10) / 10 + 0, y: Math.round(y * 10) / 10 + 0 };
}
