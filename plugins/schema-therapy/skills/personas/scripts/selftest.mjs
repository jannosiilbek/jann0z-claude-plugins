#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the personas oracle (verification
// doctrine §3): a regression suite proving the harness catches false-greens. It
// demonstrates the oracle:
//   1. produces the EXACT expected status + owner-check + exit per fixture triple
//      in the manifest;
//   2. reports the wrong-reason trap's OWNER reason — R3 (the E3 impact token)
//      fires and names the ghost impact 'Reduce churn', NOT the co-present B1
//      feature-goal noun 'dashboard' (which also fires — both detected);
//   3. honours the DELIBERATE DEPARTURE: a near-miss trigger PASSES with a ⚠️ D3
//      finding recorded and the job classified `condition` (asserted explicitly);
//   4. cannot emit a vacuous green: --no-checks and a contentless 07 both yield
//      broken-test/non-pass, never pass;
//   5. routes an upstream-defect: valid.md + broken-upstream-00.md yields a
//      finding class:"upstream-defect", upstream:"00-impact-map.md", naming the
//      ghost actor 'Coordinator'; status fail, exit 1;
//   6. distinguishes an UNPARSEABLE 00 OR 01 upstream (broken-test, exit 3) from
//      the upstream-defect (fail, exit 1);
//   7. reconciles counters: a dropped check/edge is DETECTED (X5 arithmetic) —
//      counter conflation guard;
//   8. is deterministic: the same triple twice ⇒ byte-identical stdout;
//   9. asserts the COVERAGE floor: every ❌ catalog rule has BOTH a positive
//      (passing over valid.md) AND a negative (a failing fixture) — §5 table.
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
  else {
    failed++;
    fails.push(label);
    process.stderr.write(`  ✗ ${label}\n`);
  }
}

function runTriple(file, up00, up01, args = []) {
  const fpath = join(FIXTURES, file);
  const p00 = join(FIXTURES, up00);
  const p01 = join(FIXTURES, up01);
  return runAbs(fpath, p00, p01, args);
}
function runAbs(fpath, p00, p01, args = []) {
  let stdout = '';
  let code = 0;
  try {
    stdout = execFileSync(
      'node',
      [HARNESS, fpath, '--upstream-00', p00, '--upstream-01', p01, ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
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

const rejectionIds = (j) => [
  ...j.checks.filter((c) => c.status === 'fail' || c.status === 'warn').map((c) => c.id),
  ...j.findings.map((f) => f.id),
];

// ===========================================================================
// PART 1 — Every fixture triple matches its manifest (status + owner + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
for (const fx of MANIFEST.fixtures) {
  const { code, json } = runTriple(fx.file, fx.up00, fx.up01, fx.args || []);
  const tag = `${fx.file}+${fx.up00}/${fx.up01}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary on stdout`);
  if (!json) continue;

  ok(json.status === fx.status, `[${tag}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${tag}] exit === ${EXIT[fx.status]} (got ${code})`);

  if (fx.failingCheck) {
    const present = rejectionIds(json).includes(fx.failingCheck);
    ok(present, `[${tag}] owner check ${fx.failingCheck} is among rejections (got [${rejectionIds(json).join(',')}])`);
  }
  if (fx.failingCheck === null && fx.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
  }
}

// ===========================================================================
// PART 2 — Wrong-reason trap: R3 (the E3 element) fires and names the ghost
// impact, NOT the co-present B1 feature-goal noun. Proves the negative reports
// the OWNER reason, not a collateral one — yet BOTH defects ARE detected.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports the R3 (E3) reason (not B1 dashboard)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = runTriple(trap.file, trap.up00, trap.up01, trap.args || []);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const r3 = json && json.findings.find((f) => f.id === 'R3');
  ok(!!r3, 'trap reports an R3 finding (the impact-token resolution check fired)');
  if (r3) {
    ok(
      r3.detail.includes(trap.trapDetailMustContain),
      `R3 detail names the ghost impact ('${trap.trapDetailMustContain}')`
    );
    ok(
      !r3.detail.toLowerCase().includes(trap.trapDetailMustNotContain),
      `R3 detail does NOT invoke '${trap.trapDetailMustNotContain}' (proves R3 isolates over L9)`
    );
  }
  // The co-present L9 (B1) defect IS detected (both fire) — but the OWNER is R3.
  const l9 = json && json.checks.find((c) => c.id === 'L9');
  ok(l9 && l9.status === 'fail', 'trap also detects the co-present L9 (B1) feature-goal defect (both fire)');
  ok(trap.failingCheck === 'R3', 'manifest pins trap owner to R3 (not L9)');
}

// ===========================================================================
// PART 3 — Near-miss trigger: the DELIBERATE DEPARTURE. A trigger that
// case-differs from a 01 event does NOT fail the artifact — it PASSES, the job
// is classified `condition`, and a ⚠️ D3 near-miss finding is recorded.
// ===========================================================================
process.stderr.write('PART 3 — near-miss trigger PASSES with a ⚠️ D3 recorded (deliberate departure)\n');
{
  const nm = MANIFEST.fixtures.find((f) => f.nearMissPass);
  ok(!!nm, 'manifest declares the near-miss-trigger fixture as a deliberate PASS');
  const { code, json } = runTriple(nm.file, nm.up00, nm.up01, nm.args || []);
  ok(json && json.status === 'pass', `near-miss status === pass (got ${json && json.status}) — condition branch never blocks`);
  ok(code === 0, 'near-miss exits 0 (pass)');
  const d3 = json && json.findings.find((f) => f.id === 'D3');
  ok(!!d3 && d3.severity === 'warn', 'a ⚠️ D3 near-miss finding IS recorded (recorded, not blocking)');
  const t = json && json.triggers.find((x) => x.job === 'reassign stalled job');
  ok(t && t.kind === 'condition', 'the near-miss trigger is classified kind="condition" (exact-match-wins lost)');
}

// ===========================================================================
// PART 4 — No vacuous green: disabled corpus / contentless cannot pass.
// ===========================================================================
process.stderr.write('PART 4 — no vacuous green\n');
{
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = runTriple(vac.file, vac.up00, vac.up01, vac.args);
  ok(r.json && r.json.status === 'broken-test', 'disabled-corpus (--no-checks) ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, 'disabled-corpus reports zero parsed checks');
  ok(r.code === 3, 'disabled-corpus exits 3 (broken-test)');

  // A genuinely contentless 07 cannot pass: it is malformed (no required H2s).
  const empty = writeTmp('selftest-empty.md', '\n');
  const re = runAbs(empty, join(FIXTURES, 'upstream-00.md'), join(FIXTURES, 'upstream-01.md'));
  ok(re.json && re.json.status !== 'pass', `contentless 07 does not pass (status=${re.json && re.json.status})`);
  ok(
    re.json && (re.json.status === 'malformed' || re.json.status === 'broken-test'),
    'contentless 07 is malformed/broken-test, never pass'
  );
}

// ===========================================================================
// PART 5 — Upstream-defect routing vs unparseable upstream.
//   - self-inconsistent 00 ⇒ class:"upstream-defect" → 00-impact-map.md, fail, 1
//   - unparseable 00 OR 01 ⇒ broken-test, exit 3 (NOT upstream-defect/fail)
// ===========================================================================
process.stderr.write('PART 5 — upstream-defect routing vs unparseable upstream\n');
{
  const ud = MANIFEST.fixtures.find((f) => f.upstreamDefect);
  const r = runTriple(ud.file, ud.up00, ud.up01, ud.args || []);
  ok(r.json && r.json.status === 'fail', `upstream-defect triple status === fail (got ${r.json && r.json.status})`);
  ok(r.code === 1, 'upstream-defect triple exits 1 (fail, taxonomy stays closed)');
  const tagged = r.json && r.json.findings.find((f) => f.class === 'upstream-defect');
  ok(!!tagged, 'a finding carries class:"upstream-defect"');
  if (tagged) {
    ok(tagged.upstream === '00-impact-map.md', `upstream-defect finding routes to 00-impact-map.md (got '${tagged.upstream}')`);
    ok(tagged.detail.includes(ud.upstreamDefectElement),
      `upstream-defect finding names the ghost element ('${ud.upstreamDefectElement}')`);
    ok(tagged.detail.includes('00-impact-map.md'),
      'upstream-defect detail names the file to fix (00-impact-map.md)');
    ok(tagged.id === 'R6', 'upstream-defect is owned by the R6 00 self-check (pre-resolution)');
  }
  ok(['pass', 'fail', 'malformed', 'broken-test'].includes(r.json.status),
    'status stays within the closed taxonomy (no new "upstream-defect" status)');

  // Unparseable 00 ⇒ broken-test, exit 3.
  const m00 = MANIFEST.fixtures.find((f) => f.malformedUpstream === '00');
  const rm00 = runTriple(m00.file, m00.up00, m00.up01, m00.args || []);
  ok(rm00.json && rm00.json.status === 'broken-test', `unparseable 00 ⇒ broken-test (got ${rm00.json && rm00.json.status})`);
  ok(rm00.code === 3, 'unparseable 00 exits 3 (broken-test, not fail)');
  ok(rm00.json && !rm00.json.findings.some((f) => f.class === 'upstream-defect'),
    'unparseable 00 is NOT mis-routed as an upstream-defect content finding');

  // Unparseable 01 ⇒ broken-test, exit 3.
  const m01 = MANIFEST.fixtures.find((f) => f.malformedUpstream === '01');
  const rm01 = runTriple(m01.file, m01.up00, m01.up01, m01.args || []);
  ok(rm01.json && rm01.json.status === 'broken-test', `unparseable 01 ⇒ broken-test (got ${rm01.json && rm01.json.status})`);
  ok(rm01.code === 3, 'unparseable 01 exits 3 (broken-test, not fail)');
}

// ===========================================================================
// PART 6 — Counter conflation / reconciliation: a dropped check or mismatched
// edge is DETECTED (X5 arithmetic turns broken ⇒ broken-test).
// ===========================================================================
process.stderr.write('PART 6 — reconciliation catches a dropped check / edge mismatch\n');
{
  const checks = await import('./lib/checks.mjs');

  const dropped = checks.checkX5_reconcile(30, 24, 25);
  ok(dropped.status === 'broken', 'X5 detects a dropped edge (walked 24 vs expected 25) ⇒ broken');

  const zero = checks.checkX5_reconcile(0, 0, 0);
  ok(zero.status === 'broken', 'X5 with zero executed checks ⇒ broken (no vacuous green)');

  const okCase = checks.checkX5_reconcile(25, 25, 25);
  ok(okCase.status === 'pass', 'X5 passes when executed>0 and edges reconcile');

  const v = runTriple('valid.md', 'upstream-00.md', 'upstream-01.md');
  ok(v.json && v.json.counts.edgesWalked === v.json.counts.edgesExpected,
    `valid.md edgesWalked === edgesExpected (${v.json && v.json.counts.edgesWalked}/${v.json && v.json.counts.edgesExpected})`);
  ok(v.json && v.json.counts.checks.total > 0, 'valid.md executed >0 checks (not vacuous)');
  ok(v.json && v.json.reconciled === true, 'valid.md reconciled === true');
  // counter conflation: the class counters must sum to total (AJ included).
  if (v.json) {
    const c = v.json.counts.checks;
    ok(c.lint + c.resolution + c.exactValue + c.negative + c.agentJudged === c.total,
      `class counters sum to total (${c.lint}+${c.resolution}+${c.exactValue}+${c.negative}+${c.agentJudged} === ${c.total})`);
  }
}

// ===========================================================================
// PART 7 — Determinism: same triple twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 7 — determinism / no cross-run state leak\n');
{
  const a = runTriple('valid.md', 'upstream-00.md', 'upstream-01.md').stdout;
  const b = runTriple('valid.md', 'upstream-00.md', 'upstream-01.md').stdout;
  ok(a === b, 'valid.md run twice ⇒ byte-identical stdout (no state leak)');

  const first = runTriple('valid.md', 'upstream-00.md', 'upstream-01.md').stdout;
  runTriple('ghost-business-actor.md', 'upstream-00.md', 'upstream-01.md');
  const second = runTriple('valid.md', 'upstream-00.md', 'upstream-01.md').stdout;
  ok(first === second, 'valid.md output stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 8 — COVERAGE floor: every ❌ catalog rule has BOTH a positive (a passing
// check over valid.md) AND a negative (a failing fixture). simulation.md §5
// reconciliation table — the 21 ❌ rules, positive + negative each.
// ===========================================================================
process.stderr.write('PART 8 — coverage floor (positive AND negative per ❌ behavior)\n');
{
  // [catalog rule, positive check id over valid.md, negative fixture file, neg owner]
  // Rules that share an owner check are listed once under a dedicated fixture.
  // §9's positive is R6 over the sound 00; its negative is the broken-upstream
  // triple (proven in PART 5) — entered with negOwner=null so only the positive
  // is counted here (negative handled separately).
  const COVERAGE = [
    // Theme A — structure & format
    ['A1', 'L1', 'missing-section.md', 'L1'],
    ['A2', 'L2', 'missing-fingerprint-00.md', 'L2'],
    ['A3', 'L2', 'placeholder-fingerprint.md', 'L2'],
    ['A4', 'L3', 'missing-section.md', 'L1'],
    ['A5', 'L4', 'bad-block-order.md', 'L4'],
    ['A6', 'L7', 'goal-without-impact-token.md', 'L7'],
    ['A7', 'L5', 'bad-jobs-columns.md', 'L5'],
    ['A8', 'X1', 'persona-no-jobs.md', 'L8'],
    // Theme B — goal-directed canon
    ['B1', 'L9', 'feature-goal.md', 'L9'],
    ['B3', 'L6', 'two-actors-one-persona.md', 'L6'],
    // Theme C — specificity & grounding
    ['C1', 'R1', 'ghost-business-actor.md', 'R1'],
    ['C2', 'R5', 'ghost-business-actor.md', 'R1'],
    // Theme D — jobs-to-be-done
    ['D1', 'L4', 'bad-block-order.md', 'L4'],
    ['D2', 'R4', 'ghost-outcome-event.md', 'R4'],
    ['D5', 'X3', 'dup-job.md', 'X3'],
    // Theme E — coverage & referential integrity
    ['E1', 'R2', 'uncovered-business-actor.md', 'R2'],
    ['E2', 'X1', 'persona-no-goals.md', 'L8'],
    ['E3', 'R3', 'ghost-impact-token.md', 'R3'],
    ['E4', 'R4', 'ghost-outcome-event.md', 'R4'],
    ['E5', 'X3', 'dup-job.md', 'X3'],
    // Theme F — naming & language
    ['F1', 'X2', 'dup-job.md', 'X3'],
    // §9 upstream-defect (positive over sound 00; negative is the broken triple
    // proven in PART 5).
    ['§9', 'R6', 'valid.md', null],
  ];
  ok(COVERAGE.length >= 21, `COVERAGE enumerates ≥21 ❌-rule rows (got ${COVERAGE.length})`);

  const valid = runTriple('valid.md', 'upstream-00.md', 'upstream-01.md').json;
  let covered = 0;
  for (const [rule, posId, negFile, negOwner] of COVERAGE) {
    const pos = valid.checks.find((c) => c.id === posId);
    const positiveOk = pos && pos.status === 'pass';
    ok(positiveOk, `[coverage ${rule}] positive ${posId} passes over valid.md`);

    if (negOwner === null) {
      if (positiveOk) covered++;
      continue;
    }
    const negFx = MANIFEST.fixtures.find((f) => f.file === negFile && f.up00 === 'upstream-00.md');
    const neg = runTriple(negFile, 'upstream-00.md', 'upstream-01.md').json;
    const negFails = rejectionIds(neg).includes(negOwner);
    ok(negFails, `[coverage ${rule}] negative ${negFile} fails its owner check ${negOwner}`);
    if (positiveOk && negFails) covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} ❌-behaviors have BOTH a positive and a negative (got ${covered})`);
  ok(valid.coverage.behaviorsWithPosAndNeg === 20,
    `summary reports behaviorsWithPosAndNeg === 20 (got ${valid.coverage.behaviorsWithPosAndNeg})`);
}

// ---------------------------------------------------------------------------
function writeTmp(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'personas-selftest-'));
  const p = join(dir, name);
  writeFileSync(p, content, 'utf8');
  return p;
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
