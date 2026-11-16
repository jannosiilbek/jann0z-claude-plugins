---
type: llm
focus: 
  source: file
  path: contract.ts
weight: 1
---

contract.ts has a refinement (superRefine or refine) that checks that entry and every edge's from and to are ids of existing pages, and one that checks every page is reachable from entry.
