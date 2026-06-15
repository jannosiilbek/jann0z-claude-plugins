# Pipeline eval — end-to-end, model-matrix, build-readiness

This is the **integration tier** of the napkin eval suite. The per-skill (unit) evals live
under each skill at `skills/<skill>/evals/` and are run by skill-creator (its standard,
untouched). This suite is different: it runs the **whole DDD pipeline** end-to-end on a
scenario, then rates how **buildable** the produced `spec/` is — across a **matrix of
models** — so you can harden the skills for weaker models and validate every improvement.

## What it does

For every **executor model × scenario** cell:

1. **Runs the pipeline** stage by stage via `claude -p` (cwd = a fresh run dir, `CLAUDECODE`
   stripped so the CLI can nest, `--permission-mode bypassPermissions` so stages can write
   files *and* run the harness scripts unattended — trusted skills in a throwaway dir):
   `ddd-brief → ddd-domain → ddd-usecases → erd-modeler → ddd-plan`. Each stage names its
   skill explicitly. (One `claude -p` per stage mirrors skill-creator's "one skill per
   invocation" and keeps each stage debuggable.)
2. **Grades the produced `spec/`** with `grade.mjs`:
   - **Mechanical** (objective, reproducible): `check-align.mjs` (AL-01…AL-15) and, when the
     SQL trio is present, `run-erd-test.mjs` (PGlite live-test) → alignment, coverage %s,
     live-test pass rate, plan acyclicity, reference validity.
   - **Judged** (only what a parser can't see): `buildability-judge.md` run through `claude -p`
     scores clarity/ambiguity, non-vacuity of acceptance criteria, and task sizing — from the
     perspective of **Claude Code + superpowers receiving this spec as its sole input**.
   - Combines both into a **Build-Readiness Index (BRI, 0–100)** + band.
3. **Persists** `results/{latest.json, matrix.md, latest.md}` and appends a `history.jsonl`
   line per cell. Raw run output goes under `runs/` (gitignored).

## Run

```bash
cd plugins/napkin/evals/pipeline

node run-pipeline.mjs --dry-run                  # preview matrix size + cost, no model calls
node run-pipeline.mjs --models opus --scenario 01 # one cell (cheapest end-to-end)
node run-pipeline.mjs                             # full matrix (all models × all scenarios)
node run-pipeline.mjs --skip-run                  # re-grade existing runs/ without re-running

npm test                                          # selftest: grade.mjs refuses false-green
node grade.mjs --spec <dir> [--no-judge]          # grade any produced spec/ directly
```

Flags: `--models <all|csv of keys>` · `--scenario <all|id>` · `--judge-model <id>` ·
`--concurrency <n>` · `--dry-run` · `--skip-run`.

## The model matrix

Defined in `models.json` (edit it to add a model — no code change):

- **executors** — the models that *run* the pipeline, weakest→strongest:
  Haiku 4.5, Sonnet 4.6, Fable 5, Opus 4.8.
- **judge** — held **constant** (default Opus 4.8) across the whole matrix, so BRI is
  comparable down a column. A weak judge could otherwise flatter a weak executor.

`results/matrix.md` is the headline: executor rows × scenario columns, each cell `BRI (band)`.
A low cell is diagnosable from `results/latest.md` (per-metric scores + the judge's `top_gaps`).

## Metrics — the Build-Readiness Index

BRI is a weighted blend (weights in `grade.mjs`; mechanical metrics are objective, judged
ones are LLM-scored):

| Metric | Wt | Source | The number |
|--------|----|--------|------------|
| Clarity | 0.25 | judged | `100 − 12 × clarification_questions_needed` |
| Alignment | 0.20 | mechanical | `100 − 15·errors − 5·warnings` (check-align AL-01…AL-15) |
| Completeness | 0.20 | hybrid | mean of UC→task and UC→live-test coverage %, minus orphan/untraced-table penalty |
| Testability | 0.20 | hybrid | mean of EARS %, data-assertion %, live-test pass rate, and judged non-vacuous-AC % |
| Actionability | 0.15 | hybrid | plan acyclic + refs resolve (mechanical) blended with judged task-sizing |

Bands: **≥85 ship-ready · 70–84 buildable-with-gaps · 50–69 underspecified · <50 not-buildable.**
With `--no-judge`, clarity is dropped and the remaining weights are renormalized (mechanical-only BRI).

## Scenarios

`scenarios/*.md` — each is committed: YAML frontmatter (`id`, `title`, `sizing`, `seed`) +
a body that is the user request handed to `ddd-brief`. A `seed:` path (relative to
`scenarios/`) is copied in as the starting `spec/` for **delta** scenarios. Current set:
greenfield SaaS (`01`), greenfield marketplace (`02`), and a delta change against the golden
spec (`03`).

## Notes

- **Cost**: a full matrix is `models × scenarios × (5 stages + 1 grade)` `claude -p`
  invocations — `--dry-run` prints the exact count. Subset with `--models`/`--scenario`.
- **Alternative driver**: the staged driver (one `claude -p` per stage) is the default for
  reliability. A single orchestrated session that runs all five and follows each skill's ➡️
  pointer would test the real handoff but is less deterministic — swap in `STAGES` if wanted.
- **Optional `--build-attempt` mode** (not built): actually feed the produced `spec/` to
  Claude Code + superpowers to *build* it and measure the real outcome — the ground-truth
  version of the judge's prediction. Heavier; a future extension.
