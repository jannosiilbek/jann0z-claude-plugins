#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for the personas artifact
// (`specs/07-personas.md`), validated against BOTH upstreams
// `00-impact-map.md` and `01-event-storming.md`. Implements
// references/simulation.md EXACTLY:
//   - THREE-FILE parse (07 + pinned 00 + pinned 01) via lib/md.mjs
//   - 00 self-check (R6: impact→actor chain) BEFORE resolution; failure ⇒ a
//     finding tagged class:"upstream-defect", upstream:"00-impact-map.md"
//     (status fail, taxonomy closed — §9 case 2)
//   - lint (L1–L14: A-theme + mechanical B/F), resolution (R1–R6),
//     exact-value (X1–X5), trigger classifier (§3.3, recorded never blocking),
//     agent-judged placeholders (AJ1–AJ5; recorded, never block, not reconciled)
//   - status taxonomy: pass | fail | malformed | broken-test
//   - JSON summary on stdout (stable key order, sorted checks/findings/triggers);
//     diagnostics on stderr
//   - exit codes: 0 pass / 1 fail / 2 malformed (07) / 3 broken-test
//     (incl. unparseable 00 or 01 upstream)
//   - zero parsed checks ⇒ broken-test (never vacuous green)
//   - coverage + edge reconciliation per §5
//   - fingerprint shape/64-hex check ONLY (never recompute the digest — §1/§8)
//
// Node ≥18, plain ESM, zero external deps.
// Usage:
//   node scripts/harness.mjs <07-artifact> --upstream-00 <00> --upstream-01 <01> [--no-checks]

import { readFileSync } from 'node:fs';
import { parse, ParseError } from './lib/md.mjs';
import * as C from './lib/checks.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

// Agent-judged (simulation.md §6): recorded with a pass-verdict placeholder.
// They do NOT feed reconciliation arithmetic and never block. A real agent pass
// replaces the verdict; the mechanical verdict stays byte-deterministic.
const AJ_DEFS = [
  { id: 'AJ1', rule: 'B2', verdict: 'end-condition' },
  { id: 'AJ2', rule: 'B4', verdict: 'has-end-goal' },
  { id: 'AJ3', rule: 'D4', verdict: 'serves-a-goal' },
  { id: 'AJ4', rule: 'C3', verdict: 'one-pattern-no-restate' },
  { id: 'AJ5', rule: 'C2', verdict: 'uses-upstream-vocab' },
];

const N_BEHAVIORS = 21; // = the 21 ❌ rules in simulation.md §5 (pos+neg each) = selftest COVERAGE rows with a shipped negative; asserted in PART 8

function emit(summary, exitStatus) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.triggers.sort(
    (a, b) => a.persona.localeCompare(b.persona, 'en') || a.job.localeCompare(b.job, 'en')
  );
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[exitStatus]);
}

function baseSummary(artifact, up00, up01, status) {
  return {
    skill: 'personas',
    artifact,
    upstream00: up00,
    upstream01: up01,
    status,
    counts: {
      intake: { personas: 0, goals: 0, jobs: 0 },
      checks: { lint: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      edgesWalked: 0,
      edgesExpected: 0,
    },
    reconciled: false,
    coverage: { elementsExercised: 0, elementsTotal: 0, behaviorsWithPosAndNeg: N_BEHAVIORS },
    triggers: [],
    checks: [],
    findings: [],
  };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const noChecks = args.includes('--no-checks');
  let up00 = null;
  let up01 = null;
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--upstream-00') {
      up00 = args[i + 1];
      i++;
    } else if (args[i] === '--upstream-01') {
      up01 = args[i + 1];
      i++;
    } else if (args[i].startsWith('--')) {
      // flag (e.g. --no-checks); ignore here
    } else {
      positionals.push(args[i]);
    }
  }
  return { artifact: positionals[0] || null, up00, up01, noChecks };
}

function main() {
  const { artifact, up00, up01, noChecks } = parseArgs(process.argv);

  if (!artifact || !up00 || !up01) {
    process.stderr.write(
      'usage: node scripts/harness.mjs <07-artifact> --upstream-00 <00> --upstream-01 <01> [--no-checks]\n'
    );
    process.exit(EXIT['broken-test']);
  }

  const summary = baseSummary(artifact, up00, up01, 'pass');

  // --- read all three files --------------------------------------------------
  let text07, text00, text01;
  try {
    text07 = readFileSync(artifact, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read 07 artifact: ${e.message}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  try {
    text00 = readFileSync(up00, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read 00 upstream: ${e.message}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  try {
    text01 = readFileSync(up01, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read 01 upstream: ${e.message}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // --- vacuous-green guard ---------------------------------------------------
  if (noChecks) {
    process.stderr.write(
      'BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n'
    );
    summary.status = 'broken-test';
    summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  // --- parse all three -------------------------------------------------------
  let doc07, doc00, doc01;
  try {
    doc07 = parse(text07);
  } catch (e) {
    if (e instanceof ParseError) {
      process.stderr.write(`MALFORMED (07 parse) [${e.rule || '?'}]: ${e.message}\n`);
      summary.status = 'malformed';
      emit(summary, 'malformed');
    }
    process.stderr.write(`BROKEN-TEST (07 parser threw): ${e.stack}\n`);
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
  try {
    doc01 = parse(text01);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (01 parser threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // --- upstream parseability (simulation.md §9 case 3) -----------------------
  // An unparseable upstream ⇒ broken-test (cannot anchor resolution targets).
  const u00 = C.deriveUpstream00(doc00);
  if (!u00.ok) {
    process.stderr.write(`BROKEN-TEST: upstream 00 unparseable: ${u00.detail} — cannot resolve 07 references.\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }
  const u01 = C.deriveUpstream01(doc01);
  if (!u01.ok) {
    process.stderr.write(`BROKEN-TEST: upstream 01 unparseable: ${u01.detail} — cannot resolve 07 references.\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  // --- 00 SELF-CHECK (pre-resolution, §9 case 2) -----------------------------
  // Every 00 Impact's Business Actor must resolve into 00's own Business Actors.
  // A defect here is a 00 defect (upstream-defect → 00), not a 07 defect.
  const self00 = C.upstream00SelfCheck(u00);
  if (!self00.ok) {
    process.stderr.write(
      `UPSTREAM-DEFECT note: 00 self-inconsistent — impact(s) name a ghost actor: ` +
        self00.defects.map((d) => `'${d.impact}'→'${d.ghost}'`).join(', ') + '\n'
    );
  }

  // --- 07 graph --------------------------------------------------------------
  let g;
  try {
    g = C.deriveGraph(doc07);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (07 graph derive threw): ${e.stack}\n`);
    summary.status = 'broken-test';
    emit(summary, 'broken-test');
  }

  const checkRecords = [];
  const findings = [];
  let lintRun = 0, resolutionRun = 0, exactValueRun = 0, ajRun = 0;

  const pushFinding = (r, severity, extra = {}) => {
    if (!r.detail) return;
    findings.push({ id: r.id, rule: r.rule, severity, detail: r.detail, ...extra });
  };

  // ===========================================================================
  // STAGE 1 — Malformed lints (L1, L3, L4, L5). Any failure ⇒ malformed of 07.
  // ===========================================================================
  const malformedLints = [
    C.lintL1_headings(doc07),
    C.lintL3_personaBlocks(g),
    C.lintL4_blockFields(g),
    C.lintL5_jobsColumns(g),
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
  // STAGE 2 — Content lints (L2, L6–L14).
  // ===========================================================================
  const contentLints = [
    C.lintL2_fingerprints(doc07),
    C.lintL6_singleActor(g),
    C.lintL7_goalTokens(g),
    C.lintL8_nonEmpty(g),
    C.lintL9_featureGoal(g),
    C.lintL10_pascalCase(g),
    C.lintL11_vagueFiller(g),
    C.lintL12_restated00Table(doc07),
    C.lintL13_restated01Table(doc07),
    C.lintL14_verbatimWindow(g, u00, u01),
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
  // STAGE 3 — Resolution checks (R1–R6). R6 is the 00 self-check (upstream-defect).
  // ===========================================================================
  const resChecks = [
    C.checkR1_actorResolves(g, u00),
    C.checkR2_coverage(g, u00),
    C.checkR3_impactResolves(g, u00),
    C.checkR4_outcomeResolves(g, u01),
    C.checkR5_noInventedParty(g, u00, u01),
    C.checkR6_upstream00SelfConsistency(u00, self00),
  ];
  let edgesWalked = 0;
  for (const rc of resChecks) {
    resolutionRun++;
    edgesWalked += rc.edges || 0;
    checkRecords.push({ id: rc.id, class: 'resolution', rule: rc.rule, status: rc.status });
    if (rc.status === 'fail') {
      if (rc.upstreamDefect) {
        // §9 case 2: route the finding to the 00 owner; status stays fail.
        findings.push({
          id: rc.id,
          rule: rc.rule,
          severity: 'error',
          class: 'upstream-defect',
          upstream: '00-impact-map.md',
          detail: `${rc.upstreamDetail} (fix upstream in 00-impact-map.md, not ${artifact})`,
        });
        process.stderr.write(
          `UPSTREAM-DEFECT [${rc.id}/${rc.rule}]: ${rc.upstreamDetail} → route to 00-impact-map.md\n`
        );
      } else {
        pushFinding(rc, 'error');
        process.stderr.write(`FAIL [${rc.id}/${rc.rule}]: ${rc.detail}\n`);
      }
    } else if (rc.status === 'warn') {
      pushFinding(rc, 'warn');
    }
  }

  // ===========================================================================
  // STAGE 4 — Trigger classifier (§3.3). Recorded in triggers[]; D3 near-miss
  // is a warn-finding. Walks one classification edge per job (counted below).
  // ===========================================================================
  const tc = C.classifyTriggers(g, u01);
  summary.triggers = tc.triggers;
  edgesWalked += g.personas.reduce((n, p) => n + p.jobs.length, 0); // trigger edges
  const d3 = C.checkD3_nearMiss(tc.nearMisses);
  if (d3.status === 'warn') {
    findings.push({ id: 'D3', rule: 'D3', severity: 'warn', detail: d3.detail });
    process.stderr.write(`NEAR-MISS [D3]: ${d3.detail} (condition branch never blocks — recorded ⚠️)\n`);
  }

  // ===========================================================================
  // STAGE 5 — Exact-value checks (X1–X4; X5 reconciliation after counters).
  // ===========================================================================
  const exactChecks = [
    C.checkX1_eachHasGoalAndJob(g),
    C.checkX2_uniquePersonaNames(g),
    C.checkX3_uniqueJobsPerPersona(g),
    C.checkX4_coverageCardinality(g, u00),
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
  // STAGE 6 — Agent-judged (recorded, never blocking, not in reconciliation).
  // ===========================================================================
  for (const aj of AJ_DEFS) {
    ajRun++;
    checkRecords.push({ id: aj.id, class: 'agent-judged', rule: aj.rule, verdict: aj.verdict });
  }

  // ===========================================================================
  // STAGE 7 — Reconciliation (X5). Mechanical checks only (AJ excluded).
  // ===========================================================================
  const edgesExpected = C.expectedEdges(g, u00);
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
  // elementsExercised mirrors elementsTotal BY CONSTRUCTION: every element (persona,
  // goal, job) is visited by the per-persona/per-row mechanical checks (L6–L9, X1–X3,
  // R-*) on any non-broken run — there is no partially-exercised element to under-count.
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
  // distinguished class for routing, §9). warn/info recorded but never block.
  const hasErrorFail = checkRecords.some((c) => c.status === 'fail');
  if (hasErrorFail) {
    summary.status = 'fail';
    emit(summary, 'fail');
  }

  summary.status = 'pass';
  emit(summary, 'pass');
}

main();
