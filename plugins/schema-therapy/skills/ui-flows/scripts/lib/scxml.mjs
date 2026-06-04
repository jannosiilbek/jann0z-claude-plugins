// scxml.mjs — hand-rolled, dependency-free reader for the CONSTRAINED SCXML subset, used
// ONLY when `--upstream-05` is present, to read each `<entity>.scxml`'s transition set
// (From-state, `<!-- 01-event: … -->` annotation, To-state) + its `<!-- supersedes:
// 04-transitions.md#<table> -->` target as the lifecycle AUTHORITY for promoted entities
// (simulation.md §1, §3.5).
//
// This is the statecharts/gherkin skills' reader PATTERN, COPIED — NEVER imported (isolation
// directive). It reads STRUCTURE/SHAPE only; 09 does NOT re-run SCXML on an engine (05's own
// correctness is the statecharts harness's single-owned job). 09 consumes 05's transition set
// as the authority. Malformed XML throws ScxmlParseError ⇒ an unreadable supplied 05 routes to
// broken-test (§9).

export class ScxmlParseError extends Error {
  constructor(message) { super(message); this.name = 'ScxmlParseError'; }
}

const NAME = '[A-Za-z_][A-Za-z0-9_.:-]*';

function tokenize(src) {
  const tokens = [];
  let i = 0; const n = src.length;
  while (i < n) {
    if (src[i] === '<') {
      if (src.startsWith('<?', i)) {
        const end = src.indexOf('?>', i);
        if (end === -1) throw new ScxmlParseError('unterminated XML declaration');
        tokens.push({ kind: 'decl', raw: src.slice(i, end + 2) }); i = end + 2; continue;
      }
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        if (end === -1) throw new ScxmlParseError('unterminated comment');
        tokens.push({ kind: 'comment', text: src.slice(i + 4, end) }); i = end + 3; continue;
      }
      if (src.startsWith('<![', i) || src.startsWith('<!', i)) {
        throw new ScxmlParseError('CDATA / DOCTYPE not permitted in the constrained SCXML subset');
      }
      const endTag = new RegExp('^</(' + NAME + ')\\s*>').exec(src.slice(i));
      if (endTag) { tokens.push({ kind: 'close', name: endTag[1] }); i += endTag[0].length; continue; }
      const open = new RegExp('^<(' + NAME + ')((?:\\s+[^<>]*?)?)\\s*(/?)>').exec(src.slice(i));
      if (!open) throw new ScxmlParseError(`malformed tag at offset ${i}: ${src.slice(i, i + 30)}…`);
      const attrs = parseAttrs(open[2] || '');
      tokens.push({ kind: open[3] === '/' ? 'selfclose' : 'open', name: open[1], attrs });
      i += open[0].length; continue;
    }
    const next = src.indexOf('<', i);
    const end = next === -1 ? n : next;
    const text = src.slice(i, end);
    if (text.trim() !== '') tokens.push({ kind: 'text', text });
    i = end;
  }
  return tokens;
}

function parseAttrs(s) {
  const attrs = {};
  const re = new RegExp('(' + NAME + ')\\s*=\\s*"([^"]*)"|(' + NAME + ")\\s*=\\s*'([^']*)'", 'g');
  let m;
  while ((m = re.exec(s)) !== null) {
    const key = m[1] || m[3];
    attrs[key] = decodeEntities(m[2] != null ? m[2] : m[4]);
  }
  const residue = s.replace(re, '').trim();
  if (residue !== '') throw new ScxmlParseError(`malformed attribute list: '${s.trim()}'`);
  return attrs;
}
function decodeEntities(s) {
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function buildTree(tokens) {
  let root = null; const stack = []; let pendingComments = [];
  for (const t of tokens) {
    if (t.kind === 'decl') continue;
    if (t.kind === 'text') continue;
    if (t.kind === 'comment') { pendingComments.push(t.text); continue; }
    if (t.kind === 'open' || t.kind === 'selfclose') {
      const node = { name: t.name, attrs: t.attrs, children: [], comments: pendingComments.slice(), parent: stack.length ? stack[stack.length - 1] : null };
      pendingComments = [];
      if (stack.length) stack[stack.length - 1].children.push(node);
      else if (root) throw new ScxmlParseError('multiple root elements');
      else root = node;
      if (t.kind === 'open') stack.push(node);
      continue;
    }
    if (t.kind === 'close') {
      const top = stack.pop();
      if (!top) throw new ScxmlParseError(`unexpected closing tag </${t.name}>`);
      if (top.name !== t.name) throw new ScxmlParseError(`mismatched closing tag: <${top.name}> closed by </${t.name}>`);
    }
  }
  if (stack.length) throw new ScxmlParseError(`unclosed element <${stack[stack.length - 1].name}>`);
  if (!root) throw new ScxmlParseError('no root element');
  return { root };
}

export function parse(src) {
  if (typeof src !== 'string') throw new ScxmlParseError('input is not a string');
  const tokens = tokenize(src);
  const { root } = buildTree(tokens);
  if (root.name !== 'scxml') throw new ScxmlParseError(`root element is <${root.name}>, expected <scxml>`);

  const model = {
    initialAttr: root.attrs.initial != null ? root.attrs.initial : null,
    states: [], finals: [], transitions: [], basicStateIds: new Set(),
    // initialEvent01 = the `<!-- 01-event: … -->` annotation on/immediately preceding the
    // machine's INITIAL state entry (the creation event — mirrors the 04 transition table's
    // ∅ (creation) row). The 05 authority vocabulary includes this entry event PLUS every
    // transition 01-event (simulation.md §3.5, validation-rules.md D-a). Without it a creation
    // screen for a PROMOTED entity would fail R-AUTH while the identical screen for an
    // unpromoted entity (judged against 04, whose ∅ row carries the creation event) passes.
    initialEvent01: null,
    allComments: tokens.filter((t) => t.kind === 'comment').map((t) => t.text),
  };

  const STATE_KINDS = new Set(['state', 'parallel', 'final', 'history']);
  const walk = (node, parentId) => {
    if (STATE_KINDS.has(node.name)) {
      const id = node.attrs.id != null ? node.attrs.id : null;
      // Initial-state entry annotation: the comment(s) immediately preceding the state element
      // whose id == the scxml root's `initial` attribute carry the creation 01-event. (Real
      // event.scxml/ticket.scxml/order.scxml shape: `<!-- 01-event: … -->` on its own line just
      // before `<state id="<initial>">`.)
      if (id != null && model.initialAttr != null && id === model.initialAttr) {
        for (const c of node.comments || []) {
          const m = /^\s*01-event:\s*(.+?)\s*$/.exec(c);
          if (m) model.initialEvent01 = m[1];
        }
      }
      const childStates = node.children.filter((c) => c.name === 'state' || c.name === 'parallel' || c.name === 'final');
      let kind;
      if (node.name === 'final') kind = 'final';
      else if (node.name === 'parallel') kind = 'parallel';
      else if (node.name === 'history') kind = 'history';
      else kind = childStates.length === 0 ? 'basic' : 'compound';
      if (id) model.states.push({ id, kind });
      if (kind === 'basic' && id) model.basicStateIds.add(id);
      if (kind === 'final' && id) { model.finals.push(id); model.basicStateIds.add(id); }
      for (const c of node.children) if (c.name === 'transition') model.transitions.push(readTransition(c, id));
      for (const c of node.children) {
        if (['state', 'parallel', 'final', 'history', 'initial', 'datamodel'].includes(c.name)) walk(c, id);
      }
      return;
    }
    if (node.name === 'initial') {
      for (const c of node.children) if (c.name === 'transition') readTransition(c, parentId);
      return;
    }
    for (const c of node.children) walk(c, parentId);
  };
  walk(root, null);
  return model;
}

function readTransition(node, sourceId) {
  let event01 = null;
  for (const c of node.comments || []) {
    const m = /^\s*01-event:\s*(.+?)\s*$/.exec(c);
    if (m) event01 = m[1];
  }
  return {
    sourceId,
    event: node.attrs.event != null ? node.attrs.event : null,
    target: node.attrs.target != null ? node.attrs.target : null,
    event01,
  };
}

// scxmlGraph(model) → { transitions:[{from, event01, to}], states:[id], events:Set }.
export function scxmlGraph(model) {
  const transitions = [];
  for (const t of model.transitions) {
    if (!t.sourceId || !t.target) continue;
    transitions.push({ from: t.sourceId, event01: t.event01 || t.event || '', to: t.target });
  }
  // Authority vocabulary = all transition 01-event annotations PLUS the initial-entry
  // annotation (the creation event — mirrors the 04 table's ∅ row). simulation.md §3.5 / D-a.
  const events = new Set(transitions.map((t) => t.event01).filter(Boolean));
  if (model.initialEvent01) events.add(model.initialEvent01);
  return { transitions, states: [...new Set(model.states.map((s) => s.id).filter(Boolean))].sort(), events };
}

// supersedesTarget(model) → the `<!-- supersedes: 04-transitions.md#<table> -->` target.
export function supersedesTarget(model) {
  for (const c of model.allComments) {
    const m = /^\s*supersedes:\s*04-transitions\.md#(\S+)\s*$/.exec(c);
    if (m) return m[1];
  }
  return null;
}
