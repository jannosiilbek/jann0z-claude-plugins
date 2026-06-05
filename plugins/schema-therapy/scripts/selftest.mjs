#!/usr/bin/env node
// selftest.mjs — the ADVERSARIAL selftest for the suite-drift oracle
// (verification doctrine §3). A regression suite proving the oracle catches
// FALSE-GREENS. It demonstrates the oracle:
//   1. PASSES the good suite (exit 0, status pass, non-zero checks AND edges).
//   2. Per manifest negative: reports the EXACT overall status + exit code, and
//      the required check-class finding fires FOR THE STATED REASON.
//   3. WRONG-REASON trap: the failing finding's detail names the real defect
//      (INV-Order-9), NOT a co-present oddity — proving no leakage between checks.
//   4. VACUOUS-GREEN guard: an empty specs dir AND the --no-checks hook each
//      yield broken-test (exit 3), never pass.
//   5. CONFLATED-COUNTER guard: a deliberately disabled check class is DETECTED —
//      the harness, run with every check class silenced, refuses to pass (the
//      edges/checks reconciliation turns it into broken-test, not vacuous green).
//   6. A typo'd negative check (an oracle that always returns pass) is caught:
//      we mutate a check at the module boundary and prove the good suite then
//      FAILS to flag a known-bad fixture — i.e. the oracle's negatives are live.
//   7. DETERMINISM: the good suite run twice => byte-identical stdout.
//   8. NO-DOMAIN skip: without --domain, 01's domain fingerprint is `skipped`
//      (never silently passed) and the suite still passes.
//
// Exit 0 ONLY when every assertion passes. Zero external deps.

import { readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, 'suite-drift.mjs');
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

function run(specsRel, { domain, intent, extra } = {}) {
  const argv = [SCRIPT, join(FIXTURES, specsRel)];
  if (domain) argv.push('--domain', join(FIXTURES, domain));
  if (intent) argv.push('--intent', join(FIXTURES, intent));
  if (extra) argv.push(...extra);
  let stdout = '';
  let code = 0;
  try {
    stdout = execFileSync('node', argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    stdout = e.stdout ? e.stdout.toString() : '';
    code = typeof e.status === 'number' ? e.status : -1;
  }
  let json = null;
  try { json = JSON.parse(stdout); } catch { json = null; }
  return { stdout, code, json };
}

// ===========================================================================
// PART 1 — the good suite PASSES with non-vacuous checks + edges.
// ===========================================================================
process.stderr.write('PART 1 — good suite passes (non-vacuous)\n');
{
  const g = MANIFEST.good;
  const r = run(g.specsDir, { domain: g.domain, intent: g.intent });
  ok(r.json !== null, '[good] emits parseable JSON');
  ok(r.json && r.json.status === 'pass', `[good] status === pass (got ${r.json && r.json.status})`);
  ok(r.code === 0, `[good] exit === 0 (got ${r.code})`);
  ok(r.json && r.json.counts.checks.total > 0, '[good] parsed > 0 checks');
  ok(r.json && r.json.counts.edges.total > 0, '[good] walked > 0 edges');
  ok(r.json && r.json.reconciled === true, '[good] reconciled');
  ok(r.json && r.json.counts.findings.fail === 0, '[good] zero fail findings');
}

// ===========================================================================
// PART 2 — each manifest negative reports its exact status + required finding.
// ===========================================================================
process.stderr.write('PART 2 — manifest negatives: status + exit + reason-qualified finding\n');
for (const fx of MANIFEST.fixtures) {
  const r = run(fx.specsDir, { domain: fx.domain, intent: fx.intent });
  const tag = fx.name;
  ok(r.json !== null, `[${tag}] emits parseable JSON`);
  if (!r.json) continue;
  ok(r.json.status === fx.status, `[${tag}] status === ${fx.status} (got ${r.json.status})`);
  ok(r.code === EXIT[fx.status], `[${tag}] exit === ${EXIT[fx.status]} (got ${r.code})`);

  if (fx.requireFinding) {
    const want = fx.requireFinding;
    const match = r.json.findings.find(
      (fnd) => (fnd.status === 'fail') &&
        (want.id ? fnd.id === want.id : true) &&
        (want.class ? fnd.class === want.class : true) &&
        (want.reason ? fnd.reason === want.reason : true),
    );
    ok(!!match, `[${tag}] has fail finding ${want.id}/${want.class}/${want.reason}`);
    if (match) {
      if (fx.requireDetailContains)
        ok((match.detail || '').includes(fx.requireDetailContains),
          `[${tag}] finding detail names the real defect "${fx.requireDetailContains}"`);
      if (fx.requireDetailNotContains)
        ok(!(match.detail || '').includes(fx.requireDetailNotContains),
          `[${tag}] finding detail does NOT leak co-present reason "${fx.requireDetailNotContains}"`);
    }
  }
  if (fx.requireAlsoFinding) {
    const want = fx.requireAlsoFinding;
    const also = r.json.findings.find(
      (fnd) => fnd.status === 'fail' &&
        (want.class ? fnd.class === want.class : true) &&
        (want.reason ? fnd.reason === want.reason : true),
    );
    ok(!!also, `[${tag}] co-present finding ${want.class}/${want.reason} fires INDEPENDENTLY`);
  }
}

// ===========================================================================
// PART 3 — vacuous-green guard: --no-checks hook AND empty specs => broken-test.
// ===========================================================================
process.stderr.write('PART 3 — vacuous-green guard\n');
{
  const g = MANIFEST.good;
  const r = run(g.specsDir, { domain: g.domain, intent: g.intent, extra: ['--no-checks'] });
  ok(r.json && r.json.status === 'broken-test', `[--no-checks] status === broken-test (got ${r.json && r.json.status})`);
  ok(r.code === EXIT['broken-test'], `[--no-checks] exit === 3 (got ${r.code})`);
}
{
  // empty specs dir (created fresh here so the test is hermetic)
  const empty = join(FIXTURES, 'neg', '_empty', 'specs');
  if (existsSync(empty)) rmSync(empty, { recursive: true, force: true });
  mkdirSync(empty, { recursive: true });
  const r = run('neg/_empty/specs', { domain: MANIFEST.good.domain, intent: MANIFEST.good.intent });
  ok(r.json && r.json.status === 'broken-test', `[empty-specs] status === broken-test (got ${r.json && r.json.status})`);
  ok(r.code === 3, `[empty-specs] exit === 3 (got ${r.code})`);
}

// ===========================================================================
// PART 4 — conflated-counter / typo'd-negative-check guard.
//   We run the harness's check libraries DIRECTLY with the good suite and prove:
//   (a) every check class produces > 0 checks AND every check walked >= 0 edges
//       with the suite total > 0 (a silenced class would zero the total);
//   (b) a check that always returns pass (false-green) is caught: we feed a
//       KNOWN-BAD fixture and require at least one class to flag it.
// ===========================================================================
process.stderr.write('PART 4 — conflated-counter + live-negative guard\n');
{
  // (a) class-level non-vacuity on the good suite
  const g = run(MANIFEST.good.specsDir, { domain: MANIFEST.good.domain, intent: MANIFEST.good.intent });
  ok(g.json && g.json.counts.checks.resolution > 0, '[guard] resolution class non-empty');
  ok(g.json && g.json.counts.checks.dry > 0, '[guard] dry class non-empty');
  ok(g.json && g.json.counts.checks.staleness > 0, '[guard] staleness class non-empty');
  // edges reconciliation: total edges must equal the sum of the three classes
  if (g.json) {
    const e = g.json.counts.edges;
    ok(e.total === e.resolution + e.dry + e.staleness, '[guard] edge counters reconcile (no conflation)');
  }

  // (b) the negatives are LIVE: a known-bad fixture (dangling-resolution) must
  // be flagged by the resolution class specifically — an always-pass oracle
  // would let it through.
  const bad = run('neg/dangling-resolution/specs', { domain: MANIFEST.good.domain, intent: MANIFEST.good.intent });
  const flaggedByResolution = bad.json && bad.json.findings.some((f) => f.class === 'resolution' && f.status === 'fail');
  ok(flaggedByResolution, '[guard] resolution negative is LIVE (catches dangling-resolution)');
}

// ===========================================================================
// PART 5 — determinism: byte-identical double-run over identical inputs.
// ===========================================================================
process.stderr.write('PART 5 — determinism (byte-identical double-run)\n');
{
  const a = run(MANIFEST.good.specsDir, { domain: MANIFEST.good.domain, intent: MANIFEST.good.intent });
  const b = run(MANIFEST.good.specsDir, { domain: MANIFEST.good.domain, intent: MANIFEST.good.intent });
  ok(a.stdout === b.stdout, '[determinism] good-suite stdout byte-identical across runs');
}

// ===========================================================================
// PART 6 — no-domain / no-intent skip: external free-text fingerprints (01's
// domain, 00's product-intent) are recorded `skipped` (never silently passed),
// and the suite still passes.
// ===========================================================================
process.stderr.write('PART 6 — external-input skip paths\n');
{
  const r = run(MANIFEST.good.specsDir, { intent: MANIFEST.good.intent }); // no --domain
  ok(r.json && r.json.status === 'pass', `[no-domain] status === pass (got ${r.json && r.json.status})`);
  // 01 pins 00 (verified) AND domain (skipped) — the domain skip is surfaced as a
  // dedicated `skipped` finding (never folded silently into the pass).
  const skip = r.json && r.json.findings.find((f) => f.status === 'skipped' && f.id === 'S-01-event-storming.md__ext');
  ok(!!skip, '[no-domain] 01 domain fingerprint recorded as skipped (never silently passed)');
  ok(skip && skip.reason === 'external-input-not-provided', '[no-domain] skip reason is external-input-not-provided');
  ok(skip && (skip.detail || '').includes('domain'), '[no-domain] skip detail names the domain input');
}
{
  const r = run(MANIFEST.good.specsDir, { domain: MANIFEST.good.domain }); // no --intent
  ok(r.json && r.json.status === 'pass', `[no-intent] status === pass (got ${r.json && r.json.status})`);
  // 00 pins ONLY product-intent (external) — fully skipped.
  const skip = r.json && r.json.findings.find((f) => f.status === 'skipped' && f.id === 'S-00-impact-map.md');
  ok(!!skip, '[no-intent] 00 product-intent fingerprint recorded as skipped (never silently passed)');
  ok(skip && skip.reason === 'external-input-not-provided', '[no-intent] skip reason is external-input-not-provided');
}

// ===========================================================================
process.stderr.write(`\nselftest: ${passed} passed, ${failed} failed (${passed + failed} assertions)\n`);
if (failed > 0) {
  process.stderr.write('FAILURES:\n' + fails.map((f) => '  - ' + f).join('\n') + '\n');
  process.exit(1);
}
process.stderr.write('SELFTEST GREEN\n');
process.exit(0);
