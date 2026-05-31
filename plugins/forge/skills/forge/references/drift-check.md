# Drift-check — keep the code honest to the spec, continuously

Drift is when the code stops matching the spec: a renamed entity, an enum spelled differently, a
route the rbac matrix doesn't cover, a feature built that `product.md` excluded. The blueprint must
make drift-checking **continuous** — part of every slice and a CI gate — not a one-time audit.

## The checklist (run per slice + in CI)

**Naming (verbatim from glossary)**
- [ ] Every Drizzle table/column maps to a `glossary.md` entity/attribute, spelled **verbatim**.
- [ ] Every enum/status value matches the `glossary.md` Enumerations spelling exactly
      (e.g. `canceled`, `past_due`, `Owner`, `Agent`) — no ad-hoc casing.
- [ ] Zod schema field names + MCP tool names use glossary terms.
- [ ] UI labels use glossary language.

**Coverage (nothing missing, nothing extra)**
- [ ] Every `capability-map.md` capability has its use-cases built in DAG order; no capability skipped.
- [ ] **Every feature has its REST API endpoints implemented** — no feature action without a route.
- [ ] Every `spec/features/**/*.feature` scenario has an e2e test.
- [ ] **Every API endpoint is exercised by an e2e flow that validates the full business use-case
      logically** (multi-step journey + business-outcome/post-state assertions), not a smoke check.
- [ ] Every action exists on **both** the API and MCP (action parity), backed by one domain function.

**Type safety**
- [ ] `typecheck` passes; no `any`, no unchecked casts, no `@ts-ignore` masking real errors.
- [ ] Types flow unbroken DB → contracts → API → MCP → UI; the client calls the API with full inference.
- [ ] Contract types are `z.infer`-ed from Zod schemas, not hand-redeclared; env is typed/validated.
- [ ] **Nothing** is built that `product.md` lists as out-of-scope.
- [ ] No domain entity / feature / capability exists in code that no spec file owns. If one is truly
      needed, the spec is updated **first** (napkin), then the code — never smuggled in.

**Authorization & invariants**
- [ ] Every `rbac-matrix.md` resource × action × role cell is enforced in the use-case layer (verified by tests).
- [ ] `nfr.md` invariants hold: tenant isolation (no cross-tenant read/write), auth flows, subscription
      gating (the one gating home), in-app limits/quotas, audit rows written.
- [ ] Architectural/build constraints from `nfr.md` (offline/on-prem/determinism/no-egress) respected.

**DRY & seams**
- [ ] Business logic lives only in `domain` — surfaces (API/MCP/UI) are thin.
- [ ] Externals only via `ports`; no SDK imported in domain.
- [ ] No duplicated logic across API and MCP for the same action.

## How it runs
- **Per slice:** the implementing/reviewing agent walks the relevant rows before a slice is "done".
- **In CI:** automate what's mechanizable — a script that diffs Drizzle table/enum names against
  `glossary.md`, asserts a feature↔e2e mapping exists, and greps for out-of-scope feature names. Wire
  it as the final CI step (`testing.md`).
- **On spec change:** if the spec legitimately evolves, it changes in napkin first; the drift-check
  then re-aligns the code to the new owner.

The blueprint embeds this checklist (or a link to it) and names the CI drift step so the discipline
survives past the first sprint.
