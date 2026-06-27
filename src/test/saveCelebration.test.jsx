// src/test/saveCelebration.test.jsx — the post-save celebration (spec §4.4).
// Proud Pebble + a voiced earned line, gated SCORE-BLIND on mission.completed (or a beaten process
// baseline) — NEVER session.score. Shows continuity + 3 process stats + forward actions.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SaveCelebration from '../components/SaveCelebration.jsx';

const stats = [
  { label: 'Call-match', value: '70%' },
  { label: 'Avg', value: '9.4' },
  { label: 'Held', value: 'steady' },
];

describe('SaveCelebration', () => {
  it('shows the proud Pebble + voiced line + continuity + stats when earned', () => {
    const { container, getByText } = render(
      <SaveCelebration earned line="Held your line under fatigue — that's the work." continuityDay={7}
        stats={stats} onAddFeel={() => {}} onReview={() => {}} onClose={() => {}} />,
    );
    // proud Pebble face is present...
    expect(container.querySelector('svg[aria-label="Pebble — proud of you"]')).toBeTruthy();
    expect(getByText(/Held your line/)).toBeTruthy();
    expect(getByText(/Day 7/)).toBeTruthy();
    expect(getByText('Call-match')).toBeTruthy();
  });

  it('does NOT show the proud/celebration state when not earned (a plain saved state)', () => {
    const { container } = render(
      <SaveCelebration earned={false} line="Saved." continuityDay={3} stats={stats}
        onAddFeel={() => {}} onReview={() => {}} onClose={() => {}} />,
    );
    // not the proud face — a calm neutral acknowledgement instead
    expect(container.querySelector('svg[aria-label="Pebble — proud of you"]')).toBeNull();
    expect(container.querySelector('.celebrate-proud')).toBeNull();
  });

  it('fires the forward actions', () => {
    const onAddFeel = vi.fn(); const onReview = vi.fn();
    const { getByText } = render(
      <SaveCelebration earned line="x" continuityDay={1} stats={stats}
        onAddFeel={onAddFeel} onReview={onReview} onClose={() => {}} />,
    );
    fireEvent.click(getByText(/Add how it felt/i));
    fireEvent.click(getByText(/Ask Pebble/i));
    expect(onAddFeel).toHaveBeenCalled();
    expect(onReview).toHaveBeenCalled();
  });
});
