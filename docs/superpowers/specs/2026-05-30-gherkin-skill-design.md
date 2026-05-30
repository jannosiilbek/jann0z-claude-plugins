# Design: Gherkin BDD Skill + Plugin Marketplace

**Date:** 2026-05-30
**Status:** Approved (design), pending implementation plan
**Author:** janno

---

## 1. Overview

Create a public, shareable **Claude Code plugin marketplace** repo, seeded with its
first plugin: a **framework-agnostic Gherkin/BDD skill** for *authoring* and *reviewing*
`.feature` specs. The skill is thorough by design — it bakes in best practices, DRY
discipline, proper naming, foundation-first spec ordering, and multi-pass validation
cycles — and is optimized to produce specs that a coding agent can implement efficiently.

This design is grounded in a 7-dimension research pass (authoring fundamentals, DRY/reuse,
naming & ubiquitous language, suite structure & ordering, anti-patterns, agentic-BDD, and
validation/review). The consolidated research digest lives in §8 (Appendix).

### Goals

- A reusable marketplace others can `/plugin marketplace add` from a public GitHub repo.
- A Gherkin skill that produces **high-quality, declarative, single-behavior** specs.
- **Many validation cycles**, layered cheapest-mechanical-first, judgment-last.
- **Foundation-first ordering** so a coding agent builds prerequisites before dependents.
- Maximum thoroughness **by request / by outcome stakes**, lightweight by default, fully
  portable to anyone the repo is shared with.

### Non-goals

- Step-definition / glue-code generation (specs only; framework-agnostic).
- Targeting a single BDD runner. The skill is runner-agnostic; runner specifics, if any,
  stay in optional reference notes.
- Building plugins #2+ now (the marketplace is structured to host them later).

---

## 2. Marketplace & repo structure

The repo root is the marketplace; plugins live under `plugins/` to keep the root clean and
leave room to grow.

```
claude-plugins/                          # marketplace repo root (public GitHub)
├── .claude-plugin/
│   └── marketplace.json                 # lists plugins; enables `/plugin marketplace add`
├── plugins/
│   └── gherkin/                         # first plugin
│       ├── .claude-plugin/
│       │   └── plugin.json              # plugin manifest (name, version, description, author)
│       └── skills/
│           └── gherkin/                 # the skill (see §3)
│               ├── SKILL.md
│               ├── references/
│               └── assets/
├── docs/
│   └── superpowers/specs/               # design docs (this file)
├── README.md                            # marketplace pitch + install instructions
├── LICENSE                              # MIT
└── .gitignore
```

### Naming

- GitHub repo: `jannosiilbek/jann0z-claude-plugins`
- Marketplace id: `jann0z-claude-plugins`
- Plugin id: `gherkin`
- Skill name: `gherkin`

### License

**MIT** — permissive, friction-free reuse and sharing.

### `marketplace.json` (shape)

Lists the plugin with a `source` pointing at `plugins/gherkin`. Filled in during
implementation against the current Claude Code marketplace schema.

### `plugin.json` (shape)

Declares `name`, `version` (semver, starting `0.1.0`), `description`, `author`. Skills are
auto-discovered from `skills/`.

### README

Covers: what the marketplace is, `/plugin marketplace add jannosiilbek/jann0z-claude-plugins`, and a short
pitch + usage note for the Gherkin plugin.

---

## 3. Skill architecture

Approach **A (Hybrid)**: a progressive-disclosure skill + bundled reference docs + ready
mechanical-lint config + an **outcome-driven auto-engaging deep-review** mode that degrades
gracefully to single-agent when sub-agent capability is unavailable.

### 3.1 Design principle — organize by task-moment, not topic

Reference files are split by the agent's **pipeline stage**, so at each step it loads exactly
one focused file with no redundant context. Anti-patterns live *inside* the review passes
that catch them; naming/DRY/semantics live together because they fire together while drafting.

```
skills/gherkin/
├── SKILL.md            # dispatcher · cardinal rules INLINE · mode workflows · deep-review auto-policy
├── references/
│   ├── planning.md     # [PLAN]   foundation-first topological ordering, vertical slicing,
│   │                   #          capability folders, SDD feature-header template
│   ├── authoring.md    # [DRAFT]  GWT semantics · declarative litmus · one-behavior ·
│   │                   #          naming & ubiquitous language · DRY/reuse decisions · formatting
│   ├── review.md       # [REVIEW] ordered multi-pass checklist with anti-pattern catalog folded in
│   └── agentic-loop.md # [IMPL]   spec→code loop + anti-reward-hacking guards
└── assets/
    ├── gherkin-lintrc           # ready mechanical-lint config
    ├── feature-template.feature # SDD header + skeleton
    └── vale/                    # optional ubiquitous-language style
```

Why this is optimal for a Claude Code agent:

- **No overlap** — the old topic split (naming/dry/structure/anti-patterns) made the agent
  load 3 files for one drafting action and duplicated anti-patterns across two files.
- **Right context at the right time** — single-feature edits skip `planning.md`; pure reviews
  load only `review.md`; spec-consumers load only `agentic-loop.md`.
- **Cardinal rules inline in SKILL.md** — the ~9 non-negotiables are small and always relevant,
  so they stay in context for free without a file load.
- **Glossary is a per-project artifact** the skill maintains (e.g. `features/GLOSSARY.md`),
  not a bundled file; `authoring.md` describes the discipline.

### 3.2 SKILL.md contents

`SKILL.md` is the lean dispatcher. It contains:

- **Frontmatter** — `name: gherkin`, a precise `description` covering when to trigger
  (writing/authoring `.feature` files, reviewing/refactoring Gherkin, BDD specs, spec-driven
  development with coding agents).
- **The ~9 cardinal rules inline** (the non-negotiables from §8.1): one behavior per scenario;
  declarative-not-imperative; strict Given/When/Then semantics; observable `Then`s; short
  scenarios; no conjunction steps; exclude incidental detail; consistent voice; specification
  not script.
- **Mode routing** — Author vs Review, with the pipeline sequence for each and pointers to the
  reference file for each stage.
- **The deep-review auto-policy** (§3.5).

### 3.3 Mode 1 — Author (discovery-first generation)

Sequence when generating specs from a brief:

1. **PLAN** (`planning.md`) — decompose the brief into capabilities; order topologically:
   walking skeleton → identity/auth → core domain entities → primary workflows → edge &
   cross-cutting; vertical-slice each feature; lay out capability folders.
2. **Example Mapping** — per capability, enumerate rules and, for each rule, ≥1 happy +
   boundary/edge + error example *before* writing Gherkin. Surface open questions instead of
   guessing.
3. **DRAFT** (`authoring.md`) — write declarative, single-behavior scenarios with observable
   `Then`s, ubiquitous language, and an SDD feature-header (Outcome / In-scope / Out-of-scope /
   Prior decisions / Acceptance criteria) per file.
4. **REVIEW** — self-run the §3.4 checklist before presenting.

### 3.4 Mode 2 — Review (multi-pass validation cycles)

Ordered checklist (`review.md`), cheapest/most-mechanical first; each pass states what it
catches and the fix:

1. **Mechanical lint gate** (bundled `gherkin-lintrc`) — names, duplicates, GWT order,
   `only-one-when`, scenario size, tag hygiene, dead Outline vars.
2. **Structure & format** — one feature/file, Background size (~3–4), `And`/`But` (no `Or`).
3. **Single behavior** (cardinal rule) — exactly one `When`; focused `Then`; title names it.
4. **Declarative & business-readable** (+ optional Vale terminology pass) — no
   selectors/XPath/URLs/SQL/HTTP/click/type unless the mechanic *is* the behavior; third
   person, present tense, ubiquitous vocabulary; realistic concrete data.
5. **Deterministic & independent** — self-contained `Given`s, observable `Then`s, no run-order
   coupling, no real clock/random/network ordering.
6. **Coverage via Example Mapping** — happy + edge/boundary + error per rule; flag gaps and
   unresolved ambiguity (red cards).
7. **Three-Amigos sign-off prompts** — value / feasibility / testability questions for the human.

Output: a findings report keyed to the anti-pattern catalog, each finding with a concrete fix.

### 3.5 Deep-review — outcome-driven auto-engagement

`SKILL.md` encodes an auto-policy: spend agentic rigor proportional to the cost of getting the
spec wrong.

**Auto-engages deep-review** (parallel sub-agent reviewers, one per judgment pass 3–7, and/or
an adversarial author→review→fix loop) when **any** of:

- authoring or reviewing a **multi-feature suite** (not a one-line edit), or
- the capability is **foundational / high-stakes** (auth, payments, core domain), or
- the standard review surfaces **unresolved ambiguity or conflicting findings**.

**Stays single-agent (lightweight)** for a single small scenario edit or a trivial review.

**Graceful fallback:** if sub-agent/workflow capability is unavailable at runtime, deep-review
degrades automatically to the single-agent multi-pass — portability preserved, default leaning
toward thoroughness.

### 3.6 Agentic implementation loop (`agentic-loop.md`)

For consumers who hand specs to a coding agent: generate failing scenarios → confirm they fail
*for the right reason* → implement → run → iterate. Anti-reward-hacking guards: forbid editing
feature/step files during implementation; hold out unseen scenarios; recommend mutation/
property tests as independent channels; human gate per scenario; RFC-2119 `MUST`/`SHOULD`/`MAY`
+ explicit `MUST NOT` to stop unwanted "helpful" logic. Includes a **fit gate**: do *not* use
Gherkin for algorithmic/data-heavy/ML/pixel-UI work — steer those to unit/property/visual tests.

### 3.7 Bundled assets

- **`gherkin-lintrc`** — ready config enabling `only-one-when`, `scenario-size`,
  `max-scenarios-per-file`, naming rules, `required-tags`/`allowed-tags`, `no-unnamed-*`,
  `no-dupe-*`, `keywords-in-logical-order`, `no-unused-variables`, `indentation`, `file-name`.
- **`feature-template.feature`** — SDD header + a clean single-behavior skeleton to copy.
- **`vale/`** — optional Vale style for ubiquitous-language consistency (banned-term
  substitution, tense/voice). Marked optional; review degrades cleanly without it.

---

## 4. Component responsibilities (isolation check)

| Unit | Does what | Used when | Depends on |
|---|---|---|---|
| `SKILL.md` | Routes to mode/stage; holds cardinal rules + auto-policy | Always (entry) | references, assets |
| `planning.md` | Capability decomposition, foundation-first ordering, slicing | Author PLAN; multi-feature | — |
| `authoring.md` | How to write one good scenario/feature | Author DRAFT; edits | glossary (project) |
| `review.md` | Ordered multi-pass validation + anti-pattern fixes | Review; Author self-check | `gherkin-lintrc`, `vale/` |
| `agentic-loop.md` | Spec→code loop + anti-reward-hacking guards | Spec consumption | — |
| `gherkin-lintrc` | Mechanical structural gate | Review pass 1 | gherkin-lint tool |
| `feature-template.feature` | Copyable SDD skeleton | Author DRAFT | — |

Each unit has one purpose, a clear interface (the stage that loads it), and is independently
understandable. No reference file restates another.

---

## 5. Validation of the skill itself

Before the plugin is considered done:

1. **Structural validation** — `plugin.json` and `marketplace.json` parse against the current
   Claude Code schema; skill is discovered and loads.
2. **Trigger test** — confirm the skill activates on representative prompts ("write Gherkin
   for…", "review these feature files", "are these scenarios DRY?").
3. **Golden-path dogfood** — run Author mode on a small sample brief (e.g. account withdrawal)
   and confirm the output passes its own Review checklist and the bundled lint config.
4. **Review dogfood** — feed a deliberately bad `.feature` (imperative, multi-When, vague
   `Then`, bloated Background) and confirm each anti-pattern is caught with the right fix.
5. **Portability** — confirm deep-review degrades to single-agent when sub-agents are
   unavailable.

These become tasks in the implementation plan.

---

## 6. Approaches considered

- **A — Hybrid (chosen):** progressive-disclosure skill + bundled tooling + auto-engaging
  deep-review. Thorough by outcome stakes, lightweight by default, portable.
- **B — Lean guidelines only:** SKILL.md + refs, no lint config, no sub-agents. Rejected:
  validation stays advisory; lighter than the stated goal.
- **C — Fully workflow-orchestrated:** every run fans out sub-agents. Rejected as default:
  token-heavy on every run, less portable, overkill when stakes are low. Its rigor is preserved
  as the auto-engaged deep-review path in A.

---

## 7. Open questions / deferred

- Optional thin slash-command wrappers (`/gherkin-author`, `/gherkin-review`) — deferred;
  skill-trigger is sufficient for v1.
- Per-runner reference notes (Cucumber/Behave/pytest-bdd/SpecFlow) — deferred unless needed.
- Plugin #2 — out of scope; marketplace structure already accommodates it.

---

## 8. Appendix — research digest

### 8.1 Core authoring principles (non-negotiables)

1. **One scenario, one behavior.** Exactly one `When`/`Then` pair. A second `When-Then` means a
   second scenario — re-express its precondition as a `Given`. Cardinal rule: makes failures
   diagnosable, titles nameable, steps reusable.
2. **Declarative, not imperative.** Describe *what*, not *how*. Litmus: "Will this wording change
   if only the implementation changes?" If yes, raise abstraction. Push UI/HTTP/SQL into step
   defs. Good: `When the user searches for "panda"`. Bad: scroll/click/type/press-Enter.
3. **Strict Given/When/Then semantics.** `Given` = pre-existing state (passive, present tense, no
   actions); `When` = the single triggering event; `Then` = an observable, checkable outcome.
4. **Observable `Then`s.** Ban `it works` / `the result is correct`. Assert specific status codes,
   messages, fields, counts.
5. **Short scenarios.** ~<10 steps; ~a dozen scenarios per feature; one feature per file.
6. **No conjunction steps.** Split with `And`/`But`. Gherkin has no `Or` — use Scenario Outlines.
7. **Exclude incidental detail.** Drop hardcoded IDs/timestamps/exact lists; describe
   categorically (`Given an overdrawn account`).
8. **Consistent voice.** Third person, present tense, full subject-predicate; avoid first-person
   `I` in multi-actor systems; never mix persons.
9. **Specification, not script; discovery-first.** Living documentation in ubiquitous language;
   write scenarios *before* code, collaboratively.

### 8.2 DRY & reuse (with the readability tension)

Governing tension: in feature files, **readability and self-containment beat DRY**; the real DRY
win lives in the **step-definition code layer**.

- **Background** only for genuinely shared, behavior-relevant `Given` setup (~3–4 steps); runs
  before every scenario.
- **Prefer repeated explicit `Given`s over Background** when load-bearing to a specific scenario;
  move duplication into *one* reusable step definition, not into Background.
- **Scenario Outline + Examples** for the same behavior across equivalence classes — one row per
  class; strip incidental columns.
- **Data tables vs Outlines:** tables = many items in one execution; Outline = one item, many
  executions.
- **Real reuse = domain-organized step definitions** (by account/cart/order, not by feature),
  implemented once. **WET step definitions** are the true BDD DRY violation.
- **Tags** as cross-cutting org: small, documented, lowercase-hyphenated vocabulary.
- **When DRY conflicts with clarity, choose clarity.**

### 8.3 Naming & ubiquitous language

- **Feature files:** kebab-case, named after capability (`account-withdrawal.feature`), one
  capability/file — not `LoginPage.feature`/`Misc.feature`.
- **`Feature:` title:** capability/value phrase; pick one narrative template suite-wide
  (value-first Connextra or job-story).
- **Scenario titles:** concise, outcome-focused, distinguishing this scenario from its siblings —
  not `Test 1`. Never prefix `test`/`verify`/`check` or ticket IDs (those go in tags).
- **Ubiquitous language:** one concept = one word across features, step defs, code. Maintain a
  glossary. No technical jargon (status codes, table names, DOM ids) in steps.
- **Concrete realistic example data**, never `foo`/`bar` unless the scenario is about generic
  input.
- **Tags:** lowercase, hyphen-separated, namespaced (`@smoke @regression @prio-1 @team-checkout`),
  small documented vocabulary, no case drift.
- **Micro-formatting:** capitalize only keywords + first word of titles; no trailing punctuation;
  params in double quotes; ~80–120 char lines.

### 8.4 Suite structure & foundation-first ordering

- **Organize by business capability / bounded context**, not technical layer or per-story.
- **Ordering (topological):** walking skeleton (thinnest end-to-end slice) → identity/auth → core
  domain entities → primary workflows → edge & cross-cutting. Dependents can't be specified
  meaningfully until the entities/state they consume exist.
- **Slice vertically, never horizontally** (INVEST). Horizontal slices integrate only at the end
  and leave the suite red — fatal for an agent expected to stay green per increment.
- **Every scenario self-contained**; prerequisites as explicit `Given`s, never run-order between
  scenarios.
- **Express inter-feature dependencies explicitly** (referenced files + tags), not implicit order.
- **SDD per-feature header:** Outcome / In-scope / Out-of-scope / Prior decisions / Scenarios
  (task units) / Acceptance criteria. Closing scope stops agent scope-creep; recording decisions
  stops re-deciding architecture. Tag scenarios with requirement/capability IDs.

### 8.5 Anti-pattern catalog (name → why → fix)

- **Imperative/UI-tour steps** → couples to UI, buries intent → raise to declarative intent; push
  mechanics into step defs.
- **Multiple When-Then in one scenario** → ambiguous failures → split; gate with `only-one-when`.
- **Mixed step types** (actions in Given, assertions in When) → kills reuse → Given=state,
  When=one action, Then=checks.
- **Conjunction / feature-coupled steps** → non-reusable, duplicate glue → split; name step defs
  by domain concept.
- **WET step definitions** → duplicate implementations → standard step language; implement once.
- **Hardcoded data / exact UI strings / incidental detail** → brittle → assert the rule; move data
  to Examples/fixtures.
- **Vague / non-observable `Then`** → asserts nothing → state observable outcome.
- **Order-dependent scenarios** → flaky, non-parallelizable → self-contained `Given` per scenario.
- **Bloated Background / hidden setup** → couples unrelated scenarios → limit to ~3–4 Givens.
- **Happy-path-only coverage** → defect-prone paths unspecified → Example Mapping: happy + edge +
  error.
- **Scenario explosion / unfocused Outlines** → slow low-signal suites → one row per equivalence
  class; push exhaustive combos to unit tests.
- **Inline `Or`/branching** → Gherkin has no `Or` → Outline for input variation; separate scenarios
  for different behaviors.
- **Page/layer-named files, test/verify/ticket-ID titles** → couples docs to implementation → name
  by capability; IDs in tags.
- **Vocabulary drift** → breaks shared understanding + reuse → one concept/one term; terminology
  linter.
- **Ad-hoc inconsistently-cased tags** → CI filter misses → small documented lowercase-hyphen
  vocabulary.
- **Gherkin as scripting, written after the code** → write-only DSL → discovery-first cycle.

### 8.6 Validation checklist (ordered, multi-pass)

1. **Automated lint gate** (`gherkin-lint`/parser) — names, duplicates, GWT order,
   `only-one-when`, scenario size, dead Outline vars, tag chaos.
2. **Structure & format** — one feature/file, Background size, `And`/`But` (no `Or`), step/scenario
   counts, quoted params, doc strings, data tables.
3. **Single behavior** (cardinal rule).
4. **Declarative & business-readable** — no mechanics unless the mechanic is the behavior; third
   person/present tense; ubiquitous vocabulary; realistic data. (+ Vale prose lint.)
5. **Deterministic & independent** — self-contained state, any-order, observable checkable `Then`s,
   no real clock/random/network ordering/shared mutable fixtures.
6. **Coverage via Example Mapping** — ≥1 happy + edge/boundary classes + error/negative per rule;
   red card = unresolved ambiguity (don't code yet).
7. **Three-Amigos sign-off** — Business=value, Dev=feasibility, QA=ambiguity/edge/error.

Tooling layering: lint/parser for structure; Vale for language; runner dry-run + undefined/
ambiguous-step reports for spec-to-automation binding gaps. No single tool covers all.

### 8.7 Agentic-coding specifics

- **The scenario is the acceptance gate, not documentation** — "make every Given/When/Then pass"
  is the machine-checkable "done".
- **Declarative scenarios are the single biggest lever for agent code quality** — they constrain
  the *behavior* while leaving implementation free; LLMs internalize concrete behavioral examples
  better than abstract PRD prose.
- **One behavior, <10 steps, independent** → tight iteration loop, localized failures.
- **Stable vocabulary + concrete data** → fewer clarifying round-trips, lower token cost.
- **Validation loop with a human gate per scenario** (review readable plain-text, not thousands of
  lines of code).

Pitfalls (agent-specific):
- **Reward-hacking the green bar** (hardcode outputs, edit/mock the harness) → forbid editing
  feature/step files while implementing; hold out unseen scenarios; mutation/property tests;
  review for test/mock edits. Green is necessary, not sufficient.
- **Assuming the agent validates test semantics** → run red first and state why each fails; assert
  specific codes/messages.
- **Vague `Then`s + imperative scripts** = the #1 failure mode of AI-generated Gherkin → wire a
  guidelines context file into the agent's rules; treat AI drafts as drafts.
- **Spec treated as write-once** → evolve with the code; use RFC-2119 `MUST`/`SHOULD`/`MAY` +
  explicit `MUST NOT`; specify null/empty/boundary/error cases.
- **Believing spec replaces CI + human understanding** → keep deterministic CI as the real bar;
  keep humans reading generated code in small increments.

---

## 9. Next step

Hand to the **writing-plans** skill to produce the implementation plan from this design.
