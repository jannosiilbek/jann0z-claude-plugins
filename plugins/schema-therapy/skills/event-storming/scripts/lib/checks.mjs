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

const EVENTS_COLUMNS = ['Event', 'Actor', 'Trigger', 'Notes'];
const ACTORS_COLUMNS = ['Actor', 'Kind', 'Responsibility'];
const HOTSPOTS_COLUMNS = ['Hotspot', 'Question', 'Blocks'];

const norm = (s) => (s == null ? '' : String(s).trim());
const isBlank = (s) => {
  const t = norm(s);
  return t === '' || t === '-';
};
// Case/space-insensitive identity for cross-table name resolution.
const key = (s) => norm(s).toLowerCase().replace(/\s+/g, ' ');

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
    const hasHash = /[0-9a-f]{7,}/.test(body);
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

// Expected edge count from the intake graph (simulation.md §3.1 / §5):
//   N3 edges: non-empty event.actor
//   N4 edges: every skeleton step
//   N5 edges: every non-"-" hotspot.blocks
//   N8 edges: every event (membership)
//   N9 edges: every trigger that names a known event
export function expectedEdges(g) {
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
  return n3 + n4 + n5 + n8 + n9;
}

export { KIND_ENUM, REQUIRED_H2, EVENTS_COLUMNS, ACTORS_COLUMNS, HOTSPOTS_COLUMNS, key, isBlank };
