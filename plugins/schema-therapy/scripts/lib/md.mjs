// md.mjs — hand-rolled, dependency-free readers for the PINNED shapes the
// cross-artifact drift police must read. NOT a general CommonMark parser; it
// reads exactly the shapes the suite emits (see test-workspace/specs):
//   - GitHub-style pipe tables (header row + `---` separator + data rows)
//   - level-2 (`## `) and level-3 (`### `) ATX headings
//   - ordered (numbered) lists
//   - the fingerprint comment block in each artifact dialect
//
// On a structurally-broken pinned shape it throws a typed ParseError, which is
// precisely the `malformed` trigger for the suite-drift script.

export class ParseError extends Error {
  constructor(message, rule) {
    super(message);
    this.name = 'ParseError';
    this.rule = rule || null;
  }
}

// Split a markdown table row into trimmed cells. Tolerates optional leading and
// trailing pipes. Escaped pipes are not honoured (the suite never uses them).
export function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function isTableSeparator(line) {
  const cells = splitRow(line);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{1,}:?$/.test(c));
}

// Read EVERY pipe table in the text, tolerant of surrounding prose. Returns an
// array of { columns:[...], rows:[[...]], headerLine, heading } where `heading`
// is the most recent `###`/`##` heading above the table (or null).
export function readTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let heading = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hm = /^(#{2,3})\s+(.*\S)\s*$/.exec(line);
    if (hm) {
      heading = hm[2].trim();
      continue;
    }
    // a candidate header row: a pipe line immediately followed by a separator
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const columns = splitRow(line);
      const rows = [];
      let j = i + 2;
      for (; j < lines.length; j++) {
        const r = lines[j];
        if (!r.includes('|') || r.trim() === '') break;
        if (isTableSeparator(r)) break;
        rows.push(splitRow(r));
      }
      tables.push({ columns, rows, headerLine: i + 1, heading });
      i = j - 1;
    }
  }
  return tables;
}

// All ATX headings, in document order: [{ level, text, line }]
export function readHeadings(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(lines[i]);
    if (m) out.push({ level: m[1].length, text: m[2].trim(), line: i + 1 });
  }
  return out;
}

// Ordered (numbered) list items grouped under their nearest `###`/`##` heading.
// Returns Map(headingText -> [itemText,...]).
export function readOrderedListsByHeading(text) {
  const lines = text.split(/\r?\n/);
  const out = new Map();
  let heading = null;
  for (let i = 0; i < lines.length; i++) {
    const hm = /^(#{2,3})\s+(.*\S)\s*$/.exec(lines[i]);
    if (hm) {
      heading = hm[2].trim();
      if (!out.has(heading)) out.set(heading, []);
      continue;
    }
    const li = /^\s*\d+\.\s+(.*\S)\s*$/.exec(lines[i]);
    if (li && heading !== null) out.get(heading).push(li[1].trim());
  }
  return out;
}

// Normalize a fingerprint entry NAME to a bare specs-relative path. The 08 task
// models prefix their entries with `specs/` (e.g. `specs/06-gherkin/x.feature`);
// every other dialect names the input relative to specs/. We strip a leading
// `specs/` so resolveInput can root every name uniformly under the specs dir.
export function normFingerprintName(name) {
  return name.replace(/^specs\//, '');
}

// Parse a single fingerprint BODY line into { name, hash } or null. Two pinned
// dialects are accepted (the suite emits both):
//   A. `<name>@sha256:<hex>`              (00-06, 10)
//   B. `<name>  <ws>  sha256:<hex>`       (08, 09 — whitespace-separated, no `@`)
// A 64-hex hash is required in both. Returns { name, hash } or null on no-match.
function parseFingerprintEntry(body) {
  // dialect A: name@sha256:hex
  let m = /^(\S+)@sha256:([0-9a-fA-F]{64})$/.exec(body);
  if (m) return { name: normFingerprintName(m[1]), hash: m[2].toLowerCase() };
  // dialect B: name <ws> sha256:hex   (trailing parenthetical prose tolerated)
  m = /^(\S+)\s+sha256:([0-9a-fA-F]{64})\b/.exec(body);
  if (m) return { name: normFingerprintName(m[1]), hash: m[2].toLowerCase() };
  return null;
}

// The fingerprint block. Each artifact dialect comments its lines differently:
//   .md / .scxml : an HTML comment block `<!-- fingerprints: ... -->`
//   .dbml        : `// fingerprints:` then `// <name>@sha256:<hex>` lines
//   .feature     : `# fingerprints:` then `#   <name>@sha256:<hex>` lines
// The .scxml/.xml 08-09 dialect uses whitespace-separated `<name> sha256:<hex>`.
// Returns { present:boolean, entries:[{name, hash, raw}], malformed:[raw,...] }.
// `malformed` collects fingerprint-looking lines whose shape is broken.
export function readFingerprints(text, ext) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  const malformed = [];
  let present = false;

  // a line that clearly *intends* to be a fingerprint entry but is broken
  const LOOKS = /@sha256:|sha256:/;
  const accept = (body) => {
    const e = parseFingerprintEntry(body);
    if (e) { entries.push({ ...e, raw: body }); return true; }
    if (LOOKS.test(body)) { malformed.push(body); return true; }
    return false;
  };

  if (ext === '.md' || ext === '.scxml' || ext === '.xml') {
    // find the first `<!-- fingerprints:` ... `-->` block
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/<!--\s*fingerprints\s*:/.test(lines[i])) {
        start = i;
        present = true;
        break;
      }
    }
    if (start >= 0) {
      for (let i = start; i < lines.length; i++) {
        const closed = lines[i].includes('-->');
        // strip comment markers
        let body = lines[i]
          .replace(/<!--\s*fingerprints\s*:/, '')
          .replace(/-->/, '')
          .trim();
        if (body) accept(body);
        if (closed) break;
      }
    }
  } else if (ext === '.dbml') {
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i];
      if (/^\s*\/\/\s*fingerprints\s*:/.test(t)) {
        present = true;
        inBlock = true;
        continue;
      }
      if (inBlock) {
        const cm = /^\s*\/\/\s*(.*\S)\s*$/.exec(t);
        if (!cm) break; // first non-comment line ends the block
        const body = cm[1].trim();
        if (!accept(body)) break; // a comment that isn't a fingerprint entry ends the block
      }
    }
  } else if (ext === '.feature') {
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i];
      if (/^\s*#\s*fingerprints\s*:/.test(t)) {
        present = true;
        inBlock = true;
        continue;
      }
      if (inBlock) {
        const cm = /^\s*#\s*(.*\S)\s*$/.exec(t);
        if (!cm) break;
        const body = cm[1].trim();
        if (!accept(body)) break;
      }
    }
  }

  return { present, entries, malformed };
}

// 07-personas.md carries NO `<!-- fingerprints: -->` comment block; instead it
// opens with a `## Upstream Fingerprints` section whose bullet lines are
// `- <name>@sha256:<hex>`. This reads that prose dialect into the same shape as
// readFingerprints so staleness can treat 07 uniformly.
export function readProseFingerprints(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  const malformed = [];
  let present = false;
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.*\S)\s*$/.exec(lines[i]);
    if (h) {
      inSection = /upstream fingerprint/i.test(h[1]);
      if (inSection) present = true;
      else if (present) break; // section ended
      continue;
    }
    if (!inSection) continue;
    const bm = /^\s*[-*]\s+(.*\S)\s*$/.exec(lines[i]);
    if (!bm) continue;
    const body = bm[1].trim();
    const m = /^(\S+)@sha256:([0-9a-fA-F]{64})\b/.exec(body);
    if (m) entries.push({ name: normFingerprintName(m[1]), hash: m[2].toLowerCase(), raw: body });
    else if (/@sha256:|sha256:/.test(body)) malformed.push(body);
  }
  return { present, entries, malformed };
}

// Find a column index by trying each candidate header substring (case-insensitive).
export function colIndex(columns, ...candidates) {
  const norm = columns.map((c) => c.toLowerCase());
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    const idx = norm.findIndex((h) => h.includes(c));
    if (idx >= 0) return idx;
  }
  return -1;
}
