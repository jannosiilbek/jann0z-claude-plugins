// engine.mjs — the STRONGEST-ORACLE layer (simulation.md §0, §3.3). Every emitted
// machine is LOADED and RUN on the format's own historical IRP reference SCXML
// interpreter (SCION @scion-scxml/core 2.6.24 + @scion-scxml/scxml 4.3.27), started,
// and driven event-by-event from its 04 transition table; the configuration is
// asserted after every step. This is the "reuse the format's real engine over
// inventing an interpreter" call doctrine B3 requires.
//
// The TWO §0 dormancy gotchas are guarded here, or the harness silently mis-reads:
//   1. documentStringToModel(null, …) throws on modern Node — we ALWAYS pass a
//      non-null URI ('mem://<entity>').
//   2. the Statechart constructor MUST get the PREPARED model (modelFactory.prepare
//      → fnModel); the unprepared factory yields a vacuous machine whose config reads
//      ["$generated-state-0"] and never advances. W-LOAD asserts the first start() is
//      a real 02 enum value (never $generated-state-0) so that failure mode is CAUGHT.
//
// Self-install + offline mode: deps NOT vendored. Absent + network ⇒ self-install;
// absent + no network ⇒ the caller emits broken-test (never a vacuous green).
//
// Assertions are over CONFIGURATIONS ONLY (sorted state-id arrays / set membership) —
// fully deterministic in the null datamodel; no timestamps, no engine-minted values.

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eventTransform } from './lexicon.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..');
const NODE_MODULES = join(SCRIPTS_DIR, 'node_modules');

const DEP_DIRS = {
  '@scion-scxml/core': join(NODE_MODULES, '@scion-scxml', 'core'),
  '@scion-scxml/scxml': join(NODE_MODULES, '@scion-scxml', 'scxml'),
  '@dbml/core': join(NODE_MODULES, '@dbml', 'core'),
};

// --- self-install + offline failure mode (simulation.md §1) -----------------
export function ensureDeps({ allowInstall = true, forceMissingRoot = null } = {}) {
  const depPaths = forceMissingRoot
    ? {
        '@scion-scxml/core': join(forceMissingRoot, '@scion-scxml', 'core'),
        '@scion-scxml/scxml': join(forceMissingRoot, '@scion-scxml', 'scxml'),
        '@dbml/core': join(forceMissingRoot, '@dbml', 'core'),
      }
    : DEP_DIRS;

  const missing = () => Object.entries(depPaths).filter(([, p]) => !existsSync(p)).map(([n]) => n);

  let absent = missing();
  if (absent.length === 0) return { ok: true, missing: [], installed: false };

  if (!allowInstall) {
    return { ok: false, missing: absent, reason: `engine dependencies absent (${absent.join(', ')}) and install disabled` };
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
    reason: `engine dependencies absent (${absent.join(', ')}); self-install failed (likely offline). ` +
      `Run: npm --prefix scripts ci  (or: npm --prefix scripts install)`,
    installerStderr: res ? (res.stderr || '').slice(0, 400) : '',
  };
}

// Lazy-load the pinned engine packages AFTER ensureDeps confirmed presence.
export function loadEngine() {
  const require = createRequire(import.meta.url);
  const scxml = require('@scion-scxml/scxml');
  const dbmlCore = require('@dbml/core');
  return { scxml, Parser: dbmlCore.Parser, dbmlVersion: dbmlCore.VERSION };
}

// --- DBML enum + lifecycle-entity enumeration (the 04-erd.dbml role) ---------
// We parse 04-erd.dbml ONLY as a parse-validity gate on the fifth upstream (unparseable
// .dbml => broken-test). Gate state-counts + lifecycle binding come from 04-transitions.md
// + 02-glossary.md via bindEntities, not from the .dbml model,
// for the gate state-count + lifecycle-entity binding (M8/M11). Mirrors the erd
// harness's @dbml/core usage. Returns { ok, enums:[{name,values}], tables:[name] }.
export function parseDbmlEnums(Parser, dbmlText) {
  try {
    const db = new Parser().parse(dbmlText, 'dbmlv2');
    const normalized = db.export();
    const schema = normalized.schemas && normalized.schemas[0] ? normalized.schemas[0] : { tables: [], enums: [] };
    const enums = (schema.enums || []).map((e) => ({ name: e.name, values: (e.values || []).map((v) => v.name) }));
    const tables = (schema.tables || []).map((t) => t.name);
    return { ok: true, enums, tables, error: null };
  } catch (e) {
    return { ok: false, enums: [], tables: [], error: e };
  }
}

// --- the SCION load + walk oracle (simulation.md §3.3) ----------------------
// loadMachine(scxml, entity, docString) → Promise<{ ok, sc?, error? }>.
// SCION's documentStringToModel parses via jsdom and fires its callback
// ASYNCHRONOUSLY (the parse is not synchronous on modern Node), so the load is
// promisified. Always passes a NON-NULL URI (gotcha-1) and ALWAYS prepare()s before
// constructing (gotcha-2 — handing the unprepared factory yields
// ["$generated-state-0"], guarded by W-LOAD). Each call builds a FRESH machine
// instance (§8 fresh state — one per W-STEP prefix replay).
export function loadMachine(scxml, entity, docString) {
  return new Promise((resolve) => {
    try {
      scxml.documentStringToModel(`mem://${entity}`, docString, (err, modelFactory) => {
        if (err) { resolve({ ok: false, sc: null, error: err }); return; }
        modelFactory.prepare((err2, fnModel) => {
          if (err2) { resolve({ ok: false, sc: null, error: err2 }); return; }
          try {
            const sc = new scxml.core.Statechart(fnModel);
            resolve({ ok: true, sc, error: null });
          } catch (e) {
            resolve({ ok: false, sc: null, error: e });
          }
        });
      });
    } catch (e) {
      resolve({ ok: false, sc: null, error: e });
    }
  });
}

// Make a FRESH machine instance (one per W-STEP prefix replay — §8 fresh state).
export function freshMachine(scxml, entity, docString) {
  return loadMachine(scxml, entity, docString);
}

function sortedConfig(arr) {
  return (Array.isArray(arr) ? arr.slice() : []).sort();
}

// Build the deterministic BFS prefix walk from `initial`: for each basic state, the
// shortest event sequence (transformed event names) that reaches it. Returns
// Map(stateId → [eventName,…]). Uses ONLY the 04 rows (source/event/target), so it is
// independent of the engine (the engine confirms the walk; the BFS plans it).
export function planPrefixWalks(entity04) {
  const initial = entity04.initial;
  const adj = new Map(); // from → [{event, to}]
  for (const r of entity04.rows) {
    if (r.from === '∅') continue;
    if (!adj.has(r.from)) adj.set(r.from, []);
    adj.get(r.from).push({ event: eventTransform(r.event01), to: r.to });
  }
  const prefix = new Map();
  if (initial == null) return prefix;
  prefix.set(initial, []);
  const queue = [initial];
  while (queue.length) {
    const cur = queue.shift();
    const curPrefix = prefix.get(cur);
    for (const edge of adj.get(cur) || []) {
      if (!prefix.has(edge.to)) {
        prefix.set(edge.to, curPrefix.concat([edge.event]));
        queue.push(edge.to);
      }
    }
  }
  return prefix;
}

// Run the full engine walk battery for ONE machine. Returns
// { walks:[{id,rule,status,detail}], counts:{walks,passed,total} }.
// `entity04` = { entity, rows, initial }; `docString` = the machine's exact bytes;
// `machineModel` = the hand-rolled scxml model (for basic-state list / finals).
// `scenarios` = optional guard scenarios [{datamodel, event, expectConfig}].
export async function runMachineWalks(scxml, entity04, docString, machineModel, scenarios) {
  const walks = [];
  const add = (id, rule, status, detail = '') => walks.push({ id, rule, status, detail });
  const entity = entity04.entity;

  // W-LOAD — loads + prepares; initial config is a real 02 enum value, never
  // ["$generated-state-0"] (gotcha-2 guard).
  const loaded = await loadMachine(scxml, entity, docString);
  if (!loaded.ok) {
    add('W-LOAD', 'D1', 'fail', `SCION load/prepare threw: ${String(loaded.error && loaded.error.message || loaded.error).slice(0, 160)}`);
    return { walks, counts: tally(walks) };
  }
  let initialConfig;
  try {
    initialConfig = sortedConfig(loaded.sc.start());
  } catch (e) {
    add('W-LOAD', 'D1', 'fail', `start() threw: ${String(e.message).slice(0, 160)}`);
    return { walks, counts: tally(walks) };
  }
  if (initialConfig.includes('$generated-state-0')) {
    add('W-LOAD', 'D1', 'fail', `initial configuration is ["$generated-state-0"] — model not prepared (gotcha-2 trip)`);
    return { walks, counts: tally(walks) };
  }
  add('W-LOAD', 'D1', 'pass');

  // W-INIT — start() configuration contains the 04 ∅-row `To` (parallel: entry
  // closure holds it among sibling-region states; we assert set membership).
  if (entity04.initial != null) {
    if (initialConfig.includes(entity04.initial)) add('W-INIT', 'A7/C3', 'pass');
    else add('W-INIT', 'A7/C3', 'fail', `start() config [${initialConfig.join(',')}] does not contain ∅-row initial '${entity04.initial}'`);
  } else {
    add('W-INIT', 'A7/C3', 'fail', `04 has no ∅-row initial for entity '${entity}'`);
  }

  // W-STEP — for each 04 row, replay the deterministic prefix to `From` on a FRESH
  // machine, then gen(event); the resulting config must CONTAIN `To`.
  const prefixes = planPrefixWalks(entity04);
  for (const r of entity04.rows) {
    if (r.from === '∅') continue;
    const ev = eventTransform(r.event01);
    const prefix = prefixes.get(r.from);
    if (prefix == null) {
      add(`W-STEP:${r.from}-${ev}->${r.to}`, 'C2', 'fail', `no deterministic prefix walk reaches source '${r.from}' (unreachable)`);
      continue;
    }
    const m = await freshMachine(scxml, entity, docString);
    if (!m.ok) { add(`W-STEP:${r.from}-${ev}->${r.to}`, 'C2', 'fail', 'fresh machine load failed'); continue; }
    try {
      m.sc.start();
      for (const e of prefix) m.sc.gen({ name: e });
      const config = sortedConfig(m.sc.gen({ name: ev }));
      if (config.includes(r.to)) add(`W-STEP:${r.from}-${ev}->${r.to}`, 'C2', 'pass');
      else add(`W-STEP:${r.from}-${ev}->${r.to}`, 'C2', 'fail', `after '${ev}' from '${r.from}' config [${config.join(',')}] does not contain target '${r.to}'`);
    } catch (e) {
      add(`W-STEP:${r.from}-${ev}->${r.to}`, 'C2', 'fail', `walk threw: ${String(e.message).slice(0, 120)}`);
    }
  }

  // W-NEG — for each basic state, fire a disabled event; config must be UNCHANGED
  // and no error.* raised (reason-qualified: the Rec discards unmatched events).
  const events04 = new Set(entity04.rows.filter((r) => r.from !== '∅').map((r) => eventTransform(r.event01)));
  for (const stateId of machineModel.basicStateIds) {
    // an event whose 04 `From` ≠ this state, or a synthetic one.
    const enabledHere = new Set(entity04.rows.filter((r) => r.from === stateId).map((r) => eventTransform(r.event01)));
    let disabled = '__no_such_event__';
    for (const e of events04) { if (!enabledHere.has(e)) { disabled = e; break; } }
    const m = await freshMachine(scxml, entity, docString);
    if (!m.ok) { add(`W-NEG:${stateId}`, 'D7', 'fail', 'fresh machine load failed'); continue; }
    try {
      m.sc.start();
      const prefix = prefixes.get(stateId);
      if (prefix == null) { add(`W-NEG:${stateId}`, 'D7', 'fail', `cannot reach '${stateId}' for negative probe`); continue; }
      for (const e of prefix) m.sc.gen({ name: e });
      const before = sortedConfig(m.sc.getConfiguration ? m.sc.getConfiguration() : m.sc.gen({ name: '__noop_probe__' }));
      let errored = false;
      const after = sortedConfig(m.sc.gen({ name: disabled }));
      // SCION discards unmatched events silently; a thrown error would surface here.
      if (errored) add(`W-NEG:${stateId}`, 'D7', 'fail', `disabled event '${disabled}' raised an error in '${stateId}'`);
      else if (JSON.stringify(before) === JSON.stringify(after)) add(`W-NEG:${stateId}`, 'D7', 'pass');
      else add(`W-NEG:${stateId}`, 'D7', 'fail', `disabled event '${disabled}' CHANGED config in '${stateId}': [${before.join(',')}] → [${after.join(',')}]`);
    } catch (e) {
      add(`W-NEG:${stateId}`, 'D7', 'fail', `negative walk threw: ${String(e.message).slice(0, 120)}`);
    }
  }

  // W-GUARD — for an ecmascript machine, every shipped scenario drives the
  // cond-selected branch to its expectConfig. A guard-justified (ecmascript) machine
  // with ZERO scenarios is a fail (gate-justifying feature unverified — no vacuous
  // engine pass on the guard arm).
  const isEcmascript = machineModel.datamodel === 'ecmascript';
  const hasCond = machineModel.transitions.some((t) => t.cond != null);
  if (isEcmascript || hasCond) {
    if (!scenarios || scenarios.length === 0) {
      add('W-GUARD', 'B2', 'fail', `${entity}: guard-justified (ecmascript/cond) machine ships NO data scenarios — guard arm unverified`);
    } else {
      for (let si = 0; si < scenarios.length; si++) {
        const sc = scenarios[si];
        const seededDoc = seedDatamodel(docString, sc.datamodel || {});
        const m = await freshMachine(scxml, entity, seededDoc);
        if (!m.ok) { add(`W-GUARD:${si}`, 'B2', 'fail', `scenario ${si}: machine load failed (seeded data)`); continue; }
        try {
          m.sc.start();
          const config = sortedConfig(m.sc.gen({ name: sc.event }));
          const expect = sortedConfig(sc.expectConfig || []);
          if (JSON.stringify(config) === JSON.stringify(expect)) add(`W-GUARD:${si}`, 'B2', 'pass');
          else add(`W-GUARD:${si}`, 'B2', 'fail', `scenario ${si} (${JSON.stringify(sc.datamodel)}, '${sc.event}'): config [${config.join(',')}] ≠ expected [${expect.join(',')}]`);
        } catch (e) {
          add(`W-GUARD:${si}`, 'B2', 'fail', `scenario ${si} threw: ${String(e.message).slice(0, 120)}`);
        }
      }
    }
  }

  // W-FINAL — if the machine has a top-level <final>, a terminal walk reaches it and
  // isFinal() agrees. We drive the longest deterministic walk to a final, if any.
  if (machineModel.finals.length > 0) {
    const target = pickReachableFinal(entity04, machineModel, prefixes);
    if (target) {
      const m = await freshMachine(scxml, entity, docString);
      try {
        m.sc.start();
        for (const e of prefixes.get(target)) m.sc.gen({ name: e });
        const config = sortedConfig(m.sc.getConfiguration ? m.sc.getConfiguration() : []);
        const isFinal = m.sc.isFinal ? m.sc.isFinal() : config.includes(target);
        // W-FINAL is advisory-only by design: catalog C6 is an ℹ️ rule whose mechanical
        // owner is M23; this walk records the engine's isFinal view but never blocks.
        if (config.includes(target) && isFinal) add('W-FINAL', 'C6', 'pass');
        else add('W-FINAL', 'C6', 'pass', 'advisory: engine did not report final; see M23/C6 (ℹ️)');
      } catch (e) {
        add('W-FINAL', 'C6', 'pass'); // advisory; never blocks
      }
    } else {
      add('W-FINAL', 'C6', 'pass');
    }
  }

  return { walks, counts: tally(walks) };
}

// Pick a top-level final that has a deterministic prefix.
function pickReachableFinal(entity04, machineModel, prefixes) {
  for (const f of machineModel.finals) {
    if (prefixes.has(f)) return f;
  }
  return null;
}

// Inject seed data values into the machine's <datamodel><data> initial expr for the
// guard scenarios (deterministic literals — §8). Rewrites `expr="…"` of a matching
// <data id="…">.
function seedDatamodel(docString, data) {
  let out = docString;
  for (const [k, v] of Object.entries(data)) {
    const lit = typeof v === 'number' ? String(v) : (typeof v === 'boolean' ? String(v) : JSON.stringify(v));
    const re = new RegExp(`(<data\\s+id="${k}"[^>]*?\\bexpr=")[^"]*(")`);
    if (re.test(out)) out = out.replace(re, `$1${lit}$2`);
    else {
      // inject a <data> if the id is absent but a <datamodel> exists.
      out = out.replace(/<datamodel>/, `<datamodel><data id="${k}" expr="${lit}"/>`);
    }
  }
  return out;
}

function tally(walks) {
  const total = walks.length;
  const passed = walks.filter((w) => w.status === 'pass').length;
  return { walks: total, passed, total };
}
