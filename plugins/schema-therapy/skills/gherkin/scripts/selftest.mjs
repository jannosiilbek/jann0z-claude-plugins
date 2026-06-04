#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the gherkin oracle (verification doctrine
// §3): a regression suite proving the harness catches false-greens. It demonstrates:
//   1. every manifest fixture ⇒ EXACT status + owner-check + exit code, in its pinned
//      run-mode (with05 / no05);
//   2. the wrong-reason trap reports the X-COV-INV (B1) owner, with the co-present M17
//      forbidden-synonym ALSO detected but NOT the named owner;
//   3. no vacuous green: --no-checks ⇒ broken-test (exit 3);
//   4. the vacuous FEATURE (zero pickles) ⇒ fail W-INST (engine honesty — a parse-clean
//      feature that compiles to zero pickles instantiates nothing);
//   5. ENGINE HONESTY: a parse error genuinely surfaces the CompositeParserException
//      message (the testdata/bad oracle shape, byte-for-byte); a zero-pickle feature
//      genuinely fails W-INST;
//   6. parse-negative error shapes match the adapted testdata/bad expectations;
//   7. 05-claimed-but-absent fires N-05ABSENT (R-FINGERPRINT with n05absent);
//   8. AUTHORITY SWITCH proven: the same 06 file set is judged differently with vs
//      without --upstream-05 where the scxml has the beyond-04 (refunded) transition;
//   9. upstream-defect routing names the right file (03/04); unparseable upstream/05 ⇒
//      broken-test (not mis-routed as upstream-defect);
//  10. deps-missing path ⇒ broken-test, exit 3 (never a vacuous parse-only pass);
//  11. counter conflation: X-RECON catches a dropped edge / zero checks / engine-skip /
//      dropped coverage edge;
//  12. determinism: same inputs twice ⇒ byte-identical stdout;
//  13. coverage floor: every ❌ catalog rule has BOTH a positive (passing over a valid
//      run) AND a negative (a failing fixture).
//
// Exit 0 ONLY when every assertion passes. Runtime <5 min (pure parse+walk, no engine
// boot per machine).

import { readFileSync } from 'node:fs';
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
  const dir = f.dir.startsWith('NONEXISTENT') ? fx(f.dir) : fx(f.dir);
  const args = [HARNESS, dir,
    '--upstream-02', fx(f.up02 || U.up02),
    '--upstream-03', fx(f.up03 || U.up03),
    '--upstream-04-dbml', fx(f.up04dbml || U.up04dbml),
    '--upstream-04-transitions', fx(f.up04tr || U.up04tr)];
  if (f.runFlag === 'with05') args.push('--upstream-05', fx(f.up05 || U.up05));
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
function failIds(json) { return json ? json.checks.filter((c) => c.status === 'fail').map((c) => c.id) : []; }

// ===========================================================================
// PART 1 — every manifest fixture: exact status + owner-check + exit + authority.
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code + authority\n');
for (const f of MANIFEST.fixtures) {
  const { code, json } = run(f);
  const tag = `${f.dir}[${f.runFlag}]${f.args ? ' ' + f.args.join(' ') : ''}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary`);
  if (!json) continue;
  ok(json.status === f.status, `[${tag}] status === ${f.status} (got ${json.status})`);
  ok(code === EXIT[f.status], `[${tag}] exit === ${EXIT[f.status]} (got ${code})`);
  if (f.failingCheck) {
    const present = failIds(json).includes(f.failingCheck) || errIds(json).includes(f.failingCheck);
    ok(present, `[${tag}] owner ${f.failingCheck} among rejections (fails=[${failIds(json).join(',')}])`);
  }
  if (f.failingCheck === null && f.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
  }
  if (f.authority) {
    for (const [ent, src] of Object.entries(f.authority)) {
      ok(json.authority[ent] === src, `[${tag}] authority.${ent} === ${src} (got ${json.authority[ent]})`);
    }
  }
  if (f.errorShape) {
    const shape = json.findings.find((x) => x.errorShape);
    ok(shape && shape.errorShape.includes(f.errorShape.replace(/^.*?:\s*/, '').slice(0, 20)) || (shape && shape.errorShape.includes(f.errorShape)),
      `[${tag}] errorShape matches '${f.errorShape}' (got '${shape && shape.errorShape}')`);
  }
}

// ===========================================================================
// PART 2 — Wrong-reason trap: X-COV-INV is the owner; M17 ALSO fires, not owner.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports the X-COV-INV reason (M17 also present)\n');
{
  const trap = MANIFEST.fixtures.find((x) => x.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = run(trap);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const ids = errIds(json);
  ok(ids.includes(trap.trapOwner), `trap reports its OWNER ${trap.trapOwner} (the uncovered invariant)`);
  ok(ids.includes(trap.trapAlsoPresent), `trap ALSO detects the co-present ${trap.trapAlsoPresent} forbidden-synonym defect`);
  ok(trap.failingCheck === 'X-COV-INV', 'manifest pins trap owner to X-COV-INV (not M17)');
}

// ===========================================================================
// PART 3 — No vacuous green (--no-checks) + the vacuous FEATURE (zero pickles).
// ===========================================================================
process.stderr.write('PART 3 — no vacuous green; zero-pickle feature fails W-INST\n');
{
  const vac = MANIFEST.fixtures.find((x) => x.vacuous);
  const r = run(vac);
  ok(r.json && r.json.status === 'broken-test', '--no-checks ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, '--no-checks reports zero parsed checks');
  ok(r.code === 3, '--no-checks exits 3');

  const vf = MANIFEST.fixtures.find((x) => x.dir === 'illegal/vacuous');
  const rv = run(vf);
  ok(rv.json && rv.json.status === 'fail', 'vacuous FEATURE (zero pickles) ⇒ fail');
  ok(rv.json && errIds(rv.json).includes('W-INST'), 'vacuous FEATURE owner is W-INST (B2 instantiation oracle)');
  const winstFail = rv.json && rv.json.checks.some((c) => c.id === 'W-INST' && c.status === 'fail');
  ok(winstFail, 'a W-INST check is fail on the zero-pickle feature');
}

// ===========================================================================
// PART 4 — ENGINE HONESTY: a parse error surfaces the real CompositeParserException
// message; the parse layer genuinely runs.
// ===========================================================================
process.stderr.write('PART 4 — engine honesty: real parser throws surface the testdata/bad oracle shape\n');
{
  const E = await import('./lib/engine.mjs');
  const deps = E.ensureDeps({ allowInstall: false });
  ok(deps.ok, 'parser deps present for the direct engine-honesty probe');
  if (deps.ok) {
    const engine = E.loadEngine();
    ok(engine.gherkinVersion === '39.1.0', `pinned @cucumber/gherkin 39.1.0 (got ${engine.gherkinVersion})`);
    // a genuine parse error throws and carries the oracle message.
    const pr = E.parseFeature(engine, 'not gherkin\n', 'x.feature');
    ok(!pr.ok, 'parse of "not gherkin" returns ok:false (the parser threw)');
    ok(pr.errors[0].message.includes("got 'not gherkin'"), `parser message matches oracle (got '${pr.errors[0].message}')`);
    // a clean feature compiles to ≥1 pickle.
    const good = E.parseFeature(engine, 'Feature: G\n  Scenario: s\n    Given x\n    When y\n    Then z\n', 'g.feature');
    ok(good.ok && good.pickles.length === 1, `clean feature compiles to 1 pickle (got ${good.ok ? good.pickles.length : 'throw'})`);
    // a vacuous feature compiles to ZERO pickles.
    const empty = E.parseFeature(engine, 'Feature: E\n', 'e.feature');
    ok(empty.ok && empty.pickles.length === 0, `vacuous feature compiles to 0 pickles (got ${empty.ok ? empty.pickles.length : 'throw'})`);
    // ids are minted but the harness asserts count/tags, not the id value (determinism).
    const a = E.parseFeature(engine, 'Feature: D\n  @invariant:INV-Order-1\n  Scenario: s\n    Given x\n    When y\n    Then z\n', 'd.feature');
    const b = E.parseFeature(engine, 'Feature: D\n  @invariant:INV-Order-1\n  Scenario: s\n    Given x\n    When y\n    Then z\n', 'd.feature');
    ok(JSON.stringify(a.pickles[0].tags.map((t) => t.name)) === JSON.stringify(b.pickles[0].tags.map((t) => t.name)), 'pickle tags are input-derived (stable across runs)');
  }
}

// ===========================================================================
// PART 5 — parse-negative error shapes match testdata/bad expectations.
// ===========================================================================
process.stderr.write('PART 5 — parse-negative error shapes match the testdata/bad oracle\n');
for (const f of MANIFEST.fixtures.filter((x) => x.errorShape)) {
  const { json, code } = run(f);
  ok(json && json.status === 'malformed', `[${f.dir}] ⇒ malformed (got ${json && json.status})`);
  ok(code === 2, `[${f.dir}] exits 2 (malformed)`);
  const shape = json && json.findings.find((x) => x.errorShape);
  ok(shape && shape.errorShape.includes(f.errorShape), `[${f.dir}] message includes oracle '${f.errorShape}'`);
}

// ===========================================================================
// PART 6 — 05-claimed-but-absent fires N-05ABSENT.
// ===========================================================================
process.stderr.write('PART 6 — 05-claimed-but-absent fires N-05ABSENT (R-FINGERPRINT/n05absent)\n');
{
  const f = MANIFEST.fixtures.find((x) => x.n05absent);
  const { json } = run(f);
  ok(json && json.status === 'fail', `05-claimed-but-absent ⇒ fail (got ${json && json.status})`);
  const n05 = json && json.findings.find((x) => x.n05absent === true);
  ok(!!n05, '05-claimed-but-absent finding carries n05absent:true');
  ok(n05 && n05.id === 'R-FINGERPRINT', 'N-05ABSENT owner is R-FINGERPRINT');
  ok(json && json.upstream05 === null, 'run was without --upstream-05 (upstream05 null)');
}

// ===========================================================================
// PART 7 — AUTHORITY SWITCH: same file set judged differently with vs without 05.
// The beyond-04 (refunded) transition only exists in the scxml graph.
// ===========================================================================
process.stderr.write('PART 7 — authority switch (the 05 beyond-04 refunded edge)\n');
{
  // uncovered-transition: the refunded scenario is dropped. With --upstream-05 (authority
  // = scxml graph, which HAS delivered→refunded), the missing scenario ⇒ fail X-COV-TRANS.
  const u = MANIFEST.fixtures.find((x) => x.dir === 'illegal/uncovered-transition');
  const rWith = run(u);
  ok(rWith.json && rWith.json.status === 'fail', 'uncovered-transition WITH 05 ⇒ fail (refunded edge uncovered)');
  ok(rWith.json && rWith.json.authority.order === '05-scxml', 'order authority is 05-scxml WITH --upstream-05');
  // the SAME order.feature (minus refunded) judged WITHOUT 05 (authority = 04, no
  // refunded edge) would have NO uncovered refunded edge — prove the authority record
  // differs and refunded is not a 04 obligation.
  const rNo = run({ ...u, runFlag: 'no05' });
  ok(rNo.json && rNo.json.authority.order === '04-table', 'order authority is 04-table WITHOUT --upstream-05 (same files, different authority)');
  ok(rNo.json && rNo.json.counts.coverage.transitions < rWith.json.counts.coverage.transitions,
    `04 authority has fewer transitions than 05 (${rNo.json && rNo.json.counts.coverage.transitions} < ${rWith.json && rWith.json.counts.coverage.transitions}) — the beyond-04 edge`);
  // valid-06 vs valid-06-no05 both pass in their pinned modes.
  const v05 = run(MANIFEST.fixtures.find((x) => x.dir === 'valid-06' && x.runFlag === 'with05' && !x.up03 && !x.up05 && !x.args));
  const vno = run(MANIFEST.fixtures.find((x) => x.dir === 'valid-06-no05' && x.runFlag === 'no05' && !x.up04tr));
  ok(v05.json && v05.json.status === 'pass', 'valid-06 WITH 05 ⇒ pass');
  ok(vno.json && vno.json.status === 'pass', 'valid-06-no05 WITHOUT 05 ⇒ pass');
  // total authoritative transitions: order(5 via 05)+coupon(2) = 7 WITH 05;
  // order(4 via 04)+coupon(2) = 6 WITHOUT 05. The +1 is exactly the beyond-04 refunded edge.
  ok(v05.json.counts.coverage.transitions === 7 && vno.json.counts.coverage.transitions === 6,
    `7 transitions via 05 (incl. refunded), 6 via 04 (got ${v05.json.counts.coverage.transitions}/${vno.json.counts.coverage.transitions})`);
}

// ===========================================================================
// PART 8 — upstream-defect routing (03/04) vs unparseable upstream (broken-test).
// ===========================================================================
process.stderr.write('PART 8 — upstream-defect routing (03/04) vs unparseable upstream\n');
{
  for (const ud of MANIFEST.fixtures.filter((x) => x.upstreamDefect)) {
    const r = run(ud);
    ok(r.json && r.json.status === 'fail', `[${ud.upstreamDefectFile}] upstream-defect status === fail (got ${r.json && r.json.status})`);
    ok(r.code === 1, `[${ud.upstreamDefectFile}] exits 1 (taxonomy stays closed)`);
    const tagged = r.json && r.json.findings.find((x) => x.class === 'upstream-defect');
    ok(!!tagged, `[${ud.upstreamDefectFile}] a finding carries class:"upstream-defect"`);
    if (tagged) {
      ok(tagged.upstream === ud.upstreamDefectFile, `[${ud.upstreamDefectFile}] routes to '${ud.upstreamDefectFile}' (got '${tagged.upstream}')`);
      ok(tagged.detail.includes(ud.upstreamDefectElement), `[${ud.upstreamDefectFile}] names offending element '${ud.upstreamDefectElement}'`);
    }
  }
  for (const mu of MANIFEST.fixtures.filter((x) => x.malformedUpstream)) {
    const r = run(mu);
    ok(r.json && r.json.status === 'broken-test', `[upstream-${mu.malformedUpstream} unparseable] ⇒ broken-test (got ${r.json && r.json.status})`);
    ok(r.code === 3, `[upstream-${mu.malformedUpstream} unparseable] exits 3 (not fail)`);
    ok(r.json && !r.json.findings.some((x) => x.class === 'upstream-defect'), `[upstream-${mu.malformedUpstream}] NOT mis-routed as upstream-defect`);
  }
}

// ===========================================================================
// PART 9 — deps-missing path ⇒ broken-test (never a vacuous parse-only pass).
// ===========================================================================
process.stderr.write('PART 9 — missing-parser ⇒ broken-test\n');
{
  const ne = MANIFEST.fixtures.find((x) => x.noEngine);
  const r = run(ne);
  ok(r.json && r.json.status === 'broken-test', `missing-parser ⇒ broken-test (got ${r.json && r.json.status})`);
  ok(r.code === 3, 'missing-parser exits 3');
  ok(r.json && (r.json.counts.engine.total === 0 || !r.json.checks.some((c) => c.class === 'engine' && c.status === 'pass')), 'missing-parser ran NO passing engine checks');
}

// ===========================================================================
// PART 10 — counter conflation / reconciliation.
// ===========================================================================
process.stderr.write('PART 10 — reconciliation catches dropped edge / engine-skip / zero checks / dropped coverage\n');
{
  const C = await import('./lib/checks.mjs');
  ok(C.checkXRecon(40, 26, 27, 13, 1, 8, 8).status === 'broken', 'X-RECON detects a dropped edge (26 vs 27) ⇒ broken');
  ok(C.checkXRecon(0, 0, 0, 0, 0, 0, 0).status === 'broken', 'X-RECON with zero executed checks ⇒ broken');
  ok(C.checkXRecon(40, 27, 27, 0, 1, 8, 8).status === 'broken', 'X-RECON with featureCount>0 but engineRun=0 ⇒ broken (engine-skip guard)');
  ok(C.checkXRecon(40, 27, 27, 13, 1, 7, 8).status === 'broken', 'X-RECON with a dropped coverage edge (7 vs 8) ⇒ broken');
  ok(C.checkXRecon(40, 27, 27, 13, 1, 8, 8).status === 'pass', 'X-RECON passes a normal reconciled run');

  const v = run(MANIFEST.fixtures.find((x) => x.dir === 'valid-06' && x.runFlag === 'with05' && !x.up03 && !x.up05 && !x.args));
  ok(v.json && v.json.counts.edgesWalked === v.json.counts.edgesExpected, `valid-06 edgesWalked === edgesExpected (${v.json && v.json.counts.edgesWalked}/${v.json && v.json.counts.edgesExpected})`);
  ok(v.json && v.json.reconciled === true, 'valid-06 reconciled === true');
  ok(v.json && v.json.counts.engine.total > 0, 'valid-06 ran a non-empty engine layer (parse+compile)');
}

// ===========================================================================
// PART 11 — Determinism: same inputs twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 11 — determinism / byte-identical double run\n');
{
  const v05 = MANIFEST.fixtures.find((x) => x.dir === 'valid-06' && x.runFlag === 'with05' && !x.up03 && !x.up05 && !x.args);
  ok(run(v05).stdout === run(v05).stdout, 'valid-06 (with05) run twice ⇒ byte-identical stdout');
  const vno = MANIFEST.fixtures.find((x) => x.dir === 'valid-06-no05' && x.runFlag === 'no05' && !x.up04tr);
  // interleave a different run, then re-run: still identical (fresh parse per file).
  const a = run(vno).stdout;
  run(MANIFEST.fixtures.find((x) => x.dir === 'illegal/multi-when'));
  ok(a === run(vno).stdout, 'valid-06-no05 stdout stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 12 — Coverage floor: every ❌ catalog rule has BOTH a positive (passing over a
// valid run) AND a negative (a failing fixture). Source: simulation.md §5 + §closing.
// ===========================================================================
process.stderr.write('PART 12 — coverage floor (positive AND negative per ❌ rule)\n');
{
  // [catalog rule, positive owner-check, positive fixture-dir, positive runFlag,
  //  negative fixture-dir, negative owner].
  const COVERAGE = [
    ['A1', 'R-BIJECT', 'valid-06', 'with05', 'illegal/extra-feature-file', 'R-BIJECT'],
    ['A2', 'M2', 'valid-06', 'with05', 'illegal/bad-filename', 'R-BIJECT'],
    ['A3', 'W-FEAT', 'valid-06', 'with05', 'illegal/wrong-feature-name', 'W-FEAT'],
    ['A4', 'R-FINGERPRINT', 'valid-06', 'with05', 'illegal/missing-fingerprint', 'R-FINGERPRINT'],
    ['A5', 'W-PARSE', 'valid-06', 'with05', 'illegal/not-gherkin', 'W-PARSE'],
    ['A6', 'R-TAG', 'valid-06', 'with05', 'illegal/bad-tag-namespace', 'R-TAG'],
    ['A6t', 'R-TAGTARGET', 'valid-06', 'with05', 'illegal/tag-target-unresolved', 'R-TAGTARGET'],
    ['B1', 'X-COV-INV', 'valid-06', 'with05', 'illegal/uncovered-invariant', 'X-COV-INV'],
    ['B2', 'X-COV-TRANS', 'valid-06', 'with05', 'illegal/uncovered-transition', 'X-COV-TRANS'],
    ['B2i', 'W-INST', 'valid-06', 'with05', 'illegal/vacuous', 'W-INST'],
    ['B3', 'X-COV-TERM', 'valid-06', 'with05', 'illegal/missing-terminal', 'X-COV-TERM'],
    ['B4', 'X-COV-POL', 'valid-06', 'with05', 'illegal/uncovered-policy', 'X-COV-POL'],
    ['B5', 'R-AUTHORITY', 'valid-06', 'with05', 'illegal/contradicting-scenario', 'R-AUTHORITY'],
    ['C3', 'X-ONEWHEN', 'valid-06', 'with05', 'illegal/multi-when', 'X-ONEWHEN'],
    ['C4', 'M12', 'valid-06', 'with05', 'illegal/action-in-then', 'M12'],
    ['D2', 'M15', 'valid-06', 'with05', 'illegal/invented-state', 'M15'],
    ['D3', 'R-EVENT', 'valid-06', 'with05', 'illegal/missing-event-string', 'R-EVENT'],
    ['D4', 'M17', 'valid-06', 'with05', 'illegal/forbidden-synonym', 'M17'],
    ['D5', 'M18', 'valid-06', 'with05', 'illegal/invented-entity', 'M18'],
    ['E1', 'M19', 'valid-06', 'with05', 'illegal/restated-invariant', 'M19'],
    ['E2', 'M20', 'valid-06', 'with05', 'illegal/enum-listing', 'M20'],
    ['E3', 'M21', 'valid-06', 'with05', 'illegal/transition-dump', 'M21'],
    ['bind', 'R-FINGERPRINT', 'valid-06', 'with05', 'illegal/05-claimed-but-absent', 'R-FINGERPRINT'],
  ];
  const posCache = new Map();
  const posJson = (dir, flag) => {
    const k = `${dir}|${flag}`;
    if (!posCache.has(k)) posCache.set(k, run(MANIFEST.fixtures.find((x) => x.dir === dir && x.runFlag === flag && !x.up03 && !x.up05 && !x.args && !x.up04tr)).json);
    return posCache.get(k);
  };
  let covered = 0;
  for (const [rule, posId, posDir, posFlag, negDir, negOwner] of COVERAGE) {
    const src = posJson(posDir, posFlag);
    const pos = src && src.checks.find((c) => c.id === posId);
    ok(pos && (pos.status === 'pass'), `[coverage ${rule}] positive ${posId} passes over ${posDir}`);
    const negFx = MANIFEST.fixtures.find((x) => x.dir === negDir);
    const neg = run(negFx).json;
    const negFires = neg && (failIds(neg).includes(negOwner) || errIds(neg).includes(negOwner) || neg.status === 'malformed');
    ok(negFires, `[coverage ${rule}] negative (${negDir}) fires its owner ${negOwner}`);
    covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} ❌ behaviors have BOTH a positive and a negative`);
}

// ===========================================================================
// PART 13 — regression: the three check/lexicon defects (hyphenated @policy id;
// forbidden sub-token inside a mandated verbatim 01 event; M18 leading-word-of-a-
// multi-word-event false-positive). Each defect gets a positive (must PASS clean) and
// the partnered negative still fires.
// ===========================================================================
process.stderr.write('PART 13 — regression: hyphenated @policy + verbatim-span M17/M18 exemption\n');
{
  const regV = MANIFEST.fixtures.find((x) => x.dir === 'reg-valid');
  const rv = run(regV);
  ok(rv.json && rv.json.status === 'pass', `reg-valid ⇒ pass (got ${rv.json && rv.json.status})`);
  ok(rv.code === 0, `reg-valid exits 0 (got ${rv.code})`);
  ok(rv.json && !rv.json.checks.some((c) => c.status === 'fail'), 'reg-valid has zero failing checks');

  // DEFECT 1 — @policy:POL-1 (hyphenated) both classifies (R-TAG) and resolves (X-COV-POL).
  const rtagPOL = rv.json && rv.json.checks.find((c) => c.id === 'R-TAG');
  ok(rtagPOL && rtagPOL.status === 'pass', 'R-TAG passes over the hyphenated @policy:POL-1 (no out-of-namespace)');
  const covPolPOL = rv.json && rv.json.checks.find((c) => c.id === 'X-COV-POL');
  ok(covPolPOL && covPolPOL.status === 'pass', 'X-COV-POL passes — @policy:POL-1 resolves its 03 policy (hyphen preserved)');

  // DEFECT 2 — M17 does NOT fire on forbidden 'Section' inside the mandated event
  // 'Coupon Section Cleared'; DEFECT 3 — M18 does NOT capture 'Coupon' from that event.
  const m17V = rv.json && rv.json.checks.find((c) => c.id === 'M17');
  ok(m17V && m17V.status === 'pass', "M17 clean on reg-valid (forbidden 'Section' inside the mandated 01 event 'Coupon Section Cleared' is exempt)");
  const m18V = rv.json && rv.json.checks.find((c) => c.id === 'M18');
  ok(m18V && m18V.status === 'pass', "M18 clean on reg-valid (multi-word event 'Coupon Section Cleared' yields zero invented-entity captures)");
  ok(rv.json && !rv.json.findings.some((f) => f.id === 'M18'), 'reg-valid emits zero M18 findings (leading-word-of-multi-word-event masked)');

  // partnered negative — forbidden 'Section' in FREE PROSE still fires M17, sole owner.
  const regN = MANIFEST.fixtures.find((x) => x.dir === 'reg-forbidden-prose');
  const rn = run(regN);
  ok(rn.json && rn.json.status === 'fail', `reg-forbidden-prose ⇒ fail (got ${rn.json && rn.json.status})`);
  ok(rn.code === 1, `reg-forbidden-prose exits 1 (got ${rn.code})`);
  ok(rn.json && failIds(rn.json).includes('M17'), 'reg-forbidden-prose fires M17 (free-prose Section)');
  ok(rn.json && rn.json.findings.filter((f) => f.severity === 'error').every((f) => f.id === 'M17'), 'M17 is the SOLE error owner on reg-forbidden-prose (the exemption is span-scoped, not blanket)');
}

// ===========================================================================
process.stderr.write('\n');
if (failed === 0) { process.stderr.write(`SELFTEST PASS — ${passed} assertions, 0 failures.\n`); process.exit(0); }
else { process.stderr.write(`SELFTEST FAIL — ${failed} of ${passed + failed} assertions failed:\n`); for (const f of fails) process.stderr.write(`  - ${f}\n`); process.exit(1); }
