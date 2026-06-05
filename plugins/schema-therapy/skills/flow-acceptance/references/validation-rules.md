# `flow-acceptance` (10) — Validation Rule Catalog

Closed rule catalog for the **flow-acceptance** skill (skill #10 of the 11-skill schema-therapy
pipeline) — the pipeline's **terminal** artifact. Per DOCTRINE §1: lettered rules grouped by theme,
each machine-shaped **Detect → Fix → Severity → Source**. **Pass condition: zero ❌.** ⚠️/ℹ️ are
agent-judged residue and never block the gate.

The 10 artifact is a **directory** — `specs/10-flow-acceptance/<persona>-<job>.feature`, **one
`.feature` per 08 task model**. It is the pipeline's terminal artifact (nothing consumes it): it makes
the built product **end-to-end validatable**. The acceptance closure ([PLAN], verbatim, the prime
contract): *"flow-acceptance (10) owns exactly one feature per 08 task model: a scenario chain that
walks the 09 flow screen by screen and binds each step's outcome to the 06 scenario it realizes by
tag — domain assertions live in 06 and are never restated. 10 closes the chain into an executable
contract against an implementation: 06 validates the domain layer, 10 validates the built product end
to end; a 10 step naming a screen absent from 09, a 06 tag that resolves nowhere, or an 08 task model
with no 10 feature is a finding."*

**Inputs (referenced, never restated — DRY):**
- `specs/06-gherkin/` — `.feature` files; **owns domain assertions + the tag vocabulary**. Each 06
  scenario carries exactly one source tag from the closed grammar
  `@invariant:INV-[A-Za-z][A-Za-z0-9]*-\d+` / `@transition:[a-z][a-z0-9_]*` /
  `@terminal:[a-z][a-z0-9_]*` / `@policy:[A-Za-z0-9_-]+`.
- `specs/08-task-models/` — `<persona>-<job>.xml` TaskModel docs; leaf tasks carry ids + scenario-tags;
  the **nominal-path leaf order** is the job's happy path.
- `specs/09-ui-flows/` — `<persona>.xml` IFML models: `ViewContainer` ids (snake_case — the **walk
  vocabulary**), `Event` ids with `task="<08 leaf id>"` mappings + `01-event` annotations,
  `NavigationFlow` edges, one `home="true"` container per model, `Realizes taskModel=` declarations.

10 **never edits** upstream. A 10 feature is an executable contract against an implementation — it
compiles, through a step-definition layer, down to a real standardised driver protocol (W3C WebDriver
[WD], Playwright [PW] — both **cite-only**, never dictating `.feature` content).

**Normative authorities** (per [SOURCES.md](../sources/SOURCES.md) authority ruling):
- **Syntax (what parses)** → `gherkin.berp` grammar + `gherkin-languages.json` + the
  **`@cucumber/gherkin` v39.1.0** reference parser ([GHERKIN]; normative; tie-breaking oracle is
  `sources/testdata/{good,bad}/`, COPY-at-build from the sibling `gherkin` skill). Every emitted
  `.feature` MUST parse clean and produce a **non-empty pickle** under this pinned parser — identical
  formalism to 06, by design, since 10's output must parse under the same parser.
- **Semantics (what each construct means)** → `gherkin-reference.md` ([REF], cucumber.io reference):
  Feature/Scenario, Given/When/Then, Background, Tags, Comments.
- **Style — the screen-flow discipline** → `writing-better-gherkin.md` ([STYLE],
  declarative-over-imperative) + `cucumber-anti-patterns.mdx` + the **"Testing through the UI"** blog
  ([UI-AP], part #2) + Fowler **Page Object** ([PO], the screen-addressed-step precedent).
- **[PLAN]** — the schema-therapy PLAN.md pipeline contract (the acceptance closure, single-ownership,
  authority resolution).

> **The UI-coupling ruling ([SOURCES.md] §"The UI-coupling ruling", binding).** Referencing a screen
> by its **pinned id from the verified 09 model** is the **Page-Object discipline**, NOT the
> "Testing through the UI" anti-pattern. [UI-AP] condemns *incidental, unstable* UI detail ("click the
> blue button", "fill the 3rd field" — "buttons and links and fields and tables"). The 09 screen id is
> a *named, stable, deliberately-assigned identity* — exactly [PO]'s "model the structure that makes
> sense to the user" addressed through a stable name; a UI restyle does not change the reference.
> [PO]'s "navigation returns another page object" **is** the 09 screen→screen edge the walk traces.
> Outcomes are NOT asserted in the screen reference — they bind to 06 by tag, honouring [PO]'s
> assertion-free rule and [UI-AP]'s "when I check my balance, not click the balance button". The walk
> is a declarative traversal of a *verified graph* — the discipline the anti-pattern endorses, not the
> brittleness it condemns. Every Theme-B/C rule below rests on this ruling.

## Pinned conventions (binding for every rule below)

- **Directory + file naming (PINNED, BIJECTION).** Artifact root = `specs/10-flow-acceptance/`. **One
  file per 08 task model**, named `<persona>-<job>.feature` where `<persona>-<job>` is the **exact 08
  filename stem** (e.g. 08 `dispatcher-fulfil-order.xml` → `dispatcher-fulfil-order.feature`). The
  mapping is a **bijection both directions**: every 08 model has exactly one 10 file, every 10 file
  maps to exactly one 08 model — no more, no fewer. One `Feature:` per file (grammar permits exactly
  one).
- **`Feature:` name (PINNED).** The `Feature:` line text is **the 08 job name, natural-cased** — a
  human form of the job (e.g. 08 stem job `fulfil-order` → `Feature: Fulfil order`). Pin exactly: the
  natural-cased 08 job name, not the kebab stem, not a paraphrase of the persona, not the scenario
  mechanics.
- **Fingerprint block (PINNED).** Each file opens with a leading `# fingerprints:` comment block —
  before `Feature:` (comments are legal only at the start of a line, [REF]) — listing every consumed
  upstream as `<file>@sha256:<64-hex>`, one per line: **each consumed 06 `.feature`**, **the persona's
  09 model** (`09-ui-flows/<persona>.xml`), and **the 08 model** (`08-task-models/<persona>-<job>.xml`).
- **Feature-level tag (PINNED).** Each file carries the feature-level tag `@task-model:<persona>-<job>`
  (the **exact 08 stem**) on the `Feature:`. It resolves to the realized 08 model.
- **The walk steps (PINNED — the heart).** A scenario chain walks the 09 flow **screen by screen**,
  starting at the persona's `home="true"` container, tracing a path that **exists in the 09
  `NavigationFlow` graph in order**, realizing the **08 nominal-path leaf order**. The step forms are
  fixed (see below).
- **Persona natural name (PINNED).** Steps name the persona by the **persona's natural name from 07 via
  the 09 `persona` attribute** (the `<IFMLModel persona="…">` value), verbatim. No invented actors, no
  `I`/personal-pronoun ([UI-AP] §"Scenarios that use I").
- **No invented vocabulary (PINNED).** No screen id, Event id, `01-event` string, or 06 tag may be used
  that is not present verbatim in the resolved upstream (09 / 06). 10 coins nothing.

### Pinned step conventions — the closed step grammar

| Step role | PINNED form | Binds to |
|---|---|---|
| **Location** (`Given`) | `Given the <persona natural name> is on the "<screen id>" screen` | 09 `ViewContainer.id` (exact, quoted) |
| **Interaction** (`When`) | `When the <persona natural name> <domain-affecting>: "<exact 01-event string>"` **OR** `When the <persona natural name> triggers the "<Event id>" event` | 09 `Event` (see disambiguation) |
| **Navigation** (`Then`) | `Then the <persona natural name> is taken to the "<screen id>" screen` | a 09 `NavigationFlow` edge |
| **Outcome binding** (`Then`) | `Then the outcome of "<exact 06 tag>" holds` | a 06 scenario, by tag |

**When-form disambiguation (PINNED, exactly).** Each `When` performs **ONE** interaction (one 09
`Event`). Choose the form by whether the Event is **domain-affecting** (it carries an `01-event`
annotation in 09 — i.e. it realizes a lifecycle transition / domain rule):
- **domain-affecting Event** → the `When` MUST contain the **exact 09 `01-event` string verbatim**, as
  a literal substring (this is the same string 06 embeds, the hook that lets the outcome bind to 06).
- **non-domain-affecting Event** (pure UI/navigation interaction, no `01-event`) → the `When` MUST
  contain the **exact 09 `Event` id in quotes**.
One form or the other, never both, never a paraphrase of either.

### Canonical example feature (the full pinned dialect)

```gherkin
# fingerprints:
#   06-gherkin/order.feature@sha256:<64-hex>
#   06-gherkin/shipment.feature@sha256:<64-hex>
#   09-ui-flows/dispatcher.xml@sha256:<64-hex>
#   08-task-models/dispatcher-fulfil-order.xml@sha256:<64-hex>
@task-model:dispatcher-fulfil-order
Feature: Fulfil order

  The Dispatcher works an order from the queue through to dispatch, screen by
  screen, with each domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Dispatcher fulfils an order end to end
    Given the Dispatcher is on the "order_queue" screen
    When the Dispatcher triggers the "open_order" event
    Then the Dispatcher is taken to the "order_detail" screen
    When the Dispatcher starts picking the order: "Picking Started"
    Then the outcome of "@transition:order" holds
    And the Dispatcher is taken to the "order_queue" screen
    When the Dispatcher dispatches the order: "Order Dispatched"
    Then the outcome of "@terminal:order" holds
```

- `"order_queue"`, `"order_detail"` = exact 09 `ViewContainer` ids; the walk starts at the
  `home="true"` container and every `Then … is taken to …` follows an existing `NavigationFlow` edge.
- `"open_order"` is a **non-domain-affecting** Event (no `01-event`) → quoted **Event id**.
- `"Picking Started"`, `"Order Dispatched"` are exact **09 `01-event` strings** of domain-affecting
  Events → embedded verbatim.
- `@transition:order`, `@terminal:order` are exact **06 tags**; every walked 08 leaf's scenario-tag is
  covered by an outcome binding. **Domain assertions are never restated** — only the bindings appear.

## Theme index

| Theme | Rules | Focus |
|---|---|---|
| **A. Structure & file shape** | A-a … A-j (10) | Directory bijection, filename, Feature name, fingerprints, feature tag, parse-clean + non-empty pickle |
| **B. The screen walk** | B-a … B-f (6) | Location/interaction/navigation steps trace an existing 09 path from home, realizing the 08 nominal-path leaf order |
| **C. Outcome binding** | C-a … C-d (4) | `Then the outcome of "<06 tag>" holds`; tag resolves; coverage of every walked 08 leaf's scenario-tag; domain assertions never restated |
| **D. Gherkin canon** | D-a … D-f (6) | Declarative (screen id IS the abstraction), single-When, G/W/T roles, Background scope, behavioral titles, no incidental detail |
| **E. Language discipline & DRY** | E-a … E-d (4) | Persona natural name from 09; no invented screens/events/tags; no 06 scenario bodies copied |

**Total: 30 rules.** Severities: ❌ blocker · ⚠️ advisory/judgment · ℹ️ info.
[PLAN]-marked contract rules: **A-a, A-b, A-c, A-e, A-f, B-a, B-b, B-c, B-d, C-a, C-b, C-c, E-b**.

---

## Theme A — Structure & file shape

### A-a — Directory bijection: exactly one `.feature` per 08 task model [PLAN]
- **Detect:** `specs/10-flow-acceptance/` is absent or empty, OR the set of `*.feature` files ≠ the set
  of `specs/08-task-models/*.xml` models — a **missing** feature for some 08 model (the
  *"08 task model with no 10 feature is a finding"* clause), an **extra** feature with no 08 model, or
  **two** features for one 08 model.
- **Fix:** Emit exactly one `.feature` per 08 task model; no more, no fewer (bijection both directions).
- **Severity:** ❌
- **Source:** [PLAN] (acceptance closure: one feature per 08 task model).

### A-b — File named `<persona>-<job>.feature` (exact 08 stem) [PLAN]
- **Detect:** A file is not named `<exact 08 filename stem>.feature` — wrong casing, a paraphrase, a
  reordered `<job>-<persona>`, or a stem that matches no 08 file.
- **Fix:** Name each file the exact 08 model stem + `.feature` (08 `dispatcher-fulfil-order.xml` →
  `dispatcher-fulfil-order.feature`).
- **Severity:** ❌
- **Source:** [PLAN] (pinned filename = exact 08 stem); 08 filename contract.

### A-c — `Feature:` name is the natural-cased 08 job name [PLAN]
- **Detect:** The `Feature:` line text ≠ the 08 job name, natural-cased (it uses the kebab stem, names
  the persona instead, paraphrases the job, or describes the mechanics).
- **Fix:** Set `Feature: <08 job name, natural-cased>` (job `fulfil-order` → `Feature: Fulfil order`).
- **Severity:** ❌
- **Source:** [PLAN] (Feature name = human form of the 08 job); [REF] (one `Feature` per file).

### A-d — Fingerprint block present, well-formed, names all consumed upstreams
- **Detect:** No leading `# fingerprints:` comment block, OR it omits any **consumed 06 `.feature`**,
  the persona's **09 model** (`09-ui-flows/<persona>.xml`), or the **08 model**
  (`08-task-models/<persona>-<job>.xml`), OR a hash is not 64 hex chars, OR the block is placed after
  `Feature:` (comments are legal only at line start; a leading block is required).
- **Fix:** Emit the `# fingerprints:` block before `Feature:`, one `<file>@sha256:<64-hex>` line per
  consumed upstream; recompute on every regeneration.
- **Severity:** ❌
- **Source:** [PLAN] (provenance / self-containment); [REF] (comments start a line).

### A-e — Feature-level tag `@task-model:<persona>-<job>` present and resolves [PLAN]
- **Detect:** The `Feature:` lacks a `@task-model:<persona>-<job>` tag, the tag stem ≠ the exact 08
  filename stem (so it does not resolve to this file's 08 model), OR the tag contains whitespace
  (parser-rejected).
- **Fix:** Tag the `Feature:` with `@task-model:<exact 08 stem>`.
- **Severity:** ❌
- **Source:** [PLAN] (feature-level tag = exact 08 stem, resolves).

### A-f — Each file parses clean under `@cucumber/gherkin` v39.1.0 with a non-empty pickle [PLAN]
- **Detect:** A `.feature` produces a `parseError` from the pinned parser (text before `Feature`, a
  tag containing whitespace, an unclosed Doc String, unexpected EOF, an unsupported `# language:`), OR
  it parses but yields an **empty pickle list** (a `Feature:` with no executable scenario — e.g. only
  comments/description).
- **Fix:** Make every file accepted by the pinned parser AND emit ≥1 scenario so pickles are non-empty;
  `sources/testdata/bad/*.errors.ndjson` is the oracle for rejected malformations.
- **Severity:** ❌
- **Source:** [GHERKIN] grammar `gherkin.berp` + `@cucumber/gherkin` v39.1.0 (normative parser);
  `sources/testdata/{good,bad}/`; [PLAN] (parses + non-empty pickles).

### A-g — At least one scenario per feature
- **Detect:** A `.feature` has zero `Scenario:`/`Scenario Outline:` blocks.
- **Fix:** Emit ≥1 scenario chain walking the 09 flow for the realized 08 model.
- **Severity:** ❌
- **Source:** [PLAN] (a feature is a non-empty scenario chain); [REF].

### A-h — English dialect; no stray `# language:` header
- **Detect:** A file declares a non-`en` `# language:` header (parser-rejected `Language not supported`
  for an unknown code), or mixes localized keywords.
- **Fix:** Omit the header (English is the default) or pin `# language: en`; use only English keywords.
- **Severity:** ⚠️
- **Source:** [GHERKIN] `gherkin-languages.json` (`en` keyword set); [REF] (Spoken Languages).

### A-i — One `Feature:` per file
- **Detect:** A file contains more than one `Feature:` keyword (the grammar permits exactly one;
  a second `Feature` is a parse error).
- **Fix:** Split into one file per 08 task model; never collapse two models into one file.
- **Severity:** ❌
- **Source:** [GHERKIN] grammar (one `Feature` per file); [PLAN] (one feature per 08 model).

### A-j — Feature description, if present, carries no domain assertion or upstream dump
- **Detect:** The free-text block under `Feature:` restates a 06 invariant/rule, dumps a 09 navigation
  table, or copies an 08 task list, rather than a one-line framing of the job.
- **Fix:** Keep the description to a short framing of the walked job; reference upstream by tag/id, do
  not paraphrase or dump it (cross-ref E-d).
- **Severity:** ⚠️
- **Source:** [PLAN] DRY; [UI-AP] part #1 (pointless / dumping descriptions).

---

## Theme B — The screen walk (the heart)

Grounded in the **UI-coupling ruling**: the screen id is a stable, pinned [PO] abstraction, and the
walk is a declarative traversal of the **verified 09 graph** ([PO] navigation-returns-screen).

### B-a — Location steps name an exact 09 screen id [PLAN]
- **Detect:** A `Given the <persona> is on the "<screen>" screen` step's quoted `<screen>` is **not**
  the exact `id` of a `<ViewContainer>` in the persona's 09 model (the *"step naming a screen absent
  from 09 is a finding"* clause), OR the step is not quoted, OR it names UI structure (a widget, a
  field, a CSS path) instead of a screen id.
- **Fix:** Quote the exact 09 `ViewContainer.id`; reference a screen, never a widget.
- **Severity:** ❌
- **Source:** [PLAN] (a 10 step naming a screen absent from 09 is a finding); 09 container ids are the
  walk vocabulary; UI-coupling ruling ([PO] named-abstraction).

### B-b — The walk starts at the persona's `home="true"` container [PLAN]
- **Detect:** The first location `Given` of a scenario chain is not the persona's `home="true"`
  `<ViewContainer>` in 09.
- **Fix:** Begin every chain `Given the <persona> is on the "<home screen id>" screen`.
- **Severity:** ❌
- **Source:** [PLAN] (the walk starts at the persona's home container); 09 single-home contract.

### B-c — Navigation steps follow an existing 09 `NavigationFlow` edge, in order [PLAN]
- **Detect:** A `Then the <persona> is taken to the "<screen>" screen` navigation does **not**
  correspond to a 09 `NavigationFlow` whose `from` is the immediately-preceding `When` step's Event and
  whose `to` is `<screen>` — i.e. the step sequence traces a path that does **not exist** in the 09
  graph, or traverses edges out of order.
- **Fix:** Reorder/retarget the walk so each navigation step is an actual 09 edge, traced in graph
  order from the home container; if the edge is genuinely needed, it must be added **in 09** (never
  invented in 10).
- **Severity:** ❌
- **Source:** [PLAN] (a step sequence must trace a path that EXISTS in the 09 graph, in order);
  [PO] (navigation returns another screen).

### B-d — The walked screen sequence realizes the 08 nominal-path leaf order [PLAN]
- **Detect:** The ordered sequence of interaction `When` steps (their bound 09 Events → 08 leaf tasks
  via `task=`) does **not** match the **nominal-path leaf order** of this feature's 08 model — leaves
  reordered, skipped, or interleaved with off-nominal leaves. The realized order is over the
  **interaction/user** nominal leaves only: a `system`-category nominal leaf imposes **no walk
  obligation** (no 09 Event realizes it and the walk is not required to), so it is excluded from the
  comparison on both sides — mirroring 09's B-b (`INTERACTION_LEAF_CATEGORIES = {interaction, user}`;
  system leaves are dropped from the realization sequence). A walk that omits a system leaf is therefore
  **not** a B-d violation.
- **Fix:** Order the walk so the interaction `When` steps trace the 08 nominal-path **interaction/user**
  leaf order exactly (the job's happy path); a `system` leaf on the nominal path is realized in the
  built product, not in the 10 walk, and requires no `When`.
- **Severity:** ❌
- **Source:** [PLAN] (the walked screen sequence must realize the 08 nominal-path leaf order); 08
  nominal-path ownership.

### B-e — Interaction `When` steps bind to a 09 Event by the pinned disambiguation
- **Detect:** A `When` step neither contains an **exact 09 `01-event` string verbatim** (required when
  the bound Event is **domain-affecting** — carries an `01-event` in 09) NOR contains an **exact 09
  `Event` id in quotes** (required when the Event is non-domain-affecting), OR it uses the wrong form
  for the Event's kind (a quoted id for a domain-affecting Event, or vice versa), OR the `When`
  performs more than one interaction (more than one Event).
- **Fix:** One interaction per `When`; embed the exact `01-event` string for domain-affecting Events,
  else the quoted Event id — per the pinned disambiguation.
- **Severity:** ❌
- **Source:** [PLAN] (pinned When disambiguation: 01-event verbatim where domain-affecting, else quoted
  Event id); [REF] (When = one event/action).

### B-f — Steps are declarative — no UI mechanics below the screen id
- **Detect:** A step uses CSS selectors, URLs, pixel/button language, or imperative widget mechanics
  ("click the blue button", "fill the 3rd field", "visit /orders", "press Submit") instead of the
  screen id / event-string abstraction.
- **Fix:** Rewrite at the screen-id / event abstraction; mechanics belong below the Gherkin line in the
  step-definition layer (which compiles to [WD]/[PW], cite-only).
- **Severity:** ❌
- **Source:** [STYLE] (declarative over imperative — "the screen id IS the abstraction"); [UI-AP]
  ("buttons and links and fields" is poor documentation); UI-coupling ruling.

---

## Theme C — Outcome binding (domain assertions live in 06)

### C-a — Domain outcomes use the pinned binding form, resolving to a 06 tag [PLAN]
- **Detect:** A domain-outcome step is not exactly `Then the outcome of "<exact 06 tag>" holds`, OR the
  quoted `<06 tag>` does **not** resolve to a tag carried by some scenario in the 06 suite (the
  *"06 tag that resolves nowhere is a finding"* clause), OR the tag is outside 06's closed grammar
  (`@invariant:` / `@transition:` / `@terminal:` / `@policy:`).
- **Fix:** Bind every domain outcome with `Then the outcome of "<exact 06 tag>" holds`, the only legal
  domain-outcome form; the tag must resolve against the 06 suite.
- **Severity:** ❌
- **Source:** [PLAN] (the only legal domain-outcome form; 06 tag resolves; 06 owns the tag vocabulary).

### C-b — Every walked 08 leaf's scenario-tag is covered by ≥1 outcome binding [PLAN]
- **Detect:** A scenario-tag carried by some 08 nominal-path leaf walked in this feature has **no**
  matching `Then the outcome of "<that tag>" holds` step anywhere in the feature's scenario chain
  (coverage gap).
- **Fix:** Add an outcome-binding step for each scenario-tag of the walked 08 leaves; the chain's
  bindings must cover every such tag.
- **Severity:** ❌
- **Source:** [PLAN] (≥1 outcome binding per chain covering every scenario-tag of the walked 08 leaves).

### C-c — Domain assertions are never restated; every `Then` is a navigation or outcome step [PLAN]
- **Detect:** A `Then`/`And`/`But` step under a `Then` is **neither** a navigation step
  (`… is taken to the "<screen>" screen`) **nor** an outcome-binding step
  (`the outcome of "<06 tag>" holds`) — e.g. it asserts a domain state in prose ("the order is
  Dispatched", "the balance is zero"), restating what 06 owns.
- **Fix:** Remove the prose assertion; bind the domain outcome by 06 tag instead. The only legal `Then`
  shapes are navigation and outcome-binding (mechanical shape check).
- **Severity:** ❌
- **Source:** [PLAN] (domain assertions live in 06, never restated; a Then that is neither navigation
  nor outcome-binding is a violation); [PO] (assertion-free reference — outcomes bind to 06, not to the
  screen-walk); [UI-AP] ("when I check my balance", the domain rule, not the widget).

### C-d — Outcome bindings sit after the interaction they realize
- **Detect:** A `Then the outcome of "<tag>" holds` step precedes the `When` interaction whose 08 leaf
  carries that scenario-tag (the binding asserts an outcome before its cause), or floats with no
  preceding interaction in the chain.
- **Fix:** Place each outcome binding immediately after the interaction step that realizes it (G/W/T
  ordering: the outcome follows its event).
- **Severity:** ⚠️
- **Source:** [REF] (Given=past, When=present, Then=near-future — outcome follows the event); [PLAN]
  (each step's outcome binds the 06 scenario it realizes).

---

## Theme D — Gherkin canon (cucumber.io)

### D-a — Declarative, not imperative
- **Detect:** A step describes UI mechanics (click/press/type/visit/see-on-page) instead of the screen
  / event / domain abstraction. (Sharper restatement of B-f for the canon lens.)
- **Fix:** Use the screen id, the event string, or domain language; push mechanics into step
  definitions.
- **Severity:** ❌
- **Source:** [STYLE] (declarative style); [UI-AP] (UI-coupling).

### D-b — Single `When`: exactly one interaction per scenario step
- **Detect:** A `When` chains two actions (`When X and Y`) or two Events in one step. (One-interaction
  framing; a chain may have several `When` steps as it walks, but each `When` is exactly one Event.)
- **Fix:** Keep each `When` to one interaction (one 09 Event); a second interaction is a separate `When`
  in the walk, or established context in a `Given`.
- **Severity:** ❌
- **Source:** [REF] (When = an event/action); [STYLE] (single When where one interaction).

### D-c — Given/When/Then role discipline
- **Detect:** A `Given` performs an interaction instead of establishing the location/context, OR a
  `When` asserts instead of acting, OR `When`/`Then` order is scrambled.
- **Fix:** `Given` = location/context (the persona is on a screen), `When` = the one interaction,
  `Then` = navigation or outcome-binding only.
- **Severity:** ❌
- **Source:** [REF] (Given/When/Then semantics); [UI-AP] §"No clear separation between Given, When, and
  Then".

### D-d — `Background` holds only shared `Given` context
- **Detect:** A `Background` contains `When`/`Then` steps, or sets up incidental state, rather than the
  shared location/context `Given`s common to all scenarios in the file.
- **Fix:** Put only shared `Given` context in `Background` (e.g. the persona's starting location), keep
  it short; if not shared by all scenarios, inline it.
- **Severity:** ⚠️
- **Source:** [REF] (Background = shared `Given` steps).

### D-e — Scenario titles describe the behavioral outcome of the walk
- **Detect:** A scenario title is mechanical/implementation-flavored ("Test fulfil order", "Walk the
  screens", "Click through"), empty, or restates step text rather than the job outcome.
- **Fix:** Title each scenario by the behavioral outcome of the walked job, present tense, third-person
  (e.g. "The Dispatcher fulfils an order end to end").
- **Severity:** ⚠️
- **Source:** [STYLE] (describe behaviour, *what* not *how*); [UI-AP] part #1 (bad/no scenario name).

### D-f — No incidental detail in the walk
- **Detect:** A step specifies values that don't matter to the walk (exact ids, timestamps, emails
  where any value works), or asserts non-observable internal state, adding noise the screen-id / event
  / tag abstraction already captures.
- **Fix:** Drop incidental specifics; the screen id, event string, and 06 tag are the only load-bearing
  tokens.
- **Severity:** ⚠️
- **Source:** [UI-AP] part #1 (incidental details); [STYLE] (hide incidental detail).

---

## Theme E — Language discipline & DRY

### E-a — Persona named by the 09 `persona` natural name (no personal pronoun)
- **Detect:** A step names the actor with anything but the 09 `<IFMLModel persona="…">` value verbatim
  (a paraphrase, a role drift, or the personal pronoun `I`/`me`/`my`).
- **Fix:** Use the exact 09 persona natural name (sourced from 07 via 09) in every step; never `I`.
- **Severity:** ❌
- **Source:** [PLAN] (persona natural names from 07 via 09); [UI-AP] §"Scenarios that use I".

### E-b — No invented screens, events, or tags [PLAN]
- **Detect:** A step references a `"<screen>"` not a 09 `ViewContainer.id`, a quoted `"<Event id>"` not
  a 09 `Event.id`, an embedded event string not a 09 `01-event` value, or a `"<06 tag>"` not present in
  the 06 suite — fabricated vocabulary. (Consolidates B-a / B-e / C-a for the language lens.)
- **Fix:** Reference only verbatim upstream vocabulary; if a screen/event/tag is genuinely needed it
  belongs upstream (09 / 06), never coined in 10.
- **Severity:** ❌
- **Source:** [PLAN] (no invented screens/events/tags; single ownership upstream — 09 owns the walk
  vocabulary, 06 owns the tag vocabulary).

### E-c — Verbatim-string exemption (erd-L12 precedent)
- **Detect:** A forbidden-synonym or vocabulary-drift flag fired inside a **mandated verbatim string** —
  an exact 09 `01-event` string the `When` is *compelled* to embed (B-e), an exact 09 screen/Event id, a
  06 tag, or the 09 persona value.
- **Fix:** **Do not rewrite.** These strings are pinned by upstream authority; the exemption applies
  exactly as the erd skill's L12 rule exempts mandated verbatim strings (matching the 06 D4 precedent).
- **Severity:** ℹ️ (exemption note; never a failure)
- **Source:** [PLAN] (erd-L12 verbatim-exemption precedent).

### E-d — No 06 scenario bodies copied (DRY shape-lint)
- **Detect:** A 10 step copies a 06 scenario's Given/When/Then body, embeds a 06 invariant's rule text,
  or otherwise restates a 06 domain assertion in prose rather than binding it by tag (C-a/C-c) — the
  walk duplicating 06 instead of referencing it.
- **Fix:** Bind to 06 by `@`-tag only; the domain assertion stays in 06. The 10 walk carries
  navigation + interaction + tag-binding, never copied 06 bodies.
- **Severity:** ❌
- **Source:** [PLAN] (DRY: no 06 scenario bodies copied; 06 owns domain assertions).

---

## Pass condition

A 10 feature directory **passes** iff it has **zero ❌** across Themes A–E. ⚠️ and ℹ️ are surfaced as
agent-judged residue and **never block the gate** (DOCTRINE §1). The three [PLAN] findings named in the
acceptance closure are each a ❌: **a step naming a screen absent from 09** (B-a), **a 06 tag that
resolves nowhere** (C-a), and **an 08 task model with no 10 feature** (A-a).
