// checks.mjs — the CLOSED assertion grammar for the impact-map oracle
// (simulation.md §4). Four check classes:
//   - lint            (L1–L13)
//   - resolution      (N1, N2, N3, N5)
//   - exact-value     (X1–X5)
//   - reason-qualified-negative (proven over fixtures by selftest; same IDs)
//   - agent-judged    (AJ1–AJ5, recorded only — never feed reconciliation)
// This grammar is NEVER extended ad hoc; adding a check means editing this file
// AND simulation.md §4 in a committed change, and every check cites a catalog
// rule. Copied/re-pinned from the sibling event-storming checks.mjs.

import {
  SOFTWARE_NOUN,
  VAGUE_FILLER,
  TECH_LEAK,
  blocklistHit,
  hasMeasurement,
} from './lexicon.mjs';

// Pinned A-theme order (A1) and column shapes (A3/A4/A5).
export const REQUIRED_H2 = [
  'Upstream Fingerprint',
  'Goal',
  'Business Actors',
  'Impacts',
  'Deliverables',
];

export const ACTORS_COLUMNS = ['Actor', 'Description'];
export const IMPACTS_COLUMNS = ['Impact', 'Business Actor'];
export const DELIVERABLES_COLUMNS = ['Deliverable', 'Impact'];

const norm = (s) => (s == null ? '' : String(s).trim());
const isBlank = (s) => {
  const t = norm(s);
  return t === '' || t === '-';
};
// Case/whitespace-insensitive identity for cross-table resolution (G3 pairs are
// detected by: matches under `key` but NOT byte-identically).
const key = (s) => norm(s).toLowerCase().replace(/\s+/g, ' ');

function columnsMatch(table, expected) {
  if (!table) return false;
  if (table.columns.length !== expected.length) return false;
  // The pinned headings carry a parenthetical note (e.g.
  // `Business Actor (exact string)`); match on the leading head word(s),
  // ignoring a trailing `(...)` qualifier.
  const headWord = (c) => key(c).replace(/\s*\(.*\)\s*$/, '').trim();
  return expected.every((c, i) => headWord(table.columns[i]) === key(c));
}

// ---------------------------------------------------------------------------
// Derived scenario graph (simulation.md §3.1): goal + actors/impacts/deliverables.
// ---------------------------------------------------------------------------
export function deriveGraph(doc) {
  const sec = (t) => doc.sections.get(t) || null;

  const actorsTable = sec('Business Actors') ? sec('Business Actors').tables[0] : null;
  const impactsTable = sec('Impacts') ? sec('Impacts').tables[0] : null;
  const deliverablesTable = sec('Deliverables') ? sec('Deliverables').tables[0] : null;

  const rows = (table, names) => {
    if (!table) return [];
    return table.rows.map((r) => {
      const o = {};
      names.forEach((n, i) => (o[n] = norm(r[i])));
      return o;
    });
  };

  const actors = rows(actorsTable, ['actor', 'description']);
  const impacts = rows(impactsTable, ['impact', 'actor']);
  const deliverables = rows(deliverablesTable, ['deliverable', 'impact']);

  // The single Goal statement: the one paragraph body of `## Goal`.
  const goalSec = sec('Goal');
  let goal = '';
  let goalParagraphCount = 0;
  let goalBulletCount = 0;
  if (goalSec) {
    goalBulletCount = goalSec.bulletItems.length;
    const paras = goalSec.paragraphs.filter((p) => p && p.trim() !== '');
    goalParagraphCount = paras.length;
    goal = paras.length ? paras[0] : '';
  }

  return {
    actorsTable,
    impactsTable,
    deliverablesTable,
    actors,
    impacts,
    deliverables,
    goal,
    goalParagraphCount,
    goalBulletCount,
    goalSection: goalSec,
    // Raw fingerprint comment block (read-only; surfaced so the amendment-mode
    // diff can flag fingerprint churn separately from content changes). Never
    // recomputed (§1/§8) — only compared string-wise against a baseline's block.
    fingerprintBlock: doc.fingerprintBlock || '',
  };
}

// ---------------------------------------------------------------------------
// MALFORMED-class lints (L1–L6). Determine whether the artifact can be anchored.
// Return { id, rule, ok, malformed:true, detail }.
// ---------------------------------------------------------------------------

export function lintL1_headings(doc) {
  const missing = REQUIRED_H2.filter((h) => !doc.sections.has(h));
  // Order: the present required headings must appear in the pinned relative order.
  const presentInOrder = doc.order.filter((t) => REQUIRED_H2.includes(t));
  const expectedOrder = REQUIRED_H2.filter((t) => doc.sections.has(t));
  const orderOk =
    presentInOrder.length === expectedOrder.length &&
    presentInOrder.every((t, i) => t === expectedOrder[i]);
  const ok = missing.length === 0 && orderOk;
  let detail = '';
  if (missing.length) detail = `missing required section(s): ${missing.join(', ')}`;
  else if (!orderOk) detail = `required sections out of pinned order: got [${presentInOrder.join(' → ')}], want [${expectedOrder.join(' → ')}]`;
  return { id: 'L1', rule: 'A1', ok, malformed: true, detail };
}

export function lintL2_fingerprintBlock(doc) {
  // A2: a `<!-- fingerprints:` line, ≥1 `<file>@sha256:<hex>` line, a closing `-->`.
  const sec = doc.sections.get('Upstream Fingerprint');
  let ok = false;
  let detail = '`## Upstream Fingerprint` section absent';
  if (sec) {
    const block = doc.fingerprintBlock || '';
    const opensRight = /<!--\s*fingerprints:/.test(block);
    const closes = /-->/.test(block);
    const hasLine = (doc.fingerprintLines || []).length >= 1;
    ok = opensRight && closes && hasLine;
    if (!ok) {
      detail = `fingerprint block shape invalid: opens=${opensRight} closes=${closes} sha256-lines=${(doc.fingerprintLines || []).length} (need \`<!-- fingerprints:\`, ≥1 \`<file>@sha256:<hex>\`, \`-->\`)`;
    }
  }
  return { id: 'L2', rule: 'A2', ok, malformed: true, detail: ok ? '' : detail };
}

export function lintL3_actorsCols(g) {
  const ok = columnsMatch(g.actorsTable, ACTORS_COLUMNS);
  return {
    id: 'L3',
    rule: 'A3',
    ok,
    malformed: true,
    detail: ok ? '' : `Business Actors columns must be exactly: ${ACTORS_COLUMNS.join(' | ')} (got: ${g.actorsTable ? g.actorsTable.columns.join(' | ') : 'no table'})`,
  };
}

export function lintL4_impactsCols(g) {
  const ok = columnsMatch(g.impactsTable, IMPACTS_COLUMNS);
  return {
    id: 'L4',
    rule: 'A4',
    ok,
    malformed: true,
    detail: ok ? '' : `Impacts columns must be exactly: Impact | Business Actor (got: ${g.impactsTable ? g.impactsTable.columns.join(' | ') : 'no table'})`,
  };
}

export function lintL5_deliverablesCols(g) {
  const ok = columnsMatch(g.deliverablesTable, DELIVERABLES_COLUMNS);
  return {
    id: 'L5',
    rule: 'A5',
    ok,
    malformed: true,
    detail: ok ? '' : `Deliverables columns must be exactly: Deliverable | Impact (got: ${g.deliverablesTable ? g.deliverablesTable.columns.join(' | ') : 'no table'})`,
  };
}

export function lintL6_singleGoal(g) {
  // A6: exactly one goal statement — no list, no second paragraph.
  let ok = true;
  let detail = '';
  if (!g.goalSection) {
    ok = false;
    detail = '`## Goal` section absent';
  } else if (g.goalBulletCount > 0) {
    ok = false;
    detail = `Goal body is a list (${g.goalBulletCount} bullet item(s)); it must be exactly one statement`;
  } else if (g.goalParagraphCount !== 1) {
    ok = false;
    detail = `Goal body has ${g.goalParagraphCount} paragraph(s); it must be exactly one statement`;
  }
  return { id: 'L6', rule: 'A6', ok, malformed: true, detail };
}

// ---------------------------------------------------------------------------
// FAIL-class lints (artifact parsed but content wrong).
// ---------------------------------------------------------------------------

export function lintL7_fingerprintHex(doc) {
  // A8: each fingerprint hash is exactly [0-9a-f]{64}.
  const bad = [];
  for (const f of doc.fingerprintLines || []) {
    if (!/^[0-9a-f]{64}$/.test(f.hash)) bad.push(`${f.file}@sha256:${f.hash}`);
  }
  const ok = (doc.fingerprintLines || []).length >= 1 && bad.length === 0;
  return {
    id: 'L7',
    rule: 'A8',
    severity: 'error',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `fingerprint hash not 64 lowercase hex: ${bad.length ? bad.join(', ') : 'no fingerprint line'}`,
  };
}

export function lintL8_nonEmpty(g) {
  const a = g.actors.length >= 1;
  const i = g.impacts.length >= 1;
  const d = g.deliverables.length >= 1;
  const ok = a && i && d;
  return {
    id: 'L8',
    rule: 'A7',
    severity: 'error',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `empty required table(s): actors=${g.actors.length}, impacts=${g.impacts.length}, deliverables=${g.deliverables.length} (each needs ≥1)`,
  };
}

export function lintL9_featureImpact(g) {
  // D1: no Impact cell carries a blocklisted software noun. (B2 mechanical
  // subset over the GOAL also scans for these — handled in L9b folded here.)
  const hits = [];
  for (const im of g.impacts) {
    const h = blocklistHit(im.impact, SOFTWARE_NOUN);
    if (h) hits.push(`impact '${im.impact}' (${h})`);
  }
  // B2 mechanical subset: goal naming a deliverable/feature via a software noun.
  const gh = blocklistHit(g.goal, SOFTWARE_NOUN);
  if (gh) hits.push(`goal (${gh})`);
  return {
    id: 'L9',
    rule: 'D1',
    severity: 'error',
    status: hits.length === 0 ? 'pass' : 'fail',
    detail: hits.length ? `feature-shaped (software noun): ${hits.join('; ')}` : '',
  };
}

export function lintL10_vague(g) {
  const hits = [];
  if (g.goal) {
    const h = blocklistHit(g.goal, VAGUE_FILLER);
    if (h) hits.push(`goal (${h})`);
  }
  for (const a of g.actors) {
    const h = blocklistHit(a.actor, VAGUE_FILLER);
    if (h) hits.push(`actor '${a.actor}' (${h})`);
  }
  for (const im of g.impacts) {
    const h = blocklistHit(im.impact, VAGUE_FILLER);
    if (h) hits.push(`impact '${im.impact}' (${h})`);
  }
  for (const d of g.deliverables) {
    const h = blocklistHit(d.deliverable, VAGUE_FILLER);
    if (h) hits.push(`deliverable '${d.deliverable}' (${h})`);
  }
  return {
    id: 'L10',
    rule: 'G1',
    severity: 'warn',
    status: hits.length === 0 ? 'pass' : 'warn',
    detail: hits.join('; '),
  };
}

export function lintL11_measurableGoal(g) {
  const ok = hasMeasurement(g.goal);
  return {
    id: 'L11',
    rule: 'B1',
    severity: 'error',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `goal carries no measurement token (number/%/currency/number-word): '${g.goal}'`,
  };
}

export function lintL12_techLeak(g) {
  const hits = [];
  if (g.goal) {
    const h = blocklistHit(g.goal, TECH_LEAK);
    if (h) hits.push(`goal (${h})`);
  }
  for (const a of g.actors) {
    const h = blocklistHit(a.actor, TECH_LEAK);
    if (h) hits.push(`actor '${a.actor}' (${h})`);
  }
  return {
    id: 'L12',
    rule: 'G4',
    severity: 'warn',
    status: hits.length === 0 ? 'pass' : 'warn',
    detail: hits.join('; '),
  };
}

export function lintL13_conflation(g) {
  // G5: no string appears as both an Impact name and a Deliverable name.
  const impactKeys = new Set(g.impacts.map((i) => key(i.impact)));
  const hits = [];
  for (const d of g.deliverables) {
    if (impactKeys.has(key(d.deliverable))) hits.push(d.deliverable);
  }
  return {
    id: 'L13',
    rule: 'G5',
    severity: 'warn',
    status: hits.length === 0 ? 'pass' : 'warn',
    detail: hits.length ? `string filed as both Impact and Deliverable: ${[...new Set(hits)].join(', ')}` : '',
  };
}

// ---------------------------------------------------------------------------
// Resolution checks (N1, N2, N3, N5). Each returns
// { id, class:'resolution', rule, status, detail, edges }.
// `edges` is the resolution/stability edge count this check walked (coverage §5).
// ---------------------------------------------------------------------------

export function checkN1_actorResolves(g) {
  // F1: every Impacts-table Business Actor cell resolves (exact string) to an
  // actor row. Resolution is by exact string; case/whitespace drift is N3's job.
  const known = new Set(g.actors.map((a) => a.actor)); // exact strings
  let edges = 0;
  const bad = [];
  for (const im of g.impacts) {
    if (isBlank(im.actor)) {
      bad.push(`impact '${im.impact}' → (empty actor)`);
      continue;
    }
    edges++;
    if (!known.has(im.actor)) bad.push(`impact '${im.impact}' → actor '${im.actor}'`);
  }
  return {
    id: 'N1',
    rule: 'F1',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `unknown actor reference(s): ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkN2_impactResolves(g) {
  // F2: every Deliverables-table Impact cell resolves (exact string) to an
  // impact row.
  const known = new Set(g.impacts.map((i) => i.impact));
  let edges = 0;
  const bad = [];
  for (const d of g.deliverables) {
    if (isBlank(d.impact)) {
      bad.push(`deliverable '${d.deliverable}' → (empty impact)`);
      continue;
    }
    edges++;
    if (!known.has(d.impact)) bad.push(`deliverable '${d.deliverable}' → impact '${d.impact}'`);
  }
  return {
    id: 'N2',
    rule: 'F2',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `dangling deliverable(s): ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkN3_stability(g) {
  // G3: every reference matching an owner row case/whitespace-insensitively must
  // match BYTE-IDENTICALLY. Walks one edge per such matched pair.
  const actorByKey = new Map();
  for (const a of g.actors) if (!actorByKey.has(key(a.actor))) actorByKey.set(key(a.actor), a.actor);
  const impactByKey = new Map();
  for (const im of g.impacts) if (!impactByKey.has(key(im.impact))) impactByKey.set(key(im.impact), im.impact);

  let edges = 0;
  const bad = [];
  for (const im of g.impacts) {
    if (isBlank(im.actor)) continue;
    const owner = actorByKey.get(key(im.actor));
    if (owner !== undefined) {
      edges++;
      if (owner !== im.actor) bad.push(`impact '${im.impact}' references '${im.actor}' but actor is spelled '${owner}'`);
    }
  }
  for (const d of g.deliverables) {
    if (isBlank(d.impact)) continue;
    const owner = impactByKey.get(key(d.impact));
    if (owner !== undefined) {
      edges++;
      if (owner !== d.impact) bad.push(`deliverable '${d.deliverable}' references '${d.impact}' but impact is spelled '${owner}'`);
    }
  }
  return {
    id: 'N3',
    rule: 'G3',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `case/whitespace drift: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkN5_transitiveChain(g) {
  // F5: each deliverable resolves deliverable → impact → actor → goal. A break
  // anywhere in its ancestry fails.
  const impactByName = new Map();
  for (const im of g.impacts) impactByName.set(im.impact, im);
  const actorNames = new Set(g.actors.map((a) => a.actor));
  const goalOk = norm(g.goal) !== '';

  let edges = 0;
  const bad = [];
  for (const d of g.deliverables) {
    edges++;
    const im = impactByName.get(d.impact);
    if (!im) {
      bad.push(`deliverable '${d.deliverable}': impact '${d.impact}' not in Impacts`);
      continue;
    }
    if (isBlank(im.actor) || !actorNames.has(im.actor)) {
      bad.push(`deliverable '${d.deliverable}': impact '${im.impact}' → actor '${im.actor}' unresolved`);
      continue;
    }
    if (!goalOk) {
      bad.push(`deliverable '${d.deliverable}': no goal at chain root`);
    }
  }
  return {
    id: 'N5',
    rule: 'F5',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `broken transitive chain: ${bad.join(', ')}` : '',
    edges,
  };
}

// ---------------------------------------------------------------------------
// Exact-value checks (X1–X5).
// ---------------------------------------------------------------------------

export function checkX1_counts(g, reconciledActors, reconciledImpacts, reconciledDeliverables) {
  const a = g.actors.length === reconciledActors;
  const i = g.impacts.length === reconciledImpacts;
  const d = g.deliverables.length === reconciledDeliverables;
  const ok = a && i && d;
  return {
    id: 'X1',
    rule: 'reconciliation',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `intake mismatch: actors ${g.actors.length}/${reconciledActors}, impacts ${g.impacts.length}/${reconciledImpacts}, deliverables ${g.deliverables.length}/${reconciledDeliverables}`,
  };
}

export function checkX2_uniqueActors(g) {
  // G2: distinct actor-name count === Business Actors row count.
  const seen = new Set();
  const dups = [];
  for (const a of g.actors) {
    const k = key(a.actor);
    if (seen.has(k)) dups.push(a.actor);
    seen.add(k);
  }
  return {
    id: 'X2',
    rule: 'G2',
    severity: 'error',
    status: dups.length === 0 ? 'pass' : 'fail',
    detail: dups.length ? `duplicate actor name(s): ${[...new Set(dups)].join(', ')}` : '',
  };
}

export function checkX3_uniqueImpactsDeliverables(g) {
  // G2: distinct impact-name count === Impacts row count; same for deliverables.
  const dupsIn = (arr, field) => {
    const seen = new Set();
    const dups = [];
    for (const r of arr) {
      const k = key(r[field]);
      if (seen.has(k)) dups.push(r[field]);
      seen.add(k);
    }
    return [...new Set(dups)];
  };
  const di = dupsIn(g.impacts, 'impact');
  const dd = dupsIn(g.deliverables, 'deliverable');
  const ok = di.length === 0 && dd.length === 0;
  const parts = [];
  if (di.length) parts.push(`duplicate impact(s): ${di.join(', ')}`);
  if (dd.length) parts.push(`duplicate deliverable(s): ${dd.join(', ')}`);
  return {
    id: 'X3',
    rule: 'G2',
    severity: 'error',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : parts.join('; '),
  };
}

export function checkX4_singleGoal(g) {
  // A6: exactly one non-empty Goal statement (parser yielded one paragraph).
  const ok = g.goalBulletCount === 0 && g.goalParagraphCount === 1 && norm(g.goal) !== '';
  return {
    id: 'X4',
    rule: 'A6',
    severity: 'error',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `goal is not a single statement (paragraphs=${g.goalParagraphCount}, bullets=${g.goalBulletCount})`,
  };
}

// ---------------------------------------------------------------------------
// Amendment-mode diff (simulation.md §"Amendment-mode diff", flag-conditional).
// Element-level diff keyed by NAME per table, against a previously-generated
// artifact graph (the baseline). Content changes (added/removed/changed) are
// separated from fingerprint churn (EXPECTED on any amendment) so the diff
// never counts a fingerprint bump as a content change. Output ordering is
// pinned (tables in PINNED order, rows sorted by name) for byte-determinism.
//
// `cells` carries the row's full content per table:
//   actors       → { actor, description }
//   impacts      → { impact, actor }
//   deliverables → { deliverable, impact }
// The NAME key per table is the first column (actor / impact / deliverable).
// ---------------------------------------------------------------------------

// Pinned table order + per-table name field. Single source of truth for the
// diff walk so ordering and keying never drift.
const DIFF_TABLES = [
  { table: 'actors', nameField: 'actor', cellFields: ['actor', 'description'] },
  { table: 'impacts', nameField: 'impact', cellFields: ['impact', 'actor'] },
  { table: 'deliverables', nameField: 'deliverable', cellFields: ['deliverable', 'impact'] },
];

function cellsOf(row, cellFields) {
  const o = {};
  for (const f of cellFields) o[f] = norm(row[f]);
  return o;
}

function cellsEqual(a, b, cellFields) {
  return cellFields.every((f) => norm(a[f]) === norm(b[f]));
}

// Compute the element-level diff between an artifact graph and a baseline graph.
// Both args are the output of deriveGraph(). Returns the `baseline` summary block
// (stable ordering). Pure + deterministic: no clock, no randomness, no IO.
export function computeBaselineDiff(artifactGraph, baselineGraph) {
  const added = [];
  const removed = [];
  const changed = [];

  for (const { table, nameField, cellFields } of DIFF_TABLES) {
    const artRows = artifactGraph[table];
    const baseRows = baselineGraph[table];
    // Key by name (case/whitespace-insensitive, matching cross-table resolution
    // identity used elsewhere). First occurrence wins (duplicate names are an
    // X2/X3 concern, not the diff's).
    const artByKey = new Map();
    for (const r of artRows) if (!artByKey.has(key(r[nameField]))) artByKey.set(key(r[nameField]), r);
    const baseByKey = new Map();
    for (const r of baseRows) if (!baseByKey.has(key(r[nameField]))) baseByKey.set(key(r[nameField]), r);

    // added: present in artifact, absent in baseline.
    for (const r of artRows) {
      if (!baseByKey.has(key(r[nameField]))) {
        added.push({ table, name: norm(r[nameField]), cells: cellsOf(r, cellFields) });
      }
    }
    // removed: present in baseline, absent in artifact.
    for (const r of baseRows) {
      if (!artByKey.has(key(r[nameField]))) {
        removed.push({ table, name: norm(r[nameField]), cells: cellsOf(r, cellFields) });
      }
    }
    // changed: same name, different cell content.
    for (const r of artRows) {
      const b = baseByKey.get(key(r[nameField]));
      if (b && !cellsEqual(r, b, cellFields)) {
        changed.push({
          table,
          name: norm(r[nameField]),
          before: cellsOf(b, cellFields),
          after: cellsOf(r, cellFields),
        });
      }
    }
  }

  // Stable ordering: tables already walked in pinned order; sort each set by
  // (table-pinned-order, name) so output is byte-identical across runs.
  const tableRank = (t) => DIFF_TABLES.findIndex((d) => d.table === t);
  const byTableThenName = (a, b) =>
    tableRank(a.table) - tableRank(b.table) || a.name.localeCompare(b.name, 'en');
  added.sort(byTableThenName);
  removed.sort(byTableThenName);
  changed.sort(byTableThenName);

  return {
    added,
    removed,
    changed,
    goalChanged: norm(artifactGraph.goal) !== norm(baselineGraph.goal),
    fingerprintChanged: norm(artifactGraph.fingerprintBlock) !== norm(baselineGraph.fingerprintBlock),
  };
}

// XD1 (exactValue, [PLAN]-amend): flag-conditional reconciliation of the diff.
// Asserts the diff was computed and reconciles — each side's per-table element
// counts match its own parse, and added/removed/changed are DISJOINT by
// (table,name). XD1 does NOT judge whether the diff is justified (delta
// traceability is the professor's job); a diff with entries still passes
// mechanically. Returns { id, rule, status, detail }.
export function checkXD1_amendReconcile(diff, artifactGraph, baselineGraph) {
  const problems = [];

  if (!diff) {
    return {
      id: 'XD1',
      rule: '[PLAN]-amend',
      status: 'broken',
      detail: 'amend mode invoked but no baseline diff was computed',
    };
  }

  // Per-table count reconciliation: for each table, every artifact row is
  // accounted for exactly once as added OR changed OR unchanged-present; every
  // baseline row as removed OR changed OR unchanged-present. We verify the
  // arithmetic: |art| = added + changed + (matched-unchanged);
  //             |base| = removed + changed + (matched-unchanged).
  for (const { table, nameField } of DIFF_TABLES) {
    const artKeys = new Set(artifactGraph[table].map((r) => key(r[nameField])));
    const baseKeys = new Set(baselineGraph[table].map((r) => key(r[nameField])));
    const addedT = diff.added.filter((e) => e.table === table).length;
    const removedT = diff.removed.filter((e) => e.table === table).length;
    const changedT = diff.changed.filter((e) => e.table === table).length;
    // matched = names present in both (by key).
    let matched = 0;
    for (const k of artKeys) if (baseKeys.has(k)) matched++;
    if (addedT !== artKeys.size - matched) {
      problems.push(`${table}: added ${addedT} != |artifact|-matched ${artKeys.size - matched}`);
    }
    if (removedT !== baseKeys.size - matched) {
      problems.push(`${table}: removed ${removedT} != |baseline|-matched ${baseKeys.size - matched}`);
    }
    if (changedT > matched) {
      problems.push(`${table}: changed ${changedT} exceeds matched ${matched}`);
    }
  }

  // Disjointness by (table,name): no element appears in more than one of
  // added/removed/changed.
  const seen = new Map();
  const mark = (bucket, e) => {
    const k = `${e.table} ${key(e.name)}`;
    if (seen.has(k)) problems.push(`(${e.table},${e.name}) appears in both ${seen.get(k)} and ${bucket}`);
    else seen.set(k, bucket);
  };
  for (const e of diff.added) mark('added', e);
  for (const e of diff.removed) mark('removed', e);
  for (const e of diff.changed) mark('changed', e);

  return {
    id: 'XD1',
    rule: '[PLAN]-amend',
    status: problems.length === 0 ? 'pass' : 'broken',
    detail: problems.length === 0 ? '' : `diff reconciliation failed: ${problems.join('; ')}`,
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

// Expected edge count from the intake graph (simulation.md §5):
//   |impacts|       (each impact → its actor, F1/N1)
// + |deliverables|  (each deliverable → its impact, F2/N2)
// + |deliverables|  (each deliverable's transitive chain, F5/N5)
// + G3 stability pairs (references that case/whitespace-match an owner row)
export function expectedEdges(g) {
  let n1 = 0;
  for (const im of g.impacts) if (!isBlank(im.actor)) n1++;
  let n2 = 0;
  for (const d of g.deliverables) if (!isBlank(d.impact)) n2++;
  const n5 = g.deliverables.length; // every deliverable walks its chain
  // G3 stability pairs: references that match an owner key-insensitively.
  const actorKeys = new Set(g.actors.map((a) => key(a.actor)));
  const impactKeys = new Set(g.impacts.map((i) => key(i.impact)));
  let n3 = 0;
  for (const im of g.impacts) if (!isBlank(im.actor) && actorKeys.has(key(im.actor))) n3++;
  for (const d of g.deliverables) if (!isBlank(d.impact) && impactKeys.has(key(d.impact))) n3++;
  return n1 + n2 + n5 + n3;
}

export { key, isBlank, norm };
