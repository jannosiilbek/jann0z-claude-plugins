// contextmap.mjs — the vendored S5 parser for anamnesis/context-map.md plus the G5 (E3–E5,
// S-*) owner checks. The seam it owns: context slugs and concept→context assignment.
//
// S5 closed format:
//   # Context Map — <project>
//   ## Contexts
//   ### ordering
//   - order
//   - payment
//   ### catalog
//   - event
// Context slugs ^[a-z][a-z0-9_]*$; each concept listed exactly once across all contexts; when
// the map exists, every ledger concept must be mapped (S-MAP). Map absent ⇒ one implicit
// context (slug '-') containing every concept, rendering domain.md. Map present with exactly 1
// context ⇒ also domain.md. Map with >1 ⇒ one domain.<slug>.md per context.

import { rec } from './checks.mjs';
import { isLocked } from './ledger.mjs';

const SLUG_RE = /^[a-z][a-z0-9_]*$/;

// parse(text|null) → { present, contexts:[{slug,concepts:[…]}], conceptToContext:Map }
// present=false ⇒ implicit single context '-'.
export function parse(text) {
  if (text == null) return { present: false, contexts: [], conceptToContext: new Map() };
  const lines = text.split(/\r?\n/);
  const contexts = [];
  let current = null;
  for (const raw of lines) {
    const l = raw.trim();
    const h3 = l.match(/^###\s+(.+)$/);
    if (h3) { current = { slug: h3[1].trim(), concepts: [] }; contexts.push(current); continue; }
    const li = l.match(/^-\s+(.+)$/);
    if (li && current) current.concepts.push(li[1].trim());
  }
  const conceptToContext = new Map();
  for (const ctx of contexts) for (const c of ctx.concepts) if (!conceptToContext.has(c)) conceptToContext.set(c, ctx.slug);
  return { present: true, contexts, conceptToContext };
}

// Resolve the set of contexts to render/scope. Returns [{slug, concepts:Set}].
// Absent map OR exactly-1-context map ⇒ a single context (slug '-' when absent, else the slug).
export function contextsOf(map, allConcepts) {
  if (!map.present) return [{ slug: '-', concepts: new Set(allConcepts) }];
  return map.contexts.map((ctx) => ({ slug: ctx.slug, concepts: new Set(ctx.concepts) }));
}

// Concepts of a given context slug (for scoping a handoff/render). '-' ⇒ every concept.
export function conceptsForContext(map, slug, allConcepts) {
  if (!map.present || slug === '-') return new Set(allConcepts);
  const ctx = map.contexts.find((c) => c.slug === slug);
  return new Set(ctx ? ctx.concepts : []);
}

// Whether a context slug is required (map has >1 context).
export const multiContext = (map) => map.present && map.contexts.length > 1;

// ---------------------------------------------------------------------------
// G5 — handoff readiness (E3–E5). Scoped to the handoff context.
// ---------------------------------------------------------------------------

// S-UNCONF (E3) — the handoff context contains zero unconfirmed claims (deferred passes).
export function sUnconf(claims, conceptSet) {
  const bad = claims
    .filter((c) => conceptSet.has(c.concept) && c.status === 'unconfirmed' && !isLocked(c))
    .map((c) => c.id);
  // contradiction-locked unconfirmed claims are S-LOCK's; pure unconfirmed are S-UNCONF's.
  return bad.length ? rec('S-UNCONF', 'mechanical', 'E3', 'g5', 'fail', `context contains unconfirmed claim(s): ${bad.join(', ')}`) : rec('S-UNCONF', 'mechanical', 'E3', 'g5', 'pass');
}

// S-LOCK (E4) — the handoff context contains zero contradiction-locked claims.
export function sLock(claims, conceptSet) {
  const bad = claims.filter((c) => conceptSet.has(c.concept) && isLocked(c)).map((c) => c.id);
  return bad.length ? rec('S-LOCK', 'mechanical', 'E4', 'g5', 'fail', `context contains contradiction-locked claim(s): ${bad.join(', ')}`) : rec('S-LOCK', 'mechanical', 'E4', 'g5', 'pass');
}

// S-MAP (E5) — slugs valid; each concept listed exactly once across contexts; every ledger
// concept mapped when the map exists.
export function sMap(map, allConcepts) {
  if (!map.present) return rec('S-MAP', 'mechanical', 'E5', 'g5', 'pass'); // implicit single context is sound by construction
  const bad = [];
  const counts = new Map();
  for (const ctx of map.contexts) {
    if (!SLUG_RE.test(ctx.slug)) bad.push(`context slug '${ctx.slug}' violates ^[a-z][a-z0-9_]*$`);
    for (const c of ctx.concepts) counts.set(c, (counts.get(c) || 0) + 1);
  }
  for (const [c, n] of counts) if (n > 1) bad.push(`concept '${c}' listed in ${n} contexts (must be exactly one)`);
  const mapped = new Set(counts.keys());
  for (const c of new Set(allConcepts)) if (!mapped.has(c)) bad.push(`ledger concept '${c}' is absent from the context map`);
  return bad.length ? rec('S-MAP', 'mechanical', 'E5', 'g5', 'fail', bad.join('; ')) : rec('S-MAP', 'mechanical', 'E5', 'g5', 'pass');
}
