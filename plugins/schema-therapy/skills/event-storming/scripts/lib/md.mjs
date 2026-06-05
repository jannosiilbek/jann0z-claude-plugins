// md.mjs — hand-rolled, dependency-free markdown reader for the
// event-storming artifact's PINNED A-theme shapes (simulation.md §1).
//
// It does NOT aim to be a general CommonMark parser. It reads exactly the
// shapes the harness must verify:
//   - level-2 (`## `) and level-3 (`### `) headings
//   - GitHub-style pipe tables (header row + `---` separator + data rows)
//   - ordered (numbered) lists
//
// On a structurally-broken pinned shape it throws a typed ParseError, which is
// precisely the `malformed` trigger (simulation.md §0, §2).

export class ParseError extends Error {
  constructor(message, rule) {
    super(message);
    this.name = 'ParseError';
    this.rule = rule || null;
  }
}

// Split a markdown table row into trimmed cells. Handles optional leading and
// trailing pipes. Does not attempt to honour escaped pipes (the artifact never
// uses them; if it did, that is a content defect, not a parser concern).
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
  const t = line.trim();
  return t.includes('|');
}

// Parse the whole document into a flat block list with section structure.
// Returns: { sections: Map(h2Title -> Section) }
// Section = { title, level, lines:[], tables:[Table], orderedLists:[List],
//             subsections: Map(h3Title -> Section), rawBody:string }
// Table = { columns:[], rows:[[...]], headerLine, startLine }
// List  = { items:[{ marker, text }], startLine }
export function parse(text) {
  const lines = text.split(/\r?\n/);

  const doc = {
    fingerprintBlock: null, // first HTML comment block content if present
    sections: new Map(),
    order: [], // h2 titles in source order
  };

  // Capture a leading HTML comment block (the fingerprint block lives there per
  // SKILL.md contract, but L2 reads the `## Upstream Fingerprint` SECTION; we
  // expose the comment too for completeness).
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
    // An opened-but-never-closed fingerprint comment block is a structural break:
    // surface it as `malformed` (never silently tolerate a partial capture).
    if (!closed) {
      throw new ParseError('fingerprint comment block opened (`<!--`) but never closed (`-->`)', 'L2');
    }
    doc.fingerprintBlock = buf.join('\n');
  }

  let currentH2 = null;
  let currentH3 = null;

  const newSection = (title, level) => ({
    title,
    level,
    lines: [],
    tables: [],
    orderedLists: [],
    subsections: new Map(),
    subOrder: [],
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    // Guard: `##` must not be `###` (regex `^##\s` already excludes `###` because
    // `###` has no space after `##`). Confirm by checking h3 first.
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
      doc.sections.set(title, currentH2);
      doc.order.push(title);
      continue;
    }

    const target = currentH3 || currentH2;
    if (target) target.lines.push(line);
  }

  // Second pass: within each section (and subsection) extract tables + lists.
  const fill = (section) => {
    extractTablesAndLists(section);
    for (const sub of section.subsections.values()) extractTablesAndLists(sub);
  };
  for (const sec of doc.sections.values()) fill(sec);

  return doc;
}

function extractTablesAndLists(section) {
  const lines = section.lines;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table: a header row, then a separator row.
    if (
      looksLikeTableRow(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const columns = splitRow(line);
      const rows = [];
      let j = i + 2;
      for (; j < lines.length; j++) {
        if (!looksLikeTableRow(lines[j])) break;
        if (lines[j].trim() === '') break;
        rows.push(splitRow(lines[j]));
      }
      section.tables.push({
        columns,
        rows,
        headerLine: line,
        startLine: i,
      });
      i = j - 1;
      continue;
    }

    // Ordered list: a run of `N. text` lines.
    const ol = /^\s*(\d+)\.\s+(.*\S)\s*$/.exec(line);
    if (ol) {
      const items = [];
      let j = i;
      for (; j < lines.length; j++) {
        const m = /^\s*(\d+)\.\s+(.*\S)\s*$/.exec(lines[j]);
        if (!m) {
          // allow blank-line break to terminate the list
          if (lines[j].trim() === '') continue;
          break;
        }
        items.push({ marker: m[1], text: m[2].trim() });
      }
      section.orderedLists.push({ items, startLine: i });
      i = j - 1;
      continue;
    }
  }
}

// Convenience: find the FIRST table inside a section.
export function firstTable(section) {
  return section && section.tables.length ? section.tables[0] : null;
}
