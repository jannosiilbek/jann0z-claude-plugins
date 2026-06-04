# Gherkin — Source-of-Truth Library (Provenance Index)

Grounding library for the `gherkin` skill (skill #6 of the `schema-therapy` pipeline).
This file is provenance ONLY — it records what each source is, where it came from, and
how it was validated. It carries no distilled guidance.

- **Validation date for every row:** 2026-06-04
- **Pinned executable/grammar version:** `@cucumber/gherkin` **39.1.0** (tag `v39.1.0`)
- **Classes:** `gatherable` (stored here), `cite-only` (commercial, referenced not stored), `executable` (a runnable oracle)

---

## Source table

| Title | Version / Edition | Publication status | Publication date | Canonical URL | Class | Validation date |
|---|---|---|---|---|---|---|
| Gherkin Reference (cucumber.io docs) | website repo `main` @ commit of 2026-06-03 | Live, maintained | Continuously updated (repo pushed 2026-06-03) | https://cucumber.io/docs/gherkin/reference/ — source: https://github.com/cucumber/website/blob/main/docs/gherkin/reference.md | gatherable | 2026-06-04 |
| Writing better Gherkin (cucumber.io docs) | website repo `main` | Live, maintained | Continuously updated | https://cucumber.io/docs/bdd/better-gherkin/ — source: https://github.com/cucumber/website/blob/main/docs/bdd/better-gherkin.md | gatherable | 2026-06-04 |
| Gherkin Step Organization (cucumber.io docs) | website repo `main` | Live, maintained | Continuously updated | https://cucumber.io/docs/gherkin/step-organization/ — source: https://github.com/cucumber/website/blob/main/docs/gherkin/step-organization.mdx | gatherable | 2026-06-04 |
| Cucumber Anti-patterns (cucumber.io docs) | website repo `main` | Live, maintained | Continuously updated | https://cucumber.io/docs/guides/anti-patterns/ — source: https://github.com/cucumber/website/blob/main/docs/guides/anti-patterns.mdx | gatherable | 2026-06-04 |
| Example Mapping (cucumber.io docs/BDD) | website repo `main` | Live, maintained | Continuously updated | https://cucumber.io/docs/bdd/example-mapping/ — source: https://github.com/cucumber/website/blob/main/docs/bdd/example-mapping.md | gatherable | 2026-06-04 |
| Gherkin grammar (`gherkin.berp`) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/blob/v39.1.0/gherkin.berp | gatherable | 2026-06-04 |
| Gherkin dialects/keywords (`gherkin-languages.json`) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/blob/v39.1.0/gherkin-languages.json | gatherable | 2026-06-04 |
| Markdown with Gherkin (MDG) spec | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/blob/v39.1.0/MARKDOWN_WITH_GHERKIN.md | gatherable | 2026-06-04 |
| `cucumber/gherkin` repo README | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/blob/v39.1.0/README.md | gatherable | 2026-06-04 |
| `cucumber/gherkin` CHANGELOG | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/blob/v39.1.0/CHANGELOG.md | gatherable | 2026-06-04 |
| `cucumber/gherkin` LICENSE (MIT) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/blob/v39.1.0/LICENSE | gatherable | 2026-06-04 |
| testdata/good corpus (46 `.feature`) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/tree/v39.1.0/testdata/good | gatherable / executable | 2026-06-04 |
| testdata/bad corpus (11 `.feature` + 11 `.errors.ndjson`) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/tree/v39.1.0/testdata/bad | gatherable / executable | 2026-06-04 |
| `@cucumber/gherkin` reference parser (npm) | **39.1.0** | Released | 2026-05-06 (npm publish 14:49 UTC) | https://www.npmjs.com/package/@cucumber/gherkin | executable | 2026-06-04 |
| `gherkin-official` reference parser (PyPI) | tracks 39.x | Released | per cucumber/gherkin release train | https://pypi.org/project/gherkin-official/ | executable (alt) | 2026-06-04 |
| The Cucumber Book, 2nd Ed. | 2nd Edition (P1.0) | Published | Feb 2017 | https://pragprog.com/titles/hwcuc2/the-cucumber-book-second-edition/ | cite-only | 2026-06-04 |
| BDD in Action, 2nd Ed. | 2nd Edition | Published | 2023-05-02 | https://www.manning.com/books/bdd-in-action-second-edition | cite-only | 2026-06-04 |
| Writing Great Specifications (Specification by Example + Gherkin) | 1st Edition | Published | Oct 2017 | https://www.manning.com/books/writing-great-specifications | cite-only | 2026-06-04 |
| Specification by Example | 1st Edition | Published | 2011 | https://www.manning.com/books/specification-by-example | cite-only | 2026-06-04 |

---

## Stored files (relative links)

### Grammar / normative syntax — [`gherkin-grammar/`](./gherkin-grammar/)
- [`gherkin.berp`](./gherkin-grammar/gherkin.berp) — the Berp BNF grammar; **normative** Gherkin syntax.
- [`gherkin-languages.json`](./gherkin-grammar/gherkin-languages.json) — all dialect keywords (70+ languages); normative keyword set.
- [`markdown-with-gherkin.md`](./gherkin-grammar/markdown-with-gherkin.md) — Markdown-with-Gherkin (MDG) variant spec.
- [`gherkin-repo-readme.md`](./gherkin-grammar/gherkin-repo-readme.md) — parser pipeline (scanner → parser → AST → pickles) overview.
- [`gherkin-repo-changelog.md`](./gherkin-grammar/gherkin-repo-changelog.md) — version history through 39.1.0.
- [`gherkin-LICENSE.txt`](./gherkin-grammar/gherkin-LICENSE.txt) — MIT license covering grammar + corpora.

### cucumber.io docs (open content, MIT) — [`gherkin-docs/`](./gherkin-docs/)
- [`gherkin-reference.md`](./gherkin-docs/gherkin-reference.md) — **semantics authority** for keywords, structure, Background, Scenario Outline, Examples, Data Tables, Doc Strings, tags, comments, i18n.
- [`writing-better-gherkin.md`](./gherkin-docs/writing-better-gherkin.md) — declarative-vs-imperative style canon.
- [`gherkin-step-organization.mdx`](./gherkin-docs/gherkin-step-organization.mdx) — step grouping / reuse guidance.
- [`cucumber-anti-patterns.mdx`](./gherkin-docs/cucumber-anti-patterns.mdx) — official anti-pattern catalogue (feature-coupled steps, UI-coupling, conjunction steps, etc.).
- [`bdd-example-mapping.md`](./gherkin-docs/bdd-example-mapping.md) — rule/example discovery method (upstream of scenario authoring).

### Executable test corpora (MIT) — [`testdata/`](./testdata/)
- [`testdata/good/`](./testdata/good/) — 46 valid `.feature` files the parser must accept. Oracle for "what is legal Gherkin".
- [`testdata/bad/`](./testdata/bad/) — 11 invalid `.feature` files, each paired with a `*.feature.errors.ndjson` recording the **expected parser error(s)**. Oracle for "what must be rejected, and with which diagnostic".

> The `@cucumber/gherkin` npm package (v39.1.0) is the runnable reference parser. It is
> classed **executable** and is NOT vendored here; install at the pinned version
> (`npm i @cucumber/gherkin@39.1.0`) when an executable oracle is needed downstream.
> The stored `testdata/` corpora are that parser's own acceptance fixtures and travel with it.

---

## Authority alignment

Precedence when sources appear to conflict:

1. **Syntax (what parses):** `gherkin.berp` + `gherkin-languages.json` + the `@cucumber/gherkin` v39.1.0 parser are **normative**. The `testdata/good` and `testdata/bad` corpora are the executable expression of that grammar and are the tie-breaking oracle for any concrete syntax question — including error wording for malformed input.
2. **Semantics (what each construct means):** `cucumber.io/docs/gherkin/reference` is authoritative for the meaning and behavior of keywords/constructs (Background scope, Scenario Outline substitution, Examples, Data Tables, Doc Strings, tag inheritance, comments, `# language:` headers). Where the reference and the grammar describe the same thing, the grammar wins on form, the reference wins on meaning.
3. **Style / scenario-writing canon (how to write *good* Gherkin):** ranked
   1. `writing-better-gherkin.md` + `cucumber-anti-patterns.mdx` + `step-organization.mdx` (official cucumber.io style canon) — **primary**.
   2. *Writing Great Specifications* (Nicieja) — the only book dedicated to Gherkin authoring; **primary book authority** for declarative style and scenario decomposition.
   3. *The Cucumber Book, 2nd Ed.* (Wynne/Hellesøy) — by the tool's creators; authoritative on BDD discipline and Given/When/Then semantics.
   4. *BDD in Action, 2nd Ed.* (Smart/Molak) and *Specification by Example* (Adzic) — broader BDD/process canon; supporting, not Gherkin-syntax authority.
   - Official docs (1) override books (2-4) on anything Gherkin-syntax-adjacent; books deepen rationale and collaboration practice.

No contradictions were found among admitted sources. The docs, grammar, and books are mutually consistent on the declarative-over-imperative principle and on Given/When/Then meaning.

---

## Exclusions (discovered but rejected)

| Material | Why discovered | Why rejected |
|---|---|---|
| `cucumber/docs` repo (`content/docs/...`) | Search surfaced it as a docs source for reference.md | **Archived** (read-only, last push 2026-05-17) and superseded by `cucumber/website` (live, pushed 2026-06-03). Pulling from it would have risked stale content. Used `cucumber/website` instead. |
| `Behat/cucumber-gherkin`, `Fang-Zhang/gherkin-parser-compiler` | Mirror/fork of the parser | Non-canonical forks; the upstream `cucumber/gherkin` at `v39.1.0` is the source of truth. |
| `gherkin` (old npm package, pre-namespace) | npm search hit | Deprecated legacy package; replaced by namespaced `@cucumber/gherkin`. |
| `gherkin-parse`, `gherkin-utils`, GherKing tooling | npm/GitHub neighbors | Third-party tooling, not the language/grammar authority. Out of scope for a source-of-truth grammar library. |
| `andredesousa/gherkin-best-practices` (community guide) | Search hit on best practices | Unofficial single-author compilation; superseded by the official cucumber.io anti-patterns + better-gherkin docs already admitted. Cite-worthiness too low to admit. |
| Automation Panda "BDD 101: Writing Good Gherkin", thinkcode, TestEvolve, itsadeliverything, Contino "Declarative Gherkin" | Style blog hits | Useful secondary commentary but non-authoritative individual blogs; their canonical points are fully covered by admitted official docs + books. Excluded to keep the library conservative. |
| CucumberStudio / SmartBear "write Gherkin scenarios" docs | Vendor docs hit | Vendor-product documentation, not the language authority; risk of product-specific drift. |
| Cucumber anti-patterns blog **posts** (part 1 / part 2) | Blog canon | The same material is consolidated in the official `anti-patterns` docs page, which is admitted; the standalone blog posts are redundant. |
| `gherkin-official` (PyPI) full vendoring | Alt reference parser | Recorded in the table as an alternative executable parser, but not vendored — the JS `@cucumber/gherkin` is the chosen executable oracle and the testdata corpora are shared across all language implementations. |
| `*.feature.tokens` and `*.feature.ast.json` fixtures in testdata/good | Parser fixtures | Not stored: these are token/AST golden files for cross-language parser conformance, not needed for a Gherkin-authoring oracle. The `.feature` inputs (admitted) plus the bad-corpus `.errors.ndjson` (admitted) cover the authoring use-case. Retrieval coordinates: `cucumber/gherkin@v39.1.0:testdata/good/*.feature.{tokens,ast.json}`. |

---

## Validation / double-check log

- `@cucumber/gherkin` latest = **39.1.0**, published **2026-05-06T14:49:50Z**, license **MIT** — confirmed against the npm registry API (`registry.npmjs.org/@cucumber/gherkin/latest`).
- GitHub release `v39.1.0` (published 2026-05-06) confirmed as the newest tag via `gh api repos/cucumber/gherkin/releases/latest`; no newer release or pre-release exists as of 2026-06-04.
- cucumber.io docs currency confirmed: live site is backed by `cucumber/website` (default branch `main`, repo pushed **2026-06-03**); the older `cucumber/docs` repo is archived. Docs pulled from `cucumber/website@main`.
- All gatherable repo files pinned to immutable tag `v39.1.0` (not `main`) for reproducibility. Docs `.md`/`.mdx` pulled from `main` (docs have no release tags) and dated by repo push.
