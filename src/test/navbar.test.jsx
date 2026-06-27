// src/test/navbar.test.jsx — the floating Pebble FAB opens the start chooser (practice/match ·
// dry/live · shot/skill) up front, and choosing a mode begins that session.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// A spy startSession so we can assert what the chooser launches without a real session.
const startSession = vi.fn();
vi.mock('../context/SessionContext.jsx', () => ({
  useSession: () => ({ startSession }),
}));
vi.mock('../context/JarvisContext.jsx', () => ({
  useJarvis: () => ({ expression: 'neutral' }),
}));

import NavBar from '../components/NavBar.jsx';

beforeEach(() => { startSession.mockReset(); });

describe('NavBar floating Pebble FAB', () => {
  it('opens the start chooser on tap (not a direct start)', () => {
    const { getByLabelText, queryByText, getByText } = render(
      <MemoryRouter><NavBar onLogout={() => {}} /></MemoryRouter>,
    );
    // chooser hidden initially
    expect(queryByText(/What are we training/i)).toBeNull();
    fireEvent.click(getByLabelText('Start a session'));
    // chooser now visible with its mode options
    expect(getByText(/What are we training/i)).toBeTruthy();
    expect(getByText('Practice')).toBeTruthy();
    expect(getByText('Live Match')).toBeTruthy();
    // a plain tap must NOT have started a session by itself
    expect(startSession).not.toHaveBeenCalled();
  });

  it('starts the chosen practice mode from the chooser', () => {
    const { getByLabelText, getByText } = render(
      <MemoryRouter><NavBar onLogout={() => {}} /></MemoryRouter>,
    );
    fireEvent.click(getByLabelText('Start a session'));
    fireEvent.click(getByText('Live Fire'));      // dry -> live
    fireEvent.click(getByText('Skill Focus'));    // shot -> skill
    fireEvent.click(getByText(/Start session/i));
    expect(startSession).toHaveBeenCalledWith('live', 'skill');
  });

  it('starts a live match from the chooser', () => {
    const { getByLabelText, getByText } = render(
      <MemoryRouter><NavBar onLogout={() => {}} /></MemoryRouter>,
    );
    fireEvent.click(getByLabelText('Start a session'));
    fireEvent.click(getByText('Live Match'));
    fireEvent.click(getByText(/Start match/i));
    expect(startSession).toHaveBeenCalledWith('live', 'match');
  });
});
