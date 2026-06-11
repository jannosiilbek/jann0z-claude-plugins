# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal Claude Code plugin marketplace (`jann0z-claude-plugins`). It ships one plugin, **napkin**, which contains two skills: **erd-modeler** — design, validate, and live-test a relational data model — and **erd-diagram** — render an existing DBML model into a self-contained HTML ER diagram (manual `/erd-diagram` command only; `disable-model-invocation: true`). Almost everything is markdown (SKILL.md + references) plus Node.js harnesses — there is no build step, no lint step, and no top-level package.json.

The plugin is registered in `.claude-plugin/marketplace.json` (a plugin is not installable until it has an entry there).

## What erd-modeler does

Turns a natural-language domain description (or an optional `spec/glossary.md`) into a clean, normalized **DBML** model, audits it against the best-practice rules in `references/validation-rules.md`, then **proves it works** by running it against an in-memory Postgres (PGlite): it generates `schema.sql` + `seed.sql` + one asserting query per business use-case and loops with fixes until every use-case passes. The `.dbml` model is the deliverable.

## What erd-diagram does

Renders an existing `.dbml` into one self-contained, interactive HTML ER diagram via `scripts/render-erd.mjs` (WASM Graphviz through `@softwaretechnik/dbml-renderer`). Render-only — it never designs or modifies a model. Manual-only: it activates solely on the explicit `/erd-diagram [path]` command.

## Commands

```bash
# erd-modeler PGlite harness: live-test runner + its adversarial selftest
cd plugins/napkin/skills/erd-modeler/scripts && npm test    # runs the selftest
node plugins/napkin/skills/erd-modeler/scripts/selftest.mjs # same, directly

# erd-diagram renderer selftest
cd plugins/napkin/skills/erd-diagram/scripts && npm test
```

The erd-modeler harness (`run-erd-test.mjs`) is the oracle for the skill's live-test stage; each skill's `selftest.mjs` is an adversarial suite proving its script refuses false-greens. A skill change is not done until its selftest passes.

## Layout conventions

- Skill anatomy: `plugins/napkin/skills/<skill>/` = `SKILL.md` + `references/` (if any) + `scripts/`.
- Both skill harnesses install their npm dependency on first run (deps float; the generated `package-lock.json` files are gitignored on purpose).
- `skills/<skill>-workspace/` directories are gitignored skill-creator eval output — never commit them; they are reproducible from each skill's `evals/evals.json`.
- Link with relative paths in docs and artifacts so they stay portable.
