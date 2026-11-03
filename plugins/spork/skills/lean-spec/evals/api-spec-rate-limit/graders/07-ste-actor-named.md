---
type: llm
focus:
  source: file
  path: rate-limit-spec.md
weight: 1
---

The spec is written in Simplified Technical English (STE) style: sentences that state behaviour name who acts (for example the API, the client, or support) and use the simple present or MUST/SHOULD/MAY.

Fail if any of these holds:
1. Two or more behaviour sentences use a passive with no actor, so that it is unclear who acts ("Requests are rejected", "No other headers are sent", "Limits are configured"). A passive that names the actor ("configured by support") is fine. Open questions, table cells and headings are exempt.
2. Behaviour is stated with "will" ("the API will return 429") two or more times.
3. A semicolon joins clauses in prose.
