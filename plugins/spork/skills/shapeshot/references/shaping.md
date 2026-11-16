# Shaping: normalization and granularity

Background for the shape check in SKILL.md step 2: how to get a shape right before the user sees it, and how to judge each change. A shape is high fidelity when every record means one thing, every fact lives in one place, and every field is as fine as the questions need, and no finer.

## Contents

- Grain: what one item is
- Entities: split out, refer by id
- Atomic fields
- Too coarse, too fine
- Derived values
- Targeted questions
- Worked example: before and after

## Grain: what one item is

Every list has a grain: the one thing that a single item stands for. Say it in words before you write fields: "one item = one pricing tier of one product", "one item = one page", "one item = one trial user". If you can't say it in one phrase, the list mixes two kinds of thing; split it.

Signs the grain is wrong:

- Some fields only make sense for some items (`seats` only for team plans, `fields` only for forms). One `?` field like that is fine; three or more means two kinds of item share a list.
- A field holds a list in disguise (`tiers str` = "Free, Pro, Enterprise"). That field is its own list.
- The same item would appear twice with different values for one field. The grain is finer than you wrote: add the field that tells them apart, or make that part a child list.

Put the grain of each top-level list in the brief (see SKILL.md step 1). The user checks grain much faster than fields.

## Entities: split out, refer by id

An entity is a thing with its own identity that the result talks about from more than one place: a feature that several products have, a person on several teams, a page that several edges point to, a source cited by many claims.

- If the same thing would be written in two or more places, give it one top-level list with `id slug unique`, and refer to it with `→ list.id` (one) or `→ list.id 1+` (many). Fields about the thing live once, on the thing.
- If something appears in one place only, nest it. Don't make a list just for tidiness; the reader then jumps around for nothing.
- Facts about a pair belong on the pair. "Feature F is limited to 3 boards on the Pro tier" is about that tier and that feature together: put it on the reference (a child list under the tier: `feature → features.id`, `limit? str`), not on the feature (other tiers differ) or in a string on the tier.
- Named shapes (notation.md) and entity lists are different. A named shape reuses a *structure* (each copy is separate data, like an `Address`). An entity list reuses a *thing* (one record, many references).

The test: if a value changes in the world (a feature is renamed, a person changes role), how many places in data.json need an edit? It should be one.

## Atomic fields

One field, one fact, one unit.

- Split values that the result will compare, sort, filter, sum or chart: `price str "$10/user/mo, annual"` becomes `usdSeatMonth num ≥0` plus `billing monthly | annual`.
- Put the unit in the name or type, and keep one unit per field: `weightKg num`, `usdYear num`, `pct`. Never a number inside a string.
- Use an enum when the set of values is known or small; free text for categories makes rows incomparable.
- Use `bool` or an enum instead of text like "yes, on paid plans": that is two facts (`has bool`, `from → tiers.id`).
- Dates as `date`, links as `url`, not text.

Free text is right for what a person only reads: a rationale, a quote, a note, a verdict. Cap its length.

## Too coarse, too fine

Check each field against the questions the result must answer (SKILL.md step 1).

Too coarse, split it:

- A question needs part of the value (sort by price, filter by city, count by status) but the field holds more than that part.
- The name has "and" or a slash (`prosAndCons`, `priceOrPlan`).
- A text field would hold a list, a number with a unit, or a yes-with-conditions.
- Two items that differ in a way the user cares about would look the same.

Too fine, merge or drop it:

- No question uses the field on its own (`street`, `houseNumber`, `postcode` when the user only reads the address: one `address str`).
- An `id` that nothing refers to.
- An enum with so many values that it is free text in disguise.
- A child list that always has exactly one item: make it a nested object.
- A field the user can't fill or check (precise numbers that no source states). Make it coarser, like a range or an enum (`small | mid | large`), or put the question into `gaps`.

When the right level depends on how the user will use the result, don't guess: ask a targeted question.

## Derived values

Don't store what the template can compute from other fields: totals, counts, "cheapest", ranks. A template can show it, and the data can't go stale.

Keep a derived value only when it is a judgement, not arithmetic (a `verdict`, a `confidence`), or when its inputs are not in the shape. Then mark how it was made with a `— description` (`effect pct — conversion gap vs. baseline`).

## Targeted questions

Ask about what changes the shape most: grain, entity boundaries, granularity, counts, enum values, and what the user will do with a field. Don't ask what the request already settles. Answers shrink the open list each round.

## Worked example: before and after

Request: compare three CRMs for a sales team; which integrations each has, pricing tiers, and which features each tier includes.

First draft (coarse and duplicated):

```
CrmComparison
  products      3
    name        str
    pricing     str                 — eg "$25/user/mo, annual"
    integrations str                — comma separated
    tiers       1+
      name      str
      features  str 1+              — feature names
```

Problems: `pricing` holds three facts; `integrations` is a list in a string; feature names are free text repeated in every tier of every product, so "email sequences" and "Sequences" won't line up, and a rename means many edits.

After the shape check:

```
CrmComparison  — Pick a CRM for a 15-person sales team
  asOf          date
  features      8..15               — compared capabilities, defined once
    id          slug unique
    name        str ≤40
    kind        core | automation | reporting | integration
  products      3
    name        str unique
    tiers       1..5 @src
      id        slug unique
      name      str
      usdSeat?  num ≥0              — per month; empty = contact sales
      billing   monthly | annual
      features  → features.id 0+
  verdict       str ≤400
  gaps?         str 0+
```

Brief line for this shape: *Grain: one feature = one capability compared across all products; one tier = one paid or free plan of one product.* Decision lines: *Integrations are features with kind = integration, so one list covers both. Tier prices split into amount and billing, so they sort.*
