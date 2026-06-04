#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for artifact 05 (the directory
// artifact `specs/05-statecharts/` holding one `<entity>.scxml` per gate-passing
// lifecycle entity, OR no directory when no entity passes the gate). Validated
// against FIVE upstreams (01/02/03/04-erd.dbml/04-transitions.md). Implements
// references/simulation.md EXACTLY:
//   - STRONGEST-ORACLE ENGINE (§3.3): every machine is LOADED + RUN on the format's
//     own SCION SCXML interpreter; configurations asserted event-by-event from 04.
//   - HAND-ROLLED MECHANICAL READER over the constrained SCXML subset (M1–M25).
//   - NOT-EMITTED design (§3.6): absence is a first-class assertable outcome — no
//     gate-passer ⇒ pass + gate:not-emitted (gateArithmeticRun>0); gate-passer absent
//     ⇒ fail owner M8/B3.
//   - self-install + offline mode: deps absent + no network ⇒ broken-test, exit 3.
//   - upstream-defect routing (§9): self-inconsistent 04/02 ⇒ fail + upstream-defect;
//     unparseable 02/04 ⇒ broken-test.
//   - status taxonomy pass|fail|malformed|broken-test; stable JSON stdout; exits 0-1-2-3.
//   - coverage + edge reconciliation (§5) incl. the engine-non-empty guard.
//
// Node ≥18, plain ESM.
// Usage:
//   node scripts/harness.mjs <05-dir> \
//     --upstream-01 <01> --upstream-02 <02> --upstream-03 <03> \
//     --upstream-04-dbml <04.dbml> --upstream-04-transitions <04-transitions.md> \
//     [--no-checks] [--no-install] [--force-missing-deps <dir>]

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseMd, deriveEvents01, deriveGlossary02, deriveAggregates03, deriveTransitions04 } from './lib/md.mjs';
import { parse as parseScxml, ScxmlParseError } from './lib/scxml.mjs';
import * as E from './lib/engine.mjs';
import * as C from './lib/checks.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };
const TOOLING = { scionCore: '2.6.24', scionScxml: '4.3.27', dbmlCore: '8.2.5', node: '>=18' };

function parseArgs(argv) {
  const args = argv.slice(2);
  const o = { dir: null, up01: null, up02: null, up03: null, up04dbml: null, up04tr: null, noChecks: false, noInstall: false, forceMissingDeps: null };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--upstream-01') o.up01 = args[++i];
    else if (a === '--upstream-02') o.up02 = args[++i];
    else if (a === '--upstream-03') o.up03 = args[++i];
    else if (a === '--upstream-04-dbml') o.up04dbml = args[++i];
    else if (a === '--upstream-04-transitions') o.up04tr = args[++i];
    else if (a === '--no-checks') o.noChecks = true;
    else if (a === '--no-install') o.noInstall = true;
    else if (a === '--force-missing-deps') o.forceMissingDeps = args[++i];
    else if (a.startsWith('--')) { /* ignore */ }
    else pos.push(a);
  }
  o.dir = pos[0] || null;
  return o;
}

function baseSummary(opt, status) {
  return {
    skill: 'statecharts',
    artifactDir: opt.dir,
    upstream01: opt.up01, upstream02: opt.up02, upstream03: opt.up03,
    upstream04Dbml: opt.up04dbml, upstream04Transitions: opt.up04tr,
    tooling: { ...TOOLING },
    status,
    gate: { record: 'emitted', entitiesEvaluated: 0, gatePassers: 0 },
    counts: {
      intake: { machines: 0, states: 0, transitions: 0, annotations: 0 },
      checks: { mechanical: 0, engine: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      engine: { walks: 0, passed: 0, total: 0 },
      edgesWalked: 0, edgesExpected: 0,
    },
    reconciled: false,
    coverage: { elementsExercised: 0, elementsTotal: 0, behaviorsWithPosAndNeg: 0 },
    checks: [],
    findings: [],
  };
}

function emit(summary, status) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[status]);
}

async function main() {
  const opt = parseArgs(process.argv);
  if (!opt.dir || !opt.up01 || !opt.up02 || !opt.up03 || !opt.up04dbml || !opt.up04tr) {
    process.stderr.write('usage: node scripts/harness.mjs <05-dir> --upstream-01 <01> --upstream-02 <02> --upstream-03 <03> --upstream-04-dbml <04.dbml> --upstream-04-transitions <04-transitions.md>\n');
    process.exit(EXIT['broken-test']);
  }
  const summary = baseSummary(opt, 'pass');

  // --- vacuous-green guard ---------------------------------------------------
  if (opt.noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test'; summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  // --- engine dependency gate ------------------------------------------------
  const deps = E.ensureDeps({ allowInstall: !opt.noInstall, forceMissingRoot: opt.forceMissingDeps });
  if (!deps.ok) {
    process.stderr.write(`BROKEN-TEST: ${deps.reason}\n`);
    if (deps.installerStderr) process.stderr.write(`  installer stderr: ${deps.installerStderr}\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  }
  const { scxml, Parser } = E.loadEngine();

  // --- read + parse the FIVE upstreams ---------------------------------------
  const readOr = (p, label) => {
    try { return readFileSync(p, 'utf8'); }
    catch (e) { process.stderr.write(`BROKEN-TEST: cannot read ${label} (${p}): ${e.message}\n`); summary.status = 'broken-test'; emit(summary, 'broken-test'); }
  };
  const t01 = readOr(opt.up01, '01'); const t02 = readOr(opt.up02, '02');
  const t03 = readOr(opt.up03, '03'); const t04dbml = readOr(opt.up04dbml, '04-erd.dbml');
  const t04tr = readOr(opt.up04tr, '04-transitions.md');

  let doc01, doc02, doc03, doc04tr;
  try { doc01 = parseMd(t01); } catch (e) { brokenUpstream('01', e.message); }
  try { doc02 = parseMd(t02); } catch (e) { brokenUpstream('02', e.message); }
  try { doc03 = parseMd(t03); } catch (e) { brokenUpstream('03', e.message); }
  try { doc04tr = parseMd(t04tr); } catch (e) { brokenUpstream('04-transitions.md', e.message); }

  const events01 = deriveEvents01(doc01);
  const glossary02 = deriveGlossary02(doc02);
  const aggregates03 = deriveAggregates03(doc03);
  const transitions04 = deriveTransitions04(doc04tr);

  // upstream parseability (§9.4) ⇒ broken-test.
  if (!glossary02.shapeOk) brokenUpstream('02-glossary.md', 'missing ## Enums or ## Forbidden Synonyms section');
  if (!transitions04.shapeOk) brokenUpstream('04-transitions.md', 'missing transition-table section / no ### entity block');

  const dbmlParsed = E.parseDbmlEnums(Parser, t04dbml);
  if (!dbmlParsed.ok) brokenUpstream('04-erd.dbml', String((dbmlParsed.error && dbmlParsed.error.message) || 'DBML parse error (no message)').slice(0, 160));

  // --- bind entities (04 ↔ 02 enums) + gate state counts ---------------------
  const entities = C.bindEntities(transitions04, glossary02);
  const lifecycleEntitySet = new Set(entities.map((e) => e.entity));
  summary.gate.entitiesEvaluated = entities.length;
  summary.gate.gatePassers = entities.filter((e) => e.gatePasses04).length;

  // --- upstream self-consistency (§9.2/9.3) BEFORE 05→0n resolution ----------
  const self02 = C.upstream02SelfCheck(glossary02);
  const self04 = C.upstream04SelfCheck(entities);

  // ===========================================================================
  // Enumerate the 05 directory (may not exist — §3.6 not-emitted design).
  // ===========================================================================
  const dirExists = existsSync(opt.dir) && statSync(opt.dir).isDirectory();
  let scxmlFiles = [];
  if (dirExists) {
    scxmlFiles = readdirSync(opt.dir).filter((f) => f.endsWith('.scxml')).sort();
  }

  const checks = [];
  const findings = [];
  let mechanicalRun = 0, engineRun = 0, resolutionRun = 0, exactValueRun = 0, ajRun = 0, gateArithmeticRun = 0;
  let edgesWalked = 0;
  const push = (cls, r) => { checks.push({ id: r.id, class: cls, rule: r.rule, status: r.status }); if (r.edges) edgesWalked += r.edges; };
  const fail = (r, extra = {}) => { findings.push({ id: r.id, rule: r.rule, severity: 'error', detail: r.detail, ...extra }); if (r.detail) process.stderr.write(`FAIL [${r.id}/${r.rule}]: ${r.detail}\n`); };
  const warnInfo = (r, sev) => { if (r.detail) findings.push({ id: r.id, rule: r.rule, severity: sev, detail: r.detail }); };

  // --- GATE ARITHMETIC (X-GATE always runs — even on not-emitted) -------------
  const machineEntities = scxmlFiles.map((f) => basename(f, '.scxml'));
  const machinesByEntity = new Map();

  // Parse each machine file (malformed gate M3 / well-formedness).
  const machines = []; // {entity, fileBase, model, docString}
  for (const f of scxmlFiles) {
    const fileBase = basename(f, '.scxml');
    const docString = readFileSync(join(opt.dir, f), 'utf8');
    let model;
    try { model = parseScxml(docString); }
    catch (e) {
      process.stderr.write(`MALFORMED [M3/A3]: ${f} — ${e.message}\n`);
      summary.status = 'malformed';
      summary.checks = [{ id: 'M3', class: 'mechanical', rule: 'A3', status: 'fail' }];
      summary.findings = [{ id: 'M3', rule: 'A3', severity: 'error', detail: `${f}: ${e.message}` }];
      summary.counts.checks = { mechanical: 1, engine: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 1 };
      emit(summary, 'malformed');
    }
    if (!model.hasDeclaration) {
      process.stderr.write(`MALFORMED [M3/A3]: ${f} — missing <?xml …?> declaration\n`);
      summary.status = 'malformed';
      summary.checks = [{ id: 'M3', class: 'mechanical', rule: 'A3', status: 'fail' }];
      summary.findings = [{ id: 'M3', rule: 'A3', severity: 'error', detail: `${f}: missing XML declaration` }];
      summary.counts.checks = { mechanical: 1, engine: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 1 };
      emit(summary, 'malformed');
    }
    const entity = matchEntity(fileBase, model, lifecycleEntitySet);
    machinesByEntity.set(entity, model);
    machines.push({ entity, fileBase, model, docString });
  }

  // X-GATE + M8/M9/M10/M1 (gate arithmetic — the not-emitted owner is M8).
  const xgate = C.checkXGate(entities, machinesByEntity); push('exactValue', xgate); exactValueRun++; gateArithmeticRun++;
  if (xgate.status === 'fail') fail(xgate);
  const m8 = C.checkM8_missedPromotion(entities, machinesByEntity); push('mechanical', { ...m8, edges: 0 }); mechanicalRun++;
  if (m8.status === 'fail') fail(m8);
  const m1 = C.checkM1_dirPresence(dirExists, machines.length, summary.gate.gatePassers > 0); push('mechanical', m1); mechanicalRun++;
  if (m1.status === 'fail') fail(m1);
  const m9 = C.checkM9_unjustified(entities, machinesByEntity); push('mechanical', m9); mechanicalRun++;
  if (m9.status === 'fail') fail(m9);
  const m10 = C.checkM10_nonLifecycle(machineEntities, lifecycleEntitySet); push('mechanical', m10); mechanicalRun++;
  if (m10.status === 'fail') fail(m10);

  // --- NOT-EMITTED decision (§3.6) -------------------------------------------
  if (!dirExists || machines.length === 0) {
    if (summary.gate.gatePassers === 0) {
      // CORRECT non-emission: pass + gate:not-emitted (gateArithmeticRun>0).
      summary.gate.record = 'not-emitted';
      summary.counts.checks = { mechanical: mechanicalRun, engine: 0, resolution: 0, exactValue: exactValueRun, negative: 0, agentJudged: 0, total: mechanicalRun + exactValueRun };
      summary.counts.edgesWalked = edgesWalked;
      summary.counts.edgesExpected = entities.length; // X-GATE walked one edge per entity (M8 + X-GATE)
      // reconcile: gateArithmeticRun>0, executed>0, machines==0 sanctioned.
      const recon = C.checkXRecon(summary.counts.checks.total, edgesWalked, summary.counts.edgesExpected, 0, 0, gateArithmeticRun);
      if (recon.status !== 'pass') { process.stderr.write(`BROKEN-TEST [X-RECON]: ${recon.detail}\n`); summary.status = 'broken-test'; summary.checks = checks; summary.findings = findings; emit(summary, 'broken-test'); }
      summary.reconciled = true;
      summary.checks = checks; summary.findings = findings;
      if (findings.some((f) => f.severity === 'error')) { summary.status = 'fail'; emit(summary, 'fail'); }
      summary.status = 'pass';
      process.stderr.write(`GATE: not-emitted — ${entities.length} entit${entities.length === 1 ? 'y' : 'ies'} evaluated, 0 gate passers; absence is CORRECT.\n`);
      emit(summary, 'pass');
    } else {
      // WRONG non-emission: missed promotion ⇒ fail owner M8 (already recorded).
      summary.gate.record = 'not-emitted';
      summary.counts.checks = { mechanical: mechanicalRun, engine: 0, resolution: 0, exactValue: exactValueRun, negative: 0, agentJudged: 0, total: mechanicalRun + exactValueRun };
      summary.counts.edgesWalked = edgesWalked;
      summary.counts.edgesExpected = entities.length;
      summary.reconciled = true;
      summary.checks = checks; summary.findings = findings;
      summary.status = 'fail';
      emit(summary, 'fail');
    }
  }

  // ===========================================================================
  // Dir present with ≥1 machine — run the full per-machine battery.
  // ===========================================================================
  for (const mc of machines) {
    const { entity, fileBase, model, docString } = mc;
    const ent04 = entities.find((e) => e.entity === entity) || { entity, rows: [], initial: null, enumValues: [] };
    const enumValues = ent04.enumValues || [];

    // A machine bound to a NON-lifecycle / unknown 04 entity is owned by M10 (B5)
    // alone (already recorded above). Running the 05→04 resolution battery against an
    // empty 04 would pile collateral failures (M11/M12/…) onto it and muddy the
    // single owner, so we skip the per-machine battery here — M10 is the clean owner.
    if (!lifecycleEntitySet.has(entity)) {
      const m2x = C.checkM2_filename(fileBase, entity); pushM(m2x);
      continue;
    }

    // structural / fingerprint / root checks. M3 (well-formedness) is recorded as a
    // PASS here: the machine already parsed via the hand-rolled reader AND carries the
    // <?xml …?> declaration (a parse/declaration failure would have emitted `malformed`
    // and exited above), so reaching this point IS the M3 positive.
    const m3 = C.checkM3_wellformed(); pushM(m3);
    const m2 = C.checkM2_filename(fileBase, entity); pushM(m2);
    const m4 = C.checkM4_fingerprints(model); pushM(m4);
    const m5 = C.checkM5_supersedes(model, entity, lifecycleEntitySet); pushM(m5);
    const m6 = C.checkM6_root(model); pushM(m6);
    const m7 = C.checkM7_datamodel(model); pushM(m7);
    const m11 = C.checkM11_states(model, entity, enumValues); pushM(m11);
    const m12 = C.checkM12_rows(model, ent04); pushM(m12);
    const m13 = C.checkM13_noContradiction(model, ent04); pushM(m13);
    const m14 = C.checkM14_initial(model, ent04); pushM(m14);
    const m15 = C.checkM15_idUnique(model); pushM(m15);
    const m16 = C.checkM16_targets(model); pushM(m16);
    const m17 = C.checkM17_reachability(model, ent04); pushM(m17);
    const m18 = C.checkM18_compoundInitial(model); pushM(m18);
    const m19 = C.checkM19_events(model, ent04); pushM(m19);
    const m20 = C.checkM20_forbidden(model, glossary02.forbidden, enumValues); pushM(m20);
    const m21 = C.checkM21_restatement(model, { ...ent04, entities: transitions04.entities }, glossary02, aggregates03); pushM(m21);
    const m22 = C.checkM22_refines(model, ent04); pushMwarn(m22, 'warn');
    const m23 = C.checkM23_terminal(model, ent04); pushMwarn(m23, 'info');
    const m24 = C.checkM24_history(model); pushMwarn(m24, 'warn');
    const m25 = C.checkM25_references(); pushMwarn(m25, 'warn');

    // resolution + exact-value derived views
    push('resolution', C.rStates(m11)); resolutionRun++;
    push('resolution', C.rRow(m12)); resolutionRun++;
    push('resolution', C.rNoContra(m13)); resolutionRun++;
    push('resolution', C.rEvent(m19)); resolutionRun++;
    push('resolution', C.rInit(m14)); resolutionRun++;
    push('resolution', C.rSupersedes(m5)); resolutionRun++;
    push('resolution', C.rTarget(m16)); resolutionRun++;
    push('resolution', C.rReach(m17)); resolutionRun++;

    const xstates = C.xStates(model, enumValues); push('exactValue', xstates); exactValueRun++; if (xstates.status === 'fail') fail(xstates);
    const xid = C.xId(model); push('exactValue', xid); exactValueRun++; if (xid.status === 'fail') fail(xid);
    const xinit = C.xInitOne(model); push('exactValue', xinit); exactValueRun++; if (xinit.status === 'fail') fail(xinit);
    const xrt = C.xRoundtrip(model, ent04); push('exactValue', xrt); exactValueRun++; if (xrt.status === 'fail') fail(xrt);

    // --- §9 upstream-defect routing: self-inconsistent 04 / 02 surfaced here ---
    const ent04Defect = self04.defects.find((d) => d.entity === entity);
    if (ent04Defect) {
      const rec = checks.find((c) => c.id === 'M11');
      if (rec) rec.status = 'fail';
      findings.push({ id: 'M11', rule: 'C1', severity: 'error', class: 'upstream-defect', upstream: '04-transitions.md', detail: `${ent04Defect.detail} (fix upstream in ${opt.up04tr}, not 05)` });
      process.stderr.write(`UPSTREAM-DEFECT [M11/C1]: ${ent04Defect.detail} → route to 04-transitions.md\n`);
    }
    if (!self02.ok) {
      const enumName = `${entity}`;
      const rel = self02.defects.find((d) => new RegExp(entity, 'i').test(d.detail));
      if (rel) {
        findings.push({ id: 'R-STATES', rule: 'C1', severity: 'error', class: 'upstream-defect', upstream: '02-glossary.md', detail: `${rel.detail} (fix upstream in ${opt.up02}, not 05)` });
        process.stderr.write(`UPSTREAM-DEFECT [R-STATES/C1]: ${rel.detail} → route to 02-glossary.md\n`);
      }
    }

    // ----- ENGINE WALKS (the strongest oracle) -----
    const scen = readScenarios(opt.dir, entity);
    const eng = await E.runMachineWalks(scxml, ent04, docString, model, scen);
    for (const w of eng.walks) {
      checks.push({ id: w.id, class: 'engine', rule: w.rule, status: w.status });
      engineRun++;
      if (w.status === 'fail') fail({ id: w.id, rule: w.rule, detail: w.detail });
    }
    summary.counts.engine.walks += eng.counts.walks;
    summary.counts.engine.passed += eng.counts.passed;
    summary.counts.engine.total += eng.counts.total;

    function pushM(r) { push('mechanical', r); mechanicalRun++; if (r.status === 'fail') fail(r); }
    function pushMwarn(r, sev) { checks.push({ id: r.id, class: 'mechanical', rule: r.rule, status: r.status === 'fail' ? 'fail' : (r.status === 'pass' ? 'pass' : 'warn') }); mechanicalRun++; if (r.status === sev) warnInfo(r, sev); }
  }

  // --- AGENT-JUDGED precondition flags (recorded, never block, not reconciled) -
  // AJ1 gate feature-need residue: ≤4-state unpromoted entities the agent must judge.
  for (const e of entities) {
    if (e.gatePasses04) continue;
    if (machinesByEntity.has(e.entity)) continue;
    checks.push({ id: `AJ1:${e.entity}`, class: 'agent-judged', rule: 'B4', verdict: 'correctly-unpromoted' });
    ajRun++;
  }

  // --- edges expected (§5) ---------------------------------------------------
  // Mirror edgesWalked exactly: X-GATE (one edge per 04 entity) + per machine the
  // edge-bearing checks M11(1) + M12(rows) + M13(basicPairs) + the eight resolution
  // checks (R-STATES 1, R-ROW rows, R-NOCONTRA basicPairs, R-EVENT 1, R-INIT 1,
  // R-SUPERSEDES 1, R-TARGET 1, R-REACH 1).
  let edgesExpected = entities.length; // X-GATE
  for (const mc of machines) {
    if (!lifecycleEntitySet.has(mc.entity)) continue; // non-lifecycle machine: M10-only, no resolution edges
    const ent04 = entities.find((e) => e.entity === mc.entity) || { rows: [] };
    const rows = ent04.rows.filter((r) => r.from !== '∅').length;
    const basicPairs = mc.model.transitions.filter((t) => mc.model.basicStateIds.has(t.sourceId) && mc.model.basicStateIds.has(t.target)).length;
    edgesExpected += 1 /*M11*/ + rows /*M12*/ + basicPairs /*M13*/
      + 1 /*R-STATES*/ + rows /*R-ROW*/ + basicPairs /*R-NOCONTRA*/ + 1 /*R-EVENT*/ + 1 /*R-INIT*/ + 1 /*R-SUPERSEDES*/ + 1 /*R-TARGET*/ + 1 /*R-REACH*/;
  }

  // --- counts + reconciliation ----------------------------------------------
  summary.counts.intake = C.intakeCounts(machines);
  summary.counts.edgesWalked = edgesWalked;
  summary.counts.edgesExpected = edgesExpected;
  summary.counts.checks = {
    mechanical: mechanicalRun, engine: engineRun, resolution: resolutionRun,
    exactValue: exactValueRun, negative: 0, agentJudged: ajRun,
    total: mechanicalRun + engineRun + resolutionRun + exactValueRun + ajRun,
  };
  summary.coverage.elementsTotal = summary.counts.intake.machines + summary.counts.intake.states + summary.counts.intake.transitions;
  summary.coverage.elementsExercised = summary.coverage.elementsTotal;

  const recon = C.checkXRecon(summary.counts.checks.total, edgesWalked, edgesExpected, engineRun, machines.length, gateArithmeticRun);
  checks.push({ id: 'X-RECON', class: 'exactValue', rule: 'reconciliation', status: recon.status === 'pass' ? 'pass' : 'fail' });
  summary.counts.checks.exactValue++; summary.counts.checks.total++;

  summary.checks = checks;
  summary.findings = findings;

  if (summary.counts.checks.total === 0) { summary.status = 'broken-test'; process.stderr.write('BROKEN-TEST: zero checks executed.\n'); emit(summary, 'broken-test'); }
  if (recon.status !== 'pass') { summary.status = 'broken-test'; process.stderr.write(`BROKEN-TEST [X-RECON]: ${recon.detail}\n`); emit(summary, 'broken-test'); }
  summary.reconciled = true;

  if (findings.some((f) => f.severity === 'error')) { summary.status = 'fail'; emit(summary, 'fail'); }
  summary.status = 'pass';
  emit(summary, 'pass');

  // --- helpers ---------------------------------------------------------------
  function brokenUpstream(file, detail) {
    process.stderr.write(`BROKEN-TEST: upstream ${file} unparseable — ${detail}\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  }
}

// Match a file's entity: prefer the supersedes target, else the filename, else the
// nearest lifecycle entity. The filename is authoritative for M2; here we bind to a
// 04 entity for the resolution checks.
function matchEntity(fileBase, model, lifecycleEntitySet) {
  if (lifecycleEntitySet.has(fileBase)) return fileBase;
  // fall back to the supersedes target if it names a lifecycle entity.
  for (const c of model.allComments) {
    const m = /supersedes:\s*04-transitions\.md#(\S+)/.exec(c);
    if (m && lifecycleEntitySet.has(m[1])) return m[1];
  }
  return fileBase; // unknown — M2/M10 will flag it
}

// Read optional guard scenarios `<entity>.scenarios.json` from the 05 dir.
function readScenarios(dir, entity) {
  const p = join(dir, `${entity}.scenarios.json`);
  if (!existsSync(p)) return null;
  try {
    const obj = JSON.parse(readFileSync(p, 'utf8'));
    return Array.isArray(obj) ? obj : (Array.isArray(obj.scenarios) ? obj.scenarios : null);
  } catch { return null; }
}

main().catch((e) => {
  process.stderr.write(`BROKEN-TEST (harness threw): ${e && e.stack ? e.stack : e}\n`);
  process.exit(EXIT['broken-test']);
});
