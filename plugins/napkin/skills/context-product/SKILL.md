---
name: context-product
description: Use when authoring or reviewing the spec/product.md context artifact for a SaaS app — the value proposition, target segment, problem, pricing tiers, and the MVP in/out-of-scope boundary. Enforces concrete pricing numbers, an exhaustive scope boundary, no marketing fluff, and zero silent invention.
---

# Context: product.md

`product.md` is the **single source of truth for what the product is, what it costs, and
where its scope ends**. It exists to (a) bound the spec — the out-of-scope list stops a
coding agent expanding the build — and (b) drive pricing-related scenarios (trial,
quota, upgrade/downgrade). It does NOT define vocabulary (that is `glossary.md`), roles
or permissions (that is `rbac-matrix.md`).

## Input

Read `spec/brief.md` (the business layer). Per `../../PIPELINE.md`, `product.md` is the canonical owner
of pricing and the in/out-of-scope boundary, derived from the brief:

- **Pricing** — derive concrete tiers from `## Business model` when the brief carries one (new-venture
  briefs). When it doesn't (extension briefs), `product.md` **originates** pricing via Rule 1's
  concrete-or-ask gate. The brief is a seed, not a hard prerequisite.
- **Out-of-scope** — `product.md` owns the out-of-scope list and **must carry every `## Non-goals` item
  from the brief** (append more if you discover them; never drop one). The brief's Non-goals are the
  *origin*; this is the canonical home. `scope.md` does not carry an out-of-scope list.

## Output

Copy `assets/product-template.md` verbatim and fill it. Six sections, fixed order. Do not
add sections (no "core domain concepts", no glossary, no roles table, no journeys).
See `assets/product-example.md`.

## Rules

1. **Pricing is concrete or absent.** Every Plan row needs a real price and real numeric
   limits. If pricing is genuinely undecided, do NOT invent a tier — stop and ask. A
   guessed tier silently becomes quota scenarios that are wrong.
2. **Plan names are glossary terms.** Each Plan name must appear in `glossary.md`; reuse
   it verbatim. Subscription statuses are owned by `glossary.md` — do not list them here.
3. **Scope is exhaustive and concrete.** In-scope lists capabilities by name (each maps to
   a `capability-map.md` entry). Out-of-scope names specific excluded things ("no payroll
   export", "no native mobile app"), not vague gestures — and includes **every** brief
   `## Non-goals` item (append, never drop).
4. **One success metric.** A single measurable number the product optimizes. Not a list.
5. **No marketing adjectives.** Ban "seamless", "powerful", "intuitive", "best-in-class".
   State what it does, for whom, against what pain.
6. **No invention of facts.** Trial length, gating behavior, and limits are real or asked,
   never assumed silently.

## Downstream-purpose map

- **Pricing-tier table** → trial-expiry, quota-enforcement, upgrade/downgrade scenarios;
  `Plan` and `Subscription` entities/attributes in the ERD.
- **In-scope list** → the set of capabilities that may be specified (cross-checked against
  `capability-map.md`).
- **Out-of-scope list** → the hard "do not build / do not spec" boundary.
- **Value proposition / target segment / problem** → reference framing for spec authors.
- **Success metric** → priority reference.

If a sentence serves none of these, cut it.

## Anti-vagueness gate

Banned: `etc.`, `and so on`, `various`, `robust`, `user-friendly`, `seamless`, `powerful`,
`intuitive`, `scalable` (without a number), `as appropriate`, `as needed`, `flexible`,
`TBD`, `TODO`. Limits use numbers and units; scope items name specific things.

## Self-check before done

- [ ] Six sections, fixed order, nothing added.
- [ ] Every Plan has a price and numeric limits; no invented/guessed tier.
- [ ] In-scope items map to capability-map entries; out-of-scope items are specific.
- [ ] Every brief `## Non-goals` item appears in the out-of-scope list.
- [ ] Exactly one success metric, expressed as a number.
- [ ] No glossary, roles matrix, or subscription-status list here.
- [ ] No banned phrase; no `<placeholder>` left.
