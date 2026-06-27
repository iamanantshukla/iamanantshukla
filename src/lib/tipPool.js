// client/src/lib/tipPool.js — static fallback pool for the Home "Tip of the Day" (sub-project: mindset pillar).
//
// When the laptop mindset-coach agent has written pebble.json.daily_tip, the app shows THAT (fresh,
// personalized). When it has not (laptop off), the footer must never be empty — so this small,
// curated pool (distilled from jarvis-agent/books/*/practices.json) drives a deterministic rotation.
//
// THEME PERSISTENCE: the rotation holds ONE theme for a multi-day BLOCK (default 6 days), surfacing
// a different practice/framing of the SAME theme each day, then advances to the next theme. This
// mirrors the agent's rule so a tip never jumps topic daily even in fallback mode. Deterministic by
// date (day-of-year), so it is stable across reloads and devices on the same day.
//
// Only this curated subset ships in the public bundle; the full dossiers stay private.

export const TIP_THEMES = ["the-two-selves", "letting-go-of-judgment", "relaxed-concentration", "competing-without-anxiety", "natural-growth-and-living"];

export const TIP_POOL = [
  {
    "id": "name-the-voice",
    "theme": "the-two-selves",
    "text": "Self 1 (the teller) and Self 2 (the doer) are distinct. The instant you can hear the instructing/scolding voice as a separate thing, you stop being fused with it, and a voice you can hear is a voice you can choose not to obey",
    "practice": "Whenever you catch an instruction or scold running in your head ('grip harder', 'don't drop the elbow', 'you idiot, that was a 7'), silently label it: 'That's Self 1.' Do not argue with it, fix it, or believe it. Tag it and return attention to what you are physically doing right now. Aim for 10-20 catches a day, on and off the range.",
    "when": "anytime",
    "observe_cue": "You notice a small beat between the comment arriving and you reacting to it - a gap where you simply heard the voice instead of being swept into it. Notice the gap without grading how often you managed it.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.11-12"
  },
  {
    "id": "respect-self2",
    "theme": "the-two-selves",
    "text": "Replace mistrust of the body with respect for it - Self 2 performs staggering split-second calculations and never forgets a learned movement. Recalling its competence dissolves the over-instruction that fuels micro-control",
    "practice": "Take 60 seconds before the day starts. Recall one concrete piece of evidence that your trained body knows what it is doing - a clean string, a final you held together, the plain fact that thousands of reps are stored in you. State it flatly: 'My trained system knows how to shoot a 10. My job today is to set the intention and let it work.' No hype - a factual vote of confidence in Self 2.",
    "when": "morning",
    "observe_cue": "Through the day, notice whether you reach for fewer corrective self-instructions and start a session with looser shoulders. The cue is reduced fussing, not a mood lift.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.43-45"
  },
  {
    "id": "set-and-let",
    "theme": "the-two-selves",
    "text": "Self 1's only job is to set the goal, then let Self 2 perform - letting it happen, not making it happen. The key word is let, and the more important the shot the more Self 1 tries to control it, which is exactly when tightening occurs",
    "practice": "Build a two-beat routine per shot. Beat 1 (Self 1, brief): state the single intention silently - 'center, clean release' - while raising the pistol. Beat 2 (let go): from the moment of settle, stop all instruction and commentary; let the shot release on its own. If you catch yourself trying to steer or hold the perfect picture forever, abort, lower the pistol, and restart at Beat 1 rather than forcing the shot.",
    "when": "during a shooting session",
    "observe_cue": "Notice that you aborted and re-set instead of muscling a doubtful shot, and that on the shots you let go your forearm and grip felt no late surge of tension. Letting go is the skill being trained, not the score.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.45-46, p.49"
  },
  {
    "id": "umpire-the-shot",
    "theme": "letting-go-of-judgment",
    "text": "Judgment ('bad shot') triggers the thinking-trying-tightening cascade; neutral description does not. Be the umpire who calls the ball as he sees it. Letting go of judgment does not mean ignoring errors - it means seeing them as they are and adding nothing",
    "practice": "After every shot, before you read the score, say one purely factual sentence about what you observed - 'shot broke as the dot drifted left' or 'released on a settling hold' - using zero value words (no 'great', 'terrible', 'choke', 'always'). If a charged word appears, that is the cue you slipped into judging; restate it as a plain observation. You still note 'half went left' - you just refuse to add the sting.",
    "when": "during a shooting session",
    "observe_cue": "Your jaw, shoulders, and grip stay loose between shots, and your descriptions contain no value words. Notice tension arriving as information, not as failure.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.22-25"
  },
  {
    "id": "mirror-the-fault",
    "theme": "letting-go-of-judgment",
    "text": "Awareness, not instruction, unblocks change. Jack couldn't lower his racket through five pros' words but corrected it the instant he SAW it in a windowpane. No one is surprised by something they already know, so surprise is the proof you truly saw it",
    "practice": "Pick the fault you keep being 'told' you have (snatching the trigger, dropping the head, anticipating). For ten shots, do NOT try to fix it. Put attention only on directly feeling it: 'where exactly is my trigger finger at the instant the shot breaks?' or 'where is the muzzle the moment it fires?' Report the raw observation to yourself, with curiosity not correction. Use video or a coach to mirror back what actually happened. Let any change arrive on its own.",
    "when": "during a shooting session",
    "observe_cue": "Notice genuine surprise - 'oh, it actually does THAT' - because no one is surprised by something they truly know. The surprise means you finally saw it rather than re-confirmed a label; from there the change starts on its own.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.29-32"
  },
  {
    "id": "start-a-new-groove",
    "theme": "letting-go-of-judgment",
    "text": "Don't fight an old habit with willpower - that creates tension and a visible waver. A child doesn't dig out of old grooves, he simply starts new ones; the old groove is only active if you step into it",
    "practice": "Pick one technical change you want (say, a softer grip). Do NOT frame it as 'stop gripping too hard' and battle the old habit. First watch yourself shoot a few without correcting, then PROGRAM the new pattern by image and feel - picture and feel the soft, easy hold and a clean release - then shoot letting the body produce it, with no effort to suppress the old way. If it doesn't come, return to observing; never force.",
    "when": "during a shooting session",
    "observe_cue": "Notice the absence of the 'waver' - the tightening-then-forcing feeling of fighting yourself. The new pattern should feel easy and use fewer muscles, not more.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.84-85"
  },
  {
    "id": "breath-between-shots",
    "theme": "relaxed-concentration",
    "text": "You are naturally absorbed while the shot goes off; the focus leaks in the gap afterward. The breath is the always-present here-and-now object to re-anchor on, and anxiety is fear of an imagined future that the present breath dissolves",
    "practice": "Decide in advance that the window after the shot belongs to your breath. The instant the shot breaks, drop attention to one slow cycle of air going in and out - observe it, do not control it. Do not score the last shot or rehearse the next in this gap. When you raise the pistol again, the breath has been your bridge.",
    "when": "during a shooting session",
    "observe_cue": "Notice, without grading, whether you arrived at the next shot calmer than you left the last one. If the gap held breath instead of commentary, the raise feels quieter - that is the proof.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.116-117"
  },
  {
    "id": "subtle-anchor",
    "theme": "relaxed-concentration",
    "text": "Anchor on something subtle, not the obvious object - subtlety so engrosses the mind that it forgets to try too hard, and a hard-to-perceive detail leaves no room for outcome-thoughts",
    "practice": "Gallwey watches the seams of the ball, not 'the ball'. Pick your equivalent micro-detail: the exact edge where the front sight meets light, the fine relationship of the front post inside the rear notch, or the texture of the aiming area. Make THAT what your eyes rest on. Because it is hard to perceive, holding it takes all your attention - leaving none for 'am I going to win' or 'keep your wrist firm'.",
    "when": "during a shooting session",
    "observe_cue": "Notice if the sight picture starts to look sharper, larger, or oddly slowed - Gallwey reports the ball appearing bigger and slower. That vividness is the marker of real absorption.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.99"
  },
  {
    "id": "morning-breath-prime",
    "theme": "relaxed-concentration",
    "text": "To still the mind you must park it somewhere; the breath is always present and putting attention on it calms the mind. Rehearsing the return-to-breath move daily makes it an automatic reflex available under match pressure",
    "practice": "Before the day starts, sit a few minutes and do exactly what Gallwey describes: observe the breath going in and out in its natural rhythm - do not control it. Optionally let your hands open slightly on the inhale and close on the exhale, then ask them to move less. Each time the mind wanders, bring it gently back to the breath. You are rehearsing the precise re-anchoring move you will need between shots.",
    "when": "morning",
    "observe_cue": "Notice, without judging, how quickly you can bring a wandered mind back today. Shorter return-time over weeks is the trained reflex showing up.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.117"
  },
  {
    "id": "name-the-three-freakouts",
    "theme": "competing-without-anxiety",
    "text": "A freak-out belongs to the mind, not the event, and comes from only three sources - regret about the past, fear of the future, dislike of the present. Naming the source separates the real from the imagined",
    "practice": "The instant you feel rattled - a blown shot, a tense message, a delay - silently label which of the three it is: 'past' (regret), 'future' (fear), or 'present' (dislike). Then state the plain fact with no adjective: not 'that was a terrible shot' but 'the shot landed at 8.' The labeling itself is the intervention; you do not need to fix the feeling.",
    "when": "anytime",
    "observe_cue": "Notice the small drop in body tension (jaw, shoulders, breath) the moment you name the category and strip the adjective. That release is the proof.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.151"
  },
  {
    "id": "unfreak-event-vs-reaction",
    "theme": "competing-without-anxiety",
    "text": "The event and the mind's reaction are two separate things; the freak-out is in the mind, not the event. Seeing that separation restores the clear head needed to act, because action born in worry is usually wrong and too late",
    "practice": "When a shot blows out, a malfunction hits, or you fall behind and feel the upset rising, silently state the separation: 'The shot happened; the upset is my mind's add-on.' Take one observed breath and return to the only available action - the next shot. Do not adjust your hold or gear while the mind is still freaked; Gallwey warns action born in worry is usually inappropriate and too late.",
    "when": "during a shooting session",
    "observe_cue": "Notice the gap between the event and your reaction opening up - clarity returning, you can see what is actually happening again. The cue is clarity, not the disappearance of the bad shot.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.151"
  },
  {
    "id": "effort-only-scorecard",
    "theme": "competing-without-anxiety",
    "text": "You cannot control whether you win; you can always control the effort you put into the shot in front of you. Because anxiety about a controllable thing is impossible, anchoring attention on maximum present effort dissolves the anxiety",
    "practice": "Before each shot, set the success criterion as the effort, not the outcome: 'full, committed, present execution of THIS shot' - Gallwey's maximum effort that is concentration and trust, not Self 1 straining. Do not let the value ride on where the pellet lands. After the shot, evaluate only one thing: did I give it my complete present effort? Keep a private effort-tally alongside (not instead of) the real score.",
    "when": "during a shooting session",
    "observe_cue": "Notice that you can answer 'yes, that was full effort' even on shots that scored low, and that there is less internal upset after a weak shot. Maximum effort is concentration and trust, not extra muscle, so notice the absence of clenching.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.146-147"
  },
  {
    "id": "seed-not-building",
    "theme": "natural-growth-and-living",
    "text": "See yourself as a seed with the whole tree already inside, not a building needing stories added; the player who trusts the potential already in him and lets it unfold learns faster and becomes confident yet humble, while the one straining to become who he 'should' be loses touch with who he is",
    "practice": "Each morning, write two lines in your journal. Line 1, the 'should' you are carrying today, named plainly: e.g. 'I should already be world-class / I should not still be missing tens.' Line 2, the same thing rewritten as a seed: name one specific capacity already in you ('the clean release is in my hands') plus today's single given condition to use ('today I have a calm 90-minute block - I'll use it'). Then cross out Line 1. Do not compare yourself to other shooters or to an idealized self; set the day's intention and trust the process.",
    "when": "morning",
    "observe_cue": "Notice a quieter, less driven feeling entering the session - confident yet humble - and that across the day you compare yourself to others less and reach for the 'should' less often.",
    "book": "The Inner Game of Tennis",
    "cite": "Gallwey, p.160-161"
  }
];

const BLOCK_LENGTH = 6; // days a theme is held before advancing

function dayOfYear(d) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000);
}

// fallbackTip(date) -> a daily_tip-shaped object chosen by theme-block from the static pool.
// Same shape the agent emits (minus block bookkeeping it does not need), so TipOfDay renders either.
export function fallbackTip(date = new Date()) {
  if (!TIP_POOL.length) return null;
  const doy = dayOfYear(date);
  const blockIndex = Math.floor(doy / BLOCK_LENGTH);
  const dayInBlock = (doy % BLOCK_LENGTH) + 1;
  const theme = TIP_THEMES[blockIndex % TIP_THEMES.length];
  const inTheme = TIP_POOL.filter((t) => t.theme === theme);
  const pool = inTheme.length ? inTheme : TIP_POOL; // thin themes fall back to the whole pool
  const pick = pool[(dayInBlock - 1) % pool.length];
  return {
    ...pick,
    day_in_block: Math.min(dayInBlock, pool.length === 1 ? 1 : dayInBlock),
    block_length: pool.length === 1 ? 1 : BLOCK_LENGTH,
    source: 'fallback',
  };
}
