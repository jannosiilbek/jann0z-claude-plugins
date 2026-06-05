---
name: gherkin
description: >-
  Step 6 of the schema-therapy modelling pipeline (the domain-behavior layer) —
  produces specs/06-gherkin/<aggregate>.feature, one .feature per 03 aggregate,
  each scenario tagged to its upstream obligation (invariant / transition /
  terminal / policy / authz). Trigger ONLY inside the schema-therapy pipeline:
  "run schema-therapy step 6", "produce 06-gherkin", "write the gherkin/feature
  files from the model", "do the gherkin step of the modelling pipeline". NOT a
  general Gherkin / BDD / Cucumber-authoring tool — owns only this pipeline
  artifact.
---

# gherkin

Step 6 of the **schema-therapy** modelling pipeline — the domain-behavior
artifact. It turns the modelled domain into one executable BDD feature file per 03
aggregate:

- `specs/06-gherkin/<aggregate>.feature` — one `.feature` per 03 aggregate
  (`<aggregate>` = `snake_case` of the exact 03 `### <AggregateName>`, e.g.
  `Order` → `order.feature`, `PurchaseOrder` → `purchase_order.feature`).

06 **never edits** upstream, and downstream consumes it **by tag only**: **08
task-models** sequences scenarios by tag and **10 flow-acceptance** binds step outcomes
to scenario tags — both by **exact string**, so the tag grammar is a published contract.
Each scenario is tagged to exactly one upstream obligation it discharges; the file
references upstream by exact string and **never restates** a 02 enum definition, a 03
invariant text, or a 04/05 row beyond exercising the required transition.

This skill owns only the **Gherkin structure derived via the pinned conventions** — and
nothing else. It does not define Terms / enums / forbidden synonyms (02), invariants /
aggregates / policies (03), the transition rows (04), or the lifecycle machines (05). It
does **not** claim general Gherkin / BDD / Cucumber-authoring territory — other ground
owns that; every trigger is scoped to this one pipeline step.

**Inputs:** `specs/01-event-storming.md` (actor bindings + actor kinds — the B7
authorization-obligation source), `specs/02-glossary.md`, `specs/03-aggregates.md`,
`specs/04-erd.dbml` **AND** `specs/04-transitions.md`, plus
`specs/05-statecharts/*.scxml` **when emitted**.
**Output:** `specs/06-gherkin/<aggregate>.feature` per 03 aggregate.

**Lifecycle-authority rule (binding).** For an entity **promoted** to 05, that
`<entity>.scxml` is the lifecycle authority and its 04 table is **superseded**; for
every **non-promoted** entity, the 04 transition table is the authority. A scenario MUST
exercise transitions from the authoritative source and MUST NOT assert a `From→To` the
authority does not contain. The harness selects `05-if-promoted-else-04` per entity and
records the choice in its `authority` block.

Two binding contracts live beside this file. **Load each only at the stage that needs
it** (progressive disclosure):

- `references/validation-rules.md` — the closed rule catalog (33 rules — see the
  catalog's theme index, the review vocabulary). Load at **Draft** and **Professor**.
- `references/simulation.md` — the executable harness contract (the `@cucumber/gherkin`
  parse+compile oracle + mechanical reader). Load it only to interpret a `malformed` /
  `broken-test` / `upstream-defect` result.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them: the
`gherkin.berp` grammar + `gherkin-languages.json`, the cucumber.io reference docs, and
`sources/testdata/{good,bad}/`). **The pinned `@cucumber/gherkin` 39.1.0 reference
parser + pickle compiler is the executable ground truth** — every `.feature` is PARSED
and COMPILED to pickles on it.

## a. Mechanical intake table

Map the upstream elements mechanically into the Gherkin via the **pinned conventions** —
**carry element names through unchanged; reference content, never copy it. Never invent
a state/entity/event, never drop a coverage obligation.**

| Upstream element | This artifact's element | Rule |
|------------------|-------------------------|------|
| A 03 `### <AggregateName>` | a `<aggregate>.feature` file; `Feature:` line = the exact 03 name verbatim | A1 / A2 / A3 |
| A 03 invariant `INV-<Agg>-<n>` | ≥1 scenario tagged `@invariant:INV-<Agg>-<n>` whose `When` attempts the **forbidden** action and `Then` asserts rejection | B1 |
| An **authoritative** transition (05 scxml if promoted, else 04 row) | ≥1 happy-path scenario tagged `@transition:<entity>`: `Given` the `From` state, `When` embeds the exact 01 event, `Then` the `To` state | B2 |
| An **authoritative** terminal state (no outgoing transition / `<final>`) | a negative scenario tagged `@terminal:<entity>`: `Given` the terminal state, `When` a further event, `Then` rejected / unchanged | B3 |
| A 03 `## Cross-Aggregate Policies` row | ≥1 scenario tagged `@policy:<PolicyName>`; **eventual** mode ⇒ `Then eventually <consequence>` | B4 |
| An **authoritative** non-creation transition event bound in 01 to a **human** actor (kind `person`/`role`), where 01 defines ≥1 **other** human actor | one negative scenario tagged `@authz:<entity>`: `Given` the from-state, `When` a **different** 01 human actor attempts the exact 01 event, `Then` the attempt is rejected. System/scheduler-bound and unbound events are **exempt** — never invent a rejection the domain doesn't imply | B7 |
| A 02 `Term` / `### <Aggregate>Status` enum value | the verbatim step language (domain concept / lifecycle state) | D1 / D2 |
| A 01 event string (the 04 `Event` cell) | embedded **verbatim** as a literal substring in the `When` step | D3 |

**Event-phrasing convention (the ONE pinned form).** A `@transition`/`@policy`/`@authz` `When`
contains the **exact 01 event string** as a literal substring, in domain words — e.g.
for event `Order Placed`: `When the Order Placed event occurs`. No transform variant.

**Tag grammar (closed).** Exactly **one** source tag per scenario, from
`@invariant:INV-<Agg>-<n>` / `@transition:<entity>` / `@terminal:<entity>` /
`@policy:<PolicyName>` / `@authz:<entity>` (`<entity>` = snake_case 04/05 stem;
`<PolicyName>` whitespace→`_`). No other namespace; tags carry no whitespace
(parser-rejected).

**This table doubles as the downstream drift contract — 08 and 10 bind to the scenario
tags it pins; the harness verifies the table *in reverse*:** every 03 aggregate resolves
to a file, every invariant/authoritative-transition/terminal/policy/actor-bound-event
obligation to a tagged scenario, every `When` embeds its exact 01 event, every
state/Term to its 02 owner.

## b. Artifact contract (directory + fingerprints + authority)

- **Directory:** `specs/06-gherkin/` (flat `specs/` root in the working project, not
  inside this skill). **Exactly one** `.feature` per 03 aggregate — no more, no fewer
  (A1) — named `<snake_case(03 name)>.feature` (A2). One `Feature:` per file (grammar);
  its name text = the exact 03 `### <AggregateName>` verbatim (A3).
- **Fingerprint block (A4):** a **leading** `# fingerprints:` comment block **before**
  the `Feature:` line (Gherkin comments are legal only at the start of a line), listing
  ALL consumed upstreams, one `<file>@sha256:<64-hex>` per line — always the five base
  upstreams `01-event-storming.md`, `02-glossary.md`, `03-aggregates.md`, `04-erd.dbml`,
  `04-transitions.md`, **plus** each `05-statecharts/<entity>.scxml` this feature's
  scenarios consume. Recompute on every regeneration:
  `shasum -a 256 specs/01-event-storming.md specs/02-glossary.md specs/03-aggregates.md specs/04-erd.dbml specs/04-transitions.md specs/05-statecharts/<entity>.scxml`.
- **Authority rule (binding, §b above):** judge each entity's transition/terminal
  coverage against `05-if-promoted-else-04`. When 05 was **not** emitted, do **not**
  fingerprint any `05-statecharts/*.scxml` and do **not** assert a supersedes-only edge
  — a feature claiming a 05 authority the run cannot verify is a `fail` (N-05ABSENT).
- **Canon (C-theme):** declarative domain language (no UI mechanics — "click", "the page
  shows"); one behavior per scenario; exactly one `When`; `Given`=context, `Then`=
  assertion only (no actions in `Then`); `Background` holds only shared `Given`s.
- **DRY (E-theme):** never restate a 03 invariant's rule text, never dump an enum's full
  value set, never reproduce a 04/05 transition table in a comment/Examples; reference
  upstream by tag/id only. Never use a 02 forbidden synonym anywhere.

## c. The 6-step pipeline

Run these in order. The harness is the **sole executable pass/fail authority**.

1. **Draft.** For each 03 aggregate, build `<aggregate>.feature` from the intake table
   (§a) and artifact contract (§b): the fingerprint block, the `Feature:` line, one
   tagged scenario per invariant / authoritative transition / terminal / policy /
   actor-bound-event authorization obligation (B7). Decide
   each entity's authority (`05-if-promoted-else-04`). Load
   `references/validation-rules.md`.

2. **Professor gate** (bounded ≤ 5 rounds). Review against the catalog. **The professor
   OWNS the closed agent-judged verdicts** the mechanical layer cannot supply, each with
   a **closed verdict schema** (never prose): `AJ-VIOLATE` (does the `@invariant:` `When`
   perform the invariant-**violating** action vs a permitted one?), `AJ-DECL` (declarative
   domain language vs imperative UI coupling beyond the verb blocklist), `AJ-EVENTUAL`
   (is the `Then eventually …` consequence the genuine eventual target-aggregate effect?),
   `AJ-CONJ` (does a `When … And <x>` smuggle a second action?). The harness flags the
   *shape* and hands the *semantic* residue to the professor. Fix or justify each.

3. **Lint = the harness.** Run it (§ below). A `malformed` (a `.feature` the parser
   rejects) means fix the Gherkin shape before anything else.

4. **Simulation = the SAME harness** (one invocation does parse+compile oracle +
   mechanical reader + cross-artifact resolution + the 05-authority logic). Route on the
   result:

   | Result | Meaning | Action |
   |--------|---------|--------|
   | `pass` (exit 0) | all checks green, reconciled, engine non-empty | proceed to step 5 |
   | `fail` (exit 1), ordinary finding | a 06 defect (coverage gap, bad tag, drift, N-05ABSENT) | fix 06, re-run |
   | `fail` (exit 1), `class:"upstream-defect"` | a 02/03/04 defect surfaced through 06 | **STOP** — fix the named upstream file, do not patch 06 around it |
   | `malformed` (exit 2) | a `.feature` the parser rejects (matched to a `testdata/bad` oracle) | fix the Gherkin, re-run |
   | `broken-test` (exit 3) | unparseable upstream / unreadable 05, missing parser, or reconciliation failure | fix the harness/env or unparseable upstream; never treat as a pass |

5. **Final DRY + semantic drift.** Re-read every emitted file: no restated invariant
   text, no enum dumps, no transition-table dumps, no forbidden synonyms; every scenario
   references upstream only by its tag. Confirm the intake table (§a) resolves in reverse
   for every obligation (every invariant / transition / terminal / policy / B7
   authorization obligation has its tagged scenario; every `When` embeds its exact 01
   event).

6. **Emit + a fixed-format report.** Emit the files. The report must include a
   **coverage-by-source table** (counts of invariants / transitions / terminals /
   policies / authz obligations, each covered? + the authority each entity was judged against) and
   `Iterations to convergence: N`. Then hand off to **drift-police** as an invocation
   (the schema-therapy drift agent re-verifies the §a contract across artifacts,
   including the tag bindings 08 and 10 rely on).

## Running the harness

```
node scripts/harness.mjs specs/06-gherkin \
  --upstream-01 specs/01-event-storming.md \
  --upstream-02 specs/02-glossary.md \
  --upstream-03 specs/03-aggregates.md \
  --upstream-04-dbml specs/04-erd.dbml \
  --upstream-04-transitions specs/04-transitions.md \
  [--upstream-05 specs/05-statecharts]
```

- **`--upstream-05` is optional and load-bearing.** Present ⇒ promoted entities are
  judged against the scxml graph (incl. transitions beyond the 04 table); absent ⇒ all
  entities judged against 04, and the harness asserts no feature claims a 05 fingerprint
  (N-05ABSENT). The `authority` block in the summary records the source per entity
  (`05-scxml` / `04-table`).
- **The parser is the strongest oracle:** every `.feature` is PARSED on
  `@cucumber/gherkin` 39.1.0 to an AST AND COMPILED to pickles. Parse-clean + a
  **non-empty** pickle set is the instantiation assertion (a `Feature:` with no scenario
  compiles to zero pickles ⇒ **vacuous** ⇒ `fail` W-INST). A parse throw ⇒ `malformed`,
  its message matched byte-for-byte against the `testdata/bad` oracle. Compiled ids are
  minted by `IdGenerator.incrementing()` but **never asserted** — only pickle count /
  names / tags / step types are, so re-runs are byte-identical.
- **Self-installing:** on first run the harness installs its pinned deps
  (`@cucumber/gherkin` 39.1.0, `@cucumber/messages` 32.3.1, `@dbml/core` 8.2.5) into
  `scripts/node_modules` (`npm ci`, falling back to `npm install`). **Deps absent +
  offline ⇒ `broken-test` (exit 3)** with a stderr install command — it refuses to
  certify rather than degrade to a regex-only verdict.
- **Output:** a stable JSON summary on stdout (status, authority block, counts,
  per-check results, findings); human diagnostics on stderr. Exit `0` pass / `1` fail /
  `2` malformed / `3` broken-test.
- **Self-test:** `node scripts/selftest.mjs` runs the harness over every shipped fixture
  (in its pinned run-mode) and asserts the exact status + owner-check + authority records
  + the parse-negative error shapes + the wrong-reason-trap isolation + the N-05ABSENT
  guard + the authority switch + engine honesty + determinism + the coverage floor.
