#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the task-models oracle (verification
// doctrine §3): a regression suite proving the harness catches false-greens. It demonstrates:
//   1. every manifest fixture produces the EXACT expected status + owner-check + exit;
//   2. the wrong-reason trap reports the W-BUDGET (walker) owner, NOT the co-present R-TAG
//      — the negative reports its OWNER reason, both defects detected;
//   3. no vacuous green: --no-checks ⇒ broken-test, exit 3, zero parsed checks;
//   4. the budget-mismatch negative proves W-BUDGET reports BOTH the declared AND the
//      computed value + the contributing-leaf list (the exact-value evidence);
//   5. upstream-defect fixtures name the RIGHT file (07-personas.md / the .feature);
//   6. unparseable upstreams ⇒ broken-test (exit 3), NOT mis-routed as upstream-defect;
//   7. WALKER HONESTY: the choice fixture's computed budget uses ONLY the first branch;
//      flipping the branch order in a scratch copy CHANGES the computed budget — proven by a
//      dedicated assertion over an inline temp variant;
//   8. counter conflation: the class counters sum to total; a dropped edge ⇒ broken-test;
//   9. determinism: the same run twice ⇒ byte-identical stdout; isolation across runs;
//   10. the COVERAGE floor: every ❌-mechanizable behavior has BOTH a positive (over
//       valid-08) AND a negative (a failing fixture) — simulation.md §5 table.
//
// Exit 0 ONLY when every assertion passes. Zero external deps. Keep < 5 min.

import { readFileSync, writeFileSync, mkdtempSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(__dirname, 'harness.mjs');
const FIXTURES = join(__dirname, 'fixtures');
const MANIFEST = JSON.parse(readFileSync(join(FIXTURES, 'manifest.json'), 'utf8'));

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

let passed = 0, failed = 0;
const fails = [];
function ok(cond, label) {
  if (cond) passed++;
  else { failed++; fails.push(label); process.stderr.write(`  ✗ ${label}\n`); }
}

function runAbs(dir, up06, up07, args = []) {
  let stdout = '', code = 0;
  try {
    stdout = execFileSync('node', [HARNESS, dir, '--upstream-06', up06, '--upstream-07', up07, ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    stdout = e.stdout ? e.stdout.toString() : '';
    code = typeof e.status === 'number' ? e.status : -1;
  }
  let json = null;
  try { json = JSON.parse(stdout); } catch { json = null; }
  return { stdout, code, json };
}
function run(fx) {
  return runAbs(join(FIXTURES, fx.dir), join(FIXTURES, fx.up06), join(FIXTURES, fx.up07), fx.args || []);
}

const rejectionIds = (j) => [
  ...j.checks.filter((c) => c.status === 'fail').map((c) => c.id),
  ...j.findings.map((f) => f.id),
];

// ===========================================================================
// PART 1 — Every fixture matches its manifest (status + owner + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
for (const fx of MANIFEST.fixtures) {
  const { code, json } = run(fx);
  const tag = `${fx.dir}+${fx.up06}/${fx.up07}${(fx.args || []).join(' ') ? ' ' + fx.args.join(' ') : ''}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary`);
  if (!json) continue;
  ok(json.status === fx.status, `[${tag}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${tag}] exit === ${EXIT[fx.status]} (got ${code})`);
  if (fx.owner) {
    ok(rejectionIds(json).includes(fx.owner), `[${tag}] owner ${fx.owner} among rejections (got [${rejectionIds(json).join(',')}])`);
  }
  if (fx.owner === null && fx.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
    ok(json.counts.walker.total > 0, `[${tag}] clean pass ran the walker (non-empty oracle)`);
  }
  if (fx.route) {
    const ud = json.findings.find((f) => f.class === 'upstream-defect');
    ok(!!ud, `[${tag}] carries an upstream-defect finding`);
    ok(ud && ud.upstream === fx.route, `[${tag}] upstream-defect routes to ${fx.route} (got '${ud && ud.upstream}')`);
    ok(ud && ud.detail.includes(fx.route), `[${tag}] upstream-defect detail names the file to fix`);
    ok(json.status === 'fail' && code === 1, `[${tag}] upstream-defect status stays fail / exit 1 (taxonomy closed)`);
  }
}

// ===========================================================================
// PART 2 — Wrong-reason trap: OWNER is W-BUDGET (walker), NOT R-TAG (both fire).
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports W-BUDGET (not R-TAG)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = run(trap);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const ids = rejectionIds(json);
  ok(ids.includes(trap.trapOwner), `trap reports the OWNER ${trap.trapOwner} (the walker budget)`);
  ok(ids.includes(trap.trapNotOwner), `trap ALSO detects the co-present ${trap.trapNotOwner} (both fire)`);
  const wb = json.findings.find((f) => f.id === 'W-BUDGET');
  ok(!!wb, 'trap reports a W-BUDGET finding (the walker isolates the budget defect)');
  ok(trap.owner === 'W-BUDGET', 'manifest pins trap owner to W-BUDGET (not R-TAG)');
}

// ===========================================================================
// PART 3 — No vacuous green: --no-checks ⇒ broken-test, exit 3, zero checks.
// ===========================================================================
process.stderr.write('PART 3 — no vacuous green\n');
{
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = run(vac);
  ok(r.json && r.json.status === 'broken-test', '--no-checks ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, '--no-checks reports zero parsed checks');
  ok(r.code === 3, '--no-checks exits 3 (broken-test)');

  // An empty 08 dir over a non-empty 07 is a fail (missing models), never a sanctioned pass.
  const emptyDir = mkdtempSync(join(tmpdir(), 'tm-empty-'));
  const re = runAbs(emptyDir, join(FIXTURES, 'upstream-06'), join(FIXTURES, 'upstream-07.md'));
  ok(re.json && re.json.status !== 'pass', `empty 08 dir does NOT pass (status=${re.json && re.json.status})`);
}

// ===========================================================================
// PART 4 — budget-mismatch reports BOTH the declared AND computed value + leaves.
// ===========================================================================
process.stderr.write('PART 4 — budget-mismatch reports both values + the leaf list\n');
{
  const bm = MANIFEST.fixtures.find((f) => f.dir === 'budget-mismatch');
  const { json } = run(bm);
  const wb = json.findings.find((f) => f.id === 'W-BUDGET');
  ok(!!wb, 'budget-mismatch reports a W-BUDGET finding');
  ok(wb && /99/.test(wb.detail), 'W-BUDGET detail names the DECLARED value (99)');
  ok(wb && /14/.test(wb.detail), 'W-BUDGET detail names the COMPUTED value (14)');
  ok(wb && /contributing leaves/i.test(wb.detail), 'W-BUDGET detail lists the contributing leaves');
  const tf = json.budgets.find((b) => b.model === 'accountholder-transfer_funds');
  ok(tf && tf.declared === 99 && tf.computed === 14, `budgets[] records declared=99 vs computed=14 (got ${tf && tf.declared}/${tf && tf.computed})`);
}

// ===========================================================================
// PART 5 — Upstream-defect routing vs unparseable upstream.
// ===========================================================================
process.stderr.write('PART 5 — upstream-defect routing vs unparseable upstream\n');
{
  const dup = MANIFEST.fixtures.find((f) => f.up07 === 'dup-upstream-07.md');
  const rdup = run(dup);
  ok(rdup.json && rdup.json.status === 'fail' && rdup.code === 1, 'dup-07 ⇒ fail / exit 1');
  const ud7 = rdup.json && rdup.json.findings.find((f) => f.class === 'upstream-defect');
  ok(ud7 && ud7.upstream === '07-personas.md', 'dup-07 routes to 07-personas.md');

  const badtag = MANIFEST.fixtures.find((f) => f.up06 === 'bad-upstream-06');
  const rbad = run(badtag);
  ok(rbad.json && rbad.json.status === 'fail' && rbad.code === 1, 'bad-tag-06 ⇒ fail / exit 1');
  const ud6 = rbad.json && rbad.json.findings.find((f) => f.class === 'upstream-defect');
  ok(ud6 && ud6.upstream === 'onboarding.feature', 'bad-tag-06 routes to the named .feature');
  ok(ud6 && /weird-thing/.test(ud6.detail), 'bad-tag-06 detail names the offending tag');

  // Unparseable 07 ⇒ broken-test, NOT upstream-defect.
  const m07 = MANIFEST.fixtures.find((f) => f.malformedUpstream === '07');
  const rm07 = run(m07);
  ok(rm07.json && rm07.json.status === 'broken-test' && rm07.code === 3, 'unparseable 07 ⇒ broken-test / exit 3');
  ok(rm07.json && !rm07.json.findings.some((f) => f.class === 'upstream-defect'), 'unparseable 07 NOT mis-routed as upstream-defect');

  // Unparseable 06 ⇒ broken-test.
  const m06 = MANIFEST.fixtures.find((f) => f.malformedUpstream === '06');
  const rm06 = run(m06);
  ok(rm06.json && rm06.json.status === 'broken-test' && rm06.code === 3, 'unparseable 06 ⇒ broken-test / exit 3');
}

// ===========================================================================
// PART 6 — WALKER HONESTY: the nominal path actually walks. The choice fixture's
// computed budget uses ONLY the first branch; flipping branch order in a scratch copy
// CHANGES the computed value — proving the walk is real, not a static echo.
// ===========================================================================
process.stderr.write('PART 6 — walker honesty: flipping the choice branch order changes the computed budget\n');
{
  // Build a scratch 08 dir where transfer_funds' choice branches differ in token count, then
  // flip their document order and prove the computed budget changes.
  const scratch = mkdtempSync(join(tmpdir(), 'tm-walker-'));
  cpSync(join(FIXTURES, 'valid-08'), scratch, { recursive: true });
  const tf = join(scratch, 'accountholder-transfer_funds.xml');
  let txt = readFileSync(tf, 'utf8');
  // Make the second branch (pick-savings) cheaper so order matters: MPBB (3) vs MP (2).
  txt = txt.replace(
    '      <Task id="pick-savings" category="interaction"\n            scenario-tags="@transition:select_source_account"\n            klm="MPBB"/>',
    '      <Task id="pick-savings" category="interaction"\n            scenario-tags="@transition:select_source_account"\n            klm="MP"/>');
  // first child pick-checking = MPBB (3) ⇒ nominal sum stays 14. Set budget to 14 so it passes.
  writeFileSync(tf, txt, 'utf8');
  const before = runAbs(scratch, join(FIXTURES, 'upstream-06'), join(FIXTURES, 'upstream-07.md'));
  const bBefore = before.json.budgets.find((b) => b.model === 'accountholder-transfer_funds').computed;
  ok(bBefore === 14, `choice walks the FIRST branch (pick-checking MPBB=3) ⇒ computed 14 (got ${bBefore})`);

  // Now FLIP the order: pick-savings (MP=2) becomes the first document-order child.
  let flipped = readFileSync(tf, 'utf8');
  const checkBlock = '      <Task id="pick-checking" category="interaction"\n            scenario-tags="@transition:select_source_account"\n            klm="MPBB"/>\n';
  const saveBlock = '      <Task id="pick-savings" category="interaction"\n            scenario-tags="@transition:select_source_account"\n            klm="MP"/>\n';
  ok(flipped.includes(checkBlock) && flipped.includes(saveBlock), 'scratch has both branch blocks to flip');
  flipped = flipped.replace(checkBlock + saveBlock, saveBlock + checkBlock);
  writeFileSync(tf, flipped, 'utf8');
  const after = runAbs(scratch, join(FIXTURES, 'upstream-06'), join(FIXTURES, 'upstream-07.md'));
  const bAfter = after.json.budgets.find((b) => b.model === 'accountholder-transfer_funds').computed;
  ok(bAfter === 13, `flipping the choice order ⇒ first branch now pick-savings (MP=2) ⇒ computed 13 (got ${bAfter})`);
  ok(bBefore !== bAfter, `the walk is REAL: branch order changes the computed budget (${bBefore} → ${bAfter})`);
  // and the declared 14 now mismatches the computed 13 ⇒ W-BUDGET fires (the oracle re-walks).
  ok(after.json.status === 'fail', 'after the flip the declared 14 ≠ computed 13 ⇒ W-BUDGET fail (oracle re-derives, never echoes)');
}

// ===========================================================================
// PART 7 — Counter conflation + reconciliation.
// ===========================================================================
process.stderr.write('PART 7 — counter conflation / reconciliation\n');
{
  const v = run({ dir: 'valid-08', up06: 'upstream-06', up07: 'upstream-07.md', args: [] }).json;
  const c = v.counts.checks;
  ok(c.mechanical + c.walker + c.resolution + c.exactValue + c.negative + c.agentJudged === c.total,
    `class counters sum to total (${c.mechanical}+${c.walker}+${c.resolution}+${c.exactValue}+${c.negative}+${c.agentJudged} === ${c.total})`);
  ok(v.counts.edgesWalked === v.counts.edgesExpected, `edgesWalked === edgesExpected (${v.counts.edgesWalked}/${v.counts.edgesExpected})`);
  ok(v.counts.walker.total > 0, 'walker layer non-empty over a non-empty artifact');
  ok(v.counts.walker.walks === v.counts.intake.models, 'one walk per model');
  ok(v.reconciled === true, 'valid-08 reconciled === true');

  const C = await import('./lib/checks.mjs');
  ok(C.checkXRecon(30, 24, 25, 5, 3).status === 'broken', 'X-RECON detects a dropped edge (24 vs 25) ⇒ broken');
  ok(C.checkXRecon(0, 0, 0, 0, 0).status === 'broken', 'X-RECON with zero checks ⇒ broken (no vacuous green)');
  ok(C.checkXRecon(30, 25, 25, 0, 3).status === 'broken', 'X-RECON: models>0 but walker skipped ⇒ broken (strongest oracle never skipped)');
  ok(C.checkXRecon(30, 25, 25, 5, 3).status === 'pass', 'X-RECON passes when checks>0, edges reconcile, walker ran');
}

// ===========================================================================
// PART 8 — Determinism: same run twice ⇒ byte-identical stdout; isolation.
// ===========================================================================
process.stderr.write('PART 8 — determinism / isolation\n');
{
  const a = run({ dir: 'valid-08', up06: 'upstream-06', up07: 'upstream-07.md', args: [] }).stdout;
  const b = run({ dir: 'valid-08', up06: 'upstream-06', up07: 'upstream-07.md', args: [] }).stdout;
  ok(a === b, 'valid-08 run twice ⇒ byte-identical stdout');
  run({ dir: 'budget-mismatch', up06: 'upstream-06', up07: 'upstream-07.md', args: [] });
  const c = run({ dir: 'valid-08', up06: 'upstream-06', up07: 'upstream-07.md', args: [] }).stdout;
  ok(a === c, 'valid-08 output stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 9 — COVERAGE floor: every ❌-mechanizable behavior has BOTH a positive
// (a passing check over valid-08) AND a negative (a failing fixture) — §5 table.
// ===========================================================================
process.stderr.write('PART 9 — coverage floor (positive AND negative per ❌ behavior)\n');
{
  // [catalog rule, positive check id over valid-08, negative fixture dir, neg owner].
  // ALL 30 ❌-severity catalog rules (validation-rules.md theme index: A1–A8, B1/B2/B4/B5/B6,
  // C1–C4, D1–D5/D7, E1–E5, F1/F2). Every row asserts BOTH a positive (a passing check over
  // valid-08) AND a negative (a shipped fixture failing for that rule's owner) — the §5 floor.
  const COVERAGE = [
    ['A1', 'M1', 'malformed-xml', 'M1'],
    ['A2', 'M2', 'missing-fingerprint', 'M2'],
    ['A3', 'M3', 'root-not-taskmodel', 'M3'],
    ['A4', 'M4', 'id-not-slug', 'M4'],
    ['A5', 'M5', 'missing-budget', 'M5'],
    ['A6', 'M6', 'multi-root-task', 'M6'],
    ['A7', 'M7', 'bad-category', 'M7'],
    ['A8', 'M8', 'unknown-attribute', 'M8'],
    ['B1', 'M9', 'abstract-leaf', 'M9'],
    ['B2', 'M10', 'single-child-abstract', 'M10'],
    ['B4', 'W-REACH', 'unreachable-leaf', 'W-REACH'],
    ['B5', 'M9', 'abstract-leaf', 'M9'],
    ['B6', 'M11', 'iterative-root', 'M11'],
    ['C1', 'M12', 'operator-on-single-child', 'M12'],
    ['C2', 'M13', 'multi-child-no-operator', 'M13'],
    ['C3', 'M14', 'bad-operator', 'M14'],
    ['C4', 'M15', 'unary-as-operator', 'M15'],
    ['D1', 'M16', 'klm-absent-leaf', 'M16'],
    ['D2', 'M17', 'bad-klm-token', 'M17'],
    ['D3', 'M18', 'unreachable-leaf', 'M18'],
    ['D4', 'M19', 'm-on-system-leaf', 'M19'],
    ['D5', 'W-BUDGET', 'budget-mismatch', 'W-BUDGET'],
    ['D7', 'M20', 'bad-multiplier', 'M20'],
    ['E1', 'M-BIJ', 'missing-model', 'M-BIJ'],
    ['E1b', 'M-BIJ', 'extra-model', 'M-BIJ'],
    ['E2', 'M-ATTR', 'persona-attr-mismatch', 'M-ATTR'],
    ['E3', 'M21', 'untagged-leaf', 'M21'],
    ['E4', 'R-TAG', 'ghost-scenario-tag', 'R-TAG'],
    ['E5', 'M22', 'bad-upstream-06', 'M22'],
    ['F1', 'M23', 'restated-gherkin-text', 'M23'],
    ['F2', 'M24', 'bad-category', 'M24'],
  ];
  // 30 ❌ rules (B5 shares M9/abstract-leaf with B1; E1b is the second E1 side; the rest are
  // 1:1) ⇒ 31 rows covering all 30 distinct rules.
  ok(COVERAGE.length >= 31, `COVERAGE enumerates ≥31 rows covering all 30 ❌ rules (got ${COVERAGE.length})`);
  const distinctRules = new Set(COVERAGE.map(([r]) => r.replace(/b$/, '')));
  ok(distinctRules.size === 30, `COVERAGE covers all 30 distinct ❌ rules (got ${distinctRules.size})`);

  const valid = run({ dir: 'valid-08', up06: 'upstream-06', up07: 'upstream-07.md', args: [] }).json;
  let covered = 0;
  for (const [rule, posId, negDir, negOwner] of COVERAGE) {
    let positiveOk;
    if (posId === 'M1') {
      // M1 (well-formedness) is the malformed GATE: a well-formed valid-08 emits no M1
      // check record (it only surfaces as a fail on the malformed exit). Reaching a clean
      // `pass` over valid-08 IS the M1 positive (every model parsed + carried the decl).
      positiveOk = valid.status === 'pass';
    } else {
      const posChecks = valid.checks.filter((c) => c.id === posId);
      positiveOk = posChecks.length > 0 && posChecks.every((c) => c.status !== 'fail') && posChecks.some((c) => c.status === 'pass');
    }
    ok(positiveOk, `[coverage ${rule}] positive ${posId} passes over valid-08`);

    // the E5 negative is the bad-tag-06 upstream (different up06).
    const up06 = negDir === 'bad-upstream-06' ? 'bad-upstream-06' : 'upstream-06';
    const negDirName = negDir === 'bad-upstream-06' ? 'valid-08' : negDir;
    const neg = run({ dir: negDirName, up06, up07: 'upstream-07.md', args: [] }).json;
    const negFails = rejectionIds(neg).includes(negOwner);
    ok(negFails, `[coverage ${rule}] negative ${negDir} fails its owner check ${negOwner}`);
    if (positiveOk && negFails) covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} ❌-behaviors have BOTH a positive and a negative (got ${covered})`);
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
