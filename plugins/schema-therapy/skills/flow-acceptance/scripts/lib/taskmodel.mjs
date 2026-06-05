// taskmodel.mjs — the 08 reader + the COPIED CTT nominal-path walker (simulation.md §1
// "08 CTT nominal-path walker"). COPIED PATTERN from the 08 task-models walker.mjs / the
// ui-flows taskmodel.mjs — never imported (isolation directive). 10 does NOT re-verify 08's
// tag/operator/KLM/budget seams — single ownership (§9); it re-walks 08 ONLY to obtain the
// ORDERED nominal-path leaf list + each walked leaf's scenario-tags 10 must realize.
//
// Two honesty splits (§9) — KEPT IDENTICAL to the ui-flows (09) taskmodel.mjs `descend`
// (the same copied PATTERN: optional kids filtered from the contributing set + stuck
// detection), so the same 08 tree yields the SAME ordered nominal-leaf set in 09 and 10:
//   - an UNPARSEABLE 08 (malformed XML) ⇒ throws CttParseError ⇒ the harness routes
//     broken-test.
//   - a PARSEABLE-but-walker-stuck 08 (e.g. a `choice` with no document-order child, or all
//     candidates optional) ⇒ parse() returns ok:true but model.stuck names the node ⇒ the
//     harness routes upstream-defect → the named 08 file.

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
//   'all'  — enabling/concurrent family: every child, document order
//   'first'— choice: first document-order child
//   'left' — disabling / suspendResume: left (first) child
const NOMINAL_CONTRIB = {
  enabling: 'all', sequentialEnablingInfo: 'all', interleaving: 'all',
  synchronization: 'all', parallelism: 'all', orderIndependence: 'all',
  concurrent: 'all',
  choice: 'first', disabling: 'left', suspendResume: 'left',
};

// parse(src) → { ok, detail, model }. model = { id, persona, job, rootTask, tasks[],
//   leaves[], nominalLeaves[] ({id, category, scenarioTags[]}), stuck:{id,reason}|null }.
// `category` is carried on each nominal leaf so the V-ORDER walk-replay can apply the
// symmetric interaction/user filter (simulation.md §3.3 note d.4): a `system` nominal leaf
// imposes NO screen/Event walk obligation (the 09 contract's system-leaf-no-obligation
// clause — INTERACTION_LEAF_CATEGORIES = {interaction, user}), so it is excluded from the
// nominal side of the leaf-order comparison exactly as 09 excludes it from the realization
// sequence.
// Throws CttParseError on malformed XML.
export function parse(src) {
  if (typeof src !== 'string') throw new CttParseError('input is not a string');
  const root = buildTree(tokenize(src));
  if (root.name !== 'TaskModel') {
    return { ok: false, detail: `root element is <${root.name}>, expected <TaskModel>`, model: null };
  }
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
      scenarioTags: el.attrs['scenario-tags'] != null
        ? el.attrs['scenario-tags'].trim().split(/\s+/).filter(Boolean)
        : [],
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
  // `choice` with no document-order child) ⇒ the nominal path is underivable ⇒ stuck.
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

  return {
    ok: true, detail: '',
    model: {
      id: root.attrs.id != null ? root.attrs.id : null,
      persona: root.attrs.persona != null ? root.attrs.persona : null,
      job: root.attrs.job != null ? root.attrs.job : null,
      rootTask, tasks, leaves,
      nominalLeaves: stuck ? [] : nominal.map((t) => ({ id: t.id, category: t.category, scenarioTags: t.scenarioTags.slice() })),
      stuck,
    },
  };
}
