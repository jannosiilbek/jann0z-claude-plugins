#!/usr/bin/env node
// smoke.mjs — the FAST tier. Deterministic, zero model calls, runs in seconds. This is the
// gate you run on every change: it protects the ORACLES and the GRADER (the machinery the
// whole platform trusts) against regression. It does NOT exercise the skills' generative
// behavior — that's the periodic live matrix (run-pipeline.mjs) gated by check-regression.mjs.
//
// Checks:
//   1. Every oracle/harness selftest the eval depends on (check-align, run-erd-test, the
//      grader, the regression gate) still passes.
//   2. The grader, run mechanically on the committed golden spec, still scores it clean
//      (align_ok + BRI 100) — catches a grader/oracle change that would mis-score real input.

import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const NAPKIN = join(HERE, '..', '..')
const GOLDEN = join(NAPKIN, 'skills', 'ddd-align', 'scripts', 'fixtures', 'golden', 'spec')

let fail = 0
const t0 = Date.now()
function step(name, fn) {
  process.stdout.write(`  … ${name}`)
  try { fn(); process.stdout.write(`\r  ok  ${name}\n`) }
  catch (e) { fail++; process.stdout.write(`\r FAIL ${name} — ${String(e.message || e).split('\n')[0]}\n`) }
}
const runNode = (file, args = [], cwd) => execFileSync('node', [file, ...args], { cwd: cwd || HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

console.log('smoke — oracle + grader regression gate (deterministic, no model calls)\n')

// 1. selftests the eval depends on
step('ddd-align harness selftest (check-align oracle)', () => runNode('selftest.mjs', [], join(NAPKIN, 'skills', 'ddd-align', 'scripts')))
step('erd-modeler harness selftest (live-test oracle)', () => runNode('selftest.mjs', [], join(NAPKIN, 'skills', 'erd-modeler', 'scripts')))
step('pipeline grader selftest (refuses false-green)', () => runNode(join(HERE, 'selftest.mjs')))
step('regression-gate selftest (catches degradation)', () => runNode(join(HERE, 'selftest-regression.mjs')))

// 2. grader scores the golden spec clean
step('grade.mjs on golden spec = clean (align_ok, BRI 100)', () => {
  const out = runNode(join(HERE, 'grade.mjs'), ['--spec', GOLDEN, '--no-judge'])
  const d = JSON.parse(out)
  if (!d.mechanical?.align_ok) throw new Error('golden spec no longer aligns')
  if (d.build_readiness_index !== 100) throw new Error(`golden mechanical BRI ${d.build_readiness_index} != 100`)
})

const secs = ((Date.now() - t0) / 1000).toFixed(1)
console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — smoke ${fail === 0 ? 'green' : fail + ' failed'} in ${secs}s`)
process.exit(fail === 0 ? 0 : 1)
