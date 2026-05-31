# Spec pipeline contract

One pipeline turns a raw idea into a normalized spec. Each step produces a DRY artifact the next step
consumes:

```
raw idea
  → idea-brief      → spec/brief.md           (business layer)
  → mvp-scoping      → spec/scope.md            (buildable-boundary verdict layer)
  → collect-context  → spec/*.md (6 files)      (the context spec)   ← reads brief.md always + scope.md if present
  → gherkin          → spec/features/<cap>/*.feature
  → erd-modeler      → spec/data/model.dbml
```

This file is the **single authority** for who owns each cross-tool fact and the rules for referencing
it. It holds no values of its own — the owning file always holds the actual value; every other file
**cites or references by anchor**, never restates. **If a fact appears authored in two files, the
non-owner is the bug.** There is no second contract file: the brief→scope handoff, the field anchors,
and the ownership table all live here.

## The three layers (no fact crosses a layer boundary twice)

- **`brief.md` = WHY + WHO-PAYS.** Problem, user, opportunity, current alternative, wedge, market,
  why-now, business-model/pricing-origin (new-venture briefs only), riskiest assumption, the Build
  seed as *direction*, and Non-goals as *origin*. Every claim tagged `[fact|assumption]` + provenance.
- **`scope.md` = IS-IT-BUILDABLE.** A thin verdict: tier · 3-use-case test outcome · sprawl/parity
  verdict · feasibility check · per-integration reachability verdicts · (only if 🔴) wedge proposals.
  It **references** the brief by anchor; it carries **no** pricing, **no** business-fact sentence,
  **no** screens, **no** data model, **no** `## Constraints`, **no** out-of-scope list, **no**
  `## Context (from brief)` block — each of those is owned elsewhere.
- **`product/glossary/personas/capability-map/rbac/nfr` + `features/` + `model.dbml` = the spec
  proper.** Single-owner, drift-free.

## spec/ layout

```
spec/
  brief.md            # idea-brief output — the business layer                 (idea-brief)
  scope.md            # mvp-scoping output — the buildable-boundary verdict     (mvp-scoping)
  glossary.md         # ubiquitous language + enums                            (context-glossary)
  product.md          # value prop, pricing, in/out-of-scope, success metric    (context-product)
  personas.md         # actors + jobs/roles                                     (context-personas)
  capability-map.md   # capabilities, order, deps, primary feature              (context-capability-map)
  rbac-matrix.md      # the permission matrix                                   (context-rbac)
  nfr.md              # cross-cutting invariants + subscription gating + build constraints (context-nfr)
  alignment-report.md # collect-context pass/fail report
  features/<capability>/*.feature   # gherkin specs
  data/model.dbml     # erd-modeler output
```

## Single-ownership table

Every fact has exactly ONE owner. Every other file cites / references by anchor — never restates the
sentence.

| Fact | Owner | Consumers (cite / reference, never restate) |
|------|-------|---------------------------------------------|
| Problem statement | `brief.md` `## Problem` | scope.md (the JTBD the 3-use-case test runs against — reference); product.md (problem framing — derive) |
| Target user/buyer + segment + market size/reachability | `brief.md` (`## Target user`, `## Market & segment`, `## Market size / reachability`) | scope.md sprawl-scan input (consume, don't store); personas.md derives spec actors; product.md target-segment line |
| Underlying need / opportunity | `brief.md` `## Opportunity (the need)` | product.md value proposition (derive, never copy the sentence) |
| Why-now (timing trigger) | `brief.md` `## Why now` | scope.md feasibility context (reference by anchor only) |
| Riskiest assumption (+ verification log) | `brief.md` `**Riskiest assumption:**` / `## Verification log` | scope.md feasibility pass (reference by anchor; never reproduce) |
| Business-model thesis — who pays, rough price, monetisation (**new-venture briefs only; absent for extensions**) | `brief.md` `## Business model` *(conditional)* | product.md derives concrete numeric tiers when present; else product.md originates pricing via its concrete-or-ask gate. **NEVER in scope.md.** |
| **Per-integration reachability VERDICT** (self-serve / partnership-gated / cost-gated / data-gated + routing note) | **`scope.md` `## Integrations`** | collect-context guardrail (capability-map must not spec a capability whose sole enabler is non-self-serve). The integration NAME is owned by glossary when it is a domain noun; scope cites it. |
| **Tier verdict (🟢/🟡/🔴)** | **`scope.md`** | collect-context ONLY, once, as a GATE (🔴 ⇒ sharpen the brief before authoring). **No artifact downstream of collect-context may cite the tier — it is a gate signal, not a fact.** |
| **3-use-case test outcome** (passed / caveats / failed + the 3 named lines) + sprawl-flag scan + feasibility check + (if 🔴) wedge proposals | **`scope.md`** | capability-map cites the test outcome as a **seed** (not an authoritative use-case list); the human |
| Domain terms + definitions + type + ERD-entity flag; enum/status value sets; Role definitions; forbidden synonyms; integration system names that are domain nouns | `glossary.md` | every spec file; gherkin steps; erd tables/enums; personas Roles; rbac columns/resources; scope.md cites integration names |
| Value proposition; **pricing tiers + numeric limits**; MVP **in/out-of-scope** (the build boundary); success metric | `product.md` | gherkin scope/pricing/quota scenarios; capability-map (every capability traces to in-scope); erd Plan/Subscription |
| Actors + jobs-to-be-done + goals/pains; the Role each persona holds; external/unauth actor flags | `personas.md` | gherkin `As a <role>`; capability-map personas served |
| Capability set; foundation order + dependency DAG; primary feature file per capability; walking skeleton; one-line capability outcome | `capability-map.md` | gherkin folders / `# Depends on:` / `@prereq`; erd bounded-context grouping |
| Permission matrix (resource × action × role) + conditions | `rbac-matrix.md` | gherkin authorization scenarios; erd role/permission |
| Cross-cutting invariants (tenancy/isolation, auth, subscription gating, limits/SLA, audit, retention); **architectural/build constraints (offline, on-prem, determinism, data-egress) as a labelled non-Gherkin category**; **hard constraints sharpened to assertable form** | `nfr.md` | gherkin cross-cutting `Then`s; erd tenant key/audit/residency columns |
| Behavioral assertions (scenarios) | `spec/features/` | — (terminal) |
| Settled choices between alternatives | gherkin per-feature `# Prior decisions:` header | — (terminal) |
| Schema (tables, columns, relationships, enums-as-types) | `data/model.dbml` | — (terminal) |

### Upstream seed → canonical owner (the named owner is canonical; the seed is not re-persisted)

| Upstream seed (in `brief.md`) | Canonical in-chain owner | Rule |
|---|---|---|
| `- **Key inputs / integrations:**` | `scope.md ## Integrations` (the *verdict*) + `glossary.md` (the *name*) | brief names candidates; scope validates reachability (verdict only); glossary owns any name that is a domain noun |
| `- **Hard constraints:**` | `nfr.md` (sharpened to assertable invariant or labelled build constraint) | scope.md has **no** `## Constraints`; nfr.md is the **sole sharpener** and reads brief directly |
| `## Non-goals` | `product.md` out-of-scope | scope.md has **no** out-of-scope list; product.md is the build boundary and **must carry every Non-goal** (append, never drop) |
| `- **Core capability:**` + `- **Thinnest first slice:**` | `capability-map.md` (+ gherkin for behavior) | scope.md has **no** Screens and **no** authoritative use-case list; the 3-use-case test *outcome* seeds capability-map |
| Problem / Target user / Why-now / Riskiest assumption | `brief.md` | scope.md has **no** `## Context (from brief)` — collect-context and scope read brief.md directly |

## Brief → scope contract (consume, don't re-derive)

`brief.md` is always present in the pipeline. mvp-scoping **reads it and consumes it**: it does not
re-ask, re-interrogate, or silently regenerate a different value for anything the brief settled
(problem, user, wedge, core capability, integrations, constraints, non-goals). It carries brief facts
as *input to its judgement*, **referencing them by anchor — never re-transcribing a brief sentence
into scope.md**. mvp-scoping **derives** only what it owns (table above): the tier, the 3-use-case
test outcome, the sprawl scan, the feasibility pass, and the per-integration verdicts.

## Brief field anchors (verbatim parse contract)

mvp-scoping and collect-context parse `brief.md` by these **exact** strings. idea-brief must emit them
exactly; consumers must read for exactly these. Match the leading anchor case-sensitively; tolerate
trailing content (the Build-seed tail). **Strip the trailing `[fact|assumption]` + provenance tag**
when carrying a value across (the tags are research metadata); preserve the tag only when a build-risk
provenance must survive (a riskiest-assumption reference).

**Top-matter labels (bold inline):** `**Stage:**` · `**Riskiest assumption:**`

**Section headings (`##`):** `## Problem` · `## Target user` · `## Opportunity (the need)` ·
`## Current alternative` · `## Wedge` · `## Market & segment` · `## Why now` ·
`## Business model` *(new-venture only — may be absent)* ·
`## Market size / reachability` *(new-venture only — may be absent)* ·
`## Build seed — what implementation needs to know` · `## Non-goals` ·
`## Open assumptions to verify` · `## Verification log`

**Build-seed sub-field labels (bold list items):** `- **Core capability:**` ·
`- **Key inputs / integrations:**` · `- **Hard constraints:**` · `- **Thinnest first slice:**`

**Wedge has two senses.** The brief's `## Wedge` is the *narrow first use-case* (an input, present on
every brief). A mvp-scoping *wedge proposal* is a *standalone-sellable carved cut* generated only for
🔴 ideas (an output). Same word, two layers; the brief owns the input sense.

## Cross-cutting assertions (lint/alignment enforce these)

1. **No business facts in scope.md.** No pricing, no business-model line. (mvp lint.)
2. **scope.md restates nothing.** No verbatim sentence copied from brief.md — references by anchor only.
3. **scope.md `## Integrations` are verdicts**, not bare names and not numeric operational limits.
4. **Tier is a gate signal, not a citable fact.** Nothing downstream of collect-context references it.
5. **product.md owns out-of-scope and carries every brief `## Non-goals` item** (append, never drop) —
   enforced by an alignment check.
6. **nfr.md is the sole constraint-sharpener**, reads brief directly, and owns non-Gherkin
   architectural/build constraints (offline/on-prem/determinism/no-egress) in a labelled category —
   never silently dropping a founder-vetted constraint.
7. **capability-map does not own a "use-case set."** Named jobs live in personas.md; scope's test
   outcome only seeds.
8. **No double feasibility work.** idea-brief verifies feasibility on brief-named integrations; scope
   re-checks only integrations it newly introduces.
9. **One ownership table.** This file is the only ownership/anchor authority — no second table anywhere.

## Reference rules (collect-context → gherkin → erd)

1. **Canonical feature filename.** `capability-map.md` names each capability's **primary feature file**
   (its walking-skeleton / entry behavior). gherkin MUST create exactly that file and point every
   `# Depends on:` at it — never synthesize `<cap>/<cap>.feature`. erd reads the same column for
   use-case naming. When a capability's `Depends on` is `—`, omit the `# Depends on:` line entirely and
   emit no `@prereq` (do not write `none`).
2. **Traceability tag.** `@capability:<kebab>` (one per feature, matching the capability-map row) is
   the traceability tag. `@REQ-<id>` is OPTIONAL and only for an external tracker — omit it when there
   is none. Never invent a second numbering scheme.
3. **Denial vocabulary** (owner: gherkin `authoring.md`). A permission denial asserts `forbidden`; a
   business-rule/state denial asserts `refused`; `rejected`/`blocked` are not used. A denied write is
   always followed by a state-unchanged `And`.
4. **NFR taxonomy** (owner: `nfr.md`). Each invariant is **behavioral** (tenant isolation, subscription
   gating, auth flows, audit recording, in-app limits, and data-lifecycle *events* like
   erasure-on-deletion and anonymization → MUST have a Gherkin `Then`) or **operational** — a passive
   property that cannot be a `Then` (availability SLO, data residency, infra rate limit → marked
   `(operational)`, acknowledged, not a scenario). collect-context, gherkin review Pass 0, and erd
   bucket invariants identically. Architectural/build constraints (offline/on-prem/determinism) are a
   third, labelled category — acknowledged, not a Gherkin `Then`.
5. **No restating owned facts.** Cite the owner; never re-type a value it owns (a Plan's SLA minutes,
   the tenancy mechanism) in a step or header — reference it symbolically or assert the owning invariant.
6. **Enum values verbatim.** Statuses/states use the `glossary.md` Enumerations spelling exactly,
   everywhere (e.g. `canceled`, `past_due`). A role-derived enum in the ERD uses the glossary Role
   spelling (e.g. `Owner`, `Agent`), not an ad-hoc lowercasing.
7. **No invented downstream concepts.** gherkin and erd introduce only artifacts that trace to an
   owner: a feature's behavior to its `capability-map.md` row, a domain noun to the glossary, a
   structural table to an M:N relationship or an `nfr.md` invariant (e.g. the audit table). They never
   invent a new domain entity, feature, or capability that no spec file owns. If one is genuinely
   needed (e.g. notifications), it is added to the spec first (glossary + capability-map + product) —
   never smuggled in downstream.
