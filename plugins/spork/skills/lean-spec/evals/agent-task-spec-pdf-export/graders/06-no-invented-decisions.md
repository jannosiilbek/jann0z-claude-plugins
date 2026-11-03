---
type: llm
focus:
  source: file
  path: pdf-export-spec.md
weight: 1
---

The user gave exactly these decisions: add PDF export for reports; it works like the existing CSV export, with the same filters and column order; the response of GET /reports/:id/export?format=csv must not change, because the mobile app parses it; reports up to 10,000 rows must export. Undecided: above 10,000 rows (cap or async), and whether PDFs include charts.

pdf-export-spec.md passes if it states as decided nothing beyond these. Any other rule, requirement, boundary or behaviour (a structural rule such as sharing code with CSV, a sign-off step, layout details, sync vs async, process steps) is marked as a proposal or provisional, or left to the implementer. Restating the user's decisions as MUST is fine. Pointing to existing code in the repo is fine.
