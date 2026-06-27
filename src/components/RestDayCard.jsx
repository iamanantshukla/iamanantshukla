// src/components/RestDayCard.jsx
import Pebble from './Pebble.jsx';
export default function RestDayCard({ onLogAnyway }) {
  return (
    <div className="rest-card">
      <Pebble size={64} expression="resting" />
      <h2>Rest day</h2>
      <p className="muted">Recover well — sleep, mobility, light walk. Pebble's taking it easy too.</p>
      <button className="secondary" onClick={onLogAnyway}>Log a workout anyway</button>
    </div>
  );
}
