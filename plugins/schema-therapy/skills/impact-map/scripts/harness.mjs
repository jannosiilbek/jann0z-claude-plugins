#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for the impact-map artifact
// (`specs/00-impact-map.md`). Implements simulation.md EXACTLY:
//   - hand-rolled markdown parse (lib/md.mjs)
//   - lint (L1–L13), resolution (N1/N2/N3/N5), exact-value (X1–X5),
//     agent-judged placeholders (AJ1–AJ5 recorded, not invented into counts)
//   - status taxonomy: pass | fail | malformed | broken-test
//   - machine-readable JSON summary on stdout, diagnostics on stderr
//   - exit codes: 0 pass / 1 fail / 2 malformed / 3 broken-test
//   - zero parsed checks ⇒ broken-test (never vacuous green)
//   - coverage reconciliation per §5
//   - fingerprint shape/64-hex check ONLY (never recompute the digest — §1/§8)
//
// Node ≥18, plain ESM, zero external deps.
// Usage: node scripts/harness.mjs <artifact.md> [--no-checks] [--baseline <prev.md>]
//
// AMENDMENT MODE (`--baseline <previous-00>`): parse the baseline with the SAME
// reader, compute the element-level diff (added/removed/changed keyed by name
// per table; goalChanged / fingerprintChanged booleans), emit it as a `baseline`
// block in the JSON summary, and run the flag-conditional check XD1
// (exactValue, [PLAN]-amend) which asserts the diff reconciles. A
// missing/unreadable/unparseable baseline ⇒ broken-test (exit 3): the comparison
// has no authority. With no flag, no `baseline` block, XD1 not run, all existing
// behavior byte-identical.

import { readFileSync } from 'node:fs';
import { parse, ParseError } from './lib/md.mjs';
import * as C from './lib/checks.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

// AJ checks (simulation.md §6): recorded with a pass-verdict placeholder. They
// do NOT feed reconciliation arithmetic and never block. A real agent pass
// replaces the verdict; the mechanical verdict stays byte-deterministic.
const AJ_DEFS = [
  { id: 'AJ1', rule: 'D2', verdict: 'behaviour-change' },
  { id: 'AJ2', rule: 'B2', verdict: 'outcome' },
  { id: 'AJ3', rule: 'C1', verdict: 'concrete-and-spanning' },
  { id: 'AJ4', rule: 'D3', verdict: 'single-actor-and-goal-linked' },
  { id: 'AJ5', rule: 'E2', verdict: 'option-and-high-level' },
];

function emit(summary, exitStatus) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[exitStatus]);
}

function baseSummary(artifactPath, status) {
  return {
    skill: 'impact-map',
    artifact: artifactPath,
    status,
    counts: {
      intake: { goal: 0, actors: 0, impacts: 0, deliverables: 0 },
      checks: { lint: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      edgesWalked: 0,
      edgesExpected: 0,
    },
    reconciled: false,
    coverage: { elementsExercised: 0, elementsTotal: 0, behaviorsWithPosAndNeg: 17 },
    checks: [],
    findings: [],
  };
}

function intakeCounts(g) {
  return {
    goal: C.norm(g.goal) !== '' ? 1 : 0,
    actors: g.actors.length,
    impacts: g.impacts.length,
    deliverables: g.deliverables.length,
  };
}

function elementsTotal(g) {
  return (C.norm(g.goal) !== '' ? 1 : 0) + g.actors.length + g.impacts.length + g.deliverables.length;
}

function main() {
  const args = process.argv.slice(2);
  // `--no-checks` exercises the vacuous-green GUARD: it disables the check
  // corpus so zero checks parse, which MUST yield broken-test, never a vacuous
  // pass (simulation.md §3.2 `vacuous.md`).
  const noChecks = args.includes('--no-checks');

  // Parse `--baseline <prev.md>`. Its VALUE is a bare path (no `--` lead), so we
  // consume it explicitly and exclude it from the positional artifact scan below.
  let baselinePath = null;
  const consumed = new Set();
  const bIdx = args.indexOf('--baseline');
  if (bIdx !== -1) {
    baselinePath = args[bIdx + 1];
    consumed.add(bIdx);
    if (baselinePath !== undefined) consumed.add(bIdx + 1);
    if (baselinePath === undefined || baselinePath.startsWith('--')) {
      process.stderr.write('BROKEN-TEST: --baseline requires a path argument\n');
      process.exit(EXIT['broken-test']);
    }
  }
  const positionals = args.filter((a, i) => !a.startsWith('--') && !consumed.has(i));
  const artifactPath = positionals[0];
  if (!artifactPath) {
    process.stderr.write('usage: node scripts/harness.mjs <artifact.md> [--no-checks] [--baseline <prev.md>]\n');
    process.exit(EXIT['broken-test']);
  }

  let text;
  try {
    text = readFileSync(artifactPath, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read artifact: ${e.message}\n`);
    emit(baseSummary(artifactPath, 'broken-test'), 'broken-test');
  }

  const summary = baseSummary(artifactPath, 'pass');

  let doc;
  try {
    doc = parse(text);
  } catch (e) {
    if (e instanceof ParseError) {
      process.stderr.write(`MALFORMED (parse) [${e.rule || '?'}]: ${e.message}\n`);
      summary.status = 'malformed';
      emit(summary, 'malformed');
    }
    process.stderr.write(`BROKEN-TEST (parser threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  if (noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test';
    summary.reconciled = false;
    summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  let g;
  try {
    g = C.deriveGraph(doc);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (graph derive threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // ===========================================================================
  // AMENDMENT MODE — parse the baseline with the SAME reader and compute the
  // element-level diff. A baseline that is missing/unreadable/unparseable ⇒
  // broken-test (exit 3): the comparison has no authority. Computed here (after
  // the artifact graph) so the `baseline` block + XD1 are available downstream.
  // ===========================================================================
  let baselineDiff = null;
  let baselineGraph = null;
  if (baselinePath !== null) {
    let baseText;
    try {
      baseText = readFileSync(baselinePath, 'utf8');
    } catch (e) {
      process.stderr.write(`BROKEN-TEST: cannot read baseline '${baselinePath}': ${e.message} (comparison has no authority)\n`);
      summary.status = 'broken-test';
      emit(summary, 'broken-test');
    }
    let baseDoc;
    try {
      baseDoc = parse(baseText);
    } catch (e) {
      process.stderr.write(`BROKEN-TEST: baseline '${baselinePath}' unparseable [${(e && e.rule) || '?'}]: ${e.message} (comparison has no authority)\n`);
      summary.status = 'broken-test';
      emit(summary, 'broken-test');
    }
    // The baseline must itself anchor against the pinned A-theme shape; if any
    // malformed-class lint fails, the baseline is not a valid prior generation
    // and the comparison has no authority ⇒ broken-test.
    let baseG;
    try {
      baseG = C.deriveGraph(baseDoc);
    } catch (e) {
      process.stderr.write(`BROKEN-TEST: baseline '${baselinePath}' graph derive threw: ${e.message} (comparison has no authority)\n`);
      summary.status = 'broken-test';
      emit(summary, 'broken-test');
    }
    const baseMalformed = [
      C.lintL1_headings(baseDoc),
      C.lintL2_fingerprintBlock(baseDoc),
      C.lintL3_actorsCols(baseG),
      C.lintL4_impactsCols(baseG),
      C.lintL5_deliverablesCols(baseG),
      C.lintL6_singleGoal(baseG),
    ].find((ml) => !ml.ok);
    if (baseMalformed) {
      process.stderr.write(`BROKEN-TEST: baseline '${baselinePath}' is malformed [${baseMalformed.id}/${baseMalformed.rule}]: ${baseMalformed.detail} (comparison has no authority)\n`);
      summary.status = 'broken-test';
      emit(summary, 'broken-test');
    }
    baselineGraph = baseG;
    baselineDiff = C.computeBaselineDiff(g, baseG);
    summary.baseline = baselineDiff;
  }

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
  const malformedLints = [
    C.lintL1_headings(doc),
    C.lintL2_fingerprintBlock(doc),
    C.lintL3_actorsCols(g),
    C.lintL4_impactsCols(g),
    C.lintL5_deliverablesCols(g),
    C.lintL6_singleGoal(g),
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
    summary.counts.intake = intakeCounts(g);
    summary.checks = checkRecords;
    summary.findings = findings;
    emit(summary, 'malformed');
  }

  // ===========================================================================
  // STAGE 2 — Content lints (L7–L13).
  // ===========================================================================
  const contentLints = [
    C.lintL7_fingerprintHex(doc),
    C.lintL8_nonEmpty(g),
    C.lintL9_featureImpact(g),
    C.lintL10_vague(g),
    C.lintL11_measurableGoal(g),
    C.lintL12_techLeak(g),
    C.lintL13_conflation(g),
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
  // STAGE 3 — Resolution checks (N1, N2, N3, N5).
  // ===========================================================================
  const resChecks = [
    C.checkN1_actorResolves(g),
    C.checkN2_impactResolves(g),
    C.checkN3_stability(g),
    C.checkN5_transitiveChain(g),
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
  // STAGE 4 — Exact-value checks (X1–X4; X5 reconciles after counting).
  // ===========================================================================
  const x1 = C.checkX1_counts(g, g.actors.length, g.impacts.length, g.deliverables.length);
  const x2 = C.checkX2_uniqueActors(g);
  const x3 = C.checkX3_uniqueImpactsDeliverables(g);
  const x4 = C.checkX4_singleGoal(g);
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
  // STAGE 4b — XD1 (exactValue, [PLAN]-amend): flag-conditional. Runs ONLY when
  // --baseline was given. Asserts the diff reconciles (per-table counts match
  // each side's own parse; added/removed/changed disjoint by (table,name)). XD1
  // does NOT judge whether the diff is justified — that is the professor's job
  // (delta traceability). A diff WITH entries is still `pass` mechanically.
  // XD1 participates in executedChecks (exactValueRun) when run, but walks ZERO
  // edges, so it is excluded from the always-run edge reconciliation arithmetic
  // (edgesExpected unchanged). When no flag is given, XD1 is absent entirely.
  // ===========================================================================
  if (baselineDiff !== null) {
    const xd1 = C.checkXD1_amendReconcile(baselineDiff, g, baselineGraph);
    exactValueRun++;
    checkRecords.push({
      id: xd1.id,
      class: 'exactValue',
      rule: xd1.rule,
      status: xd1.status === 'pass' ? 'pass' : 'fail',
    });
    if (xd1.status !== 'pass') {
      findings.push({ id: xd1.id, rule: xd1.rule, severity: 'error', detail: xd1.detail });
      process.stderr.write(`BROKEN-TEST [XD1]: ${xd1.detail}\n`);
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
  const edgesExpected = C.expectedEdges(g);
  const executedMechanical = lintRun + resolutionRun + exactValueRun; // before X5
  const x5 = C.checkX5_reconcile(executedMechanical, edgesWalked, edgesExpected);
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
  summary.coverage.elementsExercised = elementsTotal(g);
  summary.coverage.elementsTotal = elementsTotal(g);
  summary.checks = checkRecords;
  summary.findings = findings;

  if (totalMechanical === 0) {
    summary.status = 'broken-test';
    summary.reconciled = false;
    process.stderr.write('BROKEN-TEST: zero mechanical checks executed (vacuous green guard).\n');
    emit(summary, 'broken-test');
  }

  if (x5.status !== 'pass') {
    summary.status = 'broken-test';
    summary.reconciled = false;
    process.stderr.write(`BROKEN-TEST [X5]: ${x5.detail}\n`);
    emit(summary, 'broken-test');
  }

  summary.reconciled = true;

  // Any error-severity failing check ⇒ fail. (warn/info recorded but never block.)
  const hasErrorFail = checkRecords.some((c) => c.status === 'fail');
  if (hasErrorFail) {
    summary.status = 'fail';
    emit(summary, 'fail');
  }

  summary.status = 'pass';
  emit(summary, 'pass');
}

main();
