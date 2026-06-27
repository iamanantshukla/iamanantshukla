import { useRef, useState } from 'react';
import {
  VIEWBOX_MM, DRAWN_PELLET_RADIUS_MM, ringRadiusMm, tapToMm,
  ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
} from '../lib/targetGeometry.js';

// ISSF 10m air-pistol target (spec §4.3). FIXED 170mm viewBox; zoom is a uniform CSS transform of the
// whole picture, so the viewBox + drawn pellet radius never change and the pellet-to-ring ratio stays
// physically true at every zoom. The drawn pellet is sub-1:1 (~1.8mm) for on-screen precision; the
// SCORE is computed from the marker centre (scoring.js), so it is independent of both zoom and the
// drawn pellet size. Markers: call = blue dashed ring (--call), actual = solid coral dot, with a
// dashed warm line connecting them.
const HALF = VIEWBOX_MM / 2;            // 85mm
const BLACK_FROM_RING = 7;              // rings <=7 sit in the black aiming area
const TAP_DEBOUNCE_MS = 300;

export default function TargetCanvas({ shots = [], onTap, armed }) {
  const ref = useRef(null);
  const lastTapRef = useRef(0);
  const [zoom, setZoom] = useState(1);

  function handle(e) {
    const now = Date.now();
    if (now - lastTapRef.current < TAP_DEBOUNCE_MS) return; // de-dupe click+touch double fire
    lastTapRef.current = now;
    const rect = ref.current.getBoundingClientRect(); // reflects the CSS zoom transform
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    onTap?.(tapToMm(px, py, rect));
  }

  const changeZoom = (delta) => setZoom((z) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 10) / 10)));

  // Rings 1..9 (10-ring + centre dot drawn separately). Ring NUMERALS only inside the white area
  // (>=8) where they're legible; everything is mm-true in the fixed viewBox.
  const rings = [];
  for (let ring = 1; ring <= 9; ring++) {
    const r = ringRadiusMm(ring);
    const black = ring <= BLACK_FROM_RING;
    rings.push(
      <circle key={ring} cx="0" cy="0" r={r} fill="none"
        stroke={black ? '#cfd8e3' : '#3a4654'} strokeWidth="0.4" />,
    );
    if (ring >= 8) {
      rings.push(
        <text key={`t${ring}`} x="0" y={-r + 3.2} fontSize="3"
          fill={black ? '#cfd8e3' : '#6b7785'} textAnchor="middle">{ring}</text>,
      );
    }
  }

  return (
    <div className="target-zoom-wrap">
      <div className="zoom-controls">
        <button className="secondary" onClick={() => changeZoom(-ZOOM_STEP)}
          disabled={zoom <= ZOOM_MIN} aria-label="Zoom out">−</button>
        <span className="zoom-label">{zoom.toFixed(1)}×</span>
        <button className="secondary" onClick={() => changeZoom(ZOOM_STEP)}
          disabled={zoom >= ZOOM_MAX} aria-label="Zoom in">+</button>
      </div>

      {/* The zoom is a uniform CSS transform of the rendered SVG; the viewBox is constant. */}
      <div className="target-viewport">
        <svg
          ref={ref}
          viewBox={`${-HALF} ${-HALF} ${VIEWBOX_MM} ${VIEWBOX_MM}`}
          className={`target ${armed ? 'armed' : ''}`}
          width="100%"
          style={{
            touchAction: 'none', aspectRatio: '1 / 1', borderRadius: 12,
            transform: `scale(${zoom})`, transformOrigin: 'center center',
          }}
          onClick={handle}
          onTouchStart={(e) => { e.preventDefault(); handle(e); }}
        >
          <rect x={-HALF} y={-HALF} width={VIEWBOX_MM} height={VIEWBOX_MM} fill="#0b0e12" rx="3" />
          {/* black aiming area = outer edge of the 7-ring */}
          <circle cx="0" cy="0" r={ringRadiusMm(BLACK_FROM_RING)} fill="#11161c" />
          {rings}
          <circle cx="0" cy="0" r={ringRadiusMm(10)} fill="none" stroke="#cfd8e3" strokeWidth="0.4" />
          <circle cx="0" cy="0" r="0.6" fill="#cfd8e3" />

          {shots.map((s) => {
            const items = [];
            // Dashed warm connector between the call and where the shot actually landed.
            if (s.call && s.actual) items.push(
              <line key={`l${s.n}`} x1={s.call.x} y1={-s.call.y} x2={s.actual.x} y2={-s.actual.y}
                stroke="var(--muted)" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.7" />,
            );
            // CALL: blue dashed ring (the felt shot).
            if (s.call) items.push(
              <g key={`c${s.n}`}>
                <circle cx={s.call.x} cy={-s.call.y} r={DRAWN_PELLET_RADIUS_MM}
                  fill="none" stroke="var(--call)" strokeWidth="0.5" strokeDasharray="1 1" />
                <text x={s.call.x} y={-s.call.y + 1.0} fontSize="2.2" fill="var(--call)"
                  textAnchor="middle">{s.n}</text>
              </g>,
            );
            // ACTUAL: solid coral dot (where it really went).
            if (s.actual) items.push(
              <circle key={`a${s.n}`} cx={s.actual.x} cy={-s.actual.y} r={DRAWN_PELLET_RADIUS_MM}
                fill="var(--accent)" opacity="0.92" />,
            );
            return items;
          })}
        </svg>
      </div>
    </div>
  );
}
