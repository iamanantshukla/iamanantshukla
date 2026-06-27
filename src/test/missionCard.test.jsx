// src/test/missionCard.test.jsx — MissionCard renders the daily briefing from a today.json fixture
// and degrades gracefully (stale stamp / empty state). Spec E §4.3 / §8 "Mission card tests".
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import MissionCard from '../components/MissionCard.jsx';

// A representative today.json (matches the campaign-engine output shape).
const FIXTURE = {
  date: '2026-06-26',
  readinessBand: 'green',
  headline: 'Build the base.',
  shooting: { module: 'hold', prescription: '3x2min holds, then 20 shot-calling shots', scored: false },
  physical: { block: 'core + mobility' },
  mental: { scenario: 'Final five shots, heart rate spiked — find the calm.' },
  recovery: ['8h sleep', 'mobility before bed'],
  inputsRequested: ['sleep_hours', 'session_reflection'],
  plannedAt: '2026-06-26T06:00:00.000Z',
};

describe('MissionCard', () => {
  it('renders all four sections + requested-input chips from a today.json fixture', () => {
    const { getByText, container } = render(<MissionCard mission={FIXTURE} />);
    expect(getByText('Build the base.')).toBeTruthy();
    // readiness chip
    expect(container.querySelector('.band-green')).toBeTruthy();
    // shooting + physical + mental + recovery sections all present
    expect(getByText(/3x2min holds/)).toBeTruthy();
    expect(getByText(/core \+ mobility/)).toBeTruthy();
    expect(getByText(/Final five shots/)).toBeTruthy();
    expect(getByText('8h sleep')).toBeTruthy();
    // inputsRequested rendered as friendly emoji-free chips
    expect(getByText('Log sleep')).toBeTruthy();
    expect(getByText('Add reflection')).toBeTruthy();
  });

  it('omits a section whose module is absent (no empty shell)', () => {
    const noPhysical = { ...FIXTURE, physical: undefined, recovery: [] };
    const { queryByText } = render(<MissionCard mission={noPhysical} />);
    expect(queryByText('Physical')).toBeNull();
    expect(queryByText('Recovery')).toBeNull();
  });

  it('shows a "last planned X ago" stamp when a freshness value is given (stale)', () => {
    const { getByText } = render(<MissionCard mission={FIXTURE} freshness="6h ago" />);
    expect(getByText(/Last planned 6h ago/)).toBeTruthy();
  });

  it('renders a calm empty state with manual hubs when there is no mission at all', () => {
    const { getByText, container } = render(<MissionCard mission={null} />);
    expect(getByText(/No mission yet/)).toBeTruthy();
    // manual hubs still reachable
    expect(getByText('Shoot')).toBeTruthy();
    expect(getByText('Gym')).toBeTruthy();
    expect(getByText('Journal')).toBeTruthy();
    expect(container.querySelector('.mission-empty')).toBeTruthy();
  });

  it('wires the section callbacks (start shooting, input chip)', () => {
    const onStartShooting = vi.fn();
    const onInput = vi.fn();
    const { getByText } = render(
      <MissionCard mission={FIXTURE} onStartShooting={onStartShooting} onInput={onInput} />,
    );
    fireEvent.click(getByText('Start session'));
    expect(onStartShooting).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText('Log sleep'));
    expect(onInput).toHaveBeenCalledWith('sleep_hours');
  });

  it('has no emoji or check-mark glyph in its copy (locked decision #8)', () => {
    const { container } = render(<MissionCard mission={FIXTURE} freshness="6h ago" />);
    const text = container.textContent || '';
    expect(text).not.toMatch(/✓/); // check mark
    // crude emoji range check
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
