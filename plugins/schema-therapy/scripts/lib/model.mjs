// model.mjs — parse each specs/ artifact into a structured model: the set of
// names it OWNS, the upstream names it USES, and its fingerprint block. Pinned
// to the emitted shapes in test-workspace/specs (the live positive fixture).
//
// Hand-rolled, zero-dep. A genuinely unreadable pinned shape throws ParseError
// (=> malformed status for the suite); a present-but-defective cross-reference
// is a `fail` finding, returned in-band (never thrown).

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import {
  readTables,
  readHeadings,
  readOrderedListsByHeading,
  readFingerprints,
  colIndex,
  ParseError,
} from './md.mjs';

// ---- 01 event-storming ------------------------------------------------------
export function parse01(text) {
  const tables = readTables(text);
  const events = [];
  const actors = [];
  const hotspots = [];
  const aggregates = []; // skeleton headings under ## Lifecycle Skeletons
  const eventTriggers = new Map(); // event -> trigger string

  for (const t of tables) {
    const lc = t.columns.map((c) => c.toLowerCase());
    if (lc[0] === 'event' && lc.includes('actor')) {
      const ei = colIndex(t.columns, 'event');
      const ti = colIndex(t.columns, 'trigger');
      for (const r of t.rows) {
        if (r[ei]) {
          events.push(r[ei]);
          if (ti >= 0) eventTriggers.set(r[ei], r[ti] || '');
        }
      }
    } else if (lc[0] === 'actor' && lc.includes('kind')) {
      const ai = colIndex(t.columns, 'actor');
      for (const r of t.rows) if (r[ai]) actors.push(r[ai]);
    } else if (lc[0] === 'hotspot') {
      const hi = colIndex(t.columns, 'hotspot');
      for (const r of t.rows) if (r[hi]) hotspots.push(r[hi]);
    }
  }

  // aggregate skeleton headings: the ### headings appearing AFTER the
  // "## Lifecycle Skeletons" h2.
  const lines = text.split(/\r?\n/);
  let inSkeletons = false;
  const skeletonSteps = new Map(); // aggregate -> [event,...]
  let current = null;
  for (const line of lines) {
    const h2 = /^##\s+(.*\S)\s*$/.exec(line);
    if (h2) {
      inSkeletons = /lifecycle skeleton/i.test(h2[1]);
      current = null;
      continue;
    }
    if (!inSkeletons) continue;
    const h3 = /^###\s+(.*\S)\s*$/.exec(line);
    if (h3) {
      current = h3[1].trim();
      aggregates.push(current);
      skeletonSteps.set(current, []);
      continue;
    }
    const li = /^\s*\d+\.\s+(.*\S)\s*$/.exec(line);
    if (li && current) skeletonSteps.get(current).push(li[1].trim());
  }

  if (events.length === 0 || actors.length === 0)
    throw new ParseError('01: missing Domain Events or Actors table');

  return { events, actors, hotspots, aggregates, skeletonSteps, eventTriggers };
}

// ---- 02 glossary ------------------------------------------------------------
export function parse02(text) {
  const tables = readTables(text);
  const terms = [];
  const forbidden = [];
  const enums = new Map(); // EnumName -> [{value, derivedFrom}]
  let termsTable = null;
  let forbiddenTable = null;

  for (const t of tables) {
    const lc = t.columns.map((c) => c.toLowerCase());
    if (lc[0] === 'term' && lc.some((c) => c.includes('definition'))) termsTable = t;
    else if (lc[0].includes('forbidden')) forbiddenTable = t;
  }
  if (termsTable) {
    const ti = colIndex(termsTable.columns, 'term');
    const owi = colIndex(termsTable.columns, 'owns 01');
    // "01 element (exact string)" — must NOT be the "Owns 01 element?" column.
    const oi = termsTable.columns.findIndex(
      (c, idx) => idx !== owi && /01 element/i.test(c) && !/owns/i.test(c),
    );
    for (const r of termsTable.rows) {
      if (!r[ti]) continue;
      terms.push({
        term: r[ti],
        ownsO1: owi >= 0 ? /yes/i.test(r[owi] || '') : false,
        ownedElement: oi >= 0 ? (r[oi] || '').trim() : '',
      });
    }
  }
  if (forbiddenTable) {
    const fi = colIndex(forbiddenTable.columns, 'forbidden');
    const ci = colIndex(forbiddenTable.columns, 'canonical');
    for (const r of forbiddenTable.rows) {
      if (r[fi]) forbidden.push({ forbidden: r[fi], canonical: ci >= 0 ? r[ci] : '' });
    }
  }

  // enums: ### <Name> headings under "## Enums" with a Value/Derived table
  const lines = text.split(/\r?\n/);
  let inEnums = false;
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const h2 = /^##\s+(.*\S)\s*$/.exec(lines[i]);
    if (h2) {
      inEnums = /^enums$/i.test(h2[1].trim());
      current = null;
      continue;
    }
    if (!inEnums) continue;
    const h3 = /^###\s+(.*\S)\s*$/.exec(lines[i]);
    if (h3) {
      current = h3[1].trim();
      enums.set(current, []);
    }
  }
  // populate enum values by matching each enum table to its preceding heading
  for (const t of tables) {
    const lc = t.columns.map((c) => c.toLowerCase());
    if (lc[0] === 'value' && lc.some((c) => c.includes('derived')) && t.heading && enums.has(t.heading)) {
      const vi = colIndex(t.columns, 'value');
      const di = colIndex(t.columns, 'derived');
      for (const r of t.rows) {
        if (r[vi]) enums.get(t.heading).push({ value: r[vi], derivedFrom: di >= 0 ? (r[di] || '').trim() : '' });
      }
    }
  }

  if (terms.length === 0 || enums.size === 0)
    throw new ParseError('02: missing Terms or Enums');

  return { terms, forbidden, enums };
}

// ---- 03 aggregates ----------------------------------------------------------
export function parse03(text) {
  const headings = readHeadings(text);
  const aggregates = []; // ### headings under ## Aggregates
  const invariants = []; // INV-<Agg>-<n>
  const invariantRules = new Map(); // INV id -> rule text
  const policies = []; // { name, sourceEvent, targetAggregate }
  const boundaryTerms = []; // 02 Term cells
  const refTargets = []; // References Target aggregate cells

  const lines = text.split(/\r?\n/);
  let inAggregates = false;
  let currentAgg = null;
  for (const line of lines) {
    const h2 = /^##\s+(.*\S)\s*$/.exec(line);
    if (h2) {
      inAggregates = /^aggregates$/i.test(h2[1].trim());
      currentAgg = null;
      continue;
    }
    const h3 = /^###\s+(.*\S)\s*$/.exec(line);
    if (h3 && inAggregates) {
      currentAgg = h3[1].trim();
      aggregates.push(currentAgg);
    }
  }

  const tables = readTables(text);
  for (const t of tables) {
    const lc = t.columns.map((c) => c.toLowerCase());
    // invariants: ID / Rule / Scope
    if (lc[0] === 'id' && lc.some((c) => c.includes('rule'))) {
      const ii = colIndex(t.columns, 'id');
      const ri = colIndex(t.columns, 'rule');
      for (const r of t.rows) {
        if (r[ii] && /^INV-/.test(r[ii])) {
          invariants.push(r[ii]);
          invariantRules.set(r[ii], ri >= 0 ? (r[ri] || '').trim() : '');
        }
      }
    }
    // boundary contents: Member / Kind / 02 Term
    else if (lc[0] === 'member' && lc.some((c) => c.includes('02 term'))) {
      const tcol = colIndex(t.columns, '02 term');
      for (const r of t.rows) {
        const v = (r[tcol] || '').trim();
        if (v && v !== '—' && v !== '-') boundaryTerms.push(v);
      }
    }
    // references: Target aggregate / Identity field held
    else if (lc.some((c) => c.includes('target aggregate')) && lc.some((c) => c.includes('identity'))) {
      const tcol = colIndex(t.columns, 'target aggregate');
      for (const r of t.rows) {
        const v = (r[tcol] || '').trim();
        if (v && v.toLowerCase() !== 'none') refTargets.push(v);
      }
    }
    // policies: Policy / Source event / Target aggregate / Mode
    else if (lc[0] === 'policy' && lc.some((c) => c.includes('source event'))) {
      const pi = colIndex(t.columns, 'policy');
      const si = colIndex(t.columns, 'source event');
      const tcol = colIndex(t.columns, 'target aggregate');
      const mi = colIndex(t.columns, 'mode');
      for (const r of t.rows) {
        if (r[pi]) {
          policies.push({
            name: r[pi],
            sourceEvent: si >= 0 ? (r[si] || '').trim() : '',
            targetAggregate: tcol >= 0 ? (r[tcol] || '').trim() : '',
            mode: mi >= 0 ? (r[mi] || '').trim() : '',
          });
        }
      }
    }
  }

  if (aggregates.length === 0 || invariants.length === 0)
    throw new ParseError('03: missing aggregate headings or invariants');

  return { aggregates, invariants, invariantRules, policies, boundaryTerms, refTargets };
}

// ---- 04 erd.dbml ------------------------------------------------------------
export function parse04dbml(text) {
  const lines = text.split(/\r?\n/);
  const tableNames = [];
  const enums = new Map(); // enum name -> [values...] in order
  const columns = new Map(); // table -> [{name, type}]
  const refs = [];

  let mode = null; // 'table' | 'enum'
  let curName = null;
  let curEnumVals = null;
  let curCols = null;

  for (let raw of lines) {
    const line = stripDbmlComment(raw).trim();
    if (line === '') continue;

    if (mode === null) {
      let m = /^Table\s+("?)([A-Za-z0-9_]+)\1\s*\{/.exec(line);
      if (m) {
        mode = 'table';
        curName = m[2];
        curCols = [];
        tableNames.push(curName);
        continue;
      }
      m = /^Enum\s+("?)([A-Za-z0-9_]+)\1\s*\{/.exec(line);
      if (m) {
        mode = 'enum';
        curName = m[2];
        curEnumVals = [];
        continue;
      }
      m = /^Ref\s*:?\s*(.+)$/.exec(line);
      if (m) {
        refs.push(m[1].trim());
        continue;
      }
    } else if (mode === 'enum') {
      if (line.startsWith('}')) {
        enums.set(curName, curEnumVals);
        mode = null;
        curName = null;
        curEnumVals = null;
        continue;
      }
      const vm = /^([A-Za-z0-9_]+)/.exec(line);
      if (vm) curEnumVals.push(vm[1]);
    } else if (mode === 'table') {
      if (line.startsWith('}')) {
        columns.set(curName, curCols);
        mode = null;
        curName = null;
        curCols = null;
        continue;
      }
      // column: <name> <type> [ ... ]
      const cm = /^([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)/.exec(line);
      if (cm) curCols.push({ name: cm[1], type: cm[2] });
    }
  }
  if (mode !== null) throw new ParseError(`04: unterminated ${mode} block (${curName})`);
  if (tableNames.length === 0 || enums.size === 0)
    throw new ParseError('04: no tables or enums parsed from .dbml');

  return { tableNames, enums, columns, refs };
}

function stripDbmlComment(line) {
  // strip a line-leading `//` comment (but keep `// fingerprints` reading to md.mjs)
  const idx = line.indexOf('//');
  if (idx === 0) return '';
  if (idx > 0) {
    // crude: only strip if not inside a quoted note; the emitted shape never
    // puts `//` inside a note string we need, so this is safe for our reads.
    return line.slice(0, idx);
  }
  return line;
}

// ---- 04-transitions.md ------------------------------------------------------
export function parse04transitions(text) {
  const tables = readTables(text);
  const entities = new Map(); // entityName -> [{from, event, to}]
  for (const t of tables) {
    const lc = t.columns.map((c) => c.toLowerCase());
    if (lc[0] === 'from' && lc.some((c) => c.includes('event')) && lc.some((c) => c === 'to')) {
      const fi = colIndex(t.columns, 'from');
      const ei = colIndex(t.columns, 'event');
      const ti = colIndex(t.columns, 'to');
      const ent = t.heading || '?';
      const rows = [];
      for (const r of t.rows) {
        rows.push({ from: (r[fi] || '').trim(), event: (r[ei] || '').trim(), to: (r[ti] || '').trim() });
      }
      entities.set(ent, rows);
    }
  }
  if (entities.size === 0) throw new ParseError('04-transitions: no transition tables parsed');
  return { entities };
}

// ---- 05 scxml ---------------------------------------------------------------
export function parse05scxml(text) {
  // pinned shape: state ids, final ids, transition events, 01-event annotations,
  // supersedes target, initial attr.
  const stateIds = [];
  const finalIds = [];
  const transitions = []; // {event, target, annot}
  let initial = null;
  let supersedes = null;

  const mSup = /<!--\s*supersedes\s*:\s*([^\s][^>]*?)\s*-->/.exec(text);
  if (mSup) supersedes = mSup[1].trim();

  const mInit = /<scxml\b[^>]*\binitial="([^"]*)"/.exec(text);
  if (mInit) initial = mInit[1];

  const stateRe = /<state\s+id="([^"]+)"/g;
  let m;
  while ((m = stateRe.exec(text))) stateIds.push(m[1]);
  const finalRe = /<final\s+id="([^"]+)"/g;
  while ((m = finalRe.exec(text))) finalIds.push(m[1]);

  // transitions with their immediately preceding 01-event annotation
  const lines = text.split(/\r?\n/);
  let pendingAnnot = null;
  for (const line of lines) {
    const am = /<!--\s*01-event\s*:\s*(.+?)\s*-->/.exec(line);
    if (am) {
      pendingAnnot = am[1].trim();
      continue;
    }
    const tm = /<transition\s+event="([^"]+)"\s+target="([^"]+)"/.exec(line);
    if (tm) {
      transitions.push({ event: tm[1], target: tm[2], annot: pendingAnnot });
      pendingAnnot = null;
    }
  }

  if (stateIds.length === 0 && finalIds.length === 0)
    throw new ParseError('05: no states parsed from scxml');

  return { stateIds, finalIds, transitions, initial, supersedes };
}

// ---- 06 feature -------------------------------------------------------------
export function parse06feature(text) {
  const lines = text.split(/\r?\n/);
  let feature = null;
  const scenarios = []; // {tag, whenLines:[...]}
  let pendingTag = null;
  for (const line of lines) {
    const fm = /^\s*Feature:\s*(.*\S)\s*$/.exec(line);
    if (fm) {
      feature = fm[1].trim();
      continue;
    }
    const tm = /^\s*@(\S+)\s*$/.exec(line);
    if (tm) {
      pendingTag = tm[1];
      continue;
    }
    const sm = /^\s*Scenario:/.exec(line);
    if (sm) {
      scenarios.push({ tag: pendingTag, whenLines: [], collecting: true });
      pendingTag = null;
      continue;
    }
    const wm = /^\s*When\b\s*(.*\S)\s*$/.exec(line);
    if (wm && scenarios.length > 0) {
      scenarios[scenarios.length - 1].whenLines.push(wm[1].trim());
    }
  }
  if (feature === null) throw new ParseError('06: no Feature: line');
  return { feature, scenarios };
}

// ---- artifact discovery + fingerprint reading ------------------------------
export function discoverArtifacts(specsDir) {
  const out = {}; // logical name -> { path, ext, text }
  const want = {
    '01': '01-event-storming.md',
    '02': '02-glossary.md',
    '03': '03-aggregates.md',
    '04dbml': '04-erd.dbml',
    '04trans': '04-transitions.md',
  };
  for (const [k, fname] of Object.entries(want)) {
    const p = join(specsDir, fname);
    if (existsSync(p)) out[k] = { path: p, ext: extname(p), text: readFileSync(p, 'utf8') };
  }
  // 05 dir
  const d05 = join(specsDir, '05-statecharts');
  out['05'] = [];
  if (existsSync(d05) && statSync(d05).isDirectory()) {
    for (const f of readdirSync(d05).sort()) {
      if (f.endsWith('.scxml')) {
        const p = join(d05, f);
        out['05'].push({ path: p, ext: '.scxml', text: readFileSync(p, 'utf8'), stem: basename(f, '.scxml') });
      }
    }
  }
  // 06 dir
  const d06 = join(specsDir, '06-gherkin');
  out['06'] = [];
  if (existsSync(d06) && statSync(d06).isDirectory()) {
    for (const f of readdirSync(d06).sort()) {
      if (f.endsWith('.feature')) {
        const p = join(d06, f);
        out['06'].push({ path: p, ext: '.feature', text: readFileSync(p, 'utf8'), stem: basename(f, '.feature') });
      }
    }
  }
  return out;
}

export { readFingerprints };
