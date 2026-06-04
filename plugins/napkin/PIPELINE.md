# Spec pipeline contract

One pipeline turns a raw idea into a normalized spec. Each step produces a DRY artifact the next step
consumes:

```
raw idea
  → idea-brief      → spec/brief.md           (business layer)
  → mvp-scoping      → spec/scope.md            (scoped feature list)
       │
       ├─ build ─→ collect-context → spec/*.md (6 files)   (the context spec)   ← reads brief.md always + scope.md if present
       │           → gherkin         → spec/features/<cap>/*.feature
       │           → erd-modeler      → spec/data/model.dbml
       │           → forge            → spec/architecture.md + spec/bootstrap.md   (build stage — separate `forge` plugin)
       │
       └─ sell ──→ marketing-positioning → spec/positioning.md   (the sell foundation)  ← reads brief.md + scope.md (+ product.md/personas.md if present)
                   → marketing-copy        → spec/copy/<channel>.md
```

The pipeline **forks after `scope.md`** into two parallel branches off the same spec:
- **build** — turn the scope into a buildable spec (context → features → schema → `forge`).
- **sell** — turn the scope into go-to-market assets (positioning → channel copy).

The two branches share one `spec/` and one ownership table; neither restates the other's facts. The
sell branch's **minimum input is `brief.md` + `scope.md`** (so it runs straight after mvp-scoping); it
is **richer when the build branch's context exists** (`product.md`, `personas.md`) but never hard-depends
on it. Once the build spec is complete (features + `data/model.dbml`), the **`forge`** plugin turns it
into a build blueprint and hands off to the build loop.

This file is the **single authority** for who owns each cross-tool fact and the rules for referencing
it. It holds no values of its own — the owning file always holds the actual value; every other file
**cites or references by anchor**, never restates. **If a fact appears authored in two files, the
non-owner is the bug.** There is no second contract file: the brief→scope handoff, the field anchors,
and the ownership table all live here.

## The three layers (no fact crosses a layer boundary twice)

- **`brief.md` = WHY + WHO-PAYS.** Problem, user, opportunity, current alternative, wedge, market,
  why-now, business-model/pricing-origin (new-venture briefs only), riskiest assumption, the Build
  seed as *direction*, and Non-goals as *origin*. Every claim tagged `[fact|assumption]` + provenance.
- **`scope.md` = WHAT-V1-DOES, IS-IT-BUILDABLE.** A curated **feature list**: one `### F<n>` block per
  feature, each with a Persona, an atomic In → Out, and a per-feature **Feasibility** verdict
  (self-serve / partnership-gated / cost-gated / data-gated / research-gated). No tier badge, no sprawl
  score, no wedge proposals — sprawl is cured by curating the list down, not by stamping a verdict.
  It **references** the brief by anchor; it carries **no** pricing, **no** business-fact sentence,
  **no** screens, **no** data model, **no** `## Constraints`, **no** out-of-scope list, **no**
  `## Context (from brief)` block — each of those is owned elsewhere.
- **`product/glossary/personas/capability-map/rbac/nfr` + `features/` + `model.dbml` = the spec
  proper.** Single-owner, drift-free.

## spec/ layout

```
spec/
  brief.md            # idea-brief output — the business layer                 (idea-brief)
  scope.md            # mvp-scoping output — the scoped feature list             (mvp-scoping)
  glossary.md         # ubiquitous language + enums                            (context-glossary)
  product.md          # value prop, pricing, in/out-of-scope, success metric    (context-product)
  personas.md         # actors + jobs/roles                                     (context-personas)
  capability-map.md   # capabilities, order, deps, primary feature              (context-capability-map)
  rbac-matrix.md      # the permission matrix                                   (context-rbac)
  nfr.md              # cross-cutting invariants + subscription gating + build constraints (context-nfr)
  alignment-report.md # collect-context pass/fail report
  features/<capability>/*.feature   # gherkin specs
  data/model.dbml     # erd-modeler output
  positioning.md      # sell foundation: messaging, differentiation, objections, voice, proof  (marketing-positioning)
  copy/<channel>.md   # rendered marketing copy, one file per channel (landing/email/ads/social/launch) (marketing-copy)
  architecture.md     # build blueprint — standing reference (forge)
  bootstrap.md        # build runbook (forge)
  DESIGN.md           # design system + tokens (impeccable, during build)
```

## Single-ownership table

Every fact has exactly ONE owner. Every other file cites / references by anchor — never restates the
sentence.

| Fact | Owner | Consumers (cite / reference, never restate) |
|------|-------|---------------------------------------------|
| Problem statement | `brief.md` `## Problem` | scope.md (the JTBD the features cover — reference); product.md (problem framing — derive) |
| Target user/buyer + segment + market size/reachability | `brief.md` (`## Target user`, `## Market & segment`, `## Market size / reachability`) | scope.md per-feature Persona + curation-signals input (consume, don't store); personas.md derives spec actors; product.md target-segment line. The buyer *identity* is brief-owned — product.md `## Target segment` (who pays vs who uses) and personas.md `Buyer role` (committee position) are both brief-derived **views**, not independent owners |
| Underlying need / opportunity | `brief.md` `## Opportunity (the need)` | product.md value proposition (derive, never copy the sentence) |
| Why-now (timing trigger) | `brief.md` `## Why now` | scope.md feasibility context (reference by anchor only) |
| Riskiest assumption (+ verification log) | `brief.md` `**Riskiest assumption:**` / `## Verification log` | scope.md feasibility pass (reference by anchor; never reproduce) |
| Business-model thesis — who pays, rough price, monetisation (**new-venture briefs only; absent for extensions**) | `brief.md` `## Business model` *(conditional)* | product.md derives concrete numeric tiers when present; else product.md originates pricing via its concrete-or-ask gate. **NEVER in scope.md.** |
| **Scoped feature list** (one `### F<n>` block per feature: verb-led name + Persona + atomic In → Out) | **`scope.md` `## Scoped features`** | capability-map cites the feature list as a **seed** (not an authoritative capability/feature set); the human curates it via mvp-scoping (add/remove/refine/split) |
| **Per-feature reachability VERDICT** (`self-serve` / `partnership-gated` / `cost-gated` / `data-gated` / `research-gated`) | **`scope.md`** each feature's `**Feasibility:**` field | collect-context guardrail (capability-map must not spec a capability whose sole enabler is a non-self-serve feature). The integration NAME is owned by glossary when it is a domain noun; scope cites it. |
| Domain terms + definitions + type + ERD-entity flag; enum/status value sets; Role definitions; forbidden synonyms; integration system names that are domain nouns | `glossary.md` | every spec file; gherkin steps; erd tables/enums; personas Roles; rbac columns/resources; scope.md cites integration names |
| Value proposition; **pricing tiers + numeric limits**; MVP **in/out-of-scope** (the build boundary); success metric | `product.md` | gherkin scope/pricing/quota scenarios; capability-map (every capability traces to in-scope); erd Plan/Subscription |
| Actors + jobs-to-be-done + goals/pains; the Role each persona holds; external/unauth actor flags; **the buying committee** (Champion / Decision-Maker / Economic-Buyer / User — non-login buyers carried as `Role: none (external)`) + **optional marketing fields** (buyer tag, buying trigger, primary channel) | `personas.md` | gherkin `As a <role>`; capability-map personas served; positioning.md (the buyer the message targets — reference, never restate the persona) |
| **Marketing positioning** — positioning statement + category; messaging pillars; differentiation vs the current alternative; objections + responses; anti-personas (who to disqualify); JTBD switching forces (push/pull/habit/anxiety); **customer language** (verbatim words to use/avoid — the "ubiquitous voice"); brand voice/tone; proof points; before→after transformation | `positioning.md` | marketing-copy (every channel reads it as the foundation; reuses voice + customer-language verbatim) |
| **Rendered marketing copy** (headlines, body, CTAs, subject lines, ad variants — per channel) | `spec/copy/<channel>.md` | — (terminal) |
| Capability set; foundation order + dependency DAG; primary feature file per capability; walking skeleton; one-line capability outcome | `capability-map.md` | gherkin folders / `# Depends on:` / `@prereq`; erd bounded-context grouping |
| Permission matrix (resource × action × role) + conditions | `rbac-matrix.md` | gherkin authorization scenarios; erd role/permission |
| Cross-cutting invariants (tenancy/isolation, auth, subscription gating, limits/SLA, audit, retention); **architectural/build constraints (offline, on-prem, determinism, data-egress) as a labelled non-Gherkin category**; **hard constraints sharpened to assertable form** | `nfr.md` | gherkin cross-cutting `Then`s; erd tenant key/audit/residency columns |
| Behavioral assertions (scenarios) | `spec/features/` | — (terminal) |
| Settled choices between alternatives | gherkin per-feature `# Prior decisions:` header | — (terminal) |
| Schema (tables, columns, relationships, enums-as-types) | `data/model.dbml` | — (terminal) |
| **Build-stage files** (`architecture.md`, `bootstrap.md`, `DESIGN.md`, root `CLAUDE.md`) | produced + owned by the downstream **`forge`** plugin — see forge for per-file ownership | consumed by `superpowers:writing-plans` (the build) |

### Upstream seed → canonical owner (the named owner is canonical; the seed is not re-persisted)

| Upstream seed (in `brief.md`) | Canonical in-chain owner | Rule |
|---|---|---|
| `- **Key inputs / integrations:**` | `scope.md` per-feature `**Feasibility:**` (the *verdict*) + `glossary.md` (the *name*) | brief names candidates; scope validates reachability per feature (verdict only); glossary owns any name that is a domain noun |
| `- **Hard constraints:**` | `nfr.md` (sharpened to assertable invariant or labelled build constraint) | scope.md has **no** `## Constraints`; nfr.md is the **sole sharpener** and reads brief directly |
| `## Non-goals` | `product.md` out-of-scope | scope.md has **no** out-of-scope list; product.md is the build boundary and **must carry every Non-goal** (append, never drop) |
| `- **Core capability:**` + `- **Thinnest first slice:**` | `capability-map.md` (+ gherkin for behavior) | scope.md has **no** Screens and **no** authoritative capability set; the *scoped feature list* seeds capability-map |
| Problem / Target user / Why-now / Riskiest assumption | `brief.md` | scope.md has **no** `## Context (from brief)` — collect-context and scope read brief.md directly |

## Brief → scope contract (consume, don't re-derive)

`brief.md` is always present in the pipeline. mvp-scoping **reads it and consumes it**: it does not
re-ask, re-interrogate, or silently regenerate a different value for anything the brief settled
(problem, user, wedge, core capability, integrations, constraints, non-goals). It carries brief facts
as *input to its judgement*, **referencing them by anchor — never re-transcribing a brief sentence
into scope.md**. mvp-scoping **derives** only what it owns (table above): the scoped feature list and
each feature's feasibility verdict. It runs in two phases — scope (derive the list from the brief, then
stop) and curate (add/remove/refine/split one feature at a time, surgically, in the same template).

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

**Wedge.** The brief's `## Wedge` is the *narrow first use-case* (an input, present on every brief);
the brief owns it. mvp-scoping no longer emits "wedge proposals" — when an idea is too broad to scope,
it asks the user to narrow the brief (persona / sector / core job) rather than stamping a verdict.

## Cross-cutting assertions (lint/alignment enforce these)

1. **No business facts in scope.md.** No pricing, no business-model line. (mvp lint.)
2. **scope.md restates nothing.** No verbatim sentence copied from brief.md — references by anchor only.
3. **Every scope.md feature is the strict template** — `### F<n> · name` + `**Persona:**` +
   atomic `**In → Out:**` + `**Feasibility:**` (a reachability verdict, not a bare name and not a
   numeric operational limit). Numbers are stable: never reused after removal, never renumbered.
4. **scope.md carries no tier, no sprawl score, no wedge proposals.** Sprawl is cured by curating the
   list down; a too-broad idea sends the user back to narrow the brief.
5. **product.md owns out-of-scope and carries every brief `## Non-goals` item** (append, never drop) —
   enforced by an alignment check.
6. **nfr.md is the sole constraint-sharpener**, reads brief directly, and owns non-Gherkin
   architectural/build constraints (offline/on-prem/determinism/no-egress) in a labelled category —
   never silently dropping a founder-vetted constraint.
7. **capability-map does not own a "feature set."** Named jobs live in personas.md; scope's feature
   list only seeds.
8. **No double feasibility work.** idea-brief verifies feasibility on brief-named integrations; scope
   re-checks only features/integrations it newly introduces.
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

## Sell-branch rules (marketing-positioning → marketing-copy)

The sell branch is held to the same single-ownership discipline as the build branch. It owns the
*persuasion* layer; it never re-authors a product fact.

1. **positioning.md derives, never restates.** The problem, target user, wedge, and current alternative
   are `brief.md`'s; the value proposition, pricing, in-scope features, and success metric are
   `product.md`'s; persona identity is `personas.md`'s. positioning.md references each by anchor and
   adds only what it owns (messaging, differentiation, objections, switching forces, voice, proof). It
   never copies the value-prop sentence, a price, or a persona block.
2. **Customer language is the ubiquitous voice.** positioning.md's `words to use / words to avoid` is to
   copy what `glossary.md` is to the spec: the canonical vocabulary, reused **verbatim** by every channel
   in `spec/copy/`. A word on the avoid-list never appears in rendered copy; a glossary domain noun keeps
   its glossary spelling even in marketing copy.
3. **Copy asserts only owned facts.** `spec/copy/<channel>.md` may state a price only if `product.md`
   owns it, promise a capability only if it is `product.md` in-scope / a `scope.md` feature, and cite a
   proof point only if `positioning.md` owns it. **No invented metric, claim, testimonial, price, or
   feature.** If a persuasive asset needs a fact no file owns, add it to the owner first (a proof point
   to positioning.md, a feature to scope.md) — never fabricate it in copy.
4. **Buyer ≠ user, and both live in personas.md.** The buying committee (incl. non-login buyers as
   `Role: none (external)`) is owned by `personas.md`; positioning.md targets a buyer by reference. The
   *objection* a buyer raises and its rebuttal are positioning.md's (the message), not personas.md's
   (the person) — one owner each, no overlap.
5. **No marketing fluff anywhere.** The product.md adjective ban ("seamless", "powerful", "intuitive",
   "best-in-class") holds across positioning.md and copy too — persuasion comes from specific outcomes
   and real proof, not adjectives.
