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
  readFingerprints,
  colIndex,
  ParseError,
} from './md.mjs';

// ---- 00 impact-map ----------------------------------------------------------
// Pinned shape: ## Goal (prose), ## Business Actors (Actor|Description),
// ## Impacts (Impact|Business Actor), ## Deliverables (Deliverable|Impact).
export function parse00(text) {
  const tables = readTables(text);
  const businessActors = [];
  const impacts = [];
  const impactActor = new Map(); // impact -> business actor (exact string)
  const deliverables = [];
  const deliverableImpact = new Map(); // deliverable -> impact (exact string)
  let goal = null;

  // goal: the first non-empty prose line under `## Goal`
  const lines = text.split(/\r?\n/);
  let inGoal = false;
  for (const line of lines) {
    const h2 = /^##\s+(.*\S)\s*$/.exec(line);
    if (h2) { inGoal = /^goal$/i.test(h2[1].trim()); continue; }
    if (inGoal && line.trim() && !line.includes('|')) { goal = line.trim(); inGoal = false; }
  }

  for (const t of tables) {
    const lc = t.columns.map((c) => c.toLowerCase());
    if (lc[0] === 'actor' && lc.some((c) => c.includes('description'))) {
      const ai = colIndex(t.columns, 'actor');
      for (const r of t.rows) if (r[ai]) businessActors.push(r[ai]);
    } else if (lc[0] === 'impact') {
      const ii = colIndex(t.columns, 'impact');
      const ba = colIndex(t.columns, 'business actor');
      for (const r of t.rows) {
        if (r[ii]) { impacts.push(r[ii]); if (ba >= 0) impactActor.set(r[ii], (r[ba] || '').trim()); }
      }
    } else if (lc[0] === 'deliverable') {
      const di = colIndex(t.columns, 'deliverable');
      const ii = colIndex(t.columns, 'impact');
      for (const r of t.rows) {
        if (r[di]) { deliverables.push(r[di]); if (ii >= 0) deliverableImpact.set(r[di], (r[ii] || '').trim()); }
      }
    }
  }

  if (businessActors.length === 0 || impacts.length === 0 || deliverables.length === 0)
    throw new ParseError('00: missing Business Actors, Impacts, or Deliverables table');

  return { goal, businessActors, impacts, impactActor, deliverables, deliverableImpact };
}

// ---- 01 event-storming ------------------------------------------------------
export function parse01(text) {
  const tables = readTables(text);
  const events = [];
  const actors = [];
  const actorKinds = new Map(); // actor -> kind
  const hotspots = [];
  const aggregates = []; // skeleton headings under ## Lifecycle Skeletons
  const eventTriggers = new Map(); // event -> trigger string
  const eventDeliverable = new Map(); // event -> Deliverable cell (or '—')
  const eventAggregate = new Map(); // event -> aggregate (from skeleton membership)

  for (const t of tables) {
    const lc = t.columns.map((c) => c.toLowerCase());
    if (lc[0] === 'event' && lc.includes('actor')) {
      const ei = colIndex(t.columns, 'event');
      const ti = colIndex(t.columns, 'trigger');
      const di = colIndex(t.columns, 'deliverable');
      for (const r of t.rows) {
        if (r[ei]) {
          events.push(r[ei]);
          if (ti >= 0) eventTriggers.set(r[ei], r[ti] || '');
          if (di >= 0) eventDeliverable.set(r[ei], (r[di] || '').trim());
        }
      }
    } else if (lc[0] === 'actor' && lc.includes('kind')) {
      const ai = colIndex(t.columns, 'actor');
      const ki = colIndex(t.columns, 'kind');
      for (const r of t.rows) if (r[ai]) { actors.push(r[ai]); if (ki >= 0) actorKinds.set(r[ai], (r[ki] || '').trim().toLowerCase()); }
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
    if (li && current) {
      skeletonSteps.get(current).push(li[1].trim());
      if (!eventAggregate.has(li[1].trim())) eventAggregate.set(li[1].trim(), current);
    }
  }

  if (events.length === 0 || actors.length === 0)
    throw new ParseError('01: missing Domain Events or Actors table');

  return {
    events, actors, actorKinds, hotspots, aggregates, skeletonSteps,
    eventTriggers, eventDeliverable, eventAggregate,
  };
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

  // transitions with their immediately preceding 01-event annotation. A pending
  // annotation that lands on a <state> instead (the initial entry) is captured as
  // initialEvent — the ∅-row authority event (e.g. `Event Created` for the
  // `initial="created"` state), which IS part of the entity's authority set.
  let initialEvent = null;
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
      continue;
    }
    const sm = /<state\s+id="([^"]+)"/.exec(line);
    if (sm && pendingAnnot) {
      if (initial && sm[1] === initial && initialEvent === null) initialEvent = pendingAnnot;
      pendingAnnot = null;
    }
  }

  if (stateIds.length === 0 && finalIds.length === 0)
    throw new ParseError('05: no states parsed from scxml');

  return { stateIds, finalIds, transitions, initial, initialEvent, supersedes };
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

// ---- 07 personas ------------------------------------------------------------
// Pinned shape: ### <PersonaName> blocks, each with a `**Business actor:**` line,
// `**Goals:**` bullets carrying `[impact: <exact 00 Impact>]` tokens, and a
// `**Jobs-to-be-done:**` Job|Trigger|Outcome table.
export function parse07(text) {
  const lines = text.split(/\r?\n/);
  const personas = []; // { name, businessActor, goalImpacts:[...], jobs:[{job,trigger,outcome}] }
  let inPersonas = false;
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const h2 = /^##\s+(.*\S)\s*$/.exec(lines[i]);
    if (h2) { inPersonas = /^personas$/i.test(h2[1].trim()); cur = null; continue; }
    if (!inPersonas) continue;
    const h3 = /^###\s+(.*\S)\s*$/.exec(lines[i]);
    if (h3) {
      cur = { name: h3[1].trim(), businessActor: null, goalImpacts: [], jobs: [] };
      personas.push(cur);
      continue;
    }
    if (!cur) continue;
    const ba = /\*\*Business actor:\*\*\s*(.*\S)\s*$/.exec(lines[i]);
    if (ba) { cur.businessActor = ba[1].trim(); continue; }
    // goal impact tokens: [impact: <exact>]
    const im = /\[impact:\s*([^\]]+?)\s*\]/g;
    let mm;
    while ((mm = im.exec(lines[i]))) cur.goalImpacts.push(mm[1].trim());
  }

  // jobs tables: a Job|Trigger|Outcome table whose nearest ### heading is a persona
  const tables = readTables(text);
  const byName = new Map(personas.map((p) => [p.name, p]));
  for (const t of tables) {
    const lc = t.columns.map((c) => c.toLowerCase());
    if (lc[0] === 'job' && lc.includes('trigger') && lc.includes('outcome') && t.heading && byName.has(t.heading)) {
      const ji = colIndex(t.columns, 'job');
      const ti = colIndex(t.columns, 'trigger');
      const oi = colIndex(t.columns, 'outcome');
      const p = byName.get(t.heading);
      for (const r of t.rows) {
        if (r[ji]) p.jobs.push({ job: r[ji].trim(), trigger: (r[ti] || '').trim(), outcome: (r[oi] || '').trim() });
      }
    }
  }

  if (personas.length === 0) throw new ParseError('07: no persona blocks parsed');
  if (personas.some((p) => !p.businessActor))
    throw new ParseError('07: a persona block is missing its **Business actor:** line');
  return { personas };
}

// ---- 08 task-models (.xml) --------------------------------------------------
// Constrained reader: TaskModel persona/job/id attrs, Budget klm, leaf Task ids +
// scenario-tags (closed grammar), and nominal-path leaf ORDER (document order).
export function parse08(text) {
  const mTm = /<TaskModel\b([\s\S]*?)>/.exec(text);
  if (!mTm) throw new ParseError('08: no <TaskModel> element');
  const persona = attr(mTm[1], 'persona');
  const job = attr(mTm[1], 'job');
  const id = attr(mTm[1], 'id');
  if (!persona || !job || !id) throw new ParseError('08: <TaskModel> missing persona/job/id attr');

  let budget = null;
  const mB = /<Budget\b[^>]*\bklm="([^"]*)"/.exec(text);
  if (mB) budget = mB[1];

  // leaves: <Task ...> elements with NO nested child Task (self-closing or empty).
  // We read every Task element in document order, capturing id, category,
  // scenario-tags, klm, and whether it nests children.
  const tasks = []; // {id, category, tags:[...], klm, hasChild}
  const taskRe = /<Task\b([^>]*?)(\/?)>/g;
  let tm;
  // track nesting by a simple stack of "open until matching </Task>" — but the
  // pinned shape self-closes leaves and uses explicit </Task> for abstracts.
  // Simpler: a Task is a leaf iff it is self-closed (`/>`).
  while ((tm = taskRe.exec(text))) {
    const a = tm[1];
    const selfClosed = tm[2] === '/';
    const tid = attr(a, 'id');
    if (!tid) continue;
    const cat = (attr(a, 'category') || '').toLowerCase();
    const tagsRaw = attr(a, 'scenario-tags') || '';
    const tags = tagsRaw.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    const klm = attr(a, 'klm') || '';
    tasks.push({ id: tid, category: cat, tags, klm, leaf: selfClosed });
  }
  const leaves = tasks.filter((t) => t.leaf);

  return { id, persona, job, budget, tasks, leaves };
}

// ---- 09 ui-flows (.xml) -----------------------------------------------------
// Constrained reader: IFMLModel id/persona, Realizes taskModel ids, ViewContainer
// ids (+home), ViewComponent bindings, Event ids/type/task=/klm + 01-event annot,
// NavigationFlow from/to edges.
export function parse09(text) {
  const mM = /<IFMLModel\b([^>]*)>/.exec(text);
  if (!mM) throw new ParseError('09: no <IFMLModel> element');
  const id = attr(mM[1], 'id');
  const persona = attr(mM[1], 'persona');
  if (!persona) throw new ParseError('09: <IFMLModel> missing persona attr');

  const realizes = [];
  const reRe = /<Realizes\b[^>]*\btaskModel="([^"]*)"/g;
  let m;
  while ((m = reRe.exec(text))) realizes.push(m[1]);

  const containers = []; // {id, home}
  const cRe = /<ViewContainer\b([^>]*?)>/g;
  while ((m = cRe.exec(text))) {
    const cid = attr(m[1], 'id');
    if (cid) containers.push({ id: cid, home: /\bhome="true"/.test(m[1]) });
  }

  const bindings = []; // ViewComponent binding values
  const vcRe = /<ViewComponent\b([^>]*?)>/g;
  while ((m = vcRe.exec(text))) {
    const b = attr(m[1], 'binding');
    if (b) bindings.push(b);
  }

  // Events: capture id, type, task, klm, and a trailing <!-- 01-event: ... --> if
  // the Event is a container element (not self-closed). We scan Event blocks.
  const events = []; // {id, type, task, klm, event01}
  const evRe = /<Event\b([^>]*?)(\/?)>/g;
  const lines = text.split(/\r?\n/);
  // build a flat scan that, for a non-self-closed Event, looks ahead for 01-event
  let idx = 0;
  while ((m = evRe.exec(text))) {
    const a = m[1];
    const selfClosed = m[2] === '/';
    const eid = attr(a, 'id');
    const etype = attr(a, 'type') || '';
    const task = attr(a, 'task') || '';
    const klm = attr(a, 'klm') || '';
    let event01 = null;
    if (!selfClosed) {
      // look ahead from this match end to the closing </Event> for an 01-event
      const tail = text.slice(m.index, text.indexOf('</Event>', m.index) + 1);
      const am = /<!--\s*01-event\s*:\s*(.+?)\s*-->/.exec(tail);
      if (am) event01 = am[1].trim();
    }
    if (eid) events.push({ id: eid, type: etype, task, klm, event01 });
  }

  const navs = []; // {from, to}
  const nRe = /<NavigationFlow\b([^>]*?)\/?>/g;
  while ((m = nRe.exec(text))) {
    const from = attr(m[1], 'from');
    const to = attr(m[1], 'to');
    if (from && to) navs.push({ from, to });
  }

  if (containers.length === 0) throw new ParseError('09: no ViewContainer elements');
  return { id, persona, realizes, containers, bindings, events, navs };
}

// ---- 10 flow-acceptance (.feature) ------------------------------------------
// Pinned shape: feature `@task-model:<stem>` tag, screen-id Given/Then steps,
// `01-event` When steps, `outcome of "<tag>"` Then steps.
export function parse10(text) {
  const lines = text.split(/\r?\n/);
  let feature = null;
  let taskModel = null;
  const screenRefs = []; // container ids referenced in Given/Then "<id>" screen
  const outcomeTags = []; // 06 tags referenced via `outcome of "<tag>"`
  const eventRefs = []; // quoted Event ids via `the "<id>" event`
  const event01Refs = []; // exact 01-event strings embedded in When steps
  for (const line of lines) {
    const tmTag = /^\s*@task-model:(\S+)\s*$/.exec(line);
    if (tmTag) { taskModel = tmTag[1]; continue; }
    const fm = /^\s*Feature:\s*(.*\S)\s*$/.exec(line);
    if (fm) { feature = fm[1].trim(); continue; }
    // screen references: `on the "<id>" screen` / `taken to the "<id>" screen`
    const sc = /\b(?:on the|taken to the)\s+"([^"]+)"\s+screen/.exec(line);
    if (sc) screenRefs.push(sc[1]);
    // outcome bindings
    const oc = /outcome of\s+"([^"]+)"/.exec(line);
    if (oc) outcomeTags.push(oc[1]);
    // non-domain event id reference: `triggers the "<id>" event`
    const ev = /triggers the\s+"([^"]+)"\s+event/.exec(line);
    if (ev) eventRefs.push(ev[1]);
    // domain When carrying an exact 01-event string: `…: "<01-event>"`
    const wm = /^\s*(?:When|And|But)\b.*:\s*"([^"]+)"\s*$/.exec(line);
    if (wm) event01Refs.push(wm[1]);
  }
  if (feature === null) throw new ParseError('10: no Feature: line');
  if (!taskModel) throw new ParseError('10: no @task-model: feature tag');
  return { feature, taskModel, screenRefs, outcomeTags, eventRefs, event01Refs };
}

// extract an attr value from a raw element-attribute string
function attr(raw, name) {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(raw);
  return m ? m[1] : null;
}

// ---- artifact discovery + fingerprint reading ------------------------------
export function discoverArtifacts(specsDir) {
  const out = {}; // logical name -> { path, ext, text }
  const want = {
    '00': '00-impact-map.md',
    '01': '01-event-storming.md',
    '02': '02-glossary.md',
    '03': '03-aggregates.md',
    '04dbml': '04-erd.dbml',
    '04trans': '04-transitions.md',
    '07': '07-personas.md',
  };
  for (const [k, fname] of Object.entries(want)) {
    const p = join(specsDir, fname);
    if (existsSync(p)) out[k] = { path: p, ext: extname(p), text: readFileSync(p, 'utf8') };
  }
  // directory artifacts: 08, 09, 10
  const dir = (name, ext, key) => {
    const d = join(specsDir, name);
    out[key] = [];
    if (existsSync(d) && statSync(d).isDirectory()) {
      for (const f of readdirSync(d).sort()) {
        if (f.endsWith(ext)) {
          const p = join(d, f);
          out[key].push({ path: p, ext, text: readFileSync(p, 'utf8'), stem: basename(f, ext) });
        }
      }
    }
  };
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
  dir('08-task-models', '.xml', '08');
  dir('09-ui-flows', '.xml', '09');
  dir('10-flow-acceptance', '.feature', '10');
  return out;
}

export { readFingerprints };
export { readProseFingerprints } from './md.mjs';
