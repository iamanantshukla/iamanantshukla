// src/lib/pebbleVoice.js — the home "Pebble says" status text.
// Sourced from a SEPARATE Drive file (currently empty / placeholder; see UI_UPDATE.md).
import { getAccessToken } from './auth.js';

// Drive file id. Placeholder by default → home shows FALLBACK_VOICE until a real id is set
// (paste it here, or call setPebbleVoiceFileId(id) at runtime). See UI_UPDATE.md.
let pebbleVoiceFileId = '1h3qcB7Ynnnm04Kghe1n9ocf9IYu0cbcj';
export const setPebbleVoiceFileId = (id) => { if (id) pebbleVoiceFileId = id; };
export const FALLBACK_VOICE = "You're doing great. Keep showing up — small honest reps add up.";

export async function getPebbleVoice() {
  const token = getAccessToken();
  if (!token || pebbleVoiceFileId.startsWith('PLACEHOLDER')) return FALLBACK_VOICE;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${pebbleVoiceFileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return FALLBACK_VOICE;
    const data = await res.json();
    return (data && data.text && String(data.text).trim()) ? data.text : FALLBACK_VOICE;
  } catch {
    return FALLBACK_VOICE;
  }
}
