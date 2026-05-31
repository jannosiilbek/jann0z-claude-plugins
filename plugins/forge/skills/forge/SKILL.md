---
name: forge
description: Use after a napkin spec is finished and the user wants to start building — "go from spec to code", "decide the architecture", "scaffold the project", "what stack should I use", "set up the monorepo", "start the build". Reads the completed spec/ workspace, verifies the current best-practice stack, and writes two DRY artifacts — spec/architecture.md (the standing build reference) and spec/bootstrap.md (the ordered kickoff runbook) — then hands off to superpowers:writing-plans. Blueprint + handoff only; never runs scaffolding commands.
---

# forge: spec → build blueprint → handoff

`forge` is the bridge between a finished **napkin** spec and the actual build. It owns exactly
two artifacts that together form the blueprint:
- **`spec/architecture.md`** — the **standing reference**: stack, the use-case-layer spine +
  type-safety rule, monorepo layout, data/ports/auth/AI design, testing strategy, env, observability,
  deploy, and the drift-check protocol. Consulted *throughout* the build.
- **`spec/bootstrap.md`** — the **kickoff runbook**: the ordered, data-first build sequence (in
  capability-DAG order), the checkpoints, and the handoff. It cites `architecture.md` for the *how*
  and owns the *order*. Read first, matters most at the start.

It then hands the build itself to `superpowers` (planning + execution) and `impeccable` (all UI/design).

**forge is blueprint + handoff only.** It writes `spec/architecture.md` and points the build loop
at it. It does NOT run `bun create`, `drizzle generate`, migrations, `git init`, or any other
command — every such step is *written into the blueprint as an instruction* and executed later by
superpowers. If you find yourself wanting to run a shell command, you are out of scope; put it in
the blueprint instead.

Single-ownership ethos (inherited from `napkin/PIPELINE.md`): both files **cite** spec owners
(glossary, product, capability-map, rbac-matrix, nfr, features, model.dbml) and **never restate** a
fact they own; and `bootstrap.md` cites `architecture.md` for the how rather than duplicating it.
forge adds exactly two new owned things: the build architecture and the bootstrap runbook.

## Inputs (the finished spec/ workspace)

Read these by anchor; do not re-derive what they own:

| Spec artifact | What forge takes from it |
|---|---|
| `spec/glossary.md` | Entity + enum names — used **verbatim** for Drizzle tables/columns, Zod schemas, MCP tool names. |
| `spec/product.md` | In/out-of-scope boundary (build nothing outside it); pricing tiers → subscription gating; design context. |
| `spec/personas.md` | Actors/roles → UI surfaces and the landing-page audience; MCP-vs-UX action parity. |
| `spec/capability-map.md` | Foundation-first **DAG** → the order API/MCP/UI slices are built. |
| `spec/rbac-matrix.md` | Resource × action × role → authorization enforced in the use-case layer + Better Auth. |
| `spec/nfr.md` | Cross-cutting invariants (tenant isolation, auth, subscription gating, limits/SLA, audit) + build constraints → middleware/policies, env, observability. |
| `spec/features/**/*.feature` | Behavioral scenarios → every feature drives a use-case, API route, MCP tool, and e2e test. |
| `spec/data/model.dbml` | The normalized schema → the Drizzle schema. |

## Flow

Announce: "Using forge to write spec/architecture.md + spec/bootstrap.md and hand off to the build loop."

### 1. Precondition gate — is the spec actually done?
Confirm the spec workspace is complete:
- `spec/alignment-report.md` exists and its verdict line reports a pass (the format is owned by
  `napkin:collect-context`; read that line rather than re-judging alignment yourself), AND
- `spec/features/` contains at least the walking-skeleton feature(s), AND
- `spec/data/model.dbml` exists.

If any are missing, **stop** and point the user back to the right napkin skill
(`napkin:collect-context` for context/alignment, `napkin:gherkin` for features, `napkin:erd-modeler`
for the model). Do not write a blueprint against an incomplete spec.

### 2. Research gate — verify the stack is current
The canonical stack is defined in `references/stack.md`, but **versions and best practices move**.
Before pinning anything, follow `references/research.md`: verify the current (today's-date)
best-practice for each fast-moving piece (Vercel AI SDK, React, Drizzle+PGlite, Better Auth,
Pulumi/Cloud Run, shadcn) via WebSearch / context7. Record what you verified in the blueprint's
"Stack" section so the build uses confirmed-current versions, not stale ones.

### 3. Read the spec by anchor
Read the inputs above. Hold them as *input to the blueprint*, citing owners — never copy a sentence
a spec file owns into `architecture.md`.

### 4. Resolve the stack
Apply the canonical defaults from `references/stack.md`. If the user has asked to override a choice
(e.g. Next.js instead of Vite, Postgres-only, AI SDK 6), record the override **explicitly** in the
blueprint with a one-line rationale. Defaults are hard but never silent.

### 5. Emit the two artifacts

**a. `spec/architecture.md`** — copy `assets/architecture-template.md` **verbatim** and fill every
section (worked example: `assets/architecture-example.md`). It owns the standing decisions: stack
(with verified versions), the use-case-layer spine + the **end-to-end type-safety** rule
(`references/stack.md`: types flow DB → contracts → API → MCP → UI, no `any`, `typecheck` is a CI
gate), monorepo layout, data/ports/auth/AI design, testing strategy, env, observability, deploy, and
the **drift-check protocol** (`references/drift-check.md`).

**b. `spec/bootstrap.md`** — copy `assets/bootstrap-template.md` **verbatim** and fill it (worked
example: `assets/bootstrap-example.md`). It owns the ordered build sequence
(`references/build-order.md`), mapped slice-by-slice to *this* spec's capabilities/features in
`capability-map.md`'s DAG order, each step citing the relevant `architecture.md` section. It must
carry the checkpoints:
- **▸ Backend-complete checkpoint** — all feature REST endpoints implemented, mirrored as MCP tools,
  meeting the business-flow e2e bar (`references/testing.md`); `typecheck` green. A hard gate *before* any UI.
- **Design via impeccable** then **landing page first** (product- + persona-aware).
- **▸ STOP: show the user, validate the full stack** before building the rest of the UI.

Keep them DRY: `bootstrap.md` references `architecture.md` for the how; it does not restate stack or
design decisions.

### 6. Hand off
Per `references/handoff.md` — note the downstream skills only do what the plan makes explicit:
- Invoke `superpowers:writing-plans`, passing `spec/bootstrap.md` (the runbook) +
  `spec/architecture.md` (the reference) + `spec/features/**` to plan against.
- Instruct it to **transcribe** `bootstrap.md`'s steps, the impeccable design step, and the
  checkpoints into the plan as explicit tasks/gates (drift-check as a per-task review criterion), and
  to **split into two plans at the STOP boundary** — backend+landing-page first, then the rest of the
  UI — so the validation pause survives `subagent-driven-development`'s continuous execution.
- `writing-plans` saves the plan and **offers an execution choice** (recommend
  `superpowers:subagent-driven-development`); forge does not auto-chain into execution.

forge's job ends when both artifacts are written and `writing-plans` is invoked. It runs no commands.

## References
- `references/stack.md` — the hard, overridable stack + why.
- `references/research.md` — verify-latest-best-practice protocol (run at step 2).
- `references/build-order.md` — the build sequence, spec→slice map, and checkpoints.
- `references/ports-and-mocks.md` — the one external-interface abstraction (mock⇄real, PGlite⇄Postgres, LLM fixtures).
- `references/testing.md` — Vitest + Playwright, every-feature-drives-e2e, DRY, LLM fixtures.
- `references/design.md` — using impeccable; landing-page-first; UI-consistency loop.
- `references/drift-check.md` — continuous spec-conformance checklist.
- `references/handoff.md` — invoking superpowers + impeccable.

## Self-check before done
- [ ] Precondition + research gates passed (or stopped and pointed back); verified-current versions recorded in the Stack section.
- [ ] `spec/architecture.md` AND `spec/bootstrap.md` written from their templates verbatim, every section filled, no `<placeholder>` left.
- [ ] `bootstrap.md` cites `architecture.md` for the how and carries the checkpoints per `build-order.md` — it does not restate stack/design decisions (DRY).
- [ ] Glossary names used verbatim; nothing planned outside `product.md` scope; build order in capability-map DAG order.
- [ ] Any user override recorded explicitly with a rationale.
- [ ] Ended by invoking `superpowers:writing-plans` (two-plan split, checkpoints transcribed); ran **no** shell commands.
