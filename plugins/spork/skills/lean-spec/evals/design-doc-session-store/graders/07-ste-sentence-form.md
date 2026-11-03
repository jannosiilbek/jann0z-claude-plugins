---
type: llm
focus:
  source: file
  path: session-store-design.md
weight: 1
---

The design doc is written in Simplified Technical English (STE) style. Judge only prose sentences and list items written as sentences. Ignore code blocks, inline code, headings, bold lead-in labels, and table cells.

Pass if the prose reads as STE overall: short, active, literal sentences. Fail only if one of these is a clear pattern, not an isolated slip:

1. Semicolons used to join clauses in prose.
2. Long sentences: three or more sentences of roughly 30 words or more.
3. Phrasal verbs where a plain verb exists ("fall back to", "roll back", "set up", "spin up", "show up", "turn off"), used three or more times. Fixed domain terms such as "log in" and "log out" are fine.
4. Actions written as empty verb + noun ("perform a migration of", "do a backfill of"), used three or more times.
