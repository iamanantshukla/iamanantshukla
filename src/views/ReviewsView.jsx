import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { IS_LOCAL } from '../lib/config.js';
import WeekStrip from '../components/WeekStrip.jsx';
import Pebble from '../components/Pebble.jsx';
import { IconChevronLeft } from '../components/Icons.jsx';
import { useJarvis } from '../context/JarvisContext.jsx';
import { localDateString, mondayOf } from '../lib/gymDates.js';

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

// Monday of the week containing a 'YYYY-MM-DD' string, as a 'YYYY-MM-DD' string.
// Uses the timezone-safe mondayOf from gymDates (same logic as WeekStrip) so the
// week is correct in every timezone, not just IST.
function getMonday(dateStr) {
  return localDateString(mondayOf(new Date(dateStr + 'T00:00:00')));
}

// Add a number of days to a 'YYYY-MM-DD' string and return a 'YYYY-MM-DD' string.
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

export default function ReviewsView() {
  const navigate = useNavigate();
  const jarvis = useJarvis();
  const [selected, setSelected] = useState(() => localDateString(new Date()));

  // Resolve the most recent date with training sessions on mount
  useEffect(() => {
    let active = true;
    async function initDate() {
      try {
        const sessions = await api.listSessions();
        if (sessions && sessions.length > 0 && active) {
          // Sessions are ordered by date DESC
          const mostRecentDateStr = sessions[0].started_at.split('T')[0];
          setSelected(mostRecentDateStr);
        }
      } catch (err) {
        console.error('Failed to resolve most recent training date:', err);
      }
    }
    initDate();
    return () => { active = false; };
  }, []);

  const [dailyReview, setDailyReview] = useState({ review: '', status: 'none', progress: null });
  const [weeklyReview, setWeeklyReview] = useState({ review: '', status: 'none', progress: null });
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly'
  const [triggeringDaily, setTriggeringDaily] = useState(false);
  const [triggeringWeekly, setTriggeringWeekly] = useState(false);

  const mondayStr = getMonday(selected);
  // Sunday is the last day of the Monday-anchored week.
  const sundayStr = addDays(mondayStr, 6);
  const todayStr = localDateString(new Date());
  // The week has ended once today is on or after that week's Sunday.
  const weekEnded = todayStr >= sundayStr;

  // Daily Review status fetching and polling
  useEffect(() => {
    let active = true;
    let timer;

    async function fetchDaily() {
      try {
        const res = await api.getDailyReview(selected);
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
  }, [selected, activeTab]);

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

  async function triggerDaily() {
    setTriggeringDaily(true);
    try {
      const res = await api.triggerDailyReview(selected);
      setDailyReview({ review: '', status: res.status || 'pending', progress: null });
    } catch (err) {
      console.error(err);
    } finally {
      setTriggeringDaily(false);
    }
  }

  async function cancelDaily() {
    try {
      const res = await api.cancelDailyReview(selected);
      setDailyReview({ review: '', status: res.status || 'failed', progress: null });
    } catch (err) {
      console.error(err);
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

  async function cancelWeekly() {
    try {
      const res = await api.cancelWeeklyReview(mondayStr);
      setWeeklyReview({ review: '', status: res.status || 'failed', progress: null });
    } catch (err) {
      console.error(err);
    }
  }

  // Calculate Saturday date for weekly label
  const satStr = addDays(mondayStr, 5);

  return (
    <div className="reviews-view">
      {/* Leaf back chevron — leaves are dead-ends in a chrome-less PWA (spec §3). */}
      <button className="leaf-back" onClick={() => navigate('/shoot')} aria-label="Back to Shoot">
        <IconChevronLeft size={18} /> Shoot
      </button>

      {/* Pebble header voice + "Posted by Pebble" framing (§4.5). */}
      <div className="leaf-head">
        <Pebble size={28} variant="face" expression={jarvis.expression} />
        <div>
          <h1 className="leaf-title">Reviews</h1>
          <span className="leaf-sub muted">Posted by Pebble</span>
        </div>
      </div>

      {/* Home-style day scroll */}
      <WeekStrip
        anchor={new Date(selected + 'T00:00:00')}
        selected={selected}
        onSelect={setSelected}
        dots={{}}
      />

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

          {/* Agent-trigger affordance is local-only (sub-project B §3.3.4): the laptop runs the
              agent worker, so only the local build surfaces the trigger/cancel controls. The pages
              build shows the review content read from Drive with no trigger UI. */}
          {IS_LOCAL && (activeTab === 'daily' ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="secondary"
                onClick={triggerDaily}
                disabled={triggeringDaily || dailyReview.status === 'processing' || dailyReview.status === 'pending'}
              >
                {dailyReview.status === 'completed' ? 'Re-run Daily Review' : 'Trigger Daily Review'}
              </button>
              {(dailyReview.status === 'processing' || dailyReview.status === 'pending') && (
                <button
                  className="secondary danger"
                  onClick={cancelDaily}
                >
                  Cancel Stuck Review
                </button>
              )}
            </div>
          ) : (
            weekEnded && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="secondary"
                  onClick={triggerWeekly}
                  disabled={triggeringWeekly || weeklyReview.status === 'processing' || weeklyReview.status === 'pending'}
                >
                  {weeklyReview.status === 'completed' ? 'Re-run Weekly Review' : 'Trigger Weekly Review'}
                </button>
                {(weeklyReview.status === 'processing' || weeklyReview.status === 'pending') && (
                  <button
                    className="secondary danger"
                    onClick={cancelWeekly}
                  >
                    Cancel Stuck Review
                  </button>
                )}
              </div>
            )
          ))}
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
                  <p>{IS_LOCAL ? 'Please click the trigger button to try again.' : "Pebble will try again on the laptop's next run."}</p>
                </div>
              ) : dailyReview.status === 'completed' ? (
                <div
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(dailyReview.review) }}
                />
              ) : (
                <div className="empty-state">
                  <p>{IS_LOCAL
                    ? 'No AI review generated for this date yet. Click "Trigger Daily Review" to start it.'
                    : 'No review for this day yet. Pebble posts these from the laptop after the day is logged.'}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Weekly Trend & Causal Analysis ({mondayStr} to {satStr})</h3>
                {weekEnded && (
                  <span className={`status-badge ${weeklyReview.status}`}>
                    {weeklyReview.status === 'none' && 'No Review'}
                    {weeklyReview.status === 'pending' && 'Pending...'}
                    {weeklyReview.status === 'processing' && 'Processing...'}
                    {weeklyReview.status === 'completed' && 'Completed'}
                    {weeklyReview.status === 'failed' && 'Failed'}
                  </span>
                )}
              </div>

              {!weekEnded ? (
                <div className="empty-state">
                  <p>Weekly Trend will be generated on Sunday.</p>
                </div>
              ) : weeklyReview.status === 'processing' || weeklyReview.status === 'pending' ? (
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
                  <p>{IS_LOCAL ? 'Please click the trigger button to try again.' : "Pebble will try again on the laptop's next run."}</p>
                </div>
              ) : weeklyReview.status === 'completed' ? (
                <div
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(weeklyReview.review) }}
                />
              ) : (
                <div className="empty-state">
                  <p>{IS_LOCAL
                    ? 'No weekly AI trend review generated for this week yet. Click "Trigger Weekly Review" to start it.'
                    : 'No weekly trend yet. Pebble posts the weekly review from the laptop once the week closes.'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
