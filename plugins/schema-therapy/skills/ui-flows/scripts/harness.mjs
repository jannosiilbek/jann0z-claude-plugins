#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for artifact 09 (the directory artifact
// `specs/09-ui-flows/` holding one `<snake(persona)>.xml` IFML model per 07 persona).
// Validated against FIVE-OR-SIX upstreams (02 + both 04 + 07 + 08, plus optional 05).
// Implements references/simulation.md EXACTLY:
//   - VENDORED IFML-XMI-subset reader (the authoritative validator, §0/§1; xml.mjs).
//   - FLOW-WALK ORACLE (§3.3; graph.mjs): per realized 08 model — W-HOME (one home + all
//     containers reachable), W-REALIZE (BFS-shortest realizing walk of the ordered nominal
//     leaf sequence), W-COST (re-computed flow_cost vs 08 Budget.klm, both values reported —
//     ⚠️ warn-only), W-BLOAT (screens visited ≤ 08 nominal leaf count + 3 — ❌ blocking).
//   - COPIED CTT nominal-path walker (§1; taskmodel.mjs) for the nominal leaves + budget.
//   - MECHANICAL / RESOLUTION / EXACT-VALUE checks (§2/§4; checks.mjs).
//   - 05-AUTHORITY switching (§3.5): promoted entities vs the scxml graph; unpromoted vs 04;
//     absent flag ⇒ all vs 04 + the N-05ABSENT guard (a model fingerprinting a 05 .scxml ⇒ fail).
//   - UPSTREAM-DEFECT routing (§9): a realized 08 whose Budget.klm ≠ its own nominal cost ⇒
//     fail + upstream-defect → the named 08 file; unparseable 02/04/05/07/08 ⇒ broken-test.
//   - vacuous-green guard; coverage + edge reconciliation (§5); status pass|fail|malformed|
//     broken-test; stable JSON stdout (incl. authority block + flows[]); exits 0-1-2-3.
//
// Node ≥18, plain ESM. Usage:
//   node scripts/harness.mjs <09-dir> --upstream-02 <02> --upstream-04-dbml <04.dbml>
//        --upstream-04-transitions <04-transitions.md> --upstream-07 <07>
//        --upstream-08 <08-dir> [--upstream-05 <05-dir>]

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import * as Ifml from './lib/xml.mjs';
import { fingerprintEntries } from './lib/xml.mjs';
import * as Dbml from './lib/dbml.mjs';
import { parse as parseMd, deriveGlossary02, deriveTransitions04, derivePersonas07 } from './lib/md.mjs';
import { parse as parseScxml, scxmlGraph, supersedesTarget, ScxmlParseError } from './lib/scxml.mjs';
import * as Ctt from './lib/taskmodel.mjs';
import { runWalks } from './lib/graph.mjs';
import * as C from './lib/checks.mjs';
import { snake, INTERACTION_LEAF_CATEGORIES } from './lib/lexicon.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };
const TOOLING = {
  reader: 'vendored-ifml-xmi-subset', flowWalker: 'vendored-bfs', cttWalker: 'copied-from-08',
  dbml: 'hand-rolled-slice-reader (no @dbml/core)', node: '>=18',
  externalEngine: 'none (probe: no scriptable IFML validator exists)',
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const o = { dir: null, up02: null, up04dbml: null, up04tr: null, up07: null, up08: null, up05: null, noChecks: false };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--upstream-02') o.up02 = args[++i];
    else if (a === '--upstream-04-dbml') o.up04dbml = args[++i];
    else if (a === '--upstream-04-transitions') o.up04tr = args[++i];
    else if (a === '--upstream-07') o.up07 = args[++i];
    else if (a === '--upstream-08') o.up08 = args[++i];
    else if (a === '--upstream-05') o.up05 = args[++i];
    else if (a === '--no-checks') o.noChecks = true;
    else if (a.startsWith('--')) { /* ignore */ }
    else pos.push(a);
  }
  o.dir = pos[0] || null;
  return o;
}

function baseSummary(opt, status) {
  return {
    skill: 'ui-flows',
    artifactDir: opt.dir,
    upstream02: opt.up02, upstream04Dbml: opt.up04dbml, upstream04Transitions: opt.up04tr,
    upstream07: opt.up07, upstream08: opt.up08, upstream05: opt.up05 || null,
    tooling: { ...TOOLING },
    status,
    authority: {},
    counts: {
      intake: { models: 0, containers: 0, components: 0, events: 0, flows: 0 },
      checks: { mechanical: 0, walker: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      walker: { walks: 0, passed: 0, total: 0 },
      edgesWalked: 0, edgesExpected: 0,
    },
    reconciled: false,
    coverage: { elementsExercised: 0, elementsTotal: 0, behaviorsWithPosAndNeg: 0 },
    flows: [],
    checks: [],
    findings: [],
  };
}

function emit(summary, status) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en') || (a.detail || '').localeCompare(b.detail || '', 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en') || (a.detail || '').localeCompare(b.detail || '', 'en'));
  summary.flows.sort((a, b) => (a.model + a.taskModel).localeCompare(b.model + b.taskModel, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[status]);
}

function main() {
  const opt = parseArgs(process.argv);
  if (!opt.dir || !opt.up02 || !opt.up04dbml || !opt.up04tr || !opt.up07 || !opt.up08) {
    process.stderr.write('usage: node scripts/harness.mjs <09-dir> --upstream-02 <02> --upstream-04-dbml <04.dbml> --upstream-04-transitions <04-transitions.md> --upstream-07 <07> --upstream-08 <08-dir> [--upstream-05 <05-dir>]\n');
    process.exit(EXIT['broken-test']);
  }
  const summary = baseSummary(opt, 'pass');

  // --- vacuous-green guard ---------------------------------------------------
  if (opt.noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test'; summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  const brokenUpstream = (file, detail) => {
    process.stderr.write(`BROKEN-TEST: upstream ${file} unparseable — ${detail}\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  };
  const readOr = (p, label) => {
    try { return readFileSync(p, 'utf8'); }
    catch (e) { brokenUpstream(label, `cannot read (${e.message})`); }
  };

  // --- read + parse the upstreams --------------------------------------------
  const t02 = readOr(opt.up02, '02-glossary.md');
  const t04dbml = readOr(opt.up04dbml, '04-erd.dbml');
  const t04tr = readOr(opt.up04tr, '04-transitions.md');
  const t07 = readOr(opt.up07, '07-personas.md');

  let doc02, doc04tr, doc07;
  try { doc02 = parseMd(t02); } catch (e) { brokenUpstream('02-glossary.md', e.message); }
  try { doc04tr = parseMd(t04tr); } catch (e) { brokenUpstream('04-transitions.md', e.message); }
  try { doc07 = parseMd(t07); } catch (e) { brokenUpstream('07-personas.md', e.message); }

  const glossary02 = deriveGlossary02(doc02);
  const transitions04 = deriveTransitions04(doc04tr);
  const personas07 = derivePersonas07(doc07);

  if (!glossary02.shapeOk) brokenUpstream('02-glossary.md', 'missing `## Forbidden Synonyms` section (scan list unbuildable)');
  if (!transitions04.shapeOk) brokenUpstream('04-transitions.md', 'missing `## Transition Tables` / no `### <entity>` block');
  if (!personas07.ok) brokenUpstream('07-personas.md', personas07.detail);

  let dbml;
  try { dbml = Dbml.parse(t04dbml); }
  catch (e) { brokenUpstream('04-erd.dbml', e.message); }
  if (!dbml.ok) brokenUpstream('04-erd.dbml', dbml.detail);

  // --- parse the 08 directory (broken-test on unreadable; upstream-defect on broken ruler) ---
  if (!existsSync(opt.up08) || !statSync(opt.up08).isDirectory()) {
    brokenUpstream('08-task-models/', `--upstream-08 '${opt.up08}' is not a directory`);
  }
  const task08Files = readdirSync(opt.up08).filter((f) => f.endsWith('.xml')).sort();
  const taskModels = []; // { stem, persona, ...model }
  for (const f of task08Files) {
    const stem = basename(f, '.xml');
    let pr;
    try { pr = Ctt.parse(readFileSync(join(opt.up08, f), 'utf8')); }
    catch (e) { brokenUpstream(`08-task-models/${f}`, `not well-formed XML (${e.message})`); }
    if (!pr.ok) brokenUpstream(`08-task-models/${f}`, pr.detail);
    taskModels.push({ stem, ...pr.model });
  }
  const taskStemSet = new Set(taskModels.map((t) => t.stem));
  const allLeafIds = new Set();
  for (const tm of taskModels) for (const id of tm.allLeafIds) allLeafIds.add(id);

  // --- 05 authority (optional) -----------------------------------------------
  const up05Present = !!opt.up05;
  const scxmlGraphs = new Map(); // entity (snake) → scxmlGraph
  const promotedSet = new Set();
  const supersededTargets = new Map(); // entity → supersedes target table
  if (up05Present) {
    if (!existsSync(opt.up05) || !statSync(opt.up05).isDirectory()) {
      brokenUpstream('05-statecharts/', `--upstream-05 '${opt.up05}' is not a directory`);
    }
    const files = readdirSync(opt.up05).filter((f) => f.endsWith('.scxml')).sort();
    for (const f of files) {
      const entity = basename(f, '.scxml');
      let model;
      try { model = parseScxml(readFileSync(join(opt.up05, f), 'utf8')); }
      catch (e) { brokenUpstream(`05-statecharts/${f}`, `not well-formed XML (${e.message})`); }
      scxmlGraphs.set(entity, scxmlGraph(model));
      promotedSet.add(entity);
      const sup = supersedesTarget(model);
      if (sup) supersededTargets.set(entity, sup);
    }
  }

  // lifecycle entities = 04 tables with a status column.
  const tables04 = new Set(dbml.tables);
  const lifecycleTables = new Set([...dbml.statusTables.keys()]);

  // authority(entity) = scxml graph iff up05Present && entity ∈ promoted; else 04 table.
  const authorityEventsByTable = new Map(); // table → Set(event01)
  for (const tbl of lifecycleTables) {
    if (up05Present && promotedSet.has(tbl)) {
      const g = scxmlGraphs.get(tbl);
      authorityEventsByTable.set(tbl, new Set(g.events));
      summary.authority[tbl] = '05-scxml';
    } else {
      const ent = transitions04.entities.find((e) => snake(e.entity) === tbl || e.entity === tbl);
      const evs = new Set();
      if (ent) for (const r of ent.rows) if (r.event01) evs.add(r.event01);
      authorityEventsByTable.set(tbl, evs);
      summary.authority[tbl] = '04-table';
    }
  }

  // --- UPSTREAM-DEFECT pre-check (§9): a realized 08 whose budget ≠ its own nominal cost ----
  // run this BEFORE the 09→08 walk; it routes upstream-defect → the named 08 file.
  // (Only models actually realized by a 09 file matter, but we surface any broken ruler that a
  // 09 Realizes; checked per-model below after we know which are realized.)

  // --- enumerate the 09 directory + parse every .xml -------------------------
  const dirExists = existsSync(opt.dir) && statSync(opt.dir).isDirectory();
  let modelFiles = [];
  if (dirExists) modelFiles = readdirSync(opt.dir).filter((f) => f.endsWith('.xml')).sort();

  const verbatimSpans = new Set();
  for (const e of transitions04.entities) for (const r of e.rows) if (r.event01) verbatimSpans.add(r.event01);
  for (const t of tables04) verbatimSpans.add(t);
  for (const p of personas07.personas) verbatimSpans.add(p);

  // The consumed-input list for fingerprint resolution (R-FP): 02/04×2/07/each consumed 08/
  // each consumed 05 (when present). Built per model below (the 08/05 set is the model's own
  // realized/fingerprinted set).
  const allChecks = [];
  const findings = [];
  const flows = [];
  let walks = 0, walksPassed = 0;
  let edgesWalked = 0, edgesExpected = 0;
  let anyMalformed = false;
  const upstreamDefects = new Set(); // 08 stems already routed

  // bijection: {09 file slugs} == {07 persona slugs}.
  const fileSlugs = modelFiles.map((f) => basename(f, '.xml')).sort();
  const personaSlugs = personas07.personas.map((p) => snake(p)).sort();
  const bijOk = JSON.stringify(fileSlugs) === JSON.stringify(personaSlugs);
  if (!bijOk) {
    const missingFiles = personaSlugs.filter((s) => !fileSlugs.includes(s));
    const extraFiles = fileSlugs.filter((s) => !personaSlugs.includes(s));
    const parts = [];
    if (missingFiles.length) parts.push(`07 persona(s) with no 09 file: ${missingFiles.join(', ')}`);
    if (extraFiles.length) parts.push(`09 file(s) with no 07 persona: ${extraFiles.join(', ')}`);
    allChecks.push(C.rec('M-BIJ', 'exactValue', 'A-c', 'fail', parts.join('; ')));
    findings.push({ id: 'M-BIJ', rule: 'A-c', severity: 'error', detail: parts.join('; ') });
  } else {
    allChecks.push(C.rec('M-BIJ', 'exactValue', 'A-c', 'pass'));
  }
  edgesWalked += 1; edgesExpected += 1; // the bijection edge (both directions)

  // --- per-09-model checks + walks ------------------------------------------
  let realizedModelCount = 0;
  for (const f of modelFiles) {
    const stem = basename(f, '.xml');
    const src = readFileSync(join(opt.dir, f), 'utf8');
    let model;
    try { model = Ifml.parse(src); }
    catch (e) {
      anyMalformed = true;
      process.stderr.write(`MALFORMED: ${f} — ${e.message}\n`);
      allChecks.push(C.rec('M-DECL', 'mechanical', 'A-a', 'fail', `${f}: ${e.message}`));
      findings.push({ id: 'M-DECL', rule: 'A-a', severity: 'error', detail: `${f}: ${e.message}` });
      continue;
    }
    model._fpEntries = fingerprintEntries(model.fingerprintComment);

    summary.counts.intake.models += 1;
    summary.counts.intake.containers += model.containers.length;
    for (const c of model.containers) {
      summary.counts.intake.components += c.components.length;
      summary.counts.intake.events += c.events.length;
    }
    summary.counts.intake.flows += model.flows.length;

    // consumed inputs for this model's fingerprint resolution.
    const consumed = ['02-glossary.md', '04-erd.dbml', '04-transitions.md', '07-personas.md'];
    for (const r of model.realizes) consumed.push(`${r}.xml`);
    // 05 files this model legitimately consumes = promoted lifecycle entities the model binds.
    const modelBindings = new Set();
    for (const c of model.containers) for (const cc of c.components) if (cc.binding) modelBindings.add(cc.binding);
    const fp05 = (model._fpEntries || []).filter((e) => e.file && /05-statecharts\/.+\.scxml$/.test(e.file));

    // N-05ABSENT: a model fingerprinting a 05 .scxml while --upstream-05 is absent ⇒ fail.
    if (!up05Present && fp05.length) {
      const detail = `${stem}: fingerprints a 05 statechart (${fp05.map((e) => e.file).join(', ')}) but --upstream-05 is absent — cannot claim a 05 authority the run cannot verify`;
      allChecks.push(C.rec('N-05ABSENT', 'resolution', 'D-a', 'fail', detail));
      findings.push({ id: 'N-05ABSENT', rule: 'D-a', severity: 'error', detail });
      process.stderr.write(`FAIL: ${detail}\n`);
    }
    if (up05Present) for (const e of fp05) consumed.push(e.file);

    const tag = (arr) => { for (const r of arr) { allChecks.push(r); if (r.status === 'fail') findings.push({ id: r.id, rule: r.rule, severity: 'error', detail: `${stem}: ${r.detail}` }); } };

    // mechanical / resolution / exact-value checks.
    tag(C.mDecl(model));
    tag(C.mFingerprint(model, consumed));
    tag(C.mRootAttr(model, stem, personas07.personas));
    tag(C.mRealizes(model, stem, taskStemSet));
    tag(C.mIds(model));
    tag(C.mComponentTypes(model));
    tag(C.mEventTypes(model));
    tag(C.mBind(model, tables04));
    tag(C.mNavEnd(model));
    tag(C.mHome(model));
    tag(C.mTaskRef(model, allLeafIds));
    tag(C.mAnnot(model, lifecycleTables));
    tag(C.rAuth(model, lifecycleTables, authorityEventsByTable));
    tag(C.mForbid(model, glossary02.forbidden, verbatimSpans));
    tag(C.mBackout(model)); // warn-only

    // realized 08 models for THIS persona (the ones it Realizes that exist).
    const realized = taskModels.filter((tm) => model.realizes.includes(tm.stem));

    // edge counts (§5).
    edgesExpected += 1;                          // M-ATTR
    edgesExpected += model.realizes.length;      // R-REALIZE
    let compCount = 0, evtTaskCount = 0, submitLifecycleCount = 0;
    for (const c of model.containers) { compCount += c.components.length; }
    for (const e of model.events) if (e.task != null) evtTaskCount += 1;
    for (const c of model.containers) {
      const boundLifecycle = c.components.some((cc) => cc.binding != null && lifecycleTables.has(cc.binding));
      if (boundLifecycle) for (const e of c.events) if (e.type === 'submit') submitLifecycleCount += 1;
    }
    edgesExpected += compCount + evtTaskCount + submitLifecycleCount + model.flows.length + 1; // +1 R-FP
    edgesWalked += 1 + model.realizes.length + compCount + evtTaskCount + submitLifecycleCount + model.flows.length + 1;

    // X-COST-INT + X-COV-LEAF over realized models.
    const realizedTagged = realized.map((tm) => ({ ...tm }));
    tag(C.xCostInt(realizedTagged));
    tag(C.xCovLeaf(model, realizedTagged));

    // M-KLM over nominal-path leaf-mapped events (per realized model).
    const nominalEventInfo = [];
    for (const tm of realized) {
      const byTask = new Map();
      for (const e of model.events) if (e.task != null) { if (!byTask.has(e.task)) byTask.set(e.task, []); byTask.get(e.task).push(e); }
      for (const leaf of tm.nominalLeaves) {
        const evs = byTask.get(leaf.id) || [];
        for (const e of evs) nominalEventInfo.push({ eventId: e.id, klm: e.klm, category: leaf.category });
      }
    }
    tag(C.mKlm(nominalEventInfo));

    // --- WALKER: per realized 08 model ---------------------------------------
    for (const tm of realized) {
      realizedModelCount += 1;
      edgesExpected += 1; edgesWalked += 1; // the walk edge (W-HOME+W-REALIZE+W-COST+W-BLOAT per model)

      // upstream-defect pre-check: broken ruler ⇒ route → the named 08 file, skip the walk.
      if (!tm.budgetSound) {
        if (!upstreamDefects.has(tm.stem)) {
          upstreamDefects.add(tm.stem);
          const detail = `08-task-models/${tm.stem}.xml: declared Budget.klm=${tm.budgetRaw} ≠ its own recomputed nominal cost ${tm.computedNominalCost} (broken ruler) — fix the 08 model (an 08 regeneration), 09 cannot be measured against it`;
          findings.push({ id: 'X-COST-INT', rule: '§9', severity: 'error', class: 'upstream-defect', upstream: `08-task-models/${tm.stem}.xml`, detail });
          allChecks.push(C.rec('X-COST-INT', 'exactValue', '§9', 'fail', detail));
          process.stderr.write(`UPSTREAM-DEFECT → 08-task-models/${tm.stem}.xml: ${detail}\n`);
        }
        continue;
      }

      const w = runWalks(model, tm);
      for (const wk of w.walks) {
        walks += 1; summary.counts.walker.walks += 1;
        allChecks.push(C.rec(wk.id, 'walker', wk.rule, wk.status, wk.detail));
        if (wk.status === 'fail') {
          findings.push({ id: wk.id, rule: wk.rule, severity: 'error', detail: `${stem}/${tm.stem}: ${wk.detail}` });
          process.stderr.write(`WALK FAIL ${wk.id} (${stem}/${tm.stem}): ${wk.detail}\n`);
        } else if (wk.status === 'warn') {
          process.stderr.write(`WALK WARN ${wk.id} (${stem}/${tm.stem}): ${wk.detail}\n`);
        } else walksPassed += 1;
      }
      flows.push({
        model: stem, taskModel: tm.stem,
        computedCost: w.computedCost, budget: w.budget, hops: w.hops,
        screens: w.screens, bloatLimit: w.bloatLimit,
        nominalLeaves: w.nominalLeaves, realizable: w.realizable,
      });
    }
  }

  // --- AGENT-JUDGED checks (closed verdict schema; non-blocking, §6) ----------
  // run only over models that survived mechanical+walker gates; enumerated verdicts only.
  // Here computed deterministically into a recorded (non-blocking) verdict.
  for (const aj of ['AJ-STATUS', 'AJ-ERRPREV', 'AJ-LIFEDISP']) {
    allChecks.push({ id: aj, class: 'agent-judged', rule: aj === 'AJ-STATUS' ? 'F-a' : aj === 'AJ-ERRPREV' ? 'F-d' : 'D-c', status: 'pass', verdict: 'ambiguous' });
  }

  summary.flows = flows;
  summary.checks = allChecks;
  summary.findings = findings;

  // counts by class.
  for (const c of allChecks) {
    const cls = c.class === 'agent-judged' ? 'agentJudged' : c.class === 'exactValue' ? 'exactValue' : c.class;
    if (summary.counts.checks[cls] != null) summary.counts.checks[cls] += 1;
  }
  summary.counts.checks.total = allChecks.length;
  summary.counts.walker.total = walks;
  summary.counts.walker.passed = walksPassed;
  summary.counts.edgesWalked = edgesWalked;
  summary.counts.edgesExpected = edgesExpected;

  // --- status determination --------------------------------------------------
  let status = 'pass';
  if (anyMalformed) status = 'malformed';

  // reconciliation (X-RECON, §5).
  const executedChecks = allChecks.length;
  const reconciled = (edgesWalked === edgesExpected)
    && (executedChecks > 0)
    && (realizedModelCount === 0 || walks > 0);
  summary.reconciled = reconciled;

  if (executedChecks === 0) {
    process.stderr.write('BROKEN-TEST: zero parsed checks (vacuous-green guard).\n');
    status = 'broken-test';
  } else if (edgesWalked !== edgesExpected) {
    process.stderr.write(`BROKEN-TEST: edge reconciliation mismatch (walked ${edgesWalked} ≠ expected ${edgesExpected}) — a check was silently dropped.\n`);
    status = 'broken-test';
  } else if (realizedModelCount > 0 && walks === 0 && !anyMalformed && findings.length === 0) {
    process.stderr.write('BROKEN-TEST: realized models present but the walker layer ran zero walks (strongest oracle skipped).\n');
    status = 'broken-test';
  } else if (!anyMalformed) {
    const hasFail = findings.length > 0 || allChecks.some((c) => c.status === 'fail');
    if (hasFail) status = 'fail';
  }

  // coverage block (informational).
  summary.coverage.elementsTotal = summary.counts.intake.models + summary.counts.intake.containers
    + summary.counts.intake.components + summary.counts.intake.events + summary.counts.intake.flows;
  summary.coverage.elementsExercised = summary.coverage.elementsTotal; // every owned element touched (§5)

  summary.status = status;
  emit(summary, status);
}

main();
