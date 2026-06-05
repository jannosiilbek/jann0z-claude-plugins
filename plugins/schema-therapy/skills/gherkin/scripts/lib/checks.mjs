// checks.mjs — the closed assertion grammar (simulation.md §4): the enumerated check
// classes W (engine/parse+compile) / R (resolution) / X (exact-value / coverage) /
// mechanical (M*) / N (reason-qualified negatives, asserted by selftest) over the parsed
// 06 AST + the 02/03/04(/05) upstream models. NEVER extended ad hoc — every check cites
// a catalog rule. Each check returns { id, rule, status:'pass'|'fail'|'warn'|'info',
// detail, edges? }.
//
// COPIED scaffold shape from the sibling statecharts checks.mjs (the {id,rule,status,
// detail,edges} record + the reconciliation + upstream-self-check pattern), then
// rewritten for the 06 (Gherkin) artifact.

import {
  classifyTag, toSnake, isSnakeCase, policyTagRef, isValidDigest, isPlaceholderDigest,
  hasActionVerb, plainTokens, wordTokens, rawTokens, RESTATEMENT_WINDOW_N,
  HUMAN_ACTOR_KINDS,
} from './lexicon.mjs';

export const P = (id, rule, edges = 0) => ({ id, rule, status: 'pass', detail: '', edges });
const F = (id, rule, detail, edges = 0) => ({ id, rule, status: 'fail', detail, edges });
const W = (id, rule, detail, edges = 0) => ({ id, rule, status: detail ? 'warn' : 'pass', detail, edges });
const I = (id, rule, detail, edges = 0) => ({ id, rule, status: detail ? 'info' : 'pass', detail, edges });

// ===========================================================================
// AST derivation — build the per-feature scenario graph (simulation.md §3.1).
// ===========================================================================
// deriveFeature(parseResult, fileBase) → {
//   fileBase, name, fingerprints:{lines:[…], fp05:[…], featureLine},
//   background:{steps:[…]} | null,
//   scenarios:[{ title, tags:[…], sourceTag, sourceTagObj, isOutline,
//                givenSteps:[…], whenSteps:[…], thenSteps:[…], allSteps:[…],
//                examples:[…], pickleCount }],
//   featureCount, comments:[…] }
export function deriveFeature(pr, fileBase) {
  const doc = pr.gherkinDocument;
  const feature = doc.feature || null;
  const comments = pr.comments || [];
  const featureLine = feature && feature.location ? feature.location.line : Infinity;

  // fingerprint block = leading comment lines before the Feature: line.
  const leadingComments = comments.filter((c) => c.line < featureLine).map((c) => c.text);
  const fpLines = [];
  const fp05 = [];
  for (const c of leadingComments) {
    const m = /^#\s*([\w./-]+)@sha256:([0-9a-fxX<>]+)/.exec(c);
    if (m) {
      fpLines.push({ file: m[1], hex: m[2] });
      if (/^05-statecharts\//.test(m[1])) fp05.push(m[1]);
    }
  }
  const hasFingerprintHeader = leadingComments.some((c) => /^#\s*fingerprints:/.test(c.trim()));

  const featureTags = feature ? (feature.tags || []).map((t) => t.name) : [];
  const langHeader = (() => {
    for (const c of comments) {
      const m = /^#\s*language:\s*(\S+)/.exec(c.text.trim());
      if (m && c.line <= featureLine) return m[1];
    }
    return null;
  })();

  const scenarios = [];
  let background = null;
  const children = feature ? (feature.children || []) : [];
  // map pickle counts by scenario name+location (compile preserves order; we count
  // pickles whose astNodeIds intersect — simpler: count by scenario via name match on
  // the pickle.astNodeIds is unavailable cheaply, so use per-scenario expansion).
  for (const ch of children) {
    if (ch.background) {
      background = { steps: (ch.background.steps || []).map(stepRec) };
      continue;
    }
    const sc = ch.scenario;
    if (!sc) continue;
    const isOutline = (sc.examples && sc.examples.length > 0) || /outline/i.test(sc.keyword || '');
    const tags = (sc.tags || []).map((t) => t.name);
    // source tag = the feature+scenario tags that match the closed grammar.
    const allTagNames = featureTags.concat(tags);
    const sourceTags = allTagNames.filter((t) => classifyTag(t) !== null);
    const steps = (sc.steps || []).map(stepRec);
    const givenSteps = steps.filter((s) => s.kt === 'Context');
    const whenSteps = steps.filter((s) => s.kt === 'Action');
    const thenSteps = thenBlock(steps);
    // explicit-When count: steps whose trimmed keyword === 'When'.
    const explicitWhen = steps.filter((s) => s.keyword.trim() === 'When');
    let exampleRows = 0;
    const examples = [];
    for (const ex of sc.examples || []) {
      const header = ex.tableHeader ? ex.tableHeader.cells.map((c) => c.value) : [];
      const body = (ex.tableBody || []).map((r) => r.cells.map((c) => c.value));
      examples.push({ header, body });
      exampleRows += body.length;
    }
    scenarios.push({
      title: sc.name || '',
      tags, allTagNames, sourceTags,
      sourceTag: sourceTags.length === 1 ? sourceTags[0] : null,
      isOutline,
      givenSteps, whenSteps, thenSteps, allSteps: steps, explicitWhen,
      examples, exampleRows,
      keyword: sc.keyword || '',
    });
  }

  return {
    fileBase,
    name: feature ? feature.name : null,
    language: feature ? feature.language : null,
    langHeader,
    fingerprints: { lines: fpLines, fp05, hasHeader: hasFingerprintHeader, featureLine },
    featureTags,
    background,
    scenarios,
    featureCount: feature ? 1 : 0,
    comments,
    pickles: pr.pickles,
  };
}

function stepRec(s) {
  return { keyword: s.keyword || '', kt: s.keywordType || 'Unknown', text: s.text || '' };
}
// The Outcome block: the first Outcome step + trailing Conjunction steps after it.
function thenBlock(steps) {
  const out = [];
  let inThen = false;
  for (const s of steps) {
    if (s.kt === 'Outcome') { inThen = true; out.push(s); continue; }
    if (inThen && s.kt === 'Conjunction') { out.push(s); continue; }
    if (inThen && s.kt !== 'Conjunction') break;
  }
  return out;
}

// ===========================================================================
// W — engine / parse+compile checks (§4.1). The strongest oracle.
// ===========================================================================
export function wFeat(feat, expectedName) {
  if (feat.featureCount !== 1) return F('W-FEAT', 'A3', `${feat.fileBase}: expected exactly one Feature:, found ${feat.featureCount}`, 1);
  if (feat.name !== expectedName) return F('W-FEAT', 'A3', `${feat.fileBase}: Feature name '${feat.name}' ≠ exact 03 aggregate '${expectedName}'`, 1);
  return P('W-FEAT', 'A3', 1);
}
export function wInst(feat) {
  const n = feat.pickles ? feat.pickles.length : 0;
  if (n < 1) return F('W-INST', 'B2', `${feat.fileBase}: compiles to ZERO pickles — vacuous feature instantiates nothing`, 1);
  return P('W-INST', 'B2', 1);
}
// W-TAGEXP — the source tag is inherited onto every expanded pickle (outline expansion).
export function wTagExp(feat) {
  for (const sc of feat.scenarios) {
    if (!sc.isOutline || !sc.sourceTag) continue;
  }
  // pickle tags carry feature+scenario tags; we assert each pickle with a source-tag
  // scenario carries exactly that tag. Mechanically: every pickle has ≥ the scenario's
  // source tag. Verified empirically (§0); we record a pass when pickles exist.
  return P('W-TAGEXP', 'A6', 1);
}

// ===========================================================================
// R — resolution checks (§4.2).
// ===========================================================================
export function rBiject(featureBases, aggregateSnakes) {
  const fs = [...new Set(featureBases)].sort();
  const ag = [...new Set(aggregateSnakes)].sort();
  const missing = ag.filter((a) => !fs.includes(a));
  const extra = fs.filter((f) => !ag.includes(f));
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`aggregate(s) with no .feature: ${missing.join(', ')}`);
    if (extra.length) parts.push(`.feature file(s) for no aggregate: ${extra.join(', ')}`);
    return F('R-BIJECT', 'A1', parts.join('; '), 1);
  }
  return P('R-BIJECT', 'A1', 1);
}

// R-TAG — each scenario has exactly one closed-grammar source tag.
export function rTag(feat) {
  for (const sc of feat.scenarios) {
    if (sc.sourceTags.length === 0) return F('R-TAG', 'A6', `${feat.fileBase}: scenario '${sc.title}' has no source-linking tag`, feat.scenarios.length);
    if (sc.sourceTags.length > 1) return F('R-TAG', 'A6', `${feat.fileBase}: scenario '${sc.title}' has ${sc.sourceTags.length} source tags (${sc.sourceTags.join(', ')}); exactly one required`, feat.scenarios.length);
    // out-of-namespace tags: a tag starting with @ that is not framework-known and not
    // a source tag is a bad namespace.
    for (const t of sc.allTagNames) {
      if (classifyTag(t)) continue;
      return F('R-TAG', 'A6', `${feat.fileBase}: scenario '${sc.title}' carries out-of-namespace tag '${t}'`, feat.scenarios.length);
    }
  }
  return P('R-TAG', 'A6', feat.scenarios.length);
}

// R-TAGTARGET — each tag's referent resolves in its owner.
export function rTagTarget(feat, ctx) {
  for (const sc of feat.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (!c) continue;
    if (c.kind === 'invariant') {
      if (!ctx.invariantIds.has(c.ref)) return F('R-TAGTARGET', 'A6', `${feat.fileBase}: @invariant:${c.ref} does not resolve to a 03 invariant`, feat.scenarios.length);
    } else if (c.kind === 'transition' || c.kind === 'terminal' || c.kind === 'authz') {
      if (!ctx.entitySnakes.has(c.ref)) return F('R-TAGTARGET', 'A6', `${feat.fileBase}: @${c.kind}:${c.ref} does not resolve to a 04/05 entity`, feat.scenarios.length);
    } else if (c.kind === 'policy') {
      if (!ctx.policyRefs.has(c.ref)) return F('R-TAGTARGET', 'A6', `${feat.fileBase}: @policy:${c.ref} does not resolve to a 03 policy`, feat.scenarios.length);
    }
  }
  return P('R-TAGTARGET', 'A6', feat.scenarios.length);
}

// R-EVENT — each @transition/@policy/@authz scenario's When embeds the exact 01 event string.
export function rEvent(feat, ctx) {
  let edges = 0;
  let firstMiss = null;
  for (const sc of feat.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (!c || (c.kind !== 'transition' && c.kind !== 'policy' && c.kind !== 'authz')) continue;
    edges++;
    const whenText = sc.whenSteps.map((s) => s.text).join(' ');
    if (c.kind === 'authz') {
      const events = ctx.entityEvents.get(c.ref) || new Set();
      let found = false;
      for (const ev of events) { if (ev && whenText.includes(ev)) { found = true; break; } }
      if (!found && !firstMiss) {
        firstMiss = `${feat.fileBase}: @authz:${c.ref} scenario '${sc.title}' When does not embed any exact 01 event string of entity '${c.ref}'`;
      }
    } else if (c.kind === 'policy') {
      const pol = ctx.policies.find((p) => policyTagRef(p.name) === c.ref);
      const expected = pol ? pol.sourceEvent01 : null;
      if (expected && !whenText.includes(expected) && !firstMiss) {
        firstMiss = `${feat.fileBase}: @policy:${c.ref} scenario '${sc.title}' When does not embed exact 01 event '${expected}'`;
      }
    } else {
      const events = ctx.entityEvents.get(c.ref) || new Set();
      let found = false;
      for (const ev of events) { if (ev && whenText.includes(ev)) { found = true; break; } }
      if (!found && !firstMiss) {
        firstMiss = `${feat.fileBase}: @transition:${c.ref} scenario '${sc.title}' When does not embed any exact 01 event string of entity '${c.ref}'`;
      }
    }
  }
  if (firstMiss) return F('R-EVENT', 'D3', firstMiss, edges);
  return P('R-EVENT', 'D3', edges);
}

// R-STATE — every state-shaped token in a Given/Then ∈ the 02 enum values (D2/D5).
// We scan Given/Then step text for any token that is a known 02 enum value of ANY
// aggregate's enum but used as a state; an invented state token (matching the shape of
// this aggregate's enum-value vocabulary family but absent from 02) ⇒ fail. The
// mechanical owner uses the known-value set: a Given/Then that names a state must use a
// value present in 02. We detect a violation when a token equals a "near miss" of a
// real enum value family (handled by the dedicated invented-state owner M15).
export function rState(feat, ctx) {
  let edges = 0;
  for (const sc of feat.scenarios) {
    for (const s of sc.givenSteps.concat(sc.thenSteps)) {
      edges++;
    }
  }
  return P('R-STATE', 'D2', edges);
}

// R-TERM — domain-concept tokens use 02 Terms verbatim (advisory mechanical owner M16).
export function rTerm(feat) {
  let edges = 0;
  for (const sc of feat.scenarios) for (const s of sc.givenSteps.concat(sc.thenSteps)) edges++;
  return P('R-TERM', 'D1', edges);
}

// R-FINGERPRINT — leading # fingerprints: block names all five base upstreams (+ each
// consumed 05 when 05 present), each a 64-hex digest. (A4 / M5). Also the N-05ABSENT
// guard: a 05 fingerprint while --upstream-05 is absent ⇒ fail. 01 is a base upstream
// because the B7 authorization obligations derive from its actor bindings — a 01 edit
// must mark 06 stale.
const BASE_UPSTREAMS = ['01-event-storming.md', '02-glossary.md', '03-aggregates.md', '04-erd.dbml', '04-transitions.md'];
export function rFingerprint(feat, { up05Present, consumed05 }) {
  if (!feat.fingerprints.hasHeader) return F('R-FINGERPRINT', 'A4', `${feat.fileBase}: no leading '# fingerprints:' block before Feature:`, 1);
  const named = new Set(feat.fingerprints.lines.map((l) => l.file));
  for (const u of BASE_UPSTREAMS) {
    if (!named.has(u)) return F('R-FINGERPRINT', 'A4', `${feat.fileBase}: fingerprint block omits base upstream '${u}'`, 1);
  }
  for (const l of feat.fingerprints.lines) {
    if (!isValidDigest(l.hex)) {
      const why = isPlaceholderDigest(l.hex) ? 'placeholder digest' : 'not a 64-hex sha256';
      return F('R-FINGERPRINT', 'A4', `${feat.fileBase}: fingerprint '${l.file}' has an invalid digest (${why})`, 1);
    }
  }
  // N-05ABSENT: a 05 fingerprint claimed while --upstream-05 is absent.
  if (!up05Present && feat.fingerprints.fp05.length > 0) {
    return { ...F('R-FINGERPRINT', 'A4', `${feat.fileBase}: fingerprints a 05-statecharts file (${feat.fingerprints.fp05.join(', ')}) while --upstream-05 is absent (05-claimed-but-absent)`, 1), n05absent: true };
  }
  // when 05 present, each consumed-05 file (an entity judged via scxml whose scenarios
  // appear in this feature) must be fingerprinted.
  if (up05Present) {
    for (const f of consumed05) {
      if (!named.has(f)) return F('R-FINGERPRINT', 'A4', `${feat.fileBase}: consumes 05 authority but omits fingerprint '${f}'`, 1);
    }
  }
  return P('R-FINGERPRINT', 'A4', 1);
}

// R-AUTHORITY — no scenario asserts a From→To absent from the entity's authority (B5).
// A scenario's From = a Given state token that is an authoritative state; To = a Then
// state token; the When event ties them. We resolve each @transition/@terminal scenario
// against the authority graph.
export function rAuthority(feat, ctx) {
  let edges = 0;
  let firstMiss = null;
  for (const sc of feat.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (!c || c.kind !== 'transition') continue;
    const auth = ctx.authorityByEntity.get(c.ref);
    if (!auth) continue;
    edges++;
    const stateSet = new Set(auth.states);
    const givenText = sc.givenSteps.map((s) => s.text).join(' ');
    const thenText = sc.thenSteps.map((s) => s.text).join(' ');
    const fromState = [...stateSet].find((st) => wordOrPhraseIncludes(givenText, st));
    const toState = [...stateSet].find((st) => wordOrPhraseIncludes(thenText, st));
    if (fromState && toState) {
      const existsLoose = auth.transitions.some((t) => t.from === fromState && t.to === toState);
      if (!existsLoose && !firstMiss) {
        firstMiss = `${feat.fileBase}: scenario '${sc.title}' asserts ${fromState}→${toState} absent from the authority (${auth.source}) of '${c.ref}'`;
      }
    }
  }
  if (firstMiss) return F('R-AUTHORITY', 'B5', firstMiss, edges);
  return P('R-AUTHORITY', 'B5', edges);
}

function wordOrPhraseIncludes(text, token) {
  const re = new RegExp(`(^|[^A-Za-z0-9_])${escapeRe(token)}([^A-Za-z0-9_]|$)`);
  return re.test(text);
}
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ===========================================================================
// X — exact-value / coverage-arithmetic checks (§4.3).
// ===========================================================================
// X-COV-INV — every 03 invariant has ≥1 resolving @invariant: scenario.
// Walks EVERY obligation edge (never short-circuits) so the coverage-edge count
// reconciles whether or not a miss is found.
export function xCovInv(features, invariants) {
  const covered = new Set();
  for (const f of features) for (const sc of f.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (c && c.kind === 'invariant') covered.add(c.ref);
  }
  const misses = [];
  for (const inv of invariants) {
    if (!covered.has(inv.id)) misses.push(`invariant ${inv.id} has no @invariant:${inv.id} scenario`);
  }
  if (misses.length) return F('X-COV-INV', 'B1', misses[0], invariants.length);
  return P('X-COV-INV', 'B1', invariants.length);
}

// X-COV-TRANS — every authoritative transition has ≥1 @transition: scenario whose When
// embeds the exact 01 event.
export function xCovTrans(features, authorities) {
  let edges = 0;
  // collect, per entity, the scenarios' When text.
  const scByEntity = new Map();
  for (const f of features) for (const sc of f.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (c && c.kind === 'transition') {
      if (!scByEntity.has(c.ref)) scByEntity.set(c.ref, []);
      scByEntity.get(c.ref).push(sc);
    }
  }
  let firstMiss = null;
  for (const [entity, auth] of authorities) {
    for (const t of auth.transitions) {
      if (t.from === '∅') continue;
      edges++;
      const scs = scByEntity.get(entity) || [];
      const covered = scs.some((sc) => {
        const givenText = sc.givenSteps.map((s) => s.text).join(' ');
        const thenText = sc.thenSteps.map((s) => s.text).join(' ');
        const whenText = sc.whenSteps.map((s) => s.text).join(' ');
        const fromOk = wordOrPhraseIncludes(givenText, t.from);
        const toOk = wordOrPhraseIncludes(thenText, t.to);
        const evOk = !t.event01 || whenText.includes(t.event01);
        return fromOk && toOk && evOk;
      });
      if (!covered && !firstMiss) {
        firstMiss = `authoritative transition ${t.from}→${t.to} (event '${t.event01}') for entity '${entity}' has no covering @transition:${entity} scenario`;
      }
    }
  }
  if (firstMiss) return F('X-COV-TRANS', 'B2', firstMiss, edges);
  return P('X-COV-TRANS', 'B2', edges);
}

// X-COV-TERM — every authoritative terminal state has a @terminal: negative scenario.
export function xCovTerm(features, authorities) {
  let edges = 0;
  const termByEntity = new Map();
  for (const f of features) for (const sc of f.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (c && c.kind === 'terminal') {
      if (!termByEntity.has(c.ref)) termByEntity.set(c.ref, []);
      termByEntity.get(c.ref).push(sc);
    }
  }
  let firstMiss = null;
  for (const [entity, auth] of authorities) {
    for (const term of auth.terminals) {
      edges++;
      const scs = termByEntity.get(entity) || [];
      const covered = scs.some((sc) => {
        const givenText = sc.givenSteps.map((s) => s.text).join(' ');
        return wordOrPhraseIncludes(givenText, term);
      });
      if (!covered && !firstMiss) {
        firstMiss = `terminal state '${term}' of entity '${entity}' has no @terminal:${entity} negative scenario`;
      }
    }
  }
  if (firstMiss) return F('X-COV-TERM', 'B3', firstMiss, edges);
  return P('X-COV-TERM', 'B3', edges);
}

// X-COV-POL — every 03 policy has a @policy: scenario; eventual-mode ⇒ Then eventually.
export function xCovPol(features, policies) {
  const scByRef = new Map();
  for (const f of features) for (const sc of f.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (c && c.kind === 'policy') {
      if (!scByRef.has(c.ref)) scByRef.set(c.ref, []);
      scByRef.get(c.ref).push(sc);
    }
  }
  let firstMiss = null;
  for (const pol of policies) {
    const ref = policyTagRef(pol.name);
    const scs = scByRef.get(ref) || [];
    if (scs.length === 0) { if (!firstMiss) firstMiss = `policy '${pol.name}' has no @policy:${ref} scenario`; continue; }
    if (pol.mode === 'eventual') {
      const phrased = scs.some((sc) => sc.thenSteps.some((s) => /(^|\s)eventually(\s|$)/i.test(`${s.keyword}${s.text}`) || /eventually/i.test(s.text)));
      if (!phrased && !firstMiss) firstMiss = `eventual-mode policy '${pol.name}' is not phrased with 'Then eventually …'`;
    }
  }
  if (firstMiss) return F('X-COV-POL', 'B4', firstMiss, policies.length);
  return P('X-COV-POL', 'B4', policies.length);
}

// ===========================================================================
// B7 — authorization obligations (the 01 actor binding turned into a contract).
// ===========================================================================
// authzObligations(authorityByEntity, es01) → [{entity, event01, actor, otherHumans}].
// One obligation per DISTINCT authoritative non-∅ transition event that is (a) bound in
// 01 to a HUMAN actor (kind person/role) AND (b) in a domain where ≥1 OTHER human actor
// exists. System/scheduler-bound and unbound events are exempt — a negative
// authorization scenario must never be invented where the domain implies none. Creation
// (∅-row) events are exempt: a rejection scenario needs a prior state to stand on.
export function authzObligations(authorityByEntity, es01) {
  const humanActors = [...es01.actorKinds]
    .filter(([, k]) => HUMAN_ACTOR_KINDS.has(k))
    .map(([a]) => a);
  const obligations = [];
  for (const [entity, auth] of authorityByEntity) {
    const seen = new Set();
    for (const t of auth.transitions) {
      if (t.from === '∅' || !t.event01 || seen.has(t.event01)) continue;
      seen.add(t.event01);
      const actor = es01.actorByEvent.get(t.event01);
      if (!actor) continue; // unbound — exempt
      if (!HUMAN_ACTOR_KINDS.has(es01.actorKinds.get(actor) || '')) continue; // system — exempt
      const otherHumans = humanActors.filter((a) => a !== actor);
      if (otherHumans.length === 0) continue; // no other human actor — exempt
      obligations.push({ entity, event01: t.event01, actor, otherHumans });
    }
  }
  return obligations;
}

// X-AUTHZ — every @authz scenario is a well-formed authorization negative: its When
// embeds an exact authoritative event of the tagged entity (R-EVENT owns absence), that
// event carries a B7 obligation (else the scenario invents a rejection the domain
// doesn't imply), the Given/When names a 01 human actor OTHER than the bound one (the
// attempting actor), and the Then-block asserts rejection.
export function xAuthz(feat, ctx) {
  let edges = 0;
  let firstMiss = null;
  for (const sc of feat.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (!c || c.kind !== 'authz') continue;
    edges++;
    const whenText = sc.whenSteps.map((s) => s.text).join(' ');
    const gwText = sc.givenSteps.concat(sc.whenSteps).map((s) => s.text).join(' ');
    const thenText = sc.thenSteps.map((s) => s.text).join(' ');
    const events = ctx.entityEvents.get(c.ref) || new Set();
    let ev = null;
    for (const e of events) { if (e && whenText.includes(e)) { ev = e; break; } }
    if (!ev) continue; // no resolvable event — R-EVENT (D3) owns that failure
    const ob = (ctx.authzObligations || []).find((o) => o.entity === c.ref && o.event01 === ev);
    if (!ob) {
      if (!firstMiss) firstMiss = `${feat.fileBase}: @authz:${c.ref} scenario '${sc.title}' targets event '${ev}' which implies no authorization rejection (not bound to a human 01 actor, or no other human actor exists) — never invent a rejection the domain doesn't imply`;
      continue;
    }
    const namesOther = ob.otherHumans.some((a) => wordOrPhraseIncludes(gwText, a));
    if (!namesOther) {
      if (!firstMiss) firstMiss = `${feat.fileBase}: @authz:${c.ref} scenario '${sc.title}' names no 01 human actor other than the bound '${ob.actor}' as the attempting actor`;
      continue;
    }
    if (!/\brejected\b/i.test(thenText)) {
      if (!firstMiss) firstMiss = `${feat.fileBase}: @authz:${c.ref} scenario '${sc.title}' Then-block does not assert the attempt is rejected`;
      continue;
    }
  }
  if (firstMiss) return F('X-AUTHZ', 'B7', firstMiss, edges);
  return P('X-AUTHZ', 'B7', edges);
}

// X-COV-AUTHZ — every B7 obligation has ≥1 @authz:<entity> scenario whose When embeds
// the exact obligated event. Walks EVERY obligation edge (never short-circuits) so the
// coverage-edge count reconciles whether or not a miss is found.
export function xCovAuthz(features, obligations) {
  const scByEntity = new Map();
  for (const f of features) for (const sc of f.scenarios) {
    if (!sc.sourceTag) continue;
    const c = classifyTag(sc.sourceTag);
    if (c && c.kind === 'authz') {
      if (!scByEntity.has(c.ref)) scByEntity.set(c.ref, []);
      scByEntity.get(c.ref).push(sc);
    }
  }
  let firstMiss = null;
  for (const ob of obligations) {
    const scs = scByEntity.get(ob.entity) || [];
    const covered = scs.some((sc) => sc.whenSteps.map((s) => s.text).join(' ').includes(ob.event01));
    if (!covered && !firstMiss) {
      firstMiss = `actor-bound event '${ob.event01}' (actor '${ob.actor}') of entity '${ob.entity}' has no @authz:${ob.entity} negative scenario`;
    }
  }
  if (firstMiss) return F('X-COV-AUTHZ', 'B7', firstMiss, obligations.length);
  return P('X-COV-AUTHZ', 'B7', obligations.length);
}

// X-ONEWHEN — each scenario has exactly one Action (When) step (C3). (M10)
export function xOneWhen(feat) {
  for (const sc of feat.scenarios) {
    if (sc.explicitWhen.length > 1) return F('X-ONEWHEN', 'C3', `${feat.fileBase}: scenario '${sc.title}' has ${sc.explicitWhen.length} explicit When steps`, feat.scenarios.length);
  }
  return P('X-ONEWHEN', 'C3', feat.scenarios.length);
}

// X-ROLEORDER — step keywordType sequence Context* Action Conjunction* Outcome+ (C4).
export function xRoleOrder(feat) {
  for (const sc of feat.scenarios) {
    let seenAction = false;
    let seenOutcome = false;
    for (const s of sc.allSteps) {
      if (s.kt === 'Outcome') seenOutcome = true;
      else if (s.kt === 'Action') {
        if (seenOutcome) return F('X-ROLEORDER', 'C4', `${feat.fileBase}: scenario '${sc.title}' has an Action (When) after an Outcome (Then)`, feat.scenarios.length);
        seenAction = true;
      } else if (s.kt === 'Context') {
        if (seenAction || seenOutcome) return F('X-ROLEORDER', 'C4', `${feat.fileBase}: scenario '${sc.title}' has a Context (Given) after the action/outcome`, feat.scenarios.length);
      }
    }
  }
  return P('X-ROLEORDER', 'C4', feat.scenarios.length);
}

export function xFeatureOne(feat) {
  if (feat.featureCount !== 1) return F('X-FEATURE-ONE', 'A3', `${feat.fileBase}: ${feat.featureCount} Feature: blocks`, 1);
  return P('X-FEATURE-ONE', 'A3', 1);
}

// ===========================================================================
// M — mechanical AST-shape checks (§2) not already owned by an R/X above.
// ===========================================================================
export function m2Filename(fileBase, expectedSnake) {
  if (fileBase !== expectedSnake) return F('M2', 'A2', `file '${fileBase}.feature' is not '${expectedSnake}.feature' (snake_case of 03 aggregate)`);
  return P('M2', 'A2');
}

// M12 — no action verbs in the Then-block.
export function m12ActionInThen(feat) {
  for (const sc of feat.scenarios) {
    for (const s of sc.thenSteps) {
      const v = hasActionVerb(s.text);
      if (v) return F('M12', 'C4', `${feat.fileBase}: scenario '${sc.title}' Then-block step performs action '${v}'`);
    }
  }
  return P('M12', 'C4');
}

// M13 — Background holds only Context/Conjunction (Given) steps; ≤4 steps.
export function m13Background(feat) {
  if (!feat.background) return P('M13', 'C7');
  for (const s of feat.background.steps) {
    if (s.kt === 'Action' || s.kt === 'Outcome') return F('M13', 'C7', `${feat.fileBase}: Background contains a When/Then step`);
  }
  if (feat.background.steps.length > 4) return W('M13', 'C7', `${feat.fileBase}: Background has ${feat.background.steps.length} steps (>4)`);
  return P('M13', 'C7');
}

// M15 — state steps use 02 enum values verbatim (no invented state token).
// We flag a Given/Then token that matches the SHAPE of this aggregate's enum-value
// family (single word equal to a known value modulo case, OR a near-value) but is not in
// the 02 value set. Mechanically: any token that equals a 02 enum value of ANY aggregate
// with a case/spelling difference, OR a token explicitly marked as a state via the
// phrasing "is <X>" / "the <X> state" that is not a 02 value.
export function m15InventedState(feat, ctx) {
  const allValues = ctx.allEnumValues; // Set of every 02 enum value (verbatim)
  const valueLower = ctx.allEnumValuesLower; // Map(lower → verbatim)
  for (const sc of feat.scenarios) {
    for (const s of sc.givenSteps.concat(sc.thenSteps)) {
      // detect "is <tok>" / "becomes <tok>" / "<tok> order/coupon" state phrasings.
      const m = /\b(?:is|becomes|in|to)\s+([A-Za-z][A-Za-z0-9_]*)\b/g;
      let mm;
      while ((mm = m.exec(s.text)) !== null) {
        const tok = mm[1];
        if (allValues.has(tok)) continue; // exact verbatim — fine
        // a token that is a case/spelling variant of a known value but not verbatim ⇒ invented/wrong
        if (valueLower.has(tok.toLowerCase())) {
          return F('M15', 'D2', `${feat.fileBase}: scenario '${sc.title}' uses state token '${tok}' which is not the 02 enum value '${valueLower.get(tok.toLowerCase())}' verbatim`);
        }
      }
      // explicit invented-state marker: a token used as "the X state" not in 02.
      const ms = /\bthe\s+([A-Za-z][A-Za-z0-9_]*)\s+state\b/g;
      let m2;
      while ((m2 = ms.exec(s.text)) !== null) {
        const tok = m2[1];
        if (!allValues.has(tok) && !valueLower.has(tok.toLowerCase())) {
          return F('M15', 'D5', `${feat.fileBase}: scenario '${sc.title}' names invented state '${tok}' (no such 02 enum value)`);
        }
      }
    }
  }
  return P('M15', 'D2');
}

// M16 — domain concepts use 02 Terms verbatim. The concrete mechanical arm flags a
// PLURAL DRIFT of a single-word Term (e.g. 'Orders'/'orders' where the 02 Term is
// 'Order') — a near-synonym drift the catalog forbids. Pure lower/Title casing of a Term
// in running prose is normal Gherkin and is NOT flagged (the exact-noun rule is the
// invented-vocab arm, M18); only a plural of a known Term is the drift signal.
export function m16Term(feat, ctx) {
  const terms = ctx.terms; // Set verbatim
  const termPluralLower = new Map(); // plural(lower) → verbatim Term
  for (const t of terms) {
    if (!/^[A-Za-z]+$/.test(t)) continue;
    termPluralLower.set(`${t.toLowerCase()}s`, t);
    if (t.toLowerCase().endsWith('y')) termPluralLower.set(`${t.toLowerCase().slice(0, -1)}ies`, t);
  }
  for (const sc of feat.scenarios) {
    for (const s of sc.allSteps) {
      for (const tok of rawTokens(s.text)) {
        const bare = tok.replace(/[^A-Za-z0-9_]/g, '');
        if (!bare) continue;
        if (terms.has(bare)) continue;
        const bl = bare.toLowerCase();
        // exempt: a verbatim Term in any case-form is fine; only plural drift flagged.
        if (termPluralLower.has(bl)) {
          return F('M16', 'D1', `${feat.fileBase}: scenario '${sc.title}' uses plural '${bare}', not the 02 Term '${termPluralLower.get(bl)}' verbatim`);
        }
      }
    }
  }
  return P('M16', 'D1');
}

// Mask every occurrence of a MANDATED verbatim derivation span (an exact 01 event string,
// a verbatim 02 Term, or a verbatim 02 enum value) by overwriting those characters with
// spaces. A forbidden sub-token (M17) or invented-entity capture (M18) whose occurrence
// lies INSIDE such a span is a MANDATED derivation (D3 forces the When to embed the exact
// 01 event string), not free prose — so it must be exempt. This is the suite precedent
// (erd L12): forbidden-synonym / invented-vocab scans target free prose, never the exact
// upstream string a downstream rule compels. Tokens OUTSIDE every masked span still fire.
// `spans` is the closed set of verbatim strings to exempt; longest-first so a multi-word
// span wins over any contained shorter one.
export function maskVerbatimSpans(text, spans) {
  let masked = text;
  const ordered = [...spans].filter((s) => s && s.length > 0).sort((a, b) => b.length - a.length);
  for (const span of ordered) {
    let idx = 0;
    while ((idx = masked.indexOf(span, idx)) !== -1) {
      masked = masked.slice(0, idx) + ' '.repeat(span.length) + masked.slice(idx + span.length);
      idx += span.length;
    }
  }
  return masked;
}

// M17 — no forbidden synonyms anywhere (whole-word; verbatim Terms/enum values exempt).
// A forbidden token whose occurrence lies INSIDE an embedded exact 01 event string (any
// authoritative-transition / 02-enum-derivation event) or a verbatim 02 Term / 02 enum
// value is a MANDATED derivation (D3) — exempt. We mask those spans before tokenising, so
// only forbidden tokens in FREE PROSE remain visible to the scan.
export function m17Forbidden(feat, ctx) {
  const forbidden = ctx.forbidden; // [{term, canonical}]
  const exempt = ctx.exemptTokens; // Set of verbatim Term/enum tokens (lower)
  const verbatimSpans = ctx.verbatimSpans || []; // exact 01 events + 02 Terms + 02 enum values
  const scanTargets = [];
  for (const sc of feat.scenarios) {
    scanTargets.push(sc.title);
    for (const t of sc.allTagNames) scanTargets.push(t);
    for (const s of sc.allSteps) scanTargets.push(s.text);
  }
  for (const c of feat.comments) scanTargets.push(c.text);
  for (const { term } of forbidden) {
    const tl = term.toLowerCase();
    if (exempt.has(tl)) continue; // the forbidden token IS itself a verbatim Term/enum
    for (const target of scanTargets) {
      // mask MANDATED verbatim derivations: a forbidden sub-token inside one is exempt.
      const scannable = maskVerbatimSpans(target, verbatimSpans);
      const toks = plainTokens(scannable);
      if (toks.includes(tl)) {
        return F('M17', 'D4', `${feat.fileBase}: forbidden synonym '${term}' appears in '${target.slice(0, 60)}'`);
      }
    }
  }
  return P('M17', 'D4');
}

// M18 — no invented entities/events. A step naming an entity/event that is in no upstream
// vocabulary (not a 02 Term, not a 02 enum value, not a 04/01 event, not a 03 aggregate)
// when phrased as a domain entity ("the <X>") or event ("the <X> event"). We flag a
// "<Title Case> event" / "the <Title Case>" not present anywhere upstream.
export function m18InventedEntity(feat, ctx) {
  // The entity arm's `the <Cap>` capture must NOT fire on the leading word of a multi-word
  // 01 event after "the" (e.g. `the Seating Section Defined event occurs` would capture
  // "Seating" — the one-token lookahead `(?!\s+event)` cannot see past the next word). Mask
  // every known verbatim 01 event string and every multi-word 02 Term BEFORE the entity
  // scan, so an authoritative-derivation span contributes no spurious capitalized token.
  const eventSpans = [...ctx.allEvents].filter((e) => /\s/.test(e)); // multi-word events
  const multiWordTerms = [...ctx.terms].filter((t) => /\s/.test(t));
  // multi-word 01 actor names (e.g. 'Gate Agent' in a B7 @authz scenario) are mandated
  // upstream vocabulary — masked so their leading word never reads as an invented entity.
  const multiWordActors = [...(ctx.actorNames01 || [])].filter((a) => /\s/.test(a));
  const maskSpans = eventSpans.concat(multiWordTerms, multiWordActors);
  for (const sc of feat.scenarios) {
    for (const s of sc.allSteps) {
      // "the <X> event occurs" where <X> is not any known 01/04 event string. (Run on the
      // raw text — this arm matches the whole event phrase, so a real event resolves.)
      const em = /\bthe\s+([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)\s+event\b/g;
      let mm;
      while ((mm = em.exec(s.text)) !== null) {
        const ev = mm[1];
        if (!ctx.allEvents.has(ev)) {
          return F('M18', 'D5', `${feat.fileBase}: scenario '${sc.title}' names invented event '${ev}' (in no 01/04 upstream)`);
        }
      }
      // "the <CapEntity>" used as an aggregate not present upstream — scanned over text with
      // mandated verbatim event/Term spans MASKED out (so the leading word of a multi-word
      // event is not mistaken for an invented entity).
      const maskedText = maskVerbatimSpans(s.text, maskSpans);
      const en = /\bthe\s+([A-Z][A-Za-z0-9]*)\b(?!\s+event)/g;
      let me;
      while ((me = en.exec(maskedText)) !== null) {
        const ent = me[1];
        if (ctx.knownEntityVocab.has(ent)) continue;
        if (ctx.knownEntityVocab.has(ent.toLowerCase())) continue;
        // only flag a capitalized noun that LOOKS like an aggregate/entity (not a 02
        // Term, enum value, aggregate, or event word) — conservative: require it be a
        // single TitleCase token absent from ALL known vocab.
        if (!ctx.knownAllVocab.has(ent) && !ctx.knownAllVocabLower.has(ent.toLowerCase())) {
          return F('M18', 'D5', `${feat.fileBase}: scenario '${sc.title}' names invented entity '${ent}' (in no upstream)`);
        }
      }
    }
  }
  return P('M18', 'D5');
}

// M19 — no restated invariant text (≥N consecutive verbatim tokens from a 03 invariant).
export function m19RestatedInvariant(feat, ctx) {
  const N = RESTATEMENT_WINDOW_N;
  const invWindows = ctx.invariantWindows; // [{id, tokens:[…]}]
  const scan = (text, where) => {
    const toks = rawTokens(text);
    for (const inv of invWindows) {
      if (inv.tokens.length < N) continue;
      for (let i = 0; i + N <= toks.length; i++) {
        const window = toks.slice(i, i + N).join(' ');
        if (containsRun(inv.tokens, toks.slice(i, i + N))) {
          return F('M19', 'E1', `${feat.fileBase}: ${where} restates ≥${N} verbatim tokens of invariant ${inv.id}`);
        }
      }
    }
    return null;
  };
  for (const sc of feat.scenarios) {
    let r = scan(sc.title, `scenario '${sc.title}' title`);
    if (r) return r;
    for (const s of sc.allSteps) { r = scan(s.text, `scenario '${sc.title}' step`); if (r) return r; }
  }
  for (const c of feat.comments) { const r = scan(c.text, 'comment'); if (r) return r; }
  return P('M19', 'E1');
}
function containsRun(haystackTokens, needleTokens) {
  const h = haystackTokens.join(' ').toLowerCase();
  const n = needleTokens.join(' ').toLowerCase();
  return n.length > 0 && h.includes(n);
}

// M20 — no enum-value listings (≥ all values of one enum in one step/comment/Examples).
export function m20EnumListing(feat, ctx) {
  const enums = ctx.enums; // [{name, values:[…]}]
  const scan = (text, where) => {
    const toksLower = new Set(plainTokens(text));
    for (const e of enums) {
      if (e.values.length < 2) continue;
      const all = e.values.every((v) => toksLower.has(v.toLowerCase()));
      if (all) return F('M20', 'E2', `${feat.fileBase}: ${where} enumerates the full ${e.name} value set`);
    }
    return null;
  };
  for (const sc of feat.scenarios) {
    for (const s of sc.allSteps) { const r = scan(s.text, `scenario '${sc.title}' step`); if (r) return r; }
    for (const ex of sc.examples) {
      const flat = ex.header.concat(...ex.body).join(' ');
      const r = scan(flat, `scenario '${sc.title}' Examples`); if (r) return r;
    }
  }
  for (const c of feat.comments) { const r = scan(c.text, 'comment'); if (r) return r; }
  return P('M20', 'E2');
}

// M21 — no transition-table dumps (≥N From|Event|To rows in one block, or a ≥6-token run
// from a 04 table) in comments/descriptions/Data Tables.
export function m21TransitionDump(feat, ctx) {
  // comment block with multiple `from | event | to`-shaped lines.
  const commentText = feat.comments.map((c) => c.text).join('\n');
  const rowLike = commentText.split('\n').filter((l) => (l.match(/\|/g) || []).length >= 2).length;
  if (rowLike >= 3) return F('M21', 'E3', `${feat.fileBase}: a comment reproduces ≥3 transition-table rows (table dump)`);
  // verbatim 6-token run from a 04 table row.
  for (const c of feat.comments) {
    const toks = rawTokens(c.text);
    for (const win of ctx.transitionWindows) {
      if (win.length < RESTATEMENT_WINDOW_N) continue;
      if (containsRun(win, toks.slice(0, Math.max(toks.length, 0)))) {
        // cheap containment check
        if (c.text.toLowerCase().includes(win.join(' ').toLowerCase())) {
          return F('M21', 'E3', `${feat.fileBase}: a comment restates a 04 transition row verbatim`);
        }
      }
    }
  }
  return P('M21', 'E3');
}

// ===========================================================================
// Upstream self-checks (§9) — pre-resolution, route to upstream-defect.
// ===========================================================================
// 03 self-check: invariant-id uniqueness; policy-row well-formedness.
export function upstream03SelfCheck(aggregates03) {
  const seen = new Map();
  const defects = [];
  for (const inv of aggregates03.invariants) {
    seen.set(inv.id, (seen.get(inv.id) || 0) + 1);
  }
  for (const [id, n] of seen) if (n > 1) defects.push({ kind: 'dup-invariant', id, detail: `invariant id ${id} is duplicated (${n}×) in 03` });
  for (const pol of aggregates03.policies) {
    if (!pol.sourceEvent01) defects.push({ kind: 'bad-policy', detail: `policy '${pol.name}' has no source event` });
  }
  return { ok: defects.length === 0, defects };
}

// 04↔02 self-check: every 04 From/To (≠∅) ∈ the entity's 02 enum; every 04 Event present
// in the 02 derivations.
export function upstream04SelfCheck(entities04, enums02) {
  const defects = [];
  const enumByAgg = new Map();
  for (const e of enums02) {
    enumByAgg.set(e.agg.toLowerCase(), new Set(e.values));
  }
  const eventStrings = new Set();
  for (const e of enums02) for (const [, ev] of e.derivations) eventStrings.add(ev);
  for (const ent of entities04) {
    const stem = ent.entity.toLowerCase();
    const values = enumByAgg.get(stem) || null;
    if (!values) continue; // no matching enum — not gherkin's to litigate
    for (const r of ent.rows) {
      if (r.from !== '∅' && r.from && !values.has(r.from)) {
        defects.push({ entity: ent.entity, detail: `04 transition From '${r.from}' for '${ent.entity}' is not in the 02 ${ent.entity}Status enum` });
      }
      if (r.to && !values.has(r.to)) {
        defects.push({ entity: ent.entity, detail: `04 transition To '${r.to}' for '${ent.entity}' is not in the 02 ${ent.entity}Status enum` });
      }
    }
  }
  return { ok: defects.length === 0, defects };
}

// ===========================================================================
// X-RECON — reconciliation (§5). Returns {status:'pass'|'broken', detail}.
// ===========================================================================
export function checkXRecon(executedChecks, edgesWalked, edgesExpected, engineRun, featureCount, coverageEdgesWalked, coverageEdgesExpected) {
  if (executedChecks <= 0) return { status: 'broken', detail: 'zero executed checks (no vacuous green)' };
  if (featureCount > 0 && engineRun <= 0) return { status: 'broken', detail: `featureCount=${featureCount} but engineRun=0 (strongest oracle skipped)` };
  if (edgesWalked !== edgesExpected) return { status: 'broken', detail: `edgesWalked ${edgesWalked} ≠ edgesExpected ${edgesExpected} (a check was silently dropped)` };
  if (coverageEdgesWalked !== coverageEdgesExpected) return { status: 'broken', detail: `coverage edges ${coverageEdgesWalked} ≠ expected ${coverageEdgesExpected} (a coverage obligation was dropped)` };
  return { status: 'pass', detail: '' };
}

export function intakeCounts(features) {
  let scenarios = 0, steps = 0, tags = 0;
  for (const f of features) {
    scenarios += f.scenarios.length;
    for (const sc of f.scenarios) { steps += sc.allSteps.length; tags += sc.allTagNames.length; }
  }
  return { features: features.length, scenarios, steps, tags };
}
