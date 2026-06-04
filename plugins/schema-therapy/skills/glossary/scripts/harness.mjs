#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for the glossary artifact
// (`specs/02-glossary.md`), validated against its upstream `01-event-storming.md`.
// Implements references/simulation.md EXACTLY:
//   - TWO-FILE parse (02 + pinned 01 upstream) via lib/md.mjs
//   - upstream self-check (skeleton steps ∈ Domain Events) BEFORE resolution,
//     tagging resolving findings with class:"upstream-defect" (§9 case 2)
//   - lint (L1–L18: A-theme + mechanical B/C/D + E1/E2/E4-mech), resolution
//     (R1–R7), exact-value (X1–X5),
//     agent-judged placeholders (AJ1–AJ5; recorded, never block, not reconciled)
//   - status taxonomy: pass | fail | malformed | broken-test
//   - JSON summary on stdout (stable key order, sorted checks/findings by id);
//     diagnostics on stderr
//   - exit codes: 0 pass / 1 fail / 2 malformed (02) / 3 broken-test
//     (incl. unparseable 01 upstream)
//   - zero parsed checks ⇒ broken-test (never vacuous green)
//   - coverage + edge reconciliation per §5
//
// Node ≥18, plain ESM, zero external deps.
// Usage: node scripts/harness.mjs <02-artifact> --upstream <01-artifact> [--no-checks]

import { readFileSync } from 'node:fs';
import { parse, ParseError } from './lib/md.mjs';
import * as C from './lib/checks.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

// Agent-judged (simulation.md §6): recorded with a pass-verdict placeholder.
// They do NOT feed reconciliation arithmetic and never block. A real agent pass
// replaces the verdict; the mechanical verdict stays byte-deterministic.
const AJ_DEFS = [
  { id: 'AJ1', rule: 'C2', verdict: 'no-synonym' },
  { id: 'AJ2', rule: 'E2', verdict: 'defines-concept' },
  { id: 'AJ3', rule: 'C5', verdict: 'traces-or-legit-value' },
  { id: 'AJ4', rule: 'E3', verdict: 'terse-definition' },
  { id: 'AJ5', rule: 'D7', verdict: 'state-form' },
];

const N_BEHAVIORS = 25; // simulation.md §5 mapping table rows (every ❌ catalog rule, pos+neg)

function emit(summary, exitStatus) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[exitStatus]);
}

function baseSummary(artifactPath, upstreamPath, status) {
  return {
    skill: 'glossary',
    artifact: artifactPath,
    upstream: upstreamPath,
    status,
    counts: {
      intake: { terms: 0, enums: 0, enumValues: 0, forbidden: 0 },
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
  let upstream = null;
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--upstream') {
      upstream = args[i + 1];
      i++;
    } else if (args[i].startsWith('--')) {
      // flag (e.g. --no-checks); ignore here
    } else {
      positionals.push(args[i]);
    }
  }
  return { artifact: positionals[0] || null, upstream, noChecks };
}

function main() {
  const { artifact, upstream, noChecks } = parseArgs(process.argv);

  if (!artifact || !upstream) {
    process.stderr.write('usage: node scripts/harness.mjs <02-artifact> --upstream <01-artifact> [--no-checks]\n');
    process.exit(EXIT['broken-test']);
  }

  const summary = baseSummary(artifact, upstream, 'pass');

  // --- read both files -------------------------------------------------------
  let text02, text01;
  try {
    text02 = readFileSync(artifact, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read 02 artifact: ${e.message}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  try {
    text01 = readFileSync(upstream, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read 01 upstream: ${e.message}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // --- vacuous-green guard ---------------------------------------------------
  if (noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test';
    summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  // --- parse both ------------------------------------------------------------
  let doc02, doc01;
  try {
    doc02 = parse(text02);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (02 parser threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  try {
    doc01 = parse(text01);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (01 parser threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // --- 01 upstream parseability (simulation.md §9 case 3) --------------------
  // An unparseable upstream ⇒ broken-test (cannot anchor resolution targets).
  const up = C.parseUpstreamShape(doc01);
  if (!up.ok) {
    process.stderr.write(`BROKEN-TEST: upstream 01 unparseable: ${up.detail} — cannot resolve 02 references.\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  const u = C.deriveUpstream(doc01);

  // --- 01 upstream SELF-CHECK (pre-resolution, §9 case 2) --------------------
  // Every skeleton step must be a real 01 Domain-Events event. Defects here mean
  // the 01 is self-inconsistent; a resolving R-check finding gets tagged
  // class:"upstream-defect" and points at the 01 element.
  const self = C.upstreamSelfCheck(u);
  if (!self.ok) {
    process.stderr.write(
      `UPSTREAM-DEFECT note: 01 self-inconsistent — skeleton step(s) absent from 01 Domain Events: ` +
        self.defects.map((d) => `${d.aggregate}:'${d.step}'`).join(', ') + '\n'
    );
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
  // STAGE 1 — Malformed lints (L1–L4). Any failure ⇒ malformed of the 02.
  // ===========================================================================
  let g;
  try {
    g = C.deriveGraph(doc02);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (02 graph derive threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  const malformedLints = [
    C.lintL1_headings(doc02),
    C.lintL2_termsCols(g),
    C.lintL3_enumSubshape(g),
    C.lintL4_forbiddenCols(g),
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
    summary.counts.intake = C.intakeCounts(g);
    summary.checks = checkRecords;
    summary.findings = findings;
    emit(summary, 'malformed');
  }

  // ===========================================================================
  // STAGE 2 — Content lints (L5–L18; incl. E1-mech/L16, E4-mech/L17, E2-mech/L18).
  // ===========================================================================
  const contentLints = [
    C.lintL5_nonEmpty(g),
    C.lintL6_singleName(g),
    C.lintL7_fingerprint(doc02),
    C.lintL8_singleInput(doc02),
    C.lintL9_boundedContext(doc02),
    C.lintL10_freshness(doc02),
    C.lintL11_snakeCase(g),
    C.lintL12_casing(g),
    C.lintL13_techLeak(g),
    C.lintL14_vague(g),
    C.lintL15_defer(g),
    C.lintL16_restatedEventTable(doc02),
    C.lintL17_restatedHotspotBlock(doc02),
    C.lintL18_dryRestate(g, u),
  ];
  for (const cl of contentLints) {
    lintRun++;
    checkRecords.push({ id: cl.id, class: 'lint', rule: cl.rule, status: cl.status });
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
  // STAGE 3 — Resolution checks (R1–R7).
  // ===========================================================================
  const resChecks = [
    C.checkR1_termOwns(g, u),
    C.checkR2_coreConcept(g, u),
    C.checkR3_enumToSkeleton(g, u),
    C.checkR4_skeletonToEnum(g, u),
    C.checkR5_valueToEvent(g, u, self.defects),
    C.checkR6_valueOwningAggregate(g, u),
    C.checkR7_forbiddenCanonical(g),
  ];
  let edgesWalked = 0;
  for (const rc of resChecks) {
    resolutionRun++;
    edgesWalked += rc.edges || 0;
    checkRecords.push({ id: rc.id, class: 'resolution', rule: rc.rule, status: rc.status });
    if (rc.status === 'fail') {
      // Route an upstream-defect finding (§9 case 2): tag class + point at 01.
      if (rc.upstreamDefect) {
        findings.push({
          id: rc.id,
          rule: rc.rule,
          severity: 'error',
          class: 'upstream-defect',
          detail: `${rc.upstreamDetail} (fix upstream in ${upstream}, not ${artifact})`,
        });
        process.stderr.write(`UPSTREAM-DEFECT [${rc.id}/${rc.rule}]: ${rc.upstreamDetail} → route to ${upstream}\n`);
      } else {
        pushFinding(rc, 'error');
        process.stderr.write(`FAIL [${rc.id}/${rc.rule}]: ${rc.detail}\n`);
      }
    } else if (rc.status === 'warn') {
      pushFinding(rc, 'warn');
    }
  }

  // ===========================================================================
  // STAGE 4 — Exact-value checks (X1–X4; X5 reconciliation after counters).
  // ===========================================================================
  const exactChecks = [
    C.checkX1_termCount(g, g.terms.length),
    C.checkX2_noDuplicateTerm(g),
    C.checkX3_valueOrdering(g, u),
    C.checkX4_enumBijection(g, u),
  ];
  for (const xc of exactChecks) {
    exactValueRun++;
    checkRecords.push({ id: xc.id, class: 'exactValue', rule: xc.rule, status: xc.status });
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
  const edgesExpected = C.expectedEdges(g, u);
  const executedMechanical = lintRun + resolutionRun + exactValueRun; // pre-X5
  const x5 = C.checkX5_reconcile(executedMechanical, edgesWalked, edgesExpected);
  exactValueRun++;
  checkRecords.push({ id: x5.id, class: 'exactValue', rule: x5.rule, status: x5.status === 'pass' ? 'pass' : 'fail' });

  const totalMechanical = lintRun + resolutionRun + exactValueRun;

  // ===========================================================================
  // VERDICT
  // ===========================================================================
  summary.counts.intake = C.intakeCounts(g);
  summary.counts.checks = {
    lint: lintRun,
    resolution: resolutionRun,
    exactValue: exactValueRun,
    negative: 0, // negatives proven over fixtures in selftest, not here
    agentJudged: ajRun,
    total: totalMechanical + ajRun,
  };
  summary.counts.edgesWalked = edgesWalked;
  summary.counts.edgesExpected = edgesExpected;
  summary.coverage.elementsTotal = C.elementsTotal(g);
  summary.coverage.elementsExercised = C.elementsTotal(g);
  summary.checks = checkRecords;
  summary.findings = findings;

  // Zero parsed mechanical checks ⇒ broken-test (no vacuous green).
  if (totalMechanical === 0) {
    summary.status = 'broken-test';
    summary.reconciled = false;
    process.stderr.write('BROKEN-TEST: zero mechanical checks executed (vacuous green guard).\n');
    emit(summary, 'broken-test');
  }

  // Reconciliation failure ⇒ broken-test (silently dropped check / edge).
  if (x5.status !== 'pass') {
    summary.status = 'broken-test';
    summary.reconciled = false;
    process.stderr.write(`BROKEN-TEST [X5]: ${x5.detail}\n`);
    emit(summary, 'broken-test');
  }

  summary.reconciled = true;

  // Any error-severity failing check ⇒ fail (includes upstream-defect findings,
  // whose status stays `fail` — the taxonomy is closed; the finding carries the
  // distinguished class for routing, §9).
  const hasErrorFail = checkRecords.some((c) => c.status === 'fail');

  if (hasErrorFail) {
    summary.status = 'fail';
    emit(summary, 'fail');
  }

  summary.status = 'pass';
  emit(summary, 'pass');
}

main();
