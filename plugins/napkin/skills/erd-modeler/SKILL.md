---
name: erd-modeler
description: Use when the user wants to design a data model, create an ERD, model a domain, design a database schema, build a data model from a spec/glossary, or validate an existing DBML/schema for best practices. Turns a natural-language domain description into a clean, normalized DBML model, validates it against best practices, then live-tests it against an in-memory Postgres (PGlite) by generating SQL, seed data, and business-use-case queries — looping with improvements until every use-case passes. When a spec/usecases.md exists (napkin DDD pipeline), its data assertions become the live tests.
---

# ERD Modeler

Turn a domain description into a clean, normalized **DBML** data model, **validate it
against best practices**, then **prove it works by live-testing against a real in-memory
Postgres (PGlite)** — looping with improvements until every business use-case passes.

## Workflow

Follow these stages in order. Stages 3 and 4 run on every invocation — never skip them,
even for a "simple" model.

### 1. Understand the domain

**If a `spec/glossary.md` exists**, do **structured intake** from it (not prose extraction):

- **`spec/glossary.md`** — every term flagged `Maps to: ERD: <Entity>` is a table; use the
  glossary's canonical names verbatim (respect Forbidden synonyms). The **Enumerations**
  table becomes DBML `Enum`s with the exact values and spelling (`canceled`, `past_due`) —
  never invent or rename an enum value. **Every enumeration — and every column you type as
  an enum — must have a matching `Enum <name> { … }` block in the model**: a column typed
  `booking_request_status` with no `Enum booking_request_status { … }` block fails the gate
  (AL-04).
- **`spec/usecases.md`** (when present) — the active use cases' **data assertions are the
  business use-case list** for stage 4: each `DA-n: <description> => expect: <assertion>`
  becomes one live-test block labeled `-- usecase: UC-xxx/DA-n <description>` with the
  DA's assertion as its `-- expect:`. Use-case main flows and acceptance criteria inform
  the seed-data scenarios.

**Otherwise** (no glossary), extract from the user's natural-language description:
- **Entities** — the things rows are stored about.
- **Attributes** — the fields on each entity, with their types.
- **Relationships** — how entities link, and the cardinality of each end.
- **Business use-cases** — the concrete operations the system must support (e.g. "enroll
  a student in a course", "list all orders for a customer", "compute revenue per
  product"). These become the live tests in stage 4.

State your assumptions explicitly. Ask the user only when something is genuinely
ambiguous and the choice changes the model.

**Then choose the identity strategy** — the form every table's primary key takes. State it
up front as an explicit, overridable decision, recommending the default:

> Primary keys: I'll use **TypeID** (type-prefixed `text` ids — the recommended default).
> Say the word if you'd rather use **UUID**, **auto-increment integers**, or a **custom**
> scheme.

- If the user already named a preference in their request, use it — no need to ask.
- If they haven't, proceed with **TypeID** (the recommended default) and the line above
  makes the choice visible so they can override. Don't block the workflow waiting for an
  answer.
- The chosen strategy is fixed for the whole model and flows into every later stage (PK/FK
  types, the DDL conversion, and the seed/use-case id literals). The four strategies and
  their PK/FK forms are tabulated in `references/metamodel.md` ("choose an identity
  strategy") — read it before stage 2.

### 2. Generate DBML

Read `references/metamodel.md` for the concept vocabulary and DBML syntax, then emit the
model using this output template:

- Output is **DBML**. One `Table` per entity.
- Table names: `snake_case`, **plural** (e.g. `orders`, `order_items`).
- Column order inside a table: **PK → scalar attributes → FK columns → refs**. Exception:
  when a multi-tenancy / isolation rule applies, the tenant FK comes immediately after the
  PK (it scopes every row), ahead of the scalar attributes.
- Every column has an **explicit type**. Add `not null` for mandatory columns; omit it
  for optional ones.
- Primary key: a **single-column surrogate `id [pk]`** following the identity strategy
  chosen in stage 1 (`references/metamodel.md` → "choose an identity strategy" for the
  exact PK column per strategy). Default is a **TypeID** (`text`, type-prefixed, with the
  prefix in a `Note`); UUID uses `uuid [pk, default: gen_random_uuid()]`, auto-increment
  uses `bigint [pk, increment]`. Never use a volatile natural key (email, name) as the PK;
  a natural key may exist only as an extra `[unique, not null]` attribute.
- Foreign key columns are named `<referenced_singular>_id` and **typed to match the
  referenced PK** (`text` under TypeID, `uuid` under UUID, `bigint` under auto-increment).
  Express the link inline with `[ref: > target_table.id]`, and record the
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
   edge case. Supply an **explicit, stable `id` for every row** in the strategy's literal
   form (prefixed string for TypeID, uuid literal for UUID, small integer for
   auto-increment) so assertions stay deterministic — never assert on a DB-generated id.
3. **Generate `usecases.sql`** — one labeled, asserting query per business use-case,
   using the **closed assertion grammar** (`error ~ <reason>`, `rowcount=`, `rows=`,
   `value=`, `col:<name>=`). Meet the **coverage floor**: ≥1 write and ≥1 negative test, and
   prove each FK's ON DELETE behavior.
   - **Label every block exactly `-- usecase: UC-xxx/DA-n <description>`** when a
     `spec/usecases.md` exists: `UC-xxx` is the use case's three-digit id and `DA-n` the
     data-assertion number from it, 1:1. The alignment gate (AL-14) matches this exact
     shape. **Never** invent sub-letter labels like `-- usecase: UC-001a` — `UC-001a` does
     not match `UC-001/DA-1`, so the gate reads every such use case as never live-tested.
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

1. **Explicit** — if the user gave a path or filename, use it. An explicit instruction
   always wins, even when a `spec/` workspace exists.
2. **Spec workspace** — if a `spec/` directory exists (e.g. beside a `spec/glossary.md`),
   write `spec/data/model.dbml`.
3. **Existing convention in the current project** — "the project" is the directory you
   were asked to work in, or its nearest root (the closest ancestor containing
   `package.json`, `pyproject.toml`, `go.mod`, `.git`, etc.). If that project **already
   contains** a schema home, write there, using this precedence:
   `prisma/` → `supabase/` → `db/` → `database/` → `schema/` → `models/` → `docs/`.
4. **Default** — otherwise write into the project root. Do **not** create a new
   `db/`-style folder, and do **not** borrow a convention from a sibling or parent
   project.
5. Ask the user only if the location is genuinely ambiguous *and* the choice matters.

Filename is `model.dbml` (use `<domain>.dbml` only when one project holds several models).

The live-test SQL files (`schema.sql`, `seed.sql`, `usecases.sql`) are **optional** to
keep — persist them next to the `.dbml` only when the user wants runnable SQL/seed
output; otherwise they can stay in the scratch dir. Exception: when `spec/usecases.md`
exists, **always persist the final `usecases.sql` to `spec/data/usecases.sql`** — it is
the traceability record proving every use case's data assertions were live-tested (the
ddd-align gate audits for it). The `.dbml` is the source of truth;
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
➡️ Done — the validated, live-tested model is the deliverable.
````

Severities:
- `❌ error` — integrity, normalization, direct-M:N, or **failing live-test** violations
  (must be fixed).
- `⚠️ warn` — participation, naming, or trap risks (fix or flag clearly).
- `ℹ️ info` — style suggestions.

When a `spec/` directory exists and the ddd-align skill is installed, run its harness after
saving as a **self-correcting exit gate** (ddd-align → "Self-correcting exit gate"). The
errors you own are the model/SQL checks — fix them in `model.dbml` / `usecases.sql` and
re-run until clean (≤3 passes), then append the final one-line result:

- **AL-01 / AL-02** — every glossary-mapped table exists in the model, and every model table
  traces back to a glossary term (name a bridge/relationship table's term too).
- **AL-03 / AL-04** — every enumeration named in the glossary has a matching `Enum <name>`
  block with the exact values; an enum-typed column with no `Enum` block fails here.
- **AL-14** — every active UC has at least one `-- usecase: UC-xxx/DA-n` block in
  `usecases.sql`; descriptive-only labels (no UC id) read as never-tested.

`node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/`.

If the loop exhausts its max iterations without full convergence, end with
`❌ Not converged after N iterations` and report exactly which use-cases still fail, the
per-iteration history, and the leading hypothesis — then ask the user the specific
question needed. Never claim success without a clean re-run.
