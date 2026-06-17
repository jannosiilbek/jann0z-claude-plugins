# Self-correcting alignment loop — design

## Problem

The napkin pipeline-eval matrix shows Haiku breaking ~20% of greenfield/delta runs on
genuine cross-artifact-consistency defects that `check-align` already catches —
`usecases.sql` blocks labeled without a UC id (AL-14), an enum-typed column with no `Enum`
block (AL-04), a glossary term mapping to a table the model never declares (AL-01). Sonnet
and Opus rarely exhibit this. Prose hardening of the generation guidance did **not** reduce
the rate (measured: still ~3/15 after a hardening pass), because the defect is a lapse, not
a misunderstanding — the model can fix it once told, it just doesn't notice.

## Root cause in the workflow

Each ddd-* skill already runs `check-align.mjs --spec spec/` as its exit gate, but the
contract is **run + report**: ddd-align SKILL.md ("As an exit gate") says append the
one-line result and skip the judged audit unless errors appear. Nothing tells the skill to
**fix the errors and re-run**. So a skill emits a broken artifact, runs the gate, sees the
errors, reports them, and finishes anyway.

## Design — upgrade the exit gate from *run + report* to *run → self-correct → report*

1. **Protocol defined once** in `ddd-align` SKILL.md ("As an exit gate") — DRY, since
   ddd-align owns the grammar + harness and is read by every pipeline skill:
   - Run `check-align`.
   - For every finding of severity **error** whose *Fix via* routes to an artifact **you
     wrote this session**: fix it in place, then re-run.
   - Repeat until no owned-errors remain, or **3 passes** (best-effort bound — most clear in
     1 pass; the cap prevents a weak model thrashing on a genuinely hard inconsistency).
   - Findings routed to an **upstream** skill (artifact you did not write): surface them in
     the report so they route back; they do not block this skill.
   - **Warnings**: report, do not loop on them.
   - Append the final result (clean, or the residual errors after 3 passes — reported
     honestly, never hidden).

2. **Each of the 5 skills' "Gate" step** points to that protocol: from "run the harness and
   include its one-line result" → "run the **self-correcting exit gate**."

3. **erd-modeler** gets explicit emphasis: it owns `model.dbml` + `usecases.sql`, where
   every residual failure lives. Its gate names the owned checks (AL-01/02/03/04/14): a
   failed gate means fix the model/SQL and re-run, not ship-and-report.

## Why it works / 0-degrade

The defects are already detected by `check-align`; the loop only adds the fix-and-re-run
step the skill was missing. **Strong models pass the gate on the first try, so the loop is a
no-op for them** — it does work only when there are errors, which is exactly the Haiku case.
No change to oracles, grammar, or the judge, so the eval baseline's mechanical scoring is
unchanged in shape; only the generated artifacts get cleaner.

## Validation

`check-align` selftest + pipeline smoke stay green (no oracle change). Then eval **weak
first** for fast signal — `--models haiku --scenario all --repeat N` — and confirm the
alignment-break rate drops (fewer cells with `align_ok=false`). Then **gradually add Sonnet
then Opus** to confirm no degradation (their cells were already clean; expectation is flat).

## Scope / non-goals

Six files: `ddd-align` SKILL.md (the protocol) + the five pipeline skills' gate step.
Not changing `check-align.mjs`, the grammar, the judge, or the metamodel. Not adding new
checks. Iteration cap fixed at 3.
