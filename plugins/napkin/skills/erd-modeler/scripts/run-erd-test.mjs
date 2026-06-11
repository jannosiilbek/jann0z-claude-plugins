#!/usr/bin/env node
// run-erd-test.mjs — load a generated ERD into in-memory PGlite, seed it, and run
// labeled business-use-case queries with assertions. Prints a JSON summary and exits
// non-zero on any failure.
//
// This file is the ORACLE for the erd-modeler skill: its pass/fail signal is what the
// improve-and-repeat loop trusts. It is built to refuse false-green — an assertion may
// only pass when it has actually proven something.
//
// Usage:
//   node run-erd-test.mjs --schema schema.sql --seed seed.sql --usecases usecases.sql
//
// Requires @electric-sql/pglite (already installed next to this file).
//
// usecases.sql contract — one block per use-case:
//   -- usecase: <label>            (optionally end the label with [persist] to keep writes)
//   <one OR more SQL statements>   (multi-statement bodies run in order; assertion is on the LAST)
//   -- expect: <assertion>
//
// Each use-case runs inside its own transaction that is ROLLED BACK afterwards, so
// use-cases are order-independent. End the label with [persist] to COMMIT instead.
//
// Closed expect grammar (never invent operators):
//   error                  statement is rejected by a GENUINE runtime/constraint error
//                          (a "does not exist"/syntax error is a BROKEN TEST → fails)
//   error ~ <reason>       rejected for a SPECIFIC reason. <reason> matches the error
//                          message (case-insensitive substring) or a constraint class:
//                          foreign key|23503, not null|23502, unique|23505, check|23514
//   rowcount=N             writes only: affectedRows === N
//   rows=N / rows>=N       reads only: returned row count
//   value=<v>              result is exactly one row, one column, equal to <v>
//   col:<name>=<v>         result is exactly one row; column <name> equals <v>
//   (no expect)            passes iff the body executes without error
// Trailing inline comments ( -- ... / # ... ) on assertions are tolerated.
// <v> compares numerically when both sides are numbers (so 70.00 == 70), the literal
// `null` matches a SQL NULL, otherwise it is a trimmed string compare.

import { readFileSync, existsSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const { values } = parseArgs({
  options: {
    schema: { type: 'string' },
    seed: { type: 'string' },
    usecases: { type: 'string' },
  },
})

if (!values.schema || !values.seed || !values.usecases) {
  console.error('Usage: node run-erd-test.mjs --schema s.sql --seed d.sql --usecases u.sql')
  process.exit(2)
}

// Load PGlite, installing it on first use if missing. The dependency (and its version
// range) lives in scripts/package.json, so a fresh install picks up library
// improvements and matches the local Node/OS rather than shipping a frozen binary.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

async function loadPGlite() {
  const installed = existsSync(join(SCRIPT_DIR, 'node_modules', '@electric-sql', 'pglite'))
  if (!installed) {
    process.stderr.write('[erd-test] @electric-sql/pglite not found — installing once via npm (this happens only on first run)...\n')
    try {
      // Route npm stdout to OUR stderr (fd 2) so the JSON summary on stdout stays clean.
      execFileSync('npm', ['install'], { cwd: SCRIPT_DIR, stdio: ['ignore', 2, 2] })
    } catch (installErr) {
      console.error(JSON.stringify({
        ok: false,
        fatal: 'could not auto-install @electric-sql/pglite — run `npm install` in the scripts dir manually (is npm on PATH? is there network access?)',
        detail: String(installErr.message ?? installErr),
      }, null, 2))
      process.exit(3)
    }
  }
  try {
    return (await import('@electric-sql/pglite')).PGlite
  } catch (e) {
    console.error(JSON.stringify({
      ok: false,
      fatal: 'PGlite is present but could not be imported',
      detail: String(e.message ?? e),
    }, null, 2))
    process.exit(3)
  }
}

const PGlite = await loadPGlite()

const read = (p) => readFileSync(p, 'utf8')

// SQLSTATE classes that indicate a BROKEN TEST rather than a real constraint/runtime error.
const BROKEN_TEST_CODES = new Set([
  '42P01', // undefined_table
  '42703', // undefined_column
  '42601', // syntax_error
  '42P02', // undefined_parameter
  '42883', // undefined_function
  '42704', // undefined_object
  '3F000', // invalid_schema_name
])
const BROKEN_TEST_RE = /does not exist|syntax error|cannot insert multiple commands/i

// Convenience reason keyword → SQLSTATE for `error ~ <reason>`. Any other <reason> is
// matched as a case-insensitive substring of the error message, so arbitrary reasons
// (e.g. `error ~ invalid input value for enum`) also work.
const REASON_CODES = {
  'foreign key': '23503',
  'not null': '23502',
  'unique': '23505',
  'check': '23514',
  'enum': '22P02',          // invalid_text_representation (bad enum/type literal)
  'exclusion': '23P01',
}

// Split a multi-statement SQL string into individual statements, respecting
// dollar-quoted bodies, single/double quotes, and line/block comments.
function splitStatements(sql) {
  const stmts = []
  let cur = ''
  let i = 0
  const n = sql.length
  let inLine = false, inBlock = false, inSq = false, inDq = false, dollarTag = null
  while (i < n) {
    const c = sql[i], c2 = sql[i + 1]
    if (inLine) { cur += c; if (c === '\n') inLine = false; i++; continue }
    if (inBlock) { cur += c; if (c === '*' && c2 === '/') { cur += c2; i += 2; inBlock = false; continue } i++; continue }
    if (dollarTag) { if (sql.startsWith(dollarTag, i)) { cur += dollarTag; i += dollarTag.length; dollarTag = null; continue } cur += c; i++; continue }
    if (inSq) { cur += c; if (c === "'") inSq = false; i++; continue }
    if (inDq) { cur += c; if (c === '"') inDq = false; i++; continue }
    if (c === '-' && c2 === '-') { inLine = true; cur += c; i++; continue }
    if (c === '/' && c2 === '*') { inBlock = true; cur += c; i++; continue }
    if (c === "'") { inSq = true; cur += c; i++; continue }
    if (c === '"') { inDq = true; cur += c; i++; continue }
    if (c === '$') { const m = sql.slice(i).match(/^\$[a-zA-Z_]*\$/); if (m) { dollarTag = m[0]; cur += dollarTag; i += dollarTag.length; continue } }
    if (c === ';') { const t = cur.trim(); if (t) stmts.push(t); cur = ''; i++; continue }
    cur += c; i++
  }
  const tail = cur.trim()
  if (tail) stmts.push(tail)
  return stmts
}

// Parse usecases.sql into [{ label, persist, sql, expect, line }] plus warnings.
function parseUsecases(sqlText) {
  const lines = sqlText.split('\n')
  const cases = []
  const warnings = []
  const seenLabels = new Set()
  let label = null, persist = false, expect = null, body = [], startLine = 0, expectLine = 0
  const flush = () => {
    if (label === null) return
    const s = body.join('\n').trim()
    if (!s) {
      warnings.push({ line: startLine, message: `use-case "${label}" has no SQL — dropped` })
    } else {
      if (seenLabels.has(label)) warnings.push({ line: startLine, message: `duplicate use-case label "${label}"` })
      seenLabels.add(label)
      cases.push({ label, persist, sql: s, expect, line: startLine })
    }
    label = null; persist = false; expect = null; body = []
  }
  lines.forEach((line, idx) => {
    const ln = idx + 1
    const mUse = line.match(/^\s*--\s*usecase:\s*(.+?)\s*$/i)
    const mExp = line.match(/^\s*--\s*expect:\s*(.+?)\s*$/i)
    if (mUse) {
      flush()
      let lab = mUse[1]
      if (/\[persist\]\s*$/i.test(lab)) { persist = true; lab = lab.replace(/\[persist\]\s*$/i, '').trim() }
      label = lab; startLine = ln
      return
    }
    if (mExp) {
      if (label === null) { warnings.push({ line: ln, message: `expect with no preceding usecase — discarded` }); return }
      if (expect !== null) warnings.push({ line: ln, message: `use-case "${label}" has multiple expect lines — using the last` })
      expect = mExp[1].trim(); expectLine = ln
      return
    }
    if (label !== null) body.push(line)
  })
  flush()
  return { cases, warnings }
}

const commandOf = (stmt) => (stmt.trim().match(/^[a-zA-Z]+/) || ['?'])[0].toUpperCase()

function compareVal(actual, expected) {
  if (/^null$/i.test(expected)) return actual === null
  if (actual === null || actual === undefined) return false
  const a = Number(actual), b = Number(expected)
  if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) < 1e-9
  return String(actual).trim() === String(expected).trim()
}

// Returns { pass, status, detail }. status ∈ executed|pass|fail|malformed|broken-test|unexpected-error
function checkExpect(expect, res, errored, errMsg, code) {
  if (!expect) {
    return errored
      ? { pass: false, status: 'unexpected-error', detail: errMsg }
      : { pass: true, status: 'executed', detail: 'executed without error' }
  }
  const raw = expect.replace(/\s+(--|#)\s.*$/, '').trim()
  const lower = raw.toLowerCase()

  // error / error ~ reason
  if (lower === 'error' || lower.startsWith('error ~') || lower.startsWith('error~')) {
    if (!errored) return { pass: false, status: 'fail', detail: 'expected an error but the statement succeeded' }
    const broken = (code && BROKEN_TEST_CODES.has(code)) || BROKEN_TEST_RE.test(errMsg || '')
    const m = raw.match(/^error\s*~\s*(.+)$/i)
    if (m) {
      const reason = m[1].trim().toLowerCase()
      const wantCode = REASON_CODES[reason]
      const ok = (wantCode && code === wantCode) || (errMsg || '').toLowerCase().includes(reason)
      return ok
        ? { pass: true, status: 'pass', detail: `rejected for "${reason}" (code ${code})` }
        : { pass: false, status: 'fail', detail: `expected error reason "${reason}" but got: ${errMsg} (code ${code})` }
    }
    // bare `error`
    return broken
      ? { pass: false, status: 'broken-test', detail: `error looks like a broken test, not a constraint: ${errMsg} (code ${code})` }
      : { pass: true, status: 'pass', detail: `rejected: ${errMsg} (code ${code})` }
  }

  if (errored) return { pass: false, status: 'unexpected-error', detail: errMsg + (code ? ` (code ${code})` : '') }

  const rows = res?.rows ?? []
  const affected = res?.affectedRows ?? 0
  let m
  if ((m = lower.match(/^rowcount\s*=\s*(\d+)$/))) {
    const want = +m[1]
    return affected === want
      ? { pass: true, status: 'pass', detail: `affectedRows ${affected} == ${want}` }
      : { pass: false, status: 'fail', detail: `expected affectedRows=${want}, got ${affected}` }
  }
  if ((m = lower.match(/^rows\s*>=\s*(\d+)$/))) {
    return rows.length >= +m[1]
      ? { pass: true, status: 'pass', detail: `rows ${rows.length} >= ${m[1]}` }
      : { pass: false, status: 'fail', detail: `expected rows>=${m[1]}, got ${rows.length}` }
  }
  if ((m = lower.match(/^rows\s*=\s*(\d+)$/))) {
    return rows.length === +m[1]
      ? { pass: true, status: 'pass', detail: `rows ${rows.length} == ${m[1]}` }
      : { pass: false, status: 'fail', detail: `expected rows=${m[1]}, got ${rows.length}` }
  }
  if ((m = raw.match(/^value\s*=\s*(.+)$/i))) {
    if (rows.length !== 1) return { pass: false, status: 'fail', detail: `value= needs exactly 1 row, got ${rows.length}` }
    const keys = Object.keys(rows[0])
    if (keys.length !== 1) return { pass: false, status: 'fail', detail: `value= needs exactly 1 column, got ${keys.length}` }
    const actual = rows[0][keys[0]]
    return compareVal(actual, m[1].trim())
      ? { pass: true, status: 'pass', detail: `value ${JSON.stringify(actual)} == ${m[1].trim()}` }
      : { pass: false, status: 'fail', detail: `expected value ${m[1].trim()}, got ${JSON.stringify(actual)}` }
  }
  if ((m = raw.match(/^col:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/i))) {
    if (rows.length !== 1) return { pass: false, status: 'fail', detail: `col:= needs exactly 1 row, got ${rows.length}` }
    if (!(m[1] in rows[0])) return { pass: false, status: 'fail', detail: `column "${m[1]}" not in result` }
    const actual = rows[0][m[1]]
    return compareVal(actual, m[2].trim())
      ? { pass: true, status: 'pass', detail: `${m[1]} ${JSON.stringify(actual)} == ${m[2].trim()}` }
      : { pass: false, status: 'fail', detail: `expected ${m[1]}=${m[2].trim()}, got ${JSON.stringify(actual)}` }
  }
  return { pass: false, status: 'malformed', detail: `unrecognized expect: "${expect}" — fix the assertion, not the model` }
}

const summary = {
  ok: true,
  schema: { ok: true, errors: [] },
  seed: { ok: true, errors: [] },
  usecases: [],
  warnings: [],
  stats: {},
}
const db = new PGlite()

async function runPhase(sqlText) {
  const stmts = splitStatements(sqlText)
  const errors = []
  for (let k = 0; k < stmts.length; k++) {
    try {
      await db.exec(stmts[k])
    } catch (e) {
      errors.push({ index: k, statement: stmts[k].slice(0, 200), error: String(e.message ?? e), code: e.code ?? null })
    }
  }
  return errors
}

try {
  summary.schema.errors = await runPhase(read(values.schema))
  summary.schema.ok = summary.schema.errors.length === 0

  summary.seed.errors = await runPhase(read(values.seed))
  summary.seed.ok = summary.seed.errors.length === 0

  const usecasesText = read(values.usecases)
  const fileHasContent = splitStatements(usecasesText).length > 0 || /--\s*usecase:/i.test(usecasesText)
  const { cases, warnings } = parseUsecases(usecasesText)
  summary.warnings.push(...warnings)

  if (cases.length === 0 && fileHasContent) {
    summary.usecases.push({ label: '(none parsed)', pass: false, status: 'fail', detail: 'usecases.sql is non-empty but parsed to 0 use-cases' })
  }

  for (const uc of cases) {
    const stmts = splitStatements(uc.sql)
    let res = null, errored = false, errMsg = null, code = null
    await db.exec('BEGIN')
    try {
      for (const st of stmts) {
        res = await db.query(st)
      }
    } catch (e) {
      errored = true; errMsg = String(e.message ?? e); code = e.code ?? null
    } finally {
      try { await db.exec(uc.persist ? 'COMMIT' : 'ROLLBACK') } catch { /* txn already aborted/closed */ }
    }
    const finalStmt = stmts[stmts.length - 1] || ''
    const wrote = stmts.some((s) => ['INSERT', 'UPDATE', 'DELETE'].includes(commandOf(s)))
    const verdict = checkExpect(uc.expect, res, errored, errMsg, code)
    summary.usecases.push({
      label: uc.label,
      persist: uc.persist || undefined,
      command: commandOf(finalStmt),
      wrote,
      statements: stmts.length,
      expect: uc.expect ?? '(executes)',
      pass: verdict.pass,
      status: verdict.status,
      detail: verdict.detail,
      ...(errored ? { error: errMsg, code } : { rows: res?.rows?.length ?? 0, affected: res?.affectedRows ?? 0 }),
    })
  }

  // Coverage floor (non-fatal warnings): a validation suite should write and should
  // include at least one negative test. Read-only domains may legitimately have neither.
  const hasWrite = summary.usecases.some((u) => u.wrote)
  const hasNegative = summary.usecases.some((u) => typeof u.expect === 'string' && /^error\b/i.test(u.expect))
  if (summary.usecases.length > 0 && !hasWrite) summary.warnings.push({ line: 0, message: 'coverage: no write use-case (INSERT/UPDATE/DELETE) — add one unless this is a read-only domain' })
  if (summary.usecases.length > 0 && !hasNegative) summary.warnings.push({ line: 0, message: 'coverage: no negative test (-- expect: error ~ ...) — add one to prove constraints are enforced' })
} catch (e) {
  summary.ok = false
  summary.fatal = String(e.message ?? e)
} finally {
  await db.close?.()
}

const usecasesPassed = summary.usecases.filter((u) => u.pass).length
summary.stats = {
  schema_errors: summary.schema.errors.length,
  seed_errors: summary.seed.errors.length,
  usecases_total: summary.usecases.length,
  usecases_passed: usecasesPassed,
  warnings: summary.warnings.length,
}
summary.ok =
  !summary.fatal &&
  summary.schema.ok &&
  summary.seed.ok &&
  summary.usecases.length > 0 &&
  summary.usecases.every((u) => u.pass)

console.log(JSON.stringify(summary, null, 2))
process.exit(summary.ok ? 0 : 1)
