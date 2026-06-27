// client/src/components/TipOfDay.jsx — the Home-footer "Tip of the Day" by Pebble (mindset pillar).
//
// Reads jarvis.tip (the agent-written pebble.daily_tip when present, else the static theme-block
// fallback from tipPool.js). Renders a small Pebble-faced card with the way-of-thinking for today,
// the concrete practice ("try this: <when>"), and a subtle theme + "day N of this focus" cue so the
// athlete sees the SAME theme held across a multi-day block (the anti-jumpy-tip requirement).
// No emojis. Reuses the JarvisContext no-flash value; renders nothing only if there is truly no tip.

import Pebble from './Pebble.jsx';
import { useJarvis } from '../context/JarvisContext.jsx';

// theme id -> short human label for the footer cue
const THEME_LABEL = {
  'the-two-selves': 'The two selves',
  'letting-go-of-judgment': 'Letting go of judgment',
  'relaxed-concentration': 'Relaxed concentration',
  'competing-without-anxiety': 'Competing without anxiety',
  'natural-growth-and-living': 'Natural growth',
};

// "during a shooting session" -> "during today's session", etc. — a natural "try this" cue.
const WHEN_LABEL = {
  'during a shooting session': "during today's session",
  morning: 'this morning',
  'work/day': 'through your work day',
  'pre-competition': 'before you compete',
  anytime: 'anytime today',
};

export default function TipOfDay() {
  const jarvis = useJarvis();
  const tip = jarvis && jarvis.tip;
  if (!tip || !tip.text) return null;

  const themeLabel = THEME_LABEL[tip.theme] || 'Mindset';
  const whenLabel = WHEN_LABEL[tip.when] || null;
  const showBlock = tip.day_in_block != null && tip.block_length != null && tip.block_length > 1;

  return (
    <div className="tip-card">
      <div className="tip-tag">
        <Pebble size={20} variant="face" expression={jarvis.expression || 'neutral'} />
        <span>Tip of the day</span>
        <span className="tip-theme">{themeLabel}</span>
        {showBlock ? <span className="tip-day muted">day {tip.day_in_block} of this focus</span> : null}
      </div>

      <div className="tip-text">{tip.text}</div>

      {tip.practice ? (
        <div className="tip-practice">
          {whenLabel ? <span className="tip-when">Try this {whenLabel}: </span> : null}
          {tip.practice}
        </div>
      ) : null}

      {tip.book ? (
        <div className="tip-source muted">{tip.book}{tip.cite ? ` — ${tip.cite}` : ''}</div>
      ) : null}
    </div>
  );
}
