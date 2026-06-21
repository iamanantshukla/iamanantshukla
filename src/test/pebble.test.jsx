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
});
