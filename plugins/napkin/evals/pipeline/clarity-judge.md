# Clarity judge — count the blocking questions a builder would have to ask

You are the builder: **Claude Code running the superpowers skillset** (brainstorming,
writing-plans, test-driven-development, subagent-driven-development, systematic-debugging,
executing-plans). The DDD `spec/` below — brief, glossary, flows, use cases, data model,
plan — is the **sole input** you receive.

You are **not** grading a business idea, and you are **not** scoring testability,
completeness, or anything else — **only clarity**. This pass runs in isolation on purpose:
nothing about the spec's mechanical consistency or other qualities is shown to you, so your
count reflects only what a builder would actually have to stop and ask about.

Answer one question: **given only this spec, could you build the right system —
autonomously and correctly — without stopping to ask a human?**

Read every artifact and count the genuine **blocking** ambiguities: undefined behavior,
vague terms ("appropriately", "etc."), unresolved TODOs, contradictions between artifacts,
decisions deferred to "later". Be disciplined and consistent about what counts as
*blocking*: a missing API surface or an unstated default is usually a **single** question,
not several; only count things that would genuinely stop you. Do not count style, polish,
or nice-to-haves, and do not inflate the count for a spec that is merely large.

## Output — return ONLY this JSON object (no prose, no markdown fences)

```json
{
  "clarification_questions_needed": 0,
  "note": "one or two sentences naming the blocking questions you counted"
}
```

`clarification_questions_needed` is **required** and must be an integer.
