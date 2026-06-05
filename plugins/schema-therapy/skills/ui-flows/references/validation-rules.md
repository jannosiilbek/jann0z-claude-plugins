# `ui-flows` (09) — Validation Rule Catalog

Closed rule catalog for the **ui-flows** skill (skill #9 of the 11-skill schema-therapy pipeline).
Per DOCTRINE §1: lettered rules grouped by theme, each machine-shaped **Detect → Fix → Severity →
Source**. **Pass condition: zero ❌.** ⚠️/ℹ️ are agent-judged residue and never block the gate.

The 09 artifact is a **directory** — `specs/09-ui-flows/<snake(persona)>.xml`, **one IFML model per
07 persona**. It OWNS: screens (`ViewContainer`s with pinned ids), view components + data bindings,
navigation flows, action/event annotations. Downstream skill **10 walks 09's screens by exact id** —
container ids are 10's walk vocabulary and are therefore frozen contract.

**Inputs:** `specs/02-glossary.md` · `specs/04-erd.dbml` + `specs/04-transitions.md` ·
`specs/05-statecharts/` (when emitted) · `specs/07-personas.md` · `specs/08-task-models/`.

**Authorities (via [SOURCES.md](../sources/SOURCES.md)):**
- **[IFML]** — OMG *Interaction Flow Modeling Language* 1.0, `formal/15-02-05`
  ([`ifml-1.0-formal-15-02-05.txt`](../sources/ifml-1.0-formal-15-02-05.txt)). Normative for the
  language: concept vocabulary, semantics, notation.
- **[MM]** — OMG IFML 1.0 Metamodel XMI, `ptc/14-03-16`, ns `20140301`
  ([`IFML-Metamodel.xmi`](../sources/IFML-Metamodel.xmi)). **Normative for the machine shape**:
  class names, superclasses, properties. Every structural element below is grounded in an MM class.
- **[MODDLE]** — `ifml-moddle@0.3.1` JSON descriptor
  ([`ifml-moddle.schema.json`](../sources/ifml-moddle.schema.json), MIT). Secondary machine
  reference; faithful JSON mirror of [MM] (77 types). Subordinate to [MM] on conflict.
- **[NN/g]** — Nielsen 10 Usability Heuristics (cite-only; heuristic-review lens only).
- **[B&F]** — Brambilla & Fraternali, *IFML* (Morgan Kaufmann, 2014) (cite-only; pedagogical).
- **[PLAN]** — the schema-therapy PLAN.md pipeline contract (flow-efficiency floor, single-ownership,
  authority resolution, the erd-L12 verbatim exemption precedent).

> **Oracle note (probe verdict).** No scriptable validator ingests genuine OMG IFML-XMI
> ([PROBE-transcript.md](../sources/PROBE-transcript.md)): npm `ifml`→E404, PyPI→404, Eclipse editor
> GUI-only, `ifml-moddle.fromXML` parses leniently (warns, never fails) on a bespoke dialect. The
> oracle is therefore a **hand-rolled reader for the pinned IFML-XMI subset defined in Theme A**, with
> [MM]/[MODDLE] as the conformance reference for class/property names.

---

## Pinned dialect — the IFML-XMI subset

This skill emits and validates a **pinned, hand-readable subset** of IFML, not full OMG XMI. Every
element name maps 1:1 to an [MM] class (named in each Theme-A rule). The subset deliberately drops
the OMG multi-root `<xmi:XMI>` + `xmi:id` association machinery (which no tool validates) in favor of
a single-root, attribute-flavored document the hand-rolled reader can parse deterministically. The
`type=` enumerations are exactly the [MM] concrete leaf subclasses the pipeline needs:

| Pinned attribute value | [MM] concrete class | Superclass chain |
|---|---|---|
| `ViewComponent type="list"`    | `List`         | `ViewComponent → ViewElement → InteractionFlowElement` |
| `ViewComponent type="details"` | `Details`      | `ViewComponent → ViewElement → InteractionFlowElement` |
| `ViewComponent type="form"`    | `Form`         | `ViewComponent → ViewElement → InteractionFlowElement` |
| `Event type="submit"`          | `OnSubmitEvent`| `ViewElementEvent → CatchingEvent → Event` |
| `Event type="select"`          | `OnSelectEvent`| `ViewElementEvent → CatchingEvent → Event` |
| `Event type="navigate"`        | `JumpEvent`    | `Event → InteractionFlowElement` |
| `ViewContainer`                | `ViewContainer`| `ViewElement` (props `isLandmark`,`isDefault`,`isXOR`) |
| `NavigationFlow`               | `NavigationFlow`| `InteractionFlow → InteractionFlowModelElement` |
| `binding="<table>"`            | `DataBinding.domainConcept` | `DataBinding → ContentBinding → ViewComponentPart` |

`home="true"` realizes [MM] `ViewContainer.isLandmark` + `.isDefault` (the default landmark / home
container). `IFMLModel` is the [MM] root type (props `interactionFlowModel`, `domainModel`).

### Canonical example document (the full pinned dialect)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- fingerprints:
       02-glossary.md          sha256:7b1e…  (input: language + enum vocabulary)
       04-erd.dbml             sha256:a3c0…  (input: domain bindings)
       04-transitions.md       sha256:9f22…  (input: lifecycle vocabulary, non-promoted)
       05-statecharts/order.scxml sha256:c14d… (input: lifecycle authority, promoted)
       07-personas.md          sha256:5e8a…  (input: persona identity)
       08-task-models/dispatcher-fulfil-order.xml sha256:11ab… (input: realized task model)
-->
<IFMLModel id="dispatcher" persona="Dispatcher">

  <Realizes taskModel="dispatcher-fulfil-order"/>

  <ViewContainer id="order_queue" name="Order Queue" home="true">
    <ViewComponent id="queue_list" type="list" binding="order"/>
    <Event id="open_order" type="select" task="t_select_order" klm="MK"/>
  </ViewContainer>

  <ViewContainer id="order_detail" name="Order Detail">
    <ViewComponent id="order_view" type="details" binding="order"/>
    <Event id="start_picking" type="submit" task="t_start_picking" klm="MPBB">
      <!-- 01-event: start picking -->
    </Event>
    <Event id="back_to_queue" type="navigate" task="t_return"/>
  </ViewContainer>

  <NavigationFlow from="open_order"    to="order_detail"/>
  <NavigationFlow from="start_picking" to="order_queue"/>
  <NavigationFlow from="back_to_queue" to="order_queue"/>

</IFMLModel>
```

### Pinned budget accounting (Flow-efficiency floor)

The realized flow cost for one 08 model, measured against that model's `<Budget klm="…"/>`, is:

```
flow_cost(model) =  Σ  count(event.klm)             over leaf-mapped Events on the nominal path
                 +  NAV_HOP_COST × (hops − 1)        navigation overhead, first container free
```

- **KLM alphabet (pinned, shared with 08):** `K` keystroke, `P` point, `H` home-to-device, `B`
  button-down, `BB` full button click (down+up), `M` mental operator, `W` wait. `nK` = multiplier
  (e.g. `3K` = three keystrokes). The budget unit is the **08-owned operator-TOKEN count** (08
  single-owns the per-job efficiency budget): a `klm` string is counted in operator tokens and the
  full click `BB` is **one token**, so `count("MPBB")` = 1 M + 1 P + 1 BB = **3 tokens**. (09 uses a
  byte-faithful copy of the 08 token-count arithmetic so a 09 flow cost and an 08 `Budget.klm` are
  in the same unit and directly comparable.) The 08 leading-M rule carries over: exactly one leading
  `M` per interaction/user Event, zero on system steps.
- **NAV_HOP_COST = `BB` = 1 token.** A navigation hop between containers is realized as one
  button/link **click** — a press *and* release — so it is the single `BB` operator (a full click),
  not a bare `K`. **Justification:** Card, Moran & Newell's KLM (the alphabet [PLAN] inherits, as
  restated by Kieras' *Using GOMS*) treats a mouse/tap "click" as the full-click operator. In the
  08-owned budget unit the cost is the **operator-TOKEN count**, and `BB` is one operator token, so a
  nav hop costs `BB` = **1 token**. Counting a nav hop as `BB` (not `K`, a keypress) keeps the unit
  consistent with how the same flow's Events are costed and is deterministic. The **first** container
  is the landing/home screen the user is already on, so only `hops − 1` are charged.
- **Conformance:** `flow_cost(model)` is re-walked and compared to `model.Budget.klm` — **both
  values reported**; exceeding is a **warning** (rule **C-a**, ⚠️): the budget is the 08 model's own
  declared ceiling, so an overage is agent-review residue, never a gate failure. The **blocking**
  flow-bloat floor is rule **C-d** (❌): screens visited on the realizing walk ≤ the 08 model's
  nominal leaf count + 3. 09 never edits 08; an over-budget/bloated flow is fixed by re-modeling 09
  (or, if the budget itself is wrong, by an **08 regeneration** — renegotiating the budget is an 08
  act, never a 09 edit). Cite the floor as [PLAN].

---

## Theme index

| Theme | Rules | Focus |
|---|---|---|
| **A. Structure** | A-a … A-l (12) | Pinned IFML-XMI subset: doc shape, ids, bindings, flows, home |
| **B. Realization** | B-a … B-d (4) | Every 08 leaf task maps to a screen/event; nominal path walkable |
| **C. Budget conformance** | C-a … C-d (4) | Flow-efficiency floor — KLM accounting + screen-bloat ceiling |
| **D. Lifecycle binding** | D-a … D-c (3) | Events on lifecycle entities ⊆ authority (05-if-promoted-else-04) |
| **E. Language discipline** | E-a … E-d (4) | snake_case ids; forbidden synonyms; no invented bindings |
| **F. Heuristic (professor lens)** | F-a … F-f (6) | NN/g visibility, user control, error prevention — advisory |

**Total: 33 rules** — 22 contract (❌), 5 advisory-mechanical (⚠️), 6 judgment (⚠️/ℹ️).
[PLAN]-marked contract rules: **A-c, A-e, A-i, A-k, B-a, B-d, C-d, D-a, E-d**.

---

## Theme A — Structure (pinned IFML-XMI subset)

Grounds the document in the [MM] machine shape. The hand-rolled reader (oracle) validates these.

### A-a — XML declaration present
- **Detect:** First line is not exactly `<?xml version="1.0" encoding="UTF-8"?>`.
- **Fix:** Emit the declaration as line 1.
- **Severity:** ❌
- **Source:** [IFML] (XML serialization); pinned dialect.

### A-b — Fingerprint header complete and well-formed
- **Detect:** Missing `<!-- fingerprints: … -->` block, OR any consumed input lacks a
  `sha256:<hex>` line: 02-glossary.md, 04-erd.dbml, 04-transitions.md, **each consumed 05
  `.scxml`**, 07-personas.md, **each consumed 08 file**.
- **Fix:** Compute sha256 over each consumed input and record one line per file in the header.
- **Severity:** ❌
- **Source:** [PLAN] (provenance/self-containment); pinned dialect.

### A-c — Root is a persona-bound `IFMLModel` [PLAN]
- **Detect:** Root element is not `<IFMLModel>`; OR `id` ≠ `snake(persona)` (= filename stem); OR
  `persona` attribute ≠ an exact PascalCase `### <PersonaName>` heading in 07-personas.md.
- **Fix:** Set root `<IFMLModel id="<snake(persona)>" persona="<exact 07 PascalCase>">`.
- **Severity:** ❌
- **Source:** [MM] `IFMLModel` (root type); 07 contract; [PLAN] (one 09 model per persona).

### A-d — At least one `<Realizes>` declaration
- **Detect:** Zero `<Realizes taskModel="…"/>` children of the root.
- **Fix:** Declare `<Realizes taskModel="<08 filename stem>"/>` for every 08 model this persona owns.
- **Severity:** ❌
- **Source:** [PLAN] (09 realizes 08).

### A-e — Each `<Realizes>` resolves to an 08 model of THIS persona [PLAN]
- **Detect:** A `taskModel` stem has no matching `specs/08-task-models/<stem>.xml`, OR the matched 08
  file's name does not begin with this model's `snake(persona)-` prefix.
- **Fix:** Point `taskModel` at an existing 08 file whose name is `<snake(persona)>-<snake(job)>`.
- **Severity:** ❌
- **Source:** [PLAN] (08 filenames `<snake(persona)>-<snake(job)>.xml`; single ownership per persona).

### A-f — `ViewContainer` ids unique and snake_case
- **Detect:** Two `<ViewContainer>` elements share an `id`, OR an id is not `^[a-z][a-z0-9_]*$`.
- **Fix:** Rename to a unique snake_case id. **These ids are 10's walk vocabulary — treat as frozen
  contract once downstream consumes them.**
- **Severity:** ❌
- **Source:** [MM] `ViewContainer`; [PLAN] (10 walks 09 screens by exact id).

### A-g — Every `ViewComponent` has a valid `type`
- **Detect:** A `<ViewComponent>` `type` ∉ {`list`,`details`,`form`}.
- **Fix:** Set `type` to the [MM] leaf class the component realizes (`List`/`Details`/`Form`).
- **Severity:** ❌
- **Source:** [MM] `List`/`Details`/`Form` (concrete `ViewComponent` subclasses).

### A-h — Every `Event` has a valid `type`
- **Detect:** An `<Event>` `type` ∉ {`submit`,`select`,`navigate`}.
- **Fix:** Set `type` to the realized [MM] event class
  (`OnSubmitEvent`/`OnSelectEvent`/`JumpEvent`).
- **Severity:** ❌
- **Source:** [MM] `OnSubmitEvent`/`OnSelectEvent`/`JumpEvent`.

### A-i — Every `ViewComponent binding` resolves to a 04 table [PLAN]
- **Detect:** A `binding=` value is not a snake_case singular table name declared in 04-erd.dbml.
- **Fix:** Bind to an existing 04 table; never invent an entity.
- **Severity:** ❌
- **Source:** [MM] `DataBinding.domainConcept`; [PLAN] (09 domain bindings resolve to 04 entities).

### A-j — Every `NavigationFlow` endpoint resolves
- **Detect:** `from` is not the `id` of some declared `<Event>`, OR `to` is not the `id` of some
  declared `<ViewContainer>`.
- **Fix:** Repoint both endpoints to existing element ids.
- **Severity:** ❌
- **Source:** [MM] `NavigationFlow` (`sourceInteractionFlowElement`/`targetInteractionFlowElement`).

### A-k — Domain-affecting events carry an `01-event` annotation [PLAN]
- **Detect:** A `submit` Event bound (via its container's lifecycle-entity component) to a state
  transition lacks a `<!-- 01-event: <exact string> -->` child, OR the annotated string is not an
  exact event cell in 04-transitions.md (`Event` column) / a `<!-- 01-event: … -->` of the bound
  entity in 05.
- **Fix:** Add the annotation with the exact 01 event string from the lifecycle authority.
- **Severity:** ❌
- **Source:** [PLAN] (domain-affecting events annotated with exact 01 strings); cross-ref Theme D.

### A-l — Exactly one home container
- **Detect:** The count of `<ViewContainer home="true">` ≠ 1 (zero or two+).
- **Fix:** Designate exactly one default landmark container as `home="true"`.
- **Severity:** ❌
- **Source:** [MM] `ViewContainer.isLandmark`+`.isDefault` (default landmark); pinned dialect.

---

## Theme B — Realization (08 task models → screens)

### B-a — Every leaf interaction/user task maps to ≥1 Event [PLAN]
- **Detect:** A leaf task in a realized 08 model whose kind is interaction/user has **no** `<Event>`
  carrying `task="<that leaf id>"` anywhere in the model.
- **Fix:** Add (or retarget) an Event with `task=<leaf id>` in a reachable container.
- **Severity:** ❌
- **Source:** [PLAN] (09 realizes each task model as screens and navigation); pinned mapping.

### B-b — System leaf tasks impose no screen obligation (advisory)
- **Detect:** A system leaf task has no mapped Event.
- **Fix:** None required — system steps are realized server-side; mapping is optional. Flag only if
  an apparent user step was mis-tagged system.
- **Severity:** ℹ️
- **Source:** [PLAN] (system leaves carry no M and no screen obligation); pinned mapping.

### B-c — Every `task=` reference resolves to a real 08 leaf
- **Detect:** An Event's `task=` value is not a leaf task id in any realized 08 model.
- **Fix:** Point `task=` at an existing 08 leaf id, or drop the attribute if the Event is pure
  navigation (e.g. a back link).
- **Severity:** ❌
- **Source:** [PLAN] (machine-readable task↔screen mapping); pinned dialect.

### B-d — The nominal path is walkable from home [PLAN]
- **Detect:** For some realized 08 model, the ordered nominal-path leaf sequence's mapped Events
  cannot be traversed as a directed path through the `NavigationFlow` graph starting at the
  `home="true"` container (a required hop is missing).
- **Fix:** Add the missing `NavigationFlow`/Event so the nominal leaf order is reachable from home.
- **Severity:** ❌
- **Source:** [PLAN] (realized nominal path REALIZABLE as a navigation walk from home).

---

## Theme C — Budget conformance (Flow-efficiency floor)

### C-a — Realized flow cost vs 08 Budget.klm (advisory) [PLAN]
- **Detect:** For a realized 08 model, `flow_cost(model)` (per the pinned accounting above:
  Σ event-klm counts on the nominal path + `BB`×(hops−1)) **>** that model's `<Budget klm="…"/>`.
- **Fix:** Re-model 09 to cut clicks/keystrokes/hops below budget where reasonable. **Never edit
  08.** If the budget is genuinely wrong, that is an **08 regeneration**, not a 09 change.
- **Severity:** ⚠️ — the budget is the 08 model's **own declared ceiling**, derived from its own
  decomposition and measuring nothing external (08's W-BUDGET already guards that the declaration
  matches the walker-computed sum). An overage is surfaced for agent judgment with both values and
  the contributing path; the **blocking** flow-bloat floor is **C-d**.
- **Source:** [PLAN] (Flow-efficiency floor — advisory arm; the blocking arm is C-d).

### C-d — Screens visited ≤ 08 nominal leaf count + 3 [PLAN]
- **Detect:** For a realized 08 model, the screens visited on the realizing walk (the `home`
  container + one per hop of the W-REALIZE walk, revisits counted) **>** that model's nominal-path
  leaf count **+ 3**.
- **Fix:** Cut gratuitous intermediate screens — collapse pass-through containers, co-locate
  consecutive nominal events, or add the missing direct `NavigationFlow`. **Never edit 08.**
- **Severity:** ❌
- **Source:** [PLAN] (Flow-efficiency floor: the ceiling is external to 09 — the 08 nominal leaf
  count is the job's own step count, so a tight flow needs at most ~one screen per step; +3 grants
  home/landing slack. A flow dragging the user through more screens than the job has steps is
  bloated and fails simulation).

### C-b — Every nominal-path Event carries a valid `klm` string
- **Detect:** A leaf-mapped Event on a nominal path lacks `klm=`, OR `klm` contains a token outside
  the alphabet {`K`,`P`,`H`,`B`,`BB`,`M`,`W`} / `nK` multiplier form, OR an interaction/user Event's
  `klm` does not start with exactly one leading `M`, OR a system-mapped Event carries an `M`.
- **Fix:** Annotate each Event with a well-formed `klm` cost; one leading `M` for user interaction,
  none for system.
- **Severity:** ❌
- **Source:** [PLAN] (shared KLM alphabet + M-placement rule, inherited from 08).

### C-c — Navigation overhead counted as `BB` per intermediate hop
- **Detect:** A budget computation that omits navigation hops, or charges a hop as `K` instead of
  `BB`, or charges the first/home container.
- **Fix:** Add `BB` (= 1 token) per hop beyond the first container, per the pinned accounting.
- **Severity:** ⚠️
- **Source:** [PLAN] (floor) + KLM click=`BB` convention (Card/Moran/Newell, as restated in Kieras
  *Using GOMS*); cite-only [B&F] for the IFML-flow framing.

---

## Theme D — Lifecycle binding

Lifecycle authority is **05 when the entity is promoted, else the 04 transition table** ([PLAN]).

### D-a — Events on a lifecycle entity ⊆ its authority's vocabulary [PLAN]
- **Detect:** A container/component bound to a lifecycle entity (an entity with a status column /
  transition table) exposes a `submit` Event whose `01-event` annotation is **not** in that entity's
  authority: the 04-transitions.md `Event` column for the table, OR — if promoted — a
  `<!-- 01-event: … -->` transition in the entity's 05 `.scxml`.
- **Authority vocabulary:** the 05 vocabulary is **all transition `01-event` annotations PLUS the
  initial-entry annotation** (the `<!-- 01-event: … -->` on/immediately preceding the machine's
  initial state — the creation event), mirroring the 04 `Event` column's `∅` (creation) row, so a
  creation event for a promoted entity is in-authority exactly as it is for an unpromoted one.
- **Fix:** Only surface events that exist in the authority; route others through their real entity.
- **Severity:** ❌
- **Source:** [PLAN] (lifecycle-dependent screens resolve to 05-if-promoted-else-04).

### D-b — Promotion precedence honored
- **Detect:** An entity has a `05-statecharts/<entity>.scxml` (carrying its
  `<!-- supersedes: 04-transitions.md#<table> -->`) yet a lifecycle Event was validated against the
  superseded 04 rows instead of the 05 statechart.
- **Fix:** Resolve the lifecycle vocabulary from the 05 statechart when one exists for the entity.
- **Severity:** ❌
- **Source:** [PLAN] (05 supersedes 04 for promoted entities).

### D-c — State-dependent display (advisory)
- **Detect:** A container shows an action that is only legal in certain entity states without any
  state-conditioned display note.
- **Fix:** Consider an `activationExpression`-style guard so the action shows only in valid states.
- **Severity:** ℹ️
- **Source:** [MM] `ViewElement.activationExpression`; [IFML] (activation guards). Advisory.

---

## Theme E — Language discipline

### E-a — All ids snake_case
- **Detect:** Any `id` (container, component, event) not matching `^[a-z][a-z0-9_]*$`.
- **Fix:** Rename to snake_case.
- **Severity:** ❌
- **Source:** [PLAN] (pipeline-wide id convention; matches 04 table naming).

### E-b — No forbidden synonyms in ids/names/annotations
- **Detect:** An id, `name`, or annotation contains a `Forbidden term` from 02-glossary.md's
  `## Forbidden Synonyms` table, **outside** a mandated verbatim string.
- **Fix:** Replace with the `Canonical term`.
- **Severity:** ❌
- **Source:** [02] `## Forbidden Synonyms`; [PLAN] (language discipline).

### E-c — Verbatim-string exemption (erd-L12 precedent)
- **Detect:** A forbidden-synonym hit flagged inside a **mandated verbatim string** — an exact
  `01-event:` annotation, an exact 04 `binding` table name, or the exact 07 `persona` value.
- **Fix:** **Do not rewrite.** These strings are pinned by upstream authority; the exemption applies
  exactly as the erd skill's L12 rule exempts mandated verbatim DBML strings.
- **Severity:** ℹ️ (exemption note; never a failure)
- **Source:** [PLAN] (erd-L12 verbatim-exemption precedent).

### E-d — No invented entity bindings [PLAN]
- **Detect:** A `binding=` (or domain reference in any annotation) names a concept not present as a
  table in 04-erd.dbml. (Sharper restatement of A-i for the language lens.)
- **Fix:** Bind only to declared 04 tables; never coin a new entity in 09.
- **Severity:** ❌
- **Source:** [PLAN] (single ownership — 04 owns the entity vocabulary; 09 only references it).

---

## Theme F — Heuristic (professor lens, NN/g-cited)

All advisory. Mechanical subsets are ⚠️ (deterministically checkable); judgment residue is ℹ️.

### F-a — Visibility of system status (ℹ️)
- **Detect:** A long-running/system step in the nominal path has no view feedback (no status
  container/component) for the user.
- **Fix:** Consider a status `Details`/notification so the user sees progress.
- **Severity:** ℹ️
- **Source:** [NN/g] Heuristic 1 (visibility of system status).

### F-b — User control & freedom — back/cancel exists (mechanical) (⚠️)
- **Detect:** A non-home `<ViewContainer>` has **no** outgoing `NavigationFlow` (no way back/out).
- **Fix:** Add a `navigate` Event + `NavigationFlow` giving an exit/back path from the container.
- **Severity:** ⚠️
- **Source:** [NN/g] Heuristic 3 (user control & freedom). Mechanical subset.

### F-c — Match between system and real world (ℹ️)
- **Detect:** Container/component `name` text uses internal jargon rather than persona-domain
  language (02 canonical terms).
- **Fix:** Rename to the user's domain vocabulary.
- **Severity:** ℹ️
- **Source:** [NN/g] Heuristic 2 (match system & real world).

### F-d — Error prevention on destructive submits (ℹ️)
- **Detect:** A `submit` Event mapped to an irreversible/lifecycle-terminal transition has no
  confirmation step in the flow.
- **Fix:** Consider a confirm container/Event before the destructive submit.
- **Severity:** ℹ️
- **Source:** [NN/g] Heuristic 5 (error prevention).

### F-e — Consistency of interaction realization (⚠️)
- **Detect:** The same logical action (same `01-event` / same 08 leaf) is realized by different
  `type`s across containers without cause.
- **Fix:** Realize equivalent actions with a consistent component/event type.
- **Severity:** ⚠️
- **Source:** [NN/g] Heuristic 4 (consistency & standards); [B&F] (pattern consistency, cite-only).

### F-f — Recognition over recall — landmark reachability (ℹ️)
- **Detect:** A container is reachable from home only via a long unmarked chain (no landmark/menu
  back to home), straining recall.
- **Fix:** Consider a persistent landmark/menu path back to the home container.
- **Severity:** ℹ️
- **Source:** [NN/g] Heuristic 6 (recognition over recall); [MM] `ViewContainer.isLandmark`.

---

## Pass condition

A 09 model **passes** iff it has **zero ❌** across Themes A–E. ⚠️ and ℹ️ are surfaced as the
professor-lens residue for agent judgment and **never block the gate** (DOCTRINE §1).
