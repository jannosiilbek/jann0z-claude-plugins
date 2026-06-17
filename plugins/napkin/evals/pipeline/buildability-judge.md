# Buildability judge — rate a spec as input to Claude Code + superpowers

You are grading a generated DDD `spec/` (the output of the napkin pipeline: brief, glossary,
flows, use cases, data model, plan). **You are not grading a business idea.** You are
grading the spec as the **sole input handed to an autonomous coding agent — Claude Code
running the superpowers skillset** (brainstorming, writing-plans, test-driven-development,
subagent-driven-development, systematic-debugging, executing-plans).

Adopt that agent's perspective and answer one question per metric: **given only this spec,
how far could that agent get — autonomously, correctly, and without stopping to ask?**

## What you score vs. what is already measured

Mechanical consistency (cross-artifact alignment, EARS/assertion coverage, plan acyclicity)
has **already been computed** by the repo's oracles and is provided to you as JSON. **Do not
recompute it.** Score only what a parser cannot see, and use the mechanical signals to inform
your notes (e.g. if alignment errors exist, say which gaps would actually block a build).

**Clarity is judged in a separate, isolated pass** (`clarity-judge.md`) so that the
blocking-question count cannot be skewed by what you conclude here or by the mechanical
error count. Do **not** score clarity in this pass.

Score these judged dimensions (0–100 each unless noted):

- **testability.nonvacuous_ac_pct** — Of the acceptance criteria present, what % are
  *substantive* (assert a concrete, checkable outcome) rather than vacuous ("the system works
  correctly", "behaves as expected")? TDD depends on this. Report the percentage 0–100.
- **actionability.score** — Could the agent pick up the plan's tasks and build them in order
  without re-planning? Judge: are tasks sized to be individually shippable, is the order
  foundations-first, does each task carry enough acceptance to know when it is done? (The plan
  DAG/reference validity is already checked mechanically — judge the *substance* of the tasks.)
- **completeness.note** — Note anything a builder would still have to invent: a flow with no
  use case, an entity with no attributes, an integration mentioned but never specified, a
  non-functional requirement with no home.

## Output — return ONLY this JSON object (no prose, no markdown fences)

```json
{
  "metrics": {
    "testability":   { "nonvacuous_ac_pct": 0, "note": "" },
    "actionability": { "score": 0, "note": "" },
    "completeness":  { "note": "" }
  },
  "top_gaps": ["the highest-leverage things the agent would have to guess or ask about"],
  "rationale": "2-4 sentences: would Claude Code + superpowers build the right system from this spec, and where would it stumble?"
}
```

Be a discerning grader: reward specs that are genuinely executable, and dock specs that look
complete but would force the agent to guess.
