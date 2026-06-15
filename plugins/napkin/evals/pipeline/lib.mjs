// lib.mjs — shared helpers for the napkin pipeline-eval platform: scoring constants,
// statistics (for replication/variance), and provenance pinning (so every score records
// exactly what produced it — skill source, judge rubric, harness version, git SHA).

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const HARNESS_VERSION = '1.0.0'

const HERE = dirname(fileURLToPath(import.meta.url))
export const PIPELINE_DIR = HERE
export const NAPKIN_DIR = join(HERE, '..', '..')
export const SKILLS_DIR = join(NAPKIN_DIR, 'skills')

// --- scoring constants (single source of truth; imported by grade.mjs, report.mjs) ---
export const WEIGHTS = { clarity: 0.25, alignment: 0.20, completeness: 0.20, testability: 0.20, actionability: 0.15 }
export const BANDS = [[85, 'ship-ready'], [70, 'buildable-with-gaps'], [50, 'underspecified'], [0, 'not-buildable']]
export const band = (bri) => BANDS.find(([t]) => bri >= t)[1]
export const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x))
export const round = (x) => Math.round(x)

// --- statistics (for n>1 replication) ---
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
export function stats(xs) {
  const v = xs.filter((x) => typeof x === 'number')
  if (!v.length) return { mean: null, stddev: 0, min: null, max: null, n: 0 }
  const m = v.reduce((a, b) => a + b, 0) / v.length
  const variance = v.length > 1 ? v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1) : 0
  return { mean: +m.toFixed(2), stddev: +Math.sqrt(variance).toFixed(2), min: Math.min(...v), max: Math.max(...v), n: v.length }
}

export function loadModels() {
  return JSON.parse(readFileSync(join(HERE, 'models.json'), 'utf8'))
}

// --- provenance: pin what produced a score so longitudinal comparison is sound ---
function sha12(s) { return createHash('sha256').update(s).digest('hex').slice(0, 12) }

export function gitSha() {
  try { return execFileSync('git', ['-C', NAPKIN_DIR, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() }
  catch { return 'unknown' }
}

// Hash of the skill SOURCE that drives generation (every SKILL.md + references/*.md under
// the napkin skills). A change here is the thing the eval is meant to detect — recording it
// lets a score move be attributed to a skill edit vs a judge/scenario/model change.
export function skillsHash() {
  const files = []
  for (const skill of readdirSync(SKILLS_DIR)) {
    const sdir = join(SKILLS_DIR, skill)
    if (!safeIsDir(sdir) || skill.endsWith('-workspace')) continue
    const skillMd = join(sdir, 'SKILL.md')
    if (existsSync(skillMd)) files.push(skillMd)
    const refs = join(sdir, 'references')
    if (safeIsDir(refs)) for (const f of readdirSync(refs)) if (f.endsWith('.md')) files.push(join(refs, f))
  }
  files.sort()
  const blob = files.map((f) => `${f}\n${readFileSync(f, 'utf8')}`).join('\n')
  return sha12(blob)
}

export function fileHash(path) {
  try { return sha12(readFileSync(path, 'utf8')) } catch { return 'missing' }
}

function safeIsDir(p) { try { return statSync(p).isDirectory() } catch { return false } }

// Stamp recorded on every grade. `now` is injected (callers pass new Date().toISOString())
// so this stays pure/testable.
export function provenance({ judgeModel = null, now } = {}) {
  return {
    harness_version: HARNESS_VERSION,
    git_sha: gitSha(),
    skills_hash: skillsHash(),
    judge_rubric_hash: fileHash(join(HERE, 'buildability-judge.md')),
    judge_model: judgeModel,
    generated: now || null,
  }
}
