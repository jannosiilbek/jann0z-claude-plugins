---
type: llm
focus:
  source: file
  path: validation.md
weight: 1
---

validation.md raises at least one substantive migration risk the doc does not address, such as what happens when one of the dual writes fails, or the backfill/change-log replay overwriting newer documents.
