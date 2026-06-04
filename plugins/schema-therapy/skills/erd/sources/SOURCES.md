# ERD skill — source-of-truth provenance index

Grounded source library for the `erd` skill (skill #4 of the `schema-therapy`
6-skill modelling pipeline). The skill turns the glossary + aggregates
artifacts into `specs/04-erd.dbml` — a DBML data model that also owns a
transition table for every entity with a lifecycle. Downstream build steps need
an executable oracle: the authoritative DBML parser and a real Postgres engine.

This file is **provenance only** — no distilled content. All validation dates
are **2026-06-04**.

Classes:
- **gatherable** — full text legally stored in this directory.
- **cite-only** — paywalled or otherwise not redistributable; bibliographic
  identity + pointers to authoritative public excerpts.
- **executable** — runtime tooling; identity + exact pinned version recorded,
  install coordinates given, NOT vendored (except small grammar/fixture files).

---

## Source table

| Title | Version / Edition | Publication status | Publication date | Canonical URL | Class | Validated |
|---|---|---|---|---|---|---|
| Codd — *A Relational Model of Data for Large Shared Data Banks* | CACM 13(6), pp. 377–387 | Published, ACM (public mirror gathered) | 1970-06 | https://dl.acm.org/doi/10.1145/362384.362685 | gatherable | 2026-06-04 |
| Codd — *Further Normalization of the Data Base Relational Model* (2NF/3NF) | IBM RJ909 (1971-08-31); reprint in *Data Base Systems*, Courant Computer Science Symposia 6, Prentice-Hall, 1972 | Published; original paywalled/out-of-print | 1971 (RJ909) / 1972 (reprint) | https://dblp.org/rec/persons/Codd71a.html | cite-only | 2026-06-04 |
| Boyce & Codd — *Recent Investigations into Relational Data Base Systems* (BCNF) | IBM RJ1385 (1974-04-23); Proc. IFIP Congress 1974, North-Holland | Published; paywalled/out-of-print | 1974 | (no stable open PDF; see Exclusions) | cite-only | 2026-06-04 |
| Fagin — *Multivalued Dependencies and a New Normal Form for Relational Databases* (4NF) | ACM TODS 2(3), Sept. 1977; IBM RJ1812 | Published, ACM; paywalled | 1977-09 | https://dl.acm.org/doi/10.1145/320557.320571 | cite-only | 2026-06-04 |
| Chen — *The Entity-Relationship Model — Toward a Unified View of Data* | ACM TODS 1(1), pp. 9–36 | Published, ACM (author/Archive mirror gathered) | 1976-03 | https://dl.acm.org/doi/10.1145/320434.320440 | gatherable | 2026-06-04 |
| Kent — *A Simple Guide to Five Normal Forms in Relational Database Theory* | CACM 26(2), pp. 120–125; IBM TR03.159 (1981) | Published, ACM; author's own copy (ACM permission notice) gathered | 1983-02 | https://dl.acm.org/doi/10.1145/358024.358054 | gatherable | 2026-06-04 |
| DBML language reference (Holistics) | Tracks `@dbml/core` **8.2.5** (docs site self-labels "3.12.0" — see Exclusions) | Open-source docs, Apache-2.0 (gathered as markdown) | living doc; repo HEAD 2026-06-03 | https://dbml.dbdiagram.io/docs/ | gatherable | 2026-06-04 |
| `@dbml/core` — authoritative DBML parser/validator | **8.2.5** | Published, npm, Apache-2.0 | 2026-06-03 | https://www.npmjs.com/package/@dbml/core | executable | 2026-06-04 |
| PGlite — in-process Postgres execution engine | **0.5.1** (embeds **PostgreSQL 18.3**) | Published, npm, Apache-2.0 + PostgreSQL License | 2026-06-02 | https://www.npmjs.com/package/@electric-sql/pglite | executable | 2026-06-04 |
| DBML→Postgres test fixture (input + expected SQL) | from `holistics/dbml` master @ 2026-06-03 | Apache-2.0 fixture (small, vendored) | repo HEAD | https://github.com/holistics/dbml/tree/master/packages/dbml-cli/__tests__/dbml2sql | executable | 2026-06-04 |

---

## Gathered files (relative links)

Classic papers:
- [Codd 1970 — A Relational Model of Data](./codd-1970-relational-model.pdf) — full 11-page scan (seas.upenn.edu mirror of the CACM paper).
- [Chen 1976 — The Entity-Relationship Model](./chen-1976-entity-relationship-model.pdf) — full reprint scan (Internet Archive `entityrelationshx00chen`).
- [Chen 1976 — condensed 5-page version](./chen-1976-lsu-condensed-5page.pdf) — author-hosted (csc.lsu.edu) condensed edition; secondary.
- [Kent 1983 — Five Normal Forms](./kent-1983-five-normal-forms.html) — complete full text, author's own copy (`bkent.net`) bearing the ACM 1996 permission-to-copy notice.

DBML language reference (Holistics, Apache-2.0):
- [docs.md](./dbml-docs/docs.md) — primary DBML syntax reference.
- [language-basics.md](./dbml-docs/language-basics.md)
- [module-system.md](./dbml-docs/module-system.md)
- [enrichment-visualization.md](./dbml-docs/enrichment-visualization.md)
- [database-support.md](./dbml-docs/database-support.md)
- [js-module-core.md](./dbml-docs/js-module-core.md) — `@dbml/core` JS API.
- [cli.md](./dbml-docs/cli.md) — `@dbml/cli` reference.

Executable oracle reference fixture (Holistics, Apache-2.0):
- [dbml2sql-postgres-input.dbml](./dbml-fixtures/dbml2sql-postgres-input.dbml) — sample DBML input.
- [dbml2sql-postgres-expected.sql](./dbml-fixtures/dbml2sql-postgres-expected.sql) — the exact Postgres DDL `@dbml/core` emits for it. Demonstrates the precise DBML→Postgres transformation the downstream build must reproduce.

See [NOTICE.md](./NOTICE.md) for Apache-2.0 attribution of the vendored DBML files.

---

## Executable install coordinates (not vendored)

```
npm install @dbml/core@8.2.5          # authoritative DBML parser/validator
npm install @electric-sql/pglite@0.5.1 # in-process Postgres 18.3 engine
```

- `@dbml/core` 8.2.5 — parse DBML → Database object; export SQL (postgres dialect)
  and DBML; Apache-2.0; repo `git+https://github.com/holistics/dbml.git`.
- `@electric-sql/pglite` 0.5.1 — WASM PostgreSQL **18.3** (per the 0.5.0 release
  note "Upgrade to Postgres 18.3"); dual-licensed Apache-2.0 + PostgreSQL
  License; repo `https://github.com/electric-sql/pglite`. Postgres source fork:
  `https://github.com/electric-sql/postgres-pglite` (branch `REL_18_3-pglite`).

Pipeline: author DBML → `@dbml/core` parses/validates and emits Postgres DDL →
PGlite executes the DDL + seed + use-case queries as the live oracle.

---

## Authority alignment

Where sources overlap, the following authority order governs:

1. **Normalization theory (1NF–5NF/BCNF).** The *normative* originals are
   Codd 1971/72 (2NF, 3NF), Boyce–Codd 1974 (BCNF), and Fagin 1977 (4NF; 5NF is
   Fagin 1979). **Kent 1983 is a pedagogical summary, NOT normative** — Kent
   himself frames it as informal ("may be imprecise in some technical details")
   and defers to the originals and to Date's textbook. When Kent's plain-language
   phrasing and a formal original appear to conflict, the original (Codd/Fagin)
   wins; Kent is admitted as the clearest teaching restatement and the most
   redistributable full text in this set.
2. **The relational model itself.** Codd 1970 is the normative root for relations,
   keys, and 1NF.
3. **The ER model.** Chen 1976 is the normative root for entities, relationships,
   and cardinality — the conceptual layer the DBML output expresses.
4. **DBML language.** The **`@dbml/core` parser (8.2.5) is authoritative over the
   prose docs**, which in turn are authoritative over any dbdiagram.io blog posts
   or community forum threads. When the docs and the parser's accepted grammar
   disagree, the parser is ground truth (it is the executable oracle). The
   vendored docs are admitted as the human-readable spec; the parser settles
   edge cases.
5. **Postgres semantics.** PGlite's embedded **PostgreSQL 18.3** engine is the
   authoritative arbiter of whether generated SQL actually runs — it overrides
   any documentation claim about SQL behavior.

---

## Exclusions (discovered but rejected, with reasons)

- **ACM Digital Library paywalled PDFs** (Codd 1971/72, Boyce–Codd 1974,
  Fagin 1977) — paywalled; not redistributable. Kept as **cite-only** with DOIs
  / dblp pointers. Public mirrors exist (Semantic Scholar, CiteSeerX,
  thethirdmanifesto.com forum PDF for Codd 1971; CiteSeerX/ResearchGate for
  Fagin 1977) but their provenance/legal status is uncertain, so they are
  pointers only, not gathered.
- **Boyce–Codd 1974 open PDF** — no stable, authoritative open copy located; the
  paper is an out-of-print IFIP Congress proceedings reprint (IBM RJ1385). BCNF
  is well-covered transitively by Kent 1983 and the cite-only original; admitted
  cite-only without a stored file.
- **`scribd.com`, `academia.edu`, `researchgate.net`, `scispace.com` copies** of
  the classic papers — login-walled / re-hosted with unclear rights; rejected in
  favor of author-hosted or institutional mirrors (csc.lsu.edu, bkent.net,
  archive.org, seas.upenn.edu).
- **Grinnell `codd-1970.pdf` mirror** — initially fetched but it was a truncated
  10 KB / 4-page extract, not the full paper; replaced with the complete
  seas.upenn.edu scan. Rejected.
- **DBML docs "version 3.12.0"** surfaced by search — the live docs site
  self-labels a marketing/docs version (3.12.0) that does **not** match the
  actual implementation. The authoritative spec is whatever `@dbml/core` 8.2.5
  parses; the homepage Docusaurus `package.json` is merely `0.1.0`. The "3.12.0"
  string is therefore noted but not treated as the spec version (avoids a stale
  citation). The gathered `dbml-docs/*` markdown (repo `master`, 2026-06-03) is
  the admitted prose spec.
- **`dbml.dbdiagram.io` blog posts / `community.dbdiagram.io` forum threads** —
  non-normative; superseded by the repo docs + parser. Excluded.
- **`@dbml/cli`, `@dbml/connector` npm packages** — wrappers around `@dbml/core`;
  not the parser core. The `cli.md` doc is gathered for reference but the CLI is
  not pinned as an executable dependency (the core library is the oracle).
- **Forks `haileys/pglite`, `pglite/pglite`** — unrelated/aggregator GitHub repos
  sharing the name; the authoritative PGlite is `electric-sql/pglite`
  (`@electric-sql/pglite` on npm). Others excluded.
- **`@dbml/core` 8.2.4-alpha.2 and other pre-release tags** — superseded by the
  stable `latest` 8.2.5. Excluded.
- **Internet Archive / MIT DSpace full Chen scans** — DSpace bitstream returned
  empty; Internet Archive copy succeeded and is the gathered full version.
- **Non-`node_modules` vendoring of the parser/engine** — deliberately NOT done
  per the task; only install coordinates + one small Apache-2.0 fixture pair are
  stored.

---

## Validation log

- `@dbml/core` `latest` = **8.2.5**, published **2026-06-03T08:08:45Z**, Apache-2.0
  — confirmed via `registry.npmjs.org/@dbml/core`.
- `@electric-sql/pglite` `latest` = **0.5.1**, published **2026-06-02T13:42Z**,
  Apache-2.0 — confirmed via `registry.npmjs.org/@electric-sql/pglite`. Embedded
  Postgres = **18.3**, confirmed via the `@electric-sql/pglite@0.5.0` GitHub
  release note ("Upgrade to Postgres 18.3") and the `REL_18_3-pglite` branch in
  `electric-sql/postgres-pglite`.
- DBML repo `CHANGELOG.md` HEAD = **v8.2.5 (2026-06-03)**; LICENSE = Apache-2.0
  (covers the vendored docs + fixture).
- Classic-paper bibliographic identities cross-checked against ACM DOIs and dblp.
