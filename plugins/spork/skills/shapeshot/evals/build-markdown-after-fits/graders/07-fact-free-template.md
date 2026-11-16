---
type: llm
focus: trace
weight: 1
---

The rendering code that produces report.md (for example render.ts) builds the document by looping over the data and does not hard-code any page titles, field names or button labels from this specific flow (such as 'Verify email', 'VAT' or 'Invite teammates'). Generic labels such as 'Pages' or 'Fields' are fine.
