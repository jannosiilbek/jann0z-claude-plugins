#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the glossary oracle
// (verification doctrine §3): a regression suite proving the harness catches
// false-greens. It must demonstrate the oracle:
//   1. produces the EXACT expected status + owner-check + exit per fixture pair
//      in the manifest;
//   2. reports the wrong-reason trap's OWNER reason — R1 (the F1 element) fires
//      and its detail names the ghost 01 element, NOT the co-present vague defect;
//   3. cannot emit a vacuous green: the --no-checks corpus and a contentless
//      artifact both yield broken-test/non-pass, never pass;
//   4. routes an upstream-defect: valid.md + broken-upstream-01.md yields a
//      finding tagged class:"upstream-defect" pointing at the 01 element;
//   5. distinguishes an unparseable upstream (broken-test, exit 3) from an
//      upstream-defect (fail, exit 1);
//   6. reconciles counters: a deliberately dropped check/edge is DETECTED (X5
//      arithmetic turns broken ⇒ broken-test);
//   7. is deterministic: the same pair twice ⇒ byte-identical stdout.
//   8. asserts the coverage floor: every catalog-mechanizable behavior has BOTH
//      a positive (passing over valid.md) AND a negative (a failing fixture).
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

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

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

// Run the harness over a (02, 01) pair; capture stdout + exit code.
function runPair(file, upstream, args = []) {
  const fpath = join(FIXTURES, file);
  const upath = join(FIXTURES, upstream);
  let stdout = '';
  let code = 0;
  try {
    stdout = execFileSync('node', [HARNESS, fpath, '--upstream', upath, ...args], {
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
// PART 1 — Every fixture pair matches its manifest (status + owner + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
for (const fx of MANIFEST.fixtures) {
  const { code, json } = runPair(fx.file, fx.upstream, fx.args || []);
  const tag = `${fx.file}+${fx.upstream}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary on stdout`);
  if (!json) continue;

  ok(json.status === fx.status, `[${tag}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${tag}] exit === ${EXIT[fx.status]} (got ${code})`);

  if (fx.failingCheck) {
    const failingIds = json.checks.filter((c) => c.status === 'fail').map((c) => c.id);
    const findingIds = json.findings.map((f) => f.id);
    const present = failingIds.includes(fx.failingCheck) || findingIds.includes(fx.failingCheck);
    ok(present, `[${tag}] owner check ${fx.failingCheck} is among rejections (fails=[${failingIds.join(',')}])`);
  }

  if (fx.failingCheck === null && fx.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
  }
}

// ===========================================================================
// PART 2 — Wrong-reason trap: R1 (the F1 element) fires and names the ghost
// element, NOT the co-present vague defect. Proves the negative reports the
// OWNER reason, not a collateral one.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports the F1 ELEMENT reason (not vagueness)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = runPair(trap.file, trap.upstream, trap.args || []);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const r1 = json && json.findings.find((f) => f.id === 'R1');
  ok(!!r1, 'trap reports an R1 finding (the element-resolution check fired)');
  if (r1) {
    ok(
      r1.detail.includes(trap.trapDetailMustContain),
      `R1 detail names the ghost 01 element ('${trap.trapDetailMustContain}')`
    );
    ok(
      !r1.detail.toLowerCase().includes(trap.trapDetailMustNotContain),
      `R1 detail does NOT invoke '${trap.trapDetailMustNotContain}' (proves R1 isolates over L14)`
    );
  }
  // The co-present L14 defect IS detected (both fire) — but the OWNER is R1.
  const l14 = json && json.checks.find((c) => c.id === 'L14');
  ok(l14 && l14.status === 'fail', 'trap also detects the co-present L14 vague defect (both fire)');
  ok(trap.failingCheck === 'R1', 'manifest pins trap owner to R1 (not L14)');
}

// ===========================================================================
// PART 3 — No vacuous green: disabled corpus / contentless cannot pass.
// ===========================================================================
process.stderr.write('PART 3 — no vacuous green\n');
{
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = runPair(vac.file, vac.upstream, vac.args);
  ok(r.json && r.json.status === 'broken-test', 'disabled-corpus (--no-checks) ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, 'disabled-corpus reports zero parsed checks');
  ok(r.code === 3, 'disabled-corpus exits 3 (broken-test)');

  // A genuinely contentless 02 cannot pass: it is malformed (no required H2s).
  const empty = writeTmp('selftest-empty.md', '\n');
  const re = runAbs(empty, join(FIXTURES, 'upstream-01.md'));
  ok(re.json && re.json.status !== 'pass', `contentless 02 does not pass (status=${re.json && re.json.status})`);
  ok(re.json && (re.json.status === 'malformed' || re.json.status === 'broken-test'),
    'contentless 02 is malformed/broken-test, never pass');
}

// ===========================================================================
// PART 4 — Upstream-defect routing: a faithful 02 over a self-inconsistent 01
// yields a finding tagged class:"upstream-defect" pointing at the 01 element;
// status fail, exit 1. Distinct from an UNPARSEABLE 01 ⇒ broken-test, exit 3.
// ===========================================================================
process.stderr.write('PART 4 — upstream-defect routing vs unparseable upstream\n');
{
  const ud = MANIFEST.fixtures.find((f) => f.upstreamDefect);
  const r = runPair(ud.file, ud.upstream, ud.args || []);
  ok(r.json && r.json.status === 'fail', `upstream-defect pair status === fail (got ${r.json && r.json.status})`);
  ok(r.code === 1, 'upstream-defect pair exits 1 (fail, taxonomy stays closed)');
  const tagged = r.json && r.json.findings.find((f) => f.class === 'upstream-defect');
  ok(!!tagged, 'a finding carries class:"upstream-defect"');
  if (tagged) {
    ok(tagged.detail.includes(ud.upstreamDefectElement),
      `upstream-defect finding names the 01 element ('${ud.upstreamDefectElement}')`);
    ok(tagged.detail.includes(ud.upstream),
      `upstream-defect finding routes the fix to the 01 file ('${ud.upstream}')`);
  }
  // No status outside the closed set was introduced.
  ok(['pass', 'fail', 'malformed', 'broken-test'].includes(r.json.status),
    'status stays within the closed taxonomy (no new "upstream-defect" status)');

  // Unparseable upstream ⇒ broken-test, exit 3 (NOT upstream-defect/fail).
  const mu = MANIFEST.fixtures.find((f) => f.malformedUpstream);
  const rm = runPair(mu.file, mu.upstream, mu.args || []);
  ok(rm.json && rm.json.status === 'broken-test', `unparseable upstream ⇒ broken-test (got ${rm.json && rm.json.status})`);
  ok(rm.code === 3, 'unparseable upstream exits 3 (broken-test, not fail)');
  ok(rm.json && !rm.json.findings.some((f) => f.class === 'upstream-defect'),
    'unparseable upstream is NOT mis-routed as an upstream-defect content finding');
}

// ===========================================================================
// PART 5 — Counters reconcile: a dropped check / mismatched edge is DETECTED.
// ===========================================================================
process.stderr.write('PART 5 — reconciliation catches a dropped check / edge mismatch\n');
{
  const checks = await import('./lib/checks.mjs');

  // Drop one edge: walked = expected - 1 ⇒ broken.
  const dropped = checks.checkX5_reconcile(30, 27, 28);
  ok(dropped.status === 'broken', 'X5 detects a dropped edge (walked 27 vs expected 28) ⇒ broken');

  // Zero executed checks ⇒ broken even if edges happen to match.
  const zero = checks.checkX5_reconcile(0, 0, 0);
  ok(zero.status === 'broken', 'X5 with zero executed checks ⇒ broken (no vacuous green)');

  // The healthy case still passes (guard against a check that never greens).
  const okCase = checks.checkX5_reconcile(28, 28, 28);
  ok(okCase.status === 'pass', 'X5 passes when executed>0 and edges reconcile');

  // End-to-end: the harness on valid.md must reconcile.
  const v = runPair('valid.md', 'upstream-01.md');
  ok(v.json && v.json.counts.edgesWalked === v.json.counts.edgesExpected,
    `valid.md edgesWalked === edgesExpected (${v.json && v.json.counts.edgesWalked}/${v.json && v.json.counts.edgesExpected})`);
  ok(v.json && v.json.counts.checks.total > 0, 'valid.md executed >0 checks (not vacuous)');
  ok(v.json && v.json.reconciled === true, 'valid.md reconciled === true');
}

// ===========================================================================
// PART 6 — Determinism: same pair twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 6 — determinism / no cross-run state leak\n');
{
  const a = runPair('valid.md', 'upstream-01.md').stdout;
  const b = runPair('valid.md', 'upstream-01.md').stdout;
  ok(a === b, 'valid.md run twice ⇒ byte-identical stdout (no state leak)');

  // Interleave a different pair between two valid runs — output must not drift.
  const first = runPair('valid.md', 'upstream-01.md').stdout;
  runPair('term-ghost-element.md', 'upstream-01.md');
  const second = runPair('valid.md', 'upstream-01.md').stdout;
  ok(first === second, 'valid.md output stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 7 — Coverage floor: every catalog-mechanizable behavior has BOTH a
// positive (a passing check over valid.md) AND a negative (a failing fixture).
// (simulation.md §5 — the coverage floor is itself asserted.)
// ===========================================================================
process.stderr.write('PART 7 — coverage floor (positive AND negative per behavior)\n');
{
  // [catalog rule, positive check id over valid.md, negative fixture file, neg owner]
  // EVERY ❌ catalog rule (validation-rules.md) is represented: a mechanical
  // owner check proven by ≥1 positive (passing over valid.md) AND ≥1 dedicated
  // negative fixture. Rules that share an owner check (B1/B3→L7, F1/F2→R1,
  // D2 appears in both R3 and X4) are listed once under their proving fixture.
  const COVERAGE = [
    // Theme A — structure & format
    ['A1', 'L1', 'missing-section.md', 'L1'],
    ['A2', 'L2', 'bad-terms-columns.md', 'L2'],
    ['A3', 'L3', 'bad-enum-subshape.md', 'L3'],
    ['A4', 'L4', 'forbidden-cols-bad.md', 'L4'],
    ['A5', 'L6', 'term-multi-name.md', 'L6'],
    ['A6', 'L5', 'empty-cell.md', 'L5'],
    // Theme B — fingerprint & input discipline
    ['B1/B3', 'L7', 'placeholder-hex.md', 'L7'],
    ['B2', 'L8', 'foreign-input.md', 'L8'],
    // Theme C — ubiquitous-language discipline
    ['C1', 'X2', 'duplicate-term.md', 'X2'],
    ['C3', 'L13', 'tech-leak-definition.md', 'L13'],
    ['C4', 'L14', 'vague-term.md', 'L14'],
    ['C6', 'R2', 'dropped-core-concept.md', 'R2'],
    ['C8', 'L12', 'mixed-casing.md', 'L12'],
    // Theme D — enum derivation
    ['D1/D3', 'R4', 'enum-missing-for-skeleton.md', 'R4'],
    ['F4/D2', 'R3', 'extra-enum-no-skeleton.md', 'R3'],
    ['D4', 'X3', 'reordered-enum-value.md', 'X3'],
    ['D5', 'L11', 'mangled-enum-value.md', 'L11'],
    ['D6/F2', 'R5', 'paraphrased-derived-from.md', 'R5'],
    // Theme E — reference-not-restate (DRY)
    ['E1-mech', 'L16', 'restated-event-table.md', 'L16'],
    ['E2-mech', 'L18', 'definition-restates-lifecycle.md', 'L18'],
    ['E4-mech', 'L17', 'restated-hotspot-block.md', 'L17'],
    // Theme F — cross-reference integrity
    ['F1/F2', 'R1', 'term-ghost-element.md', 'R1'],
    ['F3', 'R6', 'enum-value-wrong-aggregate.md', 'R6'],
    ['F5', 'R7', 'forbidden-synonym-unresolved.md', 'R7'],
    // §9 upstream-defect (positive over sound upstream; negative is the broken
    // upstream pair proven in PART 4)
    ['§9', 'R5', 'valid.md', null],
  ];
  const valid = runPair('valid.md', 'upstream-01.md').json;
  let covered = 0;
  for (const [rule, posId, negFile, negOwner] of COVERAGE) {
    const pos = valid.checks.find((c) => c.id === posId);
    const positiveOk = pos && pos.status === 'pass';
    ok(positiveOk, `[coverage ${rule}] positive ${posId} passes over valid.md`);

    if (negOwner === null) {
      // §9 behavior: positive over a sound upstream; negative is the broken
      // upstream pair (proven in PART 4). Count the positive only.
      if (positiveOk) covered++;
      continue;
    }
    const negFx = MANIFEST.fixtures.find((f) => f.file === negFile && f.upstream === 'upstream-01.md');
    const neg = runPair(negFile, 'upstream-01.md').json;
    const negFails =
      neg.checks.some((c) => c.id === negOwner && c.status === 'fail') ||
      neg.findings.some((f) => f.id === negOwner);
    ok(negFails, `[coverage ${rule}] negative ${negFile} fails its owner check ${negOwner}`);
    if (positiveOk && negFails) covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} behaviors have BOTH a positive and a negative (got ${covered})`);
  ok(valid.coverage.behaviorsWithPosAndNeg === COVERAGE.length,
    `summary reports behaviorsWithPosAndNeg === ${COVERAGE.length} (got ${valid.coverage.behaviorsWithPosAndNeg})`);
}

// ---------------------------------------------------------------------------
function writeTmp(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'gloss-selftest-'));
  const p = join(dir, name);
  writeFileSync(p, content, 'utf8');
  return p;
}
function runAbs(absPath, upstreamAbs, args = []) {
  let stdout = '';
  let code = 0;
  try {
    stdout = execFileSync('node', [HARNESS, absPath, '--upstream', upstreamAbs, ...args], {
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
