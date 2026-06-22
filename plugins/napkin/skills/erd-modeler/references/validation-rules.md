# ERD validation rules

Run **every** rule against the generated DBML. For each rule: detect the condition, then
apply the fix. Group findings in the report under their letter.

---

## A. Relationships & Cardinality

### A1 — No direct many-to-many
**Detect:** any pair of entities related N:M — a `<>` ref, two reciprocal "many" sides,
or a conceptual N:M from the domain (e.g. students↔courses, posts↔tags, orders↔products).
**Fix:** insert a bridge/junction table named for the relationship (e.g. `enrollments`,
`order_items`, `post_tags`). Give it a composite PK of the two FKs (or a surrogate `id`
plus a unique composite), each FK `not null`. Move any attributes that belong to the
relationship itself (quantity, price, enrolled_at) onto the bridge table.
**Severity:** `❌ error`.

### A2 — Participation constraints
**Detect:** for every relationship, decide whether each end is mandatory or optional. A
child that must have a parent needs a `not null` FK. A child that may exist without a
parent needs a nullable FK. Flag any FK whose nullability contradicts the domain.
**Fix:** mark mandatory FKs `not null`; leave optional FKs nullable. State the
participation assumption in the report.
**Severity:** `⚠️ warn` (or `❌ error` when a mandatory relationship is left nullable and
would allow orphan rows).

### A3 — Fan traps
**Detect:** one entity holding **two or more 1:N relationships** such that querying
across both branches through the shared parent produces ambiguous or inflated results
(e.g. `division 1:N department` and `division 1:N employee`, then asking "which
employees are in which department" via division — the join fans out incorrectly).
**Fix:** restructure so the real relationship is direct (e.g. `department 1:N employee`),
or document that the two branches must not be joined through the shared parent.
**Severity:** `⚠️ warn`.

### A4 — Chasm traps
**Detect:** a broken or optional path across a three-entity chain (A→B→C where the B↔C
link is optional) that silently drops rows when traversed — a query that should reach C
from A returns nothing because the middle participation is optional.
**Fix:** add the missing direct relationship, or make the intermediate participation
mandatory where the domain requires the path to always resolve.
**Severity:** `⚠️ warn`.

### A5 — Self-referential & cyclic foreign keys
**Detect:** an FK from a table to itself (`employees.manager_id → employees.id`,
`categories.parent_id`, `comments.parent_id`), or a true mutual cycle between tables
(A references B and B references A). These are common (trees, org charts, threaded
comments) and conflict with the normal parents-before-children ordering.
**Fix:**
- A self-referential FK must be **nullable** so the root row can exist (a root has no
  parent). Recommend `ON DELETE SET NULL` or `RESTRICT`, and an index on the parent
  column.
- Forbid direct self-reference with `CHECK (manager_id <> id)`. (Multi-row cycles like
  A→B→A cannot be caught by a CHECK; note they need an application/trigger guard.)
- A true mutual cycle must be broken by making one side nullable (insert NULL first,
  then `UPDATE`) or by a `DEFERRABLE INITIALLY DEFERRED` constraint.
- Read hierarchies with `WITH RECURSIVE` (include a depth/cycle guard).
**Severity:** `❌ error` (nullable-root and self-reference CHECK); `⚠️ warn` (mutual cycle).

---

## B. Data Integrity & Normalization

### B1 — Primary keys (identity strategy)
**Detect:** any entity without a unique, stable, non-null surrogate identifier; one using
a volatile natural key (email, name, phone) as its PK; or a PK that does **not** match the
model's chosen identity strategy (a stray `uuid` PK in a TypeID model, a `text` PK in an
auto-increment model, mixed strategies across tables, etc.). The strategy is one decision
applied uniformly — a model must not mix forms.
**Fix:** give every entity a single-column `id [pk]` in the chosen strategy's form
(`references/metamodel.md` → "choose an identity strategy"): `text` TypeID + prefix `Note`
(the default), `uuid` with `gen_random_uuid()`, or `bigint` identity. Keep a natural key
as a `[unique, not null]` attribute when it matters. Bridge tables use a composite PK of
the two FKs (each FK typed to its strategy).
**Severity:** `❌ error`.

### B2 — Foreign keys
**Detect:** an FK placed on the **one** side instead of the **many** side of a 1:N, or an
FK whose type does not match the referenced PK. The two ends must be the same type under
the chosen strategy (`text`↔`text` for TypeID, `uuid`↔`uuid` for UUID, `bigint`↔`bigint`
for auto-increment) — flag any FK whose type differs from the PK it points at (a common
leftover from a half-migrated or mixed-strategy model).
**Fix:** move the FK to the many side; type it to match the referenced PK under the
model's identity strategy.
**Severity:** `❌ error`.

### B2a — 1:1 enforcement
**Detect:** a relationship declared 1:1 (DBML `-`) whose FK column has no `UNIQUE`
constraint. A plain FK only enforces 1:N, so the schema silently allows many children
per parent — the 1:1 is not actually enforced.
**Fix:** add `UNIQUE` to the FK column (place the FK on the optional/dependent side).
Model a mandatory-both-sides 1:1 as a single table. This is live-testable: insert two
children referencing one parent and assert `error ~ unique`.
**Severity:** `❌ error`.

### B3 — First normal form (1NF)
**Detect:** any column holding a list/array/CSV of values (`tags varchar` storing
`"a,b,c"`), or repeated columns encoding a multivalued attribute (`phone1`, `phone2`,
`phone3`).
**Fix:** move the repeating attribute into its own table with an FK back to the owner —
one row per value.
**Severity:** `❌ error`.

### B4 — Second normal form (2NF)
**Detect:** in a table with a **composite** PK, any non-key column that depends on only
*part* of the key (partial dependency). Single-column PK tables are automatically 2NF —
note this explicitly and move on.
**Fix:** decompose so each non-key attribute depends on the entire primary key; extract
the partially-dependent attribute into a table keyed by that part of the key.
**Severity:** `❌ error`.

### B5 — Third normal form (3NF)
**Detect:** any non-key column determined by *another non-key column* rather than
directly by the key (transitive dependency). Classic example: `zip` → `city` → `state`
all stored in one table whose key is `order_id`.
**Fix:** extract the transitively-dependent attribute into its own table keyed by its
determinant and reference it via FK.
**Severity:** `❌ error`.

### B6 — BCNF / 4NF advisory
**Detect:** a functional dependency whose determinant is not a candidate key (BCNF
violation), or two independent multivalued facts co-located in one table (4NF).
**Fix:** consider decomposing; state the trade-off explicitly. Non-blocking — flag and
document the judgment call.
**Severity:** `⚠️ warn`.

### B7 — Nullable FK documentation
**Detect:** an FK column that is nullable (no `not null`) without a `note:` on the
column explaining *why* the relationship is optional.
**Fix:** add a short inline note — e.g. `[note: 'null until a manager is assigned']`.
This keeps intentional optionality explicit and prevents future readers from treating
the nullable FK as an oversight.
**Severity:** `⚠️ warn`.

---

## C. Cleanliness & future-proofing

### C1 — Naming consistency
**Detect:** mixed case styles, inconsistent pluralization, or reserved words used as
identifiers.
**Fix:** `snake_case`, plural table names chosen once and applied everywhere, no reserved
words.
**Severity:** `ℹ️ info`.

### C2 — No hacks
**Detect:** CSV/JSON-in-a-column where a relationship belongs; polymorphic untyped FKs
(`owner_id` with no fixed target); boolean-soup status (`is_paid`, `is_shipped`,
`is_cancelled`) where one `Enum` belongs.
**Fix:** replace CSV columns with a related table; replace polymorphic FKs with explicit
typed relationships (or separate nullable FKs); replace boolean-soup with an `Enum`
status column.
**Carve-out:** an append-only audit/event-log table (e.g. `audit_entries`) MAY use a
`(target_type, target_id)` polymorphic reference when a `Note:` documents the choice —
audit logs span all entities by design. Without that `Note:`, C2 still fires.
**Severity:** `❌ error` for data-modeling hacks (CSV/polymorphic); `⚠️ warn` for
boolean-soup.

### C3 — Types & constraints
**Detect:** missing explicit types, absent `unique` on genuinely unique attributes,
missing sane defaults, or missing timestamps the domain implies (`created_at`).
**Fix:** add explicit types, `unique` constraints, defaults, and standard timestamps.
**Severity:** `ℹ️ info`.

### C4 — No invented entities
**Detect:** a `Table` whose name does not trace to any glossary term (when
`spec/glossary.md` is present) and is not a junction/bridge table resolving a
documented many-to-many relationship. An LLM hallucinating a plausible-but-undocumented
table (e.g. `reservations` when the glossary only defines `booking_requests`) is the
failure this rule guards against.
**Fix:** remove the invented table, or trace it to its upstream glossary term. If the
concept is genuinely missing from the glossary, stop and add it there first — do not
invent vocabulary in the model.
**Carve-out:** bridge/junction tables that exist solely to resolve an N:M relationship
between two mapped entities are allowed even without a direct glossary term, provided
they are named for the relationship (e.g. `course_enrollments` for `courses ↔ students`).
**Severity:** `❌ error` (when `spec/glossary.md` is present).

### C5 — Cross-aggregate cascade advisory
**Detect:** an `ON DELETE CASCADE` FK that crosses an aggregate boundary — i.e. the
child table belongs to a different aggregate root than the parent, as indicated by
`spec/glossary.md` aggregate-root annotations or domain knowledge.
**Fix:** replace with `ON DELETE RESTRICT` (hold the reference by identity without
cascading). The lifecycle coupling belongs in application/policy logic, not a DB
cascade. Judgment call — document the decision with a trailing comment.
**Severity:** `⚠️ warn`.

---

## D. Lifecycle & transitions

### D1 — One transition table per lifecycle entity, none extra
**Detect:** an entity with a status enum column has no `### <table_name>` transition
block in the report, OR a transition block exists for an entity with no status enum
column.
**Fix:** emit exactly one transition block per status-bearing entity; remove any orphan
blocks.
**Severity:** `❌ error`.

### D2 — Every enum value is reachable
**Detect:** a status enum value that never appears as a `To` in the transition table and
is not the initial state produced by the `∅` row (dead/orphan state).
**Fix:** add the transition(s) that lead to it, or remove the value from the enum. Do
not silently leave an unreachable state — it will never be set and clutters the schema.
**Severity:** `❌ error`.

### D3 — Connected lifecycle (no exit from unreachable states)
**Detect:** a `From` value in the transition table that itself never appears as a `To`
and is not the initial state — meaning there is a transition *out of* a state that can
never be entered.
**Fix:** add the transition that reaches that `From` state, or remove the row.
**Severity:** `⚠️ warn`.

---

## Pass condition

The model passes when the corrected DBML has **zero `❌ error` findings** across all
sections (A–D). Report any remaining `⚠️ warn` / `ℹ️ info` items — they do not block
compliance but must be documented in the validation report with an explicit judgment.
