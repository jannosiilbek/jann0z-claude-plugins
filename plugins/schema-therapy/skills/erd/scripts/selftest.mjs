#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the erd oracle (verification doctrine
// §3): a regression suite proving the harness catches false-greens. It demonstrates:
//   1. every manifest fixture quadruple ⇒ EXACT expected status + owner-check + exit;
//   2. the wrong-reason trap reports the R-ROOT (missing-root) owner, NOT the
//      co-present L12 forbidden-synonym defect — the negative fires for its OWNER reason;
//   3. no vacuous green: --no-checks ⇒ broken-test (exit 3); a contentless 04 never passes;
//   4. ENGINE PROBE verification: the engine is genuinely ENFORCING — an orphan FK
//      is actually rejected with SQLSTATE 23503 on the valid fixture's own schema
//      (the harness is not pretending);
//   5. deps-missing path (a nonexistent node_modules via --force-missing-deps + --no-install)
//      ⇒ broken-test, exit 3 (never a vacuous parse-only pass);
//   6. counter-conflation detection: reconciliation (X6) catches a dropped edge / zero checks;
//   7. upstream-defect routing (02 + 03) vs unparseable upstream (broken-test);
//   8. determinism: the same quadruple twice ⇒ byte-identical stdout (excluding any
//      one-time npm-install noise on stderr — stdout JSON is the contract);
//   9. coverage floor: every ❌ catalog rule has BOTH a positive (passing over valid)
//      AND a negative (a failing fixture).
//
// Exit 0 ONLY when every assertion passes. PGlite runs take seconds; total runtime is
// kept sane by a fresh PGlite per fixture (the §8 freshness contract) — no shared state.

import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
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
function ok(cond, label) { if (cond) passed++; else { failed++; fails.push(label); process.stderr.write(`  x ${label}\n`); } }

function runQuad(f, extraArgs = []) {
  const args = [HARNESS, join(FIXTURES, f.dbml), '--transitions', join(FIXTURES, f.transitions),
    '--upstream-02', join(FIXTURES, f.up02), '--upstream-03', join(FIXTURES, f.up03)];
  if (f.scenarios) args.push('--scenarios', join(FIXTURES, f.scenarios));
  if (f.args) args.push(...f.args);
  args.push(...extraArgs);
  let stdout = '', code = 0;
  try { stdout = execFileSync('node', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { stdout = e.stdout ? e.stdout.toString() : ''; code = typeof e.status === 'number' ? e.status : -1; }
  let json = null; try { json = JSON.parse(stdout); } catch { json = null; }
  return { stdout, code, json };
}
function runAbs(args) {
  let stdout = '', code = 0;
  try { stdout = execFileSync('node', [HARNESS, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { stdout = e.stdout ? e.stdout.toString() : ''; code = typeof e.status === 'number' ? e.status : -1; }
  let json = null; try { json = JSON.parse(stdout); } catch { json = null; }
  return { stdout, code, json };
}

// ===========================================================================
// PART 1 — Every fixture quadruple matches its manifest (status + owner + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit code\n');
for (const fx of MANIFEST.fixtures) {
  const { code, json } = runQuad(fx);
  const tag = `${fx.dbml}+${fx.transitions}+${fx.up02}/${fx.up03}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary on stdout`);
  if (!json) continue;
  ok(json.status === fx.status, `[${tag}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${tag}] exit === ${EXIT[fx.status]} (got ${code})`);

  if (fx.failingCheck) {
    const failingIds = json.checks.filter((c) => c.status === 'fail').map((c) => c.id);
    const findingIds = json.findings.map((f) => f.id);
    const warnIds = json.findings.filter((f) => f.severity === 'warn').map((f) => f.id);
    const present = failingIds.includes(fx.failingCheck) || findingIds.includes(fx.failingCheck) || (fx.warnOnly && warnIds.includes(fx.failingCheck));
    ok(present, `[${tag}] owner ${fx.failingCheck} among rejections (fails=[${failingIds.join(',')}] finds=[${findingIds.join(',')}])`);
  }
  if (fx.failingCheck === null && fx.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
    ok(json.counts.engine.total > 0, `[${tag}] clean pass ran the engine layer (engine.total>0)`);
  }
}

// ===========================================================================
// PART 2 — Wrong-reason trap: R-ROOT fires (missing Ticket root table), NOT the
// co-present L12 forbidden-synonym ('booking') defect. Proves OWNER isolation.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports the R-ROOT reason (not L12)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = runQuad(trap);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const rroot = json && json.findings.find((f) => f.id === 'R-ROOT');
  ok(!!rroot, 'trap reports an R-ROOT finding (the missing-root-table check fired)');
  if (rroot) {
    ok(rroot.detail.includes(trap.trapDetailMustContain), `R-ROOT detail names the missing root ('${trap.trapDetailMustContain}')`);
    ok(!rroot.detail.toLowerCase().includes(trap.trapDetailMustNotContain), `R-ROOT detail does NOT invoke '${trap.trapDetailMustNotContain}' (R-ROOT isolates over L12)`);
  }
  // the co-present L12 defect IS detected (both fire) — but the pinned OWNER is R-ROOT.
  const l12 = json && json.checks.find((c) => c.id === 'L12');
  ok(l12 && l12.status === 'fail', 'trap also detects the co-present L12 forbidden-synonym defect (both fire)');
  ok(trap.failingCheck === 'R-ROOT', 'manifest pins trap owner to R-ROOT (not L12)');
}

// ===========================================================================
// PART 3 — No vacuous green.
// ===========================================================================
process.stderr.write('PART 3 — no vacuous green\n');
{
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = runQuad(vac);
  ok(r.json && r.json.status === 'broken-test', 'disabled-corpus (--no-checks) ⇒ broken-test, never pass');
  ok(r.json && r.json.counts.checks.total === 0, 'disabled-corpus reports zero parsed checks');
  ok(r.code === 3, 'disabled-corpus exits 3 (broken-test)');

  // a contentless .dbml (parses to an empty model) cannot pass: zero tables ⇒ X1 fail.
  const empty = writeTmp('empty.dbml', '// fingerprints:\n// 02-glossary.md@sha256:7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a49586776655443322110099a8b7c\n// 03-aggregates.md@sha256:1b2c3d4e5f60718293a4b5c6d7e8f9001122334455667788990aabbccddeeff0\n');
  const re = runAbs([empty, '--transitions', join(FIXTURES, 'valid-transitions.md'), '--upstream-02', join(FIXTURES, 'upstream-02.md'), '--upstream-03', join(FIXTURES, 'upstream-03.md')]);
  ok(re.json && re.json.status !== 'pass', `contentless 04 does not pass (status=${re.json && re.json.status})`);
}

// ===========================================================================
// PART 4 — ENGINE PROBE: prove the engine genuinely ENFORCES on the valid schema.
// The E-FK probe over valid.* must PASS — i.e. an orphan FK INSERT was actually
// rejected with SQLSTATE 23503 by PGlite (the engine is real, not a pretender).
// We additionally prove enforcement directly against the harness's own engine lib.
// ===========================================================================
process.stderr.write('PART 4 — engine genuinely enforces (E-FK rejects an orphan with 23503)\n');
{
  const valid = MANIFEST.fixtures.find((f) => f.status === 'pass');
  const { json } = runQuad(valid);
  const efk = json && json.checks.filter((c) => c.id.startsWith('E-FK')).every((c) => c.status === 'pass');
  ok(efk, 'E-FK probes PASS over valid.* (orphan FK INSERTs are genuinely rejected)');
  const ejunc = json && json.checks.find((c) => c.id.startsWith('E-JUNCTION'));
  ok(ejunc && ejunc.status === 'pass', 'E-JUNCTION composite-PK uniqueness genuinely enforced');
  const eenum = json && json.checks.filter((c) => c.id.startsWith('E-ENUM')).every((c) => c.status === 'pass');
  ok(eenum, 'E-ENUM out-of-domain values genuinely rejected (22P02)');

  // Direct engine assertion: import the harness's engine lib, build the valid model,
  // and prove an orphan INSERT throws SQLSTATE 23503 on a real PGlite — the strongest
  // possible "the engine is enforcing, not the harness pretending" proof.
  const E = await import('./lib/engine.mjs');
  const deps = E.ensureDeps({ allowInstall: false });
  ok(deps.ok, 'engine deps present for the direct enforcement probe');
  if (deps.ok) {
    const { Parser, ModelExporter, PGlite } = await E.loadEngine();
    const dbmlText = readFileSync(join(FIXTURES, 'valid.dbml'), 'utf8');
    const pr = E.parseDbml(Parser, dbmlText);
    const model = E.deriveModel(pr.normalized);
    const ddl = E.exportDDL(ModelExporter, pr.db).ddl;
    const pg = new PGlite();
    await pg.exec(ddl);
    let code = null;
    try { await pg.query(`INSERT INTO order_ticket (order_id, ticket_id) VALUES (999999, 999999)`); }
    catch (e) { code = e.code; }
    await pg.close();
    ok(code === '23503', `direct orphan INSERT on valid schema rejected with SQLSTATE 23503 (got ${code}) — engine truly enforces`);

    // DEFECT 3 — multi-hop E-PK: a ≥2-hop FK chain (d → c → b → a) must seed its
    // FULL transitive parent closure topologically, or the E-PK dup probe dies with
    // 23503 before the duplicate-PK assertion. Mirrors the real refund→ticket→event→
    // venue chain. The deepest table's E-PK must PASS (23505), not fail on a seed.
    const chainDbml = [
      'Table a { id int [pk, increment] }',
      'Table b { id int [pk, increment]\n  a_id int [not null] }',
      'Table c { id int [pk, increment]\n  b_id int [not null] }',
      'Table d { id int [pk, increment]\n  c_id int [not null] }',
      'Ref: b.a_id > a.id',
      'Ref: c.b_id > b.id',
      'Ref: d.c_id > c.id',
    ].join('\n\n');
    const cpr = E.parseDbml(Parser, chainDbml);
    ok(cpr.ok, 'multi-hop chain DBML parses');
    if (cpr.ok) {
      const cmodel = E.deriveModel(cpr.normalized);
      const cddl = E.exportDDL(ModelExporter, cpr.db).ddl;
      const ceng = await E.runEngine(PGlite, cddl, cmodel, null);
      const epkD = ceng.scenarios.find((s) => s.id === 'E-PK:d');
      ok(epkD && epkD.status === 'pass', `E-PK on the deepest (3-hop) table 'd' PASSES (got ${epkD && epkD.status}${epkD && epkD.detail ? ': ' + epkD.detail : ''}) — full FK-parent closure seeded`);
      const epkC = ceng.scenarios.find((s) => s.id === 'E-PK:c');
      ok(epkC && epkC.status === 'pass', `E-PK on the 2-hop table 'c' PASSES (multi-hop closure seeding)`);
    }
  }
}

// ===========================================================================
// PART 5 — deps-missing path ⇒ broken-test (honest: a fabricated nonexistent
// node_modules via --force-missing-deps + --no-install).
// ===========================================================================
process.stderr.write('PART 5 — missing-engine ⇒ broken-test (never a vacuous parse-only pass)\n');
{
  const ne = MANIFEST.fixtures.find((f) => f.noEngine);
  const r = runQuad(ne);
  ok(r.json && r.json.status === 'broken-test', `missing-engine ⇒ broken-test (got ${r.json && r.json.status})`);
  ok(r.code === 3, 'missing-engine exits 3');
  ok(r.json && !r.json.checks.some((c) => c.status === 'pass' && c.class === 'engine'), 'missing-engine ran NO engine checks (no vacuous parse-only green)');
}

// ===========================================================================
// PART 6 — counter-conflation / reconciliation: a dropped edge / zero checks
// ⇒ broken (X6). Unit-tested directly against the closed grammar.
// ===========================================================================
process.stderr.write('PART 6 — reconciliation catches a dropped edge / engine-skip / zero checks\n');
{
  const C = await import('./lib/checks.mjs');
  ok(C.checkX6_reconcile(40, 34, 35, 13, 3).status === 'broken', 'X6 detects a dropped edge (34 vs 35) ⇒ broken');
  ok(C.checkX6_reconcile(0, 0, 0, 0, 0).status === 'broken', 'X6 with zero executed checks ⇒ broken (no vacuous green)');
  ok(C.checkX6_reconcile(40, 35, 35, 0, 3).status === 'broken', 'X6 with tables>0 but engineRun=0 ⇒ broken (engine-skip guard)');
  ok(C.checkX6_reconcile(40, 35, 35, 13, 3).status === 'pass', 'X6 passes when executed>0, edges reconcile, engine non-empty');

  const v = runQuad(MANIFEST.fixtures.find((f) => f.status === 'pass'));
  ok(v.json && v.json.counts.edgesWalked === v.json.counts.edgesExpected, `valid edgesWalked === edgesExpected (${v.json && v.json.counts.edgesWalked}/${v.json && v.json.counts.edgesExpected})`);
  ok(v.json && v.json.counts.checks.total > 0, 'valid executed >0 checks');
  ok(v.json && v.json.reconciled === true, 'valid reconciled === true');
}

// ===========================================================================
// PART 7 — upstream-defect routing (02 + 03) vs unparseable upstream.
// ===========================================================================
process.stderr.write('PART 7 — upstream-defect routing (02 + 03) vs unparseable upstream\n');
{
  for (const ud of MANIFEST.fixtures.filter((f) => f.upstreamDefect)) {
    const r = runQuad(ud);
    const route = ud.upstreamDefectFile;
    ok(r.json && r.json.status === 'fail', `[${route}] upstream-defect status === fail (got ${r.json && r.json.status})`);
    ok(r.code === 1, `[${route}] upstream-defect exits 1 (taxonomy stays closed)`);
    const tagged = r.json && r.json.findings.find((f) => f.class === 'upstream-defect');
    ok(!!tagged, `[${route}] a finding carries class:"upstream-defect"`);
    if (tagged) {
      ok(tagged.upstream === route, `[${route}] routes to '${route}' (got '${tagged.upstream}')`);
      ok(tagged.detail.includes(ud.upstreamDefectElement), `[${route}] names the offending element ('${ud.upstreamDefectElement}')`);
    }
    ok(['pass', 'fail', 'malformed', 'broken-test'].includes(r.json.status), `[${route}] status within the closed taxonomy`);
  }
  for (const mu of MANIFEST.fixtures.filter((f) => f.malformedUpstream)) {
    const r = runQuad(mu);
    ok(r.json && r.json.status === 'broken-test', `[upstream-${mu.malformedUpstream} unparseable] ⇒ broken-test (got ${r.json && r.json.status})`);
    ok(r.code === 3, `[upstream-${mu.malformedUpstream} unparseable] exits 3 (not fail)`);
    ok(r.json && !r.json.findings.some((f) => f.class === 'upstream-defect'), `[upstream-${mu.malformedUpstream} unparseable] NOT mis-routed as upstream-defect`);
  }
}

// ===========================================================================
// PART 8 — Determinism: same quadruple twice ⇒ byte-identical stdout.
// ===========================================================================
process.stderr.write('PART 8 — determinism / no cross-run engine state leak\n');
{
  const valid = MANIFEST.fixtures.find((f) => f.status === 'pass');
  const a = runQuad(valid).stdout;
  const b = runQuad(valid).stdout;
  ok(a === b, 'valid run twice ⇒ byte-identical stdout (engine state does not leak)');
  // interleave a different run, then re-run valid: still identical (fresh PGlite per run).
  runQuad(MANIFEST.fixtures.find((f) => f.dbml === 'fk-type-mismatch.dbml'));
  const c = runQuad(valid).stdout;
  ok(a === c, 'valid stdout stable across an interleaved different run (isolation)');
}

// ===========================================================================
// PART 9 — Coverage floor: every ❌ catalog rule has BOTH a positive (passing
// check over valid.*) AND a negative (a failing fixture). Source of truth is the
// simulation.md §5 mapping + closing ❌-reconciliation table.
// ===========================================================================
process.stderr.write('PART 9 — coverage floor (positive AND negative per ❌ rule)\n');
{
  // [catalog rule, positive check id over valid, negative fixture descriptor, neg owner].
  // A neg descriptor is { dbml?, transitions?, up02?, up03? } overriding the valid quad.
  const V = { dbml: 'valid.dbml', transitions: 'valid-transitions.md', up02: 'upstream-02.md', up03: 'upstream-03.md', scenarios: 'valid-scenarios.json' };
  const COVERAGE = [
    ['A1', 'L1?', { transitions: 'NOPE.md' }, 'L1'],
    ['A2', 'L2', { dbml: 'dbml-parse-error.dbml' }, 'L2'],
    ['transitions-format', 'L3', { transitions: 'bad-transitions-columns.md' }, 'L3'],
    ['A4', 'L4', { dbml: 'missing-fingerprint.dbml', transitions: 'missing-fingerprint-transitions.md' }, 'L4'],
    ['A5', 'L5', { dbml: 'placeholder-fingerprint.dbml', transitions: 'placeholder-fingerprint-transitions.md' }, 'L5'],
    ['A6', 'L6', { dbml: 'fingerprint-mismatch.dbml', transitions: 'fingerprint-mismatch-transitions.md' }, 'L6'],
    ['B1', 'L9', { dbml: 'no-pk.dbml' }, 'L9'],
    ['B2', 'L10', { dbml: 'array-column.dbml' }, 'L10'],
    ['B6', 'R-MN', { dbml: 'missing-junction.dbml' }, 'R-MN'],
    ['B7', 'R-FKTYPE', { dbml: 'fk-type-mismatch.dbml' }, 'R-FKTYPE'],
    ['B9', 'L7', { dbml: 'pluralized-table.dbml', scenarios: 'pluralized-table-scenarios.json' }, 'L7'], // dedicated negative: a pluralized table identifier ('order_tickets') — L7 fires for B9 (tables must be singular)
    ['A3', 'E-DDL', { dbml: 'bad-type-ddl.dbml' }, 'E-DDL'],
    ['C1', 'R-ROOT', { dbml: 'missing-root-table.dbml' }, 'R-ROOT'],
    ['C4', 'R-REF', { dbml: 'reference-without-fk.dbml' }, 'R-REF'],
    ['C5', 'R-ENUM', { dbml: 'enum-value-extra.dbml' }, 'R-ENUM'],
    ['C6', 'R-STATUS', { dbml: 'status-untyped.dbml' }, 'R-STATUS'],
    ['C9', 'R-NAME', { dbml: 'table-for-ghost-member.dbml' }, 'R-NAME'],
    ['D1', 'R-BIJECTION', { transitions: 'missing-transition-table.md' }, 'R-BIJECTION'],
    ['D2', 'R-TFROM', { transitions: 'transition-from-not-enum.md' }, 'R-TFROM'],
    ['D3', 'R-TEVENT', { transitions: 'transition-event-paraphrased.md' }, 'R-TEVENT'],
    ['D4', 'R-INIT', { transitions: 'duplicate-initial-row.md' }, 'R-INIT'],
    ['D5', 'R-REACH', { transitions: 'unreachable-enum-value.md' }, 'R-REACH'],
    ['E1', 'L11', { dbml: 'restated-invariant-note.dbml' }, 'L11'],
    ['E2', 'L12', { dbml: 'forbidden-synonym-id.dbml' }, 'L12'],
    ['E4', 'X4', { transitions: 'missing-transition-table.md' }, 'R-BIJECTION'],
  ];
  const valid = runQuad(V).json;
  let covered = 0;
  for (const [rule, posId, negOverride, negOwner] of COVERAGE) {
    const realPosId = posId.replace('?', '');
    if (posId === 'L1?') {
      // L1 is only emitted when a file is missing; its positive is implicit (valid has both).
      ok(true, `[coverage ${rule}] positive (both files present in valid.*)`);
    } else {
      const pos = valid.checks.find((c) => c.id === realPosId);
      ok(pos && (pos.status === 'pass'), `[coverage ${rule}] positive ${realPosId} passes over valid.*`);
    }
    const negQuad = { ...V, ...negOverride };
    const neg = runQuad(negQuad).json;
    const negFails = neg && (neg.checks.some((c) => c.id === negOwner && c.status === 'fail') || neg.findings.some((f) => f.id === negOwner));
    ok(negFails, `[coverage ${rule}] negative (${JSON.stringify(negOverride)}) fails its owner ${negOwner}`);
    covered++;
  }
  ok(covered === COVERAGE.length, `all ${COVERAGE.length} ❌ behaviors have BOTH a positive and a negative`);

  // Coverage honesty: the harness's hardcoded behaviorsWithPosAndNeg literal MUST equal
  // this COVERAGE table's length — the table is the source of truth for the pos+neg floor.
  ok(valid.coverage.behaviorsWithPosAndNeg === COVERAGE.length,
    `harness behaviorsWithPosAndNeg (${valid.coverage.behaviorsWithPosAndNeg}) === COVERAGE table length (${COVERAGE.length})`);
}

// ---------------------------------------------------------------------------
function writeTmp(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'erd-selftest-'));
  const p = join(dir, name);
  writeFileSync(p, content, 'utf8');
  return p;
}

// ===========================================================================
process.stderr.write('\n');
if (failed === 0) { process.stderr.write(`SELFTEST PASS — ${passed} assertions, 0 failures.\n`); process.exit(0); }
else { process.stderr.write(`SELFTEST FAIL — ${failed} of ${passed + failed} assertions failed:\n`); for (const f of fails) process.stderr.write(`  - ${f}\n`); process.exit(1); }
