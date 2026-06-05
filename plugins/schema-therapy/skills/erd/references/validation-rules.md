# `erd` validation-rules — closed rule catalog

Validation catalog for **artifact 04** of the `schema-therapy` pipeline. Artifact 04
is a **two-file unit emitted together** and validated as one:

- `specs/04-erd.dbml` — a DBML database model (entities/tables, columns,
  relationships, constraints, enums).
- `specs/04-transitions.md` — a markdown companion holding a transition table for
  every entity that has a lifecycle (a status enum column). DBML cannot express
  transition tables, so the lifecycle design is pinned here. The artifact name
  stays **04-erd**; both files share one fingerprint set and pass/fail together.

**Inputs:** `specs/02-glossary.md` (terms, enums, forbidden synonyms) and
`specs/03-aggregates.md` (aggregate roots, boundaries, invariants, references,
policies). 04 **references** upstream by exact string and **never restates**
definitions, invariant text, or policies (DRY). Downstream: 05 supersedes complex
entities' transition tables with statecharts (never edits 04); 06 references 04's
entities/relationships.

**Normative authorities** (per `sources/SOURCES.md` authority ruling):
- Relational model, keys, 1NF → **Codd 1970** (`sources/codd-1970-relational-model.txt`).
- 2NF/3NF → **Codd 1971/72** (cite-only), taught via **Kent 1983**
  (`sources/kent-1983-five-normal-forms.html`); when phrasings conflict the formal
  original wins, Kent is the redistributable teaching restatement.
- BCNF/4NF → Boyce–Codd 1974 / Fagin 1977 (cite-only), summarized by Kent 1983 — **advisory only**.
- Entities, relationships, cardinality, relations-as-first-class → **Chen 1976**
  (`sources/chen-1976-entity-relationship-model.txt`).
- DBML language → **`@dbml/core` 8.2.5 is the normative parser** (executable oracle),
  authoritative over the prose docs (`sources/dbml-docs/docs.md`).
- SQL runtime behaviour → **PGlite 0.5.1 / PostgreSQL 18.3** (`sources/SOURCES.md`).

## Pinned conventions (binding for every rule below)

- **Table name** = `snake_case` of the 02 Term / 03 boundary member name. Tables are
  named in the **singular** (e.g. `work_order`, not `work_orders`). Choose-and-pinned: singular.
- **Column name** = `snake_case`. Status column for an entity of aggregate `<Name>` is
  named `status` and typed by that entity's enum.
- **Enum name in DBML** = the 02 enum name verbatim, lowercased to `snake_case`
  (e.g. 02 `WorkOrderStatus` → DBML `Enum work_order_status`). Enum **values are copied
  verbatim** from 02, **in 02's order**, no transform.
- **Transition-table name** = the DBML table name of the lifecycle entity (e.g.
  `### work_order`).
- **transitions.md format**: `## Transition Tables`, then `### <TableName>` per lifecycle
  entity, each with a markdown table `From | Event (exact 01 string) | To`. `From`/`To`
  values ∈ that entity's 02 enum values. The **initial-state row** uses `From = ∅`.
  Rows sorted by `(From in 02 enum order, then To in 02 enum order)`, with the `∅` row first.
- **Fingerprints** appear in BOTH files: in `.dbml` as `// fingerprints:` comment lines,
  in `.md` as an HTML comment `<!-- fingerprints: -->` block. Both list
  `02-glossary.md@sha256:<hex>` and `03-aggregates.md@sha256:<hex>`.

## Theme index

- **A. Structure & parse** (A1–A6) — two-file artifact shape, parse, fingerprints. [6]
- **B. Relational canon** (B1–B9) — keys, normal forms, junctions, FK typing, naming. [9]
- **C. Pipeline mapping** (C1–C9) — 03 roots/members/references & 02 enums → schema; no invented entity. [9]
- **D. Transition tables** (D1–D7) — lifecycle entities, events, reachability, ordering. [7]
- **E. DRY & hygiene** (E1–E4) — no restatement, no forbidden synonyms, notes-by-name. [4]

**Pass condition: zero ❌.** Severities: ❌ blocker · ⚠️ advisory/judgment · ℹ️ info.
Rules tagged **[PLAN]** are pure pipeline-contract rules (no classical source).

---

## A. Structure & parse

### A1 — Both files of the artifact are present
- **Detect:** `specs/04-erd.dbml` exists but `specs/04-transitions.md` is missing (or vice versa).
- **Fix:** Emit both files together; 04 is one artifact spanning two files.
- **Severity:** ❌
- **Source:** [PLAN] (task structure theme).

### A2 — DBML parses under `@dbml/core` 8.2.5
- **Detect:** `04-erd.dbml` fails to parse with `@dbml/core` 8.2.5 (the normative parser).
- **Fix:** Correct the offending syntax; the parser is ground truth over the prose docs.
- **Severity:** ❌
- **Source:** SOURCES.md authority ruling (#4); `@dbml/core` 8.2.5.

### A3 — Generated Postgres DDL executes
- **Detect:** DDL exported by `@dbml/core` (postgres dialect) fails to apply on PGlite 0.5.1 / PostgreSQL 18.3.
- **Fix:** Use types and constructs PostgreSQL 18.3 accepts (e.g. valid type names; see `sources/dbml-fixtures/`).
- **Severity:** ❌
- **Source:** SOURCES.md authority ruling (#5); PGlite 0.5.1.

### A4 — Fingerprint block present and well-formed in both files
- **Detect:** `// fingerprints:` (dbml) or `<!-- fingerprints: -->` (md) block missing, or absent in one file.
- **Fix:** Add the fingerprint block to **both** files listing the two upstream inputs.
- **Severity:** ❌
- **Source:** [PLAN] (structure theme).

### A5 — Fingerprints name both inputs with sha256
- **Detect:** A fingerprint block omits `02-glossary.md@sha256:<hex>` or `03-aggregates.md@sha256:<hex>`, or the hex is malformed.
- **Fix:** List both inputs as `<file>@sha256:<64-hex>`; recompute on every regeneration.
- **Severity:** ❌
- **Source:** [PLAN] (structure theme).

### A6 — Fingerprints agree across the two files
- **Detect:** The sha256 values in `04-erd.dbml` differ from those in `04-transitions.md`.
- **Fix:** Regenerate both files from the same input snapshot so fingerprints match.
- **Severity:** ❌
- **Source:** [PLAN] (single-artifact invariant).

---

## B. Relational canon

### B1 — Every table has a primary key
- **Detect:** A `Table` declares no `pk` column and no `indexes { (...) [pk] }` composite key.
- **Fix:** Designate the entity's identifying attribute(s) as the primary key; relations are addressed by key.
- **Severity:** ❌
- **Source:** Codd 1970 (relations, primary keys).

### B2 — First normal form: no repeating groups / multivalued columns
- **Detect:** A column holds a list/array/CSV of values, or repeated columns (`phone1`, `phone2`, …) encode a multivalued attribute.
- **Fix:** Move the repeating attribute into its own table with an FK back to the owner (one row per value).
- **Severity:** ❌
- **Source:** Codd 1970 (1NF); Kent 1983 §2.

### B3 — Second normal form: full dependency on the whole key
- **Detect:** In a table with a composite key, a non-key column depends on only part of the key.
- **Fix:** Decompose so each non-key attribute depends on the entire primary key.
- **Severity:** ❌
- **Source:** Codd 1971/72 via Kent 1983 §3.1 (2NF).

### B4 — Third normal form: no transitive dependencies
- **Detect:** A non-key column is determined by another non-key column rather than directly by the key.
- **Fix:** Extract the transitively-dependent attribute into its own table keyed by its determinant.
- **Severity:** ❌
- **Source:** Codd 1971/72 via Kent 1983 §3.2 (3NF).

### B5 — BCNF / 4NF advisory
- **Detect:** A determinant of a functional dependency is not a candidate key (BCNF), or independent multivalued facts are co-located in one table (4NF).
- **Fix:** Consider decomposing; flag the trade-off. Advisory — do not block on this alone.
- **Severity:** ⚠️
- **Source:** Boyce–Codd 1974 / Fagin 1977, summarized by Kent 1983 §4 (advisory per SOURCES.md #1).

### B6 — Many-to-many via a junction table
- **Detect:** An M:N relationship between two entities is modelled without an associative (junction) table — e.g. a multivalued FK or a `<>` left to implicit physical mapping where an explicit join entity is required.
- **Fix:** Introduce a junction table whose key combines the two FKs (relationships are first-class relations).
- **Severity:** ❌
- **Source:** Chen 1976 (relationships as relations); Codd 1970.

### B7 — FK type matches referenced PK type
- **Detect:** A foreign-key column's type differs from the type of the primary key it references.
- **Fix:** Declare the FK column with the same type as the referenced PK.
- **Severity:** ❌
- **Source:** Codd 1970 (domain compatibility for joins); DBML `Ref` semantics.

### B8 — No undocumented nullable FK
- **Detect:** An FK column is nullable (no `not null`) without a column `note:` explaining the optionality.
- **Fix:** Mark the FK `not null`, or add a note stating why the relationship is optional.
- **Severity:** ⚠️
- **Source:** Chen 1976 (cardinality/participation); DBML column settings (`docs.md`).

### B9 — Naming convention: snake_case, singular tables
- **Detect:** A table or column name is not `snake_case`, or a table name is pluralized.
- **Fix:** Rename to `snake_case`; tables singular (pinned). Derive from the 02 term / 03 member.
- **Severity:** ❌
- **Source:** [PLAN] pinned convention.

---

## C. Pipeline mapping

### C1 — Every 03 aggregate root becomes a table
- **Detect:** An aggregate listed under 03 `## Aggregates` has no corresponding table.
- **Fix:** Emit a table named `snake_case(<root member>)` for each aggregate root.
- **Severity:** ❌
- **Source:** [PLAN] (03 contract).

### C2 — Every 03 entity-kind boundary member becomes a reachable table
- **Detect:** A 03 boundary member of `Kind = entity` has no table, or its table has no FK path to its aggregate root.
- **Fix:** Emit a table for the member with an FK (direct or transitive) to the root's PK.
- **Severity:** ❌
- **Source:** [PLAN] (03 boundary contract); Chen 1976 (relationships).

### C3 — Value objects become columns or owned tables
- **Detect:** A 03 member of `Kind = value object` is modelled as an independently-keyed entity with its own identity exposed as an aggregate root.
- **Fix:** Represent it as inline columns on the owner, or as an owned table keyed by/under the owner (pinned: no standalone identity).
- **Severity:** ⚠️
- **Source:** [PLAN] (03 member-kind contract).

### C4 — Every 03 References row becomes an FK to the target root
- **Detect:** A 03 `References` row (`Target aggregate | Identity field held`) has no FK from the referencing aggregate's table(s) to the target root's PK.
- **Fix:** Add an FK column holding the named identity field, referencing the target root's PK.
- **Severity:** ❌
- **Source:** [PLAN] (03 references contract).

### C5 — Every 02 enum becomes a DBML Enum with verbatim values in order
- **Detect:** A 02 enum is missing as a DBML `Enum`, or its values differ from 02 (text, set, or order).
- **Fix:** Emit `Enum <snake_case(02 name)>` with values copied verbatim from 02, in 02's order.
- **Severity:** ❌
- **Source:** [PLAN] (02 enums contract).

### C6 — Status columns typed by their enum
- **Detect:** An entity that has a `<AggregateName>Status` enum in 02 carries its status in a free-text/`varchar` column instead of the enum type.
- **Fix:** Type the `status` column with the corresponding DBML enum.
- **Severity:** ❌
- **Source:** [PLAN] (02→04 enum mapping); Codd 1970 (domains).

### C7 — Names derive cleanly from 02/03 vocabulary (borderline-naming check)
- **Detect:** A table/column/enum name *does* trace to an upstream owner or relational structure, but its snake_case derivation is borderline — an undocumented junction/surrogate name, a name that reads as a paraphrase rather than the pinned transform of its 02 term / 03 member, or a relational helper lacking an `ℹ️` note tying it to the structure it serves. (The hard case — a name tracing to **no** upstream owner at all — is the genuinely-invented entity, owned by **C9 ❌**.)
- **Fix:** Add an `ℹ️`/note tying the name to the relational structure it serves, or rename it to the exact pinned transform of its 02 term / 03 member.
- **Severity:** ⚠️
- **Source:** [PLAN] (single-ownership: 02/03 own the vocabulary).

### C8 — Cross-aggregate transactional separation respected
- **Detect:** An FK or `delete: cascade` would force a write/cascade spanning two aggregate boundaries that 03 keeps separate (referenced only by identity, or coupled only by a 03 cross-aggregate **policy**).
- **Fix:** Hold the relationship by identity FK without a cascading multi-aggregate constraint; the eventual coupling lives in 03 policies, not a DB cascade. Judgment call — mark honestly.
- **Severity:** ⚠️
- **Source:** [PLAN] (03 boundaries + cross-aggregate policies); Chen 1976.

### C9 — No genuinely-invented entity (single-ownership doctrine)
- **Detect:** A Table whose name derives (per the pinned snake_case mapping) from no 02 Term, no 03 boundary member, no 03 aggregate root, and which is not a junction table bridging two mapped tables.
- **Fix:** Remove the invented entity or trace it to an upstream owner (add the missing upstream concept upstream — never invent in 04).
- **Severity:** ❌
- **Source:** [PLAN] (single-ownership doctrine §7).

---

## D. Transition tables

### D1 — One transition table per lifecycle entity, none extra
- **Detect:** A table with a `<AggregateName>Status`-typed column has no `### <table>` block in `04-transitions.md`, OR a transition block exists for an entity that has no status enum column.
- **Fix:** Emit exactly one transition table for each status-bearing entity; remove any orphan blocks.
- **Severity:** ❌
- **Source:** [PLAN] (structure theme: "transition table for every entity with a lifecycle").

### D2 — From/To values are enum members
- **Detect:** A `From` or `To` cell (other than the `∅` initial marker) is not one of that entity's 02 enum values.
- **Fix:** Use only the entity's enum values for `From`/`To`; `∅` is allowed only in `From` for the initial row.
- **Severity:** ❌
- **Source:** [PLAN] (transitions format); 02 enum ownership.

### D3 — Every transition Event resolves to a 01 event via 02
- **Detect:** A row's `Event` is not the exact 01 string given by the enum value's `Derived from event` column in 02.
- **Fix:** Copy the exact 01 event string from 02's enum derivation column.
- **Severity:** ❌
- **Source:** [PLAN] (02 enum derivation contract).

### D4 — Exactly one initial-state row
- **Detect:** No `From = ∅` row, or more than one, for a lifecycle entity.
- **Fix:** Provide a single `∅`-origin row naming the event that creates the entity in its first state.
- **Severity:** ❌
- **Source:** [PLAN] (initial-state convention).

### D5 — Every enum value is reachable
- **Detect:** An enum value never appears as a `To` and is not the initial state (orphan / unreachable state).
- **Fix:** Add the transition(s) that reach it, or remove the value from the 02 enum upstream (do not edit 02 here — flag it).
- **Severity:** ❌
- **Source:** Chen 1976 (entity state); [PLAN] (no orphan states).

### D6 — No transition out of nonexistent states
- **Detect:** A row's `From` value is an enum value that itself is never reached (other than `∅`).
- **Fix:** Ensure every non-`∅` `From` value also appears as a `To` somewhere (connected lifecycle).
- **Severity:** ⚠️
- **Source:** [PLAN] (connected-lifecycle hygiene).

### D7 — Deterministic ordering
- **Detect:** Rows are not sorted by `(From in 02 enum order, then To in 02 enum order)` with the `∅` row first.
- **Fix:** Sort rows by the pinned convention so regeneration is stable (diff-friendly).
- **Severity:** ℹ️
- **Source:** [PLAN] (deterministic ordering).

---

## E. DRY & hygiene

### E1 — No restated definitions / invariants / policies
- **Detect:** A DBML note or transitions.md prose restates a 02 definition, a 03 invariant rule, or a 03 policy text.
- **Fix:** Reference upstream by name (e.g. "see 03 invariant INV-3"); never copy the text.
- **Severity:** ❌
- **Source:** [PLAN] DOCTRINE / DRY (single ownership).

### E2 — No forbidden synonyms in names or notes
- **Detect:** A table/column/enum name or note uses a `Forbidden term` from 02's `## Forbidden Synonyms`.
- **Fix:** Use the canonical term from 02 instead.
- **Severity:** ❌
- **Source:** [PLAN] (02 forbidden-synonyms contract).

### E3 — Notes reference upstream by name, not by paraphrase
- **Detect:** A note paraphrases upstream content instead of pointing to it by artifact + identifier.
- **Fix:** Replace paraphrase with a by-name reference (`02 term X`, `03 aggregate Y`).
- **Severity:** ⚠️
- **Source:** [PLAN] DRY.

### E4 — Status column count matches lifecycle-entity count
- **Detect:** The number of `<…>Status`-typed columns in `04-erd.dbml` does not equal the number of `###` blocks in `04-transitions.md`.
- **Fix:** Reconcile so the two files agree exactly on which entities have lifecycles.
- **Severity:** ❌
- **Source:** [PLAN] (two-file artifact consistency; see D1).
