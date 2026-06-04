// lexicon.mjs — CLOSED, vendored lexicons + helpers for the statecharts mechanical
// checks (simulation.md §1). Extended ONLY by editing this file in a committed
// change, never ad hoc at runtime. Each export cites the check(s) that consume it.
//
// COPIED scaffold from the sibling erd lexicon (snake_case validator / wordTokens /
// plainTokens / rawTokens / restatement window), then narrowed to the 05-specific
// pinned conventions:
//   - the EVENT-NAME TRANSFORM (the catalog's ONE pinned convention): the SCXML
//     `event` attribute is `lowercase(s).replace(/\s+/g,'_')` of the exact 01 string
//     (D7 / M19 / X-ROUNDTRIP).
//   - the snake_case validator (state ids = 02 enum values verbatim, C1 / M11).
//   - the restatement window N (E2 / M21).
// The forbidden-synonym list is NOT vendored: it is read fresh per run from the
// parsed 02 (upstream-owned data). Copied, never cross-referenced.

// --- the ONE pinned event-name transform (catalog "Pinned conventions"; D7/E4) ---
// SCXML `event` attribute = lowercase the exact 01 string and collapse each run of
// whitespace to a single underscore. `Order Placed` → `order_placed`. This is the
// single convention; consumed by M19 (token legality + round-trip) and X-ROUNDTRIP.
export function eventTransform(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, '_');
}

// snake_case validator (catalog C1): lowercase, starts with a letter, only
// [a-z0-9_]. State ids that ARE the 02 enum value must satisfy this. Also validates
// the legal-event-token shape after transform.
export function isSnakeCase(value) {
  return /^[a-z][a-z0-9_]*$/.test(value || '');
}

// Legal SCXML event token (Rec §3.12.1): dot-segmented alphanumeric descriptor
// tokens, NO spaces. We accept lowercase alnum/underscore segments joined by `.`
// (the pinned transform never emits a `.`, but the Rec allows them, and a hand
// authored event may legitimately segment). Consumed by M19 (D7).
export function isLegalEventToken(value) {
  const s = String(value == null ? '' : value);
  if (s.length === 0) return false;
  if (/\s/.test(s)) return false; // spaces are illegal (Rec §3.12.1)
  if (s === '*') return true; // the Rec's event wildcard descriptor (legal token)
  // a descriptor MAY end in `.*` (prefix-match), Rec §3.12.1.
  return /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*(\.\*)?$/.test(s);
}

// 64-hex digest validator (catalog A4 / M4). Rejects placeholder digests.
const PLACEHOLDER_RE = /^(0+|x+|<hex>|<sha256>|sha256|placeholder|todo)$/i;
export function isValidDigest(hex) {
  const h = String(hex == null ? '' : hex).trim();
  if (!/^[0-9a-f]{64}$/.test(h)) return false;
  if (PLACEHOLDER_RE.test(h)) return false; // 64 zeros etc. — defensive
  return true;
}
export function isPlaceholderDigest(hex) {
  const h = String(hex == null ? '' : hex).trim().toLowerCase();
  if (PLACEHOLDER_RE.test(h)) return true;
  if (/^0{8,}$/.test(h)) return true;
  if (/^x{8,}$/.test(h)) return true;
  return false;
}

// E2 / M21 — restatement window: N consecutive verbatim tokens from a single
// upstream cell pasted into a comment is a restatement. Default 6.
export const RESTATEMENT_WINDOW_N = 6;

// Tokenise a string into lowercase word tokens (alnum + underscore runs kept as
// units so snake_case tokens survive). Whole-word blocklist matching (M20).
export function wordTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9_]+/g) || [];
}

// Tokenise into PLAIN alnum word tokens (underscore is a separator). Whole-word
// identifier scans (forbidden synonyms, M20).
export function plainTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Consecutive raw tokens preserving case (for the restatement scan, M21).
export function rawTokens(s) {
  return (s || '').match(/\S+/g) || [];
}

// snake_case transform of an upstream name (the pinned mapping for the supersedes
// table-name + entity name): split CamelCase/spaces into lowercase underscore
// tokens. `OrderStatus` → `order_status`; `Order` → `order`. Consumed by the
// gate/lifecycle entity enumeration (M8) and supersedes resolution (M5).
export function toSnake(name) {
  return String(name == null ? '' : name)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .trim()
    .replace(/[\s\-./]+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

// Strip a trailing `Status` (any case) from a `<Name>Status` enum name to recover
// the entity stem. `OrderStatus` → `Order`; `order_status` → `order`. Consumed by
// the lifecycle-entity ↔ enum binding (M8/M11).
export function statusEnumStem(enumName) {
  return String(enumName == null ? '' : enumName).replace(/_?status$/i, '');
}
