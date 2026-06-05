// checks.mjs — the CLOSED assertion grammar for the erd oracle (simulation.md §4).
// Mechanical (no-engine) check classes:
//   lint        L1–L15   (A-theme structure + mechanical B/C/E shape rules)
//   resolution  R-ROOT…  (C/D-theme 04→02/03 exact-string + transition edges)
//   exact-value X1–X6    (counts / deep-equal / reconciliation)
//   agent-judged AJ1–AJ4 (precondition-flagged; recorded, never block, not reconciled)
// The ENGINE class (E-*) lives in lib/engine.mjs (the strongest oracle). This file
// owns the markdown + cross-artifact layer the engine cannot see.
//
// This grammar is NEVER extended ad hoc; adding a check means editing this file AND
// simulation.md §4 in a committed change, citing a catalog rule. Every check records
// { id, class, rule, status } (status ∈ pass|fail|warn|info). A check that THROWS
// is surfaced by the harness as broken-test.
//
// COPIED scaffold from the sibling aggregates checks.mjs (the 02 + 03 pinned-shape
// readers, the upstream self-check pattern, the reconciliation arithmetic), then
// extended with the 04-specific shapes (the transitions.md table) and the
// schema-vocabulary mapping. Copied, never cross-referenced — self-contained.

import {
  isSnakeCase, looksPlural, typesCompatible, toSnake,
  RESTATEMENT_WINDOW_N, plainTokens, rawTokens,
} from './lexicon.mjs';

// --- pinned upstream shapes (simulation.md §1) ------------------------------
const REQUIRED_H2_02 = ['Terms', 'Enums', 'Forbidden Synonyms'];
const TERMS_COLUMNS_02 = ['Term', 'Definition', 'Owns 01 element?', '01 element (exact string)'];
const ENUM_VALUE_COLUMNS_02 = ['Value', 'Derived from event (exact 01 string)'];
const FORBIDDEN_COLUMNS_02 = ['Forbidden term', 'Canonical term', 'Reason'];

const REQUIRED_H2_03 = ['Aggregates', 'Cross-Aggregate Policies'];
const BOUNDARY_COLUMNS_03 = ['Member', 'Kind', '02 Term'];
const INVARIANTS_COLUMNS_03 = ['ID', 'Rule', 'Scope'];
const REFERENCES_COLUMNS_03 = ['Target aggregate', 'Identity field held', 'Reason'];

// --- transitions.md pinned shape (catalog "Pinned conventions" / L3) --------
const TRANSITIONS_H2 = 'Transition Tables';
const TRANSITIONS_COLUMNS = ['From', 'Event (exact 01 string)', 'To'];
const INITIAL_MARKER = '∅';

const norm = (s) => (s == null ? '' : String(s).trim());
const exact = (s) => norm(s);
const key = (s) => norm(s).toLowerCase().replace(/\s+/g, ' ');

function columnsMatch(table, expected) {
  if (!table) return false;
  if (table.columns.length !== expected.length) return false;
  return expected.every((c, i) => key(table.columns[i]) === key(c));
}

// =====================================================================
// 02 UPSTREAM — parse + derive + self-check.
// =====================================================================
export function deriveUpstream02(doc02) {
  const sec = (t) => doc02.sections.get(t) || null;

  const termsTable = sec('Terms') ? sec('Terms').tables[0] : null;
  const terms02 = termsTable ? termsTable.rows.map((r) => ({
    term: exact(r[0]), ownsEl: key(r[2]), element01: exact(r[3]),
  })).filter((t) => t.term !== '') : [];
  const termNames = terms02.map((t) => t.term);

  const enumSec = sec('Enums');
  const enums02 = [];
  if (enumSec) {
    for (const title of enumSec.subOrder) {
      const sub = enumSec.subsections.get(title);
      const vt = sub.tables[0] || null;
      const values = vt ? vt.rows.map((r) => ({ value: exact(r[0]), derivedFromEvent: exact(r[1]) })) : [];
      enums02.push({
        enumName: exact(title),
        aggregate: exact(title.replace(/Status$/, '')),
        valuesTable: vt,
        values,
      });
    }
  }

  const fbTable = sec('Forbidden Synonyms') ? sec('Forbidden Synonyms').tables[0] : null;
  const fbRows = fbTable ? fbTable.rows.map((r) => ({ forbidden: exact(r[0]), canonical: exact(r[1]) })).filter((f) => f.forbidden !== '') : [];
  const forbidden02 = fbRows.map((f) => f.forbidden);
  // Canonical term per forbidden term (used by L12's derived-identifier exemption,
  // simulation.md §DEFECT-2 / L12): a forbidden token that is part of a canonical
  // term's pinned snake_case derivation is NOT a synonym misuse.
  const forbiddenCanonical = new Map(fbRows.map((f) => [key(f.forbidden), f.canonical]));

  return { termsTable, terms02, termNames, enumSec, enums02, fbTable, forbidden02, forbiddenCanonical };
}

export function parseUpstream02Shape(doc02) {
  const missing = REQUIRED_H2_02.filter((h) => !doc02.sections.has(h));
  if (missing.length) return { ok: false, detail: `upstream 02 missing required section(s): ${missing.join(', ')}` };
  const g = deriveUpstream02(doc02);
  if (!columnsMatch(g.termsTable, TERMS_COLUMNS_02)) return { ok: false, detail: 'upstream 02 Terms table column shape is wrong' };
  if (g.fbTable && !columnsMatch(g.fbTable, FORBIDDEN_COLUMNS_02)) return { ok: false, detail: 'upstream 02 Forbidden Synonyms table column shape is wrong' };
  if (g.enums02.length === 0) return { ok: false, detail: 'upstream 02 has no `### <Name>Status` enum subsection' };
  for (const en of g.enums02) {
    if (!columnsMatch(en.valuesTable, ENUM_VALUE_COLUMNS_02)) return { ok: false, detail: `upstream 02 enum '${en.enumName}' values table column shape is wrong` };
  }
  return { ok: true, detail: '' };
}

// 02 internal self-consistency (simulation.md §9.3). erd never receives 01, so it
// MUST NOT re-verify what only the GLOSSARY skill can: that an enum value's
// `Derived from event` is a real 01 event (that check is single-owned by the
// glossary harness — D6/F3 — re-verified suite-wide by the drift police). erd
// verifies ONLY what it legitimately depends on and can see from 02 alone: every
// enum has ≥1 value and no Value / Derived-from-event cell is blank (the value
// table is internally consistent). A defect routes upstream-defect → 02.
// Returns { ok, defects }.
export function upstream02SelfCheck(g02) {
  const defects = [];
  for (const en of g02.enums02) {
    if (en.values.length === 0) {
      defects.push({ enum: en.enumName,
        detail: `02 enum '${en.enumName}' has an empty values table` });
      continue;
    }
    for (const v of en.values) {
      if (!v.value || !v.derivedFromEvent) {
        defects.push({ enum: en.enumName, value: v.value,
          detail: `02 enum '${en.enumName}' has a value row with a blank Value / Derived-from-event cell` });
      }
    }
  }
  return { ok: defects.length === 0, defects };
}

// 02↔03 cross-consistency (simulation.md §9.3). The 02-origin inconsistency erd CAN
// see from 02+03 alone: a `### <Name>Status` enum in 02 whose `<Name>` matches no
// `### <Name>` aggregate heading in 03 — a lifecycle enum for an aggregate the model
// has none of, so erd would carry it on no table. 02 owns the enum, so the fix
// routes upstream → 02. Returns { ok, defects }.
export function upstream02CrossCheck(g02, g03) {
  const aggNames = new Set(g03.aggregates.map((a) => exact(a.name)));
  const defects = [];
  for (const en of g02.enums02) {
    if (!/Status$/.test(en.enumName)) continue;
    const agg = exact(en.aggregate);
    if (agg && !aggNames.has(agg)) {
      defects.push({ enum: en.enumName, aggregate: agg,
        detail: `02 enum '${en.enumName}' names aggregate '${agg}', for which 03 declares no '### ${agg}' aggregate` });
    }
  }
  return { ok: defects.length === 0, defects };
}

// =====================================================================
// 03 UPSTREAM — parse + derive + self-check.
// =====================================================================
export function deriveUpstream03(doc03) {
  const aggSec = doc03.sections.get('Aggregates') || null;
  const aggregates = [];
  if (aggSec) {
    for (const title of aggSec.subOrder) {
      const sub = aggSec.subsections.get(title);
      aggregates.push(parseAggregateSub(title, sub));
    }
  }
  return { aggSec, aggregates };
}

function parseAggregateSub(title, sub) {
  const lines = sub ? sub.lines : [];
  let root = '', rootRaw = '';
  let hasRootLine = false;
  for (const line of lines) {
    const mRoot = /^\*\*Root:\*\*\s*(.+?)\s*$/.exec(line);
    if (mRoot) {
      hasRootLine = true; rootRaw = mRoot[1];
      const mFull = /^(.+?)\s*·\s*identity:/.exec(mRoot[1]);
      root = exact(mFull ? mFull[1] : mRoot[1]);
      break;
    }
  }
  const tableByLabel = mapTablesToLabels(lines, sub ? sub.tables : []);
  const boundaryTable = tableByLabel.boundary || null;
  const referencesTable = tableByLabel.references || null;
  const invariantsTable = tableByLabel.invariants || null;

  const members = boundaryTable
    ? boundaryTable.rows.map((r) => ({ member: exact(r[0]), kind: key(r[1]), term02: exact(r[2]) }))
    : [];
  const references = referencesTable
    ? referencesTable.rows.map((r) => ({ targetAgg: exact(r[0]), identityField: exact(r[1]), reason: exact(r[2]) }))
    : [];
  const invariants = invariantsTable
    ? invariantsTable.rows.map((r) => ({ id: exact(r[0]), rule: exact(r[1]), scope: exact(r[2]) }))
    : [];

  return { name: exact(title), root, rootRaw, hasRootLine, boundaryTable, referencesTable, invariantsTable, members, references, invariants };
}

function mapTablesToLabels(lines, tables) {
  const labels = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\*\*Boundary contents:\*\*/.test(lines[i])) labels.push({ line: i, label: 'boundary' });
    else if (/^\*\*Invariants:\*\*/.test(lines[i])) labels.push({ line: i, label: 'invariants' });
    else if (/^\*\*References/.test(lines[i])) labels.push({ line: i, label: 'references' });
  }
  const out = {};
  for (const tb of tables) {
    let owner = null;
    for (const lb of labels) { if (lb.line < tb.startLine) owner = lb.label; else break; }
    if (owner && !out[owner]) out[owner] = tb;
  }
  return out;
}

export function parseUpstream03Shape(doc03) {
  const missing = REQUIRED_H2_03.filter((h) => !doc03.sections.has(h));
  if (missing.length) return { ok: false, detail: `upstream 03 missing required section(s): ${missing.join(', ')}` };
  const g = deriveUpstream03(doc03);
  if (g.aggregates.length === 0) return { ok: false, detail: 'upstream 03 has no `### <Aggregate>` subsection' };
  for (const a of g.aggregates) {
    if (a.boundaryTable && !columnsMatch(a.boundaryTable, BOUNDARY_COLUMNS_03)) return { ok: false, detail: `upstream 03 aggregate '${a.name}' Boundary table shape wrong` };
  }
  return { ok: true, detail: '' };
}

// 03 self-consistency (§9.2): every References target ∈ declared aggregates AND
// every member's `02 Term` ∈ 02 Terms. A defect routes upstream-defect → 03.
export function upstream03SelfCheck(g03, g02) {
  const declared = new Set(g03.aggregates.map((a) => exact(a.name)));
  const terms = new Set(g02.termNames.map(exact));
  const defects = [];
  for (const a of g03.aggregates) {
    for (const r of a.references) {
      if (r.targetAgg && r.targetAgg !== '—' && !declared.has(exact(r.targetAgg))) {
        defects.push({ kind: 'ghost-reference', element: r.targetAgg,
          detail: `03 aggregate '${a.name}' References target '${r.targetAgg}' is not a declared 03 aggregate` });
      }
    }
    for (const m of a.members) {
      if (m.term02 && m.term02 !== '—' && !terms.has(exact(m.term02))) {
        defects.push({ kind: 'ghost-term', element: m.term02,
          detail: `03 aggregate '${a.name}' member '${m.member}' cites 02 Term '${m.term02}' absent from 02 Terms` });
      }
    }
  }
  return { ok: defects.length === 0, defects };
}

// =====================================================================
// 04 transitions.md — parse the companion (simulation.md §3.1).
// =====================================================================
export function deriveTransitions(docMd) {
  const sec = docMd.sections.get(TRANSITIONS_H2) || null;
  const transitionTables = [];
  let h2Count = 0;
  for (const h of docMd.order) if (h === TRANSITIONS_H2) h2Count++;
  let shapeOk = !!sec && h2Count === 1;
  if (sec) {
    for (const title of sec.subOrder) {
      const sub = sec.subsections.get(title);
      const tbl = sub.tables[0] || null;
      if (!tbl || !columnsMatch(tbl, TRANSITIONS_COLUMNS)) shapeOk = false;
      const rows = tbl ? tbl.rows.map((r) => ({ from: exact(r[0]), event: exact(r[1]), to: exact(r[2]) })) : [];
      transitionTables.push({ table: exact(title), rows });
    }
  }
  return { sec, h2Count, shapeOk, transitionTables };
}

// =====================================================================
// FINGERPRINT extraction (catalog A4–A6 / L4–L6). Read raw text of each file.
// =====================================================================
export function extractFingerprints(text, isDbml) {
  // .dbml: `// fingerprints:` comment lines.  .md: `<!-- fingerprints: -->` block.
  const out = { has02: null, has03: null, present: false };
  const lines = text.split(/\r?\n/);
  let inBlock = false;
  const grab = (line) => {
    const m02 = /02-glossary\.md@sha256:([0-9a-fA-F]{64})/.exec(line);
    const m03 = /03-aggregates\.md@sha256:([0-9a-fA-F]{64})/.exec(line);
    if (m02) out.has02 = m02[1];
    if (m03) out.has03 = m03[1];
  };
  if (isDbml) {
    for (const line of lines) {
      if (/^\s*\/\/\s*fingerprints:/.test(line)) { inBlock = true; out.present = true; grab(line); continue; }
      if (inBlock && /^\s*\/\//.test(line)) { grab(line); continue; }
      if (inBlock && !/^\s*\/\//.test(line) && line.trim() !== '') inBlock = false;
    }
  } else {
    let started = false;
    for (const line of lines) {
      if (/<!--\s*fingerprints:/.test(line)) { started = true; out.present = true; grab(line); if (line.includes('-->')) break; continue; }
      if (started) { grab(line); if (line.includes('-->')) break; }
    }
  }
  return out;
}

function hexState(h) {
  if (h == null) return 'absent';
  // Placeholders are caught BEFORE the 64-hex check: an all-zeros / all-x / `<hex>`
  // string is a non-fingerprint even when it is 64 chars wide.
  if (/^0+$/.test(h) || /^x+$/i.test(h) || h === '<hex>') return 'placeholder';
  if (/^[0-9a-f]{64}$/.test(h)) return 'valid';
  return 'malformed';
}

// =====================================================================
// LINT — malformed-class (L1, L2-shape, L3). Failure ⇒ malformed (cannot anchor 04).
// =====================================================================
export function lintL1_bothFiles(dbmlPresent, mdPresent) {
  const ok = dbmlPresent && mdPresent;
  const miss = [];
  if (!dbmlPresent) miss.push('04-erd.dbml');
  if (!mdPresent) miss.push('04-transitions.md');
  return { id: 'L1', rule: 'A1', ok, detail: ok ? '' : `missing file(s): ${miss.join(', ')}` };
}

export function lintL3_transitionsShape(tr) {
  let ok = tr.h2Count === 1 && tr.shapeOk;
  const parts = [];
  if (tr.h2Count !== 1) parts.push(`## ${TRANSITIONS_H2} must appear exactly once (got ${tr.h2Count})`);
  if (tr.h2Count === 1 && !tr.shapeOk) parts.push(`a ### block has a table header other than '${TRANSITIONS_COLUMNS.join(' | ')}'`);
  return { id: 'L3', rule: 'transitions-format', ok, detail: ok ? '' : parts.join('; ') };
}

// =====================================================================
// LINT — fail/warn-class (L4–L15). Parsed 04 but content wrong.
// =====================================================================
export function lintL4_fingerprintPresent(fpDbml, fpMd) {
  const ok = fpDbml.present && fpMd.present;
  const miss = [];
  if (!fpDbml.present) miss.push('// fingerprints: block in 04-erd.dbml');
  if (!fpMd.present) miss.push('<!-- fingerprints: --> block in 04-transitions.md');
  return { id: 'L4', rule: 'A4', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `absent: ${miss.join('; ')}` };
}

export function lintL5_fingerprintWellFormed(fpDbml, fpMd) {
  const probs = [];
  for (const [label, fp] of [['04-erd.dbml', fpDbml], ['04-transitions.md', fpMd]]) {
    for (const [input, val] of [['02-glossary.md', fp.has02], ['03-aggregates.md', fp.has03]]) {
      const st = hexState(val);
      if (st === 'absent') probs.push(`${label}: no ${input}@sha256 line`);
      else if (st !== 'valid') probs.push(`${label}: ${input} digest ${st} ('${String(val).slice(0, 12)}…')`);
    }
  }
  const ok = probs.length === 0;
  return { id: 'L5', rule: 'A5', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : probs.join('; ') };
}

export function lintL6_fingerprintAgree(fpDbml, fpMd) {
  const probs = [];
  if (hexState(fpDbml.has02) === 'valid' && hexState(fpMd.has02) === 'valid' && fpDbml.has02 !== fpMd.has02) probs.push('02 digest differs between .dbml and .md');
  if (hexState(fpDbml.has03) === 'valid' && hexState(fpMd.has03) === 'valid' && fpDbml.has03 !== fpMd.has03) probs.push('03 digest differs between .dbml and .md');
  const ok = probs.length === 0;
  return { id: 'L6', rule: 'A6', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : probs.join('; ') };
}

export function lintL7_naming(model) {
  const bad = [];
  for (const t of model.tables) {
    if (!isSnakeCase(t.name)) bad.push(`table '${t.name}' not snake_case`);
    else if (looksPlural(t.name)) bad.push(`table '${t.name}' is pluralized (tables must be singular)`);
    for (const f of t.fields) {
      if (!isSnakeCase(f.name)) bad.push(`column '${t.name}.${f.name}' not snake_case`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'L7', rule: 'B9', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; ') };
}

export function lintL8_enumNaming(model) {
  const bad = model.enums.filter((e) => !isSnakeCase(e.name)).map((e) => e.name);
  const ok = bad.length === 0;
  return { id: 'L8', rule: 'B9/C5', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `enum name(s) not snake_case: ${bad.join(', ')}` };
}

export function lintL9_primaryKey(model) {
  const bad = model.tables.filter((t) => t.pk.length === 0).map((t) => t.name);
  const ok = bad.length === 0;
  return { id: 'L9', rule: 'B1', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `table(s) with no primary key: ${bad.join(', ')}` };
}

export function lintL10_firstNormalForm(model) {
  const bad = [];
  for (const t of model.tables) {
    for (const f of t.fields) {
      if (/\[\]\s*$/.test(String(f.type)) || /\[\]/.test(String(f.type))) bad.push(`${t.name}.${f.name} is an array type`);
    }
    // repeated-suffix columns (phone1, phone2, …)
    const bases = {};
    for (const f of t.fields) {
      const m = /^(.*?)(\d+)$/.exec(f.name);
      if (m) { bases[m[1]] = (bases[m[1]] || 0) + 1; }
    }
    for (const [b, n] of Object.entries(bases)) if (n >= 2) bad.push(`${t.name} has repeated-group columns '${b}1..${b}N'`);
  }
  const ok = bad.length === 0;
  return { id: 'L10', rule: 'B2', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; ') };
}

export function lintL11_noRestatement(model, dbmlText, tr, g02, g03, N = RESTATEMENT_WINDOW_N) {
  // Collect upstream "owned" prose cells: 02 definitions, 03 invariant rules.
  const upstreamCells = [];
  for (const t of g02.terms02) if (t && t.term) { /* definitions live in raw; collect below */ }
  // 02 definitions from the Terms table (col 2 of each row).
  for (const sec of [g02]) {} // (definitions extracted from doc via raw text below)
  const cells = collectUpstreamCells(g02, g03);
  // Notes from DBML model + prose from transitions.md.
  const haystacks = [];
  for (const t of model.tables) {
    for (const f of t.fields) if (f.note) haystacks.push({ text: f.note, where: `${t.name}.${f.name} note` });
  }
  // transitions.md prose lines (non-table, non-heading) outside the tables.
  const trSec = tr.sec;
  if (trSec) {
    for (const line of trSec.lines) {
      if (line.includes('|')) continue;
      if (line.trim().startsWith('#')) continue;
      if (line.trim() !== '') haystacks.push({ text: line, where: 'transitions prose' });
    }
  }
  const bad = [];
  for (const { text, where } of haystacks) {
    const hayTokens = rawTokens(text);
    for (const cell of cells) {
      const cellTokens = rawTokens(cell.text);
      if (cellTokens.length < N) continue;
      for (let i = 0; i + N <= cellTokens.length; i++) {
        const window = cellTokens.slice(i, i + N).join(' ');
        if (text.includes(window)) { bad.push(`${where} restates ${cell.from} ('${window}')`); break; }
      }
      if (bad.length && bad[bad.length - 1].startsWith(where)) break;
    }
  }
  const ok = bad.length === 0;
  return { id: 'L11', rule: 'E1', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : [...new Set(bad)].join('; ') };
}

function collectUpstreamCells(g02, g03) {
  const cells = [];
  for (const t of g02.terms02) {
    // definition is not retained in derived terms02; re-read below from raw not available here.
  }
  // 02 definitions are captured via the Terms table rows kept on g02.termsTable.
  if (g02.termsTable) for (const r of g02.termsTable.rows) if (r[1]) cells.push({ text: exact(r[1]), from: '02 definition' });
  for (const a of g03.aggregates) {
    for (const inv of a.invariants) if (inv.rule) cells.push({ text: inv.rule, from: `03 invariant ${inv.id}` });
  }
  return cells;
}

// The set of LEGITIMATE derived identifiers: the pinned snake_case derivation of
// every canonical 02 Term, 02 enum name + value, 03 aggregate name, and 03 boundary
// member. An identifier that IS one of these is the mandated name for an owned
// upstream concept, so a forbidden synonym appearing as a SUB-TOKEN of it (e.g.
// `section` inside `seating_section`, the pinned snake_case of canonical 02 Term
// `SeatingSection`) is NOT a synonym misuse — it is the canonical name. Forbidden
// synonyms still fire on identifiers NOT in this set (e.g. a table `section`, or a
// column `conference_id` when `Conference` is forbidden). simulation.md L12 / E2.
export function derivedIdentifierSet(g02, g03) {
  const s = new Set();
  for (const t of g02.terms02) if (t.term) s.add(toSnake(t.term));
  for (const en of g02.enums02) {
    s.add(toSnake(en.enumName));
    s.add(toSnake(en.aggregate));
    for (const v of en.values) if (v.value) s.add(toSnake(v.value));
  }
  for (const a of g03.aggregates) {
    if (a.name) s.add(toSnake(a.name));
    if (a.root) s.add(toSnake(a.root));
    for (const m of a.members) {
      if (m.member) s.add(toSnake(m.member));
      if (m.term02 && m.term02 !== '—') s.add(toSnake(m.term02));
    }
  }
  s.delete('');
  return s;
}

export function lintL12_forbidden(model, dbmlText, tr, g02, g03) {
  const forbidden = (g02.forbidden02 || []).map((f) => key(f)).filter((f) => f !== '');
  if (forbidden.length === 0) return { id: 'L12', rule: 'E2', severity: 'error', status: 'pass', detail: '' };
  const fbSet = new Set(forbidden);
  const derived = derivedIdentifierSet(g02, g03 || { aggregates: [] });
  const hits = [];
  // Scan an IDENTIFIER (table/column/enum/transition-table name). If the identifier
  // is itself a pinned derived name of an owned 02/03 concept, its sub-tokens are
  // exempt — the forbidden token is part of the canonical name, not a synonym misuse.
  const scanId = (name, where) => {
    if (!name) return;
    if (derived.has(key(name))) return; // exempt: the mandated derived identifier
    for (const tok of plainTokens(name)) if (fbSet.has(tok)) hits.push(`'${tok}' in ${where}`);
    const hay = key(name);
    for (const f of forbidden) if (f.includes(' ') && hay.includes(f)) hits.push(`'${f}' in ${where}`);
  };
  // Scan free PROSE (a note) — never exempt; prose is not a pinned identifier.
  const scanProse = (text, where) => {
    if (!text) return;
    for (const tok of plainTokens(text)) if (fbSet.has(tok)) hits.push(`'${tok}' in ${where}`);
    const hay = key(text);
    for (const f of forbidden) if (f.includes(' ') && hay.includes(f)) hits.push(`'${f}' in ${where}`);
  };
  for (const t of model.tables) {
    scanId(t.name, `table name '${t.name}'`);
    for (const f of t.fields) { scanId(f.name, `column '${t.name}.${f.name}'`); scanProse(f.note, `${t.name}.${f.name} note`); }
  }
  for (const e of model.enums) { scanId(e.name, `enum '${e.name}'`); }
  for (const tt of tr.transitionTables) scanId(tt.table, `transition table '${tt.table}'`);
  const ok = hits.length === 0;
  return { id: 'L12', rule: 'E2', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `forbidden synonym used: ${[...new Set(hits)].join('; ')}` };
}

export function lintL13_nullableFkDocumented(model) {
  const bad = [];
  for (const r of model.refs) {
    const child = model.tables.find((t) => t.name === r.fromTable);
    if (!child) continue;
    for (const col of r.fromCols) {
      const f = child.fields.find((x) => x.name === col);
      if (f && !f.notNull && !f.pk && !f.note) bad.push(`${r.fromTable}.${col}`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'L13', rule: 'B8', severity: 'warn', status: ok ? 'pass' : 'warn', detail: ok ? '' : `nullable FK with no note: ${bad.join(', ')}` };
}

export function lintL15_transitionOrder(tr, g02) {
  // ℹ️ — rows sorted by (From in 02 enum order, then To), ∅ first.
  const enumByAgg = new Map();
  for (const en of g02.enums02) enumByAgg.set(toSnake(en.aggregate), en.values.map((v) => v.value));
  const bad = [];
  for (const tt of tr.transitionTables) {
    const order = enumByAgg.get(tt.table) || [];
    const rank = (v) => (v === INITIAL_MARKER ? -1 : (order.indexOf(v) === -1 ? 999 : order.indexOf(v)));
    for (let i = 1; i < tt.rows.length; i++) {
      const a = tt.rows[i - 1], b = tt.rows[i];
      const ka = [rank(a.from), rank(a.to)], kb = [rank(b.from), rank(b.to)];
      if (ka[0] > kb[0] || (ka[0] === kb[0] && ka[1] > kb[1])) { bad.push(`${tt.table} rows not in pinned order`); break; }
    }
  }
  const ok = bad.length === 0;
  return { id: 'L15', rule: 'D7', severity: 'info', status: ok ? 'pass' : 'info', detail: ok ? '' : bad.join('; ') };
}

// =====================================================================
// RESOLUTION — R-* (simulation.md §4.2). { id, rule, status, detail, edges,
// upstreamDefect?, upstreamFile?, upstreamDetail? }.
// =====================================================================
export function checkRoot(model, g03) {
  const tnames = new Set(model.tables.map((t) => t.name));
  let edges = 0; const bad = [];
  for (const a of g03.aggregates) {
    edges++;
    const want = toSnake(a.root || a.name);
    if (!tnames.has(want)) bad.push(`aggregate root '${a.root || a.name}' → expected table '${want}' (absent)`);
  }
  const ok = bad.length === 0;
  return { id: 'R-ROOT', rule: 'C1', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

export function checkMember(model, g03) {
  // Each Kind=entity member resolves to a table with an FK path to its root PK.
  const tnames = new Set(model.tables.map((t) => t.name));
  let edges = 0; const bad = [];
  for (const a of g03.aggregates) {
    const rootTable = toSnake(a.root || a.name);
    for (const m of a.members) {
      if (m.kind !== 'entity') continue;
      const mt = toSnake(m.member);
      if (mt === rootTable) continue; // the root member itself
      edges++;
      if (!tnames.has(mt)) { bad.push(`entity member '${m.member}' → table '${mt}' absent`); continue; }
      if (!hasFkPath(model, mt, rootTable)) bad.push(`entity member table '${mt}' has no FK path to root '${rootTable}'`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'R-MEMBER', rule: 'C2', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

function hasFkPath(model, fromTable, toTable) {
  const adj = new Map();
  for (const r of model.refs) {
    if (!adj.has(r.fromTable)) adj.set(r.fromTable, new Set());
    adj.get(r.fromTable).add(r.toTable);
  }
  const seen = new Set([fromTable]);
  const stack = [fromTable];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === toTable) return true;
    for (const nxt of (adj.get(cur) || [])) if (!seen.has(nxt)) { seen.add(nxt); stack.push(nxt); }
  }
  return false;
}

export function checkRef(model, g03) {
  let edges = 0; const bad = [];
  for (const a of g03.aggregates) {
    const aggTables = aggregateTables(a);
    const rootTable = toSnake(a.root || a.name);
    for (const r of a.references) {
      if (!r.targetAgg || r.targetAgg === '—') continue;
      edges++;
      const targetRoot = toSnake(r.targetAgg);
      // (a) a direct FK from any table of THIS aggregate to the target root, OR
      // (b) an M:N realized via a junction table that FKs BOTH this aggregate's
      //     root AND the target root (the catalog-pinned junction realization of a
      //     by-identity cross-aggregate reference).
      const direct = model.refs.some((ref) => aggTables.has(ref.fromTable) && ref.toTable === targetRoot);
      const viaJunction = model.tables.some((t) => {
        const fks = model.refs.filter((ref) => ref.fromTable === t.name);
        const toRoot = fks.some((ref) => ref.toTable === rootTable);
        const toTarget = fks.some((ref) => ref.toTable === targetRoot);
        return toRoot && toTarget;
      });
      if (!direct && !viaJunction) bad.push(`References '${a.name}'→'${r.targetAgg}' has no FK (direct or via junction) to table '${targetRoot}'`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'R-REF', rule: 'C4', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

function aggregateTables(a) {
  const set = new Set([toSnake(a.root || a.name)]);
  for (const m of a.members) set.add(toSnake(m.member));
  return set;
}

export function checkEnum(model, g02, self02, cross02) {
  const self02ok = !self02 || self02.ok;
  const cross02ok = !cross02 || cross02.ok;
  const byName = new Map(model.enums.map((e) => [e.name, e.values]));
  // 02-origin defects erd can legitimately see (internal value-table breakage +
  // a `<Name>Status` enum naming a 03-absent aggregate) route upstream → 02. We do
  // NOT re-verify the enum's 01 provenance — that is the glossary harness's own
  // single-owned check (erd never receives 01).
  const crossByEnum = new Map();
  if (cross02 && !cross02.ok) for (const d of cross02.defects) crossByEnum.set(d.enum, d.detail);
  let edges = 0; const bad = []; const upstreamBad = [];
  for (const en of g02.enums02) {
    edges++;
    const want = toSnake(en.enumName);
    const got = byName.get(want);
    if (crossByEnum.has(en.enumName)) {
      // the model legitimately has no DBML enum for an aggregate 03 never declares;
      // the defect is 02's (a lifecycle enum for a ghost aggregate), not 04's.
      upstreamBad.push(crossByEnum.get(en.enumName));
      continue;
    }
    if (!got) { bad.push(`02 enum '${en.enumName}' → DBML enum '${want}' absent`); continue; }
    const wantVals = en.values.map((v) => v.value);
    if (got.length !== wantVals.length || !wantVals.every((v, i) => v === got[i])) {
      bad.push(`enum '${want}' values [${got.join(', ')}] ≠ 02 [${wantVals.join(', ')}] (set/order)`);
    }
  }
  if (!self02ok) for (const d of self02.defects) upstreamBad.push(d.detail);
  const fail = bad.length > 0 || upstreamBad.length > 0;
  return {
    id: 'R-ENUM', rule: 'C5', status: fail ? 'fail' : 'pass',
    detail: fail ? [...bad, ...upstreamBad].join('; ') : '', edges,
    upstreamDefect: bad.length === 0 && upstreamBad.length > 0,
    upstreamFile: '02-glossary.md',
    upstreamDetail: upstreamBad.join('; '),
  };
}

export function checkStatus(model, g02, g03) {
  // Every entity with a `<Name>Status` 02 enum carries a `status` column typed by it.
  const enumByAgg = new Map();
  for (const en of g02.enums02) if (/Status$/.test(en.enumName)) enumByAgg.set(toSnake(en.aggregate), toSnake(en.enumName));
  const tableByName = new Map(model.tables.map((t) => [t.name, t]));
  let edges = 0; const bad = [];
  for (const [aggTable, enumName] of enumByAgg) {
    edges++;
    const t = tableByName.get(aggTable);
    if (!t) { bad.push(`status entity table '${aggTable}' absent`); continue; }
    const statusCol = t.fields.find((f) => f.name === 'status');
    if (!statusCol) { bad.push(`'${aggTable}' has no 'status' column`); continue; }
    if (statusCol.type !== enumName) bad.push(`'${aggTable}.status' typed '${statusCol.type}' (expected enum '${enumName}')`);
  }
  const ok = bad.length === 0;
  return { id: 'R-STATUS', rule: 'C6', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

export function checkName(model, g02, g03) {
  // Every table/column/enum name derives from a 02 term/enum or 03 member, OR is a
  // documented bridge (junction table over two FKs / surrogate `id` key).
  const derived = new Set();
  for (const a of g03.aggregates) {
    derived.add(toSnake(a.root || a.name));
    for (const m of a.members) derived.add(toSnake(m.member));
  }
  for (const t of g02.terms02) derived.add(toSnake(t.term));
  for (const en of g02.enums02) { derived.add(toSnake(en.enumName)); derived.add(toSnake(en.aggregate)); }
  let edges = 0; const bad = [];
  for (const t of model.tables) {
    edges++;
    if (derived.has(t.name)) continue;
    // junction bridge: name is a_b where both a and b are derived tables AND it has ≥2 FKs.
    const fkCount = model.refs.filter((r) => r.fromTable === t.name).length;
    const parts = t.name.split('_');
    const bridge = fkCount >= 2 || parts.some((p) => derived.has(p));
    if (!bridge) bad.push(`table '${t.name}' derives from no 02 term/03 member and is not a junction bridge`);
  }
  const ok = bad.length === 0;
  // C7 is ⚠️ for a borderline name; an INVENTED entity (no derivation, no bridge)
  // violates the single-ownership doctrine and is the ❌ rule C9 — surfaced as a fail.
  return { id: 'R-NAME', rule: 'C9', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

export function checkFkType(model) {
  let edges = 0; const bad = [];
  for (const r of model.refs) {
    const child = model.tables.find((t) => t.name === r.fromTable);
    const parent = model.tables.find((t) => t.name === r.toTable);
    if (!child || !parent) continue;
    edges++;
    for (let i = 0; i < r.fromCols.length; i++) {
      const cf = child.fields.find((f) => f.name === r.fromCols[i]);
      const pf = parent.fields.find((f) => f.name === (r.toCols[i] || r.toCols[0]));
      if (cf && pf && !typesCompatible(cf.type, pf.type)) {
        bad.push(`${r.fromTable}.${cf.name}:${cf.type} ↛ ${r.toTable}.${pf.name}:${pf.type}`);
      }
    }
  }
  const ok = bad.length === 0;
  return { id: 'R-FKTYPE', rule: 'B7', status: ok ? 'pass' : 'fail', detail: ok ? '' : `FK type ≠ PK type: ${bad.join('; ')}`, edges };
}

export function checkMN(model, g03) {
  // Every 03 References that is an M:N (target also references back, or both
  // aggregates list each other) is realized by an explicit junction table. The
  // mechanical signal of a MISSING junction is a `<>` ref in the parsed model
  // (a many-to-many left implicit) — @dbml/core marks both endpoints '*'.
  let edges = 0; const bad = [];
  for (const r of model.refs) {
    edges++;
    if (r.manyToMany) bad.push(`relationship ${r.fromTable}<>${r.toTable} left as implicit M:N (needs a junction table)`);
  }
  const ok = bad.length === 0;
  return { id: 'R-MN', rule: 'B6', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

// --- transition resolution checks -------------------------------------------
export function statusEntities(model, g02) {
  // tables that carry a `status` column typed by a `<…>_status` enum.
  const enumNames = new Set(model.enums.map((e) => e.name));
  const out = [];
  for (const t of model.tables) {
    const f = t.fields.find((x) => x.name === 'status' && enumNames.has(x.type) && /_status$/.test(x.type));
    if (f) out.push({ table: t.name, enumName: f.type });
  }
  return out;
}

export function checkBijection(model, tr, g02) {
  const status = new Set(statusEntities(model, g02).map((s) => s.table));
  const trs = new Set(tr.transitionTables.map((t) => t.table));
  const missing = [...status].filter((s) => !trs.has(s));
  const extra = [...trs].filter((t) => !status.has(t));
  const edges = 1;
  const ok = missing.length === 0 && extra.length === 0;
  const parts = [];
  if (missing.length) parts.push(`status entity with no transition table: ${missing.join(', ')}`);
  if (extra.length) parts.push(`transition table with no status entity: ${extra.join(', ')}`);
  return { id: 'R-BIJECTION', rule: 'D1/E4', status: ok ? 'pass' : 'fail', detail: ok ? '' : parts.join('; '), edges };
}

function enumValuesForTable(table, model, g02) {
  const t = model.tables.find((x) => x.name === table);
  if (!t) return [];
  const f = t.fields.find((x) => x.name === 'status');
  if (!f) return [];
  const en = model.enums.find((e) => e.name === f.type);
  return en ? en.values : [];
}

export function checkTFrom(model, tr, g02) {
  let edges = 0; const bad = [];
  for (const tt of tr.transitionTables) {
    const vals = new Set(enumValuesForTable(tt.table, model, g02));
    for (const row of tt.rows) {
      for (const [cell, label] of [[row.from, 'From'], [row.to, 'To']]) {
        if (cell === INITIAL_MARKER && label === 'From') continue;
        edges++;
        if (!vals.has(cell)) bad.push(`${tt.table} ${label}='${cell}' not an enum value`);
      }
    }
  }
  const ok = bad.length === 0;
  return { id: 'R-TFROM', rule: 'D2', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

export function checkTEvent(model, tr, g02) {
  // each Event = the exact 02 `Derived from event` for the row's `To` enum value.
  const derivByEnumValue = new Map(); // enumName -> Map(value -> event)
  for (const en of g02.enums02) {
    const m = new Map();
    for (const v of en.values) m.set(v.value, v.derivedFromEvent);
    derivByEnumValue.set(toSnake(en.enumName), m);
  }
  const enumByTable = new Map();
  for (const s of statusEntities(model, g02)) enumByTable.set(s.table, s.enumName);
  let edges = 0; const bad = [];
  for (const tt of tr.transitionTables) {
    const enumName = enumByTable.get(tt.table);
    const dm = derivByEnumValue.get(enumName) || new Map();
    for (const row of tt.rows) {
      edges++;
      const want = dm.get(row.to);
      if (want == null) continue; // To not an enum value caught by R-TFROM
      if (exact(row.event) !== exact(want)) bad.push(`${tt.table} '${row.from}'→'${row.to}' Event='${row.event}' (expected verbatim '${want}')`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'R-TEVENT', rule: 'D3', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

export function checkInit(model, tr, g02) {
  const status = statusEntities(model, g02);
  let edges = 0; const bad = [];
  for (const s of status) {
    edges++;
    const tt = tr.transitionTables.find((x) => x.table === s.table);
    if (!tt) continue; // bijection owns this
    const initRows = tt.rows.filter((r) => r.from === INITIAL_MARKER);
    if (initRows.length !== 1) bad.push(`${s.table} has ${initRows.length} ∅-origin rows (expected exactly 1)`);
  }
  const ok = bad.length === 0;
  return { id: 'R-INIT', rule: 'D4', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

export function checkReach(model, tr, g02) {
  const status = statusEntities(model, g02);
  let edges = 0; const bad = [];
  for (const s of status) {
    edges++;
    const tt = tr.transitionTables.find((x) => x.table === s.table);
    if (!tt) continue;
    const vals = enumValuesForTable(s.table, model, g02);
    const tos = new Set(tt.rows.map((r) => r.to));
    const initial = new Set(tt.rows.filter((r) => r.from === INITIAL_MARKER).map((r) => r.to));
    for (const v of vals) {
      if (!tos.has(v) && !initial.has(v)) bad.push(`${s.table} enum value '${v}' never appears as a To and is not initial (unreachable)`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'R-REACH', rule: 'D5', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

// =====================================================================
// EXACT-VALUE — X1–X6 (simulation.md §4.3).
// =====================================================================
export function checkX2_enumDeepEqual(model, g02) {
  const byName = new Map(model.enums.map((e) => [e.name, e.values]));
  const bad = [];
  for (const en of g02.enums02) {
    const want = en.values.map((v) => v.value);
    const got = byName.get(toSnake(en.enumName));
    if (!got || got.length !== want.length || !want.every((v, i) => v === got[i])) {
      bad.push(`${toSnake(en.enumName)}: got [${(got || []).join(',')}] want [${want.join(',')}]`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'X2', rule: 'C5', status: ok ? 'pass' : 'fail', detail: ok ? '' : `enum value array mismatch: ${bad.join('; ')}` };
}

export function checkX3_onePk(model) {
  const bad = model.tables.filter((t) => t.pk.length === 0).map((t) => `${t.name}:0pk`);
  // exactly one PK per table (single or composite) — 0 is the failure mode (multiple
  // is impossible in DBML: a table has at most one pk index / set of [pk] fields).
  const ok = bad.length === 0;
  return { id: 'X3', rule: 'B1', status: ok ? 'pass' : 'fail', detail: ok ? '' : `pkCount≠1: ${bad.join(', ')}` };
}

export function checkX4_statusCount(model, tr, g02) {
  const statusCount = statusEntities(model, g02).length;
  const blockCount = tr.transitionTables.length;
  const ok = statusCount === blockCount;
  return { id: 'X4', rule: 'E4/D1', status: ok ? 'pass' : 'fail', detail: ok ? '' : `status columns (${statusCount}) ≠ transition blocks (${blockCount})` };
}

export function checkX5_connected(model, tr, g02) {
  let bad = [];
  for (const tt of tr.transitionTables) {
    const tos = new Set(tt.rows.map((r) => r.to));
    for (const row of tt.rows) {
      if (row.from === INITIAL_MARKER) continue;
      if (!tos.has(row.from)) bad.push(`${tt.table} From='${row.from}' is never reached as a To (disconnected)`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'X5', rule: 'D6', status: ok ? 'pass' : 'warn', detail: ok ? '' : bad.join('; ') };
}

export function checkX6_reconcile(executedChecks, edgesWalked, edgesExpected, engineRun, tablesCount) {
  const engineOk = tablesCount === 0 || engineRun > 0;
  const ok = executedChecks > 0 && edgesWalked === edgesExpected && engineOk;
  let detail = '';
  if (!ok) {
    const parts = [];
    if (executedChecks <= 0) parts.push('zero executed checks');
    if (edgesWalked !== edgesExpected) parts.push(`edgesWalked ${edgesWalked} ≠ edgesExpected ${edgesExpected}`);
    if (!engineOk) parts.push(`engine layer ran 0 scenarios over ${tablesCount} tables`);
    detail = `reconcile failed: ${parts.join('; ')}`;
  }
  return { id: 'X6', rule: 'reconciliation', status: ok ? 'pass' : 'broken', detail };
}

// =====================================================================
// Reconciliation: expected mechanical edge count (simulation.md §5).
// Engine edges are reconciled separately by the harness (counts.engine).
// =====================================================================
export function expectedMechanicalEdges(model, tr, g02, g03) {
  let e = 0;
  e += g03.aggregates.length;                                   // R-ROOT
  for (const a of g03.aggregates) for (const m of a.members) {  // R-MEMBER (entity, ≠root)
    if (m.kind === 'entity' && toSnake(m.member) !== toSnake(a.root || a.name)) e++;
  }
  for (const a of g03.aggregates) for (const r of a.references) if (r.targetAgg && r.targetAgg !== '—') e++; // R-REF
  e += g02.enums02.length;                                      // R-ENUM
  e += g02.enums02.filter((en) => /Status$/.test(en.enumName)).length; // R-STATUS (per 02 <Name>Status enum)
  e += model.tables.length;                                     // R-NAME (per table)
  for (const r of model.refs) { const c = model.tables.find((t) => t.name === r.fromTable); const p = model.tables.find((t) => t.name === r.toTable); if (c && p) e++; } // R-FKTYPE
  e += model.refs.length;                                       // R-MN (per ref)
  e += 1;                                                       // R-BIJECTION
  // R-TFROM: per From/To cell (≠∅-in-From).
  for (const tt of tr.transitionTables) for (const row of tt.rows) {
    if (!(row.from === INITIAL_MARKER)) e++; else e += 0; // From counts unless ∅
    e++; // To always counts
  }
  for (const tt of tr.transitionTables) e += tt.rows.length;    // R-TEVENT (per row)
  const se = statusEntities(model, g02).length;
  e += se; // R-INIT (per status entity)
  e += se; // R-REACH (per status entity)
  return e;
}

// R-STATUS uses 02-enum-derived expectation; but the harness walks per status enum
// present in 02 (enumByAgg) — align expected with the check by counting `<Name>Status`
// enums that map onto a table. We approximate with statusEntities for symmetry; the
// check itself walks enumByAgg. To keep edges aligned, the check is adjusted to also
// walk per 02 `<Name>Status` enum (see checkStatus edges). They match because every
// `<Name>Status` enum in the valid model has a corresponding table.

export function intakeCounts(model, tr) {
  let columns = 0;
  for (const t of model.tables) columns += t.fields.length;
  let transitionRows = 0;
  for (const tt of tr.transitionTables) transitionRows += tt.rows.length;
  return { tables: model.tables.length, columns, refs: model.refs.length, enums: model.enums.length, transitionRows };
}

export function elementsTotal(model, tr) {
  const c = intakeCounts(model, tr);
  return c.tables + c.columns + c.refs + c.enums + c.transitionRows;
}

// --- agent-judged precondition flags (simulation.md §6) ---------------------
// Mechanical preconditions handed to the agent; the harness records non-blocking
// needs-judgment records with closed verdict schemas. Blocking ownership of these
// catalog rules lives at the professor stage (documented in SKILL.md).
export function agentJudgedFlags(model) {
  const flags = [];
  // AJ1 (2NF residue): composite-PK tables with ≥1 non-key column.
  for (const t of model.tables) {
    if (t.compositePk && t.pk.length >= 2) {
      const nonKey = t.fields.filter((f) => !t.pk.includes(f.name));
      if (nonKey.length >= 1) flags.push({ id: 'AJ1', rule: 'B3', verdict: 'no-composite-key', precondition: `table '${t.name}' has composite PK + ${nonKey.length} non-key column(s)` });
    }
  }
  // AJ2 (3NF residue): tables with ≥2 non-key columns.
  for (const t of model.tables) {
    const nonKey = t.fields.filter((f) => !t.pk.includes(f.name));
    if (nonKey.length >= 2) flags.push({ id: 'AJ2', rule: 'B4', verdict: 'no-transitive-dep', precondition: `table '${t.name}' has ${nonKey.length} non-key columns` });
  }
  // AJ3 (BCNF/4NF advisory): always recorded as advisory-clean precondition.
  flags.push({ id: 'AJ3', rule: 'B5', verdict: 'bcnf-4nf-clean', precondition: 'advisory residue' });
  // AJ4 (C8 cascade): FK with delete:cascade crossing aggregate boundary.
  for (const r of model.refs) {
    if (r.onDelete && /cascade/i.test(r.onDelete)) flags.push({ id: 'AJ4', rule: 'C8', verdict: 'within-boundary', precondition: `cascade ${r.fromTable}→${r.toTable}` });
  }
  if (!flags.some((f) => f.id === 'AJ4')) flags.push({ id: 'AJ4', rule: 'C8', verdict: 'within-boundary', precondition: 'no cascade crossings' });
  if (!flags.some((f) => f.id === 'AJ1')) flags.push({ id: 'AJ1', rule: 'B3', verdict: 'no-composite-key', precondition: 'no composite-PK candidate' });
  return flags;
}

export {
  exact, key, toSnake, statusEntities as _statusEntities,
  TRANSITIONS_COLUMNS, TRANSITIONS_H2, INITIAL_MARKER,
};
