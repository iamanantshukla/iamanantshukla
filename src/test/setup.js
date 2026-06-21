// Vitest setup: run React Testing Library's cleanup after every test so mounted
// components don't leak into the next test (otherwise getByText finds duplicates).
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
