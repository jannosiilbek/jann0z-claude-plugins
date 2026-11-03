---
type: llm
focus:
  source: file
  path: pdf-export-spec.md
weight: 1
---

The spec is written in Simplified Technical English (STE) style, so that an agent cannot misread it.

Pass if requirements, acceptance criteria and instructions are written as full sentences or imperatives, with one name per thing and one verb per action. Headings, table cells, code, and label lines such as "Non-goals: async export, charts", "Proposal: ..." or "`src/x.ts`: the export route" are fine.

Fail only if one of these is a clear pattern, not an isolated slip:
1. Requirements written as telegraphic fragments that drop the subject or verb ("Returns PDF.", "Same filters as CSV."), two or more times.
2. Several verbs for the same action ("check", "verify", "confirm", "ensure"), or two names for the same thing that a reader could take for two things.
3. Semicolons used to join clauses in prose.
