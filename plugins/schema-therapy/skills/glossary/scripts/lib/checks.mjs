// checks.mjs — the CLOSED assertion grammar for the glossary oracle
// (simulation.md §4). Four mechanical check classes + agent-judged placeholders:
//   lint           L1–L18   (A-theme + mechanical B/C/D-theme + E1/E2/E4-mech)
//   resolution     R1–R7    (02→01 / 02→02 exact-string edges)
//   exact-value    X1–X5    (counts / ordering / reconciliation)
//   reason-qual.   N1–N12   (proven over fixtures in selftest, share catalog IDs)
//   agent-judged   AJ1–AJ5  (recorded only, never block, not in reconciliation)
//
// This grammar is NEVER extended ad hoc; adding a check means editing this file
// AND simulation.md §4 in a committed change, citing a catalog rule. Every check
// records { id, class, rule, status } (status ∈ pass|fail|warn|info). A check
// that THROWS is surfaced by the harness as `broken-test`.
//
// COPIED scaffold from the sibling event-storming checks.mjs, then extended with
// the 02-specific shapes (Terms / Enums / Forbidden Synonyms) and the two-input
// upstream resolution. Copied, never cross-referenced.

import {
  TECH_LEAK,
  TECH_LEAK_PHRASES,
  VAGUE_FILLER,
  BARE_STATUS,
  DEFER_PHRASES,
  blocklistHit,
  phraseHit,
  isSnakeCase,
  eventToValue,
  wordTokens,
} from './lexicon.mjs';

// ---------------------------------------------------------------------------
// Pinned shapes.
// ---------------------------------------------------------------------------
const REQUIRED_H2_02 = [
  'Upstream Fingerprint',
  'Terms',
  'Enums',
  'Forbidden Synonyms',
];
const TERMS_COLUMNS = ['Term', 'Definition', 'Owns 01 element?', '01 element (exact string)'];
const ENUM_VALUE_COLUMNS = ['Value', 'Derived from event (exact 01 string)'];
const FORBIDDEN_COLUMNS = ['Forbidden term', 'Canonical term', 'Reason'];

// Pinned 01 upstream shapes (the same A-theme shape event-storming pins).
const REQUIRED_H2_01 = ['Domain Events', 'Actors', 'Hotspots', 'Lifecycle Skeletons'];
const EVENTS_COLUMNS_01 = ['Event', 'Actor', 'Trigger', 'Notes'];
const ACTORS_COLUMNS_01 = ['Actor', 'Kind', 'Responsibility'];
const HOTSPOTS_COLUMNS_01 = ['Hotspot', 'Question', 'Blocks'];

const norm = (s) => (s == null ? '' : String(s).trim());
const isBlank = (s) => {
  const t = norm(s);
  return t === '' || t === '-' || t === 'TBD' || t === '???';
};
// EXACT cross-document identity: char-for-char (the F-theme contract is exact).
const exact = (s) => norm(s);
// Case/space-insensitive key (used only where the catalog allows near-identity,
// e.g. duplicate-term detection C1, casing-convention C8).
const key = (s) => norm(s).toLowerCase().replace(/\s+/g, ' ');

function columnsMatch(table, expected) {
  if (!table) return false;
  if (table.columns.length !== expected.length) return false;
  return expected.every((c, i) => key(table.columns[i]) === key(c));
}

// ===========================================================================
// 01 UPSTREAM — parse + self-check (simulation.md §9).
// ===========================================================================

// Derive the resolution targets from the parsed 01. Returns null-ish fields when
// a pinned 01 shape is absent; `parseUpstreamShape` decides parseability.
export function deriveUpstream(doc01) {
  const sec = (t) => doc01.sections.get(t) || null;
  const eventsTable = sec('Domain Events') ? sec('Domain Events').tables[0] : null;
  const actorsTable = sec('Actors') ? sec('Actors').tables[0] : null;

  const events01 = eventsTable
    ? eventsTable.rows.map((r) => exact(r[0])).filter((s) => s !== '')
    : [];
  const actors01 = actorsTable
    ? actorsTable.rows.map((r) => exact(r[0])).filter((s) => s !== '')
    : [];

  const lifeSec = sec('Lifecycle Skeletons');
  const skeletons01 = [];
  if (lifeSec) {
    for (const title of lifeSec.subOrder) {
      const sub = lifeSec.subsections.get(title);
      const steps = [];
      for (const list of sub.orderedLists) {
        for (const it of list.items) {
          let t = it.text;
          t = t.replace(/\s*\((?:pivotal|terminal|creation|statechart[^)]*)\)\s*$/i, '');
          steps.push(exact(t));
        }
      }
      skeletons01.push({ aggregate: exact(title), steps });
    }
  }
  const aggregates01 = skeletons01.map((s) => s.aggregate);

  return {
    eventsTable,
    actorsTable,
    events01,
    actors01,
    aggregates01,
    skeletons01,
  };
}

// Is the 01 upstream PARSEABLE against the pinned 01 format? A required heading
// or a required table with the wrong column shape ⇒ unparseable ⇒ broken-test
// (simulation.md §9 case 3). Returns { ok, detail }.
export function parseUpstreamShape(doc01) {
  const missing = REQUIRED_H2_01.filter((h) => !doc01.sections.has(h));
  if (missing.length) {
    return { ok: false, detail: `upstream 01 missing required section(s): ${missing.join(', ')}` };
  }
  const u = deriveUpstream(doc01);
  if (!columnsMatch(u.eventsTable, EVENTS_COLUMNS_01)) {
    return { ok: false, detail: 'upstream 01 Domain Events table column shape is wrong' };
  }
  if (!columnsMatch(u.actorsTable, ACTORS_COLUMNS_01)) {
    return { ok: false, detail: 'upstream 01 Actors table column shape is wrong' };
  }
  if (u.skeletons01.length === 0) {
    return { ok: false, detail: 'upstream 01 has no `### <Aggregate>` lifecycle skeleton' };
  }
  return { ok: true, detail: '' };
}

// PRE-RESOLUTION upstream self-check (simulation.md §9 case 2): every skeleton
// step must be a real Domain-Events event of 01. If this fails, the 01 is
// well-formed but self-INCONSISTENT — a resolving R-check finding gets tagged
// `class: "upstream-defect"` and points at the 01 element, not the 02 row.
// Returns { ok, defects:[{aggregate, step}] }.
export function upstreamSelfCheck(u) {
  const known = new Set(u.events01.map((e) => exact(e)));
  const defects = [];
  for (const sk of u.skeletons01) {
    for (const step of sk.steps) {
      if (!known.has(exact(step))) defects.push({ aggregate: sk.aggregate, step });
    }
  }
  return { ok: defects.length === 0, defects };
}

// ===========================================================================
// 02 ARTIFACT — derive the scenario graph (simulation.md §3.1).
// ===========================================================================
export function deriveGraph(doc02) {
  const sec = (t) => doc02.sections.get(t) || null;

  // Terms
  const termsTable = sec('Terms') ? sec('Terms').tables[0] : null;
  const terms = termsTable
    ? termsTable.rows.map((r) => ({
        term: exact(r[0]),
        definition: exact(r[1]),
        ownsElement: key(r[2]) === 'yes' ? 'yes' : key(r[2]) === 'no' ? 'no' : exact(r[2]),
        element01: exact(r[3]),
      }))
    : [];

  // Enums — each `### <EnumName>` subsection holds a values table.
  const enumSec = sec('Enums');
  const enums = [];
  if (enumSec) {
    for (const title of enumSec.subOrder) {
      const sub = enumSec.subsections.get(title);
      const vt = sub.tables[0] || null;
      const values = vt
        ? vt.rows.map((r) => ({ value: exact(r[0]), derivedFromEvent: exact(r[1]) }))
        : [];
      enums.push({ enumName: exact(title), valuesTable: vt, values });
    }
  }

  // Forbidden synonyms
  const fbTable = sec('Forbidden Synonyms') ? sec('Forbidden Synonyms').tables[0] : null;
  const forbidden = fbTable
    ? fbTable.rows.map((r) => ({
        forbiddenTerm: exact(r[0]),
        canonicalTerm: exact(r[1]),
        reason: exact(r[2]),
      }))
    : [];

  return { termsTable, terms, enumSec, enums, fbTable, forbidden };
}

// ===========================================================================
// LINT — malformed-class (L1–L4). Any failure ⇒ malformed (cannot anchor 02).
// Return { id, rule, ok, detail }.
// ===========================================================================

export function lintL1_headings(doc02) {
  // Present AND in canonical order.
  const present = REQUIRED_H2_02.every((h) => doc02.sections.has(h));
  let ordered = true;
  if (present) {
    const idx = REQUIRED_H2_02.map((h) => doc02.order.indexOf(h));
    for (let i = 1; i < idx.length; i++) if (idx[i] < idx[i - 1]) ordered = false;
  }
  const ok = present && ordered;
  const missing = REQUIRED_H2_02.filter((h) => !doc02.sections.has(h));
  return {
    id: 'L1',
    rule: 'A1',
    ok,
    detail: ok
      ? ''
      : missing.length
      ? `missing required H2(s): ${missing.join(', ')}`
      : `required H2s present but out of canonical order (${REQUIRED_H2_02.join(' → ')})`,
  };
}

export function lintL2_termsCols(g) {
  const ok = columnsMatch(g.termsTable, TERMS_COLUMNS);
  return {
    id: 'L2',
    rule: 'A2',
    ok,
    detail: ok
      ? ''
      : `Terms header must be exactly: ${TERMS_COLUMNS.join(' | ')} (got: ${g.termsTable ? g.termsTable.columns.join(' | ') : 'no table'})`,
  };
}

export function lintL3_enumSubshape(g) {
  if (!g.enumSec) return { id: 'L3', rule: 'A3', ok: false, detail: '`## Enums` section absent' };
  if (g.enums.length === 0) {
    // Zero enums is legal ONLY if 01 has zero skeletons — but L3 is a SHAPE
    // check; an empty Enums section with no subsections is shape-OK (R3/R4/X4
    // enforce the bijection). Treat presence-of-section as shape-pass.
    return { id: 'L3', rule: 'A3', ok: true, detail: '' };
  }
  const bad = [];
  for (const en of g.enums) {
    if (!columnsMatch(en.valuesTable, ENUM_VALUE_COLUMNS)) {
      bad.push(en.enumName || '(unnamed enum)');
    }
  }
  const ok = bad.length === 0;
  return {
    id: 'L3',
    rule: 'A3',
    ok,
    detail: ok
      ? ''
      : `enum(s) missing/mis-shaped values table (need ${ENUM_VALUE_COLUMNS.join(' | ')}): ${bad.join(', ')}`,
  };
}

export function lintL4_forbiddenCols(g) {
  // The Forbidden Synonyms section may legally be empty (no synonyms yet); only
  // a PRESENT table with the wrong shape is malformed.
  if (!g.fbTable) return { id: 'L4', rule: 'A4', ok: true, detail: '' };
  const ok = columnsMatch(g.fbTable, FORBIDDEN_COLUMNS);
  return {
    id: 'L4',
    rule: 'A4',
    ok,
    detail: ok
      ? ''
      : `Forbidden Synonyms header must be exactly: ${FORBIDDEN_COLUMNS.join(' | ')} (got: ${g.fbTable.columns.join(' | ')})`,
  };
}

// ===========================================================================
// LINT — content-class (L5–L15). Parsed 02 but content wrong.
// Return { id, rule, severity, status, detail }.
// ===========================================================================

export function lintL5_nonEmpty(g) {
  const bad = [];
  g.terms.forEach((t, i) => {
    if (isBlank(t.term)) bad.push(`Terms row ${i + 1} Term`);
    if (isBlank(t.definition)) bad.push(`Terms row ${i + 1} Definition`);
    if (isBlank(t.ownsElement)) bad.push(`Terms row ${i + 1} Owns`);
    if (key(t.ownsElement) === 'yes' && isBlank(t.element01)) bad.push(`Terms row ${i + 1} 01 element`);
  });
  for (const en of g.enums) {
    en.values.forEach((v, j) => {
      if (isBlank(v.value)) bad.push(`${en.enumName} value ${j + 1} Value`);
      if (isBlank(v.derivedFromEvent)) bad.push(`${en.enumName} value ${j + 1} Derived`);
    });
  }
  g.forbidden.forEach((f, h) => {
    if (isBlank(f.forbiddenTerm)) bad.push(`Forbidden row ${h + 1} term`);
    if (isBlank(f.canonicalTerm)) bad.push(`Forbidden row ${h + 1} canonical`);
    if (isBlank(f.reason)) bad.push(`Forbidden row ${h + 1} reason`);
  });
  return {
    id: 'L5',
    rule: 'A6',
    severity: 'error',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `empty/placeholder cell(s): ${bad.join('; ')}` : '',
  };
}

const MULTI_NAME = /\s\/\s|\s\bor\b\s|\baka\b|,|\([^)]*\)/i;
export function lintL6_singleName(g) {
  const bad = g.terms.filter((t) => MULTI_NAME.test(t.term)).map((t) => t.term);
  return {
    id: 'L6',
    rule: 'A5',
    severity: 'error',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `Term cell carries >1 candidate name: ${bad.join('; ')}` : '',
  };
}

export function lintL7_fingerprint(doc02) {
  const sec = doc02.sections.get('Upstream Fingerprint');
  let ok = false;
  let detail = '`## Upstream Fingerprint` section absent';
  if (sec) {
    const body = sec.lines.join('\n') + '\n' + (doc02.fingerprintBlock || '');
    const m = /01-event-storming\.md@sha256:([0-9a-fA-F]+)/.exec(body);
    if (!m) {
      detail = 'no `01-event-storming.md@sha256:<64-hex>` line found';
    } else {
      const hex = m[1];
      const is64 = /^[0-9a-f]{64}$/.test(hex);
      const placeholder = /^0+$/.test(hex) || /^x+$/i.test(hex) || hex === '<hex>';
      ok = is64 && !placeholder;
      if (!ok) detail = `sha256 must be 64 lowercase hex, non-placeholder (got '${hex.slice(0, 16)}…', len ${hex.length})`;
    }
  }
  return { id: 'L7', rule: 'B1/B3', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : detail };
}

export function lintL8_singleInput(doc02) {
  const sec = doc02.sections.get('Upstream Fingerprint');
  const body = (sec ? sec.lines.join('\n') : '') + '\n' + (doc02.fingerprintBlock || '');
  // Any reference to another spec file (NN-name.md) other than 01-event-storming.md.
  const refs = body.match(/\b\d{2}-[a-z0-9-]+\.md\b/gi) || [];
  const foreign = refs.filter((r) => key(r) !== '01-event-storming.md');
  const ok = foreign.length === 0;
  return {
    id: 'L8',
    rule: 'B2',
    severity: 'error',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `fingerprint references foreign spec(s): ${[...new Set(foreign)].join(', ')}`,
  };
}

export function lintL9_boundedContext(doc02) {
  // A one-line bounded-context declaration above `## Terms` (in preamble, the
  // fingerprint section body, or before Terms in source). Heuristic: any line
  // mentioning "bounded context" before the Terms heading.
  const termsIdx = doc02.order.indexOf('Terms');
  const haystacks = [doc02.preamble.join('\n')];
  for (const h2 of doc02.order) {
    if (h2 === 'Terms') break;
    const s = doc02.sections.get(h2);
    if (s) haystacks.push(s.lines.join('\n'));
  }
  const ok = /bounded context/i.test(haystacks.join('\n')) && termsIdx !== -1;
  return {
    id: 'L9',
    rule: 'A7',
    severity: 'warn',
    status: ok ? 'pass' : 'warn',
    detail: ok ? '' : 'no one-line bounded-context declaration found above `## Terms`',
  };
}

export function lintL10_freshness(doc02) {
  const sec = doc02.sections.get('Upstream Fingerprint');
  const body = (sec ? sec.lines.join('\n') : '') + '\n' + (doc02.fingerprintBlock || '');
  const ok = /\d{4}-\d{2}-\d{2}/.test(body) || /\b(rev|revision|captured|generated)\b/i.test(body);
  return {
    id: 'L10',
    rule: 'B4',
    severity: 'info',
    status: ok ? 'pass' : 'info',
    detail: ok ? '' : 'no freshness note (date or 01 revision) beside the digest',
  };
}

export function lintL11_snakeCase(g) {
  const bad = [];
  for (const en of g.enums) {
    for (const v of en.values) {
      if (!isSnakeCase(v.value)) bad.push(`${en.enumName}.${v.value || '(blank)'}`);
    }
  }
  return {
    id: 'L11',
    rule: 'D5',
    severity: 'error',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `non-snake_case enum value(s): ${bad.join(', ')}` : '',
  };
}

export function lintL12_casing(g) {
  // C8: term casing consistent against a single convention. We accept either an
  // all-PascalCase term set or an all-lowercase-phrase set; a MIX without a
  // declaration is a fail. (PascalCase nouns are the recommended convention.)
  const names = g.terms.map((t) => t.term).filter((t) => t && !MULTI_NAME.test(t));
  if (names.length === 0) return { id: 'L12', rule: 'C8', severity: 'error', status: 'pass', detail: '' };
  const isPascal = (s) => /^[A-Z][A-Za-z0-9]*( [A-Z][A-Za-z0-9]*)*$/.test(s);
  const isLower = (s) => /^[a-z][a-z0-9]*( [a-z0-9]+)*$/.test(s);
  const pascal = names.filter(isPascal).length;
  const lower = names.filter(isLower).length;
  // Consistent if ALL match one convention.
  const ok = pascal === names.length || lower === names.length;
  return {
    id: 'L12',
    rule: 'C8',
    severity: 'error',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `mixed Term casing conventions (PascalCase=${pascal}, lower=${lower}, total=${names.length}); pin one`,
  };
}

export function lintL13_techLeak(g) {
  const hits = [];
  for (const t of g.terms) {
    const tok = blocklistHit(t.definition, TECH_LEAK);
    if (tok) hits.push(`'${t.term}' (${tok})`);
    const ph = phraseHit(t.definition, TECH_LEAK_PHRASES);
    if (ph) hits.push(`'${t.term}' ('${ph}')`);
  }
  return {
    id: 'L13',
    rule: 'C3',
    severity: 'error',
    status: hits.length === 0 ? 'pass' : 'fail',
    detail: hits.length ? `tech-leak token in Definition: ${hits.join('; ')}` : '',
  };
}

export function lintL14_vague(g) {
  const hits = [];
  for (const t of g.terms) {
    const tTok = blocklistHit(t.term, VAGUE_FILLER);
    if (tTok) hits.push(`Term '${t.term}' (${tTok})`);
    const dTok = blocklistHit(t.definition, VAGUE_FILLER);
    if (dTok) hits.push(`Definition of '${t.term}' (${dTok})`);
    // bare `status`: the Term IS exactly "status", or definition uses standalone "status".
    if (key(t.term) === BARE_STATUS) hits.push(`Term '${t.term}' (bare status)`);
    if (new RegExp(`\\b${BARE_STATUS}\\b`, 'i').test(t.definition) && !/[A-Z][a-z]*status/i.test(t.definition)) {
      hits.push(`Definition of '${t.term}' (bare status)`);
    }
  }
  return {
    id: 'L14',
    rule: 'C4',
    severity: 'error',
    status: hits.length === 0 ? 'pass' : 'fail',
    detail: hits.length ? `vague token: ${[...new Set(hits)].join('; ')}` : '',
  };
}

export function lintL15_defer(g) {
  const bad = [];
  for (const t of g.terms) {
    for (const re of DEFER_PHRASES) {
      if (re.test(t.definition)) { bad.push(t.term); break; }
    }
  }
  return {
    id: 'L15',
    rule: 'C7',
    severity: 'warn',
    status: bad.length === 0 ? 'pass' : 'warn',
    detail: bad.length ? `Definition defers instead of defining: ${bad.join(', ')}` : '',
  };
}

// E2-mech (DRY mechanizable subset, simulation.md §3.2). A Definition that
// contains ≥N (default 2) consecutive verbatim 01 event names from a single
// skeleton, in skeleton order. Lint id L18 (records catalog E2-mech).
export function lintL18_dryRestate(g, u, N = 2) {
  const bad = [];
  for (const t of g.terms) {
    const def = ' ' + t.definition + ' ';
    for (const sk of u.skeletons01) {
      const steps = sk.steps;
      for (let i = 0; i + N <= steps.length; i++) {
        const window = steps.slice(i, i + N);
        const joined = window.join(' ');
        if (def.includes(joined)) {
          bad.push(`'${t.term}' restates ${sk.aggregate} lifecycle ('${joined}')`);
          break;
        }
      }
    }
  }
  return {
    id: 'L18',
    rule: 'E2-mech',
    severity: 'error',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? bad.join('; ') : '',
  };
}

// Gather EVERY pipe table in the 02 document — top-level sections AND their
// `### <sub>` subsections — so a restated 01-shaped table anywhere in 02 is
// caught regardless of where it was pasted.
function allTables02(doc02) {
  const out = [];
  for (const sec of doc02.sections.values()) {
    for (const tb of sec.tables) out.push({ section: sec.title, table: tb });
    for (const sub of sec.subsections.values()) {
      for (const tb of sub.tables) out.push({ section: `${sec.title} › ${sub.title}`, table: tb });
    }
  }
  return out;
}

// L16 / E1-mech (simulation.md §3.2). A Domain-Events-shaped table
// (`Event | Actor | Trigger | Notes` header) appearing ANYWHERE inside 02 is a
// restated 01 event table (DRY violation; 01 owns event names). The Enums
// values table and Terms/Forbidden tables have different headers, so a legal 02
// never trips this; only a pasted 01 Domain-Events table does.
export function lintL16_restatedEventTable(doc02) {
  const bad = [];
  for (const { section, table } of allTables02(doc02)) {
    if (columnsMatch(table, EVENTS_COLUMNS_01)) {
      bad.push(`Domain-Events-shaped table under '${section}'`);
    }
  }
  return {
    id: 'L16',
    rule: 'E1-mech',
    severity: 'error',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `02 restates a 01 event table (01 owns event names): ${bad.join('; ')}` : '',
  };
}

// L17 / E4-mech (simulation.md §3.2). A Hotspots-shaped table
// (`Hotspot | Question | Blocks` header) appearing ANYWHERE inside 02 is a
// restated 01 hotspot block (DRY violation; 01 owns hotspots).
export function lintL17_restatedHotspotBlock(doc02) {
  const bad = [];
  for (const { section, table } of allTables02(doc02)) {
    if (columnsMatch(table, HOTSPOTS_COLUMNS_01)) {
      bad.push(`Hotspots-shaped table under '${section}'`);
    }
  }
  return {
    id: 'L17',
    rule: 'E4-mech',
    severity: 'error',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `02 restates a 01 hotspot block (01 owns hotspots): ${bad.join('; ')}` : '',
  };
}

// ===========================================================================
// RESOLUTION — R1–R7 (simulation.md §4.1). Each returns { id, rule, status,
// detail, edges, upstreamDefect? }. `edges` counts the resolution edges walked.
// `selfDefects` is the upstream self-check defect set (for upstream-defect tag).
// ===========================================================================

export function checkR1_termOwns(g, u) {
  const known = new Set([...u.events01, ...u.actors01, ...u.aggregates01].map(exact));
  let edges = 0;
  const bad = [];
  for (const t of g.terms) {
    if (key(t.ownsElement) !== 'yes') continue;
    edges++;
    if (!known.has(exact(t.element01))) bad.push(`'${t.term}' → '${t.element01}'`);
  }
  return {
    id: 'R1',
    rule: 'F1/F2',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `Term 01-element does not resolve char-for-char: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR2_coreConcept(g, u) {
  const owned = new Set(g.terms.map((t) => exact(t.term)));
  // membership is by exact term string OR by the owned 01-element string.
  const ownedElements = new Set(
    g.terms.filter((t) => key(t.ownsElement) === 'yes').map((t) => exact(t.element01))
  );
  let edges = 0;
  const bad = [];
  for (const name of [...u.actors01, ...u.aggregates01]) {
    edges++;
    if (!owned.has(exact(name)) && !ownedElements.has(exact(name))) bad.push(name);
  }
  return {
    id: 'R2',
    rule: 'C6',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `01 core concept(s) with no owned Term: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR3_enumToSkeleton(g, u) {
  const aggs = new Set(u.aggregates01.map(exact));
  let edges = 0;
  const bad = [];
  for (const en of g.enums) {
    edges++;
    const agg = en.enumName.replace(/Status$/, '');
    if (!aggs.has(exact(agg))) bad.push(`${en.enumName} (aggregate '${agg}' absent from 01)`);
  }
  return {
    id: 'R3',
    rule: 'F4/D2',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `enum without a 01 skeleton: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR4_skeletonToEnum(g, u) {
  const enumAggs = new Set(g.enums.map((e) => exact(e.enumName.replace(/Status$/, ''))));
  let edges = 0;
  const bad = [];
  for (const agg of u.aggregates01) {
    edges++;
    if (!enumAggs.has(exact(agg))) bad.push(`${agg} (no ${agg}Status enum)`);
  }
  return {
    id: 'R4',
    rule: 'D1/D3',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `01 skeleton with no matching enum: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR5_valueToEvent(g, u, selfDefects) {
  const known = new Set(u.events01.map(exact));
  const defectSteps = new Set((selfDefects || []).map((d) => exact(d.step)));
  let edges = 0;
  const bad = [];
  const upstreamBad = [];
  for (const en of g.enums) {
    for (const v of en.values) {
      edges++;
      if (known.has(exact(v.derivedFromEvent))) continue;
      // If the unresolved derived-from is itself a self-check defect step of 01,
      // this is an UPSTREAM defect, not a 02 defect (simulation.md §9 case 2).
      if (defectSteps.has(exact(v.derivedFromEvent))) {
        upstreamBad.push(`${en.enumName}.${v.value} ← 01 element '${v.derivedFromEvent}'`);
      } else {
        bad.push(`${en.enumName}.${v.value} ← '${v.derivedFromEvent}'`);
      }
    }
  }
  const fail = bad.length > 0 || upstreamBad.length > 0;
  return {
    id: 'R5',
    rule: 'D6/F2',
    status: fail ? 'fail' : 'pass',
    detail: fail
      ? `derived-from not a verbatim 01 event: ${[...bad, ...upstreamBad].join(', ')}`
      : '',
    edges,
    upstreamDefect: upstreamBad.length > 0,
    upstreamDetail: upstreamBad.length
      ? `01 element(s) referenced by a faithful 02 are absent from 01 Domain Events: ${upstreamBad.join(', ')}`
      : '',
  };
}

export function checkR6_valueOwningAggregate(g, u) {
  const stepsByAgg = new Map();
  for (const sk of u.skeletons01) stepsByAgg.set(exact(sk.aggregate), new Set(sk.steps.map(exact)));
  let edges = 0;
  const bad = [];
  for (const en of g.enums) {
    const agg = exact(en.enumName.replace(/Status$/, ''));
    const ownSteps = stepsByAgg.get(agg) || new Set();
    for (const v of en.values) {
      edges++;
      if (!ownSteps.has(exact(v.derivedFromEvent))) {
        bad.push(`${en.enumName}.${v.value} ← '${v.derivedFromEvent}' (not in ${agg} skeleton)`);
      }
    }
  }
  return {
    id: 'R6',
    rule: 'F3',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `enum value maps to a non-owning aggregate's event: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR7_forbiddenCanonical(g) {
  const owned = new Set(g.terms.map((t) => exact(t.term)));
  let edges = 0;
  const bad = [];
  for (const f of g.forbidden) {
    edges++;
    if (!owned.has(exact(f.canonicalTerm))) bad.push(`'${f.forbiddenTerm}' → '${f.canonicalTerm}'`);
  }
  return {
    id: 'R7',
    rule: 'F5',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `Forbidden canonical not in Terms: ${bad.join(', ')}` : '',
    edges,
  };
}

// ===========================================================================
// EXACT-VALUE — X1–X5 (simulation.md §4.2).
// ===========================================================================

export function checkX1_termCount(g, reconciledAgainst) {
  const ok = g.terms.length === reconciledAgainst;
  return {
    id: 'X1',
    rule: 'reconciliation',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `termCount=${g.terms.length} but reconciled against ${reconciledAgainst}`,
  };
}

export function checkX2_noDuplicateTerm(g) {
  const seen = new Set();
  const dups = [];
  for (const t of g.terms) {
    const k = key(t.term);
    if (seen.has(k)) dups.push(t.term);
    seen.add(k);
  }
  return {
    id: 'X2',
    rule: 'C1',
    status: dups.length === 0 ? 'pass' : 'fail',
    detail: dups.length ? `duplicate Term row(s): ${[...new Set(dups)].join(', ')}` : '',
  };
}

export function checkX3_valueOrdering(g, u) {
  const stepsByAgg = new Map();
  for (const sk of u.skeletons01) stepsByAgg.set(exact(sk.aggregate), sk.steps.map(exact));
  const bad = [];
  for (const en of g.enums) {
    const agg = exact(en.enumName.replace(/Status$/, ''));
    const steps = stepsByAgg.get(agg);
    if (!steps) continue; // R3 owns the "no skeleton" case
    if (en.values.length !== steps.length) {
      bad.push(`${en.enumName}: ${en.values.length} values vs ${steps.length} skeleton events`);
      continue;
    }
    for (let i = 0; i < steps.length; i++) {
      const expected = eventToValue(steps[i], agg);
      // ordering+derivation: derivedFromEvent must equal the i-th skeleton step,
      // AND the value must equal the normalized form of that step.
      if (exact(en.values[i].derivedFromEvent) !== exact(steps[i])) {
        bad.push(`${en.enumName} pos ${i + 1}: derived-from '${en.values[i].derivedFromEvent}' ≠ skeleton '${steps[i]}'`);
        break;
      }
      if (en.values[i].value !== expected) {
        bad.push(`${en.enumName} pos ${i + 1}: value '${en.values[i].value}' ≠ derived '${expected}'`);
        break;
      }
    }
  }
  return {
    id: 'X3',
    rule: 'D4',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? bad.join('; ') : '',
  };
}

export function checkX4_enumBijection(g, u) {
  const ok = g.enums.length === u.aggregates01.length;
  return {
    id: 'X4',
    rule: 'D1+D2',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `enum count ${g.enums.length} ≠ 01 skeleton count ${u.aggregates01.length}`,
  };
}

export function checkX5_reconcile(executedChecks, edgesWalked, edgesExpected) {
  const ok = executedChecks > 0 && edgesWalked === edgesExpected;
  return {
    id: 'X5',
    rule: 'reconciliation',
    status: ok ? 'pass' : 'broken',
    detail: ok
      ? ''
      : `reconcile failed: executed=${executedChecks} edgesWalked=${edgesWalked} edgesExpected=${edgesExpected}`,
  };
}

// Expected edge count (simulation.md §5):
//   R1: terms with ownsElement=yes
//   R2: actors01 + aggregates01
//   R3: enums
//   R4: aggregates01
//   R5: Σ enum.values
//   R6: Σ enum.values
//   R7: forbidden
export function expectedEdges(g, u) {
  const r1 = g.terms.filter((t) => key(t.ownsElement) === 'yes').length;
  const r2 = u.actors01.length + u.aggregates01.length;
  const r3 = g.enums.length;
  const r4 = u.aggregates01.length;
  let values = 0;
  for (const en of g.enums) values += en.values.length;
  const r5 = values;
  const r6 = values;
  const r7 = g.forbidden.length;
  return r1 + r2 + r3 + r4 + r5 + r6 + r7;
}

// Intake / coverage counts.
export function intakeCounts(g) {
  let enumValues = 0;
  for (const en of g.enums) enumValues += en.values.length;
  return {
    terms: g.terms.length,
    enums: g.enums.length,
    enumValues,
    forbidden: g.forbidden.length,
  };
}

export function elementsTotal(g) {
  const c = intakeCounts(g);
  return c.terms + c.enums + c.enumValues + c.forbidden;
}

export {
  REQUIRED_H2_02,
  TERMS_COLUMNS,
  ENUM_VALUE_COLUMNS,
  FORBIDDEN_COLUMNS,
  REQUIRED_H2_01,
  key,
  exact,
  isBlank,
};
