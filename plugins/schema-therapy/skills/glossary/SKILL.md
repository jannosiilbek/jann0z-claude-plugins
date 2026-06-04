---
name: glossary
description: Step 2 of the schema-therapy modelling pipeline. Use this to turn the validated specs/01-event-storming.md into specs/02-glossary.md — the ubiquitous-language Term list (one canonical word per domain concept, carried verbatim from 01) plus the lifecycle-derived Enums (one <AggregateName>Status per 01 skeleton). Trigger ONLY inside the schema-therapy pipeline: "run schema-therapy step 2", "produce 02-glossary.md", "build the schema-therapy glossary from 01-event-storming.md", "do the glossary step of the modelling pipeline". Consumes 01-event-storming.md ONLY; downstream schema-therapy skills (03 aggregates / 04 erd / 06 gherkin) consume this artifact. NOT a general glossary / ubiquitous-language / DDD-terminology authoring tool — adjacent plugins own that ground; this skill owns only the schema-therapy 02 artifact at this one pipeline step.
---

# glossary

Step 2 of the **schema-therapy** modelling pipeline. It turns the validated
`specs/01-event-storming.md` into one validated artifact, `specs/02-glossary.md`,
that the downstream schema-therapy skills (03 aggregates → 04 erd → 06 gherkin)
consume. This skill owns the **ubiquitous-language terms** and the
**lifecycle-derived enums** for this pipeline — and **nothing else**. It does not
event-storm (01 owns that), invent aggregate invariants (03), or model schema
(04). It does **not** claim general glossary / ubiquitous-language territory —
other installed plugins own adjacent ground; every trigger is scoped to this one
pipeline step.

**Input:** `specs/01-event-storming.md` **ONLY**. **Output:** `specs/02-glossary.md`.

Two binding contracts live beside this file. **Load each only at the stage that
needs it** (progressive disclosure):

- `references/validation-rules.md` — the closed rule catalog A1–F5 (the review
  vocabulary). Load at **Draft** and **Professor**.
- `references/simulation.md` — the executable harness contract. You do not need
  it to run the harness; load it only to interpret a `malformed` / `broken-test`
  / `upstream-defect` result.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them). Cite them
only when the professor demands a passage.

## a. Mechanical intake table

The upstream input is `specs/01-event-storming.md`. Map its elements mechanically
into this artifact — **carry element names verbatim; reference content, never
copy it. Never invent, never drop a core concept.**

| Upstream 01 element | This artifact's element | Rule |
|---------------------|-------------------------|------|
| A Domain-Events `Event` name | referenced by an enum value's `Derived from event` cell (verbatim) | D6/F2 |
| An `Actor` name | one **Term** row, name carried verbatim, `Owns 01 element? = yes` | C6/F1 |
| An `### <Aggregate>` heading | one **Term** row (the aggregate concept) **and** one **Enum** | C6/D1 |
| Hotspot concepts | a **Term** row only if the concept is a real domain term (not the hotspot question) | C5 |
| `### <Aggregate>` lifecycle skeleton | exactly one enum `<AggregateName>Status`; one value per ordered event, `snake_case` state form, with the exact 01 event string in `Derived from event (exact 01 string)` | D1–D6 |

**This table doubles as the downstream drift-check contract:** the next skill
verifies it *in reverse* — every Term that owns a 01 element must resolve to an
exact 01 string, and every 01 actor/aggregate must appear as an owned Term.

## b. Artifact contract

- **Path:** `specs/02-glossary.md` (flat `specs/` root in the working project,
  not inside this skill).
- **Pinned section order (A-theme):** exactly these four level-2 sections, in
  order — `## Upstream Fingerprint` → `## Terms` → `## Enums` →
  `## Forbidden Synonyms`. Table column shapes are fixed:
  - Terms: `Term | Definition | Owns 01 element? | 01 element (exact string)`
  - each enum `### <EnumName>` holds `Value | Derived from event (exact 01 string)`
  - Forbidden Synonyms: `Forbidden term | Canonical term | Reason`
- **Bounded-context line:** one line above `## Terms` naming the single bounded
  context the glossary is scoped to (A7).
- **Upstream fingerprint block:** the file opens with an HTML comment recording
  the identity of the consumed 01 over its **exact bytes**:

  ```
  <!-- fingerprints:
  01-event-storming.md@sha256:<64-lowercase-hex>
  -->
  ```

  Compute over the exact bytes of the consumed 01:
  `shasum -a 256 specs/01-event-storming.md` (or node
  `crypto.createHash('sha256')`). Record the same identity, with a freshness
  note (date or 01 revision), inside the `## Upstream Fingerprint` body.
- **Determinism:** naming, structure, and section order are **identical across
  runs** over identical 01 input. See `scripts/fixtures/valid.md` for the
  canonical shape and `scripts/fixtures/upstream-01.md` for the 01 it consumes.

## c. Run-time pipeline

Encode these six steps exactly. Bounds are **per-loop, not pooled** (each loop
gets its own budget of **5**). A clean re-run over identical input is **not** an
iteration; only re-generation after a change counts.

### 1. Draft

Produce `specs/02-glossary.md` per the intake table (§a) and the artifact
contract (§b). **Load `references/validation-rules.md` now** and follow it while
drafting:

- Derive Terms from 01's vocabulary (actors, aggregates, real hotspot concepts).
  **Never invent vocabulary; never drop a 01 actor/aggregate.** Pin one Term
  casing convention (PascalCase nouns recommended) and apply it throughout (C8).
- Derive one enum per 01 lifecycle skeleton: name `<AggregateName>Status`; one
  `snake_case` value per ordered skeleton event, in skeleton order; put the
  **verbatim** 01 event string in `Derived from event` (D1–D6).
- Record rejected/alternative names in `## Forbidden Synonyms`, each pointing at
  an owned Term (C2/F5).
- Compute and write the upstream fingerprint.

### 2. Professor gate

Dispatch a **maximalist reviewer subagent** constrained by the catalog. Give it
the **full text** of `references/validation-rules.md` and the `sources/` path.

- Every finding **must cite a rule ID** (A1–F5) **or an exact `sources/`
  passage**. An **uncited finding is discarded.**
- Loop **Draft ↔ Professor** until **zero ❌ findings**, bounded at **5**.
  (⚠️/ℹ️ findings are reported, never blocking.)
- No-subagent fallback: perform a **separate, fresh, cold catalog-only review
  pass** applying only the catalog.

### 3. Lint

Run the harness (this includes the **mechanical drift half** — every
upstream-owned name resolves by exact string match against 01):

```
node scripts/harness.mjs specs/02-glossary.md --upstream specs/01-event-storming.md
```

The lint checks (L1–L18) live inside the harness.

### 4. Simulation

The **same harness run** covers the resolution / exact-value / reconciliation
checks. Route failures by the harness's reported `status` (and finding `class`):

| status / class | Meaning | Action |
|----------------|---------|--------|
| `malformed` (exit 2) | required 02 heading/table shape absent | **fix the artifact** to the A-theme shape |
| `broken-test` (exit 3) | a check threw, reconciliation failed, zero checks parsed, **or the 01 upstream is unparseable** | **fix the check / invocation, not the artifact** (the harness is wrong, or the wrong 01 was passed) |
| `fail` (exit 1), ordinary finding | parsed but a ❌ check failed | **fix the artifact** per the matching catalog rule |
| `fail` (exit 1), finding `class: "upstream-defect"` | 02 cannot pass because **01 is self-inconsistent** (a skeleton step is absent from 01's Domain Events) | **STOP. Report the defect against `specs/01-event-storming.md`** by the named 01 element; **never patch around it in 02** |

Bounded at **5 iterations** for this loop. A clean re-run over identical inputs
is not an iteration.

### 5. Final checks

- **DRY check (E-theme)** — the artifact restates **nothing 01 owns**: no event
  table, no actor responsibility table, no hotspot blocks, no lifecycle recaps.
  Definitions **define concepts**; they do not narrate 01.
- **Semantic drift check** — an agent pass (the harness's `AJ1`–`AJ5` cover the
  semantic residue) confirming every Term carries 01's **meaning**, not just its
  spelling: no synonym drift, values read as resulting states, definitions don't
  paraphrase a lifecycle or copy actor responsibilities.

### 6. Emit + report

Write the artifact, then emit the **fixed-format report**:

- **Audit table** — rule findings + fixes applied (from the professor gate).
- **Simulation table** — per check: label, assertion, result, notes (from the
  harness `checks[]` / `findings[]`).
- **Coverage line** — from the harness summary (`edgesWalked/edgesExpected`,
  `behaviorsWithPosAndNeg`).
- `Iterations to convergence: N`
- **Artifact path:** `specs/02-glossary.md`

**Never claim success without a clean green harness run after the last change.**

On **non-convergence after 5 iterations**: stop and report (a) exactly which
checks still fail, (b) the per-iteration history, (c) the leading hypothesis,
and (d) the **one specific question** whose answer unblocks convergence. If the
blocker is an `upstream-defect`, the answer lives in 01 — report it there.

Then hand off to the plugin's drift-police agent
(`schema-therapy:drift-police`) **if present** — an invocation, not a file
dependency. The skill's own pipeline **must go green without the police** — they
are an extra guard, not a dependency.

## Harness reference

- `node scripts/harness.mjs <02> --upstream <01>` → JSON summary on **stdout**
  (stable key order, sorted `checks[]`/`findings[]`), diagnostics on **stderr**.
  Exit `0` pass / `1` fail (incl. `upstream-defect`) / `2` malformed (02) / `3`
  broken-test (incl. unparseable 01).
- `node scripts/selftest.mjs` → adversarial regression suite proving the oracle
  catches false-greens (wrong-reason trap, vacuous green, upstream-defect
  routing, counter reconciliation, byte-identical double-run, coverage floor).
  Exit 0 only when every assertion passes. Run after any change to `scripts/`.
- Everything is self-contained under this skill directory; **no external deps**,
  no cross-plugin references.
