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

### B1 — Primary keys
**Detect:** any entity without a unique, stable, non-null identifier, or one using a
volatile natural key (email, name, phone) as its PK.
**Fix:** add a surrogate `id [pk]` (`int`/`bigint`/`uuid`). Keep the natural key as a
`[unique, not null]` attribute when it matters. Bridge tables use a composite PK.
**Severity:** `❌ error`.

### B2 — Foreign keys
**Detect:** an FK placed on the **one** side instead of the **many** side of a 1:N, or an
FK whose type does not match the referenced PK.
**Fix:** move the FK to the many side; make its type match the referenced PK exactly.
**Severity:** `❌ error`.

### B2a — 1:1 enforcement
**Detect:** a relationship declared 1:1 (DBML `-`) whose FK column has no `UNIQUE`
constraint. A plain FK only enforces 1:N, so the schema silently allows many children
per parent — the 1:1 is not actually enforced.
**Fix:** add `UNIQUE` to the FK column (place the FK on the optional/dependent side).
Model a mandatory-both-sides 1:1 as a single table. This is live-testable: insert two
children referencing one parent and assert `error ~ unique`.
**Severity:** `❌ error`.

### B3 — Normalization (≥ 3NF)
**Detect and fix:**
- **1NF** — no repeating groups and no multi-value columns. A `tags varchar` holding
  `"a,b,c"` or columns like `phone1, phone2, phone3` violate 1NF. Fix: split into a
  related table (often a bridge table or a child table).
- **2NF** — on a table with a composite key, no non-key attribute may depend on only
  part of the key. Fix: move the partially-dependent attribute to a table keyed by that
  part.
- **3NF** — no transitive dependency: a non-key attribute must not depend on another
  non-key attribute (e.g. `zip` determining `city`, `city` determining `state` inside an
  `addresses`-less table). Fix: extract the dependent attributes into their own entity
  and reference it.
**Severity:** `❌ error`.

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
**Severity:** `❌ error` for data-modeling hacks (CSV/polymorphic); `⚠️ warn` for
boolean-soup.

### C3 — Types & constraints
**Detect:** missing explicit types, absent `unique` on genuinely unique attributes,
missing sane defaults, or missing timestamps the domain implies (`created_at`).
**Fix:** add explicit types, `unique` constraints, defaults, and standard timestamps.
**Severity:** `ℹ️ info`.

---

## Pass condition

The model passes when the corrected DBML has **zero `❌ error` findings**. Report any
remaining `⚠️ warn` / `ℹ️ info` items but they do not block compliance.
