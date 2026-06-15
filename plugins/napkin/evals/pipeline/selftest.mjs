#!/usr/bin/env node
// selftest.mjs — adversarial suite proving grade.mjs refuses false-green. Mirrors the repo
// convention (ddd-align/erd-modeler selftests): a grader change isn't done until this passes.
// Zero model calls — the mechanical path runs the real oracles; the judge path is exercised
// via grade.mjs's GRADE_FAKE_JUDGE seam (canned valid/malformed judge responses).

import { execFileSync } from 'node:child_process'
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { clarityFromQuestions } from './lib.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const GRADE = join(DIR, 'grade.mjs')
const GOLDEN = join(DIR, '..', '..', 'skills', 'ddd-align', 'scripts', 'fixtures', 'golden', 'spec')

let pass = 0, fail = 0
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log(`  ok  ${name}`) } else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`) } }

// run grade.mjs; capture {code, json}
function grade(spec, { judge = false, env = {} } = {}) {
  const args = [GRADE, '--spec', spec]
  if (!judge) args.push('--no-judge')
  let out, code = 0
  try {
    out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) { out = e.stdout || ''; code = e.status ?? 1 }
  let json = null
  try { json = JSON.parse(out) } catch { /* leave null */ }
  return { code, json, raw: out }
}

function tmpCopyOfGolden() {
  const d = mkdtempSync(join(tmpdir(), 'grade-selftest-'))
  cpSync(GOLDEN, join(d, 'spec'), { recursive: true })
  return join(d, 'spec')
}

// 1. golden spec is mechanically clean → green, BRI 100, exit 0, no fabricated clarity
{
  const r = grade(GOLDEN)
  ok('golden: exit 0', r.code === 0, `code=${r.code}`)
  ok('golden: align_ok true', r.json?.mechanical?.align_ok === true)
  ok('golden: BRI 100', r.json?.build_readiness_index === 100, `bri=${r.json?.build_readiness_index}`)
  ok('golden: mechanical-only has no clarity metric', r.json?.metrics?.clarity === undefined)
}

// 2. broken glossary (Maps-to points at a table not in the model) → AL-01, NOT green
{
  const spec = tmpCopyOfGolden()
  const gp = join(spec, 'glossary.md')
  const g = readFileSync(gp, 'utf8').replace(/Maps to: ERD: `?\w+`?/, 'Maps to: ERD: `ghost_table_xyz`')
  writeFileSync(gp, g)
  const r = grade(spec)
  ok('broken-glossary: exit non-zero', r.code !== 0, `code=${r.code}`)
  ok('broken-glossary: align_ok false', r.json?.mechanical?.align_ok === false)
  ok('broken-glossary: errors > 0', (r.json?.mechanical?.errors ?? 0) > 0)
  ok('broken-glossary: alignment score < 100', (r.json?.metrics?.alignment?.score ?? 100) < 100, `score=${r.json?.metrics?.alignment?.score}`)
  ok('broken-glossary: BRI < 100', (r.json?.build_readiness_index ?? 100) < 100)
  rmSync(join(spec, '..'), { recursive: true, force: true })
}

// 3. empty spec dir → vacuous green is refused (no artifacts parsed)
{
  const d = mkdtempSync(join(tmpdir(), 'grade-empty-'))
  const spec = join(d, 'spec'); mkdirSync(spec)
  const r = grade(spec)
  ok('empty-spec: exit non-zero (no vacuous green)', r.code !== 0, `code=${r.code}`)
  ok('empty-spec: align_ok false', r.json?.mechanical?.align_ok === false)
  rmSync(d, { recursive: true, force: true })
}

// 4. judge path: a VALID canned judge response — clarity is DERIVED from the question count
{
  const fake = JSON.stringify({
    metrics: { clarity: { clarification_questions_needed: 5, note: 'vague' }, testability: { nonvacuous_ac_pct: 100 }, actionability: { score: 100 }, completeness: { note: '' } },
    top_gaps: ['x'], rationale: 'ok',
  })
  const r = grade(GOLDEN, { judge: true, env: { GRADE_FAKE_JUDGE: fake } })
  ok('judge-valid: clarity derived from count via curve', r.json?.metrics?.clarity?.score === clarityFromQuestions(5), `got ${r.json?.metrics?.clarity?.score}, expected ${clarityFromQuestions(5)}`)
  ok('judge-valid: not mechanical_only', r.json?.mechanical_only === false)
  ok('judge-valid: 5 questions drags BRI below 100', (r.json?.build_readiness_index ?? 100) < 100, `bri=${r.json?.build_readiness_index}`)
}
// 4b. clarity curve is monotonic + bounded (more questions never raises clarity; 0q = 100)
ok('clarity curve: 0 questions = 100', clarityFromQuestions(0) === 100)
ok('clarity curve: monotonic non-increasing', [0,1,2,3,6,12].every((c,i,a) => i === 0 || clarityFromQuestions(c) <= clarityFromQuestions(a[i-1])))
ok('clarity curve: gentler than old linear at the tail (6q > 28)', clarityFromQuestions(6) > 28)

// 5. judge path: a MALFORMED judge response is rejected → falls back to mechanical-only (no false-green)
{
  const r = grade(GOLDEN, { judge: true, env: { GRADE_FAKE_JUDGE: 'not json at all' } })
  ok('judge-malformed: falls back to mechanical-only', r.json?.mechanical_only === true)
  ok('judge-malformed: no clarity fabricated', r.json?.metrics?.clarity === undefined)
}

// 6. judge path: judge missing the required question count is rejected (shape guard)
{
  const fake = JSON.stringify({ metrics: { clarity: { note: 'no count' } }, top_gaps: [], rationale: '' })
  const r = grade(GOLDEN, { judge: true, env: { GRADE_FAKE_JUDGE: fake } })
  ok('judge-no-question-count: rejected → mechanical-only', r.json?.mechanical_only === true)
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
