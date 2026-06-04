// lexicon.mjs — CLOSED, vendored word lists + the event→value normalizer for the
// glossary mechanical checks. Extended ONLY by editing this file in a committed
// change, never ad hoc at runtime (simulation.md §1, §2). Each export cites the
// check(s) that consume it.

// L13 / C3 — tech-leak blocklist applied to Definition cells (whole-word,
// case-insensitive). The closed set pinned by simulation.md L13:
//   { table, column, foreign key, API, endpoint, JSON, service class, null }
// Single-token members live here; the multi-word members ("foreign key",
// "service class") are matched as phrases in checks.mjs.
export const TECH_LEAK = new Set(
  ['table', 'column', 'api', 'endpoint', 'json', 'null'].map((w) =>
    w.toLowerCase()
  )
);
export const TECH_LEAK_PHRASES = ['foreign key', 'service class'];

// L14 / C4 — vague-filler blocklist applied to Term and Definition cells
// (whole-word, case-insensitive). The closed set pinned by simulation.md L14:
//   { data, info, item, thing, manager, process, handle }  + a BARE `status`.
export const VAGUE_FILLER = new Set(
  ['data', 'info', 'item', 'thing', 'manager', 'process', 'handle'].map((w) =>
    w.toLowerCase()
  )
);
// `status` is vague only when BARE (used alone as a Term, or standalone in a
// Definition). It is legitimate inside an enum NAME like `OrderStatus`. The
// caller (L14) distinguishes by context; this set holds the bare token.
export const BARE_STATUS = 'status';

// L15 / C7 — defer phrases (a Definition that points elsewhere instead of
// defining). Matched case-insensitively as substrings.
export const DEFER_PHRASES = [/\bsee\s+\w/i, /\bsame as\b/i, /\bas above\b/i];

// Tokenise a string into lowercase word tokens (alnum runs). Used for whole-word
// blocklist matching so "Database" does NOT match a bare "data".
export function wordTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Whole-word blocklist hit; returns the first offending token or null.
export function blocklistHit(name, blocklist) {
  for (const tok of wordTokens(name)) {
    if (blocklist.has(tok)) return tok;
  }
  return null;
}

// Phrase hit (multi-word, case-insensitive, whitespace-collapsed).
export function phraseHit(text, phrases) {
  const hay = (text || '').toLowerCase().replace(/\s+/g, ' ');
  for (const p of phrases) {
    if (hay.includes(p)) return p;
  }
  return null;
}

// D5 — snake_case validator: lowercase, starts with a letter, only [a-z0-9_].
export function isSnakeCase(value) {
  return /^[a-z][a-z0-9_]*$/.test(value || '');
}

// D5 / D7 — normalize a verbatim 01 event string into its snake_case STATE
// value form. This is the canonical derivation the harness expects:
//   "Order Placed"      -> "placed"            (aggregate prefix dropped)
//   "Payment Captured"  -> "payment_captured"  (no aggregate prefix to drop)
//   "Ticket Sold"       -> "sold"
// Strategy: tokenise; if the FIRST token equals the owning aggregate name
// (case-insensitive), drop it so the value reads as a status, not a restatement
// of the aggregate. Join the rest with `_`. The caller passes the aggregate so
// the prefix-drop is deterministic.
export function eventToValue(eventString, aggregateName) {
  const toks = wordTokens(eventString);
  if (toks.length === 0) return '';
  const agg = (aggregateName || '').toLowerCase();
  let parts = toks;
  if (toks.length > 1 && agg && toks[0] === agg) {
    parts = toks.slice(1);
  }
  return parts.join('_');
}
