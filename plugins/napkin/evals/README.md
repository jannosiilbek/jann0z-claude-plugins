# napkin evals

The napkin DDD suite is evaluated at **two tiers**:

- Results summaries are committed — skill improvements can be validated against a durable baseline.
- Raw run output is gitignored (large and reproducible).

## Tier 1 — unit (per-skill)

Each skill is benchmarked in isolation:

- Run by **skill-creator** against `skills/<skill>/evals/evals.json` — files stay exactly where skill-creator expects them.
- Raw output goes to the gitignored `skills/<skill>-workspace/` dirs, including cross-model variants (`model-haiku/`, `model-sonnet/`, …).

`aggregate-unit.mjs` turns that gitignored output into a **committed** summary next to the
evals it describes:

```bash
cd plugins/napkin/evals
node aggregate-unit.mjs --skill ddd-brief        # one skill
node aggregate-unit.mjs --all                    # every skill with a workspace
node aggregate-unit.mjs --skill ddd-plan --primary-model claude-fable-5
```

→ writes `skills/<skill>/evals/results.{md,json}`:

- Model × pass-rate matrix (with-skill vs baseline) and per-eval breakdown.
- Real model IDs mapped via `pipeline/models.json` (fixes skill-creator's `"<model-name>"` placeholder).
- Run date included. This is the durable per-skill record.

## Tier 2 — pipeline (integration)

`pipeline/` runs the **whole** pipeline end-to-end on scenarios, across a model matrix, and
rates how **buildable** the produced `spec/` is for a downstream Claude Code + superpowers
build. See `pipeline/README.md`. Headline output: `pipeline/results/matrix.md`.

```bash
cd plugins/napkin/evals/pipeline
node run-pipeline.mjs --dry-run                   # preview cost
node run-pipeline.mjs --models opus --scenario 01 # one cell
npm test                                          # grader + regression-gate selftests
```

## The improvement loop (0-degrade)

The pipeline tier is a regression guardrail — scores are attributable to specific skill
changes. See `pipeline/README.md` for the full improvement loop and scoring details.
