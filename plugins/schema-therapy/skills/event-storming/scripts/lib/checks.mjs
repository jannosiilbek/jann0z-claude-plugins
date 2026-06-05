// checks.mjs — the CLOSED assertion grammar (simulation.md §4).
// Four check classes: lint (L*), resolution (N3/N4/N5/N8/N9), exact-value
// (X1..X5), reason-qualified-negative (proven over fixtures in selftest),
// agent-judged (AJ*, recorded only). This grammar is NEVER extended ad hoc;
// adding a check means editing this file AND simulation.md §4 in a committed
// change, citing a catalog rule.
//
// Every check records { id, class, rule, status } (status ∈ pass|fail|warn|
// info|skip), plus structured findings. A check that THROWS is surfaced by the
// harness as `broken-test` (an indeterminate evaluation).

import {
  isPastTense,
  blocklistHit,
  VAGUE_FILLER,
  TECH_LEAK,
} from './lexicon.mjs';

const KIND_ENUM = new Set([
  'person',
  'role',
  'department',
  'system',
  'automated-process',
]);

const REQUIRED_H2 = [
  'Upstream Fingerprint',
  'Domain Events',
  'Actors',
  'Hotspots',
  'Lifecycle Skeletons',
];

const EVENTS_COLUMNS = ['Event', 'Actor', 'Trigger', 'Notes', 'Deliverable'];
const ACTORS_COLUMNS = ['Actor', 'Kind', 'Responsibility'];
const HOTSPOTS_COLUMNS = ['Hotspot', 'Question', 'Blocks'];

// Upstream 00 (impact-map) pinned shapes (simulation.md §3.3).
const BIZ_ACTORS_COLUMNS = ['Actor', 'Description'];
// 00's Impacts/Deliverables foreign-key columns carry an "(exact string)" hint
// in their header (simulation.md §3.3). The shape match tolerates that
// parenthetical: the leading token (`Business Actor` / `Impact`) is the pin.
const IMPACTS_COLUMNS = ['Impact', 'Business Actor (exact string)'];
const DELIVERABLES_COLUMNS = ['Deliverable', 'Impact (exact string)'];
const REQUIRED_H2_00 = ['Goal', 'Business Actors', 'Impacts', 'Deliverables'];

// Human/organizational actor kinds resolve to 00 Business Actors (H1); system
// kinds are 01-owned and exempt.
const HUMAN_KINDS = new Set(['person', 'role', 'department']);

// The em-dash sentinel for "this event realizes no 00 deliverable".
const DASH = '—';

const norm = (s) => (s == null ? '' : String(s).trim());
const isBlank = (s) => {
  const t = norm(s);
  return t === '' || t === '-';
};
// Case/space-insensitive identity for cross-table name resolution.
const key = (s) => norm(s).toLowerCase().replace(/\s+/g, ' ');
// EXACT-string identity (case- and whitespace-sensitive) for the 00 seam
// resolution (H1/H2/H3/H4/N15 require exact-string-match per the catalog).
const exact = (s) => norm(s);
// Is a Deliverable cell the "no 00 deliverable" sentinel? Accept the em-dash and
// the ASCII hyphen-minus as equivalent (simulation.md §2 sentinel definition).
// An EMPTY cell is NOT a sentinel — it is an unfilled cell (caught by L14), so it
// is deliberately NOT accepted here.
const isDash = (s) => {
  const t = norm(s);
  return t === DASH || t === '-';
};

function columnsMatch(table, expected) {
  if (!table) return false;
  if (table.columns.length !== expected.length) return false;
  return expected.every((c, i) => key(table.columns[i]) === key(c));
}

// ---------------------------------------------------------------------------
// MALFORMED-class lint (L1–L6, L12-structure). These determine whether the
// artifact can be anchored at all. They populate `malformed` reasons.
// ---------------------------------------------------------------------------

// Build the derived scenario graph (simulation.md §3.1). Throws ParseError-ish
// shape only via the malformed lints; here we just read what exists.
export function deriveGraph(doc) {
  const sec = (t) => doc.sections.get(t) || null;

  const eventsTable = sec('Domain Events') ? doc.sections.get('Domain Events').tables[0] : null;
  const actorsTable = sec('Actors') ? doc.sections.get('Actors').tables[0] : null;
  const hotspotsTable = sec('Hotspots') ? doc.sections.get('Hotspots').tables[0] : null;

  const toObj = (table, cols) => {
    if (!table) return [];
    return table.rows.map((r) => {
      const o = {};
      cols.forEach((c, i) => (o[c.toLowerCase()] = norm(r[i])));
      return o;
    });
  };

  const events = toObj(eventsTable, EVENTS_COLUMNS);
  const actors = toObj(actorsTable, ACTORS_COLUMNS);
  const hotspotsAll = toObj(hotspotsTable, HOTSPOTS_COLUMNS);

  // Hotspots excluding the explicit "None identified" sentinel.
  const hotspots = hotspotsAll.filter(
    (h) => key(h.hotspot) !== 'none identified'
  );

  const lifeSec = doc.sections.get('Lifecycle Skeletons') || null;
  const skeletons = [];
  if (lifeSec) {
    for (const title of lifeSec.subOrder) {
      const sub = lifeSec.subsections.get(title);
      const steps = [];
      for (const list of sub.orderedLists) {
        for (const it of list.items) {
          // strip any inline marker like " (pivotal)" — keep the event name as
          // the leading text up to a parenthetical/em-dash annotation.
          let t = it.text;
          t = t.replace(/\s*\((?:pivotal|terminal|creation|statechart[^)]*)\)\s*$/i, '');
          steps.push(t.trim());
        }
      }
      skeletons.push({ aggregate: title, steps });
    }
  }

  return {
    eventsTable,
    actorsTable,
    hotspotsTable,
    events,
    actors,
    hotspots,
    hotspotsAll,
    skeletons,
    aggregateNames: skeletons.map((s) => s.aggregate),
  };
}

// ===========================================================================
// UPSTREAM 00 (impact-map) — the parsed seam authority (simulation.md §3.3).
// The harness resolves 01's human/organizational actors and event Deliverable
// cells against 00's owned name sets (Business Actors, Deliverables) and the
// Deliverable→Impact bridge. Copied from the sibling glossary two-input pattern
// (never imported), per the isolation directive.
// ===========================================================================

// Derive 00's owned name sets from the parsed 00 document. Read-only; pairs with
// `parseUpstreamShape00` which decides parseability.
export function deriveUpstream00(doc00) {
  const sec = (t) => doc00.sections.get(t) || null;
  const bizTable = sec('Business Actors') ? sec('Business Actors').tables[0] : null;
  const impactsTable = sec('Impacts') ? sec('Impacts').tables[0] : null;
  const delivTable = sec('Deliverables') ? sec('Deliverables').tables[0] : null;

  const businessActors = bizTable
    ? bizTable.rows.map((r) => exact(r[0])).filter((s) => s !== '')
    : [];
  const impacts = impactsTable
    ? impactsTable.rows
        .map((r) => ({ impact: exact(r[0]), businessActor: exact(r[1]) }))
        .filter((o) => o.impact !== '')
    : [];
  const deliverables = delivTable
    ? delivTable.rows
        .map((r) => ({ deliverable: exact(r[0]), impact: exact(r[1]) }))
        .filter((o) => o.deliverable !== '')
    : [];

  return {
    bizTable,
    impactsTable,
    delivTable,
    businessActors,
    impacts,
    deliverables,
  };
}

// Is the 00 upstream PARSEABLE against the pinned 00 format (§3.3)? A required
// heading or a required table with the wrong column shape ⇒ unparseable ⇒
// broken-test (the seam loses authority). Returns { ok, detail }.
export function parseUpstreamShape00(doc00) {
  const missing = REQUIRED_H2_00.filter((h) => !doc00.sections.has(h));
  if (missing.length) {
    return { ok: false, detail: `upstream 00 missing required section(s): ${missing.join(', ')}` };
  }
  const u = deriveUpstream00(doc00);
  if (!columnsMatch(u.bizTable, BIZ_ACTORS_COLUMNS)) {
    return { ok: false, detail: 'upstream 00 Business Actors table column shape is wrong (expected `Actor | Description`)' };
  }
  if (!columnsMatch(u.impactsTable, IMPACTS_COLUMNS)) {
    return { ok: false, detail: 'upstream 00 Impacts table column shape is wrong (expected `Impact | Business Actor`)' };
  }
  if (!columnsMatch(u.delivTable, DELIVERABLES_COLUMNS)) {
    return { ok: false, detail: 'upstream 00 Deliverables table column shape is wrong (expected `Deliverable | Impact`)' };
  }
  return { ok: true, detail: '' };
}

// ---- Malformed lints (return { ok, rule, detail }) -------------------------

export function lintL1_headings(doc) {
  const missing = REQUIRED_H2.filter((h) => !doc.sections.has(h));
  return {
    id: 'L1',
    rule: 'A1',
    ok: missing.length === 0,
    malformed: true,
    detail: missing.length ? `missing required section(s): ${missing.join(', ')}` : '',
  };
}

export function lintL2_fingerprint(doc) {
  const sec = doc.sections.get('Upstream Fingerprint');
  let ok = false;
  let detail = '`## Upstream Fingerprint` section absent';
  if (sec) {
    const body = sec.lines.join('\n') + '\n' + (doc.fingerprintBlock || '');
    // Plugin-canonical fingerprint token: `sha256:` + exactly 64 hex chars.
    const hasHash = /sha256:[0-9a-fA-F]{64}\b/.test(body);
    const hasDate = /\d{4}-\d{2}-\d{2}/.test(body);
    // A source label/title: any non-empty, non-heading text line OR a sha-style
    // `<name>@sha256:` token.
    const hasLabel =
      /@sha256:/.test(body) ||
      sec.lines.some((l) => l.trim() !== '' && !/^[-|]/.test(l.trim()));
    ok = hasLabel && (hasHash || hasDate);
    if (!ok) {
      detail = `fingerprint present=${!!sec} label=${hasLabel} hash=${hasHash} date=${hasDate}`;
    }
  }
  return { id: 'L2', rule: 'A2', ok, malformed: true, detail: ok ? '' : detail };
}

export function lintL3_eventsCols(g) {
  const ok = columnsMatch(g.eventsTable, EVENTS_COLUMNS);
  return {
    id: 'L3',
    rule: 'A3',
    ok,
    malformed: true,
    detail: ok ? '' : `Domain Events columns must be exactly: ${EVENTS_COLUMNS.join(' | ')} (got: ${g.eventsTable ? g.eventsTable.columns.join(' | ') : 'no table'})`,
  };
}

export function lintL4_actorsCols(g) {
  const ok = columnsMatch(g.actorsTable, ACTORS_COLUMNS);
  return {
    id: 'L4',
    rule: 'A4',
    ok,
    malformed: true,
    detail: ok ? '' : `Actors columns must be exactly: ${ACTORS_COLUMNS.join(' | ')} (got: ${g.actorsTable ? g.actorsTable.columns.join(' | ') : 'no table'})`,
  };
}

export function lintL5_hotspotsCols(g) {
  const ok = columnsMatch(g.hotspotsTable, HOTSPOTS_COLUMNS);
  return {
    id: 'L5',
    rule: 'A5',
    ok,
    malformed: true,
    detail: ok ? '' : `Hotspots columns must be exactly: ${HOTSPOTS_COLUMNS.join(' | ')} (got: ${g.hotspotsTable ? g.hotspotsTable.columns.join(' | ') : 'no table'})`,
  };
}

export function lintL6_skeletons(doc, g) {
  const lifeSec = doc.sections.get('Lifecycle Skeletons');
  let ok = false;
  let detail = '`## Lifecycle Skeletons` section absent';
  if (lifeSec) {
    if (g.skeletons.length === 0) {
      detail = 'no `### <Aggregate>` subsection found';
    } else {
      const bad = g.skeletons.filter((s) => s.steps.length === 0);
      ok = bad.length === 0;
      if (!ok) detail = `aggregate(s) with no ordered list: ${bad.map((b) => b.aggregate).join(', ')}`;
    }
  }
  return { id: 'L6', rule: 'A6/E1', ok, malformed: true, detail: ok ? '' : detail };
}

// ---- Fail-class lints (artifact parsed but content wrong) ------------------

export function lintL7_kindEnum(g) {
  const bad = g.actors.filter((a) => !KIND_ENUM.has(key(a.kind)));
  return {
    id: 'L7',
    rule: 'A4',
    severity: 'error',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `non-enum Kind: ${bad.map((a) => `${a.actor}:${a.kind}`).join(', ')}` : '',
  };
}

export function lintL8_nonEmpty(g) {
  const eventsOk = g.events.length >= 1;
  const actorsOk = g.actors.length >= 1;
  const ok = eventsOk && actorsOk;
  return {
    id: 'L8',
    rule: 'A8',
    severity: 'error',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `Domain Events rows=${g.events.length}, Actors rows=${g.actors.length} (each needs ≥1)`,
  };
}

export function lintL9_hotspots(g) {
  const present = g.hotspotsTable && g.hotspotsTable.rows.length >= 1;
  const sentinel =
    g.hotspotsAll.length === 1 &&
    key(g.hotspotsAll[0].hotspot) === 'none identified';
  const ok = present && (g.hotspots.length >= 1 || sentinel);
  return {
    id: 'L9',
    rule: 'A8/D4',
    severity: 'info',
    status: ok ? 'pass' : 'info',
    detail: ok ? '' : 'Hotspots table absent or has neither data rows nor a single `None identified` row',
  };
}

export function lintL10_termNote(doc) {
  const lifeSec = doc.sections.get('Lifecycle Skeletons');
  const haystacks = [];
  if (lifeSec) haystacks.push(lifeSec.lines.join('\n'));
  // also scan whole doc for a footnote
  for (const s of doc.sections.values()) haystacks.push(s.lines.join('\n'));
  const text = haystacks.join('\n').toLowerCase();
  const ok = text.includes('constraint') && text.includes('aggregate');
  return {
    id: 'L10',
    rule: 'A7',
    severity: 'warn',
    status: ok ? 'pass' : 'warn',
    detail: ok ? '' : 'no "aggregate" ↔ "Constraint" terminology-mapping note found',
  };
}

export function lintL11_pastTense(g) {
  const bad = g.events.filter((e) => !isPastTense(e.event));
  return {
    id: 'L11',
    rule: 'B1/E2',
    severity: 'error',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `non-past-tense event(s): ${bad.map((e) => e.event).join(', ')}` : '',
  };
}

export function lintL12_vague(g) {
  const hits = [];
  for (const e of g.events) {
    const h = blocklistHit(e.event, VAGUE_FILLER);
    if (h) hits.push(`event '${e.event}' (${h})`);
  }
  for (const a of g.actors) {
    const h = blocklistHit(a.actor, VAGUE_FILLER);
    if (h) hits.push(`actor '${a.actor}' (${h})`);
  }
  for (const s of g.skeletons) {
    const h = blocklistHit(s.aggregate, VAGUE_FILLER);
    if (h) hits.push(`aggregate '${s.aggregate}' (${h})`);
  }
  return {
    id: 'L12',
    rule: 'G1',
    severity: 'warn',
    status: hits.length === 0 ? 'pass' : 'warn',
    detail: hits.join('; '),
  };
}

export function lintL13_techLeak(g) {
  const hits = [];
  for (const e of g.events) {
    const h = blocklistHit(e.event, TECH_LEAK);
    if (h) hits.push(`event '${e.event}' (${h})`);
  }
  for (const a of g.actors) {
    const h = blocklistHit(a.actor, TECH_LEAK);
    if (h) hits.push(`actor '${a.actor}' (${h})`);
  }
  for (const s of g.skeletons) {
    const h = blocklistHit(s.aggregate, TECH_LEAK);
    if (h) hits.push(`aggregate '${s.aggregate}' (${h})`);
  }
  return {
    id: 'L13',
    rule: 'G3',
    severity: 'warn',
    status: hits.length === 0 ? 'pass' : 'warn',
    detail: hits.join('; '),
  };
}

// L14 — every Domain-Events row has a Deliverable cell present (5th column
// populated; value MAY be the `—` sentinel). Two distinct defects (simulation.md
// §2; catalog A3):
//   - a row supplying fewer than 5 cells (a genuinely absent 5th column) is a
//     SHAPE defect under the 5-column pin ⇒ `malformed`;
//   - a row whose 5th cell is PRESENT-but-empty is an unfilled deliverable. An
//     empty cell is NOT the `—` sentinel ⇒ `fail`, naming the event row.
export function lintL14_deliverableCell(g) {
  const missingCol = []; // < 5 cells (absent column) ⇒ malformed
  const emptyCell = []; // 5 cells but blank deliverable ⇒ fail
  if (g.eventsTable) {
    g.eventsTable.rows.forEach((r, i) => {
      if (r.length < EVENTS_COLUMNS.length) {
        missingCol.push(`row ${i + 1} (${r[0] || '?'})`);
      } else if (norm(r[EVENTS_COLUMNS.length - 1]) === '') {
        emptyCell.push(`row ${i + 1} (${r[0] || '?'})`);
      }
    });
  }
  const isMalformed = missingCol.length > 0;
  const ok = missingCol.length === 0 && emptyCell.length === 0;
  let detail = '';
  if (isMalformed) {
    detail = `Domain-Events row(s) missing the Deliverable cell (5-column pin): ${missingCol.join(', ')}`;
  } else if (emptyCell.length) {
    detail = `Domain-Events row(s) with an empty Deliverable cell (an empty cell is not the \`—\` sentinel; fill it or mark \`—\`): ${emptyCell.join(', ')}`;
  }
  return {
    id: 'L14',
    rule: 'A3',
    ok,
    // Only an absent 5th COLUMN makes the artifact unparseable (malformed). An
    // empty-but-present cell is a content `fail`, not a shape malformation.
    malformed: isMalformed,
    status: ok ? 'pass' : 'fail',
    detail,
  };
}

// L15 — pervasive `—` Deliverable cells (scope-creep smell). Advisory only;
// never blocks (simulation.md §2; catalog H5). Threshold: > 60% of events `—`.
export function lintL15_dashSmell(g) {
  const total = g.events.length;
  const dashes = g.events.filter((e) => isDash(e.deliverable)).length;
  const frac = total === 0 ? 0 : dashes / total;
  const smell = total > 0 && frac > 0.6;
  return {
    id: 'L15',
    rule: 'H5',
    severity: 'info',
    status: smell ? 'info' : 'pass',
    detail: smell
      ? `${dashes}/${total} events carry Deliverable = — (scope-creep smell; advisory)`
      : '',
  };
}

// ---------------------------------------------------------------------------
// Resolution checks (N3, N4, N5, N8, N9) — referenced element exists in owner.
// Each returns { id, class:'resolution', rule, status, detail, edges }.
// `edges` is the count of resolution edges this check walked (coverage §5).
// ---------------------------------------------------------------------------

export function checkN3_actorResolves(g) {
  const known = new Set(g.actors.map((a) => key(a.actor)));
  let edges = 0;
  const bad = [];
  for (const e of g.events) {
    if (isBlank(e.actor)) continue;
    edges++;
    if (!known.has(key(e.actor))) bad.push(`${e.event} → actor '${e.actor}'`);
  }
  return {
    id: 'N3',
    rule: 'C3',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `unknown actor reference(s): ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkN4_skeletonStepResolves(g) {
  const known = new Set(g.events.map((e) => key(e.event)));
  let edges = 0;
  const bad = [];
  for (const sk of g.skeletons) {
    for (const step of sk.steps) {
      edges++;
      if (!known.has(key(step))) bad.push(`${sk.aggregate}: '${step}'`);
    }
  }
  return {
    id: 'N4',
    rule: 'E6',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `ghost skeleton step(s) not in Domain Events: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkN5_blocksResolves(g) {
  const known = new Set([
    ...g.events.map((e) => key(e.event)),
    ...g.aggregateNames.map((a) => key(a)),
  ]);
  let edges = 0;
  const bad = [];
  for (const h of g.hotspots) {
    if (isBlank(h.blocks)) continue;
    edges++;
    if (!known.has(key(h.blocks))) bad.push(`hotspot '${h.hotspot}' blocks '${h.blocks}'`);
  }
  return {
    id: 'N5',
    rule: 'D3',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `dangling Blocks reference(s): ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkN8_eventMembership(g) {
  const inSkeleton = new Set();
  for (const sk of g.skeletons) for (const s of sk.steps) inSkeleton.add(key(s));
  let edges = 0;
  const bad = [];
  for (const e of g.events) {
    edges++;
    if (inSkeleton.has(key(e.event))) continue;
    // allow explicit omission justification in Notes
    if (/omit|exclud|not in (a )?lifecycle|justif/i.test(e.notes || '')) continue;
    bad.push(e.event);
  }
  return {
    id: 'N8',
    rule: 'B5',
    severity: 'warn', // B5 is ⚠️ in the catalog
    status: bad.length === 0 ? 'pass' : 'warn',
    detail: bad.length ? `event(s) in no skeleton and not justified in Notes: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkN9_triggerResolves(g) {
  const known = new Set(g.events.map((e) => key(e.event)));
  let edges = 0;
  const bad = [];
  for (const e of g.events) {
    if (isBlank(e.trigger)) continue;
    // A trigger that names a KNOWN event must resolve and must not self-trigger.
    if (known.has(key(e.trigger))) {
      edges++;
      if (key(e.trigger) === key(e.event)) bad.push(`${e.event} triggers itself`);
    }
    // command/action free-text triggers are not edges (not event references).
  }
  return {
    id: 'N9',
    rule: 'F1',
    severity: 'warn', // F1 is ⚠️
    status: bad.length === 0 ? 'pass' : 'warn',
    detail: bad.length ? bad.join(', ') : '',
    edges,
  };
}

// ---------------------------------------------------------------------------
// SEAM resolution checks (N13/N14/N15) — resolve 01 against the upstream 00
// owned name sets by EXACT string (case- and whitespace-sensitive).
// ---------------------------------------------------------------------------

// N13 (catalog H1) — every Actors row with Kind ∈ {person, role, department}
// resolves by exact string into 00's Business-Actor set; {system,
// automated-process} are 01-owned and exempt. One edge per human/org actor.
export function checkN13_humanActorResolves00(g, u00) {
  const known = new Set(u00.businessActors.map((a) => exact(a)));
  let edges = 0;
  const bad = [];
  for (const a of g.actors) {
    if (!HUMAN_KINDS.has(key(a.kind))) continue; // systems exempt
    edges++;
    if (!known.has(exact(a.actor))) {
      bad.push(`'${a.actor}' (kind ${a.kind})`);
    }
  }
  return {
    id: 'N13',
    rule: 'H1',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length
      ? `human/organizational actor(s) not matching any 00 Business Actor: ${bad.join(', ')}`
      : '',
    edges,
  };
}

// N14 (catalog H2) — every Domain-Events Deliverable cell ≠ `—` resolves by
// exact string into 00's Deliverable set. One edge per non-`—` cell.
export function checkN14_deliverableResolves00(g, u00) {
  const known = new Set(u00.deliverables.map((d) => exact(d.deliverable)));
  let edges = 0;
  const bad = [];
  for (const e of g.events) {
    if (isDash(e.deliverable)) continue;
    edges++;
    if (!known.has(exact(e.deliverable))) {
      bad.push(`event '${e.event}' → deliverable '${e.deliverable}'`);
    }
  }
  return {
    id: 'N14',
    rule: 'H2',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length
      ? `Deliverable cell(s) not matching any 00 deliverable: ${bad.join(', ')}`
      : '',
    edges,
  };
}

// N15 (catalog H-seam) — 00 SELF-CONSISTENCY. Every 00 Impacts.Business Actor
// resolves into 00's Business-Actor set AND every 00 Deliverables.Impact
// resolves into 00's Impacts set. A miss is an `upstream-defect` finding routed
// to `00-impact-map.md` (01 status `fail`, NOT broken-test). One edge per 00
// foreign reference. Mirrors the glossary upstream-defect routing pattern.
export function checkN15_upstream00SelfConsistent(u00) {
  const knownActors = new Set(u00.businessActors.map((a) => exact(a)));
  const knownImpacts = new Set(u00.impacts.map((i) => exact(i.impact)));
  let edges = 0;
  const bad = [];
  for (const imp of u00.impacts) {
    edges++;
    if (!knownActors.has(exact(imp.businessActor))) {
      bad.push(`Impacts row '${imp.impact}' names ghost Business Actor '${imp.businessActor}'`);
    }
  }
  for (const d of u00.deliverables) {
    edges++;
    if (!knownImpacts.has(exact(d.impact))) {
      bad.push(`Deliverables row '${d.deliverable}' names ghost Impact '${d.impact}'`);
    }
  }
  return {
    id: 'N15',
    rule: 'H-seam',
    status: bad.length === 0 ? 'pass' : 'fail',
    upstreamDefect: bad.length > 0,
    upstreamDetail: bad.length ? bad.join('; ') : '',
    detail: bad.length ? bad.join('; ') : '',
    edges,
  };
}

// ---------------------------------------------------------------------------
// Exact-value checks (X1..X5). X1/X5 reconcile counters; X2/X3/X4 are content.
// ---------------------------------------------------------------------------

export function checkX1_eventCount(g, reconciledAgainst) {
  const ok = g.events.length === reconciledAgainst;
  return {
    id: 'X1',
    rule: 'reconciliation',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `eventCount=${g.events.length} but reconciled against ${reconciledAgainst}`,
  };
}

export function checkX2_noDuplicateEvents(g) {
  const seen = new Set();
  const dups = [];
  for (const e of g.events) {
    const k = key(e.event);
    if (seen.has(k)) dups.push(e.event);
    seen.add(k);
  }
  return {
    id: 'X2',
    rule: 'B3',
    severity: 'warn', // B3 is ⚠️; but duplicate-event fixture must FAIL.
    // Per simulation.md §5 mapping, X2 is the positive/negative for "No
    // duplicate events" and duplicate-event.md must FAIL → treat as fail.
    status: dups.length === 0 ? 'pass' : 'fail',
    detail: dups.length ? `duplicate event row(s): ${[...new Set(dups)].join(', ')}` : '',
  };
}

export function checkX3_lifecycleBounds(g) {
  const bad = [];
  for (const sk of g.skeletons) {
    if (sk.steps.length < 2 || key(sk.steps[0]) === key(sk.steps[sk.steps.length - 1])) {
      bad.push(sk.aggregate);
    }
  }
  return {
    id: 'X3',
    rule: 'E3',
    severity: 'warn', // E3 is ⚠️
    status: bad.length === 0 ? 'pass' : 'warn',
    detail: bad.length ? `unbounded lifecycle(s) (need ≥2 steps, first≠last): ${bad.join(', ')}` : '',
  };
}

export function checkX4_singleOwnership(g) {
  const counts = new Map();
  for (const sk of g.skeletons) {
    const local = new Set();
    for (const s of sk.steps) {
      const k = key(s);
      if (local.has(k)) continue; // duplicate within one skeleton counts once
      local.add(k);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const bad = [];
  for (const [k, c] of counts) if (c > 1) bad.push(k);
  return {
    id: 'X4',
    rule: 'E5',
    severity: 'warn', // E5 is ⚠️; but dup-skeleton-event fixture must FAIL.
    // Per §5 mapping X4/N6 prove "single aggregate ownership" and
    // dup-skeleton-event.md must FAIL → treat as fail.
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `event(s) owned by >1 aggregate: ${bad.join(', ')}` : '',
  };
}

// X6 (catalog H3) — Deliverable coverage: every 00 deliverable string appears
// in ≥1 Domain-Events Deliverable cell. A 00 deliverable covered by zero cells
// is an unmodelled promise ⇒ fail. One edge per 00 deliverable (coverage).
export function checkX6_deliverableCoverage(g, u00) {
  const cells = new Set(
    g.events.filter((e) => !isDash(e.deliverable)).map((e) => exact(e.deliverable))
  );
  let edges = 0;
  const bad = [];
  for (const d of u00.deliverables) {
    edges++;
    if (!cells.has(exact(d.deliverable))) bad.push(d.deliverable);
  }
  return {
    id: 'X6',
    rule: 'H3',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `00 deliverable(s) realized by no event (unmodelled promise): ${bad.join(', ')}` : '',
    edges,
  };
}

// X7 (catalog H4) — Aggregate-serves: every skeleton has ≥1 step whose event's
// Deliverable cell ≠ `—` and resolves to a 00 deliverable. A whole-aggregate
// orphan fails; a single `—` event does not. One edge per aggregate (serves).
export function checkX7_aggregateServes(g, u00) {
  const known = new Set(u00.deliverables.map((d) => exact(d.deliverable)));
  const deliverableOf = new Map();
  for (const e of g.events) deliverableOf.set(key(e.event), e.deliverable);
  let edges = 0;
  const bad = [];
  for (const sk of g.skeletons) {
    edges++;
    const serves = sk.steps.some((st) => {
      const d = deliverableOf.get(key(st));
      return d != null && !isDash(d) && known.has(exact(d));
    });
    if (!serves) bad.push(sk.aggregate);
  }
  return {
    id: 'X7',
    rule: 'H4',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `aggregate(s) serving no 00 deliverable/impact (scope creep): ${bad.join(', ')}` : '',
    edges,
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

// Expected edge count from the intake graph PLUS the seam-edge families
// (simulation.md §3.1 edge classes 1–11 / §5). Domain edges:
//   N3: non-empty event.actor / N4: every skeleton step / N5: every non-"-"
//   hotspot.blocks / N8: every event (membership) / N9: every trigger naming a
//   known event.
// Seam edges (resolve against 00; if 00 is unparseable they cannot be walked at
// all ⇒ broken-test, never a silent skip):
//   N13: one per human/organizational actor / N14: one per non-`—` deliverable
//   cell / X6: one per 00 deliverable (coverage) / X7: one per aggregate
//   (serves) / N15: one per 00 Impacts/Deliverables foreign reference.
export function expectedEdges(g, u00) {
  const known = new Set(g.events.map((e) => key(e.event)));
  let n3 = 0;
  for (const e of g.events) if (!isBlank(e.actor)) n3++;
  let n4 = 0;
  for (const sk of g.skeletons) n4 += sk.steps.length;
  let n5 = 0;
  for (const h of g.hotspots) if (!isBlank(h.blocks)) n5++;
  const n8 = g.events.length;
  let n9 = 0;
  for (const e of g.events) if (!isBlank(e.trigger) && known.has(key(e.trigger))) n9++;
  const domainEdges = n3 + n4 + n5 + n8 + n9;

  // --- seam edge families ---
  let n13 = 0;
  for (const a of g.actors) if (HUMAN_KINDS.has(key(a.kind))) n13++;
  let n14 = 0;
  for (const e of g.events) if (!isDash(e.deliverable)) n14++;
  const x6 = u00.deliverables.length; // one coverage edge per 00 deliverable
  const x7 = g.skeletons.length; // one serves edge per aggregate
  const n15 = u00.impacts.length + u00.deliverables.length; // 00 self-ref edges
  const seamEdges = n13 + n14 + x6 + x7 + n15;

  return domainEdges + seamEdges;
}

export {
  KIND_ENUM,
  REQUIRED_H2,
  EVENTS_COLUMNS,
  ACTORS_COLUMNS,
  HOTSPOTS_COLUMNS,
  BIZ_ACTORS_COLUMNS,
  IMPACTS_COLUMNS,
  DELIVERABLES_COLUMNS,
  REQUIRED_H2_00,
  HUMAN_KINDS,
  key,
  exact,
  isBlank,
  isDash,
};
