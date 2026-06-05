// checks.mjs — the three MECHANICAL cross-artifact check classes the suite-drift
// script owns (PLAN.md "Plugin-level drift police" 1-3; the §4 semantic check is
// the agent's, not here):
//   1. Resolution — every upstream-owned name used downstream resolves by EXACT
//      string match to exactly one owner.
//   2. DRY — no artifact restates content owned by an upstream artifact.
//   3. Staleness — recompute sha256 of each consumed input; a mismatch is a
//      `stale` finding (class within `fail`) against the downstream artifact.
//
// Each check returns findings: { id, class, status:'pass'|'fail',
// reason, severity, detail, files:[...] }. The harness aggregates + reconciles.

import { createHash } from 'node:crypto';
import {
  parse00, parse01, parse02, parse03, parse04dbml, parse04transitions,
  parse05scxml, parse06feature, parse07, parse08, parse09, parse10,
} from './model.mjs';

export const SEV = { error: 'error', warn: 'warn', info: 'info' };

// transform a 01 event string to the 05 pinned event-attr form
export function eventAttr(s) {
  return s.toLowerCase().replace(/\s+/g, '_');
}

export function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

// Build the full suite model from discovered artifacts. Throws ParseError on a
// genuinely unreadable pinned shape (=> malformed).
export function buildModel(art) {
  const m = {};
  if (art['00']) m.m00 = parse00(art['00'].text);
  if (art['01']) m.m01 = parse01(art['01'].text);
  if (art['02']) m.m02 = parse02(art['02'].text);
  if (art['03']) m.m03 = parse03(art['03'].text);
  if (art['04dbml']) m.m04 = parse04dbml(art['04dbml'].text);
  if (art['04trans']) m.m04t = parse04transitions(art['04trans'].text);
  m.m05 = (art['05'] || []).map((f) => ({ stem: f.stem, path: f.path, ...parse05scxml(f.text) }));
  m.m06 = (art['06'] || []).map((f) => ({ stem: f.stem, path: f.path, ...parse06feature(f.text) }));
  if (art['07']) m.m07 = parse07(art['07'].text);
  m.m08 = (art['08'] || []).map((f) => ({ stem: f.stem, path: f.path, ...parse08(f.text) }));
  m.m09 = (art['09'] || []).map((f) => ({ stem: f.stem, path: f.path, ...parse09(f.text) }));
  m.m10 = (art['10'] || []).map((f) => ({ stem: f.stem, path: f.path, ...parse10(f.text) }));
  return m;
}

// =============================================================================
// RESOLUTION CHECKS (class: resolution)
// =============================================================================
// Each is a closed, named check. A check with ZERO edges to walk records edges:0
// (the harness's reconciliation refuses a suite where nothing resolved).

export function resolutionChecks(m, art) {
  const out = [];
  const F = (id, status, detail, files, reason, edges) =>
    out.push({ id, class: 'resolution', status, reason: reason || null, severity: status === 'fail' ? 'error' : null, detail: detail || null, files: files || [], edges: edges || 0 });

  // ---- R-02-enum-derivation: each 02 enum derivation string ∈ 01 events ----
  if (m.m02 && m.m01) {
    const events = new Set(m.m01.events);
    let edges = 0; const bad = [];
    for (const [name, vals] of m.m02.enums) {
      for (const v of vals) {
        if (!v.derivedFrom) continue;
        edges++;
        if (!events.has(v.derivedFrom)) bad.push(`${name}.${v.value} -> "${v.derivedFrom}"`);
      }
    }
    F('R-02-enum-derivation', bad.length ? 'fail' : 'pass',
      bad.length ? `02 enum derivation strings not found verbatim among 01 events: ${bad.join('; ')}` : null,
      ['02-glossary.md', '01-event-storming.md'], 'dangling-derivation', edges);
  }

  // ---- R-02-term-owns-01: each Term owning a 01 element resolves ----
  if (m.m02 && m.m01) {
    const events = new Set(m.m01.events);
    const actors = new Set(m.m01.actors);
    const aggs = new Set(m.m01.aggregates);
    let edges = 0; const bad = [];
    for (const t of m.m02.terms) {
      if (!t.ownsO1 || !t.ownedElement) continue;
      edges++;
      if (!events.has(t.ownedElement) && !actors.has(t.ownedElement) && !aggs.has(t.ownedElement))
        bad.push(`${t.term} -> "${t.ownedElement}"`);
    }
    F('R-02-term-owns-01', bad.length ? 'fail' : 'pass',
      bad.length ? `02 Term 'Owns 01 element' cells not found among 01 events/actors/aggregates: ${bad.join('; ')}` : null,
      ['02-glossary.md', '01-event-storming.md'], 'dangling-owner', edges);
  }

  // ---- R-03-heading-biject: 03 ### headings biject with 01 skeleton headings ----
  if (m.m03 && m.m01) {
    const skel = new Set(m.m01.aggregates);
    let edges = 0; const bad = [];
    for (const a of m.m03.aggregates) { edges++; if (!skel.has(a)) bad.push(`03 ### ${a} has no 01 skeleton`); }
    for (const a of m.m01.aggregates) { if (!m.m03.aggregates.includes(a)) bad.push(`01 skeleton ${a} has no 03 ### heading`); }
    F('R-03-heading-biject', bad.length ? 'fail' : 'pass',
      bad.length ? `03 aggregate headings do not biject with 01 skeletons: ${bad.join('; ')}` : null,
      ['03-aggregates.md', '01-event-storming.md'], 'heading-bijection', edges);
  }

  // ---- R-03-policy-source-event: policy Source events ∈ 01 events ----
  if (m.m03 && m.m01) {
    const events = new Set(m.m01.events);
    let edges = 0; const bad = [];
    for (const p of m.m03.policies) {
      if (!p.sourceEvent) continue;
      edges++;
      if (!events.has(p.sourceEvent)) bad.push(`${p.name} Source event "${p.sourceEvent}"`);
    }
    F('R-03-policy-source-event', bad.length ? 'fail' : 'pass',
      bad.length ? `03 policy Source events not found among 01 events: ${bad.join('; ')}` : null,
      ['03-aggregates.md', '01-event-storming.md'], 'dangling-policy-source', edges);
  }

  // ---- R-03-boundary-term: 03 '02 Term' cells ∈ 02 Terms ----
  if (m.m03 && m.m02) {
    const terms = new Set(m.m02.terms.map((t) => t.term));
    let edges = 0; const bad = [];
    for (const bt of m.m03.boundaryTerms) { edges++; if (!terms.has(bt)) bad.push(bt); }
    F('R-03-boundary-term', bad.length ? 'fail' : 'pass',
      bad.length ? `03 boundary '02 Term' cells not found among 02 Terms: ${bad.join('; ')}` : null,
      ['03-aggregates.md', '02-glossary.md'], 'dangling-boundary-term', edges);
  }

  // ---- R-03-ref-target: 03 References target aggregates ∈ 03 roots ----
  if (m.m03) {
    const aggs = new Set(m.m03.aggregates);
    let edges = 0; const bad = [];
    for (const rt of m.m03.refTargets) { edges++; if (!aggs.has(rt)) bad.push(rt); }
    F('R-03-ref-target', bad.length ? 'fail' : 'pass',
      bad.length ? `03 References target aggregates not found among 03 roots: ${bad.join('; ')}` : null,
      ['03-aggregates.md'], 'dangling-ref-target', edges);
  }

  // ---- R-04-enum-verbatim: 04 DBML enums match 02 enums verbatim + order ----
  if (m.m04 && m.m02) {
    // 02 EnumName -> snake_case dbml name mapping by value-set; we compare by
    // matching each 02 enum to the dbml enum named snake_case(EnumName).
    let edges = 0; const bad = [];
    for (const [name, vals] of m.m02.enums) {
      const dname = toSnake(name);
      edges++;
      const dvals = m.m04.enums.get(dname);
      if (!dvals) { bad.push(`02 enum ${name} -> no DBML enum ${dname}`); continue; }
      const exp = vals.map((v) => v.value);
      if (exp.length !== dvals.length || exp.some((v, i) => v !== dvals[i]))
        bad.push(`enum ${dname}: 02=[${exp.join(',')}] dbml=[${dvals.join(',')}]`);
    }
    F('R-04-enum-verbatim', bad.length ? 'fail' : 'pass',
      bad.length ? `04 DBML enums do not match 02 enums verbatim+order: ${bad.join('; ')}` : null,
      ['04-erd.dbml', '02-glossary.md'], 'enum-mismatch', edges);
  }

  // ---- R-04-table-from-root: every 03 root resolves to a 04 table ----
  if (m.m04 && m.m03) {
    const tables = new Set(m.m04.tableNames);
    let edges = 0; const bad = [];
    for (const a of m.m03.aggregates) { edges++; if (!tables.has(toSnake(a))) bad.push(`03 root ${a} -> no table ${toSnake(a)}`); }
    F('R-04-table-from-root', bad.length ? 'fail' : 'pass',
      bad.length ? `03 roots without a 04 table: ${bad.join('; ')}` : null,
      ['04-erd.dbml', '03-aggregates.md'], 'missing-table', edges);
  }

  // ---- R-04-trans-event: 04 transition Events ∈ 02 derivation strings ----
  if (m.m04t && m.m02) {
    const deriv = new Set();
    for (const [, vals] of m.m02.enums) for (const v of vals) if (v.derivedFrom) deriv.add(v.derivedFrom);
    let edges = 0; const bad = [];
    for (const [ent, rows] of m.m04t.entities) {
      for (const r of rows) {
        if (!r.event) continue;
        edges++;
        if (!deriv.has(r.event)) bad.push(`${ent}: "${r.event}"`);
      }
    }
    F('R-04-trans-event', bad.length ? 'fail' : 'pass',
      bad.length ? `04 transition Events not found among 02 derivation strings: ${bad.join('; ')}` : null,
      ['04-transitions.md', '02-glossary.md'], 'dangling-transition-event', edges);
  }

  // ---- R-05 checks: states ∈ 02 enum values, 01-event annots ∈ 01, supersedes ∈ 04 ----
  if (m.m05.length) {
    // map a 05 stem to its 02 enum: stem 'event' -> EventStatus
    const enumByEntity = new Map();
    if (m.m02) for (const [name, vals] of m.m02.enums) {
      const ent = toSnake(name.replace(/Status$/, ''));
      enumByEntity.set(ent, new Set(vals.map((v) => v.value)));
    }
    const events01 = m.m01 ? new Set(m.m01.events) : null;
    const tables04 = m.m04 ? new Set(m.m04.tableNames) : null;
    const transEntities = m.m04t ? new Set([...m.m04t.entities.keys()]) : null;

    let eState = 0, eAnnot = 0, eSup = 0;
    const badState = [], badAnnot = [], badSup = [];
    for (const sc of m.m05) {
      const allStates = [...sc.stateIds, ...sc.finalIds];
      const owned = enumByEntity.get(sc.stem);
      for (const s of allStates) {
        eState++;
        if (owned && !owned.has(s)) badState.push(`${sc.stem}.scxml state '${s}' not a 02 ${sc.stem} enum value`);
      }
      for (const tr of sc.transitions) {
        if (tr.annot && events01) {
          eAnnot++;
          if (!events01.has(tr.annot)) badAnnot.push(`${sc.stem}.scxml 01-event '${tr.annot}' not a 01 event`);
          else if (eventAttr(tr.annot) !== tr.event) badAnnot.push(`${sc.stem}.scxml event '${tr.event}' does not round-trip from '${tr.annot}'`);
        }
      }
      if (sc.supersedes) {
        eSup++;
        // supersedes target: 04-transitions.md#<entity>; entity must be a 04 table + transition entity
        const mm = /#([A-Za-z0-9_]+)\s*$/.exec(sc.supersedes);
        const ent = mm ? mm[1] : null;
        if (!ent) badSup.push(`${sc.stem}.scxml malformed supersedes '${sc.supersedes}'`);
        else {
          if (transEntities && !transEntities.has(ent)) badSup.push(`${sc.stem}.scxml supersedes '#${ent}' has no 04 transition table`);
          if (tables04 && !tables04.has(ent)) badSup.push(`${sc.stem}.scxml supersedes '#${ent}' has no 04 table`);
        }
      }
    }
    F('R-05-state-enum', badState.length ? 'fail' : 'pass',
      badState.length ? badState.join('; ') : null, ['05-statecharts/', '02-glossary.md'], 'dangling-state', eState);
    F('R-05-event-annot', badAnnot.length ? 'fail' : 'pass',
      badAnnot.length ? badAnnot.join('; ') : null, ['05-statecharts/', '01-event-storming.md'], 'dangling-or-nonroundtrip-annot', eAnnot);
    F('R-05-supersedes', badSup.length ? 'fail' : 'pass',
      badSup.length ? badSup.join('; ') : null, ['05-statecharts/', '04-erd.dbml'], 'dangling-supersedes', eSup);
  }

  // ---- R-06 tag resolution: INV ids ∈ 03, entities ∈ 04, policies ∈ 03 ----
  //      + When-embedded event strings ∈ authoritative sources
  if (m.m06.length) {
    const invs = m.m03 ? new Set(m.m03.invariants) : new Set();
    const policies = m.m03 ? new Set(m.m03.policies.map((p) => p.name)) : new Set();
    const tables04 = m.m04 ? new Set(m.m04.tableNames) : new Set();
    const events01 = m.m01 ? new Set(m.m01.events) : new Set();
    // authoritative event strings: 01 events carried in 04 transition Event cells
    const authEvents = new Set();
    if (m.m04t) for (const [, rows] of m.m04t.entities) for (const r of rows) if (r.event) authEvents.add(r.event);

    let eTag = 0, eWhen = 0;
    const badTag = [], badWhen = [];
    for (const ft of m.m06) {
      for (const sc of ft.scenarios) {
        if (sc.tag) {
          eTag++;
          const tag = sc.tag;
          if (tag.startsWith('invariant:')) {
            const id = tag.slice('invariant:'.length);
            if (!invs.has(id)) badTag.push(`${ft.stem}.feature @invariant:${id} not a 03 invariant`);
          } else if (tag.startsWith('policy:')) {
            const id = tag.slice('policy:'.length);
            if (!policies.has(id)) badTag.push(`${ft.stem}.feature @policy:${id} not a 03 policy`);
          } else if (tag.startsWith('transition:') || tag.startsWith('terminal:') || tag.startsWith('authz:')) {
            const id = tag.split(':')[1];
            if (!tables04.has(id)) badTag.push(`${ft.stem}.feature @${tag} entity '${id}' not a 04 table`);
          } else {
            badTag.push(`${ft.stem}.feature unknown tag namespace @${tag}`);
          }
        }
        // When-embedded event strings: a transition/policy/authz When must contain an
        // authoritative 01 event string verbatim as a substring.
        if (sc.tag && (sc.tag.startsWith('transition:') || sc.tag.startsWith('policy:') || sc.tag.startsWith('authz:'))) {
          for (const w of sc.whenLines) {
            eWhen++;
            const hit = [...authEvents, ...events01].some((ev) => w.includes(ev));
            if (!hit) badWhen.push(`${ft.stem}.feature When has no authoritative event string: "${w}"`);
          }
        }
      }
    }
    F('R-06-tag', badTag.length ? 'fail' : 'pass',
      badTag.length ? badTag.join('; ') : null, ['06-gherkin/', '03-aggregates.md'], 'dangling-tag', eTag);
    F('R-06-when-event', badWhen.length ? 'fail' : 'pass',
      badWhen.length ? badWhen.join('; ') : null, ['06-gherkin/', '01-event-storming.md'], 'dangling-when-event', eWhen);
  }

  // ---------------------------------------------------------------------------
  // 01 -> 00 families
  // ---------------------------------------------------------------------------

  // ---- R-01-actor-from-00: every 01 human/org actor ∈ 00 Business Actors ----
  if (m.m01 && m.m00) {
    const ba = new Set(m.m00.businessActors);
    let edges = 0; const bad = [];
    for (const a of m.m01.actors) {
      const kind = m.m01.actorKinds.get(a) || '';
      // systems / automated processes are 01-owned and exempt
      if (kind === 'system' || kind === 'automated-process') continue;
      edges++;
      if (!ba.has(a)) bad.push(`01 actor '${a}' (${kind}) not a 00 Business Actor`);
    }
    F('R-01-actor-from-00', bad.length ? 'fail' : 'pass',
      bad.length ? bad.join('; ') : null, ['01-event-storming.md', '00-impact-map.md'], 'dangling-business-actor', edges);
  }

  // ---- R-01-deliverable: 01 event Deliverable cells ∈ 00 Deliverables ----
  // + every 00 deliverable realized by ≥1 event; + every aggregate serves ≥1 event
  if (m.m01 && m.m00) {
    const deliv = new Set(m.m00.deliverables);
    let edges = 0; const bad = [];
    const realized = new Set();
    for (const [ev, cell] of m.m01.eventDeliverable) {
      if (!cell || cell === '—' || cell === '-') continue;
      edges++;
      if (!deliv.has(cell)) bad.push(`01 event '${ev}' Deliverable '${cell}' not a 00 Deliverable`);
      else realized.add(cell);
    }
    // coverage: every 00 deliverable realized by ≥1 event
    for (const d of m.m00.deliverables) {
      edges++;
      if (!realized.has(d)) bad.push(`00 deliverable '${d}' realized by no 01 event`);
    }
    F('R-01-deliverable', bad.length ? 'fail' : 'pass',
      bad.length ? bad.join('; ') : null, ['01-event-storming.md', '00-impact-map.md'], 'deliverable-coverage', edges);

    // every aggregate serves ≥1 event (skeleton non-empty)
    let eAgg = 0; const badAgg = [];
    for (const a of m.m01.aggregates) {
      eAgg++;
      const steps = m.m01.skeletonSteps.get(a) || [];
      if (steps.length === 0) badAgg.push(`01 aggregate '${a}' serves no event`);
    }
    F('R-01-aggregate-serves', badAgg.length ? 'fail' : 'pass',
      badAgg.length ? badAgg.join('; ') : null, ['01-event-storming.md'], 'empty-aggregate', eAgg);
  }

  // ---------------------------------------------------------------------------
  // 07 personas families
  // ---------------------------------------------------------------------------
  if (m.m07) {
    // ---- R-07-persona-actor: persona Business actor ∈ 00 actors (both ways) ----
    if (m.m00) {
      const ba = new Set(m.m00.businessActors);
      let edges = 0; const bad = [];
      const covered = new Set();
      for (const p of m.m07.personas) {
        edges++;
        if (!ba.has(p.businessActor)) bad.push(`07 persona '${p.name}' Business actor '${p.businessActor}' not a 00 Business Actor`);
        else covered.add(p.businessActor);
      }
      for (const a of m.m00.businessActors) { edges++; if (!covered.has(a)) bad.push(`00 Business Actor '${a}' has no 07 persona`); }
      F('R-07-persona-actor', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['07-personas.md', '00-impact-map.md'], 'persona-actor-coverage', edges);
    }

    // ---- R-07-goal-impact: goal [impact: …] tokens ∈ 00 Impacts ----
    if (m.m00) {
      const impacts = new Set(m.m00.impacts);
      let edges = 0; const bad = [];
      for (const p of m.m07.personas) for (const im of p.goalImpacts) {
        edges++;
        if (!impacts.has(im)) bad.push(`07 persona '${p.name}' goal [impact: ${im}] not a 00 Impact`);
      }
      F('R-07-goal-impact', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['07-personas.md', '00-impact-map.md'], 'dangling-impact-token', edges);
    }

    // ---- R-07-job-outcome: job Outcome cells ∈ 01 events ----
    if (m.m01) {
      const events = new Set(m.m01.events);
      let edges = 0; const bad = [];
      for (const p of m.m07.personas) for (const j of p.jobs) {
        if (!j.outcome) continue;
        edges++;
        if (!events.has(j.outcome)) bad.push(`07 persona '${p.name}' job '${j.job}' Outcome '${j.outcome}' not a 01 event`);
      }
      F('R-07-job-outcome', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['07-personas.md', '01-event-storming.md'], 'dangling-job-outcome', edges);
    }
  }

  // ---------------------------------------------------------------------------
  // 08 task-models families
  // ---------------------------------------------------------------------------
  if (m.m08.length) {
    // ---- R-08-persona-job-biject: 08 files ↔ 07 persona-jobs (bijection) ----
    if (m.m07) {
      const expected = new Set(); // stem -> {persona, job}
      const expMeta = new Map();
      for (const p of m.m07.personas) for (const j of p.jobs) {
        const stem = `${snakeSlug(p.name)}-${snakeSlug(j.job)}`;
        expected.add(stem); expMeta.set(stem, { persona: p.name, job: j.job });
      }
      const present = new Set(m.m08.map((x) => x.stem));
      let edges = 0; const bad = [];
      for (const x of m.m08) {
        edges++;
        if (!expected.has(x.stem)) bad.push(`08 file '${x.stem}.xml' has no matching 07 persona-job`);
        else {
          const meta = expMeta.get(x.stem);
          if (x.persona !== meta.persona) bad.push(`08 '${x.stem}.xml' persona='${x.persona}' != 07 '${meta.persona}'`);
          if (x.job !== meta.job) bad.push(`08 '${x.stem}.xml' job='${x.job}' != 07 '${meta.job}'`);
        }
      }
      for (const stem of expected) { edges++; if (!present.has(stem)) bad.push(`07 persona-job '${stem}' has no 08 file`); }
      F('R-08-persona-job-biject', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['08-task-models/', '07-personas.md'], 'persona-job-bijection', edges);
    }

    // ---- R-08-tag-vocab: 08 leaf scenario-tags ∈ 06 tag vocabulary ----
    if (m.m06.length) {
      const vocab = sixTagVocabulary(m.m06);
      let edges = 0; const bad = [];
      for (const x of m.m08) for (const lf of x.leaves) for (const tag of lf.tags) {
        edges++;
        if (!vocab.has(tag)) bad.push(`08 '${x.stem}.xml' leaf '${lf.id}' scenario-tag '${tag}' not in 06 tag vocabulary`);
      }
      F('R-08-tag-vocab', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['08-task-models/', '06-gherkin/'], 'dangling-scenario-tag', edges);
    }
  }

  // ---------------------------------------------------------------------------
  // 09 ui-flows families
  // ---------------------------------------------------------------------------
  if (m.m09.length) {
    // ---- R-09-persona-biject: 09 files ↔ 07 personas (one per persona) ----
    if (m.m07) {
      const expected = new Set(m.m07.personas.map((p) => snakeSlug(p.name)));
      const present = new Set(m.m09.map((x) => x.stem));
      let edges = 0; const bad = [];
      for (const x of m.m09) { edges++; if (!expected.has(x.stem)) bad.push(`09 file '${x.stem}.xml' has no matching 07 persona`); }
      for (const e of expected) { edges++; if (!present.has(e)) bad.push(`07 persona '${e}' has no 09 file`); }
      F('R-09-persona-biject', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['09-ui-flows/', '07-personas.md'], 'persona-bijection', edges);
    }

    // ---- R-09-event-task: 09 Event task= ∈ 08 leaf ids (of a realized model) ----
    {
      const leafById = new Map(); // 08 stem -> Set(leaf id)
      for (const x of m.m08) leafById.set(x.stem, new Set(x.leaves.map((l) => l.id)));
      let edges = 0; const bad = [];
      for (const x of m.m09) {
        const realizedLeaves = new Set();
        for (const tmId of x.realizes) for (const id of (leafById.get(tmId) || [])) realizedLeaves.add(id);
        for (const ev of x.events) {
          if (!ev.task) continue;
          edges++;
          if (!realizedLeaves.has(ev.task)) bad.push(`09 '${x.stem}.xml' Event '${ev.id}' task='${ev.task}' not a leaf of any realized 08 model`);
        }
      }
      F('R-09-event-task', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['09-ui-flows/', '08-task-models/'], 'dangling-event-task', edges);
    }

    // ---- R-09-binding: 09 ViewComponent binding ∈ 04 tables ----
    if (m.m04) {
      const tables = new Set(m.m04.tableNames);
      let edges = 0; const bad = [];
      for (const x of m.m09) for (const b of x.bindings) {
        edges++;
        if (!tables.has(b)) bad.push(`09 '${x.stem}.xml' binding='${b}' not a 04 table`);
      }
      F('R-09-binding', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['09-ui-flows/', '04-erd.dbml'], 'dangling-binding', edges);
    }

    // ---- R-09-event-authority: 09 01-event annot ∈ entity authority ----
    // authority = 05 statechart transition set if entity promoted, else 04 row.
    {
      // build per-entity authoritative 01-event sets.
      const promoted = new Set(m.m05.map((s) => s.stem)); // entity stems with a 05 file
      const authByEntity = new Map(); // entity -> Set(01-event strings)
      for (const s of m.m05) {
        const set = new Set();
        if (s.initialEvent) set.add(s.initialEvent); // ∅-row authority (initial entry)
        for (const tr of s.transitions) if (tr.annot) set.add(tr.annot);
        authByEntity.set(s.stem, set);
      }
      if (m.m04t) for (const [ent, rows] of m.m04t.entities) {
        if (promoted.has(ent)) continue; // promoted entities use 05 authority
        const set = authByEntity.get(ent) || new Set();
        for (const r of rows) if (r.event) set.add(r.event);
        authByEntity.set(ent, set);
      }
      // a 09 Event's binding container determines its entity; we approximate the
      // entity from the ViewComponent binding adjacent to the Event is not
      // tracked per-container, so we accept the 01-event if it is in ANY entity's
      // authority across the suite (a ghost 01-event resolves nowhere => fail).
      const allAuth = new Set();
      for (const set of authByEntity.values()) for (const e of set) allAuth.add(e);
      let edges = 0; const bad = [];
      for (const x of m.m09) for (const ev of x.events) {
        if (!ev.event01) continue;
        edges++;
        if (!allAuth.has(ev.event01)) bad.push(`09 '${x.stem}.xml' Event '${ev.id}' 01-event '${ev.event01}' not in any entity's authority (05-if-promoted-else-04)`);
      }
      F('R-09-event-authority', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['09-ui-flows/', '05-statecharts/'], 'dangling-event-authority', edges);
    }
  }

  // ---------------------------------------------------------------------------
  // 10 flow-acceptance families
  // ---------------------------------------------------------------------------
  if (m.m10.length) {
    // ---- R-10-model-biject: 10 files ↔ 08 models (bijection) ----
    {
      const expected = new Set(m.m08.map((x) => x.stem));
      const present = new Set(m.m10.map((x) => x.stem));
      let edges = 0; const bad = [];
      for (const x of m.m10) {
        edges++;
        if (!expected.has(x.stem)) bad.push(`10 file '${x.stem}.feature' has no matching 08 model`);
        if (x.taskModel !== x.stem) bad.push(`10 '${x.stem}.feature' @task-model:${x.taskModel} != filename stem`);
      }
      for (const e of expected) { edges++; if (!present.has(e)) bad.push(`08 model '${e}' has no 10 feature`); }
      F('R-10-model-biject', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['10-flow-acceptance/', '08-task-models/'], 'model-bijection', edges);
    }

    // ---- R-10-screen-ref: 10 screen refs ∈ 09 container ids (of the persona) ----
    {
      // map 08 stem -> persona -> 09 container ids
      const containersByPersona = new Map(); // 09 stem -> Set(container ids)
      for (const x of m.m09) containersByPersona.set(x.stem, new Set(x.containers.map((c) => c.id)));
      // 10 stem is <persona>-<job>; the persona slug is the 09 stem prefix
      const personaOf = (stem) => stem.split('-')[0];
      let edges = 0; const bad = [];
      for (const x of m.m10) {
        const ids = containersByPersona.get(personaOf(x.stem)) || new Set();
        for (const ref of x.screenRefs) {
          edges++;
          if (!ids.has(ref)) bad.push(`10 '${x.stem}.feature' screen '${ref}' not a 09 container id for persona '${personaOf(x.stem)}'`);
        }
      }
      F('R-10-screen-ref', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['10-flow-acceptance/', '09-ui-flows/'], 'dangling-screen-ref', edges);
    }

    // ---- R-10-outcome-tag: 10 outcome tags ∈ 06 tag vocabulary ----
    if (m.m06.length) {
      const vocab = sixTagVocabulary(m.m06);
      let edges = 0; const bad = [];
      for (const x of m.m10) for (const tag of x.outcomeTags) {
        edges++;
        if (!vocab.has(tag)) bad.push(`10 '${x.stem}.feature' outcome tag '${tag}' not in 06 tag vocabulary`);
      }
      F('R-10-outcome-tag', bad.length ? 'fail' : 'pass',
        bad.length ? bad.join('; ') : null, ['10-flow-acceptance/', '06-gherkin/'], 'dangling-outcome-tag', edges);
    }
  }

  return out;
}

// the 06 closed tag vocabulary = every tag actually present on a 06 scenario,
// re-prefixed with '@'. 08 scenario-tags and 10 outcome tags resolve into it.
function sixTagVocabulary(m06) {
  const vocab = new Set();
  for (const ft of m06) for (const sc of ft.scenarios) if (sc.tag) vocab.add(`@${sc.tag}`);
  return vocab;
}

// snake slug matching the 07/08/09 filename convention:
// lowercase, whitespace and non-[a-z0-9_] -> '_'.
function snakeSlug(s) {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_');
}

// =============================================================================
// DRY CHECKS (class: dry)
// =============================================================================
// Mechanical subset: (a) shape-detection of upstream-owned table shapes appearing
// downstream; (b) >=N-token verbatim windows of upstream rule/definition text.

const DRY_TOKEN_WINDOW = 8;

export function dryChecks(m, art) {
  const out = [];
  const F = (id, status, detail, files, edges) =>
    out.push({ id, class: 'dry', status, reason: status === 'fail' ? 'restated-shape' : null, severity: status === 'fail' ? 'error' : null, detail: detail || null, files: files || [], edges: edges || 0 });

  // ---- DRY-shape: Domain-Events / Actors / Hotspots tables restated in 02+ ----
  // The 01-owned table shapes are: header starting with Event|Actor (+Kind)|Hotspot.
  const downstreamMd = [];
  if (art['02']) downstreamMd.push(['02-glossary.md', art['02'].text]);
  if (art['03']) downstreamMd.push(['03-aggregates.md', art['03'].text]);
  {
    let edges = 0; const bad = [];
    for (const [name, text] of downstreamMd) {
      edges++;
      if (hasTableShape(text, ['event', 'actor', 'trigger'])) bad.push(`${name} restates a 01 Domain-Events table shape`);
      if (hasTableShape(text, ['actor', 'kind', 'responsibility'])) bad.push(`${name} restates a 01 Actors table shape`);
      if (hasTableShape(text, ['hotspot', 'question', 'blocks'])) bad.push(`${name} restates a 01 Hotspots table shape`);
    }
    F('DRY-01-shape', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['01-event-storming.md'], edges);
  }

  // ---- DRY-02-shape: Terms / enum-value tables restated in 03+ ----
  {
    const targets = [];
    if (art['03']) targets.push(['03-aggregates.md', art['03'].text]);
    let edges = 0; const bad = [];
    for (const [name, text] of targets) {
      edges++;
      if (hasTableShape(text, ['term', 'definition'])) bad.push(`${name} restates a 02 Terms table shape`);
      if (hasTableShape(text, ['value', 'derived from event'])) bad.push(`${name} restates a 02 enum-value table shape`);
    }
    F('DRY-02-shape', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['02-glossary.md'], edges);
  }

  // ---- DRY-trans-shape: transition tables restated in 05/06 comments ----
  {
    let edges = 0; const bad = [];
    for (const sc of (art['05'] || [])) {
      edges++;
      if (/\|\s*From\s*\|.*\bEvent\b.*\|\s*To\s*\|/i.test(sc.text)) bad.push(`05/${sc.stem}.scxml embeds a transition-table shape`);
    }
    for (const ft of (art['06'] || [])) {
      edges++;
      if (/\|\s*From\s*\|.*\bEvent\b.*\|\s*To\s*\|/i.test(ft.text)) bad.push(`06/${ft.stem}.feature embeds a transition-table shape`);
    }
    F('DRY-trans-shape', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['04-transitions.md'], edges);
  }

  // ---- DRY-verbatim: >=N-token windows of upstream INV Rule text appearing in 06 ----
  if (m.m03 && m.m06.length) {
    const ruleWindows = []; // {id, window:[tokens], norm}
    for (const [id, rule] of m.m03.invariantRules) {
      const toks = tokenize(rule);
      if (toks.length >= DRY_TOKEN_WINDOW) {
        for (let i = 0; i + DRY_TOKEN_WINDOW <= toks.length; i++) {
          ruleWindows.push({ id, norm: toks.slice(i, i + DRY_TOKEN_WINDOW).join(' ') });
        }
      }
    }
    let edges = 0; const bad = [];
    for (const ft of m.m06) {
      const ftext = (art['06'].find((f) => f.stem === ft.stem) || {}).text || '';
      const ftoks = tokenize(ftext);
      const wins = new Set();
      for (let i = 0; i + DRY_TOKEN_WINDOW <= ftoks.length; i++) wins.add(ftoks.slice(i, i + DRY_TOKEN_WINDOW).join(' '));
      edges++;
      for (const rw of ruleWindows) {
        if (wins.has(rw.norm)) { bad.push(`06/${ft.stem}.feature restates >=${DRY_TOKEN_WINDOW}-token window of ${rw.id} rule text`); break; }
      }
    }
    F('DRY-verbatim-rule', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['03-aggregates.md'], edges);
  }

  // ---- DRY-def-verbatim: >=N-token windows of 02 Term definitions in 03+ ----
  if (m.m02 && art['03']) {
    // 02 definitions are re-read from text (model.mjs keeps names, not prose):
    const defs = extractDefinitions(art['02'].text);
    const windows = [];
    for (const d of defs) {
      const toks = tokenize(d);
      if (toks.length >= DRY_TOKEN_WINDOW)
        for (let i = 0; i + DRY_TOKEN_WINDOW <= toks.length; i++) windows.push(toks.slice(i, i + DRY_TOKEN_WINDOW).join(' '));
    }
    const dtoks = tokenize(art['03'].text);
    const dwins = new Set();
    for (let i = 0; i + DRY_TOKEN_WINDOW <= dtoks.length; i++) dwins.add(dtoks.slice(i, i + DRY_TOKEN_WINDOW).join(' '));
    let edges = windows.length ? 1 : 0; const bad = [];
    for (const w of windows) if (dwins.has(w)) { bad.push(`03-aggregates.md restates a >=${DRY_TOKEN_WINDOW}-token window of a 02 definition`); break; }
    F('DRY-def-verbatim', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['02-glossary.md'], edges);
  }

  // ---- DRY-00-shape: 00 Business-Actors / Impacts / Deliverables shapes in 01+ ----
  // The 00-owned table shapes restated downstream of 00. (01 owns its own Actors
  // table whose header differs — Actor|Kind|Responsibility — so it does not collide
  // with 00's Actor|Description shape.)
  {
    const targets = [];
    if (art['01']) targets.push(['01-event-storming.md', art['01'].text]);
    if (art['07']) targets.push(['07-personas.md', art['07'].text]);
    let edges = 0; const bad = [];
    for (const [name, text] of targets) {
      edges++;
      if (hasTableShape(text, ['impact', 'business actor'])) bad.push(`${name} restates a 00 Impacts table shape`);
      if (hasTableShape(text, ['deliverable', 'impact'])) bad.push(`${name} restates a 00 Deliverables table shape`);
      if (hasTableShape(text, ['actor', 'description'])) bad.push(`${name} restates a 00 Business-Actors table shape`);
    }
    F('DRY-00-shape', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['00-impact-map.md'], edges);
  }

  // ---- DRY-07-shape: 07 persona-block shapes restated downstream (08/09/10) ----
  // 07 owns the persona Jobs-to-be-done (Job|Trigger|Outcome) table and the
  // `**Business actor:**` block. A downstream doc restating that table shape is a
  // restated-shape finding. 08/09/10 are XML/feature, so a Markdown jobs-table
  // there would be an obvious paste.
  {
    let edges = 0; const bad = [];
    const scanText = (label, text) => {
      edges++;
      if (hasTableShape(text, ['job', 'trigger', 'outcome'])) bad.push(`${label} restates a 07 Jobs-to-be-done table shape`);
    };
    for (const x of (art['08'] || [])) scanText(`08/${x.stem}.xml`, x.text);
    for (const x of (art['09'] || [])) scanText(`09/${x.stem}.xml`, x.text);
    for (const x of (art['10'] || [])) scanText(`10/${x.stem}.feature`, x.text);
    F('DRY-07-shape', bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : null, ['07-personas.md'], edges);
  }

  return out;
}

function hasTableShape(text, requiredCols) {
  // look for a table whose header contains ALL required column substrings
  const lines = text.split(/\r?\n/);
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].includes('|')) continue;
    if (!/^\s*\|?\s*:?-{1,}/.test(lines[i + 1]) || !lines[i + 1].includes('|')) continue;
    const header = lines[i].toLowerCase();
    if (requiredCols.every((c) => header.includes(c))) return true;
  }
  return false;
}

function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z0-9_]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function extractDefinitions(text) {
  // the 02 Terms table: column 'Definition'
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].includes('|')) continue;
    const header = lines[i].toLowerCase();
    if (header.includes('term') && header.includes('definition')) {
      const cols = lines[i].split('|').map((c) => c.trim().toLowerCase());
      const di = cols.findIndex((c) => c.includes('definition'));
      let j = i + 2;
      for (; j < lines.length && lines[j].includes('|'); j++) {
        const cells = lines[j].split('|').map((c) => c.trim());
        // account for leading pipe producing an empty first cell
        const idx = lines[j].trim().startsWith('|') ? di : di - 1;
        if (cells[di] && !/^:?-/.test(cells[di])) out.push(cells[di]);
      }
      break;
    }
  }
  return out;
}

function toSnake(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

export { toSnake };
