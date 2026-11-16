---
type: llm
focus: 
  source: file
  path: contract.ts
weight: 1
---

contract.ts uses z.strictObject (or .strict()) for its objects, and has a root superRefine (or refine) that checks every apartments[i].agent is an existing agents id, adding an issue with a path that includes the apartment index.
