# Martin Fowler — "DDD_Aggregate" bliki (notes)

Captured because the source is a web page, not a downloadable artifact. Content licensed
to Martin Fowler; this is a faithful note-capture for grounding, not a redistribution.

- **Source:** https://martinfowler.com/bliki/DDD_Aggregate.html
- **Author:** Martin Fowler
- **Published:** 23 April 2013 (bliki entry; stable, not a perpetual draft)
- **Tags:** domain driven design; object collaboration design

## Captured substance

- **Definition:** A DDD Aggregate is "a cluster of domain objects that can be treated as a
  single unit." Canonical example: an Order together with its line-items — separate objects,
  but useful to treat the Order (with its line items) as a single aggregate.

- **Aggregate Root:** Every aggregate has one component object designated as its root. The
  root is the gatekeeper for the whole cluster.

- **External references go only to the root:** "Any references from outside the aggregate
  should only go to the aggregate root." This lets the root guarantee the integrity of the
  aggregate as a whole.

- **Unit of persistence:** Aggregates are the basic element of transfer for data storage —
  you request to load or save *whole* aggregates.

- **Transaction boundary:** Transactions should **not** cross aggregate boundaries. The
  aggregate is the fundamental transactional unit.

- **Not a collection:** DDD aggregates are *domain concepts* (order, clinic visit, playlist),
  not generic collection classes (list, map). An aggregate often *contains* collections plus
  simple fields, but it is a meaningful business entity. (Note: "aggregate" in UML means
  something different and unrelated.)

## Role for the skill
Concise, widely-cited, neutral restatement of Evans' aggregate rules. Good for a one-line
authoritative gloss. **Subordinate** to Evans/Vernon on any nuance — it is a summary, not a
primary derivation.
