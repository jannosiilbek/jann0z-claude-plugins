// xml.mjs — hand-rolled, dependency-free reader for the CONSTRAINED XML dialect the
// task-models harness must verify by hand (simulation.md §1 "Mechanical XML reader").
// NEW to this skill (no sibling's artifact is this dialect) — written here, modelled on
// the sibling statecharts scxml.mjs tokenizer/tree-builder, but pinned to the 08 dialect:
// only `TaskModel` / `Budget` / `Task` elements + a leading `<!-- fingerprints: … -->`
// comment block + the fixed Task attribute set.
//
// It reads STRUCTURE only; the CTT walker (walker.mjs) is the authority on what the tree
// DOES. The reader never walks. Malformed XML throws a typed ParseError ⇒ `malformed`
// (M1/A1). A generic DOM parser would discard the fingerprint comment block M2 needs, so a
// comment-preserving hand-rolled reader is the right tool (zero-dep house style).

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
        if (end === -1) throw new ParseError('unterminated XML declaration', 'A1');
        tokens.push({ kind: 'decl', raw: src.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        if (end === -1) throw new ParseError('unterminated comment', 'A1');
        tokens.push({ kind: 'comment', text: src.slice(i + 4, end) });
        i = end + 3;
        continue;
      }
      if (src.startsWith('<![', i) || src.startsWith('<!', i)) {
        throw new ParseError('CDATA / DOCTYPE not permitted in the constrained dialect', 'A1');
      }
      const endTag = new RegExp('^</(' + NAME + ')\\s*>').exec(src.slice(i));
      if (endTag) {
        tokens.push({ kind: 'close', name: endTag[1] });
        i += endTag[0].length;
        continue;
      }
      const open = new RegExp('^<(' + NAME + ')((?:\\s+[^<>]*?)?)\\s*(/?)>').exec(src.slice(i));
      if (!open) throw new ParseError(`malformed tag at offset ${i}: ${src.slice(i, i + 30)}…`, 'A1');
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
  if (residue !== '') throw new ParseError(`malformed attribute list: '${s.trim()}'`, 'A1');
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
        name: t.name,
        attrs: t.attrs,
        children: [],
        comments: pendingComments.slice(),
        parent: stack.length ? stack[stack.length - 1] : null,
      };
      pendingComments = [];
      if (stack.length) stack[stack.length - 1].children.push(node);
      else if (root) throw new ParseError('multiple root elements', 'A1');
      else root = node;
      if (t.kind === 'open') stack.push(node);
      continue;
    }
    if (t.kind === 'close') {
      const top = stack.pop();
      if (!top) throw new ParseError(`unexpected closing tag </${t.name}>`, 'A1');
      if (top.name !== t.name) throw new ParseError(`mismatched closing tag: <${top.name}> closed by </${t.name}>`, 'A1');
      continue;
    }
  }
  if (stack.length) throw new ParseError(`unclosed element <${stack[stack.length - 1].name}>`, 'A1');
  if (!root) throw new ParseError('no root element', 'A1');
  return { root, allComments };
}

// --- public reader ---------------------------------------------------------
// parse(src) → a structural model of the constrained dialect. Throws ParseError on
// malformed XML (M1/A1 gate). It does NOT enforce dialect legality (that is the
// mechanical checks' job over this raw shape) — it only reads structure + comments.
//
// model = {
//   declaration, hasDeclaration, firstLineIsDecl,
//   root,                          // raw element node
//   rootName,                      // root element name (TaskModel expected)
//   headerComments: [text],        // comments before the root element
//   allComments: [text],
//   fingerprintComment: text|null, // the `fingerprints:` comment body
//   elementNames: Set,             // every element name seen (M8)
//   taskAttrKeys: Set,             // every attr key seen on a <Task> (M8)
// }
export function parse(src) {
  if (typeof src !== 'string') throw new ParseError('input is not a string', 'A1');
  const firstLine = src.split(/\r?\n/, 1)[0].trim();
  const firstLineIsDecl = /^<\?xml\s+version="1\.0"\s+encoding="UTF-8"\?>$/.test(firstLine);

  const tokens = tokenize(src);
  const decl = tokens.find((t) => t.kind === 'decl');
  const { root, allComments } = buildTree(tokens);

  const elementNames = new Set();
  const taskAttrKeys = new Set();
  const walk = (node) => {
    elementNames.add(node.name);
    if (node.name === 'Task') for (const k of Object.keys(node.attrs)) taskAttrKeys.add(k);
    for (const c of node.children) walk(c);
  };
  walk(root);

  let fingerprintComment = null;
  for (const c of allComments) {
    if (/^\s*fingerprints\s*:/.test(c)) { fingerprintComment = c; break; }
  }

  return {
    declaration: decl ? decl.raw : null,
    hasDeclaration: !!decl,
    firstLineIsDecl,
    root,
    rootName: root.name,
    headerComments: (root.comments || []).slice(),
    allComments: allComments.slice(),
    fingerprintComment,
    elementNames,
    taskAttrKeys,
  };
}

// Parse the fingerprint comment body into [{file, hash, raw}] entries.
// Each line of shape `<path> sha256:<token>` (whitespace separated). Lines that
// are not entries (the `fingerprints:` label line) are skipped.
export function fingerprintEntries(commentText) {
  if (!commentText) return [];
  const out = [];
  for (const raw of commentText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^fingerprints\s*:/.test(line)) continue;
    // Canonical token shape (plugin-wide): `sha256:` + exactly 64 hex chars.
    const m = /^(\S+)\s+sha256:([0-9a-fA-F]{64})\s*$/.exec(line);
    if (m) out.push({ file: m[1], hash: m[2], raw: line });
    else out.push({ file: null, hash: null, raw: line, malformed: true });
  }
  return out;
}
