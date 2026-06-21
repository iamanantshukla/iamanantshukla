import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import ReviewsView from './ReviewsView.jsx';

function ProgressBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--muted)' }}>{value.toFixed(1)}/5</span>
      </div>
      <div style={{ height: '8px', background: 'var(--panel-2)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${(value / 5) * 100}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const res = await api.getStats(dateStr);
        if (active) setStats(res);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="loading">Loading Dashboard…</div>;

  return (
    <div className="dashboard-view" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Welcome Back!</h1>
        <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>Here's your shooting performance overview.</p>
      </header>

      {/* Top 4 Metric Cards */}
      <div className="stats-dashboard-grid" style={{ marginBottom: '32px' }}>
        <div className="card dashboard-card" style={{ borderLeftColor: 'var(--good)' }}>
          <div className="card-header-icon" style={{ color: 'var(--good)' }}>🏃 Running (Week)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats?.week?.running?.kms || 0} <span style={{fontSize:'1rem', color:'var(--muted)'}}>km</span></div>
          <div className="stat-sub">{stats?.week?.running?.sessions || 0} sessions</div>
        </div>
        <div className="card dashboard-card" style={{ borderLeftColor: 'var(--warn)' }}>
          <div className="card-header-icon" style={{ color: 'var(--warn)' }}>😴 Sleep (Week)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats?.week?.sleep?.avgHours || 0} <span style={{fontSize:'1rem', color:'var(--muted)'}}>hrs avg</span></div>
          <div className="stat-sub">Consistent recovery</div>
        </div>
        <div className="card dashboard-card" style={{ borderLeftColor: 'var(--accent)' }}>
          <div className="card-header-icon" style={{ color: 'var(--accent)' }}>🎯 Volume (Week)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats?.week?.sessions?.totalShots || 0} <span style={{fontSize:'1rem', color:'var(--muted)'}}>shots</span></div>
          <div className="stat-sub">{stats?.week?.sessions?.totalHours || 0} hours trained</div>
        </div>
        <div className="card dashboard-card" style={{ borderLeftColor: 'var(--good)' }}>
          <div className="card-header-icon" style={{ color: 'var(--good)' }}>🏋️ Gym (Week)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats?.week?.gym?.sessions || 0} <span style={{fontSize:'1rem', color:'var(--muted)'}}>sessions</span></div>
          <div className="stat-sub truncate">{stats?.week?.gym?.muscles || 'None recorded'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Last Session / Recent Matches Mockup */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>Recent Sessions</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontWeight: 600 }}>2026-06-20</span>
            <span style={{ color: 'var(--muted)' }}>Dry Fire</span>
            <span style={{ color: 'var(--good)', fontWeight: 600 }}>45m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontWeight: 600 }}>2026-06-19</span>
            <span style={{ color: 'var(--muted)' }}>Live Fire</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>60m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ fontWeight: 600 }}>2026-06-15</span>
            <span style={{ color: 'var(--muted)' }}>Dry Fire</span>
            <span style={{ color: 'var(--warn)', fontWeight: 600 }}>30m</span>
          </div>
        </div>

        {/* Skill Confidence Breakdown Mockup */}
        <div className="card">
          <h3 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>Skill Confidence Breakdown</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '20px' }}>Average self-grades from your last 3 sessions.</p>
          <ProgressBar label="Posture & Stance" value={4.2} color="var(--good)" />
          <ProgressBar label="Breathing Rhythm" value={3.5} color="var(--warn)" />
          <ProgressBar label="Hold Steadiness" value={4.0} color="var(--good)" />
          <ProgressBar label="Trigger Release" value={2.8} color="var(--bad)" />
          <ProgressBar label="Wrist Lock" value={3.0} color="var(--warn)" />
        </div>
      </div>

      <div className="card">
         <h3 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>AI Insights & Analysis</h3>
         <ReviewsView hideDashboard={true} />
      </div>
    </div>
  );
}
