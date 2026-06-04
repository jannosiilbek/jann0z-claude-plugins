// md.mjs — hand-rolled, dependency-free markdown reader for the PINNED shapes the
// erd harness must verify by hand: the `04-transitions.md` companion AND both
// pinned upstreams (`02-glossary.md` + `03-aggregates.md`). The `.dbml` is NOT
// hand-parsed — `@dbml/core` owns it (simulation.md §1). This reader covers only
// the same level-2/level-3 heading + pipe-table + ordered-list primitives the
// sibling event-storming/glossary/aggregates skills use.
//
// COPIED (not cross-referenced) from the sibling aggregates skill's md.mjs: this
// skill must read the SAME pinned 02 and 03 shapes its two upstreams arrive in,
// and the same primitives cover the transitions.md companion. Each skill stays
// self-contained and copy-portable (doctrine: reuse over invention, copied never
// referenced).
//
// It is NOT a general CommonMark parser. It reads exactly:
//   - level-2 (`## `) and level-3 (`### `) headings
//   - GitHub-style pipe tables (header row + `---` separator + data rows)
//   - ordered (numbered) lists
//   - a leading HTML comment block (the `<!-- fingerprints: -->` block).

export class ParseError extends Error {
  constructor(message, rule) {
    super(message);
    this.name = 'ParseError';
    this.rule = rule || null;
  }
}

// Split a markdown table row into trimmed cells. Handles optional leading and
// trailing pipes. Escaped pipes are not honoured (the artifacts never use them).
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
// Returns: { fingerprintBlock, sections: Map(h2Title -> Section), order:[], preamble:[] }
// Section = { title, level, lines:[], tables:[Table], orderedLists:[List],
//             subsections: Map(h3Title -> Section), subOrder:[] }
// Table = { columns:[], rows:[[...]], headerLine, startLine }
// List  = { items:[{ marker, text }], startLine }
export function parse(text) {
  if (typeof text !== 'string') {
    throw new ParseError('input is not a string');
  }
  const lines = text.split(/\r?\n/);

  const doc = {
    fingerprintBlock: null, // first HTML comment block content if present
    sections: new Map(),
    order: [], // h2 titles in source order
    preamble: [], // lines before the first H2
  };

  // Capture a leading HTML comment block (the fingerprint block lives there per
  // the catalog A4 contract).
  const firstNonBlank = lines.findIndex((l) => l.trim() !== '');
  if (firstNonBlank !== -1 && lines[firstNonBlank].trim().startsWith('<!--')) {
    const buf = [];
    for (let i = firstNonBlank; i < lines.length; i++) {
      buf.push(lines[i]);
      if (lines[i].includes('-->')) break;
    }
    doc.fingerprintBlock = buf.join('\n');
  }

  let currentH2 = null;
  let currentH3 = null;
  let seenH2 = false;

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

  // Second pass: extract tables + lists within each section and subsection.
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
        if (!looksLikeTableRow(lines[j])) break;
        if (lines[j].trim() === '') break;
        rows.push(splitRow(lines[j]));
      }
      section.tables.push({ columns, rows, headerLine: line, startLine: i });
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
          if (lines[j].trim() === '') continue; // blank line allowed inside
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

// Convenience: first table inside a section.
export function firstTable(section) {
  return section && section.tables.length ? section.tables[0] : null;
}
