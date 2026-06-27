// client/src/components/MissionCard.jsx — the Home centerpiece (spec E §4.3).
//
// Renders today's mission (today.json) as one holistic daily briefing: headline + readiness chip +
// the sections that exist (shooting / physical / mental / recovery) + the inputsRequested prompts as
// tappable chips. Only renders sections that are present (an absent section is omitted, not shown
// empty). Degrades gracefully:
//   - stale/old mission  -> render it with a "last planned X ago" stamp, never blank
//   - no mission at all   -> calm empty state with the manual hubs still reachable
//
// Pure presentational + callback props so it is trivially unit-testable from a today.json fixture.

import { IconTarget, IconDumbbell, IconNotebook, IconPlay, IconChevronRight } from './Icons.jsx';

// Map an inputsRequested key to a friendly, emoji-free label (locked decision #8).
const INPUT_LABELS = {
  sleep_hours: 'Log sleep',
  session_reflection: 'Add reflection',
  reflection: 'Add reflection',
  mood: 'Log mood',
  rpe: 'Log effort',
  training_rpe: 'Log effort',
  body: 'Log body',
  shooting_feel: 'Log shooting feel',
};
function inputLabel(key) {
  return INPUT_LABELS[key] || `Log ${String(key).replace(/_/g, ' ')}`;
}

const BAND_LABEL = { green: 'Ready', amber: 'Caution', red: 'Recover' };

function readiness(mission) {
  return mission && (mission.readinessBand || (mission.readiness && mission.readiness.band));
}

export default function MissionCard({
  mission,
  freshness = null,
  mentalScenario = null,
  onStartShooting,
  onStartMental,
  onInput,
  onGym,
  onJournal,
  onShoot,
}) {
  // No mission at all: calm empty state with manual entry points (spec E §4.3).
  if (!mission) {
    return (
      <section className="mission-card mission-empty" aria-label="Today's mission">
        <div className="mission-head"><h2 className="mission-title">Today's mission</h2></div>
        <p className="mission-empty-text muted">
          No mission yet — your plan will appear once the planner has run.
        </p>
        <div className="mission-manual">
          <button className="mission-chip" onClick={onShoot}><IconTarget size={16} /> Shoot</button>
          <button className="mission-chip" onClick={onGym}><IconDumbbell size={16} /> Gym</button>
          <button className="mission-chip" onClick={onJournal}><IconNotebook size={16} /> Journal</button>
        </div>
      </section>
    );
  }

  const band = readiness(mission);
  const shooting = mission.shooting;
  const physical = mission.physical;
  const mental = mission.mental;
  const recovery = Array.isArray(mission.recovery) ? mission.recovery : [];
  const inputs = Array.isArray(mission.inputsRequested) ? mission.inputsRequested : [];
  const scenario = mentalScenario || (mental && mental.scenario) || null;

  return (
    <section className="mission-card" aria-label="Today's mission">
      <div className="mission-head">
        <h2 className="mission-title">Today's mission</h2>
        {band ? (
          <span className={`mission-band band-${band}`}>{BAND_LABEL[band] || band}</span>
        ) : null}
      </div>

      {mission.headline ? <p className="mission-headline">{mission.headline}</p> : null}

      {shooting ? (
        <div className="mission-section">
          <div className="mission-sec-head"><IconTarget size={16} /> Shooting</div>
          <div className="mission-sec-body">{shooting.prescription || shooting.module || 'Shooting block'}</div>
          {onStartShooting ? (
            <button className="mission-start" onClick={() => onStartShooting(shooting)}>
              <IconPlay size={14} /> Start session
            </button>
          ) : null}
        </div>
      ) : null}

      {physical ? (
        <button className="mission-section mission-section-link" onClick={onGym}>
          <div className="mission-sec-head"><IconDumbbell size={16} /> Physical</div>
          <div className="mission-sec-body">
            {physical.block || 'Workout'}{physical.reason ? ` — ${physical.reason}` : ''}
          </div>
          <IconChevronRight size={16} className="mission-chev" />
        </button>
      ) : null}

      {(mental || scenario) ? (
        <div className="mission-section">
          <div className="mission-sec-head">Mental</div>
          <div className="mission-sec-body">{scenario || 'Visualization scenario'}</div>
          {onStartMental ? (
            <button className="mission-start secondary" onClick={onStartMental}>
              <IconPlay size={14} /> Start mental
            </button>
          ) : null}
        </div>
      ) : null}

      {recovery.length ? (
        <div className="mission-section">
          <div className="mission-sec-head">Recovery</div>
          <ul className="mission-recovery">
            {recovery.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      ) : null}

      {inputs.length ? (
        <div className="mission-inputs">
          <div className="mission-inputs-label muted">Requested inputs</div>
          <div className="mission-inputs-chips">
            {inputs.map((key) => (
              <button key={key} className="mission-chip" onClick={() => onInput && onInput(key)}>
                {inputLabel(key)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {freshness ? <div className="mission-freshness muted">Last planned {freshness}</div> : null}
    </section>
  );
}
