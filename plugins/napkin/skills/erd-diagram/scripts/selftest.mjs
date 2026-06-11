#!/usr/bin/env node
// selftest.mjs — prove render-erd.mjs emits a correct, self-contained HTML diagram.
//
// This is the render-side counterpart to erd-modeler's oracle selftest: it renders a sample model
// (including the SQL-style '' apostrophe escaping erd-modeler actually emits) and asserts the output
// is a single self-contained file — an <svg> with no external assets, the title, every table and
// its columns rendered, and the interactive controls wired up. A skill change is not done until
// this passes.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeDbml } from './render-erd.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const RENDER = join(SCRIPT_DIR, 'render-erd.mjs')

// A small but representative model: 1:N FK with ON DELETE comment, an enum, a self-referential FK,
// a bridge (M:N) table, and a Note with the doubled-apostrophe ('') escaping erd-modeler emits.
const SAMPLE = `// Sample shop model
Enum order_status {
  pending
  paid
}

Table customers {
  id    text    [pk]
  email varchar [unique, not null]
  Note: 'A customer''s account. TypeID prefix: cust'
}

Table orders {
  id          text         [pk]
  customer_id text         [not null, ref: > customers.id]  // ON DELETE RESTRICT
  status      order_status [not null, default: 'pending']
  Note: 'A single order. TypeID prefix: order'
}

Table products {
  id   text    [pk]
  name varchar [not null]
}

Table order_items {
  order_id   text [not null, ref: > orders.id]    // ON DELETE CASCADE
  product_id text [not null, ref: > products.id]  // ON DELETE RESTRICT
  indexes {
    (order_id, product_id) [pk]
  }
}

Table categories {
  id        text [pk]
  parent_id text [ref: > categories.id]  // ON DELETE SET NULL (self-referential)
  name      varchar [not null]
}
`

const TABLES = ['customers', 'orders', 'products', 'order_items', 'categories']
let failures = 0

function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  PASS  ${name}`)
  } else {
    failures++
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function main() {
  const dir = mkdtempSync(join(tmpdir(), 'erd-diagram-selftest-'))
  const dbml = join(dir, 'model.dbml')
  const out = join(dir, 'model.html')
  writeFileSync(dbml, SAMPLE, 'utf8')

  // Run the real entry script the way the skill does (no --open in CI).
  let stdout
  try {
    stdout = execFileSync('node', [RENDER, '--dbml', dbml, '--title', 'Shop — Data Model', '--out', out], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }).trim()
  } catch (e) {
    console.log(`  FAIL  render-erd.mjs exited non-zero — ${e.message}`)
    process.exit(1)
  }

  check('stdout is exactly the output path (clean for callers)', stdout === out, `got: ${JSON.stringify(stdout)}`)
  check('output HTML file was written', existsSync(out))

  const html = readFileSync(out, 'utf8')

  check('contains an inline <svg> element', /<svg[\s>]/.test(html))
  check('no XML prolog / DOCTYPE leaked into the inline SVG', !/<\?xml|<!DOCTYPE svg/i.test(html))
  check(
    'self-contained: no external http(s) script/link assets',
    !/<(script|link)\b[^>]*\b(src|href)\s*=\s*["']https?:\/\//i.test(html),
  )
  check('professional title rendered in a single <h1>', (html.match(/<h1>/g) || []).length === 1 && html.includes('Shop — Data Model'))
  check('factual meta line present (tables · relationships)', /\d+\s+tables?\s+·\s+\d+\s+relationships?/.test(html))
  for (const t of TABLES) check(`table "${t}" appears in the diagram`, html.includes(t))
  // Guard against the table bodies collapsing to just their titles (e.g. an incompatible Graphviz
  // build that drops HTML-table node labels): assert real COLUMN names render, not only table names.
  const COLUMNS = ['email', 'customer_id', 'parent_id', 'product_id']
  for (const c of COLUMNS) check(`column "${c}" renders inside its table body`, html.includes(c))
  check('doubled apostrophe was normalized (no raw "\'\'" remains)', !html.includes("''"))
  check('interactive controls wired (zoom-in / zoom-out / fit)', /id="zoom-in"/.test(html) && /id="zoom-out"/.test(html) && /id="fit"/.test(html))
  check('pan/zoom script is inline (no external dependency)', /addEventListener\(['"]wheel/.test(html))

  // Bad input must fail loudly, not emit a broken page.
  const badDbml = join(dir, 'bad.dbml')
  writeFileSync(badDbml, 'Table { this is not valid dbml', 'utf8')
  let rejected = false
  try {
    execFileSync('node', [RENDER, '--dbml', badDbml, '--out', join(dir, 'bad.html')], { stdio: 'ignore' })
  } catch {
    rejected = true
  }
  check('invalid DBML is rejected with a non-zero exit (no false-green)', rejected)

  // Unit check on the pure helper.
  check('normalizeDbml folds doubled apostrophes to a typographic one', normalizeDbml("a''b") === 'a’b')

  console.log('')
  if (failures === 0) {
    console.log('ALL ERD-DIAGRAM SELF-TESTS PASSED')
  } else {
    console.log(`${failures} SELF-TEST(S) FAILED`)
    process.exit(1)
  }
}

main()
