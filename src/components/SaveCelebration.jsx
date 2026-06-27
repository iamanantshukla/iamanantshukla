// src/components/SaveCelebration.jsx — Pebble's moment after a save (spec §4.4). Replaces the silent
// navigate('/shoot'). The proud Pebble + the celebration animation are gated SCORE-BLIND on `earned`
// (mission.completed === true OR a beaten process baseline) — NEVER the ISSF score. The same gate is
// used for shooting, gym and journal saves (one shared streak). When not earned, it's a calm,
// honest acknowledgement (no manufactured praise) — forgiveness over hype.
import Pebble from './Pebble.jsx';

export default function SaveCelebration({
  earned, line, continuityDay, stats = [], onAddFeel, onReview, onClose,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal celebrate${earned ? ' celebrate-proud' : ''}`} onClick={(e) => e.stopPropagation()}
           style={{ maxWidth: 420, textAlign: 'center' }}>
        {/* Proud face only when earned; otherwise a calm neutral (state never carried by face alone). */}
        <div className="celebrate-pebble">
          <Pebble size={72} expression={earned ? 'proud' : 'neutral'} className={earned ? 'pebble-pop' : ''} />
        </div>

        {line ? <p className="celebrate-line">{line}</p> : null}

        {continuityDay > 0 ? (
          <div className="celebrate-continuity muted">Day {continuityDay} · steady</div>
        ) : null}

        {stats.length ? (
          <div className="celebrate-stats">
            {stats.map((s) => (
              <div key={s.label} className="celebrate-stat">
                <span className="celebrate-stat-v">{s.value}</span>
                <span className="celebrate-stat-l">{s.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="celebrate-actions">
          <button className="secondary" onClick={onAddFeel}>Add how it felt</button>
          <button onClick={onReview}>Ask Pebble for a review</button>
        </div>
        <button className="celebrate-dismiss secondary" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
