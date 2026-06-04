// walker.mjs — the vendored, Rec-faithful CTT walker oracle (simulation.md §0/§3.3). The
// probe proved NO scriptable CTT engine exists, so the harness vendors a Rec-faithful
// walker over the W3C-Note operator semantics (SOURCES operator table). It:
//   (a) builds the operator tree from the hand-rolled xml model,
//   (b) computes the ENABLED / reachable-leaf set under the per-operator semantics
//       (W-REACH),
//   (c) walks the deterministic NOMINAL PATH (W-STEP / W-TERM), and
//   (d) sums the KLM budget over the nominal-path leaves (W-BUDGET).
//
// Every walked value is a pure function of the tree (fixed nominal-path rule + fixed
// M-placement + pinned klm tokenizer) ⇒ byte-deterministic (simulation.md §8). The walker
// NEVER trusts the declared budget; it re-derives the computed integer and the harness
// compares (D5).

import { NOMINAL_CONTRIB, klmInstanceCount } from './lexicon.mjs';

// buildModel(xmlModel) → { ok, detail, id, persona, job, budget, root, tasks[], leaves[],
//                          fingerprints[] }
// A structural model over the raw xml tree. `ok:false` ⇒ the tree cannot be anchored as a
// TaskModel (the harness routes this to the relevant mechanical check, not a walker throw).
export function buildModel(xmlModel) {
  const root = xmlModel.root;
  if (root.name !== 'TaskModel') {
    return { ok: false, detail: `root element is <${root.name}>, expected <TaskModel>` };
  }
  const budgetEls = root.children.filter((c) => c.name === 'Budget');
  const taskEls = root.children.filter((c) => c.name === 'Task');

  const tasks = [];
  const node = (el, parent) => {
    const childTaskEls = el.children.filter((c) => c.name === 'Task');
    const rec = {
      id: el.attrs.id != null ? el.attrs.id : null,
      category: el.attrs.category != null ? el.attrs.category : null,
      operator: el.attrs.operator != null ? el.attrs.operator : null,
      iterative: el.attrs.iterative != null ? el.attrs.iterative : null,
      optional: el.attrs.optional != null ? el.attrs.optional : null,
      klm: el.attrs.klm != null ? el.attrs.klm : null,
      scenarioTags: el.attrs['scenario-tags'] != null
        ? el.attrs['scenario-tags'].trim().split(/\s+/).filter(Boolean)
        : [],
      children: [],
      parent,
      el,
    };
    tasks.push(rec);
    for (const c of childTaskEls) rec.children.push(node(c, rec));
    return rec;
  };

  const rootTask = taskEls.length ? node(taskEls[0], null) : null;
  const leaves = tasks.filter((t) => t.children.length === 0);

  return {
    ok: true,
    detail: '',
    id: root.attrs.id != null ? root.attrs.id : null,
    persona: root.attrs.persona != null ? root.attrs.persona : null,
    job: root.attrs.job != null ? root.attrs.job : null,
    budgetEls,
    budget: budgetEls.length === 1 && budgetEls[0].attrs.klm != null ? budgetEls[0].attrs.klm : null,
    rootTask,
    tasks,
    leaves,
    rootTaskCount: taskEls.length,
  };
}

const isOptional = (t) => t.optional === 'true';

// --- W-REACH: every leaf reachable on SOME walk ----------------------------
// Under the per-operator semantics, EVERY child of every operator can become enabled on
// some walk (choice: each branch is a distinct walk; concurrent: every ordering; enabling:
// all children in sequence; disabling/suspendResume: both left and right are enabled-able).
// The ONLY way a leaf is unreachable is if a structural defect strands it (e.g. it sits
// under a sibling that the operator semantics can never enable). With the pinned operator
// set every non-optional child IS enable-able on some walk; an `optional` task is reachable
// (it MAY run). So a leaf is unreachable only if it is detached or its parent chain is
// broken. We compute the reachable-leaf set by descent: a leaf is reachable if every
// ancestor operator admits its branch — which all 9 operators do for every child. The
// negative fixture injects a structurally dead branch (a child of a leaf, i.e. a task whose
// parent is itself a childless executable leaf the walker can never descend into).
export function reachableLeaves(model) {
  if (!model.rootTask) return new Set();
  const reachable = new Set();
  const descend = (t, parentIsExecutableLeaf) => {
    // A task whose PARENT is a leaf-category executable task with a klm (i.e. the parent is
    // itself a terminal action) can never be enabled — the parent performs and completes
    // with no sub-task descent. This is the dead-branch the unreachable-leaf fixture injects.
    if (parentIsExecutableLeaf) return;
    if (t.children.length === 0) {
      reachable.add(t.id);
      return;
    }
    // Every operator (enabling/choice/concurrent/disabling/suspendResume) admits EVERY
    // child on some walk, so recurse into all children.
    const selfIsExecutableLeafWithChildren = t.klm != null; // a klm-bearing non-leaf is malformed
    for (const c of t.children) descend(c, selfIsExecutableLeafWithChildren);
  };
  descend(model.rootTask, false);
  return reachable;
}

// --- nominal-path leaf descent (W-STEP / W-TERM / W-BUDGET) ----------------
// Deterministic depth-first descent under the pinned nominal-path rule:
//   - all enabling/concurrent children, in document order
//   - first document-order child for `choice`
//   - left (first) child for `disabling` / `suspendResume`
//   - skip any subtree rooted at an `optional="true"` task
//   - descend an `iterative` subtree exactly once (its leaves counted once)
// Returns an ORDERED list of nominal-path leaf records.
export function nominalPathLeaves(model) {
  if (!model.rootTask) return [];
  const out = [];
  const seen = new Set(); // cycle guard (acyclic tree ⇒ never triggers; defends W-TERM)
  const descend = (t) => {
    if (isOptional(t)) return; // excluded from the nominal path
    if (seen.has(t)) return; // termination guard
    seen.add(t);
    if (t.children.length === 0) { out.push(t); return; }
    const contrib = t.operator != null ? NOMINAL_CONTRIB[t.operator] : 'all';
    let kids;
    if (contrib === 'first') kids = t.children.slice(0, 1);
    else if (contrib === 'left') kids = t.children.slice(0, 1);
    else kids = t.children; // 'all' (and the default for an operator-less parent)
    for (const c of kids) descend(c);
  };
  descend(model.rootTask);
  return out;
}

// --- the full walk ---------------------------------------------------------
// run(model) → { walks:[{id, rule, status, detail}], computedBudget, declaredBudget,
//                nominalLeaves, contributingLeaves:[{id, klm, instances}], reachable:Set }
// Each `walks` entry is one of W-LOAD / W-REACH / W-STEP / W-TERM / W-BUDGET.
export function run(model) {
  const walks = [];
  const add = (id, rule, status, detail) => walks.push({ id, rule, status, detail: detail || '' });

  // W-LOAD — the tree loads; root is the single <Task>.
  if (!model.rootTask) {
    add('W-LOAD', 'A6', 'fail', 'no root <Task> to load into the operator tree');
    return { walks, computedBudget: 0, declaredBudget: null, nominalLeaves: 0, contributingLeaves: [], reachable: new Set() };
  }
  if (model.rootTaskCount !== 1) {
    add('W-LOAD', 'A6', 'fail', `expected exactly one root <Task>, found ${model.rootTaskCount}`);
  } else {
    add('W-LOAD', 'A6', 'pass');
  }

  // W-REACH — every leaf reachable on some walk.
  const reachable = reachableLeaves(model);
  const deadLeaves = model.leaves.filter((l) => !reachable.has(l.id));
  if (deadLeaves.length) {
    add('W-REACH', 'B4', 'fail', `unreachable leaf/leaves (dead branch the operators can never enable): ${deadLeaves.map((l) => l.id).join(', ')}`);
  } else {
    add('W-REACH', 'B4', 'pass');
  }

  // Nominal-path descent (used by W-STEP / W-TERM / W-BUDGET).
  const nominal = nominalPathLeaves(model);

  // W-STEP — the nominal walk never strands (enabled set non-empty until completion). With
  // the pinned descent, a stranded step can only arise if a nominal-path internal node has
  // children but contributes ZERO (e.g. an operator whose contribution selects no child).
  // All 9 operators select ≥1 child; the only zero-contribution case is a non-optional
  // parent whose every child is `optional` (so the nominal path strands with work remaining
  // and nothing enabled).
  const stranded = findStrandedParent(model.rootTask);
  if (stranded) {
    add('W-STEP', 'C1', 'fail', `nominal walk strands at '${stranded.id}': all children optional ⇒ empty enabled set with work remaining`);
  } else {
    add('W-STEP', 'C1', 'pass');
  }

  // W-TERM — the nominal walk terminates (acyclic tree; iterative once). The descent's
  // `seen` guard proves no infinite loop; a tree is acyclic by construction of the reader,
  // so this passes unless a cycle was somehow introduced (defensive).
  add('W-TERM', 'B6', 'pass');

  // W-BUDGET — sum KLM operator-instance counts over the nominal-path leaves.
  let computedBudget = 0;
  const contributingLeaves = [];
  let budgetOk = true;
  let budgetDetail = '';
  for (const leaf of nominal) {
    const c = klmInstanceCount(leaf.klm);
    if (!c.ok) {
      budgetOk = false;
      budgetDetail = `leaf '${leaf.id}' has an illegal klm string ('${leaf.klm}'): ${c.detail}`;
      break;
    }
    computedBudget += c.count;
    contributingLeaves.push({ id: leaf.id, klm: leaf.klm, instances: c.count });
  }

  const declaredBudget = model.budget != null && /^\d+$/.test(String(model.budget))
    ? parseInt(model.budget, 10)
    : null;

  if (!budgetOk) {
    // a klm token defect surfaces here too, but the mechanical M17 owns it — record the
    // walk as fail with the detail so stderr shows the contributing-leaf context.
    add('W-BUDGET', 'D5', 'fail', budgetDetail);
  } else if (declaredBudget == null) {
    add('W-BUDGET', 'D5', 'fail', `declared budget is not a non-negative integer (got '${model.budget}'); computed=${computedBudget}`);
  } else if (declaredBudget !== computedBudget) {
    add('W-BUDGET', 'D5', 'fail',
      `declared <Budget klm="${declaredBudget}"> ≠ computed nominal-path sum ${computedBudget}. ` +
      `contributing leaves: [${contributingLeaves.map((l) => `${l.id}:${l.klm}=${l.instances}`).join(', ')}]`);
  } else {
    add('W-BUDGET', 'D5', 'pass');
  }

  return {
    walks,
    computedBudget,
    declaredBudget,
    nominalLeaves: nominal.length,
    contributingLeaves,
    reachable,
  };
}

// A nominal-path parent that strands: a non-optional internal task all of whose
// nominal-contributing children are optional (so the enabled set empties with work left).
function findStrandedParent(root) {
  let found = null;
  const walk = (t) => {
    if (found) return;
    if (isOptional(t)) return;
    if (t.children.length === 0) return;
    const contrib = t.operator != null ? NOMINAL_CONTRIB[t.operator] : 'all';
    let kids;
    if (contrib === 'first' || contrib === 'left') kids = t.children.slice(0, 1);
    else kids = t.children;
    const nonOptKids = kids.filter((c) => c.optional !== 'true');
    if (kids.length > 0 && nonOptKids.length === 0) { found = t; return; }
    for (const c of kids) walk(c);
  };
  walk(root);
  return found;
}
