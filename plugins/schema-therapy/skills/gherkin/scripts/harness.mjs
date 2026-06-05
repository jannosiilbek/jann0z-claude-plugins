#!/usr/bin/env node
// harness.mjs — the executable pass/fail ORACLE for artifact 06 (the directory artifact
// `specs/06-gherkin/` holding one `<aggregate>.feature` BDD feature file per 03
// aggregate). Validated against FIVE-OR-SIX upstreams (01-event-storming.md/02/03/
// 04-erd.dbml/04-transitions.md + optional 05-statecharts/). Implements
// references/simulation.md EXACTLY:
//   - STRONGEST-ORACLE ENGINE (§3.3): every .feature is PARSED on @cucumber/gherkin
//     39.1.0 AND COMPILED to pickles; parse-clean + ≥1 pickle is the instantiation
//     assertion (zero pickles ⇒ vacuous ⇒ fail W-INST); a parse throw ⇒ malformed,
//     matched to the testdata/bad oracle shape.
//   - MECHANICAL CHECKS over the AST (§2): M*/R*/X* structure, tag grammar, coverage
//     arithmetic, canon, language, DRY.
//   - 05-AUTHORITY switching (§3.5): promoted entities judged vs the scxml graph (copied
//     scxml reader); unpromoted vs 04 rows; absent flag ⇒ all vs 04 + the N-05ABSENT guard.
//   - self-install + offline mode: deps absent + no network ⇒ broken-test, exit 3.
//   - upstream-defect routing (§9): self-inconsistent 03/04 ⇒ fail + upstream-defect;
//     unparseable 02/03/04, unreadable 05 ⇒ broken-test.
//   - ids never asserted (IdGenerator.incrementing()); status pass|fail|malformed|
//     broken-test; stable JSON stdout (incl. authority block); exits 0-1-2-3.
//   - coverage + edge reconciliation (§5) incl. the engine-non-empty guard.
//
// Node ≥18, plain ESM.
// Usage:
//   node scripts/harness.mjs <06-dir> \
//     --upstream-01 <01-event-storming.md> \
//     --upstream-02 <02-glossary.md> --upstream-03 <03-aggregates.md> \
//     --upstream-04-dbml <04-erd.dbml> --upstream-04-transitions <04-transitions.md> \
//     [--upstream-05 <05-dir>] [--no-checks] [--no-install] [--force-missing-deps <dir>]

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import * as E from './lib/engine.mjs';
import { parse as parseMd, deriveGlossary02, deriveAggregates03, deriveTransitions04, deriveEventStorming01 } from './lib/md.mjs';
import { parse as parseScxml, scxmlGraph, ScxmlParseError } from './lib/scxml.mjs';
import * as C from './lib/checks.mjs';
import { toSnake, policyTagRef, classifyTag, plainTokens, rawTokens, RESTATEMENT_WINDOW_N } from './lib/lexicon.mjs';

const EXIT = { pass: 0, fail: 1, malformed: 2, 'broken-test': 3 };
const TOOLING = { gherkin: '39.1.0', messages: '32.3.1', dbmlCore: '8.2.5', node: '>=18' };

function parseArgs(argv) {
  const args = argv.slice(2);
  const o = { dir: null, up01: null, up02: null, up03: null, up04dbml: null, up04tr: null, up05: null, noChecks: false, noInstall: false, forceMissingDeps: null };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--upstream-01') o.up01 = args[++i];
    else if (a === '--upstream-02') o.up02 = args[++i];
    else if (a === '--upstream-03') o.up03 = args[++i];
    else if (a === '--upstream-04-dbml') o.up04dbml = args[++i];
    else if (a === '--upstream-04-transitions') o.up04tr = args[++i];
    else if (a === '--upstream-05') o.up05 = args[++i];
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
    skill: 'gherkin',
    artifactDir: opt.dir,
    upstream01: opt.up01,
    upstream02: opt.up02, upstream03: opt.up03,
    upstream04Dbml: opt.up04dbml, upstream04Transitions: opt.up04tr,
    upstream05: opt.up05 || null,
    tooling: { ...TOOLING },
    status,
    authority: {},
    counts: {
      intake: { features: 0, scenarios: 0, steps: 0, tags: 0 },
      checks: { engine: 0, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 0 },
      engine: { parsed: 0, compiled: 0, pickles: 0, total: 0 },
      coverage: { invariants: 0, transitions: 0, terminals: 0, policies: 0, authz: 0 },
      edgesWalked: 0, edgesExpected: 0,
    },
    reconciled: false,
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
    process.stderr.write('usage: node scripts/harness.mjs <06-dir> --upstream-01 <01> --upstream-02 <02> --upstream-03 <03> --upstream-04-dbml <04.dbml> --upstream-04-transitions <04-transitions.md> [--upstream-05 <05-dir>]\n');
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

  // --- read + parse the upstreams --------------------------------------------
  const brokenUpstream = (file, detail) => {
    process.stderr.write(`BROKEN-TEST: upstream ${file} unparseable — ${detail}\n`);
    summary.status = 'broken-test'; emit(summary, 'broken-test');
  };
  const readOr = (p, label) => {
    try { return readFileSync(p, 'utf8'); }
    catch (e) { brokenUpstream(label, `cannot read (${e.message})`); }
  };
  const t01 = readOr(opt.up01, '01-event-storming.md');
  const t02 = readOr(opt.up02, '02-glossary.md');
  const t03 = readOr(opt.up03, '03-aggregates.md');
  const t04dbml = readOr(opt.up04dbml, '04-erd.dbml');
  const t04tr = readOr(opt.up04tr, '04-transitions.md');

  let doc01, doc02, doc03, doc04tr;
  try { doc01 = parseMd(t01); } catch (e) { brokenUpstream('01-event-storming.md', e.message); }
  try { doc02 = parseMd(t02); } catch (e) { brokenUpstream('02-glossary.md', e.message); }
  try { doc03 = parseMd(t03); } catch (e) { brokenUpstream('03-aggregates.md', e.message); }
  try { doc04tr = parseMd(t04tr); } catch (e) { brokenUpstream('04-transitions.md', e.message); }

  const es01 = deriveEventStorming01(doc01);
  const glossary02 = deriveGlossary02(doc02);
  const aggregates03 = deriveAggregates03(doc03);
  const transitions04 = deriveTransitions04(doc04tr);

  if (!es01.shapeOk) brokenUpstream('01-event-storming.md', 'missing ## Domain Events or ## Actors table (B7 obligation set unbuildable)');
  if (!glossary02.shapeOk) brokenUpstream('02-glossary.md', 'missing ## Enums or ## Forbidden Synonyms section');
  if (!transitions04.shapeOk) brokenUpstream('04-transitions.md', 'missing ## Transition Tables section / no ### entity block');

  const dbml = E.parseDbml(engine.DbmlParser, t04dbml);
  if (!dbml.ok) brokenUpstream('04-erd.dbml', String((dbml.error && dbml.error.message) || 'DBML parse error').slice(0, 160));

  // --- 05 authority (optional) -----------------------------------------------
  const up05Present = !!opt.up05;
  const scxmlGraphs = new Map(); // entity → scxmlGraph
  const promotedSet = new Set();
  if (up05Present) {
    if (!existsSync(opt.up05) || !statSync(opt.up05).isDirectory()) {
      brokenUpstream('05-statecharts/', `--upstream-05 '${opt.up05}' is not a directory`);
    }
    const files = readdirSync(opt.up05).filter((f) => f.endsWith('.scxml')).sort();
    for (const f of files) {
      const entity = basename(f, '.scxml');
      let model;
      try { model = parseScxml(readFileSync(join(opt.up05, f), 'utf8')); }
      catch (e) { brokenUpstream(`05-statecharts/${f}`, `not well-formed XML (${e.message})`); }
      scxmlGraphs.set(entity, scxmlGraph(model));
      promotedSet.add(entity);
    }
  }

  // --- authority selection (the binding lifecycle rule, §3.5) ----------------
  // authority(entity) = scxml graph iff up05Present && entity ∈ promoted; else 04 table.
  const authorityByEntity = new Map();
  for (const ent of transitions04.entities) {
    const snake = toSnake(ent.entity);
    if (up05Present && promotedSet.has(snake)) {
      const g = scxmlGraphs.get(snake);
      authorityByEntity.set(snake, { source: '05-scxml', states: g.states, transitions: g.transitions, terminals: g.terminals, initial: g.initial });
      summary.authority[snake] = '05-scxml';
    } else {
      const states = [...new Set(ent.rows.flatMap((r) => [r.from, r.to]).filter((s) => s && s !== '∅'))].sort();
      const transitions = ent.rows.filter((r) => r.from !== '∅').map((r) => ({ from: r.from, event01: r.event01, to: r.to }));
      authorityByEntity.set(snake, { source: '04-table', states, transitions, terminals: ent.terminals, initial: ent.initial });
      summary.authority[snake] = '04-table';
    }
  }

  // --- build resolution context ---------------------------------------------
  const invariantIds = new Set(aggregates03.invariants.map((i) => i.id));
  const entitySnakes = new Set(transitions04.entities.map((e) => toSnake(e.entity)));
  const policyRefs = new Set(aggregates03.policies.map((p) => policyTagRef(p.name)));
  const allEnumValues = new Set();
  const allEnumValuesLower = new Map();
  for (const e of glossary02.enums) for (const v of e.values) { allEnumValues.add(v); allEnumValuesLower.set(v.toLowerCase(), v); }
  const terms = new Set(glossary02.terms);
  const termsLower = new Map(); for (const t of glossary02.terms) termsLower.set(t.toLowerCase(), t);
  // events: 02 derivations + 04 event cells.
  const allEvents = new Set();
  for (const e of glossary02.enums) for (const [, ev] of e.derivations) if (ev) allEvents.add(ev);
  for (const ent of transitions04.entities) for (const r of ent.rows) if (r.event01) allEvents.add(r.event01);
  const entityEvents = new Map();
  for (const [snake, auth] of authorityByEntity) {
    entityEvents.set(snake, new Set(auth.transitions.map((t) => t.event01).filter(Boolean)));
  }
  const exemptTokens = new Set();
  for (const v of allEnumValues) exemptTokens.add(v.toLowerCase());
  for (const t of terms) exemptTokens.add(t.toLowerCase());
  // verbatim MANDATED-derivation spans (exact 01 events + 01 actor names + 02 Terms +
  // 02 enum values): a forbidden sub-token (M17) or invented-entity capture (M18) inside
  // one of these is a compelled upstream string (D3/B7), not free prose — masked before
  // those scans.
  const actorNames01 = new Set(es01.actorKinds.keys());
  const verbatimSpans = [...new Set([...allEvents, ...terms, ...allEnumValues, ...actorNames01])];
  const knownEntityVocab = new Set();
  for (const a of aggregates03.aggregates) knownEntityVocab.add(a);
  const knownAllVocab = new Set([...allEnumValues, ...terms, ...aggregates03.aggregates, ...allEvents, ...actorNames01]);
  const knownAllVocabLower = new Set([...knownAllVocab].map((s) => String(s).toLowerCase()));
  // invariant restatement windows + transition windows.
  const invariantWindows = aggregates03.invariants.map((i) => ({ id: i.id, tokens: rawTokens(i.ruleText) }));
  const transitionWindows = [];
  for (const ent of transitions04.entities) for (const r of ent.rows) transitionWindows.push(rawTokens(`${r.from} ${r.event01} ${r.to}`));

  // B7 authorization obligations (01 actor bindings × the authoritative transition set).
  const obligations = C.authzObligations(authorityByEntity, es01);

  const ctx = {
    invariantIds, entitySnakes, policyRefs, policies: aggregates03.policies,
    entityEvents, authorityByEntity,
    allEnumValues, allEnumValuesLower, terms, termsLower,
    forbidden: glossary02.forbidden, exemptTokens, verbatimSpans, enums: glossary02.enums,
    allEvents, knownEntityVocab, knownAllVocab, knownAllVocabLower,
    invariantWindows, transitionWindows,
    actorNames01, authzObligations: obligations,
  };

  // --- upstream self-checks (§9) BEFORE 06→0n resolution ---------------------
  const self03 = C.upstream03SelfCheck(aggregates03);
  const self04 = C.upstream04SelfCheck(transitions04.entities, glossary02.enums);

  // ===========================================================================
  // Enumerate the 06 directory + parse every .feature.
  // ===========================================================================
  const dirExists = existsSync(opt.dir) && statSync(opt.dir).isDirectory();
  let featureFiles = [];
  if (dirExists) featureFiles = readdirSync(opt.dir).filter((f) => f.endsWith('.feature')).sort();

  // parse+compile each feature; a parse THROW ⇒ malformed (matched to oracle shape).
  const features = [];
  for (const f of featureFiles) {
    const fileBase = basename(f, '.feature');
    const src = readFileSync(join(opt.dir, f), 'utf8');
    const pr = E.parseFeature(engine, src, f);
    if (!pr.ok) {
      const msg = pr.errors[0].message;
      process.stderr.write(`MALFORMED [M3/W-PARSE/A5]: ${f} — ${msg}\n`);
      summary.status = 'malformed';
      summary.checks = [{ id: 'W-PARSE', class: 'engine', rule: 'A5', status: 'fail' }];
      summary.findings = [{ id: 'W-PARSE', rule: 'A5', severity: 'error', detail: `${f}: ${msg}`, errorShape: msg }];
      summary.counts.checks = { engine: 1, resolution: 0, exactValue: 0, negative: 0, agentJudged: 0, total: 1 };
      summary.counts.engine = { parsed: 0, compiled: 0, pickles: 0, total: 1 };
      emit(summary, 'malformed');
    }
    features.push(C.deriveFeature(pr, fileBase));
  }

  // ===========================================================================
  // CHECKS.
  // ===========================================================================
  const checks = [];
  const findings = [];
  let engineRun = 0, resolutionRun = 0, exactValueRun = 0, ajRun = 0;
  let edgesWalked = 0;
  const push = (cls, r) => { checks.push({ id: r.id, class: cls, rule: r.rule, status: r.status }); if (r.edges) edgesWalked += r.edges; };
  const fail = (r, extra = {}) => { findings.push({ id: r.id, rule: r.rule, severity: 'error', detail: r.detail, ...extra }); if (r.detail) process.stderr.write(`FAIL [${r.id}/${r.rule}]: ${r.detail}\n`); };
  const warnInfo = (r) => { if (r.detail && r.status !== 'pass') findings.push({ id: r.id, rule: r.rule, severity: r.status === 'warn' ? 'warning' : 'info', detail: r.detail }); };

  const pushEngine = (r) => { push('engine', r); engineRun++; if (r.status === 'fail') fail(r); };
  const pushRes = (r) => { push('resolution', r); resolutionRun++; if (r.status === 'fail') fail(r, r.n05absent ? { n05absent: true } : {}); };
  const pushX = (r) => { push('exactValue', r); exactValueRun++; if (r.status === 'fail') fail(r); };
  const pushMech = (r, cls = 'resolution') => { checks.push({ id: r.id, class: cls, rule: r.rule, status: r.status }); if (r.edges) edgesWalked += r.edges; if (cls === 'resolution') resolutionRun++; else exactValueRun++; if (r.status === 'fail') fail(r); else warnInfo(r); };

  // --- R-BIJECT (directory ↔ 03 aggregate bijection) -------------------------
  const aggregateSnakes = aggregates03.aggregates.map(toSnake);
  const featureBases = features.map((f) => f.fileBase);
  pushRes(C.rBiject(featureBases, aggregateSnakes));

  // --- consumed-05 set per feature (entities judged via scxml whose scenarios appear) -
  const consumed05ByFeature = new Map();
  for (const feat of features) {
    const consumed = new Set();
    for (const sc of feat.scenarios) {
      if (!sc.sourceTag) continue;
      const c = classifyTag(sc.sourceTag);
      if (!c) continue;
      if ((c.kind === 'transition' || c.kind === 'terminal') && summary.authority[c.ref] === '05-scxml') {
        consumed.add(`05-statecharts/${c.ref}.scxml`);
      }
    }
    consumed05ByFeature.set(feat.fileBase, [...consumed].sort());
  }

  // --- per-feature engine + structure checks ---------------------------------
  let sawN05Absent = false;
  for (const feat of features) {
    const expectedAgg = aggregates03.aggregates.find((a) => toSnake(a) === feat.fileBase) || feat.fileBase;

    // engine: W-PARSE (reaching here = parsed), W-FEAT, W-INST, W-TAGEXP.
    pushEngine(C.P('W-PARSE', 'A5', 1));
    pushEngine(C.wFeat(feat, expectedAgg));
    pushEngine(C.wInst(feat));
    pushEngine(C.wTagExp(feat));
    summary.counts.engine.parsed++;
    if (feat.pickles && feat.pickles.length > 0) summary.counts.engine.compiled++;
    summary.counts.engine.pickles += feat.pickles ? feat.pickles.length : 0;

    // mechanical / resolution.
    pushMech(C.m2Filename(feat.fileBase, toSnake(expectedAgg)));
    const fp = C.rFingerprint(feat, { up05Present, consumed05: consumed05ByFeature.get(feat.fileBase) || [] });
    pushRes(fp);
    if (fp.n05absent) sawN05Absent = true;
    pushRes(C.rTag(feat));
    pushRes(C.rTagTarget(feat, ctx));
    pushRes(C.rEvent(feat, ctx));
    pushRes(C.rState(feat, ctx));
    pushRes(C.rTerm(feat));
    pushRes(C.rAuthority(feat, ctx));

    pushMech(C.m12ActionInThen(feat));
    pushMech(C.m13Background(feat));
    pushMech(C.m15InventedState(feat, ctx));
    pushMech(C.m16Term(feat, ctx));
    pushMech(C.m17Forbidden(feat, ctx));
    pushMech(C.m18InventedEntity(feat, ctx));
    pushMech(C.m19RestatedInvariant(feat, ctx));
    pushMech(C.m20EnumListing(feat, ctx));
    pushMech(C.m21TransitionDump(feat, ctx));

    pushX(C.xOneWhen(feat));
    pushX(C.xRoleOrder(feat));
    pushX(C.xFeatureOne(feat));
    pushX(C.xAuthz(feat, ctx));
  }

  // --- coverage arithmetic (X-COV-*) -----------------------------------------
  const covInv = C.xCovInv(features, aggregates03.invariants); pushX(covInv);
  const covTrans = C.xCovTrans(features, authorityByEntity); pushX(covTrans);
  const covTerm = C.xCovTerm(features, authorityByEntity); pushX(covTerm);
  const covPol = C.xCovPol(features, aggregates03.policies); pushX(covPol);
  const covAuthz = C.xCovAuthz(features, obligations); pushX(covAuthz);

  // coverage counts (intake of obligations).
  let authTransitions = 0, authTerminals = 0;
  for (const [, auth] of authorityByEntity) { authTransitions += auth.transitions.filter((t) => t.from !== '∅').length; authTerminals += auth.terminals.length; }
  summary.counts.coverage = {
    invariants: aggregates03.invariants.length,
    transitions: authTransitions,
    terminals: authTerminals,
    policies: aggregates03.policies.length,
    authz: obligations.length,
  };
  const coverageEdgesWalked = (covInv.edges || 0) + (covTrans.edges || 0) + (covTerm.edges || 0) + (covPol.edges || 0) + (covAuthz.edges || 0);
  const coverageEdgesExpected = aggregates03.invariants.length + authTransitions + authTerminals + aggregates03.policies.length + obligations.length;

  // --- §9 upstream-defect routing --------------------------------------------
  if (!self03.ok) {
    for (const d of self03.defects) {
      // surface on R-TAGTARGET (the resolution that would ambiguously resolve).
      const rec = checks.find((c) => c.id === 'R-TAGTARGET');
      if (rec) rec.status = 'fail';
      findings.push({ id: 'R-TAGTARGET', rule: 'A6', severity: 'error', class: 'upstream-defect', upstream: '03-aggregates.md', detail: `${d.detail} (fix upstream in ${opt.up03}, not 06)` });
      process.stderr.write(`UPSTREAM-DEFECT [R-TAGTARGET/A6]: ${d.detail} → route to 03-aggregates.md\n`);
    }
  }
  if (!self04.ok) {
    for (const d of self04.defects) {
      const rec = checks.find((c) => c.id === 'R-STATE');
      if (rec) rec.status = 'fail';
      findings.push({ id: 'R-STATE', rule: 'D2', severity: 'error', class: 'upstream-defect', upstream: '04-transitions.md', detail: `${d.detail} (fix upstream in ${opt.up04tr}, not 06)` });
      process.stderr.write(`UPSTREAM-DEFECT [R-STATE/D2]: ${d.detail} → route to 04-transitions.md\n`);
    }
  }

  // --- agent-judged precondition flags (recorded, never block, not reconciled) -
  // AJ-VIOLATE / AJ-DECL / AJ-EVENTUAL / AJ-CONJ residues — recorded with the pass
  // verdict by default (mechanical preconditions computed; semantic residue deferred).
  for (const feat of features) {
    for (const sc of feat.scenarios) {
      if (!sc.sourceTag) continue;
      const c = classifyTag(sc.sourceTag);
      if (c && c.kind === 'invariant') { checks.push({ id: `AJ-VIOLATE:${feat.fileBase}:${sc.title}`, class: 'agent-judged', rule: 'B1', verdict: 'violates-the-rule' }); ajRun++; }
      // AJ-CONJ residue: a When-block Conjunction step.
      const whenBlockConj = sc.allSteps.some((s, i) => s.kt === 'Conjunction' && sc.allSteps.slice(0, i).some((p) => p.kt === 'Action') && !sc.allSteps.slice(0, i).some((p) => p.kt === 'Outcome'));
      if (whenBlockConj) { checks.push({ id: `AJ-CONJ:${feat.fileBase}:${sc.title}`, class: 'agent-judged', rule: 'C3', verdict: 'single-action' }); ajRun++; }
    }
  }

  // --- counts + reconciliation -----------------------------------------------
  summary.counts.intake = C.intakeCounts(features);
  summary.counts.engine.total = summary.counts.engine.parsed;
  summary.counts.edgesWalked = edgesWalked;
  // edgesExpected mirrors edgesWalked structurally (every pushed check contributes its
  // edges); we recompute the expected from the same derivations to catch a dropped check.
  let edgesExpected = 1; // R-BIJECT
  for (const feat of features) {
    edgesExpected += 4; // W-PARSE + W-FEAT + W-INST + W-TAGEXP
    edgesExpected += 1; // R-FINGERPRINT
    edgesExpected += feat.scenarios.length; // R-TAG
    edgesExpected += feat.scenarios.length; // R-TAGTARGET
    // R-EVENT edges = @transition/@policy/@authz scenarios
    edgesExpected += feat.scenarios.filter((sc) => { const c = sc.sourceTag && classifyTag(sc.sourceTag); return c && (c.kind === 'transition' || c.kind === 'policy' || c.kind === 'authz'); }).length;
    // R-STATE edges = given+then steps
    let gt = 0; for (const sc of feat.scenarios) gt += sc.givenSteps.length + sc.thenSteps.length;
    edgesExpected += gt; // R-STATE
    edgesExpected += gt; // R-TERM
    // R-AUTHORITY edges = @transition scenarios
    edgesExpected += feat.scenarios.filter((sc) => { const c = sc.sourceTag && classifyTag(sc.sourceTag); return c && c.kind === 'transition'; }).length;
    edgesExpected += feat.scenarios.length; // X-ONEWHEN
    edgesExpected += feat.scenarios.length; // X-ROLEORDER
    edgesExpected += 1; // X-FEATURE-ONE
    // X-AUTHZ edges = @authz scenarios
    edgesExpected += feat.scenarios.filter((sc) => { const c = sc.sourceTag && classifyTag(sc.sourceTag); return c && c.kind === 'authz'; }).length;
  }
  edgesExpected += coverageEdgesExpected; // X-COV-INV + X-COV-TRANS + X-COV-TERM + X-COV-POL + X-COV-AUTHZ
  summary.counts.edgesExpected = edgesExpected;

  summary.counts.checks = {
    engine: engineRun, resolution: resolutionRun, exactValue: exactValueRun,
    negative: 0, agentJudged: ajRun,
    total: engineRun + resolutionRun + exactValueRun + ajRun,
  };

  // X-RECON.
  const recon = C.checkXRecon(summary.counts.checks.total, edgesWalked, edgesExpected, engineRun, features.length, coverageEdgesWalked, coverageEdgesExpected);
  checks.push({ id: 'X-RECON', class: 'exactValue', rule: 'reconciliation', status: recon.status === 'pass' ? 'pass' : 'fail' });
  summary.counts.checks.exactValue++; summary.counts.checks.total++;

  summary.checks = checks;
  summary.findings = findings;

  if (summary.counts.checks.total === 0) { summary.status = 'broken-test'; process.stderr.write('BROKEN-TEST: zero checks executed.\n'); emit(summary, 'broken-test'); }
  if (recon.status !== 'pass') { summary.status = 'broken-test'; process.stderr.write(`BROKEN-TEST [X-RECON]: ${recon.detail}\n`); emit(summary, 'broken-test'); }
  summary.reconciled = true;

  if (sawN05Absent) process.stderr.write('NOTE: a feature fingerprints a 05 file while --upstream-05 is absent (N-05ABSENT).\n');

  if (findings.some((f) => f.severity === 'error')) { summary.status = 'fail'; emit(summary, 'fail'); }
  summary.status = 'pass';
  emit(summary, 'pass');
}

main().catch((e) => {
  process.stderr.write(`BROKEN-TEST (harness threw): ${e && e.stack ? e.stack : e}\n`);
  process.exit(EXIT['broken-test']);
});
