// engine.mjs — the STRONGEST-ORACLE layer (simulation.md §0, §3.3). Every emitted
// `.feature` is PARSED on the format's own reference parser (@cucumber/gherkin 39.1.0)
// to a GherkinDocument AST, then COMPILED to pickles (the compiled-scenario objects
// every Cucumber runner instantiates). parse-clean + a non-empty pickle set is the B2
// instantiation assertion. This is the "reuse the format's real engine over inventing
// a lexer" call doctrine B3 requires — no hand-rolled Gherkin parser.
//
// The TWO §0 gotchas are guarded:
//   1. compile(...) requires the THIRD idGenerator arg — omitting it throws. We always
//      pass it.
//   2. the parser THROWS a CompositeParserException on malformed input (it does not
//      return errors). parseFeature wraps parse() in try/catch and surfaces e.errors[]
//      (each {message, location}) so the negative oracle can classify them.
//
// Determinism (§8): the IdGenerator is the ONLY nondeterminism source and is excluded
// from assertions — we pin IdGenerator.incrementing() AND never assert a minted id; we
// assert pickle COUNT / NAMES / TAGS / step TYPES + TEXT (all input-derived). One fresh
// Parser per file; nothing carries between files.
//
// Self-install + offline mode: deps NOT vendored. Absent + network ⇒ self-install;
// absent + no network ⇒ the caller emits broken-test (never a vacuous green).

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..');
const NODE_MODULES = join(SCRIPTS_DIR, 'node_modules');

const DEP_DIRS = {
  '@cucumber/gherkin': join(NODE_MODULES, '@cucumber', 'gherkin'),
  '@cucumber/messages': join(NODE_MODULES, '@cucumber', 'messages'),
  '@dbml/core': join(NODE_MODULES, '@dbml', 'core'),
};

// --- self-install + offline failure mode (simulation.md §1) -----------------
export function ensureDeps({ allowInstall = true, forceMissingRoot = null } = {}) {
  const depPaths = forceMissingRoot
    ? {
        '@cucumber/gherkin': join(forceMissingRoot, '@cucumber', 'gherkin'),
        '@cucumber/messages': join(forceMissingRoot, '@cucumber', 'messages'),
        '@dbml/core': join(forceMissingRoot, '@dbml', 'core'),
      }
    : DEP_DIRS;

  const missing = () => Object.entries(depPaths).filter(([, p]) => !existsSync(p)).map(([n]) => n);

  let absent = missing();
  if (absent.length === 0) return { ok: true, missing: [], installed: false };

  if (!allowInstall) {
    return { ok: false, missing: absent, reason: `parser dependencies absent (${absent.join(', ')}) and install disabled` };
  }

  const lockPresent = existsSync(join(SCRIPTS_DIR, 'package-lock.json'));
  const run = (cmd, args) => spawnSync(cmd, args, { cwd: SCRIPTS_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  let res;
  if (lockPresent) {
    res = run('npm', ['ci', '--no-audit', '--no-fund']);
    if (res.status !== 0) res = run('npm', ['install', '--no-audit', '--no-fund']);
  } else {
    res = run('npm', ['install', '--no-audit', '--no-fund']);
  }

  absent = missing();
  if (absent.length === 0) return { ok: true, missing: [], installed: true };

  return {
    ok: false,
    missing: absent,
    reason: `parser dependencies absent (${absent.join(', ')}); self-install failed (likely offline). ` +
      `Run: npm --prefix scripts ci  (or: npm --prefix scripts install)`,
    installerStderr: res ? (res.stderr || '').slice(0, 400) : '',
  };
}

// Lazy-load the pinned packages AFTER ensureDeps confirmed presence.
export function loadEngine() {
  const require = createRequire(import.meta.url);
  const gherkin = require('@cucumber/gherkin');
  const messages = require('@cucumber/messages');
  const dbmlCore = require('@dbml/core');
  const readVer = (name) => {
    try { return JSON.parse(readFileSync(join(DEP_DIRS[name], 'package.json'), 'utf8')).version; }
    catch { return null; }
  };
  return {
    Parser: gherkin.Parser,
    AstBuilder: gherkin.AstBuilder,
    GherkinClassicTokenMatcher: gherkin.GherkinClassicTokenMatcher,
    compile: gherkin.compile,
    IdGenerator: messages.IdGenerator,
    DbmlParser: dbmlCore.Parser,
    gherkinVersion: readVer('@cucumber/gherkin'),
    messagesVersion: readVer('@cucumber/messages'),
    dbmlVersion: dbmlCore.VERSION,
  };
}

// --- the parse+compile oracle (simulation.md §0, §3.3) ----------------------
// parseFeature(engine, src, uri) →
//   { ok:true, gherkinDocument, pickles, comments:[{text,line}] }
//   | { ok:false, errors:[{message,location}] }  (the parser THREW a CompositeParserException)
// A FRESH Parser + IdGenerator.incrementing() per file (§8 fresh state). Ids are minted
// by compile() but NEVER asserted — only count/name/tags/step-type/text are read.
export function parseFeature(engine, src, uri) {
  const { Parser, AstBuilder, GherkinClassicTokenMatcher, compile, IdGenerator } = engine;
  const newId = IdGenerator.incrementing();
  let gherkinDocument;
  try {
    const parser = new Parser(new AstBuilder(newId), new GherkinClassicTokenMatcher());
    gherkinDocument = parser.parse(src);
  } catch (e) {
    // CompositeParserException carries e.errors[] (each {message, location}); a lone
    // ParserException carries .message + .location.
    const errors = Array.isArray(e && e.errors)
      ? e.errors.map((x) => ({ message: x.message, location: x.location || null }))
      : [{ message: (e && e.message) || String(e), location: (e && e.location) || null }];
    return { ok: false, errors };
  }
  gherkinDocument.uri = uri;
  let pickles;
  try {
    pickles = compile(gherkinDocument, uri, newId);
  } catch (e) {
    // compile throwing on a clean parse is a harness/engine fault, not a feature defect.
    return { ok: false, compileThrew: true, errors: [{ message: `compile() threw: ${(e && e.message) || e}`, location: null }] };
  }
  const comments = (gherkinDocument.comments || []).map((c) => ({ text: c.text, line: c.location ? c.location.line : 0 }));
  return { ok: true, gherkinDocument, pickles, comments };
}

// --- DBML enum + table enumeration (the 04-erd.dbml role) -------------------
// We parse 04-erd.dbml ONLY as a parse-validity gate on the fourth upstream (unparseable
// .dbml ⇒ broken-test) + a table/enum enumeration. Mirrors the erd/statecharts usage.
export function parseDbml(DbmlParser, dbmlText) {
  try {
    const db = new DbmlParser().parse(dbmlText, 'dbmlv2');
    const normalized = db.export();
    const schema = normalized.schemas && normalized.schemas[0] ? normalized.schemas[0] : { tables: [], enums: [] };
    const enums = (schema.enums || []).map((e) => ({ name: e.name, values: (e.values || []).map((v) => v.name) }));
    const tables = (schema.tables || []).map((t) => t.name);
    return { ok: true, enums, tables, error: null };
  } catch (e) {
    return { ok: false, enums: [], tables: [], error: e };
  }
}
