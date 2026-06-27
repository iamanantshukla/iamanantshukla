// src/lib/phases.js — map campaign phase ids/types to human-readable names + a 5-segment ribbon
// bucket, shared by Home's season strip and the Campaign dashboard ribbon.
//
// campaign.json phases carry an `id` (e.g. 'restart', 'base1', 'base2', 'diag1', 'precomp', 'taper')
// and a `type` (e.g. 'restart', 'base', 'diagnostic', 'build', 'pre-comp', 'taper'). Readers should
// NEVER show the raw id ("restart"); use phaseName() for copy and ribbonIndex() for the ribbon.

// The 5 buckets the ribbon shows (the athlete-facing macrocycle).
export const PHASE_RIBBON = ['Base', 'Build', 'Sharpen', 'Taper', 'Match'];

// Classify a phase string to a canonical type. Order matters: pre-comp/sharpen BEFORE the bare
// 'comp'/'match' check (so 'precomp' isn't read as Match), and build BEFORE base (so the 'base2' id
// whose type is 'build' isn't read as Base — callers should pass the TYPE when they have it).
function classify(phase) {
  const p = String(phase || '').toLowerCase();
  if (!p) return 'season';
  if (p.includes('taper')) return 'taper';
  if (p.includes('pre') || p.includes('sharp')) return 'sharpen'; // pre-comp -> sharpen
  if (p.includes('match') || p.includes('comp')) return 'match';
  if (p.includes('build')) return 'build';
  if (p.includes('diag')) return 'diagnostic';
  if (p.includes('restart') || p.includes('base')) return 'base';
  return 'other';
}

const RIBBON_OF = { base: 0, diagnostic: 0, build: 1, sharpen: 2, match: 4, taper: 3, season: 0, other: 0 };
const NAME_OF = { base: 'Base', diagnostic: 'Diagnostic', build: 'Build', sharpen: 'Sharpen', match: 'Match', taper: 'Taper', season: 'Season' };

// Resolve a phase id/type string to its ribbon bucket index (0..4). Prefer passing the phase TYPE.
export function ribbonIndex(phase) {
  return RIBBON_OF[classify(phase)] ?? 0;
}

// Human name for the CURRENT phase (Home season strip). Restart/base -> "Base"; pass the TYPE when
// the id is misleading (e.g. id 'base2' with type 'build').
export function phaseName(phase) {
  const t = classify(phase);
  if (NAME_OF[t]) return NAME_OF[t];
  // Unknown: title-case rather than show a raw slug.
  return String(phase || '').replace(/[-_]\d*/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || 'Season';
}

// Given the campaign object, resolve the CURRENT phase's type (reliable) from its id, so callers
// don't have to know the id->type mapping. Falls back to the raw currentPhase string.
export function currentPhaseType(campaign) {
  if (!campaign) return '';
  const cur = campaign.currentPhase || campaign.phase;
  const match = Array.isArray(campaign.phases) ? campaign.phases.find((ph) => ph.id === cur) : null;
  return (match && match.type) || cur || '';
}
