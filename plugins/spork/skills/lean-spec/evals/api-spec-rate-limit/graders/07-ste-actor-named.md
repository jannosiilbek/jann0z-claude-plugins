---
type: llm
focus:
  source: file
  path: rate-limit-spec.md
weight: 1
---

The spec is written in Simplified Technical English (STE) form: each sentence that states behaviour names who acts (for example the API, the client, or support), and uses the simple present.

Pass only if all of these hold:

1. No behaviour sentence uses a passive with no actor that leaves open who acts, for example "Requests are rejected", "The counter is reset", "Limits are configured". A passive that names the actor ("configured by support") is fine. Open questions are exempt. Table cells and headings are exempt.
2. Behaviour is stated in the simple present or with MUST/SHOULD/MAY, not with "will" ("the API will return 429"). At most one slip in the whole doc.
3. No semicolons in prose.

Fail if any one of these is broken, and quote the offending text.
