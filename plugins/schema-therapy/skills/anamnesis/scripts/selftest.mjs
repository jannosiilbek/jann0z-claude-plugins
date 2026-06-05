#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the anamnesis bridge oracle (simulation.md §7).
// A regression suite proving the harness catches false-greens. It demonstrates:
//   1. every manifest fixture produces the EXACT expected status + owner-check + exit;
//   2. the wrong-reason trap reports the pinned OWNER (R-ACC) AND the co-present L-CONFIRM also
//      fires — proving the owner is reported for the stated reason, not merely that some check
//      failed;
//   3. the S3 independence matrix: every one of the nine legal pairs confirms; {code,test} and
//      every same-class pair do NOT confirm (a direct unit test of lib/ledger.mjs);
//   4. the dry arithmetic: N<2 fails dry; a claim with round ∈ {N-1,N} fails dry; contiguous
//      markers from 1 pass D-SEQ, a gap/repeat/non-1-start fails;
//   5. RENDERER HONESTY: mutating a confirmed claim's statement in a SCRATCH COPY changes the
//      in-memory S6 render bytes and FLIPS R-DET against the stale on-disk file — proving the
//      renderer is the oracle, not the file;
//   6. gate-interplay: valid-multi's ordering context hands off green while the catalog context
//      fails S-UNCONF in the SAME engagement (per-context scoping);
//   7. the vacuous --no-checks run reports broken-test with zero executed checks;
//   8. byte-identical double-runs over valid-single;
//   9. the 35-row §6 coverage floor with the coverage.behaviorsWithPosAndNeg === 35 honesty
//      assertion (harness constant === table length);
//  10. seeded-engagement acceptance: the committed test-workspace engagement passes handoff,
//      is deterministic, and every seeded accident is adjudicated+absent from domain.md while
//      every seeded value is confirmed+present in domain.md.
//
// Exit 0 ONLY when every assertion passes. Zero external deps. Runtime < 5 min.

import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
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

function argsFor(fx, root = FIXTURES) {
  const a = [join(root, fx.dir), '--gate', fx.mode];
  if (fx.context) a.push('--context', fx.context);
  if (fx.args) a.push(...fx.args);
  return a;
}
function runArgs(args) {
  let stdout = '', code = 0;
  try { stdout = execFileSync('node', [HARNESS, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { stdout = e.stdout ? e.stdout.toString() : ''; code = typeof e.status === 'number' ? e.status : -1; }
  let json = null;
  try { json = JSON.parse(stdout); } catch { json = null; }
  return { stdout, code, json };
}
const run = (fx, root) => runArgs(argsFor(fx, root));
const rejectionIds = (j) => [
  ...j.checks.filter((c) => c.status === 'fail').map((c) => c.id),
  ...j.findings.map((f) => f.id),
];

// ===========================================================================
// PART 1 — Every fixture matches its manifest (status + owner + exit).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit\n');
for (const fx of MANIFEST.fixtures) {
  const { code, json } = run(fx);
  const tag = `${fx.dir}${fx.context ? '/' + fx.context : ''}${(fx.args || []).join('')}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary`);
  if (!json) continue;
  ok(json.status === fx.status, `[${tag}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${tag}] exit === ${EXIT[fx.status]} (got ${code})`);
  if (fx.owner) ok(rejectionIds(json).includes(fx.owner), `[${tag}] owner ${fx.owner} among rejections (got [${[...new Set(rejectionIds(json))].join(',')}])`);
  if (fx.owner === null && fx.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
    ok(json.counts.checks.total > 0, `[${tag}] clean pass executed ≥1 check (non-vacuous)`);
  }
  if (fx.warnOwner) ok(json.checks.some((c) => c.id === fx.warnOwner && c.status === 'warn'), `[${tag}] warn-owner ${fx.warnOwner} among warn checks (advisory, non-blocking)`);
  if (fx.bridgeDefect) {
    const bd = json.findings.find((f) => f.id === 'P-TIER');
    ok(bd && bd.class === 'bridge-defect', `[${tag}] P-TIER finding carries class:"bridge-defect"`);
    ok(json.status === 'fail', `[${tag}] bridge-defect keeps status fail (taxonomy stays four values)`);
  }
  if (fx.vacuous) ok(json.counts.checks.total === 0, `[${tag}] vacuous run executed zero checks`);
}

// ===========================================================================
// PART 2 — Wrong-reason trap: OWNER is R-ACC, co-present L-CONFIRM ALSO fires.
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports R-ACC (and L-CONFIRM also fires)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = run(trap);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const ids = rejectionIds(json);
  ok(ids.includes(trap.trapOwner), `trap reports the OWNER ${trap.trapOwner}`);
  ok(ids.includes(trap.trapNotOwner), `trap ALSO detects the co-present ${trap.trapNotOwner} (both fire — owner reported for its stated reason)`);
  ok(trap.owner === 'R-ACC', 'manifest pins trap owner to R-ACC (not L-CONFIRM)');
}

// ===========================================================================
// PART 3 — S3 independence-matrix unit (lib/ledger.mjs).
// ===========================================================================
process.stderr.write('PART 3 — S3 matrix: 9 legal pairs confirm; {code,test} + same-class do not\n');
{
  const L = await import('./lib/ledger.mjs');
  const LEGAL = [['code', 'doc'], ['code', 'data'], ['code', 'probe'], ['test', 'doc'], ['test', 'data'], ['test', 'probe'], ['doc', 'data'], ['doc', 'probe'], ['data', 'probe']];
  for (const [a, b] of LEGAL) {
    ok(L.pairConfirms(a, b) === true, `legal pair {${a},${b}} confirms`);
    ok(L.hasLegalPair([a, b]) === true, `hasLegalPair([${a},${b}]) === true`);
  }
  ok(L.pairConfirms('code', 'test') === false, '{code,test} does NOT confirm (same channel)');
  ok(L.hasLegalPair(['code', 'test']) === false, 'hasLegalPair([code,test]) === false');
  for (const c of ['code', 'test', 'doc', 'data', 'probe']) {
    ok(L.pairConfirms(c, c) === false, `same-class {${c},${c}} does NOT confirm`);
    ok(L.hasLegalPair([c, c]) === false, `hasLegalPair([${c},${c}]) === false (single channel)`);
  }
  ok(L.hasLegalPair(['code']) === false, 'a single class is never a legal pair');
  ok(L.hasLegalPair(['code', 'test', 'doc']) === true, 'a set containing a legal pair confirms even with code+test present');
}

// ===========================================================================
// PART 4 — Dry arithmetic unit (lib/journal.mjs): D-DRY / D-SEQ over synthetic journals.
// ===========================================================================
process.stderr.write('PART 4 — dry arithmetic: D-SEQ + D-DRY over synthetic journals\n');
{
  const J = await import('./lib/journal.mjs');
  const mk = (rounds) => ({ rounds, probes: [], maxRound: rounds.length ? Math.max(...rounds) : 0, parseError: null });
  // D-SEQ
  ok(J.dSeq(mk([1, 2, 3, 4])).status === 'pass', 'D-SEQ: contiguous 1..4 passes');
  ok(J.dSeq(mk([1, 3])).status === 'fail', 'D-SEQ: a gap (1,3) fails');
  ok(J.dSeq(mk([1, 1, 2])).status === 'fail', 'D-SEQ: a repeat (1,1,2) fails');
  ok(J.dSeq(mk([2, 3])).status === 'fail', 'D-SEQ: a non-1 start (2,3) fails');
  ok(J.dSeq(mk([])).status === 'fail', 'D-SEQ: no markers fails');
  // D-DRY
  const claim = (round) => ({ id: 'CLM-0001', round });
  ok(J.dDry([claim(1)], mk([1])).status === 'fail', 'D-DRY: N=1 (< 2) fails dry');
  ok(J.dDry([claim(4)], mk([1, 2, 3, 4])).status === 'fail', 'D-DRY: a claim at round N fails dry');
  ok(J.dDry([claim(3)], mk([1, 2, 3, 4])).status === 'fail', 'D-DRY: a claim at round N-1 fails dry');
  ok(J.dDry([claim(2)], mk([1, 2, 3, 4])).status === 'pass', 'D-DRY: last-two-rounds-quiet passes dry');
}

// ===========================================================================
// PART 5 — RENDERER HONESTY: mutating a confirmed claim's statement in a SCRATCH COPY changes
// the in-memory S6 render bytes and FLIPS R-DET against the stale on-disk file.
// ===========================================================================
process.stderr.write('PART 5 — renderer honesty (mutation changes the re-render, flips R-DET)\n');
{
  const tmp = mkdtempSync(join(tmpdir(), 'anamnesis-render-'));
  cpSync(FIXTURES, tmp, { recursive: true });
  const base = run({ dir: 'valid-single', mode: 'handoff' }, tmp);
  ok(base.json.status === 'pass', `scratch baseline valid-single handoff passes (got ${base.json.status})`);
  const rDetBase = base.json.checks.find((c) => c.id === 'R-DET');
  ok(rDetBase && rDetBase.status === 'pass', 'scratch baseline R-DET passes (file === re-render)');

  // mutate a confirmed claim's STATEMENT in the scratch ledger; do NOT re-render the file.
  const ledgerPath = join(tmp, 'valid-single', 'anamnesis', 'ledger.jsonl');
  const before = readFileSync(ledgerPath, 'utf8');
  const after = before.replace('A support agent resolves order issues raised by customers', 'A support agent resolves order disputes raised by customers');
  ok(after !== before, 'PART 5 statement mutation actually changed the scratch ledger (not a dead no-op .replace)');
  writeFileSync(ledgerPath, after);
  const mutated = run({ dir: 'valid-single', mode: 'handoff' }, tmp);
  const rDetMut = mutated.json.checks.find((c) => c.id === 'R-DET');
  ok(rDetMut && rDetMut.status === 'fail', 'mutating a confirmed statement FLIPS R-DET to fail (the in-memory re-render now differs from the stale on-disk file)');
  ok(mutated.json.status === 'fail', 'the mutated engagement fails handoff (R-DET is the oracle, not the file)');
  rmSync(tmp, { recursive: true, force: true });
}

// ===========================================================================
// PART 6 — GATE-INTERPLAY: valid-multi ordering green, catalog fails S-UNCONF (same engagement).
// ===========================================================================
process.stderr.write('PART 6 — gate-interplay (per-context scoping in one engagement)\n');
{
  const ordering = run({ dir: 'valid-multi', mode: 'handoff', context: 'ordering' });
  const catalog = run({ dir: 'valid-multi', mode: 'handoff', context: 'catalog' });
  ok(ordering.json.status === 'pass', `valid-multi ordering hands off green (got ${ordering.json.status})`);
  ok(catalog.json.status === 'fail' && rejectionIds(catalog.json).includes('S-UNCONF'), `valid-multi catalog fails S-UNCONF in the SAME engagement (got ${catalog.json.status})`);
  ok(ordering.json.context === 'ordering' && catalog.json.context === 'catalog', 'each run records its scoped context');
}

// ===========================================================================
// PART 7 — Vacuous guard.
// ===========================================================================
process.stderr.write('PART 7 — vacuous --no-checks guard\n');
{
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = run(vac);
  ok(r.json.status === 'broken-test' && r.json.counts.checks.total === 0 && r.code === 3, '--no-checks ⇒ broken-test, zero executed checks, exit 3');
}

// ===========================================================================
// PART 8 — Determinism: byte-identical double-run over valid-single.
// ===========================================================================
process.stderr.write('PART 8 — byte-identical double-run\n');
{
  const a1 = runArgs([join(FIXTURES, 'valid-single'), '--gate', 'handoff']).stdout;
  const a2 = runArgs([join(FIXTURES, 'valid-single'), '--gate', 'handoff']).stdout;
  ok(a1 === a2 && a1.length > 0, 'valid-single handoff double-run is byte-identical');
  const d1 = runArgs([join(FIXTURES, 'valid-single'), '--gate', 'dry']).stdout;
  const d2 = runArgs([join(FIXTURES, 'valid-single'), '--gate', 'dry']).stdout;
  ok(d1 === d2 && d1.length > 0, 'valid-single dry double-run is byte-identical');
}

// ===========================================================================
// PART 9 — COVERAGE floor: 35 ❌ rules, pos + neg, distinct-rule count + harness-constant honesty.
// ===========================================================================
process.stderr.write('PART 9 — coverage floor: 35 ❌ rules, pos + neg, distinct-rule count\n');
{
  const cov = MANIFEST.coverage.rules;
  const distinctRules = new Set(cov.map((r) => r.rule));
  ok(distinctRules.size === 35, `coverage table covers exactly 35 distinct ❌ rules (got ${distinctRules.size})`);

  // COVERAGE HONESTY: the harness's emitted behaviorsWithPosAndNeg must equal the table length.
  const covPass = run({ dir: 'valid-single', mode: 'handoff' }).json;
  ok(covPass.coverage.behaviorsWithPosAndNeg === cov.length, `harness behaviorsWithPosAndNeg (${covPass.coverage.behaviorsWithPosAndNeg}) === coverage-table length (${cov.length})`);

  // positive: every owner check appears as a PASS over a valid engagement. valid-single handoff
  // exercises G0/G1/G2/G5/G4; valid-single dry exercises G3 (D-SEQ/D-DRY); valid-multi ordering
  // exercises the multi-context S5 arms.
  const posSingle = run({ dir: 'valid-single', mode: 'handoff' }).json;
  const posDry = run({ dir: 'valid-single', mode: 'dry' }).json;
  const posMulti = run({ dir: 'valid-multi', mode: 'handoff', context: 'ordering' }).json;
  const passedIds = new Set([
    ...posSingle.checks.filter((c) => c.status === 'pass').map((c) => c.id),
    ...posDry.checks.filter((c) => c.status === 'pass').map((c) => c.id),
    ...posMulti.checks.filter((c) => c.status === 'pass').map((c) => c.id),
  ]);
  for (const r of cov) ok(passedIds.has(r.owner), `[${r.rule}] positive: owner ${r.owner} passes over a valid engagement`);

  // negative: the named fixture fails (or is malformed) with the owner among its rejections.
  for (const r of cov) {
    const fx = MANIFEST.fixtures.find((f) => f.dir === r.neg && !f.brokenTest && !f.vacuous && f.owner === r.owner);
    ok(!!fx, `[${r.rule}] negative fixture '${r.neg}' (owner ${r.owner}) is in the manifest`);
    if (!fx) continue;
    const j = run(fx).json;
    ok(rejectionIds(j).includes(r.owner), `[${r.rule}] negative '${r.neg}' fires owner ${r.owner}`);
  }
}

// ===========================================================================
// PART 10 — Seeded-engagement acceptance: the committed test-workspace engagement is
// regression-locked against seeded.json.
// ===========================================================================
process.stderr.write('PART 10 — seeded-engagement acceptance (test-workspace regression lock)\n');
{
  const TW = join(__dirname, '..', 'test-workspace');

  // 10.1 — harness on TW with --gate handoff → pass, exit 0, zero unconfirmed, zero locked,
  //         exactly one render entry for domain.md.
  const r1 = runArgs([TW, '--gate', 'handoff']);
  ok(r1.json !== null, 'TW handoff emits parseable JSON');
  ok(r1.json !== null && r1.json.status === 'pass', `TW handoff status === pass (got ${r1.json && r1.json.status})`);
  ok(r1.code === 0, `TW handoff exit === 0 (got ${r1.code})`);
  ok(r1.json !== null && r1.json.counts.claims.unconfirmed === 0, `TW handoff counts.claims.unconfirmed === 0 (got ${r1.json && r1.json.counts.claims.unconfirmed})`);
  ok(r1.json !== null && r1.json.counts.claims.locked === 0, `TW handoff counts.claims.locked === 0 (got ${r1.json && r1.json.counts.claims.locked})`);
  const renders1 = r1.json && r1.json.renders;
  ok(Array.isArray(renders1) && renders1.length === 1 && renders1[0].file === 'domain.md',
    `TW handoff has exactly one render entry for domain.md (got ${Array.isArray(renders1) ? renders1.map((r) => r.file).join(',') : 'none'})`);

  // 10.2 — second run is byte-identical (determinism over the real engagement).
  const r2 = runArgs([TW, '--gate', 'handoff']);
  ok(r1.stdout === r2.stdout && r1.stdout.length > 0, 'TW handoff double-run is byte-identical');

  // 10.3 — load seeded.json, domain.md, and parse ledger.jsonl.
  const seeded = JSON.parse(readFileSync(join(TW, 'seeded.json'), 'utf8'));
  const domainMd = readFileSync(join(TW, 'domain.md'), 'utf8');
  const ledgerLines = readFileSync(join(TW, 'anamnesis', 'ledger.jsonl'), 'utf8')
    .split('\n').filter((l) => l.trim().length > 0);
  const ledger = ledgerLines.map((l) => JSON.parse(l));

  // 10.4 — vacuous-key guard: accidents.length >= 4 and values.length >= 4.
  ok(seeded.accidents.length >= 4, `seeded.json accidents.length >= 4 (got ${seeded.accidents.length})`);
  ok(seeded.values.length >= 4, `seeded.json values.length >= 4 (got ${seeded.values.length})`);

  // 10.5 — every accidents[] entry: ≥1 ledger claim with status === 'accident' whose statement
  //         contains match (case-insensitive) AND a verdict object present; match must NOT appear
  //         in domain.md (case-insensitive).
  for (const acc of seeded.accidents) {
    const matchLower = acc.match.toLowerCase();
    const adjudicated = ledger.filter(
      (c) => c.status === 'accident' &&
             typeof c.statement === 'string' &&
             c.statement.toLowerCase().includes(matchLower) &&
             c.verdict !== null && typeof c.verdict === 'object'
    );
    ok(adjudicated.length >= 1,
      `[${acc.id}] seeded accident adjudicated + never rendered — ≥1 ledger claim (status:accident, statement contains "${acc.match}", verdict present) (got ${adjudicated.length})`);
    ok(!domainMd.toLowerCase().includes(matchLower),
      `[${acc.id}] seeded accident "${acc.match}" is absent from domain.md`);
  }

  // 10.6 — every values[] entry: ≥1 ledger claim with status === 'confirmed' whose statement
  //         contains match (case-insensitive); match DOES appear in domain.md (case-insensitive).
  for (const val of seeded.values) {
    const matchLower = val.match.toLowerCase();
    const confirmed = ledger.filter(
      (c) => c.status === 'confirmed' &&
             typeof c.statement === 'string' &&
             c.statement.toLowerCase().includes(matchLower)
    );
    ok(confirmed.length >= 1,
      `[${val.id}] seeded value confirmed + rendered — ≥1 ledger claim (status:confirmed, statement contains "${val.match}") (got ${confirmed.length})`);
    ok(domainMd.toLowerCase().includes(matchLower),
      `[${val.id}] seeded value "${val.match}" is present in domain.md`);
  }
}

// ===========================================================================
process.stderr.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) { process.stderr.write('SELFTEST FAILED:\n' + fails.map((f) => '  - ' + f).join('\n') + '\n'); process.exit(1); }
process.stderr.write('SELFTEST PASSED — every fixture status+owner+exit asserted; wrong-reason isolated (R-ACC owner + L-CONFIRM co-fires); S3 matrix + dry arithmetic unit-proven; renderer honesty proven (R-DET re-renders, never trusts the file); gate-interplay per-context; vacuous guarded; byte-identical double-run; 35 ❌ rules pos+neg with the harness coverage constant honesty-checked; seeded-engagement acceptance (test-workspace regression-locked against seeded.json).\n');
process.exit(0);
