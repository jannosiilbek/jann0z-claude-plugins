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

## Input & output

**Input:** the two upstream artifacts of the pipeline (see `../../PIPELINE.md`):

- **`spec/brief.md`** — the business layer (problem, user, pricing/business-model, why-now, riskiest
  assumption, Build seed, Non-goals). Read it if present, otherwise use the brief given inline. This is
  the source for product framing + pricing (`context-product`), Non-goals → out-of-scope
  (`context-product`), and the Build-seed Hard constraints (`context-nfr`).
- **`spec/scope.md`** — the **scoped feature list**, if present (mvp-scoping's output): a curated list
  of `### F<n>` features, each with a Persona, an atomic In → Out, and a per-feature **Feasibility**
  verdict (self-serve / partnership-gated / cost-gated / data-gated / research-gated). The feature list
  **seeds the capability map** (it is a richer seed than a raw use-case list, but still a seed — not an
  authoritative capability set). Each feature's Feasibility verdict is the integration-reachability
  signal: **don't spec a capability whose sole enabler is a non-self-serve feature.** If a feature is
  feasibility-gated, treat it as a flag to sharpen the brief before authoring around it. If `scope.md`
  is absent, proceed from the brief alone.

scope.md carries no business facts and restates nothing from the brief — read each artifact for what it
owns (per PIPELINE.md), never expect a fact in both.

**Output:** the flat `spec/` context layer. The authoritative `spec/` layout and the
**single-ownership table** (which file owns each fact) live once in `../../PIPELINE.md`
(this plugin's root) — read it first; do not restate it here. This skill produces six files:

```
spec/  →  glossary.md  product.md  personas.md  capability-map.md  rbac-matrix.md  nfr.md
```

Each fact has exactly ONE home (per PIPELINE.md); every other file references it. If two
files would state the same fact, the non-owner is wrong — delete it there. Settled choices
between alternatives are NOT a context artifact — they live in the gherkin per-feature
`# Prior decisions:` header so they cannot drift from the six files.

## Workflow

1. **Read the upstream artifacts** — `spec/brief.md` (if present, else the inline brief) and
   `spec/scope.md` (if present). If `scope.md` has any feasibility-gated feature, or its feature list is
   too thin/vague to author capabilities from, stop and sharpen the scope (re-run mvp-scoping) before
   authoring. Locate or create the flat `spec/` root.
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
