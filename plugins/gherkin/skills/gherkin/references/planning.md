# Planning a spec suite (PLAN stage)

Use when generating specs from a brief, or whenever more than one feature is in play.

## 1. Decompose into capabilities

Break the brief into **business capabilities / bounded contexts** — not technical layers,
not one-file-per-user-story. Capability folders give a coding agent a stable map and keep
specs in the problem domain.

```
features/
  identity/        # foundational
    registration.feature
    authentication.feature
  catalog/
    product.feature
  ordering/
    checkout.feature
    payment.feature
```

Anti-patterns: `features/db/`, `features/ui/` (technical layers leak solution domain);
`features/story-1234.feature` (thin-slice sprawl, no capability map).

## 2. Order foundation-first (topological)

1. **Walking skeleton** — one thinnest end-to-end vertical slice through the whole pipeline.
   Forces infra/CI/harness into existence and proves the seams. Keep its behavior trivial.
2. **Identity / auth.**
3. **Core domain entities** (account, product).
4. **Primary workflows** (order, pay) that consume the entities.
5. **Edge cases & cross-cutting** (notifications, reporting).

Rationale: a dependent capability can't be specified meaningfully until the state it
consumes exists. Specifying dependents first makes a coding agent invent contracts that
later conflict with the real foundation — forcing expensive regeneration.

## 3. Slice vertically, never horizontally

Each feature is a full-stack, independently testable behavior (INVEST). Horizontal slices
("build the DB table", "build the UI" as separate specs) integrate only at the end and
leave the suite red — fatal for an agent expected to stay green per increment.

## 4. Express dependencies explicitly

State inter-feature dependencies in the SDD header and tags
(`@prereq @identity`, `# Depends on: ../identity/authentication.feature`) — never as
implicit run-order between scenarios. Runners and agents reorder and parallelize.

## 5. SDD feature header (every feature file)

Copy `assets/feature-template.feature`. Each feature opens with:

- **Outcome** — the capability/value in one line.
- **In-scope / Out-of-scope** — closing scope stops a coding agent expanding it.
- **Prior decisions** — recorded architecture choices stop the agent re-deciding them.
- **Acceptance criteria** — what "done" means.
- Scenarios as task units; tag with requirement/capability IDs (`@REQ-1024 @capability:payment`).
