// src/lib/scoring.js — ISSF 10m Air Pistol decimal scoring (pure functions, ESM).
// Vendored locally so this client builds standalone (no external shared/ dependency).

export const TEN_RING_RADIUS_MM = 5.75;   // 11.5mm diameter
export const RING_RADIUS_STEP_MM = 8;     // each integer ring is +8mm radius outward
export const PELLET_RADIUS_MM = 2.25;     // 4.5mm pellet diameter
const ONE_RING_OUTER_RADIUS_MM = TEN_RING_RADIUS_MM + 8 * RING_RADIUS_STEP_MM; // 69.75
const INNER_TEN_RADIUS_MM = 2.5;          // within this, call it "Center"

export function scoreFromDistance(distMm) {
  const edge = Math.max(0, distMm - PELLET_RADIUS_MM);
  if (edge > ONE_RING_OUTER_RADIUS_MM) return 0;
  const raw = 10.9 - (edge / RING_RADIUS_STEP_MM);
  const clamped = Math.max(0, Math.min(10.9, raw));
  return Math.round(clamped * 10) / 10;
}

const OCTANTS = ['Right', 'High-Right', 'High', 'High-Left', 'Left', 'Low-Left', 'Low', 'Low-Right'];

export function directionFromVector({ x, y }) {
  const dist = Math.hypot(x, y);
  if (dist <= INNER_TEN_RADIUS_MM) return 'Center';
  let deg = Math.atan2(y, x) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  const idx = Math.round(deg / 45) % 8;
  return OCTANTS[idx];
}

export function scoreFromMm({ x, y }) {
  const dist = Math.hypot(x, y);
  return { score: scoreFromDistance(dist), dir: directionFromVector({ x, y }) };
}
