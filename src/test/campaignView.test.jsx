// src/test/campaignView.test.jsx — the Campaign dashboard renders the agent-written sims aggregates,
// and degrades gracefully to the "pending" card when sims is absent (§4.2).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const getSingleton = vi.fn();
vi.mock('../lib/api.js', () => ({ api: { getSingleton: (...a) => getSingleton(...a), getJournal: async () => null } }));

import { JarvisProvider } from '../context/JarvisContext.jsx';
import CampaignView from '../views/CampaignView.jsx';

const wrap = (ui) => render(<MemoryRouter><JarvisProvider>{ui}</JarvisProvider></MemoryRouter>);

beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
  getSingleton.mockReset();
  getSingleton.mockResolvedValue(null);
});

describe('CampaignView', () => {
  it('shows the pending card when no sims aggregates exist yet', () => {
    const { container } = wrap(<CampaignView />);
    expect(container.querySelector('.phase-ribbon')).toBeTruthy();
    expect(container.querySelector('.campaign-pending')).toBeTruthy();
  });

  it('renders the latest sim, form metrics and growth when sims is present', async () => {
    const sims = {
      latestSim: { score: '561/600', rating: 'A−', date: '2026-06-20', decimalAvg: 9.35, groupSize: 28, vsLast: '+4' },
      formMetrics: [
        { label: 'Decimal avg', value: '9.35', delta: 0.2, history: [9.1, 9.2, 9.35] },
        { label: 'Group size', value: '28mm', delta: -3, history: [34, 31, 28] },
      ],
      growth: { start: 545, current: 561, target: 564, personalBest: 561, trajectory: '+19 in 8 wks · on track' },
      seasonForm: { tsb: 6, simsLogged: 5 },
    };
    getSingleton.mockImplementation(async (name) => (name === 'sims' ? sims : (name === 'campaign' ? { currentPhase: 'build' } : null)));

    const { container, getByText } = wrap(<CampaignView />);
    await waitFor(() => expect(container.querySelector('.sim-card')).toBeTruthy());
    expect(getByText('561/600')).toBeTruthy();
    expect(getByText('A−')).toBeTruthy();
    expect(getByText('Decimal avg')).toBeTruthy();
    expect(container.querySelector('.growth-fill')).toBeTruthy();
    expect(container.querySelector('.campaign-pending')).toBeNull();
  });
});
