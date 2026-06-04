---
name: aggregates
description: Step 3 of the schema-therapy modelling pipeline. Use this to turn the validated specs/01-event-storming.md AND specs/02-glossary.md into specs/03-aggregates.md — the aggregate roots, within-boundary invariants, transactional boundaries, and cross-aggregate consistency policies (transactional vs eventual). Trigger ONLY inside the schema-therapy pipeline: "run schema-therapy step 3", "produce 03-aggregates.md", "build the schema-therapy aggregates from 01+02", "do the aggregates step of the modelling pipeline". Consumes 01-event-storming.md AND 02-glossary.md; downstream schema-therapy skills (04 erd / 06 gherkin) consume this artifact. NOT a general DDD / aggregate-design / boundary-consulting tool — adjacent plugins own that ground; this skill owns only the schema-therapy 03 artifact at this one pipeline step.
---

# aggregates

Step 3 of the **schema-therapy** modelling pipeline. It turns the validated
`specs/01-event-storming.md` **and** `specs/02-glossary.md` into one validated
artifact, `specs/03-aggregates.md`, that the downstream schema-therapy skills
(04 erd → 06 gherkin) consume. This skill owns the **aggregate roots**, the
**within-boundary invariants**, the **transactional boundaries**, and the
**cross-aggregate consistency policies** for this pipeline — and **nothing else**.
It does not event-storm (01 owns that), coin terms or enums (02 owns those),
model schema (04), or write scenarios (06). It does **not** claim general
DDD / aggregate-design territory — other plugins own adjacent ground; every
trigger is scoped to this one pipeline step.

**Inputs:** `specs/01-event-storming.md` **AND** `specs/02-glossary.md`.
**Output:** `specs/03-aggregates.md`.

Two binding contracts live beside this file. **Load each only at the stage that
needs it** (progressive disclosure):

- `references/validation-rules.md` — the closed rule catalog S1–S9 / A1–A8 /
  I1–I6 / X1–X7 / L1–L6 / D1–D5 (41 rules, the review vocabulary). Load at
  **Draft** and **Professor**.
- `references/simulation.md` — the executable harness contract. You do not need
  it to run the harness; load it only to interpret a `malformed` / `broken-test`
  / `upstream-defect` result.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them; Evans DDD
Reference, the three Vernon essays, ddd-crew canvas, Fowler bliki). Cite them
only when the professor demands a passage.

## a. Mechanical intake table

The upstream inputs are `specs/01-event-storming.md` (owns event/actor/aggregate
names + lifecycle skeletons) and `specs/02-glossary.md` (owns Terms, enum values,
forbidden synonyms). Map their elements mechanically into this artifact —
**carry element names verbatim; reference content, never copy it. Never invent,
never drop a 01 aggregate.**

| Upstream element | This artifact's element | Rule |
|------------------|-------------------------|------|
| A 01 `### <AggregateName>` lifecycle skeleton | exactly one `### <AggregateName>` sub-block (1:1 bijection; heading byte-identical) | S3/S4 |
| A 01 Domain-Events `Event` name | a policy `Source event` cell (exact string) — never restate the event table | X5/D1 |
| A 02 `Term` | a Boundary-contents `02 Term` cell (exact string) or the literal `—` | L1/L3 |
| A 02 `<Aggregate>Status` enum value | an invariant `Rule` token (exact string), under the value's OWN aggregate | I5/L4/L6 |
| A 01 aggregate name (as a reference/policy target) | a References `Target aggregate` / policy `Target aggregate` cell (exact 01 string, root only) | A3/A7/X6 |

**This table doubles as the downstream drift-check contract:** the next skill
verifies it *in reverse* — every `### ` sub-block resolves to a 01 skeleton, every
`02 Term` cell resolves to a 02 Term, every policy `Source event` resolves to a 01
event, every invariant enum token resolves to the host aggregate's own 02 enum.

## b. Artifact contract

- **Path:** `specs/03-aggregates.md` (flat `specs/` root in the working project,
  not inside this skill).
- **Pinned section order (S-theme):** exactly these three level-2 sections, in
  order — `## Upstream Fingerprints` → `## Aggregates` → `## Cross-Aggregate
  Policies`. Under `## Aggregates`, one `### <AggregateName>` sub-block per 01
  skeleton, each carrying the four pinned sub-blocks **in this order**:
  1. `**Root:** <Entity> · identity: <field> (globally unique)`
  2. Boundary contents table — header exactly `Member | Kind | 02 Term`
     (`Kind ∈ {entity, value object}`)
  3. Invariants table — header exactly `ID | Rule | Scope`
     (`ID` matches `INV-<token>-<n>`; `Scope` is exactly `within-boundary`)
  4. References table — header exactly `Target aggregate | Identity field held |
     Reason`, OR the literal `none`
- **Cross-Aggregate Policies table** — header exactly `Policy | Source event |
  Target aggregate | Mode | Justification` (`Mode ∈ {transactional, eventual}`),
  OR the literal `none`.
- **Upstream fingerprint block:** the `## Upstream Fingerprints` section pins
  BOTH upstreams over their **exact bytes** — one line each:

  ```
  ## Upstream Fingerprints
  - 01-event-storming.md@sha256:<64-lowercase-hex>
  - 02-glossary.md@sha256:<64-lowercase-hex>
  ```

  Compute each over the exact bytes of the consumed file:
  `shasum -a 256 specs/01-event-storming.md` and
  `shasum -a 256 specs/02-glossary.md` (or node `crypto.createHash('sha256')`).
- **Determinism:** naming, structure, and section order are **identical across
  runs** over identical 01+02 input. See `scripts/fixtures/valid.md` for the
  canonical shape and `scripts/fixtures/upstream-01.md` + `upstream-02.md` for
  the pair it consumes.

## c. Run-time pipeline

Encode these six steps exactly. Bounds are **per-loop, not pooled** (each loop
gets its own budget of **5**). A clean re-run over identical input is **not** an
iteration; only re-generation after a change counts.

### 1. Draft

Produce `specs/03-aggregates.md` per the intake table (§a) and the artifact
contract (§b). **Load `references/validation-rules.md` now** and follow it:

- One `### <AggregateName>` sub-block per 01 skeleton (1:1, heading byte-identical).
  **Never invent an aggregate; never drop a 01 skeleton.**
- One globally-unique root per aggregate (A1/A2). Cluster only members bound by a
  true invariant; favour value objects + reference-by-identity for the rest
  (A4/A5). References go to a root, never an interior member (A3/A7).
- Each invariant is a true, within-boundary business rule, phrased in **exact 02
  terms / exact 02 enum values** of the **host** aggregate (I2/I4/I5/L4/L6). A
  rule that spans aggregates is a cross-aggregate policy, not an invariant (I3).
- Each cross-aggregate effect is a policy: `Source event` is an exact 01 event,
  `Target aggregate` an exact 01 aggregate, `Mode` defaults to `eventual`;
  `transactional` cross-boundary needs a domain justification (whose job is it?),
  never "for convenience" (X1–X7).
- Compute and write **both** upstream fingerprints.

### 2. Professor gate

Dispatch a **maximalist reviewer subagent** constrained by the catalog. Give it
the **full text** of `references/validation-rules.md` and the `sources/` path.

- Every finding **must cite a rule ID** (S/A/I/X/L/D) **or an exact `sources/`
  passage**. An **uncited finding is discarded.**
- Loop **Draft ↔ Professor** until **zero ❌ findings**, bounded at **5**.
  (⚠️/ℹ️ findings are reported, never blocking.)
- No-subagent fallback: perform a **separate, fresh, cold catalog-only review
  pass** applying only the catalog.

### 3. Lint

Run the harness (this includes the **mechanical drift half** — every
upstream-owned name resolves by exact string match against 01/02):

```
node scripts/harness.mjs specs/03-aggregates.md \
  --upstream-01 specs/01-event-storming.md \
  --upstream-02 specs/02-glossary.md
```

The structural + DRY lint checks (L1–L17) live inside the harness.

### 4. Simulation

The **same harness run** covers the resolution / exact-value / reconciliation
checks. Route failures by the harness's reported `status` (and finding `class`):

| status / class | Meaning | Action |
|----------------|---------|--------|
| `malformed` (exit 2) | required 03 heading/table/sub-block shape absent | **fix the artifact** to the S-theme shape |
| `broken-test` (exit 3) | a check threw, reconciliation failed, zero checks parsed, **or a 01/02 upstream is unparseable** | **fix the check / invocation, not the artifact** (the harness is wrong, or the wrong 01/02 was passed) |
| `fail` (exit 1), ordinary finding | parsed but a ❌ check failed | **fix the artifact** per the matching catalog rule |
| `fail` (exit 1), finding `class: "upstream-defect"`, `upstream: "01-event-storming.md"` | 03 cannot pass because **01 is self-inconsistent** (a skeleton step absent from 01 events, or an event owned by zero/two skeletons — X7) | **STOP. Report the defect against `specs/01-event-storming.md`** by the named 01 element; **never patch around it in 03** |
| `fail` (exit 1), finding `class: "upstream-defect"`, `upstream: "02-glossary.md"` | 03 cannot pass because **02 is inconsistent with 01** (an enum value derives from a non-01 event) | **STOP. Report the defect against `specs/02-glossary.md`** by the named 02 element; **never patch around it in 03** |

Bounded at **5 iterations** for this loop, **non-pooled**. A clean re-run over
identical inputs is not an iteration.

### 5. Final checks

- **DRY check (D-theme)** — the artifact restates **nothing 01/02 owns**: no
  event table, no actor/hotspot blocks, no lifecycle recaps, no glossary
  definitions, no enum-value listings. Reference by name; never copy.
- **Semantic drift check** — an agent pass (the harness's `AJ1`–`AJ5` cover the
  semantic residue: A5/A6 sizing, I3-paraphrase, X4-quality, I4 truth, A8/I6
  anaemia) confirming every aggregate carries 01/02's **meaning**: members earn
  their place via a real invariant, invariants are falsifiable, no aggregate is a
  generic collection or an anaemic shell.

### 6. Emit + report

Write the artifact, then emit the **fixed-format report**:

- **Audit table** — rule findings + fixes applied (from the professor gate).
- **Simulation table** — per check: label, assertion, result, notes (from the
  harness `checks[]` / `findings[]`).
- **Coverage line** — from the harness summary
  (`edgesWalked/edgesExpected`, `behaviorsWithPosAndNeg`).
- `Iterations to convergence: N`
- **Artifact path:** `specs/03-aggregates.md`

**Never claim success without a clean green harness run after the last change.**

On **non-convergence after 5 iterations**: stop and report (a) exactly which
checks still fail, (b) the per-iteration history, (c) the leading hypothesis,
and (d) the **one specific question** whose answer unblocks convergence. If the
blocker is an `upstream-defect`, the answer lives in the named upstream (01 or
02) — report it there.

Then hand off to the plugin's drift-police agent
(`schema-therapy:drift-police`) **if present** — an invocation, not a file
dependency. The skill's own pipeline **must go green without the police** — they
are an extra guard, not a dependency.

## Harness reference

- `node scripts/harness.mjs <03> --upstream-01 <01> --upstream-02 <02>` → JSON
  summary on **stdout** (stable key order, sorted `checks[]`/`findings[]`),
  diagnostics on **stderr**. Exit `0` pass / `1` fail (incl. `upstream-defect`)
  / `2` malformed (03) / `3` broken-test (incl. unparseable 01/02).
- `node scripts/selftest.mjs` → adversarial regression suite proving the oracle
  catches false-greens (wrong-reason trap, vacuous green, upstream-defect
  routing for 01 AND 02, counter reconciliation, byte-identical double-run,
  coverage floor). Exit 0 only when every assertion passes. Run after any change
  to `scripts/`.
- Everything is self-contained under this skill directory; **no external deps**,
  no cross-plugin references.
