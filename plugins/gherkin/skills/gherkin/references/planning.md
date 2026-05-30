# Planning a spec suite (PLAN stage)

Use when generating specs from a brief, or whenever more than one feature is in play.

## 0. The spec/ workspace

Gherkin operates inside the `spec/` workspace produced by the `spec` plugin's
`collect-context` skill. Write all specs to `spec/features/<capability>/`, and read these
`spec/` files as the authoritative single source of truth — never re-derive or re-decide
what they own:

- **`spec/glossary.md`** → the one glossary: ubiquitous language and enum values. Use its
  Terms verbatim and copy enum/state values from its Enumerations table exactly. Its
  Forbidden-synonyms column drives the vocabulary checks (Review Pass 0 and Pass 4).
- **`spec/capability-map.md`** → the `spec/features/<capability>/` folders, their order,
  dependencies, and the walking skeleton (see step 1).
- **`spec/product.md`** → the SDD header's In-scope / Out-of-scope (copy or narrow the
  MVP-scope items — never invent scope); the pricing table → trial / quota / upgrade
  scenarios.
- **`spec/personas.md`** → the `As a <role>` clause (a verbatim glossary Role) and the
  `In order to <value>` clause (from that persona's goals/pains).
- **`spec/rbac-matrix.md`** → authorization scenarios: for each capability whose Resource
  is in the matrix, write one permitted-action scenario per allowed cell and one negative
  "is forbidden when the role is `<Role>`" scenario per denied cell; the cell's condition
  (`own` / `same-location` / …) becomes a `Given`.
- **`spec/nfr.md`** → cross-cutting acceptance criteria: assert the tenant-isolation
  invariant as a `Then` in the walking skeleton and every capability that touches
  tenant-owned data; generate subscription-gating scenarios (trial-expiry, lapsed/read-only)
  from the gating section; turn each numeric limit/SLA and the auth rules into boundary
  scenarios.

## 1. Capabilities & folders

The capability set, foundation-first order, and dependencies come from
`spec/capability-map.md` (section 0). Create one `spec/features/<capability>/` folder per
row, in its order; carry each row's `Depends on` into the SDD header / `@prereq` tags; take
the walking skeleton from it. Sections 2–4 below are the principles the map already encodes
— read them as rationale, not as work to redo.

The map's `Depends on` column holds capability numbers; translate each to that capability's
`@prereq` slug and, as the `# Depends on:` path, to its walking-skeleton / primary feature
file (e.g. capability `identity-access` → `@prereq @identity-access` and
`# Depends on: ../identity-access/<primary>.feature`).

Capabilities are **business capabilities / bounded contexts** — not technical layers, not
one-file-per-user-story. The folder layout:

```
spec/features/
  identity/        # foundational
    registration.feature
    authentication.feature
  catalog/
    product.feature
  ordering/
    checkout.feature
    payment.feature
```

Anti-patterns: `spec/features/db/`, `spec/features/ui/` (technical layers leak solution
domain); `spec/features/story-1234.feature` (thin-slice sprawl, no capability map).

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

**Header sourcing (do not invent these):** take **Outcome** and
**Depends on** from the `capability-map.md` row; take **In-scope / Out-of-scope** from
`product.md` MVP scope (copy or narrow the owning items); record settled choices in
**Prior decisions**, cross-checked against `product.md` pricing and `nfr.md` so they cannot
contradict the six owning files.
