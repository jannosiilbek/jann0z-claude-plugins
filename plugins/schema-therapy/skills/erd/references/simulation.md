# ERD — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `erd` skill (artifact 04, a
**two-file unit emitted together**: `specs/04-erd.dbml` + `specs/04-transitions.md`). It
defines the **sole executable pass/fail authority** that ships with the skill: a DBML
**parse + DDL-execution engine oracle** (the strongest oracle available — a real Postgres of
the model's own formalism) plus a markdown linter and a mechanical resolution / exact-value /
reason-qualified-negative checker over a closed scenario format, plus a minimal set of
agent-judged checks. It satisfies the verification doctrine §2 (closed assertion grammar,
machine-readable summary, status taxonomy, no vacuous green, agent judgment only where the
contract marks it), §6 (determinism), and build steps B2 (formal-format oracle design) and
B3 (simulation design).

It is **paired with** `references/validation-rules.md` (the closed rule catalog,
A1–A6 / B1–B9 / C1–C9 / D1–D7 / E1–E4 — 35 rules). Every check below cites the catalog rule
ID(s) it mechanizes. **The catalog is the review vocabulary; this file is the executable
harness over it.** No check here exists without a catalog rule behind it.

Unlike `01-event-storming.md` (zero upstream) and the conceptual/textual `02`/`03` artifacts
(whose strongest oracle is *mechanical* because "the artifact is the model"), the `erd`
artifact is a **formal-format artifact** (DBML) with a real engine of its formalism. Per
doctrine B3 ("prefer running the artifact on a real engine of its formalism — a database for
a data model") and B2 ("must parse/validate under the authoritative parser, and any
downstream generation/instantiation that format supports must succeed"), the strongest oracle
here is **executable**: parse the DBML under its authoritative parser, export Postgres DDL,
and **run that DDL on a real Postgres engine plus simulation scenarios**. This is the skill
where the strongest-oracle clause bites, and it is designed precisely below (§3.3).

The artifact is a **two-upstream** artifact: validated against BOTH `specs/02-glossary.md`
(owns terms, enum values + order, forbidden synonyms) AND `specs/03-aggregates.md` (owns
aggregate roots, boundary members + kinds, invariants, references, cross-aggregate policies).
The harness therefore takes four file arguments and resolves every 04→02 and 04→03 reference
by exact string under the pinned conventions of the catalog ("Pinned conventions" block):

```
node scripts/harness.mjs <04-erd.dbml> --transitions <04-transitions.md> \
     --upstream-02 <02-glossary.md> --upstream-03 <03-aggregates.md>
```

The two upstream parses use the **pinned 02/03 formats** (copied, never imported — see §1):

- **02** (glossary): `## Terms` table `Term | Definition | Owns 01 element? | 01 element (exact string)`;
  `## Enums` with `### <Name>Status` subsections each holding a values table
  `Value | Derived from event (exact 01 string)`; `## Forbidden Synonyms` table
  `Forbidden term | Canonical term | Reason`. **02 is authority for terms, enum names + values
  + order, forbidden synonyms.**
- **03** (aggregates): `## Aggregates` with `### <AggregateName>` subsections each holding a
  `**Root:**` line, a Boundary-contents table `Member | Kind | 02 Term`, an Invariants table
  `ID | Rule | Scope`, a References table `Target aggregate | Identity field held | Reason`;
  `## Cross-Aggregate Policies` table
  `Policy | Source event (exact 01) | Target aggregate | Mode | Justification`. **03 is
  authority for aggregate roots, members + kinds, invariants, references, policies.**

04 references both and **never restates** a 02 definition, a 03 invariant text, or a 03 policy
(catalog E-theme). 04 owns only the **schema vocabulary derived via the pinned mapping**.

## Index

Open the section the verdict points at; an agent debugging a `malformed`/`broken-test`/`upstream-defect` result can locate the right section from this table alone.

| § | Title | What you find |
|---|-------|---------------|
| §0 | Oracle summary | engine pipeline (parse/DDL/execute) + status taxonomy + missing-engine ⇒ `broken-test` |
| §1 | Tooling record | `@dbml/core` + PGlite pins, self-install/offline mode, reuse rationale |
| §2 | Lint / parse checks | structural `L*` checks + `malformed` (parse) vs `fail` |
| §3 | Closed fixture / scenario format | derived graph, **engine scenarios** (§3.3), shipped fixtures, manifest |
| §4 | Closed assertion grammar | engine `E-*` / resolution / exact-value / negative / agent-judged vocabulary |
| §5 | Coverage floor & reconciliation | intake/edge/engine counts, X6 reconciliation, positive+negative mapping |
| §6 | Agent-judged checks | 2NF/3NF residue + cascade; closed verdict schemas |
| §7 | Output contract | stdout JSON shape, exit codes, `upstream-defect` routing |
| §8 | Determinism | no engine-minted value asserted; byte-identical re-runs |
| §9 | Upstream-defect routing | five 02/03 conditions (defect vs broken-test) |

## 0 — Oracle summary (doctrine §2)

- **A real engine exists — and it is the oracle.** Unlike 01–03, the DBML artifact is a
  *formal-format* artifact with both an authoritative parser and a real Postgres engine.
  `sources/SOURCES.md` pins them: **`@dbml/core` 8.2.5** is "the authoritative DBML
  parser/validator" (authoritative over the prose docs), and **PGlite 0.5.1** embeds
  **PostgreSQL 18.3**, "the authoritative arbiter of whether generated SQL actually runs." The
  strongest oracle (B3) is therefore a **three-layer engine pipeline**, run fresh per run:
  1. **Parse oracle** — `new Parser().parse(dbml, 'dbmlv2')` → `Database` object. A throw ⇒
     `malformed` (the artifact is not valid DBML; downstream checks cannot anchor).
  2. **DDL-export oracle** — `ModelExporter.export(database, 'postgres')` → Postgres DDL
     string. A throw ⇒ `fail` (parses but cannot be realized as SQL — a model defect).
  3. **Execution oracle** — apply that DDL to a **fresh in-memory PGlite** instance, then run
     the **closed simulation scenarios** (§3.3): mechanically-derived generic scenarios
     (FK-enforcement / enum-domain / PK-uniqueness / composite-uniqueness / minimal-row
     probes) plus skill-shipped domain seed scenarios. A DDL error ⇒ `fail`; a scenario whose
     **asserted violation class** does not fire ⇒ `fail`.
- **Mechanical (no-engine) checks** run alongside the engine for everything the engine cannot
  see: the **transition-table oracle** (D-theme — markdown, no SQL construct expresses a
  transition table), and the **cross-artifact resolution** (C/E themes — tables↔03 roots,
  enums↔02, References↔FKs, forbidden-synonym scan, DRY restatement scan). These walk the
  parsed `Database` JSON model against the parsed 02/03 upstreams.
- **Agent judgment** is admitted ONLY for the handful of inherently semantic catalog rules
  (§6) — chiefly the 2NF/3NF residue beyond the mechanical heuristics and the C8 cascade
  judgment — each with the reason it cannot be mechanical and a **closed verdict schema**
  (enumerated verdicts, never prose). **All ❌-severity catalog rules are mechanizable; no ❌
  rule is left to agent judgment.** Where a rule has a mechanical subset and a semantic residue
  (B3/B4 normal forms, C8 cascade), the ❌/mechanizable subset is mechanized and only the
  residue is agent-judged at the residue's own (non-blocking) severity.
- **Status taxonomy:** `pass | fail | malformed | broken-test`.
  - `pass` — all four artifacts parsed; the DBML parsed, exported DDL, and executed on PGlite;
    every executed check (engine + mechanical) passed; checks counter reconciled (§5); ≥1
    check executed.
  - `fail` — all four artifacts parsed; ≥1 ❌-class check failed (a DDL-export failure, a
    DDL-execution failure, a simulation-scenario violation-class miss, a transition-table
    defect, a resolution/exact-value miss, or a reason-qualified negative). **Includes the
    `upstream-defect` case** (a 02- or 03-origin defect surfaced through 04's resolution
    checks — §9): the status stays `fail` (the taxonomy is closed), but the finding carries
    the distinguished `upstream-defect` class plus the offending upstream filename, for
    routing.
  - `malformed` — the **04 artifact** is unparseable: the `.dbml` throws under
    `@dbml/core` 8.2.5 (A2), OR the `.md` companion violates the pinned transitions format (the
    `## Transition Tables` H2 absent, a `### <TableName>` block with the wrong column shape)
    such that downstream checks cannot be anchored, OR a required file of the two-file artifact
    is absent (A1). Distinct from a populated-but-wrong artifact, which is `fail`.
  - `broken-test` — a check could not evaluate (threw, indeterminate input), OR a
    reason-qualified negative passed for the wrong reason (the rejection fired but not on the
    asserted rule), OR the checks counter failed to reconcile (a silently dropped check), OR
    zero checks parsed (no vacuous green), OR **either upstream (02 or 03) is unparseable**
    against its pinned format, OR **the engine dependencies are absent and cannot be installed**
    (no `node_modules`, no network — see §1; the harness refuses to emit a verdict it cannot
    justify rather than vacuously passing).
- **No vacuous green:** zero parsed/executed checks ⇒ exit failure with status `broken-test`.
  A typo'd negative check (a defect that should fail but the check never fired, or fired on the
  wrong rule) ⇒ `broken-test`, never `pass`. **A missing engine ⇒ `broken-test`, never a pass.**

## 1 — Tooling record (B2; incl. self-install + offline mode)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `event-storming` / `glossary` / `aggregates` harnesses (suite uniformity). |
| Entry points | `scripts/harness.mjs` (the oracle; the 4-arg invocation above), `scripts/selftest.mjs` (runs the harness over every shipped fixture quadruple and asserts the expected status + failing-check + upstream-route). |
| **Parser / validator** | **`@dbml/core` 8.2.5** (pinned). `new Parser().parse(dbml, 'dbmlv2')` is the **authoritative DBML parser** (SOURCES.md authority ruling #4 — ground truth over the prose docs). `ModelExporter.export(db, 'postgres')` emits the Postgres DDL; `ModelExporter.export(db, 'json')` emits the normalized model JSON the mechanical checks read (tables, fields, enums, refs) — so the harness reads the **parser's own model**, never re-parses DBML text by hand. **Inline-enum parser constraint:** `@dbml/core` 8.2.5 (dbmlv2) requires newline-separated enum values; inline single-line enum bodies do not parse — all fixtures and emitted artifacts use the multi-line Enum form. |
| **Execution engine** | **`@electric-sql/pglite` 0.5.1** (pinned) — in-process **PostgreSQL 18.3** (SOURCES.md authority ruling #5 — "the authoritative arbiter of whether generated SQL actually runs"). A **fresh in-memory** PGlite (`new PGlite()`, no data dir) per run (§8). |
| Markdown parser | **Hand-rolled line/table/heading parser**, dependency-free, vendored in `scripts/lib/md.mjs` — shared shape-reader for `04-transitions.md` and both pinned upstreams (02 + 03). The `.dbml` is **not** hand-parsed: `@dbml/core` owns it. |
| Dependency pin | `scripts/package.json` pins `"@dbml/core": "8.2.5"` and `"@electric-sql/pglite": "0.5.1"` **exactly** (no `^`/`~`); a committed `scripts/package-lock.json` locks the trees. Versions are recorded in the JSON summary's `tooling` block so a re-run on a drifted tree is detectable. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Closed lexicons | `scripts/lib/lexicon.mjs` — the **snake_case validator** (`^[a-z][a-z0-9_]*$`), the **singular-plural heuristic** (B9: a trailing bare `s` on a name whose singular is also a 02/03-derived token), the **PK-type table** for FK-type compatibility (B7), and the **forbidden-synonym scan** (read fresh per run from 02). Closed and vendored; extended only by a committed edit, never ad hoc at runtime. |

**Rationale for the engine oracle over a mechanical-only harness:** unlike 01–03 (conceptual
documents where SOURCES.md records "no executable sources exist"), DBML **has** an authoritative
parser and a real engine. Doctrine B3 names the strongest oracle explicitly — "a database for a
data model" — and B2 requires that a formal-format artifact "parse/validate under the
authoritative parser, and any downstream generation or instantiation that format supports must
succeed." Hand-rolling a DBML parser would be **weaker than the oracle the format ships** and
would diverge from the parser that the catalog (A2) names as ground truth; generating DDL and
**not running it** would leave A3 (DDL executes) unproven. So the harness uses `@dbml/core` for
parse + DDL + model-JSON and PGlite for execution. The transition tables and cross-artifact
resolution have **no engine** (no SQL construct expresses them), so those remain mechanical —
the same hand-rolled `md.mjs` + `checks.mjs` design the siblings use.

**Self-install + offline failure mode (pinned).** The engine deps are **not vendored** into the
repo (SOURCES.md: "Non-`node_modules` vendoring of the parser/engine — deliberately NOT done").
On startup the harness checks for `scripts/node_modules/@dbml/core` and
`scripts/node_modules/@electric-sql/pglite`:

- **Present** → run normally.
- **Absent + network reachable** → the harness self-installs into its own `scripts/` dir:
  `npm ci --prefix scripts --no-audit --no-fund` if `package-lock.json` is present (preferred,
  reproducible), else `npm install --prefix scripts --no-audit --no-fund`. The install is
  one-time; subsequent runs hit the "present" path.
- **Absent + no network** → the harness does **not** silently skip the engine and emit a green.
  It exits `status: broken-test`, exit code `3`, with a stderr diagnostic naming the missing
  package(s) and the install command. This is the §0 "missing engine ⇒ broken-test, never a
  vacuous pass" rule made concrete: the strongest oracle is unavailable, so the harness honestly
  refuses to certify the artifact rather than degrade to a parse-only verdict that would let an
  un-executable DDL through.

**Reuse note (doctrine "reuse over invention: copied, never referenced").** The
`event-storming`/`glossary`/`aggregates` skills already ship a hand-rolled `md.mjs` reader and a
`checks.mjs` grammar for the pinned 01/02/03 markdown shapes. This skill **copies** the 02 and
03 upstream readers (it must parse the same pinned 02 *and* 03 shapes its two upstreams arrive
in) and the `checks.mjs` class scaffold, then adds the 04-specific shape (the transitions table)
and the **engine layer** (`@dbml/core` + PGlite), which is new to this skill — no sibling has an
engine because no sibling's artifact is a runnable formalism. For the engine itself the harness
**reuses the format's own proven tooling** (the authoritative parser + a real Postgres) rather
than inventing a DBML interpreter — the strongest possible "reuse over invention." Copied, never
cross-referenced — each skill stays self-contained and portable.

## 2 — Lint / parse checks (structural; A-theme + mechanical B/C/E shape rules)

Parse/lint checks run first. The `.dbml` is parsed by `@dbml/core`; the `.md` and the two
upstreams by `md.mjs`. Lint IDs are `L*`. A parse failure or a ❌ lint that prevents anchoring
04 yields `malformed`; a ❌ lint over an anchored 04 yields `fail`; ⚠️/ℹ️ lints are warn-only.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| L1 | **Both** files of the artifact present (`04-erd.dbml` AND `04-transitions.md`). | A1 | `malformed` |
| L2 | `04-erd.dbml` parses under `@dbml/core` 8.2.5 (`Parser.parse(dbml,'dbmlv2')` does not throw). | A2 | `malformed` |
| L3 | `04-transitions.md` has exactly one `## Transition Tables` H2; every lifecycle block is `### <TableName>` with a table header exactly `From \| Event (exact 01 string) \| To` (3 cols, that order). | (transitions format / D1) | `malformed` |
| L4 | Fingerprint block present in **both** files (`// fingerprints:` in `.dbml`, `<!-- fingerprints: -->` in `.md`). | A4 | `fail` |
| L5 | Each fingerprint block names BOTH `02-glossary.md@sha256:<64-hex>` AND `03-aggregates.md@sha256:<64-hex>` (each 64 chars `[0-9a-f]`, neither a placeholder `0000…`/`xxxx…`/`<hex>`). | A5 | `fail` |
| L6 | The sha256 values in the two files **agree** pair-for-pair (same digest for 02, same for 03). | A6 | `fail` |
| L7 | Every parsed table name and column name is `snake_case` (`^[a-z][a-z0-9_]*$`); no table name is pluralized (singular heuristic). | B9 | `fail` |
| L8 | Every DBML `Enum` name is `snake_case`. | B9 / C5 | `fail` |
| L9 | Every parsed table has a primary key — a `pk` column **or** a composite `Indexes { (...) [pk] }`. | B1 | `fail` |
| L10 | No column type is an array / list (`<type>[]`) and no repeated-group columns (`phone1`, `phone2`, …) are present (1NF shape subset). | B2 | `fail` |
| L11 | No DBML note (`note:`) and no transitions.md prose **restates** a 02 definition, a 03 invariant `Rule` text, or a 03 policy `Justification` text (≥N=6 consecutive verbatim tokens from a single upstream cell). | E1 | `fail` |
| L12 | No forbidden-synonym token (the closed list read from 02's `## Forbidden Synonyms` `Forbidden term` column) appears in any identifier (table/column/enum name) or note. Whole-word, case-insensitive. **An identifier that IS the pinned snake_case derivation of a canonical 02 Term / 03 member / 03 aggregate / enum-name-or-value is EXEMPT from sub-token scanning** — a forbidden token appearing only as a sub-token of such a mandated derived name (e.g. `section` inside `seating_section`, the pinned derivation of canonical 02 Term `SeatingSection`) is the canonical name, not a synonym misuse. Forbidden synonyms still fire on identifiers NOT in the derived set (a bare table `section`, a column `conference_id` when `Conference` is forbidden) and on free prose (notes are never exempt). | E2 | `fail` |
| L13 | Every nullable FK column (a `Ref` endpoint with no `not null`) carries a column `note:`. | B8 | warn-only (⚠️) |
| L14 | Every note that references upstream does so **by name** (`02 term X`, `03 invariant INV-…`), not by paraphrase. | E3 | warn-only (⚠️) |
| L15 | Transition rows are sorted by `(From in 02 enum order, then To in 02 enum order)`, the `∅` row first. | D7 | warn-only (ℹ️) |

L9–L12 are **content checks over the parsed model** (`fail`, not `malformed`): they read the
`@dbml/core` model JSON (L9/L10) or scan identifiers/notes (L11/L12) and do **not** walk a
resolution edge, so they leave the §5 edge arithmetic untouched. The blocklists (forbidden
synonym, restatement window) are **closed and vendored**; the forbidden-synonym list for L12 is
**read fresh per run from the parsed 02** (upstream-owned data, not a vendored constant).

## 3 — Closed fixture / scenario format (B3)

The scenario has **two halves**, because the artifact has two oracles:

1. **Engine scenarios** (§3.3) — the strongest oracle. The parsed model is realized as a live
   Postgres schema and exercised with deterministic seed INSERTs + assertion queries: a closed,
   **mechanically-derived** generic scenario set (no hand-written per-domain SQL in the harness)
   plus skill-shipped **domain seed** scenarios validated by shape.
2. **Mechanical scenarios** (§3.1–§3.2) — a walk over 04's own claims (the parsed model JSON +
   the transitions graph) resolved against the parsed 02 and 03 upstreams. No external scenario
   data is injected into a *target* run; the four artifacts supply every element. The shipped
   fixtures (§3.4) are **whole canned artifact quadruples** used only by `selftest.mjs`.

### 3.1 Derived scenario graph (built fresh per run — §6)

From the parsed **04 `.dbml`** (via `@dbml/core` model JSON) the harness derives:

- `tables[]` — `{name, columns[] ({name, type, pk, notNull, increment, note}), pk (col(s)),
  indexes[]}`.
- `enums[]` — `{name, values[] (ordered)}`.
- `refs[]` — `{fromTable, fromCol, toTable, toCol, cardinality (<, >, -, <>), onDelete}`.
- `statusColumns[]` — every column whose type resolves to a DBML enum named `<…>_status`
  (the lifecycle marker).

From the parsed **04 `.md`** the harness derives:

- `transitionTables[]` — `### <TableName>` blocks: `{table, rows[] ({from, event, to})}`.

From parsed **02** (pinned upstream): `terms02[]`, `enums02[]` (`{name, values[] (ordered),
derivations[] (value→event01)}`), `forbidden02[]`.
From parsed **03** (pinned upstream): `aggregates03[]` (`{name, root, members[] ({member, kind,
term02}), references[] ({targetAgg, identityField}), }`), `policies03[]`
(`{policy, sourceEvent, targetAgg, mode}`).

Closed traversal set (every relationship 04 claims becomes a walked edge):

1. **Root→table edge** — each `aggregates03[].root` resolves to a `tables[]` name via
   `snake_case` (C1).
2. **Entity-member→table edge** — each 03 boundary member of `Kind = entity` resolves to a
   `tables[]` name AND has an FK path (direct or transitive over `refs[]`) to its root's PK (C2).
3. **Reference→FK edge** — each `aggregates03[].references[]` row resolves to a `refs[]` FK from
   a table of the referencing aggregate to the target root's PK (C4).
4. **Enum→02 edge** — each `enums[]` resolves to a 02 enum (name via the pinned lowercase-
   snake_case transform) with **values verbatim and in 02 order** (C5).
5. **Status-col→enum edge** — each entity that has a `<Name>Status` enum in 02 carries a
   `status` column typed by the corresponding DBML enum (C6).
6. **Table/column/enum-name→02/03 edge** — each table/column/enum name derives (via the pinned
   mapping) from a 02 term/enum or 03 member, OR is a junction bridge; a name tracing to no
   upstream owner and not a bridge is a genuinely-invented entity → fail (C9 ❌; C7 ⚠️ for the
   borderline-naming residue).
7. **FK-type edge** — each `refs[]` FK column's type equals the referenced PK's type (B7).
8. **M:N→junction edge** — each many-to-many relationship implied by 02/03 is realized by an
   explicit junction table whose key combines the two FKs, not a `<>` left implicit (B6).
9. **Transition-table↔status-entity bijection edge** — `set(transitionTables[].table)` equals
   `set(statusColumns[].table)` (D1, E4).
10. **Transition-From/To→enum edge** — each `from`/`to` cell (≠ `∅`) ∈ the entity's 02 enum
    values (D2).
11. **Transition-Event→02-derivation edge** — each `event` equals the exact `Derived from event`
    01 string for the relevant enum value in 02 (D3).
12. **Reachability edge** — over each transition graph: exactly one `∅`-origin row (D4); every
    enum value appears as a `To` or is the initial state (D5); every non-`∅` `From` is also a
    `To` (D6).

Every edge class above is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Cross-artifact resolution (mechanical, no engine)

The C/E/D edges above (1–6, 9–12) are pure resolution / exact-value / DRY checks over the
parsed models. They are byte-deterministic and never touch the engine. The pinned mappings
(`snake_case` table from 03 member; lowercase-snake_case enum from 02 name; `status` column
name; transition-table name = DBML table name) are the catalog's "Pinned conventions" block,
copied into `scripts/lib/lexicon.mjs` so the harness and the catalog agree by construction.

### 3.3 Engine scenarios — the strongest-oracle design (B3, this skill's load-bearing layer)

After parse (L2) and DDL export, the harness applies the DDL to a **fresh in-memory PGlite**
and runs two scenario families. **No engine-generated value is ever placed in an asserted
position** (§8): assertions are over **counts, violation classes, and SQLSTATE error codes**,
never over serial ids or timestamps the engine minted.

**(a) Mechanically-derived generic scenarios (harness-owned; deterministic from the model).**
These are computed from the parsed model alone — there is **no hand-written per-domain SQL in
the harness**. For the model's tables/refs/enums/PKs the harness mechanically synthesizes:

| Scenario class | Derivation | Assertion | Catalog rule |
|----------------|------------|-----------|--------------|
| `E-DDL` | the exported DDL itself | applies on PGlite with no error | A3 |
| `E-MINROW` | for each table, a minimal valid row honoring NOT NULL + types, FKs satisfied by topologically-ordered parent inserts | INSERT **succeeds** | A3 (every table instantiable) |
| `E-FK` | for each FK, an INSERT with an **orphan** FK value (no matching parent) | INSERT **rejected**, SQLSTATE `23503` (foreign_key_violation), the rejected constraint names the FK | B7 / C4 (FK enforced) |
| `E-ENUM` | for each enum-typed column, an INSERT with a **non-enum** string value | INSERT **rejected**, SQLSTATE `22P02` (invalid_text_representation) | C5 / C6 (enum domain) |
| `E-PK` | for each PK, two INSERTs with the **same** PK value (the probe first seeds the table's **full transitive FK-parent closure**, topologically ordered ancestors-first — a multi-hop chain like `refund→ticket→event→venue` needs every ancestor seeded, or the immediate-parent insert itself dies with `23503` before the duplicate can be tested) | second INSERT **rejected**, SQLSTATE `23505` (unique_violation) | B1 (PK uniqueness) |
| `E-JUNCTION` | for each junction table (composite PK over two FKs), two INSERTs with the **same** pair | second **rejected**, SQLSTATE `23505` | B6 (M:N composite uniqueness) |

Topological insert order for `E-MINROW`/`E-FK` is computed from `refs[]` (a DAG over tables;
a cycle ⇒ inserts deferred via the DDL's `DEFERRABLE INITIALLY IMMEDIATE` FKs — which
`@dbml/core` emits, see `sources/dbml-fixtures/dbml2sql-postgres-expected.sql`). The seed
*values* are derived deterministically from the column type (e.g. `int`→`1`, `2`; `varchar`→
`'a'`; enum→its first 02 value) — **fixed, never random/clock** (§8). "Mechanically derived"
means: given the same parsed model, the same SQL is generated byte-for-byte every run.

**(b) Domain seed scenarios (skill-shipped at draft time; validated by shape).** The SKILL, at
draft time, generates a **domain scenario file** `specs/04-scenarios.json` per a pinned
procedure (one happy-path seed per aggregate root honoring its invariants, plus one query per
03 invariant asserting the invariant holds on the seed). This is the *domain* counterpart to the
generic probes — it exercises the model the way the business will. The harness:

- validates the scenario file's **shape** (a closed JSON schema: `{seeds: [{table, row}],
  asserts: [{query, expect: {rowCount|class}}]}`) — a shape violation ⇒ `malformed`;
- runs the seeds + asserts on the same fresh PGlite; an assert miss ⇒ `fail`.

**Decision (pinned): which scenarios are harness-owned vs domain-authored.** The generic probes
(`E-*` above) are **harness-owned and mechanically derived** — they assert *structural*
guarantees (every FK enforces, every enum rejects out-of-domain, every PK/junction is unique,
every table instantiates) that hold for *any* schema and need no domain knowledge, so the
harness owns them and they are byte-deterministic. The **domain seeds are draft-time-authored**
because asserting that a *business invariant* holds (e.g. "an order's total equals the sum of
its lines") requires domain SQL the harness cannot synthesize from structure alone — so the
skill ships them and the harness only validates their shape + runs them. This split keeps the
strongest oracle's *structural* layer fully mechanical and deterministic while still exercising
domain behavior. A model with **zero** domain scenarios still gets the full `E-*` generic
battery (no vacuous engine pass).

### 3.4 Shipped fixtures (`scripts/fixtures/`)

One shared deterministic **upstream pair** (`upstream-02.md` + `upstream-03.md`, consistent
with each other) + one valid **04 pair** (`valid.dbml` + `valid-transitions.md` + a matching
`valid-scenarios.json`) + the illegal 04 fixtures + broken-upstream fixtures. Each illegal
fixture carries exactly one deliberate defect, so its negative fires **for the stated reason**
(a fixture that fails for any other reason is itself `broken-test`). The expected
`(status, failing-check, upstream-route)` is recorded in `scripts/fixtures/manifest.json`.

**`upstream-02.md` + `upstream-03.md`** — a small but covering consistent pair, **mirroring the
real 02 shape in miniature**: 02 `## Terms` own **actors / aggregates / value concepts only**
(`Customer`, `Order`, `Ticket`, `OrderId`, `TicketId`, `SeatNumber`) — **NO event rows** (the
real glossary never lists events as Terms; event names live only in 01, referenced by the enum
`Derived from event` column). **≥2 aggregates** (`Order`, `Ticket`) with one **M:N** relationship
between them (forcing a junction table), **≥1 References row** (Order→Ticket by identity), and
**≥2 enums** (`OrderStatus` = `placed, paid, expired`; `TicketStatus` = `reserved, sold,
released`) whose `Derived from event` column cites the 01 events verbatim (used by the
D3/R-TEVENT transition-event match, never re-validated against 01 — erd has no 01). The
`## Forbidden Synonyms` table carries `booking`→`Order`, `reservation`→`Ticket`, and
`seat`→`SeatNumber` — the last so the **sub-token exemption** is exercised: the value column
`seat_number` (pinned derivation of canonical 02 Term `SeatNumber`) contains forbidden token
`seat` yet must pass L12. Static and stable; no clock/random/engine values.

**`valid.dbml` + `valid-transitions.md` + `valid-scenarios.json`** — a minimal correct 04 over
the pair: `order` + `ticket` tables (singular, snake_case) with PKs; an `order_ticket` junction
table for the M:N; an FK `order.ticket_id`-style reference per the References row; enums
`order_status` / `ticket_status` with verbatim 02 values in order; `status` columns typed by
them; matching fingerprints in both files; one `### order` + one `### ticket` transition block
(bijection) with a single `∅` row each, every value reachable, rows in pinned order; a domain
scenario file seeding one valid order + ticket.

| Fixture (04) | Upstream pair | Injected defect | Must fail | Expected status |
|--------------|---------------|-----------------|-----------|-----------------|
| `valid.*` | `02`+`03` | none — minimal correct 04 | nothing | `pass` |
| `missing-transitions-file` | `02`+`03` | `.md` companion absent | L1 (A1) | `malformed` |
| `dbml-parse-error.dbml` | `02`+`03` | `.dbml` has a syntax error (`@dbml/core` throws) | L2 (A2) | `malformed` |
| `bad-transitions-columns.md` | `02`+`03` | transitions header reordered to `To \| Event \| From` | L3 | `malformed` |
| `missing-fingerprint.*` | `02`+`03` | fingerprint block absent from the `.md` | L4 (A4) | `fail` |
| `placeholder-fingerprint.*` | `02`+`03` | a digest is a placeholder, not 64-hex | L5 (A5) | `fail` |
| `fingerprint-mismatch.*` | `02`+`03` | `.dbml` and `.md` carry **different** 02 digests | L6 (A6) | `fail` |
| `no-pk.dbml` | `02`+`03` | a table declares no `pk` / composite key | L9 / **E-PK** (B1) | `fail` |
| `array-column.dbml` | `02`+`03` | a `varchar[]` multivalued column (1NF) | L10 (B2) | `fail` |
| `missing-junction.dbml` | `02`+`03` | the M:N modelled with a `<>` and no junction table | R-MN / **E-JUNCTION** (B6) | `fail` |
| `fk-type-mismatch.dbml` | `02`+`03` | an FK column typed `varchar` referencing an `int` PK | R-FKTYPE / DDL/**E-FK** (B7) | `fail` |
| `nullable-fk-undocumented.dbml` | `02`+`03` | a nullable FK with no column note | L13 (B8) | `fail` (⚠️ surfaced as finding) |
| `ddl-export-fails.dbml` | `02`+`03` | parses but the model is rejected at the DDL layer (E-EXPORT is positive-only under `@dbml/core` 8.2.5 — no export-throw is constructible — so this negative is owned by E-DDL) | E-DDL (A3) | `fail` |
| `bad-type-ddl.dbml` | `02`+`03` | a column type PostgreSQL 18.3 rejects (e.g. `notatype`) | E-DDL (A3) | `fail` |
| `enum-value-extra.dbml` | `02`+`03` | `order_status` has an extra value absent from 02 | R-ENUM / **E-ENUM** (C5) | `fail` |
| `enum-value-missing.dbml` | `02`+`03` | `order_status` drops a 02 value | R-ENUM (C5) | `fail` |
| `enum-value-reordered.dbml` | `02`+`03` | `order_status` values out of 02 order | R-ENUM (C5) | `fail` |
| `missing-root-table.dbml` | `02`+`03` | 03 root `Ticket` has no `ticket` table | R-ROOT (C1) | `fail` |
| `pluralized-table.dbml` | `02`+`03` | the junction table is pluralized (`order_tickets`, not singular `order_ticket`) — the dedicated B9 negative; isolates L7 (matching `pluralized-table-scenarios.json` keeps it the sole failure) | L7 (B9) | `fail` |
| `table-for-ghost-member.dbml` | `02`+`03` | a table named for a member absent from 03 (no bridge note) — a genuinely-invented entity | R-NAME (C9) | `fail` |
| `reference-without-fk.dbml` | `02`+`03` | a 03 References row with no corresponding FK | R-REF (C4) | `fail` |
| `status-untyped.dbml` | `02`+`03` | a lifecycle entity's `status` is `varchar`, not its enum | R-STATUS / **E-ENUM** (C6) | `fail` |
| `transition-from-not-enum.md` | `02`+`03` | a `From` value not in the entity's 02 enum | R-TFROM (D2) | `fail` |
| `transition-event-paraphrased.md` | `02`+`03` | an `Event` = `paid` instead of verbatim `Order Paid` | R-TEVENT (D3) | `fail` |
| `missing-transition-table.md` | `02`+`03` | a status entity with no `### <table>` block | R-BIJECTION / E4 (D1) | `fail` |
| `extra-transition-table.md` | `02`+`03` | a `### <table>` block for an entity with no status column | R-BIJECTION (D1) | `fail` |
| `unreachable-enum-value.md` | `02`+`03` | an enum value never appears as a `To` and is not initial | R-REACH (D5) | `fail` |
| `duplicate-initial-row.md` | `02`+`03` | two `∅`-origin rows | R-INIT (D4) | `fail` |
| `forbidden-synonym-id.dbml` | `02`+`03` | a table named with a 02 forbidden term (`booking`) | L12 (E2) | `fail` |
| `forbidden-subtoken-misuse.dbml` | `02`+`03` | a column named the **bare** forbidden term `seat` (not the pinned derived `seat_number`) — proves the sub-token exemption does not over-exempt a genuine standalone misuse | L12 (E2) | `fail` |
| `restated-invariant-note.dbml` | `02`+`03` | a DBML note restating a 03 invariant's `Rule` text | L11 (E1) | `fail` |
| `wrong-reason-trap.*` | `02`+`03` | **two** defects — a missing root table (C1) AND a forbidden synonym (E2) — proves the negative reports the **R-ROOT** reason, not L12 | R-ROOT isolates over L12 | `fail` (reason = R-ROOT) |
| `vacuous.*` | `02`+`03` | structurally valid 04 but harness fed the `--no-checks` disabled path | n/a | `broken-test` (zero checks) |
| `no-engine` | `02`+`03` | valid 04 but `node_modules` absent + network blocked | n/a | `broken-test` (missing engine) |
| `valid.*` | `broken-upstream-03`+`02` | **03 self-inconsistency** — a References row targets an aggregate 03 never declares | resolution surfaces it | `fail` (class=`upstream-defect`→03) |
| `valid.*` | `02`+`inconsistent-upstream-02` | **02↔03 inconsistency** — a `### InvoiceStatus` lifecycle enum with no `Invoice` aggregate in 03 (a status enum for an aggregate the model has none of) | 02 cross-check (R-ENUM owner) | `fail` (class=`upstream-defect`→02) |
| `valid.*` | `malformed-upstream-02`+`03` | the 02 upstream drops `## Forbidden Synonyms` (unparseable) | n/a — cannot anchor 02 | `broken-test` |
| `valid.*` | `02`+`malformed-upstream-03` | the 03 upstream drops `## Aggregates` (unparseable) | n/a — cannot anchor 03 | `broken-test` |

`wrong-reason-trap.*` is the explicit doctrine §2 guard: it would "pass for the wrong reason"
under a sloppy negative. The selftest asserts the failing-check ID equals `R-ROOT`, not merely
that *some* check failed.

The last four rows are the **upstream quadruples**: the same valid 04 validated against a broken
upstream. An upstream that is well-formed but **self/mutually inconsistent** routes to `fail` +
`upstream-defect` (tagged with which file to fix); an upstream that is **unparseable** routes to
`broken-test` (§9). The `no-engine` row proves the offline failure mode (§1) is `broken-test`,
not a vacuous pass.

### 3.5 Manifest

`scripts/fixtures/manifest.json` records, per fixture, `{files, status, failingCheck,
upstreamRoute?}`. `selftest.mjs` runs the harness over each entry and asserts the actual
`(status, failingCheck, upstreamRoute)` equals the manifest — the negatives are thus proven to
fire **for their stated reason**, and the coverage floor (§5) is asserted true.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a check
means editing this section AND `scripts/lib/checks.mjs` in a committed change, and the new check
MUST cite a catalog rule. The harness emits each check's `id`, `class`, `status`, and `rule` in
its JSON summary (§7). **Five** classes — the four B3 classes plus the engine class, which is the
strongest-oracle layer:

### 4.1 Engine checks (`E` — the parsed model is run on a real Postgres of its formalism)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| E-EXPORT | `ModelExporter.export(db,'postgres')` returns a DDL string without throwing. | A3 |
| E-DDL | the exported DDL applies on a fresh PGlite with no error. | A3 |
| E-MINROW | every table accepts a minimal valid row (FKs satisfied topologically). | A3 |
| E-FK | every FK rejects an orphan child INSERT with SQLSTATE `23503`, naming the FK constraint. | B7, C4 |
| E-ENUM | every enum-typed column rejects a non-enum value with SQLSTATE `22P02`. | C5, C6 |
| E-PK | every PK rejects a duplicate with SQLSTATE `23505`. | B1 |
| E-JUNCTION | every junction table rejects a duplicate composite pair with SQLSTATE `23505`. | B6 |
| E-DOMAIN | every shipped domain-seed assert returns its expected row-count / class. | (domain behavior; C-theme) |

### 4.2 Resolution checks (`R` — a referenced element exists / maps in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R-ROOT | every 03 aggregate root resolves to a table named `snake_case(root)`. | C1 |
| R-MEMBER | every 03 `Kind=entity` member resolves to a table with an FK path to its root PK. | C2 |
| R-REF | every 03 References row resolves to a `refs[]` FK to the target root's PK. | C4 |
| R-ENUM | every 02 enum resolves to a DBML enum with **verbatim values in 02 order** (set, text, order). | C5 |
| R-STATUS | every entity with a 02 `<Name>Status` enum carries a `status` column typed by it. | C6 |
| R-NAME | every table/column/enum name derives from a 02/03 string (pinned mapping) or is a junction bridge; a name tracing to no upstream owner and not a bridge is a genuinely-invented entity → **fail**. | C9 (hard, ❌); C7 (borderline, ⚠️) |
| R-FKTYPE | every FK column's type equals the referenced PK's type. | B7 |
| R-MN | every 02/03 M:N relationship is realized by an explicit junction table (not an implicit `<>`). | B6 |
| R-BIJECTION | `set(transition tables)` equals `set(status-bearing entities)` (none missing, none extra). | D1, E4 |
| R-TFROM | every transition `From`/`To` (≠`∅`) ∈ the entity's 02 enum values. | D2 |
| R-TEVENT | every transition `Event` equals the exact 02 `Derived from event` 01 string. | D3 |
| R-INIT | exactly one `∅`-origin row per lifecycle entity. | D4 |
| R-REACH | every enum value appears as a `To` or is the initial state (reachable). | D5 |

### 4.3 Exact-value checks (`X` — exact counts/values against the derived graph)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| X1 | `tables.length` === intake table count; `set(table names)` reconciled against the C1/C2 mapping. | C1/C2, §5 |
| X2 | each enum's value array **deep-equals** its 02 enum's value array (order-sensitive). | C5 |
| X3 | every table has exactly one PK (single or composite); `pkCount === 1` per table. | B1 |
| X4 | `count(status columns)` === `count(### transition blocks)` (the two-file consistency count). | E4, D1 |
| X5 | every non-`∅` `From` value also appears as a `To` (connected lifecycle). | D6 |
| X6 | the executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.4 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

Named negatives proven by the shipped illegal fixtures (§3.4). Each asserts both that the defect
is rejected AND that the failing-check ID matches the defect's owner rule (wrong-reason ⇒
`broken-test`). N-IDs map 1:1 to the fixture rows; abbreviated here:

| ID | Illegal input | For the reason | Owner check | Catalog rule |
|----|---------------|----------------|-------------|--------------|
| N1 | missing `.md` file | two-file artifact incomplete | L1 | A1 |
| N2 | `.dbml` syntax error | parser throws | L2 | A2 |
| N3 | bad transitions columns | wrong header shape | L3 | (format) |
| N4 | fingerprint absent / placeholder / mismatched | A4/A5/A6 | L4/L5/L6 | A4–A6 |
| N5 | table without PK | no pk / composite | L9 + E-PK | B1 |
| N6 | array/multivalued column | 1NF violated | L10 | B2 |
| N7 | M:N without junction | no associative table | R-MN + E-JUNCTION | B6 |
| N8 | FK-type mismatch | FK type ≠ PK type | R-FKTYPE + E-FK | B7 |
| N9 | nullable FK undocumented | no note on optional FK | L13 | B8 |
| N10 | DDL export fails | not exportable to postgres (E-EXPORT is positive-only under the pinned parser — no negative constructible — so owned by E-DDL) | E-DDL | A3 |
| N11 | DDL execution fails | bad type rejected by PG 18.3 | E-DDL | A3 |
| N12 | enum extra/missing/reordered value | values ≠ 02 set/order | R-ENUM + X2 (+E-ENUM) | C5 |
| N13 | missing root table | 03 root has no table | R-ROOT | C1 |
| N14 | table for ghost member | name not from 02/03, no bridge | R-NAME | C9 |
| N15 | reference without FK | References row unbacked | R-REF | C4 |
| N16 | status column untyped | varchar not enum | R-STATUS + E-ENUM | C6 |
| N17 | transition From/To not in enum | non-enum state | R-TFROM | D2 |
| N18 | transition Event paraphrased | not verbatim 01 string | R-TEVENT | D3 |
| N19 | missing transition table | status entity, no block | R-BIJECTION | D1 |
| N20 | extra transition table | block, no status entity | R-BIJECTION | D1 |
| N21 | unreachable enum value | never a `To`, not initial | R-REACH | D5 |
| N22 | duplicate initial row | >1 `∅` row | R-INIT | D4 |
| N23 | forbidden synonym in identifier | 02 forbidden term used | L12 | E2 |
| N24 | restated invariant in note | 03 invariant text copied | L11 | E1 |
| N25 | upstream-03 self-inconsistency | References to an undeclared aggregate | §9 route→03 | (upstream) |
| N26 | upstream-02 inconsistency | `<Name>Status` enum with no `<Name>` aggregate in 03 | §9 route→02 | (upstream) |

### 4.5 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ1`–`AJ4` enumerated in §6. They run last, only over checks that survived all mechanical +
engine gates, and return enumerated verdicts only.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The 04 artifact owns five element sets: `tables`, `columns`,
`relationships (refs)`, `enums`, `transitions (rows)`. The intake count is:

```
intake = |tables| + Σ|table.columns| + |refs| + |enums| + Σ|transitionTable.rows|
```

The **edge / scenario count** the harness must walk (from §3.1 + §3.3):

```
edgesExpected = |aggregates03 roots|                       (R-ROOT)
              + |entity members|                           (R-MEMBER, FK-path)
              + |references03|                              (R-REF)
              + |enums|                                     (R-ENUM/X2)
              + |status entities|                           (R-STATUS)
              + |tables| + |columns| + |enums|              (R-NAME derivation)
              + |refs|                                      (R-FKTYPE)
              + |M:N relationships|                         (R-MN)
              + 1                                            (R-BIJECTION set-equality)
              + Σ|transition rows (≠∅)|                     (R-TFROM)
              + Σ|transition rows|                          (R-TEVENT)
              + |status entities|                           (R-INIT + R-REACH, per entity)
              + ENGINE: 1 (E-DDL) + |tables| (E-MINROW)
                       + |refs| (E-FK) + |enum columns| (E-ENUM)
                       + |tables with PK| (E-PK) + |junctions| (E-JUNCTION)
                       + |domain asserts| (E-DOMAIN)
```

The **engine scenario count** is reported separately in the summary (`counts.engine`) so the
strongest-oracle layer's coverage is visible: a `pass` with `counts.engine.total === 0` over a
model that *has* tables is itself a `broken-test` (the engine layer was skipped).

**Every owned element exercised ≥1 time.** The harness asserts:
- every `table` is touched by R-ROOT/R-MEMBER (mapping) or R-NAME, X3 (PK), E-MINROW (instantiable);
- every `column` is touched by L7 (snake_case), R-NAME, and — if enum-typed — E-ENUM, or — if
  an FK — R-FKTYPE + E-FK;
- every `ref` is touched by R-REF/R-FKTYPE and E-FK;
- every `enum` is touched by R-ENUM/X2 and E-ENUM (on its columns);
- every `transition row` is touched by R-TFROM/R-TEVENT and the per-entity R-INIT/R-REACH/X5.

**Reconciliation formula (X6 — no silently dropped checks):**

```
executedChecks = lintRun + engineRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected) && (executedChecks > 0) && (engineRun > 0 when tables>0)
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠ edgesExpected`
⇒ a check was silently dropped ⇒ `broken-test`. **If `tables > 0` but the engine layer ran zero
scenarios ⇒ `broken-test`** (the strongest oracle was skipped — never a vacuous green).

**Positive AND negative per claimed behavior.** Every behavior the artifact claims is proven by
**≥1 positive** (a passing check over the valid fixture / target) AND **≥1 negative** (a shipped
illegal fixture that must fail). The mapping (abbreviated; full ❌-reconciliation in the closing
table):

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Both files present | A1 | L1 over `valid.*` | `missing-transitions-file` |
| DBML parses | A2 | L2 over `valid.*` | `dbml-parse-error.dbml` |
| DDL exports + executes | A3 | E-EXPORT/E-DDL/E-MINROW over `valid.*` | `ddl-export-fails.dbml`, `bad-type-ddl.dbml` |
| Fingerprints in both, agreeing | A4/A5/A6 | L4/L5/L6 over `valid.*` | `missing/placeholder/mismatch-fingerprint.*` |
| Every table has a PK | B1 | L9/X3/E-PK over `valid.*` | `no-pk.dbml` |
| 1NF (no repeating groups) | B2 | L10 over `valid.*` | `array-column.dbml` |
| M:N via junction | B6 | R-MN/E-JUNCTION over `valid.*` | `missing-junction.dbml` |
| FK type matches PK | B7 | R-FKTYPE/E-FK over `valid.*` | `fk-type-mismatch.dbml` |
| Nullable FK documented | B8 | L13 over `valid.*` | `nullable-fk-undocumented.dbml` |
| snake_case singular names | B9 | L7/L8 over `valid.*` | `pluralized-table.dbml` |
| Root→table | C1 | R-ROOT over `valid.*` | `missing-root-table.dbml` |
| Entity-member→table+FK | C2 | R-MEMBER over `valid.*` | (member-no-fk variant) |
| References→FK | C4 | R-REF over `valid.*` | `reference-without-fk.dbml` |
| Enum verbatim + ordered | C5 | R-ENUM/X2/E-ENUM over `valid.*` | `enum-value-{extra,missing,reordered}.dbml` |
| Status typed by enum | C6 | R-STATUS over `valid.*` | `status-untyped.dbml` |
| No genuinely-invented entity | C9 | R-NAME over `valid.*` | `table-for-ghost-member.dbml` |
| Transition tables ↔ status entities | D1/E4 | R-BIJECTION/X4 over `valid.*` | `missing/extra-transition-table.md` |
| From/To are enum members | D2 | R-TFROM over `valid.*` | `transition-from-not-enum.md` |
| Event is verbatim 01 string | D3 | R-TEVENT over `valid.*` | `transition-event-paraphrased.md` |
| Single initial row | D4 | R-INIT over `valid.*` | `duplicate-initial-row.md` |
| Every value reachable | D5 | R-REACH over `valid.*` | `unreachable-enum-value.md` |
| No restated upstream text | E1 | L11 over `valid.*` | `restated-invariant-note.dbml` |
| No forbidden synonym | E2 | L12 over `valid.*` | `forbidden-synonym-id.dbml` |
| Upstream-03 sound | §9 | `valid.*`+sound pair | `broken-upstream-03` |
| Upstream-02 consistent | §9 | `valid.*`+sound pair | `inconsistent-upstream-02` |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a negative
entry above — the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; normal-form residue + cascade; closed verdict schema)

These catalog rules (or rule residues) are **inherently semantic** — they require domain
understanding the mechanical + engine layers cannot supply. Each runs only after mechanical
gates pass and returns an **enumerated verdict** (never prose). The harness records
`{id, verdict, ruleId}`; any verdict other than the rule's pass-verdict is reported at the
catalog severity. **There are no ❌ agent-judged checks** — every ❌ rule has its ❌ weight
carried by a mechanical or engine subset; the agent only judges the residue at its own
(⚠️/ℹ️) severity.

**Normal-form mechanization decision (the load-bearing call for B2/B3/B4).** Functional
dependencies are *not* recoverable from a schema's structure alone — a schema is a set of
columns + keys, and 2NF/3NF are statements about which non-key columns depend on which
determinants, which the structure does not encode. So the harness mechanizes only the
**structural heuristics** that *are* visible and leaves the genuine FD judgment to the agent:

- **1NF (B2) — fully mechanical.** Repeating groups are *structurally visible*: array/list
  column types and repeated-suffix columns (`phone1`, `phone2`). `L10` owns it as ❌; no agent
  judgment needed. (1NF is the one normal form the structure fully determines.)
- **2NF (B3) — heuristic mechanical + agent residue.** The harness mechanically flags the
  *necessary precondition* (a table with a **composite** PK and ≥1 non-key column — the only
  shape where a partial-key dependency can exist) as a **candidate** (ℹ️), then the agent judges
  whether a flagged non-key column actually depends on only part of the key. A single-column-PK
  table is mechanically 2NF-clean (no partial dependency possible) — no agent call. `AJ1`.
- **3NF (B4) — heuristic mechanical + agent residue.** The harness has no transitive-dependency
  signal from structure, so it surfaces every table with ≥2 non-key columns as a **candidate**
  (ℹ️, informational only) and the agent judges whether one non-key column determines another.
  `AJ2`. (B3/B4 are ❌ in the catalog, but their *detectable* form is a judgment; the catalog's
  ❌ severity is honored by reporting the agent's `violates-2nf`/`violates-3nf` verdict as an
  error finding — the mechanical layer cannot manufacture an FD it cannot see, so this is the
  one place where a ❌ rule's *detection* is agent-mediated. This is disclosed honestly as a
  tension in the report, not hidden: the harness cannot certify 2NF/3NF mechanically, so it
  cannot block on them mechanically; it blocks on the agent's verdict.)

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ1 | B3 (2NF residue) | whether a non-key column in a composite-PK table depends on only part of the key is a functional-dependency judgment the structure does not encode (the composite-PK precondition is mechanically flagged). | `{ full-dependency \| partial-dependency \| no-composite-key \| ambiguous }` |
| AJ2 | B4 (3NF residue) | whether a non-key column is determined by another non-key column (transitive) is an FD judgment invisible to structure (the ≥2-non-key-column candidate is mechanically flagged). | `{ no-transitive-dep \| transitive-dep \| ambiguous }` |
| AJ3 | B5 (BCNF/4NF advisory) | whether a determinant is a non-candidate-key, or independent multivalued facts are co-located — advisory, never blocking per catalog. | `{ bcnf-4nf-clean \| consider-decomposing \| ambiguous }` |
| AJ4 | C8 (cross-aggregate cascade) | whether an FK / `delete: cascade` forces a write spanning two 03-separated aggregate boundaries (the catalog marks it a judgment call) — the mechanical layer can detect a `delete: cascade` crossing a boundary, but whether the coupling is *legitimate* (a true containment) vs a smuggled cross-aggregate transaction needs the 03 policy context. | `{ within-boundary \| spans-aggregates-illegitimately \| policy-justified \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); it is reported as an ℹ️ finding, never
silently dropped, and never counts as a pass for reconciliation (it counts as executed,
verdict-recorded). No agent-judged check may emit free prose in an asserted position. The
mechanical preconditions for AJ1 (composite-PK detection), AJ2 (non-key-column count), and AJ4
(cascade-crosses-boundary detection) are computed by the harness and handed to the agent, so the
agent judges only the FD/legitimacy residue, never raw structure.

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order,
`checks[]`/`findings[]` sorted by `id`:

```json
{
  "skill": "erd",
  "artifact": { "dbml": "specs/04-erd.dbml", "transitions": "specs/04-transitions.md" },
  "upstream02": "specs/02-glossary.md",
  "upstream03": "specs/03-aggregates.md",
  "tooling": { "dbmlCore": "8.2.5", "pglite": "0.5.1", "postgres": "18.3", "node": ">=18" },
  "status": "pass | fail | malformed | broken-test",
  "counts": {
    "intake": { "tables": 0, "columns": 0, "refs": 0, "enums": 0, "transitionRows": 0 },
    "checks": { "lint": 0, "engine": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "engine": { "scenarios": 0, "passed": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "checks": [
    { "id": "L2", "class": "lint", "rule": "A2", "status": "pass" },
    { "id": "E-FK", "class": "engine", "rule": "B7", "status": "pass" },
    { "id": "R-ENUM", "class": "resolution", "rule": "C5", "status": "pass" },
    { "id": "AJ2", "class": "agent-judged", "rule": "B4", "verdict": "no-transitive-dep" }
  ],
  "findings": [
    { "id": "R-REF", "rule": "C4", "severity": "error", "class": "upstream-defect", "upstream": "03-aggregates.md", "detail": "References row targets aggregate 'Invoice' not declared in 03" }
  ]
}
```

- The optional `class: "upstream-defect"` + `upstream: "<file>"` on a finding routes a 02- or
  03-origin defect (§9). It does **not** add a status; the status stays `fail` (taxonomy closed).
- **stderr** — human-readable diagnostics only (parser throws, DDL errors with the offending
  SQL line + SQLSTATE, per-check failure traces, the wrong-reason trap explanation, the
  upstream-defect routing note naming which file to fix, the missing-engine install command).
  Never the machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. `1` = `fail` (incl. `upstream-defect`). `2` =
  `malformed` (04 unparseable — `.dbml` throws or `.md`/file shape broken). `3` = `broken-test`
  (check threw, wrong-reason, reconciliation mismatch, zero checks, unparseable 02/03 upstream,
  **or missing engine**). The distinct codes let CI separate a wrong 04 (`1`), a shapeless 04
  (`2`), and a broken harness/fixture/missing-engine (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`.

## 8 — Determinism (doctrine §6; engine-value exclusion)

Running a real engine is the determinism risk this skill must manage — engines mint serial ids,
timestamps, and `now()`. The harness keeps every engine-generated value **out of asserted
positions**:

- **Assertions are over counts, violation classes, and SQLSTATE codes — never generated
  values.** `E-FK` asserts "INSERT rejected with SQLSTATE `23503`", not the row's serial id;
  `E-PK` asserts "second INSERT rejected with `23505`", not the timestamp; `E-MINROW` asserts
  "INSERT affected 1 row", not the returned id. No `SELECT` of an auto-generated id/timestamp
  ever feeds an assertion. Domain asserts (`E-DOMAIN`) declare `expect: {rowCount}` or
  `expect: {class}`, never a literal generated value.
- **Seed values are derived deterministically from column types** (`int`→`1,2`; `varchar`→`'a'`;
  enum→its first 02 value), never `random()` or `now()`. If a column defaults to `now()` (as in
  the fixture oracle), the harness neither supplies nor asserts it — it is left to the engine
  and never read back.
- **Fresh in-memory PGlite per run** (`new PGlite()`, no persisted data dir); nothing carries
  between runs. A re-run over byte-identical inputs is **byte-identical output** (stable key
  order, sorted `checks[]`/`findings[]` by `id`, engine assertions on stable classes/codes).
- **Pinned engine versions** (`@dbml/core` 8.2.5, PGlite 0.5.1 / PG 18.3) recorded in the
  `tooling` block: SQLSTATE codes and DDL-export form are version-stable, so the asserted
  positions do not drift across machines running the locked tree.
- The fingerprint digests are **read from the artifacts** and only shape-checked (L4–L6) — the
  harness never recomputes a sha256 and asserts equality (that would inject an engine value); it
  checks shape + cross-file agreement and resolves references against the files actually passed.
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the reconciliation
  arithmetic and their verdicts are recorded, not invented into counts — so the **pass/fail
  mechanical+engine verdict remains byte-deterministic** regardless of agent output.

## 9 — Upstream-defect routing (how a 02/03 defect is reported without patching around it)

04 is validated *against* two upstreams. Five upstream conditions are distinguished across the
two files; the harness **never silently repairs or works around** a bad upstream — it surfaces
the defect and routes it to the file that owns the fix:

1. **Sound upstreams.** Both 02 and 03 parse against their pinned formats AND are
   self/mutually consistent **in the ways erd can legitimately see from 02+03 alone**
   (every 02 enum has a non-empty, blank-free value table; every `### <Name>Status` enum's
   `<Name>` matches a `### <Name>` aggregate in 03; every 03 References target is a declared
   03 aggregate; every 03 member's `02 Term` resolves to a 02 Term). The 04→02/03 resolution
   checks run normally; a failure is a **04 defect** → `fail`, ordinary finding.

   **erd never receives 01, so it does NOT re-verify what only 01 can settle.** In
   particular, whether a 02 enum value's `Derived from event` cell is a real 01 event is a
   check **single-owned by the GLOSSARY skill's own harness** (its catalog D6/F3 — exact 01
   provenance) and re-verified suite-wide by the drift police. erd cannot see 01 and so must
   not invent a stricter 02 contract; the `Derived from event` strings are consumed (for the
   D3/R-TEVENT transition-event match, where 04's own transition table must quote them
   verbatim) but never re-validated against 01.

2. **Well-formed but self-inconsistent 03** (`upstream-defect` → 03). 03 parses, but e.g. a
   References row targets an aggregate 03 never declares, or a boundary member's `02 Term` is
   absent from the parsed model. A naive reading might blame 04's missing FK/table. Instead the
   harness runs a **pre-resolution 03 self-check** (every References target ∈ declared
   aggregates; every member's `02 Term` ∈ 02 Terms) before the 04→03 checks; on failure the
   finding is tagged `class: "upstream-defect"`, `upstream: "03-aggregates.md"`. Status `fail`,
   exit `1`; the fix routes **upstream to the aggregates artifact**. Proven by
   `valid.*` + `broken-upstream-03`.

3. **Well-formed but 02-inconsistent 02** (`upstream-defect` → 02). 02 parses, but is
   inconsistent in a way erd **can see from 02+03 alone** — a `### <Name>Status` lifecycle enum
   whose `<Name>` matches **no `### <Name>` aggregate in 03** (02 declares a lifecycle for an
   aggregate the model has none of, so a correct 04 would have no table to carry that enum's
   status column). The harness runs a **02 self-check** (every enum has a non-empty, blank-free
   value table) AND a **02↔03 cross-check** (every `<Name>Status` enum's `<Name>` is a declared
   03 aggregate) **before** R-ENUM; on failure the R-ENUM finding is tagged
   `class: "upstream-defect"`, `upstream: "02-glossary.md"` (02 owns the enum). Status `fail`,
   exit `1`; the fix routes **upstream to the glossary artifact**. Proven by `valid.*` +
   `inconsistent-upstream-02` (an `### InvoiceStatus` enum with no `Invoice` aggregate in 03).

   **What this case is NOT.** erd does **not** flag a value whose `Derived from event` is not a
   02 Term (the real glossary's Terms own actors/aggregates/value concepts, **never** events;
   event provenance is the glossary harness's own single-owned 01 check — see case 1). An
   earlier design of this harness wrongly required every enum value's `Derived from event` to
   appear in 02's `## Terms` as an owned 01 element; that invented a stricter 02 contract than
   the glossary actually has and fired on every real enum value. It is removed: erd verifies
   only the 02-internal shape + the 02↔03 cross-edge it can actually see.

4. **Unparseable 02** (`broken-test`, not `upstream-defect`). 02 does not parse against the
   pinned format (a required heading/table absent — e.g. `## Forbidden Synonyms` missing, so the
   L12 scan list and the term/enum targets cannot be built). The harness cannot anchor any 02
   resolution target, so it cannot make a trustworthy statement about 04. Status `broken-test`,
   exit `3`, stderr "upstream 02 unparseable." Proven by `valid.*` + `malformed-upstream-02`.

5. **Unparseable 03** (`broken-test`). Symmetric to (4) for 03 — e.g. `## Aggregates` absent so
   roots/members/references cannot be built. Status `broken-test`, exit `3`. Proven by
   `valid.*` + `malformed-upstream-03`.

The splits are deliberate: `upstream-defect` (cases 2–3) is an actionable content finding routed
to the *correct upstream owner* (02 vs 03) while keeping the §2 status set closed; `broken-test`
(cases 4–5) is the harness honestly refusing to emit a verdict it cannot justify. No case lets
the harness paper over an upstream by inferring, substituting, or skipping the missing element.

---

*This contract mechanizes catalog rules A1–A6 / B1–B9 / C1–C9 / D1–D7 / E1–E4. **Mechanical /
engine ❌ coverage is complete:** every ❌-severity catalog rule has BOTH (a) a mechanical or
engine owner check and (b) a dedicated negative fixture. The full reconciliation (❌ rule →
owner check → negative fixture):*

| ❌ rule | Owner check | Negative fixture |
|---|---|---|
| A1 | L1 | `missing-transitions-file` |
| A2 | L2 | `dbml-parse-error.dbml` |
| A3 | E-EXPORT / E-DDL / E-MINROW | `ddl-export-fails.dbml` / `bad-type-ddl.dbml` |
| A4 | L4 | `missing-fingerprint.*` |
| A5 | L5 | `placeholder-fingerprint.*` |
| A6 | L6 | `fingerprint-mismatch.*` |
| B1 | L9 / X3 / E-PK | `no-pk.dbml` |
| B2 | L10 | `array-column.dbml` |
| B6 | R-MN / E-JUNCTION | `missing-junction.dbml` |
| B7 | R-FKTYPE / E-FK | `fk-type-mismatch.dbml` |
| B9 | L7 / L8 | `pluralized-table.dbml` |
| C1 | R-ROOT | `missing-root-table.dbml` |
| C2 | R-MEMBER | (member-no-fk variant) |
| C4 | R-REF | `reference-without-fk.dbml` |
| C5 | R-ENUM / X2 / E-ENUM | `enum-value-{extra,missing,reordered}.dbml` |
| C6 | R-STATUS / E-ENUM | `status-untyped.dbml` |
| C9 | R-NAME | `table-for-ghost-member.dbml` |
| D1 | R-BIJECTION / X4 | `missing-transition-table.md` / `extra-transition-table.md` |
| D2 | R-TFROM | `transition-from-not-enum.md` |
| D3 | R-TEVENT | `transition-event-paraphrased.md` |
| D4 | R-INIT | `duplicate-initial-row.md` |
| D5 | R-REACH | `unreachable-enum-value.md` |
| E1 | L11 | `restated-invariant-note.dbml` |
| E2 | L12 | `forbidden-synonym-id.dbml` |
| E4 | X4 / R-BIJECTION | `missing-transition-table.md` |

*(B3/B4 are ❌ normal-form rules whose **detection** is agent-mediated — see §6: 1NF (B2) is
fully mechanical (L10), but 2NF/3NF are functional-dependency judgments the structure cannot
encode, so the harness mechanically flags the structural precondition (composite-PK / ≥2-non-key
candidates, ℹ️) and the agent's `partial-dependency`/`transitive-dep` verdict is reported as the
❌ finding. This is the one disclosed tension where a ❌ rule's detection is not purely
mechanical. B5/B8/C3/C7/C8/D6/D7 are ⚠️/ℹ️ rules: each still carries a mechanical or engine owner
(AJ3/L13/C3-mech/R-NAME/AJ4/X5/L15) and, where a behaviour can fail concretely, a negative
fixture — e.g. B8 is proven by `nullable-fk-undocumented.dbml`, D6 by an unconnected-`From` variant,
D7 by a mis-ordered-rows variant. C7's borderline-naming concern is surfaced (not blocked) by the
same R-NAME owner; its hard case — a genuinely-invented entity tracing to no upstream owner — is
split out as **C9 ❌** and proven by `table-for-ghost-member.dbml`. The selftest's COVERAGE
array asserts the positive+negative floor over the §5 table and fails if any ❌ rule lacks either
side. Agent-judged checks cover only the 2NF/3NF FD residue, the BCNF/4NF advisory, and the C8
cascade-legitimacy residue, with closed verdict schemas. Pass = status `pass` = zero ❌ findings,
reconciled, ≥1 check executed, engine layer non-empty.*
</content>
</invoke>
