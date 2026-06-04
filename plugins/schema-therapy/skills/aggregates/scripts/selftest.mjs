#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the aggregates oracle
// (verification doctrine §3): a regression suite proving the harness catches
// false-greens. It demonstrates the oracle:
//   1. produces the EXACT expected status + owner-check + exit per fixture triple
//      in the manifest;
//   2. reports the wrong-reason trap's OWNER reason — R5 (the ghost source event)
//      fires and names the ghost event, NOT the co-present X4 justification defect;
//   3. cannot emit a vacuous green: the --no-checks corpus and a contentless 03
//      both yield broken-test/non-pass, never pass;
//   4. routes upstream-defects: valid.md + broken-upstream-01.md yields a finding
//      class:"upstream-defect" → 01 naming the 01 element; valid.md +
//      inconsistent-upstream-02.md yields class:"upstream-defect" → 02;
//   5. distinguishes an unparseable upstream (broken-test, exit 3) from an
//      upstream-defect (fail, exit 1) — for BOTH 01 and 02;
//   6. reconciles counters: a dropped check/edge is DETECTED (X5 ⇒ broken-test);
//   7. is deterministic: the same triple twice ⇒ byte-identical stdout;
//   8. asserts the COVERAGE floor: every ❌ catalog rule has ≥1 positive (passing
//      over valid.md) AND ≥1 dedicated negative (a failing fixture), per the
//      simulation.md footer reconciliation table.
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
  if (cond) passed++;
  else { failed++; fails.push(label); process.stderr.write(`  ✗ ${label}\n`); }
}

function runTriple(file, up01, up02, args = []) {
  const f = join(FIXTURES, file);
  const u1 = join(FIXTURES, up01);
  const u2 = join(FIXTURES, up02);
  let stdout = '', code = 0;
  try {
    stdout = execFileSync('node', [HARNESS, f, '--upstream-01', u1, '--upstream-02', u2, ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    stdout = e.stdout ? e.stdout.toString() : '';
    code = typeof e.status === 'number' ? e.status : -1;
  }
  let json = null;
  try { json = JSON.parse(stdout); } catch { json = null; }
  return { stdout, code, json };
}

// ===========================================================================
// PART 1 — Every fixture triple matches its manifest (status + owner + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
for (const fx of MANIFEST.fixtures) {
  const { code, json } = runTriple(fx.file, fx.upstream01, fx.upstream02, fx.args || []);
  const tag = `${fx.file}+${fx.upstream01}+${fx.upstream02}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary on stdout`);
  if (!json) continue;

  ok(json.status === fx.status, `[${tag}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${tag}] exit === ${EXIT[fx.status]} (got ${code})`);

  if (fx.failingCheck) {
    const failingIds = json.checks.filter((c) => c.status === 'fail').map((c) => c.id);
    const findingIds = json.findings.map((f) => f.id);
    const present = failingIds.includes(fx.failingCheck) || findingIds.includes(fx.failingCheck);
    ok(present, `[${tag}] owner check ${fx.failingCheck} among rejections (fails=[${failingIds.join(',')}])`);
  }

  if (fx.failingCheck === null && fx.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
  }
}

// ===========================================================================
// PART 2 — Wrong-reason trap: R5 fires and names the ghost source EVENT, NOT
// the co-present X4 justification defect. Proves the negative reports the OWNER
// reason, not a collateral one.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports the R5 SOURCE-EVENT reason (not X4)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = runTriple(trap.file, trap.upstream01, trap.upstream02, trap.args || []);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const r5 = json && json.findings.find((f) => f.id === 'R5');
  ok(!!r5, 'trap reports an R5 finding (the source-event resolution check fired)');
  if (r5) {
    ok(r5.detail.includes(trap.trapDetailMustContain),
      `R5 detail names the ghost 01 event ('${trap.trapDetailMustContain}')`);
    ok(!r5.detail.toLowerCase().includes(trap.trapDetailMustNotContain),
      `R5 detail does NOT invoke '${trap.trapDetailMustNotContain}' (proves R5 isolates over X4)`);
  }
  // The co-present X4 defect IS detected (both fire) — but the OWNER is R5.
  const x4 = json && json.checks.find((c) => c.id === 'X4');
  ok(x4 && x4.status === 'fail', 'trap also detects the co-present X4 justification defect (both fire)');
  ok(trap.failingCheck === 'R5', 'manifest pins trap owner to R5 (not X4)');
}

// ===========================================================================
// PART 3 — No vacuous green: disabled corpus / contentless cannot pass.
// ===========================================================================
process.stderr.write('PART 3 — no vacuous green\n');
{
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = runTriple(vac.file, vac.upstream01, vac.upstream02, vac.args);
  ok(r.json && r.json.status === 'broken-test', 'disabled-corpus (--no-checks) ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, 'disabled-corpus reports zero parsed checks');
  ok(r.code === 3, 'disabled-corpus exits 3 (broken-test)');

  // A genuinely contentless 03 cannot pass: it is malformed (no required H2s).
  const empty = writeTmp('selftest-empty.md', '\n');
  const re = runAbs(empty, join(FIXTURES, 'upstream-01.md'), join(FIXTURES, 'upstream-02.md'));
  ok(re.json && re.json.status !== 'pass', `contentless 03 does not pass (status=${re.json && re.json.status})`);
  ok(re.json && (re.json.status === 'malformed' || re.json.status === 'broken-test'),
    'contentless 03 is malformed/broken-test, never pass');
}

// ===========================================================================
// PART 4 — Upstream-defect routing (BOTH files) vs unparseable upstream.
// ===========================================================================
process.stderr.write('PART 4 — upstream-defect routing (01 + 02) vs unparseable upstream\n');
{
  for (const ud of MANIFEST.fixtures.filter((f) => f.upstreamDefect)) {
    const r = runTriple(ud.file, ud.upstream01, ud.upstream02, ud.args || []);
    const route = ud.upstreamDefectFile;
    ok(r.json && r.json.status === 'fail', `[${route}] upstream-defect triple status === fail (got ${r.json && r.json.status})`);
    ok(r.code === 1, `[${route}] upstream-defect triple exits 1 (fail, taxonomy stays closed)`);
    const tagged = r.json && r.json.findings.find((f) => f.class === 'upstream-defect');
    ok(!!tagged, `[${route}] a finding carries class:"upstream-defect"`);
    if (tagged) {
      ok(tagged.upstream === route, `[${route}] upstream-defect finding routes to '${route}' (got '${tagged.upstream}')`);
      ok(tagged.detail.includes(ud.upstreamDefectElement),
        `[${route}] upstream-defect finding names the offending element ('${ud.upstreamDefectElement}')`);
    }
    ok(['pass', 'fail', 'malformed', 'broken-test'].includes(r.json.status),
      `[${route}] status stays within the closed taxonomy (no new "upstream-defect" status)`);
  }

  // Unparseable upstream (01 AND 02) ⇒ broken-test, exit 3 (NOT upstream-defect/fail).
  for (const mu of MANIFEST.fixtures.filter((f) => f.malformedUpstream)) {
    const rm = runTriple(mu.file, mu.upstream01, mu.upstream02, mu.args || []);
    ok(rm.json && rm.json.status === 'broken-test', `[upstream-${mu.malformedUpstream} unparseable] ⇒ broken-test (got ${rm.json && rm.json.status})`);
    ok(rm.code === 3, `[upstream-${mu.malformedUpstream} unparseable] exits 3 (broken-test, not fail)`);
    ok(rm.json && !rm.json.findings.some((f) => f.class === 'upstream-defect'),
      `[upstream-${mu.malformedUpstream} unparseable] is NOT mis-routed as an upstream-defect content finding`);
  }
}

// ===========================================================================
// PART 5 — Counters reconcile: a dropped check / mismatched edge is DETECTED.
// ===========================================================================
process.stderr.write('PART 5 — reconciliation catches a dropped check / edge mismatch\n');
{
  const checks = await import('./lib/checks.mjs');

  const dropped = checks.checkX5_reconcile(30, 26, 27);
  ok(dropped.status === 'broken', 'X5 detects a dropped edge (walked 26 vs expected 27) ⇒ broken');

  const zero = checks.checkX5_reconcile(0, 0, 0);
  ok(zero.status === 'broken', 'X5 with zero executed checks ⇒ broken (no vacuous green)');

  const okCase = checks.checkX5_reconcile(27, 27, 27);
  ok(okCase.status === 'pass', 'X5 passes when executed>0 and edges reconcile');

  // End-to-end: the harness on valid.md must reconcile.
  const v = runTriple('valid.md', 'upstream-01.md', 'upstream-02.md');
  ok(v.json && v.json.counts.edgesWalked === v.json.counts.edgesExpected,
    `valid.md edgesWalked === edgesExpected (${v.json && v.json.counts.edgesWalked}/${v.json && v.json.counts.edgesExpected})`);
  ok(v.json && v.json.counts.checks.total > 0, 'valid.md executed >0 checks (not vacuous)');
  ok(v.json && v.json.reconciled === true, 'valid.md reconciled === true');
}

// ===========================================================================
// PART 6 — Determinism: same triple twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 6 — determinism / no cross-run state leak\n');
{
  const a = runTriple('valid.md', 'upstream-01.md', 'upstream-02.md').stdout;
  const b = runTriple('valid.md', 'upstream-01.md', 'upstream-02.md').stdout;
  ok(a === b, 'valid.md run twice ⇒ byte-identical stdout (no state leak)');

  const first = runTriple('valid.md', 'upstream-01.md', 'upstream-02.md').stdout;
  runTriple('ghost-source-event.md', 'upstream-01.md', 'upstream-02.md');
  const second = runTriple('valid.md', 'upstream-01.md', 'upstream-02.md').stdout;
  ok(first === second, 'valid.md output stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 7 — Coverage floor: every ❌ catalog rule has BOTH a positive (a passing
// check over valid.md) AND a negative (a failing fixture). Source of truth is
// the simulation.md footer reconciliation (❌ rule → owner check → neg fixture).
// ===========================================================================
process.stderr.write('PART 7 — coverage floor (positive AND negative per ❌ rule)\n');
{
  // [catalog ❌ rule, positive check id over valid.md, negative fixture file, neg owner]
  // Mirrors simulation.md §5 mapping + the closing reconciliation table. Rules
  // sharing an owner check (S1→L1/L2, A3/A4/A7→R3, I5/L4→R4) are listed under
  // their proving fixture.
  const COVERAGE = [
    // S — structure & fingerprints
    ['S1', 'L2', 'placeholder-fingerprint.md', 'L2'],
    ['S2', 'L1', 'missing-aggregates-section.md', 'L1'],
    ['S3', 'R1', 'missing-aggregate.md', 'R1'],
    ['S3-extra', 'X1', 'extra-aggregate.md', 'R1'],
    ['S4', 'R1', 'heading-casing.md', 'R1'],
    ['S5/S6', 'L3', 'missing-subblock.md', 'L3'],
    ['S7', 'L4', 'bad-boundary-columns.md', 'L4'],
    ['S9', 'L7', 'missing-policies-section.md', 'L1'],
    // A — aggregate canon
    ['A1', 'L8', 'non-unique-root.md', 'L8'],
    ['A3/A4/A7', 'R3', 'reference-to-member.md', 'R3'],
    // I — invariants
    ['I3', 'I3', 'cross-aggregate-invariant.md', 'I3'],
    ['I5', 'R4', 'mangled-enum-value.md', 'R4'],
    ['L6-ownership', 'R4', 'wrong-aggregate-enum-value.md', 'R4'],
    // X — cross-aggregate policies
    ['X3', 'L11', 'bad-mode.md', 'L11'],
    ['X4', 'X4', 'transactional-no-justification.md', 'X4'],
    ['X4-generic', 'X4', 'transactional-generic-justification.md', 'X4'],
    ['X5', 'R5', 'ghost-source-event.md', 'R5'],
    ['X6', 'R6', 'ghost-target-aggregate.md', 'R6'],
    ['X7', 'R7', 'valid.md', null], // negative is the broken-upstream-01 pair (PART 4)
    // L — language discipline
    ['L1-term', 'R2', 'ghost-boundary-term.md', 'R2'],
    ['L2-forbidden', 'L12', 'forbidden-synonym-used.md', 'L12'],
    // D — DRY (mechanizable subsets)
    ['D1-mech', 'L13', 'restated-event-table.md', 'L13'],
    ['D3-mech', 'L15', 'restated-terms-table.md', 'L15'],
    ['D4-mech', 'L16', 'restated-enum-listing.md', 'L16'],
    ['D2-mech', 'L17', 'restated-lifecycle.md', 'L17'],
    // §9 upstream-02 consistency (positive over sound pair; negative is the
    // inconsistent-02 pair proven in PART 4)
    ['§9-02', 'R4', 'valid.md', null],
  ];
  const valid = runTriple('valid.md', 'upstream-01.md', 'upstream-02.md').json;
  let covered = 0;
  for (const [rule, posId, negFile, negOwner] of COVERAGE) {
    const pos = valid.checks.find((c) => c.id === posId);
    const positiveOk = pos && pos.status === 'pass';
    ok(positiveOk, `[coverage ${rule}] positive ${posId} passes over valid.md`);

    if (negOwner === null) {
      // upstream-defect behavior: negative is a broken-upstream pair (PART 4).
      if (positiveOk) covered++;
      continue;
    }
    const neg = runTriple(negFile, 'upstream-01.md', 'upstream-02.md').json;
    const negFails =
      neg.checks.some((c) => c.id === negOwner && c.status === 'fail') ||
      neg.findings.some((f) => f.id === negOwner);
    ok(negFails, `[coverage ${rule}] negative ${negFile} fails its owner check ${negOwner}`);
    if (positiveOk && negFails) covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} behaviors have BOTH a positive and a negative (got ${covered})`);
}

// ---------------------------------------------------------------------------
function writeTmp(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'agg-selftest-'));
  const p = join(dir, name);
  writeFileSync(p, content, 'utf8');
  return p;
}
function runAbs(absPath, up01Abs, up02Abs, args = []) {
  let stdout = '', code = 0;
  try {
    stdout = execFileSync('node', [HARNESS, absPath, '--upstream-01', up01Abs, '--upstream-02', up02Abs, ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    stdout = e.stdout ? e.stdout.toString() : '';
    code = typeof e.status === 'number' ? e.status : -1;
  }
  let json = null;
  try { json = JSON.parse(stdout); } catch { json = null; }
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
