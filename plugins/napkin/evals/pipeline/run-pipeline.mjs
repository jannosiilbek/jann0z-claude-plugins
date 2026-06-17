#!/usr/bin/env node
// run-pipeline.mjs — automated, end-to-end pipeline eval across a MODEL MATRIX.
// For every (executor model × scenario) it drives the napkin DDD pipeline stage-by-stage
// via `claude -p` (mirroring skill-creator's subprocess pattern: cwd=run dir, CLAUDECODE
// stripped so the CLI can nest), then grades the produced spec/ with grade.mjs. The judge
// model is held CONSTANT across the matrix so Build-Readiness scores compare down a column.
// Results persist to results/{latest.json,matrix.md,latest.md,history.jsonl}; raw run output
// goes under runs/ (gitignored).
//
//   node run-pipeline.mjs                                  # full matrix (all models × all scenarios)
//   node run-pipeline.mjs --models opus --scenario 01      # one cell
//   node run-pipeline.mjs --repeat 3                       # 3 generations/cell -> mean ± σ (variance)
//   node run-pipeline.mjs --models haiku,sonnet --dry-run  # preview plan + cost, no model calls
//   node run-pipeline.mjs --skip-run                       # re-grade existing runs/ dirs only
// After a run, gate it: node check-regression.mjs  (and bless a new baseline once happy).

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, cpSync, appendFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const DIR = dirname(fileURLToPath(import.meta.url))
const MODELS = JSON.parse(readFileSync(join(DIR, 'models.json'), 'utf8'))
const SCEN_DIR = join(DIR, 'scenarios')
const RESULTS = join(DIR, 'results')
const RUNS = join(DIR, 'runs')
const GRADE = join(DIR, 'grade.mjs')
const REPORT = join(DIR, 'report.mjs')

const STAGES = [
  { skill: 'ddd-brief', instruct: (ctx) => `Use the ddd-brief skill to create spec/brief.md for this project. Write all artifacts under ./spec in the current directory. Run the skill to completion.\n\nProject request:\n${ctx}` },
  { skill: 'ddd-domain', instruct: () => `Use the ddd-domain skill to build spec/glossary.md and spec/flows.md from the existing ./spec/brief.md. Run to completion.` },
  { skill: 'ddd-usecases', instruct: () => `Use the ddd-usecases skill to write spec/usecases.md from the existing ./spec/glossary.md and ./spec/flows.md. Run to completion.` },
  { skill: 'erd-modeler', instruct: () => `Use the erd-modeler skill to design and live-test ./spec/data/model.dbml and ./spec/data/usecases.sql from the existing ./spec/glossary.md and ./spec/usecases.md. Loop until the live-test is green.` },
  { skill: 'ddd-plan', instruct: () => `Use the ddd-plan skill to write spec/plan.md from the existing ./spec/usecases.md and ./spec/data/model.dbml. Run to completion.` },
]

const { values } = parseArgs({
  options: {
    models: { type: 'string' },
    scenario: { type: 'string' },
    'judge-model': { type: 'string' },
    concurrency: { type: 'string' },
    repeat: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'skip-run': { type: 'boolean', default: false },
  },
})

const JUDGE = values['judge-model'] || MODELS.judge.id
const CONCURRENCY = Math.max(1, parseInt(values.concurrency || '1'))
// n=3 is the standard replication: a robust-enough median ± σ to gate on, at 40% less cost
// than n=5. Pass --repeat 1 for a quick no-variance look, or a higher n to characterize a
// genuinely flaky cell.
const REPEAT = Math.max(1, parseInt(values.repeat || '3'))

// resolve executor matrix
let executors = MODELS.executors
if (values.models && values.models !== 'all') {
  const want = values.models.split(',').map((s) => s.trim())
  executors = MODELS.executors.filter((m) => want.includes(m.key) || want.includes(m.id))
  if (!executors.length) { console.error(`[run] no models matched "${values.models}" (keys: ${MODELS.executors.map((m) => m.key).join(', ')})`); process.exit(2) }
}

// load scenarios
function parseScenario(file) {
  const text = readFileSync(file, 'utf8')
  const fm = {}
  let body = text
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
      if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '')
    }
    body = m[2]
  }
  return { id: fm.id || basename(file).replace(/\.md$/, ''), title: fm.title || '', sizing: fm.sizing || '', seed: fm.seed || '', prompt: body.trim(), file }
}
let scenarios = readdirSync(SCEN_DIR).filter((f) => f.endsWith('.md')).sort().map((f) => parseScenario(join(SCEN_DIR, f)))
if (values.scenario && values.scenario !== 'all') {
  scenarios = scenarios.filter((s) => s.id === values.scenario)
  if (!scenarios.length) { console.error(`[run] no scenario "${values.scenario}"`); process.exit(2) }
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-')

function sh(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, env: { ...process.env, CLAUDECODE: undefined, ...(opts.env || {}) } })
    let out = '', err = ''
    p.stdout?.on('data', (d) => (out += d))
    p.stderr?.on('data', (d) => (err += d))
    p.on('close', (code) => resolve({ code, out, err }))
    p.on('error', (e) => resolve({ code: -1, out, err: String(e.message || e) }))
  })
}

async function runCell(model, scenario, rep) {
  const runDir = join(RUNS, RUN_ID, model.key, scenario.id, `run-${rep}`)
  const specDir = join(runDir, 'spec')
  if (!values['skip-run']) {
    mkdirSync(runDir, { recursive: true })
    // seed for delta scenarios
    if (scenario.seed && scenario.seed !== 'none') {
      const seedPath = join(SCEN_DIR, scenario.seed)
      if (existsSync(seedPath)) cpSync(seedPath, specDir, { recursive: true })
    }
    for (let i = 0; i < STAGES.length; i++) {
      const stage = STAGES[i]
      const prompt = stage.instruct(scenario.prompt)
      const r = await sh('claude', ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--model', model.id, '--permission-mode', 'bypassPermissions'], { cwd: runDir })
      writeFileSync(join(runDir, `stage-${i + 1}-${stage.skill}.stream.json`), r.out || r.err || '')
      if (r.code !== 0) console.error(`[run] ${model.key}/${scenario.id} stage ${stage.skill} exited ${r.code}`)
    }
  }
  // grade (stamps cell identity + provenance into runDir/grade.json; report.mjs aggregates)
  const g = await sh('node', [GRADE, '--spec', specDir, '--judge-model', JUDGE,
    '--model-key', model.key, '--scenario', scenario.id, '--out', join(runDir, 'grade.json')])
  let grade = null
  try { grade = JSON.parse(g.out) } catch { /* leave null */ }
  const bri = grade?.build_readiness_index ?? null
  appendFileSync(join(RESULTS, 'history.jsonl'), JSON.stringify({
    ts: RUN_ID, judge: JUDGE, model: model.id, model_key: model.key, scenario: scenario.id, repeat: rep,
    bri, band: grade?.band ?? 'error', align_ok: grade?.mechanical?.align_ok ?? false, errors: grade?.mechanical?.errors ?? null,
    skills_hash: grade?.provenance?.skills_hash ?? null, git_sha: grade?.provenance?.git_sha ?? null,
  }) + '\n')
  console.log(`[run] ${model.key} × ${scenario.id} (run ${rep}/${REPEAT}): BRI ${bri} (${grade?.band ?? 'error'})`)
  return { model_key: model.key, scenario: scenario.id, rep, bri }
}

// ---- dry run -----------------------------------------------------------------
if (values['dry-run']) {
  const cells = executors.length * scenarios.length
  const runsTotal = cells * REPEAT
  console.log(`Plan: ${executors.length} models × ${scenarios.length} scenarios × ${REPEAT} repeat(s) = ${runsTotal} pipeline runs (${cells} cells)`)
  console.log(`  each run = ${STAGES.length} pipeline stages + 1 grade  → ${runsTotal * (STAGES.length + 1)} claude -p invocations`)
  console.log(`  executors: ${executors.map((m) => m.id).join(', ')}`)
  console.log(`  judge (constant): ${JUDGE}`)
  console.log(`  scenarios: ${scenarios.map((s) => `${s.id}${s.sizing ? ` [${s.sizing}]` : ''}`).join(', ')}`)
  console.log(`  repeats/cell: ${REPEAT}${REPEAT > 1 ? ' (report computes mean ± σ)' : ' (no variance — pass --repeat 3+ for a regression-grade signal)'}`)
  console.log(`  results -> ${RESULTS}/ (via report.mjs)  ·  raw runs -> ${RUNS}/${RUN_ID}/ (gitignored)`)
  process.exit(0)
}

// ---- run matrix with a concurrency pool --------------------------------------
mkdirSync(RESULTS, { recursive: true })
const jobs = []
for (const m of executors) for (const s of scenarios) for (let r = 1; r <= REPEAT; r++) jobs.push({ m, s, r })

let idx = 0
async function worker() {
  while (idx < jobs.length) {
    const job = jobs[idx++]
    await runCell(job.m, job.s, job.r)
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker))

// ---- render via the committed report path (single source of report logic) ----
const rep = await sh('node', [REPORT, '--runs', join(RUNS, RUN_ID), '--out-dir', RESULTS])
process.stdout.write(rep.out); if (rep.err) process.stderr.write(rep.err)
console.log(`\n[run] results in ${RESULTS}/ · raw runs in ${join(RUNS, RUN_ID)}/ (gitignored)`)
console.log(`[run] gate this run:  node check-regression.mjs   (then  --bless  once you accept it as the new baseline)`)
