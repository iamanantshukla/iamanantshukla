// src/lib/scoring.js — ISSF 10m Air Pistol decimal scoring (pure functions, ESM).
// Vendored locally so this client builds standalone (no external shared/ dependency).

export const TEN_RING_RADIUS_MM = 5.75;   // 11.5mm diameter
export const RING_RADIUS_STEP_MM = 8;     // each integer ring is +8mm radius outward
export const PELLET_RADIUS_MM = 2.25;     // 4.5mm pellet diameter (true physical gauge)
const INNER_TEN_RADIUS_MM = 2.5;          // within this, call it "Center"

// Decimal score from the radial distance of the MARKER CENTRE to the target centre:
//   score = 11 - mm/8, clamped to [0, 10.9].
// The 4.5mm pellet's ring-breaking credit is baked into the slope and the 11 intercept — a centre
// 8mm out scores 10.0 (the 5.75mm 10-ring + 2.25mm pellet edge), each +8mm drops one ring. Because
// it is measured from the marker CENTRE, the score is independent of the pellet's DRAWN size, so the
// on-screen marker can be shrunk for precision without affecting the score (spec §4.3). A raw score
// below 1.0 means the pellet no longer touches the 1-ring -> a miss (0).
export function scoreFromDistance(distMm) {
  const raw = 11 - (distMm / RING_RADIUS_STEP_MM);
  if (raw < 1) return 0;                       // pellet past the 1-ring outer edge -> miss
  const clamped = Math.min(10.9, raw);
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
