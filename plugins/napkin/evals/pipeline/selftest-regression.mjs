#!/usr/bin/env node
// selftest-regression.mjs — proves check-regression.mjs catches degradation and never
// false-alarms on improvement/noise. A guardrail you haven't tried to fool is not a guardrail.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CHECK = join(HERE, 'check-regression.mjs')
const dir = mkdtempSync(join(tmpdir(), 'regression-selftest-'))
let pass = 0, fail = 0
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log(`  ok  ${name}`) } else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`) } }

const METRICS = ['clarity', 'alignment', 'completeness', 'testability', 'actionability']

// baseline: cell A (bri 90, metrics 90) and B (bri 80, metrics 80), both aligned
function baseline() {
  const cell = (mk, scn, bri, m, align = true) => [`${mk}-${scn}`, { model_key: mk, scenario: scn, bri, band: 'x', align_ok: align, metrics: Object.fromEntries(METRICS.map((k) => [k, m])) }]
  return { config: { bri_tolerance: 5, metric_tolerance: 8 },
    blessed: { git_sha: 'base', skills_hash: 'h0', judge_model: 'claude-opus-4-8', judge_rubric_hash: 'r0' },
    cells: Object.fromEntries([cell('m', '01', 90, 90), cell('m', '02', 80, 80)]) }
}
// latest in report.mjs shape; specs = [{mk,scn,bri,stddev,metrics{...overrides},align_ok}]
function latest(specs, prov = {}) {
  return { provenance: { git_sha: 'new', skills_hash: 'h1', judge_rubric_hash: 'r0', ...prov }, judge_model: prov.judge_model || 'claude-opus-4-8', repeats_per_cell: prov.repeats_per_cell || 1,
    cells: specs.map((s) => ({ model_key: s.mk, scenario: s.scn, bri: { mean: s.bri, stddev: s.stddev || 0, n: s.n || 1 }, band: 'x', align_ok: s.align ?? true,
      metrics: Object.fromEntries(METRICS.map((k) => [k, { mean: s.metrics?.[k] ?? (s.mk === 'm' && s.scn === '01' ? 90 : 80) }])) })) }
}
function run(latestObj, base = baseline()) {
  const bp = join(dir, 'b.json'), lp = join(dir, 'l.json')
  writeFileSync(bp, JSON.stringify(base)); writeFileSync(lp, JSON.stringify(latestObj))
  try { execFileSync('node', [CHECK, '--baseline', bp, '--latest', lp], { encoding: 'utf8' }); return 0 }
  catch (e) { return e.status ?? 1 }
}

const A = { mk: 'm', scn: '01' }, B = { mk: 'm', scn: '02' }
// 1. identical -> pass
ok('identical run passes', run(latest([{ ...A, bri: 90 }, { ...B, bri: 80 }])) === 0)
// 2. BRI drop beyond tolerance -> regression
ok('BRI drop 10 (>tol 5) caught', run(latest([{ ...A, bri: 80 }, { ...B, bri: 80 }])) === 1)
// 3. BRI drop within tolerance -> pass
ok('BRI drop 4 (<tol 5) passes', run(latest([{ ...A, bri: 86 }, { ...B, bri: 80 }])) === 0)
// 4. missing cell -> regression
ok('missing cell caught', run(latest([{ ...A, bri: 90 }])) === 1)
// 5. gate aligned->drift -> regression
ok('align_ok true->false caught', run(latest([{ ...A, bri: 90, align: false }, { ...B, bri: 80 }])) === 1)
// 6. improvement -> pass (no false alarm)
ok('improvement does not false-alarm', run(latest([{ ...A, bri: 98 }, { ...B, bri: 90 }])) === 0)
// 7. metric drop beyond metric_tolerance, BRI flat -> regression
ok('per-metric drop caught (BRI flat)', run(latest([{ ...A, bri: 90, metrics: { clarity: 70 } }, { ...B, bri: 80 }])) === 1)
// 8a. noise absorbs a small drop: drop 6 but stddev 4 -> tol+noise=9 -> pass
ok('noise (σ=4) absorbs drop of 6', run(latest([{ ...A, bri: 84, stddev: 4, n: 3 }, { ...B, bri: 80 }])) === 0)
// 8b. drop exceeds tol+noise -> regression even with stddev
ok('drop 10 exceeds tol+σ(4) -> caught', run(latest([{ ...A, bri: 80, stddev: 4, n: 3 }, { ...B, bri: 80 }])) === 1)
// 9. new cell -> pass (informational)
ok('new cell does not fail', run(latest([{ ...A, bri: 90 }, { ...B, bri: 80 }, { mk: 'm', scn: '03', bri: 70 }])) === 0)

rmSync(dir, { recursive: true, force: true })
console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
