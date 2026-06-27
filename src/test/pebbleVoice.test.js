// src/test/pebbleVoice.test.js
// The duplicate Drive-fetch source (getPebbleVoice/setPebbleVoiceFileId) was removed in the §3
// cleanup — the live verdict is the pebble.json singleton (see jarvisContext.test.jsx). All that
// survives is the static FALLBACK_VOICE, the never-blank home line. Guard its contract.
import { describe, it, expect } from 'vitest';
import { FALLBACK_VOICE } from '../lib/pebbleVoice.js';

describe('pebbleVoice fallback', () => {
  it('exports a non-empty, emoji-free static fallback line', () => {
    expect(typeof FALLBACK_VOICE).toBe('string');
    expect(FALLBACK_VOICE.trim().length).toBeGreaterThan(0);
    // House rule: no emoji in product copy (§0 rule #7).
    expect(FALLBACK_VOICE).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
