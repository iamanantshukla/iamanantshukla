let accessToken = null;
const DRIVE_FILE_ID = '10T_qKiCLiS8EAUW4zYDOidJV45K6BtQM';

let dataStore = {
  sessions: [],
  journals: [],
  skills: [],
  reviews: { daily: {}, weekly: {} }
};

let initialized = false;

async function syncFromDrive() {
  if (!accessToken) return;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
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
  if (!accessToken) return;
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${DRIVE_FILE_ID}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dataStore)
  });
}

// Ensure unique IDs
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export const api = {
  setAccessToken: async (token) => {
    accessToken = token;
    await syncFromDrive();
  },

  me: async () => {
    return { authed: !!accessToken && initialized };
  },

  login: async () => {
    // This is handled by PasswordGate replaced with GoogleLoginGate
    return { authed: true };
  },

  logout: async () => {
    accessToken = null;
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
    return dataStore.journals.find(j => j.date === date) || null;
  },

  saveJournal: async (date, payload) => {
    let j = dataStore.journals.find(x => x.date === date);
    if (j) {
      Object.assign(j, payload);
    } else {
      j = { date, ...payload };
      dataStore.journals.push(j);
    }
    await syncToDrive();
    return j;
  },

  getStats: async (date = '') => {
    // Generate basic stats from store
    const today = date || new Date().toISOString().split('T')[0];
    const sess = dataStore.sessions.filter(s => s.started_at.startsWith(today));
    return {
      todaySessions: sess.length,
      todayShots: sess.reduce((sum, s) => sum + (s.shots ? s.shots.length : 0), 0),
      totalSessions: dataStore.sessions.length
    };
  },

  getDailyReview: async (date) => {
    return dataStore.reviews.daily[date] || null;
  },

  getWeeklyReview: async (weekStartDate) => {
    return dataStore.reviews.weekly[weekStartDate] || null;
  },

  triggerDailyReview: async () => {
    throw new Error('AI capabilities are not available in the Cloud Portal. Use your local laptop server to trigger daily reviews.');
  },

  triggerWeeklyReview: async () => {
    throw new Error('AI capabilities are not available in the Cloud Portal.');
  }
};
