// lexicon.mjs — CLOSED, vendored lexicons + helpers for the erd mechanical checks
// (simulation.md §1). Extended ONLY by editing this file in a committed change,
// never ad hoc at runtime. Each export cites the check(s) that consume it.
//
// COPIED scaffold from the sibling aggregates lexicon (wordTokens / plainTokens /
// snake_case validator), then extended with the 04-specific closed lists:
//   - the singular-plural heuristic (B9 / L7)
//   - the PK-type compatibility table (B7 / R-FKTYPE)
//   - the restatement-window N (E1 / L11)
//   - the SQLSTATE constants the engine layer asserts (§3.3).
// Copied, never cross-referenced. The forbidden-synonym list is NOT vendored: it
// is read fresh per run from the parsed 02 (upstream-owned data).

// snake_case validator (catalog B9): lowercase, starts with a letter, only
// [a-z0-9_]. Consumed by L7 (table/column names) and L8 (enum names).
export function isSnakeCase(value) {
  return /^[a-z][a-z0-9_]*$/.test(value || '');
}

// Singular-plural heuristic (catalog B9, "tables singular"). A name is flagged as
// PLURAL when it ends in a bare `s` (not `ss`) and the de-pluralised stem is a
// non-empty token. Deliberately conservative: `status`, `address`, `series` end
// in `ss`/`es`-but-`ies`… are handled by the exceptions set so a legitimate
// singular like `status` is never flagged. Closed and vendored.
const PLURAL_EXCEPTIONS = new Set([
  'status', 'address', 'series', 'species', 'gas', 'bus', 'lens', 'news',
  'process', 'access', 'class', 'business', 'analysis', 'basis', 'campus',
]);
export function looksPlural(name) {
  const n = (name || '').toLowerCase();
  if (PLURAL_EXCEPTIONS.has(n)) return false;
  if (n.endsWith('ss')) return false; // address, class, business
  if (n.endsWith('us')) return false; // status, campus, bonus
  // `...ies` (e.g. `categories`), `...es`, or a bare trailing `s`.
  if (/[a-z]ies$/.test(n)) return true;
  if (/[a-z]s$/.test(n)) return true;
  return false;
}

// PK-type compatibility (catalog B7, R-FKTYPE). An FK column's type must equal the
// referenced PK's type. DBML/Postgres type names are normalised (lower-cased,
// length/precision stripped) before comparison; a small alias map folds the
// integer family so `int`/`integer`/`int4` are interchangeable — the same domain.
const TYPE_ALIASES = new Map([
  ['integer', 'int'],
  ['int4', 'int'],
  ['int8', 'bigint'],
  ['serial', 'int'],
  ['bigserial', 'bigint'],
  ['varchar', 'varchar'],
  ['character varying', 'varchar'],
  ['text', 'text'],
  ['bool', 'boolean'],
]);
export function normalizeType(t) {
  let s = String(t == null ? '' : t).trim().toLowerCase();
  s = s.replace(/\s*\([^)]*\)\s*$/, ''); // strip (n)/(p,s)
  s = s.replace(/"/g, '');
  if (TYPE_ALIASES.has(s)) return TYPE_ALIASES.get(s);
  return s;
}
export function typesCompatible(a, b) {
  return normalizeType(a) === normalizeType(b);
}

// E1 / L11 — restatement window: N consecutive verbatim tokens from a single
// upstream cell in a DBML note or transitions prose is a restatement. Default 6.
export const RESTATEMENT_WINDOW_N = 6;

// SQLSTATE codes the engine layer asserts (simulation.md §3.3). Closed + vendored;
// version-stable across the pinned PGlite 0.5.1 / PostgreSQL 18.3 tree.
export const SQLSTATE = {
  FK_VIOLATION: '23503',       // foreign_key_violation        (E-FK)
  ENUM_INVALID: '22P02',       // invalid_text_representation  (E-ENUM)
  UNIQUE_VIOLATION: '23505',   // unique_violation             (E-PK / E-JUNCTION)
};

// Tokenise a string into lowercase word tokens (alnum + underscore runs kept as
// units so snake_case tokens survive). Whole-word blocklist matching.
export function wordTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9_]+/g) || [];
}

// Tokenise into PLAIN alnum word tokens (underscore is a separator). Whole-word
// identifier scans (forbidden synonyms).
export function plainTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Consecutive-token windows of a string (for the restatement scan). Returns the
// raw tokens preserving case so an exact verbatim window can be compared.
export function rawTokens(s) {
  return (s || '').match(/\S+/g) || [];
}

// snake_case transform of an upstream name (the pinned mapping): split CamelCase /
// spaces / punctuation into lowercase underscore-joined tokens. `WorkOrderStatus`
// → `work_order_status`; `Order` → `order`; `Box Office System` →
// `box_office_system`. Consumed by R-ROOT / R-ENUM / R-NAME (the pinned conventions).
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
