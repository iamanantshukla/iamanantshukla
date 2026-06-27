// src/test/pebble.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Pebble from '../components/Pebble.jsx';

describe('Pebble', () => {
  it('renders an svg at the requested size', () => {
    const { container } = render(<Pebble size={48} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('width')).toBe('48');
  });
  it('changes eyes for the sleepy expression without erroring', () => {
    const { container } = render(<Pebble expression="sleepy" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('exposes an expression-aware aria-label so the state is not carried by the face alone (§2 a11y)', () => {
    const cases = {
      neutral: 'Pebble — ready',
      focused: 'Pebble — focused',
      resting: 'Pebble — resting',
      happy: 'Pebble — upbeat',
      proud: 'Pebble — proud of you',
      sad: 'Pebble — concerned',
      sleepy: 'Pebble — low energy',
    };
    for (const [expression, label] of Object.entries(cases)) {
      const { container } = render(<Pebble expression={expression} />);
      expect(container.querySelector('svg').getAttribute('aria-label')).toBe(label);
    }
  });

  it('defaults the aria-label to the ready (neutral) state', () => {
    const { container } = render(<Pebble />);
    expect(container.querySelector('svg').getAttribute('aria-label')).toBe('Pebble — ready');
  });

  it('renders the idle blink only when idle and on an open-eye expression (§2 motion)', () => {
    // idle + neutral -> blink group present
    const open = render(<Pebble idle expression="neutral" />);
    expect(open.container.querySelector('.pebble-blink')).toBeTruthy();
    // not idle -> no blink (e.g. inside capture, focus protected)
    const still = render(<Pebble expression="neutral" />);
    expect(still.container.querySelector('.pebble-blink')).toBeNull();
    // idle but a closed/frown expression -> nothing to blink
    const sad = render(<Pebble idle expression="sad" />);
    expect(sad.container.querySelector('.pebble-blink')).toBeNull();
  });
});
