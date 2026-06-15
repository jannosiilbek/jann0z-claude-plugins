#!/usr/bin/env node
// grade.mjs — score a produced `spec/` as the INPUT a downstream builder (Claude Code +
// superpowers) would build from. Two layers:
//   1. MECHANICAL (objective, reproducible): runs the repo's own oracles —
//      check-align.mjs (AL-01..AL-15 cross-artifact consistency) and, when the SQL is
//      present, run-erd-test.mjs (PGlite live-test) — and derives numbers from them.
//   2. JUDGED (LLM, only what a parser can't see): clarity/ambiguity, non-vacuity of
//      acceptance criteria, task sizing — via buildability-judge.md run through `claude -p`.
// It blends both into a Build-Readiness Index (BRI, 0-100) + band. The judge can never
// produce a false-green: a malformed/empty judge response is rejected, and the mechanical
// floor still applies.
//
// Usage:
//   node grade.mjs --spec <dir>                 # full: mechanical + judge
//   node grade.mjs --spec <dir> --no-judge      # mechanical only (cheap; used by selftest)
//   node grade.mjs --spec <dir> --judge-model claude-opus-4-8 [--out result.json]

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { WEIGHTS, band, clamp, round, mean, loadModels, provenance } from './lib.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const NAPKIN = join(SCRIPT_DIR, '..', '..')
const CHECK_ALIGN = join(NAPKIN, 'skills', 'ddd-align', 'scripts', 'check-align.mjs')
const ERD_TEST = join(NAPKIN, 'skills', 'erd-modeler', 'scripts', 'run-erd-test.mjs')
const MODELS = loadModels()

const { values } = parseArgs({
  options: {
    spec: { type: 'string' },
    'no-judge': { type: 'boolean', default: false },
    'judge-model': { type: 'string' },
    'judge-file': { type: 'string' }, // pre-computed judge JSON (first-class: lets run/grade be decoupled)
    'model-key': { type: 'string' },  // executor identity, stamped into the result for the report/regression layer
    scenario: { type: 'string' },
    out: { type: 'string' },
  },
})
if (!values.spec) { console.error('usage: node grade.mjs --spec <dir> [--no-judge|--judge-file f.json] [--judge-model id] [--model-key k --scenario s] [--out file]'); process.exit(2) }
const SPEC = values.spec
if (!existsSync(SPEC)) { console.error(`[grade] spec dir not found: ${SPEC}`); process.exit(2) }
const JUDGE_MODEL = values['judge-model'] || MODELS.judge?.id || 'claude-opus-4-8'

// Run a JSON-emitting oracle that may exit non-zero; capture stdout either way.
function runJsonTool(file, args) {
  try {
    const out = execFileSync('node', [file, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return JSON.parse(out)
  } catch (e) {
    if (e.stdout) { try { return JSON.parse(e.stdout) } catch { /* fall through */ } }
    return { ok: false, _toolError: String(e.message || e) }
  }
}

// --- 1. mechanical -----------------------------------------------------------
function mechanical() {
  const align = runJsonTool(CHECK_ALIGN, ['--spec', SPEC, '--require', 'glossary,flows,usecases,plan,model,sql'])
  const findings = align.findings || []
  const errCount = (prefix) => findings.filter((f) => f.check?.startsWith(prefix) && f.severity === 'error').length
  // distinct UC ids referenced by a check's error messages (one UC may emit several findings)
  const ucsFailing = (prefix) => {
    const ids = new Set()
    for (const f of findings) {
      if (f.check?.startsWith(prefix) && f.severity === 'error') {
        const m = (f.message || '').match(/UC-\d+/)
        if (m) ids.add(m[0])
      }
    }
    return ids.size
  }
  const active = align.stats?.usecases_active || 0
  const covPct = (failing) => (active > 0 ? round(((active - failing) / active) * 100) : null)

  // live-test re-check (only if the standalone SQL trio is present next to the model)
  let livetest_pass_rate = null
  const schema = join(SPEC, 'data', 'schema.sql')
  const seed = join(SPEC, 'data', 'seed.sql')
  const ucsql = join(SPEC, 'data', 'usecases.sql')
  if (existsSync(schema) && existsSync(seed) && existsSync(ucsql)) {
    const lt = runJsonTool(ERD_TEST, ['--schema', schema, '--seed', seed, '--usecases', ucsql])
    const passed = lt.passed ?? lt.summary?.passed
    const total = lt.total ?? lt.summary?.total
    if (typeof passed === 'number' && total) livetest_pass_rate = passed / total
  }

  const errors = align.stats?.errors ?? errCount('AL')
  const warnings = align.stats?.warnings ?? 0

  const uc_task_coverage_pct = covPct(ucsFailing('AL-05'))
  const uc_livetest_coverage_pct = existsSync(ucsql) ? covPct(ucsFailing('AL-14')) : null
  const term_table_errors = errCount('AL-01') + errCount('AL-02')
  const ears_coverage_pct = covPct(ucsFailing('AL-07'))
  const da_coverage_pct = covPct(ucsFailing('AL-08'))
  const plan_acyclic = errCount('AL-11') === 0
  const refs_resolve = findings.filter((f) => f.check === 'AL-06' && f.severity === 'error').length === 0

  // mechanical per-metric scores
  const alignment = clamp(100 - 15 * errors - 5 * warnings)
  const compParts = [uc_task_coverage_pct, uc_livetest_coverage_pct].filter((x) => x != null)
  const completeness = clamp((compParts.length ? mean(compParts) : 100) - 8 * term_table_errors)
  const testMechParts = [ears_coverage_pct, da_coverage_pct, livetest_pass_rate != null ? livetest_pass_rate * 100 : null].filter((x) => x != null)
  const testability_mech = testMechParts.length ? round(mean(testMechParts)) : 100
  const structure = mean([plan_acyclic ? 100 : 0, refs_resolve ? 100 : 0])

  return {
    align_ok: !!align.ok, errors, warnings, active,
    numbers: {
      uc_task_coverage_pct, uc_livetest_coverage_pct, term_table_errors,
      ears_coverage_pct, da_coverage_pct, livetest_pass_rate, plan_acyclic, refs_resolve,
    },
    scores: { alignment, completeness, testability_mech, structure },
    findings_summary: findings.filter((f) => f.severity === 'error').map((f) => `${f.check} ${f.artifact}:${f.line} ${f.message}`),
  }
}

// --- 2. judge ----------------------------------------------------------------
function readSpecBundle() {
  const files = []
  const walk = (dir) => {
    for (const d of readdirSync(dir)) {
      const p = join(dir, d)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(md|dbml|sql)$/.test(d)) files.push(p)
    }
  }
  walk(SPEC)
  files.sort()
  return files.map((p) => `\n===== ${relative(SPEC, p)} =====\n${readFileSync(p, 'utf8')}`).join('\n')
}

function runJudge(mech) {
  const rubric = readFileSync(join(SCRIPT_DIR, 'buildability-judge.md'), 'utf8')
  const prompt = [
    rubric,
    '\n## Mechanical signals already computed (do NOT recompute; use to inform notes only)\n',
    '```json\n' + JSON.stringify({ errors: mech.errors, warnings: mech.warnings, ...mech.numbers }, null, 2) + '\n```',
    '\n## The spec to score (this is the entire input a builder would receive)\n',
    readSpecBundle(),
    '\n## Output\nReturn ONLY the JSON object specified above — no prose, no markdown fences.',
  ].join('\n')

  let raw
  if (values['judge-file']) {
    // first-class: a judge result computed elsewhere (e.g. by a subagent) is fed back in,
    // so "run the judge" and "compute the score" are decoupled and reproducible.
    raw = readFileSync(values['judge-file'], 'utf8')
  } else if (process.env.GRADE_FAKE_JUDGE != null) {
    // test seam: selftest substitutes a canned judge response (valid or malformed) so the
    // judge path and its false-green guard are covered without a model call.
    raw = process.env.GRADE_FAKE_JUDGE
  } else {
    try {
      raw = execFileSync('claude', ['-p', prompt, '--output-format', 'json', '--model', JUDGE_MODEL],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CLAUDECODE: undefined } })
    } catch (e) {
      throw new Error(`judge invocation failed: ${String(e.message || e).slice(0, 300)}`)
    }
  }
  let text = raw
  try { const env = JSON.parse(raw); if (env && typeof env.result === 'string') text = env.result } catch { /* raw was plain text */ }
  const first = text.indexOf('{'), last = text.lastIndexOf('}')
  if (first < 0 || last < 0) throw new Error('judge returned no JSON object')
  const j = JSON.parse(text.slice(first, last + 1))
  // shape guard — refuse false-green
  if (typeof j?.metrics?.clarity?.score !== 'number') throw new Error('judge JSON missing metrics.clarity.score')
  return j
}

// --- combine -----------------------------------------------------------------
function combine(mech, judge) {
  const m = {
    alignment: { score: mech.scores.alignment, errors: mech.errors, warnings: mech.warnings, note: '' },
    completeness: { score: mech.scores.completeness, ...pick(mech.numbers, ['uc_task_coverage_pct', 'uc_livetest_coverage_pct']), term_table_errors: mech.numbers.term_table_errors, note: '' },
    testability: { score: mech.scores.testability_mech, ...pick(mech.numbers, ['ears_coverage_pct', 'da_coverage_pct', 'livetest_pass_rate']), note: '' },
    actionability: { score: round(mech.scores.structure), plan_acyclic: mech.numbers.plan_acyclic, refs_resolve: mech.numbers.refs_resolve, note: '' },
  }

  let clarity, bri, usedWeights, top_gaps = [], rationale = ''
  if (judge) {
    clarity = { score: clamp(judge.metrics.clarity.score), clarification_questions_needed: judge.metrics.clarity.clarification_questions_needed ?? null, note: judge.metrics.clarity.note || '' }
    // blend judged sub-scores into the hybrid metrics
    const nonvac = judge.metrics?.testability?.nonvacuous_ac_pct
    if (typeof nonvac === 'number') { m.testability.nonvacuous_ac_pct = nonvac; m.testability.score = round(mean([mech.scores.testability_mech, nonvac])) }
    const judgedAct = judge.metrics?.actionability?.score
    if (typeof judgedAct === 'number') m.actionability.score = round(mean([mech.scores.structure, clamp(judgedAct)]))
    if (judge.metrics?.completeness?.note) m.completeness.note = judge.metrics.completeness.note
    top_gaps = Array.isArray(judge.top_gaps) ? judge.top_gaps : []
    rationale = judge.rationale || ''
    usedWeights = WEIGHTS
    bri = round(clarity.score * WEIGHTS.clarity + m.alignment.score * WEIGHTS.alignment + m.completeness.score * WEIGHTS.completeness + m.testability.score * WEIGHTS.testability + m.actionability.score * WEIGHTS.actionability)
  } else {
    // mechanical-only: drop clarity, renormalize remaining weights
    const w = { alignment: WEIGHTS.alignment, completeness: WEIGHTS.completeness, testability: WEIGHTS.testability, actionability: WEIGHTS.actionability }
    const sum = Object.values(w).reduce((a, b) => a + b, 0)
    bri = round((m.alignment.score * w.alignment + m.completeness.score * w.completeness + m.testability.score * w.testability + m.actionability.score * w.actionability) / sum)
    usedWeights = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, +(v / sum).toFixed(3)]))
  }

  return {
    spec: SPEC,
    judge_model: judge ? JUDGE_MODEL : null,
    mechanical_only: !judge,
    build_readiness_index: bri,
    band: band(bri),
    weights: usedWeights,
    metrics: { ...(clarity ? { clarity } : {}), ...m },
    top_gaps,
    rationale,
    mechanical: { align_ok: mech.align_ok, errors: mech.errors, warnings: mech.warnings, errors_detail: mech.findings_summary },
  }
}

function pick(obj, keys) { return Object.fromEntries(keys.filter((k) => obj[k] != null).map((k) => [k, obj[k]])) }

// --- main --------------------------------------------------------------------
const mech = mechanical()
let judge = null
if (!values['no-judge']) {
  try { judge = runJudge(mech) }
  catch (e) { console.error(`[grade] judge skipped (${e.message}); reporting mechanical-only`) }
}
const result = combine(mech, judge)
result.cell = { model_key: values['model-key'] ?? null, scenario: values.scenario ?? null }
result.provenance = provenance({ judgeModel: result.judge_model, now: new Date().toISOString() })
const json = JSON.stringify(result, null, 2)
if (values.out) writeFileSync(values.out, json + '\n')
process.stdout.write(json + '\n')
// exit non-zero when the spec is mechanically broken, so callers can gate on it
process.exit(mech.align_ok ? 0 : 1)
