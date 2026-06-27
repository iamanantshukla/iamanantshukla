// src/test/shotCapture.test.jsx — the call→actuals capture flow through the real SessionContext.
import { describe, it, expect, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { SessionProvider, useSession } from '../context/SessionContext.jsx';
import ShotCapture from '../components/ShotCapture.jsx';

// A harness that starts a live session (in an effect, never during render), then renders capture.
function Harness() {
  const s = useSession();
  useEffect(() => { if (!s.sessionActive) s.startSession('live', 'shot'); }, []); // eslint-disable-line
  return <ShotCapture />;
}

function renderCapture() {
  return render(<SessionProvider><Harness /></SessionProvider>);
}

// jsdom has no layout; stub the SVG box so tapToMm has a non-zero rect (centre = 0,0).
beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0 };
  };
});

describe('ShotCapture call→actuals flow', () => {
  it('renders the two-column capture surface with a target and a string table', () => {
    const { container } = renderCapture();
    expect(container.querySelector('.shotcapture')).toBeTruthy();
    expect(container.querySelector('.capture-hero .target')).toBeTruthy();
    expect(container.querySelector('.string-table')).toBeTruthy();
  });

  it('a tap in the CALL pass appends a call and auto-advances (centre tap ~10.9)', () => {
    const { container } = renderCapture();
    const svg = container.querySelector('.target');
    // tap the centre of the 200x200 box -> mm (0,0) -> score 10.9
    act(() => { fireEvent.click(svg, { clientX: 100, clientY: 100 }); });
    const callCell = container.querySelector('.string-row .sr-call');
    expect(callCell.textContent).toBe('10.9');
  });

  it('shows the contextual hint for the active pass', () => {
    const { container, getByText } = renderCapture();
    expect(container.querySelector('.capture-hint').textContent).toMatch(/FELT/);
    fireEvent.click(getByText('Mark actuals'));
    expect(container.querySelector('.capture-hint').textContent).toMatch(/landed/i);
  });
});
