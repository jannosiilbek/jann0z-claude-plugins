# Spec pipeline validation + DRY consolidation — design

Date: 2026-05-30
Branch: add-spec-plugin

## Problem

The three plugins form one pipeline — `collect-context` → `gherkin` → `erd-modeler` —
but alignment has only been checked statically (reading instructions). We need to (a) prove
the flow end-to-end on real generated artifacts, catching drift and vague outcomes that only
appear in output, and (b) remove the remaining duplication so the pipeline is super-DRY and
well-structured. Two known weak points: the `spec/` layout + single-ownership rules are
re-stated in both `collect-context` and gherkin `planning.md` (can drift), and `erd-modeler`
does not consume `spec/` at all (prose-in only), so the flow is not genuinely valid yet.

## Goals

- Validate the full flow on **real artifacts** (not just instructions): zero drift, zero
  vague text, full traceability across `spec/` ↔ `spec/features/` ↔ `model.dbml`.
- Make it **DRY**: one canonical contract, referenced by all three skills.
- **Wire erd** to consume `spec/` so the end-to-end flow is real.

## Approach

### 1. Shared contract — `plugins/spec/PIPELINE.md` (canonical, single source)

Defines once: the `spec/` layout (`glossary.md`, `product.md`, `personas.md`,
`capability-map.md`, `rbac-matrix.md`, `nfr.md`, `features/`, `data/model.dbml`); the
single-ownership table; term/enum/role conventions; and the two handoffs (gherkin consumes
`spec/`; erd consumes glossary `Maps to: ERD`, nfr tenancy, rbac, product). `collect-context`,
`gherkin`, and `erd-modeler` replace their restated layout/ownership prose with a pointer to
this file. Becomes fully internal when the three plugins are consolidated under `spec`.

### 2. Wire erd-modeler to consume spec/

Add a guarded "if `spec/` exists" intake to `erd-modeler`: derive entities from glossary
`Maps to: ERD` terms + Enumerations; add a tenant FK per the nfr tenancy invariant; model
rbac role/permission entities; model product Plan/Subscription. Standalone prose-in path
unchanged.

### 3. Validation workflow (agentic, 4 phases)

- **GENERATE** on a fresh brief (BrightDesk — shared-inbox helpdesk for small e-commerce
  shops; multi-tenant, owner/agent roles, seat-limited plans, ticket SLA): collect-context →
  real `spec/`; then gherkin → full `spec/features/` suite and erd → `model.dbml`. Scratch
  dir `/tmp/spec-pipeline-test/`.
- **VALIDATE** (parallel validators on real output): drift (term/enum/role/scope/capability
  across all 3 layers), vagueness (banned-phrase scan), DRY (any fact defined twice across
  layers), traceability (capability→folder, rbac cell→scenario, nfr invariant→`Then`,
  glossary ERD entity→table, no out-of-scope specified), structure.
- **VERIFY** — adversarially confirm each finding (real/false, severity, standalone-safe).
- **SYNTHESIZE** — ranked confirmed findings grouped by fix target (skill / PIPELINE.md / erd).

### 4. Improve + re-test loop

Apply fixes (skills + `PIPELINE.md` + erd wiring), then re-run GENERATE+VALIDATE to confirm
findings clear.

## Out of scope

- Changing the six-artifact set or the single-ownership model (validated already).
- Building a real product; generated artifacts are throwaway test fixtures.

## Verification

The re-run is the gate: a clean second pass (no confirmed drift/vague/DRY/traceability
findings) on freshly generated artifacts means the pipeline is aligned end-to-end.
