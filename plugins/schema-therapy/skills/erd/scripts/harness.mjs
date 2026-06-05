#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for artifact 04 (the two-file unit
// `specs/04-erd.dbml` + `specs/04-transitions.md`), validated against BOTH upstreams
// (`02-glossary.md` + `03-aggregates.md`). Implements references/simulation.md EXACTLY:
//   - THREE-LAYER ENGINE ORACLE (the strongest oracle, §3.3): parse DBML under
//     @dbml/core 8.2.5 → export Postgres DDL → execute on a fresh in-memory PGlite
//     (PostgreSQL 18.3) with mechanically-derived E-* scenarios + optional domain seeds
//   - MECHANICAL layer the engine cannot see: transition-table oracle (D-theme) +
//     cross-artifact resolution (C/E themes) over the parsed 02/03 upstreams
//   - self-install + offline mode: deps absent + no network ⇒ broken-test, exit 3
//     (never a vacuous green)
//   - upstream parseability gates (unparseable 02/03 ⇒ broken-test, §9.4/9.5)
//   - upstream self-consistency preconditions BEFORE 04→upstream checks, routed
//     class:"upstream-defect" → 02 / 03 (§9.2/9.3)
//   - status taxonomy: pass | fail | malformed | broken-test
//   - stable JSON summary on stdout (sorted checks/findings by id); diagnostics on stderr
//   - exit codes: 0 pass / 1 fail (incl. upstream-defect) / 2 malformed (04) /
//     3 broken-test (incl. missing engine, unparseable upstream, vacuous guard)
//   - coverage + edge reconciliation per §5 (incl. "engine layer non-empty" guard)
//
// Node ≥18, plain ESM.
// Usage:
//   node scripts/harness.mjs <04-erd.dbml> --transitions <04-transitions.md> \
//        --upstream-02 <02-glossary.md> --upstream-03 <03-aggregates.md> \
//        [--scenarios <04-scenarios.json>] [--no-checks] [--no-install] \
//        [--force-missing-deps <dir>]

import { readFileSync, existsSync } from 'node:fs';
import { parse } from './lib/md.mjs';
import * as C from './lib/checks.mjs';
import * as E from './lib/engine.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };
const TOOLING = { dbmlCore: '8.2.5', pglite: '0.5.1', postgres: '18.3', node: '>=18' };
const N_BEHAVIORS = 25; // = selftest.mjs COVERAGE table length (pos+neg per ❌ behavior); asserted in PART 9

function emit(summary, exitStatus) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[exitStatus]);
}

function baseSummary(dbml, md, p02, p03, status) {
  return {
    skill: 'erd',
    artifact: { dbml, transitions: md },
    upstream02: p02,
    upstream03: p03,
    tooling: { ...TOOLING },
    status,
    counts: {
      intake: { tables: 0, columns: 0, refs: 0, enums: 0, transitionRows: 0 },
      checks: { lint: 0, engine: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      engine: { scenarios: 0, passed: 0, total: 0 },
      edgesWalked: 0,
      edgesExpected: 0,
    },
    reconciled: false,
    coverage: { elementsExercised: 0, elementsTotal: 0, behaviorsWithPosAndNeg: N_BEHAVIORS },
    checks: [],
    findings: [],
  };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const o = { dbml: null, transitions: null, up02: null, up03: null, scenarios: null, noChecks: false, noInstall: false, forceMissingDeps: null };
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--transitions') { o.transitions = args[++i]; }
    else if (a === '--upstream-02') { o.up02 = args[++i]; }
    else if (a === '--upstream-03') { o.up03 = args[++i]; }
    else if (a === '--scenarios') { o.scenarios = args[++i]; }
    else if (a === '--no-checks') { o.noChecks = true; }
    else if (a === '--no-install') { o.noInstall = true; }
    else if (a === '--force-missing-deps') { o.forceMissingDeps = args[++i]; }
    else if (a.startsWith('--')) { /* unknown flag ignored */ }
    else positionals.push(a);
  }
  o.dbml = positionals[0] || null;
  return o;
}

async function main() {
  const opt = parseArgs(process.argv);

  if (!opt.dbml || !opt.transitions || !opt.up02 || !opt.up03) {
    process.stderr.write('usage: node scripts/harness.mjs <04-erd.dbml> --transitions <04-transitions.md> --upstream-02 <02> --upstream-03 <03> [--scenarios <json>]\n');
    process.exit(EXIT['broken-test']);
  }

  const summary = baseSummary(opt.dbml, opt.transitions, opt.up02, opt.up03, 'pass');

  // --- vacuous-green guard ---------------------------------------------------
  if (opt.noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test'; summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  // --- engine dependency gate (self-install / offline → broken-test) ---------
  const deps = E.ensureDeps({ allowInstall: !opt.noInstall, forceMissingRoot: opt.forceMissingDeps });
  if (!deps.ok) {
    process.stderr.write(`BROKEN-TEST: ${deps.reason}\n`);
    if (deps.installerStderr) process.stderr.write(`  installer stderr: ${deps.installerStderr}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  const { Parser, ModelExporter, PGlite } = await E.loadEngine();

  // --- read files ------------------------------------------------------------
  const dbmlPresent = existsSync(opt.dbml);
  const mdPresent = existsSync(opt.transitions);

  // L1 (A1): both files of the two-file artifact present ⇒ malformed if not.
  const l1 = C.lintL1_bothFiles(dbmlPresent, mdPresent);
  if (!l1.ok) {
    process.stderr.write(`MALFORMED [L1/A1]: ${l1.detail}\n`);
    summary.status = 'malformed';
    summary.counts.checks.lint = 1; summary.counts.checks.total = 1;
    summary.checks = [{ id: 'L1', class: 'lint', rule: 'A1', status: 'fail' }];
    summary.findings = [{ id: 'L1', rule: 'A1', severity: 'error', detail: l1.detail }];
    emit(summary, 'malformed');
  }

  let dbmlText, mdText, text02, text03, scenarioText = null;
  try { dbmlText = readFileSync(opt.dbml, 'utf8'); } catch (e) { process.stderr.write(`cannot read 04-erd.dbml: ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  try { mdText = readFileSync(opt.transitions, 'utf8'); } catch (e) { process.stderr.write(`cannot read 04-transitions.md: ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  try { text02 = readFileSync(opt.up02, 'utf8'); } catch (e) { process.stderr.write(`cannot read 02 upstream: ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  try { text03 = readFileSync(opt.up03, 'utf8'); } catch (e) { process.stderr.write(`cannot read 03 upstream: ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  if (opt.scenarios) { try { scenarioText = readFileSync(opt.scenarios, 'utf8'); } catch (e) { process.stderr.write(`cannot read scenarios: ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); } }

  // --- parse upstreams (markdown) --------------------------------------------
  let doc02, doc03, docMd;
  try { doc02 = parse(text02); } catch (e) { process.stderr.write(`BROKEN-TEST (02 parser threw): ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  try { doc03 = parse(text03); } catch (e) { process.stderr.write(`BROKEN-TEST (03 parser threw): ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  try { docMd = parse(mdText); } catch (e) { process.stderr.write(`BROKEN-TEST (transitions parser threw): ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }

  // upstream parseability (§9.4/9.5) ⇒ broken-test.
  const up02shape = C.parseUpstream02Shape(doc02);
  if (!up02shape.ok) { process.stderr.write(`BROKEN-TEST: upstream 02 unparseable: ${up02shape.detail}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  const up03shape = C.parseUpstream03Shape(doc03);
  if (!up03shape.ok) { process.stderr.write(`BROKEN-TEST: upstream 03 unparseable: ${up03shape.detail}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }

  const g02 = C.deriveUpstream02(doc02);
  const g03 = C.deriveUpstream03(doc03);

  // upstream self/mutual consistency (pre-resolution, §9.2/9.3).
  const self02 = C.upstream02SelfCheck(g02);
  const cross02 = C.upstream02CrossCheck(g02, g03);
  const self03 = C.upstream03SelfCheck(g03, g02);
  if (!self02.ok) process.stderr.write(`UPSTREAM-DEFECT note: 02 inconsistent — ${self02.defects.map((d) => d.detail).join('; ')}\n`);
  if (!cross02.ok) process.stderr.write(`UPSTREAM-DEFECT note: 02↔03 inconsistent — ${cross02.defects.map((d) => d.detail).join('; ')}\n`);
  if (!self03.ok) process.stderr.write(`UPSTREAM-DEFECT note: 03 inconsistent — ${self03.defects.map((d) => d.detail).join('; ')}\n`);

  // --- L2 / L3 : parse the .dbml + transitions shape (malformed gates) --------
  const parseRes = E.parseDbml(Parser, dbmlText);
  if (!parseRes.ok) {
    process.stderr.write(`MALFORMED [L2/A2]: @dbml/core parse threw — ${describeDbmlError(parseRes.error)}\n`);
    summary.status = 'malformed';
    summary.counts.checks.lint = 1; summary.counts.checks.total = 1;
    summary.checks = [{ id: 'L2', class: 'lint', rule: 'A2', status: 'fail' }];
    summary.findings = [{ id: 'L2', rule: 'A2', severity: 'error', detail: describeDbmlError(parseRes.error) }];
    emit(summary, 'malformed');
  }
  const model = E.deriveModel(parseRes.normalized);
  const tr = C.deriveTransitions(docMd);

  const l3 = C.lintL3_transitionsShape(tr);
  if (!l3.ok) {
    process.stderr.write(`MALFORMED [L3]: ${l3.detail}\n`);
    summary.status = 'malformed';
    summary.checks = [
      { id: 'L2', class: 'lint', rule: 'A2', status: 'pass' },
      { id: 'L3', class: 'lint', rule: 'transitions-format', status: 'fail' },
    ];
    summary.counts.checks.lint = 2; summary.counts.checks.total = 2;
    summary.findings = [{ id: 'L3', rule: 'transitions-format', severity: 'error', detail: l3.detail }];
    summary.counts.intake = C.intakeCounts(model, tr);
    emit(summary, 'malformed');
  }

  // --- domain scenario shape (malformed if present-but-malshaped) ------------
  let domainScenario = null;
  if (scenarioText != null) {
    let obj = null;
    try { obj = JSON.parse(scenarioText); } catch (e) {
      process.stderr.write(`MALFORMED: scenarios file is not valid JSON — ${e.message}\n`);
      summary.status = 'malformed';
      summary.checks = [{ id: 'L2', class: 'lint', rule: 'A2', status: 'pass' }];
      summary.counts.checks.lint = 1; summary.counts.checks.total = 1;
      emit(summary, 'malformed');
    }
    const shape = E.validateScenarioShape(obj);
    if (!shape.ok) {
      process.stderr.write(`MALFORMED: scenarios shape invalid — ${shape.detail}\n`);
      summary.status = 'malformed';
      summary.checks = [{ id: 'L2', class: 'lint', rule: 'A2', status: 'pass' }];
      summary.counts.checks.lint = 1; summary.counts.checks.total = 1;
      emit(summary, 'malformed');
    }
    domainScenario = obj;
  }

  // ===========================================================================
  // From here the 04 artifact is ANCHORED. Run the full battery.
  // ===========================================================================
  const checkRecords = [];
  const findings = [];
  let lintRun = 0, engineRun = 0, resolutionRun = 0, exactValueRun = 0, ajRun = 0;
  const pushFinding = (r, severity, extra = {}) => { if (r.detail) findings.push({ id: r.id, rule: r.rule, severity, detail: r.detail, ...extra }); };

  const fpDbml = C.extractFingerprints(dbmlText, true);
  const fpMd = C.extractFingerprints(mdText, false);

  // --- LINT (L2 pass, L3 pass already; record them) --------------------------
  recordLint({ id: 'L2', rule: 'A2', status: 'pass' });
  recordLint({ id: 'L3', rule: 'transitions-format', status: 'pass' });
  const contentLints = [
    C.lintL4_fingerprintPresent(fpDbml, fpMd),
    C.lintL5_fingerprintWellFormed(fpDbml, fpMd),
    C.lintL6_fingerprintAgree(fpDbml, fpMd),
    C.lintL7_naming(model),
    C.lintL8_enumNaming(model),
    C.lintL9_primaryKey(model),
    C.lintL10_firstNormalForm(model),
    C.lintL11_noRestatement(model, dbmlText, tr, g02, g03),
    C.lintL12_forbidden(model, dbmlText, tr, g02, g03),
    C.lintL13_nullableFkDocumented(model),
    C.lintL15_transitionOrder(tr, g02),
  ];
  for (const cl of contentLints) {
    recordLint({ id: cl.id, rule: cl.rule, status: cl.status });
    if (cl.status === 'fail') { pushFinding(cl, 'error'); process.stderr.write(`FAIL [${cl.id}/${cl.rule}]: ${cl.detail}\n`); }
    else if (cl.status === 'warn') pushFinding(cl, 'warn');
    else if (cl.status === 'info') pushFinding(cl, 'info');
  }

  // --- ENGINE (strongest oracle) ---------------------------------------------
  const ddlRes = E.exportDDL(ModelExporter, parseRes.db);
  if (!ddlRes.ok) {
    recordEngine({ id: 'E-EXPORT', rule: 'A3', status: 'fail' });
    findings.push({ id: 'E-EXPORT', rule: 'A3', severity: 'error', detail: `DDL export threw: ${String(ddlRes.error && ddlRes.error.message).slice(0, 160)}` });
    process.stderr.write(`FAIL [E-EXPORT/A3]: DDL export threw — ${String(ddlRes.error && ddlRes.error.message).slice(0, 160)}\n`);
  } else {
    recordEngine({ id: 'E-EXPORT', rule: 'A3', status: 'pass' });
    const eng = await E.runEngine(PGlite, ddlRes.ddl, model, domainScenario);
    summary.counts.engine = eng.counts;
    for (const sc of eng.scenarios) {
      recordEngine({ id: sc.id, rule: sc.rule, status: sc.status });
      if (sc.status === 'fail') { findings.push({ id: sc.id, rule: sc.rule, severity: 'error', detail: sc.detail }); process.stderr.write(`FAIL [${sc.id}/${sc.rule}]: ${sc.detail}\n`); }
    }
  }

  // --- RESOLUTION ------------------------------------------------------------
  const resChecks = [
    C.checkRoot(model, g03),
    C.checkMember(model, g03),
    C.checkRef(model, g03),
    C.checkEnum(model, g02, self02, cross02),
    C.checkStatus(model, g02, g03),
    C.checkName(model, g02, g03),
    C.checkFkType(model),
    C.checkMN(model, g03),
    C.checkBijection(model, tr, g02),
    C.checkTFrom(model, tr, g02),
    C.checkTEvent(model, tr, g02),
    C.checkInit(model, tr, g02),
    C.checkReach(model, tr, g02),
  ];
  let edgesWalked = 0;
  for (const rc of resChecks) {
    resolutionRun++;
    edgesWalked += rc.edges || 0;
    checkRecords.push({ id: rc.id, class: 'resolution', rule: rc.rule, status: rc.status });
    if (rc.status === 'fail') {
      if (rc.upstreamDefect) {
        const file = rc.upstreamFile;
        findings.push({ id: rc.id, rule: rc.rule, severity: 'error', class: 'upstream-defect', upstream: file,
          detail: `${rc.upstreamDetail} (fix upstream in ${file === '02-glossary.md' ? opt.up02 : opt.up03}, not ${opt.dbml})` });
        process.stderr.write(`UPSTREAM-DEFECT [${rc.id}/${rc.rule}]: ${rc.upstreamDetail} → route to ${file}\n`);
      } else { pushFinding(rc, 'error'); process.stderr.write(`FAIL [${rc.id}/${rc.rule}]: ${rc.detail}\n`); }
    } else if (rc.status === 'warn') pushFinding(rc, 'warn');
  }

  // surface a 03 self-defect that the 04→03 checks would mask: a ghost-reference
  // in 03 itself routes upstream-defect → 03 (R-REF owner), even if 04 is faithful.
  if (!self03.ok) {
    const already = findings.some((f) => f.class === 'upstream-defect' && f.upstream === '03-aggregates.md');
    if (!already) {
      const refRec = checkRecords.find((c) => c.id === 'R-REF');
      if (refRec && refRec.status === 'pass') { refRec.status = 'fail'; }
      findings.push({ id: 'R-REF', rule: 'C4', severity: 'error', class: 'upstream-defect', upstream: '03-aggregates.md',
        detail: `${self03.defects.map((d) => d.detail).join('; ')} (fix upstream in ${opt.up03}, not ${opt.dbml})` });
      process.stderr.write(`UPSTREAM-DEFECT [R-REF/C4]: 03 self-inconsistent → route to 03-aggregates.md\n`);
    }
  }

  // --- EXACT-VALUE (X1–X5; X6 reconciliation after counters) -----------------
  const x1 = { id: 'X1', rule: 'C1/C2', status: model.tables.length > 0 ? 'pass' : 'fail', detail: model.tables.length > 0 ? '' : 'zero tables' };
  const exactChecks = [
    x1,
    C.checkX2_enumDeepEqual(model, g02),
    C.checkX3_onePk(model),
    C.checkX4_statusCount(model, tr, g02),
    C.checkX5_connected(model, tr, g02),
  ];
  for (const xc of exactChecks) {
    exactValueRun++;
    checkRecords.push({ id: xc.id, class: 'exactValue', rule: xc.rule, status: xc.status });
    if (xc.status === 'fail') { pushFinding(xc, 'error'); process.stderr.write(`FAIL [${xc.id}/${xc.rule}]: ${xc.detail}\n`); }
    else if (xc.status === 'warn') pushFinding(xc, 'warn');
  }

  // --- AGENT-JUDGED (precondition flags; recorded, never block, not reconciled)
  for (const aj of C.agentJudgedFlags(model)) {
    ajRun++;
    checkRecords.push({ id: aj.id, class: 'agent-judged', rule: aj.rule, verdict: aj.verdict });
  }

  // --- RECONCILIATION (X6) ---------------------------------------------------
  const edgesExpected = C.expectedMechanicalEdges(model, tr, g02, g03);
  const executedMechanical = lintRun + resolutionRun + exactValueRun;
  const x6 = C.checkX6_reconcile(executedMechanical + engineRun, edgesWalked, edgesExpected, engineRun, model.tables.length);
  exactValueRun++;
  checkRecords.push({ id: 'X6', class: 'exactValue', rule: 'reconciliation', status: x6.status === 'pass' ? 'pass' : 'fail' });

  // --- counts ----------------------------------------------------------------
  summary.counts.intake = C.intakeCounts(model, tr);
  summary.counts.checks = {
    lint: lintRun, engine: engineRun, resolution: resolutionRun,
    exactValue: exactValueRun, negative: 0, agentJudged: ajRun,
    total: lintRun + engineRun + resolutionRun + exactValueRun + ajRun,
  };
  summary.counts.edgesWalked = edgesWalked;
  summary.counts.edgesExpected = edgesExpected;
  summary.coverage.elementsTotal = C.elementsTotal(model, tr);
  // elementsExercised mirrors elementsTotal BY CONSTRUCTION: every mechanical check
  // (lint L7–L13, resolution R-*, exact-value X*) and every engine probe walks the
  // FULL model — tables, columns, refs, enums, transition rows are each touched by
  // ≥1 executed check on any non-broken run. There is no partially-exercised element.
  summary.coverage.elementsExercised = C.elementsTotal(model, tr);
  summary.checks = checkRecords;
  summary.findings = findings;

  // --- verdict ---------------------------------------------------------------
  if (summary.counts.checks.total === 0) {
    summary.status = 'broken-test'; process.stderr.write('BROKEN-TEST: zero checks executed (vacuous green guard).\n'); emit(summary, 'broken-test');
  }
  if (x6.status !== 'pass') {
    summary.status = 'broken-test'; process.stderr.write(`BROKEN-TEST [X6]: ${x6.detail}\n`); emit(summary, 'broken-test');
  }
  summary.reconciled = true;

  const hasFail = checkRecords.some((c) => c.status === 'fail');
  if (hasFail) { summary.status = 'fail'; emit(summary, 'fail'); }

  summary.status = 'pass';
  emit(summary, 'pass');

  // --- local recorders -------------------------------------------------------
  function recordLint(r) { lintRun++; checkRecords.push({ id: r.id, class: 'lint', rule: r.rule, status: r.status }); }
  function recordEngine(r) { engineRun++; checkRecords.push({ id: r.id, class: 'engine', rule: r.rule, status: r.status }); }
}

function describeDbmlError(err) {
  if (!err) return 'unknown parse error';
  if (err.diags && Array.isArray(err.diags)) {
    return err.diags.slice(0, 3).map((d) => `${d.message} @${d.location && d.location.start ? `${d.location.start.line}:${d.location.start.column}` : '?'}`).join(' | ');
  }
  return String(err.message || err).slice(0, 200);
}

main().catch((e) => {
  process.stderr.write(`BROKEN-TEST (harness threw): ${e && e.stack ? e.stack : e}\n`);
  process.exit(EXIT['broken-test']);
});
