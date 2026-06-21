import { getAccessToken, setAccessToken as setToken, clearAccessToken } from './auth.js';
import { gymApi } from './gymApi.js';
const DRIVE_FILE_ID = '10T_qKiCLiS8EAUW4zYDOidJV45K6BtQM';

let dataStore = {
  sessions: [],
  journals: [],
  skills: [],
  reviews: { daily: {}, weekly: {} }
};

let initialized = false;

async function syncFromDrive() {
  if (!getAccessToken()) return;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`, {
    headers: { 'Authorization': `Bearer ${getAccessToken()}` }
  });
  if (res.ok) {
    try {
      const driveData = await res.json();
      dataStore = { ...dataStore, ...driveData };
    } catch {
      // file might be empty
    }
  }
  initialized = true;
}

async function syncToDrive() {
  if (!getAccessToken()) return;
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${DRIVE_FILE_ID}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dataStore)
  });
}

// Ensure unique IDs
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function parseKms(str) {
  if (!str) return 0;
  const match = String(str).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function parseSleepHours(str) {
  if (!str) return 0;
  const num = parseFloat(str);
  if (!isNaN(num) && num.toString().trim() === String(str).trim()) return num;
  const hrMatch = String(str).match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
  const minMatch = String(str).match(/(\d+(?:\.\d+)?)\s*(?:min|m)/i);
  let hrs = hrMatch ? parseFloat(hrMatch[1]) : 0;
  let mins = minMatch ? parseFloat(minMatch[1]) : 0;
  if (!hrMatch && !minMatch) {
    const match = String(str).match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return hrs + (mins / 60);
}

function calculateStats(journals, sessions) {
  let gymSessions = 0;
  let gymMuscles = [];
  let runningSessions = 0;
  let runningKms = 0;
  let sleepSum = 0;
  let sleepCount = 0;
  let sessionDurationSeconds = 0;
  let sessionShots = 0;

  journals.forEach(j => {
    if (j.gym === true || j.gym === 1) {
      gymSessions++;
      if (j.gym_muscles) gymMuscles.push(j.gym_muscles);
    }
    if (j.running === true || j.running === 1) {
      runningSessions++;
      runningKms += parseKms(j.running_kms);
    }
    const sleep = parseSleepHours(j.sleeping_hours);
    if (sleep > 0) {
      sleepSum += sleep;
      sleepCount++;
    }
  });

  sessions.forEach(s => {
    sessionDurationSeconds += s.duration_seconds || 0;
    sessionShots += s.total_shots || (s.shots ? s.shots.length : 0);
  });

  return {
    gym: {
      sessions: gymSessions,
      muscles: [...new Set(gymMuscles)].join(', ')
    },
    running: {
      sessions: runningSessions,
      kms: Math.round(runningKms * 100) / 100
    },
    sleep: {
      avgHours: sleepCount > 0 ? Math.round((sleepSum / sleepCount) * 10) / 10 : 0,
      count: sleepCount
    },
    sessions: {
      totalHours: Math.round((sessionDurationSeconds / 3600) * 10) / 10,
      totalShots: sessionShots
    }
  };
}

export const api = {
  setAccessToken: async (token) => {
    setToken(token);
    await syncFromDrive();
    await gymApi.init();
  },

  getLockOwner: () => {
    return dataStore.lock ? dataStore.lock.owner : 'hosted'; // default to hosted
  },

  takeLock: async () => {
    await syncFromDrive(); // Fetch latest
    dataStore.lock = { owner: 'hosted', timestamp: new Date().toISOString() };
    await syncToDrive();
  },

  me: async () => {
    return { authed: !!getAccessToken() && initialized };
  },

  login: async () => {
    return { authed: true };
  },

  logout: async () => {
    clearAccessToken();
    initialized = false;
  },

  listSkills: async () => {
    return dataStore.skills;
  },

  addSkill: async (name, expectation) => {
    const skill = { id: generateId(), name, expectation };
    dataStore.skills.push(skill);
    await syncToDrive();
    return skill;
  },

  listSessions: async (date = '') => {
    let sess = dataStore.sessions;
    if (date) {
      sess = sess.filter(s => s.started_at.startsWith(date));
    }
    return sess.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  },

  getSession: async (id) => {
    const s = dataStore.sessions.find(x => String(x.id) === String(id));
    if (!s) throw new Error('Not found');
    return s;
  },

  saveSession: async (payload) => {
    const session = { 
      id: generateId(), 
      started_at: new Date().toISOString(),
      ...payload,
      ended_at: payload.ended_at || new Date().toISOString()
    };
    dataStore.sessions.push(session);
    await syncToDrive();
    return session;
  },

  updateSessionComments: async (id, comments) => {
    const s = dataStore.sessions.find(x => String(x.id) === String(id));
    if (s) {
      s.comments = comments;
      await syncToDrive();
    }
    return s;
  },

  getJournal: async (date) => {
    const j = dataStore.journals.find(x => x.date === date);
    if (!j) {
      return {
        date,
        running: 0,
        running_kms: '',
        gym: 0,
        gym_muscles: '',
        sleeping_hours: '',
        observation: '',
        ai_review: '',
        ai_review_status: 'none'
      };
    }
    return {
      ...j,
      running: j.running ? 1 : 0,
      gym: j.gym ? 1 : 0
    };
  },

  saveJournal: async (date, payload) => {
    let j = dataStore.journals.find(x => x.date === date);
    const mappedPayload = {
      ...payload,
      running: payload.running === true || payload.running === 1,
      gym: payload.gym === true || payload.gym === 1
    };
    if (j) {
      Object.assign(j, mappedPayload);
    } else {
      j = { date, ...mappedPayload };
      dataStore.journals.push(j);
    }
    await syncToDrive();
    return j;
  },

  getStats: async (date = '') => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Day Stats
    const dayJournal = dataStore.journals.filter(j => j.date === targetDate);
    const daySessions = dataStore.sessions.filter(s => s.started_at.startsWith(targetDate));
    const dayStats = calculateStats(dayJournal, daySessions);

    // Week Stats
    const dateObj = new Date(targetDate);
    const day = dateObj.getDay();
    const diffToMonday = dateObj.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(dateObj.setDate(diffToMonday));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    
    const mondayStr = mon.toISOString().split('T')[0];
    const sundayStr = sun.toISOString().split('T')[0];

    const weekJournals = dataStore.journals.filter(j => j.date >= mondayStr && j.date <= sundayStr);
    const weekSessions = dataStore.sessions.filter(s => {
      const d = s.started_at.split('T')[0];
      return d >= mondayStr && d <= sundayStr;
    });
    const weekStats = calculateStats(weekJournals, weekSessions);

    // Month Stats
    const parts = targetDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const firstDayStr = `${parts[0]}-${parts[1]}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDayStr = `${parts[0]}-${parts[1]}-${String(lastDay).padStart(2, '0')}`;

    const monthJournals = dataStore.journals.filter(j => j.date >= firstDayStr && j.date <= lastDayStr);
    const monthSessions = dataStore.sessions.filter(s => {
      const d = s.started_at.split('T')[0];
      return d >= firstDayStr && d <= lastDayStr;
    });
    const monthStats = calculateStats(monthJournals, monthSessions);

    return {
      day: dayStats,
      week: weekStats,
      month: monthStats
    };
  },

  getDailyReview: async (date) => {
    const j = dataStore.journals.find(x => x.date === date);
    if (!j || !j.ai_review) {
      return { ai_review: '', ai_review_status: 'none', ai_review_progress: null };
    }
    return {
      ai_review: j.ai_review,
      ai_review_status: j.ai_review_status || 'completed',
      ai_review_progress: j.ai_review_progress || null
    };
  },

  getWeeklyReview: async (weekStartDate) => {
    const w = dataStore.reviews.weekly[weekStartDate];
    if (!w) {
      return { review: '', status: 'none', progress: null };
    }
    return w;
  },

  triggerDailyReview: async () => {
    throw new Error('AI capabilities are not available in the Cloud Portal. Use your local laptop server to trigger daily reviews.');
  },

  triggerWeeklyReview: async () => {
    throw new Error('AI capabilities are not available in the Cloud Portal.');
  }
};
