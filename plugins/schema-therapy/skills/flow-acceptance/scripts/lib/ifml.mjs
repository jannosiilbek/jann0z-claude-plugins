// ifml.mjs — the hand-rolled, dependency-free reader for the pinned IFML-XMI subset 10
// WALKS (simulation.md §1 "09 IFML-XMI-subset reader"). COPIED PATTERN from the `ui-flows`
// (09) harness `xml.mjs` — never imported (isolation directive). Narrowed to the slice 10
// walks: the persona attribute, the ViewContainer ids + home="true", each Event (id, task=,
// 01-event annotation if present), and the NavigationFlow edges. It reads STRUCTURE only;
// the walk-replay (replay.mjs) — not this reader — is the authority on what the graph DOES.
// 10 does NOT re-certify 09's own seams (budgets, bindings, KLM) — single ownership (§9).
//
// Malformed XML throws a typed ParseError ⇒ the harness routes broken-test (§9, "a 09 .xml
// not well-formed ⇒ the walk graph cannot be read").

export class ParseError extends Error {
  constructor(message) { super(message); this.name = 'IfmlParseError'; }
}

const NAME = '[A-Za-z_][A-Za-z0-9_.:-]*';

function tokenize(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    if (src[i] === '<') {
      if (src.startsWith('<?', i)) {
        const end = src.indexOf('?>', i);
        if (end === -1) throw new ParseError('unterminated XML declaration');
        tokens.push({ kind: 'decl', raw: src.slice(i, end + 2) }); i = end + 2; continue;
      }
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        if (end === -1) throw new ParseError('unterminated comment');
        tokens.push({ kind: 'comment', text: src.slice(i + 4, end) }); i = end + 3; continue;
      }
      if (src.startsWith('<![', i) || src.startsWith('<!', i)) {
        throw new ParseError('CDATA / DOCTYPE not permitted in the pinned IFML-XMI subset');
      }
      const endTag = new RegExp('^</(' + NAME + ')\\s*>').exec(src.slice(i));
      if (endTag) { tokens.push({ kind: 'close', name: endTag[1] }); i += endTag[0].length; continue; }
      const open = new RegExp('^<(' + NAME + ')((?:\\s+[^<>]*?)?)\\s*(/?)>').exec(src.slice(i));
      if (!open) throw new ParseError(`malformed tag at offset ${i}: ${src.slice(i, i + 30)}…`);
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
    const val = m[2] != null ? m[2] : m[4];
    attrs[key] = decodeEntities(val);
  }
  const residue = s.replace(re, '').trim();
  if (residue !== '') throw new ParseError(`malformed attribute list: '${s.trim()}'`);
  return attrs;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function buildTree(tokens) {
  let root = null;
  const stack = [];
  let pendingComments = [];
  for (const t of tokens) {
    if (t.kind === 'decl' || t.kind === 'text') continue;
    if (t.kind === 'comment') { pendingComments.push(t.text); continue; }
    if (t.kind === 'open' || t.kind === 'selfclose') {
      const node = {
        name: t.name, attrs: t.attrs, children: [],
        comments: pendingComments.slice(), innerComments: [],
        parent: stack.length ? stack[stack.length - 1] : null,
      };
      pendingComments = [];
      if (stack.length) stack[stack.length - 1].children.push(node);
      else if (root) throw new ParseError('multiple root elements');
      else root = node;
      if (t.kind === 'open') stack.push(node);
      continue;
    }
    if (t.kind === 'close') {
      const top = stack.pop();
      if (!top) throw new ParseError(`unexpected closing tag </${t.name}>`);
      if (top.name !== t.name) throw new ParseError(`mismatched closing tag: <${top.name}> closed by </${t.name}>`);
      if (pendingComments.length) { top.innerComments.push(...pendingComments); pendingComments = []; }
      continue;
    }
  }
  if (stack.length) throw new ParseError(`unclosed element <${stack[stack.length - 1].name}>`);
  if (!root) throw new ParseError('no root element');
  return root;
}

// parse(src) → a structural model of one 09 IFML model. Throws ParseError on malformed XML.
// model = {
//   persona, id, homeContainer (id|null),
//   containers: [{id, name, home, events:[{id,task,annotation01,containerId}]}],
//   events: [flat {id, task, annotation01, containerId}],
//   flows: [{fromEvent, toContainer}],
//   eventById: Map, containerById: Map,
// }
export function parse(src) {
  if (typeof src !== 'string') throw new ParseError('input is not a string');
  const root = buildTree(tokenize(src));

  const containers = [];
  const events = [];
  let homeContainer = null;

  for (const c of root.children) {
    if (c.name !== 'ViewContainer') continue;
    const cid = c.attrs.id != null ? c.attrs.id : null;
    const home = c.attrs.home === 'true';
    if (home && homeContainer == null) homeContainer = cid;
    const cEvents = [];
    for (const child of c.children) {
      if (child.name !== 'Event') continue;
      let annotation01 = null;
      for (const com of child.innerComments) {
        const m = /^\s*01-event:\s*(.+?)\s*$/.exec(com);
        if (m) { annotation01 = m[1]; break; }
      }
      const ev = {
        id: child.attrs.id != null ? child.attrs.id : null,
        task: child.attrs.task != null ? child.attrs.task : null,
        annotation01,
        containerId: cid,
      };
      cEvents.push(ev);
      events.push(ev);
    }
    containers.push({ id: cid, name: c.attrs.name != null ? c.attrs.name : null, home, events: cEvents });
  }

  const flows = [];
  for (const c of root.children) {
    if (c.name === 'NavigationFlow') {
      flows.push({ fromEvent: c.attrs.from != null ? c.attrs.from : null, toContainer: c.attrs.to != null ? c.attrs.to : null });
    }
  }

  const containerById = new Map(containers.map((c) => [c.id, c]));
  const eventById = new Map(events.filter((e) => e.id != null).map((e) => [e.id, e]));

  return {
    persona: root.attrs.persona != null ? root.attrs.persona : null,
    id: root.attrs.id != null ? root.attrs.id : null,
    homeContainer,
    containers, events, flows,
    containerById, eventById,
  };
}
