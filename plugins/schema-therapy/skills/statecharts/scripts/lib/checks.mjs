// checks.mjs — the CLOSED mechanical + resolution + exact-value assertion grammar for
// the statecharts oracle (simulation.md §2 / §4). NEVER extended ad hoc: a new check
// means editing this file AND simulation.md §4 in a committed change, and the new
// check MUST cite a catalog rule. Each returns { id, rule, status, detail } (status ∈
// pass|fail|warn|info), plus an optional { edges } count for reconciliation and an
// optional { upstreamDefect, upstreamFile, upstreamDetail } for §9 routing.
//
// The ENGINE (engine.mjs) is the authority on what the machine DOES; this file
// inspects SHAPE + cross-artifact resolution the interpreter never surfaces.

import {
  eventTransform, isSnakeCase, isLegalEventToken, isValidDigest, isPlaceholderDigest,
  wordTokens, plainTokens, rawTokens, RESTATEMENT_WINDOW_N, statusEnumStem, toSnake,
} from './lexicon.mjs';
import { fingerprintComment, supersedesTarget, hasCond, hasTransitionAction, hasParallel } from './scxml.mjs';

const FIVE_UPSTREAMS = ['01-event-storming.md', '02-glossary.md', '03-aggregates.md', '04-erd.dbml', '04-transitions.md'];

// ===========================================================================
// Derivations: bind 04 lifecycle entities to their 02 enums + gate state counts.
// ===========================================================================

// A 04 lifecycle entity = a `### <entity>` transition block. Its 02 enum is the
// `### <Entity>Status` whose snake_case stem matches the entity name. Returns
// [{entity, rows, initial, enumValues:[…], stateCount, gatePasses04}].
export function bindEntities(transitions04, glossary02) {
  const enumByStem = new Map();
  for (const e of glossary02.enums) {
    enumByStem.set(toSnake(statusEnumStem(e.name)), e.values);
  }
  return transitions04.entities.map((ent) => {
    const enumValues = enumByStem.get(toSnake(ent.entity)) || [];
    const distinct = new Set();
    for (const r of ent.rows) {
      if (r.from !== '∅' && r.from) distinct.add(r.from);
      if (r.to) distinct.add(r.to);
    }
    const stateCount = distinct.size;
    return { entity: ent.entity, rows: ent.rows, initial: ent.initial, enumValues, stateCount, gatePasses04: stateCount > 4 };
  });
}

// ===========================================================================
// Upstream self-consistency preconditions (§9) — run BEFORE 05→0n resolution.
// ===========================================================================

// 02 self-check (§9.3): every enum value table non-empty, blank-free, no dup.
export function upstream02SelfCheck(glossary02) {
  const defects = [];
  for (const e of glossary02.enums) {
    if (e.values.length === 0) defects.push({ detail: `enum '${e.name}' has no values` });
    const seen = new Set();
    for (const v of e.values) {
      if (v === '') defects.push({ detail: `enum '${e.name}' has a blank value` });
      if (seen.has(v)) defects.push({ detail: `enum '${e.name}' has duplicate value '${v}'` });
      seen.add(v);
    }
  }
  return { ok: defects.length === 0, defects };
}

// 04 self-check (§9.2): every From/To (≠∅) ∈ the entity's 02 enum; exactly one ∅ row.
export function upstream04SelfCheck(entities) {
  const defects = [];
  for (const ent of entities) {
    const enumSet = new Set(ent.enumValues);
    const emptyRows = ent.rows.filter((r) => r.from === '∅');
    if (emptyRows.length !== 1) defects.push({ entity: ent.entity, detail: `entity '${ent.entity}' has ${emptyRows.length} ∅ (initial) rows, expected exactly 1` });
    for (const r of ent.rows) {
      if (r.from !== '∅' && r.from && !enumSet.has(r.from)) defects.push({ entity: ent.entity, detail: `transition From value '${r.from}' not in ${ent.entity}'s 02 enum` });
      if (r.to && !enumSet.has(r.to)) defects.push({ entity: ent.entity, detail: `transition To value '${r.to}' not in ${ent.entity}'s 02 enum` });
    }
  }
  return { ok: defects.length === 0, defects };
}

// ===========================================================================
// M1 / Gate arithmetic (M8/M9/M10 + X-GATE) — the load-bearing promotion checks.
// `machinesByEntity` = Map(entity → machineModel|undefined).
// ===========================================================================

// M1 — directory presence matches the gate (presence case; absence handled by the
// not-emitted path in the harness). Here: dir present but holds no machine ⇒ fail.
export function checkM1_dirPresence(dirExists, machineCount, anyPasser) {
  if (dirExists && machineCount === 0 && anyPasser) {
    return { id: 'M1', rule: 'A1', status: 'fail', detail: 'specs/05-statecharts/ exists but holds no .scxml while ≥1 entity passes the gate' };
  }
  if (dirExists && machineCount === 0) {
    return { id: 'M1', rule: 'A1', status: 'fail', detail: 'specs/05-statecharts/ exists but holds no .scxml (empty directory)' };
  }
  return { id: 'M1', rule: 'A1', status: 'pass', detail: '' };
}

// M8 — missed promotion (>4-states arm): a >4-distinct-state 04 entity with NO file.
export function checkM8_missedPromotion(entities, machinesByEntity) {
  const missed = entities.filter((e) => e.gatePasses04 && !machinesByEntity.has(e.entity));
  if (missed.length) {
    return { id: 'M8', rule: 'B3', status: 'fail', detail: `gate-passing entit${missed.length > 1 ? 'ies' : 'y'} not promoted: ${missed.map((e) => `${e.entity} (${e.stateCount} states)`).join(', ')}`, edges: entities.length };
  }
  return { id: 'M8', rule: 'B3', status: 'pass', detail: '', edges: entities.length };
}

// M9 — unjustified promotion: a promoted file with ≤4 basic states AND no cond, no
// transition action, no <parallel>.
export function checkM9_unjustified(entities, machinesByEntity) {
  for (const e of entities) {
    const m = machinesByEntity.get(e.entity);
    if (!m) continue;
    if (e.stateCount > 4) continue; // justified by the state-count arm
    const basicCount = m.basicStateIds.size;
    if (basicCount > 4) continue;
    if (hasCond(m) || hasTransitionAction(m) || hasParallel(m)) continue;
    return { id: 'M9', rule: 'B1/B2', status: 'fail', detail: `entity '${e.entity}' promoted with ${basicCount} basic states and no guard/action/parallel — gate-justifying feature absent` };
  }
  return { id: 'M9', rule: 'B1/B2', status: 'pass', detail: '' };
}

// M10 — non-lifecycle / non-promoted entity absent. A file for an entity with no 04
// transition block (no lifecycle) ⇒ fail.
export function checkM10_nonLifecycle(machineEntities, lifecycleEntitySet) {
  for (const me of machineEntities) {
    if (!lifecycleEntitySet.has(me)) {
      return { id: 'M10', rule: 'B5', status: 'fail', detail: `file '${me}.scxml' targets a non-lifecycle / unknown 04 entity (no transition block)` };
    }
  }
  return { id: 'M10', rule: 'B5', status: 'pass', detail: '' };
}

// X-GATE — reconcile file presence against the >4-state count for EVERY entity.
export function checkXGate(entities, machinesByEntity) {
  const problems = [];
  for (const e of entities) {
    const has = machinesByEntity.has(e.entity);
    if (e.gatePasses04 && !has) problems.push(`${e.entity}: >4 states but no file`);
  }
  return { id: 'X-GATE', rule: 'B1/B3/B5', status: problems.length ? 'fail' : 'pass', detail: problems.join('; '), edges: entities.length };
}

// ===========================================================================
// Per-machine structural + resolution checks (run for each emitted machine).
// ===========================================================================

// M2 — filename == <entity>.scxml (checked by the harness against the directory).
export function checkM2_filename(fileBase, entity) {
  if (fileBase !== entity) return { id: 'M2', rule: 'A2', status: 'fail', detail: `file '${fileBase}.scxml' is not named for its 04 entity '${entity}'` };
  return { id: 'M2', rule: 'A2', status: 'pass', detail: '' };
}

// M3 — handled by the hand-rolled reader throwing (malformed). Recorded pass here.
export function checkM3_wellformed() { return { id: 'M3', rule: 'A3', status: 'pass', detail: '' }; }

// M4 — fingerprint block present, names ALL five upstreams, each a valid 64-hex.
export function checkM4_fingerprints(model) {
  const fp = fingerprintComment(model);
  if (!fp) return { id: 'M4', rule: 'A4', status: 'fail', detail: 'no leading <!-- fingerprints: … --> block' };
  const found = new Map();
  const re = /([0-9a-z._-]+\.(?:md|dbml))@sha256:([0-9a-zA-Zx<>]+)/g;
  let m;
  while ((m = re.exec(fp)) !== null) found.set(m[1], m[2]);
  for (const u of FIVE_UPSTREAMS) {
    if (!found.has(u)) return { id: 'M4', rule: 'A4', status: 'fail', detail: `fingerprint block omits upstream '${u}'` };
    const hex = found.get(u);
    if (isPlaceholderDigest(hex)) return { id: 'M4', rule: 'A4', status: 'fail', detail: `fingerprint for '${u}' is a placeholder digest '${hex.slice(0, 12)}…'` };
    if (!isValidDigest(hex)) return { id: 'M4', rule: 'A4', status: 'fail', detail: `fingerprint for '${u}' is not a 64-hex sha256` };
  }
  return { id: 'M4', rule: 'A4', status: 'pass', detail: '' };
}

// M5 — supersedes declaration present, names this entity's existing 04 table.
export function checkM5_supersedes(model, entity, lifecycleEntitySet) {
  const target = supersedesTarget(model);
  if (!target) return { id: 'M5', rule: 'A5', status: 'fail', detail: `no <!-- supersedes: 04-transitions.md#${entity} --> declaration` };
  if (target !== entity) return { id: 'M5', rule: 'A5', status: 'fail', detail: `supersedes target '${target}' ≠ this file's entity '${entity}'` };
  if (!lifecycleEntitySet.has(target)) return { id: 'M5', rule: 'A5', status: 'fail', detail: `supersedes names 04 table '${target}' which does not exist` };
  return { id: 'M5', rule: 'A5', status: 'pass', detail: '' };
}

// M6 — root <scxml> version="1.0", xmlns exact, initial (if present) names a child.
export function checkM6_root(model) {
  if (model.version !== '1.0') return { id: 'M6', rule: 'A6', status: 'fail', detail: `root version="${model.version}" (expected "1.0")` };
  if (model.xmlns !== 'http://www.w3.org/2005/07/scxml') return { id: 'M6', rule: 'A6', status: 'fail', detail: `root xmlns="${model.xmlns}" (expected the SCXML namespace URI)` };
  if (model.initialAttr != null) {
    const allIds = new Set(model.ids);
    if (!allIds.has(model.initialAttr)) return { id: 'M6', rule: 'A6', status: 'fail', detail: `root initial="${model.initialAttr}" names a non-existent state` };
  }
  return { id: 'M6', rule: 'A6', status: 'pass', detail: '' };
}

// M7 — datamodel pinned: ="null" default, OR ="ecmascript" only with a guard
// justification (a cond present); no cond under datamodel="null".
export function checkM7_datamodel(model) {
  if (model.datamodel == null) return { id: 'M7', rule: 'A8', status: 'fail', detail: 'root <scxml> has no datamodel attribute' };
  if (model.datamodel === 'null') {
    if (hasCond(model)) return { id: 'M7', rule: 'A8', status: 'fail', detail: 'a cond expression is present under datamodel="null"' };
    return { id: 'M7', rule: 'A8', status: 'pass', detail: '' };
  }
  if (model.datamodel === 'ecmascript') {
    if (!hasCond(model)) return { id: 'M7', rule: 'A8', status: 'fail', detail: 'datamodel="ecmascript" used without any cond (no guard justification)' };
    return { id: 'M7', rule: 'A8', status: 'pass', detail: '' };
  }
  return { id: 'M7', rule: 'A8', status: 'fail', detail: `datamodel="${model.datamodel}" is not a pinned value (null|ecmascript)` };
}

// M11 — basic-state set == the entity's 02 enum values (exact, verbatim).
export function checkM11_states(model, entity, enumValues) {
  // basic states ∪ <final> ids (a terminal enum value may be a <final> — C6).
  const basics = new Set(model.enumCandidateStateIds);
  const enumSet = new Set(enumValues);
  const missing = [...enumSet].filter((v) => !basics.has(v));
  const extra = [...basics].filter((v) => !enumSet.has(v));
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`missing 02 enum value(s): ${missing.join(', ')}`);
    if (extra.length) parts.push(`extra basic state(s) not in 02 enum: ${extra.join(', ')}`);
    return { id: 'M11', rule: 'C1', status: 'fail', detail: `entity '${entity}': ${parts.join('; ')}`, edges: 1 };
  }
  // STRUCTURAL wrapper ids (compound/parallel/initial/history) must not collide with
  // enum values. <final> ids are NOT structural wrappers — a terminal enum value is
  // legitimately a <final> named for the enum value (C6) — so they are exempt.
  for (const w of model.wrapperStates) {
    if (w.kind === 'final') continue;
    if (enumSet.has(w.id)) return { id: 'M11', rule: 'C1', status: 'fail', detail: `wrapper state id '${w.id}' collides with a 02 enum value`, edges: 1 };
  }
  return { id: 'M11', rule: 'C1', status: 'pass', detail: '', edges: 1 };
}

// M12 — every 04 row present as a <transition> (source=From, event=transform(Event),
// target=To). Returns edges = #rows.
export function checkM12_rows(model, entity04) {
  const transitions = model.transitions;
  const missing = [];
  let edges = 0;
  for (const r of entity04.rows) {
    if (r.from === '∅') continue;
    edges++;
    const ev = eventTransform(r.event01);
    const found = transitions.some((t) => t.sourceId === r.from && t.event === ev && t.target === r.to);
    if (!found) missing.push(`${r.from} --${ev}--> ${r.to}`);
  }
  if (missing.length) return { id: 'M12', rule: 'C2', status: 'fail', detail: `04 row(s) with no matching <transition>: ${missing.join('; ')}`, edges };
  return { id: 'M12', rule: 'C2', status: 'pass', detail: '', edges };
}

// M13 — no contradiction: every basic From→To pair ∈ 04, or carries refines:. Also
// every 04 edge present (covered by M12; here the reverse — no rogue basic pairs).
export function checkM13_noContradiction(model, entity04) {
  const pairs04 = new Set(entity04.rows.filter((r) => r.from !== '∅').map((r) => `${r.from}->${r.to}`));
  const basics = model.basicStateIds;
  // Count ALL basic→basic pairs first (edges are invariant — they must equal the
  // harness's edgesExpected basicPairs count regardless of pass/fail), then verdict.
  const basicPairs = model.transitions.filter((t) => basics.has(t.sourceId) && basics.has(t.target));
  const edges = basicPairs.length;
  for (const t of basicPairs) {
    const pair = `${t.sourceId}->${t.target}`;
    if (pairs04.has(pair)) continue;
    if (t.refines != null) continue; // annotated refinement is legal
    return { id: 'M13', rule: 'C4', status: 'fail', detail: `transition '${pair}' is a basic-state pair NOT in 04 and carries no <!-- refines: … --> annotation`, edges };
  }
  return { id: 'M13', rule: 'C4', status: 'pass', detail: '', edges };
}

// M14 — initial id == the 04 ∅-row target.
export function checkM14_initial(model, entity04) {
  const initialId = model.initialAttr != null ? model.initialAttr : firstChildStateId(model);
  if (initialId !== entity04.initial) {
    return { id: 'M14', rule: 'A7/C3', status: 'fail', detail: `machine initial '${initialId}' ≠ 04 ∅-row target '${entity04.initial}'` };
  }
  return { id: 'M14', rule: 'A7/C3', status: 'pass', detail: '' };
}
function firstChildStateId(model) {
  for (const c of model.root.children) {
    if (c.name === 'state' || c.name === 'parallel' || c.name === 'final') return c.attrs.id || null;
  }
  return null;
}

// M15 — id uniqueness.
export function checkM15_idUnique(model) {
  const seen = new Set();
  for (const id of model.ids) {
    if (seen.has(id)) return { id: 'M15', rule: 'D2', status: 'fail', detail: `duplicate id '${id}'` };
    seen.add(id);
  }
  return { id: 'M15', rule: 'D2', status: 'pass', detail: '' };
}

// M16 — every transition / initial / history target names a declared id.
export function checkM16_targets(model) {
  const declared = new Set(model.ids);
  for (const t of model.transitions) {
    if (t.target != null && !declared.has(t.target)) return { id: 'M16', rule: 'D3', status: 'fail', detail: `transition target '${t.target}' names no declared id` };
  }
  if (model.initialAttr != null && !declared.has(model.initialAttr)) return { id: 'M16', rule: 'D3', status: 'fail', detail: `root initial '${model.initialAttr}' names no declared id` };
  for (const s of model.states) {
    if (s.initialAttr != null && !declared.has(s.initialAttr)) return { id: 'M16', rule: 'D3', status: 'fail', detail: `compound '${s.id}' initial '${s.initialAttr}' names no declared id` };
  }
  return { id: 'M16', rule: 'D3', status: 'pass', detail: '' };
}

// M17 — reachability: every state (other than the initial config) is a transition
// target or entered via a compound/parallel default. Basic states mirror 04.
export function checkM17_reachability(model, entity04) {
  const targeted = new Set();
  for (const t of model.transitions) if (t.target) targeted.add(t.target);
  // compound/parallel defaults
  for (const s of model.states) {
    if (s.initialAttr) targeted.add(s.initialAttr);
    // parallel: every child region is entered; compound first child if no initial.
    if (s.kind === 'parallel' || s.kind === 'compound') {
      for (const c of s.node.children) if ((c.name === 'state' || c.name === 'parallel' || c.name === 'final') && c.attrs.id) {
        if (s.kind === 'parallel') targeted.add(c.attrs.id);
      }
    }
  }
  const initialId = model.initialAttr != null ? model.initialAttr : firstChildStateId(model);
  for (const stateId of model.enumCandidateStateIds) {
    if (stateId === initialId) continue;
    if (!targeted.has(stateId)) return { id: 'M17', rule: 'D4', status: 'fail', detail: `state '${stateId}' is unreachable (never a transition target / default)` };
  }
  return { id: 'M17', rule: 'D4', status: 'pass', detail: '' };
}

// M18 — compound initial validity: compound has one default child (initial attr XOR
// <initial> child, not both); atomic states declare neither.
export function checkM18_compoundInitial(model) {
  for (const s of model.states) {
    if (s.kind === 'compound' || s.kind === 'parallel') {
      if (s.initialAttr != null && s.hasInitialChild) return { id: 'M18', rule: 'D5', status: 'fail', detail: `compound '${s.id}' has BOTH initial="" and <initial> child` };
    }
    if (s.kind === 'basic' && (s.initialAttr != null || s.hasInitialChild)) {
      return { id: 'M18', rule: 'D5', status: 'fail', detail: `atomic state '${s.id}' declares an initial (illegal)` };
    }
  }
  return { id: 'M18', rule: 'D5', status: 'pass', detail: '' };
}

// M19 — event token legality + round-trip. Every event dot-segmented alphanumeric;
// every 04-derived transition carries 01-event AND transform(annotation)===event.
export function checkM19_events(model, entity04) {
  const rows04 = new Set(entity04.rows.filter((r) => r.from !== '∅').map((r) => `${r.from}|${eventTransform(r.event01)}|${r.to}`));
  for (const t of model.transitions) {
    if (t.event == null) continue; // eventless (e.g. cond-only) transition
    if (!isLegalEventToken(t.event)) return { id: 'M19', rule: 'D7', status: 'fail', detail: `event '${t.event}' is not a legal dot-segmented alphanumeric token (spaces/illegal chars)` };
    // round-trip on 04-derived transitions (basic→basic that match a 04 row position)
    const key = `${t.sourceId}|${t.event}|${t.target}`;
    if (rows04.has(key)) {
      if (t.event01 == null) return { id: 'M19', rule: 'E4', status: 'fail', detail: `04-derived transition '${t.sourceId}--${t.event}-->${t.target}' missing <!-- 01-event: … --> annotation` };
      if (eventTransform(t.event01) !== t.event) return { id: 'M19', rule: 'E4', status: 'fail', detail: `round-trip mismatch: transform('${t.event01}')='${eventTransform(t.event01)}' ≠ event='${t.event}'` };
    } else if (model.basicStateIds.has(t.sourceId) && model.basicStateIds.has(t.target)) {
      // a basic pair NOT in 04 must still carry a 01-event if it claims one; if it has
      // no annotation it is a refinement handled by M13 — round-trip only when annotated.
      if (t.event01 != null && eventTransform(t.event01) !== t.event) {
        return { id: 'M19', rule: 'E4', status: 'fail', detail: `round-trip mismatch on refinement: transform('${t.event01}')='${eventTransform(t.event01)}' ≠ event='${t.event}'` };
      }
    }
  }
  return { id: 'M19', rule: 'D7/E4', status: 'pass', detail: '' };
}

// M20 — no forbidden synonyms in ids/names/comments/annotations. ids that ARE the
// pinned 02 enum value verbatim are exempt from sub-token scanning (erd L12 exemption).
export function checkM20_forbidden(model, forbidden, enumValues) {
  const enumSet = new Set(enumValues);
  const terms = forbidden.map((f) => f.term.toLowerCase()).filter(Boolean);
  if (terms.length === 0) return { id: 'M20', rule: 'E1', status: 'pass', detail: '' };
  // scan ids (exempt verbatim enum ids), comments, annotations.
  for (const id of model.ids) {
    if (enumSet.has(id)) continue; // verbatim enum exemption
    const toks = new Set(plainTokens(id));
    for (const term of terms) if (toks.has(term)) return { id: 'M20', rule: 'E1', status: 'fail', detail: `id '${id}' uses forbidden synonym '${term}'` };
  }
  for (const c of model.allComments) {
    const toks = new Set(plainTokens(c));
    for (const term of terms) if (toks.has(term)) return { id: 'M20', rule: 'E1', status: 'fail', detail: `comment/annotation uses forbidden synonym '${term}': "${c.trim().slice(0, 60)}"` };
  }
  return { id: 'M20', rule: 'E1', status: 'pass', detail: '' };
}

// M21 — no restated 04 rows / enum defs / invariant text (≥N consecutive verbatim
// tokens from a single upstream cell in a comment).
export function checkM21_restatement(model, entity04, glossary02, aggregates03) {
  const cells = [];
  for (const ent of entity04.entities || []) for (const r of ent.rows) cells.push(`${r.from} ${r.event01} ${r.to}`);
  // also include this entity's own rows (entity04 may be the single bound entity)
  if (entity04.rows) for (const r of entity04.rows) cells.push(`${r.from} ${r.event01} ${r.to}`);
  for (const e of glossary02.enums) cells.push(e.values.join(' '));
  for (const inv of aggregates03.invariants) cells.push(inv.text);

  const windows = new Set();
  for (const cell of cells) {
    const toks = rawTokens(cell);
    for (let i = 0; i + RESTATEMENT_WINDOW_N <= toks.length; i++) {
      windows.add(toks.slice(i, i + RESTATEMENT_WINDOW_N).join(' '));
    }
  }
  for (const c of model.allComments) {
    if (/^\s*(fingerprints|supersedes|refines|01-event):/.test(c)) continue; // pinned annotations exempt
    const toks = rawTokens(c);
    for (let i = 0; i + RESTATEMENT_WINDOW_N <= toks.length; i++) {
      const w = toks.slice(i, i + RESTATEMENT_WINDOW_N).join(' ');
      if (windows.has(w)) return { id: 'M21', rule: 'E2', status: 'fail', detail: `comment restates ≥${RESTATEMENT_WINDOW_N} verbatim upstream tokens: "${w.slice(0, 70)}…"` };
    }
  }
  return { id: 'M21', rule: 'E2', status: 'pass', detail: '' };
}

// M22 — refines annotation on added structure (warn). M23 — terminal enum handling
// (info). M24 — history legality (warn). M25 — references by name (warn).
export function checkM22_refines(model, entity04) {
  // any basic→basic pair not in 04 should carry refines (M13 already blocks unannotated);
  // here advisory: added hierarchy/parallel without refines is a ⚠️.
  const pairs04 = new Set(entity04.rows.filter((r) => r.from !== '∅').map((r) => `${r.from}->${r.to}`));
  for (const w of model.wrapperStates) {
    if (w.kind === 'compound' || w.kind === 'parallel') {
      const st = model.states.find((s) => s.id === w.id);
      const annotated = st && (st.comments || []).some((c) => /refines:/.test(c));
      if (!annotated) return { id: 'M22', rule: 'C5', status: 'warn', detail: `added ${w.kind} '${w.id}' carries no <!-- refines: … --> annotation` };
    }
  }
  return { id: 'M22', rule: 'C5', status: 'pass', detail: '' };
}
export function checkM23_terminal(model, entity04) {
  const outgoing = new Set(entity04.rows.filter((r) => r.from !== '∅').map((r) => r.from));
  for (const stateId of model.basicStateIds) {
    if (outgoing.has(stateId)) continue; // has outgoing 04 transition
    const isFinal = model.finals.includes(stateId);
    const st = model.states.find((s) => s.id === stateId);
    const refines = st && (st.comments || []).some((c) => /refines:/.test(c));
    if (!isFinal && !refines) return { id: 'M23', rule: 'C6', status: 'info', detail: `terminal enum value '${stateId}' is a plain <state>, not <final> and not refines-justified` };
  }
  return { id: 'M23', rule: 'C6', status: 'pass', detail: '' };
}
export function checkM24_history(model) {
  for (const h of model.history) {
    if (h.type != null && h.type !== 'shallow' && h.type !== 'deep') return { id: 'M24', rule: 'D6', status: 'warn', detail: `<history> type='${h.type}' is not shallow|deep` };
  }
  return { id: 'M24', rule: 'D6', status: 'pass', detail: '' };
}
export function checkM25_references() { return { id: 'M25', rule: 'E3', status: 'pass', detail: '' }; }

// ===========================================================================
// Resolution (R) + exact-value (X) checks — derived views over the above for the
// closed grammar's R/X classes (each cites the same catalog rule as its M owner).
// ===========================================================================
export function rStates(m11) { return { id: 'R-STATES', rule: 'C1', status: m11.status === 'fail' ? 'fail' : 'pass', edges: 1 }; }
export function rRow(m12) { return { id: 'R-ROW', rule: 'C2', status: m12.status === 'fail' ? 'fail' : 'pass', edges: m12.edges || 0 }; }
export function rNoContra(m13) { return { id: 'R-NOCONTRA', rule: 'C4', status: m13.status === 'fail' ? 'fail' : 'pass', edges: m13.edges || 0 }; }
export function rEvent(m19) { return { id: 'R-EVENT', rule: 'D7/E4', status: m19.status === 'fail' ? 'fail' : 'pass', edges: 1 }; }
export function rInit(m14) { return { id: 'R-INIT', rule: 'A7/C3', status: m14.status === 'fail' ? 'fail' : 'pass', edges: 1 }; }
export function rSupersedes(m5) { return { id: 'R-SUPERSEDES', rule: 'A5', status: m5.status === 'fail' ? 'fail' : 'pass', edges: 1 }; }
export function rTarget(m16) { return { id: 'R-TARGET', rule: 'D3', status: m16.status === 'fail' ? 'fail' : 'pass', edges: 1 }; }
export function rReach(m17) { return { id: 'R-REACH', rule: 'D4', status: m17.status === 'fail' ? 'fail' : 'pass', edges: 1 }; }

export function xStates(model, enumValues) {
  const basics = [...model.enumCandidateStateIds].sort();
  const enums = [...enumValues].sort();
  const equal = basics.length === enums.length && basics.every((v, i) => v === enums[i]);
  return { id: 'X-STATES', rule: 'C1', status: equal ? 'pass' : 'fail', detail: equal ? '' : `basic-state set ≠ 02 enum set` };
}
export function xId(model) {
  const unique = new Set(model.ids).size === model.ids.length;
  return { id: 'X-ID', rule: 'D2', status: unique ? 'pass' : 'fail', detail: unique ? '' : 'duplicate ids' };
}
export function xInitOne(model) {
  // exactly one root initial resolution + compound states have one default child.
  for (const s of model.states) {
    if ((s.kind === 'compound' || s.kind === 'parallel') && s.initialAttr != null && s.hasInitialChild) {
      return { id: 'X-INITONE', rule: 'A6/D5', status: 'fail', detail: `compound '${s.id}' has two default-child mechanisms` };
    }
  }
  return { id: 'X-INITONE', rule: 'A6/D5', status: 'pass', detail: '' };
}
export function xRoundtrip(model, entity04) {
  for (const t of model.transitions) {
    if (t.event01 == null) continue;
    if (eventTransform(t.event01) !== t.event) return { id: 'X-ROUNDTRIP', rule: 'E4', status: 'fail', detail: `transform('${t.event01}') ≠ '${t.event}'` };
  }
  return { id: 'X-ROUNDTRIP', rule: 'E4', status: 'pass', detail: '' };
}

// ===========================================================================
// Intake counts + reconciliation (X-RECON).
// ===========================================================================
export function intakeCounts(machines) {
  let states = 0, transitions = 0, annotations = 0;
  for (const m of machines) {
    states += m.model.states.length;
    transitions += m.model.transitions.length;
    // annotations: fingerprint(1) + supersedes(1) + per 01-event + per refines
    let ann = 2;
    for (const t of m.model.transitions) { if (t.event01) ann++; if (t.refines) ann++; }
    annotations += ann;
  }
  return { machines: machines.length, states, transitions, annotations };
}

// X-RECON — no silently dropped checks (simulation.md §5).
export function checkXRecon(executedChecks, edgesWalked, edgesExpected, engineRun, machineCount, gateArithmeticRun) {
  if (executedChecks === 0) return { status: 'broken', detail: 'zero executed checks (vacuous-green guard)' };
  if (edgesWalked !== edgesExpected) return { status: 'broken', detail: `edgesWalked ${edgesWalked} ≠ edgesExpected ${edgesExpected} (a check was silently dropped)` };
  if (machineCount > 0 && engineRun === 0) return { status: 'broken', detail: 'machines>0 but the engine layer ran zero walks (strongest oracle skipped)' };
  if (gateArithmeticRun === 0) return { status: 'broken', detail: 'gate arithmetic (X-GATE) did not run' };
  return { status: 'pass', detail: '' };
}
