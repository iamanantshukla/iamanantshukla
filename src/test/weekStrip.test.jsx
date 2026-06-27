import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WeekStrip from '../components/WeekStrip.jsx';

describe('WeekStrip', () => {
  it('renders 7 day buttons for the anchored week', () => {
    render(<WeekStrip anchor={new Date(2026, 5, 18)} selected="2026-06-18" onSelect={() => {}} dots={{}} />);
    // Mon..Sun dates 15..21
    ['15','16','17','18','19','20','21'].forEach((d) => expect(screen.getByText(d)).toBeTruthy());
  });
  it('calls onSelect with the date string when a day is tapped', () => {
    const onSelect = vi.fn();
    render(<WeekStrip anchor={new Date(2026, 5, 18)} selected="2026-06-18" onSelect={onSelect} dots={{}} />);
    fireEvent.click(screen.getByText('20'));
    expect(onSelect).toHaveBeenCalledWith('2026-06-20');
  });
});
