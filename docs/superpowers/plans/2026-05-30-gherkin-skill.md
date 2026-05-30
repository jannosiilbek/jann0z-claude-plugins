# Gherkin BDD Skill + Plugin Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, shareable Claude Code plugin marketplace seeded with a framework-agnostic Gherkin/BDD skill that authors and reviews `.feature` specs with foundation-first ordering and multi-pass validation.

**Architecture:** A marketplace repo (`.claude-plugin/marketplace.json`) hosts one plugin under `plugins/gherkin/`. The plugin ships a single skill whose `SKILL.md` is a lean dispatcher (cardinal rules inline + mode routing + deep-review auto-policy) that loads one of four pipeline-stage reference files on demand (plan / author / review / agentic-loop), backed by bundled assets (a `gherkin-lint` config, an SDD feature template, and an optional Vale style).

**Tech Stack:** Markdown skill content, JSON manifests, `gherkin-lint` (npm, run via `npx`), optional Vale. No application runtime — validation is JSON/schema/lint checks plus skill-trigger dogfooding.

**Source spec:** `docs/superpowers/specs/2026-05-30-gherkin-skill-design.md`

**Conventions for every task:** Commit with the shown message. Use `git -c user.name="janno" -c user.email="janno.siilbek@gmail.com" commit` only if global git identity is unset; otherwise plain `git commit`.

---

### Task 1: Marketplace + plugin manifests, README, LICENSE

Establishes the foundation: the repo is a discoverable marketplace with one plugin. (Foundation-first: nothing else is loadable until manifests are valid.)

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `plugins/gherkin/.claude-plugin/plugin.json`
- Create: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Write the marketplace manifest**

Create `.claude-plugin/marketplace.json`:

```json
{
  "name": "jann0z-claude-plugins",
  "owner": {
    "name": "janno",
    "email": "janno.siilbek@gmail.com"
  },
  "metadata": {
    "description": "Janno's Claude Code plugins.",
    "version": "0.1.0"
  },
  "plugins": [
    {
      "name": "gherkin",
      "source": "./plugins/gherkin",
      "description": "Author and review framework-agnostic Gherkin/BDD specs with best-practice enforcement, foundation-first ordering, and multi-pass validation."
    }
  ]
}
```

- [ ] **Step 2: Write the plugin manifest**

Create `plugins/gherkin/.claude-plugin/plugin.json`:

```json
{
  "name": "gherkin",
  "version": "0.1.0",
  "description": "Author and review framework-agnostic Gherkin/BDD specs: declarative single-behavior scenarios, DRY discipline, proper naming, foundation-first suite ordering, and a multi-pass validation checklist.",
  "author": {
    "name": "janno",
    "email": "janno.siilbek@gmail.com"
  },
  "license": "MIT",
  "keywords": ["gherkin", "bdd", "cucumber", "specifications", "spec-driven-development", "testing"]
}
```

- [ ] **Step 3: Write the LICENSE (MIT)**

Create `LICENSE`:

```
MIT License

Copyright (c) 2026 Janno Siilbek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Write the README**

Create `README.md`:

```markdown
# jann0z-claude-plugins

A personal [Claude Code](https://claude.com/claude-code) plugin marketplace.

## Install

```
/plugin marketplace add jannosiilbek/jann0z-claude-plugins
/plugin install gherkin@jann0z-claude-plugins
```

## Plugins

### gherkin

Author and review **framework-agnostic Gherkin/BDD specs**. The skill enforces
declarative, single-behavior scenarios; DRY discipline; consistent naming and
ubiquitous language; foundation-first suite ordering; and a multi-pass validation
checklist (mechanical lint → judgment passes → Three-Amigos sign-off). It is tuned
for spec-driven development with coding agents — declarative specs become the
machine-checkable acceptance gate.

Triggers on prompts like "write Gherkin for…", "review these feature files", or
"are these scenarios DRY?".

## License

MIT — see [LICENSE](LICENSE).
```

- [ ] **Step 5: Validate the JSON manifests parse**

Run:
```bash
python3 -c "import json; json.load(open('.claude-plugin/marketplace.json')); json.load(open('plugins/gherkin/.claude-plugin/plugin.json')); print('OK')"
```
Expected: `OK` (no traceback). If a `JSONDecodeError` prints, fix the offending file and re-run.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin plugins/gherkin/.claude-plugin README.md LICENSE
git commit -m "feat: scaffold marketplace and gherkin plugin manifests"
```

---

### Task 2: SKILL.md dispatcher

The skill entry point: frontmatter, the inline cardinal rules, mode routing, and the deep-review auto-policy. Loads reference files by pipeline stage.

**Files:**
- Create: `plugins/gherkin/skills/gherkin/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Create `plugins/gherkin/skills/gherkin/SKILL.md`:

````markdown
---
name: gherkin
description: Use when writing, authoring, reviewing, or refactoring Gherkin/.feature BDD specs, or doing spec-driven development with a coding agent. Enforces declarative single-behavior scenarios, DRY discipline, naming & ubiquitous language, foundation-first suite ordering, and a multi-pass validation checklist. Framework-agnostic (Cucumber, Behave, pytest-bdd, SpecFlow/Reqnroll, godog).
---

# Gherkin BDD Specs

Author and review high-quality, framework-agnostic Gherkin. Produce declarative,
single-behavior specs that double as the machine-checkable acceptance gate for
coding agents.

## Cardinal rules (always apply)

1. **One scenario, one behavior.** Exactly one `When`/`Then` pair. A second `When-Then`
   is a second scenario — re-express its precondition as a `Given`.
2. **Declarative, not imperative.** Describe *what*, not *how*. Litmus: "Would this
   wording change if only the implementation changed?" If yes, raise the abstraction.
3. **Strict Given/When/Then.** `Given` = pre-existing state (passive, present tense, no
   actions); `When` = the single triggering event; `Then` = an observable, checkable outcome.
4. **Observable `Then`s.** No "it works" / "the result is correct". Assert specific codes,
   messages, fields, counts.
5. **Short scenarios.** ~<10 steps; ~a dozen scenarios per feature; one feature per file.
6. **No conjunction steps.** Split with `And`/`But`. Gherkin has no `Or` — use Scenario Outlines.
7. **Exclude incidental detail.** Drop hardcoded IDs/timestamps/exact lists; describe
   categorically ("an overdrawn account").
8. **Consistent voice.** Third person, present tense; never mix persons.
9. **Specification, not script.** Living documentation in ubiquitous language; write
   scenarios before code.

## Modes

Pick the mode that matches the request.

### Author — generate specs from a brief

1. **PLAN** — read `references/planning.md`. Decompose into capabilities; order
   foundation-first (walking skeleton → identity/auth → core entities → workflows →
   edge/cross-cutting); vertical-slice each feature.
2. **Example-map** — per capability, list rules and, for each rule, at least one happy +
   boundary/edge + error example. Surface open questions instead of guessing.
3. **DRAFT** — read `references/authoring.md`. Write the scenarios; put an SDD header
   (`assets/feature-template.feature`) on each feature file.
4. **SELF-REVIEW** — run the Review mode checklist on your own output before presenting.

### Review — validate existing specs

Read `references/review.md` and run the ordered multi-pass checklist (mechanical lint →
structure → single-behavior → declarative → deterministic/independent → coverage →
Three-Amigos). Return findings keyed to the anti-pattern catalog, each with a concrete fix.

### Implement-from-spec (coding agent)

When handing specs to a coding agent, read `references/agentic-loop.md` for the
spec→code loop and the anti-reward-hacking guards.

## Deep-review auto-policy

Spend agentic rigor proportional to the cost of a wrong spec. **Auto-engage deep-review**
(dispatch parallel sub-agent reviewers — one per judgment pass — and/or an adversarial
author→review→fix loop) when ANY of:

- authoring or reviewing a **multi-feature suite** (not a one-line edit), or
- the capability is **foundational / high-stakes** (auth, payments, core domain), or
- the standard review surfaces **unresolved ambiguity or conflicting findings**.

Stay single-agent for a single small scenario edit or a trivial review. **If sub-agent or
workflow capability is unavailable, degrade automatically to the single-agent multi-pass.**

## Project glossary

Maintain a `features/GLOSSARY.md` of ubiquitous-language terms (one concept = one word).
Check new specs against it; add new terms as they appear.
````

- [ ] **Step 2: Validate frontmatter and required sections**

Run:
```bash
python3 - <<'PY'
import re, sys
t = open('plugins/gherkin/skills/gherkin/SKILL.md').read()
assert t.startswith('---'), "missing frontmatter"
fm = t.split('---', 2)[1]
assert re.search(r'^name:\s*gherkin\s*$', fm, re.M), "name frontmatter wrong/missing"
assert 'description:' in fm, "description missing"
for s in ['## Cardinal rules', '## Modes', '### Author', '### Review', '## Deep-review auto-policy']:
    assert s in t, f"missing section: {s}"
print('OK')
PY
```
Expected: `OK`. If an assertion fails, fix the file and re-run.

- [ ] **Step 3: Commit**

```bash
git add plugins/gherkin/skills/gherkin/SKILL.md
git commit -m "feat: add gherkin SKILL.md dispatcher with cardinal rules and modes"
```

---

### Task 3: references/planning.md (PLAN stage)

Foundation-first ordering, vertical slicing, capability folders, SDD feature-header template.

**Files:**
- Create: `plugins/gherkin/skills/gherkin/references/planning.md`

- [ ] **Step 1: Write planning.md**

Create `plugins/gherkin/skills/gherkin/references/planning.md`:

````markdown
# Planning a spec suite (PLAN stage)

Use when generating specs from a brief, or whenever more than one feature is in play.

## 1. Decompose into capabilities

Break the brief into **business capabilities / bounded contexts** — not technical layers,
not one-file-per-user-story. Capability folders give a coding agent a stable map and keep
specs in the problem domain.

```
features/
  identity/        # foundational
    registration.feature
    authentication.feature
  catalog/
    product.feature
  ordering/
    checkout.feature
    payment.feature
```

Anti-patterns: `features/db/`, `features/ui/` (technical layers leak solution domain);
`features/story-1234.feature` (thin-slice sprawl, no capability map).

## 2. Order foundation-first (topological)

1. **Walking skeleton** — one thinnest end-to-end vertical slice through the whole pipeline.
   Forces infra/CI/harness into existence and proves the seams. Keep its behavior trivial.
2. **Identity / auth.**
3. **Core domain entities** (account, product).
4. **Primary workflows** (order, pay) that consume the entities.
5. **Edge cases & cross-cutting** (notifications, reporting).

Rationale: a dependent capability can't be specified meaningfully until the state it
consumes exists. Specifying dependents first makes a coding agent invent contracts that
later conflict with the real foundation — forcing expensive regeneration.

## 3. Slice vertically, never horizontally

Each feature is a full-stack, independently testable behavior (INVEST). Horizontal slices
("build the DB table", "build the UI" as separate specs) integrate only at the end and
leave the suite red — fatal for an agent expected to stay green per increment.

## 4. Express dependencies explicitly

State inter-feature dependencies in the SDD header and tags
(`@prereq @identity`, `# Depends on: ../identity/authentication.feature`) — never as
implicit run-order between scenarios. Runners and agents reorder and parallelize.

## 5. SDD feature header (every feature file)

Copy `assets/feature-template.feature`. Each feature opens with:

- **Outcome** — the capability/value in one line.
- **In-scope / Out-of-scope** — closing scope stops a coding agent expanding it.
- **Prior decisions** — recorded architecture choices stop the agent re-deciding them.
- **Acceptance criteria** — what "done" means.
- Scenarios as task units; tag with requirement/capability IDs (`@REQ-1024 @capability:payment`).
````

- [ ] **Step 2: Validate it is non-empty and references the template**

Run:
```bash
test -s plugins/gherkin/skills/gherkin/references/planning.md && grep -q "feature-template.feature" plugins/gherkin/skills/gherkin/references/planning.md && echo OK
```
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add plugins/gherkin/skills/gherkin/references/planning.md
git commit -m "feat: add planning.md (foundation-first ordering reference)"
```

---

### Task 4: references/authoring.md (DRAFT stage)

How to write one good scenario/feature: GWT semantics, declarative litmus, one-behavior, naming & language, DRY/reuse decisions, formatting.

**Files:**
- Create: `plugins/gherkin/skills/gherkin/references/authoring.md`

- [ ] **Step 1: Write authoring.md**

Create `plugins/gherkin/skills/gherkin/references/authoring.md`:

````markdown
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

## Naming & ubiquitous language

- **Feature files:** kebab-case, named after the capability — `account-withdrawal.feature`,
  not `LoginPage.feature` / `Misc.feature`.
- **`Feature:` title:** a capability/value phrase. Pick **one** narrative template
  suite-wide — value-first Connextra (`In order to <value> / As a <role> / I want <capability>`)
  or job-story (`When <situation>, I want <motivation>, so I can <outcome>`).
- **Scenario titles:** concise, outcome-focused, distinguishing this scenario from its
  siblings — `Withdrawal is refused when the balance is insufficient`, not `Test 1`.
  Never prefix `test`/`verify`/`check` or embed ticket IDs (those go in tags).
- **Ubiquitous language:** one concept = one word across features, step definitions, and
  code. No vocabulary drift (user/customer/account-holder for one concept); no technical
  jargon (status codes, table names, DOM ids) in steps. Keep `features/GLOSSARY.md` current.
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
- Capitalize only Gherkin keywords + first word of titles; no trailing punctuation on steps;
  parameters in double quotes; lines ~80–120 chars.

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
````

- [ ] **Step 2: Validate it is non-empty and includes a fenced gherkin example**

Run:
```bash
test -s plugins/gherkin/skills/gherkin/references/authoring.md && grep -q '```gherkin' plugins/gherkin/skills/gherkin/references/authoring.md && echo OK
```
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add plugins/gherkin/skills/gherkin/references/authoring.md
git commit -m "feat: add authoring.md (how to write one good feature)"
```

---

### Task 5: references/review.md (REVIEW stage)

The ordered multi-pass validation checklist with the anti-pattern catalog folded in (each pass states what it catches + the fix).

**Files:**
- Create: `plugins/gherkin/skills/gherkin/references/review.md`

- [ ] **Step 1: Write review.md**

Create `plugins/gherkin/skills/gherkin/references/review.md`:

````markdown
# Reviewing specs (REVIEW stage)

Run the passes in order, cheapest/most-mechanical first; each later pass assumes the
previous passed. Spend human/LLM judgment only on passes 3–7. Output a findings report:
for each issue give the anti-pattern name, the offending location, and a concrete fix.

## Pass 1 — Mechanical lint gate

Run the bundled config: `npx gherkin-lint -c plugins/gherkin/skills/gherkin/assets/gherkin-lintrc <path>`
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
  concept/one term; update the glossary.
- **Anti-pattern: placeholder filler** (`foo`/`bar`) → **Fix:** realistic example data.

## Pass 5 — Deterministic & independent

Each scenario sets up its own state and runs in any order/isolation; `Then`s are observable
and checkable; no real clock/random/network ordering or shared mutable fixtures.
- **Anti-pattern: order-dependent scenarios** → flaky, non-parallelizable. **Fix:**
  self-contained `Given` per scenario; never chain scenarios.
- **Anti-pattern: bloated Background / hidden setup** → couples unrelated scenarios.
  **Fix:** limit to ~3–4 shared `Given`s; push scenario-specific setup into the scenario.
- **Anti-pattern: vague / non-observable `Then`** (`it works`) → asserts nothing. **Fix:**
  state an observable outcome (`a confirmation email is sent to admin@example.com`).

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
````

- [ ] **Step 2: Validate all seven passes are present**

Run:
```bash
python3 - <<'PY'
t = open('plugins/gherkin/skills/gherkin/references/review.md').read()
for i in range(1, 8):
    assert f"## Pass {i}" in t, f"missing Pass {i}"
print('OK')
PY
```
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add plugins/gherkin/skills/gherkin/references/review.md
git commit -m "feat: add review.md (multi-pass validation checklist)"
```

---

### Task 6: references/agentic-loop.md (IMPLEMENT stage)

The spec→code loop + anti-reward-hacking guards + the fit gate.

**Files:**
- Create: `plugins/gherkin/skills/gherkin/references/agentic-loop.md`

- [ ] **Step 1: Write agentic-loop.md**

Create `plugins/gherkin/skills/gherkin/references/agentic-loop.md`:

````markdown
# Implementing from specs (IMPLEMENT stage)

Use when a coding agent will turn `.feature` specs into working code.

## The loop

1. Generate the **failing** scenarios for the next foundation-first increment.
2. **Run them red first** and confirm each fails *for the right reason* (not a missing
   import, not the wrong assertion class).
3. Implement the minimal code to make them pass.
4. Run the scenarios green.
5. Iterate to the next increment. A **human reviews each scenario** (readable plain text,
   not thousands of lines of code) before moving on.

The scenario suite *is* the acceptance gate: "make every Given/When/Then pass" is the
machine-checkable definition of done.

## Anti-reward-hacking guards

A green bar is necessary, not sufficient. Agents are documented to game it.

- **Forbid editing feature/step-definition files while writing production code.** If the
  spec is wrong, stop and fix the spec deliberately as a separate, reviewed step.
- **Hold out unseen scenarios** the implementing agent never reads, and run them at the end.
- **Independent channels:** add mutation testing and property-based tests; a passing example
  scenario plus a surviving mutant means the spec under-constrains the behavior.
- **Check for test/mock edits in review** — agents add mocks and edit tests far more than
  humans; treat harness edits as a red flag.
- **Run red and state why each fails.** Don't let a 401/500 count as "pass" without checking
  it failed for the intended reason.

## Requirement strength

Use RFC-2119 keywords to remove ambiguity and stop "helpful" unwanted logic:
`MUST` / `SHALL`, `SHOULD`, `MAY`, and explicit `MUST NOT` / `SHALL NOT`. Specify
null/empty/boundary/error cases so the agent never guesses.

## Fit gate — when NOT to use Gherkin

Use Gherkin for behavior-shaped / integration / contract work (I/O mappings, pre/post
conditions, invariants, state machines). **Do not** force it onto algorithmic, data-heavy,
ML, or pixel-level UI tasks where it abstracts away exactly what matters — steer those to
unit, property-based, or visual-regression tests instead.

## Spec evolution

The shipping artifact is the code; specs drift and models hallucinate. Keep deterministic CI
as the real bar, evolve the spec with the code, and keep humans reading generated code in
small increments to avoid cognitive debt.
````

- [ ] **Step 2: Validate it is non-empty and covers the guards**

Run:
```bash
test -s plugins/gherkin/skills/gherkin/references/agentic-loop.md && grep -q "Anti-reward-hacking" plugins/gherkin/skills/gherkin/references/agentic-loop.md && grep -q "Fit gate" plugins/gherkin/skills/gherkin/references/agentic-loop.md && echo OK
```
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add plugins/gherkin/skills/gherkin/references/agentic-loop.md
git commit -m "feat: add agentic-loop.md (spec-to-code loop and guards)"
```

---

### Task 7: Bundled assets — lint config, feature template, Vale style

**Files:**
- Create: `plugins/gherkin/skills/gherkin/assets/gherkin-lintrc`
- Create: `plugins/gherkin/skills/gherkin/assets/feature-template.feature`
- Create: `plugins/gherkin/skills/gherkin/assets/vale/Gherkin/Terminology.yml`
- Create: `plugins/gherkin/skills/gherkin/assets/vale/README.md`

- [ ] **Step 1: Write the gherkin-lint config**

Create `plugins/gherkin/skills/gherkin/assets/gherkin-lintrc` (valid JSON; `gherkin-lint` reads JSON):

```json
{
  "no-files-without-scenarios": "on",
  "no-unnamed-features": "on",
  "no-unnamed-scenarios": "on",
  "no-dupe-feature-names": "on",
  "no-dupe-scenario-names": "in-feature",
  "one-feature-per-file": "on",
  "keywords-in-logical-order": "on",
  "only-one-when": "on",
  "no-restricted-patterns": ["off"],
  "no-unused-variables": "on",
  "no-scenario-outlines-without-examples": "on",
  "no-superfluous-tags": "on",
  "indentation": ["on", { "Feature": 0, "Scenario": 2, "Step": 4, "Examples": 4, "example": 6 }],
  "max-scenarios-per-file": ["on", { "maxScenarios": 12 }],
  "scenario-size": ["on", { "steps-length": { "Background": 4, "Scenario": 10 } }],
  "file-name": ["on", { "style": "kebab-case" }]
}
```

> Note: `only-one-when` is a non-default rule in some `gherkin-lint` builds. If `npx gherkin-lint`
> reports it as unknown, remove that line — passes 2–3 of `review.md` enforce one-behavior by judgment.
>
> Implementation note (reconciled): against `gherkin-lint` v4.2.4 the config above was corrected to
> load cleanly — `no-dupe-scenario-names` uses array form `["on", "in-feature"]`, `no-restricted-patterns`
> is plain `"off"`, and `one-feature-per-file` was dropped (not a rule in v4.2.4; Gherkin grammar already
> permits only one Feature per file). The committed `assets/gherkin-lintrc` is the working source of truth.

- [ ] **Step 2: Write the feature template**

Create `plugins/gherkin/skills/gherkin/assets/feature-template.feature`:

```gherkin
# Outcome: <the capability/value this feature delivers, one line>
# In-scope: <what this feature covers>
# Out-of-scope: <what it deliberately does NOT cover — stops scope creep>
# Prior decisions: <architecture/UX choices already made — don't re-decide>
# Acceptance criteria: <what "done" means>
# Depends on: <../other/feature.feature, if any>
@capability:<name> @REQ-<id>
Feature: <Capability name>

  In order to <value>
  As a <role>
  I want <capability>

  Scenario: <Outcome-focused title distinguishing this scenario from its siblings>
    Given <pre-existing state>
    When <the single triggering event>
    Then <an observable, checkable outcome>
```

- [ ] **Step 3: Write the optional Vale terminology style**

Create `plugins/gherkin/skills/gherkin/assets/vale/Gherkin/Terminology.yml`:

```yaml
extends: substitution
message: "Use the ubiquitous term '%s' instead of '%s'."
level: warning
ignorecase: true
scope: text
swap:
  "log ?in": "sign in"
  "log ?out": "sign out"
```

> This is a starter. Replace the `swap` entries with your project's glossary so one concept
> maps to one word across all features.

Create `plugins/gherkin/skills/gherkin/assets/vale/README.md`:

```markdown
# Optional Vale style

Lints `.feature` prose for ubiquitous-language consistency (one concept = one word),
banned-term substitution, and tense/voice. Optional — `review.md` Pass 4 works without it.

## Use

1. Install Vale: https://vale.sh
2. Point a `.vale.ini` at this folder as a `StylesPath` and enable the `Gherkin` style:

   ```ini
   StylesPath = plugins/gherkin/skills/gherkin/assets/vale
   [*.feature]
   Gherkin.Terminology = YES
   ```

3. Edit `Gherkin/Terminology.yml` `swap:` entries to match your project glossary.
```

- [ ] **Step 4: Validate the lint config is valid JSON and the template is valid Gherkin**

Run:
```bash
python3 -c "import json; json.load(open('plugins/gherkin/skills/gherkin/assets/gherkin-lintrc')); print('json OK')"
npx --yes gherkin-lint -c plugins/gherkin/skills/gherkin/assets/gherkin-lintrc plugins/gherkin/skills/gherkin/assets/feature-template.feature || echo "lint ran (template has angle-bracket placeholders; rule warnings here are acceptable)"
```
Expected: `json OK` prints. The lint command either passes or prints rule findings about the placeholder template — both acceptable; the goal is to confirm the config loads and `gherkin-lint` runs. If `npx` cannot fetch `gherkin-lint` (offline), skip the second command and note it.

- [ ] **Step 5: Validate the Vale YAML parses**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('plugins/gherkin/skills/gherkin/assets/vale/Gherkin/Terminology.yml')); print('yaml OK')" 2>/dev/null || echo "PyYAML not installed; visually confirm each swap value is a closed quoted string"
```
Expected: `yaml OK`, or the fallback message (then confirm by eye).

- [ ] **Step 6: Commit**

```bash
git add plugins/gherkin/skills/gherkin/assets
git commit -m "feat: add bundled assets (lint config, feature template, optional Vale style)"
```

---

### Task 8: Validation & dogfood

Confirm the plugin is structurally valid, the skill triggers, and both modes work on real input. (No new product files; this task produces fixtures and a validation record.)

**Files:**
- Create: `plugins/gherkin/skills/gherkin/assets/examples/bad-withdrawal.feature` (deliberately bad fixture)
- Create: `docs/superpowers/validation-2026-05-30.md` (validation record)

- [ ] **Step 1: Structural validation of the whole plugin**

Run:
```bash
python3 - <<'PY'
import json, os
mp = json.load(open('.claude-plugin/marketplace.json'))
assert mp['name'] == 'jann0z-claude-plugins'
assert any(p['name'] == 'gherkin' and p['source'] == './plugins/gherkin' for p in mp['plugins']), "plugin not listed/sourced"
pj = json.load(open('plugins/gherkin/.claude-plugin/plugin.json'))
assert pj['name'] == 'gherkin'
for f in [
  'plugins/gherkin/skills/gherkin/SKILL.md',
  'plugins/gherkin/skills/gherkin/references/planning.md',
  'plugins/gherkin/skills/gherkin/references/authoring.md',
  'plugins/gherkin/skills/gherkin/references/review.md',
  'plugins/gherkin/skills/gherkin/references/agentic-loop.md',
  'plugins/gherkin/skills/gherkin/assets/gherkin-lintrc',
  'plugins/gherkin/skills/gherkin/assets/feature-template.feature',
]:
    assert os.path.exists(f), f"missing {f}"
print('structure OK')
PY
```
Expected: `structure OK`. Fix any failure before continuing.

- [ ] **Step 2: Optional — validate with the plugin-dev validator**

If the `plugin-dev:plugin-validator` agent is available, dispatch it on `plugins/gherkin/` and address any schema errors it reports. If unavailable, rely on Step 1. Record the outcome in the validation file (Step 6).

- [ ] **Step 3: Create the deliberately-bad fixture**

Create `plugins/gherkin/skills/gherkin/assets/examples/bad-withdrawal.feature`:

```gherkin
Feature: test withdrawal stuff

  Background:
    Given the user opens the browser
    And the user navigates to https://bank.example.com/login
    And the user types "user@example.com" into the email field
    And the user clicks the login button

  Scenario: test 1
    When the user withdraws money and checks the balance and logs out
    Then it works
```

- [ ] **Step 4: Author-mode dogfood**

In this session, exercise Author mode by writing a *good* version of the withdrawal feature
from this brief: "An account holder can withdraw cash; withdrawals over the balance are
refused; withdrawals at exactly the balance succeed." Produce a feature that:
- has an SDD header (per `feature-template.feature`),
- is declarative, one-behavior-per-scenario, with observable `Then`s,
- covers happy + boundary (exact balance) + error (insufficient) via Example Mapping.

Run it through the `review.md` passes and confirm it passes. Save the result inline in the
validation record (Step 6). Expected: a clean feature with ≥3 scenarios, no `When ... and ...`,
no `it works`.

- [ ] **Step 5: Review-mode dogfood**

Run Review mode on `bad-withdrawal.feature`. Confirm it flags, at minimum:
- imperative/UI-tour Background steps (Pass 4),
- bloated Background with actions (Pass 5),
- conjunction step / multiple behaviors in one `When` (Pass 3),
- non-observable `Then` ("it works") (Pass 5),
- `test`-prefixed feature and scenario names (Pass 4 / naming),
- happy-path-only, no error/boundary coverage (Pass 6).

Optionally run Pass 1 mechanically:
```bash
npx --yes gherkin-lint -c plugins/gherkin/skills/gherkin/assets/gherkin-lintrc plugins/gherkin/skills/gherkin/assets/examples/bad-withdrawal.feature || true
```
Expected: lint reports findings (or `npx` is offline — note it). The judgment passes above are the primary check.

- [ ] **Step 6: Write the validation record**

Create `docs/superpowers/validation-2026-05-30.md` capturing: structural-validation output, validator outcome (or "unavailable"), the good authored feature from Step 4, and the list of issues Review mode caught in Step 5. This is the evidence the skill works end-to-end.

- [ ] **Step 7: Commit**

```bash
git add plugins/gherkin/skills/gherkin/assets/examples/bad-withdrawal.feature docs/superpowers/validation-2026-05-30.md
git commit -m "test: dogfood gherkin skill (author + review) and record validation"
```

---

## Final verification

- [ ] All eight tasks committed; `git log --oneline` shows the sequence.
- [ ] `python3` structural-validation (Task 8 Step 1) prints `structure OK`.
- [ ] Author mode produced a clean feature; Review mode caught every planted defect.
- [ ] No file contains `TBD`/`TODO`/placeholder prose (the angle-bracket `<...>` slots in
  `feature-template.feature` are intentional fill-in markers, not placeholders).

## Notes for the implementer

- **Foundation-first ordering** of these tasks mirrors the skill's own philosophy: manifests
  (the walking skeleton) → dispatcher → references in pipeline order → assets → dogfood.
- **`npx gherkin-lint`** requires network on first run. If offline, the JSON-validity checks
  still gate the config; note the skip in the validation record.
- The skill content is the deliverable — preserve the exact wording above unless a validation
  step reveals an error.
