import { useRef, useState } from 'react';
import { TEN_RING_RADIUS_MM, RING_RADIUS_STEP_MM, PELLET_RADIUS_MM } from '../lib/scoring.js';

const SPAN = 80; // mm half-extent at 1x (target outer ~69.75mm + margin)
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
// Ring radii: 10-ring is innermost, ring 1 is outermost.
const ringRadius = (ring) => TEN_RING_RADIUS_MM + (10 - ring) * RING_RADIUS_STEP_MM;
const BLACK_FROM_RING = 7; // rings <=7 area is black on the AP target

export default function TargetCanvas({ shots = [], onTap, armed }) {
  const ref = useRef(null);
  const lastTapRef = useRef(0);
  const [zoom, setZoom] = useState(1);
  const viewSpan = SPAN / zoom; // smaller span = zoomed in, centered on bull

  function handle(e) {
    const now = Date.now();
    if (now - lastTapRef.current < 400) return; // prevent duplicate taps
    lastTapRef.current = now;

    const svg = ref.current;
    const rect = svg.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    // Convert against the CURRENT (zoomed) view span so coords stay accurate.
    const mmX = (px / rect.width) * (viewSpan * 2) - viewSpan;
    const mmY = -((py / rect.height) * (viewSpan * 2) - viewSpan); // flip to y-up
    onTap?.({ x: Math.round(mmX * 10) / 10, y: Math.round(mmY * 10) / 10 });
  }

  const changeZoom = (delta) => setZoom((z) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 10) / 10)));

  const rings = [];
  for (let ring = 1; ring <= 9; ring++) {
    const r = ringRadius(ring);
    const black = ring <= BLACK_FROM_RING;
    rings.push(
      <circle key={ring} cx="0" cy="0" r={r}
        fill="none" stroke={black ? '#cfd8e3' : '#3a4654'} strokeWidth="0.4" />
    );
    rings.push(
      <text key={`t${ring}`} x="0" y={-r + 3.2} fontSize="3"
        fill={black ? '#cfd8e3' : '#6b7785'} textAnchor="middle">{ring}</text>
    );
  }

  return (
    <div className="target-zoom-wrap">
      <div className="zoom-controls">
        <button className="secondary" onClick={() => changeZoom(-ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">−</button>
        <span className="zoom-label">{zoom.toFixed(1)}×</span>
        <button className="secondary" onClick={() => changeZoom(ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
      </div>
      <svg ref={ref} viewBox={`${-viewSpan} ${-viewSpan} ${viewSpan * 2} ${viewSpan * 2}`}
        className={`target ${armed ? 'armed' : ''}`} width="100%"
        style={{ touchAction: 'none', aspectRatio: '1 / 1', borderRadius: 12 }}
        onClick={handle} onTouchStart={(e) => { e.preventDefault(); handle(e); }}>
        {/* Background spans the full 1x extent so it always fills the view. */}
        <rect x={-SPAN} y={-SPAN} width={SPAN * 2} height={SPAN * 2} fill="#0b0e12" rx="3" />
        {/* black aiming area = outer edge of 7-ring */}
        <circle cx="0" cy="0" r={ringRadius(BLACK_FROM_RING)} fill="#11161c" />
        {rings}
        {/* inner 10 ring + center dot */}
        <circle cx="0" cy="0" r={TEN_RING_RADIUS_MM} fill="none" stroke="#cfd8e3" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="0.6" fill="#cfd8e3" />
        {shots.map((s) => {
          const items = [];
          if (s.call) items.push(
            <g key={`c${s.n}`}>
              <circle cx={s.call.x} cy={-s.call.y} r={PELLET_RADIUS_MM}
                fill="none" stroke="#2f81f7" strokeWidth="0.6" />
              <text x={s.call.x} y={-s.call.y + 1.1} fontSize="2.4" fill="#2f81f7"
                textAnchor="middle">{s.n}</text>
            </g>
          );
          if (s.actual) items.push(
            <circle key={`a${s.n}`} cx={s.actual.x} cy={-s.actual.y} r={PELLET_RADIUS_MM}
              fill="#f85149" opacity="0.9" />
          );
          return items;
        })}
      </svg>
    </div>
  );
}
