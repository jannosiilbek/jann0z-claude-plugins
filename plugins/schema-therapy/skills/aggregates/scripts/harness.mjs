#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for the aggregates artifact
// (`specs/03-aggregates.md`), validated against BOTH upstreams
// (`01-event-storming.md` + `02-glossary.md`). Implements references/simulation.md
// EXACTLY:
//   - THREE-FILE parse (03 + pinned 01 + pinned 02) via lib/md.mjs
//   - upstream parseability gates (unparseable 01 or 02 ⇒ broken-test, §9.4/9.5)
//   - upstream SELF-CONSISTENCY preconditions BEFORE 03 checks:
//       * X7-pre / 01 event-ownership (zero/double owner, phantom step) → R7,
//         routed class:"upstream-defect" → 01 (§9.2)
//       * 02-vs-01 provenance (enum value derives from a real 01 event) → R4,
//         routed class:"upstream-defect" → 02 (§9.3)
//   - lint (L1–L17), resolution (R1–R7), I3-mech, exact-value (X1–X5),
//     agent-judged placeholders (AJ1–AJ5; recorded, never block, not reconciled)
//   - status taxonomy: pass | fail | malformed | broken-test
//   - JSON summary on stdout (stable key order, sorted checks/findings by id);
//     diagnostics on stderr
//   - exit codes: 0 pass / 1 fail (incl. upstream-defect) / 2 malformed (03) /
//     3 broken-test (incl. unparseable 01/02 upstream)
//   - zero parsed checks ⇒ broken-test (never vacuous green)
//   - coverage + edge reconciliation per §5
//
// Node ≥18, plain ESM, zero external deps.
// Usage:
//   node scripts/harness.mjs <03> --upstream-01 <01> --upstream-02 <02> [--no-checks]

import { readFileSync } from 'node:fs';
import { parse, ParseError } from './lib/md.mjs';
import * as C from './lib/checks.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

// Agent-judged (simulation.md §6): recorded with a pass-verdict placeholder.
// They do NOT feed reconciliation arithmetic and never block.
const AJ_DEFS = [
  { id: 'AJ1', rule: 'A5/A6', verdict: 'small-and-bound' },
  { id: 'AJ2', rule: 'I3', verdict: 'within-boundary' },
  { id: 'AJ3', rule: 'X2/X4', verdict: 'justified-exception' },
  { id: 'AJ4', rule: 'I4', verdict: 'true-invariant' },
  { id: 'AJ5', rule: 'A8/I6', verdict: 'domain-concept' },
];

const N_BEHAVIORS = 22; // simulation.md §5 mapping table rows (pos+neg per behavior)

function emit(summary, exitStatus) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[exitStatus]);
}

function baseSummary(p03, p01, p02, status) {
  return {
    skill: 'aggregates',
    artifact: p03,
    upstream01: p01,
    upstream02: p02,
    status,
    counts: {
      intake: { aggregates: 0, members: 0, invariants: 0, references: 0, policies: 0 },
      checks: { lint: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
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
  const noChecks = args.includes('--no-checks');
  let up01 = null, up02 = null;
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--upstream-01') { up01 = args[i + 1]; i++; }
    else if (args[i] === '--upstream-02') { up02 = args[i + 1]; i++; }
    else if (args[i].startsWith('--')) { /* flag */ }
    else positionals.push(args[i]);
  }
  return { artifact: positionals[0] || null, up01, up02, noChecks };
}

function main() {
  const { artifact, up01, up02, noChecks } = parseArgs(process.argv);

  if (!artifact || !up01 || !up02) {
    process.stderr.write('usage: node scripts/harness.mjs <03> --upstream-01 <01> --upstream-02 <02> [--no-checks]\n');
    process.exit(EXIT['broken-test']);
  }

  const summary = baseSummary(artifact, up01, up02, 'pass');

  // --- read all three files --------------------------------------------------
  let text03, text01, text02;
  try { text03 = readFileSync(artifact, 'utf8'); }
  catch (e) { process.stderr.write(`cannot read 03 artifact: ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  try { text01 = readFileSync(up01, 'utf8'); }
  catch (e) { process.stderr.write(`cannot read 01 upstream: ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  try { text02 = readFileSync(up02, 'utf8'); }
  catch (e) { process.stderr.write(`cannot read 02 upstream: ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }

  // --- vacuous-green guard ---------------------------------------------------
  if (noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test';
    summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  // --- parse all three -------------------------------------------------------
  let doc03, doc01, doc02;
  try { doc03 = parse(text03); }
  catch (e) {
    // A structural break in the 03 artifact under test (e.g. an unclosed
    // fingerprint comment block) is `malformed`, not a broken test.
    if (e instanceof ParseError) { process.stderr.write(`MALFORMED (03 parse): ${e.message}\n`); summary.status = 'malformed'; emit(summary, 'malformed'); }
    process.stderr.write(`BROKEN-TEST (03 parser threw): ${e.stack}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test');
  }
  try { doc01 = parse(text01); }
  catch (e) { process.stderr.write(`BROKEN-TEST (01 parser threw): ${e.stack}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  try { doc02 = parse(text02); }
  catch (e) { process.stderr.write(`BROKEN-TEST (02 parser threw): ${e.stack}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }

  // --- upstream parseability (§9.4 / §9.5) -----------------------------------
  const up01shape = C.parseUpstream01Shape(doc01);
  if (!up01shape.ok) {
    process.stderr.write(`BROKEN-TEST: upstream 01 unparseable: ${up01shape.detail} — cannot resolve 03 references.\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  }
  const up02shape = C.parseUpstream02Shape(doc02);
  if (!up02shape.ok) {
    process.stderr.write(`BROKEN-TEST: upstream 02 unparseable: ${up02shape.detail} — cannot resolve 03 references.\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  }

  const u01 = C.deriveUpstream01(doc01);
  const g02 = C.deriveUpstream02(doc02);

  // --- upstream SELF/MUTUAL consistency (pre-resolution, §9.2 / §9.3) --------
  const self01 = C.upstream01SelfCheck(u01);
  if (!self01.ok) {
    process.stderr.write(`UPSTREAM-DEFECT note: 01 self-inconsistent — ${self01.defects.map((d) => d.detail).join('; ')}\n`);
  }
  const self02 = C.upstream02SelfCheck(g02, u01);
  if (!self02.ok) {
    process.stderr.write(`UPSTREAM-DEFECT note: 02 inconsistent with 01 — ${self02.defects.map((d) => d.detail).join('; ')}\n`);
  }

  // --- record helpers --------------------------------------------------------
  const checkRecords = [];
  const findings = [];
  let lintRun = 0, resolutionRun = 0, exactValueRun = 0, ajRun = 0;

  const pushFinding = (r, severity, extra = {}) => {
    if (!r.detail) return;
    findings.push({ id: r.id, rule: r.rule, severity, detail: r.detail, ...extra });
  };

  // ===========================================================================
  // STAGE 1 — Malformed lints (L1, L3–L7). Any failure ⇒ malformed of the 03.
  // ===========================================================================
  let g03;
  try { g03 = C.deriveGraph03(doc03); }
  catch (e) { process.stderr.write(`BROKEN-TEST (03 graph derive threw): ${e.stack}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }

  const malformedLints = [
    C.lintL1_headings(doc03),
    C.lintL3_subblocks(g03),
    C.lintL4_boundaryCols(g03),
    C.lintL5_invariantCols(g03),
    C.lintL6_referenceCols(g03),
    C.lintL7_policyCols(g03),
  ];
  let malformed = false;
  for (const ml of malformedLints) {
    lintRun++;
    checkRecords.push({ id: ml.id, class: 'lint', rule: ml.rule, status: ml.ok ? 'pass' : 'fail' });
    if (!ml.ok) {
      malformed = true;
      process.stderr.write(`MALFORMED [${ml.id}/${ml.rule}]: ${ml.detail}\n`);
      findings.push({ id: ml.id, rule: ml.rule, severity: 'error', detail: ml.detail });
    }
  }

  if (malformed) {
    summary.status = 'malformed';
    summary.counts.checks.lint = lintRun;
    summary.counts.checks.total = lintRun;
    summary.counts.intake = C.intakeCounts(g03);
    summary.checks = checkRecords;
    summary.findings = findings;
    emit(summary, 'malformed');
  }

  // ===========================================================================
  // STAGE 2 — Content lints (L2, L8–L17).
  // ===========================================================================
  const contentLints = [
    C.lintL2_fingerprints(doc03),
    C.lintL8_root(g03),
    C.lintL9_kind(g03),
    C.lintL10_invariantIdScope(g03),
    C.lintL11_mode(g03),
    C.lintL12_forbidden(g03, g02),
    C.lintL13_restatedEventTable(doc03),
    C.lintL14_restatedActorHotspot(doc03),
    C.lintL15_restatedTermsTable(doc03),
    C.lintL16_restatedEnumListing(doc03, g03, g02),
    C.lintL17_restatedLifecycle(g03, u01),
  ];
  for (const cl of contentLints) {
    lintRun++;
    checkRecords.push({ id: cl.id, class: 'lint', rule: cl.rule, status: cl.status });
    if (cl.status === 'fail') { pushFinding(cl, 'error'); process.stderr.write(`FAIL [${cl.id}/${cl.rule}]: ${cl.detail}\n`); }
    else if (cl.status === 'warn') pushFinding(cl, 'warn');
    else if (cl.status === 'info') pushFinding(cl, 'info');
  }

  // ===========================================================================
  // STAGE 3 — Resolution checks (R1–R7) + I3-mech.
  // ===========================================================================
  const resChecks = [
    C.checkR1_bijection(g03, u01),
    C.checkR2_boundaryTerm(g03, g02),
    C.checkR3_reference(g03, u01),
    C.checkR4_invariantEnum(g03, g02, self02),
    C.checkR5_policySource(g03, u01),
    C.checkR6_policyTarget(g03, u01),
    C.checkR7_eventOwnership(u01, self01),
    C.checkI3mech(g03, u01),
  ];
  let edgesWalked = 0;
  for (const rc of resChecks) {
    resolutionRun++;
    edgesWalked += rc.edges || 0;
    checkRecords.push({ id: rc.id, class: 'resolution', rule: rc.rule, status: rc.status });
    if (rc.status === 'fail') {
      if (rc.upstreamDefect) {
        const file = rc.upstreamFile;
        findings.push({
          id: rc.id, rule: rc.rule, severity: 'error',
          class: 'upstream-defect', upstream: file,
          detail: `${rc.upstreamDetail} (fix upstream in ${file === '01-event-storming.md' ? up01 : up02}, not ${artifact})`,
        });
        process.stderr.write(`UPSTREAM-DEFECT [${rc.id}/${rc.rule}]: ${rc.upstreamDetail} → route to ${file}\n`);
      } else {
        pushFinding(rc, 'error');
        process.stderr.write(`FAIL [${rc.id}/${rc.rule}]: ${rc.detail}\n`);
      }
    } else if (rc.status === 'warn') pushFinding(rc, 'warn');
  }

  // ===========================================================================
  // STAGE 4 — Exact-value checks (X1–X4; X5 reconciliation after counters).
  // ===========================================================================
  const x4 = C.checkX4_modeAndJustification(g03, u01);
  edgesWalked += x4.edges || 0;
  const exactChecks = [
    C.checkX1_bijectionCardinality(g03, u01),
    C.checkX2_root(g03),
    C.checkX3_invariantIdUnique(g03),
    x4,
  ];
  for (const xc of exactChecks) {
    exactValueRun++;
    checkRecords.push({ id: xc.id, class: 'exactValue', rule: xc.rule, status: xc.status });
    if (xc.status === 'fail') { pushFinding(xc, 'error'); process.stderr.write(`FAIL [${xc.id}/${xc.rule}]: ${xc.detail}\n`); }
    else if (xc.status === 'warn') pushFinding(xc, 'warn');
  }

  // ===========================================================================
  // STAGE 5 — Agent-judged (recorded, never blocking, not in reconciliation).
  // ===========================================================================
  for (const aj of AJ_DEFS) {
    ajRun++;
    checkRecords.push({ id: aj.id, class: 'agent-judged', rule: aj.rule, verdict: aj.verdict });
  }

  // ===========================================================================
  // STAGE 6 — Reconciliation (X5). Mechanical checks only (AJ excluded).
  // ===========================================================================
  const edgesExpected = C.expectedEdges(g03, u01, g02);
  const executedMechanical = lintRun + resolutionRun + exactValueRun; // pre-X5
  const x5 = C.checkX5_reconcile(executedMechanical, edgesWalked, edgesExpected);
  exactValueRun++;
  checkRecords.push({ id: x5.id, class: 'exactValue', rule: x5.rule, status: x5.status === 'pass' ? 'pass' : 'fail' });

  const totalMechanical = lintRun + resolutionRun + exactValueRun;

  // ===========================================================================
  // VERDICT
  // ===========================================================================
  summary.counts.intake = C.intakeCounts(g03);
  summary.counts.checks = {
    lint: lintRun,
    resolution: resolutionRun,
    exactValue: exactValueRun,
    negative: 0,
    agentJudged: ajRun,
    total: totalMechanical + ajRun,
  };
  summary.counts.edgesWalked = edgesWalked;
  summary.counts.edgesExpected = edgesExpected;
  summary.coverage.elementsTotal = C.elementsTotal(g03);
  // elementsExercised mirrors elementsTotal BY CONSTRUCTION: with all mechanical
  // checks run (guarded above), every intake element is touched by ≥1 check, so
  // the exercised count equals the total. Not an independently-measured value.
  summary.coverage.elementsExercised = C.elementsTotal(g03);
  summary.checks = checkRecords;
  summary.findings = findings;

  if (totalMechanical === 0) {
    summary.status = 'broken-test'; summary.reconciled = false;
    process.stderr.write('BROKEN-TEST: zero mechanical checks executed (vacuous green guard).\n');
    emit(summary, 'broken-test');
  }

  if (x5.status !== 'pass') {
    summary.status = 'broken-test'; summary.reconciled = false;
    process.stderr.write(`BROKEN-TEST [X5]: ${x5.detail}\n`);
    emit(summary, 'broken-test');
  }

  summary.reconciled = true;

  const hasErrorFail = checkRecords.some((c) => c.status === 'fail');
  if (hasErrorFail) { summary.status = 'fail'; emit(summary, 'fail'); }

  summary.status = 'pass';
  emit(summary, 'pass');
}

main();
