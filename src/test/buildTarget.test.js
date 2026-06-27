// buildTarget.test.js — sub-project B: assert config.js resolves the right base path / identity
// per VITE_BUILD_TARGET. config.js reads import.meta.env.VITE_BUILD_TARGET at module-eval time, so
// each case stubs the env then re-imports the module fresh (vi.resetModules + dynamic import).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function loadConfigWith(target) {
  vi.resetModules();
  if (target === undefined) {
    vi.stubEnv('VITE_BUILD_TARGET', '');
  } else {
    vi.stubEnv('VITE_BUILD_TARGET', target);
  }
  return import('../lib/config.js');
}

describe('config.js build-target resolution', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('local target -> base "/", IS_LOCAL, THIS_DEVICE "local"', async () => {
    const cfg = await loadConfigWith('local');
    expect(cfg.BUILD_TARGET).toBe('local');
    expect(cfg.IS_LOCAL).toBe(true);
    expect(cfg.IS_PAGES).toBe(false);
    expect(cfg.THIS_DEVICE).toBe('local');
    expect(cfg.BASE_PATH).toBe('/');
  });

  it('pages target -> base "/iamanantshukla/", IS_PAGES, THIS_DEVICE "pages"', async () => {
    const cfg = await loadConfigWith('pages');
    expect(cfg.BUILD_TARGET).toBe('pages');
    expect(cfg.IS_LOCAL).toBe(false);
    expect(cfg.IS_PAGES).toBe(true);
    expect(cfg.THIS_DEVICE).toBe('pages');
    expect(cfg.BASE_PATH).toBe('/iamanantshukla/');
  });

  it('unset target -> defaults to local semantics', async () => {
    const cfg = await loadConfigWith(undefined);
    expect(cfg.BUILD_TARGET).toBe('local');
    expect(cfg.IS_LOCAL).toBe(true);
    expect(cfg.BASE_PATH).toBe('/');
  });

  it('unknown target -> treated as pages semantics (subpath base)', async () => {
    const cfg = await loadConfigWith('typo');
    expect(cfg.IS_LOCAL).toBe(false);
    expect(cfg.IS_PAGES).toBe(true);
    expect(cfg.BASE_PATH).toBe('/iamanantshukla/');
  });
});
