# SOURCES — `glossary` skill (provenance index)

Grounded source-of-truth library for the `glossary` skill (skill #2 of the
`schema-therapy` modelling pipeline). This file is **provenance only** — no distilled
content. All validation performed on **2026-06-04**.

## Admitted sources

| Title | Version / Edition | Publication status | Publication date | Canonical URL | Class | Validation date |
|---|---|---|---|---|---|---|
| Evans — *DDD Reference: Definitions and Pattern Summaries* ([local text](./evans-ddd-reference-2015-03.txt), [local PDF](./evans-ddd-reference-2015-03.pdf)) | 2015-03 (first & only print edition; CC BY 4.0) | Final / current — newest published edition | March 2015 (© 2015) | <https://www.domainlanguage.com/ddd/reference/> | gatherable | 2026-06-04 |
| Fowler — *Ubiquitous Language* (bliki) ([notes](./fowler-bliki-notes.md)) | Single canonical version | Final / live | 31 Oct 2006 | <https://martinfowler.com/bliki/UbiquitousLanguage.html> | cite-only (notes + verbatim quotes stored) | 2026-06-04 |
| Fowler — *Bounded Context* (bliki) ([notes](./fowler-bliki-notes.md)) | Single canonical version | Final / live | 15 Jan 2014 | <https://martinfowler.com/bliki/BoundedContext.html> | cite-only (notes + verbatim quotes stored) | 2026-06-04 |
| ddd-crew — *Bounded Context Canvas* README ([local copy](./ddd-crew-bounded-context-canvas-readme.md)) | Canvas v5 | Living document — current; last pushed 2026-05-17 | n/a (continuously maintained) | <https://github.com/ddd-crew/bounded-context-canvas> | gatherable | 2026-06-04 |
| Evans — *Domain-Driven Design: Tackling Complexity…* (book) ([cite file](./cite-only-books.md)) | 1st ed., 2004 (no 2nd ed.) | In print / current | 2004 | ISBN 978-0321125217 | cite-only | 2026-06-04 |
| Vernon — *Implementing Domain-Driven Design* (book) ([cite file](./cite-only-books.md)) | 1st ed., 2013 (no later ed.) | In print / current | 2013 | ISBN 978-0321834577 | cite-only | 2026-06-04 |

**Completeness / draft status:** The DDD Reference is a finished, perpetual document —
2015-03 is the only print edition and the publisher (Domain Language, Inc.) lists no
newer version; not superseded. The Bounded Context Canvas is a *living* repository
(canvas v5 current; a v4-proposal issue exists but v5 is the published artifact) — the
gathered README reflects the master branch at validation date.

**Executable sources:** none. Verified — this domain (ubiquitous language / glossaries)
has no executable spec or runnable artifact.

## Exclusions

| Discovered material | Reason for rejection (one line) |
|---|---|
| ddd-crew `ddd-starter-modelling-process` | Process-level (orders modelling activities incl. EventStorming→glossary); does **not** define ubiquitous-language terms or glossary discipline — pointer only, not a glossary authority. |
| ddd-crew `aggregate-design-canvas` | Scope of skill #3 (aggregates), not the glossary skill; would drift this skill's context. |
| ddd-crew `context-mapping` | Strategic context-relationship patterns; not glossary/ubiquitous-language content. |
| Fowler — `TypeInstanceHomonym` bliki | Tangential to one-concept-one-word; noted inside fowler-bliki-notes.md but not a primary glossary authority. |
| Kevlin Henney naming essays ("naming is a design activity", homeopathic naming) | General code-naming philosophy, not domain-glossary / ubiquitous-language canon; no normative standing. |
| Vernon — *DDD Distilled* | Redundant with *Implementing DDD* on UL guidance; recorded as a pointer inside cite-only-books.md, not separately admitted. |
| ddd-practitioners.com / archi-lab.io / DevIQ glossary pages | Tertiary community summaries that restate Evans/Fowler; add no authority and risk paraphrase drift. |
| Scribd / kupdf / gg-daddy GitHub copies of the 2004 Evans book | Unauthorized full-text copies of a copyrighted commercial book; inadmissible. The book is admitted cite-only via ISBN instead. |
| `bookey.app` PDF summaries of Vernon books | Third-party commercial summaries, not authoritative source text. |
| `niquola/ubiquitous-language` (Ruby impl) | A code library named after the concept; not a definition source. |
| `dokumen.pub` IDDD copy | Unauthorized full-text copy of a copyrighted book; inadmissible. |

## Authority alignment (who wins on overlapping concepts)

- **Definition of "Ubiquitous Language":** **Evans (DDD Reference / book) is
  authoritative** over Fowler. Fowler's bliki explicitly attributes the term to Evans
  and is a secondary gloss. No contradiction between them — Fowler restates Evans and
  adds the *rigour* + *testability* framing, which is consistent with Evans.
- **Definition of "Bounded Context":** **Evans is authoritative**; Fowler's bliki and
  the ddd-crew Bounded Context Canvas are consistent secondary elaborations. The Canvas
  is authoritative only for the *practical canvas format* (its "Ubiquitous Language"
  section asks "what are the key domain terms within this context, and what do they
  mean?") — not for the underlying definitions.
- **Glossary technique (write definitions, list rejected/alternative terms):** Evans
  establishes the principle; **Vernon (IDDD) is the practical authority** on the
  glossary-as-table technique and the forbidden-synonym discipline. Consistent with
  Evans, more concrete.
- **No contradictions found** among admitted sources. All trace back to Evans; later
  sources elaborate rather than dispute.

## Double-check (newest-available re-verification, 2026-06-04)

- DDD Reference: domainlanguage.com still serves **2015-03** as the current PDF; no
  2024/2025 successor exists. ✔ newest.
- Fowler bliki: both entries are the single canonical versions at their stable URLs. ✔
- Bounded Context Canvas: master branch is **v5** (last push 2026-05-17). ✔ newest
  published canvas.
- Evans 2004 book: no second edition exists. ✔ Vernon IDDD 2013: no later edition. ✔

## Licensing notes

- Evans DDD Reference: **CC BY 4.0** (stated on the document cover and on the source
  page) — full text legally stored here.
- Bounded Context Canvas: the README footer declares **CC BY 4.0**, while the repo's
  `LICENSE` file is reported by the GitHub API as **CC-BY-SA-4.0**. Both are
  attribution-permissive and permit storing this README copy; attribution: ddd-crew.
- Fowler bliki: **© Martin Fowler, all rights reserved** — stored as fair-use quotes +
  structured notes only (`fowler-bliki-notes.md`), never full text.
