import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrainingPlanView() {
  const navigate = useNavigate();
  const [expandedDay, setExpandedDay] = useState(null);

  if (expandedDay) {
    return (
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button className="secondary" onClick={() => setExpandedDay(null)} style={{ marginBottom: '20px' }}>← Back to Plan</button>
        
        <header style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, color: 'var(--accent)' }}>Day 2: Stability & Stamina</h1>
          <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>
            <strong>Why this plan?</strong> In your last session, your "Wrist Lock" and "Trigger Release" self-grades dropped significantly in the final 15 minutes. This indicates muscle fatigue. Today's focus is building core stamina and visualization to combat late-session drops.
          </p>
        </header>

        <h3 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>Training Modules</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-2)', padding: '16px', borderRadius: '12px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>2km Run</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Cardio base building</div>
            </div>
            <button className="secondary" style={{ fontSize: '0.8rem' }}>Swap Module ↻</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-2)', padding: '16px', borderRadius: '12px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Mental Visualization (10m)</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Perfect sight alignment visualization</div>
            </div>
            <button className="secondary" style={{ fontSize: '0.8rem' }}>Swap Module ↻</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-2)', padding: '16px', borderRadius: '12px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Stamina Hold Training (15m)</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Overweight holds focusing on wrist lock</div>
            </div>
            <button className="secondary" style={{ fontSize: '0.8rem' }}>Swap Module ↻</button>
          </div>
        </div>

        <h3 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>Today's Challenges</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--panel-2)', borderRadius: '8px', cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: '20px', height: '20px' }} />
            <span>Keep heart rate below 140bpm on the run</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--panel-2)', borderRadius: '8px', cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: '20px', height: '20px' }} />
            <span>Complete 5 perfect mental shot sequences</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--panel-2)', borderRadius: '8px', cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: '20px', height: '20px' }} />
            <span>Hold the pistol for 60s without sight wobble (3 sets)</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="primary" style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px', borderRadius: '999px', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/active')}>
            Start Timer & Log Session
          </button>
          <button className="secondary" style={{ flex: 1, padding: '12px', borderRadius: '999px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setExpandedDay(null)}>
            Mark Day as Complete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, color: 'var(--good)' }}>Your Training Plan is Ready</h1>
        <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>Based on your last causal analysis, we created a personalized microcycle.</p>
      </header>

      <div style={{ background: 'rgba(71, 196, 77, 0.1)', border: '1px solid var(--good)', padding: '16px', borderRadius: '12px', marginBottom: '32px', color: 'var(--good)', fontWeight: 600 }}>
        Great start. You completed your first session. (1/3)
      </div>

      <h3 style={{ marginBottom: '16px' }}>Weekly Plan</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Day 1 */}
        <div style={{ background: 'var(--panel-2)', border: '1px solid var(--good)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600 }}>Day 1</span>
            <span style={{ fontSize: '0.8rem', background: 'rgba(252, 76, 2, 0.2)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '999px' }}>Medium</span>
          </div>
          <div style={{ color: 'var(--good)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>✓ Completed</div>
          <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            <li style={{ marginBottom: '8px' }}>Dry firing</li>
            <li style={{ marginBottom: '8px' }}>Hold stance training</li>
            <li>Mirror training</li>
          </ul>
        </div>

        {/* Day 2 */}
        <div style={{ background: 'var(--panel)', border: '2px solid var(--accent)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600 }}>Day 2</span>
            <span style={{ fontSize: '0.8rem', background: 'var(--panel-2)', color: 'var(--text)', padding: '2px 8px', borderRadius: '999px' }}>Light</span>
          </div>
          <div style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>In progress</div>
          <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text)', fontSize: '0.9rem' }}>
            <li style={{ marginBottom: '8px' }}>2km run</li>
            <li style={{ marginBottom: '8px' }}>Mental visualization</li>
            <li>Stamina training</li>
          </ul>
          <button style={{ width: '100%', marginTop: '20px' }} onClick={() => setExpandedDay(2)}>Continue Session</button>
        </div>

        {/* Day 3 */}
        <div style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px', opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600 }}>Day 3</span>
            <span style={{ fontSize: '0.8rem', background: 'rgba(217, 41, 27, 0.2)', color: 'var(--bad)', padding: '2px 8px', borderRadius: '999px' }}>Intense</span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>Not started</div>
          <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            <li style={{ marginBottom: '8px' }}>Live fire match simulation</li>
            <li style={{ marginBottom: '8px' }}>SCATT analysis</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
