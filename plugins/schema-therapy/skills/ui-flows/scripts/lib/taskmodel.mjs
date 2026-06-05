// taskmodel.mjs — the 08 reader + the COPIED CTT nominal-path walker (narrowed to the
// nominal-leaf list + per-model Budget.klm the 09 harness consumes; simulation.md §1
// "CTT nominal-path walker"). COPIED from the 08 task-models harness walker.mjs PATTERN —
// never imported (isolation directive). 09 does NOT re-certify 08's own tag/operator/KLM
// seams (the 08 harness single-owns those); it re-walks 08 ONLY to obtain:
//   (a) the ORDERED nominal-leaf sequence (leaf id + category) the 09 flow must realize, and
//   (b) the per-model Budget.klm integer the flow cost is measured against,
// plus the ONE 08 invariant 09 must re-derive: the declared Budget == its own recomputed
// nominal cost (the broken-ruler precondition for C-a/W-COST → upstream-defect, §9).
//
// The CTT XML is read by the hand-rolled xml.mjs PATTERN (copied below, narrowed to the 08
// TaskModel/Budget/Task dialect). Two honesty splits mirror the flow-acceptance (10)
// taskmodel.mjs so the two skills derive the SAME nominal path from the same 08 tree:
//   - an UNPARSEABLE 08 (malformed XML) ⇒ throws CttParseError ⇒ the harness routes
//     broken-test (§9, "a realized 08 .xml not well-formed").
//   - a PARSEABLE-but-walker-stuck 08 (an internal node whose operator selects an empty
//     contributing set — e.g. a `choice` with no document-order child, or all candidates
//     optional) ⇒ parse() returns ok:true but model.stuck names the node ⇒ the harness routes
//     upstream-defect → the named 08 file (the tree is well-formed but the nominal path it
//     declares is underivable, so 09 cannot be measured against it).

import { klmInstanceCount } from './lexicon.mjs';

export class CttParseError extends Error {
  constructor(message) { super(message); this.name = 'CttParseError'; }
}

const NAME = '[A-Za-z_][A-Za-z0-9_.:-]*';

function tokenize(src) {
  const tokens = [];
  let i = 0; const n = src.length;
  while (i < n) {
    if (src[i] === '<') {
      if (src.startsWith('<?', i)) {
        const end = src.indexOf('?>', i);
        if (end === -1) throw new CttParseError('unterminated XML declaration');
        tokens.push({ kind: 'decl', raw: src.slice(i, end + 2) }); i = end + 2; continue;
      }
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        if (end === -1) throw new CttParseError('unterminated comment');
        tokens.push({ kind: 'comment', text: src.slice(i + 4, end) }); i = end + 3; continue;
      }
      if (src.startsWith('<![', i) || src.startsWith('<!', i)) {
        throw new CttParseError('CDATA / DOCTYPE not permitted');
      }
      const endTag = new RegExp('^</(' + NAME + ')\\s*>').exec(src.slice(i));
      if (endTag) { tokens.push({ kind: 'close', name: endTag[1] }); i += endTag[0].length; continue; }
      const open = new RegExp('^<(' + NAME + ')((?:\\s+[^<>]*?)?)\\s*(/?)>').exec(src.slice(i));
      if (!open) throw new CttParseError(`malformed tag at offset ${i}`);
      const attrs = parseAttrs(open[2] || '');
      tokens.push({ kind: open[3] === '/' ? 'selfclose' : 'open', name: open[1], attrs });
      i += open[0].length; continue;
    }
    const next = src.indexOf('<', i);
    const end = next === -1 ? n : next;
    if (src.slice(i, end).trim() !== '') tokens.push({ kind: 'text' });
    i = end;
  }
  return tokens;
}
function parseAttrs(s) {
  const attrs = {};
  const re = new RegExp('(' + NAME + ')\\s*=\\s*"([^"]*)"|(' + NAME + ")\\s*=\\s*'([^']*)'", 'g');
  let m;
  while ((m = re.exec(s)) !== null) attrs[m[1] || m[3]] = (m[2] != null ? m[2] : m[4]);
  const residue = s.replace(re, '').trim();
  if (residue !== '') throw new CttParseError(`malformed attribute list: '${s.trim()}'`);
  return attrs;
}
function buildTree(tokens) {
  let root = null; const stack = [];
  for (const t of tokens) {
    if (t.kind === 'decl' || t.kind === 'text' || t.kind === 'comment') continue;
    if (t.kind === 'open' || t.kind === 'selfclose') {
      const node = { name: t.name, attrs: t.attrs, children: [] };
      if (stack.length) stack[stack.length - 1].children.push(node);
      else if (root) throw new CttParseError('multiple root elements');
      else root = node;
      if (t.kind === 'open') stack.push(node);
      continue;
    }
    if (t.kind === 'close') {
      const top = stack.pop();
      if (!top) throw new CttParseError(`unexpected closing tag </${t.name}>`);
      if (top.name !== t.name) throw new CttParseError(`mismatched closing tag <${top.name}> / </${t.name}>`);
    }
  }
  if (stack.length) throw new CttParseError(`unclosed element <${stack[stack.length - 1].name}>`);
  if (!root) throw new CttParseError('no root element');
  return root;
}

// Nominal-path contribution per operator (the copied 08 rule, simulation.md §3.3/§8):
//   'all' — every child on the nominal path; 'first' — choice (first doc-order child);
//   'left' — disabling / suspendResume (left child).
const NOMINAL_CONTRIB = {
  enabling: 'all', sequentialEnablingInfo: 'all', interleaving: 'all',
  synchronization: 'all', parallelism: 'all', orderIndependence: 'all',
  choice: 'first', disabling: 'left', suspendResume: 'left',
};

// parse(src) → { ok, detail, model }. model = { id, persona, job, budget(raw),
//   rootTask, tasks[], leaves[], nominalLeaves[] ({id,category}), allLeafIds[],
//   computedNominalCost, budgetSound, stuck:{id,reason}|null }.
export function parse(src) {
  if (typeof src !== 'string') throw new CttParseError('input is not a string');
  const root = buildTree(tokenize(src));
  if (root.name !== 'TaskModel') {
    return { ok: false, detail: `root element is <${root.name}>, expected <TaskModel>`, model: null };
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
      children: [], parent,
    };
    tasks.push(rec);
    for (const c of childTaskEls) rec.children.push(node(c, rec));
    return rec;
  };
  const rootTask = taskEls.length ? node(taskEls[0], null) : null;
  const leaves = tasks.filter((t) => t.children.length === 0);

  // nominal-path descent (the copied 08 deterministic rule), with a stuck detector: an
  // internal node whose operator selects a contributing kid set that is EMPTY (e.g. a
  // `choice` with no document-order child, or all candidates optional) ⇒ the nominal path is
  // underivable ⇒ stuck. KEPT IDENTICAL to the flow-acceptance (10) taskmodel.mjs descend so
  // the same 08 tree yields the SAME nominal-leaf set in 09 and 10 (the copied PATTERN claim).
  const nominal = [];
  const seen = new Set();
  let stuck = null;
  const descend = (t) => {
    if (stuck) return;
    if (t.optional === 'true') return;
    if (seen.has(t)) return;
    seen.add(t);
    if (t.children.length === 0) { nominal.push(t); return; }
    const contrib = t.operator != null ? NOMINAL_CONTRIB[t.operator] : 'all';
    let kids;
    if (contrib === 'first' || contrib === 'left') kids = t.children.slice(0, 1);
    else kids = t.children;
    // skip optional kids from the nominal contribution.
    const nonOpt = kids.filter((c) => c.optional !== 'true');
    if (t.children.length > 0 && nonOpt.length === 0) {
      stuck = { id: t.id, reason: `operator '${t.operator || '(none)'}' selects no nominal child (all candidates optional or absent)` };
      return;
    }
    for (const c of nonOpt) descend(c);
  };
  if (rootTask) descend(rootTask);
  else stuck = { id: '(root)', reason: 'no root <Task> element' };

  // re-derive the computed nominal cost (the broken-ruler precondition, §9).
  let computedNominalCost = 0;
  let costOk = true;
  for (const leaf of nominal) {
    const c = klmInstanceCount(leaf.klm);
    if (!c.ok) { costOk = false; break; }
    computedNominalCost += c.count;
  }
  const budgetRaw = budgetEls.length === 1 && budgetEls[0].attrs.klm != null ? budgetEls[0].attrs.klm : null;
  const declaredBudget = budgetRaw != null && /^\d+$/.test(String(budgetRaw)) ? parseInt(budgetRaw, 10) : null;
  // a stuck walker has no derivable nominal path ⇒ the budget cannot be soundly re-checked
  // (and the broken-ruler comparison would be meaningless); route stuck on its own seam.
  const budgetSound = !stuck && costOk && declaredBudget != null && declaredBudget === computedNominalCost;

  return {
    ok: true, detail: '',
    model: {
      id: root.attrs.id != null ? root.attrs.id : null,
      persona: root.attrs.persona != null ? root.attrs.persona : null,
      job: root.attrs.job != null ? root.attrs.job : null,
      budgetRaw, declaredBudget,
      rootTask, tasks, leaves,
      nominalLeaves: stuck ? [] : nominal.map((t) => ({ id: t.id, category: t.category, klm: t.klm })),
      allLeafIds: leaves.map((t) => t.id).filter(Boolean),
      computedNominalCost, costOk, budgetSound, stuck,
    },
  };
}
