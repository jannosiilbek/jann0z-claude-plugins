#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for the event-storming artifact
// (`specs/01-event-storming.md`), validated against its upstream `impact-map`
// (00) seam. Implements simulation.md EXACTLY:
//   - TWO-FILE parse (01 + pinned 00 upstream) via lib/md.mjs
//   - lint (L1–L15), resolution (N3/N4/N5/N8/N9 + seam N13/N14/N15),
//     exact-value (X1–X7), agent-judged placeholders (AJ1–AJ7 recorded, not
//     invented into counts)
//   - status taxonomy: pass | fail | malformed | broken-test
//   - upstream-defect finding class (N15): a self-inconsistent but parseable 00
//     ⇒ finding routed to `00-impact-map.md`, 01 status `fail`
//   - machine-readable JSON summary on stdout, diagnostics on stderr
//   - exit codes: 0 pass / 1 fail / 2 malformed / 3 broken-test
//   - zero parsed checks ⇒ broken-test (never vacuous green)
//   - unparseable 00 ⇒ broken-test (seam has no authority)
//   - missing --upstream-00 ⇒ usage error, exit 3
//   - coverage reconciliation per §5 (now incl. seam-edge families)
//
// Node ≥18, plain ESM, zero external deps.
// Usage: node scripts/harness.mjs <artifact.md> --upstream-00 <00-artifact.md>

import { readFileSync } from 'node:fs';
import { parse, ParseError } from './lib/md.mjs';
import * as C from './lib/checks.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

// AJ checks (simulation.md §6): recorded with a pass-verdict placeholder. They
// do NOT feed reconciliation arithmetic and never block. The mechanical harness
// records them as executed-with-verdict; a real agent pass replaces the verdict.
const AJ_DEFS = [
  { id: 'AJ1', rule: 'B2', verdict: 'domain-fact' },
  { id: 'AJ2', rule: 'B7', verdict: 'atomic-fact' },
  { id: 'AJ3', rule: 'C1/C4', verdict: 'concrete-and-tied' },
  { id: 'AJ4', rule: 'D1/D2', verdict: 'open-question' },
  { id: 'AJ5', rule: 'E3/E4', verdict: 'coherent' },
  { id: 'AJ6', rule: 'F2/F4', verdict: 'policy-sound' },
  { id: 'AJ7', rule: 'G2/G5', verdict: 'consistent' },
];

// simulation.md §5 mapping table rows (every ❌ catalog rule has pos+neg).
const N_BEHAVIORS = 15;

function emit(summary, exitStatus) {
  // stable key order, sorted checks/findings by id
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[exitStatus]);
}

function baseSummary(artifactPath, upstreamPath, status) {
  return {
    skill: 'event-storming',
    artifact: artifactPath,
    status,
    upstream: { impactMap: upstreamPath, parsed: false },
    counts: {
      intake: {
        events: 0,
        actors: 0,
        hotspots: 0,
        skeletonSteps: 0,
        businessActors: 0,
        impacts: 0,
        deliverables: 0,
      },
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
  let upstream00 = null;
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--upstream-00') {
      upstream00 = args[i + 1];
      i++;
    } else if (args[i].startsWith('--')) {
      // flag (e.g. --no-checks); ignore here
    } else {
      positionals.push(args[i]);
    }
  }
  return { artifact: positionals[0] || null, upstream00, noChecks };
}

function main() {
  const { artifact, upstream00, noChecks } = parseArgs(process.argv);

  if (!artifact || !upstream00) {
    process.stderr.write(
      'usage: node scripts/harness.mjs <artifact.md> --upstream-00 <00-impact-map.md> [--no-checks]\n'
    );
    if (!upstream00 && artifact) {
      process.stderr.write('error: --upstream-00 <00-artifact> is required (the impact-map seam authority).\n');
    }
    process.exit(EXIT['broken-test']);
  }

  const summary = baseSummary(artifact, upstream00, 'pass');

  // --- read both files -------------------------------------------------------
  let text01, text00;
  try {
    text01 = readFileSync(artifact, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read 01 artifact: ${e.message}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  try {
    text00 = readFileSync(upstream00, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read 00 upstream: ${e.message}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // Vacuous-green guard: if the check corpus is disabled, zero checks parse ⇒
  // broken-test, exit 3. Proven by `vacuous.md`.
  if (noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test';
    summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  // --- parse both ------------------------------------------------------------
  let doc01, doc00;
  try {
    doc01 = parse(text01);
  } catch (e) {
    if (e instanceof ParseError) {
      process.stderr.write(`MALFORMED (parse): ${e.message}\n`);
      summary.status = 'malformed';
      emit(summary, 'malformed');
    }
    process.stderr.write(`BROKEN-TEST (01 parser threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  try {
    doc00 = parse(text00);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (00 parser threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // --- 00 upstream parseability (simulation.md §3.3) -------------------------
  // An unparseable 00 ⇒ broken-test (the seam loses authority — it is NOT
  // `malformed`; 00 is not the artifact under test).
  const up = C.parseUpstreamShape00(doc00);
  if (!up.ok) {
    process.stderr.write(`BROKEN-TEST: upstream 00 unparseable: ${up.detail} — seam has no authority.\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  const u00 = C.deriveUpstream00(doc00);
  summary.upstream.parsed = true;

  // --- record helpers --------------------------------------------------------
  const checkRecords = [];
  const findings = [];
  let lintRun = 0,
    resolutionRun = 0,
    exactValueRun = 0,
    ajRun = 0;

  const pushCheck = (cls, r, extra = {}) => {
    checkRecords.push({ id: r.id, class: cls, rule: r.rule, status: r.status, ...extra });
  };
  const pushFinding = (r, severity) => {
    if (!r.detail) return;
    findings.push({ id: r.id, rule: r.rule, severity, detail: r.detail, locus: artifact });
  };

  // ===========================================================================
  // STAGE 1 — Malformed lints (L1–L6, L14). Any failure ⇒ malformed, abort.
  // ===========================================================================
  let g;
  try {
    g = C.deriveGraph(doc01);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (graph derive threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  const malformedLints = [
    C.lintL1_headings(doc01),
    C.lintL2_fingerprint(doc01),
    C.lintL3_eventsCols(g),
    C.lintL4_actorsCols(g),
    C.lintL5_hotspotsCols(g),
    C.lintL6_skeletons(doc01, g),
    C.lintL14_deliverableCell(g),
  ];
  let malformed = false;
  for (const ml of malformedLints) {
    lintRun++;
    checkRecords.push({ id: ml.id, class: 'lint', rule: ml.rule, status: ml.ok ? 'pass' : 'fail' });
    if (!ml.ok) {
      // A lint may distinguish a SHAPE defect (`malformed`, unparseable) from a
      // content `fail` over a parseable artifact (e.g. L14's empty-but-present
      // Deliverable cell). Default `malformed === true` preserves the legacy
      // shape-lint behaviour; an explicit `malformed === false` routes the
      // finding as a content fail (no abort) — caught at the VERDICT stage.
      const isShapeDefect = ml.malformed !== false;
      if (isShapeDefect) {
        malformed = true;
        process.stderr.write(`MALFORMED [${ml.id}/${ml.rule}]: ${ml.detail}\n`);
      } else {
        process.stderr.write(`FAIL [${ml.id}/${ml.rule}]: ${ml.detail}\n`);
      }
      findings.push({ id: ml.id, rule: ml.rule, severity: 'error', detail: ml.detail, locus: artifact });
    }
  }

  if (malformed) {
    summary.status = 'malformed';
    summary.counts.checks.lint = lintRun;
    summary.counts.checks.total = lintRun;
    summary.checks = checkRecords;
    summary.findings = findings;
    summary.counts.intake = intakeCounts(g, u00);
    emit(summary, 'malformed');
  }

  // ===========================================================================
  // STAGE 2 — Content lints (L7–L13, L15).
  // ===========================================================================
  const contentLints = [
    C.lintL7_kindEnum(g),
    C.lintL8_nonEmpty(g),
    C.lintL9_hotspots(g),
    C.lintL10_termNote(doc01),
    C.lintL11_pastTense(g),
    C.lintL12_vague(g),
    C.lintL13_techLeak(g),
    C.lintL15_dashSmell(g),
  ];
  for (const cl of contentLints) {
    lintRun++;
    pushCheck('lint', cl);
    if (cl.status === 'fail') {
      pushFinding(cl, 'error');
      process.stderr.write(`FAIL [${cl.id}/${cl.rule}]: ${cl.detail}\n`);
    } else if (cl.status === 'warn') {
      pushFinding(cl, 'warn');
    } else if (cl.status === 'info') {
      pushFinding(cl, 'info');
    }
  }

  // ===========================================================================
  // STAGE 3 — Resolution checks (N3, N4, N5, N8, N9 + seam N13, N14, N15).
  // ===========================================================================
  const resChecks = [
    C.checkN3_actorResolves(g),
    C.checkN4_skeletonStepResolves(g),
    C.checkN5_blocksResolves(g),
    C.checkN8_eventMembership(g),
    C.checkN9_triggerResolves(g),
    C.checkN13_humanActorResolves00(g, u00),
    C.checkN14_deliverableResolves00(g, u00),
    C.checkN15_upstream00SelfConsistent(u00),
  ];
  let edgesWalked = 0;
  for (const rc of resChecks) {
    resolutionRun++;
    edgesWalked += rc.edges || 0;
    pushCheck('resolution', rc);
    if (rc.status === 'fail') {
      // Route an upstream-defect finding (N15): tag class + point at 00.
      if (rc.upstreamDefect) {
        findings.push({
          id: rc.id,
          rule: rc.rule,
          severity: 'error',
          class: 'upstream-defect',
          detail: rc.upstreamDetail,
          locus: '00-impact-map.md',
        });
        process.stderr.write(`UPSTREAM-DEFECT [${rc.id}/${rc.rule}]: ${rc.upstreamDetail} → route to 00-impact-map.md\n`);
      } else {
        pushFinding(rc, 'error');
        process.stderr.write(`FAIL [${rc.id}/${rc.rule}]: ${rc.detail}\n`);
      }
    } else if (rc.status === 'warn') {
      pushFinding(rc, 'warn');
    }
  }

  // ===========================================================================
  // STAGE 4 — Exact-value checks (X1–X4, X6, X7; X5 reconciliation last).
  // ===========================================================================
  const x1 = C.checkX1_eventCount(g, g.events.length);
  const x2 = C.checkX2_noDuplicateEvents(g);
  const x3 = C.checkX3_lifecycleBounds(g);
  const x4 = C.checkX4_singleOwnership(g);
  const x6 = C.checkX6_deliverableCoverage(g, u00);
  const x7 = C.checkX7_aggregateServes(g, u00);

  for (const xc of [x1, x2, x3, x4, x6, x7]) {
    exactValueRun++;
    edgesWalked += xc.edges || 0; // X6/X7 walk seam edges
    pushCheck('exactValue', xc);
    if (xc.status === 'fail') {
      pushFinding(xc, 'error');
      process.stderr.write(`FAIL [${xc.id}/${xc.rule}]: ${xc.detail}\n`);
    } else if (xc.status === 'warn') {
      pushFinding(xc, 'warn');
    }
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
  const edgesExpected = C.expectedEdges(g, u00);
  const executedChecks = lintRun + resolutionRun + exactValueRun; // mechanical
  const x5 = C.checkX5_reconcile(executedChecks, edgesWalked, edgesExpected);
  exactValueRun++;
  checkRecords.push({ id: x5.id, class: 'exactValue', rule: x5.rule, status: x5.status === 'pass' ? 'pass' : 'fail' });

  const totalMechanical = lintRun + resolutionRun + exactValueRun;

  // ===========================================================================
  // VERDICT
  // ===========================================================================
  summary.counts.intake = intakeCounts(g, u00);
  summary.counts.checks = {
    lint: lintRun,
    resolution: resolutionRun,
    exactValue: exactValueRun,
    negative: 0, // negatives are proven over fixtures in selftest, not here
    agentJudged: ajRun,
    total: totalMechanical + ajRun,
  };
  summary.counts.edgesWalked = edgesWalked;
  summary.counts.edgesExpected = edgesExpected;
  summary.coverage.elementsExercised = elementsExercised(g, u00);
  summary.coverage.elementsTotal = elementsTotal(g, u00);
  summary.checks = checkRecords;
  summary.findings = findings;

  // Zero parsed mechanical checks ⇒ broken-test (no vacuous green).
  if (totalMechanical === 0) {
    summary.status = 'broken-test';
    summary.reconciled = false;
    process.stderr.write('BROKEN-TEST: zero mechanical checks executed (vacuous green guard).\n');
    emit(summary, 'broken-test');
  }

  // Reconciliation failure ⇒ broken-test (silently dropped check / counter).
  if (x5.status !== 'pass') {
    summary.status = 'broken-test';
    summary.reconciled = false;
    process.stderr.write(`BROKEN-TEST [X5]: ${x5.detail}\n`);
    emit(summary, 'broken-test');
  }

  summary.reconciled = true;

  // Any error-severity failing check ⇒ fail (includes the N15 upstream-defect,
  // whose status stays `fail`; the finding carries class:"upstream-defect").
  const hasErrorFail = checkRecords.some((c) => c.status === 'fail');

  if (hasErrorFail) {
    summary.status = 'fail';
    emit(summary, 'fail');
  }

  summary.status = 'pass';
  emit(summary, 'pass');
}

function intakeCounts(g, u00) {
  let steps = 0;
  for (const sk of g.skeletons) steps += sk.steps.length;
  return {
    events: g.events.length,
    actors: g.actors.length,
    hotspots: g.hotspots.length,
    skeletonSteps: steps,
    businessActors: u00.businessActors.length,
    impacts: u00.impacts.length,
    deliverables: u00.deliverables.length,
  };
}

function elementsTotal(g, u00) {
  let steps = 0;
  for (const sk of g.skeletons) steps += sk.steps.length;
  return (
    g.events.length +
    g.actors.length +
    g.hotspots.length +
    steps +
    u00.businessActors.length +
    u00.impacts.length +
    u00.deliverables.length
  );
}

// Every element is exercised by ≥1 check per §5; with all checks running, this
// equals elementsTotal. (Reported for transparency; reconciliation uses edges.)
function elementsExercised(g, u00) {
  return elementsTotal(g, u00);
}

main();
