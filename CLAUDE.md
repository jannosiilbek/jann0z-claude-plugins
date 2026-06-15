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

Per-skill harness selftests — each is the oracle's adversarial suite; **a skill change is not done until its selftest passes**:

```bash
cd plugins/napkin/skills/erd-modeler/scripts && npm test   # PGlite live-test oracle (run-erd-test.mjs)
cd plugins/napkin/skills/erd-diagram/scripts && npm test   # HTML renderer
cd plugins/napkin/skills/ddd-align/scripts   && npm test   # spec-consistency oracle (check-align.mjs), zero-dep
```

`run-erd-test.mjs` is the oracle for erd-modeler's live-test stage; `check-align.mjs` is the oracle for spec cross-artifact consistency.

## Eval platform — how to run it

Two tiers (full guide: `plugins/napkin/evals/README.md`). Both keep committed, model-explicit results; raw runs are gitignored.

### Unit tier (per-skill)

`skills/<skill>/evals/evals.json` is run by **skill-creator** (its standard mechanism — the unit *runner* is external to this repo; keep these files where skill-creator expects them). Turn the gitignored `*-workspace/` output (incl. `model-*` variants) into the committed summary:

```bash
node plugins/napkin/evals/aggregate-unit.mjs --skill ddd-brief   # one skill
node plugins/napkin/evals/aggregate-unit.mjs --all               # every skill with a workspace
# -> writes the committed skills/<skill>/evals/results.{md,json} (model × pass-rate, real model ids)
```

### Pipeline tier (integration) — a regression guardrail

All commands run from `plugins/napkin/evals/pipeline/`.

**Deterministic — no model calls, always safe (use freely, incl. CI):**
```bash
npm run smoke                                   # FAST gate (~15s): all oracle/harness selftests + grade golden clean. Run on EVERY change.
npm test                                        # grader + regression-gate selftests
node grade.mjs --spec <dir> --no-judge          # mechanical-only score of any spec/ (check-align + live-test re-check)
node grade.mjs --spec <dir> --judge-file j.json # grade with a pre-computed judge result (no model call)
node report.mjs [--runs <dir>] [--out-dir <dir>] # (re)render results/{matrix,latest}.* from runs/ — reproducible
node check-regression.mjs                       # THE GATE: diff results/latest.json vs baseline.json; exit 1 on degradation
node check-regression.mjs --bless               # set baseline := latest (advance the baseline deliberately)
```

**Model-driven — these invoke `claude -p`:**
```bash
node grade.mjs --spec <dir>                     # full grade: mechanical + ONE read-only judge call (NOT permission-blocked)
node run-pipeline.mjs --dry-run                 # preview matrix size + cost; no calls
node run-pipeline.mjs --models opus --scenario 01 --repeat 3   # run cells; --models all / --scenario all for the full matrix
node run-pipeline.mjs --skip-run                # re-grade existing runs/ without re-running the pipeline
```

**Running the full live pipeline (important):** `run-pipeline.mjs` drives each stage with `claude -p --permission-mode bypassPermissions`. An interactive Claude Code session's auto-mode classifier **blocks that** (nested unattended agents) unless the user adds a Bash allow-rule for `node *run-pipeline.mjs*`. So in-session you have two correct options: **(a)** the user pre-authorizes that rule and you run the script, or **(b)** drive the pipeline via the **Agent tool — one subagent per stage**, sharing a run dir, each invoking the napkin skill via the Skill tool, then grade with `grade.mjs --judge-file` (or the read-only judge, which is not blocked). Weaker models often won't chain all 5 stages in one agent — stage-drive them (one subagent per skill). The executor matrix + the constant judge model live in `models.json`.

**Scoring:** the headline **Build-Readiness Index** is a weighted blend of clarity / alignment / completeness / testability / actionability; a cell's value is the **median** across `--repeat` runs (robust to judge noise), carried with σ. Clarity is derived in-code from the judge's question count via a diminishing-returns curve (`lib.mjs`), not by the judge. Provenance (git SHA, **skills-hash**, judge-rubric-hash) is stamped on every score, so a moved number is attributable to a skill edit vs a judge/scenario change. Raw runs under `evals/pipeline/runs/` are gitignored; `results/` + `baseline.json` are committed.

## Layout conventions

- Skill anatomy: `plugins/napkin/skills/<skill>/` = `SKILL.md` + `references/` (if any) + `scripts/`.
- Skill harnesses with npm dependencies install them on first run (deps float; the generated `package-lock.json` files are gitignored on purpose). The ddd-align harness is zero-dependency.
- `skills/<skill>-workspace/` directories are gitignored skill-creator eval output — never commit them; they are reproducible from each skill's `evals/evals.json`, and their durable summary is the committed `skills/<skill>/evals/results.md`. Likewise `evals/pipeline/runs/` is gitignored, `evals/pipeline/results/` is committed. (`ddd-align/scripts/fixtures/` is different: committed test inputs.)
- Link with relative paths in docs and artifacts so they stay portable.
