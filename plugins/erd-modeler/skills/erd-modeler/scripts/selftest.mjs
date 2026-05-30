#!/usr/bin/env node
// selftest.mjs — adversarial regression tests for the run-erd-test.mjs ORACLE.
// Each scenario feeds the harness inputs designed to expose a false-green and asserts
// the harness reacts correctly. Run: node selftest.mjs   (exits non-zero on any failure)

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const HARNESS = join(HERE, 'run-erd-test.mjs')

function run(schema, seed, usecases) {
  const dir = mkdtempSync(join(tmpdir(), 'erd-selftest-'))
  writeFileSync(join(dir, 'schema.sql'), schema)
  writeFileSync(join(dir, 'seed.sql'), seed)
  writeFileSync(join(dir, 'usecases.sql'), usecases)
  let out, exit = 0
  try {
    out = execFileSync('node', [HARNESS, '--schema', join(dir, 'schema.sql'), '--seed', join(dir, 'seed.sql'), '--usecases', join(dir, 'usecases.sql')], { encoding: 'utf8' })
  } catch (e) {
    out = e.stdout?.toString() ?? ''
    exit = e.status ?? 1
  }
  return { exit, summary: JSON.parse(out) }
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

// 3. rowcount vs rows strict: rowcount=N on a SELECT must FAIL (affectedRows is 0 for reads).
{
  const r = run(SCHEMA, SEED, `-- usecase: select mislabeled as write\nSELECT * FROM products;\n-- expect: rowcount=2`)
  check('rowcount/rows not conflated (P3)', r.summary.usecases[0].pass === false, JSON.stringify(r.summary.usecases[0]))
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

console.log(`\n${failures === 0 ? 'ALL ORACLE SELF-TESTS PASSED' : failures + ' SELF-TEST(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
