# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal Claude Code plugin marketplace (`jann0z-claude-plugins`). It ships one plugin, **napkin**, which contains a DDD spec pipeline (**ddd-brief → ddd-domain → ddd-usecases → erd-modeler → ddd-plan**, gated by **ddd-align**) plus **erd-diagram** — render an existing DBML model into a self-contained HTML ER diagram (manual `/erd-diagram` command only; `disable-model-invocation: true`). Almost everything is markdown (SKILL.md + references) plus Node.js harnesses — there is no build step, no lint step, and no top-level package.json.

The plugin is registered in `.claude-plugin/marketplace.json` (a plugin is not installable until it has an entry there).

## What the ddd-* suite does

A spec pipeline whose artifacts all live in the target project's `spec/` directory — the single source of truth, persistent and hand-editable:

| Skill | Artifact | Job |
|-------|----------|-----|
| ddd-brief | `spec/brief.md` | interactive elicitation (one question at a time) + pipeline sizing (full/lean/delta) |
| ddd-domain | `spec/glossary.md`, `spec/flows.md` | ubiquitous language + event/command/actor/policy flows |
| ddd-usecases | `spec/usecases.md` | UC-xxx use cases, EARS acceptance criteria, data assertions in erd-modeler's closed grammar |
| erd-modeler | `spec/data/model.dbml`, `spec/data/usecases.sql` | the data model, live-tested — each UC data assertion becomes a PGlite test block |
| ddd-plan | `spec/plan.md` | milestones + T-xxx tasks, each citing the UC-xxx it implements |
| ddd-align | (report only) | mechanical cross-artifact consistency gate, run by every skill above |

The **canonical artifact grammar** is `plugins/napkin/skills/ddd-align/references/spec-format.md` — grammar and parser (`check-align.mjs`, checks AL-01…AL-15) live in the same skill so they can't drift; the selftest pins both. Key invariants: IDs are immutable and never reused (deprecate, don't delete); artifacts are updated incrementally, never regenerated wholesale; every assertion stays inside erd-modeler's closed grammar so the spec remains executable.

## What erd-modeler does

Turns a natural-language domain description (or an optional `spec/glossary.md`) into a clean, normalized **DBML** model, audits it against the best-practice rules in `references/validation-rules.md`, then **proves it works** by running it against an in-memory Postgres (PGlite): it generates `schema.sql` + `seed.sql` + one asserting query per business use-case and loops with fixes until every use-case passes. When `spec/usecases.md` exists, the use cases' data assertions are the live tests (labeled `UC-xxx/DA-n`) and the final `usecases.sql` is persisted to `spec/data/`. The `.dbml` model is the deliverable.

## What erd-diagram does

Renders an existing `.dbml` into one self-contained, interactive HTML ER diagram via `scripts/render-erd.mjs` (WASM Graphviz through `@softwaretechnik/dbml-renderer`). Render-only — it never designs or modifies a model. Manual-only: it activates solely on the explicit `/erd-diagram [path]` command.

## Commands

```bash
# erd-modeler PGlite harness: live-test runner + its adversarial selftest
cd plugins/napkin/skills/erd-modeler/scripts && npm test    # runs the selftest
node plugins/napkin/skills/erd-modeler/scripts/selftest.mjs # same, directly

# erd-diagram renderer selftest
cd plugins/napkin/skills/erd-diagram/scripts && npm test

# ddd-align spec-consistency harness selftest (zero deps)
cd plugins/napkin/skills/ddd-align/scripts && npm test

# pipeline-eval selftests (grader refuses false-green; regression gate catches degradation)
cd plugins/napkin/evals/pipeline && npm test

# pipeline-eval FAST smoke gate (deterministic, no model calls): oracle/harness selftests
# + grade the golden spec clean. Run on every change.
cd plugins/napkin/evals/pipeline && npm run smoke
```

The erd-modeler harness (`run-erd-test.mjs`) is the oracle for the skill's live-test stage; the ddd-align harness (`check-align.mjs`) is the oracle for spec cross-artifact consistency; each skill's `selftest.mjs` is an adversarial suite proving its script refuses false-greens. A skill change is not done until its selftest passes.

## Evals — two tiers (see `plugins/napkin/evals/README.md`)

- **Unit (per-skill):** `skills/<skill>/evals/evals.json`, run by **skill-creator** (its standard — keep these files where it expects them). `evals/aggregate-unit.mjs` reads the gitignored `*-workspace/` output (incl. `model-*` variants) and writes the committed, model-explicit summary `skills/<skill>/evals/results.{md,json}`.
- **Pipeline (integration):** `evals/pipeline/` is a **regression guardrail**, not just a benchmark. `run-pipeline.mjs` runs the whole pipeline end-to-end across a model matrix (`models.json`) via `claude -p` with `--repeat n` for replication (mean ± σ); `grade.mjs` scores the produced `spec/` for **build-readiness** (mechanical oracles `check-align.mjs` + `run-erd-test.mjs`, blended with an LLM buildability judge held constant across the matrix) and stamps provenance (harness version, git SHA, skills-hash, rubric-hash); `report.mjs` renders `results/{matrix,latest}.*`; **`check-regression.mjs` diffs latest vs the committed `baseline.json` and exits non-zero on any degradation beyond tolerance + run noise** (`--bless` advances the baseline). `npm run smoke` is the fast deterministic gate (no model calls). Raw runs under `evals/pipeline/runs/` are gitignored; `results/` + `baseline.json` are committed. See `evals/pipeline/README.md`.

## Layout conventions

- Skill anatomy: `plugins/napkin/skills/<skill>/` = `SKILL.md` + `references/` (if any) + `scripts/`.
- Skill harnesses with npm dependencies install them on first run (deps float; the generated `package-lock.json` files are gitignored on purpose). The ddd-align harness is zero-dependency.
- `skills/<skill>-workspace/` directories are gitignored skill-creator eval output — never commit them; they are reproducible from each skill's `evals/evals.json`, and their durable summary is the committed `skills/<skill>/evals/results.md`. Likewise `evals/pipeline/runs/` is gitignored, `evals/pipeline/results/` is committed. (`ddd-align/scripts/fixtures/` is different: committed test inputs.)
- Link with relative paths in docs and artifacts so they stay portable.
