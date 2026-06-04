# Cite-only commercial books

These are copyrighted commercial books. We do **not** store their text. This file records
their bibliographic identity, the exact location of aggregate content, and pointers to
authoritative *public* excerpts/summaries that the skill may lean on instead.

---

## 1. Evans — *Domain-Driven Design: Tackling Complexity in the Heart of Software*

- **Author:** Eric Evans
- **Publisher:** Addison-Wesley Professional
- **Edition / printing:** 1st edition, August 2003 (the canonical "blue book"; never revised — still the current edition)
- **ISBN-10:** 0321125215 · **ISBN-13:** 978-0321125217
- **Pages:** ~560
- **Where aggregates live:** Chapter 6, *"The Life Cycle of a Domain Object"* — the section **Aggregates** (also Factories, Repositories in the same chapter).
- **What it is authoritative for:** the *original* definition of Aggregate, Aggregate Root, the boundary/root invariant rules:
  - An Aggregate is a cluster of associated objects treated as a unit for data changes.
  - Each Aggregate has a **root** (a single specific Entity) and a **boundary**.
  - Outside objects may hold references **only** to the root.
  - Only roots are obtained directly by database query; interior objects reached by traversal.
  - A delete removes everything inside the boundary at once.
  - When a change is committed, **all invariants of the whole Aggregate must be satisfied**.
- **Authoritative *public* surrogate** (free, gatherable): the **DDD Reference** by the same
  author distills these definitions verbatim — see `ddd-reference-2015-03.pdf` (Aggregates entry).
  Use the DDD Reference, not the book text, for quotable definitions.

## 2. Vernon — *Implementing Domain-Driven Design* (IDDD)

- **Author:** Vaughn Vernon
- **Publisher:** Addison-Wesley Professional
- **Edition / printing:** 1st edition, 2013 (current edition; never revised)
- **ISBN-10:** 0321834577 · **ISBN-13:** 978-0321834577
- **Where aggregates live:** **Chapter 10, "Aggregates"** — covers aggregate modeling,
  rules of thumb (model true invariants in consistency boundaries, design small aggregates,
  reference other aggregates by identity, use eventual consistency outside the boundary),
  aggregate size, and transactional handling.
- **What it is authoritative for:** the *book-length* treatment behind the "Effective
  Aggregate Design" essays — same author, same rules, fuller worked examples.
- **Authoritative *public* surrogate** (free, gatherable): Vernon's three-part
  **"Effective Aggregate Design"** essays are the publicly licensed condensation of this
  chapter's argument — see `vernon-effective-aggregate-design-part-1/2/3.pdf`.
  Use the essays, not the book text, for quotable rules.

---

### Admission rationale
Both books are **cite-only**: load-bearing original sources, but commercial. For every concept
they own, a free, author-written public surrogate exists (DDD Reference; the three essays),
so the skill never needs to quote the books directly.
