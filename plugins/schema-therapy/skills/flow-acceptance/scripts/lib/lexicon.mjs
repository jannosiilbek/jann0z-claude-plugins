// lexicon.mjs — the pinned closed lexicons (simulation.md §1 "Closed lexicons"). The
// step-grammar matchers (location / interaction / navigation / outcome), the closed 06 tag
// grammar (copied from the 06/08 lexicon), the @task-model: feature-tag shape, the
// snake_case validator, and the UI-mechanics blocklist. Closed and vendored; extended only
// by a committed edit, never ad hoc.

// --- the closed 06 tag grammar (copied from the 06/08 lexicon) --------------
// Five closed classes (@authz: marks 06's negative authorization scenarios).
export const TAG_GRAMMAR = [
  /^@invariant:INV-[A-Za-z][A-Za-z0-9]*-\d+$/,
  /^@transition:[a-z][a-z0-9_]*$/,
  /^@terminal:[a-z][a-z0-9_]*$/,
  /^@policy:[A-Za-z0-9_-]+$/,
  /^@authz:[a-z][a-z0-9_]*$/,
];
export function isLegalTag(token) {
  return TAG_GRAMMAR.some((re) => re.test(token));
}

// --- snake_case (screen / event id shape) -----------------------------------
export const SNAKE = /^[a-z][a-z0-9_]*$/;
export function isSnake(s) { return typeof s === 'string' && SNAKE.test(s); }

// --- the @task-model: feature-tag shape -------------------------------------
// @task-model:<persona>-<job> — the exact 08 stem (snake within each segment, hyphen-joined).
export const TASK_MODEL_TAG = /^@task-model:[a-z][a-z0-9_]*(?:-[a-z][a-z0-9_]*)+$/;

// --- the closed step grammar (the heart) ------------------------------------
// Each matcher returns the captured upstream token(s) or null. The persona name is variable
// (any non-empty run up to the pinned suffix); the harness checks persona consistency (E-a)
// against the 09 persona value separately.
//
//   Location   : Given the <persona> is on the "<screen id>" screen
//   Navigation : Then  the <persona> is taken to the "<screen id>" screen
//   Outcome    : Then  the outcome of "<06 tag>" holds
//   Interaction (quoted-id form, non-domain-affecting):
//                When  the <persona> triggers the "<Event id>" event
//   Interaction (embedded-string form, domain-affecting):
//                When  the <persona> <verb phrase>: "<01-event string>"
//
// The pickle step text has the keyword stripped, so matchers run over the text AFTER the
// keyword. We match the rendered step text (no leading Given/When/Then/And/But).

export const RE_LOCATION = /^the (.+?) is on the "([^"]+)" screen$/;
export const RE_NAVIGATION = /^the (.+?) is taken to the "([^"]+)" screen$/;
export const RE_OUTCOME = /^the outcome of "([^"]+)" holds$/;
export const RE_INTERACTION_QUOTED = /^the (.+?) triggers the "([^"]+)" event$/;
// the embedded-string form: "the <persona> <phrase>: \"<string>\"" — the colon-quote suffix
// is the pinned shape; the embedded string is the LAST quoted run preceding end of line.
export const RE_INTERACTION_EMBEDDED = /^the (.+?) (.+): "([^"]+)"$/;

// Classify a rendered step text into the closed step grammar.
//   → { kind, persona?, screenId?, eventId?, embedded?, tag? }  |  { kind: 'unknown' }
export function classifyStep(keyword, text) {
  const kw = (keyword || '').trim();
  const t = (text || '').trim();
  // Location vs Navigation both name a screen; distinguished by the "is on" vs "is taken to"
  // phrasing AND the keyword role (Given=location, Then=navigation). We classify by text
  // shape primarily; the harness applies the keyword/role gate (M-GWT) separately.
  let m;
  if ((m = RE_LOCATION.exec(t))) return { kind: 'location', persona: m[1], screenId: m[2] };
  if ((m = RE_NAVIGATION.exec(t))) return { kind: 'navigation', persona: m[1], screenId: m[2] };
  if ((m = RE_OUTCOME.exec(t))) return { kind: 'outcome', tag: m[1] };
  if ((m = RE_INTERACTION_QUOTED.exec(t))) return { kind: 'interaction', form: 'quoted', persona: m[1], eventId: m[2] };
  if ((m = RE_INTERACTION_EMBEDDED.exec(t))) return { kind: 'interaction', form: 'embedded', persona: m[1], embedded: m[3] };
  return { kind: 'unknown', persona: extractPersona(t) };
}

// best-effort persona extraction for unknown steps ("the X …") for M-PERSONA reporting.
function extractPersona(t) {
  const m = /^the (.+?) (?:is|triggers|opens|starts|dispatches|cancels|picks|submits|selects|enters|confirms|completes|finishes|reviews|adds|removes|sets|clicks|presses|types|fills|visits)\b/.exec(t);
  return m ? m[1] : null;
}

// --- UI-mechanics blocklist (B-f / D-a) -------------------------------------
// Imperative widget/URL/CSS/pixel tokens that signal "testing through the UI". Matched as
// whole words (case-insensitive) outside masked verbatim 09 01-event spans.
export const UI_MECHANICS = [
  'click', 'clicks', 'clicking',
  'press', 'presses', 'pressing',
  'type', 'types', 'typing',
  'fill', 'fills', 'filling',
  'visit', 'visits', 'visiting',
  'button', 'buttons', 'checkbox', 'dropdown', 'textbox',
  'css', 'selector', 'xpath', 'pixel', 'px',
];
export const UI_MECHANICS_RE = new RegExp(
  '\\b(' + UI_MECHANICS.join('|') + ')\\b', 'i'
);
// URLs / CSS-path-ish / pixel coordinates.
export const URL_RE = /\bhttps?:\/\/|(?:^|\s)\/[a-z0-9_\-\/]+/i;
export const CSS_RE = /[#.][a-zA-Z][\w-]*\s*(?:>|\{)|\[[a-z-]+=/;

// --- personal-pronoun blocklist (E-a) ---------------------------------------
export const PRONOUN_RE = /\b(I|me|my|we|us|our)\b/;

// --- tokenization for the DRY shape-lint (M-NO06BODY) -----------------------
export function plainTokens(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/["'`]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
export const RESTATEMENT_WINDOW_N = 6;
