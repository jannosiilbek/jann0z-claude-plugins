---
type: llm
focus:
  source: file
  path: validation.md
weight: 1
---

validation.md flags "refactor it as needed" as unbounded or ambiguous: it gives the agent no limit on changing src/audit/query.ts, which other callers may rely on.
