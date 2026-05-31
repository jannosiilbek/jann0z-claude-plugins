---
name: erd-modeler
description: Use when the user wants to design a data model, create an ERD, model a domain, design a database schema, or validate an existing DBML/schema for best practices. Turns a natural-language domain description into a clean, normalized DBML model, validates it against best practices, then live-tests it against an in-memory Postgres (PGlite) by generating SQL, seed data, and business-use-case queries — looping with improvements until every use-case passes perfectly.
---

# ERD Modeler

Turn a domain description into a clean, normalized **DBML** data model, **validate it
against best practices**, then **prove it works by live-testing against a real in-memory
Postgres (PGlite)** — looping with improvements until every business use-case passes.

## Workflow

Follow these stages in order. Stages 3 and 4 run on every invocation — never skip them,
even for a "simple" model.

### 1. Understand the domain

**If a `spec/` workspace exists** (the `napkin` plugin's output — read its `PIPELINE.md`),
do **structured intake**, not prose extraction:

- **`spec/glossary.md`** — every term flagged `Maps to: ERD: <Entity>` is a table; use the
  glossary's canonical names verbatim (respect Forbidden synonyms). The **Enumerations**
  table becomes DBML `Enum`s with the exact values and spelling (`canceled`, `past_due`) —
  never invent or rename an enum value.
- **`spec/nfr.md`** — the tenancy/isolation invariant means every tenant-owned table carries
  the tenant FK (e.g. `shop_id`); a global catalog like `plans` is the exception. Add a
  validation check that every non-global table has the tenant key, and set each ON DELETE
  per the data-lifecycle invariant. If nfr names audit recording, emit a tenant-owned
  `audit_entries` table so audit assertions have a surface; if it uses a
  `(target_type, target_id)` polymorphic reference, add a `Note:` documenting that — the
  C2 audit-log carve-out (see `references/validation-rules.md`) then permits it.
- **`spec/product.md`** + nfr gating — pricing tiers → a `plans` catalog (price, included
  seats/limits, SLA targets, trial); the subscription lifecycle → a `subscription_status`
  enum taken from the glossary. Carry SLA targets and limits in product.md's stated unit
  verbatim (do not convert days↔minutes); cite owned numbers in a `Note:`, do not restate
  them as scattered comments (PIPELINE.md rule 5).
- **`spec/rbac-matrix.md`** — model roles as an enum or a `roles` table (decide once) plus
  the relationship entities the matrix implies (e.g. an Agent↔Ticket assignment). A
  role-derived enum keeps the glossary Role spelling verbatim (`Owner`, `Agent`) — do NOT
  lowercase it to the usual enum convention (PIPELINE.md rule 6).
- **`spec/capability-map.md`** — lift each capability's outcome as a **business use-case**
  for stage 4 verbatim; do not re-invent use-cases from prose.

**Otherwise** (no `spec/`), extract from the user's natural-language description:
- **Entities** — the things rows are stored about.
- **Attributes** — the fields on each entity, with their types.
- **Relationships** — how entities link, and the cardinality of each end.
- **Business use-cases** — the concrete operations the system must support (e.g. "enroll
  a student in a course", "list all orders for a customer", "compute revenue per
  product"). These become the live tests in stage 4.

State your assumptions explicitly. Ask the user only when something is genuinely
ambiguous and the choice changes the model.

### 2. Generate DBML

Read `references/metamodel.md` for the concept vocabulary and DBML syntax, then emit the
model using this output template:

- Output is **DBML**. One `Table` per entity.
- Table names: `snake_case`, **plural** (e.g. `orders`, `order_items`).
- Column order inside a table: **PK → scalar attributes → FK columns → refs**. Exception:
  when a `spec/nfr.md` tenancy invariant applies, the tenant FK comes immediately after the
  PK (it scopes every row), ahead of the scalar attributes.
- Every column has an **explicit type**. Add `not null` for mandatory columns; omit it
  for optional ones.
- Primary key: prefer a surrogate `id` (`int`/`bigint`/`uuid`) marked `[pk]`. Use a
  natural key only when it is genuinely stable.
- Foreign key columns are named `<referenced_singular>_id` and typed to match the
  referenced PK. Express the link inline with `[ref: > target_table.id]`, and record the
  chosen ON DELETE policy as a trailing comment — `// ON DELETE CASCADE` /
  `SET NULL` / `RESTRICT` (DBML has no native ON DELETE syntax, so this comment is how
  the policy survives in the source-of-truth `.dbml`).
- A many-to-many relationship is **never** written directly — always resolve it to a
  bridge/junction table.
- Add an `indexes` block for FK columns and natural lookup columns.
- Use `Note:` to record intent where it helps a future reader.

### 3. Validate — best-practices audit

Read `references/validation-rules.md` and run **every** check against the generated DBML.
This step always runs and always produces a report. Apply the fix for each finding before
moving on.

### 4. Live-test — prove it works against real Postgres

Read `references/live-testing.md` and run the closed-loop test. This step always runs.
The three SQL files below are **working artifacts** — write them to a scratch dir for the
test run (e.g. `/tmp/erd-test-<n>/` or a `.erd-test/` subdir). In summary:

1. **Generate `schema.sql`** — convert the validated DBML to Postgres DDL.
2. **Generate `seed.sql`** — realistic simulation data covering every relationship and
   edge case (and reset IDENTITY sequences after seeding explicit ids).
3. **Generate `usecases.sql`** — one labeled, asserting query per business use-case,
   using the **closed assertion grammar** (`error ~ <reason>`, `rowcount=`, `rows=`,
   `value=`, `col:=`). Meet the **coverage floor**: ≥1 write and ≥1 negative test, and
   prove each FK's ON DELETE behavior.
4. **Run** the three files through the PGlite harness: `scripts/run-erd-test.mjs`.
5. **Evaluate** the JSON result against the optimality checklist (every use-case `pass`,
   no `malformed`/`broken-test`, `usecases_total` matches your use-case count).
6. **If any use-case fails or any error is reported** — a `malformed`/`broken-test`
   status means fix the *assertion*; a content failure means fix the *model*. Adjust and
   repeat from stage 3. Bounded by a max-iteration guard (default 5).
7. **Stop** when the harness exits green with the coverage floor met.

### 5. Save the model — always

**Always write the final, validated DBML to a `.dbml` file. This is the primary
deliverable and is never skipped.** Resolve the location deterministically, in order:

0. **Spec pipeline** — if a `spec/` workspace exists, write `spec/data/model.dbml` (the
   pipeline's ERD home, per `PIPELINE.md`).
1. **Explicit** — if the user gave a path or filename, use it.
2. **Existing convention in the current project** — "the project" is the directory you
   were asked to work in, or its nearest root (the closest ancestor containing
   `package.json`, `pyproject.toml`, `go.mod`, `.git`, etc.). If that project **already
   contains** a schema home, write there, using this precedence:
   `prisma/` → `supabase/` → `db/` → `database/` → `schema/` → `models/` → `docs/`.
3. **Default** — otherwise write into the project root. Do **not** create a new
   `db/`-style folder, and do **not** borrow a convention from a sibling or parent
   project.
4. Ask the user only if the location is genuinely ambiguous *and* the choice matters.

Filename is `model.dbml` (use `<domain>.dbml` only when one project holds several models).

The live-test SQL files (`schema.sql`, `seed.sql`, `usecases.sql`) are **optional** to
keep — persist them next to the `.dbml` only when the user wants runnable SQL/seed
output; otherwise they can stay in the scratch dir. The `.dbml` is the source of truth;
everything else is reproducible from it (each FK's ON DELETE policy is carried as a
trailing `//` comment, since DBML has no native syntax for it — see stage 2).

### 6. Report

Emit the report in this fixed format (outer fence shown with four backticks so the inner
DBML fence is literal):

````
## ERD validation report

| Severity | Location          | Rule                     | Fix applied                |
|----------|-------------------|--------------------------|----------------------------|
| ❌ error  | students↔courses  | No direct M:N            | Added `enrollments` bridge |
| ⚠️ warn   | orders.user_id    | Mandatory participation  | Marked `not null`          |

## Live-test report

| Use-case                       | Block / assertion        | Result | Notes                       |
|--------------------------------|--------------------------|--------|-----------------------------|
| Enroll student in course       | INSERT `rowcount=1`      | ✅ pass | FK satisfied                |
| Reject orphan enrollment       | INSERT `error ~ foreign key` | ✅ pass | rejected (23503)        |
| Revenue per product            | SELECT `value=70.00`     | ✅ pass | no fan-trap inflation       |

Coverage: ✅ write + negative test present · usecases_total matches use-case count
Iterations to convergence: N

## Corrected DBML

```dbml
... the full, compliant model in one fenced block ...
```

📄 Model saved to `<path>/model.dbml`
✅ Compliant & live-tested — all use-cases pass, N issues fixed over M iterations.
````

Severities:
- `❌ error` — integrity, normalization, direct-M:N, or **failing live-test** violations
  (must be fixed).
- `⚠️ warn` — participation, naming, or trap risks (fix or flag clearly).
- `ℹ️ info` — style suggestions.

If the loop exhausts its max iterations without full convergence, end with
`❌ Not converged after N iterations` and report exactly which use-cases still fail, the
per-iteration history, and the leading hypothesis — then ask the user the specific
question needed. Never claim success without a clean re-run.
