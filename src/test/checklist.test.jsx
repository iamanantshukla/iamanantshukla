// src/test/checklist.test.jsx — the Home checklist component behavior (spec §4.1).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Checklist from '../components/Checklist.jsx';

const items = [
  { id: 'mobility', label: 'Mobility', domain: 'physical', start: null },
  { id: 'dryfire', label: 'Dry-fire 2x10', domain: 'shooting', start: 'session' },
  { id: 'checkin', label: 'Evening check-in', domain: 'journal', start: 'journal' },
];

beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe('Checklist', () => {
  it('renders nothing when there are no items', () => {
    const { container } = render(<Checklist date="2026-06-27" items={[]} />);
    expect(container.querySelector('.checklist')).toBeNull();
  });

  it('shows an X-of-N counter that updates as items are ticked', () => {
    const { container, getByLabelText } = render(<Checklist date="2026-06-27" items={items} />);
    expect(container.querySelector('.checklist-count').textContent).toBe('0 of 3 done');
    fireEvent.click(getByLabelText('Tick Mobility'));
    expect(container.querySelector('.checklist-count').textContent).toBe('1 of 3 done');
  });

  it('auto-highlights the first undone item as "now"', () => {
    const { container, getByLabelText } = render(<Checklist date="2026-06-27" items={items} />);
    // first undone is mobility
    expect(container.querySelector('.task.now .task-ttl').textContent).toBe('Mobility');
    fireEvent.click(getByLabelText('Tick Mobility'));
    // now advances to dry-fire
    expect(container.querySelector('.task.now .task-ttl').textContent).toBe('Dry-fire 2x10');
  });

  it('fires onStart with the item for an item with a start route', () => {
    const onStart = vi.fn();
    const { container } = render(<Checklist date="2026-06-27" items={items} onStart={onStart} />);
    // The first item with an action pill is dry-fire (mobility has start:null).
    const startBtn = container.querySelector('.task-act');
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'dryfire' }));
  });

  it('persists ticks across remounts (durable per-day state)', () => {
    const first = render(<Checklist date="2026-06-27" items={items} />);
    fireEvent.click(first.getByLabelText('Tick Mobility'));
    first.unmount();
    const second = render(<Checklist date="2026-06-27" items={items} />);
    expect(second.container.querySelector('.checklist-count').textContent).toBe('1 of 3 done');
  });
});
