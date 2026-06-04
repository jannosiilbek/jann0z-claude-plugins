#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the event-storming oracle
// (verification doctrine §3): a regression suite proving the harness catches
// false-greens. It must demonstrate the oracle:
//   1. produces the EXACT expected status + owner-check per fixture manifest;
//   2. reports broken-test (not pass) for the wrong-reason trap's WRONG reason
//      — i.e. N3 fires on the ACTOR, and N3's detail does not invoke tense;
//   3. cannot emit a vacuous green: an empty/contentless artifact and the
//      --no-checks corpus both yield broken-test, never pass;
//   4. reconciles counters: a deliberately dropped check is DETECTED (the
//      reconciliation/X5 arithmetic fails ⇒ broken-test);
//   5. is fixture-isolated: running the same artifact twice yields
//      byte-identical stdout (no state leaks across runs).
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

// Run the harness; capture stdout + exit code (never throws on non-zero).
function runHarness(file, args = []) {
  const fpath = join(FIXTURES, file);
  let stdout = '';
  let code = 0;
  try {
    stdout = execFileSync('node', [HARNESS, fpath, ...args], {
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

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

// ===========================================================================
// PART 1 — Every fixture matches its manifest (status + owner check + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
for (const fx of MANIFEST.fixtures) {
  const { stdout, code, json } = runHarness(fx.file, fx.args || []);
  ok(json !== null, `[${fx.file}] emits parseable JSON summary on stdout`);
  if (!json) continue;

  ok(json.status === fx.status, `[${fx.file}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${fx.file}] exit code === ${EXIT[fx.status]} for status ${fx.status} (got ${code})`);

  // The owner check must be present among failing/malformed checks (status
  // 'fail') OR among findings — i.e. the defect is rejected for the stated
  // reason, not merely "some check failed".
  if (fx.failingCheck) {
    const failingCheckIds = json.checks
      .filter((c) => c.status === 'fail')
      .map((c) => c.id);
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
// PART 2 — Wrong-reason trap: N3 fires on the ACTOR, not the tense.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports the ACTOR reason (not tense)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = runHarness(trap.file, trap.args || []);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const n3 = json && json.findings.find((f) => f.id === 'N3');
  ok(!!n3, 'trap reports an N3 finding (the actor-resolution check fired)');
  if (n3) {
    ok(
      n3.detail.includes(trap.trapDetailMustContain),
      `N3 detail names the offending actor ('${trap.trapDetailMustContain}') — not a collateral reason`
    );
    ok(
      !n3.detail.toLowerCase().includes(trap.trapDetailMustNotContain),
      `N3 detail does NOT invoke '${trap.trapDetailMustNotContain}' (proves N3 isolates over L11)`
    );
  }
  // N3's failing-check identity must equal N3 (not L11) — doctrine §2 guard.
  ok(trap.failingCheck === 'N3', 'manifest pins trap owner check to N3 (not L11)');
}

// ===========================================================================
// PART 3 — No vacuous green: contentless / disabled-corpus cannot pass.
// ===========================================================================
process.stderr.write('PART 3 — no vacuous green\n');
{
  // 3a. The --no-checks disabled-corpus path (vacuous.md) MUST be broken-test.
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = runHarness(vac.file, vac.args);
  ok(r.json && r.json.status === 'broken-test', 'disabled-corpus (--no-checks) ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, 'disabled-corpus reports zero parsed checks');
  ok(r.code === 3, 'disabled-corpus exits 3 (broken-test)');

  // 3b. A genuinely empty/contentless artifact cannot pass: it is malformed
  // (no required sections) — and crucially NOT pass.
  const empty = writeTmp('selftest-empty.md', '\n');
  const re = runHarnessAbs(empty);
  ok(re.json && re.json.status !== 'pass', 'contentless artifact does not pass (status=' + (re.json && re.json.status) + ')');
  ok(re.json && (re.json.status === 'malformed' || re.json.status === 'broken-test'), 'contentless artifact is malformed/broken-test');
}

// ===========================================================================
// PART 4 — Counters reconcile: a dropped check / mismatched edge is DETECTED.
// ===========================================================================
process.stderr.write('PART 4 — reconciliation catches a dropped check / edge mismatch\n');
{
  // Import the check module directly and prove X5 turns RED when the walked
  // edge count diverges from the expected count (a silently dropped edge) and
  // when executedChecks drops to zero.
  const checks = await import('./lib/checks.mjs');

  // Drop one edge: walked = expected - 1 ⇒ broken.
  const dropped = checks.checkX5_reconcile(30, 23, 24);
  ok(dropped.status === 'broken', 'X5 detects a dropped edge (walked 23 vs expected 24) ⇒ broken');

  // Zero executed checks ⇒ broken even if edges happen to match.
  const zero = checks.checkX5_reconcile(0, 0, 0);
  ok(zero.status === 'broken', 'X5 with zero executed checks ⇒ broken (no vacuous green)');

  // The healthy case still passes (guard against a check that never goes green).
  const okCase = checks.checkX5_reconcile(23, 24, 24);
  ok(okCase.status === 'pass', 'X5 passes when executed>0 and edges reconcile');

  // End-to-end: the harness on valid.md must have edgesWalked === edgesExpected.
  const v = runHarness('valid.md');
  ok(v.json && v.json.counts.edgesWalked === v.json.counts.edgesExpected,
    `valid.md edgesWalked === edgesExpected (${v.json && v.json.counts.edgesWalked}/${v.json && v.json.counts.edgesExpected})`);
  ok(v.json && v.json.counts.checks.total > 0, 'valid.md executed >0 checks (not vacuous)');
}

// ===========================================================================
// PART 5 — Fixture isolation: same input twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 5 — determinism / no cross-run state leak\n');
{
  const a = runHarness('valid.md').stdout;
  const b = runHarness('valid.md').stdout;
  ok(a === b, 'valid.md run twice ⇒ byte-identical stdout (no state leak)');

  // Interleave a different fixture between two valid runs — output must not
  // drift (proves no global/module state carries between runs).
  const first = runHarness('valid.md').stdout;
  runHarness('unknown-actor.md');
  const second = runHarness('valid.md').stdout;
  ok(first === second, 'valid.md output stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 6 — Coverage floor: every catalog-mechanizable behavior has BOTH a
// positive (a passing check over valid.md) AND a negative (a failing fixture).
// (simulation.md §5 — the coverage floor is itself asserted.)
// ===========================================================================
process.stderr.write('PART 6 — coverage floor (positive AND negative per behavior)\n');
{
  // The 9 catalog-mechanizable behaviors of simulation.md §5 (one row each).
  // "Required structure present" is one behavior proven positively by L1–L6
  // over valid.md and negatively by BOTH missing-section.md (L1) and
  // bad-events-columns.md (L3); we anchor it on L1 here and assert the second
  // structural negative separately below.
  // (catalog rule, positive check id over valid.md, negative fixture file)
  const COVERAGE = [
    ['A1/A3/A4/A5/A6', 'L1', 'missing-section.md'],
    ['A4', 'L7', 'bad-actor-kind.md'],
    ['A8', 'L8', 'empty-events.md'],
    ['B1/E2', 'L11', 'present-tense-event.md'],
    ['C3', 'N3', 'unknown-actor.md'],
    ['E6', 'N4', 'skeleton-ghost-event.md'],
    ['E5', 'X4', 'dup-skeleton-event.md'],
    ['B3', 'X2', 'duplicate-event.md'],
    ['D3', 'N5', 'dangling-blocks.md'],
  ];
  const valid = runHarness('valid.md').json;
  let covered = 0;
  for (const [rule, posId, negFile] of COVERAGE) {
    const pos = valid.checks.find((c) => c.id === posId);
    const positiveOk = pos && pos.status === 'pass';
    ok(positiveOk, `[coverage ${rule}] positive ${posId} passes over valid.md`);

    const negFx = MANIFEST.fixtures.find((f) => f.file === negFile);
    ok(!!negFx && negFx.status !== 'pass', `[coverage ${rule}] negative fixture ${negFile} is a non-pass`);
    const neg = runHarness(negFile).json;
    const negFails =
      neg.checks.some((c) => c.id === negFx.failingCheck && c.status === 'fail') ||
      neg.findings.some((f) => f.id === negFx.failingCheck);
    ok(negFails, `[coverage ${rule}] negative fixture ${negFile} fails its owner check ${negFx.failingCheck}`);
    if (positiveOk && negFails) covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} behaviors have BOTH a positive and a negative (got ${covered})`);
  ok(valid.coverage.behaviorsWithPosAndNeg === COVERAGE.length,
    `summary reports behaviorsWithPosAndNeg === ${COVERAGE.length} (got ${valid.coverage.behaviorsWithPosAndNeg})`);

  // Second structural negative for the "Required structure present" behavior:
  // bad-events-columns.md is malformed on L3 (per §5 it pairs with
  // missing-section.md under the same behavior).
  const colsNeg = runHarness('bad-events-columns.md').json;
  ok(colsNeg.status === 'malformed' && colsNeg.checks.some((c) => c.id === 'L3' && c.status === 'fail'),
    '[coverage structure] second negative bad-events-columns.md is malformed on L3');
}

// ---------------------------------------------------------------------------
function writeTmp(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'es-selftest-'));
  const p = join(dir, name);
  writeFileSync(p, content, 'utf8');
  return p;
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

// ===========================================================================
// VERDICT
// ===========================================================================
process.stderr.write('\n');
if (failed === 0) {
  process.stderr.write(`SELFTEST PASS — ${passed} assertions, 0 failures.\n`);
  process.exit(0);
} else {
  process.stderr.write(`SELFTEST FAIL — ${failed} of ${passed + failed} assertions failed:\n`);
  for (const f of fails) process.stderr.write(`  - ${f}\n`);
  process.exit(1);
}
