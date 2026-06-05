// checks.mjs — the CLOSED assertion grammar for the personas oracle
// (simulation.md §4). Check classes:
//   - lint            (L1–L14: A-theme + mechanical B/F-theme rules)
//   - resolution      (R1–R6: cross-document exact-string resolution + 00 self-check)
//   - exact-value     (X1–X5)
//   - reason-qualified-negative (proven over fixtures by selftest; same IDs)
//   - agent-judged    (AJ1–AJ5, recorded only — never feed reconciliation)
//   - trigger classifier (§3.3; recorded in `triggers[]`, never blocking)
// This grammar is NEVER extended ad hoc; adding a check means editing this file
// AND simulation.md §4 in a committed change, and every check cites a catalog
// rule. The 00/01 upstream readers are copied/re-pinned from the sibling
// impact-map + glossary checks (reuse over invention, copied never imported).

import {
  SOFTWARE_NOUN,
  VAGUE_FILLER,
  blocklistHit,
  isPascalCase,
  snake,
  verbatimWindowHit,
} from './lexicon.mjs';

const norm = (s) => (s == null ? '' : String(s).trim());
const isBlank = (s) => {
  const t = norm(s);
  return t === '' || t === '-';
};
// Case/whitespace-insensitive identity, used only for the D3 near-miss residue
// and snake-collision detection — NOT for the primary R-class exact resolution.
const key = (s) => norm(s).toLowerCase().replace(/\s+/g, ' ');

// Match a pinned column header, tolerating a trailing `(...)` qualifier note.
function columnsMatch(table, expected) {
  if (!table) return false;
  if (table.columns.length !== expected.length) return false;
  const headWord = (c) => key(c).replace(/\s*\(.*\)\s*$/, '').trim();
  return expected.every((c, i) => headWord(table.columns[i]) === key(c));
}

// ===========================================================================
// PINNED SHAPES
// ===========================================================================
export const REQUIRED_H2 = ['Upstream Fingerprints', 'Personas'];
export const JOBS_COLUMNS = ['Job', 'Trigger', 'Outcome'];

// 00 (impact-map) pinned tables.
export const ACTORS00_COLUMNS = ['Actor', 'Description'];
export const IMPACTS00_COLUMNS = ['Impact', 'Business Actor'];
// 01 (event-storming) pinned tables — Domain Events is the 5-column shape.
export const EVENTS01_COLUMNS = ['Event', 'Actor', 'Trigger', 'Notes', 'Deliverable'];
export const ACTORS01_COLUMNS = ['Actor', 'Kind', 'Responsibility'];

// ---------------------------------------------------------------------------
// 00 upstream reader (copied/re-pinned from the impact-map 00-shape reader).
// Returns { ok, detail, businessActors[], impacts[] ({impact,businessActor}),
//           descriptions[] (Description cells, for L14 word-window) }.
// ---------------------------------------------------------------------------
export function deriveUpstream00(doc00) {
  const sec = (t) => doc00.sections.get(t) || null;
  const actorsSec = sec('Business Actors');
  const impactsSec = sec('Impacts');
  const actorsTable = actorsSec ? actorsSec.tables[0] : null;
  const impactsTable = impactsSec ? impactsSec.tables[0] : null;

  let ok = true;
  let detail = '';
  if (!columnsMatch(actorsTable, ACTORS00_COLUMNS)) {
    ok = false;
    detail = '00 `## Business Actors` table absent or wrong columns (need Actor | Description)';
  } else if (!columnsMatch(impactsTable, IMPACTS00_COLUMNS)) {
    ok = false;
    detail = '00 `## Impacts` table absent or wrong columns (need Impact | Business Actor)';
  }

  const businessActors = actorsTable ? actorsTable.rows.map((r) => norm(r[0])) : [];
  const descriptions = actorsTable ? actorsTable.rows.map((r) => norm(r[1])) : [];
  const impacts = impactsTable
    ? impactsTable.rows.map((r) => ({ impact: norm(r[0]), businessActor: norm(r[1]) }))
    : [];

  return { ok, detail, businessActors, impacts, descriptions };
}

// ---------------------------------------------------------------------------
// 01 upstream reader (copied/re-pinned from the glossary/event-storming reader).
// Domain Events is pinned to the 5-column shape Event|Actor|Trigger|Notes|Deliverable.
// Returns { ok, detail, events[] (Event cells), actors[] (Actor cells),
//           responsibilities[] (01 Actors Responsibility cells, for L14) }.
// ---------------------------------------------------------------------------
export function deriveUpstream01(doc01) {
  const sec = (t) => doc01.sections.get(t) || null;
  const eventsSec = sec('Domain Events');
  const actorsSec = sec('Actors');
  const eventsTable = eventsSec ? eventsSec.tables[0] : null;
  const actorsTable = actorsSec ? actorsSec.tables[0] : null;

  let ok = true;
  let detail = '';
  if (!columnsMatch(eventsTable, EVENTS01_COLUMNS)) {
    ok = false;
    detail =
      '01 `## Domain Events` table absent or wrong columns (need Event | Actor | Trigger | Notes | Deliverable)';
  }

  const events = eventsTable ? eventsTable.rows.map((r) => norm(r[0])) : [];
  // 01 Actors are read ONLY as a membership set for R5 (no-invented-party);
  // 07 never audits whether 01 actors trace into 00 (the event-storming skill
  // owns that H1 check — simulation.md §9).
  const actors = actorsTable && columnsMatch(actorsTable, ACTORS01_COLUMNS)
    ? actorsTable.rows.map((r) => norm(r[0]))
    : [];
  const responsibilities = actorsTable && columnsMatch(actorsTable, ACTORS01_COLUMNS)
    ? actorsTable.rows.map((r) => norm(r[2]))
    : [];

  return { ok, detail, events, actors, responsibilities };
}

// R6 — 00 self-consistency precondition (simulation.md §9 case 2): every 00
// Impact's Business Actor cell resolves into 00's own Business Actors. A failure
// is a 00 DEFECT (routed upstream-defect → 00-impact-map.md), not a 07 defect.
export function upstream00SelfCheck(u00) {
  const known = new Set(u00.businessActors); // exact strings
  const defects = [];
  for (const im of u00.impacts) {
    if (isBlank(im.businessActor)) {
      defects.push({ impact: im.impact, ghost: '(empty)' });
    } else if (!known.has(im.businessActor)) {
      defects.push({ impact: im.impact, ghost: im.businessActor });
    }
  }
  return { ok: defects.length === 0, defects };
}

// ===========================================================================
// 07 graph derivation (simulation.md §3.1).
// personas[] = { name, businessActor, businessActorCount, fieldOrderOk,
//                hasActorLine, hasGoalsList, hasJobsTable, jobsColsOk,
//                goals[] ({text, impactTokens[]}), jobs[] ({job, trigger, outcome}) }
// ===========================================================================
export function deriveGraph(doc07) {
  const personasSec = doc07.sections.get('Personas') || null;
  const personas = [];

  if (personasSec) {
    for (const name of personasSec.subOrder) {
      const block = personasSec.subsections.get(name);
      personas.push(derivePersona(name, block));
    }
  }

  return { personasSec, personas };
}

function derivePersona(name, block) {
  // Locate the three pinned fields by source-line position.
  const actorLabel = block.labels.find((l) => l.label.toLowerCase() === 'business actor');
  const goalsLabel = block.labels.find((l) => l.label.toLowerCase() === 'goals');
  const jobsLabel = block.labels.find((l) => l.label.toLowerCase() === 'jobs-to-be-done');

  const hasActorLine = !!actorLabel;
  const hasGoalsLabel = !!goalsLabel;
  const hasJobsLabel = !!jobsLabel;

  // Goals list: the first list whose startLine is after the Goals label and
  // before the Jobs label (so a list inside the jobs region is not mis-read).
  let goalsList = null;
  if (goalsLabel) {
    const upper = jobsLabel ? jobsLabel.line : Infinity;
    goalsList = block.lists.find((l) => l.startLine > goalsLabel.line && l.startLine < upper) || null;
  }
  // Jobs table: the first table whose startLine is after the Jobs label.
  let jobsTable = null;
  if (jobsLabel) {
    jobsTable = block.tables.find((t) => t.startLine > jobsLabel.line) || null;
  }
  // A5 (L4) is satisfied by the three LABELS present & ordered AND a jobs TABLE
  // element existing after the jobs label (a genuinely missing table cannot be
  // anchored → malformed). An empty goals list (label present, zero list items)
  // or empty jobs table (header present, zero data rows) is a populated-but-
  // incomplete defect → L8/E2, NOT malformed. So `hasGoalsList` tracks only the
  // label (emptiness deferred to L8); `hasJobsTable` requires the table element.
  const hasGoalsList = hasGoalsLabel;
  const hasJobsTable = hasJobsLabel && !!jobsTable;

  // Field order: actor-line < goals-label < jobs-label (all present, in order).
  let fieldOrderOk = false;
  if (actorLabel && goalsLabel && jobsLabel) {
    fieldOrderOk = actorLabel.line < goalsLabel.line && goalsLabel.line < jobsLabel.line;
  }

  const businessActor = actorLabel ? actorLabel.value : '';
  // B3-mech (L6): a business-actor line names exactly one value (no `/`,
  // ` and `, comma-list, or second token).
  let businessActorCount = 0;
  if (businessActor) {
    if (/\s\/\s|\/|,|\sand\s/.test(businessActor)) businessActorCount = 2;
    else businessActorCount = 1;
  }

  // Goals: each list item's text, with `[impact: …]` tokens extracted.
  const goals = goalsList
    ? goalsList.items.map((it) => {
        const tokens = [];
        const re = /\[impact:\s*([^\]]*?)\s*\]/g;
        let m;
        while ((m = re.exec(it.text)) !== null) tokens.push(m[1].trim());
        // Goal text = the substring before the first `[impact: …]` token.
        const cut = it.text.indexOf('[impact:');
        const text = (cut >= 0 ? it.text.slice(0, cut) : it.text).trim();
        return { text, raw: it.text, impactTokens: tokens };
      })
    : [];

  // Jobs: rows of the jobs table (3 columns Job|Trigger|Outcome).
  const jobsColsOk = jobsTable ? columnsMatch(jobsTable, JOBS_COLUMNS) : false;
  const jobs = jobsTable
    ? jobsTable.rows.map((r) => ({
        job: norm(r[0]),
        trigger: norm(r[1]),
        outcome: norm(r[2]),
      }))
    : [];

  return {
    name,
    businessActor,
    businessActorCount,
    hasActorLine,
    hasGoalsList,
    hasJobsTable,
    jobsColsOk,
    fieldOrderOk,
    goals,
    jobs,
  };
}

// ===========================================================================
// MALFORMED-class lints (L1, L3, L4, L5). Determine whether 07 can be anchored.
// Return { id, rule, ok, malformed:true, detail }.
// ===========================================================================

export function lintL1_headings(doc07) {
  const missing = REQUIRED_H2.filter((h) => !doc07.sections.has(h));
  const presentInOrder = doc07.order.filter((t) => REQUIRED_H2.includes(t));
  const expectedOrder = REQUIRED_H2.filter((t) => doc07.sections.has(t));
  const orderOk =
    presentInOrder.length === expectedOrder.length &&
    presentInOrder.every((t, i) => t === expectedOrder[i]);
  const ok = missing.length === 0 && orderOk;
  let detail = '';
  if (missing.length) detail = `missing required section(s): ${missing.join(', ')}`;
  else if (!orderOk)
    detail = `required sections out of pinned order: got [${presentInOrder.join(' → ')}], want [${expectedOrder.join(' → ')}]`;
  return { id: 'L1', rule: 'A1', ok, malformed: true, detail };
}

export function lintL3_personaBlocks(g) {
  const ok = !!g.personasSec && g.personas.length >= 1;
  return {
    id: 'L3',
    rule: 'A4',
    ok,
    malformed: true,
    detail: ok ? '' : '`## Personas` contains no `### <PersonaName>` subsection',
  };
}

export function lintL4_blockFields(g) {
  const bad = [];
  for (const p of g.personas) {
    if (!p.hasActorLine || !p.hasGoalsList || !p.hasJobsTable) {
      const miss = [];
      if (!p.hasActorLine) miss.push('**Business actor:**');
      if (!p.hasGoalsList) miss.push('**Goals:** list');
      if (!p.hasJobsTable) miss.push('**Jobs-to-be-done:** table');
      bad.push(`'${p.name}' missing ${miss.join(', ')}`);
    } else if (!p.fieldOrderOk) {
      bad.push(`'${p.name}' fields out of pinned order (need Business actor → Goals → Jobs-to-be-done)`);
    }
  }
  const ok = bad.length === 0;
  return {
    id: 'L4',
    rule: 'A5',
    ok,
    malformed: true,
    detail: ok ? '' : bad.join('; '),
  };
}

export function lintL5_jobsColumns(g) {
  const bad = [];
  for (const p of g.personas) {
    if (p.hasJobsTable && !p.jobsColsOk) bad.push(`'${p.name}'`);
  }
  const ok = bad.length === 0;
  return {
    id: 'L5',
    rule: 'A7',
    ok,
    malformed: true,
    detail: ok ? '' : `jobs table columns must be exactly Job | Trigger | Outcome (offending persona(s): ${bad.join(', ')})`,
  };
}

// ===========================================================================
// FAIL / warn-class lints (07 parsed but content wrong).
// Return { id, rule, status:'pass'|'fail'|'warn'|'info', detail }.
// ===========================================================================

export function lintL2_fingerprints(doc07) {
  // A2/A3: the `## Upstream Fingerprints` section records BOTH a
  // `00-impact-map.md@sha256:<64-hex>` AND a `01-event-storming.md@sha256:<64-hex>`
  // line; neither hash a placeholder.
  const sec = doc07.sections.get('Upstream Fingerprints');
  if (!sec) {
    return { id: 'L2', rule: 'A2', status: 'fail', detail: '`## Upstream Fingerprints` section absent' };
  }
  // Gather fingerprint lines from the section body (`<file>@sha256:<hash>`).
  const found = [];
  for (const l of sec.lines) {
    const m = /(\S+)@sha256:([0-9a-fA-F]{64})/.exec(l);
    if (m) found.push({ file: m[1].trim(), hash: m[2].trim() });
  }
  // A placeholder digest (all zeros, all `x`, or a literal `<hex>`) is NOT a real
  // captured hash even though `0000…` passes the hex-shape test (simulation.md L2).
  const isPlaceholder = (h) => /^0{64}$/.test(h) || /^x{64}$/i.test(h) || /[<>]/.test(h);
  const has = (needle) =>
    found.find(
      (f) => f.file.includes(needle) && /^[0-9a-f]{64}$/.test(f.hash) && !isPlaceholder(f.hash)
    );
  const has00 = has('00-impact-map.md');
  const has01 = has('01-event-storming.md');
  const ok = !!has00 && !!has01;
  let detail = '';
  if (!ok) {
    const present00 = found.some((f) => f.file.includes('00-impact-map.md'));
    const present01 = found.some((f) => f.file.includes('01-event-storming.md'));
    const parts = [];
    if (!present00) parts.push('00-impact-map.md fingerprint absent');
    else if (!has00) parts.push('00-impact-map.md hash not 64 lowercase hex (placeholder?)');
    if (!present01) parts.push('01-event-storming.md fingerprint absent');
    else if (!has01) parts.push('01-event-storming.md hash not 64 lowercase hex (placeholder?)');
    detail = parts.join('; ');
  }
  return { id: 'L2', rule: 'A2', status: ok ? 'pass' : 'fail', detail };
}

export function lintL6_singleActor(g) {
  // B3 mechanical subset: a `**Business actor:**` line names exactly one value.
  const bad = [];
  for (const p of g.personas) {
    if (p.businessActorCount > 1) bad.push(`'${p.name}' → '${p.businessActor}'`);
  }
  const ok = bad.length === 0;
  return {
    id: 'L6',
    rule: 'B3',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `persona maps to >1 business actor: ${bad.join(', ')}`,
  };
}

export function lintL7_goalTokens(g) {
  // A6: every goal list entry carries ≥1 well-formed `[impact: <text>]` token.
  const bad = [];
  for (const p of g.personas) {
    for (const goal of p.goals) {
      if (goal.impactTokens.length === 0) bad.push(`'${p.name}': "${goal.text || goal.raw}"`);
    }
  }
  const ok = bad.length === 0;
  return {
    id: 'L7',
    rule: 'A6',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `goal(s) without an [impact: …] token: ${bad.join('; ')}`,
  };
}

export function lintL8_nonEmpty(g) {
  // A8/E2: no persona has zero goals or zero job rows.
  const bad = [];
  for (const p of g.personas) {
    if (p.goals.length === 0) bad.push(`'${p.name}' has zero goals`);
    if (p.jobs.length === 0) bad.push(`'${p.name}' has zero jobs`);
  }
  const ok = bad.length === 0;
  return {
    id: 'L8',
    rule: 'E2',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : bad.join('; '),
  };
}

export function lintL9_featureGoal(g) {
  // B1: no goal text (before its first [impact:] token) carries a software noun.
  const hits = [];
  for (const p of g.personas) {
    for (const goal of p.goals) {
      const h = blocklistHit(goal.text, SOFTWARE_NOUN);
      if (h) hits.push(`'${p.name}': "${goal.text}" (${h})`);
    }
  }
  const ok = hits.length === 0;
  return {
    id: 'L9',
    rule: 'B1',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `feature-phrased goal(s) (software noun): ${hits.join('; ')}`,
  };
}

export function lintL10_pascalCase(g) {
  // F2 (⚠️): every persona name is PascalCase.
  const bad = [];
  for (const p of g.personas) {
    if (!isPascalCase(p.name)) bad.push(p.name);
  }
  const ok = bad.length === 0;
  return {
    id: 'L10',
    rule: 'F2',
    status: ok ? 'pass' : 'warn',
    detail: ok ? '' : `persona name(s) not PascalCase: ${bad.join(', ')}`,
  };
}

export function lintL11_vagueFiller(g) {
  // F5 (⚠️): no persona name, goal text, or job cell carries a vague-filler token.
  const hits = [];
  for (const p of g.personas) {
    const hn = blocklistHit(p.name, VAGUE_FILLER);
    if (hn) hits.push(`persona '${p.name}' (${hn})`);
    for (const goal of p.goals) {
      const h = blocklistHit(goal.text, VAGUE_FILLER);
      if (h) hits.push(`goal "${goal.text}" (${h})`);
    }
    for (const j of p.jobs) {
      const h = blocklistHit(j.job, VAGUE_FILLER) || blocklistHit(j.trigger, VAGUE_FILLER) || blocklistHit(j.outcome, VAGUE_FILLER);
      if (h) hits.push(`job '${j.job}' (${h})`);
    }
  }
  const ok = hits.length === 0;
  return {
    id: 'L11',
    rule: 'F5',
    status: ok ? 'pass' : 'warn',
    detail: ok ? '' : `vague filler: ${hits.join('; ')}`,
  };
}

export function lintL12_restated00Table(doc07) {
  // F4-mech: no Business-Actors-shaped (Actor|Description) or Impacts-shaped
  // (Impact|Business Actor) table anywhere inside 07.
  const hits = [];
  for (const sec of doc07.sections.values()) {
    for (const t of allTables(sec)) {
      if (columnsMatch(t, ACTORS00_COLUMNS)) hits.push('Actor | Description');
      if (columnsMatch(t, IMPACTS00_COLUMNS)) hits.push('Impact | Business Actor');
    }
  }
  const ok = hits.length === 0;
  return {
    id: 'L12',
    rule: 'F4',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `restated 00 table(s) inside 07: ${[...new Set(hits)].join(', ')}`,
  };
}

export function lintL13_restated01Table(doc07) {
  // F4-mech: no Domain-Events-shaped or 01-Actors-shaped table inside 07.
  const hits = [];
  for (const sec of doc07.sections.values()) {
    for (const t of allTables(sec)) {
      if (columnsMatch(t, EVENTS01_COLUMNS)) hits.push('Event | Actor | Trigger | Notes | Deliverable');
      if (columnsMatch(t, ACTORS01_COLUMNS)) hits.push('Actor | Kind | Responsibility');
    }
  }
  const ok = hits.length === 0;
  return {
    id: 'L13',
    rule: 'F4',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `restated 01 table(s) inside 07: ${[...new Set(hits)].join(', ')}`,
  };
}

export function lintL14_verbatimWindow(g, u00, u01) {
  // F4-mech (⚠️): no business-actor line, goal text, or job cell restates ≥8
  // consecutive verbatim words of a 00 Description or 01 Responsibility cell.
  const sources = [...u00.descriptions, ...u01.responsibilities].filter((s) => s);
  const hits = [];
  const scan = (label, text) => {
    for (const src of sources) {
      const w = verbatimWindowHit(text, src, 8);
      if (w) {
        hits.push(`${label} restates ≥8 words: "${w}…"`);
        return;
      }
    }
  };
  for (const p of g.personas) {
    for (const goal of p.goals) scan(`'${p.name}' goal`, goal.text);
    for (const j of p.jobs) {
      scan(`'${p.name}' job '${j.job}'`, j.trigger);
      scan(`'${p.name}' job '${j.job}'`, j.outcome);
    }
  }
  const ok = hits.length === 0;
  return {
    id: 'L14',
    rule: 'F4',
    status: ok ? 'pass' : 'warn',
    detail: ok ? '' : hits.join('; '),
  };
}

function allTables(section) {
  const out = [...section.tables];
  for (const sub of section.subsections.values()) out.push(...sub.tables);
  return out;
}

// ===========================================================================
// Resolution checks (R1–R6). Each returns
// { id, class:'resolution', rule, status, detail, edges, [upstreamDefect],
//   [upstreamDetail] }.
// ===========================================================================

export function checkR1_actorResolves(g, u00) {
  const known = new Set(u00.businessActors); // exact strings
  let edges = 0;
  const bad = [];
  for (const p of g.personas) {
    if (isBlank(p.businessActor)) {
      bad.push(`'${p.name}' → (empty business actor)`);
      continue;
    }
    edges++;
    if (!known.has(p.businessActor)) bad.push(`'${p.name}' → '${p.businessActor}'`);
  }
  return {
    id: 'R1',
    rule: 'C1',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `business actor absent from 00: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR2_coverage(g, u00) {
  // E1: every 00 Business Actor is named by ≥1 persona's business-actor field.
  const named = new Set(g.personas.map((p) => p.businessActor).filter((v) => !isBlank(v)));
  let edges = 0;
  const uncovered = [];
  for (const a of u00.businessActors) {
    edges++;
    if (!named.has(a)) uncovered.push(a);
  }
  return {
    id: 'R2',
    rule: 'E1',
    status: uncovered.length === 0 ? 'pass' : 'fail',
    detail: uncovered.length ? `00 business actor(s) personified by no persona: ${uncovered.join(', ')}` : '',
    edges,
  };
}

export function checkR3_impactResolves(g, u00) {
  // E3/A6: every goal `[impact: <X>]` token resolves to a 00 Impact (exact).
  // The §9 00-self-inconsistency (an impact owning a ghost actor) is owned
  // EXCLUSIVELY by the R6 pre-resolution self-check (routed upstream-defect →
  // 00); R3 stays a plain 07-side resolution of token → impact name.
  const known = new Set(u00.impacts.map((i) => i.impact));
  let edges = 0;
  const bad = [];
  for (const p of g.personas) {
    for (const goal of p.goals) {
      for (const tok of goal.impactTokens) {
        edges++;
        if (!known.has(tok)) {
          bad.push(`'${p.name}': [impact: ${tok}]`);
        }
      }
    }
  }
  return {
    id: 'R3',
    rule: 'E3',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `impact token absent from 00 Impacts: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR4_outcomeResolves(g, u01) {
  // D2/E4: every job Outcome resolves to a 01 Domain Event (exact string).
  const known = new Set(u01.events);
  let edges = 0;
  const bad = [];
  for (const p of g.personas) {
    for (const j of p.jobs) {
      if (isBlank(j.outcome)) {
        bad.push(`'${p.name}' job '${j.job}' → (empty outcome)`);
        continue;
      }
      edges++;
      if (!known.has(j.outcome)) bad.push(`'${p.name}' job '${j.job}' → '${j.outcome}'`);
    }
  }
  return {
    id: 'R4',
    rule: 'D2',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `job Outcome absent from 01 Domain Events: ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR5_noInventedParty(g, u00, u01) {
  // C2: every persona's business-actor field is present in
  // businessActors00 ∪ actors01 (no invented party at the reference field).
  const known = new Set([...u00.businessActors, ...u01.actors]);
  let edges = 0;
  const bad = [];
  for (const p of g.personas) {
    if (isBlank(p.businessActor)) continue;
    edges++;
    if (!known.has(p.businessActor)) bad.push(`'${p.name}' → '${p.businessActor}'`);
  }
  return {
    id: 'R5',
    rule: 'C2',
    status: bad.length === 0 ? 'pass' : 'fail',
    detail: bad.length ? `invented party (not in 00 actors ∪ 01 actors): ${bad.join(', ')}` : '',
    edges,
  };
}

export function checkR6_upstream00SelfConsistency(u00, self) {
  // §9: 00 impacts table internally resolvable. Failure ⇒ upstream-defect → 00.
  let edges = 0;
  for (const _ of u00.impacts) edges++;
  const ok = self.ok;
  const detail = ok
    ? ''
    : self.defects
        .map((d) => `Impact '${d.impact}' names Business Actor '${d.ghost}' absent from 00 Business Actors`)
        .join('; ');
  return {
    id: 'R6',
    rule: 'E3',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : detail,
    edges,
    upstreamDefect: !ok,
    upstreamDetail: detail,
  };
}

// ===========================================================================
// Trigger classifier (§3.3). Records kind per job; never blocks. Returns
// { triggers:[{persona,job,kind}], nearMisses:[{persona,job,trigger,event}] }.
// ===========================================================================
export function classifyTriggers(g, u01) {
  const events = u01.events;
  const exact = new Set(events);
  const byKey = new Map();
  for (const e of events) if (!byKey.has(key(e))) byKey.set(key(e), e);

  const triggers = [];
  const nearMisses = [];
  for (const p of g.personas) {
    for (const j of p.jobs) {
      const t = j.trigger;
      let kind = 'condition';
      if (exact.has(t)) {
        kind = 'event';
      } else {
        const owner = byKey.get(key(t));
        if (owner !== undefined && owner !== t) {
          // near-miss: normalizes to a 01 event but is not byte-identical.
          nearMisses.push({ persona: p.name, job: j.job, trigger: t, event: owner });
          kind = 'condition';
        } else {
          kind = 'condition';
        }
      }
      triggers.push({ persona: p.name, job: j.job, kind });
    }
  }
  // stable order: persona then job
  triggers.sort((a, b) => a.persona.localeCompare(b.persona, 'en') || a.job.localeCompare(b.job, 'en'));
  return { triggers, nearMisses };
}

// Returns a D3 warn-finding when there are near-misses (recorded, never blocks).
export function checkD3_nearMiss(nearMisses) {
  const ok = nearMisses.length === 0;
  return {
    id: 'D3',
    rule: 'D3',
    status: ok ? 'pass' : 'warn',
    detail: ok
      ? ''
      : nearMisses
          .map((n) => `'${n.persona}' job '${n.job}' trigger '${n.trigger}' near-misses 01 event '${n.event}'`)
          .join('; '),
  };
}

// ===========================================================================
// Exact-value checks (X1–X5).
// ===========================================================================

export function checkX1_eachHasGoalAndJob(g) {
  const bad = [];
  for (const p of g.personas) {
    if (p.goals.length < 1 || p.jobs.length < 1) {
      bad.push(`'${p.name}' (goals=${p.goals.length}, jobs=${p.jobs.length})`);
    }
  }
  const ok = bad.length === 0;
  return {
    id: 'X1',
    rule: 'E2',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `persona(s) missing ≥1 goal and ≥1 job: ${bad.join(', ')}`,
  };
}

export function checkX2_uniquePersonaNames(g) {
  // F1: persona names unique AND distinct when snake_cased.
  const names = g.personas.map((p) => p.name);
  const snakes = names.map((n) => snake(n));
  const dupName = dupsOf(names);
  const dupSnake = dupsOf(snakes);
  const ok = dupName.length === 0 && dupSnake.length === 0;
  const parts = [];
  if (dupName.length) parts.push(`duplicate persona name(s): ${dupName.join(', ')}`);
  if (dupSnake.length) parts.push(`persona name(s) collide when snake_cased: ${dupSnake.join(', ')}`);
  return {
    id: 'X2',
    rule: 'F1',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : parts.join('; '),
  };
}

export function checkX3_uniqueJobsPerPersona(g) {
  // D5/E5: within each persona, job names unique AND distinct when snake_cased.
  const bad = [];
  for (const p of g.personas) {
    const jobNames = p.jobs.map((j) => j.job);
    const jobSnakes = jobNames.map((j) => snake(j));
    const dn = dupsOf(jobNames);
    const ds = dupsOf(jobSnakes);
    if (dn.length) bad.push(`'${p.name}': duplicate job(s) ${dn.join(', ')}`);
    else if (ds.length) bad.push(`'${p.name}': job(s) collide when snake_cased ${ds.join(', ')}`);
  }
  const ok = bad.length === 0;
  return {
    id: 'X3',
    rule: 'D5',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : bad.join('; '),
  };
}

export function checkX4_coverageCardinality(g, u00) {
  // E1 reverse-coverage cardinality: coveredActors === |businessActors00|.
  const named = new Set(g.personas.map((p) => p.businessActor).filter((v) => !isBlank(v)));
  let covered = 0;
  for (const a of u00.businessActors) if (named.has(a)) covered++;
  const ok = covered === u00.businessActors.length;
  return {
    id: 'X4',
    rule: 'E1',
    status: ok ? 'pass' : 'fail',
    detail: ok ? '' : `covered ${covered}/${u00.businessActors.length} 00 business actors`,
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
//   |personas|              (R1 persona→00 business actor)
// + |businessActors00|      (R2 reverse coverage)
// + Σ|goal.impactTokens|    (R3 goal token→00 impact)
// + Σ|jobs|                 (R4 job outcome→01 event)
// + |personas|              (R5 no-invented-party at actor field)
// + Σ|jobs|                 (trigger classification edge, §3.3)
// + |impacts00|             (R6 00 self-consistency precondition)
// NB: R1/R5 walk one edge per persona with a NON-blank business actor (the empty
// case is reported, not walked) — mirrored exactly in the check bodies.
export function expectedEdges(g, u00) {
  const personasWithActor = g.personas.filter((p) => !isBlank(p.businessActor)).length;
  const goalTokens = g.personas.reduce(
    (n, p) => n + p.goals.reduce((m, goal) => m + goal.impactTokens.length, 0),
    0
  );
  const jobsWithOutcome = g.personas.reduce(
    (n, p) => n + p.jobs.filter((j) => !isBlank(j.outcome)).length,
    0
  );
  const jobsTotal = g.personas.reduce((n, p) => n + p.jobs.length, 0);
  return (
    personasWithActor + // R1
    u00.businessActors.length + // R2
    goalTokens + // R3
    jobsWithOutcome + // R4
    personasWithActor + // R5
    jobsTotal + // trigger classifier
    u00.impacts.length // R6
  );
}

// ===========================================================================
// Intake / coverage helpers.
// ===========================================================================
export function intakeCounts(g) {
  return {
    personas: g.personas.length,
    goals: g.personas.reduce((n, p) => n + p.goals.length, 0),
    jobs: g.personas.reduce((n, p) => n + p.jobs.length, 0),
  };
}

export function elementsTotal(g) {
  const c = intakeCounts(g);
  return c.personas + c.goals + c.jobs;
}

function dupsOf(arr) {
  const seen = new Set();
  const dups = [];
  for (const v of arr) {
    if (seen.has(v)) dups.push(v);
    seen.add(v);
  }
  return [...new Set(dups)];
}

export { key, isBlank, norm, columnsMatch };
