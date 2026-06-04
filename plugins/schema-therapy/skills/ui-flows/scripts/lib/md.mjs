// md.mjs — hand-rolled, dependency-free markdown reader for the PINNED upstream shapes 09
// consumes: `02-glossary.md` (the enum + `## Forbidden Synonyms` slice), `04-transitions.md`
// (the `From | Event | To` transition tables), and `07-personas.md` (the `### <PersonaName>`
// blocks fixing one 09 model per persona).
//
// COPIED (not cross-referenced) from the sibling gherkin/task-models md.mjs — same pinned
// 02/04-transitions/07 shapes (reuse over invention; copied never imported; each skill stays
// self-contained and copy-portable). The base section/table parser is identical; the
// derivations are the 09-specific slice.

export class ParseError extends Error {
  constructor(message, rule) { super(message); this.name = 'ParseError'; this.rule = rule || null; }
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
function looksLikeTableRow(line) { return line.trim().includes('|'); }

export function parse(text) {
  if (typeof text !== 'string') throw new ParseError('input is not a string');
  const lines = text.split(/\r?\n/);
  const doc = { sections: new Map(), order: [], preamble: [] };

  const firstNonBlank = lines.findIndex((l) => l.trim() !== '');
  if (firstNonBlank !== -1 && lines[firstNonBlank].trim().startsWith('<!--')) {
    let closed = false;
    for (let i = firstNonBlank; i < lines.length; i++) {
      if (lines[i].includes('-->')) { closed = true; break; }
    }
    if (!closed) throw new ParseError('comment block opened (`<!--`) but never closed (`-->`)');
  }

  let currentH2 = null, currentH3 = null, seenH2 = false;
  const newSection = (title, level) => ({
    title, level, lines: [], tables: [], subsections: new Map(), subOrder: [],
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h3) {
      const title = h3[1].trim();
      currentH3 = newSection(title, 3);
      if (currentH2) { currentH2.subsections.set(title, currentH3); currentH2.subOrder.push(title); }
      continue;
    }
    if (/^##\s/.test(line) && h2) {
      const title = h2[1].trim();
      currentH2 = newSection(title, 2);
      currentH3 = null; seenH2 = true;
      doc.sections.set(title, currentH2); doc.order.push(title);
      continue;
    }
    const target = currentH3 || currentH2;
    if (target) target.lines.push(line);
    else if (!seenH2) doc.preamble.push(line);
  }

  const fill = (section) => {
    extractTables(section);
    for (const sub of section.subsections.values()) extractTables(sub);
  };
  for (const sec of doc.sections.values()) fill(sec);
  return doc;
}

function extractTables(section) {
  const lines = section.lines;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (looksLikeTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
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
}

function firstTable(section) { return section && section.tables.length ? section.tables[0] : null; }
function stripBackticks(s) { return String(s == null ? '' : s).replace(/^["'`]+|["'`]+$/g, '').trim(); }

// --- 02: enum values + forbidden synonyms ----------------------------------
// `## Enums` (or `### <Name>Status` subsections anywhere) → enum value tables;
// `## Forbidden Synonyms` → `Forbidden term | Canonical term | …`.
// Returns { enums:[{name, values}], forbidden:[{term,canonical}], shapeOk }.
// shapeOk is false when the Forbidden Synonyms section is absent (→ broken-test).
export function deriveGlossary02(doc) {
  const enums = [];
  for (const [title, sec] of doc.sections) {
    if (/^enums?$/i.test(title)) {
      for (const subTitle of sec.subOrder) {
        const sub = sec.subsections.get(subTitle);
        const t = firstTable(sub);
        if (!t) continue;
        const vi = Math.max(0, t.columns.findIndex((c) => /^value$/i.test(c)));
        const values = [];
        for (const r of t.rows) { if (r[vi]) values.push(stripBackticks(r[vi])); }
        enums.push({ name: subTitle, values });
      }
    }
  }
  const forbidden = [];
  let forbiddenSectionFound = false;
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
          if (term) forbidden.push({ term: stripBackticks(term), canonical: stripBackticks(canon || '') });
        }
      }
    }
  }
  return { enums, forbidden, shapeOk: forbiddenSectionFound };
}

// --- 04-transitions.md: `### <entity>` blocks, each a `From | Event | To` table ----
// Returns { entities:[{entity, rows:[{from, event01, to}]}], shapeOk }.
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
        for (const r of t.rows) {
          const from = r[fi];
          const event01 = stripBackticks(r[ei]);
          const to = r[ti];
          const isEmpty = from === '∅' || from === '' || /^(null|none|-)$/i.test(from || '');
          rows.push({ from: isEmpty ? '∅' : from, event01, to });
        }
        entities.push({ entity: subTitle, rows });
      }
    }
  }
  return { entities, shapeOk: sectionFound && entities.length > 0 };
}

// --- 07: persona blocks ----------------------------------------------------
// `## Personas` with `### <PersonaName>` subsections. Returns { personas:[name], shapeOk }.
// shapeOk is false when no `## Personas`/`### <PersonaName>` shape (→ broken-test): the
// file↔07 bijection cannot be anchored.
export function derivePersonas07(doc) {
  const personasSec = doc.sections.get('Personas');
  if (!personasSec || personasSec.subOrder.length === 0) {
    return { ok: false, personas: [], detail: 'no `## Personas` section with `### <PersonaName>` subsections' };
  }
  const personas = personasSec.subOrder.slice();
  return { ok: true, personas, detail: '' };
}
