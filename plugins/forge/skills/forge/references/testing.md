# Testing — every feature drives an e2e, on PGlite, DRY, with LLM fixtures

## Principles
- **The spec is the test plan.** Every `spec/features/**/*.feature` scenario maps to at least one
  e2e test. A feature with no e2e is an unfinished feature.
- **E2E validates complete business use-case flows, logically.** A test exercises a real journey —
  multiple endpoints/steps in sequence (e.g. create → claim → approve → confirm final state) — and
  asserts the **business outcome and post-state**, not just that each endpoint returned 200. Per-endpoint
  smoke checks are not enough.
- **Every API endpoint is covered.** No feature REST endpoint ships without an e2e flow that drives it.
  This is the bar for the backend-complete checkpoint (`build-order.md`).
- **Type safety is checked too.** `typecheck` is a first-class CI gate alongside the tests — end-to-end
  types (DB → contracts → API → MCP → UI) must compile with no `any`/`@ts-ignore` (`stack.md`).
- **Fast by default.** Unit + e2e run on **PGlite** and **mock ports** — no docker, no network, no
  external accounts. The full suite runs in CI on every PR.
- **DRY tests.** Shared step helpers, data factories, and fixtures — never copy-paste setup across
  specs. Test code is held to the same DRY/clean bar as production code.

## Layers

| Layer | Tool | Scope |
|---|---|---|
| Unit | **Vitest** | Pure use-case logic, contracts (Zod), adapters' mock behavior. Call `domain` functions directly. |
| Integration | **Vitest** + PGlite | Use-case → real Drizzle schema on PGlite + mock ports. Asserts rbac/nfr invariants (tenant isolation, gating, audit rows). |
| E2E | **Playwright** | Full app on PGlite + mock ports. One spec per `.feature` scenario; exercises UI and/or API+MCP. |

## Gherkin → e2e mapping
- Each `features/<capability>/*.feature` file → a Playwright spec (or a step-mapped runner). The
  scenario's Given/When/Then becomes setup → action → assertion.
- **Denial vocabulary** matches napkin's contract: a permission denial asserts `forbidden`; a
  business-rule/state denial asserts `refused`; a denied write is followed by a state-unchanged check.
- Reuse the **same Zod contracts and data factories** the app uses — tests and app share one source
  of shape truth.

## DRY test infrastructure
```
testing/ (or packages/testing)
  factories/   # build valid domain objects (tenant, user, <entities>) with overrides
  steps/       # reusable Given/When/Then helpers shared across feature specs
  fixtures/    # recorded external responses, incl. LLM fixtures
  harness.ts   # spin up app on PGlite + mock ports, seeded, per test/worker
```
- Factories produce **tenant-scoped** data so multi-tenancy is exercised by default.
- The harness resets PGlite per test (or per worker with transactional rollback) for isolation + speed.

## LLM fixtures (agent features)
- Back the LLM port's `mock` adapter with **recorded fixtures**: prompt-shape → deterministic
  response, using the AI SDK mock language model.
- Record once against the real model (a `record` mode that writes fixtures), then replay deterministically
  in dev + CI. Re-record only when the agent's contract changes.
- Assert on **tool calls and outcomes** (did the agent call the right use-case with the right args),
  not on free-text wording — keeps tests stable.
- Agent e2e runs with `LLM_MODE=mock`; production uses `LLM_MODE=real`.

## CI gate (per PR)
`lint → typecheck → unit → integration → e2e (PGlite) → drift-check`. All green required to merge.
The drift-check step is `drift-check.md`'s checklist, automated where possible.
