---
name: statecharts
description: Step 5 of the schema-therapy modelling pipeline — a CONDITIONAL artifact. Use this to promote each gate-passing lifecycle entity from its specs/04-transitions.md table into an executable SCXML state machine at specs/05-statecharts/<entity>.scxml, declaring in-document that it supersedes that 04 table (04 is NEVER edited). Trigger ONLY inside the schema-therapy pipeline: "run schema-therapy step 5", "produce 05-statecharts", "build the statecharts from 04", "do the statechart step of the modelling pipeline". Consumes specs/01–04 (event names, enums, aggregates, transition tables); downstream 06 consumes 05 where an entity was promoted, else the 04 table. When NO entity passes the gate, emit NOTHING and record the gate decision. NOT a general statechart / XState / SCXML-authoring tool — adjacent ground is owned elsewhere; this skill owns only the schema-therapy 05 artifact at this one pipeline step.
---

# statecharts

Step 5 of the **schema-therapy** modelling pipeline, and the pipeline's only
**conditional** artifact. It promotes each lifecycle entity that passes the
**statechart gate** from its `specs/04-transitions.md` table into one executable
SCXML state machine:

- `specs/05-statecharts/<entity>.scxml` — one SCXML document per gate-passing entity
  (`<entity>` = the exact 04 `### <TableName>`, e.g. `order.scxml`).

Each file declares in-document that it **supersedes** the entity's 04 transition
table. **04 is NEVER edited.** When **no** entity passes the gate, the directory is
**not emitted at all** and the gate decision is recorded in the run report; downstream
06 then consumes the 04 tables directly.

This skill owns only the **SCXML structure derived via the pinned mapping** — and
nothing else. It does not coin events (01 owns those), define enums / forbidden
synonyms (02), define aggregates / invariants (03), or own the transition rows (04).
It does **not** claim general statechart / XState / SCXML-authoring territory — other
ground owns that; every trigger is scoped to this one pipeline step.

**Inputs:** `specs/01-event-storming.md`, `specs/02-glossary.md`,
`specs/03-aggregates.md`, `specs/04-erd.dbml` **AND** `specs/04-transitions.md`.
**Output:** `specs/05-statecharts/<entity>.scxml` per gate-passing entity — **or
nothing** when no entity passes.

Two binding contracts live beside this file. **Load each only at the stage that
needs it** (progressive disclosure):

- `references/validation-rules.md` — the closed rule catalog A1–A8 / B1–B5 / C1–C6 /
  D1–D9 / E1–E4 (32 rules, the review vocabulary). Load at **Draft** and **Professor**.
- `references/simulation.md` — the executable harness contract (the SCION engine
  oracle + mechanical reader). Load it only to interpret a `malformed` /
  `broken-test` / `upstream-defect` result.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them: the W3C SCXML
Recommendation + Errata, the W3C IRP conformance suite, Harel 1987, SCION). **The
pinned SCION interpreter (`@scion-scxml/core` 2.6.24 / `@scion-scxml/scxml` 4.3.27) is
the executable ground truth** — every machine is LOADED and RUN on it.

## a. Mechanical intake table

Map the upstream elements mechanically into the SCXML via the **pinned conventions** —
**carry element names through the pinned mapping; reference content, never copy it.
Never invent a state, never drop a 04 row.**

| Upstream element | This artifact's element | Rule |
|------------------|-------------------------|------|
| A 04 `### <TableName>` transition table (gate-passing) | a `<entity>.scxml` SCXML document, one machine | A1 / A2 / B-theme |
| A 02 `### <Aggregate>Status` enum **value** | a **basic-state** id, verbatim `snake_case` (a 04-terminal value MAY be a `<final>`) | C1 |
| A 04 row `From \| Event \| To` (non-`∅`) | a `<transition>` with `source=From`, `event=transform(Event)`, `target=To` | C2 |
| A 01 event string (carried in the 04 `Event` column) | the `event` attr via the PINNED transform + a `<!-- 01-event: <exact 01 string> -->` annotation | D7 / E4 |
| The 04 `∅`-row `To` value | the root `initial=""` state | A7 / C3 |
| Added hierarchy / guard / action / parallel beyond 04 | annotated `<!-- refines: <reason> -->` on the adding element | C5 |

**Event-name transform (the ONE pinned convention).** `event` attr =
`lowercase(01-string).replace(/\s+/g,'_')`. `Order Placed` → `order_placed`. The exact
01 string is recorded machine-readably as `<!-- 01-event: Order Placed -->` immediately
preceding the `<transition>`. Round-trip MUST hold: `transform(01-event) === event`.

**This table doubles as the downstream drift contract:** the harness verifies it *in
reverse* — every gate-passing entity resolves to a file, every basic-state set to the
02 enum values, every 04 row to a transition, every `event` round-trips to its
`01-event` annotation, `initial` to the `∅`-row. (06 re-derives its own checks from the
same mapping.)

## b. Artifact contract (directory + fingerprints + supersedes + the not-emitted rule)

- **Directory:** `specs/05-statecharts/` (flat `specs/` root in the working project,
  not inside this skill). One file per gate-passing entity, named exactly
  `<04 TableName>.scxml` (A2). Non-promoted entities have **no** file (B5).
- **Root element (pinned):**
  `<scxml version="1.0" xmlns="http://www.w3.org/2005/07/scxml" datamodel="null" initial="<∅-row To>">`.
  `version`/`xmlns` are the fixed values (A6). `datamodel="null"` is the default; use
  `datamodel="ecmascript"` **only** for a guard-justified machine that needs `cond`
  expressions, and declare it (A8). No `cond` may appear under `datamodel="null"`.
- **State ids = 02 enum values verbatim (C1).** Basic-state ids are exactly the
  entity's `### <Aggregate>Status` values. A 04-terminal value (no outgoing 04
  transition) may be a `<final>` named for that value (C6). Compound / parallel /
  initial / history wrapper states use fresh ids that MUST NOT collide with any enum
  value.
- **Fingerprint block (A4):** a leading `<!-- fingerprints: … -->` comment listing ALL
  **five** upstreams, each `<file>@sha256:<64-hex>` over the exact bytes:
  `01-event-storming.md`, `02-glossary.md`, `03-aggregates.md`, `04-erd.dbml`,
  `04-transitions.md`. Recompute on every regeneration:
  `shasum -a 256 specs/01-event-storming.md specs/02-glossary.md specs/03-aggregates.md specs/04-erd.dbml specs/04-transitions.md`.
- **Supersedes declaration (A5):** each file carries, in its header region, exactly
  `<!-- supersedes: 04-transitions.md#<table_name> -->` naming this entity's 04 table.
  This is the in-document assertion the gate requires; **04 is never edited.**
- **The not-emitted rule (A1 / §3.6).** When **no** entity passes the gate, emit
  **NOTHING** — no directory — and record the gate decision in the run report (a gate
  table with every entity's verdict + `gate: not-emitted`). The harness certifies a
  correct non-emission as a `pass` (with `gate.record === "not-emitted"`); a *wrong*
  non-emission (a gate-passer left unpromoted) is a `fail` owned by the missed-promotion
  check (M8/B3).
- **DRY (E-theme):** never restate a 02 enum definition, a 03 invariant, or a 04 row
  beyond the required transition in any comment; reference upstream by name (e.g.
  "see 03 invariant INV-1"). Never use a 02 forbidden synonym in any id, name, or
  annotation.

## c. The GATE procedure

04 owns a transition table for **every** lifecycle entity. Promote an entity into 05
**iff** it passes the gate — **>4 states OR guards OR transition actions OR
concurrency** — and justify each promotion in the report.

- **Mechanical arm (>4 states, ❌-blocking).** Count the distinct `From`/`To` enum
  values (excluding `∅`) in the 04 table. **>4 ⇒ MUST promote.** This arm is checkable
  purely against 04 (the harness's M8/X-GATE own it): a missed or unjustified promotion
  on this arm is a hard failure.
- **Judgment arms (guards / actions / concurrency).** A ≤4-state entity whose **03
  invariant** or **01 branching event** implies a *conditional* transition (guard), a
  *transition-time effect* (action), or *genuinely orthogonal regions* (concurrency)
  should be promoted and realize that feature. These arms are **not** derivable from 04
  alone — they are the **professor's** call (B4 / AJ1), reported honestly: a
  `should-promote-*` verdict is a ⚠️ finding, a `correctly-unpromoted` verdict closes
  the gate cleanly. A promoted file MUST contain its gate-justifying feature (B2) — a
  ≤4-state machine with no guard / action / `<parallel>` is an unjustified promotion.
- **Guard verification is mechanical, not judgment.** A `datamodel="ecmascript"`
  machine ships `specs/05-statecharts/<entity>.scenarios.json` — a JSON array of pinned
  data scenarios `[{ "datamodel": {var: value}, "event": "<name>", "expectConfig":
  [<state ids>] }]`, ≥2 per guarded transition (one per branch). The harness RUNS each
  on SCION and asserts the resulting configuration. A guard-justified machine with
  **zero** scenarios is a `fail` (the gate feature is unverified — no vacuous engine
  pass on the guard arm). The professor judges only whether the scenario *set* covers
  every semantically distinct guard region (AJ4).

## d. The 6-step pipeline

Run these in order. The harness is the **sole executable pass/fail authority**.

1. **Draft.** Decide the gate for every 04 lifecycle entity (§c). For each gate-passing
   entity, build `<entity>.scxml` from the intake table (§a) and artifact contract
   (§b); author any `<entity>.scenarios.json` (§c). If no entity passes, draft nothing
   and prepare the not-emitted gate record. Load `references/validation-rules.md`.

2. **Professor gate** (bounded ≤ 5 rounds). Review against the catalog. **The professor
   OWNS the judgment gate arms (B4 / AJ1) and the guard-scenario-set completeness
   (B2 / AJ4)**, plus the Harel hierarchy/concurrency quality (D9 / AJ2) and the
   determinism-intent residue (D8 / AJ3) — the harness flags the *shape* (the ≤4-state
   set, the compound/parallel structure, the same-event/overlapping-`cond` shape, the
   scenario-set vs guard count) and hands the *semantic* verdict to the professor with
   a **closed verdict schema** (never prose). Decide each; fix or justify. The >4-state
   arm is mechanical — the professor does not re-litigate it.

3. **Lint = the harness.** Run it (§ below). A `malformed` (XML not well-formed / SCION
   rejects load) means fix the SCXML shape before anything else.

4. **Simulation = the SAME harness** (one invocation does mechanical reader + SCION
   engine walks + cross-artifact resolution). Route on the result:

   | Result | Meaning | Action |
   |--------|---------|--------|
   | `pass` (exit 0) | all checks green, reconciled, engine non-empty (or certified `gate: not-emitted`) | proceed to step 5 |
   | `fail` (exit 1), ordinary finding | a 05 defect | fix 05, re-run |
   | `fail` (exit 1), `class:"upstream-defect"` | a 01/02/03/04 defect surfaced through 05 | **STOP** — fix the named upstream file, do not patch 05 around it |
   | `malformed` (exit 2) | a `.scxml` not well-formed / SCION rejects load | fix the SCXML, re-run |
   | `broken-test` (exit 3) | unparseable upstream, missing engine, or reconciliation failure | fix the harness/env or the unparseable upstream; never treat as a pass |

5. **Final DRY + semantic drift.** Re-read every emitted file: no restated upstream
   text, no forbidden synonyms, every annotation references upstream by name, every
   refinement annotated. Confirm the intake table (§a) resolves in reverse. Confirm the
   gate decision table is complete (every 04 lifecycle entity has a recorded verdict).

6. **Emit + a fixed-format report.** Emit the files (or nothing, for a certified
   not-emission). The report must include a **gate decision table** (every entity:
   state-count, gate verdict, promoted? + the justifying arm) and `Iterations to
   convergence: N`. Then hand off to **drift-police** as an invocation (the
   schema-therapy drift agent re-verifies the §a contract across artifacts).

## Running the harness

```
node scripts/harness.mjs specs/05-statecharts \
  --upstream-01 specs/01-event-storming.md \
  --upstream-02 specs/02-glossary.md \
  --upstream-03 specs/03-aggregates.md \
  --upstream-04-dbml specs/04-erd.dbml \
  --upstream-04-transitions specs/04-transitions.md
```

- **The `<05-dir>` may not exist.** Absence is a first-class outcome (§3.6): no
  gate-passer ⇒ `pass` + `gate: not-emitted` (the gate arithmetic still ran — never
  vacuous); a gate-passer with no directory ⇒ `fail` owned by the missed-promotion
  check (M8/B3).
- **Self-installing:** on first run the harness installs its pinned engine deps
  (`@scion-scxml/core` 2.6.24, `@scion-scxml/scxml` 4.3.27, `@dbml/core` 8.2.5) into
  `scripts/node_modules` (`npm ci`, falling back to `npm install`). **Deps absent +
  offline ⇒ `broken-test` (exit 3)** with a stderr install command — it refuses to
  certify rather than degrade to a parse-only verdict.
- **The engine is the strongest oracle:** every machine is LOADED on SCION (passing a
  non-null URI and ALWAYS calling `modelFactory.prepare()` before constructing — the
  two pinned dormancy gotchas), STARTED, and DRIVEN event-by-event from the 04 table;
  the configuration is asserted after every step (W-INIT / W-STEP), disabled events are
  fired to assert configuration-unchanged (W-NEG), and `ecmascript` guard scenarios are
  executed (W-GUARD). Assertions are over **configurations only** (sorted state-id
  arrays / set membership) — deterministic in SCXML — so re-runs are byte-identical.
- **Output:** a stable JSON summary on stdout (status, gate block, counts, per-check
  results, findings); human diagnostics on stderr. Exit `0` pass / `1` fail / `2`
  malformed / `3` broken-test.
- **Self-test:** `node scripts/selftest.mjs` runs the harness over every shipped
  fixture and asserts the exact status + owner-check + the not-emitted records + the
  wrong-reason-trap isolation + engine honesty + determinism + the coverage floor.
