---
name: erd-diagram
description: Renders an existing DBML data model into a single, self-contained, professional HTML ER diagram (clean dbdiagram.io-style layout, interactive pan/zoom) and opens it in the browser.
argument-hint: "[path-to.dbml]"
disable-model-invocation: true
allowed-tools: Read, Glob, Bash(node:*)
---

# ERD Diagram

Render an existing **DBML** model into one self-contained, professional HTML file — a confident
model title, then the entity-relationship diagram with cleanly routed connectors and interactive
pan/zoom. The diagram is produced by a real layout engine (WASM Graphviz via
`@softwaretechnik/dbml-renderer`), never hand-drawn.

This skill **only renders** — it does not design, validate, or modify the model. It reads the
`.dbml` a prior modelling step already produced and turns it into a diagram.

## Workflow

### 1. Locate the `.dbml`

Resolve the model file deterministically, in order:

1. **Explicit** — if the command included a path or filename, use it.
2. **Spec workspace** — if a `spec/` directory exists, look for `spec/data/model.dbml`.
3. **Schema home** — if the project already keeps a schema home, look there in this precedence:
   `prisma/` → `supabase/` → `db/` → `database/` → `schema/` → `models/` → `docs/`.
4. **Project root** — otherwise look for a `*.dbml` at the project root.

"The project" is the directory you were asked to work in, or its nearest root (closest ancestor
with `package.json`, `pyproject.toml`, `go.mod`, `.git`, …). If you find **zero** `.dbml` files,
tell the user there's no model to render and suggest running the modelling step first. If you find
**more than one**, list them and ask which to render (or render the one the user names).

### 2. Choose a polished title

The header title should read like something a person wrote, not a filename. Derive it from the
model's domain — read the DBML's leading comment / `Project` name / table names to name the subject,
then pass it explicitly so the page is well-labelled. Examples: `Billing — Data Model`,
`Course Platform — Data Model`. Keep it factual and professional; no emojis, no marketing tone.

### 3. Render

Run the renderer, passing the resolved model path, your title, and `--open` so it opens in the
browser:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/erd-diagram/scripts/render-erd.mjs" \
  --dbml <path/to/model.dbml> \
  --title "<Polished Title>" \
  --open
```

- First run installs the renderer once via npm (needs `npm` + network that one time); afterwards it
  works offline. Install chatter goes to stderr — the **only** thing on stdout is the saved HTML
  path, so capture that.
- The script writes `<basename>.html` next to the `.dbml` by default (e.g. `model.dbml` →
  `model.html`). Pass `--out <path>` only if the user wants it elsewhere.
- The output is fully self-contained: the SVG, styles, and pan/zoom script are all inlined, so the
  file opens offline with no network. Connectors use the renderer's native dbdiagram.io-style routing; the viewer
  supports drag-to-pan, wheel-zoom, and a fit/zoom toolbar.
- If the script exits non-zero, surface its stderr message — it means the DBML couldn't be rendered
  (e.g. a syntax error in the model). Do not invent a diagram; report the problem.

### 4. Report

Tell the user the saved path (it has already opened in their browser), e.g.:

```
📄 Diagram saved to <path>/model.html — opened in your browser.
```

That HTML file is the deliverable.
