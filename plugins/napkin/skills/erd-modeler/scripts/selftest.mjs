#!/usr/bin/env node
// selftest.mjs — adversarial regression tests for the run-erd-test.mjs ORACLE.
// Each scenario feeds the harness inputs designed to expose a false-green and asserts
// the harness reacts correctly. Run: node selftest.mjs   (exits non-zero on any failure)

import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const HARNESS = join(HERE, 'run-erd-test.mjs')

// Strip CLAUDE_PLUGIN_DATA so tests are deterministic even when run inside a plugin
// session: the harness must resolve deps from the scripts dir here.
const CLEAN_ENV = { ...process.env }
delete CLEAN_ENV.CLAUDE_PLUGIN_DATA

function runArgs(args, env = CLEAN_ENV) {
  let out, exit = 0
  try {
    out = execFileSync('node', [HARNESS, ...args], { encoding: 'utf8', env })
  } catch (e) {
    out = e.stdout?.toString() ?? ''
    exit = e.status ?? 1
  }
  let summary = null
  try { summary = JSON.parse(out) } catch { /* usage errors print no JSON */ }
  return { exit, summary }
}

function run(schema, seed, usecases) {
  const dir = mkdtempSync(join(tmpdir(), 'erd-selftest-'))
  writeFileSync(join(dir, 'schema.sql'), schema)
  writeFileSync(join(dir, 'seed.sql'), seed)
  writeFileSync(join(dir, 'usecases.sql'), usecases)
  return runArgs(['--schema', join(dir, 'schema.sql'), '--seed', join(dir, 'seed.sql'), '--usecases', join(dir, 'usecases.sql')])
}

function runDbml(dbml, seed, usecases, extraArgs = []) {
  const dir = mkdtempSync(join(tmpdir(), 'erd-selftest-'))
  writeFileSync(join(dir, 'model.dbml'), dbml)
  writeFileSync(join(dir, 'seed.sql'), seed)
  writeFileSync(join(dir, 'usecases.sql'), usecases)
  const r = runArgs(['--dbml', join(dir, 'model.dbml'), '--seed', join(dir, 'seed.sql'), '--usecases', join(dir, 'usecases.sql'), ...extraArgs])
  return { ...r, dir }
}

const SCHEMA = `
CREATE TABLE products (
  id    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku   varchar UNIQUE NOT NULL,
  price numeric(12,2) NOT NULL
);
CREATE TABLE orders (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);
CREATE TABLE order_items (
  order_id   integer NOT NULL REFERENCES orders(id),
  product_id integer NOT NULL REFERENCES products(id),
  qty        integer NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);
`
const SEED = `
INSERT INTO products (sku, price) OVERRIDING SYSTEM VALUE VALUES ('A', 35.00),('B', 10.00);
INSERT INTO orders DEFAULT VALUES;
INSERT INTO order_items (order_id, product_id, qty) VALUES (1, 1, 2);
SELECT setval(pg_get_serial_sequence('products','id'), (SELECT max(id) FROM products));
`

let failures = 0
function check(name, cond, detail) {
  if (cond) { console.log(`  PASS  ${name}`) }
  else { console.log(`  FAIL  ${name} — ${detail}`); failures++ }
}

// 1. BLOCKER fix: `-- expect: error` against a broken schema (typo'd table) must FAIL as broken-test.
{
  const r = run(SCHEMA, SEED, `-- usecase: orphan rejected (but table name is wrong)\nINSERT INTO nonexistent_table (x) VALUES (1);\n-- expect: error`)
  const u = r.summary.usecases[0]
  check('broken-test caught (P1)', u.status === 'broken-test' && u.pass === false && r.exit !== 0, `got status=${u.status} pass=${u.pass} exit=${r.exit}`)
}

// 1b. Reason-bound negative test: real FK violation matches `error ~ foreign key`; mislabeled reason fails.
{
  const r = run(SCHEMA, SEED, `-- usecase: orphan FK rejected\nINSERT INTO order_items (order_id, product_id, qty) VALUES (1, 999, 1);\n-- expect: error ~ foreign key`)
  check('FK reason matches (P1)', r.summary.usecases[0].pass === true && r.exit === 0, JSON.stringify(r.summary.usecases[0]))
  const r2 = run(SCHEMA, SEED, `-- usecase: dup sku (wrongly labeled as FK)\nINSERT INTO products (sku, price) VALUES ('A', 1);\n-- expect: error ~ foreign key`)
  check('wrong reason rejected (P1)', r2.summary.usecases[0].pass === false, JSON.stringify(r2.summary.usecases[0]))
  const r3 = run(SCHEMA, SEED, `-- usecase: dup sku rejected\nINSERT INTO products (sku, price) VALUES ('A', 1);\n-- expect: error ~ unique`)
  check('unique reason matches (P1)', r3.summary.usecases[0].pass === true, JSON.stringify(r3.summary.usecases[0]))
}

// 2. Vacuous pass: a usecase label with no body parses to 0 cases → must exit non-zero.
{
  const r = run(SCHEMA, SEED, `-- usecase: forgot the SQL\n-- expect: rows=1`)
  check('vacuous pass blocked (P2)', r.exit !== 0 && r.summary.ok === false, `exit=${r.exit} ok=${r.summary.ok}`)
}

// 3. rowcount vs rows strict: rowcount=N on a SELECT must FAIL as expect-mismatch — even
// rowcount=0, which a SELECT's affectedRows=0 would otherwise satisfy.
{
  const r = run(SCHEMA, SEED, `-- usecase: select mislabeled as write\nSELECT * FROM products;\n-- expect: rowcount=2`)
  check('rowcount/rows not conflated (P3)', r.summary.usecases[0].status === 'expect-mismatch' && r.summary.usecases[0].pass === false, JSON.stringify(r.summary.usecases[0]))
  const r2 = run(SCHEMA, SEED, `-- usecase: rowcount=0 on a read\nSELECT * FROM products WHERE 1=0;\n-- expect: rowcount=0`)
  check('rowcount=0 on read blocked (P3)', r2.summary.usecases[0].status === 'expect-mismatch' && r2.summary.usecases[0].pass === false, JSON.stringify(r2.summary.usecases[0]))
}

// 3b. rows= on a write: rows=0 on an INSERT would vacuously pass (writes return no rows) —
// must fail as expect-mismatch. With RETURNING the assertion is legitimate and must pass.
{
  const r = run(SCHEMA, SEED, `-- usecase: insert asserted with rows\nINSERT INTO order_items (order_id, product_id, qty) VALUES (1, 2, 5);\n-- expect: rows=0`)
  check('rows= on plain write blocked (P3b)', r.summary.usecases[0].status === 'expect-mismatch' && r.summary.usecases[0].pass === false, JSON.stringify(r.summary.usecases[0]))
  const r2 = run(SCHEMA, SEED, `-- usecase: insert with returning\nINSERT INTO order_items (order_id, product_id, qty) VALUES (1, 2, 5) RETURNING order_id;\n-- expect: rows=1`)
  check('rows= with RETURNING passes (P3b)', r2.summary.usecases[0].pass === true, JSON.stringify(r2.summary.usecases[0]))
}

// 3c. rows>=0 is vacuously true — must be rejected as malformed.
{
  const r = run(SCHEMA, SEED, `-- usecase: vacuous bound\nSELECT * FROM products;\n-- expect: rows>=0`)
  check('rows>=0 rejected as malformed (P3c)', r.summary.usecases[0].status === 'malformed' && r.summary.usecases[0].pass === false, JSON.stringify(r.summary.usecases[0]))
}

// 4. Scalar value assertion catches fan-trap inflation.
{
  const correct = `-- usecase: revenue (correct)\nSELECT SUM(oi.qty*p.price) AS revenue FROM order_items oi JOIN products p ON p.id=oi.product_id;\n-- expect: value=70.00`
  const r = run(SCHEMA, SEED, correct)
  check('value= passes correct (P4)', r.summary.usecases[0].pass === true && r.exit === 0, JSON.stringify(r.summary.usecases[0]))
  // Inflate via an extra cross join (a 2-row table) then assert the un-inflated 70 → must FAIL.
  const inflated = `-- usecase: revenue (fan-inflated)\nSELECT SUM(oi.qty*p.price) AS revenue FROM order_items oi JOIN products p ON p.id=oi.product_id CROSS JOIN (VALUES (1),(2)) t(x);\n-- expect: value=70.00`
  const r2 = run(SCHEMA, SEED, inflated)
  check('value= catches inflation (P4)', r2.summary.usecases[0].pass === false, JSON.stringify(r2.summary.usecases[0]))
}

// 5. Malformed expect is distinct from a content failure.
{
  const r = run(SCHEMA, SEED, `-- usecase: bad operator\nSELECT * FROM products;\n-- expect: rows>2`)
  check('malformed expect flagged (P5)', r.summary.usecases[0].status === 'malformed' && r.summary.usecases[0].pass === false, JSON.stringify(r.summary.usecases[0]))
}

// 6. Multi-statement body: write then verify, assert on final SELECT.
{
  const r = run(SCHEMA, SEED, `-- usecase: add item then verify count\nINSERT INTO order_items (order_id, product_id, qty) VALUES (1, 2, 5);\nSELECT count(*)::int AS n FROM order_items WHERE order_id=1;\n-- expect: value=2`)
  check('multi-statement asserts final (P6)', r.summary.usecases[0].pass === true && r.summary.usecases[0].statements === 2, JSON.stringify(r.summary.usecases[0]))
}

// 7. Isolation: a write in one use-case must NOT leak into a later read.
{
  const uc = [
    `-- usecase: insert a product`,
    `INSERT INTO products (sku, price) VALUES ('Z', 1);`,
    `-- expect: rowcount=1`,
    `-- usecase: count is unchanged afterward`,
    `SELECT count(*)::int AS n FROM products;`,
    `-- expect: value=2`,
  ].join('\n')
  const r = run(SCHEMA, SEED, uc)
  const both = r.summary.usecases.every((u) => u.pass)
  check('use-cases are isolated (P7)', both && r.exit === 0, JSON.stringify(r.summary.usecases))
}

// 8. Coverage floor: a read-only suite passes but warns about missing write + negative test.
{
  const r = run(SCHEMA, SEED, `-- usecase: list products\nSELECT * FROM products;\n-- expect: rows=2`)
  const msgs = r.summary.warnings.map((w) => w.message).join(' | ')
  check('coverage warns (P13)', r.exit === 0 && /no write use-case/.test(msgs) && /no negative test/.test(msgs), msgs)
}

// 9. A fully correct mixed suite still goes green (no regression / no false-red).
{
  const uc = [
    `-- usecase: place an order item`,
    `INSERT INTO order_items (order_id, product_id, qty) VALUES (1, 2, 3);`,
    `-- expect: rowcount=1`,
    `-- usecase: reject orphan FK`,
    `INSERT INTO order_items (order_id, product_id, qty) VALUES (1, 999, 1);`,
    `-- expect: error ~ foreign key`,
    `-- usecase: reject non-positive qty`,
    `INSERT INTO order_items (order_id, product_id, qty) VALUES (1, 2, 0);`,
    `-- expect: error ~ check`,
    `-- usecase: revenue is exact`,
    `SELECT SUM(oi.qty*p.price) AS revenue FROM order_items oi JOIN products p ON p.id=oi.product_id;`,
    `-- expect: value=70.00`,
  ].join('\n')
  const r = run(SCHEMA, SEED, uc)
  check('correct suite goes green (no false-red)', r.exit === 0 && r.summary.usecases.every((u) => u.pass) && r.summary.usecases.length === 4, JSON.stringify(r.summary.usecases.map((u) => [u.label, u.pass])))
}

// 10. Enum/type rejection can be reason-qualified (dogfood finding).
{
  const schema = `CREATE TYPE s AS ENUM ('a','b'); CREATE TABLE t (id int primary key, st s NOT NULL);`
  const r = run(schema, `INSERT INTO t VALUES (1,'a');`, `-- usecase: reject bad enum\nINSERT INTO t VALUES (2,'zzz');\n-- expect: error ~ enum`)
  check('enum reason-qualified (dogfood)', r.summary.usecases[0].pass === true && /22P02/.test(r.summary.usecases[0].detail), JSON.stringify(r.summary.usecases[0]))
}

// 11. A delete-then-verify block counts as a write for the coverage floor (dogfood finding).
{
  const schema = `CREATE TABLE p (id int primary key); CREATE TABLE c (id int primary key, p_id int not null references p(id) on delete cascade);`
  const r = run(schema, `INSERT INTO p VALUES (1); INSERT INTO c VALUES (1,1);`, `-- usecase: delete cascades child\nDELETE FROM p WHERE id=1;\nSELECT count(*)::int AS n FROM c WHERE p_id=1;\n-- expect: value=0`)
  const coverageWarn = r.summary.warnings.some((w) => /no write use-case/.test(w.message))
  check('delete-then-verify counts as write (dogfood)', r.summary.usecases[0].wrote === true && !coverageWarn, JSON.stringify({ wrote: r.summary.usecases[0].wrote, warnings: r.summary.warnings }))
}

// 12. Missing expect: a UC-labeled block with no -- expect: claims a proof it never makes
// — must fail as missing-expect. A non-UC setup block without expect still passes.
{
  const r = run(SCHEMA, SEED, `-- usecase: UC-001/DA-1 claimed proof\nSELECT * FROM products;`)
  const u = r.summary.usecases[0]
  check('UC-labeled block requires expect (P12)', u.status === 'missing-expect' && u.pass === false && r.exit !== 0, JSON.stringify(u))
  const r2 = run(SCHEMA, SEED, `-- usecase: extra seed rows [persist]\nINSERT INTO products (sku, price) VALUES ('S1', 5);\n-- usecase: read them back\nSELECT * FROM products;\n-- expect: rows=3`)
  check('setup block without expect still executes (P12)', r2.summary.usecases[0].status === 'executed' && r2.summary.usecases[0].pass === true && r2.exit === 0, JSON.stringify(r2.summary.usecases))
}

// 13. Asserted vs executed stats: setup blocks must not inflate the proven-assertion count.
{
  const uc = [
    `-- usecase: seed helper [persist]`,
    `INSERT INTO products (sku, price) VALUES ('H1', 2);`,
    `-- usecase: count products`,
    `SELECT count(*)::int AS n FROM products;`,
    `-- expect: value=3`,
    `-- usecase: reject dup sku`,
    `INSERT INTO products (sku, price) VALUES ('A', 1);`,
    `-- expect: error ~ unique`,
  ].join('\n')
  const r = run(SCHEMA, SEED, uc)
  const s = r.summary.stats
  check('asserted/executed stats split (P13b)', s.usecases_asserted === 2 && s.asserted_passed === 2 && s.executed_only === 1 && s.usecases_total === 3, JSON.stringify(s))
}

// 14. Qualified error must not launder a broken test: `error ~ does not exist` against a
// typo'd table matches the message but is SQLSTATE 42P01 → broken-test.
{
  const r = run(SCHEMA, SEED, `-- usecase: negative test with typo'd table\nINSERT INTO nonexistent_table (x) VALUES (1);\n-- expect: error ~ does not exist`)
  const u = r.summary.usecases[0]
  check('qualified error cannot launder broken test (P14)', u.status === 'broken-test' && u.pass === false && r.exit !== 0, JSON.stringify(u))
}

// 15. SQLSTATE-first, no false-red: an application RAISE whose message contains "does not
// exist" is P0001 (a genuine domain error), not a broken test — qualified match must pass.
{
  const schema = `
CREATE TABLE registrations (id int primary key);
CREATE FUNCTION guard() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'course does not exist';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER reg_guard BEFORE INSERT ON registrations FOR EACH ROW EXECUTE FUNCTION guard();
`
  const r = run(schema, 'SELECT 1;', `-- usecase: application-level rejection\nINSERT INTO registrations VALUES (1);\n-- expect: error ~ course does not exist`)
  check('application RAISE is not a broken test (P15)', r.summary.usecases[0].pass === true, JSON.stringify(r.summary.usecases[0]))
}

// 16. Mechanical DBML→DDL export (--dbml): the exported schema loads, native
// [delete: ...] Ref settings are enforced live, defaults/enums/notes survive export.
const DBML_MODEL = `
Enum pet_status {
  active
  archived
}

Table owners {
  id int [pk]
  name text [not null, note: 'display name']
  Note: 'An owner''s record'
}

Table vets {
  id int [pk]
}

Table pets [headercolor: #3498db] {
  id int [pk]
  owner_id int [not null]
  vet_id int
  status pet_status [not null, default: 'active']
  created_at timestamptz [not null, default: \`now()\`]
}

Table pet_tags {
  pet_id int [not null]
  tag text [not null]
  indexes {
    (pet_id, tag) [pk]
  }
}

Ref: pets.owner_id > owners.id [delete: cascade]
Ref: pets.vet_id > vets.id [delete: set null]
Ref: pet_tags.pet_id > pets.id [delete: restrict]
`
const DBML_SEED = `
INSERT INTO owners (id, name) VALUES (1, 'Ada'), (2, 'Alan');
INSERT INTO vets (id) VALUES (1);
INSERT INTO pets (id, owner_id, vet_id) VALUES (1, 1, 1), (2, 2, NULL);
INSERT INTO pet_tags (pet_id, tag) VALUES (1, 'good');
`
const DBML_UCS = [
  `-- usecase: deleting an owner cascades to their pets`,
  `DELETE FROM owners WHERE id = 2;`,
  `SELECT count(*)::int AS n FROM pets WHERE owner_id = 2;`,
  `-- expect: value=0`,
  `-- usecase: deleting a vet nulls the pet's vet reference`,
  `DELETE FROM vets WHERE id = 1;`,
  `SELECT vet_id FROM pets WHERE id = 1;`,
  `-- expect: col:vet_id=null`,
  `-- usecase: a tagged pet cannot be deleted`,
  `DELETE FROM pets WHERE id = 1;`,
  `-- expect: error ~ foreign key`,
  `-- usecase: enum default applies on insert`,
  `INSERT INTO pets (id, owner_id) VALUES (3, 1);`,
  `SELECT status::text AS s FROM pets WHERE id = 3;`,
  `-- expect: col:s=active`,
].join('\n')
{
  const emitted = join(mkdtempSync(join(tmpdir(), 'erd-selftest-')), 'schema.sql')
  const r = runDbml(DBML_MODEL, DBML_SEED, DBML_UCS, ['--emit-schema', emitted])
  check('dbml export path goes green (P16)', r.exit === 0 && r.summary.dbml?.ok === true && r.summary.usecases.every((u) => u.pass), JSON.stringify({ exit: r.exit, dbml: r.summary?.dbml, usecases: r.summary?.usecases?.map((u) => [u.label, u.status]) }))
  const ddl = readFileSync(emitted, 'utf8')
  const wants = ['ON DELETE CASCADE', 'ON DELETE SET NULL', 'ON DELETE RESTRICT', 'CREATE TYPE', 'PRIMARY KEY ("pet_id", "tag")', 'COMMENT ON TABLE "owners"']
  check('emitted DDL carries policies/enums/PKs/notes (P16)', wants.every((w) => ddl.includes(w)), wants.filter((w) => !ddl.includes(w)).join(' | ') || 'all present')
}

// 17. Invalid DBML must fail loudly with line-anchored diagnostics — never a silent
// or half-loaded schema.
{
  const r = runDbml('Table broken {\n  id int pk]\n}\n', 'SELECT 1;', `-- usecase: never runs\nSELECT 1;\n-- expect: rows=1`)
  const errs = r.summary?.dbml?.errors ?? []
  check('invalid DBML fails with diagnostics (P17)', r.exit !== 0 && r.summary?.dbml?.ok === false && errs.length > 0 && typeof errs[0].line === 'number', JSON.stringify(r.summary?.dbml))
}

// 18. Flag validation: --dbml and --schema are mutually exclusive; one is required.
{
  const dir = mkdtempSync(join(tmpdir(), 'erd-selftest-'))
  for (const f of ['model.dbml', 'schema.sql', 'seed.sql', 'usecases.sql']) writeFileSync(join(dir, f), '-- empty')
  const both = runArgs(['--dbml', join(dir, 'model.dbml'), '--schema', join(dir, 'schema.sql'), '--seed', join(dir, 'seed.sql'), '--usecases', join(dir, 'usecases.sql')])
  const neither = runArgs(['--seed', join(dir, 'seed.sql'), '--usecases', join(dir, 'usecases.sql')])
  check('--dbml/--schema mutually exclusive (P18)', both.exit === 2 && neither.exit === 2, `both=${both.exit} neither=${neither.exit}`)
}

// 19. Legacy `// ON DELETE` comments no longer carry policy — the harness must warn so
// an old model's comment-only policies (exported as NO ACTION) can't silently pass.
{
  const legacy = `
Table a {
  id int [pk]
}
Table b {
  id int [pk]
  a_id int [not null, ref: > a.id] // ON DELETE CASCADE
}
`
  const r = runDbml(legacy, 'INSERT INTO a VALUES (1); INSERT INTO b VALUES (1, 1);', `-- usecase: read\nSELECT * FROM b;\n-- expect: rows=1`)
  const warned = (r.summary?.warnings ?? []).some((w) => /legacy .*ON DELETE/i.test(w.message))
  check('legacy ON DELETE comment warns (P19)', warned, JSON.stringify(r.summary?.warnings))
}

// 20. Opt-in (does a real npm install — slow, needs network/cache): when
// CLAUDE_PLUGIN_DATA is set, deps install under <data>/erd-modeler instead of the
// scripts dir. Enable with ERD_SELFTEST_DATA_DIR=1.
if (process.env.ERD_SELFTEST_DATA_DIR === '1') {
  const dataDir = mkdtempSync(join(tmpdir(), 'erd-plugin-data-'))
  const dir = mkdtempSync(join(tmpdir(), 'erd-selftest-'))
  writeFileSync(join(dir, 'schema.sql'), 'CREATE TABLE t (id int primary key);')
  writeFileSync(join(dir, 'seed.sql'), 'INSERT INTO t VALUES (1);')
  writeFileSync(join(dir, 'usecases.sql'), `-- usecase: read\nSELECT * FROM t;\n-- expect: rows=1`)
  const r = runArgs(
    ['--schema', join(dir, 'schema.sql'), '--seed', join(dir, 'seed.sql'), '--usecases', join(dir, 'usecases.sql')],
    { ...CLEAN_ENV, CLAUDE_PLUGIN_DATA: dataDir },
  )
  const installed = existsSync(join(dataDir, 'erd-modeler', 'package.json')) && existsSync(join(dataDir, 'erd-modeler', 'node_modules'))
  check('plugin-data install (opt-in)', r.exit === 0 && installed, `exit=${r.exit} installed=${installed} dataDir=${dataDir}`)
}

console.log(`\n${failures === 0 ? 'ALL ORACLE SELF-TESTS PASSED' : failures + ' SELF-TEST(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
