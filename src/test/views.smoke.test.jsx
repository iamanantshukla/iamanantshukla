// Smoke tests: mount the main views and confirm they render without throwing.
// These guard against runtime crashes (undefined .map, missing guards) that the
// unit tests don't cover. Data layers are stubbed where they hit the network.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../context/SessionContext.jsx';

// Stub the shooting api so views relying on it don't hit fetch.
vi.mock('../lib/api.js', () => ({
  api: {
    getStats: async () => ({ week: { sleep: { avgHours: 7 }, sessions: { totalShots: 0 }, gym: { sessions: 0 }, running: { kms: 0 } } }),
    getJournal: async () => ({ date: '2026-06-21', running: 0, running_kms: '', gym: 0, gym_muscles: '', sleeping_hours: '', observation: '' }),
    getSingleton: async () => null,
    listSessions: async () => [],
    getDailyReview: async () => ({ ai_review: '', ai_review_status: 'none', ai_review_progress: null }),
    getWeeklyReview: async () => ({ review: '', status: 'none', progress: null }),
  },
}));

import Home from '../views/Home.jsx';
import GymHistory from '../views/Gym/GymHistory.jsx';
import GymProgress from '../views/Gym/GymProgress.jsx';
import CampaignView from '../views/CampaignView.jsx';
import { JarvisProvider } from '../context/JarvisContext.jsx';

const wrap = (ui) => render(<MemoryRouter><SessionProvider>{ui}</SessionProvider></MemoryRouter>);
const wrapJ = (ui) => render(<MemoryRouter><SessionProvider><JarvisProvider>{ui}</JarvisProvider></SessionProvider></MemoryRouter>);

describe('view smoke tests', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false })); });

  it('renders Home v2 (verdict card hero) without throwing', () => {
    const { container } = wrapJ(<Home />);
    expect(container.querySelector('.home')).toBeTruthy();
    // The verdict card is the hero of the verdict-first Home.
    expect(container.querySelector('.verdict-card')).toBeTruthy();
    // The old "This week" stat tiles are gone (moved to the Campaign dashboard).
    expect(container.querySelector('.home-tiles')).toBeNull();
  });
  it('renders GymHistory (empty state) without throwing', () => {
    const { container } = wrap(<GymHistory />);
    expect(container.textContent).toContain('Gym history');
  });
  it('renders GymProgress without throwing', () => {
    const { container } = wrap(<GymProgress />);
    expect(container.textContent).toContain('Progress');
  });
  it('renders the Campaign dashboard shell (phase ribbon) without throwing', () => {
    const { container } = wrapJ(<CampaignView />);
    expect(container.querySelector('.phase-ribbon')).toBeTruthy();
    expect(container.textContent).toContain('Road to Nationals');
  });
});
