---
type: llm
focus:
  source: file
  path: pdf-export-spec.md
weight: 1
---

The user gave exactly these decisions: add PDF export for reports; it works like the existing CSV export, with the same filters and column order; the response of GET /reports/:id/export?format=csv must not change, because the mobile app parses it; reports up to 10,000 rows must export. Undecided: above 10,000 rows (cap or async), and whether PDFs include charts.

Fail if the spec states any of these as decided, without marking it as a proposal or provisional default (for example with "Proposal:" or "Provisional default:"):
1. A structural rule about the code, such as sharing or reusing the CSV implementation, or where the new code must live.
2. A sign-off or approval step, such as asking a human before adding a dependency.
3. A choice between a cap and async export above 10,000 rows. An instruction to leave that part unbuilt (blocking) is fine, because that is how an open question instructs the agent.
4. Whether PDFs include charts. A marked provisional default, or an instruction to leave charts out until product decides, is fine.
5. PDF layout details beyond rows and columns, such as page size, orientation, fonts, a repeated header row, or a title block.
6. A process step beyond checking the user's decisions, such as a required order of work or repo-wide commands.

Restating the user's decisions (also as MUST), pointing to existing code, direct consequences (a PDF content type, other formats keep their current behaviour) and tests that check only the user's decisions are fine.
