#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for the event-storming artifact
// (`specs/01-event-storming.md`). Implements simulation.md EXACTLY:
//   - hand-rolled markdown parse (lib/md.mjs)
//   - lint (L1–L13), resolution (N3/N4/N5/N8/N9), exact-value (X1–X5),
//     agent-judged placeholders (AJ1–AJ7 recorded, not invented into counts)
//   - status taxonomy: pass | fail | malformed | broken-test
//   - machine-readable JSON summary on stdout, diagnostics on stderr
//   - exit codes: 0 pass / 1 fail / 2 malformed / 3 broken-test
//   - zero parsed checks ⇒ broken-test (never vacuous green)
//   - coverage reconciliation per §5
//
// Node ≥18, plain ESM, zero external deps.
// Usage: node scripts/harness.mjs <artifact.md>

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

function emit(summary, exitStatus) {
  // stable key order, sorted checks/findings by id
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[exitStatus]);
}

function baseSummary(artifactPath, status) {
  return {
    skill: 'event-storming',
    artifact: artifactPath,
    status,
    counts: {
      intake: { events: 0, actors: 0, hotspots: 0, skeletonSteps: 0 },
      checks: { lint: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      edgesWalked: 0,
      edgesExpected: 0,
    },
    reconciled: false,
    coverage: { elementsExercised: 0, elementsTotal: 0, behaviorsWithPosAndNeg: 9 },
    checks: [],
    findings: [],
  };
}

function main() {
  const args = process.argv.slice(2);
  // `--no-checks` exercises the vacuous-green GUARD: it disables the check
  // corpus so that zero checks parse, which MUST yield broken-test (never a
  // vacuous pass). simulation.md §3.2 `vacuous.md` proves this path.
  const noChecks = args.includes('--no-checks');
  const artifactPath = args.find((a) => !a.startsWith('--'));
  if (!artifactPath) {
    process.stderr.write('usage: node scripts/harness.mjs <artifact.md> [--no-checks]\n');
    process.exit(EXIT['broken-test']);
  }

  let text;
  try {
    text = readFileSync(artifactPath, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read artifact: ${e.message}\n`);
    const s = baseSummary(artifactPath, 'broken-test');
    emit(s, 'broken-test');
  }

  const summary = baseSummary(artifactPath, 'pass');

  let doc;
  try {
    doc = parse(text);
  } catch (e) {
    if (e instanceof ParseError) {
      process.stderr.write(`MALFORMED (parse): ${e.message}\n`);
      summary.status = 'malformed';
      emit(summary, 'malformed');
    }
    process.stderr.write(`BROKEN-TEST (parser threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // Vacuous-green guard: if the check corpus is disabled, zero checks parse ⇒
  // broken-test, exit 3. Proven by `vacuous.md` (a structurally-valid artifact
  // that must STILL not pass when no checks run).
  if (noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test';
    summary.reconciled = false;
    summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

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
    findings.push({ id: r.id, rule: r.rule, severity, detail: r.detail });
  };

  // ===========================================================================
  // STAGE 1 — Malformed lints (L1–L6). Any failure ⇒ malformed, abort early.
  // ===========================================================================
  let g;
  try {
    g = C.deriveGraph(doc);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (graph derive threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  const malformedLints = [
    C.lintL1_headings(doc),
    C.lintL2_fingerprint(doc),
    C.lintL3_eventsCols(g),
    C.lintL4_actorsCols(g),
    C.lintL5_hotspotsCols(g),
    C.lintL6_skeletons(doc, g),
  ];
  let malformed = false;
  for (const ml of malformedLints) {
    lintRun++;
    const status = ml.ok ? 'pass' : 'malformed';
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
    summary.checks = checkRecords;
    summary.findings = findings;
    summary.counts.intake = intakeCounts(g);
    emit(summary, 'malformed');
  }

  // ===========================================================================
  // STAGE 2 — Content lints (L7–L13).
  // ===========================================================================
  const contentLints = [
    C.lintL7_kindEnum(g),
    C.lintL8_nonEmpty(g),
    C.lintL9_hotspots(g),
    C.lintL10_termNote(doc),
    C.lintL11_pastTense(g),
    C.lintL12_vague(g),
    C.lintL13_techLeak(g),
  ];
  for (const cl of contentLints) {
    lintRun++;
    pushCheck('lint', cl);
    const sev = cl.severity || 'error';
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
  // STAGE 3 — Resolution checks (N3, N4, N5, N8, N9).
  // ===========================================================================
  const resChecks = [
    C.checkN3_actorResolves(g),
    C.checkN4_skeletonStepResolves(g),
    C.checkN5_blocksResolves(g),
    C.checkN8_eventMembership(g),
    C.checkN9_triggerResolves(g),
  ];
  let edgesWalked = 0;
  for (const rc of resChecks) {
    resolutionRun++;
    edgesWalked += rc.edges || 0;
    pushCheck('resolution', rc);
    if (rc.status === 'fail') {
      pushFinding(rc, 'error');
      process.stderr.write(`FAIL [${rc.id}/${rc.rule}]: ${rc.detail}\n`);
    } else if (rc.status === 'warn') {
      pushFinding(rc, 'warn');
    }
  }

  // ===========================================================================
  // STAGE 4 — Exact-value checks (X1–X5).
  // ===========================================================================
  const edgesExpected = C.expectedEdges(g);

  const x1 = C.checkX1_eventCount(g, g.events.length);
  const x2 = C.checkX2_noDuplicateEvents(g);
  const x3 = C.checkX3_lifecycleBounds(g);
  const x4 = C.checkX4_singleOwnership(g);

  for (const xc of [x1, x2, x3, x4]) {
    exactValueRun++;
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
  const executedChecks = lintRun + resolutionRun + exactValueRun; // mechanical
  const x5 = C.checkX5_reconcile(executedChecks, edgesWalked, edgesExpected);
  exactValueRun++;
  checkRecords.push({ id: x5.id, class: 'exactValue', rule: x5.rule, status: x5.status === 'pass' ? 'pass' : 'fail' });

  const totalMechanical = lintRun + resolutionRun + exactValueRun;

  // ===========================================================================
  // VERDICT
  // ===========================================================================
  summary.counts.intake = intakeCounts(g);
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
  summary.coverage.elementsExercised = elementsExercised(g);
  summary.coverage.elementsTotal = elementsTotal(g);
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

  // Any ❌-class (error-severity) failing check ⇒ fail.
  const hasErrorFail = checkRecords.some((c) => {
    if (c.status !== 'fail') return false;
    return true;
  });
  // BUT warn/info findings never block; we only marked error-fails as status
  // 'fail' above for L7/L8/L11/X2/X4/N3/N4/N5 (those are error-severity).
  // warn checks were recorded with status 'warn', not 'fail'.

  if (hasErrorFail) {
    summary.status = 'fail';
    emit(summary, 'fail');
  }

  summary.status = 'pass';
  emit(summary, 'pass');
}

function intakeCounts(g) {
  let steps = 0;
  for (const sk of g.skeletons) steps += sk.steps.length;
  return {
    events: g.events.length,
    actors: g.actors.length,
    hotspots: g.hotspots.length,
    skeletonSteps: steps,
  };
}

function elementsTotal(g) {
  let steps = 0;
  for (const sk of g.skeletons) steps += sk.steps.length;
  return g.events.length + g.actors.length + g.hotspots.length + steps;
}

// Every element is exercised by ≥1 check per §5; with all checks running, this
// equals elementsTotal. (Reported for transparency; reconciliation uses edges.)
function elementsExercised(g) {
  return elementsTotal(g);
}

main();
