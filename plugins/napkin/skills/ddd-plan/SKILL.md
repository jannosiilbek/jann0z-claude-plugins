---
name: ddd-plan
description: Use when the user wants a development plan, an implementation roadmap, milestones, or a task breakdown derived from a spec — including "plan the build", "break this spec into tasks", or the final step of the napkin DDD pipeline after use cases and a data model exist. Produces spec/plan.md with milestones and T-xxx tasks, each citing the UC-xxx use cases it implements, with an acyclic dependency order. For writing the use cases themselves use ddd-usecases; for ad-hoc session planning unrelated to a spec/ directory, this skill does not apply.
---

# DDD Plan

Turn the spec into an ordered, traceable build plan: `spec/plan.md` with milestones and
`T-xxx` tasks. Every task cites the use cases it implements, dependencies form a DAG,
and task acceptance **is** the cited use cases' criteria — the plan adds ordering, never
new requirements. By this stage the use cases have been live-tested through erd-modeler,
so the plan is built on proven ground.

The artifact grammar is defined once, in
`${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/references/spec-format.md` — read its §1
(cross-cutting rules) and §6 (plan.md) before writing anything.

## Workflow

### 1. Intake

- Read `spec/usecases.md` — required. No use cases, no plan: route to `ddd-usecases`
  (or further back) first.
- Read `spec/data/model.dbml`, `spec/glossary.md`, and `spec/brief.md` (sizing
  decision) for context.
- If `spec/plan.md` exists, read it fully — **delta mode** (stage 3).

### 2. Structure the plan

- **Milestones** are dependency-driven, not thematic: foundations (schema, scaffolding)
  first, then use-case clusters grouped by the entities they share, so each milestone
  ships something testable.
- **One task implements 1–3 related use cases.** A task citing five UCs is a milestone
  in disguise; split it.
- Every task:
  - `- Implements:` the UC ids it delivers — every **active** UC must be cited by
    at least one task (the alignment gate fails the plan otherwise). If a UC shouldn't
    be built, that's a `ddd-usecases` deprecation decision, not a silent omission.
  - `- Depends on:` task ids only, forming a DAG — no cycles.
  - `- Acceptance:` points at the cited UCs' criteria. Resist writing new acceptance
    language here: a second phrasing of the same requirement is a fork that will drift.
  - `- Terms:` (optional) glossary anchors that help the implementing agent load the
    right context.

### 3. Delta mode

Apply spec-format.md §1.4, plus:

- Tasks with `- Status: done` are history — **never edit them**, not even cosmetically.
  Changed requirements get new tasks with the next free `T-` ids.
- A `delta`-sized brief means tasks only for the changed/new UCs; the existing plan
  stays as-is.
- Reordering milestones of not-yet-started work is fine; renumbering ids is not.

### 4. Gate

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/ --require usecases,plan
```

This is the pipeline's closing gate: UC coverage (AL-05), reference resolution (AL-06),
dependency acyclicity (AL-11) all become fully active here.

### 5. Report

```
## Plan report — <project name>

| Milestone | Task | Implements | Depends on | Status |
|-----------|------|------------|------------|--------|
| M1 Foundations | T-001 Schema & migrations | UC-001 | — | todo |
| M2 Lifecycle | T-002 Listing API | UC-002 | T-001 | todo |

Coverage: every active UC implemented (0 uncovered)
Dependency order: T-001 → T-002, T-003 (acyclic)
Alignment gate: ✅ ok
📄 Saved to spec/plan.md
✅ Pipeline complete — brief → domain → use cases → live-tested model → plan
```

In delta mode, add "Tasks added: …, done tasks untouched: N". The ✅ footer is the
**last line** of the report — put notes and caveats above it, never after.

If any active UC genuinely cannot be planned (contradicts the model, blocked on a
decision), do not drop it silently — list it under an explicit "Unplannable" section in
the report with the reason, and leave the gate's AL-05 error standing as the visible
reminder.
