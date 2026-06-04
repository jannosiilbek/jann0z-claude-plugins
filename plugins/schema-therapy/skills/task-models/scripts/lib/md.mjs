// md.mjs — hand-rolled, dependency-free markdown reader for the PINNED 07 shape the
// task-models harness consumes (simulation.md §1): `### <PersonaName>` subsections under
// `## Personas`, each carrying a `**Jobs-to-be-done:**` table `Job | Trigger | Outcome`.
//
// COPIED (not cross-referenced) from the sibling personas md.mjs (H2/H3 + pipe-table +
// labelled-line primitives + the leading fingerprint comment block), then NARROWED to the
// persona-name + jobs-table slice 08 consumes (08 reads 07 ONLY for the (persona, job)
// bijection — never its goals/business-actor prose). Reuse over invention, copied never
// imported — each skill stays self-contained and copy-portable.

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

// Parse the whole document into a flat section structure (H2 → H3 subsections).
export function parse(text) {
  if (typeof text !== 'string') throw new ParseError('input is not a string');
  const lines = text.split(/\r?\n/);

  const doc = { sections: new Map(), order: [], preamble: [] };

  // A leading fingerprint comment block opened but never closed is the one parser-level
  // malformed boundary (matches the sibling readers).
  const firstNonBlank = lines.findIndex((l) => l.trim() !== '');
  if (firstNonBlank !== -1 && lines[firstNonBlank].trim().startsWith('<!--')) {
    let closed = false;
    for (let i = firstNonBlank; i < lines.length; i++) {
      if (lines[i].includes('-->')) { closed = true; break; }
    }
    if (!closed) throw new ParseError('comment block opened (`<!--`) but never closed (`-->`)');
  }

  let currentH2 = null;
  let currentH3 = null;
  let seenH2 = false;

  const newSection = (title, level) => ({
    title, level, lines: [], tables: [], labels: [],
    subsections: new Map(), subOrder: [],
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
      continue;
    }
    const lab = /^\s*\*\*(.+?):\*\*\s*(.*\S)?\s*$/.exec(line);
    if (lab) {
      section.labels.push({ label: lab[1].trim(), value: (lab[2] || '').trim(), line: i });
      continue;
    }
  }
}

// derivePersonaJobs07(doc) → { ok, detail, personaJobs:[{persona, job, trigger, outcome}] }
//
// 07 is authority for the (persona, job) set (simulation.md §3.1): the cartesian of every
// `### <PersonaName>` × every `Job` cell of its `**Jobs-to-be-done:**` table. `ok:false`
// means 07 is UNPARSEABLE against the pinned shape (no `## Personas` with `### Persona`
// subsections carrying a jobs table) ⇒ the harness routes broken-test (§9 case 3).
export function derivePersonaJobs07(doc) {
  const personasSec = doc.sections.get('Personas');
  if (!personasSec || personasSec.subOrder.length === 0) {
    return { ok: false, detail: 'no `## Personas` section with `### <PersonaName>` subsections', personaJobs: [] };
  }
  const personaJobs = [];
  let anyTable = false;
  for (const name of personasSec.subOrder) {
    const block = personasSec.subsections.get(name);
    // The jobs table: the table after the `**Jobs-to-be-done:**` label whose columns are
    // exactly Job | Trigger | Outcome (case-insensitive).
    const jobsTable = block.tables.find((t) => {
      const cols = t.columns.map((c) => c.toLowerCase());
      return cols.length === 3 && cols[0] === 'job' && cols[1] === 'trigger' && cols[2] === 'outcome';
    });
    if (!jobsTable) continue;
    anyTable = true;
    for (const row of jobsTable.rows) {
      const job = (row[0] || '').trim();
      if (job === '') continue;
      personaJobs.push({
        persona: name,
        job,
        trigger: (row[1] || '').trim(),
        outcome: (row[2] || '').trim(),
      });
    }
  }
  if (!anyTable) {
    return { ok: false, detail: 'no `### <PersonaName>` subsection carries a `Job | Trigger | Outcome` jobs table', personaJobs: [] };
  }
  return { ok: true, detail: '', personaJobs };
}
