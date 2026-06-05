// lexicon.mjs — CLOSED, vendored lexicons + helpers for the task-models mechanical
// checks + walker (simulation.md §1). Extended ONLY by editing this file in a committed
// change, never ad hoc at runtime. Each export cites the check(s) that consume it.
//
// The pinned closed sets (the 4 categories, the 9 operator names, the 7 KLM tokens), the
// snake_case slug transform (A4 filename/id slug), the closed 06 tag regexes (E5), the
// greedy klm tokenizer (BB-before-B, nK-only-before-K), and the Gherkin-keyword set (F1).
// Copied scaffold from the sibling statecharts/personas lexicons, re-pinned to 08.

// --- pinned closed sets ----------------------------------------------------
export const CATEGORIES = new Set(['abstract', 'user', 'interaction', 'system']);
export const LEAF_CATEGORIES = new Set(['interaction', 'system', 'user']);

// The 9 W3C-Note N-ary temporal operator names (lower-camel surface vocabulary).
export const OPERATORS = new Set([
  'enabling', 'sequentialEnablingInfo', 'choice', 'interleaving',
  'synchronization', 'parallelism', 'orderIndependence', 'disabling', 'suspendResume',
]);

// Nominal-path contribution per operator (simulation.md §3.3 table):
//   'all'   — every child executes on the nominal path
//   'first' — only the first document-order child (choice)
//   'left'  — only the left (primary) child (disabling, suspendResume)
export const NOMINAL_CONTRIB = {
  enabling: 'all',
  sequentialEnablingInfo: 'all',
  interleaving: 'all',
  synchronization: 'all',
  parallelism: 'all',
  orderIndependence: 'all',
  choice: 'first',
  disabling: 'left',
  suspendResume: 'left',
};

// The 7 KLM tokens (spec-level subset of the Kieras table). `BB` is one token.
export const KLM_TOKENS = new Set(['K', 'P', 'B', 'BB', 'H', 'M', 'W']);

// The legal <Task> attribute set (A8 / M8).
export const TASK_ATTRS = new Set(['id', 'category', 'operator', 'scenario-tags', 'klm', 'iterative', 'optional']);

// The legal element set (A8 / M8).
export const ELEMENTS = new Set(['TaskModel', 'Budget', 'Task']);

// --- the closed 06 tag grammar (E5 / M22) ----------------------------------
// Five closed classes. A token must match exactly one. (@authz: marks 06's negative
// authorization scenarios — legal in 06, but a rejection path, so an 08 leaf normally
// references the positive-tag scenarios.)
export const TAG_REGEXES = [
  /^@invariant:INV-[A-Za-z][A-Za-z0-9]*-\d+$/,
  /^@transition:[a-z][a-z0-9_]*$/,
  /^@terminal:[a-z][a-z0-9_]*$/,
  /^@policy:[A-Za-z0-9_-]+$/,
  /^@authz:[a-z][a-z0-9_]*$/,
];
export function isLegalTag(token) {
  return TAG_REGEXES.some((re) => re.test(token));
}

// --- the snake_case slug transform (A4 filename/id slug) --------------------
// lowercase(s).replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'_') — per simulation.md §1.
export function snake(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_');
}

// The canonical persona-job slug (A4): `<snake(persona)>-<snake(job)>`.
export function slug(persona, job) {
  return `${snake(persona)}-${snake(job)}`;
}

// --- the greedy klm tokenizer (M17/M20; walker W-BUDGET) -------------------
// Greedy: `BB` before `B`; an integer multiplier is allowed only immediately before `K`.
// Returns { ok, tokens:[{tok, mult}], detail }.
//   tok  — one of K,P,B,BB,H,M,W
//   mult — instance count this token expands to (nK ⇒ n; everything else ⇒ 1)
// `ok:false` ⇒ an off-alphabet token / illegal multiplier (M17/M20 reject).
export function tokenizeKlm(s) {
  const str = String(s == null ? '' : s);
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) { return { ok: false, tokens, detail: `whitespace in klm string '${str}'` }; }
    // integer multiplier — only legal immediately before a `K`.
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < str.length && /[0-9]/.test(str[j])) j++;
      const num = str.slice(i, j);
      const mult = parseInt(num, 10);
      if (str[j] !== 'K') {
        return { ok: false, tokens, detail: `multiplier '${num}' must immediately precede 'K' (got '${str[j] || 'end'}') in '${str}'` };
      }
      if (!(mult > 0)) {
        return { ok: false, tokens, detail: `multiplier '${num}' on 'K' must be a positive integer in '${str}'` };
      }
      tokens.push({ tok: 'K', mult });
      i = j + 1;
      continue;
    }
    // greedy two-letter BB before single B.
    if (str.startsWith('BB', i)) { tokens.push({ tok: 'BB', mult: 1 }); i += 2; continue; }
    if (KLM_TOKENS.has(ch) && ch !== 'BB') {
      tokens.push({ tok: ch, mult: 1 });
      i += 1;
      continue;
    }
    return { ok: false, tokens, detail: `off-alphabet token '${ch}' in klm string '${str}'` };
  }
  if (tokens.length === 0) return { ok: false, tokens, detail: 'empty klm string' };
  return { ok: true, tokens, detail: '' };
}

// Total KLM operator-instance count of a klm string (W-BUDGET arithmetic).
// `BB`=1, `4K`=4, `W`=1, each of K/P/B/H/M=1.
export function klmInstanceCount(s) {
  const t = tokenizeKlm(s);
  if (!t.ok) return { ok: false, count: 0, detail: t.detail };
  let count = 0;
  for (const { mult } of t.tokens) count += mult;
  return { ok: true, count, detail: '' };
}

// Count distinct `M` tokens in a klm string (M19 M-placement) and whether the FIRST
// token is `M`. Returns { mCount, leadingM }. Uses the tokenizer so `BB` is not
// mis-read as two `B`s (no `M` confusion, but keeps the alphabet honest).
export function mProfile(s) {
  const t = tokenizeKlm(s);
  if (!t.ok) return { ok: false, mCount: 0, leadingM: false };
  let mCount = 0;
  for (const { tok } of t.tokens) if (tok === 'M') mCount++;
  return { ok: true, mCount, leadingM: t.tokens.length > 0 && t.tokens[0].tok === 'M' };
}

// --- the Gherkin keyword set (F1 / M23 restated-text scan) ------------------
export const GHERKIN_KEYWORDS = new Set([
  'Given', 'When', 'Then', 'And', 'But', 'Scenario', 'Feature', 'Background', 'Examples',
]);
// True if a string contains a Gherkin step/keyword LINE (whole-word, line-leading).
export function hasGherkinKeyword(s) {
  if (!s) return false;
  for (const raw of String(s).split(/\r?\n/)) {
    const m = /^\s*([A-Z][a-z]+)\b/.exec(raw.trim());
    if (m && GHERKIN_KEYWORDS.has(m[1])) return true;
  }
  return false;
}

// 64-hex digest validator (A2 / M2) — rejects placeholder digests.
const PLACEHOLDER_RE = /^(0+|x+|<hex>|<sha256>|sha256|placeholder|todo)$/i;
export function isValidDigest(hex) {
  const h = String(hex == null ? '' : hex).trim();
  if (!/^[0-9a-f]{64}$/.test(h)) return false;
  if (PLACEHOLDER_RE.test(h)) return false;
  return true;
}

// kebab-case label validator (F3 / M28) — short action label, no sentence/step prose.
export function isKebabLabel(s) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || '');
}
