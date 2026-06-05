// lexicon.mjs — CLOSED, vendored word lists for the mechanical lint checks of
// the impact-map harness (simulation.md §1 Lexicon row, §2 L9/L10/L11/L12).
// Extended ONLY by editing this file in a committed change, never ad hoc at
// runtime. Each list cites the check that consumes it and the catalog rule.

// L9 / N6 — closed D1 software-/solution-noun blocklist (catalog D1). An Impact
// cell carrying any of these (whole-word, case-insensitive) is feature-shaped.
// Pinned VERBATIM to validation-rules.md D1 / simulation.md §2 L9.
export const SOFTWARE_NOUN = new Set(
  [
    'app',
    'application',
    'system',
    'platform',
    'feature',
    'button',
    'screen',
    'page',
    'dashboard',
    'api',
    'endpoint',
    'integration',
    'module',
    'notification',
    'email',
    'report',
    'form',
    'database',
    'portal',
    'widget',
    'function',
    'service',
  ].map((w) => w.toLowerCase())
);

// L10 — closed G1 vague-filler blocklist (catalog G1). Applied whole-word,
// case-insensitive to goal/actor/impact/deliverable names. `etc.` tokenises to
// `etc`. Pinned VERBATIM to validation-rules.md G1 / simulation.md §2 L10.
export const VAGUE_FILLER = new Set(
  [
    'manage',
    'handle',
    'process',
    'support',
    'stuff',
    'various',
    'etc',
    'things',
    'data',
    'solution',
    'leverage',
    'optimize',
    'streamline',
    'seamless',
    'robust',
  ].map((w) => w.toLowerCase())
);

// L12 — closed G4 tech-leak blocklist (catalog G4). Applied whole-word,
// case-insensitive to Business Actor names and the goal statement.
// Pinned VERBATIM to simulation.md §2 L12.
export const TECH_LEAK = new Set(
  ['api', 'db', 'endpoint', 'http', 'table', 'class', 'sql', 'json', 'uuid', 'service'].map(
    (w) => w.toLowerCase()
  )
);

// L11 — number-word list for the measurement-token scan (catalog B1). A goal
// that quantifies in words ("one million active players") still counts as
// measurable. Closed list; matched whole-word, case-insensitive.
export const NUMBER_WORDS = new Set(
  [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'hundred',
    'thousand',
    'million',
    'billion',
    'trillion',
    'double',
    'triple',
    'half',
  ].map((w) => w.toLowerCase())
);

// Tokenise a name into lowercase word tokens (alnum runs). Used for whole-word
// blocklist matching so that e.g. "Database" does NOT match "DB" and
// "Reporter" does NOT match "report".
export function wordTokens(s) {
  return (s.toLowerCase().match(/[a-z0-9]+/g) || []);
}

// Whole-word blocklist hit; returns the first offending token or null.
export function blocklistHit(name, blocklist) {
  for (const tok of wordTokens(name)) {
    if (blocklist.has(tok)) return tok;
  }
  return null;
}

// L11 measurement-token presence (catalog B1). True if the goal string carries
// a digit, a percent sign, a currency sign, or a closed number-word — the
// minimal "this goal is quantified" signal. Non-matches are flagged for AJ2.
export function hasMeasurement(goal) {
  if (goal == null) return false;
  const s = String(goal);
  if (/\d/.test(s)) return true; // any digit
  if (/%/.test(s)) return true; // percentage
  if (/[$£€¥₹]/.test(s)) return true; // currency sign
  for (const tok of wordTokens(s)) {
    if (NUMBER_WORDS.has(tok)) return true; // quantified in words
  }
  return false;
}
