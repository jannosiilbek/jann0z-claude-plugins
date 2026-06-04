// checks.mjs — the CLOSED assertion grammar for the aggregates oracle
// (simulation.md §4). Mechanical check classes + agent-judged placeholders:
//   lint           L1–L17   (S-theme structure + mechanical D-theme shape rules)
//   resolution     R1–R7    (03→01 / 03→02 exact-string edges; R7 = X7-pre)
//   exact-value    X1–X5    (cardinality / uniqueness / X4-mech / reconciliation)
//   reason-qual.   N1–N22   (proven over fixtures in selftest; share catalog IDs)
//   agent-judged   AJ1–AJ5  (recorded only, never block, not in reconciliation)
//
// This grammar is NEVER extended ad hoc; adding a check means editing this file
// AND simulation.md §4 in a committed change, citing a catalog rule. Every check
// records { id, class, rule, status } (status ∈ pass|fail|warn|info). A check
// that THROWS is surfaced by the harness as `broken-test`.
//
// COPIED scaffold from the sibling glossary checks.mjs, then extended with the
// 03-specific shapes (aggregate sub-blocks + cross-aggregate policies table) and
// TWO upstream parses (01 + 02). Copied, never cross-referenced. The 01 + 02
// pinned-shape readers are copied here too (each skill self-contained).

import {
  X4_GENERIC_BLOCKLIST,
  COLLECTION_BLOCKLIST,
  MODE_SET,
  KIND_SET,
  LIFECYCLE_WINDOW_N,
  wordTokens,
  plainTokens,
  blocklistHit,
  enumTokens,
} from './lexicon.mjs';

// ---------------------------------------------------------------------------
// Pinned shapes (simulation.md §1).
// ---------------------------------------------------------------------------
// 03 S-theme.
const REQUIRED_H2_03 = ['Upstream Fingerprints', 'Aggregates', 'Cross-Aggregate Policies'];
const BOUNDARY_COLUMNS = ['Member', 'Kind', '02 Term'];
const INVARIANTS_COLUMNS = ['ID', 'Rule', 'Scope'];
const REFERENCES_COLUMNS = ['Target aggregate', 'Identity field held', 'Reason'];
const POLICIES_COLUMNS = ['Policy', 'Source event', 'Target aggregate', 'Mode', 'Justification'];

// Pinned 01 upstream shape (the same A-theme event-storming pins).
const REQUIRED_H2_01 = ['Domain Events', 'Actors', 'Hotspots', 'Lifecycle Skeletons'];
const EVENTS_COLUMNS_01 = ['Event', 'Actor', 'Trigger', 'Notes', 'Deliverable'];
const ACTORS_COLUMNS_01 = ['Actor', 'Kind', 'Responsibility'];
const HOTSPOTS_COLUMNS_01 = ['Hotspot', 'Question', 'Blocks'];

// Pinned 02 upstream shape (the glossary A-theme).
const REQUIRED_H2_02 = ['Upstream Fingerprint', 'Terms', 'Enums', 'Forbidden Synonyms'];
const TERMS_COLUMNS_02 = ['Term', 'Definition', 'Owns 01 element?', '01 element (exact string)'];
const ENUM_VALUE_COLUMNS_02 = ['Value', 'Derived from event (exact 01 string)'];
const FORBIDDEN_COLUMNS_02 = ['Forbidden term', 'Canonical term', 'Reason'];

const norm = (s) => (s == null ? '' : String(s).trim());
const isBlank = (s) => {
  const t = norm(s);
  return t === '' || t === '-' || t === 'TBD' || t === '???';
};
// EXACT cross-document identity: char-for-char.
const exact = (s) => norm(s);
// Case/space-insensitive key (only where the catalog allows near-identity).
const key = (s) => norm(s).toLowerCase().replace(/\s+/g, ' ');

function columnsMatch(table, expected) {
  if (!table) return false;
  if (table.columns.length !== expected.length) return false;
  return expected.every((c, i) => key(table.columns[i]) === key(c));
}

// =====================================================================
// 01 UPSTREAM — parse + derive + self-check (X7-pre / R7).
// =====================================================================
export function deriveUpstream01(doc01) {
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

  // eventOwner: event → [aggregates whose skeleton lists it]. Built from 01 only.
  const eventOwner = new Map();
  for (const sk of skeletons01) {
    for (const step of sk.steps) {
      const k = exact(step);
      if (!eventOwner.has(k)) eventOwner.set(k, []);
      eventOwner.get(k).push(sk.aggregate);
    }
  }

  return { eventsTable, actorsTable, events01, actors01, aggregates01, skeletons01, eventOwner };
}

// Parseability of 01 against its pinned format. Unparseable ⇒ broken-test (§9.4).
export function parseUpstream01Shape(doc01) {
  const missing = REQUIRED_H2_01.filter((h) => !doc01.sections.has(h));
  if (missing.length) return { ok: false, detail: `upstream 01 missing required section(s): ${missing.join(', ')}` };
  const u = deriveUpstream01(doc01);
  if (!columnsMatch(u.eventsTable, EVENTS_COLUMNS_01)) return { ok: false, detail: 'upstream 01 Domain Events table column shape is wrong' };
  if (!columnsMatch(u.actorsTable, ACTORS_COLUMNS_01)) return { ok: false, detail: 'upstream 01 Actors table column shape is wrong' };
  if (u.skeletons01.length === 0) return { ok: false, detail: 'upstream 01 has no `### <Aggregate>` lifecycle skeleton' };
  return { ok: true, detail: '' };
}

// X7-pre / 01 self-consistency (simulation.md §3.1, §9.2). Two defect classes:
//   (a) skeleton step absent from 01 Domain Events (a phantom step), AND
//   (b) a state-changing event owned by ZERO or by ≥2 skeletons (eventOwner).
// "State-changing event" = every event in the Domain Events table (the pinned 01
// has no non-state-changing marker; every listed event is a domain fact).
// Returns { ok, defects:[{kind, event/step, aggregate?, detail}] }.
export function upstream01SelfCheck(u) {
  const known = new Set(u.events01.map(exact));
  const defects = [];
  // (a) phantom skeleton steps.
  for (const sk of u.skeletons01) {
    for (const step of sk.steps) {
      if (!known.has(exact(step))) {
        defects.push({ kind: 'phantom-step', event: exact(step), aggregate: sk.aggregate,
          detail: `01 skeleton '${sk.aggregate}' lists step '${step}' absent from 01 Domain Events` });
      }
    }
  }
  // (b) zero / double ownership of each Domain-Events event.
  for (const ev of u.events01) {
    const owners = u.eventOwner.get(exact(ev)) || [];
    if (owners.length === 0) {
      defects.push({ kind: 'zero-owner', event: exact(ev), detail: `event '${ev}' owned by zero skeletons in 01` });
    } else if (owners.length >= 2) {
      defects.push({ kind: 'double-owner', event: exact(ev), detail: `event '${ev}' owned by ${owners.length} skeletons in 01 (${owners.join(', ')})` });
    }
  }
  return { ok: defects.length === 0, defects };
}

// =====================================================================
// 02 UPSTREAM — parse + derive + self-check (R4 provenance, §9.3).
// =====================================================================
export function deriveUpstream02(doc02) {
  const sec = (t) => doc02.sections.get(t) || null;

  const termsTable = sec('Terms') ? sec('Terms').tables[0] : null;
  const terms02 = termsTable ? termsTable.rows.map((r) => exact(r[0])).filter((s) => s !== '') : [];

  const enumSec = sec('Enums');
  const enums02 = [];
  if (enumSec) {
    for (const title of enumSec.subOrder) {
      const sub = enumSec.subsections.get(title);
      const vt = sub.tables[0] || null;
      const values = vt ? vt.rows.map((r) => ({ value: exact(r[0]), derivedFromEvent: exact(r[1]) })) : [];
      enums02.push({ enumName: exact(title), aggregate: exact(title.replace(/Status$/, '')), valuesTable: vt, values });
    }
  }

  const fbTable = sec('Forbidden Synonyms') ? sec('Forbidden Synonyms').tables[0] : null;
  const forbidden02 = fbTable ? fbTable.rows.map((r) => exact(r[0])).filter((s) => s !== '') : [];

  // valuesByAggregate: aggregateName → Set(value strings).
  const valuesByAggregate = new Map();
  // allValues: union of every enum value string (for the single-word enum-token gate).
  const allValues = new Set();
  for (const en of enums02) {
    const set = new Set();
    for (const v of en.values) { set.add(v.value); allValues.add(v.value); }
    valuesByAggregate.set(en.aggregate, set);
  }

  return { termsTable, terms02, enumSec, enums02, fbTable, forbidden02, valuesByAggregate, allValues };
}

// Parseability of 02 (§9.5). The Forbidden Synonyms section is REQUIRED (the L12
// scan list is built from it); a missing/mis-shaped pinned section ⇒ broken-test.
export function parseUpstream02Shape(doc02) {
  const missing = REQUIRED_H2_02.filter((h) => !doc02.sections.has(h));
  if (missing.length) return { ok: false, detail: `upstream 02 missing required section(s): ${missing.join(', ')}` };
  const g = deriveUpstream02(doc02);
  if (!columnsMatch(g.termsTable, TERMS_COLUMNS_02)) return { ok: false, detail: 'upstream 02 Terms table column shape is wrong' };
  if (g.fbTable && !columnsMatch(g.fbTable, FORBIDDEN_COLUMNS_02)) return { ok: false, detail: 'upstream 02 Forbidden Synonyms table column shape is wrong' };
  for (const en of g.enums02) {
    if (!columnsMatch(en.valuesTable, ENUM_VALUE_COLUMNS_02)) return { ok: false, detail: `upstream 02 enum '${en.enumName}' values table column shape is wrong` };
  }
  return { ok: true, detail: '' };
}

// 02 self-consistency vs 01 (§9.3): every 02 enum value's `Derived from event`
// must resolve into 01 Domain Events. A defect here is an UPSTREAM-02 defect; a
// faithful 03 citing that value surfaces it via R4. Returns { ok, defects, badValues:Set }.
export function upstream02SelfCheck(g02, u01) {
  const known = new Set(u01.events01.map(exact));
  const defects = [];
  const badValues = new Set(); // value strings whose provenance is broken (route → 02)
  for (const en of g02.enums02) {
    for (const v of en.values) {
      if (!known.has(exact(v.derivedFromEvent))) {
        defects.push({ enum: en.enumName, value: v.value, derivedFromEvent: v.derivedFromEvent,
          detail: `02 enum '${en.enumName}' value '${v.value}' derives from '${v.derivedFromEvent}', absent from 01 Domain Events` });
        badValues.add(v.value);
      }
    }
  }
  return { ok: defects.length === 0, defects, badValues };
}

// =====================================================================
// 03 ARTIFACT — derive the scenario graph (simulation.md §3.1).
// =====================================================================
// A `### <Aggregate>` subsection's sub-blocks are recognised by labelled lines +
// the first table following each label, plus a `**Root:**` line and the
// References `none` literal. The sub-block ORDER (Root, Boundary, Invariants,
// References) is verified by L3.
export function deriveGraph03(doc03) {
  const aggSec = doc03.sections.get('Aggregates') || null;
  const aggregates = [];
  if (aggSec) {
    for (const title of aggSec.subOrder) {
      const sub = aggSec.subsections.get(title);
      aggregates.push(parseAggregateSub(title, sub));
    }
  }

  const polSec = doc03.sections.get('Cross-Aggregate Policies') || null;
  let policies = [];
  let policiesTable = null;
  let policiesNone = false;
  if (polSec) {
    policiesTable = polSec.tables[0] || null;
    const body = polSec.lines.join('\n');
    if (!policiesTable && /^\s*none\s*$/im.test(body)) policiesNone = true;
    if (policiesTable) {
      policies = policiesTable.rows.map((r) => ({
        policy: exact(r[0]),
        sourceEvent: exact(r[1]),
        targetAgg: exact(r[2]),
        mode: exact(r[3]),
        justification: exact(r[4] == null ? '' : r[4]),
      }));
    }
  }

  return { aggSec, aggregates, polSec, policiesTable, policies, policiesNone };
}

function parseAggregateSub(title, sub) {
  const lines = sub ? sub.lines : [];
  // Locate labelled blocks by their leading bold label line.
  let root = '', identityField = '', rootCount = 0, rootGloballyUnique = false, rootRaw = '';
  let boundaryTable = null, invariantsTable = null, referencesTable = null;
  let referencesNone = false, hasRootLine = false, hasBoundaryLabel = false,
      hasInvariantsLabel = false, hasReferencesLabel = false;
  // Track label order for L3 (order check).
  const labelOrder = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mRoot = /^\*\*Root:\*\*\s*(.+?)\s*$/.exec(line);
    if (mRoot) {
      hasRootLine = true; rootRaw = mRoot[1];
      labelOrder.push('root');
      // Parse `<Entity> · identity: <field> (globally unique)`.
      const mFull = /^(.+?)\s*·\s*identity:\s*(.+?)\s*\(globally unique\)\s*$/.exec(mRoot[1]);
      if (mFull) {
        root = exact(mFull[1]); identityField = exact(mFull[2]); rootGloballyUnique = true;
      } else {
        const mPart = /^(.+?)\s*·\s*identity:\s*(.+?)\s*$/.exec(mRoot[1]);
        if (mPart) { root = exact(mPart[1]); identityField = exact(mPart[2]); }
        else root = exact(mRoot[1]);
      }
      // Root-entity count: split on ` and ` / `,` / ` & ` to detect multi-entity roots (A1).
      rootCount = root === '' ? 0 : root.split(/\s+and\s+|\s*,\s*|\s+&\s+/).filter((s) => s.trim() !== '').length;
      continue;
    }
    if (/^\*\*Boundary contents:\*\*/.test(line)) { hasBoundaryLabel = true; labelOrder.push('boundary'); continue; }
    if (/^\*\*Invariants:\*\*/.test(line)) { hasInvariantsLabel = true; labelOrder.push('invariants'); continue; }
    if (/^\*\*References/.test(line)) {
      hasReferencesLabel = true; labelOrder.push('references');
      // A `none` literal may follow the label.
      for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
        if (/^\s*none\s*$/i.test(lines[j])) { referencesNone = true; break; }
        if (lines[j].trim() !== '') break;
      }
      continue;
    }
  }

  // Assign tables to their labels by which label most recently preceded each
  // table's start line. The md reader already collected sub.tables in order; map
  // them by the label seen before their startLine.
  const tableByLabel = mapTablesToLabels(lines, sub ? sub.tables : []);
  boundaryTable = tableByLabel.boundary || null;
  invariantsTable = tableByLabel.invariants || null;
  referencesTable = tableByLabel.references || null;

  const members = boundaryTable
    ? boundaryTable.rows.map((r) => ({ member: exact(r[0]), kind: exact(r[1]), term02: exact(r[2]) }))
    : [];
  const invariants = invariantsTable
    ? invariantsTable.rows.map((r) => ({ id: exact(r[0]), rule: exact(r[1]), scope: exact(r[2]) }))
    : [];
  const references = referencesTable
    ? referencesTable.rows.map((r) => ({ targetAgg: exact(r[0]), identityField: exact(r[1]), reason: exact(r[2]) }))
    : [];

  return {
    name: exact(title),
    root, identityField, rootCount, rootGloballyUnique, rootRaw,
    hasRootLine, hasBoundaryLabel, hasInvariantsLabel, hasReferencesLabel,
    boundaryTable, invariantsTable, referencesTable, referencesNone,
    labelOrder,
    members, invariants, references,
  };
}

// Map each table in a subsection to the labelled block that precedes it.
function mapTablesToLabels(lines, tables) {
  // Build a line→label index from the label lines.
  const labels = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\*\*Boundary contents:\*\*/.test(lines[i])) labels.push({ line: i, label: 'boundary' });
    else if (/^\*\*Invariants:\*\*/.test(lines[i])) labels.push({ line: i, label: 'invariants' });
    else if (/^\*\*References/.test(lines[i])) labels.push({ line: i, label: 'references' });
  }
  const out = {};
  for (const tb of tables) {
    // The most recent label whose line < table.startLine owns this table.
    let owner = null;
    for (const lb of labels) {
      if (lb.line < tb.startLine) owner = lb.label;
      else break;
    }
    if (owner && !out[owner]) out[owner] = tb;
  }
  return out;
}

// =====================================================================
// LINT — malformed-class (L1, L3–L7). Failure ⇒ malformed (cannot anchor 03).
// Return { id, rule, ok, detail }.  (L2 is fail-class, handled below.)
// =====================================================================

export function lintL1_headings(doc03) {
  // Each of the 3 H2 present exactly once.
  const counts = {};
  for (const h of doc03.order) counts[h] = (counts[h] || 0) + 1;
  const bad = [];
  for (const h of REQUIRED_H2_03) {
    const n = counts[h] || 0;
    if (n !== 1) bad.push(`${h} (×${n})`);
  }
  const ok = bad.length === 0;
  return { id: 'L1', rule: 'S1/S2/S9', ok, detail: ok ? '' : `each H2 must appear exactly once; got: ${bad.join(', ')}` };
}

export function lintL3_subblocks(g03) {
  // Every `### <Aggregate>` carries all four pinned sub-blocks IN ORDER.
  const bad = [];
  for (const a of g03.aggregates) {
    const miss = [];
    if (!a.hasRootLine) miss.push('Root line');
    if (!a.hasBoundaryLabel || !a.boundaryTable) miss.push('Boundary contents table');
    if (!a.hasInvariantsLabel || !a.invariantsTable) miss.push('Invariants table');
    if (!a.hasReferencesLabel || (!a.referencesTable && !a.referencesNone)) miss.push('References table-or-none');
    if (miss.length) { bad.push(`'${a.name}': missing ${miss.join(', ')}`); continue; }
    // Order: root → boundary → invariants → references.
    const expect = ['root', 'boundary', 'invariants', 'references'];
    const got = a.labelOrder.filter((l) => expect.includes(l));
    const ordered = expect.every((l, i) => got[i] === l);
    if (!ordered) bad.push(`'${a.name}': sub-blocks out of order (got ${got.join('→')})`);
  }
  const ok = bad.length === 0;
  return { id: 'L3', rule: 'S5/S6/S7/S8', ok, detail: ok ? '' : bad.join('; ') };
}

export function lintL4_boundaryCols(g03) {
  const bad = [];
  for (const a of g03.aggregates) {
    if (a.boundaryTable && !columnsMatch(a.boundaryTable, BOUNDARY_COLUMNS)) {
      bad.push(`'${a.name}' (${a.boundaryTable.columns.join(' | ')})`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'L4', rule: 'S7', ok, detail: ok ? '' : `Boundary-contents header must be exactly ${BOUNDARY_COLUMNS.join(' | ')}: ${bad.join('; ')}` };
}

export function lintL5_invariantCols(g03) {
  const bad = [];
  for (const a of g03.aggregates) {
    if (a.invariantsTable && !columnsMatch(a.invariantsTable, INVARIANTS_COLUMNS)) {
      bad.push(`'${a.name}' (${a.invariantsTable.columns.join(' | ')})`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'L5', rule: 'S6', ok, detail: ok ? '' : `Invariants header must be exactly ${INVARIANTS_COLUMNS.join(' | ')}: ${bad.join('; ')}` };
}

export function lintL6_referenceCols(g03) {
  const bad = [];
  for (const a of g03.aggregates) {
    if (a.referencesTable && !columnsMatch(a.referencesTable, REFERENCES_COLUMNS)) {
      bad.push(`'${a.name}' (${a.referencesTable.columns.join(' | ')})`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'L6', rule: 'S8', ok, detail: ok ? '' : `References header must be exactly ${REFERENCES_COLUMNS.join(' | ')} or 'none': ${bad.join('; ')}` };
}

export function lintL7_policyCols(g03) {
  // Section present (L1) but the table (when present) must have the pinned shape;
  // OR the literal `none`. A present-but-wrong-shape table is malformed.
  let ok = true, detail = '';
  if (g03.policiesTable) {
    ok = columnsMatch(g03.policiesTable, POLICIES_COLUMNS);
    if (!ok) detail = `Policies header must be exactly ${POLICIES_COLUMNS.join(' | ')} (got ${g03.policiesTable.columns.join(' | ')})`;
  } else if (!g03.policiesNone) {
    ok = false; detail = '`## Cross-Aggregate Policies` has neither a pinned table nor the literal `none`';
  }
  return { id: 'L7', rule: 'S9', ok, detail };
}

// =====================================================================
// LINT — fail/warn-class (L2, L8–L17). Parsed 03 but content wrong.
// Return { id, rule, severity, status, detail }.
// =====================================================================

export function lintL2_fingerprints(doc03) {
  const sec = doc03.sections.get('Upstream Fingerprints');
  let ok = false, detail = '`## Upstream Fingerprints` section absent';
  if (sec) {
    const body = sec.lines.join('\n') + '\n' + (doc03.fingerprintBlock || '');
    const want = [
      { label: '01-event-storming.md', re: /01-event-storming\.md@sha256:([0-9a-fA-F]+|<hex>)/ },
      { label: '02-glossary.md', re: /02-glossary\.md@sha256:([0-9a-fA-F]+|<hex>)/ },
    ];
    const probs = [];
    for (const w of want) {
      const m = w.re.exec(body);
      if (!m) { probs.push(`no ${w.label}@sha256 line`); continue; }
      const hex = m[1];
      const is64 = /^[0-9a-f]{64}$/.test(hex);
      const placeholder = /^0+$/.test(hex) || /^x+$/i.test(hex) || hex === '<hex>';
      if (!is64 || placeholder) probs.push(`${w.label} digest not 64-lowercase-hex non-placeholder (got '${String(hex).slice(0, 12)}…')`);
    }
    ok = probs.length === 0;
    if (!ok) detail = probs.join('; ');
  }
  return { id: 'L2', rule: 'S1', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : detail };
}

export function lintL8_root(g03) {
  // Exactly one root + identity declared globally unique.
  const bad = [];
  for (const a of g03.aggregates) {
    if (!a.hasRootLine) { bad.push(`'${a.name}': no Root line`); continue; }
    if (a.rootCount !== 1) bad.push(`'${a.name}': Root names ${a.rootCount} entities ('${a.rootRaw}')`);
    if (!a.rootGloballyUnique) bad.push(`'${a.name}': identity not declared '(globally unique)' ('${a.rootRaw}')`);
  }
  const ok = bad.length === 0;
  return { id: 'L8', rule: 'S5/A1', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; ') };
}

export function lintL9_kind(g03) {
  const bad = [];
  for (const a of g03.aggregates) {
    for (const m of a.members) {
      if (!KIND_SET.has(key(m.kind))) bad.push(`'${a.name}'.${m.member} kind='${m.kind}'`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'L9', rule: 'S7', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `Kind cell must be entity|value object: ${bad.join(', ')}` };
}

export function lintL10_invariantIdScope(g03) {
  const seen = new Set();
  const badId = [], badScope = [], dup = [];
  for (const a of g03.aggregates) {
    for (const inv of a.invariants) {
      if (!/^INV-[A-Za-z0-9]+-\d+$/.test(inv.id)) badId.push(`'${a.name}'.${inv.id || '(blank)'}`);
      else { if (seen.has(inv.id)) dup.push(inv.id); seen.add(inv.id); }
      if (exact(inv.scope) !== 'within-boundary') badScope.push(`'${a.name}'.${inv.id}='${inv.scope}'`);
    }
  }
  // Scope is ❌ (I2); ID is ⚠️ (I1). A bad Scope drives fail; a bad ID alone is warn.
  const fail = badScope.length > 0;
  const warn = !fail && (badId.length > 0 || dup.length > 0);
  const detailParts = [];
  if (badScope.length) detailParts.push(`Scope must be 'within-boundary': ${badScope.join(', ')}`);
  if (badId.length) detailParts.push(`ID must match INV-<token>-<n>: ${badId.join(', ')}`);
  if (dup.length) detailParts.push(`duplicate invariant ID: ${[...new Set(dup)].join(', ')}`);
  return {
    id: 'L10', rule: 'I1/I2', severity: fail ? 'error' : 'warn',
    status: fail ? 'fail' : warn ? 'warn' : 'pass',
    detail: detailParts.join('; '),
  };
}

export function lintL11_mode(g03) {
  const bad = [];
  for (const p of g03.policies) {
    if (!MODE_SET.has(key(p.mode))) bad.push(`'${p.policy}' mode='${p.mode}'`);
  }
  const ok = bad.length === 0;
  return { id: 'L11', rule: 'X3', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `Mode must be transactional|eventual: ${bad.join(', ')}` };
}

export function lintL12_forbidden(g03, g02) {
  // Whole-word, case-insensitive scan of every 03 prose cell for a 02 forbidden term.
  const forbidden = (g02.forbidden02 || []).map((f) => key(f)).filter((f) => f !== '');
  if (forbidden.length === 0) return { id: 'L12', rule: 'L2', severity: 'error', status: 'pass', detail: '' };
  const fbSet = new Set(forbidden);
  const hits = [];
  const scan = (text, where) => {
    for (const tok of plainTokens(text)) {
      if (fbSet.has(tok)) hits.push(`'${tok}' in ${where}`);
    }
    // multi-word forbidden terms (phrase scan).
    const hay = key(text);
    for (const f of forbidden) {
      if (f.includes(' ') && hay.includes(f)) hits.push(`'${f}' in ${where}`);
    }
  };
  for (const a of g03.aggregates) {
    scan(a.rootRaw, `${a.name} Root`);
    for (const m of a.members) { scan(m.member, `${a.name} member`); scan(m.term02, `${a.name} 02 Term`); }
    for (const inv of a.invariants) scan(inv.rule, `${a.name} invariant`);
    for (const r of a.references) { scan(r.targetAgg, `${a.name} ref target`); scan(r.reason, `${a.name} ref reason`); }
  }
  for (const p of g03.policies) { scan(p.justification, `policy ${p.policy} justification`); scan(p.policy, `policy id`); }
  const ok = hits.length === 0;
  return { id: 'L12', rule: 'L2', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `forbidden synonym used: ${[...new Set(hits)].join('; ')}` };
}

// Gather EVERY table anywhere in 03 (sections + subsections) for the D-theme lints.
function allTables03(doc03) {
  const out = [];
  for (const sec of doc03.sections.values()) {
    for (const tb of sec.tables) out.push({ section: sec.title, table: tb });
    for (const sub of sec.subsections.values()) {
      for (const tb of sub.tables) out.push({ section: `${sec.title} › ${sub.title}`, table: tb });
    }
  }
  return out;
}

export function lintL13_restatedEventTable(doc03) {
  const bad = [];
  for (const { section, table } of allTables03(doc03)) {
    if (columnsMatch(table, EVENTS_COLUMNS_01)) bad.push(`under '${section}'`);
  }
  const ok = bad.length === 0;
  return { id: 'L13', rule: 'D1-mech', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `03 restates a 01 Domain-Events table: ${bad.join('; ')}` };
}

export function lintL14_restatedActorHotspot(doc03) {
  const bad = [];
  for (const { section, table } of allTables03(doc03)) {
    if (columnsMatch(table, HOTSPOTS_COLUMNS_01)) bad.push(`Hotspots-shaped under '${section}'`);
    if (columnsMatch(table, ACTORS_COLUMNS_01)) bad.push(`Actors-shaped under '${section}'`);
  }
  const ok = bad.length === 0;
  // ℹ️ / warn-only (D5).
  return { id: 'L14', rule: 'D5-mech', severity: 'info', status: ok ? 'pass' : 'info', detail: ok ? '' : `03 restates a 01 actor/hotspot block: ${bad.join('; ')}` };
}

export function lintL15_restatedTermsTable(doc03) {
  const bad = [];
  for (const { section, table } of allTables03(doc03)) {
    if (columnsMatch(table, TERMS_COLUMNS_02)) bad.push(`under '${section}'`);
  }
  const ok = bad.length === 0;
  return { id: 'L15', rule: 'D3-mech', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `03 restates a 02 Terms table: ${bad.join('; ')}` };
}

export function lintL16_restatedEnumListing(doc03, g03, g02) {
  const bad = [];
  // (a) a `Value | Derived from event…` listing table anywhere.
  for (const { section, table } of allTables03(doc03)) {
    if (columnsMatch(table, ENUM_VALUE_COLUMNS_02)) bad.push(`enum-values table under '${section}'`);
  }
  // (b) a prose cell that recaps a single 02 enum's ENTIRE value set as an
  // enumeration (a restatement of the enum). A rule citing a SUBSET of values is
  // a legitimate business constraint, not a recap — only the full-set listing in
  // one cell trips D4-mech.
  for (const en of g02.enums02) {
    const vals = en.values.map((v) => v.value).filter(Boolean);
    if (vals.length < 2) continue;
    const cells = [];
    for (const a of g03.aggregates) {
      for (const inv of a.invariants) cells.push(inv.rule);
      for (const r of a.references) cells.push(r.reason);
    }
    for (const p of g03.policies) cells.push(p.justification);
    for (const cell of cells) {
      const toks = new Set(wordTokens(cell));
      const present = vals.filter((v) => toks.has(v));
      if (present.length === vals.length) { bad.push(`prose recaps the full ${en.enumName} value set (${present.join(', ')})`); break; }
    }
  }
  const ok = bad.length === 0;
  return { id: 'L16', rule: 'D4-mech', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : `03 restates a 02 enum value set: ${bad.join('; ')}` };
}

export function lintL17_restatedLifecycle(g03, u01, N = LIFECYCLE_WINDOW_N) {
  const bad = [];
  const cells = [];
  for (const a of g03.aggregates) {
    for (const inv of a.invariants) cells.push({ text: inv.rule, where: `${a.name} invariant ${inv.id}` });
    for (const r of a.references) cells.push({ text: r.reason, where: `${a.name} ref reason` });
  }
  for (const { text, where } of cells) {
    const hay = ' ' + text + ' ';
    for (const sk of u01.skeletons01) {
      const steps = sk.steps;
      for (let i = 0; i + N <= steps.length; i++) {
        const window = steps.slice(i, i + N).join(' ');
        if (hay.includes(window)) { bad.push(`${where} restates ${sk.aggregate} lifecycle ('${window}')`); break; }
      }
    }
  }
  const ok = bad.length === 0;
  return { id: 'L17', rule: 'D2-mech', severity: 'error', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; ') };
}

// =====================================================================
// RESOLUTION — R1–R7 (simulation.md §4.1). { id, rule, status, detail, edges,
// upstreamDefect?, upstreamFile?, upstreamDetail? }.
// =====================================================================

export function checkR1_bijection(g03, u01) {
  const set03 = g03.aggregates.map((a) => exact(a.name));
  const set01 = u01.aggregates01.map(exact);
  const s03 = new Set(set03), s01 = new Set(set01);
  const missing = set01.filter((n) => !s03.has(n)); // 01 skeleton w/o 03 subsection
  const extra = set03.filter((n) => !s01.has(n));    // 03 subsection w/o 01 skeleton
  // edges: 01→03 (each 01) + 03→01 (each 03).
  const edges = set01.length + set03.length;
  const ok = missing.length === 0 && extra.length === 0;
  const parts = [];
  if (missing.length) parts.push(`01 skeleton(s) with no 03 subsection: ${missing.join(', ')}`);
  if (extra.length) parts.push(`03 subsection(s) with no 01 skeleton: ${extra.join(', ')}`);
  return { id: 'R1', rule: 'S3/S4', status: ok ? 'pass' : 'fail', detail: ok ? '' : parts.join('; '), edges };
}

export function checkR2_boundaryTerm(g03, g02) {
  const terms = new Set(g02.terms02.map(exact));
  let edges = 0; const bad = [];
  for (const a of g03.aggregates) {
    for (const m of a.members) {
      if (exact(m.term02) === '—' || m.term02 === '') continue;
      edges++;
      if (!terms.has(exact(m.term02))) bad.push(`'${a.name}'.${m.member} → '${m.term02}'`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'R2', rule: 'L1/L3', status: ok ? 'pass' : 'fail', detail: ok ? '' : `Boundary 02 Term not in 02 Terms: ${bad.join(', ')}`, edges };
}

export function checkR3_reference(g03, u01) {
  const aggs = new Set(u01.aggregates01.map(exact));
  // Interior-member names that are NOT themselves an aggregate root/name. A name
  // that is BOTH a member somewhere and a 01 aggregate (e.g. the aggregate's own
  // root entity) is a legitimate reference target; only a pure interior member
  // (member but not an aggregate) is the A3/A7 trap.
  const interiorOnly = new Set();
  for (const a of g03.aggregates) {
    for (const m of a.members) {
      if (!aggs.has(exact(m.member))) interiorOnly.add(exact(m.member));
    }
  }
  let edges = 0; const bad = [];
  for (const a of g03.aggregates) {
    for (const r of a.references) {
      edges++;
      if (interiorOnly.has(exact(r.targetAgg))) {
        bad.push(`'${a.name}' references interior member '${r.targetAgg}' (not a root)`);
      } else if (!aggs.has(exact(r.targetAgg))) {
        bad.push(`'${a.name}' references '${r.targetAgg}' (not a 01 aggregate)`);
      }
    }
  }
  const ok = bad.length === 0;
  return { id: 'R3', rule: 'A3/A7', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

// R4 — every enum token in an invariant Rule resolves to the HOST aggregate's own
// 02 enum value. self02 (the 02-vs-01 self-check) routes a provenance defect to
// 02 instead of blaming 03: when 02 is inconsistent with its own upstream, the
// resolution target itself is unsound, so R4 reports an upstream-defect → 02
// (§9.3) regardless of whether a 03 invariant happens to cite the broken value.
export function checkR4_invariantEnum(g03, g02, self02) {
  const badProv = (self02 && self02.badValues instanceof Set) ? self02.badValues : new Set();
  const self02ok = !self02 || self02.ok;
  let edges = 0; const bad = []; const upstreamBad = [];
  for (const a of g03.aggregates) {
    const hostValues = g02.valuesByAggregate.get(exact(a.name)) || new Set();
    for (const inv of a.invariants) {
      const tokens = enumTokens(inv.rule, g02.allValues);
      for (const t of tokens) {
        edges++;
        if (hostValues.has(t)) {
          // host value, but is its 02 provenance broken? then route → 02.
          if (badProv.has(t)) upstreamBad.push(`'${a.name}'.${inv.id} cites '${t}' (02-provenance broken)`);
          continue;
        }
        bad.push(`'${a.name}'.${inv.id} cites '${t}' (not a value of ${a.name}Status)`);
      }
    }
  }
  // If 02 is inconsistent with 01 at all, surface it as an upstream-defect even
  // when no 03 invariant cites the broken value (the resolution target is unsound).
  if (!self02ok && upstreamBad.length === 0) {
    for (const d of self02.defects) upstreamBad.push(`02 ${d.enum} value '${d.value}' ← '${d.derivedFromEvent}' (absent from 01)`);
  }
  const fail = bad.length > 0 || upstreamBad.length > 0;
  return {
    id: 'R4', rule: 'I5/L4/L6',
    status: fail ? 'fail' : 'pass',
    detail: fail ? `invariant enum token unresolved: ${[...bad, ...upstreamBad].join(', ')}` : '',
    edges,
    upstreamDefect: bad.length === 0 && upstreamBad.length > 0,
    upstreamFile: '02-glossary.md',
    upstreamDetail: upstreamBad.length ? `02 inconsistent with 01: ${upstreamBad.join(', ')}` : '',
  };
}

export function checkR5_policySource(g03, u01) {
  const events = new Set(u01.events01.map(exact));
  let edges = 0; const bad = [];
  for (const p of g03.policies) {
    edges++;
    if (!events.has(exact(p.sourceEvent))) bad.push(`'${p.policy}' source '${p.sourceEvent}'`);
  }
  const ok = bad.length === 0;
  return { id: 'R5', rule: 'X5', status: ok ? 'pass' : 'fail', detail: ok ? '' : `policy Source event not a 01 event: ${bad.join(', ')}`, edges };
}

export function checkR6_policyTarget(g03, u01) {
  const aggs = new Set(u01.aggregates01.map(exact));
  const sub03 = new Set(g03.aggregates.map((a) => exact(a.name)));
  let edges = 0; const bad = [];
  for (const p of g03.policies) {
    edges++;
    if (!aggs.has(exact(p.targetAgg))) bad.push(`'${p.policy}' target '${p.targetAgg}' (not a 01 aggregate)`);
    else if (!sub03.has(exact(p.targetAgg))) bad.push(`'${p.policy}' target '${p.targetAgg}' (no 03 subsection)`);
  }
  const ok = bad.length === 0;
  return { id: 'R6', rule: 'X6', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

// R7 — X7-pre: every state-changing 01 event owned by exactly one skeleton. This
// is a 01 self-consistency precondition; failures route upstream-defect → 01.
export function checkR7_eventOwnership(u01, self01) {
  const stateChanging = u01.events01.length; // every Domain-Events event
  const edges = stateChanging;
  const defects = (self01 && self01.defects) || [];
  const ownerDefects = defects.filter((d) => d.kind !== 'phantom-step' ? true : true); // all 01 self-defects block X7
  const fail = ownerDefects.length > 0;
  return {
    id: 'R7', rule: 'X7',
    status: fail ? 'fail' : 'pass',
    detail: fail ? ownerDefects.map((d) => d.detail).join('; ') : '',
    edges,
    upstreamDefect: fail,
    upstreamFile: '01-event-storming.md',
    upstreamDetail: fail ? ownerDefects.map((d) => d.detail).join('; ') : '',
  };
}

// =====================================================================
// EXACT-VALUE — X1–X5 (simulation.md §4.2).
// =====================================================================

export function checkX1_bijectionCardinality(g03, u01) {
  const a = g03.aggregates.length, b = u01.aggregates01.length;
  const s03 = new Set(g03.aggregates.map((x) => exact(x.name)));
  const s01 = new Set(u01.aggregates01.map(exact));
  const setEq = a === b && [...s01].every((n) => s03.has(n)) && [...s03].every((n) => s01.has(n));
  const ok = a === b && setEq;
  return { id: 'X1', rule: 'S3', status: ok ? 'pass' : 'fail', detail: ok ? '' : `aggregate cardinality/set mismatch: 03=${a} 01=${b}` };
}

export function checkX2_root(g03) {
  const bad = [];
  for (const a of g03.aggregates) {
    if (a.rootCount !== 1) bad.push(`'${a.name}' rootCount=${a.rootCount}`);
    else if (!a.rootGloballyUnique) bad.push(`'${a.name}' identity not globally unique`);
  }
  const ok = bad.length === 0;
  return { id: 'X2', rule: 'A1/A2', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; ') };
}

export function checkX3_invariantIdUnique(g03) {
  const ids = [];
  for (const a of g03.aggregates) for (const inv of a.invariants) ids.push(inv.id);
  const seen = new Set(), dup = [];
  for (const id of ids) { if (seen.has(id)) dup.push(id); seen.add(id); }
  const badShape = ids.filter((id) => !/^INV-[A-Za-z0-9]+-\d+$/.test(id));
  const ok = dup.length === 0 && badShape.length === 0;
  const parts = [];
  if (dup.length) parts.push(`duplicate ID: ${[...new Set(dup)].join(', ')}`);
  if (badShape.length) parts.push(`bad ID shape: ${badShape.join(', ')}`);
  return { id: 'X3', rule: 'I1', status: ok ? 'pass' : 'fail', detail: ok ? '' : parts.join('; ') };
}

// X4 — Mode enum (already L11) AND X4-mech justification edge: a transactional,
// cross-boundary policy with a blocklisted/empty justification FAILS. Returns the
// walked X4-mech edge count for reconciliation.
export function checkX4_modeAndJustification(g03, u01) {
  const bad = [];
  let edges = 0;
  for (const p of g03.policies) {
    // Mode enum (X3) — redundant with L11 but X4 re-asserts it as the exact-value owner.
    if (!MODE_SET.has(key(p.mode))) { bad.push(`'${p.policy}' mode='${p.mode}'`); continue; }
    if (key(p.mode) !== 'transactional') continue;
    // cross-boundary? targetAgg != eventOwner(sourceEvent).
    const owners = u01.eventOwner.get(exact(p.sourceEvent)) || [];
    const owner = owners.length === 1 ? owners[0] : null;
    const crossBoundary = owner == null || exact(p.targetAgg) !== exact(owner);
    if (!crossBoundary) continue; // same-aggregate transactional needs no justification
    edges++; // an X4-mech justification edge is walked
    if (X4_GENERIC_BLOCKLIST.has(key(p.justification))) {
      bad.push(`'${p.policy}' transactional cross-boundary with generic/empty justification ('${p.justification}')`);
    }
  }
  const ok = bad.length === 0;
  return { id: 'X4', rule: 'X3/X4', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

export function checkX5_reconcile(executedChecks, edgesWalked, edgesExpected) {
  const ok = executedChecks > 0 && edgesWalked === edgesExpected;
  return {
    id: 'X5', rule: 'reconciliation',
    status: ok ? 'pass' : 'broken',
    detail: ok ? '' : `reconcile failed: executed=${executedChecks} edgesWalked=${edgesWalked} edgesExpected=${edgesExpected}`,
  };
}

// I3-mech — an invariant Rule under host H names another 03 aggregate as a token.
// Reported as a fail-class check (its own id N6/I3-mech). It is part of the
// resolution-adjacent scan but walks Σ|invariants| edges (counted into recon).
export function checkI3mech(g03, u01) {
  const aggNames = u01.aggregates01.map(exact);
  let edges = 0; const bad = [];
  for (const a of g03.aggregates) {
    const others = new Set(aggNames.filter((n) => n !== exact(a.name)).map((n) => n.toLowerCase()));
    for (const inv of a.invariants) {
      edges++;
      const toks = new Set(plainTokens(inv.rule));
      for (const other of others) {
        // multi-word aggregate names: also phrase-scan.
        const otherKey = other;
        const named = otherKey.includes(' ') ? key(inv.rule).includes(otherKey) : toks.has(otherKey);
        if (named) { bad.push(`'${a.name}'.${inv.id} names another aggregate ('${otherKey}')`); break; }
      }
    }
  }
  const ok = bad.length === 0;
  return { id: 'I3', rule: 'I3-mech', status: ok ? 'pass' : 'fail', detail: ok ? '' : bad.join('; '), edges };
}

// =====================================================================
// Reconciliation: expected edge count (simulation.md §5).
// =====================================================================
export function expectedEdges(g03, u01, g02) {
  const aggregates = g03.aggregates;
  const r1 = u01.aggregates01.length + aggregates.length;            // bijection both directions
  let r2 = 0;                                                        // member→02 Term (term ≠ —)
  for (const a of aggregates) for (const m of a.members) if (exact(m.term02) !== '—' && m.term02 !== '') r2++;
  let r3 = 0;                                                        // references
  for (const a of aggregates) r3 += a.references.length;
  let r4 = 0;                                                        // enum tokens in invariants
  for (const a of aggregates) for (const inv of a.invariants) r4 += enumTokens(inv.rule, g02.allValues).length;
  const r5 = g03.policies.length;                                   // source→01 event
  const r6 = g03.policies.length;                                   // target→01 aggregate
  let x4 = 0;                                                        // transactional & cross-boundary
  for (const p of g03.policies) {
    if (key(p.mode) !== 'transactional') continue;
    const owners = u01.eventOwner.get(exact(p.sourceEvent)) || [];
    const owner = owners.length === 1 ? owners[0] : null;
    if (owner == null || exact(p.targetAgg) !== exact(owner)) x4++;
  }
  let i3 = 0;                                                        // invariants (cross-agg scan)
  for (const a of aggregates) i3 += a.invariants.length;
  const r7 = u01.events01.length;                                  // state-changing events ownership
  return r1 + r2 + r3 + r4 + r5 + r6 + x4 + i3 + r7;
}

// Intake / coverage counts.
export function intakeCounts(g03) {
  let members = 0, invariants = 0, references = 0;
  for (const a of g03.aggregates) { members += a.members.length; invariants += a.invariants.length; references += a.references.length; }
  return { aggregates: g03.aggregates.length, members, invariants, references, policies: g03.policies.length };
}

export function elementsTotal(g03) {
  const c = intakeCounts(g03);
  return c.aggregates + c.members + c.invariants + c.references + c.policies;
}

export {
  REQUIRED_H2_03, BOUNDARY_COLUMNS, INVARIANTS_COLUMNS, REFERENCES_COLUMNS, POLICIES_COLUMNS,
  REQUIRED_H2_01, REQUIRED_H2_02, key, exact, isBlank,
};
