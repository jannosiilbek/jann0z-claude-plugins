# Sources — `aggregates` skill (provenance index)

Grounded source-of-truth library for DDD tactical/aggregate design. **Provenance only** —
no distilled content lives here. All validations performed **2026-06-04**.

Scope: turning event-storming + glossary artifacts into `specs/03-aggregates.md`
(aggregate roots, invariants, transactional boundaries, eventual-consistency rules).

## Admitted sources

| Title | Version / Edition | Publication status | Publication date | Canonical URL | Class | Validated |
|---|---|---|---|---|---|---|
| Domain-Driven Design Reference — Definitions and Pattern Summaries (Eric Evans) | 2015-03 (latest; CC BY 4.0) | Published, stable (current free reference) | 2015-03 | https://www.domainlanguage.com/ddd/reference/ | gatherable | 2026-06-04 |
| Effective Aggregate Design, Part I: Modeling a Single Aggregate (Vaughn Vernon) | 2011 essay (CC BY-ND 3.0) | Published, final | 2011 | https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf | gatherable | 2026-06-04 |
| Effective Aggregate Design, Part II: Making Aggregates Work Together (Vaughn Vernon) | 2011 essay (CC BY-ND 3.0) | Published, final | 2011 | https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_2.pdf | gatherable | 2026-06-04 |
| Effective Aggregate Design, Part III: Gaining Insight Through Discovery (Vaughn Vernon) | 2011 essay (CC BY-ND 3.0) | Published, final | 2011 | https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_3.pdf | gatherable | 2026-06-04 |
| The Aggregate Design Canvas (ddd-crew) | Template v1.1 / README content v1.1 (CC BY 4.0) | Published; living repo, last substantive update 2023-12 | 2020 (v1.1 current) | https://github.com/ddd-crew/aggregate-design-canvas | gatherable | 2026-06-04 |
| DDD_Aggregate (Martin Fowler bliki) | Single revision | Published, stable | 2013-04-23 | https://martinfowler.com/bliki/DDD_Aggregate.html | gatherable (notes only) | 2026-06-04 |
| Domain-Driven Design: Tackling Complexity in the Heart of Software (Eric Evans) — Ch. 6, Aggregates | 1st ed. (only edition) | Published commercial book | 2003-08 | https://www.dddcommunity.org/book/evans_2003/ | cite-only | 2026-06-04 |
| Implementing Domain-Driven Design (Vaughn Vernon) — Ch. 10, Aggregates | 1st ed. (only edition) | Published commercial book | 2013 | https://www.amazon.com/dp/0321834577 | cite-only | 2026-06-04 |

No **executable** sources exist for this domain (verified — aggregate design is conceptual/textual).

## Gathered files (relative links)

- [`ddd-reference-2015-03.txt`](./ddd-reference-2015-03.txt) — full 59-page reference, downloaded, complete, verified author/year/license on p.1.
- [`vernon-effective-aggregate-design-part-1.txt`](./vernon-effective-aggregate-design-part-1.txt) — 6 pp, complete.
- [`vernon-effective-aggregate-design-part-2.txt`](./vernon-effective-aggregate-design-part-2.txt) — 5 pp, complete.
- [`vernon-effective-aggregate-design-part-3.txt`](./vernon-effective-aggregate-design-part-3.txt) — 5 pp, complete.
- [`aggregate-design-canvas-readme.md`](./aggregate-design-canvas-readme.md) — full README (canvas sections + guidance), downloaded from `master`.
- [`aggregate-design-canvas-v1.1.txt`](./aggregate-design-canvas-v1.1.txt) — current canvas template (superseded v1 deleted).
- [`fowler-ddd-aggregate-bliki-notes.md`](./fowler-ddd-aggregate-bliki-notes.md) — faithful note-capture (page, not a download).
- [`cite-only-commercial-books.md`](./cite-only-commercial-books.md) — bibliographic identity + public-surrogate pointers for the two commercial books.

PDF originals replaced by plain-text extractions for plugin shipping; canonical URLs above remain the authoritative format.

## Validation notes

- **DDD Reference**: confirmed **2015-03** is the latest issue (domainlanguage.com offers no
  newer dated edition); first page asserts "© 2015 Eric Evans … CC BY 4.0". The `file` utility
  misreports "8 pages" by reading the page-tree node; the PDF page tree carries `/Count 59` and
  pypdf enumerates **59 pages** — the genuine complete reference, not an excerpt.
- **Vernon essays I–III**: dddcommunity.org is the original publisher; kalele.io (Vernon's own
  site) mirrors II & III identically. Used dddcommunity.org canonical URLs. CC BY-ND 3.0.
  All three are *final* 2011 essays, not perpetual drafts — no completeness caveat.
- **Aggregate Design Canvas**: README lists **v1.1** as the latest template across all formats;
  repo's last substantive change was **2023-12**; no v1.2/v2 exists. Stored v1.1 PDF; removed the
  older v1 PDF to avoid keeping a superseded artifact.
- **Fowler bliki**: single-revision 2013 entry; stable, no later revision date shown.
- **Cite-only books**: both are sole/first editions (Evans 2003, Vernon 2013) — never revised, so
  "current edition" is trivially satisfied. Not downloaded (commercial); public surrogates noted.

## Exclusions (discovered but rejected)

- **microservices.io — "Pattern: Aggregate" (Chris Richardson)**
  https://microservices.io/patterns/data/aggregate.html — Rejected as a *primary* source. The
  public page is a stub ("A graph of objects that can be treated as a unit") that defers all
  substance to Richardson's commercial *Microservices Patterns* book. It adds no aggregate-design
  rule not already owned, in fuller form, by Vernon's essays. Admitting it would dilute, not deepen.
- **Vernon — *Domain-Driven Design Distilled* (2016)** — Not pursued. A strategic-design primer;
  its aggregate coverage is a lighter restatement of IDDD/the essays. Superseded for our purpose
  by sources already admitted; admitting another commercial cite-only book adds no new authority.
- **Khononov — *Learning Domain-Driven Design* (O'Reilly, 2021)** — Excluded. Modern and good, but
  commercial cite-only, and on aggregates it restates Evans/Vernon without overturning them. No
  free author-written surrogate; nothing it owns is load-bearing here. Avoided to keep admission
  conservative.
- **Domain-Driven Design in PHP / language-specific re-treatments** (oreilly excerpt, dev.to,
  jamesmichaelhickey.com, badia-kharroubi gitbook, SAP curated-resources blog) — Excluded as
  tertiary/derivative. They paraphrase Evans/Fowler/Vernon; not authorities.
- **Scribd / academia.edu / dokumen.pub / studylib full-text book copies** — Excluded:
  unauthorized re-hosts of copyrighted books (Evans blue book, IDDD). Provenance-unsafe; the
  legitimate cite-only entries already cover these works.
- **Leanpub "Domain-Driven Design Referenz" (German)** — Excluded: translated derivative of the
  DDD Reference; the English 2015-03 original is the authority we hold.
- **Course Hero "Effective Aggregate Design Part III"** — Excluded: re-host of the Vernon essay we
  already gathered from the canonical publisher.

## Authority alignment (who rules on overlapping concepts)

- **Definition of Aggregate / Aggregate Root / boundary** → **Evans** is the originator
  (blue book Ch. 6); the **DDD Reference** (gatherable, same author) is the quotable surrogate.
  Fowler's bliki is an accepted concise gloss, *subordinate* to Evans on nuance.
- **Aggregate sizing — "design small aggregates"** → **Vernon** (Effective Aggregate Design Part I)
  is authoritative. This *refines* (does not contradict) Evans: Evans defines the boundary by true
  invariants; Vernon argues most modeled invariants are not truly transactional, so boundaries
  should be smaller than teams instinctively draw. **Ruling:** Vernon governs sizing guidance;
  Evans governs the underlying invariant-boundary definition. They are complementary, not opposed.
- **References between aggregates (by identity, not object reference)** → **Vernon**
  (Effective Aggregate Design Part II) is authoritative; consistent with Fowler ("references from
  outside only to the root") and Evans (interior reached only by traversal).
- **Consistency model — one aggregate per transaction; eventual consistency across aggregates**
  → **Vernon** (Part II) is the primary articulation of the rule of thumb; Fowler states the
  hard constraint ("transactions should not cross aggregate boundaries"). **Ruling:** treat the
  one-transaction-per-aggregate boundary as a *strong default*, with Vernon's explicit
  "unless the business/domain expert demands otherwise" escape hatch.
- **Invariant capture & corrective policies as a worksheet** → **ddd-crew Aggregate Design Canvas**
  is authoritative as the *process/checklist* tool (enforced invariants, corrective policies,
  commands→events, state transitions, throughput, size). It operationalizes Evans+Vernon; it does
  not redefine them.

## Concerns

- Evans' blue book and Vernon's IDDD are the deepest sources but are cite-only; the skill must rely
  on the free surrogates (DDD Reference, the three essays) for any quotable text. This is sufficient
  — every load-bearing rule has a free author-written home — but the worked code examples in IDDD
  Ch. 10 are not reproducible from the free essays alone.
- Vernon's essays carry a **CC BY-ND** (NoDerivatives) license: the PDFs may be redistributed
  verbatim but **not** modified/excerpted into derivative text. Downstream skill content must
  paraphrase rather than splice the essay text.
