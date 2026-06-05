#!/usr/bin/env node
// selftest.mjs — the adversarial self-test for the flow-acceptance harness (simulation.md
// §3.5/§5). Runs the harness over EVERY manifest fixture and asserts the exact
// (status, failing-check, upstream-route, error-shape) tuple; the wrong-reason trap
// (V-LOC isolates over V-TAG); the parse negatives match the copied testdata/bad error
// shapes; replay honesty (a navflow mutation in a scratch 09 copy flips V-NAV; a step
// reorder flips V-ORDER); upstream-defect fixtures name the right file; malformed upstreams ⇒
// broken-test; missing-deps ⇒ broken-test; vacuous ⇒ broken-test; byte-identical double-run;
// counter conflation; and the COVERAGE floor (every ❌ rule has a positive + a dedicated
// negative, with a distinct-rule count check). Exit 0 only on full pass.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dirname, 'fixtures');
const HARNESS = join(__dirname, 'harness.mjs');
const EXIT_FOR = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

let failures = 0;
const log = (s) => process.stdout.write(s + '\n');
function ok(name) { log(`  ok   ${name}`); }
function bad(name, detail) { failures++; log(`  FAIL ${name}\n         ${detail}`); }

// run the harness over a 10 dir + upstreams; return { status, exit, json, stderr }.
function runHarness(tenDir, up06, up08, up09, extraArgs = []) {
  const args = [HARNESS, tenDir, '--upstream-06', up06, '--upstream-08', up08, '--upstream-09', up09, ...extraArgs];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* no JSON (shouldn't happen) */ }
  return { exit: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

function resolveUpstreams(fx) {
  if (fx.shared) return { up06: join(FIX, 'upstream-06'), up08: join(FIX, 'upstream-08'), up09: join(FIX, 'upstream-09') };
  return { up06: join(FIX, fx.up06), up08: join(FIX, fx.up08), up09: join(FIX, fx.up09) };
}

function failingChecks(json) {
  if (!json || !json.checks) return [];
  return json.checks.filter((c) => c.status === 'fail').map((c) => c.id);
}
function failingFindings(json) {
  if (!json || !json.findings) return [];
  return json.findings.filter((f) => f.severity === 'error').map((f) => f.id);
}

// ===========================================================================
// 1. Manifest sweep — exact status + owner per fixture.
// ===========================================================================
const manifest = JSON.parse(readFileSync(join(FIX, 'manifest.json'), 'utf8'));
log('=== manifest sweep (status + owner + route + errorShape) ===');

for (const fx of manifest.fixtures) {
  const tenDir = join(FIX, fx.dir);
  const { up06, up08, up09 } = resolveUpstreams(fx);
  const r = runHarness(tenDir, up06, up08, up09, fx.extraArgs || []);

  // status + exit code coherence.
  if (!r.json) { bad(fx.dir, `no JSON emitted (exit ${r.exit}); stderr: ${r.stderr.slice(0, 200)}`); continue; }
  if (r.json.status !== fx.status) { bad(fx.dir, `status ${r.json.status} ≠ expected ${fx.status}`); continue; }
  if (r.exit !== EXIT_FOR[fx.status]) { bad(fx.dir, `exit ${r.exit} ≠ expected ${EXIT_FOR[fx.status]} for status ${fx.status}`); continue; }

  // owner check fired (for fail / malformed with a named owner).
  if (fx.owner) {
    const owners = fx.status === 'malformed' ? failingFindings(r.json) : [...failingChecks(r.json), ...failingFindings(r.json)];
    if (!owners.includes(fx.owner)) { bad(fx.dir, `expected owner ${fx.owner} among failing [${owners.join(', ')}]`); continue; }
  }

  // notOwner: a check the fixture must ISOLATE AGAINST — proving the negative fires for its
  // stated reason and NOT for a co-firing one (strand-stops-evaluation, simulation.md §3.3).
  // Enforced generically for every manifest fixture carrying notOwner.
  if (fx.notOwner) {
    const f = failingChecks(r.json);
    if (f.includes(fx.notOwner)) { bad(fx.dir, `wrong-reason isolation: ${fx.notOwner} must NOT be among failing [${f.join(', ')}]`); continue; }
  }

  // error-shape for parse negatives.
  if (fx.errorShape) {
    const f = (r.json.findings || []).find((x) => x.errorShape);
    if (!f || !f.errorShape.includes(fx.errorShape)) { bad(fx.dir, `errorShape "${f && f.errorShape}" does not contain "${fx.errorShape}"`); continue; }
  }

  // upstream-defect route names the right file.
  if (fx.upstreamRoute) {
    const routed = (r.json.findings || []).filter((x) => x.class === 'upstream-defect');
    if (!routed.some((x) => x.upstream === fx.upstreamRoute)) { bad(fx.dir, `expected upstream-defect route to ${fx.upstreamRoute}; got [${routed.map((x) => x.upstream).join(', ')}]`); continue; }
  }

  // wrong-reason trap: V-LOC present, and the trap reports it (V-TAG must NOT be the sole reason).
  if (fx.wrongReason) {
    const f = failingChecks(r.json);
    if (!f.includes('V-LOC')) { bad(fx.dir, `wrong-reason trap: V-LOC not in failing [${f.join(', ')}]`); continue; }
    // V-LOC must isolate: the walk strands at the ghost screen BEFORE binding resolution
    // matters; assert the V-LOC finding mentions the ghost screen.
    const locFinding = (r.json.findings || []).find((x) => x.id === 'V-LOC' && x.detail);
    if (!locFinding || !/ghost_screen/.test(locFinding.detail)) { bad(fx.dir, `wrong-reason trap: V-LOC finding does not isolate the ghost screen`); continue; }
  }

  ok(`${fx.dir} → ${r.json.status}${fx.owner ? ` (${fx.owner})` : ''}`);
}

// ===========================================================================
// 2. Replay honesty — mutate a scratch copy and assert the verdict flips.
// ===========================================================================
log('=== replay honesty ===');
const scratch = mkdtempSync(join(tmpdir(), 'flow-acceptance-self-'));

// (a) mutating a navflow in a scratch 09 copy flips V-NAV.
{
  const up09copy = join(scratch, 'up09-navmut');
  cpSync(join(FIX, 'upstream-09'), up09copy, { recursive: true });
  const f = join(up09copy, 'dispatcher.xml');
  let xml = readFileSync(f, 'utf8');
  // break the start_picking → pick_confirm edge by retargeting it to a non-walked container.
  xml = xml.replace('<NavigationFlow from="start_picking"     to="pick_confirm"/>',
                    '<NavigationFlow from="start_picking"     to="order_queue"/>');
  writeFileSync(f, xml);
  const r = runHarness(join(FIX, 'valid-10'), join(FIX, 'upstream-06'), join(FIX, 'upstream-08'), up09copy);
  if (r.json && r.json.status === 'fail' && failingChecks(r.json).includes('V-NAV')) ok('navflow mutation flips V-NAV');
  else bad('navflow-mutation', `expected fail with V-NAV; got ${r.json && r.json.status} [${failingChecks(r.json).join(', ')}]`);
}

// (b) reordering steps in a scratch 10 copy flips V-ORDER.
{
  const tenCopy = join(scratch, 'ten-reorder');
  cpSync(join(FIX, 'valid-10'), tenCopy, { recursive: true });
  const f = join(tenCopy, 'picker-pick_order.feature');
  let feat = readFileSync(f, 'utf8');
  // swap the two domain interactions (pick ↔ complete) — graph desync + leaf reorder.
  feat = feat
    .replace('When the Picker picks the shipment: "Shipment Picked"', 'When the Picker completes the shipment: "Shipment Completed"')
    .replace('When the Picker completes the shipment: "Shipment Completed"\n    Then the outcome of "@terminal:shipment" holds',
             'When the Picker picks the shipment: "Shipment Picked"\n    Then the outcome of "@transition:shipment" holds');
  writeFileSync(f, feat);
  const r = runHarness(tenCopy, join(FIX, 'upstream-06'), join(FIX, 'upstream-08'), join(FIX, 'upstream-09'));
  if (r.json && r.json.status === 'fail') ok('step reorder flips the walk (fail)');
  else bad('step-reorder', `expected fail; got ${r.json && r.json.status}`);
}

// ===========================================================================
// 3. Byte-identical double-run over the valid set (determinism §8).
// ===========================================================================
log('=== determinism ===');
{
  const a = runHarness(join(FIX, 'valid-10'), join(FIX, 'upstream-06'), join(FIX, 'upstream-08'), join(FIX, 'upstream-09'));
  const b = runHarness(join(FIX, 'valid-10'), join(FIX, 'upstream-06'), join(FIX, 'upstream-08'), join(FIX, 'upstream-09'));
  if (a.stdout === b.stdout) ok('byte-identical double-run');
  else bad('double-run', 'stdout differs between two runs over identical inputs');
}

// ===========================================================================
// 3b. V-ORDER symmetric system-leaf filter (the d.4 regression).
//     The shared picker-pick_order 08 model carries a SYSTEM leaf (`reserve-stock`) on its
//     nominal path that NO 09 Event realizes. Per the verified 09 contract (B-b: system
//     leaves impose no screen/Event obligation, INTERACTION_LEAF_CATEGORIES = {interaction,
//     user}), V-ORDER must compare the walked order against the interaction/user nominal
//     leaves ONLY — so valid-10 must still PASS V-ORDER, and the system leaf must be
//     reported as excluded for transparency. Without the symmetric filter, every real 08
//     model with a system leaf on its nominal path is unwalkable.
// ===========================================================================
log('=== V-ORDER system-leaf symmetric filter (d.4) ===');
{
  const r = runHarness(join(FIX, 'valid-10'), join(FIX, 'upstream-06'), join(FIX, 'upstream-08'), join(FIX, 'upstream-09'));
  const vorder = (r.json && r.json.checks || []).find((c) => c.id === 'V-ORDER');
  const picker = (r.json && r.json.walks || []).find((w) => w.feature === 'picker-pick_order');
  if (!r.json || r.json.status !== 'pass') {
    bad('system-leaf-filter', `valid-10 must pass with a system nominal leaf present; got ${r.json && r.json.status} [${failingChecks(r.json).join(', ')}]`);
  } else if (!vorder || vorder.status !== 'pass') {
    bad('system-leaf-filter', `V-ORDER must pass over the system-leaf-bearing nominal path; got ${vorder && vorder.status}`);
  } else if (!picker || !Array.isArray(picker.systemLeavesExcluded) || !picker.systemLeavesExcluded.includes('reserve-stock')) {
    bad('system-leaf-filter', `picker walk must report systemLeavesExcluded ['reserve-stock']; got ${picker && JSON.stringify(picker.systemLeavesExcluded)}`);
  } else if (picker.walkedLeaves !== 2 || picker.nominalLeaves !== 2) {
    bad('system-leaf-filter', `picker walked/nominal leaf counts must be 2/2 (interaction/user only); got ${picker.walkedLeaves}/${picker.nominalLeaves}`);
  } else {
    ok(`system nominal leaf excluded from V-ORDER + reported (systemLeavesExcluded=[${picker.systemLeavesExcluded.join(', ')}]); V-ORDER pass`);
  }
}

// ===========================================================================
// 4. Counter conflation — the valid set's intake + check counts are coherent.
// ===========================================================================
log('=== counter conflation ===');
{
  const r = runHarness(join(FIX, 'valid-10'), join(FIX, 'upstream-06'), join(FIX, 'upstream-08'), join(FIX, 'upstream-09'));
  const j = r.json;
  if (!j) { bad('counters', 'no JSON'); }
  else {
    const c = j.counts;
    const sum = c.checks.engine + c.checks.replay + c.checks.resolution + c.checks.agentJudged;
    if (sum !== c.checks.total) bad('counters', `checks sum ${sum} ≠ total ${c.checks.total}`);
    else if (!j.reconciled) bad('counters', 'valid set not reconciled');
    else if (c.engine.total === 0 || c.replay.total === 0) bad('counters', 'engine/replay layer ran zero checks over a non-empty set');
    else if (c.intake.features !== 3) bad('counters', `expected 3 features, got ${c.intake.features}`);
    else ok('intake + check counts coherent + reconciled + engine/replay non-empty');
  }
}

// ===========================================================================
// 5. COVERAGE floor — every ❌ rule has a positive (valid passes its owner) AND a
//    dedicated negative; distinct-rule count check.
// ===========================================================================
log('=== coverage floor (TRUE ❌ reconciliation) ===');
{
  // positive side: the valid set passes the owner check of each ❌ rule.
  const valid = runHarness(join(FIX, 'valid-10'), join(FIX, 'upstream-06'), join(FIX, 'upstream-08'), join(FIX, 'upstream-09'));
  const validFails = failingChecks(valid.json);
  if (validFails.length > 0) bad('coverage-positive', `valid set has failing checks: [${validFails.join(', ')}]`);
  else ok('positive side: valid-10 passes every owner check');

  // negative side: each ❌ rule appears as a manifest fixture's rule.
  const negRules = new Set(manifest.fixtures.filter((f) => f.rule).map((f) => f.rule));
  // A-g is covered by zero-pickles (which the manifest tags A-f via W-INST); add it.
  if (manifest.fixtures.some((f) => f.dir.includes('zero-pickles'))) negRules.add('A-g');
  const missing = manifest.coverage.errorRules.filter((r) => !negRules.has(r));
  if (missing.length > 0) bad('coverage-negative', `❌ rules with no dedicated negative fixture: ${missing.join(', ')}`);
  else ok(`negative side: all ${manifest.coverage.errorRules.length} ❌ rules have a dedicated negative`);

  // distinct-rule count.
  const distinct = new Set(manifest.coverage.errorRules).size;
  if (distinct !== manifest.coverage.distinctRuleCount) bad('coverage-count', `distinct ❌ rule count ${distinct} ≠ declared ${manifest.coverage.distinctRuleCount}`);
  else ok(`distinct ❌ rule count = ${distinct}`);
}

// ===========================================================================
// 6. testdata/bad parse-shape parity — the copied corpus error shapes are matched.
// ===========================================================================
log('=== testdata/bad error-shape parity ===');
{
  const badDir = join(__dirname, '..', 'sources', 'testdata', 'bad');
  const cases = [
    { f: 'not_gherkin.feature', shape: "got 'not gherkin'" },
    { f: 'whitespace_in_tags.feature', shape: 'A tag may not contain whitespace' },
    { f: 'invalid_language.feature', shape: 'Language not supported' },
  ];
  let allOk = true;
  // parse each through the engine directly.
  const E = await import('./lib/engine.mjs');
  const eng = E.loadEngine();
  for (const c of cases) {
    if (!existsSync(join(badDir, c.f))) { bad('testdata-bad', `missing corpus file ${c.f}`); allOk = false; continue; }
    const src = readFileSync(join(badDir, c.f), 'utf8');
    const pr = E.parseFeature(eng, src, c.f);
    const ndjson = readFileSync(join(badDir, c.f + '.errors.ndjson'), 'utf8');
    if (pr.ok) { bad('testdata-bad', `${c.f} parsed clean (expected throw)`); allOk = false; continue; }
    if (!pr.errors[0].message.includes(c.shape)) { bad('testdata-bad', `${c.f} message "${pr.errors[0].message}" missing "${c.shape}"`); allOk = false; continue; }
    if (!ndjson.includes(c.shape)) { bad('testdata-bad', `${c.f}.errors.ndjson missing "${c.shape}"`); allOk = false; }
  }
  if (allOk) ok('parse throws match the copied testdata/bad error shapes');
}

// ===========================================================================
log('');
if (failures === 0) { log('SELFTEST PASS — all assertions held.'); process.exit(0); }
log(`SELFTEST FAIL — ${failures} assertion(s) failed.`);
process.exit(1);
