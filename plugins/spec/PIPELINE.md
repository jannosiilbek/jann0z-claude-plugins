# Spec pipeline contract

One pipeline produces and consumes the `spec/` workspace:

```
spec/brief.md → collect-context → spec/*.md → gherkin → spec/features/ → erd-modeler → spec/data/model.dbml
```

This file declares **who owns each cross-tool fact** and the rules for referencing it. It
holds no values of its own — the owning file always holds the actual value; every other
file **cites or copies** it. If a fact appears in two files, the non-owner is wrong.

## spec/ layout

```
spec/
  brief.md            # human-authored product brief — the only hand-written input
  glossary.md         # ubiquitous language + enums                 (context-glossary)
  product.md          # value proposition, pricing, scope            (context-product)
  personas.md         # actors + jobs                                (context-personas)
  capability-map.md   # capabilities, order, deps, primary feature   (context-capability-map)
  rbac-matrix.md      # the permission matrix                        (context-rbac)
  nfr.md              # cross-cutting invariants + subscription gating (context-nfr)
  alignment-report.md # collect-context pass/fail report
  features/<capability>/*.feature   # gherkin specs
  data/model.dbml     # erd-modeler output
```

## Single-ownership table

| Fact | Owner | Consumers (cite/copy, never restate) |
|------|-------|--------------------------------------|
| term meaning, enum values, ERD-entity flag | `glossary.md` | gherkin steps; erd tables/enums |
| value prop, pricing tiers + numeric limits, MVP in/out-of-scope, success metric | `product.md` | gherkin scope/pricing scenarios; erd plans |
| actors + jobs/goals/pains, the Role each persona holds | `personas.md` | gherkin `As a <role>` |
| capability set, foundation order, dependencies, **primary feature file** per capability | `capability-map.md` | gherkin folders / `# Depends on:` / `@prereq` |
| permission matrix (resource × action × role) + conditions | `rbac-matrix.md` | gherkin authorization scenarios; erd role/permission |
| cross-cutting invariants, tenancy/isolation, subscription gating, limits/SLA | `nfr.md` | gherkin cross-cutting `Then`s; erd tenant key/audit |
| behavioral assertions (scenarios) | `spec/features/` | — |
| settled choices between alternatives | gherkin per-feature `# Prior decisions:` header | — |
| schema | `data/model.dbml` | — |

## Reference rules

1. **Canonical feature filename.** `capability-map.md` names each capability's **primary
   feature file** (its walking-skeleton / entry behavior). gherkin MUST create exactly that
   file and point every `# Depends on:` at it — never synthesize `<cap>/<cap>.feature`. erd
   reads the same column for use-case naming.
2. **Traceability tag.** `@capability:<kebab>` (one per feature, matching the capability-map
   row) is the traceability tag. `@REQ-<id>` is OPTIONAL and only for an external tracker —
   omit it when there is none. Never invent a second numbering scheme.
3. **Denial vocabulary** (owner: gherkin `authoring.md`). A permission denial asserts
   `forbidden`; a business-rule/state denial asserts `refused`; `rejected`/`blocked` are not
   used. A denied write is always followed by a state-unchanged `And`.
4. **NFR taxonomy** (owner: `nfr.md`). Each invariant is **behavioral** (tenant isolation,
   subscription gating, auth flows, in-app limits → MUST have a Gherkin `Then`) or
   **operational** (availability SLO, data residency, infra rate limit → acknowledged, not a
   scenario). collect-context, gherkin review Pass 0, and erd bucket invariants identically.
5. **No restating owned facts.** Cite the owner; never re-type a value it owns (a Plan's SLA
   minutes, the tenancy mechanism) in a step or header — reference it symbolically or assert
   the owning invariant.
6. **Enum values verbatim.** Statuses/states use the `glossary.md` Enumerations spelling
   exactly, everywhere (e.g. `canceled`, `past_due`).
