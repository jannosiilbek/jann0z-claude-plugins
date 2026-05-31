---
name: forge
description: Use after a napkin spec is finished and the user wants to start building the app — "go from spec to code", "decide the architecture", "scaffold the project", "what stack should I use", "set up the monorepo", "start the build". Reads the completed spec/ workspace, verifies the latest best-practice stack, writes spec/architecture.md (the opinionated build blueprint — stack, monorepo layout, a data-first build sequence with checkpoints, and a continuous spec-drift protocol), then hands off to superpowers:writing-plans → subagent-driven-development with impeccable driving all UI. Blueprint + handoff only — never runs scaffolding commands.
---

# forge: spec → build blueprint → handoff

`forge` is the bridge between a finished **napkin** spec and the actual build. It owns exactly
one artifact — **`spec/architecture.md`** — the opinionated blueprint that says *what to build it
with, in what order, and how to keep the code honest to the spec*. It then hands the build itself
to `superpowers` (planning + execution) and `impeccable` (all UI/design).

**forge is blueprint + handoff only.** It writes `spec/architecture.md` and points the build loop
at it. It does NOT run `bun create`, `drizzle generate`, migrations, `git init`, or any other
command — every such step is *written into the blueprint as an instruction* and executed later by
superpowers. If you find yourself wanting to run a shell command, you are out of scope; put it in
the blueprint instead.

Single-ownership ethos (inherited from `napkin/PIPELINE.md`): `architecture.md` **cites** spec
owners (glossary, product, capability-map, rbac-matrix, nfr, features, model.dbml) and **never
restates** a fact they own. It adds exactly one new owned thing: the build architecture.

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

Announce: "Using forge to write spec/architecture.md and hand off to the build loop."

### 1. Precondition gate — is the spec actually done?
Confirm the spec workspace is complete:
- `spec/alignment-report.md` exists and is clean (collect-context passed), AND
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

### 5. Emit `spec/architecture.md`
Copy `assets/architecture-template.md` **verbatim** and fill every section. See
`assets/architecture-example.md` for a worked blueprint. The build sequence
(`references/build-order.md`) must be mapped slice-by-slice to *this* spec's capabilities/features,
in `capability-map.md`'s DAG order, and must carry the three checkpoints:
- **▸ Backend-complete checkpoint** — **all feature REST endpoints implemented**, mirrored as MCP
  tools, and **every endpoint passing e2e that validates the full business use-case flows logically**;
  `typecheck` green. This is a hard gate *before* any UI.
- **Design via impeccable** then **landing page first** (product- + persona-aware).
- **▸ STOP: show the user, validate the full stack** before building the rest of the UI.

The blueprint must also state the **end-to-end type-safety** rule (`references/stack.md`): types flow
DB → contracts → API → MCP → UI, no `any`, `typecheck` is a CI gate.

Embed the continuous drift-check protocol (`references/drift-check.md`) so the build re-checks code
against spec owners on every slice.

### 6. Hand off
Per `references/handoff.md`:
- Invoke `superpowers:writing-plans`, passing `spec/architecture.md` + `spec/features/**` as the
  spec to plan against.
- Then `superpowers:subagent-driven-development` to execute.
- The plan's design phase invokes `impeccable` (DESIGN.md + tokens from product + personas, then
  consistent UI); the landing-page-first + STOP checkpoints are honored as written in the blueprint.

forge's job ends when the blueprint is written and the handoff is invoked. It runs no commands.

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
- [ ] Precondition gate passed (alignment-report clean, features present, model.dbml present) — or stopped and pointed back.
- [ ] Research gate run; verified-current versions recorded in the Stack section.
- [ ] `spec/architecture.md` written from the template verbatim, every section filled, no `<placeholder>` left.
- [ ] Drizzle/Zod/MCP names use glossary terms verbatim; nothing planned outside product.md scope.
- [ ] Blueprint states the end-to-end type-safety rule (types DB→contracts→API→MCP→UI, no `any`, typecheck gate).
- [ ] Backend-complete checkpoint requires **all feature REST endpoints implemented** + **every endpoint passing business-flow e2e** before the landing page.
- [ ] Build sequence is in capability-map DAG order and carries the backend-complete + landing-page-first + STOP checkpoints.
- [ ] Any user override recorded explicitly with a rationale.
- [ ] Ended by invoking `superpowers:writing-plans`; ran **no** shell commands.
