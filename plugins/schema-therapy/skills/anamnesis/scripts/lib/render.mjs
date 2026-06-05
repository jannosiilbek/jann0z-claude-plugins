// render.mjs — the S6 deterministic ledger→domain compiler (the STRONGEST oracle) plus the G4
// (theme-F, R-*) owner checks. The renderer is mechanical and lives IN the harness: that is
// what makes "deterministic ledger → domain file" and the byte-identical double-render
// checkable. At G4 the harness re-renders the ledger in memory for the handoff context and
// byte-compares against the on-disk file — it NEVER trusts the declared render.
//
// S6 output (byte-exact): a `# Domain — <slug|project>` heading; a provenance comment carrying
// sha256 over the EXACT ledger bytes; then the fixed section order Actors, Domain events,
// Lifecycles, Rules, Terms, Relations, Open questions. Empty sections omitted entirely. Body
// renders confirmed claims of the context (statement verbatim + ` [CLM-nnnn]`). Open questions
// renders deferred + contradiction-locked claims. accident NEVER renders; unconfirmed (unlocked)
// never renders.

import { createHash } from 'node:crypto';
import { rec } from './checks.mjs';
import { isLocked } from './ledger.mjs';

const byId = (a, b) => a.id.localeCompare(b.id, 'en');

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

// render(ledgerBytes, claims, slug, projectName, conceptSet) → string (the exact S6 bytes).
// `ledgerBytes` is the exact on-disk ledger content; the sha is computed over it. `slug` is the
// context slug ('-' for the implicit single context). `conceptSet` scopes which claims belong.
export function render(ledgerBytes, claims, slug, projectName, conceptSet) {
  const heading = slug === '-' ? projectName : slug;
  const sha = sha256(ledgerBytes);
  const inCtx = claims.filter((c) => conceptSet.has(c.concept));

  const confirmed = inCtx.filter((c) => c.status === 'confirmed');
  const openQ = inCtx.filter((c) => c.status === 'deferred' || isLocked(c));

  const bullet = (c) => `- ${c.statement} [${c.id}]`;
  const sectionsOut = [];

  const simpleSection = (title, kinds) => {
    const items = confirmed.filter((c) => kinds.includes(c.kind)).sort(byId);
    if (items.length === 0) return;
    sectionsOut.push(`## ${title}\n\n${items.map(bullet).join('\n')}`);
  };

  simpleSection('Actors', ['actor']);
  simpleSection('Domain events', ['event']);

  // Lifecycles — grouped by concept (### <concept>), concepts sorted ascending, claims by id.
  const lifecycle = confirmed.filter((c) => c.kind === 'state' || c.kind === 'transition');
  if (lifecycle.length) {
    const byConcept = new Map();
    for (const c of lifecycle) { if (!byConcept.has(c.concept)) byConcept.set(c.concept, []); byConcept.get(c.concept).push(c); }
    const blocks = [...byConcept.keys()].sort((a, b) => a.localeCompare(b, 'en')).map((concept) => {
      const items = byConcept.get(concept).sort(byId);
      return `### ${concept}\n\n${items.map(bullet).join('\n')}`;
    });
    sectionsOut.push(`## Lifecycles\n\n${blocks.join('\n\n')}`);
  }

  simpleSection('Rules', ['rule']);
  simpleSection('Terms', ['term']);
  simpleSection('Relations', ['relation']);

  if (openQ.length) {
    const items = openQ.slice().sort(byId);
    sectionsOut.push(`## Open questions\n\n${items.map(bullet).join('\n')}`);
  }

  const header = `# Domain — ${heading}\n\n<!-- anamnesis: rendered from ledger.jsonl@sha256:${sha}; context: ${slug} — regenerate via the anamnesis harness render mode; do not hand-edit -->`;
  const body = sectionsOut.length ? '\n\n' + sectionsOut.join('\n\n') : '';
  return header + body + '\n';
}

// renderStats — the counts recorded in renders[].
export function renderStats(claims, slug, conceptSet) {
  const inCtx = claims.filter((c) => conceptSet.has(c.concept));
  return {
    claims: inCtx.filter((c) => c.status === 'confirmed').length,
    openQuestions: inCtx.filter((c) => c.status === 'deferred' || isLocked(c)).length,
  };
}

// The domain filename for a context (S5): implicit single ('-') / single-context ⇒ domain.md;
// else domain.<slug>.md.
export function domainFileName(slug, multi) {
  return multi ? `domain.${slug}.md` : 'domain.md';
}

const ANNOT_RE = /\[(CLM-\d{4,})\]/g;

// ---------------------------------------------------------------------------
// G4 owner checks (theme F). `onDisk` is the actual file bytes (or null if absent). `expected`
// is the in-memory S6 re-render. The harness passes both so R-DET byte-compares.
// ---------------------------------------------------------------------------

function annotationsIn(text) {
  const out = [];
  let m;
  ANNOT_RE.lastIndex = 0;
  while ((m = ANNOT_RE.exec(text)) !== null) out.push(m[1]);
  return out;
}
// Section membership: split the file into the body region and the Open-questions region.
function splitBodyOpen(text) {
  const idx = text.indexOf('\n## Open questions');
  if (idx === -1) return { body: text, open: '' };
  return { body: text.slice(0, idx), open: text.slice(idx) };
}

// R-RESOLVE (F1) — every [CLM-nnnn] annotation in the file resolves to a ledger claim id.
export function rResolve(onDisk, byIdMap) {
  if (onDisk == null) return rec('R-RESOLVE', 'resolution', 'F1', 'g4', 'fail', 'domain file is absent');
  const bad = [];
  for (const id of annotationsIn(onDisk)) if (!byIdMap.has(id)) bad.push(id);
  return bad.length ? rec('R-RESOLVE', 'resolution', 'F1', 'g4', 'fail', `annotation(s) resolve to no claim: ${[...new Set(bad)].join(', ')}`) : rec('R-RESOLVE', 'resolution', 'F1', 'g4', 'pass');
}

// R-STATUS (F2) — a body annotation resolves to confirmed; an Open-questions annotation resolves
// to deferred or contradiction-locked.
export function rStatus(onDisk, byIdMap) {
  if (onDisk == null) return rec('R-STATUS', 'mechanical', 'F2', 'g4', 'fail', 'domain file is absent');
  const { body, open } = splitBodyOpen(onDisk);
  const bad = [];
  for (const id of annotationsIn(body)) {
    const c = byIdMap.get(id);
    if (c && c.status !== 'confirmed') bad.push(`body annotation ${id} resolves to '${c.status}' (must be confirmed)`);
  }
  for (const id of annotationsIn(open)) {
    const c = byIdMap.get(id);
    if (c && !(c.status === 'deferred' || isLocked(c))) bad.push(`Open-questions annotation ${id} resolves to '${c.status}' (must be deferred or contradiction-locked)`);
  }
  return bad.length ? rec('R-STATUS', 'mechanical', 'F2', 'g4', 'fail', bad.join('; ')) : rec('R-STATUS', 'mechanical', 'F2', 'g4', 'pass');
}

// R-COV (F3) — every confirmed claim of the rendered context appears (exactly once).
export function rCov(onDisk, claims, conceptSet) {
  if (onDisk == null) return rec('R-COV', 'resolution', 'F3', 'g4', 'fail', 'domain file is absent');
  const present = annotationsIn(onDisk);
  const counts = new Map();
  for (const id of present) counts.set(id, (counts.get(id) || 0) + 1);
  const bad = [];
  for (const c of claims) {
    if (!conceptSet.has(c.concept) || c.status !== 'confirmed') continue;
    const n = counts.get(c.id) || 0;
    if (n === 0) bad.push(`confirmed claim ${c.id} missing from the render`);
    else if (n > 1) bad.push(`confirmed claim ${c.id} appears ${n} times`);
  }
  return bad.length ? rec('R-COV', 'resolution', 'F3', 'g4', 'fail', bad.join('; ')) : rec('R-COV', 'resolution', 'F3', 'g4', 'pass');
}

// R-ACC (F4) — no accident claim id appears; no accident concept token appears in prose unless a
// confirmed claim of the context owns that concept.
export function rAcc(onDisk, claims, conceptSet) {
  if (onDisk == null) return rec('R-ACC', 'mechanical', 'F4', 'g4', 'fail', 'domain file is absent');
  const bad = [];
  const ids = new Set(annotationsIn(onDisk));
  const confirmedConcepts = new Set(claims.filter((c) => conceptSet.has(c.concept) && c.status === 'confirmed').map((c) => c.concept));
  for (const c of claims) {
    if (c.status !== 'accident' || !conceptSet.has(c.concept)) continue;
    if (ids.has(c.id)) bad.push(`accident claim ${c.id} id appears in the render`);
    // concept token leakage: the accident's concept appears as a word, and no confirmed claim owns it.
    if (!confirmedConcepts.has(c.concept)) {
      const re = new RegExp(`(^|[^a-z0-9_])${c.concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9_]|$)`);
      if (re.test(onDisk)) bad.push(`accident concept '${c.concept}' (${c.id}) appears in prose with no confirmed owner`);
    }
  }
  return bad.length ? rec('R-ACC', 'mechanical', 'F4', 'g4', 'fail', bad.join('; ')) : rec('R-ACC', 'mechanical', 'F4', 'g4', 'pass');
}

// R-DET (F5) — the on-disk file bytes EQUAL the harness's in-memory S6 re-render.
export function rDet(onDisk, expected) {
  if (onDisk == null) return rec('R-DET', 'exactValue', 'F5', 'g4', 'fail', 'domain file is absent — nothing to byte-compare');
  if (onDisk === expected) return rec('R-DET', 'exactValue', 'F5', 'g4', 'pass');
  return rec('R-DET', 'exactValue', 'F5', 'g4', 'fail', 'on-disk bytes differ from the in-memory S6 re-render (stale / hand-edited / nondeterministic)');
}

// R-HDR (F6) — the provenance header is present and its sha256 equals the sha over the exact
// ledger bytes.
export function rHdr(onDisk, ledgerBytes) {
  if (onDisk == null) return rec('R-HDR', 'exactValue', 'F6', 'g4', 'fail', 'domain file is absent');
  const m = onDisk.match(/<!-- anamnesis: rendered from ledger\.jsonl@sha256:([0-9a-f]{64}); context: ([^ ]+) —/);
  if (!m) return rec('R-HDR', 'exactValue', 'F6', 'g4', 'fail', 'missing or malformed S6 provenance header');
  const want = sha256(ledgerBytes);
  if (m[1] !== want) return rec('R-HDR', 'exactValue', 'F6', 'g4', 'fail', `provenance sha256 ${m[1]} ≠ sha over ledger bytes ${want}`);
  return rec('R-HDR', 'exactValue', 'F6', 'g4', 'pass');
}

// R-CTX (F7) — the file maps to exactly one context-map entry, contains only that context's
// concepts, and is named per S5.
export function rCtx(onDisk, claims, slug, conceptSet, fileName, multi) {
  if (onDisk == null) return rec('R-CTX', 'mechanical', 'F7', 'g4', 'fail', 'domain file is absent');
  const expectedName = multi ? `domain.${slug}.md` : 'domain.md';
  const bad = [];
  if (fileName !== expectedName) bad.push(`file '${fileName}' should be named '${expectedName}' for context '${slug}'`);
  const ids = new Set(annotationsIn(onDisk));
  for (const c of claims) {
    if (!ids.has(c.id)) continue;
    if (!conceptSet.has(c.concept)) bad.push(`renders claim ${c.id} of concept '${c.concept}' which is not in context '${slug}'`);
  }
  return bad.length ? rec('R-CTX', 'mechanical', 'F7', 'g4', 'fail', bad.join('; ')) : rec('R-CTX', 'mechanical', 'F7', 'g4', 'pass');
}

const SMELL_RES = [
  /\b\w+\.(java|py|js|ts|rb|php|cs|go|sql)\b/,
  /\w+::\w+/,
  /\w+\(\)/,
  /\b(SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,80}\b(FROM|INTO|SET)\b/i,
];

// R-SMELL (F8 ⚠️) — warn-only. A rendered statement matches a code-smell regex.
export function rSmell(claims, conceptSet) {
  const bad = [];
  for (const c of claims) {
    if (!conceptSet.has(c.concept) || c.status !== 'confirmed') continue;
    if (SMELL_RES.some((re) => re.test(c.statement))) bad.push(c.id);
  }
  return bad.length ? rec('R-SMELL', 'mechanical', 'F8', 'g4', 'warn', `code-smell in rendered statement(s): ${bad.join(', ')}`) : rec('R-SMELL', 'mechanical', 'F8', 'g4', 'pass');
}

// R-SIZE (F9 ⚠️) — warn-only. The rendered body has > 120 claims.
export function rSize(claims, conceptSet) {
  const n = claims.filter((c) => conceptSet.has(c.concept) && c.status === 'confirmed').length;
  return n > 120 ? rec('R-SIZE', 'mechanical', 'F9', 'g4', 'warn', `rendered body has ${n} claims (> 120) — this context is telling you it is two contexts`) : rec('R-SIZE', 'mechanical', 'F9', 'g4', 'pass');
}
