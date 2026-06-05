---
name: flow-acceptance
description: >-
  Schema-therapy step 10 — the pipeline's TERMINAL artifact. Turns the domain layer (06 tags) +
  the task models (08 nominal paths) + the screen flows (09 IFML) into one executable Gherkin
  acceptance feature PER 08 task model: a scenario chain that walks the 09 flow screen by screen
  and binds each step's outcome to the 06 scenario it realizes by tag — domain assertions live in
  06 and are never restated. Consumes specs/06-gherkin/, specs/08-task-models/, specs/09-ui-flows/;
  OWNS specs/10-flow-acceptance/<persona>-<job>.feature. Together 06 (domain layer) + 10 (built
  product end to end) make the product validatable. Use when authoring or reviewing 10
  flow-acceptance features in a schema-therapy pipeline run. NOT general Gherkin/BDD or e2e-testing
  authoring — a closed, lint-gated pipeline step over a verified screen graph.
---

# flow-acceptance (10) — the terminal acceptance artifact

10 owns **exactly one `.feature` per 08 task model**. Each feature is a scenario chain that walks
the persona's 09 screen flow from its `home` container, tracing real `NavigationFlow` edges in the
order of the 08 nominal-path leaves, and binds every walked leaf's outcome to the 06 scenario it
realizes **by tag**. 06 validates the domain layer; 10 validates the built product end to end.

**The acceptance closure (PLAN, the prime contract).** *A 10 step naming a screen absent from 09, a
06 tag that resolves nowhere, or an 08 task model with no 10 feature is a finding.* Each is a ❌.

The full rule catalog (30 rules, Themes A–E) is `references/validation-rules.md`; the executable
harness contract is `references/simulation.md`. This file is the authoring procedure.

## 1 — Mechanical intake (what maps to what)

10 is **terminal** — nothing downstream consumes it. It reads a **narrow slice** of three upstreams:

| Upstream | What 10 reads | Becomes |
|---|---|---|
| `specs/08-task-models/<persona>-<job>.xml` | each model (1:1) + its **nominal-path leaf order** + each leaf's `scenario-tags` | one `.feature` per model; the walk order; the outcome obligations |
| `specs/09-ui-flows/<persona>.xml` | `ViewContainer` ids, `home="true"`, `Event` ids + `task=` + `01-event` annotations, `NavigationFlow` edges, the `persona` attribute | the walk vocabulary (screens, interactions, navigations) + the persona's natural name |
| `specs/06-gherkin/*.feature` | the **tag vocabulary** (closed grammar `@invariant:`/`@transition:`/`@terminal:`/`@policy:`) | the outcome-binding targets |

10 **coins nothing**: every screen id, Event id, `01-event` string, and 06 tag must appear verbatim
upstream. 10 **never edits** 06/08/09, and **never restates** a 06 domain assertion (it binds by tag).

## 2 — The artifact contract

**Directory + bijection.** Root `specs/10-flow-acceptance/`. One file per 08 model, named the
**exact 08 filename stem** + `.feature` (08 `dispatcher-fulfil_order.xml` →
`dispatcher-fulfil_order.feature`). Bijection both directions: no missing, extra, or doubled feature.

**`Feature:` name** = the 08 job, natural-cased (`fulfil_order` → `Feature: Fulfil order`).

**Feature tag** `@task-model:<exact 08 stem>` on the `Feature:`.

**Fingerprint block** — a leading `# fingerprints:` comment block **before** `Feature:`, one
`<file>@sha256:<64-hex>` line per consumed upstream: each consumed 06 `.feature`, the persona's 09
model (`09-ui-flows/<persona>.xml`), and the 08 model (`08-task-models/<persona>-<job>.xml`).

**The closed step grammar** (the heart — these forms are PINNED):

| Role | Form | Binds to |
|---|---|---|
| Location (`Given`) | `Given the <persona> is on the "<screen id>" screen` | 09 `ViewContainer.id` |
| Interaction (`When`) — domain-affecting | `When the <persona> <verb phrase>: "<exact 01-event string>"` | 09 `Event` carrying an `01-event` |
| Interaction (`When`) — non-domain | `When the <persona> triggers the "<Event id>" event` | 09 `Event` with no `01-event` |
| Navigation (`Then`) | `Then the <persona> is taken to the "<screen id>" screen` | a 09 `NavigationFlow` edge |
| Outcome (`Then`) | `Then the outcome of "<exact 06 tag>" holds` | a 06 scenario, by tag |

`<persona>` is the **exact 09 `persona` attribute value**, verbatim, in every step — never `I`. Each
`When` is **one** interaction. Every `Then` (and `And`/`But` under a `Then`) is **navigation or
outcome only** — no prose domain assertion. The walk starts at the `home="true"` container and every
navigation follows an existing 09 edge, in graph order, realizing the 08 nominal-path leaf order.

**Canonical feature** (the full pinned dialect):

```gherkin
# fingerprints:
#   06-gherkin/order.feature@sha256:<64-hex>
#   09-ui-flows/dispatcher.xml@sha256:<64-hex>
#   08-task-models/dispatcher-fulfil_order.xml@sha256:<64-hex>
@task-model:dispatcher-fulfil_order
Feature: Fulfil order

  The Dispatcher works an order from the queue through to dispatch, screen by
  screen, with each domain outcome bound to the 06 scenario it realizes by tag.

  Scenario: The Dispatcher fulfils an order end to end
    Given the Dispatcher is on the "order_queue" screen
    When the Dispatcher triggers the "open_order" event
    Then the Dispatcher is taken to the "order_detail" screen
    When the Dispatcher starts picking the order: "Picking Started"
    Then the outcome of "@transition:order" holds
    And the Dispatcher is taken to the "pick_confirm" screen
    When the Dispatcher dispatches the order: "Order Dispatched"
    Then the outcome of "@terminal:order" holds
    And the Dispatcher is taken to the "order_queue" screen
```

`"open_order"` is non-domain (quoted Event id); `"Picking Started"` / `"Order Dispatched"` are exact
09 `01-event` strings of domain-affecting Events (embedded verbatim — the hook that lets the outcome
bind to 06). `@transition:order` / `@terminal:order` are exact 06 tags covering the two walked 08
leaves. **Domain assertions are never restated** — only the bindings appear.

> **The UI-coupling ruling (binding).** Referencing a screen by its pinned 09 id is the **Page-Object
> discipline**, NOT the "Testing through the UI" anti-pattern. The screen id is a named, stable
> identity (a restyle does not change it); the walk is a declarative traversal of a *verified graph*.
> Outcomes bind to 06 by tag — never asserted in the screen reference. Mechanics (click/fill/CSS/URLs)
> belong below the Gherkin line in the step-definition layer (which compiles to WebDriver/Playwright,
> cite-only — never dictating `.feature` content).

## 3 — The 6-step pipeline

1. **Draft** — per intake + the upstream catalog, walk each 08 nominal path through the 09 graph:
   start at `home`, emit a location `Given`, then for each leaf the interaction `When` (01-event
   verbatim if domain-affecting, else quoted Event id), the navigation `Then` for the followed edge,
   and an outcome binding for each walked leaf's `scenario-tags`. Coin nothing; reference only
   verbatim upstream vocabulary.

2. **Professor gate** — review against `references/validation-rules.md`, **catalog-constrained**: the
   Professor owns the **D-theme canon verdicts** (declarative, single-When, G/W/T roles, behavioral
   titles, no incidental detail). Require **zero ❌** across Themes A–E; bounded to **5 iterations**.

3. **Lint** — run the harness (below). Mechanical/structural ❌ (A/B/C/D/E shape: bijection,
   filename, feature name, fingerprint, feattag, then-shape, when-form, persona, no-06-body,
   declarative) must be clean.

4. **Simulation** — the **same harness** runs the **walk-replay** oracle: each feature's step chain
   is replayed against the persona's 09 graph (V-START home, V-LOC screen ∈ 09 + on-path, V-EVENT
   correct interaction form, V-NAV real edge in order) and cross-referenced to the 08 walker
   (V-ORDER nominal-leaf order) + the 06 tag set (V-COVER every walked leaf's tag bound, V-TAG each
   binding resolves). **Upstream-defect STOP**: a 09 with a dangling navflow end on the walked path
   ⇒ routed `upstream-defect` → the named 09 file; a parseable-but-stuck 08 nominal path ⇒ routed →
   the named 08 file. Fix upstream, never patch 10.

5. **Final** — DRY + semantic drift pass: no copied 06 scenario bodies, persona-domain language in
   every step, screen ids exactly as 09 froze them, the bindings still cover every walked leaf.

6. **Emit + report** — fixed-format report including a **per-feature walk table** (persona, home,
   hops, walked-vs-nominal leaves, realizable, tags bound/required) and `Iterations to convergence:
   N`. Then hand off to **drift-police**:
   `Use the drift-police skill to verify 06↔10 tag drift and 09→10 screen-id drift.`

## 4 — Running the harness

```
node scripts/harness.mjs specs/10-flow-acceptance/ \
     --upstream-06 specs/06-gherkin/ \
     --upstream-08 specs/08-task-models/ \
     --upstream-09 specs/09-ui-flows/
```

All three flags are **required** (10 is unconditional — every 08 model has exactly one 10 feature).

- **stdout**: one stable-key-order JSON summary (per-feature `walks[]` with home / hops / walked-vs-
  nominal leaves / realizable / tags bound+required, sorted `checks[]`/`findings[]`, `counts` with
  separate engine + replay totals + edge reconciliation).
- **stderr**: diagnostics only (Gherkin parse throws with the `(line:col)` shape + matched
  `testdata/bad` oracle name, the vacuous-feature note, the walk-replay stranded-step trace with the
  step text + current container + missing target, the out-of-order leaf-sequence diff, the
  uncovered/ghost-tag detail, the upstream-defect routing note, the missing-parser install command).
- **Exit / status:** `0` pass · `1` fail (incl. upstream-defect, walk/coverage/tag failures) · `2`
  malformed (a `.feature` the parser rejects) · `3` broken-test (a check threw, reconciliation
  mismatch, zero checks, **missing parser**, or an **unparseable 06/08/09 upstream**).

The oracle is the **`@cucumber/gherkin` 39.1.0 reference parser** (the engine layer — every
`.feature` is PARSED + COMPILED to pickles; parse-clean + ≥1 pickle is the instantiation assertion;
ids are minted by `IdGenerator.incrementing()` and **never asserted**) + a **walk-replay** over the
09 graph (`scripts/lib/replay.mjs`, the load-bearing layer) + hand-rolled zero-dependency upstream
readers (`scripts/lib/ifml.mjs` copied from 09, `scripts/lib/taskmodel.mjs` copied from 08,
`scripts/lib/tags.mjs` copied from 08) + the closed `steps.mjs`/`checks.mjs`/`lexicon.mjs`. The
Gherkin parser self-installs (lockfile-pinned); absent + offline ⇒ broken-test, never a vacuous pass.

Self-test:

```
node scripts/selftest.mjs   # asserts every fixture's status+owner, wrong-reason isolation
                            # (V-LOC over V-TAG), replay honesty (navflow mutation flips V-NAV,
                            # step reorder flips the walk), parse-negative error shapes, the
                            # upstream-defect routes, byte-identical double-run, and the 18-❌
                            # positive+negative coverage floor. Exit 0 = pass.
```

## 5 — Single-ownership boundaries

10 references upstreams by exact string and **never re-verifies** what another skill owns: 09's KLM
budgets / bindings / non-walked structure (09's job — 10 walks the graph, it does not re-certify it),
08's tag/operator/KLM/budget seams (08's job — 10 re-walks only for the nominal-leaf order + each
walked leaf's `scenario-tags`), 06's coverage / domain assertions (06's job — 10 reads only the tag
vocabulary and binds by tag, never re-litigating 06). **10 reads NO 02/04/05/07** — personas/screens/
events come THROUGH 09, behaviors THROUGH 06 tags. An unparseable upstream is `broken-test`, not a
silent skip; a self-broken-but-parseable 09 navflow or 08 nominal path is `upstream-defect` routed to
the named file, never a 10 patch.
