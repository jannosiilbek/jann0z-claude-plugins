#!/usr/bin/env node
// suite-drift.mjs — the SOLE MECHANICAL AUTHORITY for cross-artifact checks in
// the schema-therapy suite (PLAN.md "Plugin-level drift police"; doctrine §7 the
// enforcement arm). Mechanical-only: checks 1-3 (Resolution, DRY, Staleness).
// The §4 semantic check is the drift-police AGENT's job, not this script's.
//
// Doctrine §2 contract:
//   - machine-readable JSON summary on stdout, diagnostics on stderr
//   - success exit (0) only on a FULL pass
//   - zero parsed checks => failure exit (no vacuous green)
//   - status taxonomy: pass | fail | malformed | broken-test
//   - a typo'd / broken negative check reports broken-test, never pass
//   - byte-identical double-runs over identical inputs (no clocks/random)
//
// Exit codes: 0 pass / 1 fail / 2 malformed / 3 broken-test.
//
// Usage:
//   node scripts/suite-drift.mjs <specs-dir> [--domain <path>] [--skills <dir>]
//
// `--skills` defaults to ../skills relative to this script. The intake tables in
// each SKILL.md supply the ownership contracts (suite topology); the concrete
// owned-name sets are derived from the artifacts themselves.

import { existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { ParseError } from './lib/md.mjs';
import { readAllIntakes, SKILLS } from './lib/intake.mjs';
import { discoverArtifacts } from './lib/model.mjs';
import { buildModel, resolutionChecks, dryChecks } from './lib/checks.mjs';
import { stalenessChecks } from './lib/staleness.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };

function abs(p, base) {
  if (!p) return p;
  return isAbsolute(p) ? p : resolve(base, p);
}

function parseArgs(argv) {
  const args = { specsDir: null, domain: null, skills: null, _noChecks: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--domain') args.domain = argv[++i];
    else if (a === '--skills') args.skills = argv[++i];
    else if (a === '--no-checks') args._noChecks = true; // adversarial vacuous-green guard hook
    else if (!a.startsWith('--') && args.specsDir === null) args.specsDir = a;
  }
  return args;
}

function emit(summary, status) {
  summary.status = status;
  // stable ordering for byte-identical double-runs
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => (a.id + a.detail).localeCompare(b.id + b.detail, 'en'));
  process.stdout.write(JSON.stringify(summary, stableReplacer, 2) + '\n');
  process.exit(EXIT[status]);
}

// deterministic key order across all objects
function stableReplacer(key, value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted = {};
    for (const k of Object.keys(value).sort()) sorted[k] = value[k];
    return sorted;
  }
  return value;
}

function baseSummary(specsDir) {
  return {
    tool: 'suite-drift',
    specsDir,
    status: 'pass',
    counts: {
      checks: { resolution: 0, dry: 0, staleness: 0, total: 0 },
      edges: { resolution: 0, dry: 0, staleness: 0, total: 0 },
      findings: { fail: 0, malformed: 0, skipped: 0 },
    },
    reconciled: false,
    artifactsSeen: [],
    checks: [],
    findings: [],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.specsDir) {
    process.stderr.write('usage: node scripts/suite-drift.mjs <specs-dir> [--domain <path>] [--skills <dir>]\n');
    const s = baseSummary(null);
    emit(s, 'broken-test');
  }

  const cwd = process.cwd();
  const specsDir = abs(args.specsDir, cwd);
  const domainPath = args.domain ? abs(args.domain, cwd) : null;
  const skillsDir = args.skills ? abs(args.skills, cwd) : resolve(__dirname, '..', 'skills');

  const summary = baseSummary(specsDir);

  // ----- specs dir must exist and be a directory -----
  if (!existsSync(specsDir) || !statSync(specsDir).isDirectory()) {
    process.stderr.write(`BROKEN-TEST: specs dir not found or not a directory: ${specsDir}\n`);
    emit(summary, 'broken-test');
  }

  // ----- intake tables: the ownership contracts. Unparseable => broken-test. -----
  let intakes;
  try {
    intakes = readAllIntakes(skillsDir);
  } catch (e) {
    if (e instanceof ParseError) {
      process.stderr.write(`BROKEN-TEST (intake-table unreadable): ${e.message}\n`);
      emit(summary, 'broken-test');
    }
    process.stderr.write(`BROKEN-TEST (intake reader threw): ${e.stack}\n`);
    emit(summary, 'broken-test');
  }

  // ----- discover artifacts -----
  const art = discoverArtifacts(specsDir);
  const seen = [];
  for (const k of ['01', '02', '03', '04dbml', '04trans']) if (art[k]) seen.push(art[k].path.split(/[\\/]/).pop());
  for (const f of art['05'] || []) seen.push(`05-statecharts/${f.path.split(/[\\/]/).pop()}`);
  for (const f of art['06'] || []) seen.push(`06-gherkin/${f.path.split(/[\\/]/).pop()}`);
  summary.artifactsSeen = seen;

  // VACUOUS-GREEN GUARD: an empty specs dir (no artifacts) => broken-test (zero
  // checks), never a vacuous pass. Also covers the adversarial --no-checks hook.
  if (args._noChecks || seen.length === 0) {
    process.stderr.write(`BROKEN-TEST: ${args._noChecks ? 'check corpus disabled (--no-checks)' : 'no artifacts found in specs dir'} => zero parsed checks (vacuous-green guard).\n`);
    emit(summary, 'broken-test');
  }

  // ----- build the suite model (pinned parse). Unreadable shape => malformed. -----
  let model;
  try {
    model = buildModel(art);
  } catch (e) {
    if (e instanceof ParseError) {
      process.stderr.write(`MALFORMED (artifact parse): ${e.message}\n`);
      summary.findings.push({ id: 'M-parse', class: 'malformed', status: 'fail', severity: 'error', reason: 'unparseable-artifact', detail: e.message, files: [] });
      summary.counts.findings.malformed = 1;
      emit(summary, 'malformed');
    }
    process.stderr.write(`BROKEN-TEST (model build threw): ${e.stack}\n`);
    emit(summary, 'broken-test');
  }

  // ----- run the three mechanical check classes -----
  let resolution, dry, stale;
  try {
    resolution = resolutionChecks(model, art);
    dry = dryChecks(model, art);
    stale = stalenessChecks(art, specsDir, domainPath);
  } catch (e) {
    process.stderr.write(`BROKEN-TEST (check execution threw): ${e.stack}\n`);
    emit(summary, 'broken-test');
  }

  // staleness malformed findings (broken/missing fingerprint shape) => malformed
  if (stale.malformedFindings.length) {
    for (const f of stale.malformedFindings) {
      summary.findings.push(f);
      summary.checks.push({ id: f.id, class: 'staleness', status: 'fail', reason: f.reason });
      process.stderr.write(`MALFORMED [${f.id}]: ${f.detail}\n`);
    }
    summary.counts.findings.malformed = stale.malformedFindings.length;
    summary.counts.checks.staleness = stale.malformedFindings.length;
    summary.counts.checks.total = stale.malformedFindings.length;
    emit(summary, 'malformed');
  }

  // ----- aggregate checks + findings -----
  const allChecks = [...resolution, ...dry, ...stale.findings];

  let edgesRes = 0, edgesDry = 0, edgesStale = 0;
  let failCount = 0, skipCount = 0;

  for (const c of resolution) { edgesRes += c.edges || 0; }
  for (const c of dry) { edgesDry += c.edges || 0; }
  for (const c of stale.findings) { edgesStale += c.edges || 0; }

  for (const c of allChecks) {
    summary.checks.push({ id: c.id, class: c.class, status: c.status, reason: c.reason || null, edges: c.edges || 0 });
    if (c.status === 'fail') {
      failCount++;
      summary.findings.push({ id: c.id, class: c.class, status: 'fail', severity: 'error', reason: c.reason || null, detail: c.detail, files: c.files || [] });
      process.stderr.write(`FAIL [${c.id}/${c.class}/${c.reason || '-'}]: ${c.detail}\n`);
    } else if (c.status === 'skipped') {
      skipCount++;
      summary.findings.push({ id: c.id, class: c.class, status: 'skipped', severity: 'info', reason: c.reason || null, detail: c.detail, files: c.files || [] });
      process.stderr.write(`SKIPPED [${c.id}]: ${c.detail}\n`);
    }
  }

  summary.counts.checks = {
    resolution: resolution.length,
    dry: dry.length,
    staleness: stale.findings.length,
    total: allChecks.length,
  };
  summary.counts.edges = {
    resolution: edgesRes,
    dry: edgesDry,
    staleness: edgesStale,
    total: edgesRes + edgesDry + edgesStale,
  };
  summary.counts.findings = { fail: failCount, malformed: 0, skipped: skipCount };

  // ----- RECONCILIATION / vacuous-green guard -----
  // Zero parsed checks OR zero edges walked across all classes => broken-test.
  // (A suite where nothing actually resolved is not a vacuous green.)
  if (allChecks.length === 0) {
    process.stderr.write('BROKEN-TEST: zero cross-artifact checks parsed (vacuous-green guard).\n');
    emit(summary, 'broken-test');
  }
  if (summary.counts.edges.total === 0) {
    process.stderr.write('BROKEN-TEST: zero edges walked across all checks (vacuous-green guard).\n');
    emit(summary, 'broken-test');
  }
  summary.reconciled = true;

  // ----- VERDICT -----
  if (failCount > 0) emit(summary, 'fail');
  emit(summary, 'pass');
}

main();
