// md.mjs — hand-rolled, dependency-free markdown reader for the PINNED upstream shapes
// the gherkin harness must read by hand: `02-glossary.md` (Terms, enums + forbidden
// synonyms), `03-aggregates.md` (aggregates, invariants, cross-aggregate policies), and
// `04-transitions.md` (the `From | Event | To` transition tables). The `04-erd.dbml` is
// NOT hand-parsed — `@dbml/core` owns it (engine.mjs), exactly as in erd/statecharts.
//
// COPIED (not cross-referenced) from the sibling statecharts/erd md.mjs — this skill
// reads the SAME pinned 02/03/04 shapes. Each skill stays self-contained and
// copy-portable (doctrine: reuse over invention, copied never referenced). The base
// section/table/list parser is identical; the derivations below are the 06-specific
// layer (policies + terminals are new here).
//
// It is NOT a general CommonMark parser. It reads: `## ` / `### ` headings, GitHub pipe
// tables, ordered lists, and a leading HTML comment block.

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

export function parse(text) {
  if (typeof text !== 'string') throw new ParseError('input is not a string');
  const lines = text.split(/\r?\n/);

  const doc = { fingerprintBlock: null, sections: new Map(), order: [], preamble: [] };

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
// 06-specific derivations over the parsed upstream shapes.
// ===========================================================================

// --- 02: Terms + enums + forbidden synonyms.
//   `## Terms` (or `## Glossary`) holds a `Term | …` table.
//   `## Enums` holds `### <Aggregate>Status` subsections each a `Value | Derived from event` table.
//   `## Forbidden Synonyms` holds `Forbidden term | Canonical term | …`.
// Returns { terms:[…], enums:[{agg, name, values:[…], derivations:Map(value→event01)}],
//           forbidden:[{term,canonical}], shapeOk }.
// shapeOk is false when the enums OR forbidden section is absent (→ broken-test): the
// M15/M17 scan lists cannot be built.
export function deriveGlossary02(doc) {
  const enums = [];
  const terms = [];
  let enumsSectionFound = false;
  let forbiddenSectionFound = false;
  let termsSectionFound = false;

  for (const [title, sec] of doc.sections) {
    if (/^terms?$|^glossary$|^ubiquitous/i.test(title)) {
      termsSectionFound = true;
      const t = firstTable(sec);
      if (t) {
        const termIdx = t.columns.findIndex((c) => /^term$/i.test(c));
        const ti = termIdx === -1 ? 0 : termIdx;
        for (const r of t.rows) if (r[ti]) terms.push(r[ti]);
      }
    }
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
          if (derivColIdx !== -1 && r[derivColIdx]) derivations.set(v, stripBackticks(r[derivColIdx]));
        }
        const agg = subTitle.replace(/Status$/i, '');
        enums.push({ agg, name: subTitle, values, derivations });
      }
    }
  }
  const forbidden = [];
  for (const [title, sec] of doc.sections) {
    if (/forbidden/i.test(title)) {
      forbiddenSectionFound = true;
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
  return { terms, enums, forbidden, shapeOk: enumsSectionFound && forbiddenSectionFound, termsSectionFound };
}

function stripBackticks(s) {
  return String(s == null ? '' : s).replace(/^["'`]+|["'`]+$/g, '').trim();
}

// --- 03: aggregates + invariants + cross-aggregate policies.
//   Each `### <AggregateName>` under `## Aggregates` is one aggregate.
//   `## Invariants` (or per-aggregate) holds `INV-<Agg>-<n> | Rule` rows.
//   `## Cross-Aggregate Policies` holds `Policy | Mode | Source Event | Target … ` rows.
// Returns { aggregates:[name], invariants:[{id, agg, ruleText}],
//           policies:[{name, mode, sourceEvent01, targetConsequence}], shapeOk }.
export function deriveAggregates03(doc) {
  const aggregates = [];
  const invariants = [];
  const policies = [];

  for (const [title, sec] of doc.sections) {
    if (/^aggregates?$/i.test(title)) {
      for (const subTitle of sec.subOrder) aggregates.push(subTitle);
    }
  }
  // Fallback: aggregates may be `### Name` directly under a top section; also gather any
  // `### ` whose body has an Invariants table id matching INV-<that>-.
  if (aggregates.length === 0) {
    for (const [, sec] of doc.sections) for (const st of sec.subOrder) aggregates.push(st);
  }

  // invariants: any table whose first column matches INV-<Agg>-<n>
  for (const [, sec] of doc.sections) {
    const scan = (s) => {
      for (const t of s.tables) {
        const idIdx = t.columns.findIndex((c) => /^id$|invariant/i.test(c));
        const ruleIdx = t.columns.findIndex((c) => /rule|description|statement/i.test(c));
        for (const r of t.rows) {
          const id = r[idIdx === -1 ? 0 : idIdx];
          const m = /^INV-([A-Za-z][A-Za-z0-9]*)-(\d+)$/.exec((id || '').trim());
          if (!m) continue;
          invariants.push({ id: id.trim(), agg: m[1], ruleText: stripBackticks(r[ruleIdx === -1 ? (r.length - 1) : ruleIdx] || '') });
        }
      }
    };
    scan(sec);
    for (const sub of sec.subsections.values()) scan(sub);
  }

  // policies: a `## Cross-Aggregate Policies` table.
  for (const [title, sec] of doc.sections) {
    if (/cross.?aggregate|policies/i.test(title)) {
      const t = firstTable(sec);
      if (t) {
        const nameIdx = t.columns.findIndex((c) => /^policy$|name/i.test(c));
        const modeIdx = t.columns.findIndex((c) => /mode/i.test(c));
        const srcIdx = t.columns.findIndex((c) => /source.*event|event/i.test(c));
        const tgtIdx = t.columns.findIndex((c) => /target|consequence/i.test(c));
        for (const r of t.rows) {
          const name = (r[nameIdx === -1 ? 0 : nameIdx] || '').trim();
          if (!name) continue;
          const mode = (r[modeIdx === -1 ? 1 : modeIdx] || '').trim().toLowerCase();
          policies.push({
            name,
            mode: /eventual/.test(mode) ? 'eventual' : 'transactional',
            sourceEvent01: stripBackticks(r[srcIdx === -1 ? 2 : srcIdx] || ''),
            targetConsequence: stripBackticks(r[tgtIdx === -1 ? (r.length - 1) : tgtIdx] || ''),
          });
        }
      }
    }
  }

  return { aggregates: [...new Set(aggregates)], invariants, policies, shapeOk: true };
}

// --- 04-transitions.md: `## Transition Tables` with `### <TableName>` blocks, each a
// `From | Event | To` table. The `∅` (empty-set) origin row marks the initial state.
// Returns { entities:[{entity, rows:[{from, event01, to}], initial, terminals:[…]}], shapeOk }.
// terminals = states appearing as a `To` (≠initial) but never as a (non-∅) `From`.
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
          const event01 = stripBackticks(r[ei]);
          const to = r[ti];
          const isEmpty = from === '∅' || from === '' || /^(\\emptyset|null|none|-)$/i.test(from || '');
          if (isEmpty) { initial = to; rows.push({ from: '∅', event01, to }); }
          else rows.push({ from, event01, to });
        }
        entities.push({ entity: subTitle, rows, initial, terminals: computeTerminals(rows, initial) });
      }
    }
  }
  return { entities, shapeOk: sectionFound && entities.length > 0 };
}

export function computeTerminals(rows, initial) {
  const froms = new Set(rows.filter((r) => r.from !== '∅').map((r) => r.from));
  const tos = new Set(rows.map((r) => r.to).filter(Boolean));
  const terminals = [];
  for (const to of tos) {
    if (to === initial) continue;
    if (!froms.has(to)) terminals.push(to);
  }
  return [...new Set(terminals)].sort();
}
