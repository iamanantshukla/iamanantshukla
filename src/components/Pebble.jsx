// src/components/Pebble.jsx
// The Pebble character: rounded coral pebble body, cream belly, dot eyes, triangle beak.
// variant: 'full' (body) | 'face' (head only, for tiny contexts)
// expression: 'neutral' | 'happy' | 'sleepy' | 'focused' | 'resting'
export default function Pebble({ size = 40, variant = 'full', expression = 'neutral', className = '' }) {
  const eye = (cx) => {
    if (expression === 'sleepy' || expression === 'resting') {
      return <path key={cx} d={`M${cx - 4} 46 q4 4 8 0`} fill="none" stroke="#17140F" strokeWidth="2.4" strokeLinecap="round" />;
    }
    if (expression === 'happy') {
      return <path key={cx} d={`M${cx - 4} 47 q4 -5 8 0`} fill="none" stroke="#17140F" strokeWidth="2.4" strokeLinecap="round" />;
    }
    const r = expression === 'focused' ? 2.6 : 3.6;
    return <circle key={cx} cx={cx} cy="46" r={r} fill="#17140F" />;
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="Pebble">
      <path d="M50 10 C72 10 84 28 84 52 C84 78 70 90 50 90 C30 90 16 78 16 52 C16 28 28 10 50 10 Z" fill="var(--accent)" />
      {variant === 'full' && <ellipse cx="50" cy="58" rx="20" ry="26" fill="#FBE9DD" />}
      {eye(42)}
      {eye(58)}
      <path d="M46 54 L54 54 L50 60 Z" fill="var(--warn)" />
      {expression === 'happy' && <path d="M50 8 C57 8 60 2 56 0 C53 4 50 4 50 8 Z" fill="var(--accent)" />}
    </svg>
  );
}
