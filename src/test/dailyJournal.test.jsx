// Focused tests for the revamped mood-first Daily Journal check-in.
// Mocks ../lib/api.js (like views.smoke.test.jsx) and wraps in MemoryRouter.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const saveJournal = vi.fn(async () => ({}));

// One realistic stored session in the shape saveSession actually persists (started_at,
// mode, series, skillFocus — NOT date/total_shots/hasShots/skillsTrained) so the feed
// rendering path (time, derived shot count, skills) is exercised, not stubbed out to [].
const SESSION = {
  id: 's1',
  started_at: '2026-06-21T09:30:00.000Z',
  mode: 'live',
  duration_seconds: 125,
  series: [{ shots: [{}, {}, {}] }, { shots: [{}, {}] }], // 5 shots
  skillFocus: [{ name: 'Grip' }, { name: 'Trigger' }, { name: 'Grip' }],
  comments: 'felt steady',
  live_notes: [{ text: 'pulled left on 7' }],
};

let sessionList = [];

vi.mock('../lib/api.js', () => ({
  api: {
    getJournal: async (date) => ({
      date,
      running: 0, running_kms: '', gym: 0, gym_muscles: '',
      sleeping_hours: '', observation: '',
      mood: '', energy: 0, body: 0, stress: 0, sleep_quality: 0,
      training_rpe: 0, shooting_feel: 0,
      highlight: '', challenge: '', lesson: '', gratitude: '',
      tomorrow_focus: '', tags: [],
      ai_review: '', ai_review_status: 'none',
    }),
    listSessions: async () => sessionList,
    getStats: async () => ({ week: { checkin: { daysLogged: 0 } } }),
    saveJournal: (...args) => saveJournal(...args),
    triggerDailyReview: async () => {},
    triggerWeeklyReview: async () => {},
  },
}));

import DailyJournal from '../views/DailyJournal.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('DailyJournal revamp', () => {
  beforeEach(() => { saveJournal.mockClear(); sessionList = []; });

  it('renders the check-in without throwing', async () => {
    const { container } = wrap(<DailyJournal />);
    await waitFor(() => expect(container.textContent).toContain('How did today feel?'));
    expect(container.textContent).toContain('Daily check-in');
  });

  it('lets you select a mood (coral highlight ring)', async () => {
    const { container } = wrap(<DailyJournal />);
    await waitFor(() => expect(screen.getByLabelText('Great')).toBeTruthy());
    const greatBtn = screen.getByLabelText('Great');
    expect(greatBtn.className).not.toContain('selected');
    fireEvent.click(greatBtn);
    expect(greatBtn.className).toContain('selected');
    expect(greatBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('saves the journal with the new structured fields', async () => {
    wrap(<DailyJournal />);
    await waitFor(() => expect(screen.getByLabelText('Good')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('Good'));
    fireEvent.click(screen.getByText('Save Journal'));
    await waitFor(() => expect(saveJournal).toHaveBeenCalledTimes(1));
    const [, payload] = saveJournal.mock.calls[0];
    expect(payload.mood).toBe('good');
    // existing field names preserved
    expect(payload).toHaveProperty('running');
    expect(payload).toHaveProperty('sleeping_hours');
    expect(payload).toHaveProperty('observation');
    // new structured fields present
    expect(payload).toHaveProperty('energy');
    expect(payload).toHaveProperty('tomorrow_focus');
    expect(Array.isArray(payload.tags)).toBe(true);
    // success confirmation message kept for compatibility
    await waitFor(() => expect(screen.getByText('Journal saved successfully.')).toBeTruthy());
  });

  it('renders the activities feed from the real stored session shape', async () => {
    sessionList = [SESSION];
    const { container } = wrap(<DailyJournal />);
    await waitFor(() => expect(container.textContent).toContain('How did today feel?'));
    // Derived from series (3 + 2 = 5 shots), not the absent s.total_shots field.
    await waitFor(() => expect(container.textContent).toContain('5'));
    // Time renders from started_at, not the absent s.date (would be "Invalid Date").
    expect(container.textContent).not.toContain('Invalid Date');
    // Duration 125s -> 2m 5s
    expect(container.textContent).toContain('2m 5s');
    // Skills derived from skillFocus names (deduped): Grip + Trigger
    expect(container.textContent).toContain('Grip');
    expect(container.textContent).toContain('Trigger');
    // Live-fire shot-calling session -> type tag present
    expect(container.textContent).toContain('Live Fire');
  });
});
