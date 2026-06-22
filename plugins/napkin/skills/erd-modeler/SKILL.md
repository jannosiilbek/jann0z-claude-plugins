---
name: erd-modeler
description: Use when the user wants to design a data model, create an ERD, model a domain, design a database schema, build a data model from a spec/glossary, or validate an existing DBML/schema for best practices. Turns a natural-language domain description into a clean, normalized DBML model, validates it against best practices, then live-tests it against an in-memory Postgres (PGlite) by generating SQL, seed data, and business-use-case queries — looping with improvements until every use-case passes. When a spec/usecases.md exists (napkin DDD pipeline), its data assertions become the live tests.
---

# ERD Modeler

Turn a domain description into a clean, normalized **DBML** data model, **validate it
against best practices**, then **prove it works by live-testing against a real in-memory
Postgres (PGlite)** — looping with improvements until every business use-case passes.

## Workflow

Follow these stages in order. Stages 3–7 run on every invocation — never skip them,
even for a "simple" model. (Stage 6, saving the model, is the primary deliverable and
is never skipped.)

### 1. Understand the domain

**If the user provides an existing DBML or SQL schema to validate**, skip stages 1 and 2.
Extract business use-cases from the user's context or ask for them, then proceed from
stage 3.

**If a `spec/glossary.md` exists**, do **structured intake** from all spec files — read
them in this order and extract:

- **`spec/glossary.md`** — every term flagged `Maps to: ERD: <Entity>` is a table; use the
  glossary's canonical names verbatim (respect Forbidden synonyms). The **Enumerations**
  table becomes DBML `Enum`s with the exact values and spelling (`canceled`, `past_due`) —
  never invent or rename an enum value. **Every enumeration — and every column you type as
  an enum — must have a matching `Enum <name> { … }` block in the model**: a column typed
  `booking_request_status` with no `Enum booking_request_status { … }` block fails the gate
  (AL-04).
- **`spec/brief.md`** (when present) — scan for per-entity attribute mentions ("a project
  has a name, description, status") and ownership/relationship rules ("one designated
  owner", "delete protection").
- **`spec/flows.md`** (when present) — scan each flow's steps for FK relationships implied
  by commands and events ("creator is designated owner" → `owner_id` FK on projects;
  "membership granted" → bridge table).
- **`spec/usecases.md`** (when present) — the active use cases' **data assertions are the
  business use-case list** for stage 5: each `DA-n: <description> => expect: <assertion>`
  becomes one live-test block labeled `-- usecase: UC-xxx/DA-n <description>` with the
  DA's assertion as its `-- expect:`. Use-case main flows and acceptance criteria inform
  the seed-data scenarios.

**After reading all spec files, produce an entity manifest** before writing any DBML:

| Entity | Table | Attributes | FK relationships |
|--------|-------|------------|-----------------|
| `<glossary term>` | `<table name>` | `<col>, <col>, ...` | `<fk_col> → <table> (<cardinality>)` |

Every attribute and FK relationship in this manifest must appear in the DBML — omitting a
manifest entry is an omission, not a design choice. State any ambiguous attribute or
relationship explicitly and resolve it before stage 2.

After producing the manifest, cross-check every entity name referenced in `spec/usecases.md`
data assertions against it. Any DA entity with no `Maps to: ERD:` tag is an
**untagged candidate** — list it and ask the user whether it should become a table or be
modeled as an attribute on an existing entity. Do not silently drop it.

If Path A yields **zero entities** (no `Maps to: ERD:` tags found), stop and report:
"spec/glossary.md exists but contains no ERD-mapped entities. Either run ddd-domain first
to add `Maps to:` annotations, or provide a natural-language description." Do not proceed
with an empty entity set.

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
- If `spec/stack.md` exists and `Identity strategy:` is not `unknown`, use that value
  directly — no prompt needed. State: "Identity strategy: <value> (from spec/stack.md)."
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
- Column order inside a table: **PK → scalar attributes → FK columns**. Exception:
  when a multi-tenancy / isolation rule applies, the tenant FK comes immediately after the
  PK (it scopes every row), ahead of the scalar attributes.
  Standalone `Ref:` declarations go **outside** Table blocks, after all Tables they reference.
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
  the policy survives in the source-of-truth `.dbml`). Choose the policy using the
  decision matrix in `references/live-testing.md §1`: owned children → CASCADE,
  optional/nullable FK → SET NULL, mandatory blocking reference → RESTRICT.
- A many-to-many relationship is **never** written directly — always resolve it to a
  bridge/junction table.
- Add an `indexes` block for FK columns and natural lookup columns.
- Use `Note:` to record intent where it helps a future reader.
- DBML block keywords (`Table`, `Enum`, `Ref`, `indexes`) are **Capitalized**; all table,
  column, and enum names are `lowercase_snake_case`. Do not lowercase keywords.

**DBML self-audit (required before moving on):** Before proceeding to stage 3, scan
every table in the model and list every FK column that is **nullable** (no `not null`).
For each one, verify it has a `[note: '...']` attribute on the column explaining why
the relationship is optional (e.g. `[note: 'null until a user is assigned']`). Add any
missing notes now — do not defer this to the validation pass.

#### Transition tables

For every entity whose `status` column is typed by an enum, generate a transition
table alongside the DBML. This makes the lifecycle explicit — which states can move
to which, and what event drives each move.

**Before generating transition tables, state explicitly:**
> "Lifecycle entities (tables with a status enum column): [list]. Generating [N]
> transition blocks."
This count is verified by the pre-report gate in stage 7 — every block must appear
in the `## Lifecycle transitions` section of the final report.

One `### <table_name>` block per lifecycle entity, in this format:

| From | Event | To |
|------|-------|----|
| ∅ | &lt;creation event&gt; | &lt;initial state&gt; |
| &lt;state&gt; | &lt;event name&gt; | &lt;next state&gt; |

Rules:
- `From = ∅` marks the creation transition — exactly one such row per entity.
- `From`/`To` values must be members of that entity's status enum.
- Every enum value must appear as a `To` at least once — OR be the initial state
  produced by the `∅` row. A value that appears only as a `From` (never as a `To` and
  not the initial state) is an unreachable state: it can be exited but never entered.
- Events are short descriptive strings (`"submit"`, `"approve"`, `"cancel"`).
- State your transition assumptions explicitly. Ask the user only when the legal
  transitions are genuinely ambiguous from the domain description.

### 3. Validate — best-practices audit

Read `references/validation-rules.md` and run **every** check against the generated DBML.
This step always runs and always produces a report. Apply the fix for each finding before
moving on. The validation report must include a row for **every rule (A1–A5, B1–B7a,
C1–C5, D1–D3)** — even if the verdict is "N/A — no instance found." Never omit a rule
from the report; a missing rule means an unreviewed table or relationship.

### 4. Professor gate — semantic normalization judgment

Before live-testing, make one explicit normalization judgment pass. Rules B4 and B5 in
stage 3 flag **candidates** for 2NF and 3NF violations; the binding verdict and fix are
rendered here. The professor gate also ensures explicit coverage for *every qualifying
table* — even when no violation exists — so normalization is never passively assumed.

For every table with a composite PK **or** ≥2 non-key columns, state both verdicts
explicitly:

- **2NF:** "Does any non-key column depend on only *part* of the composite PK?"
  If the PK is single-column, 2NF is automatically satisfied — note this and move on.
  Verdict: `no-violation | partial-dependency`.
- **3NF:** "Does any non-key column depend on *another non-key column* rather than
  directly on the key?" Name the dependency chain.
  Verdict: `no-violation | transitive-dep`.

**This gate is blocking.** Fix any `partial-dependency` or `transitive-dep` verdict
before proceeding to stage 5 — decompose the table, extracting the partial/transitive
dependent into its own entity keyed by its determinant. Do not skip this gate for
"simple" models: a single-column-PK table with ≥2 non-key attributes still needs an
explicit `no-violation` verdict. FK columns count as non-key columns for this threshold.

**Required output format:** emit a markdown table:

| Table | 2NF verdict | 2NF dependency | 3NF verdict | 3NF dependency |
|-------|-------------|----------------|-------------|----------------|
| orders | no-violation | — | no-violation | — |
| ... | | | | |

Every qualifying table must appear as a row — an absent row means an unreviewed table.
Only after this table is complete may you proceed to stage 5.

### 5. Live-test — prove it works against real Postgres

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
   prove each FK's ON DELETE behavior. (Exception: a genuinely read-only/reporting domain
   may omit the write — the harness only warns, not fails, for a missing write test.)
   - **Label every block exactly `-- usecase: UC-NNN/DA-N <description>`** when a
     `spec/usecases.md` exists: `UC-NNN` is the three-digit use case number and `DA-N`
     is the data-assertion number (e.g. `-- usecase: UC-001/DA-1 Enroll a student`).
     No other format is valid — AL-14 matches this exact shape, and any deviation causes
     the gate to treat the use case as never live-tested.
4. **Run** the three files through the PGlite harness: `scripts/run-erd-test.mjs`.
5. **Evaluate** the JSON result against the optimality checklist (every use-case `pass`,
   no `malformed`/`broken-test`, `usecases_total` matches your use-case count).
   **Mandatory:** extract and log `result.usecases_total`, `result.warnings`, and all
   `result.usecases[*].status` values from the JSON. If `usecases_total` ≠ your use-case
   count **or** `result.warnings` is non-empty, treat this as a failure — a silently
   dropped block means a use case was never tested.
6. **If any use-case fails or any error is reported** — a `malformed`/`broken-test`
   status means fix the *assertion*; for all other statuses, diagnose using the
   categories in `references/live-testing.md` §5 (schema/seed error vs. model error vs.
   ON DELETE failure). Adjust and repeat from stage 3 **including stage 4** — re-run the
   professor gate for any table you modified. Bounded by a max of 5 iterations.

   **Upstream-defect exception:** if a failure traces to an upstream artifact rather
   than the model — for example, a `spec/glossary.md` enum value that doesn't exist in
   the model because it was wrong in the glossary, or a `spec/usecases.md` DA that
   references an entity name not in the glossary — **STOP**. Name exactly what the
   upstream artifact needs to fix and do not patch the DBML to work around it. Before
   stopping, still execute stages 6 and 7 with the current model; mark the stage 7
   report `⚠️ incomplete — upstream defect` and list the required upstream fix.
7. **Stop** when the harness exits green with the coverage floor met.

   **If 5 iterations exhaust without convergence:** save the current DBML to `model.dbml`
   with a `// LIVE-TEST: FAILED after 5 iterations` header comment, then proceed to
   stage 7. Report exactly which use-cases still fail, the per-iteration history, and
   the leading hypothesis. Never claim success without a green harness run.

### 6. Save the model — always

**Always write the final, validated DBML to a `.dbml` file. This is the primary
deliverable and is never skipped.**

**Drift fingerprinting:** if upstream inputs were used (`spec/glossary.md`,
`spec/usecases.md`), embed their sha256 digests as comment lines at the top of the
generated DBML — before the first `Table` or `Enum` block:

```dbml
// upstream-fingerprint: spec/glossary.md@sha256:<64-hex>
// upstream-fingerprint: spec/usecases.md@sha256:<64-hex>
```

Compute with `shasum -a 256 <file>` for each upstream file that was actually used.
Emit one `// upstream-fingerprint:` line per file consumed — if only `spec/glossary.md`
was used, emit only that line. **Run the command; do not generate or estimate the hash** —
a fabricated hash is indistinguishable from a correct one and makes the fingerprint
useless. Re-embed on every save when upstream content changes. A future ddd-align run
that detects a digest mismatch signals the model may be stale.

Resolve the location deterministically, in order:

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

**Decisions log:** when a `spec/` directory exists, write every row from the Assumptions
table (stage 7) to `spec/decisions.md` as an ADR log following spec-format.md §10:

- If `spec/decisions.md` does not exist, create it with this exact structure:
  ```
  # Decisions — <Project name>
  <!-- ddd: decisions -->

  ## ADR-001 — <title>
  - Date: <today>
  - Status: accepted
  - Skill: erd-modeler
  - Context: <why this decision was needed>
  - Decision: <what was decided>
  - Consequences: <what this implies at runtime or in future work>
  - Supersedes: n/a

  ## Changelog
  - <today> (erd-modeler): created, N decisions recorded
  ```
- If it exists (delta run), **append** new ADR entries before `## Changelog` — never
  edit existing ones; then append one new line to `## Changelog`.
- Each row in the Assumptions table becomes one `## ADR-xxx` block. Use the next free
  `ADR-` number (scan the existing file for the highest ADR id and increment by 1).
- Every generated entry must carry all seven fields in this order:
  `Date`, `Status` (always `accepted` for new entries), `Skill` (`erd-modeler`),
  `Context`, `Decision`, `Consequences`, `Supersedes` (`n/a` unless an earlier ADR is
  being explicitly superseded).
- Minimum 1 ADR (the identity strategy choice is always recorded, even when it matches
  the default, so future delta sessions know it was an explicit decision and not an
  oversight).

### 7. Report

**Report completeness gate** — this is distinct from the live-test optimality checklist
(which you already ran in stage 5). This gate checks the *report* is complete, not the
*schema*. Complete each item explicitly before emitting the sections below.

1. **Validation table:** State here: "Emitting 22 rows — A1, A2, A3, A4, A5, B1, B2, B2a,
   B3, B4, B5, B6, B7, B7a, C1, C2, C3, C4, C5, D1, D2, D3." Do **not** emit the table
   here. The table goes inside the `## ERD validation report` section of the report below.
   Copy the pre-populated 22-row template **verbatim** — do not add rows, remove rows,
   rename rules, or merge rows. Fill in only the empty Result cells (`✅ pass` / `⚠️ warn`
   / `❌ error` / `N/A — <reason>`). Never emit a condensed or summary-only version; the
   full 22-row table IS the report. A blank Result cell = unchecked rule = gate fails.

2. **Transition block count:** count the tables in your DBML with a `status` enum column.
   State: "Lifecycle entities: [list], count = N. Emitting N transition blocks below."
   The `## Lifecycle transitions` section in the report must have exactly N `### <table_name>`
   blocks, each using the `| From | Event | To |` markdown table format — not ASCII art.

3. **Nullable FK audit:** list every nullable FK column in the DBML. For each one,
   confirm it carries a `[note: '...']` attribute on the column. State the list; do not
   just assert "done."

4. **A3 and A4 verdicts:** for every table, count inbound FK arms (other tables pointing
   to it). State the hub table(s) with arm counts. A3 requires a named `⚠️ warn` row
   whenever any hub has 2+ arms — the warn IS the required documentation that those arms
   must not be joined through the hub. A pass verdict is only valid when no hub has 2+ arms.

5. **Assumptions section:** the `## Assumptions` table below lists every non-obvious
   decision made — identity strategy, participation choices, ON DELETE choices, any domain
   question assumed rather than asked. Minimum 3 rows.

Only after completing all 5 items above, emit the report:

````
## ERD validation report

| Rule | Result | Location | Finding | Fix applied |
|------|--------|----------|---------|-------------|
| **A1** — No direct M:N | | | | |
| **A2** — Participation constraints | | | | |
| **A3** — Fan traps | | | | |
| **A4** — Chasm traps | | | | |
| **A5** — Self-referential & cyclic FKs | | | | |
| **B1** — Primary keys (identity strategy) | | | | |
| **B2** — Foreign keys | | | | |
| **B2a** — 1:1 enforcement | | | | |
| **B3** — First normal form (1NF) | | | | |
| **B4** — Second normal form (2NF) | | | | |
| **B5** — Third normal form (3NF) | | | | |
| **B6** — BCNF / 4NF advisory | | | | |
| **B7** — Nullable FK documentation | | | | |
| **B7a** — SET NULL on NOT NULL column | | | | |
| **C1** — Naming consistency | | | | |
| **C2** — No hacks | | | | |
| **C3** — Types & constraints | | | | |
| **C4** — No invented entities | | | | |
| **C5** — Cross-aggregate cascade advisory | | | | |
| **D1** — One transition table per lifecycle entity | | | | |
| **D2** — Every enum value is reachable | | | | |
| **D3** — Connected lifecycle | | | | |

## Lifecycle transitions

*(One block per status-enum entity — omit this section if no entities have a status enum.)*

### <table_name>
| From | Event | To |
|------|-------|----|
| ∅ | &lt;creation event&gt; | &lt;initial state&gt; |
| &lt;state&gt; | &lt;event&gt; | &lt;next state&gt; |

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

## Assumptions

| Decision | Assumption made | Alternative to ask user |
|----------|----------------|-------------------------|
| Identity strategy | TypeID (default) | UUID / auto-increment / custom |
| `<table>.<col>` participation | mandatory / optional | ... |
| `<FK>` ON DELETE policy | CASCADE / RESTRICT / SET NULL | ... |
| *(any other non-obvious choice)* | ... | ... |

📄 Model saved to `<path>/model.dbml`
📄 Decisions saved to spec/decisions.md (N decisions recorded)
✅ Compliant & live-tested — all use-cases pass, X issues fixed over Y iterations.
➡️ Done — the validated, live-tested model is the deliverable.
````

Severities:
- `❌ error` — integrity, normalization, direct-M:N, or **failing live-test** violations
  (must be fixed).
- `⚠️ warn` — participation, naming, or trap risks (fix or flag clearly).
- `ℹ️ info` — style suggestions.

When a `spec/` directory exists, attempt to run the ddd-align harness below as a
**self-correcting exit gate**. If the script does not exist at the path, skip this step
and note its absence in the report. The
errors you own are the model/SQL checks — fix them in `model.dbml` / `usecases.sql` and
re-run until clean (≤3 passes), then append the final one-line result:

- **AL-01 / AL-02** — every glossary-mapped table exists in the model, and every model table
  traces back to a glossary term (name a bridge/relationship table's term too).
- **AL-03 / AL-04** — every enumeration named in the glossary has a matching `Enum <name>`
  block with the exact values; an enum-typed column with no `Enum` block fails here.
- **AL-14** — every active UC has at least one `-- usecase: UC-xxx/DA-n` block in
  `usecases.sql`; descriptive-only labels (no UC id) read as never-tested.

`node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/`.

If the **ddd-align self-correction loop** exhausts its ≤3 passes without clean output,
end with `❌ ddd-align not converged after N passes` and list each remaining AL-code
error with the specific fix needed. Ask the user for the targeted fix — do not iterate
blindly. Never claim ddd-align is clean without a green re-run.

(Live-test loop non-convergence is handled by stage 5's exhausted-iteration protocol.)
