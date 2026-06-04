// lexicon.mjs — CLOSED, vendored word lists for the mechanical lint checks.
// These are extended ONLY by editing this file in a committed change, never ad
// hoc at runtime (simulation.md §2). Each list cites the check that consumes it.

// L11 — irregular past-tense verbs whose last token does not end in `-ed`.
// Stored lowercase; matched case-insensitively against the event's last token.
export const IRREGULAR_PAST = new Set(
  [
    'sent',
    'paid',
    'built',
    'made',
    'signed', // (regular but kept per simulation.md's explicit example list)
    'shipped',
    'cancelled',
    'received',
    'lost',
    'begun',
    'set',
    // additional well-known irregular pasts that legitimately end a domain event
    'bought',
    'sold',
    'caught',
    'found',
    'held',
    'kept',
    'left',
    'put',
    'read',
    'run',
    'won',
    'written',
    'drawn',
    'given',
    'taken',
    'chosen',
    'frozen',
    'broken',
    'spent',
    'told',
    'withdrawn',
    'met',
    'split',
    'dealt',
    'bound',
  ].map((w) => w.toLowerCase())
);

// L12 — vague-filler blocklist (whole-word, case-insensitive). Applied to event
// cells, actor names, aggregate headings (simulation.md §2; catalog G1).
export const VAGUE_FILLER = new Set(
  ['manage', 'process', 'handle', 'stuff', 'various', 'etc', 'data'].map((w) =>
    w.toLowerCase()
  )
);

// L13 — tech-leak blocklist (whole-word, case-insensitive). Applied to event /
// actor / aggregate names (simulation.md §2; catalog G3).
export const TECH_LEAK = new Set(
  ['api', 'db', 'endpoint', 'http', 'table', 'class', 'sql', 'json', 'uuid'].map(
    (w) => w.toLowerCase()
  )
);

// Tokenise a name into lowercase word tokens (alnum runs). Used for whole-word
// blocklist matching so that e.g. "Database" does NOT match "DB".
export function wordTokens(s) {
  return (s.toLowerCase().match(/[a-z0-9]+/g) || []);
}

// L11 past-tense heuristic over an event name. Returns true if PLAUSIBLY past.
// Last meaningful token must end in `-ed` OR be on the irregular list.
export function isPastTense(eventName) {
  const tokens = wordTokens(eventName);
  if (tokens.length === 0) return false;
  const last = tokens[tokens.length - 1];
  if (last.endsWith('ed')) return true;
  if (IRREGULAR_PAST.has(last)) return true;
  return false;
}

// Whole-word blocklist hit; returns the first offending token or null.
export function blocklistHit(name, blocklist) {
  for (const tok of wordTokens(name)) {
    if (blocklist.has(tok)) return tok;
  }
  return null;
}
