# Aggregates — Validation Rules (closed catalog)

**Artifact under validation:** `specs/03-aggregates.md` — artifact 3 of the schema-therapy
pipeline (`01 event-storming → 02 glossary → 03 aggregates → 04 erd.dbml → 05 statecharts →
06 gherkin`).

**Inputs:** `specs/01-event-storming.md` AND `specs/02-glossary.md`.
**This artifact owns:** aggregate roots, invariants, transactional boundaries, and
cross-aggregate consistency policies (what is transactional vs eventually consistent).
**Downstream:** 04 derives entities/relationships honoring these boundaries; 06 writes
scenarios against these invariants.

This is a **closed rule catalog**: it is the *sole* vocabulary for validating
`specs/03-aggregates.md`. A finding that is not one of the lettered rules below is not a
finding. **Pass condition: zero ❌ error findings.** ⚠️ and ℹ️ are advisory and do not block.

Every rule is machine-shaped: **Detect → Fix → Severity → Source**. Severities:
❌ artifact-invalidating or downstream-breaking · ⚠️ likely-wrong, needs justification ·
ℹ️ advisory polish. Sources cite the skill's `sources/SOURCES.md` index; `[PLAN]` marks pure
pipeline-contract rules (these are few and explicitly flagged — they encode the schema-therapy
upstream contract, not DDD literature).

## Theme index

| Theme | Rules | Concern |
|---|---|---|
| **S — Structure & fingerprints** | S1–S9 | Required headings, pinned sub-blocks, fingerprints, completeness of the aggregate set |
| **A — Aggregate canon** | A1–A8 | One root, global identity, small-aggregate bias, references by identity only |
| **I — Invariants** | I1–I6 | True within-boundary business rules, testable, ID'd, no cross-aggregate invariants |
| **X — Cross-aggregate policies** | X1–X7 | Transactional vs eventual, one aggregate per transaction, event→transaction mapping |
| **L — Language discipline** | L1–L6 | Names/terms/enums resolve exactly against 01/02; no forbidden synonyms |
| **D — DRY / non-duplication** | D1–D5 | No restating event tables, lifecycles, definitions, or enum values from upstream |

Counts: **S=9, A=8, I=6, X=7, L=6, D=5 → 41 rules.**

---

## Pinned per-aggregate sub-block format (canonical)

Every 01 aggregate gets one `### <AggregateName>` subsection under `## Aggregates`, containing
exactly these pinned sub-blocks, in this order:

```
### <AggregateName>

**Root:** <RootEntityName> · identity: <IdentityFieldName> (globally unique)

**Boundary contents:**
| Member | Kind | 02 Term |
|---|---|---|
| <name> | entity \| value object | <exact 02 Term or —> |

**Invariants:**
| ID | Rule (testable) | Scope |
|---|---|---|
| INV-<Agg>-1 | <true business rule phrased in 02 terms> | within-boundary |

**References (by identity only):**
| Target aggregate | Identity field held | Reason |
|---|---|---|
| <exact 01 aggregate name> | <IdFieldName> | <why> |
```

And one top-level fingerprint block plus one cross-aggregate policy section:

```
## Upstream Fingerprints
- 01-event-storming.md@sha256:<hex>
- 02-glossary.md@sha256:<hex>

## Cross-Aggregate Policies
| Policy | Source event (exact 01) | Target aggregate | Mode | Justification |
|---|---|---|---|---|
| <id> | <exact 01 event> | <exact 01 aggregate> | transactional \| eventual | <required iff transactional> |
```

`<Agg>` in an invariant ID is a short, stable token for the aggregate (linter matches
`INV-<token>-<n>`); `Mode ∈ {transactional, eventual}`.

---

## S — Structure & fingerprints

### S1 — Upstream Fingerprints block present and complete
- **Detect:** No `## Upstream Fingerprints` section, OR it does not contain BOTH a
  `01-event-storming.md@sha256:<hex>` line AND a `02-glossary.md@sha256:<hex>` line (each a
  64-hex-char digest).
- **Fix:** Add the `## Upstream Fingerprints` block pinning both input files by sha256.
- **Severity:** ❌
- **Source:** [PLAN]

### S2 — Single `## Aggregates` section
- **Detect:** Zero or more than one `## Aggregates` heading.
- **Fix:** Place all aggregate subsections under exactly one `## Aggregates` section.
- **Severity:** ❌
- **Source:** [PLAN]

### S3 — Every 01 aggregate present, none extra
- **Detect:** The set of `### <AggregateName>` subsections under `## Aggregates` is not exactly
  the set of aggregate names declared in 01 (`## Lifecycle Skeletons` `### <AggregateName>`
  headings). A missing one or an invented one both trip this.
- **Fix:** Add a subsection for each missing 01 aggregate; delete any not present in 01.
- **Severity:** ❌
- **Source:** [PLAN]; 01 OWNS aggregate names (SOURCES.md — Authority alignment)

### S4 — Heading strings match 01 exactly
- **Detect:** A `### <AggregateName>` heading is not byte-identical to the 01 aggregate name
  (casing, spacing, punctuation).
- **Fix:** Rename the heading to the exact 01 string.
- **Severity:** ❌
- **Source:** [PLAN]

### S5 — Root declaration present per aggregate
- **Detect:** An aggregate subsection has no `**Root:**` declaration naming a single root entity
  and its global identity field.
- **Fix:** Add the `**Root:** <Entity> · identity: <field> (globally unique)` line.
- **Severity:** ❌
- **Source:** Evans DDD Reference (Aggregates: "Choose one entity to be the root"); Fowler bliki

### S6 — Invariants table present per aggregate
- **Detect:** An aggregate subsection has no `**Invariants:**` table (the table may legitimately
  hold zero rows — see I6 — but the block must exist).
- **Fix:** Add the Invariants table with the `ID | Rule | Scope` columns.
- **Severity:** ❌
- **Source:** [PLAN]; ddd-crew Aggregate Design Canvas (Enforced Invariants section)

### S7 — Boundary contents list present per aggregate
- **Detect:** An aggregate subsection has no `**Boundary contents:**` table.
- **Fix:** Add the Boundary contents table (`Member | Kind | 02 Term`).
- **Severity:** ❌
- **Source:** [PLAN]; Evans DDD Reference (cluster entities and value objects, define boundary)

### S8 — References table present per aggregate
- **Detect:** An aggregate subsection that names another aggregate has no
  `**References (by identity only):**` table. (Aggregates that reference none may omit the table
  or state "none".)
- **Fix:** Add the References table listing each referenced aggregate and the identity field held.
- **Severity:** ⚠️
- **Source:** Vernon Effective Aggregate Design Part II (Reference Other Aggregates By Identity)

### S9 — `## Cross-Aggregate Policies` section present
- **Detect:** No `## Cross-Aggregate Policies` section with the pinned columns
  `Policy | Source event | Target aggregate | Mode | Justification`.
- **Fix:** Add the section; if there are genuinely no cross-aggregate effects, state "none".
- **Severity:** ❌
- **Source:** [PLAN]; Vernon Part II (Use Eventual Consistency Outside the Boundary)

---

## A — Aggregate canon

### A1 — Exactly one root per aggregate
- **Detect:** An aggregate's `**Root:**` line names zero, or more than one, root entity.
- **Fix:** Designate a single entity as the root; demote the rest to interior members.
- **Severity:** ❌
- **Source:** Evans DDD Reference (Aggregates); Fowler bliki ("one component object designated
  as its root")

### A2 — Root identity is globally unique
- **Detect:** The root's identity field is not declared globally unique, or is described as
  unique only within a parent/scope.
- **Fix:** Give the root a globally unique identity.
- **Severity:** ⚠️
- **Source:** Vernon Part II (reference by globally unique identity); Evans DDD Reference (only
  roots obtained directly)

### A3 — External references go to the root only
- **Detect:** A References row, or an invariant, points at an *interior* member of another
  aggregate (not its root) — e.g. holds the id of a line item rather than the order.
- **Fix:** Reference the other aggregate's root only; reach interior members by traversal inside
  that aggregate.
- **Severity:** ❌
- **Source:** Evans DDD Reference ("references to the root only"); Fowler bliki; Vernon Part II

### A4 — References by identity, not object containment
- **Detect:** A boundary-contents row lists another aggregate (or its root entity) as a *member*
  of this aggregate, i.e. embeds a whole other aggregate by object reference instead of holding
  its identity in the References table.
- **Fix:** Move it to the References table and hold only the target's identity field.
- **Severity:** ❌
- **Source:** Vernon Part II (Reference Other Aggregates By Identity)

### A5 — Small-aggregate bias
- **Detect:** A boundary-contents list is large (heuristic: >7 members, or contains an unbounded
  collection of entities) and no invariant in this aggregate's Invariants table actually
  constrains those members together.
- **Fix:** Split into smaller aggregates; keep only members bound by a true invariant; favor
  value objects and reference-by-identity for the rest.
- **Severity:** ⚠️
- **Source:** Vernon Part I (Rule: Design Small Aggregates); SOURCES.md (Vernon governs sizing)

### A6 — Members earn their place via an invariant
- **Detect:** A boundary-contents member is neither part of the root's own identity/attributes
  nor referenced by any invariant in this aggregate, and is an entity that could be replaced
  wholesale.
- **Fix:** Re-model as a value object, move outside the boundary (reference by identity), or
  justify inclusion with an invariant.
- **Severity:** ℹ️
- **Source:** Vernon Part I ("limit the aggregate to … a minimal number of attributes … the ones
  necessary, and no more")

### A7 — No interior member exposed as an external target
- **Detect:** Another aggregate's References table, or a policy's Target aggregate, names an
  interior member of *this* aggregate rather than this aggregate itself.
- **Fix:** Address this aggregate by its root/name; never expose interior members across the
  boundary.
- **Severity:** ❌
- **Source:** Evans DDD Reference (interior reached only by traversal); Fowler bliki

### A8 — Aggregate is a domain concept, not a collection
- **Detect:** An aggregate name denotes a generic container (e.g. "List", "Map", "Set",
  "Collection", "...Registry") with no business behavior or invariant, rather than a meaningful
  domain entity.
- **Fix:** Model the real domain concept; a bag of rows with no invariant is not an aggregate.
- **Severity:** ⚠️
- **Source:** Fowler bliki ("DDD aggregates are domain concepts … not generic collection classes")

---

## I — Invariants

### I1 — Each invariant has an ID matching `INV-<token>-<n>`
- **Detect:** An invariant row's ID does not match the pattern `INV-<token>-<n>` (token stable
  per aggregate, `n` a positive integer), or two invariants share an ID.
- **Fix:** Assign each invariant a unique `INV-<token>-<n>` ID.
- **Severity:** ⚠️
- **Source:** [PLAN] (06 references invariants by ID)

### I2 — Invariant scope is within-boundary
- **Detect:** An invariant row's Scope is anything other than `within-boundary`, OR its rule text
  constrains data living in another aggregate.
- **Fix:** If the rule spans aggregates it is not an invariant — move it to
  `## Cross-Aggregate Policies` as a consistency policy.
- **Severity:** ❌
- **Source:** Vernon Part I (Model True Invariants In Consistency Boundaries — "everything inside
  one boundary must be consistent")

### I3 — No cross-aggregate invariants
- **Detect:** An invariant references, by name, attributes of two or more distinct aggregates and
  asserts they must be transactionally consistent.
- **Fix:** Relocate to a cross-aggregate policy with mode `eventual` (or `transactional` only
  under X4's exception flag).
- **Severity:** ❌
- **Source:** Vernon Part I (consistency boundary == one aggregate); SOURCES.md (cross-aggregate
  invariants become policies)

### I4 — Invariant is a true business rule, testable
- **Detect:** An invariant restates a data type, a CRUD capability, a UI rule, or a tautology
  ("an order is an order") instead of a business constraint that could be violated and checked.
- **Fix:** Phrase a falsifiable business rule (a condition that must always hold), or delete it.
- **Severity:** ⚠️
- **Source:** Vernon Part I ("An invariant is a business rule that must always be consistent");
  ddd-crew Canvas (Enforced Invariants)

### I5 — Invariant phrased in 02 terms / enum values
- **Detect:** An invariant references a domain concept or status value that is not the exact 02
  Term or exact 02 enum value (paraphrase, synonym, or invented value).
- **Fix:** Rewrite using the exact 02 Term and exact 02 `<Aggregate>Status` enum value.
- **Severity:** ❌
- **Source:** [PLAN]; 02 OWNS term definitions and enum values (SOURCES.md — Authority alignment)

### I6 — Anaemic-aggregate flag (zero invariants)
- **Detect:** An aggregate's Invariants table has zero rows AND it handles a state-changing 01
  event (i.e. it mutates but enforces nothing).
- **Fix:** Either surface the real invariant the aggregate protects, or confirm it is a
  deliberately simple aggregate; record the rationale.
- **Severity:** ℹ️
- **Source:** ddd-crew Canvas (State Transitions guidance: "naive transitions … may indicate the
  aggregate is anaemic")

---

## X — Cross-aggregate policies

### X1 — One aggregate per transaction (default)
- **Detect:** A policy, or an invariant, implies a single transaction modifies more than one
  aggregate instance, without an X4 exception flag.
- **Fix:** Split into one transaction per aggregate; bridge them with an `eventual` policy.
- **Severity:** ❌
- **Source:** Vernon Part I ("a properly designed bounded context modifies only one aggregate
  instance per transaction"); Fowler bliki ("transactions should not cross aggregate boundaries")

### X2 — Eventual consistency is the default across boundaries
- **Detect:** A cross-aggregate policy is marked `transactional` where the use case's consistency
  is plausibly another user's or the system's job (not the acting user's).
- **Fix:** Mark it `eventual` unless the "whose job is it" test demands immediate consistency.
- **Severity:** ⚠️
- **Source:** Vernon Part II (Use Eventual Consistency Outside the Boundary); Part II ("Ask Whose
  Job It Is" tie-breaker)

### X3 — Mode is from the closed set
- **Detect:** A policy's Mode is not exactly `transactional` or `eventual`.
- **Fix:** Set Mode to one of `{transactional, eventual}`.
- **Severity:** ❌
- **Source:** [PLAN]; Vernon Part I (transactional vs eventual consistency)

### X4 — Transactional cross-aggregate policy requires a justified exception
- **Detect:** A policy with Mode `transactional` whose Target aggregate differs from the source
  event's owning aggregate, and the Justification cell is empty or generic ("for convenience",
  "simpler").
- **Fix:** Either change to `eventual`, or supply a domain-justified exception (the acting user
  owns the consistency, per the "whose job is it" test).
- **Severity:** ❌
- **Source:** Vernon Part II ("Ask Whose Job It Is"); SOURCES.md ("strong default … with Vernon's
  explicit escape hatch")

### X5 — Source event resolves to an exact 01 event
- **Detect:** A policy's Source event is not byte-identical to an event name in 01's
  `## Domain Events` table.
- **Fix:** Use the exact 01 event string.
- **Severity:** ❌
- **Source:** [PLAN]; 01 OWNS event names (SOURCES.md — Authority alignment)

### X6 — Target aggregate resolves to an exact 01 aggregate
- **Detect:** A policy's Target aggregate is not one of the 01 aggregate names (and present as a
  `### ` subsection under `## Aggregates`).
- **Fix:** Use the exact 01 aggregate name.
- **Severity:** ❌
- **Source:** [PLAN]; 01 OWNS aggregate names

### X7 — Every state-changing 01 event maps to exactly one aggregate transaction
- **Detect:** A state-changing event in 01's `## Domain Events` is owned (committed) by zero
  aggregates, or by two or more aggregates' transactions.
- **Fix:** Assign each state-changing event to exactly one owning aggregate's transaction; model
  any further effects as `eventual` cross-aggregate policies fired by that event.
- **Severity:** ❌
- **Source:** Vernon Part I (one aggregate instance per transaction); Vernon Part II (domain
  event drives downstream eventual consistency)

---

## L — Language discipline

### L1 — Every aggregate/entity name resolves against 01/02
- **Detect:** A name used as an aggregate, root, or boundary member does not appear as a 01
  aggregate name, a 01 actor/event-derived entity, or a 02 Term.
- **Fix:** Use an existing 01/02 name, or escalate upstream to add it there first (03 does not
  coin domain names).
- **Severity:** ❌
- **Source:** [PLAN]; 01/02 own the ubiquitous language (SOURCES.md — Authority alignment)

### L2 — No forbidden synonyms
- **Detect:** Any token listed in 02's `## Forbidden Synonyms` appears anywhere in 03.
- **Fix:** Replace with the canonical 02 Term it maps to.
- **Severity:** ❌
- **Source:** [PLAN]; 02 OWNS forbidden synonyms

### L3 — Boundary-member 02 Term column is exact
- **Detect:** A boundary-contents row's "02 Term" cell names a term that is not byte-identical to
  a 02 `## Terms` entry (and is not the explicit `—` for non-term structural members).
- **Fix:** Use the exact 02 Term string or `—`.
- **Severity:** ⚠️
- **Source:** [PLAN]; 02 OWNS term definitions

### L4 — Enum values referenced are exact 02 values
- **Detect:** A status/enum value referenced anywhere in 03 (typically in an invariant) is not an
  exact value from the matching 02 `### <Aggregate>Status` table.
- **Fix:** Use the exact 02 enum value.
- **Severity:** ❌
- **Source:** [PLAN]; 02 OWNS enum names and values

### L5 — No renaming across the boundary
- **Detect:** 03 introduces an alias for a 01/02 name (e.g. "we call X the Y here").
- **Fix:** Use the single canonical upstream name everywhere.
- **Severity:** ❌
- **Source:** [PLAN]; SOURCES.md (one concept, one word)

### L6 — Status references match the owning aggregate
- **Detect:** An invariant uses a `<Aggregate>Status` enum value that belongs to a *different*
  aggregate than the one the invariant lives under.
- **Fix:** Reference only this aggregate's own status enum, or convert to a cross-aggregate policy.
- **Severity:** ⚠️
- **Source:** [PLAN]; 02 enum ownership; Vernon Part I (within-boundary consistency)

---

## D — DRY / non-duplication

### D1 — No restated event table
- **Detect:** 03 contains a domain-events table (Event|Actor|Trigger|Notes shape, or a recap of
  01 events with their triggers).
- **Fix:** Reference events by exact name only (in policies / event→transaction mapping); delete
  the table.
- **Severity:** ⚠️
- **Source:** [PLAN]; 01 OWNS the event table

### D2 — No lifecycle-skeleton recap
- **Detect:** 03 reproduces 01's numbered `### <Aggregate>` lifecycle event lists.
- **Fix:** Reference the aggregate by name; let 05 (statecharts) own lifecycle ordering.
- **Severity:** ⚠️
- **Source:** [PLAN]; 01 OWNS lifecycle skeletons

### D3 — No restated term definitions
- **Detect:** 03 defines or re-explains the meaning of a 02 Term (a glossary-style definition).
- **Fix:** Reference the term by name; definitions live only in 02.
- **Severity:** ⚠️
- **Source:** [PLAN]; 02 OWNS term definitions

### D4 — No restated enum value listings
- **Detect:** 03 enumerates the full value set of a `<Aggregate>Status` (or any 02 enum) as a
  listing, rather than referencing individual values where a rule needs them.
- **Fix:** Reference only the specific enum value a rule requires; do not recap the set.
- **Severity:** ⚠️
- **Source:** [PLAN]; 02 OWNS enum value sets

### D5 — No actor/hotspot recap
- **Detect:** 03 reproduces 01's `## Actors` or `## Hotspots` tables.
- **Fix:** Remove; reference an actor by name only if a policy's justification genuinely needs it.
- **Severity:** ℹ️
- **Source:** [PLAN]; 01 OWNS actors and hotspots
