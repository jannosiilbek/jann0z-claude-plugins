// checks.mjs — the closed assertion grammar for the task-models oracle (simulation.md §4).
// Mechanical (M1–M29), resolution (R-TAG / R-FP), exact-value/bijection (M-BIJ / M-ATTR /
// X-ID / X-BUDGET-INT / X-RECON), and the upstream self-checks (§9 dup-job-07 / bad-tag-06).
// The walker checks (W-*) live in walker.mjs. Every check cites its catalog rule. This
// grammar is NEVER extended ad hoc — adding a check edits this file + simulation.md §4.
//
// Copied scaffold from the sibling personas/statecharts checks.mjs (the {id, rule, status,
// detail, edges} record shape), re-pinned to the 08 dialect.

import * as L from './lexicon.mjs';

const ok = (id, rule, edges = 0) => ({ id, rule, status: 'pass', detail: '', edges });
const bad = (id, rule, detail, edges = 0) => ({ id, rule, status: 'fail', detail, edges });
export { bad }; // the harness's anchor guard (A3/M3) constructs an M3 fail record directly.
const warn = (id, rule, detail) => ({ id, rule, status: detail ? 'warn' : 'pass', detail: detail || '' });
const info = (id, rule, detail) => ({ id, rule, status: detail ? 'info' : 'pass', detail: detail || '' });

// ===========================================================================
// MECHANICAL (M*) — per-model, no-walker shape rules over the parsed xml model +
// the built walker model. Each takes (xmlModel, model, ctx) as needed.
// ===========================================================================

// M2 — fingerprint block present & complete (A2).
export function checkM2(xmlModel, referencedFeatures) {
  if (!xmlModel.fingerprintComment) return bad('M2', 'A2', 'missing leading `<!-- fingerprints: … -->` comment block');
  const entries = (xmlModel._fpEntries || []);
  const files = entries.map((e) => e.file);
  const malformed = entries.filter((e) => e.malformed);
  if (malformed.length) return bad('M2', 'A2', `fingerprint entry without a `+"`<path> sha256:<token>`"+` shape: '${malformed[0].raw}'`);
  for (const e of entries) {
    if (!L.isValidDigest(e.hash)) return bad('M2', 'A2', `fingerprint for '${e.file}' lacks a valid sha256 (got '${e.hash}')`);
  }
  if (!files.some((f) => /07-personas\.md$/.test(f))) {
    return bad('M2', 'A2', 'fingerprint block omits specs/07-personas.md');
  }
  for (const feat of referencedFeatures) {
    if (!files.some((f) => f.endsWith(feat) || f.endsWith('/' + feat))) {
      return bad('M2', 'A2', `fingerprint block omits referenced 06 feature '${feat}'`);
    }
  }
  return ok('M2', 'A2');
}

// M3 — root TaskModel with required attrs (A3).
export function checkM3(model) {
  if (model.persona == null || model.job == null || model.id == null) {
    const miss = ['id', 'persona', 'job'].filter((a) => model[a] == null);
    return bad('M3', 'A3', `<TaskModel> missing required attr(s): ${miss.join(', ')}`);
  }
  return ok('M3', 'A3');
}

// M4 — id is the canonical slug (A4).
export function checkM4(model, fileStem) {
  const want = L.slug(model.persona || '', model.job || '');
  if (model.id !== want) return bad('M4', 'A4', `@id '${model.id}' ≠ canonical slug '${want}'`);
  if (fileStem != null && model.id !== fileStem) return bad('M4', 'A4', `@id '${model.id}' ≠ filename stem '${fileStem}'`);
  return ok('M4', 'A4');
}

// M5 — exactly one <Budget klm="<int>"/> as the first child of TaskModel (A5).
export function checkM5(xmlModel, model) {
  if (model.budgetEls.length !== 1) return bad('M5', 'A5', `expected exactly one <Budget>, found ${model.budgetEls.length}`);
  const firstTaskChild = xmlModel.root.children.find((c) => c.name === 'Task' || c.name === 'Budget');
  if (!firstTaskChild || firstTaskChild.name !== 'Budget') return bad('M5', 'A5', '<Budget> is not the first child of <TaskModel>');
  const klm = model.budgetEls[0].attrs.klm;
  if (klm == null || !/^\d+$/.test(klm)) return bad('M5', 'A5', `<Budget> klm is not a non-negative integer (got '${klm}')`);
  return ok('M5', 'A5');
}

// M6 — exactly one root <Task> after <Budget> (A6).
export function checkM6(model) {
  if (model.rootTaskCount !== 1) return bad('M6', 'A6', `expected exactly one root <Task>, found ${model.rootTaskCount}`);
  return ok('M6', 'A6');
}

// M7 — every Task has a unique id and a legal category (A7); X-ID companion.
export function checkM7(model) {
  for (const t of model.tasks) {
    if (t.id == null) return bad('M7', 'A7', 'a <Task> lacks an id attribute');
    if (t.category == null || !L.CATEGORIES.has(t.category)) {
      return bad('M7', 'A7', `<Task id="${t.id}"> has illegal category '${t.category}' (not in {abstract,user,interaction,system})`);
    }
  }
  return ok('M7', 'A7');
}

// M8 — no unknown elements or attributes (A8).
export function checkM8(xmlModel, model) {
  for (const name of xmlModel.elementNames) {
    if (!L.ELEMENTS.has(name)) return bad('M8', 'A8', `unknown element <${name}> (only TaskModel/Budget/Task allowed)`);
  }
  for (const key of xmlModel.taskAttrKeys) {
    if (!L.TASK_ATTRS.has(key)) return bad('M8', 'A8', `unknown <Task> attribute '${key}'`);
  }
  return ok('M8', 'A8');
}

// M9 — leaf is never abstract; leaf category in the leaf set (B1, B5).
export function checkM9(model) {
  for (const t of model.tasks) {
    if (t.children.length === 0) {
      if (!L.LEAF_CATEGORIES.has(t.category)) {
        return bad('M9', 'B1', `leaf <Task id="${t.id}"> has category '${t.category}' (a leaf must be interaction/system/user)`);
      }
    }
  }
  return ok('M9', 'B1');
}

// M10 — abstract has ≥2 children (B2).
export function checkM10(model) {
  for (const t of model.tasks) {
    if (t.category === 'abstract' && t.children.length < 2) {
      return bad('M10', 'B2', `abstract <Task id="${t.id}"> has ${t.children.length} child task(s) (needs ≥2)`);
    }
  }
  return ok('M10', 'B2');
}

// M11 — single rooted tree, no orphans, no cycles (B4); non-terminating job guard (B6). The
// reader already guarantees a single rooted XML tree; this confirms the Task containment is a
// tree (no shared/cyclic id) AND that the job itself terminates. A tree-structured input
// CANNOT express a containment cycle (the reader builds a strict tree), so B6's CONSTRUCTIBLE
// non-termination smell is an *iteratively-unbounded ROOT task*: the root task IS the job
// (A6 — one root Task per model = the job itself), so `iterative="true"` (or a numeric count)
// on the ROOT is an unbounded job loop with no terminating nominal path. M11 owns B6 here;
// the walker's W-TERM remains the bounded-step descent guard, no longer B6's owner.
export function checkM11(model) {
  const seen = new Set();
  let cycle = null;
  const walk = (t, ancestors) => {
    if (t.id != null && ancestors.has(t.id)) { cycle = t.id; return; }
    const next = new Set(ancestors);
    if (t.id != null) next.add(t.id);
    seen.add(t);
    for (const c of t.children) walk(c, next);
  };
  if (model.rootTask) walk(model.rootTask, new Set());
  if (cycle) return bad('M11', 'B6', `task containment cycle at id '${cycle}'`);
  if (model.rootTask && model.rootTask.iterative != null) {
    return bad('M11', 'B6', `root <Task id="${model.rootTask.id}"> is iteratively unbounded (iterative='${model.rootTask.iterative}') — the root task IS the job, so an unboundedly iterative job has no terminating nominal path`);
  }
  if (seen.size !== model.tasks.length) return bad('M11', 'B4', 'an orphan <Task> is not reachable from the single root');
  return ok('M11', 'B4');
}

// M12 — operator only on ≥2-child tasks (C1).
export function checkM12(model) {
  for (const t of model.tasks) {
    if (t.operator != null && t.children.length < 2) {
      return bad('M12', 'C1', `<Task id="${t.id}"> carries operator='${t.operator}' but has ${t.children.length} child task(s) (<2)`);
    }
  }
  return ok('M12', 'C1');
}

// M13 — ≥2-child tasks carry an operator (C2).
export function checkM13(model) {
  for (const t of model.tasks) {
    if (t.children.length >= 2 && t.operator == null) {
      return bad('M13', 'C2', `<Task id="${t.id}"> has ${t.children.length} children but no operator`);
    }
  }
  return ok('M13', 'C2');
}

// M14 — operator value in the pinned 9-set (C3).
export function checkM14(model) {
  for (const t of model.tasks) {
    if (t.operator != null && !L.OPERATORS.has(t.operator)) {
      return bad('M14', 'C3', `<Task id="${t.id}"> operator='${t.operator}' is not in the pinned 9-set`);
    }
  }
  return ok('M14', 'C3');
}

// M15 — unary operators are attributes; iterative/optional values legal (C4).
export function checkM15(model) {
  for (const t of model.tasks) {
    if (t.operator === 'iterative' || t.operator === 'optional') {
      return bad('M15', 'C4', `<Task id="${t.id}"> uses unary '${t.operator}' as an N-ary operator`);
    }
    if (t.iterative != null && !(t.iterative === 'true' || t.iterative === 'false' || /^[1-9]\d*$/.test(t.iterative))) {
      return bad('M15', 'C4', `<Task id="${t.id}"> iterative='${t.iterative}' (not true/false/positive-integer)`);
    }
    if (t.optional != null && !(t.optional === 'true' || t.optional === 'false')) {
      return bad('M15', 'C4', `<Task id="${t.id}"> optional='${t.optional}' (not true/false)`);
    }
  }
  return ok('M15', 'C4');
}

// M16 — every leaf carries a klm attribute (D1).
export function checkM16(model) {
  for (const t of model.leaves) {
    if (t.klm == null) return bad('M16', 'D1', `leaf <Task id="${t.id}"> lacks a klm attribute`);
  }
  return ok('M16', 'D1');
}

// M17 — klm over the closed alphabet (D2).
export function checkM17(model) {
  for (const t of model.leaves) {
    if (t.klm == null) continue; // M16 owns absence
    const r = L.tokenizeKlm(t.klm);
    if (!r.ok) return bad('M17', 'D2', `leaf <Task id="${t.id}"> klm='${t.klm}': ${r.detail}`);
  }
  return ok('M17', 'D2');
}

// M18 — non-leaf tasks carry no klm (D3).
export function checkM18(model) {
  for (const t of model.tasks) {
    if (t.children.length > 0 && t.klm != null) {
      return bad('M18', 'D3', `non-leaf <Task id="${t.id}"> carries klm='${t.klm}'`);
    }
  }
  return ok('M18', 'D3');
}

// M19 — M-placement convention (D4): one leading M on interaction/user leaves, no other M;
// zero M on system leaves.
export function checkM19(model) {
  for (const t of model.leaves) {
    if (t.klm == null) continue;
    const p = L.mProfile(t.klm);
    if (!p.ok) continue; // M17 owns malformed klm
    if (t.category === 'interaction' || t.category === 'user') {
      if (!p.leadingM) return bad('M19', 'D4', `${t.category} leaf <Task id="${t.id}"> klm='${t.klm}' does not begin with M`);
      if (p.mCount !== 1) return bad('M19', 'D4', `${t.category} leaf <Task id="${t.id}"> klm='${t.klm}' has ${p.mCount} M's (needs exactly one leading M)`);
    } else if (t.category === 'system') {
      if (p.mCount !== 0) return bad('M19', 'D4', `system leaf <Task id="${t.id}"> klm='${t.klm}' contains an illegal M`);
    }
  }
  return ok('M19', 'D4');
}

// M20 — nK multiplier is a positive integer on K only (D7). (tokenizeKlm enforces this;
// M20 reports it under its own owner so D7 has a dedicated check.)
export function checkM20(model) {
  for (const t of model.leaves) {
    if (t.klm == null) continue;
    const r = L.tokenizeKlm(t.klm);
    if (!r.ok && /multiplier/.test(r.detail)) return bad('M20', 'D7', `leaf <Task id="${t.id}"> klm='${t.klm}': ${r.detail}`);
  }
  return ok('M20', 'D7');
}

// M21 — every leaf has ≥1 non-empty scenario-tags entry (E3).
export function checkM21(model) {
  for (const t of model.leaves) {
    if (!t.scenarioTags || t.scenarioTags.length === 0) {
      return bad('M21', 'E3', `leaf <Task id="${t.id}"> has no scenario-tags`);
    }
  }
  return ok('M21', 'E3');
}

// M22 — scenario-tags tokens match the closed 06 grammar (E5).
export function checkM22(model) {
  for (const t of model.leaves) {
    for (const tag of t.scenarioTags) {
      if (!L.isLegalTag(tag)) return bad('M22', 'E5', `leaf <Task id="${t.id}"> tag '${tag}' matches no closed 06 grammar class`);
    }
  }
  return ok('M22', 'E5');
}

// M23 — no restated scenario text (F1): a Gherkin keyword line in any Task attr or comment.
export function checkM23(xmlModel, model) {
  for (const t of model.tasks) {
    for (const v of [t.id, t.category, t.operator, t.klm, ...(t.scenarioTags || [])]) {
      if (L.hasGherkinKeyword(v)) return bad('M23', 'F1', `<Task id="${t.id}"> attribute contains a Gherkin keyword line ('${v}')`);
    }
  }
  for (const c of xmlModel.allComments) {
    if (/^\s*fingerprints\s*:/.test(c)) continue;
    if (L.hasGherkinKeyword(c)) return bad('M23', 'F1', `a comment restates a Gherkin step line`);
  }
  return ok('M23', 'F1');
}

// M24 — no invented vocabulary (F2). The residue beyond M3/M14/M17/M22/M-ATTR: a category /
// operator / klm token already covered above; here we confirm no category token off the
// 4-set survives (the residual owner). In practice M7/M14/M17/M22 catch the concrete
// invented tokens; M24 is the catch-all assertion that every category is owned.
export function checkM24(model) {
  for (const t of model.tasks) {
    if (t.category != null && !L.CATEGORIES.has(t.category)) {
      return bad('M24', 'F2', `<Task id="${t.id}"> category '${t.category}' is invented vocabulary`);
    }
  }
  return ok('M24', 'F2');
}

// M25 — root task category is abstract for decomposed jobs (A9; warn).
export function checkM25(model) {
  if (model.rootTask && model.rootTask.children.length > 0 && model.rootTask.category !== 'abstract') {
    return warn('M25', 'A9', `root <Task id="${model.rootTask.id}"> has children but category='${model.rootTask.category}' (expected abstract)`);
  }
  return warn('M25', 'A9', '');
}

// M26 — non-trivial job decomposes ≥2 levels (B3; warn).
export function checkM26(model, scenarioCountForJob) {
  if (!model.rootTask) return warn('M26', 'B3', '');
  const childrenAllLeaves = model.rootTask.children.length > 0 && model.rootTask.children.every((c) => c.children.length === 0);
  if (childrenAllLeaves && scenarioCountForJob > 1) {
    return warn('M26', 'B3', `root's children are all leaves while the job's 06 feature has ${scenarioCountForJob} scenarios (expected ≥2-level decomposition)`);
  }
  return warn('M26', 'B3', '');
}

// M27 — abstract decomposition refines, not relabels (B7; info).
export function checkM27(model) {
  for (const t of model.tasks) {
    if (t.category === 'abstract' && t.children.length >= 2) {
      const cats = new Set(t.children.map((c) => c.category));
      if (cats.size === 1 && t.children.every((c) => c.children.length === 0 && c.id === t.id)) {
        return info('M27', 'B7', `abstract <Task id="${t.id}"> children trivially relabel the parent`);
      }
    }
  }
  return info('M27', 'B7', '');
}

// M28 — task ids are descriptive kebab slugs (F3; warn).
export function checkM28(model) {
  for (const t of model.tasks) {
    if (t.id != null && !L.isKebabLabel(t.id)) {
      return warn('M28', 'F3', `<Task id="${t.id}"> is not a kebab-case label`);
    }
  }
  return warn('M28', 'F3', '');
}

// M29 — one model = one job (F4; info). Advisory residue (gross cross-job overlap only).
export function checkM29() {
  return info('M29', 'F4', '');
}

// ===========================================================================
// RESOLUTION (R-TAG / R-FP) — cross-artifact edges into 06.
// ===========================================================================

// R-TAG — every leaf scenario-tags token ∈ tags06 (E4). edges = Σ tokens. Scans ALL tokens
// (never early-returns) so the edge count is complete even on failure (reconciliation).
export function checkRTag(model, tags06) {
  let edges = 0;
  let firstGhost = null;
  for (const t of model.leaves) {
    for (const tag of t.scenarioTags) {
      edges++;
      if (!L.isLegalTag(tag)) continue; // M22 owns grammar; only resolve well-formed tags
      if (!tags06.has(tag) && firstGhost == null) {
        firstGhost = `leaf <Task id="${t.id}"> tag '${tag}' is absent from the 06 suite`;
      }
    }
  }
  if (firstGhost) return { ...bad('R-TAG', 'E4', firstGhost), edges };
  return { ...ok('R-TAG', 'E4'), edges };
}

// R-FP — each referenced feature is fingerprinted; each fingerprinted feature contributes
// ≥1 referenced tag (E7; warn). edges = |referenced features|.
export function checkRFp(xmlModel, referencedFeatures, fingerprintedFeatures) {
  const edges = referencedFeatures.length;
  const fpSet = fingerprintedFeatures;
  for (const feat of referencedFeatures) {
    if (![...fpSet].some((f) => f.endsWith(feat) || f.endsWith('/' + feat))) {
      return { id: 'R-FP', rule: 'E7', status: 'warn', detail: `referenced feature '${feat}' is not fingerprinted`, edges };
    }
  }
  // each fingerprinted .feature must contribute ≥1 referenced tag.
  for (const f of fpSet) {
    if (!/\.feature$/.test(f)) continue;
    const baseFeat = f.split('/').pop();
    if (!referencedFeatures.includes(baseFeat)) {
      return { id: 'R-FP', rule: 'E7', status: 'warn', detail: `fingerprinted feature '${f}' contributes no referenced tag`, edges };
    }
  }
  return { id: 'R-FP', rule: 'E7', status: 'pass', detail: '', edges };
}

// ===========================================================================
// EXACT-VALUE / BIJECTION (M-BIJ / M-ATTR / X-ID / X-BUDGET-INT).
// ===========================================================================

// M-BIJ — the set of 08 file slugs deep-equals personaJobs07 slugs (both ways) (E1).
// Returns { id, rule, status, detail, edges, missing:[], extra:[] }.
export function checkMBij(fileSlugs, personaJobs07) {
  const want = new Set(personaJobs07.map((pj) => L.slug(pj.persona, pj.job)));
  const have = new Set(fileSlugs);
  const missing = [...want].filter((s) => !have.has(s));
  const extra = [...have].filter((s) => !want.has(s));
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`07 pair(s) with no 08 file: ${missing.join(', ')}`);
    if (extra.length) parts.push(`08 file(s) with no 07 pair: ${extra.join(', ')}`);
    return { id: 'M-BIJ', rule: 'E1', status: 'fail', detail: parts.join('; '), edges: 1, missing, extra };
  }
  return { id: 'M-BIJ', rule: 'E1', status: 'pass', detail: '', edges: 1, missing, extra };
}

// M-ATTR — @persona is a verbatim 07 ### name AND @job a verbatim Job cell OF THAT persona
// (E2). edges = 1 per model.
export function checkMAttr(model, personaJobs07) {
  const personaNames = new Set(personaJobs07.map((pj) => pj.persona));
  if (!personaNames.has(model.persona)) {
    return { ...bad('M-ATTR', 'E2', `@persona '${model.persona}' is not a verbatim 07 ### <PersonaName>`), edges: 1 };
  }
  const jobsOfPersona = new Set(personaJobs07.filter((pj) => pj.persona === model.persona).map((pj) => pj.job));
  if (!jobsOfPersona.has(model.job)) {
    return { ...bad('M-ATTR', 'E2', `@job '${model.job}' is not a verbatim Job cell of persona '${model.persona}'`), edges: 1 };
  }
  return { ...ok('M-ATTR', 'E2'), edges: 1 };
}

// X-ID — every Task/@id unique within a document (A7).
export function checkXId(model) {
  const ids = model.tasks.map((t) => t.id).filter((x) => x != null);
  const set = new Set(ids);
  if (set.size !== ids.length) {
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    return bad('X-ID', 'A7', `duplicate Task id '${dup}'`);
  }
  return ok('X-ID', 'A7');
}

// X-BUDGET-INT — <Budget klm> parses as a single non-negative integer (A5).
export function checkXBudgetInt(model) {
  if (model.budget == null || !/^\d+$/.test(String(model.budget))) {
    return bad('X-BUDGET-INT', 'A5', `<Budget klm> is not a non-negative integer (got '${model.budget}')`);
  }
  return ok('X-BUDGET-INT', 'A5');
}

// ===========================================================================
// X-RECON — no silently dropped checks (§5).
// ===========================================================================
export function checkXRecon(executedChecks, edgesWalked, edgesExpected, walkerRun, modelCount) {
  if (executedChecks === 0) return { status: 'broken', detail: 'zero checks executed' };
  if (edgesWalked !== edgesExpected) return { status: 'broken', detail: `edgesWalked ${edgesWalked} ≠ edgesExpected ${edgesExpected}` };
  if (modelCount > 0 && walkerRun === 0) return { status: 'broken', detail: 'walker layer ran zero walks over a non-empty artifact (strongest oracle skipped)' };
  return { status: 'pass', detail: '' };
}

// ===========================================================================
// UPSTREAM SELF-CHECKS (§9) — run BEFORE 08→upstream resolution.
// ===========================================================================

// 07 persona-job set collision-free (§9.1): the cartesian yields distinct slugs.
// A duplicate (persona, job) pair ⇒ filename collision ⇒ upstream-defect → 07-personas.md.
export function upstream07SelfCheck(personaJobs07) {
  const seen = new Map();
  const defects = [];
  for (const pj of personaJobs07) {
    const s = L.slug(pj.persona, pj.job);
    if (seen.has(s)) defects.push({ slug: s, persona: pj.persona, job: pj.job });
    else seen.set(s, pj);
  }
  return { ok: defects.length === 0, defects };
}

// 06 scenario tags well-formed (§9.2): every collected tag matches a closed grammar class.
// A bad tag ⇒ upstream-defect → the named .feature.
export function upstream06SelfCheck(scan) {
  return { ok: scan.badTags.length === 0, defects: scan.badTags };
}

// ===========================================================================
// INTAKE / COVERAGE helpers.
// ===========================================================================
export function intakeCounts(models) {
  let tasks = 0, leaves = 0, tags = 0;
  for (const m of models) {
    if (m.ok === false) continue; // un-anchored model (A3/M3): no countable tasks/leaves/tags
    tasks += m.tasks.length;
    leaves += m.leaves.length;
    for (const l of m.leaves) tags += l.scenarioTags.length;
  }
  return { models: models.length, tasks, leaves, tags, budgets: models.length };
}
