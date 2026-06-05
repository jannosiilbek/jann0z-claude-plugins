---
name: ui-flows
description: >-
  Schema-therapy step 9. Turns the domain model + personas + task models into per-persona
  IFML screen-flow models. Consumes specs/02-glossary.md, specs/04-erd.dbml + specs/04-transitions.md,
  specs/05-statecharts/ (when emitted), specs/07-personas.md, and specs/08-task-models/; OWNS
  specs/09-ui-flows/<persona>.xml — screens, navigation, and data bindings measured against 08's
  KLM budgets. Use when authoring or reviewing 09 ui-flows in a schema-therapy pipeline run.
  Downstream skill 10 walks 09's screens by exact container id (frozen contract). NOT general
  UI/UX or free-form IFML authoring — a closed, lint-gated pipeline step.
---

# ui-flows (09)

Skill #9 of the 11-skill schema-therapy pipeline. The **09 artifact is a directory** —
`specs/09-ui-flows/<snake(persona)>.xml`, **one IFML model per 07 persona** (a bijection with
the 07 `### <PersonaName>` blocks). It OWNS: screens (`ViewContainer`s with pinned ids), view
components + 04 data bindings, navigation flows, and KLM-costed events with exact 01-event
annotations. **Downstream 10 walks 09's screens by exact container id — those ids are frozen
contract once consumed.**

The closed rule catalog is [`references/validation-rules.md`](references/validation-rules.md)
(33 rules, themes A–F, **22 ❌**); the executable oracle is
[`references/simulation.md`](references/simulation.md), shipped as `scripts/harness.mjs`. **Pass
condition: zero ❌ across Themes A–E.** ⚠️/ℹ️ are professor-lens residue and never block.
**Load each only at the stage that needs it** (progressive disclosure): the catalog at
**Draft** and **Professor**; `simulation.md` only to interpret a `malformed`/`broken-test`
result — you do not need it to run the harness.

This skill runs in an **isolated context**: no other skills, no plugins. Authorities are this
file + `references/` + `sources/`. The harness is zero-dependency Node ≥18 ESM (the probe proved
no scriptable IFML validator exists, so the reader + flow-walker are vendored).

**Out of scope: sad-path UI.** 09 models and walks only the **nominal (happy) paths** of the 08
task models. Domain rejections are already specified by 06's `@invariant`/`@terminal`/`@authz`
scenarios; **screen-level error states** (validation messages, failure screens, retry
affordances) are the implementation's responsibility and are deliberately not modelled here —
never add error screens to satisfy an imagined sad-path obligation.

## 1 — Mechanical intake (and the 10 drift contract)

Every 09 element is **derived** from an upstream — 09 invents nothing, restates nothing.

| Upstream slice | → 09 obligation |
|---|---|
| each 07 `### <PersonaName>` | **one** `<IFMLModel id="<snake(persona)>" persona="<exact name>">` file `<snake(persona)>.xml` |
| each 08 leaf task (interaction/user) | an `<Event task="<leaf id>">` mapping it to a screen (system leaves: no obligation) |
| each 08 model's `<Budget klm="…">` | the comparand for the re-walked flow cost (C-a ⚠️ warn-only — 08's own declared ceiling) |
| each 08 model's nominal leaf count | the **blocking** screen-bloat ceiling: screens visited ≤ leaf count + 3 (C-d ❌) |
| each 08 model's nominal path | must be **walkable** from the home container as a navigation path |
| each 04 table (snake_case singular) | the only legal `binding=` values (never coin an entity) |
| each lifecycle entity's authority event | the exact `<!-- 01-event: … -->` on the domain-affecting `submit` |
| your `ViewContainer` ids | **10's walk vocabulary** — frozen once downstream consumes them |

**Lifecycle authority is 05-if-promoted-else-04:** a `submit` Event on a container bound to a
status-bearing entity carries an `01-event` string that must be in that entity's authority — the
05 statechart's transition set when the entity is **promoted** (a `05-statecharts/<entity>.scxml`
exists), else the 04-transitions.md `Event` column.

## 2 — Artifact contract

**Directory:** `specs/09-ui-flows/<snake(persona)>.xml`, one per 07 persona, no extras, no gaps.

**Pinned IFML-XMI subset** (every element name maps 1:1 to an OMG [MM] class — see catalog
Theme A). `ViewComponent type ∈ {list,details,form}`; `Event type ∈ {submit,select,navigate}`;
`home="true"` is the single default-landmark container. Full example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- fingerprints:
       02-glossary.md          sha256:7b1e…   (language + enum vocabulary)
       04-erd.dbml             sha256:a3c0…   (domain bindings)
       04-transitions.md       sha256:9f22…   (lifecycle vocabulary, non-promoted)
       05-statecharts/order.scxml sha256:c14d… (lifecycle authority, promoted)
       07-personas.md          sha256:5e8a…   (persona identity)
       08-task-models/dispatcher-fulfil_order.xml sha256:11ab… (realized task model)
-->
<IFMLModel id="dispatcher" persona="Dispatcher">

  <Realizes taskModel="dispatcher-fulfil_order"/>

  <ViewContainer id="order_queue" name="Order Queue" home="true">
    <ViewComponent id="queue_list" type="list" binding="order"/>
    <Event id="open_order" type="select" task="select-order" klm="MPBB"/>
  </ViewContainer>

  <ViewContainer id="order_detail" name="Order Detail">
    <ViewComponent id="order_view" type="details" binding="order"/>
    <Event id="start_picking" type="submit" task="start-picking" klm="MBB">
      <!-- 01-event: start picking -->
    </Event>
    <Event id="back_to_queue" type="navigate"/>
  </ViewContainer>

  <NavigationFlow from="open_order"    to="order_detail"/>
  <NavigationFlow from="back_to_queue" to="order_queue"/>

</IFMLModel>
```

**Fingerprint block** (line-2 comment): one `sha256:<hex>` line per consumed input —
02-glossary.md, 04-erd.dbml, 04-transitions.md, **each consumed 05 `.scxml`** (only when 05 was
emitted AND this model binds the promoted entity), 07-personas.md, and **each consumed 08 file**.

**Budget accounting (the Flow-efficiency floor):**

```
flow_cost(model) =  Σ count(event.klm)        over leaf-mapped Events on the nominal path
                 +  BB × (hops − 1)           navigation overhead, first/home container free
```

- KLM alphabet (shared with 08): `K P H B BB M W`; `nK` = multiplier (only before `K`). The budget
  unit is the **08-owned operator-TOKEN count**: a full click **`BB` = 1 token**;
  `count("MPBB") = M+P+BB = 3`. Exactly **one leading `M`** per interaction/user Event, **zero** on
  system steps.
- **NAV_HOP_COST = `BB` = 1 token** per hop beyond the first container.
- **Conformance (C-a, ⚠️ warn-only): `flow_cost` vs `model.Budget.klm`** — both values reported.
  The budget is the 08 model's own declared ceiling (08's W-BUDGET guards its honesty), so an
  overage is surfaced for agent review, never a gate failure. 09 **never edits 08**; if the budget
  itself is wrong, that is an 08 regeneration — never a 09 budget edit.
- **Flow-bloat floor (C-d, ❌ blocking): screens visited ≤ 08 nominal leaf count + 3** — screens =
  home + one per hop on the realizing walk. A flow dragging the user through more screens than the
  job has steps (+3 slack) **fails simulation**; cut gratuitous intermediate screens.

## 3 — Pipeline (6 steps)

1. **Draft** — per intake table: for each persona, design the screens (containers + components
   with 04 bindings), map every interaction/user leaf to an Event (`task=<leaf id>`, well-formed
   `klm`), annotate every domain-affecting `submit` with its exact authority `01-event`, and lay
   navigation flows so each 08 nominal path is walkable from home. **Mind the budget ceiling while
   drafting** — every hop is a `BB`. Fingerprint all consumed inputs.

2. **Professor gate** — catalog-constrained review (Themes A–F, the catalog is the vocabulary).
   Owns the **F-theme heuristic verdicts** (visibility, user control, error prevention,
   consistency). Require **zero ❌**; bounded to **5 iterations**.

3. **Lint** — run the harness (below). Mechanical/structural ❌ (A/B/D/E shape) must be clean.

4. **Simulation** — the **same harness** runs the flow-walk oracle: per realized 08 model it
   BFS-walks the nominal path from home (W-REALIZE), proves the home is unique + all containers
   reachable (W-HOME), **re-computes the flow cost vs the 08 budget** (W-COST, ⚠️ warn-only), and
   **blocks on the flow-bloat floor** (W-BLOAT: screens visited ≤ nominal leaf count + 3). An
   **upstream-defect STOP**: a realized 08 whose declared `Budget.klm` ≠ its own nominal cost is a
   broken ruler — routed `upstream-defect` → the named 08 file (fix 08, never 09).

5. **Final** — DRY + semantic drift pass: no duplicated screens for the same logical action, names
   in persona-domain language, container ids stable (they are 10's contract).

6. **Emit + report** — fixed-format report including a **per-model cost-vs-budget +
   screens-vs-limit table** and
   `Iterations to convergence: N`. Then hand off to the
   **`schema-therapy:drift-police` agent** as an invocation (a handoff, not a file
   dependency) — its suite-wide audit re-verifies the cross-artifact contracts,
   including the 09→10 screen-id seam.

## 4 — Running the harness

```
node scripts/harness.mjs specs/09-ui-flows/ \
     --upstream-02 specs/02-glossary.md \
     --upstream-04-dbml specs/04-erd.dbml \
     --upstream-04-transitions specs/04-transitions.md \
     --upstream-07 specs/07-personas.md \
     --upstream-08 specs/08-task-models/ \
     [--upstream-05 specs/05-statecharts/]
```

- `--upstream-05` is **optional and load-bearing**: present ⇒ promoted entities judged against
  the scxml graph (incl. beyond-04 transitions); absent ⇒ all entities judged against 04 alone AND
  no model may fingerprint a 05 `.scxml` (**N-05ABSENT** ⇒ fail).
- **stdout**: one stable-key-order JSON summary (per-entity `authority` block, `flows[]` with
  computed-cost + budget + hops + screens + bloatLimit + realizable, sorted `checks[]`/`findings[]`).
- **stderr**: diagnostics only (parse throws, stranded-walk traces, over-budget warn detail with
  both values + the contributing path, bloat detail, upstream-defect routing note).
- **Exit / status:** `0` pass · `1` fail (incl. upstream-defect) · `2` malformed (unparseable
  `.xml`) · `3` broken-test (zero checks, reconciliation mismatch, or an unparseable/unreadable
  02/04/05/07/08 upstream).

The oracle is a **vendored IFML-XMI-subset reader** (`scripts/lib/xml.mjs`) + a **BFS flow-walker**
(`scripts/lib/graph.mjs`) + a **copied 08 CTT nominal-path walker** (`scripts/lib/taskmodel.mjs`)
+ a **constrained DBML slice-reader** (`scripts/lib/dbml.mjs`, no `@dbml/core`) + copied md/scxml
readers + the closed `checks.mjs`/`lexicon.mjs`. Self-test:

```
node scripts/selftest.mjs   # asserts every fixture's status+owner, wrong-reason isolation,
                            # walker honesty, authority switch, 22-❌ pos+neg floor. Exit 0 = pass.
```

## 5 — Single-ownership boundaries

09 references upstreams by exact string and **never re-verifies** what another skill owns: 08's
tag/operator/KLM-alphabet seams (08's job — 09 re-walks only for the nominal leaves + budget +
the one budget-soundness precondition), 04's full DBML schema (erd's job — 09 reads only table
names + status columns), 05's machine semantics (statecharts' job — 09 reads only the transition
set as authority), 02/07 provenance (glossary/personas). An unreadable upstream is `broken-test`,
not a silent skip; a self-inconsistent 08 budget is `upstream-defect` → 08, never a 09 patch.
