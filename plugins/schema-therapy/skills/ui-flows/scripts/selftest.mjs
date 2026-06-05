#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL self-test for the ui-flows (09) oracle (verification
// doctrine §3): a regression suite proving the harness catches false-greens. It demonstrates:
//   1. every manifest fixture produces the EXACT expected status + owner-check + exit + the
//      05-present/absent authority record;
//   2. the wrong-reason trap reports the W-BLOAT (walker) owner, NOT merely the co-present
//      M-BIND — the negative reports its OWNER reason, both defects detected;
//   3. over-budget proves W-COST is WARN-ONLY (the gate passes) yet still reports BOTH the
//      computed AND the declared value + the path; flow-bloat proves W-BLOAT blocks;
//   4. WALKER HONESTY: mutating a NavigationFlow or a klm in a scratch copy CHANGES the
//      computed cost — a dedicated assertion over an inline temp variant (the walker re-walks,
//      it does not trust a declared number);
//   5. AUTHORITY SWITCH proven: the SAME 09 is judged differently with vs without
//      --upstream-05 where an event exists only in the 05 graph (the beyond-04 transition);
//   6. N-05ABSENT fires (a 05-fingerprinting model run without --upstream-05 ⇒ fail);
//   7. budget-broken-08 ⇒ upstream-defect naming the 08 file (exit 1, status fail);
//   8. malformed upstreams ⇒ broken-test (exit 3), NOT mis-routed as upstream-defect;
//   9. vacuous ⇒ exit 3, zero parsed checks;
//   10. counter conflation: class counters sum to total; edge reconciliation holds;
//   11. determinism: the same run twice ⇒ byte-identical stdout;
//   12. the COVERAGE floor: ALL 22 ❌ rules have BOTH a positive (over valid-09) AND a
//       negative (a failing fixture) — a DISTINCT-RULE count check over the §5 table.
//
// Exit 0 ONLY when every assertion passes. Zero external deps. Keep < 5 min.

import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(__dirname, 'harness.mjs');
const FIXTURES = join(__dirname, 'fixtures');
const MANIFEST = JSON.parse(readFileSync(join(FIXTURES, 'manifest.json'), 'utf8'));
const D = MANIFEST.defaults;
const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

let passed = 0, failed = 0;
const fails = [];
function ok(cond, label) {
  if (cond) passed++;
  else { failed++; fails.push(label); process.stderr.write(`  ✗ ${label}\n`); }
}

function argsFor(fx, fixturesRoot = FIXTURES) {
  const up = (k) => join(fixturesRoot, fx[k] || D[k]);
  const a = [
    join(fx._dir || fixturesRoot, fx.dir),
    '--upstream-02', up('up02'),
    '--upstream-04-dbml', up('up04dbml'),
    '--upstream-04-transitions', up('up04tr'),
    '--upstream-07', up('up07'),
    '--upstream-08', up('up08'),
  ];
  if (fx.run === 'with05') a.push('--upstream-05', up('up05'));
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
function run(fx, root) { return runArgs(argsFor(fx, root)); }

const rejectionIds = (j) => [
  ...j.checks.filter((c) => c.status === 'fail').map((c) => c.id),
  ...j.findings.map((f) => f.id),
];

// ===========================================================================
// PART 1 — Every fixture matches its manifest (status + owner + exit + authority).
// ===========================================================================
process.stderr.write('PART 1 — manifest status + owner-check + exit + authority\n');
for (const fx of MANIFEST.fixtures) {
  const { code, json } = run(fx);
  const tag = `${fx.dir}/${fx.run}${fx.up08 && fx.up08 !== D.up08 ? '+' + fx.up08 : ''}${fx.up07 && fx.up07 !== D.up07 ? '+' + fx.up07 : ''}${(fx.args || []).join('')}`;
  ok(json !== null, `[${tag}] emits parseable JSON summary`);
  if (!json) continue;
  ok(json.status === fx.status, `[${tag}] status === ${fx.status} (got ${json.status})`);
  ok(code === EXIT[fx.status], `[${tag}] exit === ${EXIT[fx.status]} (got ${code})`);
  if (fx.owner) {
    ok(rejectionIds(json).includes(fx.owner), `[${tag}] owner ${fx.owner} among rejections (got [${[...new Set(rejectionIds(json))].join(',')}])`);
  }
  if (fx.owner === null && fx.status === 'pass') {
    ok(!json.checks.some((c) => c.status === 'fail'), `[${tag}] clean pass has zero failing checks`);
    ok(json.reconciled === true, `[${tag}] clean pass reconciled === true`);
    ok(json.counts.walker.total > 0, `[${tag}] clean pass ran the walker (non-empty oracle)`);
  }
  if (fx.warnOwner) {
    ok(json.checks.some((c) => c.id === fx.warnOwner && c.status === 'warn'),
      `[${tag}] warn-owner ${fx.warnOwner} among warn-status checks (advisory, non-blocking)`);
  }
  if (fx.authority) {
    for (const [ent, src] of Object.entries(fx.authority)) {
      ok(json.authority[ent] === src, `[${tag}] authority[${ent}] === ${src} (got ${json.authority[ent]})`);
    }
  }
  if (fx.upstreamDefect) {
    const ud = json.findings.find((f) => f.class === 'upstream-defect');
    ok(!!ud, `[${tag}] carries an upstream-defect finding`);
    ok(ud && ud.upstream === fx.route, `[${tag}] upstream-defect routes to ${fx.route} (got '${ud && ud.upstream}')`);
    ok(ud && ud.detail.includes(fx.route), `[${tag}] upstream-defect detail names the file to fix`);
    ok(json.status === 'fail' && code === 1, `[${tag}] upstream-defect status stays fail / exit 1 (taxonomy closed)`);
  }
}

// ===========================================================================
// PART 2 — Wrong-reason trap: OWNER is W-COST (walker), NOT M-BIND (both fire).
// ===========================================================================
process.stderr.write('PART 2 — wrong-reason trap reports W-BLOAT (not M-BIND)\n');
{
  const trap = MANIFEST.fixtures.find((f) => f.trap);
  ok(!!trap, 'manifest declares a wrong-reason trap fixture');
  const { json } = run(trap);
  ok(json && json.status === 'fail', `trap status === fail (got ${json && json.status})`);
  const ids = rejectionIds(json);
  ok(ids.includes(trap.trapOwner), `trap reports the OWNER ${trap.trapOwner} (the walker isolates over M-BIND)`);
  ok(ids.includes(trap.trapNotOwner), `trap ALSO detects the co-present ${trap.trapNotOwner} (both fire)`);
  const wb = json.findings.find((f) => f.id === 'W-BLOAT');
  ok(!!wb, 'trap reports a W-BLOAT finding');
  ok(trap.owner === 'W-BLOAT', 'manifest pins trap owner to W-BLOAT (not M-BIND)');
}

// ===========================================================================
// PART 3 — Over-budget: W-COST reports BOTH the computed AND the declared value + path.
// ===========================================================================
process.stderr.write('PART 3 — over-budget WARNS (gate passes) reporting BOTH values + the path; flow-bloat BLOCKS\n');
{
  const ob = MANIFEST.fixtures.find((f) => f.dir === 'over-budget' && f.bothValues);
  const { json, code } = run(ob);
  ok(json.status === 'pass' && code === 0, `over-budget passes the gate (W-COST is warn-only; got ${json.status})`);
  ok(!json.findings.some((f) => f.id === 'W-COST'), 'over-budget W-COST never enters findings (warn, not fail)');
  const wc = json.checks.find((c) => c.id === 'W-COST' && c.status === 'warn');
  ok(!!wc, 'over-budget reports a W-COST warn check');
  ok(wc && /flow_cost\s+\d+/.test(wc.detail), 'W-COST detail reports the COMPUTED flow_cost');
  ok(wc && /Budget\.klm\s+\d+/.test(wc.detail), 'W-COST detail reports the DECLARED Budget.klm');
  ok(wc && /events \[/.test(wc.detail), 'W-COST detail lists the contributing event/hop path');
  const fl = json.flows.find((f) => f.realizable && f.computedCost > f.budget);
  ok(!!fl, 'flows[] records an over-budget model with computedCost > budget (both values present)');

  // flow-bloat: the blocking arm — screens visited > 08 nominal leaf count + 3 ⇒ fail.
  const fb = MANIFEST.fixtures.find((f) => f.dir === 'flow-bloat');
  const r = run(fb);
  ok(r.json.status === 'fail' && r.code === 1, `flow-bloat fails the gate (W-BLOAT is blocking; got ${r.json.status})`);
  const wb = r.json.findings.find((f) => f.id === 'W-BLOAT');
  ok(!!wb, 'flow-bloat reports a W-BLOAT finding');
  ok(wb && /screens visited\s+\d+/.test(wb.detail), 'W-BLOAT detail reports the COMPUTED screens-visited count');
  ok(wb && /leaf count\s+\d+/.test(wb.detail), 'W-BLOAT detail reports the 08 nominal leaf count + slack');
  const bfl = r.json.flows.find((f) => f.realizable && f.screens > f.bloatLimit);
  ok(!!bfl, 'flows[] records the bloated model with screens > bloatLimit (both values present)');
}

// ===========================================================================
// PART 4 — WALKER HONESTY: mutating a navflow / a klm CHANGES the computed cost.
// ===========================================================================
process.stderr.write('PART 4 — walker honesty (mutation changes the re-computed cost)\n');
{
  const tmp = mkdtempSync(join(tmpdir(), 'uiflows-walk-'));
  cpSync(FIXTURES, tmp, { recursive: true });
  const base = run({ dir: 'valid-09', run: 'with05' }, tmp);
  const baseFulfil = base.json.flows.find((f) => f.taskModel === 'dispatcher-fulfil_order');
  // token unit (08-owned): open_order MPBB=3 + start_picking MBB=2 + ship_order MBB=2 + 1 hop (free) = 7.
  ok(!!baseFulfil && baseFulfil.computedCost === 7, `scratch baseline fulfil cost === 7 (got ${baseFulfil && baseFulfil.computedCost})`);

  // (a) mutate a KLM in a scratch copy → cost changes.
  const dispPath = join(tmp, 'valid-09', 'dispatcher.xml');
  let s = readFileSync(dispPath, 'utf8');
  const sKlm = s.replace('id="open_order" type="select" task="select-order" klm="MPBB"',
    'id="open_order" type="select" task="select-order" klm="M3KPBB"'); // tokens: M+3K+P+BB = 1+3+1+1 = 6 (was 3)
  writeFileSync(dispPath, sKlm);
  const mutKlm = run({ dir: 'valid-09', run: 'with05' }, tmp);
  const mutKlmFulfil = mutKlm.json.flows.find((f) => f.taskModel === 'dispatcher-fulfil_order');
  ok(mutKlmFulfil && mutKlmFulfil.computedCost === 10,
    `mutating a klm RE-WALKS to a different cost 10 (got ${mutKlmFulfil && mutKlmFulfil.computedCost}) — walker does not trust a declared number`);
  writeFileSync(dispPath, s); // restore

  // (b) mutate a NavigationFlow (force an extra hop) → cost changes via BB×(hops−1).
  // Re-point start_picking through an intermediate hop: put ship-order on a NEW container
  // reached via a navflow, so the realizing walk needs one more hop.
  let s2 = readFileSync(dispPath, 'utf8');
  // Move ship_order into a new ship_screen container reachable from order_detail.
  s2 = s2.replace(
    '    <Event id="ship_order" type="submit" task="ship-order" klm="MBB">\n      <!-- 01-event: ship order -->\n    </Event>\n',
    '    <Event id="go_ship" type="navigate"/>\n');
  s2 = s2.replace('  </ViewContainer>\n\n  <NavigationFlow from="open_order"',
    '  </ViewContainer>\n\n  <ViewContainer id="ship_screen" name="Ship">\n    <ViewComponent id="ship_view" type="details" binding="order"/>\n    <Event id="ship_order" type="submit" task="ship-order" klm="MBB">\n      <!-- 01-event: ship order -->\n    </Event>\n  </ViewContainer>\n\n  <NavigationFlow from="go_ship" to="ship_screen"/>\n  <NavigationFlow from="open_order"');
  writeFileSync(dispPath, s2);
  const mutNav = run({ dir: 'valid-09', run: 'with05' }, tmp);
  const mutNavFulfil = mutNav.json.flows.find((f) => f.taskModel === 'dispatcher-fulfil_order');
  ok(mutNavFulfil && mutNavFulfil.hops === 2,
    `adding a navflow hop RE-WALKS to 2 hops (got ${mutNavFulfil && mutNavFulfil.hops})`);
  ok(mutNavFulfil && mutNavFulfil.computedCost === baseFulfil.computedCost + 1,
    `the extra hop adds exactly BB=1 token to the re-computed cost (${baseFulfil.computedCost}→${mutNavFulfil && mutNavFulfil.computedCost})`);
  writeFileSync(dispPath, s); // restore
  rmSync(tmp, { recursive: true, force: true });
}

// ===========================================================================
// PART 5 — AUTHORITY SWITCH: same 09 judged differently with vs without --upstream-05.
// ===========================================================================
process.stderr.write('PART 5 — 05-authority switch (event only in the 05 graph)\n');
{
  // Build a scratch 09 whose dispatcher uses the BEYOND-04 transition `expedite order` (in
  // the 05 graph only). With --upstream-05 it is in the authority ⇒ pass; without it the
  // model still fingerprints 05 ⇒ N-05ABSENT fail. To isolate the authority arm cleanly we
  // make a no-05-fingerprint variant: with05 ⇒ R-AUTH pass; no05 ⇒ R-AUTH fail (event ∉ 04).
  const tmp = mkdtempSync(join(tmpdir(), 'uiflows-auth-'));
  cpSync(FIXTURES, tmp, { recursive: true });
  // variant dir reused from valid-09-no05 (no 05 fingerprint); inject `expedite order`.
  const dir = join(tmp, 'auth-variant');
  cpSync(join(tmp, 'valid-09-no05'), dir, { recursive: true });
  const dp = join(dir, 'dispatcher.xml');
  let s = readFileSync(dp, 'utf8').replace('<!-- 01-event: start picking -->', '<!-- 01-event: expedite order -->');
  writeFileSync(dp, s);

  const withFlag = run({ dir: 'auth-variant', run: 'with05', _dir: tmp }, tmp);
  const noFlag = run({ dir: 'auth-variant', run: 'no05', _dir: tmp }, tmp);
  ok(withFlag.json.status === 'pass',
    `WITH --upstream-05: 'expedite order' ∈ 05 graph ⇒ R-AUTH pass ⇒ status pass (got ${withFlag.json.status})`);
  ok(noFlag.json.status === 'fail' && rejectionIds(noFlag.json).includes('R-AUTH'),
    `WITHOUT --upstream-05: 'expedite order' ∉ 04 rows ⇒ R-AUTH fail (got ${noFlag.json.status})`);
  ok(withFlag.json.authority.order === '05-scxml' && noFlag.json.authority.order === '04-table',
    'authority record flips 05-scxml ↔ 04-table with the flag');
  rmSync(tmp, { recursive: true, force: true });
}

// ===========================================================================
// PART 5b — snake_case lifecycle detection (Defect-2 regression). The REAL 04-erd.dbml emits
// snake_case enum types (`order_status`, `event_status`); a PascalCase-only `…Status` test
// silently never classifies any table as lifecycle-bearing, so Theme D (M-ANNOT / R-AUTH)
// never fires and the authority block is {} (a false-green hole). Prove: (a) the dbml reader
// detects snake_case status enums, (b) the authority block is NON-EMPTY against the snake_case
// fixture, (c) a BAD 01-event annotation IS caught (R-AUTH fires) against the snake_case schema.
// ===========================================================================
process.stderr.write('PART 5b — snake_case lifecycle detection (Theme D not blind to <name>_status)\n');
{
  const { isStatusEnumType, parse: parseDbml } = await import('./lib/dbml.mjs');
  ok(isStatusEnumType('order_status') && isStatusEnumType('event_status') && isStatusEnumType('waitlist_offer_status'),
    'isStatusEnumType matches the REAL snake_case `<name>_status` enum family');
  ok(isStatusEnumType('OrderStatus'), 'isStatusEnumType still matches the PascalCase `<Name>Status` family');
  ok(!isStatusEnumType('status') && !isStatusEnumType('varchar'),
    'isStatusEnumType does NOT match a bare `status` / a non-status type');
  const dbml = parseDbml(readFileSync(join(FIXTURES, 'upstream-04.dbml'), 'utf8'));
  ok(dbml.statusTables.get('order') === 'order_status' && dbml.statusTables.get('coupon') === 'coupon_status',
    'snake_case fixture yields the order/coupon status tables (lifecycle entities detected)');

  // (b) authority block NON-EMPTY against the snake_case fixture (would be {} under the blind reader).
  const pass = run({ dir: 'valid-09', run: 'with05' }).json;
  ok(Object.keys(pass.authority).length > 0 && pass.authority.order && pass.authority.coupon,
    `authority block populated against snake_case schema (got ${JSON.stringify(pass.authority)})`);

  // (c) a BAD 01-event annotation IS caught against the snake_case schema (R-AUTH fires).
  const ghost = run(MANIFEST.fixtures.find((f) => f.dir === 'ghost-01-event')).json;
  ok(ghost.status === 'fail' && rejectionIds(ghost).includes('R-AUTH'),
    'a bad 01-event annotation fires R-AUTH against the snake_case lifecycle schema (Theme D not blind)');
}

// ===========================================================================
// PART 5c — CREATION-EVENT authority symmetry (the check-asymmetry regression). The 05 authority
// vocabulary = all transition 01-event annotations PLUS the machine's INITIAL-ENTRY annotation
// (the creation event — mirrors 04's ∅ row). A creation-screen submit ('place order') for the
// PROMOTED `order` entity must be IN-authority under --upstream-05, exactly as it is for an
// unpromoted entity judged against 04 (whose ∅ row carries it). Prove: (a) the fixture PASSES;
// (b) the pass is load-bearing on the initial-entry annotation — stripping it from a scratch
// order.scxml flips the SAME model to an R-AUTH fail; (c) ghost-01-event still fails (the fix
// did not widen the authority to accept off-vocabulary strings).
// ===========================================================================
process.stderr.write('PART 5c — creation-event authority symmetry (initial-entry 01-event ∈ 05 authority)\n');
{
  const { scxmlGraph, parse: parseScxml } = await import('./lib/scxml.mjs');
  const orderScxml = readFileSync(join(FIXTURES, 'upstream-05', 'order.scxml'), 'utf8');
  const g = scxmlGraph(parseScxml(orderScxml));
  ok(g.events.has('place order'),
    "scxmlGraph(order).events includes the initial-entry creation event 'place order' (mirrors 04's ∅ row)");

  // (a) the creation-event fixture PASSES with --upstream-05 (promoted authority includes creation).
  const ce = run({ dir: 'creation-event', run: 'with05' }).json;
  ok(ce.status === 'pass' && ce.authority.order === '05-scxml',
    `creation-event PASSES against the promoted 05 authority (got ${ce.status}, authority.order=${ce.authority.order})`);
  ok(!ce.checks.some((c) => c.id === 'R-AUTH' && c.status === 'fail'),
    'creation-event has no R-AUTH failure (place order ∈ 05 authority)');

  // (b) load-bearing: strip the initial-entry annotation from a scratch order.scxml ⇒ same model fails R-AUTH.
  const tmp = mkdtempSync(join(tmpdir(), 'uiflows-create-'));
  cpSync(FIXTURES, tmp, { recursive: true });
  const op = join(tmp, 'upstream-05', 'order.scxml');
  writeFileSync(op, readFileSync(op, 'utf8').replace('  <!-- 01-event: place order -->\n', ''));
  const stripped = run({ dir: 'creation-event', run: 'with05', _dir: tmp }, tmp);
  ok(stripped.json.status === 'fail' && rejectionIds(stripped.json).includes('R-AUTH'),
    'stripping the initial-entry annotation flips creation-event to R-AUTH fail (the fix is load-bearing)');
  rmSync(tmp, { recursive: true, force: true });

  // (c) ghost-01-event STILL fails — the authority was not widened to accept off-vocabulary strings.
  const ghost = run(MANIFEST.fixtures.find((f) => f.dir === 'ghost-01-event')).json;
  ok(ghost.status === 'fail' && rejectionIds(ghost).includes('R-AUTH'),
    'ghost-01-event still fires R-AUTH (off-vocabulary annotation still rejected)');
}

// ===========================================================================
// PART 6 — N-05ABSENT fires.
// ===========================================================================
process.stderr.write('PART 6 — N-05ABSENT (05 fingerprint while --upstream-05 absent)\n');
{
  const fx = MANIFEST.fixtures.find((f) => f.owner === 'N-05ABSENT');
  const { json, code } = run(fx);
  ok(json.status === 'fail' && code === 1, 'N-05ABSENT ⇒ fail / exit 1');
  ok(rejectionIds(json).includes('N-05ABSENT'), 'N-05ABSENT among rejections');
}

// ===========================================================================
// PART 7 — budget-broken-08 ⇒ upstream-defect; malformed upstreams ⇒ broken-test.
// ===========================================================================
process.stderr.write('PART 7 — upstream-defect vs broken-test routing\n');
{
  const ud = MANIFEST.fixtures.find((f) => f.upstreamDefect);
  const r = run(ud);
  ok(r.json.status === 'fail' && r.code === 1, 'budget-broken-08 ⇒ fail / exit 1 (NOT broken-test)');
  const f = r.json.findings.find((x) => x.class === 'upstream-defect');
  ok(f && f.upstream.startsWith('08-task-models/'), 'budget-broken-08 routes upstream-defect → the named 08 file');

  for (const bt of MANIFEST.fixtures.filter((f) => f.brokenTest)) {
    const rr = run(bt);
    const which = bt.up07 ? '07' : bt.up04dbml ? '04dbml' : bt.up02 ? '02' : bt.up08 ? '08' : bt.up05 ? '05' : '?';
    ok(rr.json.status === 'broken-test' && rr.code === 3, `malformed upstream ${which} ⇒ broken-test / exit 3`);
    ok(!rr.json.findings.some((x) => x.class === 'upstream-defect'), `malformed upstream ${which} is NOT mis-routed as upstream-defect`);
  }
}

// ===========================================================================
// PART 8 — Vacuous green guard + counter conflation + reconciliation.
// ===========================================================================
process.stderr.write('PART 8 — vacuous guard + counter conflation + reconciliation\n');
{
  const vac = MANIFEST.fixtures.find((f) => f.vacuous);
  const r = run(vac);
  ok(r.json.status === 'broken-test' && r.json.counts.checks.total === 0 && r.code === 3,
    '--no-checks ⇒ broken-test, zero parsed checks, exit 3');

  // counter conflation: class counters sum to total over a clean pass.
  const pass = run({ dir: 'valid-09', run: 'with05' });
  const c = pass.json.counts.checks;
  const sum = c.mechanical + c.walker + c.resolution + c.exactValue + c.negative + c.agentJudged;
  ok(sum === c.total, `class counters sum to total (${sum} === ${c.total})`);
  ok(pass.json.counts.edgesWalked === pass.json.counts.edgesExpected, 'edgesWalked === edgesExpected (no dropped edge)');
  ok(pass.json.reconciled === true, 'clean pass is reconciled');
  ok(pass.json.counts.walker.total > 0, 'walker layer non-empty on a pass (strongest oracle ran)');
}

// ===========================================================================
// PART 9 — Determinism: byte-identical double-run (with AND without 05).
// ===========================================================================
process.stderr.write('PART 9 — byte-identical double-run\n');
{
  const a1 = runArgs(argsFor({ dir: 'valid-09', run: 'with05' })).stdout;
  const a2 = runArgs(argsFor({ dir: 'valid-09', run: 'with05' })).stdout;
  ok(a1 === a2 && a1.length > 0, 'valid-09 (with05) double-run is byte-identical');
  const b1 = runArgs(argsFor({ dir: 'valid-09-no05', run: 'no05' })).stdout;
  const b2 = runArgs(argsFor({ dir: 'valid-09-no05', run: 'no05' })).stdout;
  ok(b1 === b2 && b1.length > 0, 'valid-09-no05 (no05) double-run is byte-identical');
}

// ===========================================================================
// PART 10 — COVERAGE floor: ALL 22 ❌ rules have BOTH a positive AND a negative.
// (distinct-rule count check — learn from the task-models review.)
// ===========================================================================
process.stderr.write('PART 10 — coverage floor: 22 ❌ rules, pos + neg, distinct-rule count\n');
{
  const cov = MANIFEST.coverage.rules;
  const distinctRules = new Set(cov.map((r) => r.rule));
  ok(distinctRules.size === 22, `coverage table covers exactly 22 distinct ❌ rules (got ${distinctRules.size})`);

  // positive: every owner check appears as a PASS over valid-09 (with05) or valid-09-no05.
  const posWith = run({ dir: 'valid-09', run: 'with05' }).json;
  const posNo = run({ dir: 'valid-09-no05', run: 'no05' }).json;
  const passedIds = new Set([
    ...posWith.checks.filter((c) => c.status === 'pass').map((c) => c.id),
    ...posNo.checks.filter((c) => c.status === 'pass').map((c) => c.id),
  ]);
  for (const r of cov) {
    ok(passedIds.has(r.owner), `[${r.rule}] positive: owner ${r.owner} passes over a valid model`);
  }
  // negative: the named fixture fails with the owner among its rejections.
  for (const r of cov) {
    const fx = MANIFEST.fixtures.find((f) => f.dir === r.neg && !f.brokenTest && !f.vacuous && !f.upstreamDefect);
    ok(!!fx, `[${r.rule}] negative fixture '${r.neg}' is in the manifest`);
    if (!fx) continue;
    const j = run(fx).json;
    ok(rejectionIds(j).includes(r.owner), `[${r.rule}] negative '${r.neg}' fires owner ${r.owner}`);
  }
}

// ===========================================================================
process.stderr.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) { process.stderr.write('SELFTEST FAILED:\n' + fails.map((f) => '  - ' + f).join('\n') + '\n'); process.exit(1); }
process.stderr.write('SELFTEST PASSED — every fixture status+owner asserted; wrong-reason isolated; walker honesty proven; W-COST warn-only + W-BLOAT blocking verified; authority switch + N-05ABSENT + upstream-defect routing verified; vacuous guarded; byte-identical; 22 ❌ rules pos+neg.\n');
process.exit(0);
