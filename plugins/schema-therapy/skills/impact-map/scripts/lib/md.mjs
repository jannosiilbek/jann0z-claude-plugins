// md.mjs — hand-rolled, dependency-free markdown reader for the impact-map
// artifact's PINNED A-theme shapes (simulation.md §1).
//
// It does NOT aim to be a general CommonMark parser. It reads exactly the
// shapes the harness must verify:
//   - level-2 (`## `) headings, in source order
//   - GitHub-style pipe tables (header row + `---` separator + data rows)
//   - paragraph / bullet-list bodies (for the single-statement Goal check)
//   - the leading `<!-- fingerprints: … -->` comment block
//
// On a structurally-broken pinned shape the HARNESS raises `malformed` from the
// typed lint results; the parser additionally exposes ParseError for the one
// boundary it can detect itself (a fingerprint comment block opened but never
// closed). Copied from the sibling event-storming md.mjs and re-pinned to the
// A-theme shapes — reuse over invention, no cross-skill import.

export class ParseError extends Error {
  constructor(message, rule) {
    super(message);
    this.name = 'ParseError';
    this.rule = rule || null;
  }
}

// Split a markdown table row into trimmed cells. Handles optional leading and
// trailing pipes. Does not honour escaped pipes (the artifact never uses them).
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

function looksLikeTableRow(line) {
  return line.trim().includes('|');
}

// Parse the whole document.
// Returns: { fingerprintBlock, fingerprintLines[], sections: Map(h2 -> Section),
//            order: [h2 titles in source order] }
// Section = { title, level, lines:[], tables:[Table], bulletItems:[], paragraphs:[] }
// Table = { columns:[], rows:[[...]], headerLine, startLine }
export function parse(text) {
  const lines = text.split(/\r?\n/);

  const doc = {
    fingerprintBlock: null, // raw text of the leading <!-- fingerprints: … --> block
    fingerprintLines: [], // the `<file>@sha256:<hex>` lines inside it
    sections: new Map(),
    order: [],
  };

  // Capture the leading HTML comment block (the fingerprint block per the
  // SKILL.md contract). A2/L2 also reads the `## Upstream Fingerprint` SECTION;
  // we surface both. A block opened but never closed is the one parser-level
  // malformed boundary we raise as a typed ParseError.
  const firstNonBlank = lines.findIndex((l) => l.trim() !== '');
  if (firstNonBlank !== -1 && lines[firstNonBlank].trim().startsWith('<!--')) {
    const buf = [];
    let closed = false;
    for (let i = firstNonBlank; i < lines.length; i++) {
      buf.push(lines[i]);
      if (lines[i].includes('-->')) {
        closed = true;
        break;
      }
    }
    if (!closed) {
      throw new ParseError('fingerprint comment block opened (`<!--`) but never closed (`-->`)', 'A2');
    }
    doc.fingerprintBlock = buf.join('\n');
    for (const l of buf) {
      const m = /^(\S.*?)@sha256:(\S+)\s*$/.exec(l.trim());
      if (m) doc.fingerprintLines.push({ file: m[1].trim(), hash: m[2].trim(), raw: l.trim() });
    }
  }

  let currentH2 = null;

  const newSection = (title) => ({
    title,
    level: 2,
    lines: [],
    tables: [],
    bulletItems: [],
    paragraphs: [],
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // h2 = `## ` but NOT `### `.
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (/^###\s/.test(line)) {
      // h3 is not part of the impact-map pinned shape; fold its text into the
      // current section body so it is still visible to body-scanning checks.
      if (currentH2) currentH2.lines.push(line);
      continue;
    }
    if (/^##\s/.test(line) && h2) {
      const title = h2[1].trim();
      currentH2 = newSection(title);
      doc.sections.set(title, currentH2);
      doc.order.push(title);
      continue;
    }
    if (currentH2) currentH2.lines.push(line);
  }

  for (const sec of doc.sections.values()) extractBody(sec);

  return doc;
}

function extractBody(section) {
  const lines = section.lines;

  // Tables.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      looksLikeTableRow(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const columns = splitRow(line);
      const rows = [];
      let j = i + 2;
      for (; j < lines.length; j++) {
        if (lines[j].trim() === '') break;
        if (!looksLikeTableRow(lines[j])) break;
        rows.push(splitRow(lines[j]));
      }
      section.tables.push({ columns, rows, headerLine: line, startLine: i });
      i = j - 1;
    }
  }

  // Bullet list items (for L6 single-statement Goal: a goal stated as a list
  // is a multi-goal violation). Match `- `, `* `, `+ ` or `N. ` lead.
  for (const line of lines) {
    const b = /^\s*(?:[-*+]|\d+\.)\s+(.*\S)\s*$/.exec(line);
    if (b) section.bulletItems.push(b[1].trim());
  }

  // Paragraph blocks: runs of non-blank, non-table, non-bullet body lines,
  // separated by blank lines. Used to count distinct Goal statements (A6).
  let para = [];
  const flush = () => {
    if (para.length) {
      section.paragraphs.push(para.join(' ').trim());
      para = [];
    }
  };
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (t === '') {
      flush();
      inTable = false;
      continue;
    }
    // skip table lines entirely
    if (looksLikeTableRow(line)) {
      // header+separator or data row of a table → not paragraph text
      if (isTableSeparator(line) || (i + 1 < lines.length && isTableSeparator(lines[i + 1]))) {
        inTable = true;
      }
      if (inTable) {
        continue;
      }
    }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      // bullet line: treat each as its own "statement" boundary
      flush();
      section.paragraphs.push(t.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').trim());
      continue;
    }
    para.push(t);
  }
  flush();
}

// Convenience: first table inside a section.
export function firstTable(section) {
  return section && section.tables.length ? section.tables[0] : null;
}
