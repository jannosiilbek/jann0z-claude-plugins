---
name: impact-map
description: Entry skill (step 0) of the schema-therapy modelling pipeline. Use this to START the pipeline / turn a free-text product intent into the validated artifact specs/00-impact-map.md — the single measurable business goal, the business actors, the impacts (actor behaviour changes), and the high-level deliverables that the downstream schema-therapy skills consume. Trigger when the user says "run the schema-therapy pipeline", "start the modelling pipeline", "impact map this product", "produce 00-impact-map.md", or hands a product intent to scope. NOT a general impact-mapping or strategy-workshop tool — this skill owns ONLY the schema-therapy scope-layer artifact at the head of the chain; downstream 01 carries actor names verbatim and realizes deliverables, 07 personas trace to actors/impacts.
---

# impact-map

Step 0 of the **schema-therapy** modelling pipeline — the **entry** skill. It turns
a free-text **product intent** into a single validated artifact,
`specs/00-impact-map.md`, holding the **measurable business goal**, the **business
actors**, the **impacts** (actor behaviour changes), and the **high-level
deliverables**. Downstream skills consume it: **01 event-storming** carries the
business-actor names **verbatim** and realizes the deliverables; **07 personas**
trace to the actors and reference impacts **by exact string**.

This skill owns the scope-layer head of the chain and **nothing downstream** — no
events, no glossary terms, no entities, no scenarios. It is **not** a general
impact-mapping or strategy-workshop tool; it owns only this one pipeline artifact.

Two binding contracts live beside this file. **Load each only at the stage that
needs it** (progressive disclosure):

- `references/validation-rules.md` — the closed rule catalog (the review
  vocabulary). Load at **Draft** and **Professor**.
- `references/simulation.md` — the executable harness contract. You need not read
  it to run the harness; load it only to interpret a `malformed`/`broken-test`
  result.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them). Cite them
only when the professor demands a passage.

## a. Mechanical intake table

The upstream input is the **free-text product intent**. Map it mechanically into
this artifact's elements — do not invent, do not drop. **Names, once chosen, are
written verbatim and never re-spelled**: this table is also the **drift contract**
the downstream skills read in reverse (01 against actor names, 07 against
actors/impacts).

| Upstream element (product intent) | This artifact's element | Section |
|-----------------------------------|-------------------------|---------|
| The stated business objective (Why) | the **single Goal** statement | `## Goal` |
| A named party who can produce / obstruct / consume the outcome | a **Business Actor** row | `## Business Actors` |
| A desired change in what an actor *does* | an **Impact** row (behaviour change) | `## Impacts` |
| A promised capability / option to support an impact | a **Deliverable** row | `## Deliverables` |

This table doubles as the **artifact contract**: the downstream drift check
verifies it *in reverse* — every artifact element must trace back to the intent,
and every stated promise in the intent must appear here.

## b. Artifact contract

- **Path:** `specs/00-impact-map.md` (flat `specs/` root in the working project —
  not inside this skill).
- **Section order (pinned, A1):** `## Upstream Fingerprint` → `## Goal` →
  `## Business Actors` → `## Impacts` → `## Deliverables`.
- **Table shapes (pinned):** Business Actors `Actor | Description`; Impacts
  `Impact | Business Actor (exact string)`; Deliverables
  `Deliverable | Impact (exact string)`. The second column of Impacts carries the
  **verbatim** Actor name; the second column of Deliverables carries the
  **verbatim** Impact name.
- **Goal:** exactly **one** measurable statement (a single sentence/paragraph — no
  list, no second goal) carrying a metric/target.
- **Upstream fingerprint block:** the file opens with an HTML comment recording the
  identity of the consumed product-intent file, so downstream drift is detectable:

  ```
  <!-- fingerprints:
  <intent-filename>@sha256:<64-lowercase-hex>
  -->
  ```

  Compute the hash over the **exact bytes** of the consumed intent file:
  `shasum -a 256 <intent-filename>` (or node `crypto.createHash('sha256')`).
  Record the same identity inside the `## Upstream Fingerprint` section body.
- **Determinism:** naming, structure, and section order are **identical across
  runs** over identical input. See `scripts/fixtures/valid.md` for the canonical
  shape.

## c. Run-time pipeline

Encode these six steps exactly. Bounds are **per-loop, not pooled** (each loop gets
its own budget of 5). A clean re-run over identical input is **not** an iteration;
only re-generation after a change counts.

### 1. Draft

Produce `specs/00-impact-map.md` per the intake table (§a) and the artifact
contract (§b). **Load `references/validation-rules.md` now** and follow it while
drafting. Compute and write the upstream fingerprint.

**Surface intent ambiguities as questions BEFORE drafting.** The harness has **no
access to the intent file** and **no oracle for intent-internal consistency** — an
intent that contradicts itself (two incompatible outcomes, an impossible metric)
is a **draft-time clarifying question**, never silently resolved.

### 2. Professor gate

Dispatch a **maximalist reviewer subagent** constrained by the catalog. Give it the
**full text** of `references/validation-rules.md` and the `sources/` path.

- Every finding **must cite a rule ID** from the catalog **or an exact passage**
  from `sources/`. An **uncited finding is discarded.**
- Loop **Draft ↔ Professor** until **zero ❌ findings**, bounded at **5
  iterations**. (⚠️/ℹ️ findings are reported, never blocking.)
- If subagents are unavailable, perform the professor pass as a **separate, fresh,
  cold, catalog-only review**.

### 3. Lint

Run the harness:

```
node scripts/harness.mjs specs/00-impact-map.md
```

The lint checks (L1–L13) live inside the harness. **There is no upstream-owned name
table to resolve against** — this skill's input is free text, so there is no
cross-artifact name reconciliation step here (that begins downstream).

### 4. Simulation

The **same harness run** covers the simulation checks (resolution / exact-value /
reconciliation). Route by the harness's reported `status`:

| status | Meaning | Action |
|--------|---------|--------|
| `malformed` (exit 2) | required heading/order/table/fingerprint-block shape absent | **fix the artifact** to the A-theme shape |
| `broken-test` (exit 3) | a check threw, reconciliation failed, or zero checks parsed | **fix the check, not the artifact** (the harness is wrong) |
| `fail` (exit 1) | parsed but a ❌ check failed | **fix the artifact** per the matching catalog rule |

Bounded at **5 iterations** for this loop, non-pooled. An unchanged re-run does not
count. **Note:** there is **no upstream-defect class** here — the input is free
text; intent contradictions were handled at draft time (§1), not by the harness.

### 5. Final checks

- **DRY check** — 00 invents **no downstream content**: no events, no glossary
  terms, no entities, no scenarios. It owns only goal/actors/impacts/deliverables.
- **Semantic drift check** — an agent pass confirming every artifact element is
  **faithful to the intent**: no invented actors/impacts, no dropped stated
  promises. (This mirrors the intake table in reverse.)

### 6. Emit + report

Write the artifact, then emit the **fixed-format report**:

- **Audit table** — rule findings + fixes applied (from the professor gate).
- **Simulation table** — per check: id, rule, result, notes (from the harness
  `checks[]`/`findings[]`).
- **Coverage line** — from the harness summary (`edgesWalked/edgesExpected`,
  `behaviorsWithPosAndNeg`).
- `Iterations to convergence: N`
- **Artifact path:** `specs/00-impact-map.md`

**Never claim success without a clean green harness run after the last change.**

On **non-convergence after 5 iterations**: stop and report (a) exactly which checks
still fail, (b) the per-iteration history, (c) the leading hypothesis, and (d) the
**one specific question** whose answer unblocks convergence.

Then hand off to the plugin's drift-police agent as an **invocation**
(`schema-therapy:drift-police`) if available — a handoff, **not a file
dependency**. The skill's own pipeline **must go green without the police
present**; the police are an extra guard, not a dependency.

## Harness reference

- `node scripts/harness.mjs <artifact.md>` → JSON summary on **stdout**,
  diagnostics on **stderr**. Exit `0` pass / `1` fail / `2` malformed / `3`
  broken-test. The `## Upstream Fingerprint` hash is **shape/64-hex checked only**,
  never recomputed (that is the drift police's `--intent` job).
- `node scripts/selftest.mjs` → adversarial regression suite proving the oracle
  catches false-greens (manifest status + owner check, wrong-reason isolation, no
  vacuous green, reconciliation, determinism, the 17-❌-rule coverage floor). Exit
  0 only when every assertion passes. Run it after any change to `scripts/`.
- Everything is self-contained under this skill directory; **no external deps**, no
  cross-plugin references.
