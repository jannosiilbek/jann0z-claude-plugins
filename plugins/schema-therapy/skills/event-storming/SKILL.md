---
name: event-storming
description: Step 1 of the schema-therapy modelling pipeline. Use this to "event storm" the upstream impact map (specs/00-impact-map.md) plus a free-text domain description into the validated artifact specs/01-event-storming.md — the domain events, actors, hotspots, and per-aggregate lifecycle skeletons that the downstream schema-therapy skills (glossary → aggregates → erd → statecharts → gherkin) consume. Trigger when the user says "run the schema-therapy pipeline", "start the modelling pipeline", "event storm this domain", "produce 01-event-storming.md", or hands a domain write-up (and its impact map) to model. NOT a general BDD/Gherkin, glossary, or ERD authoring tool — adjacent plugins own that ground; this skill owns only the EventStorming big-picture artifact at the head of the chain.
---

# event-storming

Step 1 of the **schema-therapy** modelling pipeline. It turns a free-text domain
description into a single validated artifact, `specs/01-event-storming.md`, that
downstream skills (glossary → aggregates → erd → statecharts → gherkin) consume.
This skill owns the EventStorming big-picture model and **nothing downstream** —
no glossary definitions, no aggregate invariants, no DBML, no scenarios.

Two binding contracts live beside this file. **Load each only at the stage that
needs it** (progressive disclosure):

- `references/validation-rules.md` — the closed rule catalog (the review
  vocabulary). Load at **Draft** and **Professor**.
- `references/simulation.md` — the executable harness contract. You do not need
  to read it to run the harness; load it only if a `malformed`/`broken-test`
  result needs interpreting.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them). Cite them
only when the professor demands a passage.

## a. Mechanical intake table

Two upstreams feed this artifact: the **impact map** (`specs/00-impact-map.md`,
which owns the goal, business actors, impacts, and deliverables) and the
**free-text domain description**. Map each mechanically into this artifact's
elements — do not invent, do not drop:

| Upstream element | This artifact's element | Section |
|------------------|-------------------------|---------|
| **00** Business Actor (exact string) | the **name of every human/organizational Actor** (`person`/`role`/`department`), verbatim | `## Actors` |
| **00** Deliverable (exact string) | the **Deliverable cell** of every event that realizes it (or `—`) | `## Domain Events` |
| Domain desc.: a thing that *happened* | a **Domain Event** row (past tense) | `## Domain Events` |
| Domain desc.: a person/role/dept/**system** that *acts* | an **Actor** row (systems are **01-owned**, not from 00) | `## Actors` |
| Domain desc.: an open question / conflict / "decide later" | a **Hotspot** row | `## Hotspots` |
| Domain desc.: a per-thing ordered sequence of events | a **Lifecycle Skeleton** entry | `## Lifecycle Skeletons` |

Human and organizational actors **carry 00's business-actor names verbatim**;
purely internal actors (`system`/`automated-process`) are 01-owned and exempt.
Every 00 deliverable must be realized by ≥1 lifecycle event, and every aggregate
must serve ≥1 impact (transitively, through a deliverable). This table doubles
as the **artifact contract**: the downstream drift check verifies it *in
reverse* — every artifact element traces back to 00 or the domain description,
and every 00 promise appears here.

## b. Artifact contract

- **Path:** `specs/01-event-storming.md` (flat `specs/` root in the working
  project — not inside this skill).
- **Format:** exactly the sections and table shapes pinned by the catalog's
  **A-theme** (`references/validation-rules.md` A1–A8). The five required level-2
  sections, in order: `## Upstream Fingerprint`, `## Domain Events`,
  `## Actors`, `## Hotspots`, `## Lifecycle Skeletons`. Table columns are fixed:
  Domain Events `Event | Actor | Trigger | Notes | Deliverable` (5 columns — the
  `Deliverable` cell names the exact 00 deliverable the event realizes, or `—`);
  Actors `Actor | Kind | Responsibility`; Hotspots `Hotspot | Question | Blocks`.
  Lifecycle Skeletons hold one `### <AggregateName>` subsection per aggregate,
  each a numbered list.
- **Dual upstream fingerprint:** the file records **both** upstream identities
  (so downstream drift against either can be detected) — the impact map's digest
  `00-impact-map.md@sha256:<hex>` **and** the domain-description source with a
  content hash or capture date:

  ```
  <!-- fingerprints:
  00-impact-map.md@sha256:<hex>
  <domain-filename>@sha256:<64-lowercase-hex>
  -->
  ```

  Compute each hash over the **exact bytes** of the consumed file:
  `shasum -a 256 <filename>` (or node `crypto.createHash('sha256')`). Record
  **both** identities inside the `## Upstream Fingerprint` section body.
- **Determinism:** naming, structure, and section order are **identical across
  runs** over identical input. See `scripts/fixtures/valid.md` for the canonical
  shape.

## c. Run-time pipeline

Encode these six steps exactly. Bounds are **per-loop, not pooled** (each loop
gets its own budget of 5). A clean re-run over identical input is **not** an
iteration; only re-generation after a change counts.

### 1. Draft

Produce `specs/01-event-storming.md` per the intake table (§a) and the artifact
contract (§b). **Load `references/validation-rules.md` now** and follow it while
drafting. Compute and write the upstream fingerprint.

### 2. Professor gate

Dispatch a **maximalist reviewer subagent** constrained by the catalog. Give it
the **full text** of `references/validation-rules.md` and the `sources/` path.

- Every finding **must cite a rule ID** from the catalog **or an exact passage**
  from `sources/`. An **uncited finding is discarded.**
- Loop **Draft ↔ Professor** until **zero ❌ findings**, bounded at **5
  iterations**. (⚠️/ℹ️ findings are reported, never blocking.)
- If subagents are unavailable, perform the professor pass as a **separate,
  fresh, maximalist review** applying only the catalog.

### 3. Lint

Run the harness, passing the impact map as the seam authority:

```
node scripts/harness.mjs specs/01-event-storming.md --upstream-00 specs/00-impact-map.md
```

The lint checks (L1–L15) live inside the harness. `--upstream-00` is
**required** — the harness parses 00 to resolve the H-theme seam (human actors
→ 00 Business Actors, Deliverable cells → 00 Deliverables, deliverable coverage,
aggregate-serves). An absent flag is a usage error (exit 3); an unparseable 00
is `broken-test` (the seam has no authority).

### 4. Simulation

The **same harness run** covers the simulation checks (resolution / exact-value
/ reconciliation). On failures, route by the harness's reported `status`:

| status | Meaning | Action |
|--------|---------|--------|
| `malformed` (exit 2) | required heading/table shape absent (incl. 5-column events, dual fingerprint) | **fix the artifact** to the A-theme shape |
| `broken-test` (exit 3) | a check threw, reconciliation failed, zero checks parsed, **or the 00 impact map is unparseable** | **fix the check / fix 00's shape, not the 01 artifact** (the seam is broken, not 01) |
| `fail` (exit 1) | parsed but a ❌ check failed | **fix the artifact** per the matching catalog rule |
| `fail` + finding `class: upstream-defect` (locus `00-impact-map.md`) | 00 is self-inconsistent (an Impacts/Deliverables row names a ghost actor/impact), so the seam cannot be trusted | **STOP** — report the defect **against `00-impact-map.md`** (never the 01); never patch around it in 01 |

Bounded at **5 iterations** for this loop. A clean re-run over identical inputs
is not an iteration.

### 5. Final checks

- **DRY check** — the artifact restates nothing it does not own. For skill 1:
  confirm it invents **no downstream content** — no glossary definitions, no
  aggregate invariants, no DBML, no Gherkin scenarios.
- **Semantic drift check** — an agent pass confirming every artifact element is
  **faithful to the domain description**: no invented events/actors, no dropped
  major domain behavior. (This mirrors the intake table in reverse.)

### 6. Emit + report

Write the artifact, then emit the **fixed-format report**:

- **Audit table** — rule findings + fixes applied (from the professor gate).
- **Simulation table** — per check: label, assertion, result, notes (from the
  harness `checks[]`/`findings[]`).
- **Coverage line** — from the harness summary (`edgesWalked/edgesExpected`,
  `behaviorsWithPosAndNeg`).
- `Iterations to convergence: N`
- **Artifact path:** `specs/01-event-storming.md`

**Never claim success without a clean green harness run after the last change.**

On **non-convergence after 5 iterations**: stop and report (a) exactly which
checks still fail, (b) the per-iteration history, (c) the leading hypothesis,
and (d) the **one specific question** whose answer unblocks convergence.

Then hand off to the plugin's drift-police agent (`schema-therapy:drift-police`)
if available. The skill's own pipeline **must go green without the police
present** — the police are an extra guard, not a dependency.

## Harness reference

- `node scripts/harness.mjs <artifact.md> --upstream-00 <00-impact-map.md>` →
  JSON summary on **stdout**, diagnostics on **stderr**. Exit `0` pass / `1`
  fail / `2` malformed / `3` broken-test. `--upstream-00` is required.
- `node scripts/selftest.mjs` → adversarial regression suite proving the oracle
  catches false-greens. Exit 0 only when every assertion passes. Run it after
  any change to `scripts/`.
- Everything is self-contained under this skill directory; **no external deps**,
  no cross-plugin references.
