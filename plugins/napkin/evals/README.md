# napkin evals

The napkin DDD suite is evaluated at **two tiers**. Both keep their results committed so
skill improvements can be validated against a durable baseline — the raw run output stays
gitignored (it's large and reproducible), but the summaries do not.

## Tier 1 — unit (per-skill)

Each skill is benchmarked in isolation against its own `skills/<skill>/evals/evals.json`,
run by **skill-creator** (its standard mechanism — these files stay exactly where it expects
them). skill-creator writes raw output to the gitignored `skills/<skill>-workspace/` dirs,
including cross-model variants (`model-haiku/`, `model-sonnet/`, …).

`aggregate-unit.mjs` turns that gitignored output into a **committed** summary next to the
evals it describes:

```bash
cd plugins/napkin/evals
node aggregate-unit.mjs --skill ddd-brief        # one skill
node aggregate-unit.mjs --all                    # every skill with a workspace
node aggregate-unit.mjs --skill ddd-plan --primary-model claude-fable-5
```

→ writes `skills/<skill>/evals/results.{md,json}` — a model × pass-rate matrix (with-skill
vs baseline), per-eval breakdown, real model ids (it maps the `model-<x>` workspace dirs to
ids via `pipeline/models.json`, fixing skill-creator's `"<model-name>"` placeholder), and the
run date. This is the durable per-skill record.

## Tier 2 — pipeline (integration)

`pipeline/` runs the **whole** pipeline end-to-end on scenarios, across a model matrix, and
rates how **buildable** the produced `spec/` is for a downstream Claude Code + superpowers
build. See `pipeline/README.md`. Headline output: `pipeline/results/matrix.md`.

```bash
cd plugins/napkin/evals/pipeline
node run-pipeline.mjs --dry-run                   # preview cost
node run-pipeline.mjs --models opus --scenario 01 # one cell
npm test                                          # grader selftest (refuses false-green)
```

## The improvement loop

Harden a skill (for a weak model, say) → re-run that tier → watch the number move:
`skills/<skill>/evals/results.md` for unit pass-rate, `pipeline/results/matrix.md` +
`history.jsonl` for pipeline Build-Readiness. Both are model-explicit and committed.
