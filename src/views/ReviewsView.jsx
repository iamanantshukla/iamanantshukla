import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { IconRun, IconDumbbell, IconMoon, IconTarget } from '../components/Icons.jsx';

// Clean regex-based markdown-to-html renderer
function renderMarkdown(md) {
  if (!md) return '';
  
  // Escape HTML tags to prevent custom injected scripts
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Replace headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Replace bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Replace inline code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Replace blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Parse lines to handle bullet lists nicely
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      let content = trimmed.substring(2);
      let out = '';
      if (!inList) {
        inList = true;
        out += '<ul class="review-list">';
      }
      out += `<li>${content}</li>`;
      return out;
    } else {
      let out = '';
      if (inList) {
        inList = false;
        out += '</ul>';
      }
      out += line;
      return out;
    }
  });
  if (inList) {
    processedLines.push('</ul>');
  }
  
  html = processedLines.join('\n');
  
  // Wrap paragraphs
  html = html.split('\n').map(line => {
    if (line.trim() === '') return '';
    if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<li') || line.startsWith('</ul') || line.startsWith('<block') || line.startsWith('</block')) return line;
    return `<p>${line}</p>`;
  }).join('\n');
  
  return html;
}

function ProgressTracker({ progress }) {
  if (!progress) return null;
  const { progress: percent, step } = progress;
  
  const steps = [
    { label: 'Read Inputs', val: 10 },
    { label: 'Traverse Graph', val: 30 },
    { label: 'Analyze Causes', val: 55 },
    { label: 'Find Drills', val: 75 },
    { label: 'Finalize', val: 90 }
  ];
  
  return (
    <div className="progress-tracker">
      <p className="progress-step-text">{step}</p>
      
      <div className="progress-bar-container">
        <div className="progress-line-bg"></div>
        <div className="progress-line-fill" style={{ width: `${(percent / 90) * 100}%` }}></div>
        
        <div className="progress-steps">
          {steps.map((s, idx) => {
            const isCompleted = percent > s.val;
            const isActive = percent === s.val;
            return (
              <div key={idx} className={`progress-step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                <div className="progress-circle">
                  {isCompleted ? '✓' : ''}
                </div>
                <span className="progress-label">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="progress-percentage">{percent}% Complete</div>
    </div>
  );
}

function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export default function ReviewsView({ hideDashboard = false }) {
  const [dateObj, setDateObj] = useState(new Date());

  // Resolve the most recent date with training sessions on mount
  useEffect(() => {
    let active = true;
    async function initDate() {
      try {
        const sessions = await api.listSessions();
        if (sessions && sessions.length > 0 && active) {
          // Sessions are ordered by date DESC
          const mostRecentDateStr = sessions[0].started_at.split('T')[0];
          const [y, m, d] = mostRecentDateStr.split('-').map(Number);
          setDateObj(new Date(y, m - 1, d));
        }
      } catch (err) {
        console.error('Failed to resolve most recent training date:', err);
      }
    }
    initDate();
    return () => { active = false; };
  }, []);
  const [stats, setStats] = useState(null);
  const [dailyReview, setDailyReview] = useState({ review: '', status: 'none', progress: null });
  const [weeklyReview, setWeeklyReview] = useState({ review: '', status: 'none', progress: null });
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly'
  const [loadingStats, setLoadingStats] = useState(true);
  const [triggeringDaily, setTriggeringDaily] = useState(false);
  const [triggeringWeekly, setTriggeringWeekly] = useState(false);
  
  const dateStr = getLocalDateString(dateObj);
  const mondayStr = getMonday(dateStr);

  // Load Dashboard stats
  useEffect(() => {
    let active = true;
    setLoadingStats(true);
    async function loadData() {
      try {
        const statsRes = await api.getStats(dateStr);
        if (active) setStats(statsRes);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingStats(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [dateStr]);

  // Daily Review status fetching and polling
  useEffect(() => {
    let active = true;
    let timer;
    
    async function fetchDaily() {
      try {
        const res = await api.getDailyReview(dateStr);
        if (!active) return;
        
        let parsedProgress = null;
        if (res.ai_review_progress) {
          try {
            parsedProgress = JSON.parse(res.ai_review_progress);
          } catch (e) {
            console.error('Failed to parse progress JSON:', e);
          }
        }
        
        setDailyReview({ 
          review: res.ai_review || '', 
          status: res.ai_review_status || 'none',
          progress: parsedProgress
        });
        
        // Poll every 3 seconds if pending or processing
        if (res.ai_review_status === 'pending' || res.ai_review_status === 'processing') {
          timer = setTimeout(fetchDaily, 3000);
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    fetchDaily();
    
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [dateStr, activeTab]);

  // Weekly Review status fetching and polling
  useEffect(() => {
    let active = true;
    let timer;
    
    async function fetchWeekly() {
      try {
        const res = await api.getWeeklyReview(mondayStr);
        if (!active) return;
        
        let parsedProgress = null;
        if (res.progress) {
          try {
            parsedProgress = JSON.parse(res.progress);
          } catch (e) {
            console.error('Failed to parse progress JSON:', e);
          }
        }
        
        setWeeklyReview({ 
          review: res.review || '', 
          status: res.status || 'none',
          progress: parsedProgress
        });
        
        // Poll every 3 seconds if pending or processing
        if (res.status === 'pending' || res.status === 'processing') {
          timer = setTimeout(fetchWeekly, 3000);
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    fetchWeekly();
    
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [mondayStr, activeTab]);

  function shiftDay(days) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + days);
    setDateObj(d);
  }

  async function triggerDaily() {
    setTriggeringDaily(true);
    try {
      const res = await api.triggerDailyReview(dateStr);
      setDailyReview({ review: '', status: res.status || 'pending', progress: null });
    } catch (err) {
      console.error(err);
    } finally {
      setTriggeringDaily(false);
    }
  }

  async function triggerWeekly() {
    setTriggeringWeekly(true);
    try {
      const res = await api.triggerWeeklyReview(mondayStr);
      setWeeklyReview({ review: '', status: res.status || 'pending', progress: null });
    } catch (err) {
      console.error(err);
    } finally {
      setTriggeringWeekly(false);
    }
  }

  // Calculate Saturday date for weekly label
  const monDate = new Date(mondayStr);
  const satDate = new Date(monDate);
  satDate.setDate(monDate.getDate() + 5);
  const satStr = satDate.toISOString().split('T')[0];

  return (
    <div className="reviews-view">
      {/* Date Navigation Bar */}
      <div className="subtabs" style={{ marginBottom: '24px' }}>
        <button onClick={() => shiftDay(-1)}>← Previous</button>
        <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{dateObj.toLocaleDateString()}</span>
        <button onClick={() => shiftDay(1)}>Next →</button>
        <button onClick={() => setDateObj(new Date())} style={{ marginLeft: '16px' }}>Today</button>
      </div>

      {!hideDashboard && (
        <>
          <h2 style={{ marginBottom: '16px' }}>Performance Dashboard</h2>

          {loadingStats ? (
            <div className="loading" style={{ height: '140px' }}>Loading Dashboard Stats…</div>
          ) : (
            <div className="stats-dashboard-grid">
              {/* Running Card */}
              <div className="card dashboard-card">
                <div className="card-header-icon"><IconRun size={16} /> Running</div>
                <div className="dashboard-stat-row">
                  <div className="stat-col">
                    <span className="stat-period">Day</span>
                    <span className="stat-val">{stats?.day.running.kms || 0} km</span>
                    <span className="stat-sub">{stats?.day.running.sessions ? '1 run' : 'No runs'}</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-period">Week</span>
                    <span className="stat-val">{stats?.week.running.kms || 0} km</span>
                    <span className="stat-sub">{stats?.week.running.sessions} runs</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-period">Month</span>
                    <span className="stat-val">{stats?.month.running.kms || 0} km</span>
                    <span className="stat-sub">{stats?.month.running.sessions} runs</span>
                  </div>
                </div>
              </div>

              {/* Gym Card */}
              <div className="card dashboard-card">
                <div className="card-header-icon"><IconDumbbell size={16} /> Gym</div>
                <div className="dashboard-stat-row">
                  <div className="stat-col">
                    <span className="stat-period">Day</span>
                    <span className="stat-val">{stats?.day.gym.sessions ? 'Active' : 'Rest'}</span>
                    <span className="stat-sub truncate" title={stats?.day.gym.muscles}>{stats?.day.gym.muscles || 'None'}</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-period">Week</span>
                    <span className="stat-val">{stats?.week.gym.sessions} sessions</span>
                    <span className="stat-sub truncate" title={stats?.week.gym.muscles}>{stats?.week.gym.muscles || 'None'}</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-period">Month</span>
                    <span className="stat-val">{stats?.month.gym.sessions} sessions</span>
                    <span className="stat-sub truncate" title={stats?.month.gym.muscles}>{stats?.month.gym.muscles || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Sleep Card */}
              <div className="card dashboard-card">
                <div className="card-header-icon"><IconMoon size={16} /> Sleep</div>
                <div className="dashboard-stat-row">
                  <div className="stat-col">
                    <span className="stat-period">Day</span>
                    <span className="stat-val">{stats?.day.sleep.avgHours || 0} hrs</span>
                    <span className="stat-sub">Sleep duration</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-period">Week</span>
                    <span className="stat-val">{stats?.week.sleep.avgHours || 0} hrs</span>
                    <span className="stat-sub">Average sleep</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-period">Month</span>
                    <span className="stat-val">{stats?.month.sleep.avgHours || 0} hrs</span>
                    <span className="stat-sub">Average sleep</span>
                  </div>
                </div>
              </div>

              {/* Shooting Card */}
              <div className="card dashboard-card">
                <div className="card-header-icon"><IconTarget size={16} /> Shooting</div>
                <div className="dashboard-stat-row">
                  <div className="stat-col">
                    <span className="stat-period">Day</span>
                    <span className="stat-val">{stats?.day.sessions.totalHours || 0} hrs</span>
                    <span className="stat-sub">{stats?.day.sessions.totalShots || 0} shots</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-period">Week</span>
                    <span className="stat-val">{stats?.week.sessions.totalHours || 0} hrs</span>
                    <span className="stat-sub">{stats?.week.sessions.totalShots || 0} shots</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-period">Month</span>
                    <span className="stat-val">{stats?.month.sessions.totalHours || 0} hrs</span>
                    <span className="stat-sub">{stats?.month.sessions.totalShots || 0} shots</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Review Tabbed Area */}
      <div className="reviews-section card" style={{ marginTop: '24px' }}>
        <div className="reviews-header">
          <div className="reviews-tabs">
            <button 
              className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              Daily AI Review
            </button>
            <button 
              className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              Weekly AI Trend Review
            </button>
          </div>
          
          {activeTab === 'daily' ? (
            <button 
              className="secondary" 
              onClick={triggerDaily} 
              disabled={triggeringDaily || dailyReview.status === 'processing'}
            >
              {dailyReview.status === 'completed' ? 'Re-run Daily Review' : 'Trigger Daily Review'}
            </button>
          ) : (
            <button 
              className="secondary" 
              onClick={triggerWeekly} 
              disabled={triggeringWeekly || weeklyReview.status === 'processing'}
            >
              {weeklyReview.status === 'completed' ? 'Re-run Weekly Review' : 'Trigger Weekly Review'}
            </button>
          )}
        </div>

        <div className="review-content-area">
          {activeTab === 'daily' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Daily Coaching Analyst Review</h3>
                <span className={`status-badge ${dailyReview.status}`}>
                  {dailyReview.status === 'none' && 'No Review'}
                  {dailyReview.status === 'pending' && 'Pending...'}
                  {dailyReview.status === 'processing' && 'Processing...'}
                  {dailyReview.status === 'completed' && 'Completed'}
                  {dailyReview.status === 'failed' && 'Failed'}
                </span>
              </div>
              
              {dailyReview.status === 'processing' || dailyReview.status === 'pending' ? (
                dailyReview.progress ? (
                  <ProgressTracker progress={dailyReview.progress} />
                ) : (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>AI coaching analyst is traversing the knowledge graph and reviewing your journal observation and shot logs...</p>
                  </div>
                )
              ) : dailyReview.status === 'failed' ? (
                <div className="error-state">
                  <p>The daily AI review failed to generate: <code style={{ color: 'var(--bad)', background: 'rgba(217, 41, 27, 0.15)', padding: '4px 8px', borderRadius: '4px' }}>{dailyReview.review || 'Unknown error'}</code></p>
                  <p>Please click the trigger button to try again.</p>
                </div>
              ) : dailyReview.status === 'completed' ? (
                <div 
                  className="markdown-body" 
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(dailyReview.review) }}
                />
              ) : (
                <div className="empty-state">
                  <p>No AI Review generated for this date yet. Click "Trigger Daily Review" to start it.</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Weekly Trend & Causal Analysis ({mondayStr} to {satStr})</h3>
                <span className={`status-badge ${weeklyReview.status}`}>
                  {weeklyReview.status === 'none' && 'No Review'}
                  {weeklyReview.status === 'pending' && 'Pending...'}
                  {weeklyReview.status === 'processing' && 'Processing...'}
                  {weeklyReview.status === 'completed' && 'Completed'}
                  {weeklyReview.status === 'failed' && 'Failed'}
                </span>
              </div>
              
              {weeklyReview.status === 'processing' || weeklyReview.status === 'pending' ? (
                weeklyReview.progress ? (
                  <ProgressTracker progress={weeklyReview.progress} />
                ) : (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>AI coaching analyst is examining weekly trends and extracting causal relationships from the knowledge graph...</p>
                  </div>
                )
              ) : weeklyReview.status === 'failed' ? (
                <div className="error-state">
                  <p>The weekly AI review failed to generate: <code style={{ color: 'var(--bad)', background: 'rgba(217, 41, 27, 0.15)', padding: '4px 8px', borderRadius: '4px' }}>{weeklyReview.review || 'Unknown error'}</code></p>
                  <p>Please click the trigger button to try again.</p>
                </div>
              ) : weeklyReview.status === 'completed' ? (
                <div 
                  className="markdown-body" 
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(weeklyReview.review) }}
                />
              ) : (
                <div className="empty-state">
                  <p>No Weekly AI Trend Review generated for this week yet. Click "Trigger Weekly Review" to start it.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
