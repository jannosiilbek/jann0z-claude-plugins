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

// Resolve any fixture-relative paths in the args (notably the value following
// `--upstream-00`) to absolute paths under FIXTURES, so the harness can be run
// from any cwd deterministically.
function resolveArgs(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    out.push(args[i]);
    if (args[i] === '--upstream-00' && i + 1 < args.length) {
      out.push(join(FIXTURES, args[i + 1]));
      i++;
    }
  }
  return out;
}

// Run the harness; capture stdout + exit code (never throws on non-zero).
function runHarness(file, args = []) {
  const fpath = join(FIXTURES, file);
  let stdout = '';
  let code = 0;
  try {
    stdout = execFileSync('node', [HARNESS, fpath, ...resolveArgs(args)], {
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

// Default upstream-00 args for the consistent fixtures (DRY helper for the
// ad-hoc runs in PARTs 4–6 that don't read the manifest entry).
const U00 = ['--upstream-00', 'upstream-00.md'];

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

// ===========================================================================
// PART 1 — Every fixture matches its manifest (status + owner check + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
// A human-readable id for each fixture: its `label` if present (the 00-side
// fixtures reuse `valid.md` as the 01 artifact and disambiguate by label),
// else its file.
const fxName = (fx) => fx.label || fx.file;
for (const fx of MANIFEST.fixtures) {
  const name = fxName(fx);
  const { stdout, code, json } = runHarness(fx.file, fx.args || []);
  ok(json !== null, `[${name}] emits parseable JSON summary on stdout`);
  if (!json) continue;

  ok(json.status === fx.status, `[${name}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${name}] exit code === ${EXIT[fx.status]} for status ${fx.status} (got ${code})`);

  // The owner check must be present among failing/malformed checks (status
  // 'fail') OR among findings — i.e. the defect is rejected for the stated
  // reason, not merely "some check failed".
  if (fx.failingCheck) {
    const failingCheckIds = json.checks
      .filter((c) => c.status === 'fail')
      .map((c) => c.id);
    const findingIds = json.findings.map((f) => f.id);
    const present = failingCheckIds.includes(fx.failingCheck) || findingIds.includes(fx.failingCheck);
    ok(present, `[${name}] owner check ${fx.failingCheck} is among rejections (fails=[${failingCheckIds.join(',')}])`);
  }

  // Upstream-defect routing: the N15 finding must be class:"upstream-defect",
  // its locus must be `00-impact-map.md` (never the 01), and it must name the
  // ghost element. (simulation.md §0/§3.3/§7.)
  if (fx.upstreamDefect) {
    const finding = json.findings.find((f) => f.id === fx.failingCheck);
    ok(!!finding, `[${name}] emits the ${fx.failingCheck} upstream-defect finding`);
    if (finding) {
      ok(finding.class === 'upstream-defect', `[${name}] finding class === upstream-defect (got ${finding.class})`);
      ok(finding.locus === fx.upstreamLocus, `[${name}] finding locus === ${fx.upstreamLocus} (got ${finding.locus})`);
      ok(
        finding.detail.includes(fx.ghostElement),
        `[${name}] upstream-defect detail names the ghost element '${fx.ghostElement}'`
      );
    }
    // The 01 status stays `fail` (NOT broken-test): the seam cannot be trusted,
    // but 00 is parseable.
    ok(json.status === 'fail', `[${name}] 01 status stays fail for a parseable-but-inconsistent 00`);
  }

  if (fx.failingCheck === null && fx.status === 'pass') {
    const anyFail = json.checks.some((c) => c.status === 'fail');
    ok(!anyFail, `[${name}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${name}] clean pass reconciled === true`);
  }
}

// An empty-but-present Deliverable cell is an UNFILLED cell, not the `—`
// sentinel: it must be `fail` (NOT malformed) and L14 must own the rejection
// with a detail naming the offending event row. (simulation.md §2 sentinel
// definition; MINOR 2.)
{
  const ed = MANIFEST.fixtures.find((f) => f.file === 'empty-deliverable-cell.md');
  const { json } = runHarness(ed.file, ed.args);
  ok(json && json.status === 'fail', `empty-deliverable-cell ⇒ fail (not malformed) (got ${json && json.status})`);
  const l14 = json && json.checks.find((c) => c.id === 'L14');
  ok(l14 && l14.status === 'fail', 'empty-deliverable-cell: L14 check status === fail');
  const l14finding = json && json.findings.find((f) => f.id === 'L14');
  ok(!!l14finding, 'empty-deliverable-cell: L14 emits a finding');
  ok(
    l14finding && l14finding.detail.includes('Payment Received'),
    "empty-deliverable-cell: L14 detail names the offending event row ('Payment Received')"
  );
}

// Distinguish the two upstream failure modes: a self-inconsistent 00 is a
// routed upstream-defect (01 `fail`); an unparseable 00 is `broken-test` (no
// seam authority). Assert the malformed-00 case is NOT mis-routed as a finding.
{
  const mal = MANIFEST.fixtures.find((f) => f.label === 'malformed-upstream-00');
  const { json } = runHarness(mal.file, mal.args);
  ok(json && json.status === 'broken-test', 'malformed-00 ⇒ broken-test (seam has no authority), not upstream-defect');
  ok(json && !json.findings.some((f) => f.class === 'upstream-defect'),
    'malformed-00 emits NO upstream-defect finding (it is broken-test, not fail)');
}

// Missing --upstream-00 ⇒ usage error, exit 3 (broken-test), no JSON pass.
{
  const r = runHarness('valid.md', []); // no --upstream-00
  ok(r.code === 3, 'missing --upstream-00 ⇒ exit 3 (usage / broken-test)');
  ok(!r.json || r.json.status !== 'pass', 'missing --upstream-00 never yields a pass');
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
  const re = runHarnessAbs(empty, ['--upstream-00', join(FIXTURES, 'upstream-00.md')]);
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
  const v = runHarness('valid.md', U00);
  ok(v.json && v.json.counts.edgesWalked === v.json.counts.edgesExpected,
    `valid.md edgesWalked === edgesExpected (${v.json && v.json.counts.edgesWalked}/${v.json && v.json.counts.edgesExpected})`);
  ok(v.json && v.json.counts.checks.total > 0, 'valid.md executed >0 checks (not vacuous)');
}

// ===========================================================================
// PART 5 — Fixture isolation: same input twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 5 — determinism / no cross-run state leak\n');
{
  const a = runHarness('valid.md', U00).stdout;
  const b = runHarness('valid.md', U00).stdout;
  ok(a === b, 'valid.md run twice ⇒ byte-identical stdout (no state leak)');

  // Interleave a different fixture between two valid runs — output must not
  // drift (proves no global/module state carries between runs).
  const first = runHarness('valid.md', U00).stdout;
  runHarness('unknown-actor.md', U00);
  const second = runHarness('valid.md', U00).stdout;
  ok(first === second, 'valid.md output stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 6 — Coverage floor: every catalog-mechanizable behavior has BOTH a
// positive (a passing check over valid.md) AND a negative (a failing fixture).
// (simulation.md §5 — the coverage floor is itself asserted.)
// ===========================================================================
process.stderr.write('PART 6 — coverage floor (positive AND negative per behavior)\n');
{
  // The 15 catalog-mechanizable behaviors of simulation.md §5 (one row each),
  // now including every ❌ H-theme seam rule (A2 dual fingerprint, A3 5-column,
  // H1/H2/H3/H4) and the 00 self-consistency seam.
  // Each row: [catalog rule, positive check id over valid.md, negative fixture
  // file, negative owner check]. The negative owner may differ from the
  // positive id where the lint and the exact-value/resolution check share a
  // rule (e.g. A3 positive L3, negative on column shape; H3 positive X6,
  // negative X6).
  const COVERAGE = [
    ['A1/A3/A4/A5/A6 (structure)', 'L1', 'missing-section.md', 'L1'],
    ['A2 (dual fingerprint)', 'L2', 'missing-section.md', 'L1'],
    ['A3/A14 (5-column shape)', 'L14', 'bad-events-columns.md', 'L3'],
    ['A4 (Kind enum)', 'L7', 'bad-actor-kind.md', 'L7'],
    ['A8 (non-empty)', 'L8', 'empty-events.md', 'L8'],
    ['B1/E2 (past-tense)', 'L11', 'present-tense-event.md', 'L11'],
    ['C3 (actor resolves)', 'N3', 'unknown-actor.md', 'N3'],
    ['E6 (skeleton registered)', 'N4', 'skeleton-ghost-event.md', 'N4'],
    ['E5 (single ownership)', 'X4', 'dup-skeleton-event.md', 'X4'],
    ['B3 (no dup events)', 'X2', 'duplicate-event.md', 'X2'],
    ['D3 (blocks resolve)', 'N5', 'dangling-blocks.md', 'N5'],
    ['H1 (human actor → 00)', 'N13', 'unknown-business-actor.md', 'N13'],
    ['H2 (deliverable → 00)', 'N14', 'ghost-deliverable-cell.md', 'N14'],
    ['H3 (deliverable coverage)', 'X6', 'uncovered-deliverable.md', 'X6'],
    ['H4 (aggregate serves)', 'X7', 'aggregate-serves-nothing.md', 'X7'],
  ];
  const valid = runHarness('valid.md', U00).json;
  let covered = 0;
  for (const [rule, posId, negFile, negOwner] of COVERAGE) {
    const pos = valid.checks.find((c) => c.id === posId);
    const positiveOk = pos && pos.status === 'pass';
    ok(positiveOk, `[coverage ${rule}] positive ${posId} passes over valid.md`);

    const negFx = MANIFEST.fixtures.find((f) => f.file === negFile && !f.label);
    ok(!!negFx && negFx.status !== 'pass', `[coverage ${rule}] negative fixture ${negFile} is a non-pass`);
    const neg = runHarness(negFile, negFx.args).json;
    const negFails =
      neg.checks.some((c) => c.id === negOwner && c.status === 'fail') ||
      neg.findings.some((f) => f.id === negOwner);
    ok(negFails, `[coverage ${rule}] negative fixture ${negFile} fails its owner check ${negOwner}`);
    if (positiveOk && negFails) covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} behaviors have BOTH a positive and a negative (got ${covered})`);

  // The 00 self-consistency seam (H-seam/N15): positive over upstream-00.md
  // (via valid.md), negative over the broken-00 fixture (an upstream-defect).
  const n15pos = valid.checks.find((c) => c.id === 'N15');
  ok(n15pos && n15pos.status === 'pass', '[coverage H-seam] N15 passes over the consistent upstream-00.md');
  const brokenFx = MANIFEST.fixtures.find((f) => f.label === 'broken-upstream-00');
  const brokenNeg = runHarness(brokenFx.file, brokenFx.args).json;
  ok(
    brokenNeg.findings.some((f) => f.id === 'N15' && f.class === 'upstream-defect'),
    '[coverage H-seam] broken-upstream-00 fails N15 as an upstream-defect'
  );

  ok(valid.coverage.behaviorsWithPosAndNeg === COVERAGE.length,
    `summary reports behaviorsWithPosAndNeg === ${COVERAGE.length} (got ${valid.coverage.behaviorsWithPosAndNeg})`);

  // Second structural negative for the "Required structure present" behavior:
  // bad-events-columns.md is malformed on L3 (per §5 it pairs with
  // missing-section.md under the same behavior).
  const colsNeg = runHarness('bad-events-columns.md', U00).json;
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
