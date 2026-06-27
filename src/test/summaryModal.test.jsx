// Tests for the revamped SummaryModal: structured reflection questionnaire (incl.
// confidence) and the live-match footer (Drive link + match observation) flow into onSave.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SummaryModal from '../components/SummaryModal.jsx';

const emptySession = { series: [], skillFocus: [] };

describe('SummaryModal reflection + match footer', () => {
  it('shows the reflection questionnaire (incl. confidence) for a match session', () => {
    render(<SummaryModal session={emptySession} activeTab="match" focus="match" mode="live" onSave={() => {}} />);
    expect(screen.getByText('How did it feel?')).toBeTruthy();
    expect(screen.getByText('Shot routine')).toBeTruthy();
    expect(screen.getByText('Confidence level')).toBeTruthy();
    expect(screen.getByText('Sight alignment')).toBeTruthy();
  });

  it('passes reflection ratings + drive link + match observation to onSave', () => {
    const onSave = vi.fn();
    render(<SummaryModal session={emptySession} activeTab="match" focus="match" mode="live" onSave={onSave} />);

    // Rate "Confidence level" a 4 (its group is the only RatingRow labelled so).
    const confidenceRow = screen.getByLabelText('Confidence level');
    fireEvent.click(confidenceRow.querySelectorAll('button')[3]); // value 4

    // Fill the Drive link + match observation in the footer.
    fireEvent.change(screen.getByPlaceholderText(/drive\.google\.com/i), { target: { value: 'https://drive.google.com/abc' } });
    fireEvent.change(screen.getByPlaceholderText(/overall read of the match/i), { target: { value: 'Steady through the final.' } });

    fireEvent.click(screen.getByText('Save Session'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [, , extra] = onSave.mock.calls[0];
    expect(extra.reflection.confidence).toBe(4);
    expect(extra.drive_link).toBe('https://drive.google.com/abc');
    expect(extra.match_observation).toBe('Steady through the final.');
  });

  it('does not show the reflection questionnaire for a skill-focus session', () => {
    render(<SummaryModal session={emptySession} activeTab="skill" focus="skill" mode="dry" onSave={() => {}} />);
    expect(screen.queryByText('How did it feel?')).toBeNull();
  });
});
