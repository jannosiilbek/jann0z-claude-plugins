// scxml.mjs — hand-rolled, dependency-free reader for the CONSTRAINED SCXML subset
// the statecharts harness must verify by hand (simulation.md §1 "Mechanical SCXML
// reader"). NEW to this skill (no sibling's artifact is SCXML) — written here, not
// copied. It reads STRUCTURE only; the SCION engine (engine.mjs) is the authority on
// what the machine DOES. The reader never simulates.
//
// Why hand-rolled over a generic XML lib: the pinned element set is tiny
// (scxml/state/parallel/final/initial/transition/history/datamodel/data) AND the
// harness must read SCXML-specific COMMENT ANNOTATIONS a DOM parser discards
// (`<!-- 01-event: … -->`, `<!-- supersedes: … -->`, `<!-- refines: … -->`,
// `<!-- fingerprints: … -->`). A comment-preserving reader is the right tool. It
// also double-checks well-formedness (A3/M3): malformed XML throws ParseError, and
// SCION re-parses at load (M-LOAD) as a second gate.

export class ScxmlParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScxmlParseError';
  }
}

// --- tokenizer -------------------------------------------------------------
// A minimal XML tokenizer over the constrained subset: it recognises the XML
// declaration, comments, and start/end/self-closing element tags with attributes.
// It is intentionally strict: an unclosed tag, an unbalanced tree, or stray markup
// throws ScxmlParseError (well-formedness gate, A3).

const NAME = '[A-Za-z_][A-Za-z0-9_.:-]*';

function tokenize(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    if (src[i] === '<') {
      // XML declaration <?xml ... ?>
      if (src.startsWith('<?', i)) {
        const end = src.indexOf('?>', i);
        if (end === -1) throw new ScxmlParseError('unterminated processing instruction / XML declaration');
        tokens.push({ kind: 'decl', raw: src.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
      // comment <!-- ... -->
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        if (end === -1) throw new ScxmlParseError('unterminated comment');
        tokens.push({ kind: 'comment', text: src.slice(i + 4, end) });
        i = end + 3;
        continue;
      }
      // CDATA / DOCTYPE not used in the subset — reject to stay strict.
      if (src.startsWith('<![', i) || src.startsWith('<!', i)) {
        throw new ScxmlParseError('CDATA / DOCTYPE not permitted in the constrained SCXML subset');
      }
      // end tag </name>
      const endTag = new RegExp('^</(' + NAME + ')\\s*>').exec(src.slice(i));
      if (endTag) {
        tokens.push({ kind: 'close', name: endTag[1] });
        i += endTag[0].length;
        continue;
      }
      // start or self-closing tag <name attrs> / <name attrs/>
      const open = new RegExp('^<(' + NAME + ')((?:\\s+[^<>]*?)?)\\s*(/?)>').exec(src.slice(i));
      if (!open) throw new ScxmlParseError(`malformed tag at offset ${i}: ${src.slice(i, i + 30)}…`);
      const name = open[1];
      const attrs = parseAttrs(open[2] || '');
      tokens.push({ kind: open[3] === '/' ? 'selfclose' : 'open', name, attrs });
      i += open[0].length;
      continue;
    }
    // text content (whitespace / data) — captured but mostly ignored.
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
  let consumed = '';
  while ((m = re.exec(s)) !== null) {
    const key = m[1] || m[3];
    const val = m[2] != null ? m[2] : m[4];
    attrs[key] = decodeEntities(val);
    consumed += m[0];
  }
  // strict: any non-whitespace residue that is not a recognised attribute is malformed.
  const residue = s.replace(re, '').trim();
  if (residue !== '') throw new ScxmlParseError(`malformed attribute list: '${s.trim()}'`);
  return attrs;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// --- tree builder ----------------------------------------------------------
// Builds a node tree. Each element node: { name, attrs, children:[], comments:[]
// (preceding-sibling comment texts) }. Comments are attached to the element they
// immediately precede AND collected globally (for header-region scans).

function buildTree(tokens) {
  let declSeen = false;
  let root = null;
  const stack = [];
  const allComments = [];
  let pendingComments = [];

  const attachPending = (node) => {
    node.comments = pendingComments;
    for (const c of pendingComments) allComments.push({ text: c, beforeName: node.name });
    pendingComments = [];
  };

  for (const t of tokens) {
    if (t.kind === 'decl') { declSeen = true; continue; }
    if (t.kind === 'text') { continue; }
    if (t.kind === 'comment') {
      pendingComments.push(t.text);
      // a comment with no following element (trailing) still recorded globally.
      allComments.push({ text: t.text, beforeName: null, trailing: true });
      continue;
    }
    if (t.kind === 'open' || t.kind === 'selfclose') {
      const node = { name: t.name, attrs: t.attrs, children: [], comments: [], parent: stack.length ? stack[stack.length - 1] : null };
      // re-record comments precisely as "before this element" (overwrites the
      // loose trailing record's intent — keep both for header scan robustness).
      node.comments = pendingComments.slice();
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
      continue;
    }
  }
  if (stack.length) throw new ScxmlParseError(`unclosed element <${stack[stack.length - 1].name}>`);
  if (!root) throw new ScxmlParseError('no root element');
  return { root, allComments, declSeen };
}

// --- public reader ---------------------------------------------------------
// parse(src) → a structural model of the constrained SCXML document. Throws
// ScxmlParseError on malformed XML (A3/M3 gate).
//
// model = {
//   declaration: string|null,    // the raw <?xml ...?> if present
//   hasDeclaration: bool,
//   root,                        // raw scxml element node
//   datamodel,                   // attr value or null
//   initialAttr,                 // root initial="" or null
//   version, xmlns,
//   headerComments: [text],      // comments before/at the root (fingerprints/supersedes)
//   allComments: [text],
//   states: [ {id, kind, atomic, compound, initialAttr, initialChild, parentId,
//              transitions:[…], comments:[…]} ],
//   transitions: [ {sourceId, event, target, cond, refines, event01, comments} ],
//   basicStateIds: Set, wrapperStates: [{id,kind}], finals:[id], history:[{id,type}],
//   ids:[all id attrs in document order]
// }
export function parse(src) {
  if (typeof src !== 'string') throw new ScxmlParseError('input is not a string');
  const tokens = tokenize(src);
  const decl = tokens.find((t) => t.kind === 'decl');
  const { root, allComments } = buildTree(tokens);

  if (root.name !== 'scxml') throw new ScxmlParseError(`root element is <${root.name}>, expected <scxml>`);

  const model = {
    declaration: decl ? decl.raw : null,
    hasDeclaration: !!decl,
    root,
    datamodel: root.attrs.datamodel != null ? root.attrs.datamodel : null,
    initialAttr: root.attrs.initial != null ? root.attrs.initial : null,
    version: root.attrs.version != null ? root.attrs.version : null,
    xmlns: root.attrs.xmlns != null ? root.attrs.xmlns : null,
    headerComments: (root.comments || []).slice(),
    allComments: allComments.map((c) => c.text),
    states: [],
    transitions: [],
    basicStateIds: new Set(),
    // enumCandidateStateIds = basic states ∪ <final> ids. A terminal enum value is
    // legitimately modelled as <final> (catalog C6) yet is still one of the 02 enum
    // values C1 requires the state set to equal — so M11/X-STATES compare against
    // THIS set, not basicStateIds alone.
    enumCandidateStateIds: new Set(),
    wrapperStates: [],
    finals: [],
    history: [],
    datas: [],
    ids: [],
  };

  // Walk the tree collecting states/parallels/finals/initials/transitions/history.
  const STATE_KINDS = new Set(['state', 'parallel', 'final', 'initial', 'history']);
  const walk = (node, parentStateId) => {
    if (node.attrs && node.attrs.id != null) model.ids.push(node.attrs.id);

    if (node.name === 'data' && node.attrs && node.attrs.id != null) {
      model.datas.push({ id: node.attrs.id, expr: node.attrs.expr != null ? node.attrs.expr : null });
    }

    if (STATE_KINDS.has(node.name) && node.name !== 'initial') {
      const id = node.attrs.id != null ? node.attrs.id : null;
      const childStates = node.children.filter((c) => c.name === 'state' || c.name === 'parallel' || c.name === 'final');
      const hasInitialChild = node.children.some((c) => c.name === 'initial');
      const kind = node.name; // state | parallel | final | history
      let stateKind;
      let atomic = false;
      let compound = false;
      if (node.name === 'final') stateKind = 'final';
      else if (node.name === 'history') stateKind = 'history';
      else if (node.name === 'parallel') stateKind = 'parallel';
      else {
        // <state>: atomic if no child state, else compound.
        if (childStates.length === 0) { stateKind = 'basic'; atomic = true; }
        else { stateKind = 'compound'; compound = true; }
      }
      const rec = {
        id,
        kind: stateKind,
        atomic,
        compound,
        parentId: parentStateId,
        initialAttr: node.attrs.initial != null ? node.attrs.initial : null,
        hasInitialChild,
        transitions: [],
        comments: (node.comments || []).slice(),
        node,
      };
      model.states.push(rec);
      if (stateKind === 'basic' && id) { model.basicStateIds.add(id); model.enumCandidateStateIds.add(id); }
      if (stateKind === 'final' && id) model.enumCandidateStateIds.add(id);
      if (stateKind === 'compound' || stateKind === 'parallel' || stateKind === 'history') {
        if (id) model.wrapperStates.push({ id, kind: stateKind });
      }
      if (stateKind === 'final' && id) {
        model.finals.push(id);
        model.wrapperStates.push({ id, kind: 'final' });
      }
      if (node.name === 'history') {
        model.history.push({ id, type: node.attrs.type != null ? node.attrs.type : null, node });
      }

      // transitions directly under this state (not deep — child states own theirs).
      for (let ci = 0; ci < node.children.length; ci++) {
        const c = node.children[ci];
        if (c.name === 'transition') {
          const tr = readTransition(c, id);
          rec.transitions.push(tr);
          model.transitions.push(tr);
        }
      }

      // recurse into child states with this node's id as the parent.
      for (const c of node.children) {
        if (c.name === 'state' || c.name === 'parallel' || c.name === 'final' || c.name === 'history' || c.name === 'initial' || c.name === 'datamodel') {
          walk(c, id);
        }
      }
      return;
    }

    // initial wrapper element: its <transition> target is the default child.
    if (node.name === 'initial') {
      if (node.attrs && node.attrs.id != null) {
        model.wrapperStates.push({ id: node.attrs.id, kind: 'initial' });
      }
      for (const c of node.children) if (c.name === 'transition') readTransition(c, parentStateId);
      return;
    }

    // root scxml / datamodel containers: recurse.
    for (const c of node.children) walk(c, parentStateId);
  };

  // Collect the root-level <transition>s under <initial> elements for target checks,
  // and record root-level <data>.
  walk(root, null);

  return model;
}

function readTransition(node, sourceId) {
  // The 01-event annotation is the comment immediately preceding the transition.
  let event01 = null;
  let refines = null;
  for (const c of node.comments || []) {
    const m = /^\s*01-event:\s*(.+?)\s*$/.exec(c);
    if (m) event01 = m[1];
    const r = /^\s*refines:\s*(.+?)\s*$/.exec(c);
    if (r) refines = r[1];
  }
  const actions = (node.children || [])
    .filter((c) => ['raise', 'send', 'assign', 'log', 'script', 'if', 'foreach', 'cancel'].includes(c.name))
    .map((c) => c.name);
  return {
    sourceId,
    event: node.attrs.event != null ? node.attrs.event : null,
    target: node.attrs.target != null ? node.attrs.target : null,
    cond: node.attrs.cond != null ? node.attrs.cond : null,
    event01,
    refines,
    actions,
    comments: (node.comments || []).slice(),
    node,
  };
}

// Extract the fingerprint block text from the header comments (catalog A4 / M4).
// Returns the raw text of the comment whose body starts with `fingerprints:`.
export function fingerprintComment(model) {
  for (const c of model.allComments) {
    if (/^\s*fingerprints:/.test(c)) return c;
  }
  return null;
}

// Extract the supersedes target (catalog A5 / M5) from any comment.
export function supersedesTarget(model) {
  for (const c of model.allComments) {
    const m = /^\s*supersedes:\s*04-transitions\.md#(\S+)\s*$/.exec(c);
    if (m) return m[1];
  }
  return null;
}

// True if any element in the document carries a `cond` attribute (M7 datamodel pin).
export function hasCond(model) {
  return model.transitions.some((t) => t.cond != null);
}

// True if any transition carries an executable action (M9 unjustified-promotion arm).
export function hasTransitionAction(model) {
  return model.transitions.some((t) => t.actions && t.actions.length > 0)
    || model.states.some((s) => (s.node.children || []).some((c) => c.name === 'onentry' || c.name === 'onexit'));
}

// True if the machine contains a <parallel> region (M9 concurrency arm).
export function hasParallel(model) {
  return model.wrapperStates.some((w) => w.kind === 'parallel');
}
