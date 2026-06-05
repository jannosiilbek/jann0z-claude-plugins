---
name: erd
description: >-
  Step 4 of the schema-therapy modelling pipeline — produces the two-file 04
  artifact specs/04-erd.dbml (DBML data model) PLUS specs/04-transitions.md (a
  transition table per lifecycle entity). Trigger ONLY inside the schema-therapy
  pipeline: "run schema-therapy step 4", "produce 04-erd.dbml", "build the
  schema-therapy ERD from 02+03", "do the erd step of the modelling pipeline".
  NOT a general data-modelling / DBML / database-design tool — owns only this
  pipeline artifact.
---

# erd

Step 4 of the **schema-therapy** modelling pipeline. It turns the validated
`specs/02-glossary.md` **and** `specs/03-aggregates.md` into **one artifact that
spans two files emitted together**:

- `specs/04-erd.dbml` — a DBML data model (tables, columns, enums, relationships,
  primary/foreign keys).
- `specs/04-transitions.md` — a markdown companion holding a transition table for
  every entity with a lifecycle (a status enum column), which DBML cannot express.

Both files share one fingerprint set and **pass/fail together**. This skill owns
only the **schema vocabulary derived via the pinned mapping** — and nothing else.
It does not coin terms or enums (02 owns those), define aggregate roots / invariants
/ policies (03 owns those), draw statecharts (05), or write scenarios (06). It does
**not** claim general data-modelling / DBML / database-design territory — other
plugins own that ground; every trigger is scoped to this one pipeline step.

**Inputs:** `specs/02-glossary.md` **AND** `specs/03-aggregates.md`.
**Output:** `specs/04-erd.dbml` **AND** `specs/04-transitions.md`.

Two binding contracts live beside this file. **Load each only at the stage that
needs it** (progressive disclosure):

- `references/validation-rules.md` — the closed rule catalog (35 rules — see the
  catalog's theme index, the review vocabulary). Load at **Draft** and
  **Professor**.
- `references/simulation.md` — the executable harness contract (the three-layer
  engine oracle). You do not need it to run the harness; load it only to interpret a
  `malformed` / `broken-test` / `upstream-defect` result.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them: Codd 1970,
Chen 1976, Kent 1983, the DBML docs, the DBML→Postgres fixture pair). Cite them
only when the professor demands a passage. **The `@dbml/core` 8.2.5 parser and
PGlite 0.5.1 / PostgreSQL 18.3 are the executable ground truth** over the prose docs.

## a. Mechanical intake table

The upstream inputs are `specs/02-glossary.md` (owns Terms, enum names + values +
order, forbidden synonyms) and `specs/03-aggregates.md` (owns aggregate roots,
boundary members + kinds, invariants, references, policies). Map their elements
mechanically into this artifact via the **pinned conventions** —
**carry element names through the pinned mapping; reference content, never copy it.
Never invent an entity, never drop a 03 root.**

| Upstream element | This artifact's element | Rule |
|------------------|-------------------------|------|
| A 03 aggregate **Root** | a `Table` named `snake_case(<root>)`, **singular**, with a primary key | C1 / B1 / B9 |
| A 03 `Kind=entity` boundary member | a `Table` (snake_case, singular) with an FK path to its root's PK | C2 |
| A 03 `Kind=value object` member | inline columns on the owner, or an owned table keyed under the owner | C3 |
| A 03 `References` row (`Target aggregate \| Identity field held`) | an FK to the target root's PK (direct, or via a junction table for an M:N) | C4 |
| A 02 `<Name>Status` enum | a DBML `Enum <snake_case(name)>` with values **verbatim, in 02 order** | C5 |
| A 02 enum on a lifecycle entity | a `status` column typed by that DBML enum | C6 |
| A 02 enum value's `Derived from event` (exact 01 string) | a transition-table `Event` cell (verbatim) | D3 |

**This table doubles as the downstream drift-check contract:** the harness verifies
it *in reverse* — every 03 root resolves to a table, every `References` row to an FK,
every 02 enum to a DBML enum with verbatim ordered values, every status column to its
enum, every transition `Event` to a 02 derivation string. (05 / 06 re-derive their own
checks from the same mapping.)

## b. Artifact contract (BOTH files + fingerprints)

- **Paths:** `specs/04-erd.dbml` **AND** `specs/04-transitions.md` (flat `specs/`
  root in the working project, not inside this skill). **Emit both together** — 04 is
  one artifact across two files (A1).
- **Naming (pinned):** tables + columns `snake_case`; tables **singular**
  (`work_order`, not `work_orders`). Enum name = `snake_case` of the 02 enum name;
  values copied verbatim in 02's order. Status column is always named `status`.
- **Fingerprint blocks appear in BOTH files**, listing the sha256 over the exact bytes
  of each upstream input:
  - in `.dbml`: `// fingerprints:` comment lines.
  - in `.md`: an HTML comment `<!-- fingerprints: -->` block.
  - each lists `02-glossary.md@sha256:<64-hex>` AND `03-aggregates.md@sha256:<64-hex>`;
    the two files' digests **must agree** (A4–A6). Recompute on every regeneration:
    `shasum -a 256 specs/02-glossary.md specs/03-aggregates.md`.
- **transitions.md format (pinned):** one `## Transition Tables` H2, then a
  `### <TableName>` block per lifecycle entity, each a markdown table
  `From | Event (exact 01 string) | To`. `From`/`To` ∈ that entity's 02 enum values;
  the **initial-state row** uses `From = ∅`. Rows sorted by `(From in 02 enum order,
  then To in 02 enum order)`, the `∅` row first (D2/D4/D7).
- **Statechart gate (pinned):** 04 owns a transition table for **every** lifecycle
  entity. Downstream, **05 may supersede a per-entity table by declaration in 05** —
  **04 is NEVER edited for that.** 06 references 04's entities/relationships.
- **DRY:** never restate a 02 definition, a 03 invariant rule, or a 03 policy text in a
  DBML `note` or transitions prose; reference upstream by name (E1/E3). Never use a 02
  forbidden synonym in any identifier or note (E2).

### Draft-time scenario authoring (`specs/04-scenarios.json`)

Optionally ship a **domain scenario file** the harness runs on the live PGlite engine —
the *domain* counterpart to its generic structural probes. Derive it from 03 invariants;
**deterministic only — no clock/random values** (the harness keeps engine-minted ids and
timestamps out of every asserted position).

Pinned shape (shape-validated by the harness; a violation ⇒ `malformed`):

```json
{ "seeds":   [ { "table": "order", "row": { "id": 1, "status": "placed" } } ],
  "asserts": [ { "query": "SELECT 1 FROM \"order\" WHERE status = 'placed'",
                 "expect": { "rowCount": 1 } } ] }
```

One happy-path seed per aggregate root (honoring its invariants) plus one assertion
query per 03 invariant. `expect` declares `{ rowCount }` or `{ class }` — **never a
literal engine-generated value**. A model with zero domain scenarios still gets the full
generic `E-*` engine battery (no vacuous engine pass).

## c. The 6-step pipeline

Run these in order. The harness is the **sole executable pass/fail authority**.

1. **Draft.** Build both files from the intake table (§a) and artifact contract (§b,
   incl. the scenario-authoring subsection). Load `references/validation-rules.md`.

2. **Professor gate** (bounded ≤ 5 rounds). Review against the catalog. **The professor
   OWNS the blocking 2NF/3NF (B3/B4) and C8 cascade judgments** that the harness can only
   *flag*: the harness emits mechanical precondition flags as **non-blocking
   needs-judgment records** (`AJ1` 2NF composite-PK candidate, `AJ2` 3NF ≥2-non-key
   candidate, `AJ3` BCNF/4NF advisory, `AJ4` C8 cascade crossing) with **closed verdict
   schemas** — functional dependencies are not recoverable from schema structure, so the
   *blocking* verdict (`partial-dependency` / `transitive-dep` /
   `spans-aggregates-illegitimately`) is the professor's to render here, not the
   harness's. Decide each flag; fix or justify.

3. **Lint = the harness.** Run it (§ below). A `malformed` (unparseable `.dbml` or wrong
   transitions shape or a missing file) means fix the shape before anything else.

4. **Simulation = the SAME harness** (one invocation does lint + engine + resolution).
   Route on the result:

   | Result | Meaning | Action |
   |--------|---------|--------|
   | `pass` (exit 0) | all checks green, reconciled, engine non-empty | proceed to step 5 |
   | `fail` (exit 1), ordinary finding | a 04 defect | fix 04, re-run |
   | `fail` (exit 1), `class:"upstream-defect"` | a 02/03 defect surfaced through 04 | **STOP** — fix the named upstream file, do not patch 04 around it |
   | `malformed` (exit 2) | 04 `.dbml`/`.md` shape broken | fix 04 shape, re-run |
   | `broken-test` (exit 3) | unparseable upstream, missing engine, or reconciliation failure | fix the harness/env or the unparseable upstream; never treat as a pass |

5. **Final DRY + semantic drift.** Re-read both files: no restated upstream text, no
   forbidden synonyms, every note references upstream by name. Confirm the intake table
   (§a) resolves in reverse.

6. **Emit both files + a fixed-format report.** Report must include
   `Iterations to convergence: N`. Then hand off to **drift-police** as an invocation
   (the schema-therapy drift agent re-verifies the §a contract across artifacts).

## Running the harness

```
node scripts/harness.mjs specs/04-erd.dbml \
  --transitions specs/04-transitions.md \
  --upstream-02 specs/02-glossary.md \
  --upstream-03 specs/03-aggregates.md \
  [--scenarios specs/04-scenarios.json]
```

- **Self-installing:** on first run the harness installs its pinned engine deps
  (`@dbml/core` 8.2.5, `@electric-sql/pglite` 0.5.1) into `scripts/node_modules`.
  **Deps absent + offline ⇒ `broken-test` (exit 3)** with a stderr install command — it
  refuses to certify the artifact rather than degrade to a parse-only verdict.
- **The engine is the strongest oracle:** it parses the DBML under `@dbml/core`, exports
  Postgres DDL, runs that DDL on a **fresh in-memory PGlite (PostgreSQL 18.3)**, and
  exercises mechanically-derived scenarios (FK orphan ⇒ SQLSTATE 23503, bad enum ⇒ 22P02,
  duplicate PK / junction pair ⇒ 23505, every table instantiable) plus your domain seeds.
  Assertions are over **counts / violation classes / SQLSTATE codes only** — never
  engine-minted ids — so re-runs are byte-identical.
- **Output:** a stable JSON summary on stdout (status, counts, per-check results,
  findings); human diagnostics on stderr. Exit `0` pass / `1` fail / `2` malformed /
  `3` broken-test.
- **Self-test:** `node scripts/selftest.mjs` runs the harness over every shipped fixture
  quadruple and asserts the exact status + owner-check + engine-enforcement + determinism.
