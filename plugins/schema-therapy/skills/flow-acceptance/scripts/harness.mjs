#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for artifact 10 (the directory artifact
// `specs/10-flow-acceptance/` holding one `<persona>-<job>.feature` per 08 task model — a
// bijection with the 08 models). Validated against THREE upstreams (06/08/09). Implements
// references/simulation.md EXACTLY:
//   - STRONGEST-ORACLE ENGINE (§3.3, W-*): every .feature is PARSED on @cucumber/gherkin
//     39.1.0 AND COMPILED to pickles; parse-clean + ≥1 pickle is the instantiation assertion
//     (zero pickles ⇒ vacuous ⇒ fail W-INST); a parse throw ⇒ malformed, matched to the
//     testdata/bad oracle shape.
//   - WALK-REPLAY ORACLE (§3.3, V-*): the ordered step chain is REPLAYED over the persona's
//     09 graph (start-from-home, real-edge-in-order, 08-nominal-leaf-order) + cross-referenced
//     to the 08 walker + 06 tag set.
//   - MECHANICAL CHECKS over the AST (§2, M-*/R-*): bijection, filename, feature name,
//     fingerprint, feattag, then-shape, when-form, persona, no-06-body, declarative, one-when,
//     gwt + warn-only residue.
//   - self-install + offline mode: deps absent + no network ⇒ broken-test, exit 3.
//   - upstream-defect routing (§9): dangling-09-in-path / stuck-08-walker ⇒ fail +
//     upstream-defect → the named 09/08 file; unparseable 06/08/09 ⇒ broken-test.
//   - ids never asserted (IdGenerator.incrementing()); status pass|fail|malformed|broken-test;
//     stable JSON stdout (incl. walks[]); exits 0-1-2-3; coverage + edge reconciliation.
//
// Node ≥18, plain ESM.
// Usage:
//   node scripts/harness.mjs <10-dir> \
//     --upstream-06 <06-gherkin-dir> --upstream-08 <08-task-models-dir> \
//     --upstream-09 <09-ui-flows-dir> [--no-checks] [--no-install] [--force-missing-deps <dir>]

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import * as E from './lib/engine.mjs';
import * as ifml from './lib/ifml.mjs';
import * as ctt from './lib/taskmodel.mjs';
import { scanDir as scanTags } from './lib/tags.mjs';
import * as C from './lib/checks.mjs';
import { astScenarios, walkSteps } from './lib/steps.mjs';
import { replay } from './lib/replay.mjs';
import { jobFromStem, personaFromStem } from './lib/checks.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };
const TOOLING = { gherkin: '39.1.0', messages: '32.3.1', ifmlReader: 'copied-from-09', cttWalker: 'copied-from-08', tagScanner: 'copied-from-08', node: '>=18' };

function parseArgs(argv) {
  const args = argv.slice(2);
  const o = { dir: null, up06: null, up08: null, up09: null, noChecks: false, noInstall: false, forceMissingDeps: null };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--upstream-06') o.up06 = args[++i];
    else if (a === '--upstream-08') o.up08 = args[++i];
    else if (a === '--upstream-09') o.up09 = args[++i];
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
    skill: 'flow-acceptance',
    artifactDir: opt.dir,
    upstream06: opt.up06, upstream08: opt.up08, upstream09: opt.up09,
    tooling: { ...TOOLING },
    status,
    counts: {
      intake: { features: 0, scenarios: 0, steps: 0, bindings: 0 },
      checks: { engine: 0, replay: 0, resolution: 0, negative: 0, agentJudged: 0, total: 0 },
      engine: { parsed: 0, compiled: 0, pickles: 0, total: 0 },
      replay: { walks: 0, stranded: 0, total: 0 },
      edgesWalked: 0, edgesExpected: 0,
    },
    reconciled: false,
    walks: [],
    checks: [],
    findings: [],
  };
}

function emit(summary, status) {
  summary.checks.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  summary.walks.sort((a, b) => a.feature.localeCompare(b.feature, 'en'));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(EXIT[status]);
}

function listFiles(dir, ext) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  return readdirSync(dir).filter((f) => f.endsWith(ext)).sort();
}

async function main() {
  const opt = parseArgs(process.argv);
  if (!opt.dir || !opt.up06 || !opt.up08 || !opt.up09) {
    process.stderr.write('usage: node scripts/harness.mjs <10-dir> --upstream-06 <06-dir> --upstream-08 <08-dir> --upstream-09 <09-dir>\n');
    process.exit(EXIT['broken-test']);
  }
  const summary = baseSummary(opt, 'pass');

  // --- vacuous-green guard ---------------------------------------------------
  if (opt.noChecks) {
    process.stderr.write('BROKEN-TEST: check corpus disabled (--no-checks) ⇒ zero parsed checks (vacuous-green guard).\n');
    summary.status = 'broken-test'; summary.counts.checks.total = 0;
    emit(summary, 'broken-test');
  }

  // --- parser dependency gate ------------------------------------------------
  const deps = E.ensureDeps({ allowInstall: !opt.noInstall, forceMissingRoot: opt.forceMissingDeps });
  if (!deps.ok) {
    process.stderr.write(`BROKEN-TEST: ${deps.reason}\n`);
    if (deps.installerStderr) process.stderr.write(`  installer stderr: ${deps.installerStderr}\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  }
  const engine = E.loadEngine();

  const brokenUpstream = (file, detail) => {
    process.stderr.write(`BROKEN-TEST: upstream ${file} unparseable — ${detail}\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  };

  // --- read + scan 06 (tag vocabulary) ---------------------------------------
  const files06 = listFiles(opt.up06, '.feature');
  if (files06 == null) brokenUpstream('06-gherkin/', `--upstream-06 '${opt.up06}' is not a directory`);
  const feats06 = files06.map((f) => ({ name: f, text: readFileSync(join(opt.up06, f), 'utf8') }));
  const tagScan = scanTags(feats06);
  if (!tagScan.ok) brokenUpstream(`06-gherkin/${tagScan.unscannable[0]}`, 'feature carries no scannable Scenario keyword (tag set unreadable)');
  const tags06 = tagScan.tags06;
  const sixtuples06 = C.sixtuplesFrom06Features(feats06.map((f) => f.text));

  // --- read + parse 08 (nominal-path leaf order) -----------------------------
  const files08 = listFiles(opt.up08, '.xml');
  if (files08 == null) brokenUpstream('08-task-models/', `--upstream-08 '${opt.up08}' is not a directory`);
  const models08 = new Map();       // stem → { model, stuck }
  const stuck08 = [];               // upstream-defect routing
  for (const f of files08) {
    const stem = basename(f, '.xml');
    let parsed;
    try { parsed = ctt.parse(readFileSync(join(opt.up08, f), 'utf8')); }
    catch (e) { brokenUpstream(`08-task-models/${f}`, `not well-formed XML (${e.message})`); }
    if (!parsed.ok) brokenUpstream(`08-task-models/${f}`, parsed.detail);
    models08.set(stem, parsed.model);
    if (parsed.model.stuck) stuck08.push({ file: `08-task-models/${f}`, stem, detail: parsed.model.stuck });
  }
  const modelStems = [...models08.keys()].sort();

  // --- read + parse 09 (walk graph) ------------------------------------------
  const files09 = listFiles(opt.up09, '.xml');
  if (files09 == null) brokenUpstream('09-ui-flows/', `--upstream-09 '${opt.up09}' is not a directory`);
  const models09ByPersona = new Map();  // persona value → { model, file }
  const dangling09 = [];                // upstream-defect routing
  for (const f of files09) {
    let model;
    try { model = ifml.parse(readFileSync(join(opt.up09, f), 'utf8')); }
    catch (e) { brokenUpstream(`09-ui-flows/${f}`, `not well-formed XML (${e.message})`); }
    if (model.persona) models09ByPersona.set(model.persona, { model, file: `09-ui-flows/${f}`, basename: f });
    // pre-walk dangling-edge precheck: an edge whose `to` is absent from the model.
    for (const flow of model.flows) {
      if (flow.toContainer != null && !model.containerById.has(flow.toContainer)) {
        dangling09.push({ file: `09-ui-flows/${f}`, persona: model.persona, edge: flow });
      }
    }
  }

  // ===========================================================================
  // Enumerate the 10 directory + parse every .feature.
  // ===========================================================================
  const featureFiles = listFiles(opt.dir, '.feature');
  const tenFeatures = []; // { stem, file, feature, pickles, comments, src }

  if (featureFiles == null) {
    // a missing/empty 10 dir over a non-empty 08 dir is an M-BIJECT failure, not broken-test.
    const r = C.rBiject([], modelStems);
    summary.checks = [{ id: 'R-BIJECT', class: 'resolution', rule: 'A-a', status: 'fail' }];
    summary.findings = [{ id: 'R-BIJECT', rule: 'A-a', severity: 'error', detail: r.detail || 'specs/10-flow-acceptance/ absent or empty' }];
    summary.counts.checks = { engine: 0, replay: 0, resolution: 1, negative: 0, agentJudged: 0, total: 1 };
    summary.counts.edgesWalked = 1; summary.counts.edgesExpected = 1; summary.reconciled = true;
    process.stderr.write(`FAIL [R-BIJECT/A-a]: ${r.detail || 'specs/10-flow-acceptance/ absent or empty'}\n`);
    emit(summary, 'fail');
  }

  for (const f of featureFiles) {
    const stem = basename(f, '.feature');
    const src = readFileSync(join(opt.dir, f), 'utf8');
    const pr = E.parseFeature(engine, src, f);
    if (!pr.ok) {
      const msg = pr.errors[0].message;
      const oracle = matchBadOracle(msg);
      process.stderr.write(`MALFORMED [M-PARSE/W-PARSE/A-f]: ${f} — ${msg}${oracle ? ` (oracle: ${oracle})` : ''}\n`);
      summary.status = 'malformed';
      summary.checks = [{ id: 'W-PARSE', class: 'engine', rule: 'A-f', status: 'fail' }];
      summary.findings = [{ id: 'W-PARSE', rule: 'A-f', severity: 'error', detail: `${f}: ${msg}`, errorShape: msg }];
      summary.counts.checks = { engine: 1, replay: 0, resolution: 0, negative: 0, agentJudged: 0, total: 1 };
      summary.counts.engine = { parsed: 0, compiled: 0, pickles: 0, total: 1 };
      emit(summary, 'malformed');
    }
    tenFeatures.push({ stem, file: f, feature: pr.gherkinDocument.feature, pickles: pr.pickles, comments: pr.comments, src });
  }

  // ===========================================================================
  // CHECKS.
  // ===========================================================================
  const checks = [];
  const findings = [];
  let engineRun = 0, replayRun = 0, resolutionRun = 0, ajRun = 0;
  let edgesWalked = 0;
  let stranded = 0;

  const push = (cls, r) => { checks.push({ id: r.id, class: cls, rule: r.rule, status: normStatus(r.status) }); if (r.edges) edgesWalked += r.edges; };
  const fail = (r, extra = {}) => { findings.push({ id: r.id, rule: r.rule, severity: 'error', detail: r.detail, ...extra }); if (r.detail) process.stderr.write(`FAIL [${r.id}/${r.rule}]: ${r.detail}\n`); };
  const warnInfo = (r) => { if (r.detail && r.status !== 'pass') findings.push({ id: r.id, rule: r.rule, severity: r.status === 'warn' ? 'warning' : 'info', detail: r.detail }); };

  const pushEngine = (r) => { push('engine', r); engineRun++; if (r.status === 'fail') fail(r); };
  const pushRes = (r) => { push('resolution', r); resolutionRun++; if (r.status === 'fail') fail(r); else warnInfo(r); };
  const pushReplay = (r) => { push('replay', r); replayRun++; if (r.status === 'fail') fail(r); };

  // --- R-BIJECT (directory ↔ 08 bijection) -----------------------------------
  const featureStems = tenFeatures.map((t) => t.stem);
  pushRes(C.rBiject(featureStems, modelStems));

  // --- upstream-defect pre-checks (§9) BEFORE the 10→upstream replay ---------
  // these route a parseable-but-broken upstream to fail + upstream-defect → owner.
  for (const d of stuck08) {
    findings.push({ id: 'V-ORDER', rule: 'B-d', severity: 'error', class: 'upstream-defect', upstream: d.file, detail: `08 nominal path underivable at task '${d.detail.id}': ${d.detail.reason} (fix upstream in ${d.file}, not 10)` });
    process.stderr.write(`UPSTREAM-DEFECT [V-ORDER/B-d]: ${d.detail.reason} → route to ${d.file}\n`);
  }
  for (const d of dangling09) {
    findings.push({ id: 'V-NAV', rule: 'B-c', severity: 'error', class: 'upstream-defect', upstream: d.file, detail: `09 NavigationFlow edge ${d.edge.fromEvent}→${d.edge.toContainer} ends in a container absent from the model (dangling edge end on the walked path) (fix upstream in ${d.file}, not 10)` });
    process.stderr.write(`UPSTREAM-DEFECT [V-NAV/B-c]: dangling navflow end ${d.edge.fromEvent}→${d.edge.toContainer} → route to ${d.file}\n`);
  }

  // --- per-feature engine + mechanical + replay ------------------------------
  let totalScenarios = 0, totalSteps = 0, totalBindings = 0;
  for (const t of tenFeatures) {
    const feature = t.feature;
    const featureLine = feature && feature.location ? feature.location.line : 1;
    const featureTags = (feature && feature.tags || []).map((x) => x.name);
    const { background, scenarios } = astScenarios(feature);
    totalScenarios += scenarios.length;
    for (const sc of scenarios) {
      const steps = walkSteps(background, sc);
      totalSteps += steps.length;
      totalBindings += steps.filter((s) => s.cls.kind === 'outcome').length;
    }

    // engine: W-PARSE (reaching here = parsed), W-FEAT, W-INST.
    pushEngine({ id: 'W-PARSE', rule: 'A-f', status: 'pass', edges: 1 });
    pushEngine({ ...C.wFeat(feature, t.stem), edges: 1 });
    pushEngine({ ...C.wInst(t.pickles), edges: 1 });
    summary.counts.engine.parsed++;
    if (t.pickles && t.pickles.length > 0) summary.counts.engine.compiled++;
    summary.counts.engine.pickles += t.pickles ? t.pickles.length : 0;

    // resolution / mechanical.
    pushRes({ ...C.rFilename(t.stem, modelStems), edges: 1 });
    // fingerprint: derive consumed 06 from outcome-binding tags → owning 06 files (any 06
    // file whose tag set includes a bound tag). For robustness we require all 06 features the
    // bound tags come from; minimally, the persona 09 + 08 model must be named.
    const boundTags = collectBoundTags(background, scenarios);
    const consumed06 = consumed06Files(boundTags, feats06);
    const persona = personaFromStem(t.stem);
    const model08 = models08.get(t.stem);
    const personaName = model08 ? model08.persona : null;
    const model09Rec = personaName ? models09ByPersona.get(personaName) : null;
    const persona09File = model09Rec ? model09Rec.file : `09-ui-flows/${persona}.xml`;
    const model08File = `08-task-models/${t.stem}.xml`;
    pushRes({ ...C.rFingerprint(t.comments, featureLine, { stem: t.stem, consumed06, persona09File, model08File }), edges: 1 });
    pushRes({ ...C.rFeatTag(featureTags, t.stem, modelStems), edges: 1 });
    pushRes({ ...C.rThenShape(background, scenarios), edges: countThen(background, scenarios) });
    pushRes({ ...C.rWhenForm(background, scenarios), edges: countWhen(background, scenarios) });
    pushRes({ ...C.mOneWhen(background, scenarios), edges: countWhen(background, scenarios) });
    pushRes({ ...C.rPersona(background, scenarios, personaName || persona), edges: countSteps(background, scenarios) });
    pushRes({ ...C.rNo06Body(background, scenarios, sixtuples06, collectVerbatim(background, scenarios)), edges: countSteps(background, scenarios) });
    pushRes({ ...C.rDeclarative(background, scenarios, collectVerbatimRaw(model09Rec)), edges: countSteps(background, scenarios) });
    pushRes({ ...C.mGwt(background, scenarios), edges: scenarios.length });

    // warn-only.
    pushRes(C.mTitle(scenarios));
    pushRes(C.mBackground(background));
    pushRes(C.mLang(t.src));
    pushRes(C.mDesc(feature));
    pushRes(C.mIncidental(background, scenarios));

    // --- WALK-REPLAY (V-*) ---------------------------------------------------
    // resolve the persona's 09 model + the 08 nominal leaves; replay.
    if (!model08) {
      // bijection failure already records this; skip replay (no 08 model to walk).
      pushReplay({ id: 'V-START', rule: 'B-b', status: 'fail', detail: `no 08 model for stem "${t.stem}"` });
      continue;
    }
    if (!model09Rec) {
      pushReplay({ id: 'V-START', rule: 'B-b', status: 'fail', detail: `no 09 model for persona "${personaName}" (from @task-model:${t.stem})` });
      continue;
    }
    // a vacuous feature (zero scenarios ⇒ zero pickles) has no walk to replay; W-INST
    // already records the blocking failure. Skip replay so the reconciliation arithmetic
    // does not expect replay edges that cannot be walked.
    if (scenarios.length === 0) continue;
    const model09 = model09Rec.model;
    // build the per-scenario walk-step lists.
    const chains = scenarios.map((sc) => walkSteps(background, sc));
    const r = replay(chains, model09, model08.nominalLeaves, tags06);
    for (const w of r.walks) {
      pushReplay({ id: w.id, rule: w.rule, status: w.status, edges: replayEdgeWeight(w.id, r, scenarios, background, model08) });
      if (w.status === 'fail' && w.detail) {
        process.stderr.write(`FAIL [${w.id}/${w.rule}]: ${w.detail}\n`);
        findings.push({ id: w.id, rule: w.rule, severity: 'error', detail: w.detail });
      }
    }
    if (!r.result.realizable) stranded++;
    summary.walks.push({
      feature: t.stem, persona: personaName, home: r.result.home, hops: r.result.hops,
      walkedLeaves: r.result.walkedLeaves, nominalLeaves: r.result.nominalLeaves,
      systemLeavesExcluded: r.result.systemLeavesExcluded,
      realizable: r.result.realizable, tagsBound: r.result.tagsBound, tagsRequired: r.result.tagsRequired,
    });
  }

  // --- counts + reconciliation -----------------------------------------------
  summary.counts.intake = { features: tenFeatures.length, scenarios: totalScenarios, steps: totalSteps, bindings: totalBindings };
  summary.counts.engine.total = summary.counts.engine.parsed;
  summary.counts.replay = { walks: summary.walks.length, stranded, total: replayRun };
  summary.counts.edgesWalked = edgesWalked;

  // edgesExpected recomputed structurally (catch a dropped check).
  let edgesExpected = 1; // R-BIJECT
  for (const t of tenFeatures) {
    const { background, scenarios } = astScenarios(t.feature);
    edgesExpected += 3; // W-PARSE + W-FEAT + W-INST
    edgesExpected += 1; // R-FILENAME
    edgesExpected += 1; // R-FINGERPRINT
    edgesExpected += 1; // R-FEATTAG
    edgesExpected += countThen(background, scenarios); // R-THENSHAPE
    edgesExpected += countWhen(background, scenarios); // R-WHENFORM
    edgesExpected += countWhen(background, scenarios); // M-ONEWHEN
    edgesExpected += countSteps(background, scenarios); // R-PERSONA
    edgesExpected += countSteps(background, scenarios); // R-NO06BODY
    edgesExpected += countSteps(background, scenarios); // R-DECLARATIVE
    edgesExpected += scenarios.length; // M-GWT
    // replay edges (only when both models resolve).
    const model08 = models08.get(t.stem);
    const personaName = model08 ? model08.persona : null;
    const model09Rec = personaName ? models09ByPersona.get(personaName) : null;
    if (model08 && model09Rec && scenarios.length > 0) {
      edgesExpected += 1; // V-START
      edgesExpected += countLoc(background, scenarios); // V-LOC
      edgesExpected += countWhen(background, scenarios); // V-EVENT
      edgesExpected += countNav(background, scenarios); // V-NAV
      edgesExpected += 1; // V-ORDER
      edgesExpected += model08.nominalLeaves.length; // V-COVER
      edgesExpected += countBindings(background, scenarios); // V-TAG
    }
  }
  summary.counts.edgesExpected = edgesExpected;

  summary.counts.checks = {
    engine: engineRun, replay: replayRun, resolution: resolutionRun,
    negative: 0, agentJudged: ajRun,
    total: engineRun + replayRun + resolutionRun + ajRun,
  };

  summary.checks = checks;
  summary.findings = findings;

  // X-RECON.
  const recon = C.checkXRecon(summary.counts.checks.total, edgesWalked, edgesExpected, engineRun, replayRun, tenFeatures.length);
  summary.checks.push({ id: 'X-RECON', class: 'resolution', rule: 'reconciliation', status: recon.status === 'pass' ? 'pass' : 'fail' });
  summary.counts.checks.resolution++; summary.counts.checks.total++;

  if (summary.counts.checks.total === 0) { summary.status = 'broken-test'; process.stderr.write('BROKEN-TEST: zero checks executed.\n'); emit(summary, 'broken-test'); }
  if (recon.status !== 'pass') { summary.status = 'broken-test'; process.stderr.write(`BROKEN-TEST [X-RECON]: ${recon.detail}\n`); emit(summary, 'broken-test'); }
  summary.reconciled = true;

  if (summary.findings.some((f) => f.severity === 'error')) { summary.status = 'fail'; emit(summary, 'fail'); }
  summary.status = 'pass';
  emit(summary, 'pass');
}

// --- helpers ---------------------------------------------------------------
function normStatus(s) { return s === 'warn' || s === 'info' ? 'warn' : s; }

function matchBadOracle(msg) {
  if (/expected: .*got 'not gherkin'/.test(msg)) return 'not_gherkin';
  if (/A tag may not contain whitespace/.test(msg)) return 'whitespace_in_tags';
  if (/Language not supported/.test(msg)) return 'invalid_language';
  return null;
}

function collectBoundTags(background, scenarios) {
  const set = new Set();
  for (const sc of scenarios) for (const s of walkSteps(background, sc)) if (s.cls.kind === 'outcome') set.add(s.cls.tag);
  return set;
}
function consumed06Files(boundTags, feats06) {
  const out = new Set();
  for (const { name, text } of feats06) {
    for (const tag of boundTags) {
      if (text.includes(tag)) { out.add(`06-gherkin/${name}`); break; }
    }
  }
  return [...out].sort();
}
function collectVerbatim(background, scenarios) {
  // embedded 01-event strings the When is compelled to carry (E-c mask source).
  const out = [];
  for (const sc of scenarios) for (const s of walkSteps(background, sc)) if (s.cls.kind === 'interaction' && s.cls.form === 'embedded') out.push(s.cls.embedded);
  return out;
}
function collectVerbatimRaw(model09Rec) {
  if (!model09Rec) return [];
  return model09Rec.model.events.map((e) => e.annotation01).filter(Boolean);
}
function countSteps(background, scenarios) { let n = 0; for (const sc of scenarios) n += walkSteps(background, sc).length; return n; }
function countThen(background, scenarios) { let n = 0; for (const sc of scenarios) n += walkSteps(background, sc).filter((s) => s.role === 'Then').length; return n; }
function countWhen(background, scenarios) { let n = 0; for (const sc of scenarios) n += walkSteps(background, sc).filter((s) => s.role === 'When').length; return n; }
function countLoc(background, scenarios) { let n = 0; for (const sc of scenarios) n += walkSteps(background, sc).filter((s) => s.cls.kind === 'location').length; return n; }
function countNav(background, scenarios) { let n = 0; for (const sc of scenarios) n += walkSteps(background, sc).filter((s) => s.cls.kind === 'navigation').length; return n; }
function countBindings(background, scenarios) { let n = 0; for (const sc of scenarios) n += walkSteps(background, sc).filter((s) => s.cls.kind === 'outcome').length; return n; }

// replay-check edge weights (mirror the §5 edgesExpected formula).
function replayEdgeWeight(id, r, scenarios, background, model08) {
  switch (id) {
    case 'V-START': return 1;
    case 'V-LOC': return countLoc(background, scenarios);
    case 'V-EVENT': return countWhen(background, scenarios);
    case 'V-NAV': return countNav(background, scenarios);
    case 'V-ORDER': return 1;
    case 'V-COVER': return model08.nominalLeaves.length;
    case 'V-TAG': return countBindings(background, scenarios);
    default: return 0;
  }
}

main().catch((e) => {
  process.stderr.write(`BROKEN-TEST (harness threw): ${e && e.stack ? e.stack : e}\n`);
  process.exit(EXIT['broken-test']);
});
