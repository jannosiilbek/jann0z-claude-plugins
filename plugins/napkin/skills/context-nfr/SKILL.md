---
name: context-nfr
description: Use when authoring or reviewing the spec/nfr.md context artifact — the cross-cutting invariants of a SaaS app: tenancy/isolation, authentication, subscription-state gating, compliance/data retention, limits/SLAs, and audit. Enforces assertable rules with numbers, one home for subscription gating, and no role-matrix or enum-value duplication.
---

# Context: nfr.md

`nfr.md` is the **single source of truth for cross-cutting, system-wide rules** — the
ones that apply across every capability rather than to one feature. Each entry is written
as an **assertable invariant** so it becomes a reusable Gherkin `Then`. It owns the
**subscription-state gating** rule (no other file restates it). It does NOT define the
permission matrix (that is `rbac-matrix.md`), does NOT define enum values (that is
`glossary.md`), and does NOT re-list roles.

## Input

Read `spec/brief.md`. Per `../../PIPELINE.md`, `nfr.md` is the **sole sharpener and owner** of the
brief's `## Build seed — what implementation needs to know` → `- **Hard constraints:**`. Carry every
hard constraint here, sharpened to an assertable form (e.g. "EU data residency" → "all data is stored
in an EU region"; "fast" → "p95 < 2s"). A constraint that is **not** a runtime cross-cutting invariant
but an architectural/build property (offline-first, on-prem, deterministic output, no third-party data
egress) goes in the **Architectural & build constraints** section, labelled — never silently dropped
because it isn't a Gherkin `Then`. `scope.md` carries no `## Constraints` section; this is its home.

## Output

Copy `assets/nfr-template.md` verbatim: seven fixed sections, each a short list of assertable
invariants (the seventh, Architectural & build constraints, holds labelled non-Gherkin properties).
See `assets/nfr-example.md`.

## Rules

1. **Every invariant is assertable.** Phrase each so a test could pass or fail it ("a User
   never reads data belonging to another Business"), not as an aspiration ("the system is
   secure").
2. **Numbers, not adjectives.** Limits, SLAs, retention windows, grace periods, and trial
   length use concrete numbers and units. `scalable`/`fast`/`robust` are banned unless
   accompanied by a number.
3. **Tenant isolation is THE invariant.** State the tenancy model and the isolation rule
   explicitly; it is the most-reused cross-cutting `Then`.
4. **Subscription gating lives here, once.** State which `Subscription status` values
   permit write actions, using the values verbatim from `glossary.md`. `rbac-matrix.md`
   defers to this.
5. **Reference, don't redefine.** Use glossary terms and enum values verbatim; do not
   restate enum value sets or the permission matrix.
6. **No invention.** If a required number is undecided, write `OPEN: <question>` — never
   invent a value, never hedge with vague words. The orchestrator surfaces every `OPEN:`.
7. **Tag the taxonomy (PIPELINE.md rule 4).** Most invariants are *behavioral* (tenant
   isolation, subscription gating, auth flows, audit recording, in-app limits, and
   data-lifecycle *events* like erasure-on-deletion and anonymization) and become Gherkin
   `Then`s downstream. Mark a *passive* invariant that cannot be a Gherkin `Then`
   (availability SLO, data residency, infra rate limit) with a trailing `(operational)`,
   so gherkin's Pass 0 does not count it as uncovered behavior. A deletion/erasure *event*
   is behavioral — do not mark it operational.
8. **Sole constraint-sharpener.** Every brief `Build seed · Hard constraints` item is homed
   here — sharpened to an assertable invariant in its matching section, or, when it is an
   architectural/build property rather than a runtime rule, in **Architectural & build
   constraints** with a trailing `(constraint)`. Never drop a founder-vetted constraint just
   because it isn't a Gherkin `Then`. No other file (and not `scope.md`) sharpens or restates
   these.

## Downstream-purpose map

- **Tenancy & isolation** → the cross-cutting `Then` asserted across every capability;
  the tenant-scoping (foreign key on every table) in the ERD.
- **Subscription gating** → trial-expiry and lapsed-subscription read-only scenarios.
- **Auth model** → login, session, and reset scenarios.
- **Compliance/data + retention** → data-deletion/anonymization scenarios; retention and
  audit columns in the ERD.
- **Limits & SLA** → rate-limit and boundary scenarios.
- **Audit** → audit-log entity in the ERD.
- **Architectural & build constraints** → acknowledged build properties (offline/on-prem/
  determinism/no-egress); not a Gherkin `Then`, but they shape the build and the ERD.

If an invariant feeds none of these, cut it.

## Anti-vagueness gate

Banned: `etc.`, `various`, `as appropriate`, `as needed`, `best-effort`, `robust`,
`secure` (alone), `scalable`/`fast`/`performant` without a number, `should handle`,
`grace behaviour applies`, `TBD`, `TODO`. Use `OPEN: <question>` for the genuinely undecided.

## Self-check before done

- [ ] Seven sections, fixed order.
- [ ] Every behavioral invariant is a pass/fail statement; every operational/constraint line is labelled.
- [ ] Every limit / SLA / window has a number and unit (or an `OPEN:` marker).
- [ ] Subscription gating present and uses glossary status values verbatim.
- [ ] Every brief `Build seed · Hard constraints` item is homed here (sharpened, or labelled `(constraint)`).
- [ ] No permission matrix, no enum-value lists, no role definitions.
- [ ] No banned phrase; no `<placeholder>` left.
