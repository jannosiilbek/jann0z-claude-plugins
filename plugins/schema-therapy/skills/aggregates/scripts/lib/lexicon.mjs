// lexicon.mjs — CLOSED, vendored word lists + token helpers for the aggregates
// mechanical checks. Extended ONLY by editing this file in a committed change,
// never ad hoc at runtime (simulation.md §1, §2). Each export cites the check(s)
// that consume it.
//
// COPIED scaffold from the sibling glossary lexicon, retaining wordTokens /
// blocklistHit / isSnakeCase and adding the 03-specific closed lists. Copied,
// never cross-referenced.

// X4 — generic-justification blocklist (simulation.md §3.3). A `transactional`
// cross-boundary policy whose normalized Justification ∈ this set is unjustified.
// Closed and vendored; lower-cased + trimmed; the empty string is a member.
export const X4_GENERIC_BLOCKLIST = new Set([
  '',
  'for convenience',
  'simpler',
  'easier',
]);

// A8 — generic-collection blocklist (simulation.md §1). An aggregate NAME whose
// last word is one of these denotes a generic container, not a domain concept.
// Consumed by the A8 agent-judged residue's mechanical pre-filter (AJ5).
export const COLLECTION_BLOCKLIST = new Set([
  'list',
  'map',
  'set',
  'collection',
  'registry',
  'array',
  'bag',
  'dictionary',
]);

// Mode closed set (X3 / L11).
export const MODE_SET = new Set(['transactional', 'eventual']);

// Boundary-contents Kind closed set (S7 enum / L9).
export const KIND_SET = new Set(['entity', 'value object']);

// L17 — consecutive-event window: ≥N verbatim 01 events in skeleton order in a
// single cell is a restated lifecycle (D2-mech). Default 3.
export const LIFECYCLE_WINDOW_N = 3;

// Tokenise a string into lowercase word tokens (alnum + underscore runs kept as
// units so snake_case tokens survive). Used for whole-word blocklist matching.
export function wordTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9_]+/g) || [];
}

// Tokenise into PLAIN alnum word tokens (underscore is a separator). Used for
// whole-word aggregate-NAME scans (I3-mech, forbidden synonyms).
export function plainTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Whole-word blocklist hit; returns the first offending token or null.
export function blocklistHit(name, blocklist) {
  for (const tok of plainTokens(name)) {
    if (blocklist.has(tok)) return tok;
  }
  return null;
}

// snake_case validator: lowercase, starts with a letter, only [a-z0-9_], and
// contains at least one underscore-joined or single lowercase run. (A bare
// single lowercase word like `paid` is a valid enum-value candidate too.)
export function isSnakeCase(value) {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(value || '');
}

// Enum-token detector (simulation.md §1, edge 4 / R4). From an invariant Rule
// cell, extract candidate enum-value references: snake_case tokens
// (\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b) PLUS single lowercase tokens that match a
// known 02 value. The caller supplies `knownValues` (the union of all 02 enum
// values) so single-word lowercase candidates are admitted only when they are a
// real value — keeping noise (ordinary English words) out of the resolution set.
//
// Returns the de-duplicated list of candidate tokens IN FIRST-APPEARANCE ORDER
// (determinism). Multi-word value? 02 values are snake_case/single-word by the
// glossary contract, so a token-level scan suffices.
export function enumTokens(ruleText, knownValues) {
  const known = knownValues instanceof Set ? knownValues : new Set(knownValues || []);
  const out = [];
  const seen = new Set();
  // snake_case candidates: an underscore-joined run.
  const snake = (ruleText || '').match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) || [];
  for (const t of snake) {
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  }
  // single lowercase tokens that are a known 02 value (e.g. `paid`, `sold`).
  for (const t of (ruleText || '').match(/\b[a-z][a-z0-9]*\b/g) || []) {
    if (t.includes('_')) continue;
    if (known.has(t) && !seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
}
