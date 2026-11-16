---
type: llm
focus: 
  source: file
  path: contract.ts
weight: 1
---

contract.ts imports Zod 4 style (`import * as z from "zod"` or `import { z } from "zod"`) and defines its objects with z.strictObject (or .strict()), with fields named as in the agreed shape: entry, pages (id, title, kind, fields, exits) and edges (from, to, on, when).
