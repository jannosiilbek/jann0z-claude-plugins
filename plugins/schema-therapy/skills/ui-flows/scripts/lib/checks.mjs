// checks.mjs — the CLOSED assertion grammar for the ui-flows (09) oracle (simulation.md §4).
// This grammar is NEVER extended ad hoc: adding a check means editing §4 of simulation.md AND
// this file in a committed change, and every check cites a catalog rule. Five classes:
//   mechanical (M-*), resolution (R-*), exact-value (X-*), walker (W-*, in graph.mjs), and
//   agent-judged (AJ-*, in the harness).
//
// Each check returns one (or more) { id, class, rule, status, detail } records. The harness
// collects them into checks[] (pass|fail) and findings[] (the fail details). Scaffold copied
// from the sibling task-models checks.mjs, re-pinned to the 09 dialect.

import {
  ELEMENTS, COMPONENT_TYPES, EVENT_TYPES, isSnake, snake, isValidDigest,
  tokenizeKlm, mProfile, INTERACTION_LEAF_CATEGORIES,
} from './lexicon.mjs';

const rec = (id, cls, rule, status, detail) => ({ id, class: cls, rule, status, detail: detail || '' });

// ===========================================================================
// MECHANICAL (no-walk) checks — Theme A/B/D/E shape rules over one model.
// ===========================================================================

// M-DECL — XML declaration is line 1 (the reader already accepted the document; a throw is a
// typed ParseError ⇒ malformed before we reach here).
export function mDecl(model) {
  if (!model.firstLineIsDecl) {
    return [rec('M-DECL', 'mechanical', 'A-a', 'fail', 'first line is not exactly `<?xml version="1.0" encoding="UTF-8"?>`')];
  }
  return [rec('M-DECL', 'mechanical', 'A-a', 'pass')];
}

// M-FP / R-FP — fingerprint block present + one sha256 line per consumed input.
export function mFingerprint(model, consumedInputs) {
  const out = [];
  if (!model.fingerprintComment) {
    out.push(rec('M-FP', 'mechanical', 'A-b', 'fail', 'leading `<!-- fingerprints: … -->` block absent'));
    return out;
  }
  const entries = model._fpEntries || [];
  const named = new Map();
  for (const e of entries) {
    if (e.malformed) { out.push(rec('M-FP', 'mechanical', 'A-b', 'fail', `malformed fingerprint line: '${e.raw}'`)); continue; }
    named.set(e.file, e.hash);
    if (!isValidDigest(e.hash)) out.push(rec('M-FP', 'mechanical', 'A-b', 'fail', `placeholder/invalid digest for ${e.file}: '${e.hash}'`));
  }
  // resolution arm: every consumed input named.
  const missing = [];
  for (const want of consumedInputs) {
    const hit = [...named.keys()].some((f) => f === want || f.endsWith('/' + want) || f.endsWith(want));
    if (!hit) missing.push(want);
  }
  if (missing.length) out.push(rec('R-FP', 'resolution', 'A-b', 'fail', `fingerprint block omits consumed input(s): ${missing.join(', ')}`));
  if (out.length === 0) { out.push(rec('M-FP', 'mechanical', 'A-b', 'pass')); out.push(rec('R-FP', 'resolution', 'A-b', 'pass')); }
  return out;
}

// M-ROOT / M-ATTR — root is a persona-bound IFMLModel; id == snake(persona) == stem; persona
// is a verbatim 07 `### <PersonaName>`.
export function mRootAttr(model, stem, personas07) {
  const out = [];
  if (model.rootName !== 'IFMLModel') {
    out.push(rec('M-ROOT', 'mechanical', 'A-c', 'fail', `root element is <${model.rootName}>, expected <IFMLModel>`));
    return out;
  }
  out.push(rec('M-ROOT', 'mechanical', 'A-c', 'pass'));
  const personaSet = new Set(personas07);
  const detail = [];
  if (model.persona == null || !personaSet.has(model.persona)) detail.push(`persona='${model.persona}' is not a verbatim 07 ### heading`);
  if (model.id !== stem) detail.push(`id='${model.id}' ≠ filename stem '${stem}'`);
  if (model.persona != null && snake(model.persona) !== stem) detail.push(`snake(persona)='${snake(model.persona)}' ≠ stem '${stem}'`);
  if (detail.length) out.push(rec('M-ATTR', 'exactValue', 'A-c', 'fail', detail.join('; ')));
  else out.push(rec('M-ATTR', 'exactValue', 'A-c', 'pass'));
  return out;
}

// M-REALIZES / R-REALIZE — ≥1 <Realizes>; each stem resolves to an 08 of THIS persona.
export function mRealizes(model, stem, taskStemSet) {
  const out = [];
  if (model.realizes.length === 0) {
    out.push(rec('M-REALIZES', 'mechanical', 'A-d', 'fail', 'zero <Realizes> children of the root'));
    return out;
  }
  out.push(rec('M-REALIZES', 'mechanical', 'A-d', 'pass'));
  const bad = [];
  for (const r of model.realizes) {
    if (!taskStemSet.has(r)) bad.push(`'${r}' has no matching specs/08-task-models/${r}.xml`);
    else if (!r.startsWith(stem + '-')) bad.push(`'${r}' is not prefixed by this persona's slug '${stem}-'`);
  }
  if (bad.length) out.push(rec('R-REALIZE', 'resolution', 'A-e', 'fail', bad.join('; ')));
  else out.push(rec('R-REALIZE', 'resolution', 'A-e', 'pass'));
  return out;
}

// M-CID / M-SNAKE — container ids unique + snake; ALL ids (container/component/event) snake.
export function mIds(model) {
  const out = [];
  const cids = model.containers.map((c) => c.id);
  const seen = new Set(), dups = new Set();
  for (const id of cids) { if (id == null) continue; if (seen.has(id)) dups.add(id); seen.add(id); }
  const badCid = cids.filter((id) => id != null && !isSnake(id));
  if (dups.size || badCid.length) {
    const parts = [];
    if (dups.size) parts.push(`duplicate ViewContainer id(s): ${[...dups].join(', ')}`);
    if (badCid.length) parts.push(`non-snake ViewContainer id(s): ${badCid.join(', ')}`);
    out.push(rec('M-CID', 'mechanical', 'A-f', 'fail', parts.join('; ')));
  } else out.push(rec('M-CID', 'mechanical', 'A-f', 'pass'));

  const allIds = [];
  for (const c of model.containers) {
    if (c.id != null) allIds.push(c.id);
    for (const cc of c.components) if (cc.id != null) allIds.push(cc.id);
    for (const e of c.events) if (e.id != null) allIds.push(e.id);
  }
  const badSnake = allIds.filter((id) => !isSnake(id));
  if (badSnake.length) out.push(rec('M-SNAKE', 'mechanical', 'E-a', 'fail', `non-snake id(s): ${[...new Set(badSnake)].join(', ')}`));
  else out.push(rec('M-SNAKE', 'mechanical', 'E-a', 'pass'));
  return out;
}

// M-CTYPE — every ViewComponent type ∈ {list,details,form}.
export function mComponentTypes(model) {
  const bad = [];
  for (const c of model.containers) for (const cc of c.components) {
    if (!COMPONENT_TYPES.has(cc.type)) bad.push(`${cc.id}='${cc.type}'`);
  }
  return [bad.length
    ? rec('M-CTYPE', 'mechanical', 'A-g', 'fail', `ViewComponent type ∉ {list,details,form}: ${bad.join(', ')}`)
    : rec('M-CTYPE', 'mechanical', 'A-g', 'pass')];
}

// M-ETYPE — every Event type ∈ {submit,select,navigate}.
export function mEventTypes(model) {
  const bad = [];
  for (const e of model.events) if (!EVENT_TYPES.has(e.type)) bad.push(`${e.id}='${e.type}'`);
  return [bad.length
    ? rec('M-ETYPE', 'mechanical', 'A-h', 'fail', `Event type ∉ {submit,select,navigate}: ${bad.join(', ')}`)
    : rec('M-ETYPE', 'mechanical', 'A-h', 'pass')];
}

// M-BIND / R-BIND — every binding resolves to a 04 table.
export function mBind(model, tables04) {
  const bad = [];
  for (const c of model.containers) for (const cc of c.components) {
    if (cc.binding == null) continue;
    if (!tables04.has(cc.binding)) bad.push(`${cc.id}='${cc.binding}'`);
  }
  if (bad.length) {
    return [
      rec('M-BIND', 'mechanical', 'A-i', 'fail', `binding ∉ 04 tables: ${bad.join(', ')}`),
      rec('R-BIND', 'resolution', 'A-i', 'fail', `binding ∉ 04 tables: ${bad.join(', ')}`),
    ];
  }
  return [rec('M-BIND', 'mechanical', 'A-i', 'pass'), rec('R-BIND', 'resolution', 'A-i', 'pass')];
}

// M-NAVEND — every NavigationFlow endpoint resolves (from∈Events, to∈Containers).
export function mNavEnd(model) {
  const eventIds = new Set(model.events.map((e) => e.id));
  const containerIds = new Set(model.containers.map((c) => c.id));
  const bad = [];
  for (const f of model.flows) {
    if (!eventIds.has(f.from)) bad.push(`from='${f.from}' is not a declared Event id`);
    if (!containerIds.has(f.to)) bad.push(`to='${f.to}' is not a declared ViewContainer id`);
  }
  return [bad.length
    ? rec('M-NAVEND', 'mechanical', 'A-j', 'fail', bad.join('; '))
    : rec('M-NAVEND', 'mechanical', 'A-j', 'pass')];
}

// M-HOME — exactly one home container.
export function mHome(model) {
  const homes = model.containers.filter((c) => c.home).length;
  return [homes === 1
    ? rec('M-HOME', 'mechanical', 'A-l', 'pass')
    : rec('M-HOME', 'mechanical', 'A-l', 'fail', `count(ViewContainer home="true") = ${homes}, expected 1`)];
}

// M-TASKREF / R-TASK — every Event task= resolves to a real 08 leaf id.
export function mTaskRef(model, allLeafIds) {
  const bad = [];
  for (const e of model.events) {
    if (e.task == null) continue;
    if (!allLeafIds.has(e.task)) bad.push(`${e.id} task='${e.task}'`);
  }
  if (bad.length) {
    return [
      rec('M-TASKREF', 'mechanical', 'B-c', 'fail', `task= ∉ any realized 08 leaf: ${bad.join(', ')}`),
      rec('R-TASK', 'resolution', 'B-c', 'fail', `task= ∉ any realized 08 leaf: ${bad.join(', ')}`),
    ];
  }
  return [rec('M-TASKREF', 'mechanical', 'B-c', 'pass'), rec('R-TASK', 'resolution', 'B-c', 'pass')];
}

// M-KLM — every nominal-path leaf-mapped Event carries a well-formed klm (alphabet + M-rule).
// nominalEventInfo: [{eventId, klm, category}] — the leaf-mapped events on a nominal path, with
// the realized leaf's category (interaction/user vs system).
export function mKlm(nominalEventInfo) {
  const bad = [];
  for (const info of nominalEventInfo) {
    if (info.klm == null) { bad.push(`${info.eventId}: missing klm`); continue; }
    const tk = tokenizeKlm(info.klm);
    if (!tk.ok) { bad.push(`${info.eventId}: ${tk.detail}`); continue; }
    const mp = mProfile(info.klm);
    const isInteraction = INTERACTION_LEAF_CATEGORIES.has(info.category);
    if (isInteraction) {
      if (!mp.leadingM) bad.push(`${info.eventId}='${info.klm}': interaction/user klm must begin with exactly one M`);
      else if (mp.mCount !== 1) bad.push(`${info.eventId}='${info.klm}': interaction/user klm carries ${mp.mCount} M (must be exactly one leading M)`);
    } else {
      if (mp.mCount !== 0) bad.push(`${info.eventId}='${info.klm}': system-mapped klm must carry no M`);
    }
  }
  return [bad.length
    ? rec('M-KLM', 'mechanical', 'C-b', 'fail', bad.join('; '))
    : rec('M-KLM', 'mechanical', 'C-b', 'pass')];
}

// M-ANNOT — domain-affecting submit events carry an 01-event annotation. A submit Event whose
// container's component is bound to a lifecycle entity (status-bearing 04 table) needs a
// `<!-- 01-event: … -->` child. lifecycleTables: Set of 04 table names that are lifecycle-bearing.
export function mAnnot(model, lifecycleTables) {
  const bad = [];
  for (const c of model.containers) {
    const boundLifecycle = c.components.some((cc) => cc.binding != null && lifecycleTables.has(cc.binding));
    if (!boundLifecycle) continue;
    for (const e of c.events) {
      if (e.type === 'submit' && e.annotation == null) bad.push(`${e.id} in container '${c.id}'`);
    }
  }
  return [bad.length
    ? rec('M-ANNOT', 'mechanical', 'A-k', 'fail', `lifecycle submit Event(s) lack a <!-- 01-event: … --> annotation: ${bad.join(', ')}`)
    : rec('M-ANNOT', 'mechanical', 'A-k', 'pass')];
}

// R-AUTH — each submit Event's 01-event annotation ∈ its entity's authority (05-if-promoted-
// else-04). authorityEventsByTable: Map(table → Set(event01 strings)).
export function rAuth(model, lifecycleTables, authorityEventsByTable) {
  const bad = [];
  for (const c of model.containers) {
    const boundTables = c.components.filter((cc) => cc.binding != null && lifecycleTables.has(cc.binding)).map((cc) => cc.binding);
    if (boundTables.length === 0) continue;
    for (const e of c.events) {
      if (e.type !== 'submit' || e.annotation == null) continue;
      const inSome = boundTables.some((tbl) => (authorityEventsByTable.get(tbl) || new Set()).has(e.annotation));
      if (!inSome) bad.push(`${e.id}: 01-event '${e.annotation}' ∉ authority of {${boundTables.join(',')}}`);
    }
  }
  return [bad.length
    ? rec('R-AUTH', 'resolution', 'D-a', 'fail', bad.join('; '))
    : rec('R-AUTH', 'resolution', 'D-a', 'pass')];
}

// M-FORBID — no forbidden synonym in ids/names/annotations, OUTSIDE a mandated verbatim span
// (exact 01-event annotation, exact 04 binding name, exact 07 persona — the erd-L12 exemption).
export function mForbid(model, forbidden, verbatimSpans) {
  const bad = [];
  const exemptLower = new Set([...verbatimSpans].map((s) => String(s).toLowerCase()));
  // scan targets: container ids/names, component ids, event ids. Annotations/bindings/persona
  // are mandated verbatim spans → exempt (not scanned).
  const targets = [];
  for (const c of model.containers) {
    if (c.id != null) targets.push({ kind: 'container id', value: c.id });
    if (c.name != null) targets.push({ kind: 'container name', value: c.name });
    for (const cc of c.components) if (cc.id != null) targets.push({ kind: 'component id', value: cc.id });
    for (const e of c.events) if (e.id != null) targets.push({ kind: 'event id', value: e.id });
  }
  for (const t of targets) {
    if (exemptLower.has(String(t.value).toLowerCase())) continue; // whole-value verbatim exemption
    for (const f of forbidden) {
      const term = f.term;
      if (!term) continue;
      // whole-word / token match (snake-token or substring word boundary).
      const re = new RegExp(`(^|[^a-z0-9])${escapeRe(term.toLowerCase())}([^a-z0-9]|$)`);
      if (re.test(String(t.value).toLowerCase())) {
        bad.push(`forbidden '${term}' in ${t.kind} '${t.value}' (use canonical '${f.canonical}')`);
      }
    }
  }
  return [bad.length
    ? rec('M-FORBID', 'mechanical', 'E-b', 'fail', bad.join('; '))
    : rec('M-FORBID', 'mechanical', 'E-b', 'pass')];
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// X-COST-INT — each realized 08 Budget.klm parses as a single non-negative integer.
export function xCostInt(taskModels) {
  const bad = [];
  for (const tm of taskModels) {
    if (tm.declaredBudget == null) bad.push(`${tm.stem}: Budget.klm '${tm.budgetRaw}' is not a non-negative integer`);
  }
  return [bad.length
    ? rec('X-COST-INT', 'exactValue', 'C-a', 'fail', bad.join('; '))
    : rec('X-COST-INT', 'exactValue', 'C-a', 'pass')];
}

// X-COV-LEAF — every interaction/user leaf of every realized 08 model has ≥1 mapped Event.
export function xCovLeaf(model, taskModels) {
  const taskRefs = new Set(model.events.map((e) => e.task).filter(Boolean));
  const bad = [];
  for (const tm of taskModels) {
    for (const leaf of tm.leaves) {
      if (!INTERACTION_LEAF_CATEGORIES.has(leaf.category)) continue;
      if (!taskRefs.has(leaf.id)) bad.push(`${tm.stem}:${leaf.id}`);
    }
  }
  return [bad.length
    ? rec('X-COV-LEAF', 'exactValue', 'B-a', 'fail', `interaction/user 08 leaf with no mapped Event (task=): ${bad.join(', ')}`)
    : rec('X-COV-LEAF', 'exactValue', 'B-a', 'pass')];
}

// M-BACKOUT (⚠️) — a non-home ViewContainer with no outgoing NavigationFlow.
export function mBackout(model) {
  const eventToContainer = new Map();
  for (const c of model.containers) for (const e of c.events) eventToContainer.set(e.id, c.id);
  const hasOutgoing = new Set();
  for (const f of model.flows) { const src = eventToContainer.get(f.from); if (src != null) hasOutgoing.add(src); }
  const stranded = model.containers.filter((c) => !c.home && !hasOutgoing.has(c.id)).map((c) => c.id);
  return [stranded.length
    ? rec('M-BACKOUT', 'mechanical', 'F-b', 'warn', `non-home container(s) with no exit NavigationFlow: ${stranded.join(', ')}`)
    : rec('M-BACKOUT', 'mechanical', 'F-b', 'pass')];
}

// ===========================================================================
// RECONCILIATION + STATUS PRECEDENCE (§5/§9) — extracted so the arithmetic is unit-testable
// (a dropped edge / zero checks must flip the run to broken-test, never a silent pass).
// `reconciled` is true iff: every expected edge was walked, ≥1 check executed, and (when any
// 08 model is realized) the walker layer ran ≥1 walk. `reconcileStatus` applies ONE precedence
// — broken-test > malformed > fail > pass — so a reconciliation failure surfaces as
// broken-test EVEN WHEN malformed findings are present (sibling skills treat a dropped edge as
// broken-test, not malformed).
// `walkableModelCount` = realized 08 models MINUS those routed as upstream-defects (a broken
// ruler / stuck walker legitimately skips the walk). A walkable model that produced no walk is
// the strongest-oracle-skipped fault.
export function reconcile({ edgesWalked, edgesExpected, executedChecks, walkableModelCount, walks }) {
  return (edgesWalked === edgesExpected)
    && (executedChecks > 0)
    && (walkableModelCount === 0 || walks > 0);
}

export function reconcileStatus({ edgesWalked, edgesExpected, executedChecks, walkableModelCount, walks, anyMalformed, hasFail }) {
  // broken-test (highest): the test instrument itself is untrustworthy.
  if (executedChecks === 0) return { status: 'broken-test', reason: 'zero parsed checks (vacuous-green guard)' };
  if (edgesWalked !== edgesExpected) return { status: 'broken-test', reason: `edge reconciliation mismatch (walked ${edgesWalked} ≠ expected ${edgesExpected}) — a check was silently dropped` };
  if (walkableModelCount > 0 && walks === 0) return { status: 'broken-test', reason: 'realized models present but the walker layer ran zero walks (strongest oracle skipped)' };
  // then malformed (a .xml not well-formed) — a real but lower-precedence instrument fault.
  if (anyMalformed) return { status: 'malformed', reason: 'one or more 09 .xml not well-formed' };
  // then fail (a content defect), then pass.
  if (hasFail) return { status: 'fail', reason: '' };
  return { status: 'pass', reason: '' };
}

export { rec };
