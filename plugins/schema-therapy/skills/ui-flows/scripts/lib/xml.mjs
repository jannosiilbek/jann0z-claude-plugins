// xml.mjs — the hand-rolled, dependency-free reader for the pinned IFML-XMI subset (the
// AUTHORITATIVE validator, simulation.md §0/§1). The probe proved no scriptable IFML
// validator ingests genuine OMG IFML-XMI and the one installable reader (ifml-moddle.fromXML)
// parses leniently on a different dialect — so the harness VENDORS a strict reader over the
// six-element pinned subset (Theme A): IFMLModel / Realizes / ViewContainer / ViewComponent /
// Event / NavigationFlow + the leading `<!-- fingerprints: … -->` comment block + the
// `<!-- 01-event: … -->` annotation comments (a generic DOM parser discards these). It reads
// STRUCTURE only; the flow-walker (graph.mjs) is the authority on what the model DOES.
//
// COPIED tokenizer/tree-builder PATTERN from the sibling task-models xml.mjs / statecharts
// scxml.mjs, re-pinned to the 09 dialect. Malformed XML throws a typed ParseError ⇒ the
// harness routes `malformed` (M-DECL / A-a). Copied, never imported (isolation directive).

import { ELEMENTS, COMPONENT_TYPES, EVENT_TYPES, MM_CLASS } from './lexicon.mjs';

export class ParseError extends Error {
  constructor(message, rule) {
    super(message);
    this.name = 'ParseError';
    this.rule = rule || null;
  }
}

const NAME = '[A-Za-z_][A-Za-z0-9_.:-]*';

// --- tokenizer -------------------------------------------------------------
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    if (src[i] === '<') {
      if (src.startsWith('<?', i)) {
        const end = src.indexOf('?>', i);
        if (end === -1) throw new ParseError('unterminated XML declaration', 'A-a');
        tokens.push({ kind: 'decl', raw: src.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        if (end === -1) throw new ParseError('unterminated comment', 'A-a');
        tokens.push({ kind: 'comment', text: src.slice(i + 4, end) });
        i = end + 3;
        continue;
      }
      if (src.startsWith('<![', i) || src.startsWith('<!', i)) {
        throw new ParseError('CDATA / DOCTYPE not permitted in the pinned IFML-XMI subset', 'A-a');
      }
      const endTag = new RegExp('^</(' + NAME + ')\\s*>').exec(src.slice(i));
      if (endTag) {
        tokens.push({ kind: 'close', name: endTag[1] });
        i += endTag[0].length;
        continue;
      }
      const open = new RegExp('^<(' + NAME + ')((?:\\s+[^<>]*?)?)\\s*(/?)>').exec(src.slice(i));
      if (!open) throw new ParseError(`malformed tag at offset ${i}: ${src.slice(i, i + 30)}…`, 'A-a');
      const name = open[1];
      const attrs = parseAttrs(open[2] || '');
      tokens.push({ kind: open[3] === '/' ? 'selfclose' : 'open', name, attrs });
      i += open[0].length;
      continue;
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
  if (residue !== '') throw new ParseError(`malformed attribute list: '${s.trim()}'`, 'A-a');
  return attrs;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// --- tree builder ----------------------------------------------------------
function buildTree(tokens) {
  let root = null;
  const stack = [];
  const allComments = [];
  let pendingComments = [];

  for (const t of tokens) {
    if (t.kind === 'decl') continue;
    if (t.kind === 'text') continue;
    if (t.kind === 'comment') {
      pendingComments.push(t.text);
      allComments.push(t.text);
      continue;
    }
    if (t.kind === 'open' || t.kind === 'selfclose') {
      const node = {
        name: t.name, attrs: t.attrs, children: [],
        comments: pendingComments.slice(),  // preceding-sibling comments
        innerComments: [],                  // comments collected as children (01-event)
        parent: stack.length ? stack[stack.length - 1] : null,
      };
      pendingComments = [];
      if (stack.length) stack[stack.length - 1].children.push(node);
      else if (root) throw new ParseError('multiple root elements', 'A-a');
      else root = node;
      if (t.kind === 'open') stack.push(node);
      continue;
    }
    if (t.kind === 'close') {
      // any comments pending at a close are INNER comments of the closing element
      const top = stack.pop();
      if (!top) throw new ParseError(`unexpected closing tag </${t.name}>`, 'A-a');
      if (top.name !== t.name) throw new ParseError(`mismatched closing tag: <${top.name}> closed by </${t.name}>`, 'A-a');
      if (pendingComments.length) { top.innerComments.push(...pendingComments); pendingComments = []; }
      continue;
    }
  }
  if (stack.length) throw new ParseError(`unclosed element <${stack[stack.length - 1].name}>`, 'A-a');
  if (!root) throw new ParseError('no root element', 'A-a');
  return { root, allComments };
}

// --- public reader ---------------------------------------------------------
// parse(src) → a structural model of one 09 IFML model. Throws ParseError on malformed XML
// (the M-DECL / A-a gate). It does NOT enforce dialect legality (that is the mechanical
// checks' job) — it reads structure + comments.
//
// model = {
//   declaration, hasDeclaration, firstLineIsDecl,
//   root, rootName,
//   persona, id,                  // root attrs
//   fingerprintComment: text|null,
//   realizes: [stem],             // <Realizes taskModel="…"/>
//   containers: [{ id, name, home, components:[{id,type,binding}],
//                  events:[{id,type,task?,klm?,annotation?}] }],
//   flows: [{from, to}],
//   events: [flat],               // all events across containers (with containerId)
//   ids: [all id attrs], elementNames:Set,
// }
export function parse(src) {
  if (typeof src !== 'string') throw new ParseError('input is not a string', 'A-a');
  const firstLine = src.split(/\r?\n/, 1)[0].trim();
  const firstLineIsDecl = /^<\?xml\s+version="1\.0"\s+encoding="UTF-8"\?>$/.test(firstLine);

  const tokens = tokenize(src);
  const decl = tokens.find((t) => t.kind === 'decl');
  const { root, allComments } = buildTree(tokens);

  const elementNames = new Set();
  const ids = [];
  const collect = (node) => {
    elementNames.add(node.name);
    if (node.attrs && node.attrs.id != null) ids.push(node.attrs.id);
    for (const c of node.children) collect(c);
  };
  collect(root);

  let fingerprintComment = null;
  for (const c of allComments) {
    if (/^\s*fingerprints\s*:/.test(c)) { fingerprintComment = c; break; }
  }

  // Realizes children of root.
  const realizes = [];
  for (const c of root.children) {
    if (c.name === 'Realizes' && c.attrs.taskModel != null) realizes.push(c.attrs.taskModel);
  }

  // Containers + their components / events.
  const containers = [];
  const events = [];
  for (const c of root.children) {
    if (c.name !== 'ViewContainer') continue;
    const components = [];
    const cEvents = [];
    for (const child of c.children) {
      if (child.name === 'ViewComponent') {
        components.push({
          id: child.attrs.id != null ? child.attrs.id : null,
          type: child.attrs.type != null ? child.attrs.type : null,
          binding: child.attrs.binding != null ? child.attrs.binding : null,
        });
      } else if (child.name === 'Event') {
        // the 01-event annotation is an inner comment of the Event element.
        let annotation = null;
        for (const com of child.innerComments) {
          const m = /^\s*01-event:\s*(.+?)\s*$/.exec(com);
          if (m) { annotation = m[1]; break; }
        }
        const ev = {
          id: child.attrs.id != null ? child.attrs.id : null,
          type: child.attrs.type != null ? child.attrs.type : null,
          task: child.attrs.task != null ? child.attrs.task : null,
          klm: child.attrs.klm != null ? child.attrs.klm : null,
          annotation,
          containerId: c.attrs.id != null ? c.attrs.id : null,
        };
        cEvents.push(ev);
        events.push(ev);
      }
    }
    containers.push({
      id: c.attrs.id != null ? c.attrs.id : null,
      name: c.attrs.name != null ? c.attrs.name : null,
      home: c.attrs.home === 'true',
      homeRaw: c.attrs.home != null ? c.attrs.home : null,
      components, events: cEvents,
    });
  }

  // NavigationFlow children of root.
  const flows = [];
  for (const c of root.children) {
    if (c.name === 'NavigationFlow') {
      flows.push({ from: c.attrs.from != null ? c.attrs.from : null, to: c.attrs.to != null ? c.attrs.to : null });
    }
  }

  return {
    declaration: decl ? decl.raw : null,
    hasDeclaration: !!decl,
    firstLineIsDecl,
    root, rootName: root.name,
    persona: root.attrs.persona != null ? root.attrs.persona : null,
    id: root.attrs.id != null ? root.attrs.id : null,
    fingerprintComment,
    realizes, containers, flows, events,
    ids, elementNames,
  };
}

// Parse a fingerprint comment body into [{file, hash, raw, malformed?}].
// Each entry line: `<path> sha256:<token>`. The `fingerprints:` label line is skipped.
export function fingerprintEntries(commentText) {
  if (!commentText) return [];
  const out = [];
  for (const raw of commentText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^fingerprints\s*:/.test(line)) continue;
    const m = /^(\S+)\s+sha256:(\S+)\s*$/.exec(line);
    if (m) out.push({ file: m[1], hash: m[2], raw: line });
    else out.push({ file: null, hash: null, raw: line, malformed: true });
  }
  return out;
}

// re-export the closed-lexicon membership sets the reader's checks consult.
export { ELEMENTS, COMPONENT_TYPES, EVENT_TYPES, MM_CLASS };
