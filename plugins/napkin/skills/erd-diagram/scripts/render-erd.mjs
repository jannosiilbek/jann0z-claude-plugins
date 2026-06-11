#!/usr/bin/env node
// render-erd.mjs — turn a DBML model into a single, self-contained, professional HTML ER diagram.
//
// Pipeline: read .dbml → normalize → render to SVG via @softwaretechnik/dbml-renderer
// (WASM Graphviz, no native deps) → inline into a framed HTML shell with interactive pan/zoom.
// The output is self-contained: SVG + CSS + the tiny pan/zoom script are all inlined, so the
// .html opens offline with no CDN.
//
// Usage:
//   node render-erd.mjs --dbml <path> [--title "Human Title"] [--out <path.html>] [--open]
//
// Exits non-zero with a clear stderr message on any failure — it never writes a broken page.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, basename, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const RENDERER = '@softwaretechnik/dbml-renderer'

function fail(msg) {
  process.stderr.write(`[erd-diagram] ${msg}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  const args = { open: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dbml') args.dbml = argv[++i]
    else if (a === '--title') args.title = argv[++i]
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--open') args.open = true
    else fail(`unknown argument: ${a}`)
  }
  if (!args.dbml) fail('missing --dbml <path>')
  return args
}

// Lazy-install the renderer on first run. npm chatter is routed to stderr so stdout (the saved
// path) stays clean — the same convention the erd-modeler harness uses.
function ensureDeps() {
  if (existsSync(join(SCRIPT_DIR, 'node_modules', '@softwaretechnik', 'dbml-renderer'))) return
  process.stderr.write(`[erd-diagram] ${RENDERER} not found — installing once via npm (first run only)...\n`)
  try {
    execFileSync('npm', ['install'], { cwd: SCRIPT_DIR, stdio: ['ignore', 2, 2] })
  } catch (e) {
    fail(`npm install failed: ${e.message ?? e}`)
  }
}

// erd-modeler escapes apostrophes inside Notes SQL-style (doubled '' ), which the DBML grammar
// rejects. Fold those to a typographic apostrophe — parser-safe and it reads better in the diagram.
export const normalizeDbml = (s) => s.replaceAll("''", '’')

const titleCase = (s) =>
  s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())

// Title precedence: explicit --title → DBML `Project <name>` → prettified filename.
function deriveTitle(raw, explicit, dbmlPath) {
  if (explicit && explicit.trim()) return explicit.trim()
  const proj = raw.match(/^\s*Project\s+"?([\w .\-]+?)"?\s*\{/m)
  if (proj) return titleCase(proj[1])
  const base = basename(dbmlPath).replace(/\.dbml$/i, '')
  return /^model$/i.test(base) ? 'Data Model' : `${titleCase(base)} — Data Model`
}

// Factual header counts (cosmetic). Regex over the source — robust to the Note-escaping quirks
// that defeat strict DBML parsers.
function modelCounts(raw) {
  const tables = (raw.match(/^\s*Table\s+[\w".`]+/gm) || []).length
  const enums = (raw.match(/^\s*Enum\s+[\w".`]+/gm) || []).length
  const inlineRefs = (raw.match(/\bref\s*:/gi) || []).length
  const standaloneRefs = (raw.match(/^\s*Ref\b\s*[:\w]/gim) || []).length
  return { tables, enums, refs: inlineRefs + standaloneRefs }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function metaLine({ tables, refs, enums }) {
  const parts = [plural(tables, 'table'), plural(refs, 'relationship')]
  if (enums > 0) parts.push(plural(enums, 'enum'))
  return parts.join(' · ')
}

// Inline SVG must not carry the XML prolog / DOCTYPE — keep only the <svg> element.
function inlineSvg(svg) {
  const i = svg.indexOf('<svg')
  return i >= 0 ? svg.slice(i) : svg
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function htmlDocument({ title, meta, svg }) {
  const t = escapeHtml(title)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<style>
  :root {
    --bg: #f4f5f7; --panel: #ffffff; --ink: #14181f; --muted: #677084;
    --line: #e3e6ea; --accent: #3b5bdb; --shadow: 0 1px 2px rgba(20,24,31,.04), 0 6px 20px rgba(20,24,31,.06);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased; display: flex; flex-direction: column;
  }
  header {
    padding: 22px 28px 18px; background: var(--panel); border-bottom: 1px solid var(--line);
  }
  h1 { margin: 0; font-size: 20px; font-weight: 650; letter-spacing: -0.012em; }
  .meta { margin-top: 5px; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
  main { flex: 1; min-height: 0; padding: 20px 28px 28px; display: flex; }
  .frame {
    flex: 1; min-height: 0; position: relative; background: var(--panel);
    border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); overflow: hidden;
  }
  .toolbar {
    position: absolute; top: 12px; right: 12px; z-index: 2; display: flex; gap: 6px;
    background: rgba(255,255,255,.86); backdrop-filter: blur(6px);
    border: 1px solid var(--line); border-radius: 9px; padding: 4px; box-shadow: var(--shadow);
  }
  .toolbar button {
    appearance: none; border: 0; background: transparent; color: var(--ink);
    font: inherit; font-size: 13px; line-height: 1; min-width: 30px; height: 28px; padding: 0 9px;
    border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  }
  .toolbar button:hover { background: #eef1fb; color: var(--accent); }
  .toolbar .sep { width: 1px; background: var(--line); margin: 4px 2px; }
  #viewport { position: absolute; inset: 0; overflow: hidden; cursor: grab; touch-action: none; }
  #viewport.panning { cursor: grabbing; }
  #stage { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
  #stage svg { display: block; }
  footer { padding: 0 28px 18px; font-size: 12px; color: var(--muted); }
</style>
</head>
<body>
  <header>
    <h1>${t}</h1>
    <div class="meta">${escapeHtml(meta)}</div>
  </header>
  <main>
    <div class="frame">
      <div class="toolbar" role="toolbar" aria-label="Diagram controls">
        <button id="zoom-out" title="Zoom out" aria-label="Zoom out">−</button>
        <button id="zoom-in" title="Zoom in" aria-label="Zoom in">+</button>
        <span class="sep"></span>
        <button id="fit" title="Fit to view" aria-label="Fit to view">Fit</button>
      </div>
      <div id="viewport">
        <div id="stage">${svg}</div>
      </div>
    </div>
  </main>
  <footer>Entity-relationship diagram · drag to pan, scroll to zoom</footer>
<script>
(function () {
  var viewport = document.getElementById('viewport');
  var stage = document.getElementById('stage');
  var svg = stage.querySelector('svg');
  var scale = 1, tx = 0, ty = 0;
  var MIN = 0.1, MAX = 8;

  function apply() { stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; }

  function natural() {
    // Graphviz emits width/height in pt; fall back to the rendered box.
    var w = svg.width && svg.width.baseVal ? svg.width.baseVal.value : 0;
    var h = svg.height && svg.height.baseVal ? svg.height.baseVal.value : 0;
    if (!w || !h) { var r = svg.getBoundingClientRect(); w = r.width / scale; h = r.height / scale; }
    return { w: w, h: h };
  }

  function fit() {
    var vp = viewport.getBoundingClientRect();
    var n = natural();
    if (!n.w || !n.h) return;
    var pad = 32;
    scale = Math.max(MIN, Math.min(MAX, Math.min((vp.width - pad) / n.w, (vp.height - pad) / n.h, 1.6)));
    tx = (vp.width - n.w * scale) / 2;
    ty = (vp.height - n.h * scale) / 2;
    apply();
  }

  function zoomAt(cx, cy, factor) {
    var next = Math.max(MIN, Math.min(MAX, scale * factor));
    if (next === scale) return;
    // Keep the point under the cursor fixed.
    tx = cx - (cx - tx) * (next / scale);
    ty = cy - (cy - ty) * (next / scale);
    scale = next;
    apply();
  }

  viewport.addEventListener('wheel', function (e) {
    e.preventDefault();
    var rect = viewport.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  var dragging = false, lastX = 0, lastY = 0;
  viewport.addEventListener('pointerdown', function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    viewport.classList.add('panning'); viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    tx += e.clientX - lastX; ty += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; apply();
  });
  function endDrag() { dragging = false; viewport.classList.remove('panning'); }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  function centerZoom(factor) {
    var vp = viewport.getBoundingClientRect();
    zoomAt(vp.width / 2, vp.height / 2, factor);
  }
  document.getElementById('zoom-in').addEventListener('click', function () { centerZoom(1.2); });
  document.getElementById('zoom-out').addEventListener('click', function () { centerZoom(1 / 1.2); });
  document.getElementById('fit').addEventListener('click', fit);

  window.addEventListener('resize', fit);
  // Let layout settle, then fit the whole diagram into view.
  requestAnimationFrame(function () { requestAnimationFrame(fit); });
})();
</script>
</body>
</html>
`
}

function openInBrowser(file) {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  try {
    execFileSync(opener, [file], { stdio: 'ignore' })
  } catch {
    // Opening is a convenience; never fail the run because no opener is available.
    process.stderr.write(`[erd-diagram] could not auto-open (${opener} unavailable); open it manually.\n`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dbmlPath = resolve(args.dbml)
  if (!existsSync(dbmlPath)) fail(`DBML file not found: ${dbmlPath}`)

  ensureDeps()
  let run
  try {
    ;({ run } = await import(`${RENDERER}/lib/api.js`))
  } catch (e) {
    fail(`could not load ${RENDERER}: ${e.message ?? e}`)
  }

  const raw = readFileSync(dbmlPath, 'utf8')
  let svg
  try {
    // Use dbml-renderer exactly as designed: it produces the clean, dbdiagram.io-style SVG with
    // smoothly routed connectors. (We tried forcing sharp/orthogonal edges and it only made the
    // routing worse — the library's default is the professional look.)
    svg = run(normalizeDbml(raw), 'svg')
  } catch (e) {
    fail(`could not render the DBML (check the model is valid): ${String(e.message ?? e).split('\n')[0]}`)
  }

  const html = htmlDocument({
    title: deriveTitle(raw, args.title, dbmlPath),
    meta: metaLine(modelCounts(raw)),
    svg: inlineSvg(svg),
  })

  const outPath = resolve(args.out || dbmlPath.replace(/\.dbml$/i, '') + '.html')
  try {
    writeFileSync(outPath, html, 'utf8')
  } catch (e) {
    fail(`could not write ${outPath}: ${e.message ?? e}`)
  }

  if (args.open) openInBrowser(outPath)
  // The saved path is the only thing on stdout — clean for the caller to capture.
  process.stdout.write(outPath + '\n')
}

// Run only when executed directly (so the selftest can import the pure helpers above).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
