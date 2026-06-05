---
name: task-models
description: >-
  Step 8 of the schema-therapy modelling pipeline — produces
  specs/08-task-models/<persona>-<job>.xml, one ConcurTaskTrees (CTT) task model
  per persona-job (hierarchical task tree, CTT temporal operators, per-leaf KLM
  strings, per-job KLM efficiency budget). Trigger ONLY inside the schema-therapy
  pipeline: "run schema-therapy step 8", "produce the 08 task models", "build the
  schema-therapy task models from 06 and 07", "do the task-models step of the
  modelling pipeline". NOT a general task-analysis / CTT / UX-modelling authority
  — owns only this pipeline artifact.
---

# task-models

Step 8 of the **schema-therapy** modelling pipeline. It turns the validated
`specs/06-gherkin/` feature suite **and** `specs/07-personas.md` into one **directory
artifact**, `specs/08-task-models/`, holding **one `<snake(persona)>-<snake(job)>.xml`
CTT task model per `07` persona-job** — a bijection with the `07` jobs-to-be-done rows.
This skill owns the **task tree** (categories, temporal operators), the **per-leaf KLM
strings**, and the **per-job KLM budget** — and nothing else. It does not author Gherkin
(06 owns scenario text), personas (07 owns persona/job names), or flows (09). It does
**not** claim general task-analysis / CTT / UX territory — every trigger is scoped to this
one pipeline step.

**Inputs:** `specs/06-gherkin/` (the `.feature` scenario-tag vocabulary) **and**
`specs/07-personas.md` (the persona × jobs bijection) **ONLY**. **Output:**
`specs/08-task-models/<persona>-<job>.xml`. 08 references 06 by **scenario tag** and 07 by
**exact persona/job string**; it never restates a 06 scenario sentence or a 07 description.

Two binding contracts live beside this file. **Load each only at the stage that needs it**:

- `references/validation-rules.md` — the closed rule catalog (41 rules, 30 ❌; see the
  catalog's theme index, the review vocabulary). Load at **Draft** and **Professor**.
- `references/simulation.md` — the executable harness contract (the vendored CTT walker
  oracle). You do not need it to run the harness; load it only to interpret a `malformed` /
  `broken-test` / `upstream-defect` result.

Sources of truth are in `sources/` (`sources/SOURCES.md` indexes them — the W3C Task
Models Note 2014 governs the XML format; Paternò governs CTT operator semantics; Kieras
governs the KLM operator table + M-placement). No external CTT engine exists (the probe is
recorded in SOURCES); the harness vendors a Rec-faithful walker as the authority.

## a. Mechanical intake table

Map the two upstreams mechanically into this artifact — **carry names verbatim, invent
nothing.** This table doubles as the **09 drift contract**: 09 realizes each model and is
measured against the budget this skill declares.

| Upstream element | → 08 element | Rule |
|---|---|---|
| Each `07` `### <PersonaName>` × each `**Jobs-to-be-done:**` `Job` cell | one file `<snake(persona)>-<snake(job)>.xml` (bijection — none extra, none missing) | E1 |
| The `07` persona name (verbatim) | `TaskModel/@persona` | E2 |
| The `07` Job cell (verbatim) | `TaskModel/@job` | E2 |
| `<snake(persona)>-<snake(job)>` | `TaskModel/@id` == filename stem | A4 |
| Each `06` scenario tag a leaf sequences | a `scenario-tags` token on that leaf (closed grammar) | E3, E4, E5 |
| The nominal-path KLM operator count | `<Budget klm="N"/>` (the 09 ceiling) | A5, D5 |

`snake(s)` = `lowercase(s).replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'_')`. `@persona`/
`@job` are **verbatim** 07 strings; the slug is derived from them.

## b. Artifact contract

**Directory layout:** `specs/08-task-models/` with one `.xml` per 07 persona-job.

**The pinned XML dialect** (a minimal, mechanically-lintable subset of the W3C Note
meta-model — operator pinned as a `parent` attribute):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- fingerprints:
       specs/06-gherkin/account.feature        sha256:<64-hex>
       specs/07-personas.md                     sha256:<64-hex>
-->
<TaskModel id="accountholder-transfer_funds"
           persona="AccountHolder" job="transfer_funds">
  <Budget klm="14"/>
  <Task id="transfer-funds" category="abstract" operator="enabling">
    <Task id="choose-account" category="abstract" operator="choice">
      <Task id="pick-checking" category="interaction"
            scenario-tags="@transition:select_source_account" klm="MPBB"/>
      <Task id="pick-savings" category="interaction"
            scenario-tags="@transition:select_source_account" klm="MPBB"/>
    </Task>
    <Task id="enter-amount" category="interaction"
          scenario-tags="@transition:enter_amount @invariant:INV-Amount-1" klm="MH4K"/>
    <Task id="confirm-transfer" category="interaction"
          scenario-tags="@transition:confirm_transfer @terminal:transfer_posted" klm="MBB"/>
    <Task id="post-ledger-entry" category="system"
          scenario-tags="@policy:double-entry-ledger" klm="W"/>
  </Task>
</TaskModel>
```

**Closed sets** (invent nothing outside these):
- **Categories** (`category`): `abstract` (decomposition node, never a leaf), `user`,
  `interaction`, `system` (leaves are only the last three).
- **Temporal operators** (`operator`, on a parent with ≥2 children): `enabling`,
  `sequentialEnablingInfo`, `choice`, `interleaving`, `synchronization`, `parallelism`,
  `orderIndependence`, `disabling`, `suspendResume`.
- **Unary operators** (attributes on one task): `iterative="true"` / `iterative="N"`,
  `optional="true"` — **never** `operator=` values.
- **KLM alphabet** (`klm`, per leaf): `K P B BB H M W` concatenated (`BB` is one token; a
  positive-integer multiplier only before `K`, so `T(n)`=`nK`).
- **06 tag grammar** (`scenario-tags` tokens): `@invariant:INV-<Name>-<n>` /
  `@transition:<snake>` / `@terminal:<snake>` / `@policy:<token>` / `@authz:<snake>`.

**Fingerprint block:** a leading `<!-- fingerprints: … -->` comment listing **every
consumed 06 feature** + `specs/07-personas.md`, each with a real `sha256:` (A2).

**Fixed M-placement** (makes the budget reproducible): exactly **one leading `M`** on every
`interaction`/`user` leaf, **zero `M`** on `system` leaves. No other M's.

**Budget = nominal-path operator count** (D5): sum the `klm` operator instances over the
leaves on the **nominal path** — follow **all** children of
enabling/concurrent operators; the **first** document-order child of each `choice`; the
**left** child of `disabling`/`suspendResume`; **skip** `optional` leaves; count an
`iterative` subtree **once**. `BB`=1 instance, `4K`=4, `W`=1. The declared `<Budget klm>`
must equal this integer — the harness **re-walks** to verify, never trusting your sum.

## c. The 6-step pipeline

**1 — Draft.** For each 07 persona-job emit one file. Decompose the job into a task tree:
group sub-steps under `abstract` parents (≥2 children each); make leaves `interaction`/
`user`/`system`. **Sequence** children to match the 06 `@transition` order (order-bearing
operators — `enabling`/`disabling`/`suspendResume` — are non-commutative). Tag each leaf
with the `06` scenario tag(s) it sequences. **Place M** per the fixed convention. Write each
leaf's `klm` over the closed alphabet. **Compute the nominal-path budget by hand and declare
it.** Load `references/validation-rules.md` here.

**2 — Professor gate.** Re-read the catalog and adversarially review against it
(catalog-constrained — judge only what the catalog names). Own the **AJ verdicts**:
sequencing vs `@transition` obligations (AJ1), decomposition quality (AJ2), concurrency/
`W`-semantics justification (AJ3), one-model-one-job (AJ4). Fix every issue. **Loop Draft↔
Professor until zero ❌**, bounded at **5 iterations**; if still failing, stop and report the
blocker.

**3 — Lint.** Run the harness:
```
node scripts/harness.mjs specs/08-task-models/ --upstream-06 specs/06-gherkin/ --upstream-07 specs/07-personas.md
```
`malformed` (exit 2) ⇒ a `.xml` is not well-formed/dialect-legal; fix and re-run.

**4 — Simulation.** The **same harness** is the walker oracle: it loads each tree, computes
the enabled set, walks the nominal path, and asserts `declared == computed` budget
(W-BUDGET), reachability (W-REACH), termination (W-TERM), step-legality (W-STEP). On an
**upstream-defect** finding (`class: "upstream-defect"`) **STOP** and route the fix to the
named upstream — a duplicate `(persona, job)` in 07 → `07-personas.md`; a 06 tag matching no
grammar class → the named `.feature`. Do **not** patch around a bad upstream. A
`broken-test` (exit 3) on an unparseable 06/07 likewise routes upstream.

**5 — Final.** DRY + semantic-drift pass: no restated Gherkin (F1), no invented vocabulary
(F2), each model scoped to its one job (F4). Confirm the budget is tight (only nominal-path
leaves contributed).

**6 — Emit + report.** Write the directory and emit the fixed-format report:

```
## 08 task-models — <status>
Models: <N> (one per 07 persona-job)   Harness: pass | fail | malformed | broken-test
| model | declared | computed | nominal leaves |
|---|---|---|---|
| accountholder-transfer_funds | 14 | 14 | 5 |
| … |
Iterations to convergence: N
```

Then hand off to the **drift-police** as an invocation (it owns cross-artifact drift between
08 and its upstreams/downstream 09).

## Pass condition

`status: pass`, exit 0, `reconciled: true`, zero ❌ findings, the walker layer non-empty
(every model walked), and the per-model declared budget equals the walker-computed budget.
