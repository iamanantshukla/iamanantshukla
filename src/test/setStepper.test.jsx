import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetStepper from '../components/SetStepper.jsx';

describe('SetStepper', () => {
  it('increments weight by 0.5', () => {
    const onChange = vi.fn();
    render(<SetStepper label="Weight" unit="kg" value={62.5} step={0.5} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('increase Weight'));
    expect(onChange).toHaveBeenCalledWith(63);
  });
  it('does not go below zero', () => {
    const onChange = vi.fn();
    render(<SetStepper label="Reps" value={0} step={1} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('decrease Reps'));
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
