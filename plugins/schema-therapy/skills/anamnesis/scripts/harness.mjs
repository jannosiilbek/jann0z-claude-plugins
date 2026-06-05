#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for the anamnesis bridge (gates G0–G5 + render).
// Implements references/simulation.md EXACTLY:
//   - VENDORED closed-format parsers: S1 brief (lib/brief.mjs), S2 ledger JSONL (lib/ledger.mjs),
//     S4 journal JSONL (lib/journal.mjs), S5 context map (lib/contextmap.mjs).
//   - the S6 deterministic ledger→domain RENDERER (lib/render.mjs) — the strongest oracle, run
//     IN the harness so a render can be re-derived and byte-compared (R-DET), never trusted.
//   - the 37-rule catalog (themes A–F): G0=A, G1=B+C, G2=D, G3=E1–E2, G5=E3–E5, G4=F.
//   - JSON summary (stable key order, sorted checks[]/findings[]/renders[]); exits 0/1/2/3;
//     precedence broken-test > malformed > fail > pass; the vacuous + missing-dir guards;
//     edge reconciliation (§4); the bridge-defect finding class on P-TIER (D4 tier breach).
//
// Node ≥18, plain ESM, ZERO external deps. Usage:
//   node scripts/harness.mjs <project-dir> --gate <g0|merge|dry|handoff|render> [--context <slug>] [--no-checks]

import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as Brief from './lib/brief.mjs';
import * as Ledger from './lib/ledger.mjs';
import * as Journal from './lib/journal.mjs';
import * as Ctx from './lib/contextmap.mjs';
import * as Render from './lib/render.mjs';
import * as C from './lib/checks.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };
// The §6 reconciliation table length: distinct ❌ rules with BOTH a positive and a negative.
const BEHAVIORS_WITH_POS_AND_NEG = 35;
const TOOLING = {
  briefParser: 'vendored-s1', ledgerParser: 'vendored-s2-jsonl',
  journalParser: 'vendored-s4-jsonl', contextMapParser: 'vendored-s5',
  renderer: 'vendored-s6-compiler (in-harness, the R-DET oracle)',
  node: '>=18',
  externalEngine: 'none (no engine exists for evidence-gated claim ledgers; parser + renderer vendored)',
};
// Which gates each mode runs.
const MODE_GATES = {
  g0: ['g0'],
  merge: ['g0', 'g1', 'g2'],
  dry: ['g0', 'g1', 'g2', 'g3'],
  render: ['g0', 'g1', 'g2'],
  handoff: ['g0', 'g1', 'g2', 'g5', 'g4'],
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const o = { dir: null, gate: null, context: null, noChecks: false };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--gate') o.gate = args[++i];
    else if (a === '--context') o.context = args[++i];
    else if (a === '--no-checks') o.noChecks = true;
    else if (a.startsWith('--')) { /* ignore */ }
    else pos.push(a);
  }
  o.dir = pos[0] || null;
  return o;
}

function baseSummary(opt) {
  return {
    skill: 'anamnesis',
    projectDir: opt.dir,
    mode: opt.gate,
    context: opt.context == null ? '-' : opt.context,
    tooling: { ...TOOLING },
    status: 'pass',
    gates: { g0: 'skipped', g1: 'skipped', g2: 'skipped', g3: 'skipped', g5: 'skipped', g4: 'skipped' },
    counts: {
      claims: { total: 0, unconfirmed: 0, confirmed: 0, accident: 0, deferred: 0, locked: 0 },
      evidence: { code: 0, test: 0, doc: 0, data: 0, probe: 0 },
      contexts: 0, rounds: 0, probes: 0,
      checks: { mechanical: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      edgesWalked: 0, edgesExpected: 0,
    },
    renders: [],
    reconciled: false,
    coverage: { behaviorsWithPosAndNeg: BEHAVIORS_WITH_POS_AND_NEG },
    checks: [],
    findings: [],
  };
}

function emit(summary, status) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en') || (a.detail || '').localeCompare(b.detail || '', 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en') || (a.detail || '').localeCompare(b.detail || '', 'en'));
  summary.renders.sort((a, b) => a.file.localeCompare(b.file, 'en'));
  summary.status = status;
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[status]);
}

function brokenTest(summary, reason) {
  process.stderr.write(`BROKEN-TEST: ${reason}\n`);
  summary.status = 'broken-test';
  emit(summary, 'broken-test');
}

function main() {
  const opt = parseArgs(process.argv);
  const summary = baseSummary(opt);

  if (!opt.dir || !opt.gate || !MODE_GATES[opt.gate]) {
    process.stderr.write('usage: node scripts/harness.mjs <project-dir> --gate <g0|merge|dry|handoff|render> [--context <slug>] [--no-checks]\n');
    brokenTest(summary, `missing or invalid --gate / <project-dir> (gate='${opt.gate}')`);
  }
  // vacuous guard.
  if (opt.noChecks) { summary.counts.checks.total = 0; brokenTest(summary, 'check corpus disabled (--no-checks) ⇒ zero executed checks (vacuous-green guard)'); }
  // missing project dir / anamnesis dir.
  if (!existsSync(opt.dir) || !statSync(opt.dir).isDirectory()) brokenTest(summary, `<project-dir> '${opt.dir}' is not a directory`);
  const anamnesisDir = join(opt.dir, 'anamnesis');
  if (!existsSync(anamnesisDir) || !statSync(anamnesisDir).isDirectory()) brokenTest(summary, `no anamnesis/ directory under '${opt.dir}'`);

  const gates = MODE_GATES[opt.gate];
  const runs = (g) => gates.includes(g);
  const checks = [];
  const findings = [];
  let anyMalformed = false;
  let edgesWalked = 0, edgesExpected = 0;

  const readOpt = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);

  // ---- parse artifacts (always parse what the gates will need) --------------
  const briefText = readOpt(join(anamnesisDir, 'brief.md'));
  const ledgerText = readOpt(join(anamnesisDir, 'ledger.jsonl'));
  const journalText = readOpt(join(anamnesisDir, 'probes.log'));
  const mapText = readOpt(join(anamnesisDir, 'context-map.md'));

  const brief = Brief.parse(briefText);
  const journal = Journal.parse(journalText || '');
  const ledger = Ledger.parse(ledgerText || '');
  const map = Ctx.parse(mapText);

  const fail = (r) => { findings.push({ id: r.id, rule: r.rule, gate: r.gate, severity: 'error', detail: r.detail }); };
  const push = (r) => {
    checks.push(r);
    if (r.status === 'fail') fail(r);
  };
  const anyGateFail = (g) => checks.some((c) => c.gate === g && c.status === 'fail');

  // ---- G0 — brief gate (theme A) -------------------------------------------
  if (runs('g0')) {
    if (!brief.present) {
      push(C.rec('B-PARSE', 'mechanical', 'A1', 'g0', 'fail', 'anamnesis/brief.md is absent — no brief, no mining'));
    } else if (brief.parseError) {
      anyMalformed = true;
      push(C.rec('B-PARSE', 'mechanical', 'A1', 'g0', 'fail', `unparseable brief: ${brief.parseError}`));
    } else {
      push(C.rec('B-PARSE', 'mechanical', 'A1', 'g0', 'pass'));
      push(Brief.bCap(brief));
      push(Brief.bTier(brief));
      push(Brief.bProd(brief));
    }
    summary.gates.g0 = anyGateFail('g0') ? 'fail' : 'pass';
  }

  const capMap = Brief.capabilityMap(brief);
  const allConcepts = ledger.claims.map((c) => c.concept);

  // ---- G1 — ledger schema & confirmation (themes B + C) --------------------
  if (runs('g1')) {
    if (ledger.parseError) {
      anyMalformed = true;
      push(C.rec('L-PARSE', 'mechanical', 'B1', 'g1', 'fail', `ledger.jsonl line ${ledger.parseError.line}: ${ledger.parseError.detail}`));
    } else {
      push(C.rec('L-PARSE', 'mechanical', 'B1', 'g1', 'pass'));
      push(Ledger.lId(ledger.claims));
      push(Ledger.lEnum(ledger.claims));
      push(Ledger.lEvid(ledger.claims));
      push(Ledger.lCap(ledger.claims, capMap));
      push(Ledger.lKey(ledger.claims));
      push(Ledger.lRound(ledger.claims, journal.maxRound));
      push(Ledger.lName(ledger.claims));
      push(Ledger.lConfirm(ledger.claims));
      push(Ledger.lPair(ledger.claims));
      push(Ledger.lAcc(ledger.claims));
      push(Ledger.lDef(ledger.claims));
      push(Ledger.lVerdict(ledger.claims));
      push(Ledger.lLockSym(ledger.claims, ledger.byId));
      push(Ledger.lLock(ledger.claims));
    }
    // §4 edges: Σ|claims|×2 (schema + status/lock edge per claim line).
    edgesExpected += ledger.claims.length * 2;
    edgesWalked += ledger.claims.length * 2;
    summary.gates.g1 = anyGateFail('g1') ? 'fail' : 'pass';
  }

  // ---- G2 — probe audit (theme D) ------------------------------------------
  if (runs('g2')) {
    if (journal.parseError) {
      anyMalformed = true;
      push(C.rec('P-PARSE', 'mechanical', 'D1', 'g2', 'fail', `probes.log line ${journal.parseError.line}: ${journal.parseError.detail}`));
    } else {
      push(C.rec('P-PARSE', 'mechanical', 'D1', 'g2', 'pass'));
      push(Journal.pJrn(ledger.claims, journal));
      push(Journal.pCap(journal, capMap));
      const tier = Journal.pTier(journal, capMap);
      checks.push(tier);
      if (tier.status === 'fail') findings.push({ id: 'P-TIER', rule: 'D4', gate: 'g2', severity: 'error', class: 'bridge-defect', detail: tier.detail });
    }
    // §4 edges: Σ|probe-class evidence lines| (P-JRN) + Σ|journal entries| (P-PARSE).
    let probeEv = 0;
    for (const c of ledger.claims) for (const ev of c.evidence) if (ev.class === 'probe') probeEv += 1;
    const journalEntries = journal.rounds.length + journal.probes.length;
    edgesExpected += probeEv + journalEntries;
    edgesWalked += probeEv + journalEntries;
    summary.gates.g2 = anyGateFail('g2') ? 'fail' : 'pass';
  }

  // ---- G3 — dry & readiness (E1–E2) ----------------------------------------
  if (runs('g3')) {
    push(Journal.dSeq(journal));
    push(Journal.dDry(ledger.claims, journal));
    summary.gates.g3 = anyGateFail('g3') ? 'fail' : 'pass';
  }

  // ---- context scoping for G5 + G4 -----------------------------------------
  const multi = Ctx.multiContext(map);
  const slug = opt.context == null ? '-' : opt.context;
  // a missing required --context ⇒ broken-test.
  if ((runs('g5') || runs('g4')) && multi && opt.context == null) {
    brokenTest(summary, 'context map has >1 context but --context was not supplied');
  }
  const conceptSet = Ctx.conceptsForContext(map, slug, allConcepts);

  // ---- G5 — handoff readiness (E3–E5) --------------------------------------
  if (runs('g5')) {
    push(Ctx.sUnconf(ledger.claims, conceptSet));
    push(Ctx.sLock(ledger.claims, conceptSet));
    push(Ctx.sMap(map, allConcepts));
    // §4 edges: Σ|context-map entries| (S-MAP: each concept→context assignment).
    const mapEntries = map.present ? map.contexts.reduce((n, c) => n + c.concepts.length, 0) : 0;
    edgesExpected += mapEntries;
    edgesWalked += mapEntries;
    summary.gates.g5 = anyGateFail('g5') ? 'fail' : 'pass';
  }

  // ---- render mode: emit the S6 file, record renders[] ---------------------
  const ledgerBytes = ledgerText || '';
  const canRender = !ledger.parseError && (!runs('g0') || (brief.present && !brief.parseError));
  if (opt.gate === 'render') {
    if (!canRender) brokenTest(summary, 'render mode requires a parseable brief + ledger (run G0/G1/G2 clean first)');
    const fileName = Render.domainFileName(slug, multi);
    const out = Render.render(ledgerBytes, ledger.claims, slug, projectName(brief, briefText), conceptSet);
    writeFileSync(join(opt.dir, fileName), out);
    const st = Render.renderStats(ledger.claims, slug, conceptSet);
    summary.renders.push({ file: fileName, context: slug, sha256: Render.sha256(ledgerBytes), claims: st.claims, openQuestions: st.openQuestions });
  }

  // ---- G4 — render boundary oracle (theme F) -------------------------------
  if (runs('g4')) {
    const fileName = Render.domainFileName(slug, multi);
    const onDisk = readOpt(join(opt.dir, fileName));
    const expected = Render.render(ledgerBytes, ledger.claims, slug, projectName(brief, briefText), conceptSet);
    push(Render.rResolve(onDisk, ledger.byId));
    push(Render.rStatus(onDisk, ledger.byId));
    push(Render.rCov(onDisk, ledger.claims, conceptSet));
    push(Render.rAcc(onDisk, ledger.claims, conceptSet));
    push(Render.rDet(onDisk, expected));
    push(Render.rHdr(onDisk, ledgerBytes));
    push(Render.rCtx(onDisk, ledger.claims, slug, conceptSet, fileName, multi));
    // warn-only: never block, never enter findings.
    checks.push(Render.rSmell(ledger.claims, conceptSet));
    checks.push(Render.rSize(ledger.claims, conceptSet));
    // record the render compared (renders[] non-empty in handoff too).
    const st = Render.renderStats(ledger.claims, slug, conceptSet);
    summary.renders.push({ file: fileName, context: slug, sha256: Render.sha256(ledgerBytes), claims: st.claims, openQuestions: st.openQuestions });
    // §4 edges: Σ|render annotations| (R-RESOLVE: each [CLM-nnnn] resolves).
    const annots = onDisk ? (onDisk.match(/\[CLM-\d{4,}\]/g) || []).length : 0;
    edgesExpected += annots;
    edgesWalked += annots;
    summary.gates.g4 = anyGateFail('g4') ? 'fail' : 'pass';
  }

  // ---- counts ---------------------------------------------------------------
  for (const c of ledger.claims) {
    summary.counts.claims.total += 1;
    if (summary.counts.claims[c.status] != null) summary.counts.claims[c.status] += 1;
    if (Ledger.isLocked(c)) summary.counts.claims.locked += 1;
    for (const ev of c.evidence) if (summary.counts.evidence[ev.class] != null) summary.counts.evidence[ev.class] += 1;
  }
  summary.counts.contexts = map.present ? map.contexts.length : 1;
  summary.counts.rounds = journal.maxRound;
  summary.counts.probes = journal.probes.length;

  for (const c of checks) {
    const cls = c.class === 'agentJudged' ? 'agentJudged' : c.class;
    if (summary.counts.checks[cls] != null) summary.counts.checks[cls] += 1;
  }
  summary.counts.checks.total = checks.length;
  summary.counts.edgesWalked = edgesWalked;
  summary.counts.edgesExpected = edgesExpected;

  summary.checks = checks;
  summary.findings = findings;

  // ---- status (§4 reconciliation + precedence) ------------------------------
  const executedChecks = checks.length;
  summary.reconciled = C.reconcile({ edgesWalked, edgesExpected, executedChecks });
  const hasFail = checks.some((c) => c.status === 'fail') || findings.length > 0;
  const verdict = C.reconcileStatus({ edgesWalked, edgesExpected, executedChecks, anyMalformed, hasFail });
  if (verdict.status === 'broken-test') process.stderr.write(`BROKEN-TEST: ${verdict.reason}\n`);
  emit(summary, verdict.status);
}

// project name from the brief's `- project: <name>` line, else the dir basename.
function projectName(brief, briefText) {
  if (briefText) {
    const m = briefText.match(/^-\s*project:\s*(.+)$/m);
    if (m) return m[1].trim();
    const t = briefText.match(/^#\s+Anamnesis Brief\s*—\s*(.+)$/m);
    if (t) return t[1].trim();
  }
  return 'project';
}

main();
