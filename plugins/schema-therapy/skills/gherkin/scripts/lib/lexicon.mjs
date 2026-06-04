// lexicon.mjs — CLOSED, vendored lexicons + helpers for the gherkin mechanical checks
// (simulation.md §1). Extended ONLY by editing this file in a committed change, never ad
// hoc at runtime. Each export cites the check(s) that consume it.
//
// COPIED scaffold from the sibling statecharts/erd lexicon (snake_case validator /
// wordTokens / plainTokens / rawTokens / digest validator / restatement window), then
// narrowed to the 06-specific PINNED conventions:
//   - the closed TAG GRAMMAR (@invariant: / @transition: / @terminal: / @policy:).
//   - the file-name = snake_case(03 aggregate) mapping (M1/M2/A2).
//   - the Then-block ACTION-VERB BLOCKLIST (M12 / C4).
// The forbidden-synonym list, Term set, enum values, invariant ids, 04 events, and 05
// transition set are NOT vendored — they are read fresh per run from the parsed
// upstreams (upstream-owned data). Copied, never cross-referenced.

// --- the closed source-tag grammar (catalog "Pinned conventions"; A6 / M6 / M7) ----
// Exactly one of these per scenario. Tags carry no whitespace (parser-rejected at M3).
// Hyphen-carrying source names: a 03 invariant id is `INV-<Agg>-<n>` (hyphens load-bearing)
// and a 03 policy name may legally carry hyphens (e.g. `POL-1`). `policyTagRef()` preserves
// hyphens (only whitespace→`_`), so the @policy: character class MUST admit `-` or no tag
// string for a hyphenated policy could both classify (here) AND resolve (policyTagRef). The
// @transition:/@terminal: namespaces are snake_case 04/05 entity stems (no hyphen legal —
// `toSnake` maps `-`→`_`), so they stay [a-z0-9_].
export const TAG_INVARIANT = /^@invariant:(INV-[A-Za-z][A-Za-z0-9]*-\d+)$/;
export const TAG_TRANSITION = /^@transition:([a-z][a-z0-9_]*)$/;
export const TAG_TERMINAL = /^@terminal:([a-z][a-z0-9_]*)$/;
export const TAG_POLICY = /^@policy:([A-Za-z0-9_-]+)$/;

// Classify a tag string into {kind, ref} or null if not a source tag. `kind` ∈
// {invariant, transition, terminal, policy}.
export function classifyTag(name) {
  let m;
  if ((m = TAG_INVARIANT.exec(name))) return { kind: 'invariant', ref: m[1] };
  if ((m = TAG_TRANSITION.exec(name))) return { kind: 'transition', ref: m[1] };
  if ((m = TAG_TERMINAL.exec(name))) return { kind: 'terminal', ref: m[1] };
  if ((m = TAG_POLICY.exec(name))) return { kind: 'policy', ref: m[1] };
  return null;
}

// snake_case validator (file stems, entity tags). lowercase, starts with a letter,
// only [a-z0-9_]. (A2 / M2)
export function isSnakeCase(value) {
  return /^[a-z][a-z0-9_]*$/.test(value || '');
}

// snake_case transform of an upstream aggregate/entity name (PINNED file-name mapping):
// `Order` → `order`; `PurchaseOrder` → `purchase_order`. (M1 / M2 / A2)
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

// Policy-name → tag-ref transform: whitespace → `_` (catalog A6, `@policy:<Name>`).
export function policyTagRef(name) {
  return String(name == null ? '' : name).trim().replace(/\s+/g, '_');
}

// 64-hex digest validator (A4 / M5). Rejects placeholder digests.
const PLACEHOLDER_RE = /^(0+|x+|<hex>|<sha256>|sha256|placeholder|todo)$/i;
export function isValidDigest(hex) {
  const h = String(hex == null ? '' : hex).trim();
  if (!/^[0-9a-f]{64}$/.test(h)) return false;
  if (PLACEHOLDER_RE.test(h)) return false;
  return true;
}
export function isPlaceholderDigest(hex) {
  const h = String(hex == null ? '' : hex).trim().toLowerCase();
  if (PLACEHOLDER_RE.test(h)) return true;
  if (/^0{8,}$/.test(h)) return true;
  if (/^x{8,}$/.test(h)) return true;
  return false;
}

// --- the Then-block ACTION-VERB BLOCKLIST (catalog C4 / M12) ----------------
// A `Then`-block step (the Outcome step + its trailing Conjunction steps) performing an
// action — UI mechanics or a domain action verb drawn from the 04 event verbs — is a
// fail. Whole-word match. Closed; extended only by a committed edit here.
export const ACTION_VERBS = new Set([
  // UI mechanics (C1 imperative-coupling, the obvious arm)
  'click', 'clicks', 'press', 'presses', 'type', 'types', 'enter', 'enters',
  'submit', 'submits', 'visit', 'visits', 'navigate', 'tap', 'taps', 'fill', 'fills',
  // domain action verbs (the 04 event verbs)
  'place', 'places', 'cancel', 'cancels', 'pay', 'pays', 'ship', 'ships',
  'create', 'creates', 'delete', 'deletes', 'add', 'adds', 'remove', 'removes',
  'send', 'sends', 'issue', 'issues', 'redeem', 'redeems', 'refund', 'refunds',
  'deliver', 'delivers', 'expire', 'expires', 'schedule', 'schedules',
]);

export function hasActionVerb(text) {
  for (const tok of plainTokens(text)) {
    if (ACTION_VERBS.has(tok)) return tok;
  }
  return null;
}

// E1/E2/E3 / M19–M21 — restatement window: N consecutive verbatim tokens from a single
// upstream cell pasted into a step/comment is a restatement. Default 6.
export const RESTATEMENT_WINDOW_N = 6;

// Tokenise into lowercase word tokens (alnum + underscore runs kept as units so
// snake_case tokens survive). (M17 sub-scan, restatement)
export function wordTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9_]+/g) || [];
}

// Tokenise into PLAIN alnum word tokens (underscore is a separator). Whole-word
// identifier scans (forbidden synonyms M17, action verbs M12).
export function plainTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Consecutive raw tokens preserving case (restatement scan, M19/M21).
export function rawTokens(s) {
  return (s || '').match(/\S+/g) || [];
}

// The enum-value SHAPE detector (D5 / M15): a token that looks like a status enum value
// (the 02 `### <Aggregate>Status` `Value` form — a single TitleCase or lowercase word,
// no spaces). Used to decide which Given/Then tokens MUST resolve to a 02 enum value.
// We treat the actual 02 value set as the source of truth and only flag a token that
// matches the SHAPE of one of an aggregate's values but is not in the set.
export function enumValueShape(token) {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(token);
}
