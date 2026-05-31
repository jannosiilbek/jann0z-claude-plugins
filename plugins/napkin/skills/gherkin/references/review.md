# Reviewing specs (REVIEW stage)

Run the passes in order, cheapest/most-mechanical first; each later pass assumes the
previous passed. Spend human/LLM judgment only on passes 3–7. Output a findings report:
for each issue give the anti-pattern name, the offending location, and a concrete fix.

## Pass 0 — Spec conformance

Validates the spec→feature handoff. Do **not** re-run the six-file intra-spec alignment
checks here — those passed upstream in `collect-context`; this pass only confirms the
features consume the context faithfully.

- **Capability coverage:** every `spec/features/<capability>/` folder maps to a
  `capability-map.md` row, and every in-scope capability has a folder.
- **Dependency integrity:** every `# Depends on:` path resolves to a file that exists, and
  matches the depended-on capability's Primary feature file in `capability-map.md`. No
  synthesized `<cap>/<cap>.feature`; `@prereq` mirrors each dependency.
- **Glossary fidelity:** every domain noun and enum/state value — in a scenario **or in the
  Feature narrative** (`In order to / As a / I want`) — appears in `spec/glossary.md`
  verbatim: no forbidden synonym, no re-spelled enum value. (Connective English in a title,
  e.g. "when the role is Agent", is not a term reference — only the value `Agent` must match.)
- **Scope:** no scenario specifies a `product.md` Out-of-scope item.
- **Provenance (PIPELINE.md rule 7):** every feature's behavior traces to its
  `capability-map.md` row and every domain noun to `spec/glossary.md`. A feature that
  introduces an un-owned domain concept (an entity/notification/capability no spec file
  owns) is drift — add it to the spec first, never smuggle it in.
- **RBAC coverage:** every `rbac-matrix.md` cell for an in-scope Resource has a scenario —
  allowed cell → a permitted-action scenario, denied cell → a negative "forbidden when the
  role is X" scenario; row conditions appear as `Given`s. **Fix:** add the missing scenario.
- **NFR coverage (by taxonomy — see PIPELINE.md rule 4):** every **behavioral** `nfr.md`
  invariant is asserted — tenant isolation as a cross-cutting `Then`, subscription gating as
  trial-expiry/lapsed scenarios, each audit-recording invariant as a scenario, each
  data-lifecycle event (erasure-on-deletion, anonymization) as a scenario, auth flows and
  in-app limits as scenarios; a missing one = uncovered behavior. **Operational** invariants
  (those marked `(operational)` — see PIPELINE.md rule 4) are acknowledged as out-of-scenario,
  not counted as a coverage miss.

## Pass 1 — Mechanical lint gate

Run the bundled config: `npx gherkin-lint -c plugins/napkin/skills/gherkin/assets/gherkin-lintrc <path>`
(or copy `gherkin-lintrc` to the project root as `.gherkin-lintrc`). Catches: unnamed
features/scenarios, duplicate feature/scenario names, out-of-order Given/When/Then,
**multiple `When`s** (`only-one-when`), oversized scenarios, dead Outline variables,
tag chaos, indentation, file-name conventions.

## Pass 2 — Structure & format

One `Feature:` per file with a clear title; Background only for 2+ scenarios and ~3–4
contextual `Given`s; strict G→W→T with no phase repeated out of order; `And`/`But`
(never `Or`); <~10 steps, <~12 scenarios; quoted params; doc strings for payloads; data
tables for lists. *Catches structural smells hiding multiple behaviors.*

## Pass 3 — Single behavior (cardinal rule)

Exactly one `When`; focused `Then`; title names that one behavior.
- **Anti-pattern: multiple When-Then in one scenario** → ambiguous failures, unnameable
  title. **Fix:** split into one scenario per behavior; re-express the later precondition
  as a `Given`.
- **Anti-pattern: mixed step types** (actions in `Given`, assertions in `When`) → kills
  reuse. **Fix:** `Given`=state, `When`=one action, `Then`=checks.

## Pass 4 — Declarative & business-readable

No selectors/XPath/URLs/SQL/HTTP/click/type unless the mechanic *is* the behavior; third
person, present tense; ubiquitous vocabulary; realistic concrete data. Optionally run a
Vale prose lint over the `.feature` files (`assets/vale/`).
- **Anti-pattern: imperative/UI-tour steps** → couples to UI, buries intent. **Fix:** raise
  to declarative intent; push mechanics into step defs.
- **Anti-pattern: vocabulary drift** → breaks shared understanding + reuse. **Fix:** one
  concept/one term; align to `spec/glossary.md`.
- **Anti-pattern: placeholder filler** (`foo`/`bar`) → **Fix:** realistic example data.

## Pass 5 — Deterministic & independent

Each scenario sets up its own state and runs in any order/isolation; `Then`s are observable
and checkable; no real clock/random/network ordering or shared mutable fixtures.
- **Anti-pattern: order-dependent scenarios** → flaky, non-parallelizable. **Fix:**
  self-contained `Given` per scenario; never chain scenarios.
- **Anti-pattern: bloated Background / hidden setup** → couples unrelated scenarios.
  **Fix:** limit to ~3–4 shared `Given`s; push scenario-specific setup into the scenario.
- **Anti-pattern: vague / non-observable `Then`** (`it works`, or a bare
  `is changed`/`is updated` that passes for any mutation or none) → asserts nothing.
  **Fix:** state an observable outcome with the after-value (`the Seat count is 6`,
  `a confirmation email is sent to admin@example.com`).

## Pass 6 — Coverage via Example Mapping

Per rule, confirm at least one happy + edge/boundary equivalence classes + error/negative
example. A rule with no example = uncovered behavior; an open question (red card) =
unresolved ambiguity, so don't code yet; many rules = story too big, slice it.
- **Anti-pattern: happy-path-only coverage** → defect-prone paths unspecified. **Fix:**
  add boundary and error examples.
- **Anti-pattern: scenario explosion / unfocused Outlines** → slow low-signal suites.
  **Fix:** one row per equivalence class; push exhaustive combos to unit tests.

## Pass 7 — Three-Amigos sign-off

Prompt the human for: **Business** — does this deliver the intended value? **Dev** — is it
feasible within constraints? **QA** — any ambiguity, untestable assertion, or missing
edge/error case? "Ready" only when all three agree and no red cards remain.

## Tooling layering

Lint/parser for structure; Vale for language consistency; runner **dry-run** +
undefined/ambiguous-step reports for spec-to-automation binding gaps. No single tool covers
all dimensions.
