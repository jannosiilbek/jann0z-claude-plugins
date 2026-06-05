#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the impact-map oracle
// (verification doctrine §3): a regression suite proving the harness catches
// false-greens. It demonstrates the oracle:
//   1. produces the EXACT expected status + owner-check per fixture manifest;
//   2. reports the wrong-reason trap's RIGHT reason — N1 fires on the ACTOR,
//      and N1's detail names the right element ('Advertisers'), not the
//      co-present unmeasurable-goal vocabulary ('measur…');
//   3. cannot emit a vacuous green: the --no-checks corpus and a contentless
//      artifact both yield broken-test/non-pass, never pass (exit 3 never pass);
//   4. reconciles counters: a deliberately dropped edge/check is DETECTED (X5
//      turns red ⇒ broken-test) — counter/edge-reconciliation conflation guard;
//   5. is fixture-isolated: running the same artifact twice yields
//      byte-identical stdout (no state leaks across runs);
//   6. coverage floor: every one of the 17 ❌ catalog rules (simulation.md §5.1)
//      has ≥1 positive (a passing check over valid.md) AND ≥1 dedicated
//      negative (a failing fixture on its owner check).
//
// Exit 0 ONLY when every assertion passes. Zero external deps.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(__dirname, 'harness.mjs');
const FIXTURES = join(__dirname, 'fixtures');
const MANIFEST = JSON.parse(readFileSync(join(FIXTURES, 'manifest.json'), 'utf8'));

let passed = 0;
let failed = 0;
const fails = [];

function ok(cond, label) {
  if (cond) {
    passed++;
  } else {
    failed++;
    fails.push(label);
    process.stderr.write(`  ✗ ${label}\n`);
  }
}

function runHarnessAbs(absPath, args = []) {
  let stdout = '';
  let code = 0;
  try {
    stdout = execFileSync('node', [HARNESS, absPath, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (e) {
    stdout = e.stdout ? e.stdout.toString() : '';
    code = typeof e.status === 'number' ? e.status : -1;
  }
  let json = null;
  try {
    json = JSON.parse(stdout);
  } catch {
    json = null;
  }
  return { stdout, code, json };
}
// Resolve a `--baseline <file>` arg's bare fixture name to an absolute path so
// the harness (which resolves baseline paths relative to its OWN cwd) reads the
// shipped fixture regardless of where the selftest runs from.
function resolveBaselineArgs(args = []) {
  const out = args.slice();
  const i = out.indexOf('--baseline');
  if (i !== -1 && out[i + 1] !== undefined) out[i + 1] = join(FIXTURES, out[i + 1]);
  return out;
}
function runHarness(file, args = []) {
  return runHarnessAbs(join(FIXTURES, file), resolveBaselineArgs(args));
}

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

// ===========================================================================
// PART 1 — Every fixture matches its manifest (status + owner check + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
for (const fx of MANIFEST.fixtures) {
  const { code, json } = runHarness(fx.file, fx.args || []);
  ok(json !== null, `[${fx.file}] emits parseable JSON summary on stdout`);
  if (!json) continue;

  ok(json.status === fx.status, `[${fx.file}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${fx.file}] exit code === ${EXIT[fx.status]} for status ${fx.status} (got ${code})`);

  if (fx.failingCheck) {
    const failingCheckIds = json.checks.filter((c) => c.status === 'fail').map((c) => c.id);
    const findingIds = json.findings.map((f) => f.id);
    const present = failingCheckIds.includes(fx.failingCheck) || findingIds.includes(fx.failingCheck);
    ok(present, `[${fx.file}] owner check ${fx.failingCheck} is among rejections (fails=[${failingCheckIds.join(',')}])`);
  }

  if (fx.failingCheck === null && fx.status === 'pass') {
    const anyFail = json.checks.some((c) => c.status === 'fail');
    ok(!anyFail, `[${fx.file}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${fx.file}] clean pass reconciled === true`);
  }
}

// ===========================================================================
// PART 2 — Wrong-reason trap: N1 fires on the ACTOR, not the goal defect.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports the ACTOR reason (not the unmeasurable-goal reason)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  ok(trap.failingCheck === 'N1', 'manifest pins trap owner check to N1 (not L11)');
  const { json } = runHarness(trap.file, trap.args || []);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const n1 = json && json.findings.find((f) => f.id === 'N1');
  ok(!!n1, 'trap reports an N1 finding (the actor-resolution check fired)');
  if (n1) {
    ok(
      n1.detail.includes(trap.trapDetailMustContain),
      `N1 detail names the offending actor ('${trap.trapDetailMustContain}') — not a collateral reason`
    );
    ok(
      !n1.detail.toLowerCase().includes(trap.trapDetailMustNotContain),
      `N1 detail does NOT invoke '${trap.trapDetailMustNotContain}' (proves N1 isolates over L11's goal defect)`
    );
  }
  // L11 still fires (the co-present defect IS detected) — but the trap's OWNER is N1.
  ok(json && json.checks.some((c) => c.id === 'L11' && c.status === 'fail'),
    'trap: co-present L11 (unmeasurable goal) IS still detected (both defects fire, owner stays N1)');
}

// ===========================================================================
// PART 3 — No vacuous green: disabled corpus / contentless cannot pass.
// ===========================================================================
process.stderr.write('PART 3 — no vacuous green (exit 3 never pass)\n');
{
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = runHarness(vac.file, vac.args);
  ok(r.json && r.json.status === 'broken-test', 'disabled-corpus (--no-checks) ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, 'disabled-corpus reports zero parsed checks');
  ok(r.code === 3, 'disabled-corpus exits 3 (broken-test) — exit 3 is never a pass');

  const empty = writeTmp('selftest-empty.md', '\n');
  const re = runHarnessAbs(empty);
  ok(re.json && re.json.status !== 'pass', 'contentless artifact does not pass (status=' + (re.json && re.json.status) + ')');
  ok(re.json && (re.json.status === 'malformed' || re.json.status === 'broken-test'),
    'contentless artifact is malformed/broken-test (never pass)');
}

// ===========================================================================
// PART 4 — Counters reconcile: a dropped check / mismatched edge is DETECTED.
//          (counter vs edge-reconciliation conflation guard.)
// ===========================================================================
process.stderr.write('PART 4 — reconciliation catches a dropped check / edge mismatch\n');
{
  const checks = await import('./lib/checks.mjs');

  // Drop one edge: walked = expected - 1 ⇒ broken (a silently dropped edge).
  const dropped = checks.checkX5_reconcile(22, 9, 10);
  ok(dropped.status === 'broken', 'X5 detects a dropped edge (walked 9 vs expected 10) ⇒ broken');

  // Zero executed checks ⇒ broken even if edges happen to match (no vacuous green).
  const zero = checks.checkX5_reconcile(0, 0, 0);
  ok(zero.status === 'broken', 'X5 with zero executed checks ⇒ broken (no vacuous green)');

  // The healthy case still passes (guard against a check that never goes green).
  const okCase = checks.checkX5_reconcile(22, 10, 10);
  ok(okCase.status === 'pass', 'X5 passes when executed>0 and edges reconcile');

  // Conflation guard: the intake count (X1) and the edge count (X5) are DISTINCT
  // arithmetics. Prove expectedEdges is not merely the intake total — a dropped
  // EDGE must not be masked by a matching element count.
  const valid = runHarness('valid.md').json;
  const intakeTotal = valid.counts.intake.goal + valid.counts.intake.actors +
    valid.counts.intake.impacts + valid.counts.intake.deliverables;
  ok(valid.counts.edgesExpected !== intakeTotal,
    `edgesExpected (${valid.counts.edgesExpected}) is a distinct arithmetic from intake total (${intakeTotal}) — counter/edge not conflated`);

  ok(valid.counts.edgesWalked === valid.counts.edgesExpected,
    `valid.md edgesWalked === edgesExpected (${valid.counts.edgesWalked}/${valid.counts.edgesExpected})`);
  ok(valid.counts.checks.total > 0, 'valid.md executed >0 checks (not vacuous)');
}

// ===========================================================================
// PART 5 — Determinism: same input twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 5 — determinism / no cross-run state leak (byte-identical double-run)\n');
{
  const a = runHarness('valid.md').stdout;
  const b = runHarness('valid.md').stdout;
  ok(a === b, 'valid.md run twice ⇒ byte-identical stdout (no state leak)');

  const first = runHarness('valid.md').stdout;
  runHarness('unknown-actor.md');
  const second = runHarness('valid.md').stdout;
  ok(first === second, 'valid.md output stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 6 — Coverage floor: every one of the 17 ❌ catalog rules (simulation.md
// §5.1) has BOTH a positive (passing check over valid.md) AND a dedicated
// negative (a failing fixture on its owner check). Source of truth = §5.1.
// ===========================================================================
process.stderr.write('PART 6 — coverage floor: all 17 ❌ rules have a positive AND a dedicated negative\n');
{
  // [catalog ❌ rule, positive check id over valid.md, owner check on negative, negative fixture file]
  // Mirrors simulation.md §5.1 exactly (17 rows). A5's negative shares the
  // parser-malform class via bad-impacts-columns (§5.1 note "covered by parser
  // malform; shares N9"); we anchor A5's positive on L5 and its negative on the
  // structural malform proven by a column-shape fixture.
  const COVERAGE = [
    ['A1', 'L1', 'L1', 'missing-section.md'],
    ['A2', 'L2', 'L2', 'malformed-fingerprint-block.md'],
    ['A3', 'L3', 'L3', 'bad-actors-columns.md'],
    ['A4', 'L4', 'L4', 'bad-impacts-columns.md'],
    ['A5', 'L5', 'L1', 'out-of-order-sections.md'],
    ['A6', 'L6', 'L6', 'multi-goal.md'],
    ['A7', 'L8', 'L8', 'empty-deliverables.md'],
    ['A8', 'L7', 'L7', 'placeholder-fingerprint.md'],
    ['B1', 'L11', 'L11', 'unmeasurable-goal.md'],
    ['B2', 'L9', 'L9', 'feature-impact.md'],
    ['D1', 'L9', 'L9', 'feature-impact.md'],
    ['E1', 'N2', 'N2', 'dangling-deliverable.md'],
    ['F1', 'N1', 'N1', 'unknown-actor.md'],
    ['F2', 'N2', 'N2', 'dangling-deliverable.md'],
    ['F5', 'N5', 'N5', 'broken-chain.md'],
    ['G2', 'X2', 'X2', 'dup-actor.md'],
    ['G3', 'N3', 'N3', 'case-drift-actor.md'],
  ];
  ok(COVERAGE.length === 17, `coverage table enumerates all 17 ❌ rules (got ${COVERAGE.length})`);

  const valid = runHarness('valid.md').json;
  let covered = 0;
  for (const [rule, posId, ownerId, negFile] of COVERAGE) {
    const pos = valid.checks.find((c) => c.id === posId);
    const positiveOk = pos && pos.status === 'pass';
    ok(positiveOk, `[coverage ${rule}] positive ${posId} passes over valid.md`);

    const negFx = MANIFEST.fixtures.find((f) => f.file === negFile);
    ok(!!negFx && negFx.status !== 'pass', `[coverage ${rule}] negative fixture ${negFile} is a non-pass`);
    const neg = runHarness(negFile).json;
    const negFails =
      neg.checks.some((c) => c.id === ownerId && c.status === 'fail') ||
      neg.findings.some((f) => f.id === ownerId);
    ok(negFails, `[coverage ${rule}] negative fixture ${negFile} fails its owner check ${ownerId}`);
    if (positiveOk && negFails) covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} ❌ rules have BOTH a positive and a dedicated negative (got ${covered})`);

  // The summary's claimed behavior-coverage count must equal the coverage table
  // length actually walked above — cross-checking the harness literal against
  // proven coverage rather than against itself (no tautology).
  ok(valid.coverage.behaviorsWithPosAndNeg === COVERAGE.length,
    `summary reports behaviorsWithPosAndNeg === ${COVERAGE.length} (got ${valid.coverage.behaviorsWithPosAndNeg})`);

  // A dropped check is detected: prove the coverage walk would FAIL if any owner
  // check silently vanished — pick G3/N3 and assert valid.md still runs it (so a
  // future drop is observable as a missing positive).
  ok(valid.checks.some((c) => c.id === 'N3'),
    'coverage: N3 (G3 stability) is present in valid.md run — a dropped check would be detected here');
}

// ===========================================================================
// PART 7 — Amendment-mode diff: exactness on both pairs (exact added/removed/
// changed sets), malformed baseline ⇒ exit 3, no-flag regression (valid.md has
// NO `baseline` key & is byte-identical to pre-feature behavior), byte-identical
// double-run WITH --baseline, and XD1 in executedChecks ONLY when the flag is
// present (counter honesty). Diff exactness demonstrates the leak is VISIBLE
// mechanically even though judging its justification is the professor's job.
// ===========================================================================
process.stderr.write('PART 7 — amendment-mode diff exactness, malformed baseline, no-flag regression, XD1 counter honesty\n');
{
  // Normalize a list of {table,name} entries to a sorted, comparable signature.
  const sig = (entries) =>
    entries
      .map((e) => `${e.table}::${e.name}`)
      .sort()
      .join(' | ');

  // -- Exactness on every amend fixture in the manifest. --
  const amendFixtures = MANIFEST.fixtures.filter((f) => f.amend);
  ok(amendFixtures.length === 2, `manifest declares 2 amend-diff fixtures (got ${amendFixtures.length})`);
  for (const fx of amendFixtures) {
    const { json, code } = runHarness(fx.file, fx.args);
    ok(json && json.status === 'pass', `[amend ${fx.file}] mechanically PASS (got ${json && json.status})`);
    ok(code === 0, `[amend ${fx.file}] exit 0`);
    ok(json && 'baseline' in json, `[amend ${fx.file}] emits a baseline block`);
    const b = json.baseline;
    ok(b && sig(b.added) === sig(fx.amend.added),
      `[amend ${fx.file}] added set EXACT: got [${sig(b.added)}] want [${sig(fx.amend.added)}]`);
    ok(b && sig(b.removed) === sig(fx.amend.removed),
      `[amend ${fx.file}] removed set EXACT: got [${sig(b.removed)}] want [${sig(fx.amend.removed)}]`);
    ok(b && sig(b.changed) === sig(fx.amend.changed),
      `[amend ${fx.file}] changed set EXACT: got [${sig(b.changed)}] want [${sig(fx.amend.changed)}]`);
    ok(b && b.goalChanged === fx.amend.goalChanged,
      `[amend ${fx.file}] goalChanged === ${fx.amend.goalChanged} (got ${b && b.goalChanged})`);
    ok(b && b.fingerprintChanged === fx.amend.fingerprintChanged,
      `[amend ${fx.file}] fingerprintChanged === ${fx.amend.fingerprintChanged} (got ${b && b.fingerprintChanged})`);
    // XD1 ran and passed mechanically (a diff WITH entries still passes — the
    // professor judges justification, the harness only reconciles).
    const xd1 = json.checks.find((c) => c.id === 'XD1');
    ok(xd1 && xd1.status === 'pass', `[amend ${fx.file}] XD1 present and pass (mechanical reconcile)`);
    ok(xd1 && xd1.class === 'exactValue' && xd1.rule === '[PLAN]-amend',
      `[amend ${fx.file}] XD1 is exactValue/[PLAN]-amend`);
  }

  // The leak fixture's diff has EXACTLY 2 content entries (added) and ZERO
  // removed/changed — the unrequested impact+deliverable are mechanically VISIBLE.
  {
    const leak = MANIFEST.fixtures.find((f) => f.file === 'amended-leak.md' && f.amend);
    const { json } = runHarness(leak.file, leak.args);
    const contentEntries = json.baseline.added.length + json.baseline.removed.length + json.baseline.changed.length;
    ok(contentEntries === 2, `amended-leak.md diff shows exactly 2 content entries (got ${contentEntries}) — leak is mechanically visible`);
  }

  // -- Malformed baseline ⇒ broken-test exit 3 (comparison has no authority). --
  {
    const broken = MANIFEST.fixtures.find((f) => f.amendBroken);
    ok(!!broken, 'manifest declares a malformed-baseline broken-test fixture');
    const { json, code } = runHarness(broken.file, broken.args);
    ok(json && json.status === 'broken-test', `malformed baseline ⇒ broken-test (got ${json && json.status})`);
    ok(code === 3, `malformed baseline exits 3 (got ${code})`);
    ok(json && !('baseline' in json), 'malformed baseline emits NO baseline block (no authority)');

    // Missing baseline file ⇒ broken-test exit 3 too.
    const miss = runHarnessAbs(join(FIXTURES, 'valid.md'), ['--baseline', join(FIXTURES, 'no-such-baseline.md')]);
    ok(miss.json && miss.json.status === 'broken-test', 'missing baseline file ⇒ broken-test');
    ok(miss.code === 3, 'missing baseline file exits 3');
  }

  // -- No-flag regression: valid.md has NO baseline key, XD1 absent, exactValue=5. --
  {
    const noFlag = runHarness('valid.md').json;
    ok(!('baseline' in noFlag), 'no --baseline ⇒ summary has NO baseline key (regression: existing shape preserved)');
    ok(!noFlag.checks.some((c) => c.id === 'XD1'), 'no --baseline ⇒ XD1 not run (flag-conditional)');
    ok(noFlag.counts.checks.exactValue === 5, `no --baseline ⇒ exactValue count === 5 (got ${noFlag.counts.checks.exactValue})`);

    // WITH the flag, XD1 IS executed and counted (counter honesty: +1 exactValue).
    const withFlag = runHarness('valid.md', ['--baseline', 'baseline-prev.md']).json;
    ok(withFlag.checks.some((c) => c.id === 'XD1'), 'WITH --baseline ⇒ XD1 runs (flag-conditional)');
    ok(withFlag.counts.checks.exactValue === 6,
      `WITH --baseline ⇒ exactValue count === 6 (got ${withFlag.counts.checks.exactValue}) — XD1 counted exactly once`);
    ok(withFlag.counts.checks.total === noFlag.counts.checks.total + 1,
      'WITH --baseline ⇒ total checks is exactly +1 over no-flag (XD1 counter honesty)');
  }

  // -- Byte-identical double-run WITH --baseline (no cross-run state leak). --
  {
    const a = runHarness('valid.md', ['--baseline', 'baseline-prev.md']).stdout;
    const b = runHarness('valid.md', ['--baseline', 'baseline-prev.md']).stdout;
    ok(a === b, 'valid.md --baseline run twice ⇒ byte-identical stdout (determinism under amend mode)');
  }
}

// ===========================================================================
// VERDICT
// ===========================================================================
function writeTmp(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'im-selftest-'));
  const p = join(dir, name);
  writeFileSync(p, content, 'utf8');
  return p;
}

process.stderr.write('\n');
if (failed === 0) {
  process.stderr.write(`SELFTEST PASS — ${passed} assertions, 0 failures.\n`);
  process.exit(0);
} else {
  process.stderr.write(`SELFTEST FAIL — ${failed} of ${passed + failed} assertions failed:\n`);
  for (const f of fails) process.stderr.write(`  - ${f}\n`);
  process.exit(1);
}
