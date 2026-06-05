// md.mjs — hand-rolled, dependency-free markdown reader for the PINNED upstream
// shapes the statecharts harness must read by hand: `01-event-storming.md` (event
// names), `02-glossary.md` (enums + forbidden synonyms), `03-aggregates.md`
// (aggregates + invariants), and `04-transitions.md` (the transition blocks 05
// promotes). The `04-erd.dbml` is NOT hand-parsed — `@dbml/core` owns it (the enum +
// table enumeration), exactly as in the erd harness.
//
// COPIED (not cross-referenced) from the sibling erd skill's md.mjs: this skill reads
// the SAME pinned 01/02/03 + 04-transitions shapes. Each skill stays self-contained
// and copy-portable (doctrine: reuse over invention, copied never referenced).
//
// It is NOT a general CommonMark parser. It reads: level-2 (`## `) / level-3 (`### `)
// headings, GitHub pipe tables, ordered lists, and a leading HTML comment block.

export class ParseError extends Error {
  constructor(message, rule) {
    super(message);
    this.name = 'ParseError';
    this.rule = rule || null;
  }
}

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

// Parse the whole document into a flat section structure (identical to erd's md.mjs).
export function parse(text) {
  if (typeof text !== 'string') throw new ParseError('input is not a string');
  const lines = text.split(/\r?\n/);

  const doc = { fingerprintBlock: null, sections: new Map(), order: [], preamble: [] };

  const firstNonBlank = lines.findIndex((l) => l.trim() !== '');
  if (firstNonBlank !== -1 && lines[firstNonBlank].trim().startsWith('<!--')) {
    const buf = [];
    let closed = false;
    for (let i = firstNonBlank; i < lines.length; i++) {
      buf.push(lines[i]);
      if (lines[i].includes('-->')) { closed = true; break; }
    }
    // An opened-but-never-closed comment block is a structurally-broken pinned shape —
    // throw (⇒ malformed) rather than silently tolerate it (never-vacuous-green), matching
    // the sibling skills (impact-map, personas, task-models, ui-flows).
    if (!closed) throw new ParseError('unclosed leading HTML comment block (<!-- … with no -->)');
    doc.fingerprintBlock = buf.join('\n');
  }

  let currentH2 = null;
  let currentH3 = null;
  let seenH2 = false;

  const newSection = (title, level) => ({
    title, level, lines: [], tables: [], orderedLists: [],
    subsections: new Map(), subOrder: [],
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    const h3 = /^###\s+(.+?)\s*$/.exec(line);

    if (h3) {
      const title = h3[1].trim();
      currentH3 = newSection(title, 3);
      if (currentH2) { currentH2.subsections.set(title, currentH3); currentH2.subOrder.push(title); }
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
    if (looksLikeTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
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
    const ol = /^\s*(\d+)\.\s+(.*\S)\s*$/.exec(line);
    if (ol) {
      const items = [];
      let j = i;
      for (; j < lines.length; j++) {
        const m = /^\s*(\d+)\.\s+(.*\S)\s*$/.exec(lines[j]);
        if (!m) { if (lines[j].trim() === '') continue; break; }
        items.push({ marker: m[1], text: m[2].trim() });
      }
      section.orderedLists.push({ items, startLine: i });
      i = j - 1;
      continue;
    }
  }
}

export function firstTable(section) {
  return section && section.tables.length ? section.tables[0] : null;
}

// ===========================================================================
// 05-specific derivations over the parsed upstream shapes.
// ===========================================================================

// --- 01: domain event names. Lines of the form `- <Event Name>` or a table of
// events, or H3 headings. We accept the loosest robust shape: every non-empty,
// non-heading, non-table line stripped of a leading list marker is a candidate
// event string; PLUS any pipe-table first-column cell under an `## Events`-ish
// section. The exact strings 04 quotes are what we resolve against, so we gather a
// SET of strings. Returns { events: Set<string> }.
export function deriveEvents01(doc) {
  const events = new Set();
  for (const sec of doc.sections.values()) {
    for (const t of sec.tables) {
      // first column under an events table
      for (const r of t.rows) if (r[0]) events.add(r[0]);
    }
    for (const ol of sec.orderedLists) for (const it of ol.items) if (it.text) events.add(stripMarker(it.text));
    for (const line of sec.lines) {
      const m = /^\s*[-*]\s+(.+\S)\s*$/.exec(line);
      if (m) events.add(stripMarker(m[1]));
    }
  }
  return { events };
}
function stripMarker(s) {
  return String(s).replace(/^[-*]\s+/, '').replace(/^`|`$/g, '').trim();
}

// --- 02: enums + forbidden synonyms. `## Enums` holds `### <Aggregate>Status`
// subsections each with a `Value | Derived from event` table; `## Forbidden Synonyms`
// holds `Forbidden term | Canonical term | …`. Returns:
//   { enums: [{name, values:[…], derivations:Map(value→event01)}],
//     forbidden: [{term, canonical}] }
// `shapeOk` is false when the enums section / forbidden section is absent (→ broken-test).
export function deriveGlossary02(doc) {
  const enums = [];
  let enumsSectionFound = false;
  let forbiddenSectionFound = false;
  for (const [title, sec] of doc.sections) {
    if (/^enums?$/i.test(title)) {
      enumsSectionFound = true;
      for (const subTitle of sec.subOrder) {
        const sub = sec.subsections.get(subTitle);
        const t = firstTable(sub);
        if (!t) continue;
        const valueColIdx = t.columns.findIndex((c) => /^value$/i.test(c));
        const derivColIdx = t.columns.findIndex((c) => /derived/i.test(c));
        const vi = valueColIdx === -1 ? 0 : valueColIdx;
        const values = [];
        const derivations = new Map();
        for (const r of t.rows) {
          const v = r[vi];
          if (!v) continue;
          values.push(v);
          if (derivColIdx !== -1 && r[derivColIdx]) derivations.set(v, r[derivColIdx]);
        }
        enums.push({ name: subTitle, values, derivations });
      }
    }
    if (/forbidden/i.test(title)) {
      forbiddenSectionFound = true;
    }
  }
  const forbidden = [];
  for (const [title, sec] of doc.sections) {
    if (/forbidden/i.test(title)) {
      const t = firstTable(sec);
      if (t) {
        const termIdx = t.columns.findIndex((c) => /forbidden/i.test(c));
        const canonIdx = t.columns.findIndex((c) => /canonical/i.test(c));
        for (const r of t.rows) {
          const term = r[termIdx === -1 ? 0 : termIdx];
          const canon = r[canonIdx === -1 ? 1 : canonIdx];
          if (term) forbidden.push({ term, canonical: canon || '' });
        }
      }
    }
  }
  return { enums, forbidden, shapeOk: enumsSectionFound && forbiddenSectionFound };
}

// --- 03: aggregates + invariants. We only need invariant identifiers + text for the
// B4 judgment residue (never restated). Returns { invariants:[{id,text}] }.
export function deriveAggregates03(doc) {
  const invariants = [];
  for (const [title, sec] of doc.sections) {
    if (/invariant/i.test(title)) {
      const t = firstTable(sec);
      if (t) for (const r of t.rows) invariants.push({ id: r[0] || '', text: r.join(' ') });
      for (const ol of sec.orderedLists) for (const it of ol.items) invariants.push({ id: '', text: it.text });
    }
  }
  return { invariants, shapeOk: true };
}

// --- 04-transitions.md: `## Transition Tables` (or similar) with `### <TableName>`
// blocks, each a `From | Event | To` table. The `∅` (empty-set) origin row marks the
// initial state. Returns:
//   { entities: [{entity, rows:[{from, event01, to}], initial }], shapeOk }
// shapeOk is false when no transition-table section / no `### ` block is found.
export function deriveTransitions04(doc) {
  const entities = [];
  let sectionFound = false;
  for (const [title, sec] of doc.sections) {
    if (/transition/i.test(title)) {
      sectionFound = true;
      for (const subTitle of sec.subOrder) {
        const sub = sec.subsections.get(subTitle);
        const t = firstTable(sub);
        if (!t) continue;
        const fromIdx = t.columns.findIndex((c) => /^from$/i.test(c));
        const eventIdx = t.columns.findIndex((c) => /event/i.test(c));
        const toIdx = t.columns.findIndex((c) => /^to$/i.test(c));
        const fi = fromIdx === -1 ? 0 : fromIdx;
        const ei = eventIdx === -1 ? 1 : eventIdx;
        const ti = toIdx === -1 ? 2 : toIdx;
        const rows = [];
        let initial = null;
        for (const r of t.rows) {
          const from = r[fi];
          const event01 = r[ei];
          const to = r[ti];
          const isEmpty = from === '∅' || from === '' || /^(\\emptyset|null|none|-)$/i.test(from || '');
          if (isEmpty) { initial = to; rows.push({ from: '∅', event01, to }); }
          else rows.push({ from, event01, to });
        }
        entities.push({ entity: subTitle, rows, initial });
      }
    }
  }
  return { entities, shapeOk: sectionFound && entities.length > 0 };
}
