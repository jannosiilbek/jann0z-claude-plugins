#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for artifact 08 (the directory artifact
// `specs/08-task-models/` holding one `<snake(persona)>-<snake(job)>.xml` ConcurTaskTrees
// task model per 07 persona-job — a bijection with the 07 jobs-to-be-done rows). Validated
// against TWO upstreams: `specs/06-gherkin/` (.feature tag vocabulary) and
// `specs/07-personas.md` (the persona × jobs bijection). Implements
// references/simulation.md EXACTLY:
//   - STRONGEST-ORACLE WALKER (§3.3): every tree is LOADED + WALKED on the vendored
//     Rec-faithful CTT walker; reachability/termination/step-legality + the declared==
//     computed nominal-path KLM budget asserted (W-LOAD/W-REACH/W-STEP/W-TERM/W-BUDGET).
//   - HAND-ROLLED MECHANICAL READER over the pinned XML dialect (M1–M29).
//   - minimal 06 TAG-SCANNER (no Gherkin parser) for E4/E5 resolution + the bad-tag-06
//     upstream-defect precheck.
//   - upstream-defect routing (§9): dup (persona,job) in 07 → 07-personas.md; bad 06 tag
//     grammar → the named .feature; unparseable 06/07 ⇒ broken-test.
//   - status taxonomy pass|fail|malformed|broken-test; stable JSON stdout; exits 0-1-2-3.
//   - coverage + edge reconciliation (§5) incl. the walker-non-empty guard; vacuous guard.
//
// Node ≥18, plain ESM, zero external deps.
// Usage:
//   node scripts/harness.mjs <08-dir> --upstream-06 <06-dir> --upstream-07 <07-personas.md> [--no-checks]

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseXml, fingerprintEntries, ParseError } from './lib/xml.mjs';
import { parse as parseMd, derivePersonaJobs07 } from './lib/md.mjs';
import { scanDir } from './lib/tags.mjs';
import * as W from './lib/walker.mjs';
import * as C from './lib/checks.mjs';
import * as L from './lib/lexicon.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };
const TOOLING = { walker: 'vendored-rec-faithful-ctt', node: '>=18', externalEngine: 'none (probe: no scriptable CTT engine exists)' };

// Agent-judged (simulation.md §6): recorded with a pass-verdict placeholder; never block,
// never feed reconciliation. A real agent run replaces the verdict.
const AJ_DEFS = [
  { id: 'AJ1', rule: 'C5', verdict: 'order-matches-transitions' },
  { id: 'AJ2', rule: 'B3', verdict: 'refines-with-detail' },
  { id: 'AJ3', rule: 'C6', verdict: 'concurrency-justified-and-W-intended' },
  { id: 'AJ4', rule: 'F4', verdict: 'single-job' },
];

const N_BEHAVIORS = 30; // simulation.md §5/§closing table (all 30 ❌ rules, pos+neg)

function parseArgs(argv) {
  const args = argv.slice(2);
  const o = { dir: null, up06: null, up07: null, noChecks: false };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--upstream-06') o.up06 = args[++i];
    else if (a === '--upstream-07') o.up07 = args[++i];
    else if (a === '--no-checks') o.noChecks = true;
    else if (a.startsWith('--')) { /* ignore */ }
    else pos.push(a);
  }
  o.dir = pos[0] || null;
  return o;
}

function baseSummary(opt, status) {
  return {
    skill: 'task-models',
    artifactDir: opt.dir,
    upstream06: opt.up06,
    upstream07: opt.up07,
    tooling: { ...TOOLING },
    status,
    counts: {
      intake: { models: 0, tasks: 0, leaves: 0, tags: 0, budgets: 0 },
      checks: { mechanical: 0, walker: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      walker: { walks: 0, passed: 0, total: 0 },
      edgesWalked: 0,
      edgesExpected: 0,
    },
    reconciled: false,
    coverage: { elementsExercised: 0, elementsTotal: 0, behaviorsWithPosAndNeg: N_BEHAVIORS },
    budgets: [],
    checks: [],
    findings: [],
  };
}

function emit(summary, status) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.budgets.sort((a, b) => a.model.localeCompare(b.model, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[status]);
}

function main() {
  const opt = parseArgs(process.argv);
  if (!opt.dir || !opt.up06 || !opt.up07) {
    process.stderr.write('usage: node scripts/harness.mjs <08-dir> --upstream-06 <06-dir> --upstream-07 <07-personas.md>\n');
    process.exit(EXIT['broken-test']);
  }
  const summary = baseSummary(opt, 'pass');

  // --- vacuous-green guard ---------------------------------------------------
  if (opt.noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test'; summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  // --- read + parse 07 -------------------------------------------------------
  let text07;
  try { text07 = readFileSync(opt.up07, 'utf8'); }
  catch (e) { brokenUpstream('07-personas.md', `cannot read (${e.message})`); }
  let doc07;
  try { doc07 = parseMd(text07); }
  catch (e) { brokenUpstream('07-personas.md', e.message); }
  const pj07 = derivePersonaJobs07(doc07);
  if (!pj07.ok) brokenUpstream('07-personas.md', pj07.detail);
  const personaJobs07 = pj07.personaJobs;

  // --- read + scan 06 dir ----------------------------------------------------
  if (!existsSync(opt.up06) || !statSync(opt.up06).isDirectory()) {
    brokenUpstream('06-gherkin/', `not a directory (${opt.up06})`);
  }
  const featureFiles = readdirSync(opt.up06).filter((f) => f.endsWith('.feature')).sort();
  const features = featureFiles.map((name) => ({ name, text: readFileSync(join(opt.up06, name), 'utf8') }));
  const scan = scanDir(features);
  if (!scan.ok) brokenUpstream(`06-gherkin/${scan.unscannable[0]}`, 'unscannable — no Scenario keyword to anchor the tag set');

  // --- §9 upstream self-checks (BEFORE 08→upstream resolution) ---------------
  const self07 = C.upstream07SelfCheck(personaJobs07);
  const self06 = C.upstream06SelfCheck(scan);

  const findings = [];
  const checks = [];
  let mechanicalRun = 0, walkerRun = 0, resolutionRun = 0, exactValueRun = 0, ajRun = 0;
  let edgesWalked = 0;
  const pushCheck = (cls, r) => { checks.push({ id: r.id, class: cls, rule: r.rule, status: r.status }); if (r.edges) edgesWalked += r.edges; };
  const fail = (r, extra = {}) => { findings.push({ id: r.id, rule: r.rule, severity: 'error', detail: r.detail, ...extra }); if (r.detail) process.stderr.write(`FAIL [${r.id}/${r.rule}]: ${r.detail}\n`); };
  const warnInfo = (r) => { if (r.detail) findings.push({ id: r.id, rule: r.rule, severity: r.status === 'warn' ? 'warn' : 'info', detail: r.detail }); };

  // upstream-defect: dup (persona,job) in 07 → 07-personas.md.
  let upstreamDefect = false;
  if (!self07.ok) {
    upstreamDefect = true;
    const d = self07.defects[0];
    checks.push({ id: 'M-BIJ', class: 'exactValue', rule: 'E1', status: 'fail' });
    exactValueRun++; edgesWalked += 1;
    findings.push({
      id: 'M-BIJ', rule: 'E1', severity: 'error', class: 'upstream-defect', upstream: '07-personas.md',
      detail: `07 declares duplicate (${d.persona}, ${d.job}) — filename collision on '${d.slug}' (fix upstream in 07-personas.md, not 08)`,
    });
    process.stderr.write(`UPSTREAM-DEFECT [M-BIJ/E1]: duplicate (${d.persona}, ${d.job}) → route to 07-personas.md\n`);
  }
  // upstream-defect: bad 06 tag grammar → the named .feature.
  if (!self06.ok) {
    upstreamDefect = true;
    const d = self06.defects[0];
    checks.push({ id: 'M22', class: 'mechanical', rule: 'E5', status: 'fail' });
    mechanicalRun++;
    findings.push({
      id: 'M22', rule: 'E5', severity: 'error', class: 'upstream-defect', upstream: d.feature,
      detail: `06 feature '${d.feature}' carries tag '${d.tag}' matching no closed grammar class (fix upstream in ${d.feature}, not 08)`,
    });
    process.stderr.write(`UPSTREAM-DEFECT [M22/E5]: bad tag '${d.tag}' in ${d.feature} → route to ${d.feature}\n`);
  }

  // ===========================================================================
  // Enumerate the 08 directory.
  // ===========================================================================
  const dirExists = existsSync(opt.dir) && statSync(opt.dir).isDirectory();
  const xmlFiles = dirExists ? readdirSync(opt.dir).filter((f) => f.endsWith('.xml')).sort() : [];

  // Parse each model file (malformed gate M1 / well-formedness + declaration).
  const models = []; // {file, stem, xmlModel, model}
  for (const f of xmlFiles) {
    const stem = basename(f, '.xml');
    const docString = readFileSync(join(opt.dir, f), 'utf8');
    let xmlModel;
    try { xmlModel = parseXml(docString); }
    catch (e) {
      process.stderr.write(`MALFORMED [M1/A1]: ${f} — ${e.message}\n`);
      summary.status = 'malformed';
      summary.checks = [{ id: 'M1', class: 'mechanical', rule: 'A1', status: 'fail' }];
      summary.findings = [{ id: 'M1', rule: 'A1', severity: 'error', detail: `${f}: ${e.message}` }];
      summary.counts.checks = { mechanical: 1, walker: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 1 };
      emit(summary, 'malformed');
    }
    if (!xmlModel.firstLineIsDecl) {
      process.stderr.write(`MALFORMED [M1/A1]: ${f} — missing/!= '<?xml version="1.0" encoding="UTF-8"?>' as first line\n`);
      summary.status = 'malformed';
      summary.checks = [{ id: 'M1', class: 'mechanical', rule: 'A1', status: 'fail' }];
      summary.findings = [{ id: 'M1', rule: 'A1', severity: 'error', detail: `${f}: missing XML declaration as first line` }];
      summary.counts.checks = { mechanical: 1, walker: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 1 };
      emit(summary, 'malformed');
    }
    xmlModel._fpEntries = fingerprintEntries(xmlModel.fingerprintComment);
    const model = W.buildModel(xmlModel);
    models.push({ file: f, stem, xmlModel, model });
  }

  // M-BIJ — file↔07 bijection (skip if already routed as a 07 upstream-defect).
  if (!self07.ok) {
    // already recorded above
  } else {
    const fileSlugs = models.map((m) => m.stem);
    const mbij = C.checkMBij(fileSlugs, personaJobs07);
    pushCheck('exactValue', mbij); exactValueRun++;
    if (mbij.status === 'fail') fail(mbij);
  }

  // ===========================================================================
  // Per-model battery.
  // ===========================================================================
  const fingerprintedAll = new Set();
  for (const mc of models) {
    const { stem, xmlModel, model } = mc;
    for (const e of xmlModel._fpEntries) if (e.file) fingerprintedAll.add(e.file);

    // Anchor guard (A3 / M3): if the tree cannot be anchored as a <TaskModel> (root element
    // is not <TaskModel>), no per-task/leaf/walker check is meaningful. M3 is the A3 owner
    // and the ❌ that "prevents anchoring a tree" (simulation.md §2). Emit M3 fail and skip
    // the rest of this model's battery (no crash on the absent tasks[]/leaves[]).
    if (model.ok === false) {
      pushM(C.bad('M3', 'A3', `root element is not <TaskModel> (${model.detail})`));
      continue;
    }

    const referencedFeatures = computeReferencedFeatures(model, scan);

    // M-M2 fingerprint, M3..M24 structural/dialect/klm/seam-grammar.
    const m3 = C.checkM3(model); pushM(m3);
    const m4 = C.checkM4(model, stem); pushM(m4);
    const m5 = C.checkM5(xmlModel, model); pushM(m5);
    const m6 = C.checkM6(model); pushM(m6);
    const m7 = C.checkM7(model); pushM(m7);
    const m8 = C.checkM8(xmlModel, model); pushM(m8);
    const m9 = C.checkM9(model); pushM(m9);
    const m10 = C.checkM10(model); pushM(m10);
    const m11 = C.checkM11(model); pushM(m11);
    const m12 = C.checkM12(model); pushM(m12);
    const m13 = C.checkM13(model); pushM(m13);
    const m14 = C.checkM14(model); pushM(m14);
    const m15 = C.checkM15(model); pushM(m15);
    const m16 = C.checkM16(model); pushM(m16);
    const m17 = C.checkM17(model); pushM(m17);
    const m18 = C.checkM18(model); pushM(m18);
    const m19 = C.checkM19(model); pushM(m19);
    const m20 = C.checkM20(model); pushM(m20);
    const m21 = C.checkM21(model); pushM(m21);
    // M22 grammar (only if not already a 06 upstream-defect owner).
    if (self06.ok) { const m22 = C.checkM22(model); pushM(m22); }
    const m23 = C.checkM23(xmlModel, model); pushM(m23);
    const m24 = C.checkM24(model); pushM(m24);
    const m2 = C.checkM2(xmlModel, referencedFeatures); pushM(m2);

    // warn/info advisories
    const scForJob = referencedFeatures.reduce((n, f) => n + (scan.featureScenarioCount06.get(f) || 0), 0);
    pushMwarn(C.checkM25(model));
    pushMwarn(C.checkM26(model, scForJob));
    pushMwarn(C.checkM27(model));
    pushMwarn(C.checkM28(model));
    pushMwarn(C.checkM29());

    // exact-value
    const xid = C.checkXId(model); pushX(xid);
    const xbi = C.checkXBudgetInt(model); pushX(xbi);
    const mattr = C.checkMAttr(model, personaJobs07); pushCheck('exactValue', mattr); exactValueRun++; if (mattr.status === 'fail') fail(mattr);

    // resolution
    const rtag = C.checkRTag(model, scan.tags06); pushCheck('resolution', rtag); resolutionRun++; if (rtag.status === 'fail') fail(rtag);
    const rfp = C.checkRFp(xmlModel, referencedFeatures, new Set(xmlModel._fpEntries.map((e) => e.file).filter(Boolean))); pushCheck('resolution', rfp); resolutionRun++; if (rfp.status === 'warn') warnInfo(rfp);

    // ----- WALKER RUN (the strongest oracle) -----
    const wr = W.run(model);
    for (const w of wr.walks) {
      checks.push({ id: w.id, class: 'walker', rule: w.rule, status: w.status });
      walkerRun++;
      summary.counts.walker.total++;
      if (w.status === 'pass') summary.counts.walker.passed++;
      if (w.status === 'fail') fail({ id: w.id, rule: w.rule, detail: `${mc.file}: ${w.detail}` });
    }
    summary.counts.walker.walks++;
    // edges: W-REACH one per leaf; W-STEP one per nominal leaf; W-LOAD/W-TERM/W-BUDGET 1 each per model.
    edgesWalked += model.leaves.length /*W-REACH*/ + wr.nominalLeaves /*W-STEP*/ + 3 /*W-LOAD,W-TERM,W-BUDGET*/;

    summary.budgets.push({
      model: stem,
      declared: wr.declaredBudget,
      computed: wr.computedBudget,
      nominalLeaves: wr.nominalLeaves,
    });

    function pushM(r) { pushCheck('mechanical', r); mechanicalRun++; if (r.status === 'fail') fail(r); }
    function pushMwarn(r) { checks.push({ id: r.id, class: 'mechanical', rule: r.rule, status: r.status === 'fail' ? 'fail' : (r.status === 'pass' ? 'pass' : 'warn') }); mechanicalRun++; if (r.status === 'warn' || r.status === 'info') warnInfo(r); }
    function pushX(r) { pushCheck('exactValue', r); exactValueRun++; if (r.status === 'fail') fail(r); }
  }

  // --- agent-judged (recorded, never block, not reconciled) ------------------
  for (const aj of AJ_DEFS) {
    checks.push({ id: aj.id, class: 'agent-judged', rule: aj.rule, verdict: aj.verdict });
    ajRun++;
  }

  // --- edges expected (§5) ---------------------------------------------------
  // Mirror edgesWalked exactly. M-BIJ contributes one edge in BOTH the sound and the
  // 07-upstream-defect path (the defect branch records M-BIJ with edges=1 too), and the
  // per-model battery (M-ATTR/R-TAG/R-FP + the walker) runs over every parsed model
  // regardless — a 07 self-defect routes M-BIJ but does not suppress per-model resolution.
  let edgesExpected = 1; // M-BIJ (one edge, both ways)
  for (const mc of models) {
    const { model } = mc;
    if (model.ok === false) continue; // un-anchored model (A3): no per-model/walker edges ran
    const referencedFeatures = computeReferencedFeatures(model, scan);
    let tagTokens = 0;
    for (const l of model.leaves) tagTokens += l.scenarioTags.length;
    edgesExpected += 1 /*M-ATTR*/ + tagTokens /*R-TAG*/ + referencedFeatures.length /*R-FP*/
      + model.leaves.length /*W-REACH*/ + W.nominalPathLeaves(model).length /*W-STEP*/ + 3 /*W-LOAD/W-TERM/W-BUDGET*/;
  }

  // --- counts + reconciliation ----------------------------------------------
  summary.counts.intake = C.intakeCounts(models.map((m) => m.model));
  summary.counts.edgesWalked = edgesWalked;
  summary.counts.edgesExpected = edgesExpected;
  summary.counts.checks = {
    mechanical: mechanicalRun, walker: walkerRun, resolution: resolutionRun,
    exactValue: exactValueRun, negative: 0, agentJudged: ajRun,
    total: mechanicalRun + walkerRun + resolutionRun + exactValueRun + ajRun,
  };
  summary.coverage.elementsTotal = summary.counts.intake.models + summary.counts.intake.tasks + summary.counts.intake.leaves + summary.counts.intake.tags;
  summary.coverage.elementsExercised = summary.coverage.elementsTotal;

  summary.checks = checks;
  summary.findings = findings;

  if (summary.counts.checks.total === 0) {
    summary.status = 'broken-test';
    process.stderr.write('BROKEN-TEST: zero checks executed.\n');
    emit(summary, 'broken-test');
  }

  const recon = C.checkXRecon(summary.counts.checks.total, edgesWalked, edgesExpected, walkerRun, models.length);
  checks.push({ id: 'X-RECON', class: 'exactValue', rule: 'reconciliation', status: recon.status === 'pass' ? 'pass' : 'fail' });
  summary.counts.checks.exactValue++; summary.counts.checks.total++;
  if (recon.status !== 'pass') {
    summary.status = 'broken-test';
    process.stderr.write(`BROKEN-TEST [X-RECON]: ${recon.detail}\n`);
    emit(summary, 'broken-test');
  }
  // walker-non-empty guard: a pass with models>0 must have walked.
  if (models.length > 0 && walkerRun === 0) {
    summary.status = 'broken-test';
    process.stderr.write('BROKEN-TEST: walker layer ran zero walks over a non-empty artifact.\n');
    emit(summary, 'broken-test');
  }
  summary.reconciled = true;

  if (findings.some((f) => f.severity === 'error')) { summary.status = 'fail'; emit(summary, 'fail'); }
  summary.status = 'pass';
  emit(summary, 'pass');

  // --- helpers ---------------------------------------------------------------
  function brokenUpstream(file, detail) {
    process.stderr.write(`BROKEN-TEST: upstream ${file} unparseable — ${detail}\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  }
}

// The 06 features a model references (by some scenario-tags token resolving into them).
function computeReferencedFeatures(model, scan) {
  const feats = new Set();
  for (const l of model.leaves) {
    for (const tag of l.scenarioTags) {
      const owners = scan.tagFile06.get(tag);
      if (owners) for (const f of owners) feats.add(f);
    }
  }
  return [...feats].sort();
}

main();
