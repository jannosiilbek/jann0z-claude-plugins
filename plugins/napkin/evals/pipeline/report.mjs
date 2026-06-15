#!/usr/bin/env node
// report.mjs — aggregate per-cell grade.json files (one or many repeats per cell) into the
// committed results/{matrix.md, latest.md, latest.json}. Reproducible: no manual steps.
// When a cell has >1 repeat it reports mean ± stddev (the variance you need to tell a real
// regression from run-to-run noise).
//
//   node report.mjs                       # aggregate ./runs, write ./results
//   node report.mjs --runs <dir> --out-dir <dir>

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadModels, stats, band } from './lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const { values } = parseArgs({ options: { runs: { type: 'string' }, 'out-dir': { type: 'string' } } })
const RUNS = values.runs || join(HERE, 'runs')
const OUT = values['out-dir'] || join(HERE, 'results')
const MODELS = loadModels()
const METRICS = ['clarity', 'alignment', 'completeness', 'testability', 'actionability']

// scenario id -> title/sizing from scenarios/*.md frontmatter
function loadScenarios() {
  const dir = join(HERE, 'scenarios'), out = {}
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const t = readFileSync(join(dir, f), 'utf8'); const m = t.match(/^---\n([\s\S]*?)\n---/)
    const fm = {}; if (m) for (const ln of m[1].split('\n')) { const kv = ln.match(/^(\w+):\s*(.*)$/); if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '') }
    if (fm.id) out[fm.id] = { title: fm.title || '', sizing: fm.sizing || '' }
  }
  return out
}

// find every grade.json under RUNS
function findGrades(dir) {
  const acc = []
  const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (safeDir(p)) walk(p); else if (e === 'grade.json') acc.push(p) } }
  if (safeDir(dir)) walk(dir)
  return acc
}
function safeDir(p) { try { return statSync(p).isDirectory() } catch { return false } }

function cellKey(g, path) {
  if (g.cell?.model_key && g.cell?.scenario) return [g.cell.model_key, g.cell.scenario]
  // fallback: parse the spec path (agent-<model>-<scn>/spec  OR  <model>/<scn>/.../spec)
  const s = g.spec || path
  let m = s.match(/agent-([a-z0-9]+)-([a-z0-9]+)\b/) || s.match(/\/([a-z]+)\/(\d+)\//)
  return m ? [m[1], m[2]] : ['unknown', 'unknown']
}

// --- collect ---
const groups = new Map() // "model|scn" -> [grade,...]
for (const gp of findGrades(RUNS)) {
  let g; try { g = JSON.parse(readFileSync(gp, 'utf8')) } catch { continue }
  if (typeof g.build_readiness_index !== 'number') continue
  const [mk, scn] = cellKey(g, gp)
  const k = `${mk}|${scn}`
  if (!groups.has(k)) groups.set(k, [])
  groups.get(k).push(g)
}
if (!groups.size) { console.error(`[report] no gradeable cells under ${RUNS}`); process.exit(1) }

const scenMeta = loadScenarios()
const scenarios = [...new Set([...groups.keys()].map((k) => k.split('|')[1]))].sort()
const execOrder = MODELS.executors.map((m) => m.key)
const modelLabel = Object.fromEntries(MODELS.executors.map((m) => [m.key, m.label]))
const modelId = Object.fromEntries(MODELS.executors.map((m) => [m.key, m.id]))

function aggregateCell(grades) {
  const bri = stats(grades.map((g) => g.build_readiness_index))
  const metrics = {}
  for (const name of METRICS) metrics[name] = stats(grades.map((g) => g.metrics?.[name]?.score).filter((x) => typeof x === 'number'))
  const rep = grades[0] // representative run for qualitative fields
  return {
    bri, band: band(Math.round(bri.median)), metrics,
    align_ok: grades.every((g) => g.mechanical?.align_ok),
    errors: Math.max(...grades.map((g) => g.mechanical?.errors ?? 0)),
    n: grades.length,
    top_gaps: rep.top_gaps || [], rationale: rep.rationale || '',
    provenance: rep.provenance || null,
  }
}

const cells = {}
for (const [k, grades] of groups) cells[k] = aggregateCell(grades)

const anyProv = Object.values(cells).find((c) => c.provenance)?.provenance || {}
const ns = Object.values(cells).map((c) => c.n)
const maxN = Math.max(...ns), minN = Math.min(...ns)
const repeatsLabel = maxN === 1 ? 'n=1 per cell — no variance yet'
  : minN === maxN ? `${maxN} repeats/cell (median±σ)`
  : `n=${minN}–${maxN} per cell (replicated cells show median±σ)`
// median is the headline (robust to the judge's fat tail); show ±σ when replicated.
const fmt = (st) => st.n > 1 ? `${st.median}±${st.stddev}` : `${st.median}`

// --- matrix.md ---
const L = ['# Pipeline eval — Build-Readiness matrix', '']
L.push(`_judge: ${anyProv.judge_model || 'n/a'} (held constant) · skills @ ${anyProv.skills_hash || '?'} · git ${anyProv.git_sha || '?'} · ${repeatsLabel}._`)
L.push('_BRI 0–100. Bands: ≥85 ship-ready · 70–84 buildable-with-gaps · 50–69 underspecified · <50 not-buildable._', '')
L.push(`| Executor \\ scenario | ${scenarios.map((s) => `${s}${scenMeta[s]?.sizing ? ` (${scenMeta[s].sizing})` : ''}`).join(' | ')} |`)
L.push(`|---|${scenarios.map(() => '---').join('|')}|`)
for (const mk of execOrder) {
  const row = [`**${modelLabel[mk] || mk}**`]
  let any = false
  for (const s of scenarios) { const c = cells[`${mk}|${s}`]; if (c) { any = true; row.push(`${fmt(c.bri)} ${shortBand(c.band)}`) } else row.push('—') }
  L.push(`| ${row.join(' | ')} |`)
  if (!any) { /* model absent entirely */ }
}
const absent = execOrder.filter((mk) => !scenarios.some((s) => cells[`${mk}|${s}`]))
if (absent.length) L.push('', `_Not run: ${absent.map((mk) => modelLabel[mk] || mk).join(', ')}._`)
L.push('', '## Per-metric (median' + (maxN > 1 ? ' ± σ' : '') + '): clarity / alignment / completeness / testability / actionability', '')
L.push('| Cell | BRI | band | clar | algn | cmpl | test | actn | gate |')
L.push('|------|----:|------|----:|----:|----:|----:|----:|------|')
for (const mk of execOrder) for (const s of scenarios) {
  const c = cells[`${mk}|${s}`]; if (!c) continue
  const g = c.align_ok ? '✅' : `❌ ${c.errors}err`
  L.push(`| ${mk}-${s} | ${fmt(c.bri)} | ${c.band} | ${fmt(c.metrics.clarity)} | ${fmt(c.metrics.alignment)} | ${fmt(c.metrics.completeness)} | ${fmt(c.metrics.testability)} | ${fmt(c.metrics.actionability)} | ${g} |`)
}
writeFileSync(join(OUT, 'matrix.md'), L.join('\n') + '\n')

function shortBand(b) { return { 'ship-ready': 'ship', 'buildable-with-gaps': 'gaps', 'underspecified': 'under', 'not-buildable': 'no-build' }[b] || b }

// --- latest.json ---
const payload = {
  generated: anyProv.generated || null,
  judge_model: anyProv.judge_model || null,
  provenance: { harness_version: anyProv.harness_version, git_sha: anyProv.git_sha, skills_hash: anyProv.skills_hash, judge_rubric_hash: anyProv.judge_rubric_hash },
  repeats_per_cell: maxN,
  scenarios: scenarios.map((s) => ({ id: s, ...scenMeta[s] })),
  cells: [],
}
for (const mk of execOrder) for (const s of scenarios) {
  const c = cells[`${mk}|${s}`]; if (!c) continue
  payload.cells.push({
    model: modelId[mk] || mk, model_key: mk, scenario: s,
    bri: c.bri, band: c.band, align_ok: c.align_ok, errors: c.errors,
    metrics: Object.fromEntries(METRICS.map((n) => [n, c.metrics[n]])),
    top_gaps: c.top_gaps,
  })
}
writeFileSync(join(OUT, 'latest.json'), JSON.stringify(payload, null, 2) + '\n')

// --- latest.md ---
const D = ['# Pipeline eval — last result (detail)', '', `_${payload.cells.length} cells · judge ${payload.judge_model} · ${repeatsLabel} · skills @ ${anyProv.skills_hash}_`, '']
for (const cell of payload.cells) {
  const m = cell.metrics
  D.push(`## ${modelLabel[cell.model_key] || cell.model_key} × ${cell.scenario}${scenMeta[cell.scenario]?.title ? ` (${scenMeta[cell.scenario].title})` : ''} — BRI ${fmt(cell.bri)} (${cell.band})`)
  D.push(`- gate: ${cell.align_ok ? 'aligned' : 'DRIFT — ' + cell.errors + ' errors'} · clar ${fmt(m.clarity)} · algn ${fmt(m.alignment)} · cmpl ${fmt(m.completeness)} · test ${fmt(m.testability)} · actn ${fmt(m.actionability)}`)
  for (const gp of (cell.top_gaps || []).slice(0, 3)) D.push(`  - gap: ${gp}`)
  D.push('')
}
writeFileSync(join(OUT, 'latest.md'), D.join('\n'))

console.log(`[report] ${payload.cells.length} cells (${maxN} repeat${maxN > 1 ? 's' : ''} max) → ${OUT}/{matrix.md,latest.md,latest.json}`)
