// src/views/CampaignView.jsx — the Campaign dashboard "instrument" (spec §4.2), reached from Home's
// season strip. This is the SHELL + phase ribbon (M1); the scored sims, form metrics, "how I'm
// growing" and season-form (TSB) content land in M4 once the agent writes the sims/aggregates file.
// Read-only, cache-first: everything renders from the campaign singleton already on the client.
import { useNavigate } from 'react-router-dom';
import { useJarvis } from '../context/JarvisContext.jsx';
import { IconChevronLeft } from '../components/Icons.jsx';
import { PHASE_RIBBON, ribbonIndex, currentPhaseType } from '../lib/phases.js';

// A tiny inline sparkline from an array of numbers (no axes — a glanceable trend).
function Sparkline({ points = [], width = 96, height = 24 }) {
  if (!points.length) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const d = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / span) * height;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--good)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// One form metric: label, current value, signed delta vs last month, and a sparkline.
function Metric({ label, value, delta, history }) {
  const up = typeof delta === 'number' && delta > 0;
  const down = typeof delta === 'number' && delta < 0;
  return (
    <div className="metric">
      <div className="metric-head">
        <span className="metric-label muted">{label}</span>
        {typeof delta === 'number' ? (
          <span className={`metric-delta${up ? ' up' : ''}${down ? ' down' : ''}`}>
            {up ? '+' : ''}{delta}
          </span>
        ) : null}
      </div>
      <div className="metric-value">{value}</div>
      <Sparkline points={history || []} />
    </div>
  );
}

export default function CampaignView() {
  const navigate = useNavigate();
  const { campaign, sims } = useJarvis();
  const activeIdx = ribbonIndex(currentPhaseType(campaign));
  // Days to race: prefer the agent value, else derive from the next race date on campaign.json.
  const daysToRace = (campaign && campaign.daysToRace != null) ? campaign.daysToRace : null;
  const latest = sims && sims.latestSim;
  const metrics = (sims && Array.isArray(sims.formMetrics)) ? sims.formMetrics : [];
  const growth = sims && sims.growth;

  return (
    <div className="campaign">
      <button className="leaf-back" onClick={() => navigate('/')} aria-label="Back to Home">
        <IconChevronLeft size={18} /> Home
      </button>

      <header className="campaign-head">
        <h1 className="campaign-title">Road to Nationals</h1>
        {daysToRace != null ? (
          <span className="campaign-days muted">{daysToRace} days to race</span>
        ) : null}
      </header>

      <ol className="phase-ribbon" aria-label="Season phase">
        {PHASE_RIBBON.map((label, i) => (
          <li
            key={label}
            className={`phase-step${i === activeIdx ? ' current' : ''}${i < activeIdx ? ' done' : ''}`}
            aria-current={i === activeIdx ? 'step' : undefined}
          >
            {label}
          </li>
        ))}
      </ol>

      {sims ? (
        <>
          {/* Latest competition simulation — a scored match-sim event. */}
          {latest ? (
            <section className="campaign-card sim-card">
              <div className="sim-head">
                <span className="sim-score">{latest.score}</span>
                {latest.rating ? <span className="sim-rating">{latest.rating}</span> : null}
              </div>
              <div className="sim-meta muted">
                {latest.date ? <span>{latest.date}</span> : null}
                {latest.decimalAvg != null ? <span>decimal avg {latest.decimalAvg}</span> : null}
                {latest.groupSize != null ? <span>group {latest.groupSize}mm</span> : null}
                {latest.vsLast ? <span>{latest.vsLast} vs last sim</span> : null}
              </div>
            </section>
          ) : null}

          {/* Form metrics vs last month. */}
          {metrics.length ? (
            <>
              <div className="section-label">Form vs last month</div>
              <div className="metric-grid">
                {metrics.map((m) => (
                  <Metric key={m.label} label={m.label} value={m.value} delta={m.delta} history={m.history} />
                ))}
              </div>
            </>
          ) : null}

          {/* "How I'm growing" — progress toward the qualifying target. */}
          {growth ? (
            <section className="campaign-card growth-card">
              <div className="section-label">How I'm growing</div>
              <div className="growth-bar" role="img"
                   aria-label={`${growth.current} toward ${growth.target}`}>
                <div className="growth-fill" style={{
                  width: `${Math.max(0, Math.min(100, growth.target
                    ? Math.round(((growth.current - growth.start) / (growth.target - growth.start)) * 100)
                    : 0))}%`,
                }} />
              </div>
              <div className="growth-meta muted">
                <span>start {growth.start}</span>
                {growth.personalBest != null ? <span>PB {growth.personalBest}</span> : null}
                <span>target {growth.target}</span>
              </div>
              {growth.trajectory ? <div className="growth-traj">{growth.trajectory}</div> : null}
            </section>
          ) : null}

          {/* Season form (TSB) + sims logged. */}
          {sims.seasonForm ? (
            <section className="campaign-card">
              <div className="section-label">Season form</div>
              <div className="muted">
                {sims.seasonForm.tsb != null ? <span>TSB {sims.seasonForm.tsb}</span> : null}
                {sims.seasonForm.simsLogged != null ? <span> · {sims.seasonForm.simsLogged} sims logged</span> : null}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="says-card campaign-pending">
          <div className="says-text muted">
            Your competition sims and form trends appear here once Pebble has logged a few scored
            sessions.
          </div>
        </div>
      )}
    </div>
  );
}
