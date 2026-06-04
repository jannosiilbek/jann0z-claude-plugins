// md.mjs — hand-rolled, dependency-free markdown reader for the PINNED shapes the
// personas harness must verify (simulation.md §1): the 07 artifact, plus the two
// pinned upstreams (00 impact-map + 01 event-storming).
//
// COPIED (not cross-referenced) from the sibling glossary md.mjs (H2/H3 +
// pipe-table + ordered/unordered list primitives) and the impact-map md.mjs (the
// 00-shape reader pattern: leading `<!-- fingerprints: … -->` comment block +
// pipe tables). Re-pinned here with one addition the 07 shape needs: labelled
// lines (`**Business actor:** <value>`) inside `### <PersonaName>` subsections.
// Reuse over invention, copied never imported — each skill stays self-contained
// and copy-portable.
//
// It is NOT a general CommonMark parser. It reads exactly:
//   - level-2 (`## `) and level-3 (`### `) headings, in source order
//   - GitHub-style pipe tables (header row + `---` separator + data rows)
//   - unordered/ordered list items
//   - labelled lines `**Label:** value`
//   - the leading `<!-- fingerprints: … -->` comment block + its
//     `<file>@sha256:<hex>` lines
//
// On a structurally-broken pinned shape the CALLER (checks.mjs malformed lints)
// reports `malformed`; the parser itself raises ParseError only for the one
// boundary it can detect (a fingerprint comment block opened but never closed).

export class ParseError extends Error {
  constructor(message, rule) {
    super(message);
    this.name = 'ParseError';
    this.rule = rule || null;
  }
}

// Split a markdown table row into trimmed cells. Handles optional leading and
// trailing pipes. Does not honour escaped pipes (the artifacts never use them).
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

// Parse the whole document into a flat section structure.
// Returns: { fingerprintBlock, fingerprintLines[], sections:Map(h2->Section),
//            order:[h2 titles in source order], preamble:[] }
// Section = { title, level, lines:[], tables:[Table], lists:[List],
//             labels:[{label,value,line}], subsections:Map(h3->Section),
//             subOrder:[h3 titles in source order] }
// Table = { columns:[], rows:[[...]], headerLine, startLine }
// List  = { items:[{ marker, text }], startLine }
export function parse(text) {
  if (typeof text !== 'string') {
    throw new ParseError('input is not a string');
  }
  const lines = text.split(/\r?\n/);

  const doc = {
    fingerprintBlock: null,
    fingerprintLines: [], // `<file>@sha256:<hex>` lines inside the comment block
    sections: new Map(),
    order: [],
    preamble: [],
  };

  // Capture a leading HTML comment block (the fingerprint block per the SKILL.md
  // contract). A block opened but never closed is the one parser-level malformed
  // boundary we raise as a typed ParseError.
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
  let currentH3 = null;
  let seenH2 = false;

  const newSection = (title, level) => ({
    title,
    level,
    lines: [],
    tables: [],
    lists: [],
    labels: [],
    subsections: new Map(),
    subOrder: [],
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    const h2 = /^##\s+(.+?)\s*$/.exec(line);

    // Check h3 first (`###` would also satisfy a loose `##` match).
    if (h3) {
      const title = h3[1].trim();
      currentH3 = newSection(title, 3);
      if (currentH2) {
        currentH2.subsections.set(title, currentH3);
        currentH2.subOrder.push(title);
      }
      continue;
    }
    if (/^##\s/.test(line) && h2) {
      const title = h2[1].trim();
      currentH2 = newSection(title, 2);
      currentH3 = null;
      seenH2 = true;
      doc.sections.set(title, currentH2);
      doc.order.push(title);
      continue;
    }

    const target = currentH3 || currentH2;
    if (target) target.lines.push(line);
    else if (!seenH2) doc.preamble.push(line);
  }

  // Second pass: extract tables, lists, labelled lines per section/subsection.
  const fill = (section) => {
    extractBody(section);
    for (const sub of section.subsections.values()) extractBody(sub);
  };
  for (const sec of doc.sections.values()) fill(sec);

  return doc;
}

function extractBody(section) {
  const lines = section.lines;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table: a header row immediately followed by a separator row.
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
      continue;
    }

    // Unordered or ordered list: a run of `- text` / `* text` / `N. text` lines.
    const li = /^\s*(?:([-*+])|(\d+)\.)\s+(.*\S)\s*$/.exec(line);
    if (li) {
      const items = [];
      let j = i;
      for (; j < lines.length; j++) {
        const m = /^\s*(?:([-*+])|(\d+)\.)\s+(.*\S)\s*$/.exec(lines[j]);
        if (!m) {
          if (lines[j].trim() === '') {
            // blank line ends the list run (keeps adjacency tight for shape checks)
            break;
          }
          break;
        }
        items.push({ marker: m[1] || m[2], text: m[3].trim() });
      }
      section.lists.push({ items, startLine: i });
      i = j - 1;
      continue;
    }

    // Labelled line: `**Label:** value` (the persona-block field shape).
    const lab = /^\s*\*\*(.+?):\*\*\s*(.*\S)?\s*$/.exec(line);
    if (lab) {
      section.labels.push({
        label: lab[1].trim(),
        value: (lab[2] || '').trim(),
        line: i,
      });
      continue;
    }
  }
}

// Convenience: first table inside a section.
export function firstTable(section) {
  return section && section.tables.length ? section.tables[0] : null;
}
