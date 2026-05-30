# Gherkin plugin — final validation & dogfood (2026-05-30)

End-to-end validation of the `gherkin` skill: structural check, author-mode dogfood,
and review-mode dogfood. The skill files were read and applied as written.

## 1. Structural validation

The whole-plugin structure check passed:

```
structure OK
```

This confirms:

- `.claude-plugin/marketplace.json` is named `jann0z-claude-plugins` and lists the
  `gherkin` plugin sourced at `./plugins/gherkin`.
- `plugins/gherkin/.claude-plugin/plugin.json` is named `gherkin`.
- All required skill files exist (SKILL.md, the four references, and the two named assets).

## 2. plugin-dev validator

The `plugin-dev` / `plugin-validator` tool was **not run in this task**. Only the
structural assertions above were executed here.

## 3. Author-mode dogfood — `account-withdrawal.feature`

Brief: *"An account holder can withdraw cash; withdrawals over the balance are refused;
withdrawals at exactly the balance succeed."*

Authored per SKILL.md Author mode + `references/authoring.md` +
`assets/feature-template.feature` (SDD header, value-first Connextra narrative, one
behavior per scenario, observable `Then`s, happy + boundary + error coverage):

```gherkin
# Outcome: An account holder can withdraw cash from their account
# In-scope: Cash withdrawal against the available balance, including the boundary at exactly the balance and refusal when funds are insufficient
# Out-of-scope: Authentication, daily withdrawal limits, ATM cash-availability, currency conversion, overdraft facilities
# Prior decisions: Withdrawals settle synchronously in EUR; no overdraft is permitted; the balance is the sole eligibility check in this feature
# Acceptance criteria: A withdrawal within the balance dispenses cash and debits the account; a withdrawal exactly equal to the balance succeeds and leaves a zero balance; a withdrawal above the balance is refused and leaves the balance unchanged
@capability:account-withdrawal @REQ-1024
Feature: Account withdrawal

  In order to access my money
  As an account holder
  I want to withdraw cash from my account

  Scenario: Withdrawal within the balance dispenses cash and debits the account
    Given an account with a balance of 100 EUR
    When the account holder withdraws 40 EUR
    Then the withdrawal succeeds
    And 40 EUR is dispensed
    And the balance is 60 EUR

  Scenario: Withdrawal of exactly the balance succeeds and leaves a zero balance
    Given an account with a balance of 100 EUR
    When the account holder withdraws 100 EUR
    Then the withdrawal succeeds
    And 100 EUR is dispensed
    And the balance is 0 EUR

  Scenario: Withdrawal is refused when the balance is insufficient
    Given an account with a balance of 50 EUR
    When the account holder withdraws 100 EUR
    Then the withdrawal is refused
    And no cash is dispensed
    And the balance remains 50 EUR
```

**Self-review result:** PASSES the `references/review.md` checklist — Pass 2 structure
(one Feature, no Background bloat, strict G→W→T, ≤10 steps, ≤12 scenarios); Pass 3 single
behavior (exactly one `When` per scenario, focused `Then`, no conjunctions); Pass 4
declarative (intent-level, third person/present tense, ubiquitous "account holder",
realistic EUR data, no UI/URL/SQL mechanics); Pass 5 deterministic & independent (each
scenario seeds its own `Given`, observable `Then`s, no shared state); Pass 6 coverage
(happy 40/100, boundary exactly-the-balance 100/100, error insufficient 100/50).

**Mechanical lint (Pass 1):** ran `npx gherkin-lint` with the bundled config — **clean,
zero findings.**

## 4. Review-mode dogfood — `bad-withdrawal.feature`

Applied `references/review.md` Review mode to the deliberately-bad fixture. Findings:

| # | Anti-pattern | Pass | Location | Fix |
|---|---|---|---|---|
| 1 | `test`-prefixed feature name / vague title | 4 (naming) | `Feature: test withdrawal stuff` | Name after the capability — `Feature: Account withdrawal`. Never prefix `test`. |
| 2 | `test`-prefixed, non-descriptive scenario title | 4 (naming) | `Scenario: test 1` | Outcome-focused title, e.g. `Withdrawal succeeds when the balance is sufficient`. |
| 3 | Imperative / UI-tour Background steps | 4 | Background lines `opens the browser`, `navigates to https://…`, `types "…" into the email field`, `clicks the login button` | Raise to declarative intent and push mechanics into step defs; this is sign-in plumbing — out of scope for a withdrawal feature, remove it. |
| 4 | Bloated Background with actions | 5 | Whole `Background:` block (4 action steps) | Background must be ~3–4 *action-free* shared `Given`s; replace with `Given the account holder is signed in` or move setup into each scenario's `Given`. |
| 5 | Conjunction step / multiple behaviors in one `When` | 3 | `When the user withdraws money and checks the balance and logs out` | Split into one scenario per behavior; re-express later preconditions as `Given`. Withdraw, check-balance, and log-out are three behaviors. |
| 6 | Non-observable `Then` | 5 | `Then it works` | Assert an observable outcome — `Then the withdrawal succeeds / And 40 EUR is dispensed / And the balance is 60 EUR`. |
| 7 | Vocabulary drift | 4 | "user" in steps vs domain "account holder" | One concept = one word; use "account holder" consistently; keep the glossary current. |
| 8 | Incidental detail / non-categorical data | 4/7 | `"withdraws money"` (no amount), hardcoded login URL | Use categorical, realistic data (`withdraws 40 EUR`); drop incidental URLs. |
| 9 | Happy-path-only coverage, no boundary/error | 6 | Single scenario, no insufficient-funds or exactly-the-balance case | Add boundary (exactly the balance) and error (insufficient funds) examples. |

### Mechanical lint output (Pass 1) for the bad fixture

```
/Users/janno/Projects/claude-plugins/plugins/gherkin/skills/gherkin/assets/examples/bad-withdrawal.feature
  3    Wrong indentation for "Background", expected indentation level of 0, but got 2    indentation
```

Note: gherkin-lint's `only-one-when` did **not** fire on finding #5 because the conjunction
lives inside a *single* grammatical `When` line — exactly the gap that the judgment-based
Review Pass 3 (single-behavior) is designed to catch beyond mechanical linting. The lint
did surface a structural indentation defect; the substantive anti-patterns (#1–#9) require
the human/LLM judgment passes.

## Lint tooling status

`npx gherkin-lint` ran successfully (online) against both fixtures.
