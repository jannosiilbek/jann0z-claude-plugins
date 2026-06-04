---
name: personas
description: Step 7 of the schema-therapy modelling pipeline. Use this to turn the validated specs/00-impact-map.md AND specs/01-event-storming.md into specs/07-personas.md — goal-directed personas (Cooper-discipline goals = end states, not tasks) each grounded in exactly one 00 Business Actor, with jobs-to-be-done whose Outcomes resolve to 01 domain events. Trigger ONLY inside the schema-therapy pipeline: "run schema-therapy step 7", "produce 07-personas.md", "build the schema-therapy personas from 00 and 01", "do the personas step of the modelling pipeline". Consumes specs/00-impact-map.md (business actors + impacts) and specs/01-event-storming.md (domain events) ONLY; downstream schema-therapy skills (08 builds one task model per persona-job, 09 builds one flow model per persona) consume this artifact. NOT a general persona / UX-research / user-modelling authority — adjacent plugins own that ground; this skill owns only the schema-therapy 07 artifact at this one pipeline step.
---

# personas

Step 7 of the **schema-therapy** modelling pipeline. It turns the validated
`specs/00-impact-map.md` **and** `specs/01-event-storming.md` into one validated
artifact, `specs/07-personas.md`, that downstream schema-therapy skills consume:
**08** builds one task model per persona-job, **09** builds one UI-flow model per
persona. This skill owns the **persona names, the persona goals, and the
jobs-to-be-done** — and **nothing else**. It does not author impact maps (00 owns
goal/actors/impacts), event-storm (01 owns events), or model tasks/flows (08/09).
It does **not** claim general persona / UX-research / user-modelling territory —
other installed plugins own adjacent ground; every trigger is scoped to this one
pipeline step.

**Inputs:** `specs/00-impact-map.md` (Business Actors + Impacts) **and**
`specs/01-event-storming.md` (Domain Events) **ONLY**. **Output:**
`specs/07-personas.md`. 07 references 00 actors/impacts and 01 events **by exact
string**; it never restates their definitions, descriptions, or responsibilities.

Two binding contracts live beside this file. **Load each only at the stage that
needs it** (progressive disclosure):

- `references/validation-rules.md` — the closed rule catalog A1–F5 (36 rules; the
  review vocabulary; 21 ❌ rules). Load at **Draft** and **Professor**.
- `references/simulation.md` — the executable harness contract. You do not need it
  to run the harness; load it only to interpret a `malformed` / `broken-test` /
  `upstream-defect` result.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them — Cooper
governs what a persona/goal *is*; NN/g governs construction; JTBD is the
**subordinate** job lens and never displaces the persona as the unit of
modelling). Cite them only when the professor demands a passage.

## a. Mechanical intake table

Map the two upstreams mechanically into this artifact — **carry element names
verbatim; reference content, never copy it. Never invent a party, never drop a
00 Business Actor.**

| Upstream element | This artifact's element | Rule |
|------------------|-------------------------|------|
| A 00 `Business Actors` `Actor` name | a `**Business actor:**` line, value **verbatim**; **≥1 persona per 00 actor** | C1/E1 |
| A 00 `Impacts` `Impact` name | a goal's `[impact: <exact 00 Impact>]` token (the goal advances it) | A6/E3 |
| A 01 `Domain Events` `Event` name | a job's `Outcome` cell (the job's success event, **verbatim**); and a job's `Trigger` **where it is an exact 01 event** | D2/E4/D3 |
| (none of the above) | a free-text domain condition is a legitimate job `Trigger` — exact-match-wins, else condition | A7/D3 |

**This table doubles as the downstream drift contract for 08/09:** they verify it
*in reverse* — every `<persona>` name and `<job>` name is a snake_case filename
component (`<persona>-<job>.xml`), every `Outcome` resolves to a 01 event, and
every 00 actor is personified.

## b. Artifact contract

- **Path:** `specs/07-personas.md` (flat `specs/` root in the working project,
  not inside this skill).
- **Pinned section order (A-theme):** exactly these two level-2 sections, in
  order — `## Upstream Fingerprints` → `## Personas`. Under `## Personas`, one
  `### <PersonaName>` sub-block per persona (PascalCase names), each carrying the
  three pinned fields **in this order**:
  1. `**Business actor:**` — exactly one verbatim 00 Business Actor string.
  2. `**Goals:**` — a list; every entry ends with ≥1 `[impact: <exact 00 Impact
     string>]` token; the goal text (before the token) is an **end condition**,
     not a software feature/task.
  3. `**Jobs-to-be-done:**` — a table, header exactly `Job | Trigger | Outcome`
     (`Job` = short imperative, snake_case-able, unique per persona; `Trigger` =
     an exact 01 event OR a free-text condition; `Outcome` = an exact 01 event).
- **Upstream fingerprint block:** the `## Upstream Fingerprints` section pins
  BOTH upstreams over their **exact bytes** — one line each:

  ```
  ## Upstream Fingerprints
  - 00-impact-map.md@sha256:<64-lowercase-hex>
  - 01-event-storming.md@sha256:<64-lowercase-hex>
  ```

  Compute each over the exact bytes of the consumed file:
  `shasum -a 256 specs/00-impact-map.md` and
  `shasum -a 256 specs/01-event-storming.md` (or node
  `crypto.createHash('sha256')`). A placeholder digest (`0000…`) is rejected.
- **Determinism:** naming, structure, and section order are **identical across
  runs** over identical 00+01 input. See `scripts/fixtures/valid.md` for the
  canonical shape and `scripts/fixtures/upstream-00.md` + `upstream-01.md` for
  the pair it consumes.

## c. Run-time pipeline

Encode these six steps exactly. Bounds are **per-loop, not pooled** (each loop
gets its own budget of **5**). A clean re-run over identical input is **not** an
iteration; only re-generation after a change counts.

### 1. Draft

Produce `specs/07-personas.md` per the intake table (§a) and the artifact
contract (§b). **Load `references/validation-rules.md` now** and follow it:

- One `**Business actor:**` line per persona, value a **verbatim** 00 Business
  Actor; **≥1 persona per 00 actor** (E1). **Never invent a party** (C2); **never
  drop a 00 actor.**
- **Cooper discipline:** a goal is an **end condition the persona wants, NOT a
  task, feature, or thing built** (B1/B2). Not "Use the reporting dashboard" but
  "Know how the business is performing without digging". The task is modelled
  downstream in 08, never here.
- **One persona = one behavioral pattern** (B3/C3). A single 00 actor MAY back
  two personas only if it genuinely splits into two patterns; a persona never
  maps to two actors.
- Every goal ends with ≥1 `[impact: <exact 00 Impact>]` token (A6/E3). Every job
  `Outcome` is a verbatim 01 event (D2/E4); a `Trigger` that is a 01 event is
  written byte-identically (else it is a clean free-text condition — D3).
- Compute and write **both** upstream fingerprints.

### 2. Professor gate

Dispatch a **maximalist reviewer subagent** constrained by the catalog. Give it
the **full text** of `references/validation-rules.md` and the `sources/` path.

- Every finding **must cite a rule ID** (A/B/C/D/E/F) **or an exact `sources/`
  passage**. An **uncited finding is discarded.**
- Loop **Draft ↔ Professor** until **zero ❌ findings**, bounded at **5**.
  (⚠️/ℹ️ findings are reported, never blocking.)
- No-subagent fallback: perform a **separate, fresh, cold catalog-only review
  pass** applying only the catalog.

### 3. Lint

Run the harness (this includes the **mechanical drift half** — every
upstream-owned name resolves by exact string match against 00/01):

```
node scripts/harness.mjs specs/07-personas.md \
  --upstream-00 specs/00-impact-map.md \
  --upstream-01 specs/01-event-storming.md
```

The structural + DRY lint checks (L1–L14) live inside the harness.

### 4. Simulation

The **same harness run** covers the resolution / exact-value / reconciliation
checks (R1–R6, X1–X5) plus the non-blocking trigger classifier. Route failures by
the harness's reported `status` (and finding `class`):

| status / class | Meaning | Action |
|----------------|---------|--------|
| `malformed` (exit 2) | required 07 heading / persona-block field / jobs-table shape absent | **fix the artifact** to the A-theme shape |
| `broken-test` (exit 3) | a check threw, reconciliation failed, zero checks parsed, **or a 00/01 upstream is unparseable** | **fix the check / invocation, not the artifact** (the harness is wrong, or the wrong 00/01 was passed) |
| `fail` (exit 1), ordinary finding | parsed but a ❌ check failed (incl. a `ghost outcome event` — a 07 row naming an event 01 lacks) | **fix the artifact** per the matching catalog rule |
| `fail` (exit 1), finding `class: "upstream-defect"`, `upstream: "00-impact-map.md"` | 07 cannot pass because **00 is self-inconsistent** (an Impact names a Business Actor absent from 00's own Business Actors — R6) | **STOP. Report the defect against `specs/00-impact-map.md`** by the named impact + ghost actor; **never patch around it in 07** |

A `⚠️` D3 near-miss trigger and a non-PascalCase name (L10) are **warn-only** —
recorded, never blocking. Bounded at **5 iterations** for this loop,
**non-pooled**. A clean re-run over identical inputs is not an iteration.

### 5. Final checks

- **DRY check (F4)** — the artifact restates **nothing 00/01 owns**: no
  Business-Actors / Impacts table, no Domain-Events / Actors table, no copied 00
  description or 01 responsibility. Reference by exact name; never copy.
- **Semantic drift check** — an agent pass (the harness's `AJ1`–`AJ5` cover the
  semantic residue: B2 task-vs-end-condition, B4 has-an-end-goal, D4
  job-serves-a-goal, C3 elastic-persona, C2/F3 invented-vocab) confirming every
  persona carries 00/01's **meaning**: goals are stable end states, each job
  serves a stated goal, no persona is the elastic "user".

### 6. Emit + report

Write the artifact, then emit the **fixed-format report**:

- **Audit table** — rule findings + fixes applied (from the professor gate).
- **Simulation table** — per check: label, assertion, result, notes (from the
  harness `checks[]` / `findings[]`); include the `triggers[]` classification.
- **Coverage line** — from the harness summary
  (`edgesWalked/edgesExpected`, `behaviorsWithPosAndNeg`).
- `Iterations to convergence: N`
- **Artifact path:** `specs/07-personas.md`

**Never claim success without a clean green harness run after the last change.**

On **non-convergence after 5 iterations**: stop and report (a) exactly which
checks still fail, (b) the per-iteration history, (c) the leading hypothesis, and
(d) the **one specific question** whose answer unblocks convergence. If the
blocker is an `upstream-defect`, the answer lives in `specs/00-impact-map.md` —
report it there.

Then hand off to the plugin's drift-police agent
(`schema-therapy:drift-police`) **if present** — an invocation, not a file
dependency. The skill's own pipeline **must go green without the police** — they
are an extra guard, not a dependency.

## Harness reference

- `scripts/harness.mjs` — the oracle. Three files in:
  `<07> --upstream-00 <00> --upstream-01 <01>`. JSON summary on stdout, diagnostics
  on stderr, exit `0` pass / `1` fail / `2` malformed (07) / `3` broken-test
  (incl. an unparseable 00/01). Zero deps, Node ≥18.
- `scripts/selftest.mjs` — the adversarial regression suite. Run it after any edit
  to the harness or fixtures; it must exit `0`.
- `scripts/fixtures/` — the shared `upstream-00.md` + `upstream-01.md`, the
  canonical `valid.md`, every illegal 07 fixture, the broken/malformed upstreams,
  and `manifest.json` (expected status + owner-check + upstream-route per triple).
