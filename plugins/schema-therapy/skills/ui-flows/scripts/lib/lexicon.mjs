// lexicon.mjs — the CLOSED, vendored lexicons + helpers for the ui-flows (09) oracle
// (simulation.md §1 "Closed lexicons"). Extended ONLY by a committed edit to this file,
// never ad hoc at runtime. Each export cites the check(s) that consume it.
//
// The pinned closed sets: the six IFML-XMI-subset element names, the `ViewComponent type`
// set {list,details,form}, the `Event type` set {submit,select,navigate}, the KLM alphabet
// {K,P,H,B,BB,M,W} + the nK multiplier form, NAV_HOP_COST = BB = 1 token, the snake_case
// validator, the greedy klm tokenizer (BB-before-B; nK only before K), and the MM type→class
// map (Theme-A table, from ifml-moddle.schema.json + IFML-Metamodel.xmi so reader and
// metamodel agree by construction). The klm cost arithmetic is a BYTE-FAITHFUL copy of the
// 08 task-models lexicon (the OWNER of the budget unit): cost = TOKEN count, BB = ONE token.
// 08 single-owns the per-job efficiency budget (KLM operator-token count); 09 measures its
// flows in the SAME unit so an 08 budget and a 09 flow cost are directly comparable. Copied
// scaffold from the sibling task-models lexicon, re-pinned to the 09 dialect.

// --- the pinned IFML-XMI-subset element set (Theme A) ----------------------
export const ELEMENTS = new Set([
  'IFMLModel', 'Realizes', 'ViewContainer', 'ViewComponent', 'Event', 'NavigationFlow',
]);

// MM type→class map (the Theme-A canonical table, grounded in IFML-Metamodel.xmi /
// ifml-moddle.schema.json). Reader closed-lexicons are checked against this by construction.
export const COMPONENT_TYPES = new Set(['list', 'details', 'form']); // List / Details / Form
export const EVENT_TYPES = new Set(['submit', 'select', 'navigate']); // OnSubmit/OnSelect/Jump
export const MM_CLASS = {
  list: 'List', details: 'Details', form: 'Form',
  submit: 'OnSubmitEvent', select: 'OnSelectEvent', navigate: 'JumpEvent',
};

// --- KLM alphabet (pinned, shared with 08) ---------------------------------
export const KLM_TOKENS = new Set(['K', 'P', 'B', 'BB', 'H', 'M', 'W']);

// NAV_HOP_COST — a navigation hop between containers is one button CLICK (down+up), realized
// as the single `BB` operator (Card/Moran/Newell click convention, as restated in Kieras'
// Using GOMS). In the 08-owned budget UNIT a `klm` string is counted in OPERATOR TOKENS and
// `BB` is ONE token (a full click), so a nav hop costs `BB` = 1 token — the SAME unit the 08
// budget is denominated in, so a 09 flow cost is comparable to an 08 budget. First/home
// container is free; each subsequent hop is charged one `BB` token. Consumed by W-COST / C-c.
export const NAV_HOP_COST = 1;

// --- snake_case validator (A-f / E-a / M-CID / M-SNAKE) --------------------
export const SNAKE_RE = /^[a-z][a-z0-9_]*$/;
export function isSnake(s) {
  return SNAKE_RE.test(String(s == null ? '' : s));
}

// --- the snake() slug transform (A-c slug = snake(persona) = filename stem) -
// lowercase(s).replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'_').
export function snake(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_');
}

// --- the greedy klm tokenizer (M-KLM; walker W-COST) -----------------------
// Greedy: `BB` before `B`; an integer multiplier is legal only immediately before `K`.
// Returns { ok, tokens:[{tok, mult}], detail }. `ok:false` ⇒ off-alphabet token / illegal
// multiplier (M-KLM/C-b reject).
export function tokenizeKlm(s) {
  const str = String(s == null ? '' : s);
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) return { ok: false, tokens, detail: `whitespace in klm string '${str}'` };
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
    if (str.startsWith('BB', i)) { tokens.push({ tok: 'BB', mult: 1 }); i += 2; continue; }
    if (KLM_TOKENS.has(ch) && ch !== 'BB') { tokens.push({ tok: ch, mult: 1 }); i += 1; continue; }
    return { ok: false, tokens, detail: `off-alphabet token '${ch}' in klm string '${str}'` };
  }
  if (tokens.length === 0) return { ok: false, tokens, detail: 'empty klm string' };
  return { ok: true, tokens, detail: '' };
}

// Total KLM operator-TOKEN count of a klm string (W-COST arithmetic) — BYTE-FAITHFUL to the
// 08 task-models owner: `BB`=1 token (the full click is ONE operator), `4K`=4, `W`=1, each of
// K/P/B/H/M=1. (count("MPBB") = 1 M + 1 P + 1 BB = 3 TOKENS, per validation-rules.md; and
// NAV_HOP_COST = BB = 1 token.) The greedy tokenizer keeps `BB` ONE token; its weight here is
// likewise 1, so 09 budget arithmetic matches the 08 budget unit EXACTLY (08 single-owns the
// unit; this is its byte-faithful copy).
export function klmInstanceCount(s) {
  const t = tokenizeKlm(s);
  if (!t.ok) return { ok: false, count: 0, detail: t.detail };
  let count = 0;
  for (const { mult } of t.tokens) count += mult;
  return { ok: true, count, detail: '' };
}

// M-placement profile (M-KLM C-b): leading-M + M-count. Exactly one leading `M` per
// interaction/user Event, zero on system steps. Uses the tokenizer so `BB` is never
// mis-read as two `B`s.
export function mProfile(s) {
  const t = tokenizeKlm(s);
  if (!t.ok) return { ok: false, mCount: 0, leadingM: false };
  let mCount = 0;
  for (const { tok } of t.tokens) if (tok === 'M') mCount++;
  return { ok: true, mCount, leadingM: t.tokens.length > 0 && t.tokens[0].tok === 'M' };
}

// --- 64-hex digest validator (A-b / M-FP / R-FP) — rejects placeholders ----
const PLACEHOLDER_RE = /^(0+|x+|<hex>|<sha256>|sha256|placeholder|todo)$/i;
export function isValidDigest(hex) {
  const h = String(hex == null ? '' : hex).trim();
  if (!/^[0-9a-f]{64}$/.test(h)) return false;
  if (PLACEHOLDER_RE.test(h)) return false;
  return true;
}

// 08 leaf categories that impose a screen/Event obligation (B-a). `system` leaves carry no
// obligation (B-b ℹ️); `abstract` is never a leaf.
export const INTERACTION_LEAF_CATEGORIES = new Set(['interaction', 'user']);
