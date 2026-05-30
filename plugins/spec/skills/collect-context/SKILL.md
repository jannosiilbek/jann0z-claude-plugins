---
name: collect-context
description: Use when starting a new SaaS spec and you need the upstream context (product, personas, glossary, capability map, RBAC, NFRs) before writing Gherkin or modeling an ERD. Orchestrates the per-artifact context skills into a flat spec/ root, then validates 100% cross-artifact alignment with zero vague text, looping until clean.
---

# Collect spec context

Produce the flat context layer a SaaS spec needs, then **prove it is internally aligned
and free of vague text** before any Gherkin or ERD work begins. The output is a `spec/`
root of six strictly-templated files that double as spec input and living reference.

**Violating the letter of these rules is violating the spirit of them.** "Close enough"
alignment is not alignment.

## Output layout (flat)

```
spec/
  glossary.md         # context-glossary
  product.md          # context-product
  personas.md         # context-personas
  capability-map.md   # context-capability-map
  rbac-matrix.md      # context-rbac
  nfr.md              # context-nfr
  features/           # gherkin specs land here (one folder per capability-map row)
```

Settled choices between alternatives are NOT a context artifact. They are recorded where
they are consumed — in the gherkin per-feature `# Prior decisions:` SDD header — so they
cannot drift from the state the six files own.

## Single-ownership contract (the anti-overlap rule)

Each fact has exactly ONE home file. Every other file references it; none restates it.

| Concern | Owned by | Everyone else |
|---------|----------|---------------|
| Domain terms + enum values | `glossary.md` | use verbatim |
| Value prop, pricing, scope | `product.md` | reference scope items |
| Who the actors are + their jobs | `personas.md` | reference persona Roles |
| Capability set + order + deps | `capability-map.md` | consume as folders |
| Permission matrix | `rbac-matrix.md` | no other matrix exists |
| Cross-cutting invariants + subscription gating | `nfr.md` | reference, don't restate |

If two files would state the same fact, the non-owner is wrong — delete it there.

## Workflow

1. **Locate or create the flat `spec/` root.** One directory, six files, no subfolders.
2. **Author in dependency order**, each via its skill — re-read the skill before each:
   `context-glossary` (seed) → `context-product` → `context-personas` →
   `context-capability-map` → `context-rbac` → `context-nfr` →
   `context-glossary` (finalize: add every term that surfaced). Glossary is seeded first
   and finalized last because terms appear throughout.
3. **Resolve `OPEN:` markers.** Any value a worker could not decide is written
   `OPEN: <question>`, never invented. Collect every `OPEN:` and ask the user; replace
   with the answer. No file is done while it contains an `OPEN:`.
4. **Validate alignment** — read `references/alignment-checks.md` and run every check.
   For a multi-file suite, dispatch **parallel sub-agent reviewers, one per check class**
   (degrade to a single-agent multi-pass if sub-agents are unavailable).
5. **Auto-fix loop.** For each failure, fix the non-owning file (or the owner if the fact
   itself is wrong) and re-run that check. Repeat until every check passes.
6. **Emit the alignment report** (`assets/alignment-report-template.md`) — pass/fail per
   check — and only then declare the context complete.

## Red flags — STOP, do not declare done

- Any check in `references/alignment-checks.md` is not green.
- Any `OPEN:` marker remains, anywhere.
- Any banned phrase remains (run the anti-vagueness scan across all six files).
- A term, role, or enum value appears in one file with a spelling/value it does not have
  in `glossary.md`.
- A second permission matrix, second glossary, or restated scope list exists.

## Rationalizations (all false)

| Excuse | Reality |
|--------|---------|
| "The drift is minor (Venue vs Location)" | Drift is the one thing this layer exists to kill. Fix it. |
| "I'll note the open question in prose" | Prose questions get missed. Use `OPEN:` and resolve it. |
| "Restating the enum here is clearer" | Two copies drift. Reference the glossary. |
| "It's basically aligned" | Basically-aligned specs regenerate expensively. 100% or not done. |
| "The example file proves it works" | The example is fixed input. Re-run on the real brief. |
