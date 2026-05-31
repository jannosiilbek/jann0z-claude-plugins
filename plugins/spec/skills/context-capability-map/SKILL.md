---
name: context-capability-map
description: Use when authoring or reviewing the spec/capability-map.md context artifact — the authoritative, foundation-first ordered list of business capabilities (bounded contexts) that becomes the features/ folder structure for Gherkin specs. Enforces a dependency DAG, capability names that become kebab-case folders, traceability to product scope, and no glossary or scenario detail.
---

# Context: capability-map.md

`capability-map.md` is the **authoritative source for the capability set, their build
order, dependencies, and the primary feature file of each**. The Gherkin skill consumes
this map to create `spec/features/<capability>/` folders, order the suite, and resolve
`# Depends on:` paths — it does not re-derive capabilities or guess filenames. This file
does NOT define vocabulary (that is `glossary.md`) and does NOT contain scenarios,
responsibilities lists, or acceptance criteria (those are the `.feature` files the Gherkin
skill authors). See `../../PIPELINE.md` for the layout and ownership contract.

## Output

Copy `assets/capability-map-template.md` verbatim: one ordered table (including the
**Primary feature file** column) plus a one-line walking-skeleton callout. See
`assets/capability-map-example.md`.

## Rules

1. **Foundation-first order.** Number capabilities so each depends only on lower-numbered
   ones. Order: walking skeleton → identity/auth → core entities → workflows →
   edge/cross-cutting.
2. **Dependencies form a DAG.** `Depends on` may reference only earlier-numbered
   capabilities — never a later or equal one. No cycles.
3. **Every capability traces to product scope.** Each row must correspond to an in-scope
   item in `product.md`. Nothing from the out-of-scope list may appear. No capability the
   product does not claim.
4. **Capability name = folder name.** Use a short kebab-case name (`shift-swaps`); it
   becomes `spec/features/shift-swaps/`.
5. **Declare the primary feature file.** Each row names its capability's primary
   `.feature` file (the walking-skeleton / entry behavior, kebab-cased, e.g.
   `shift-swaps.feature`). This is the canonical target every `# Depends on:` resolves to;
   the Gherkin skill creates exactly that file and never synthesizes `<cap>/<cap>.feature`.
6. **Outcome is one line** — the value the capability delivers, not a responsibilities list.
7. **Personas served are real.** Reference persona Roles/labels from `personas.md`.
8. **Name the walking skeleton.** Exactly one thinnest end-to-end slice, called out
   explicitly, with trivial behavior; it is the primary feature file of capability #1.
9. **No glossary, no scenarios, no folder-tree duplication.** The table's `Depends on`
   column IS the dependency record; do not restate it as prose.

## Downstream-purpose map

- **Capability + order** → `spec/features/<capability>/` folders and suite build sequence.
- **Primary feature file** → the exact file the Gherkin skill creates per capability and
  the canonical `# Depends on:` target (no synthesized filenames).
- **Depends on** → `# Depends on:` headers and `@prereq` tags in the Gherkin suite.
- **Personas served** → who the capability's scenarios are written for.
- **Walking skeleton** → the first vertical slice the Gherkin skill specifies.
- **Capability grouping** → bounded-context grouping for the ERD.

If a column serves none of these, cut it.

## Anti-vagueness gate

Banned: `etc.`, `various`, `and more`, `core functionality`, `as needed`, `robust`,
`TBD`, `TODO`. Every outcome names a concrete deliverable; every dependency is a specific
capability number.

## Self-check before done

- [ ] One ordered table + a walking-skeleton line; nothing else.
- [ ] Every `Depends on` references only lower-numbered capabilities (valid DAG).
- [ ] Every capability traces to a `product.md` in-scope item; none is out-of-scope.
- [ ] Names are kebab-case and folder-ready; every row has a Primary feature file.
- [ ] Walking skeleton named exactly once; it is capability #1's primary feature file.
- [ ] No glossary, no scenarios; no banned phrase; no `<placeholder>`.
