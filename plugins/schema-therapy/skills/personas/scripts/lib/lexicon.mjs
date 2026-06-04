// lexicon.mjs — CLOSED, vendored word lists + matchers + the snake_case
// normalizer for the personas mechanical checks (simulation.md §1). Extended
// ONLY by editing this file in a committed change, never ad hoc at runtime.
// Each export cites the check(s) that consume it.
//
// Copied/re-pinned from the sibling glossary lexicon.mjs (reuse over invention,
// copied never cross-referenced — each skill stays self-contained).

// B1 / L9 — closed SOFTWARE-NOUN blocklist applied to goal text (the substring
// before the first `[impact: …]` token), whole-word, case-insensitive. The
// closed set pinned by simulation.md §1 / L9:
//   { app, application, system, platform, feature, button, screen, page,
//     dashboard, API, endpoint, integration, module, notification, email,
//     report, form, database, portal, widget, function, service, menu, field,
//     tab, modal, workflow }
export const SOFTWARE_NOUN = new Set(
  [
    'app', 'application', 'system', 'platform', 'feature', 'button', 'screen',
    'page', 'dashboard', 'api', 'endpoint', 'integration', 'module',
    'notification', 'email', 'report', 'form', 'database', 'portal', 'widget',
    'function', 'service', 'menu', 'field', 'tab', 'modal', 'workflow',
  ].map((w) => w.toLowerCase())
);

// F5 / L11 — closed VAGUE-FILLER blocklist applied to persona name, goal text,
// and job cells (whole-word, case-insensitive). The closed set pinned by
// simulation.md §1 / L11:
//   { manage, handle, process, stuff, various, etc., things, data, user,
//     someone, general, misc }
export const VAGUE_FILLER = new Set(
  [
    'manage', 'handle', 'process', 'stuff', 'various', 'etc', 'things', 'data',
    'user', 'someone', 'general', 'misc',
  ].map((w) => w.toLowerCase())
);

// Tokenise a string into lowercase word tokens (alnum runs). Used for whole-word
// blocklist matching so "Database" does NOT match a bare "data" and "Dashboard"
// does NOT match a bare "board".
export function wordTokens(s) {
  return (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Whole-word blocklist hit; returns the first offending token or null.
export function blocklistHit(text, blocklist) {
  for (const tok of wordTokens(text)) {
    if (blocklist.has(tok)) return tok;
  }
  return null;
}

// F2 / L10 — PascalCase matcher: a single capitalized token or capitalized
// concatenation, e.g. `FieldTechnician`, `Cynthia`. Pinned `^[A-Z][A-Za-z0-9]*$`.
export function isPascalCase(value) {
  return /^[A-Z][A-Za-z0-9]*$/.test(value || '');
}

// D5 / A7 / X3 — snake_case normalizer for the downstream `<persona>-<job>.xml`
// filename component. Lowercase the token stream and join with `_`. Two names
// that normalize to the same value collide downstream (an ambiguous filename).
//   "reconcile invoice" -> "reconcile_invoice"
//   "Reconcile Invoice" -> "reconcile_invoice"   (collides with the above)
//   "FieldTechnician"   -> "field_technician"    (camel/Pascal split)
export function snake(value) {
  // Split camelCase / PascalCase boundaries, then tokenise on non-alnum.
  const spaced = (value || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return wordTokens(spaced).join('_');
}

// L14 — verbatim-word-window overlap: does `text` contain ≥N consecutive
// verbatim words drawn from `source` (a 00 Description or 01 Responsibility
// cell)? Case-insensitive on the word stream; N defaults to 8 (simulation.md
// L14). Returns the offending window string or null.
export function verbatimWindowHit(text, source, n = 8) {
  const t = wordTokens(text);
  const s = wordTokens(source);
  if (t.length < n || s.length < n) return null;
  const windows = new Set();
  for (let i = 0; i + n <= s.length; i++) {
    windows.add(s.slice(i, i + n).join(' '));
  }
  for (let i = 0; i + n <= t.length; i++) {
    const w = t.slice(i, i + n).join(' ');
    if (windows.has(w)) return w;
  }
  return null;
}
