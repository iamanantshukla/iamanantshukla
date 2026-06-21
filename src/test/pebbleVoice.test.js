// src/test/pebbleVoice.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setAccessToken } from '../lib/auth.js';
import { getPebbleVoice, FALLBACK_VOICE, setPebbleVoiceFileId } from '../lib/pebbleVoice.js';

describe('pebbleVoice', () => {
  // A real (non-placeholder) file id so the fetch path is exercised, not short-circuited.
  beforeEach(() => { setAccessToken('t'); setPebbleVoiceFileId('real-file-id'); });

  it('uses the static fallback when no real file id is configured (placeholder)', async () => {
    setPebbleVoiceFileId('PLACEHOLDER_PEBBLE_VOICE_FILE_ID');
    vi.stubGlobal('fetch', vi.fn());
    expect(await getPebbleVoice()).toBe(FALLBACK_VOICE);
  });
  it('falls back to the static line when the file is empty/unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await getPebbleVoice()).toBe(FALLBACK_VOICE);
  });
  it('returns the drive text when present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: 'Nice grip work today.' }) }));
    expect(await getPebbleVoice()).toBe('Nice grip work today.');
  });
});
