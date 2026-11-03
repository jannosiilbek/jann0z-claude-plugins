---
type: llm
focus:
  source: file
  path: validation.md
weight: 1
---

The validation does not count wording-only problems as failures. The design under review contains sentences with a semicolon (for example "We drop LTR re-ranking; ..."), and some long sentences that still have only one reading.

Pass only if:

1. No failed test, and no blocker, rests only on sentence form that has one reading: a semicolon, a long sentence, a passive whose actor is clear from context, or a similar wording point.
2. If the validation mentions such form problems at all, it does so as a note outside the pass/fail count, for example one line after the table.

A failure that quotes a sentence for a real content problem (a conflict, a missing risk, filler, ambiguity a reader could act on wrongly) is fine, even if that sentence also has a semicolon.

Fail if either point is broken, and quote the offending text.
