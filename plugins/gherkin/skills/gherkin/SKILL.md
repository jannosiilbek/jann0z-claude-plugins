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
3. **DRAFT** — read `references/authoring.md`. Write the scenarios; read and copy the SDD
   header from `assets/feature-template.feature` onto each feature file.
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
