#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the statecharts oracle (verification
// doctrine §3): a regression suite proving the harness catches false-greens. It
// demonstrates:
//   1. every manifest fixture ⇒ EXACT expected status + owner-check + exit code;
//   2. the wrong-reason trap reports the M12 (missing-04-row) owner, with the
//      co-present M20 forbidden-synonym ALSO detected but NOT the named owner;
//   3. no vacuous green: --no-checks ⇒ broken-test (exit 3); AND a zero-machine run
//      that is NOT a sanctioned not-emitted record would be broken-test;
//   4. NOT-EMITTED: not-emitted-correct ⇒ pass WITH gate:not-emitted, machines===0,
//      gated on gateArithmeticRun>0 (X-GATE ran over every entity); not-emitted-wrong
//      ⇒ fail owner M8 (missed promotion — the same owner as a present-dir miss);
//   5. ENGINE HONESTY: a W-STEP actually drives SCION — a PREPARED model walks
//      placed→paid→shipped, and an UNPREPARED model WOULD read ["$generated-state-0"]
//      (the §0 gotcha-2 guard is real, not pretend);
//   6. deps-missing path (a nonexistent node_modules via --force-missing-deps +
//      --no-install) ⇒ broken-test, exit 3 (never a vacuous parse-only pass);
//   7. counter conflation: X-RECON catches a dropped edge / zero checks / engine-skip;
//   8. upstream-defect routing (04) names the right file; unparseable upstream (02/04)
//      ⇒ broken-test (not mis-routed as upstream-defect);
//   9. determinism: the same inputs twice ⇒ byte-identical stdout (incl. the
//      not-emitted-correct run);
//  10. coverage floor: every ❌ catalog rule has BOTH a positive (passing over
//      valid-05) AND a negative (a failing fixture).
//
// Exit 0 ONLY when every assertion passes. Runtime kept sane (<5 min) by a fresh
// SCION machine per walk (the §8 freshness contract) — no shared state.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(__dirname, 'harness.mjs');
const FIXTURES = join(__dirname, 'fixtures');
const MANIFEST = JSON.parse(readFileSync(join(FIXTURES, 'manifest.json'), 'utf8'));
const U = MANIFEST.upstreams;
const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

let passed = 0, failed = 0;
const fails = [];
function ok(cond, label) { if (cond) passed++; else { failed++; fails.push(label); process.stderr.write(`  x ${label}\n`); } }

function fx(p) { return join(FIXTURES, p); }
function argsFor(f) {
  const up01 = fx(f.up01 || U.up01), up02 = fx(f.up02 || U.up02), up03 = fx(f.up03 || U.up03);
  const up04dbml = fx(f.up04dbml || U.up04dbml), up04tr = fx(f.up04tr || U.up04tr);
  const dir = f.dir.startsWith('NONEXISTENT') ? join(FIXTURES, f.dir) : fx(f.dir);
  const args = [HARNESS, dir, '--upstream-01', up01, '--upstream-02', up02, '--upstream-03', up03,
    '--upstream-04-dbml', up04dbml, '--upstream-04-transitions', up04tr];
  if (f.args) args.push(...f.args);
  return args;
}
function run(f, extra = []) {
  const args = argsFor(f).concat(extra);
  let stdout = '', code = 0;
  try { stdout = execFileSync('node', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { stdout = e.stdout ? e.stdout.toString() : ''; code = typeof e.status === 'number' ? e.status : -1; }
  let json = null; try { json = JSON.parse(stdout); } catch { json = null; }
  return { stdout, code, json };
}
function errIds(json) { return json ? json.findings.filter((x) => x.severity === 'error').map((x) => x.id) : []; }

// ===========================================================================
// PART 1 — every manifest fixture: exact status + owner-check + exit code.
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
for (const f of MANIFEST.fixtures) {
  const { code, json } = run(f);
  const tag = `${f.dir}${f.args ? ' ' + f.args.join(' ') : ''}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary on stdout`);
  if (!json) continue;
  ok(json.status === f.status, `[${tag}] status === ${f.status} (got ${json.status})`);
  ok(code === EXIT[f.status], `[${tag}] exit === ${EXIT[f.status]} (got ${code})`);
  if (f.failingCheck) {
    const failingIds = json.checks.filter((c) => c.status === 'fail').map((c) => c.id);
    const present = failingIds.includes(f.failingCheck) || errIds(json).includes(f.failingCheck);
    ok(present, `[${tag}] owner ${f.failingCheck} among rejections (fails=[${failingIds.join(',')}])`);
  }
  if (f.failingCheck === null && f.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
  }
  if (f.gateRecord) ok(json.gate.record === f.gateRecord, `[${tag}] gate.record === ${f.gateRecord} (got ${json.gate.record})`);
}

// ===========================================================================
// PART 2 — Wrong-reason trap: M12 is the owner; M20 also fires but is NOT the
// pinned owner. Proves the negative fires for its OWNER reason.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports the M12 reason (M20 also present, not owner)\n');
{
  const trap = MANIFEST.fixtures.find((x) => x.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = run(trap);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const ids = errIds(json);
  ok(ids.includes(trap.trapOwner), `trap reports its OWNER ${trap.trapOwner} (the missing-04-row defect)`);
  ok(ids.includes(trap.trapAlsoPresent), `trap ALSO detects the co-present ${trap.trapAlsoPresent} forbidden-synonym defect (both fire)`);
  ok(trap.failingCheck === 'M12', 'manifest pins trap owner to M12 (not M20)');
}

// ===========================================================================
// PART 3 — No vacuous green.
// ===========================================================================
process.stderr.write('PART 3 — no vacuous green\n');
{
  const vac = MANIFEST.fixtures.find((x) => x.vacuous);
  const r = run(vac);
  ok(r.json && r.json.status === 'broken-test', '--no-checks ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, '--no-checks reports zero parsed checks');
  ok(r.code === 3, '--no-checks exits 3 (broken-test)');
}

// ===========================================================================
// PART 4 — NOT-EMITTED: the conditional-artifact design (unique to this skill).
// ===========================================================================
process.stderr.write('PART 4 — not-emitted: correct absence is a certified pass; wrong absence is M8\n');
{
  const correct = MANIFEST.fixtures.find((x) => x.notEmittedCorrect);
  const rc = run(correct);
  ok(rc.json && rc.json.status === 'pass', `not-emitted-correct ⇒ pass (got ${rc.json && rc.json.status})`);
  ok(rc.code === 0, 'not-emitted-correct exits 0');
  ok(rc.json && rc.json.gate.record === 'not-emitted', 'not-emitted-correct records gate:not-emitted');
  ok(rc.json && rc.json.counts.intake.machines === 0, 'not-emitted-correct has machines === 0 (the ONE sanctioned zero-machine pass)');
  ok(rc.json && rc.json.counts.checks.total > 0, 'not-emitted-correct STILL ran the gate arithmetic (total>0 — NOT vacuous)');
  ok(rc.json && rc.json.gate.gatePassers === 0, 'not-emitted-correct: 0 gate passers');

  const wrong = MANIFEST.fixtures.find((x) => x.notEmittedWrong);
  const rw = run(wrong);
  ok(rw.json && rw.json.status === 'fail', `not-emitted-wrong ⇒ fail (got ${rw.json && rw.json.status})`);
  ok(rw.json && rw.json.gate.record === 'not-emitted', 'not-emitted-wrong records gate:not-emitted');
  ok(rw.json && errIds(rw.json).includes('M8'), 'not-emitted-wrong owner is M8 (missed promotion — same owner as a present-dir miss)');
  ok(rw.json && rw.json.gate.gatePassers === 1, 'not-emitted-wrong: 1 gate passer (order) the absence wrongly omits');
}

// ===========================================================================
// PART 5 — ENGINE HONESTY: a W-STEP actually drives SCION; the gotcha-2 guard is real.
// ===========================================================================
process.stderr.write('PART 5 — engine genuinely runs SCION (prepared walks; unprepared is wrong-green)\n');
{
  const E = await import('./lib/engine.mjs');
  const deps = E.ensureDeps({ allowInstall: false });
  ok(deps.ok, 'engine deps present for the direct engine-honesty probe');
  if (deps.ok) {
    const { scxml } = E.loadEngine();
    const doc = readFileSync(fx('valid-05/order.scxml'), 'utf8');

    // PREPARED model: a genuine walk placed → paid → shipped.
    const m = await E.loadMachine(scxml, 'order', doc);
    ok(m.ok, 'prepared model loads on SCION without throw');
    if (m.ok) {
      const c0 = m.sc.start().sort();
      ok(JSON.stringify(c0) === JSON.stringify(['placed']), `start() === ["placed"] (got ${JSON.stringify(c0)})`);
      const c1 = m.sc.gen({ name: 'order_paid' }).sort();
      ok(JSON.stringify(c1) === JSON.stringify(['paid']), `order_paid ⇒ ["paid"] (got ${JSON.stringify(c1)})`);
      const cNeg = m.sc.gen({ name: '__no_such__' }).sort();
      ok(JSON.stringify(cNeg) === JSON.stringify(['paid']), `disabled event leaves ["paid"] unchanged (got ${JSON.stringify(cNeg)}) — Rec discard semantics`);
      const c2 = m.sc.gen({ name: 'order_shipped' }).sort();
      ok(JSON.stringify(c2) === JSON.stringify(['shipped']), `order_shipped ⇒ ["shipped"] (got ${JSON.stringify(c2)})`);
    }

    // UNPREPARED model: handing the raw factory to the Statechart ctor would yield the
    // vacuous ["$generated-state-0"] config — the silent wrong-green W-LOAD guards.
    const wrongGreen = await new Promise((resolve) => {
      scxml.documentStringToModel('mem://order', doc, (err, mf) => {
        if (err) { resolve(null); return; }
        try { const bad = new scxml.core.Statechart(mf); resolve(bad.start()); }
        catch (e) { resolve(['__threw__']); }
      });
    });
    ok(Array.isArray(wrongGreen) && wrongGreen.includes('$generated-state-0'),
      `UNPREPARED model reads ["$generated-state-0"] (got ${JSON.stringify(wrongGreen)}) — the gotcha-2 wrong-green the W-LOAD guard catches`);

    // and the harness's W-LOAD over valid-05 PASSES (real prepared run).
    const v = run(MANIFEST.fixtures.find((x) => x.dir === 'valid-05' && x.status === 'pass'));
    const wload = v.json && v.json.checks.find((c) => c.id === 'W-LOAD');
    ok(wload && wload.status === 'pass', 'W-LOAD passes over valid-05 (a real prepared SCION run)');
    const wstep = v.json && v.json.checks.filter((c) => c.id.startsWith('W-STEP')).every((c) => c.status === 'pass');
    ok(wstep, 'every W-STEP passes over valid-05 (configurations advance per the 04 walk)');
    ok(v.json && v.json.counts.engine.total > 0, 'valid-05 ran a non-empty engine layer');
  }
}

// ===========================================================================
// PART 6 — deps-missing path ⇒ broken-test.
// ===========================================================================
process.stderr.write('PART 6 — missing-engine ⇒ broken-test (never a vacuous parse-only pass)\n');
{
  const ne = MANIFEST.fixtures.find((x) => x.noEngine);
  const r = run(ne);
  ok(r.json && r.json.status === 'broken-test', `missing-engine ⇒ broken-test (got ${r.json && r.json.status})`);
  ok(r.code === 3, 'missing-engine exits 3');
  ok(r.json && !r.json.checks.some((c) => c.status === 'pass' && c.class === 'engine'), 'missing-engine ran NO engine checks (no vacuous parse-only green)');
}

// ===========================================================================
// PART 7 — counter conflation / reconciliation: dropped edge / zero / engine-skip.
// ===========================================================================
process.stderr.write('PART 7 — reconciliation catches a dropped edge / engine-skip / zero checks\n');
{
  const C = await import('./lib/checks.mjs');
  ok(C.checkXRecon(40, 26, 27, 13, 1, 1).status === 'broken', 'X-RECON detects a dropped edge (26 vs 27) ⇒ broken');
  ok(C.checkXRecon(0, 0, 0, 0, 0, 0).status === 'broken', 'X-RECON with zero executed checks ⇒ broken (no vacuous green)');
  ok(C.checkXRecon(40, 27, 27, 0, 1, 1).status === 'broken', 'X-RECON with machines>0 but engineRun=0 ⇒ broken (engine-skip guard)');
  ok(C.checkXRecon(5, 2, 2, 0, 0, 0).status === 'broken', 'X-RECON with gateArithmeticRun=0 ⇒ broken (gate-arithmetic guard)');
  ok(C.checkXRecon(5, 2, 2, 0, 0, 1).status === 'pass', 'X-RECON passes the sanctioned not-emitted shape (machines=0, gateArithmeticRun>0)');
  ok(C.checkXRecon(40, 27, 27, 13, 1, 1).status === 'pass', 'X-RECON passes a normal reconciled run');

  const v = run(MANIFEST.fixtures.find((x) => x.dir === 'valid-05' && x.status === 'pass'));
  ok(v.json && v.json.counts.edgesWalked === v.json.counts.edgesExpected, `valid-05 edgesWalked === edgesExpected (${v.json && v.json.counts.edgesWalked}/${v.json && v.json.counts.edgesExpected})`);
  ok(v.json && v.json.reconciled === true, 'valid-05 reconciled === true');
}

// ===========================================================================
// PART 8 — upstream-defect routing (04) vs unparseable upstream (broken-test).
// ===========================================================================
process.stderr.write('PART 8 — upstream-defect routing (04) vs unparseable upstream\n');
{
  for (const ud of MANIFEST.fixtures.filter((x) => x.upstreamDefect)) {
    const r = run(ud);
    ok(r.json && r.json.status === 'fail', `[${ud.upstreamDefectFile}] upstream-defect status === fail (got ${r.json && r.json.status})`);
    ok(r.code === 1, `[${ud.upstreamDefectFile}] upstream-defect exits 1 (taxonomy stays closed)`);
    const tagged = r.json && r.json.findings.find((x) => x.class === 'upstream-defect');
    ok(!!tagged, `[${ud.upstreamDefectFile}] a finding carries class:"upstream-defect"`);
    if (tagged) {
      ok(tagged.upstream === ud.upstreamDefectFile, `[${ud.upstreamDefectFile}] routes to '${ud.upstreamDefectFile}' (got '${tagged.upstream}')`);
      ok(tagged.detail.includes(ud.upstreamDefectElement), `[${ud.upstreamDefectFile}] names the offending element ('${ud.upstreamDefectElement}')`);
    }
  }
  for (const mu of MANIFEST.fixtures.filter((x) => x.malformedUpstream)) {
    const r = run(mu);
    ok(r.json && r.json.status === 'broken-test', `[upstream-${mu.malformedUpstream} unparseable] ⇒ broken-test (got ${r.json && r.json.status})`);
    ok(r.code === 3, `[upstream-${mu.malformedUpstream} unparseable] exits 3 (not fail)`);
    ok(r.json && !r.json.findings.some((x) => x.class === 'upstream-defect'), `[upstream-${mu.malformedUpstream} unparseable] NOT mis-routed as upstream-defect`);
  }
}

// ===========================================================================
// PART 9 — Determinism: same inputs twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 9 — determinism / no cross-run engine-state leak\n');
{
  const valid = MANIFEST.fixtures.find((x) => x.dir === 'valid-05' && x.status === 'pass');
  const a = run(valid).stdout;
  const b = run(valid).stdout;
  ok(a === b, 'valid-05 run twice ⇒ byte-identical stdout (engine state does not leak)');
  // interleave a different run, then re-run valid: still identical (fresh machine per walk).
  run(MANIFEST.fixtures.find((x) => x.dir === 'wrong-initial'));
  const c = run(valid).stdout;
  ok(a === c, 'valid-05 stdout stable across an interleaved different run (isolation)');

  // the not-emitted-correct pass is ALSO byte-deterministic.
  const ne = MANIFEST.fixtures.find((x) => x.notEmittedCorrect);
  ok(run(ne).stdout === run(ne).stdout, 'not-emitted-correct run twice ⇒ byte-identical stdout');
}

// ===========================================================================
// PART 10 — Coverage floor: every ❌ catalog rule has BOTH a positive (a passing
// check over valid-05) AND a negative (a failing fixture). Source of truth is the
// simulation.md §5 mapping + closing ❌-reconciliation table.
// ===========================================================================
process.stderr.write('PART 10 — coverage floor (positive AND negative per ❌ rule)\n');
{
  // [catalog rule, positive owner-check, positive source dir, negative fixture dir,
  // neg owner]. Most positives are proven over valid-05; the guard arm (B2) is proven
  // over the guard-verified fixture (valid-05 has no guards, so W-GUARD never runs).
  const COVERAGE = [
    ['A1', 'M1', 'valid-05', 'dir-empty', 'M1'],
    ['A2', 'M2', 'valid-05', 'bad-filename', 'M2'],
    ['A3', 'M3', 'valid-05', 'not-wellformed', 'M3'],
    ['A4', 'M4', 'valid-05', 'missing-fingerprint', 'M4'],
    ['A5', 'M5', 'valid-05', 'missing-supersedes', 'M5'],
    ['A6', 'M6', 'valid-05', 'bad-version', 'M6'],
    ['A7', 'M14', 'valid-05', 'wrong-initial', 'M14'],
    ['A8', 'M7', 'valid-05', 'cond-under-null', 'M7'],
    ['B1', 'M9', 'valid-05', 'unjustified-promotion', 'M9'],
    ['B2', 'W-GUARD:0', 'guard-verified', 'guard-unverified', 'W-GUARD'],
    ['B3', 'M8', 'valid-05', 'missed-promotion', 'M8'],
    ['B5', 'M10', 'valid-05', 'non-lifecycle-promoted', 'M10'],
    ['C1', 'M11', 'valid-05', 'extra-state', 'M11'],
    ['C2', 'M12', 'valid-05', 'missing-04-row', 'M12'],
    ['C4', 'M13', 'valid-05', 'contradicting-transition', 'M13'],
    ['D1', 'W-LOAD', 'valid-05', 'not-wellformed', 'M3'],
    ['D2', 'M15', 'valid-05', 'duplicate-id', 'M15'],
    ['D3', 'M16', 'valid-05', 'dangling-target', 'M16'],
    ['D4', 'M17', 'valid-05', 'unreachable-state', 'M17'],
    ['D7', 'M19', 'valid-05', 'bad-event-token', 'M19'],
    ['E1', 'M20', 'valid-05', 'forbidden-synonym', 'M20'],
    ['E2', 'M21', 'valid-05', 'restated-04-table', 'M21'],
    ['E4', 'X-ROUNDTRIP', 'valid-05', 'roundtrip-mismatch', 'M19'],
  ];
  const posCache = new Map();
  const posJson = (dir) => {
    if (!posCache.has(dir)) posCache.set(dir, run(MANIFEST.fixtures.find((x) => x.dir === dir && (x.status === 'pass'))).json);
    return posCache.get(dir);
  };
  let covered = 0;
  for (const [rule, posId, posDir, negDir, negOwner] of COVERAGE) {
    const src = posJson(posDir);
    const pos = src && src.checks.find((c) => c.id === posId);
    ok(pos && pos.status === 'pass', `[coverage ${rule}] positive ${posId} passes over ${posDir}`);
    const negFx = MANIFEST.fixtures.find((x) => x.dir === negDir && !x.vacuous && !x.noEngine && !x.upstreamDefect && !x.malformedUpstream);
    const neg = run(negFx).json;
    const negFires = neg && (neg.checks.some((c) => c.id === negOwner && c.status === 'fail') || errIds(neg).includes(negOwner) || neg.status === 'malformed');
    ok(negFires, `[coverage ${rule}] negative (${negDir}) fires its owner ${negOwner}`);
    covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} ❌ behaviors have BOTH a positive and a negative`);
}

// ===========================================================================
process.stderr.write('\n');
if (failed === 0) { process.stderr.write(`SELFTEST PASS — ${passed} assertions, 0 failures.\n`); process.exit(0); }
else { process.stderr.write(`SELFTEST FAIL — ${failed} of ${passed + failed} assertions failed:\n`); for (const f of fails) process.stderr.write(`  - ${f}\n`); process.exit(1); }
