# Cut list

Patterns that add words without information. Delete or replace with the direct statement.

## Openers and meta

- "This document describes / outlines / aims to…" → start with the content.
- "It's important to note that", "It's worth mentioning", "Note that" → state the fact.
- "In today's fast-paced…", "As we all know…" → delete.
- "In summary", "To conclude", "Overall" plus a recap → delete the recap.
- "Let's dive into", "Here's how…" → delete.

## Hedges and intensifiers

- "might potentially", "could possibly", "in some cases may" → decide: state it, or mark it open. Never turn the user's real uncertainty into a fact.
- "very", "really", "highly", "extremely", "critical", "crucial", "key", "robust", "seamless", "comprehensive", "leverage", "utilize" → drop, or replace with a measurable claim.
- "perform an analysis of", "carry out validation", "make a decision" → analyze, validate, decide.
- "set up", "spin up", "kick off", "roll out", "fall back to" → configure, start, begin, release, use.
- "etc." at the end of a list that should be complete → complete the list or say what the rule is.

## Baseline statements (assumed by any competent reader)

- "Ensure the system is secure / scalable / maintainable / performant."
- "Handle errors appropriately." "Validate inputs." "Log important events."
- "Write unit tests." "Follow best practices." "Document the code."
- "The UI should be intuitive / user-friendly."
- "Stakeholders will be kept informed."

Keep only the specific, non-default version: a number, a rule, an exception.

## Structural filler

- Restating the requirement in prose and then again as a bullet.
- A "Background" that repeats what the reader asked for. If one real line of problem is left, title it "Problem" or merge it into the opening.
- Lists of benefits nobody disputes.
- Sections with one sentence that belongs in another section.
- "Future considerations" that weren't requested and decide nothing.
- Rhetorical contrasts ("This isn't just X, it's Y"), dramatic fragments, questions answered immediately ("Why does this matter? Because…").

## Vague → specific

| Vague | Specific |
|---|---|
| "fast" | "p95 < 300 ms" |
| "large files" | "files > 100 MB" |
| "users can manage settings" | "users can change X and Y; Z is admin-only" |
| "integrates with external systems" | "pushes events to Kafka topic `orders`" (only if at API altitude) |
