#!/usr/bin/env node
// check-regression.mjs — the guardrail. Diff the latest results against a committed
// baseline and FAIL (exit 1) on any degradation beyond tolerance. This is what turns the
// eval from a benchmark into a "0-degrade" gate: run it in CI / before merge.
//
//   node check-regression.mjs                       # results/latest.json vs baseline.json
//   node check-regression.mjs --bless               # set baseline.json := current latest.json
//   node check-regression.mjs --baseline b --latest l   # explicit (used by selftest)
//
// Regression for a cell = any of:
//   - BRI mean dropped by more than config.bri_tolerance
//   - any per-metric mean dropped by more than config.metric_tolerance
//   - mechanical gate went aligned -> drift (align_ok true -> false)
//   - a cell present in the baseline is missing from the latest run
// Improvements and new cells are reported but never fail. When the latest run has repeats
// (n>1), a BRI drop must ALSO exceed the cell's own run noise (baseline allowance widened by
// its stddev) so jitter can't trip the gate.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const { values } = parseArgs({ options: {
  baseline: { type: 'string' }, latest: { type: 'string' }, bless: { type: 'boolean', default: false },
} })
const BASELINE = values.baseline || join(HERE, 'baseline.json')
const LATEST = values.latest || join(HERE, 'results', 'latest.json')
const METRICS = ['clarity', 'alignment', 'completeness', 'testability', 'actionability']

function load(p, what) { if (!existsSync(p)) { console.error(`[regression] ${what} not found: ${p}`); process.exit(2) } return JSON.parse(readFileSync(p, 'utf8')) }
const mn = (x) => (x && typeof x === 'object' ? x.mean : x) // accept {mean,..} or a bare number

// latest.json (report.mjs shape) -> baseline shape
function toBaseline(latest) {
  const cells = {}
  for (const c of latest.cells) {
    cells[`${c.model_key}-${c.scenario}`] = {
      model_key: c.model_key, scenario: c.scenario,
      bri: mn(c.bri), bri_stddev: c.bri?.stddev ?? 0, band: c.band, align_ok: c.align_ok,
      metrics: Object.fromEntries(METRICS.map((k) => [k, mn(c.metrics?.[k])])),
    }
  }
  return {
    config: { bri_tolerance: 5, metric_tolerance: 8,
      note: 'Regression = drop beyond tolerance. With n>1, a BRI drop must also exceed the cell stddev (noise).' },
    blessed: { git_sha: latest.provenance?.git_sha, skills_hash: latest.provenance?.skills_hash,
      judge_model: latest.judge_model, judge_rubric_hash: latest.provenance?.judge_rubric_hash,
      repeats_per_cell: latest.repeats_per_cell, generated: latest.generated },
    cells,
  }
}

// --- bless: write current latest as the new baseline ---
if (values.bless) {
  const latest = load(LATEST, 'latest results')
  writeFileSync(BASELINE, JSON.stringify(toBaseline(latest), null, 2) + '\n')
  console.log(`[regression] blessed baseline := ${LATEST} (${latest.cells.length} cells) -> ${BASELINE}`)
  process.exit(0)
}

// --- compare ---
const base = load(BASELINE, 'baseline')
const latest = load(LATEST, 'latest results')
const cur = toBaseline(latest).cells
const cfg = base.config || { bri_tolerance: 5, metric_tolerance: 8 }

// provenance sanity — these don't fail the gate, but they change its meaning, so shout.
const warns = []
if (base.blessed?.judge_model && latest.judge_model && base.blessed.judge_model !== latest.judge_model)
  warns.push(`judge model changed (${base.blessed.judge_model} -> ${latest.judge_model}) — scores may not be comparable`)
if (base.blessed?.judge_rubric_hash && latest.provenance?.judge_rubric_hash && base.blessed.judge_rubric_hash !== latest.provenance.judge_rubric_hash)
  warns.push('judge rubric changed since baseline — recalibrate/bless')
const skillsChanged = base.blessed?.skills_hash && latest.provenance?.skills_hash && base.blessed.skills_hash !== latest.provenance.skills_hash

const rows = [], regressions = [], improvements = []
for (const key of Object.keys(base.cells)) {
  const b = base.cells[key], c = cur[key]
  if (!c) { regressions.push(`${key}: MISSING from latest run`); rows.push([key, b.bri, '—', '—', 'MISSING']); continue }
  const noise = c.bri_stddev || 0
  const dBri = c.bri - b.bri
  const reasons = []
  if (dBri < -(cfg.bri_tolerance + noise)) reasons.push(`BRI ${b.bri}->${c.bri} (${dBri.toFixed(1)}${noise ? `, noise ±${noise}` : ''})`)
  for (const m of METRICS) {
    const db = (c.metrics[m] ?? 0) - (b.metrics[m] ?? 0)
    if (db < -cfg.metric_tolerance) reasons.push(`${m} ${b.metrics[m]}->${c.metrics[m]} (${db})`)
  }
  if (b.align_ok && !c.align_ok) reasons.push('gate aligned->DRIFT')
  let status
  if (reasons.length) { status = 'REGRESSION'; regressions.push(`${key}: ${reasons.join('; ')}`) }
  else if (dBri > cfg.bri_tolerance) { status = 'improved'; improvements.push(`${key}: BRI ${b.bri}->${c.bri} (+${dBri.toFixed(1)})`) }
  else status = 'ok'
  rows.push([key, b.bri, c.bri, (dBri >= 0 ? '+' : '') + dBri.toFixed(1), status])
}
const newCells = Object.keys(cur).filter((k) => !base.cells[k])

// --- report ---
console.log(`Regression check — baseline git ${base.blessed?.git_sha || '?'} (skills @ ${base.blessed?.skills_hash || '?'}) vs latest git ${latest.provenance?.git_sha || '?'} (skills @ ${latest.provenance?.skills_hash || '?'})`)
if (skillsChanged) console.log('  • skills changed since baseline (expected when iterating — that is what this gate guards)')
for (const w of warns) console.log(`  ⚠️  ${w}`)
console.log('')
console.log(`${'cell'.padEnd(12)} ${'base'.padStart(5)} ${'now'.padStart(5)} ${'Δ'.padStart(6)}  status`)
for (const [k, bb, cc, d, st] of rows) console.log(`${k.padEnd(12)} ${String(bb).padStart(5)} ${String(cc).padStart(5)} ${String(d).padStart(6)}  ${st}`)
if (newCells.length) console.log(`\nnew cells (not in baseline): ${newCells.join(', ')}`)
if (improvements.length) console.log(`\nimprovements:\n  ${improvements.join('\n  ')}`)

if (regressions.length) {
  console.log(`\n❌ REGRESSION — ${regressions.length} cell(s) degraded:`)
  for (const r of regressions) console.log(`  - ${r}`)
  process.exit(1)
}
console.log(`\n✅ no regression (${rows.length} cells within tolerance; ${improvements.length} improved, ${newCells.length} new)`)
process.exit(0)
