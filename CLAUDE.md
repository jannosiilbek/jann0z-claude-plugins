# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal Claude Code plugin marketplace (`plugins/napkin` and `plugins/lunchbox`) plus the eval infrastructure for measuring and hardening those skills. There is no build step — skills are markdown (`SKILL.md`) plus optional Node.js harnesses.

## Testing

Three harnesses have selftests; run each in its own `scripts/` directory:

```bash
cd plugins/napkin/skills/erd-modeler/scripts && npm test   # PGlite live-test harness
cd plugins/napkin/skills/ddd-align/scripts   && npm test   # spec-consistency harness (zero deps)
cd plugins/napkin/skills/erd-diagram/scripts && npm test   # renderer harness
```

Pipeline eval (integration tier, model-matrix, no model calls for the fast gate):

```bash
cd plugins/napkin/evals/pipeline && npm run smoke   # fast — deterministic, seconds, always run first
cd plugins/napkin/evals/pipeline && npm test        # grader + regression-gate selftests
```

**A skill change is not done until the selftest(s) it touches pass.**

## Skill anatomy

Every skill lives at `plugins/<plugin>/skills/<name>/` and follows this layout:

```
SKILL.md              # the skill text loaded into Claude — this is the primary artifact
references/           # documents the skill reads at runtime (e.g. spec-format.md)
scripts/              # Node.js harnesses (selftest.mjs + the oracle script)
evals/
  evals.json          # eval definitions consumed by skill-creator
  results.{md,json}   # committed durable summary (written by aggregate-unit.mjs)
```

`*-workspace/` directories (e.g. `ddd-brief-workspace/`) are gitignored — they hold ephemeral eval output written by skill-creator.

## Napkin plugin — DDD spec pipeline

`plugins/napkin` chains six skills into a DDD pipeline that writes persistent artifacts to the target project's `spec/` directory:

```
ddd-brief → ddd-domain → ddd-usecases → erd-modeler → ddd-plan
                                              │
                          ddd-align (exit gate on every step)
```

| Skill | Writes |
|-------|--------|
| `ddd-brief` | `spec/brief.md` |
| `ddd-domain` | `spec/glossary.md`, `spec/flows.md` |
| `ddd-usecases` | `spec/usecases.md` |
| `erd-modeler` | `spec/data/model.dbml`, `spec/data/usecases.sql` |
| `ddd-plan` | `spec/plan.md` |
| `ddd-align` | report only — never edits |
| `erd-diagram` | standalone render — never auto-triggers |

**`check-align.mjs`** (in `ddd-align/scripts/`) is both the oracle for the `ddd-align` skill and the exit gate every pipeline skill runs after writing an artifact. Its grammar is defined in `ddd-align/references/spec-format.md`; the grammar and the parser live together so they can't drift.

**`erd-modeler` and `erd-diagram` dependencies are not committed.** They install on first use; `package-lock.json` for both is gitignored by design.

## Napkin eval tiers

**Unit (per-skill):** Each skill has `evals/evals.json`. skill-creator runs these and writes output to `*-workspace/` (gitignored). `aggregate-unit.mjs` collapses that output into committed `results.{md,json}`:

```bash
cd plugins/napkin/evals
node aggregate-unit.mjs --skill ddd-brief   # one skill
node aggregate-unit.mjs --all               # all skills with a workspace
```

**Pipeline (integration):** `plugins/napkin/evals/pipeline/` runs the full pipeline end-to-end across a model matrix and scores the produced `spec/` for build-readiness (BRI 0–100). The 0-degrade loop:

```bash
# 1. Confirm machinery is healthy
cd plugins/napkin/evals/pipeline && npm run smoke

# 2. Run pipeline for changed scenario/model
node run-pipeline.mjs --repeat 3 --scenario <id>

# 3. Regression gate — exits 1 if any cell degraded
node check-regression.mjs

# 4. Advance baseline once happy
node check-regression.mjs --bless
```

Raw run output goes under `pipeline/runs/` (gitignored); only `pipeline/results/` summaries are committed.

## Lunchbox plugin — productivity skills

`plugins/lunchbox` contains four skills: `goal`, `council`, `doc-align`, and `product-sparring`. No harnesses or scripts — these are prompt-only skills with optional `references/` and `evals/`.

## Gitignore conventions

- `*-workspace/` — skill-creator eval output, reproducible, never commit
- `pipeline/runs/` — pipeline eval raw output, reproducible, never commit
- `package-lock.json` for erd-modeler and erd-diagram — deps float by design, never commit
- `.claude/settings.local.json` and `.claude/scheduled_tasks.lock` — machine-local, never commit
