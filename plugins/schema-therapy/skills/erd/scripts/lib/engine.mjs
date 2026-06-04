// engine.mjs — the STRONGEST-ORACLE layer (simulation.md §0, §3.3). The parsed
// DBML model is realized as a live PostgreSQL schema (PGlite 0.5.1 / PG 18.3) and
// exercised with mechanically-derived generic scenarios + optional domain seeds.
//
// This layer is NEW to this skill (no sibling has an engine — no sibling's artifact
// is a runnable formalism). It REUSES the format's own proven tooling — the
// authoritative parser (`@dbml/core` 8.2.5) + a real Postgres (PGlite) — rather
// than inventing a DBML interpreter (doctrine: reuse over invention).
//
// Self-install + offline mode: the deps are NOT vendored (SOURCES.md). On first
// use this module probes scripts/node_modules; absent + network ⇒ self-install;
// absent + no network ⇒ the caller emits broken-test (never a vacuous green).
//
// Assertions are over COUNTS, VIOLATION CLASSES, and SQLSTATE CODES only — never
// serial ids / timestamps the engine minted (§8 determinism).

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SQLSTATE } from './lexicon.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..');
const NODE_MODULES = join(SCRIPTS_DIR, 'node_modules');

const DEP_PATHS = {
  '@dbml/core': join(NODE_MODULES, '@dbml', 'core'),
  '@electric-sql/pglite': join(NODE_MODULES, '@electric-sql', 'pglite'),
};

// --- self-install + offline failure mode (simulation.md §1) -----------------
// Returns { ok:true } when deps are present (after a successful self-install if
// needed), or { ok:false, missing:[...], reason } when they cannot be made
// present (no network / install failed) ⇒ the caller must emit broken-test.
export function ensureDeps({ allowInstall = true, forceMissingRoot = null } = {}) {
  const root = forceMissingRoot || NODE_MODULES;
  const depPaths = forceMissingRoot
    ? {
        '@dbml/core': join(root, '@dbml', 'core'),
        '@electric-sql/pglite': join(root, '@electric-sql', 'pglite'),
      }
    : DEP_PATHS;

  const missing = () => Object.entries(depPaths).filter(([, p]) => !existsSync(p)).map(([n]) => n);

  let absent = missing();
  if (absent.length === 0) return { ok: true, missing: [], installed: false };

  if (!allowInstall) {
    return {
      ok: false,
      missing: absent,
      reason: `engine dependencies absent (${absent.join(', ')}) and install disabled`,
    };
  }

  // Absent → attempt self-install into scripts/. Prefer `npm ci` (reproducible,
  // uses the committed lockfile) and fall back to `npm install`.
  const lockPresent = existsSync(join(SCRIPTS_DIR, 'package-lock.json'));
  const run = (cmd, args) =>
    spawnSync(cmd, args, { cwd: SCRIPTS_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

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

// Lazy-load the pinned engine packages AFTER ensureDeps has confirmed presence.
export async function loadEngine() {
  const dbmlCore = await import('@dbml/core');
  const { PGlite } = await import('@electric-sql/pglite');
  return { Parser: dbmlCore.Parser, ModelExporter: dbmlCore.ModelExporter, PGlite, VERSION: dbmlCore.VERSION };
}

// --- parse oracle (simulation.md §0 step 1, catalog A2) ---------------------
// Returns { ok, db, normalized, error }. A throw ⇒ malformed (caller routes).
export function parseDbml(Parser, dbmlText) {
  try {
    const db = new Parser().parse(dbmlText, 'dbmlv2');
    const normalized = db.export(); // { schemas, notes, records }
    return { ok: true, db, normalized, error: null };
  } catch (e) {
    return { ok: false, db: null, normalized: null, error: e };
  }
}

// Pull a flat, harness-friendly model out of the normalized @dbml/core export.
// tables[]   = { name, fields:[{name,type,pk,notNull,increment,note}], pk:[colNames], indexes:[{pk,columns}] }
// enums[]    = { name, values:[...] }
// refs[]     = { fromTable, fromCols, toTable, toCols, manyToMany, onDelete }
//   convention: `from` is the CHILD (holds the FK), `to` is the PARENT (holds PK).
export function deriveModel(normalized) {
  const schema = normalized.schemas && normalized.schemas[0] ? normalized.schemas[0] : { tables: [], enums: [], refs: [] };

  const enums = (schema.enums || []).map((e) => ({
    name: e.name,
    values: (e.values || []).map((v) => v.name),
  }));
  const enumNames = new Set(enums.map((e) => e.name));

  const tables = (schema.tables || []).map((t) => {
    const fields = (t.fields || []).map((f) => ({
      name: f.name,
      type: f.type && f.type.type_name ? f.type.type_name : String(f.type || ''),
      pk: !!f.pk,
      notNull: !!f.not_null,
      increment: !!f.increment,
      unique: !!f.unique,
      note: f.note || null,
      isEnum: enumNames.has(f.type && f.type.type_name ? f.type.type_name : ''),
    }));
    // Composite PK from an index marked [pk].
    const compositePk = (t.indexes || [])
      .filter((ix) => ix.pk)
      .map((ix) => (ix.columns || []).map((c) => (typeof c === 'string' ? c : c.value)));
    const inlinePk = fields.filter((f) => f.pk).map((f) => f.name);
    let pk = [];
    if (inlinePk.length) pk = inlinePk;
    else if (compositePk.length) pk = compositePk[0];
    return {
      name: t.name,
      fields,
      pk,
      compositePk: compositePk.length > 0,
      indexes: (t.indexes || []).map((ix) => ({
        pk: !!ix.pk,
        unique: !!ix.unique,
        columns: (ix.columns || []).map((c) => (typeof c === 'string' ? c : c.value)),
      })),
    };
  });

  const refs = (schema.refs || []).map((r) => {
    const eps = r.endpoints || [];
    // endpoint relation '*' = many side (child/FK holder); '1' = one side (parent/PK).
    let child = eps[0], parent = eps[1];
    if (eps.length === 2) {
      if (eps[0].relation === '1' && eps[1].relation === '*') { child = eps[1]; parent = eps[0]; }
    }
    const manyToMany = eps.length === 2 && eps[0].relation === '*' && eps[1].relation === '*';
    return {
      fromTable: child ? child.tableName : null,
      fromCols: child ? child.fieldNames : [],
      toTable: parent ? parent.tableName : null,
      toCols: parent ? parent.fieldNames : [],
      manyToMany,
      onDelete: r.onDelete || null,
    };
  });

  return { tables, enums, refs };
}

// --- DDL export oracle (simulation.md §0 step 2, catalog A3 / E-EXPORT) ------
export function exportDDL(ModelExporter, db) {
  try {
    const ddl = ModelExporter.export(db, 'postgres');
    return { ok: true, ddl, error: null };
  } catch (e) {
    return { ok: false, ddl: null, error: e };
  }
}

// --- execution oracle (simulation.md §0 step 3, §3.3) -----------------------
// Topologically order tables by FK dependency (parents first) so E-MINROW /
// E-FK parent inserts succeed. A cycle leaves the remaining tables in declared
// order (the DDL's DEFERRABLE FKs cover deferred inserts).
function topoOrder(model) {
  const byName = new Map(model.tables.map((t) => [t.name, t]));
  const deps = new Map(model.tables.map((t) => [t.name, new Set()]));
  for (const r of model.refs) {
    if (r.fromTable && r.toTable && r.fromTable !== r.toTable && byName.has(r.fromTable) && byName.has(r.toTable)) {
      deps.get(r.fromTable).add(r.toTable); // child depends on parent
    }
  }
  const ordered = [];
  const placed = new Set();
  let progress = true;
  while (placed.size < model.tables.length && progress) {
    progress = false;
    for (const t of model.tables) {
      if (placed.has(t.name)) continue;
      const unmet = [...deps.get(t.name)].some((d) => !placed.has(d));
      if (!unmet) { ordered.push(t); placed.add(t.name); progress = true; }
    }
  }
  // Any cycle remnant appended in declared order.
  for (const t of model.tables) if (!placed.has(t.name)) ordered.push(t);
  return ordered;
}

// Deterministic seed value for a column type (§8: fixed, never random/clock).
function seedValue(field, enumByName, ordinal = 1) {
  if (field.isEnum) {
    const en = enumByName.get(field.type);
    return en && en.values.length ? sqlLiteral(en.values[0]) : `'x'`;
  }
  const t = String(field.type).toLowerCase();
  if (/(^|[^a-z])(int|integer|int4|int8|bigint|smallint|serial|bigserial|numeric|decimal|real|double|float)/.test(t)) {
    return String(ordinal);
  }
  if (/bool/.test(t)) return 'true';
  if (/(timestamp|date|time)/.test(t)) return `'2020-01-01'`;
  if (/(json)/.test(t)) return `'{}'`;
  if (/(uuid)/.test(t)) return `'00000000-0000-0000-0000-00000000000${ordinal}'`;
  return sqlLiteral('a');
}

function sqlLiteral(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}
function ident(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

// Build a minimal valid INSERT for a table. NOT NULL columns + PK columns get a
// seed; increment columns are omitted (engine supplies identity). FK columns are
// satisfied by referencing the parent's already-inserted seed value (ordinal 1).
function minRowInsert(table, model, enumByName, fkParentValue) {
  const cols = [];
  const vals = [];
  for (const f of table.fields) {
    if (f.increment) continue; // identity column
    const isPk = table.pk.includes(f.name);
    const fkRef = model.refs.find((r) => r.fromTable === table.name && r.fromCols.includes(f.name));
    if (fkRef) {
      cols.push(ident(f.name));
      vals.push(String(fkParentValue(fkRef, f.name)));
      continue;
    }
    if (f.notNull || isPk) {
      cols.push(ident(f.name));
      vals.push(seedValue(f, enumByName, 1));
    }
  }
  if (cols.length === 0) {
    return `INSERT INTO ${ident(table.name)} DEFAULT VALUES`;
  }
  return `INSERT INTO ${ident(table.name)} (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
}

// Run the full engine battery. Returns { ddlApplied, scenarios:[{id,rule,status,detail}],
// counts:{scenarios,passed,total} }. `status` ∈ pass|fail. A scenario whose asserted
// violation class does not fire ⇒ fail (the engine is genuinely enforcing).
export async function runEngine(PGlite, ddl, model, domainScenario) {
  const enumByName = new Map(model.enums.map((e) => [e.name, e]));
  const scenarios = [];
  const add = (id, rule, status, detail = '') => scenarios.push({ id, rule, status, detail });

  const db = new PGlite();
  let ddlApplied = false;
  try {
    await db.exec(ddl);
    ddlApplied = true;
    add('E-DDL', 'A3', 'pass');
  } catch (e) {
    add('E-DDL', 'A3', 'fail', `DDL failed to apply: SQLSTATE ${e.code || '?'} — ${String(e.message).slice(0, 160)}`);
    await db.close();
    return { ddlApplied: false, scenarios, counts: tally(scenarios) };
  }

  const ordered = topoOrder(model);

  // Track one inserted PK value per table (for FK satisfaction + dup probes).
  const insertedPk = new Map(); // table -> { col -> value }

  // E-MINROW — every table accepts a minimal valid row (FKs satisfied topologically).
  for (const t of ordered) {
    const fkParentValue = (fkRef) => {
      // The parent's seed PK value is ordinal 1 (int) or the seeded literal.
      const parent = model.tables.find((x) => x.name === fkRef.toTable);
      const parentCol = fkRef.toCols[0];
      const pf = parent && parent.fields.find((f) => f.name === parentCol);
      if (pf && pf.increment) return '1';
      return pf ? seedValue(pf, enumByName, 1) : '1';
    };
    const sql = minRowInsert(t, model, enumByName, fkParentValue);
    try {
      const r = await db.query(sql);
      if (r.affectedRows === 1 || r.affectedRows === undefined) {
        add(`E-MINROW:${t.name}`, 'A3', 'pass');
        // remember a PK value for later probes
        const rec = {};
        for (const c of t.pk) {
          const f = t.fields.find((x) => x.name === c);
          rec[c] = f && f.increment ? 1 : stripLiteral(seedValue(f || {}, enumByName, 1));
        }
        insertedPk.set(t.name, rec);
      } else {
        add(`E-MINROW:${t.name}`, 'A3', 'fail', `INSERT affected ${r.affectedRows} rows (expected 1)`);
      }
    } catch (e) {
      add(`E-MINROW:${t.name}`, 'A3', 'fail', `INSERT rejected: SQLSTATE ${e.code || '?'} — ${String(e.message).slice(0, 120)}`);
    }
  }

  // Each destructive probe runs inside its OWN transaction that is ROLLED BACK, so
  // probes never pollute each other or the committed E-MINROW parent rows. The
  // SQLSTATE of the rejected statement is preserved across the rollback (verified).
  const isolated = async (fn) => {
    await db.query('BEGIN');
    try { const r = await fn(); await db.query('ROLLBACK'); return { thrown: null, value: r }; }
    catch (e) { try { await db.query('ROLLBACK'); } catch { /* already aborted */ } return { thrown: e, value: null }; }
  };

  // E-FK — every FK rejects an orphan child with SQLSTATE 23503.
  for (const r of model.refs) {
    if (!r.fromTable || !r.toTable) continue;
    const child = model.tables.find((t) => t.name === r.fromTable);
    if (!child) continue;
    const id = `E-FK:${r.fromTable}.${r.fromCols.join('+')}`;
    const sql = orphanInsert(child, r, model, enumByName);
    const { thrown } = await isolated(() => db.query(sql));
    if (!thrown) add(id, 'B7', 'fail', `orphan FK INSERT was ACCEPTED (FK not enforced)`);
    else if (thrown.code === SQLSTATE.FK_VIOLATION) add(id, 'B7', 'pass');
    else add(id, 'B7', 'fail', `rejected with SQLSTATE ${thrown.code} (expected ${SQLSTATE.FK_VIOLATION})`);
  }

  // E-ENUM — every enum-typed column rejects a non-enum value with 22P02.
  for (const t of model.tables) {
    for (const f of t.fields) {
      if (!f.isEnum) continue;
      const id = `E-ENUM:${t.name}.${f.name}`;
      const sql = enumBadInsert(t, f, model, enumByName);
      const { thrown } = await isolated(() => db.query(sql));
      if (!thrown) add(id, 'C5', 'fail', `out-of-domain enum value was ACCEPTED (enum not enforced)`);
      else if (thrown.code === SQLSTATE.ENUM_INVALID) add(id, 'C5', 'pass');
      else add(id, 'C5', 'fail', `rejected with SQLSTATE ${thrown.code} (expected ${SQLSTATE.ENUM_INVALID})`);
    }
  }

  // E-PK / E-JUNCTION — a duplicate PK / composite pair is rejected with 23505.
  // The probe runs on a FRESH PGlite of the same DDL: it seeds whatever parent
  // rows its FK columns need, inserts a child row, then inserts the SAME PK again.
  // A fresh instance keeps the probe fully self-contained (no collision with the
  // generic E-MINROW rows) while preserving §8 per-fixture freshness.
  for (const t of model.tables) {
    if (t.pk.length === 0) continue;
    const isJunction = t.compositePk && t.pk.length >= 2;
    const id = isJunction ? `E-JUNCTION:${t.name}` : `E-PK:${t.name}`;
    const rule = isJunction ? 'B6' : 'B1';
    const pdb = new PGlite();
    let seedErr = null, dupThrown = null, accepted = false;
    try {
      await pdb.exec(ddl);
      // seed parents for each FK column at ordinal 7 (a fixed, collision-free value).
      const parents = parentSeedInserts(t, model, enumByName, 7);
      for (const p of parents) await pdb.query(p);
      const childSql = explicitPkInsert(t, model, enumByName, 7);
      try { await pdb.query(childSql); } catch (e) { seedErr = e; }
      if (!seedErr) {
        try { await pdb.query(childSql); accepted = true; } catch (e) { dupThrown = e; }
      }
    } catch (e) { seedErr = seedErr || e; }
    finally { await pdb.close(); }
    if (seedErr) add(id, rule, 'fail', `could not seed a PK row to test duplication: SQLSTATE ${seedErr.code || '?'} — ${String(seedErr.message).slice(0, 100)}`);
    else if (accepted) add(id, rule, 'fail', `duplicate PK INSERT was ACCEPTED (uniqueness not enforced)`);
    else if (dupThrown && dupThrown.code === SQLSTATE.UNIQUE_VIOLATION) add(id, rule, 'pass');
    else add(id, rule, 'fail', `dup rejected with SQLSTATE ${dupThrown && dupThrown.code} (expected ${SQLSTATE.UNIQUE_VIOLATION})`);
  }

  // E-DOMAIN — skill-shipped domain seeds + asserts. Runs on a FRESH PGlite of the
  // same DDL so the harness's generic probes never contaminate the domain seed run
  // (the domain seeds carry their own deterministic ids).
  if (domainScenario && Array.isArray(domainScenario.seeds)) {
    const ddb = new PGlite();
    let domainOk = true;
    const details = [];
    try {
      await ddb.exec(ddl);
      for (const seed of domainScenario.seeds) {
        const cols = Object.keys(seed.row);
        const vals = cols.map((c) => valueToSql(seed.row[c]));
        await ddb.query(`INSERT INTO ${ident(seed.table)} (${cols.map(ident).join(', ')}) VALUES (${vals.join(', ')})`);
      }
      for (const a of domainScenario.asserts || []) {
        const res = await ddb.query(a.query);
        if (a.expect && typeof a.expect.rowCount === 'number' && res.rows.length !== a.expect.rowCount) {
          domainOk = false;
          details.push(`assert '${a.query.slice(0, 40)}…' returned ${res.rows.length} rows (expected ${a.expect.rowCount})`);
        }
      }
    } catch (e) {
      domainOk = false;
      details.push(`domain scenario threw: SQLSTATE ${e.code || '?'} — ${String(e.message).slice(0, 120)}`);
    } finally { await ddb.close(); }
    add('E-DOMAIN', 'C', domainOk ? 'pass' : 'fail', details.join('; '));
  }

  await db.close();
  return { ddlApplied, scenarios, counts: tally(scenarios) };

  // --- inner helpers (closures over db/model) -------------------------------
  function orphanInsert(child, ref, model, enumByName) {
    const cols = [];
    const vals = [];
    for (const f of child.fields) {
      if (f.increment) continue;
      const isFkCol = ref.fromCols.includes(f.name);
      const otherFk = model.refs.find((rr) => rr !== ref && rr.fromTable === child.name && rr.fromCols.includes(f.name));
      if (isFkCol) { cols.push(ident(f.name)); vals.push('999999'); continue; } // orphan
      if (otherFk) {
        // satisfy other FKs with a real parent value to isolate THIS FK's violation
        cols.push(ident(f.name)); vals.push('1');
        continue;
      }
      if (f.notNull || child.pk.includes(f.name)) { cols.push(ident(f.name)); vals.push(seedValue(f, enumByName, 2)); }
    }
    if (!cols.length) return `INSERT INTO ${ident(child.name)} (${ident(ref.fromCols[0])}) VALUES (999999)`;
    return `INSERT INTO ${ident(child.name)} (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
  }

  function enumBadInsert(t, enumField, model, enumByName) {
    const cols = [];
    const vals = [];
    for (const f of t.fields) {
      if (f.increment) continue;
      if (f.name === enumField.name) { cols.push(ident(f.name)); vals.push(sqlLiteral('__not_a_valid_enum_value__')); continue; }
      const fkRef = model.refs.find((r) => r.fromTable === t.name && r.fromCols.includes(f.name));
      if (fkRef) { cols.push(ident(f.name)); vals.push('1'); continue; }
      if (f.notNull || t.pk.includes(f.name)) { cols.push(ident(f.name)); vals.push(seedValue(f, enumByName, 3)); }
    }
    return `INSERT INTO ${ident(t.name)} (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
  }

  // The child row for the PK-dup probe: every PK column gets a FIXED value at the
  // given ordinal so the second identical insert collides; FK columns point at the
  // seeded parent at the same ordinal; other NOT NULL columns get a type seed.
  function explicitPkInsert(t, model, enumByName, ordinal) {
    const cols = [];
    const vals = [];
    for (const f of t.fields) {
      if (f.increment && !t.pk.includes(f.name)) continue;
      const isPk = t.pk.includes(f.name);
      const fkRef = model.refs.find((r) => r.fromTable === t.name && r.fromCols.includes(f.name));
      if (isPk) {
        cols.push(ident(f.name));
        vals.push(fkRef ? String(ordinal) : pkSeed(f, enumByName, ordinal));
        continue;
      }
      if (fkRef) { cols.push(ident(f.name)); vals.push(String(ordinal)); continue; }
      if (f.notNull) { cols.push(ident(f.name)); vals.push(seedValue(f, enumByName, ordinal)); }
    }
    return `INSERT INTO ${ident(t.name)} (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
  }

  function pkSeed(f, enumByName, ordinal) {
    const ty = String(f.type).toLowerCase();
    if (/(int|serial|numeric|decimal|bigint|smallint|real|double|float)/.test(ty)) return String(ordinal);
    return seedValue(f, enumByName, ordinal);
  }

  // For the PK-dup probe on table t, build INSERTs that create the FULL transitive
  // FK-parent closure of t — not just its immediate parents. A multi-hop chain
  // (e.g. refund → ticket → event → venue) needs every ancestor seeded, parents
  // first, or the immediate-parent insert itself dies with 23503 before the
  // duplicate-PK assertion can run. We collect the closure, then emit inserts in
  // topological (ancestors-first) order — mirroring the topoOrder logic E-MINROW
  // uses. Every seeded row uses the SAME ordinal so each child's FK column finds
  // its already-seeded parent's PK. Returns [] when t has no FK columns.
  function parentSeedInserts(t, model, enumByName, ordinal) {
    const byName = new Map(model.tables.map((x) => [x.name, x]));
    // 1. Gather the transitive ancestor closure of t (excluding t itself).
    const closure = new Set();
    const stack = [t.name];
    while (stack.length) {
      const cur = stack.pop();
      for (const r of model.refs) {
        if (r.fromTable !== cur || !r.toTable || r.toTable === cur) continue;
        if (!byName.has(r.toTable)) continue;
        if (r.toTable === t.name) continue; // a cycle back to t; t is seeded by the child insert
        if (!closure.has(r.toTable)) { closure.add(r.toTable); stack.push(r.toTable); }
      }
    }
    if (closure.size === 0) return [];
    // 2. Topologically order the closure (ancestors before descendants) so each
    //    insert's FK columns reference an already-seeded parent.
    const inClosure = (n) => closure.has(n);
    const deps = new Map([...closure].map((n) => [n, new Set()]));
    for (const r of model.refs) {
      if (inClosure(r.fromTable) && inClosure(r.toTable) && r.fromTable !== r.toTable) {
        deps.get(r.fromTable).add(r.toTable);
      }
    }
    const ordered = [];
    const placed = new Set();
    let progress = true;
    while (placed.size < closure.size && progress) {
      progress = false;
      for (const n of closure) {
        if (placed.has(n)) continue;
        if ([...deps.get(n)].every((d) => placed.has(d))) { ordered.push(n); placed.add(n); progress = true; }
      }
    }
    for (const n of closure) if (!placed.has(n)) ordered.push(n); // cycle remnant
    // 3. Build one INSERT per ancestor table, FK columns pointing at the seeded
    //    parent's PK at the same ordinal.
    const inserts = [];
    for (const name of ordered) {
      const parent = byName.get(name);
      const cols = [];
      const vals = [];
      for (const f of parent.fields) {
        const fkRef = model.refs.find((r) => r.fromTable === parent.name && r.fromCols.includes(f.name) && inClosure(r.toTable));
        if (fkRef) { cols.push(ident(f.name)); vals.push(String(ordinal)); continue; }
        if (f.increment && !parent.pk.includes(f.name)) continue;
        if (parent.pk.includes(f.name)) { cols.push(ident(f.name)); vals.push(pkSeed(f, enumByName, ordinal)); continue; }
        if (f.notNull) { cols.push(ident(f.name)); vals.push(seedValue(f, enumByName, ordinal)); }
      }
      inserts.push(cols.length
        ? `INSERT INTO ${ident(parent.name)} (${cols.join(', ')}) VALUES (${vals.join(', ')})`
        : `INSERT INTO ${ident(parent.name)} DEFAULT VALUES`);
    }
    return inserts;
  }
}

function stripLiteral(v) {
  const s = String(v);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}
function valueToSql(v) {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return sqlLiteral(v);
}
function tally(scenarios) {
  const total = scenarios.length;
  const passed = scenarios.filter((s) => s.status === 'pass').length;
  return { scenarios: total, passed, total };
}

// --- domain scenario shape validation (simulation.md §3.3b) -----------------
// Closed schema: { seeds:[{table,row}], asserts:[{query,expect:{rowCount|class}}] }.
// A shape violation ⇒ malformed (caller routes). Returns { ok, detail }.
export function validateScenarioShape(obj) {
  if (obj == null || typeof obj !== 'object') return { ok: false, detail: 'scenario file is not a JSON object' };
  if (!Array.isArray(obj.seeds)) return { ok: false, detail: '`seeds` must be an array' };
  if (!Array.isArray(obj.asserts)) return { ok: false, detail: '`asserts` must be an array' };
  for (const s of obj.seeds) {
    if (!s || typeof s.table !== 'string' || typeof s.row !== 'object' || s.row == null) {
      return { ok: false, detail: 'each seed must be { table:string, row:object }' };
    }
  }
  for (const a of obj.asserts) {
    if (!a || typeof a.query !== 'string' || !a.expect || typeof a.expect !== 'object') {
      return { ok: false, detail: 'each assert must be { query:string, expect:{rowCount|class} }' };
    }
    if (typeof a.expect.rowCount !== 'number' && typeof a.expect.class !== 'string') {
      return { ok: false, detail: 'each assert.expect must declare a numeric rowCount or a string class' };
    }
  }
  return { ok: true, detail: '' };
}
