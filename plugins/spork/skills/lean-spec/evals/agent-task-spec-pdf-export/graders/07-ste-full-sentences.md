---
type: llm
focus:
  source: file
  path: pdf-export-spec.md
weight: 1
---

The spec is written in Simplified Technical English (STE) form, so that an agent cannot misread it.

Pass only if all of these hold:

1. Requirements, acceptance criteria and instructions are full sentences with a subject and a verb, or imperatives. They are not telegraphic fragments that drop the subject or article on a point that matters, such as "Returns PDF." or "Same filters as CSV." Headings, table cells, code, and label lines such as "Non-goals: async export, charts" or "`src/x.ts`: the export route" are exempt. At most one slip in the whole doc.
2. One verb for one action across the doc: it does not mix "check", "verify", "confirm" and "ensure" (or "fetch", "get", "retrieve") for the same action. At most one slip in the whole doc.
3. One name for one thing: the same thing (for example the report, the export, the endpoint) does not appear under two different names that a reader could take for two things. A more specific phrase for a subset ("a fixture report") is fine.
4. No semicolons in prose.

Fail if any one of these is broken, and quote the offending text.
