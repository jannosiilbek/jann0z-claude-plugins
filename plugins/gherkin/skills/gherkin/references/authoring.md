# Authoring a feature (DRAFT stage)

Use while writing the scenarios within one feature.

## Given/When/Then semantics

- `Given` = pre-existing state, passive, present tense, **no actions**.
  `Given the home page is displayed` — not `Given the user navigates to the home page`.
- `When` = the **single** triggering event.
- `Then` = an **observable, checkable** outcome.

## Declarative, not imperative

Describe *what* the system does, not *how* the user clicks. Litmus: "Would this wording
change if only the implementation changed?" If yes, raise the abstraction; push UI/HTTP/SQL
mechanics into step definitions.

- Good: `When the user searches for "panda"`
- Bad: `When the user scrolls to the search box / clicks it / types "panda" / presses Enter`

Reserve mechanic-level steps only when the mechanic *is* the behavior (e.g. a keyboard-shortcut feature).

## One behavior per scenario

Exactly one `When` and a focused `Then`. A second `When-Then` is a second scenario;
re-express its precondition as a `Given`. No conjunction steps — split with `And`/`But`.
Gherkin has no `Or`; model alternatives with a Scenario Outline.

## Observable Then; no incidental detail

Every `Then` states how success is known (specific status code, message, field, count).
Drop hardcoded IDs/timestamps/exact lists; describe categorically. Use concrete *realistic*
example data, never `foo`/`bar` — unless the scenario is *about* generic/invalid input.

**Denial vocabulary (one word each, suite-wide):** a permission denial asserts the action
is `forbidden`; a business-rule or state denial asserts it is `refused`. Do not use
`rejected`/`blocked`. A denied write is always followed by a state-unchanged `And` (e.g.
`And the Ticket remains unassigned`) so the `Then` is observable, not just a label.

**Don't restate owned facts.** Never re-type a value another `spec/` file owns — a Plan's
SLA minutes, a quota, the tenancy mechanism — inside a step. Reference it symbolically
("a Shop on the Growth Plan") or assert the owning invariant; copy the literal number only
when that number is itself what the scenario tests.

**Aggregate/dashboard `Then`s state a unit.** "the dashboard shows compliance" is not
observable; assert the value and unit ("the first-response compliance is 50%").

**A positive `Then` binds a concrete after-value** ("the Seat count is 6", "the User's Role
is Owner") — never a bare `is changed`/`is updated`/`is modified`, which passes for any
mutation or none.

## Naming & ubiquitous language

- **Feature files:** kebab-case, named after the capability — `account-withdrawal.feature`,
  not `LoginPage.feature` / `Misc.feature`.
- **`Feature:` title:** a capability/value phrase. Pick **one** narrative template
  suite-wide — value-first Connextra (`In order to <value> / As a <role> / I want <capability>`)
  or job-story (`When <situation>, I want <motivation>, so I can <outcome>`).
  The `As a <role>` clause uses a verbatim glossary Role from a persona in
  `spec/personas.md`, and `In order to <value>` derives from that persona's goals/pains —
  do not invent roles or values.
- **Scenario titles:** concise, outcome-focused, distinguishing this scenario from its
  siblings — `Withdrawal is refused when the balance is insufficient`, not `Test 1`.
  Never prefix `test`/`verify`/`check` or embed ticket IDs (those go in tags).
- **Ubiquitous language:** one concept = one word across features, step definitions, and
  code. No vocabulary drift (user/customer/account-holder for one concept); no technical
  jargon (status codes, table names, DOM ids) in steps. The glossary is `spec/glossary.md`:
  use its Terms verbatim and copy enum/state values from its Enumerations table exactly — in
  `Given` preconditions and Scenario-Outline rows alike (mind traps like `canceled` vs
  `cancelled`).
- **Voice:** third person, present tense, complete subject-predicate phrases; never mix persons.

## DRY & reuse (clarity wins in the prose)

In feature files, **readability and self-containment beat DRY**; the real DRY win lives in
the step-definition code layer.

- **Background** only for genuinely shared, behavior-relevant `Given` setup (~3–4 steps).
  It runs before every scenario — keep it small and action-free.
- **Prefer repeated explicit `Given`s over Background** when a precondition is load-bearing
  to a specific scenario, so each scenario reads standalone and survives reordering. Move
  the duplication down into *one* reusable step definition, not into Background.
- **Scenario Outline + Examples** for the *same* behavior across equivalence classes — one
  row per class, not per combination. Each column must drive the rule; strip incidental
  columns (passwords, IDs, timestamps).
- **Data tables vs Outlines:** data tables = many items in one execution (seed records,
  assert a result set); Outline = one item, many executions.
- When DRY conflicts with clarity, **choose clarity**.

## Tags & micro-formatting

- Tags lowercase, hyphen-separated, namespaced (`@smoke @regression @prio-1 @team-checkout`);
  small documented vocabulary; no case drift.
- **Traceability:** tag each feature `@capability:<kebab>` (its capability-map row) and one
  `@prereq @<capability>` per `# Depends on:` dependency. The full tag contract (including
  the optional external `@REQ-<id>`) is PIPELINE.md rule 2 — cite it, don't restate it.
- Capitalize only Gherkin keywords + first word of titles; no trailing punctuation on steps;
  parameters in double quotes; lines ~80–120 chars.
- **Enum/state values are written bare in prose** (`the Subscription status is past_due`),
  never quoted; reserve double quotes for Scenario-Outline placeholders and free-text/payload
  values.
- One `@prereq @<capability>` per dependency, mirroring each `# Depends on:` line (a
  multi-dependency feature has several of each, in matching order).

## Worked example

```gherkin
Feature: Account withdrawal

  In order to access my money
  As an account holder
  I want to withdraw cash

  Scenario: Withdrawal is refused when the balance is insufficient
    Given an account with a balance of 50 EUR
    When the account holder withdraws 100 EUR
    Then the withdrawal is refused
    And the balance remains 50 EUR
```
