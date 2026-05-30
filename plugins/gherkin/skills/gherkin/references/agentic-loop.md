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
