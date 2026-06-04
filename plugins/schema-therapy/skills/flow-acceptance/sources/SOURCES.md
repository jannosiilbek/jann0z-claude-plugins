# Flow-Acceptance — Source-of-Truth Library (Provenance Index)

Grounding library for the `flow-acceptance` skill (skill #10 of the `schema-therapy` pipeline) —
the pipeline's **terminal** artifact. It turns behavior specs (`06-gherkin`), task models (`08`), and
UI flows (`09`: screens with **pinned ids** + navigation) into `specs/10-flow-acceptance/*.feature`:
one feature per task model — the realized flow walked **screen-by-screen by pinned id**, with outcomes
bound back to 06 scenarios by **tag**. Shared formalism with the 06 skill: **Gherkin**.

This file is provenance ONLY — what each source is, where it came from, how it was validated. It
carries no distilled guidance.

- **Validation date for every row:** 2026-06-04
- **Current executable/grammar version (re-validated TODAY against npm registry + GitHub tags):**
  `@cucumber/gherkin` **39.1.0** (npm `latest`, published 2026-05-06T14:49:50Z, MIT; GitHub tag
  `v39.1.0`, release 2026-05-06; no newer release or pre-release exists as of 2026-06-04).
- **Classes:** `gatherable` (stored here, or copied from the sibling `gherkin` skill at build time —
  see Shared corpus), `gatherable (notes)` (faithful structured record, not a verbatim republication),
  `cite-only` (referenced, not stored — commercial or large/implementation-target), `executable`
  (a runnable oracle).

---

## Source table

| Title | Version / Edition | Publication status | Publication date | Canonical URL | Class | Validation date |
|---|---|---|---|---|---|---|
| Gherkin grammar (`gherkin.berp`) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/blob/v39.1.0/gherkin.berp | gatherable (shared corpus — copy) | 2026-06-04 |
| Gherkin dialects/keywords (`gherkin-languages.json`) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/blob/v39.1.0/gherkin-languages.json | gatherable (shared corpus — copy) | 2026-06-04 |
| `@cucumber/gherkin` reference parser (npm) | **39.1.0** | Released | 2026-05-06 (npm publish 14:49:50Z UTC) | https://www.npmjs.com/package/@cucumber/gherkin | executable | 2026-06-04 |
| testdata/good corpus (46 `.feature`) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/tree/v39.1.0/testdata/good | gatherable / executable (shared corpus — copy) | 2026-06-04 |
| testdata/bad corpus (11 `.feature` + 11 `.errors.ndjson`) | tag `v39.1.0` | Released | 2026-05-06 | https://github.com/cucumber/gherkin/tree/v39.1.0/testdata/bad | gatherable / executable (shared corpus — copy) | 2026-06-04 |
| Gherkin Reference (cucumber.io docs) | `cucumber/website` `main` @ `0fcab8b` (pushed 2026-06-03) | Live, maintained | Continuously updated | https://cucumber.io/docs/gherkin/reference/ — src https://github.com/cucumber/website/blob/main/docs/gherkin/reference.md | gatherable (shared corpus — copy) | 2026-06-04 |
| Writing better Gherkin (cucumber.io docs) | `cucumber/website` `main` | Live, maintained | Continuously updated | https://cucumber.io/docs/bdd/better-gherkin/ — src https://github.com/cucumber/website/blob/main/docs/bdd/better-gherkin.md | gatherable (shared corpus — copy) | 2026-06-04 |
| Cucumber Anti-patterns (cucumber.io docs) | `cucumber/website` `main` | Live, maintained | Continuously updated | https://cucumber.io/docs/guides/anti-patterns/ — src https://github.com/cucumber/website/blob/main/docs/guides/anti-patterns.mdx | gatherable (shared corpus — copy) | 2026-06-04 |
| Gherkin Step Organization (cucumber.io docs) | `cucumber/website` `main` | Live, maintained | Continuously updated | https://cucumber.io/docs/gherkin/step-organization/ — src https://github.com/cucumber/website/blob/main/docs/gherkin/step-organization.mdx | gatherable (shared corpus — copy) | 2026-06-04 |
| **Cucumber anti-patterns (part #1)** — blog | `cucumber/website` `main` @ `0fcab8b` | Live, maintained | 2016-07-01 (Theo England) | https://cucumber.io/blog/bdd/cucumber-antipatterns-part-one/ — src https://github.com/cucumber/website/blob/main/blog/2016-07-01-cucumber-antipatterns-part-one.md | gatherable | 2026-06-04 |
| **Cucumber anti-patterns (part #2) — "Testing through the UI"** — blog | `cucumber/website` `main` @ `0fcab8b` | Live, maintained | 2016-08-31 (Theo England) | https://cucumber.io/blog/bdd/cucumber-anti-patterns-part-two/ — src https://github.com/cucumber/website/blob/main/blog/2016-08-31-cucumber-anti-patterns-part-two.md | gatherable | 2026-06-04 |
| **Page Object** — Martin Fowler bliki | bliki (undated revisions) | Live | 2013-09-10 | https://martinfowler.com/bliki/PageObject.html | gatherable (notes) | 2026-06-04 |
| **WebDriver — Level 1** (W3C) | REC-webdriver1-20180605 | **W3C Recommendation** | 2018-06-05 | https://www.w3.org/TR/webdriver1/ | cite-only (implementation target) | 2026-06-04 |
| **WebDriver — Level 2** (W3C) | WD-webdriver2-20260528 | W3C Working Draft (newest; not REC) | 2026-05-28 | https://www.w3.org/TR/webdriver2/ | cite-only (implementation target) | 2026-06-04 |
| **Playwright** (Node.js) | **1.60.0** | Released | 2026-05-11 | https://playwright.dev/docs/intro | cite-only (implementation target) | 2026-06-04 |
| The Cucumber Book, 2nd Ed. | 2nd Edition (P1.0) | Published | Feb 2017 | https://pragprog.com/titles/hwcuc2/the-cucumber-book-second-edition/ | cite-only | 2026-06-04 |
| Writing Great Specifications (Nicieja) | 1st Edition | Published | Oct 2017 | https://www.manning.com/books/writing-great-specifications | cite-only | 2026-06-04 |
| BDD in Action, 2nd Ed. (Smart/Molak) | 2nd Edition | Published | 2023-05-02 | https://www.manning.com/books/bdd-in-action-second-edition | cite-only | 2026-06-04 |

---

## Shared corpus — COPY (never reference) from the sibling `gherkin` skill

Per the build directive's narrow exception, the sibling skill `gherkin` was **listed only** (filenames)
at `../../gherkin/sources/`. Its gathered Gherkin corpus fully covers this skill's *formalism* needs
(grammar, dialects, reference parser fixtures, semantics docs, style docs). Those files were
**independently re-validated** by this research (npm `latest` = 39.1.0 confirmed today; GitHub tag
`v39.1.0` confirmed newest; `cucumber/website` `main` HEAD = `0fcab8b`, pushed 2026-06-03).

**Build-step instruction:** the flow-acceptance build will **COPY** (not symlink, not reference) the
following from `../../gherkin/sources/` into this skill's own `sources/` tree, so the skill stays fully
self-contained per the pipeline's single-ownership / self-containment rule:

- `gherkin-grammar/gherkin.berp`, `gherkin-grammar/gherkin-languages.json`
- `gherkin-docs/gherkin-reference.md`, `gherkin-docs/writing-better-gherkin.md`,
  `gherkin-docs/cucumber-anti-patterns.mdx`, `gherkin-docs/gherkin-step-organization.mdx`
- `testdata/good/` (46 `.feature`) and `testdata/bad/` (11 `.feature` + 11 `.errors.ndjson`)
- the MIT `LICENSE` covering grammar + corpora.

The `@cucumber/gherkin@39.1.0` parser stays **executable / not vendored**; install at the pinned
version when a runnable oracle is needed (`npm i @cucumber/gherkin@39.1.0`).

> Until that copy happens, the grammar/semantics/style rows above are satisfied by the sibling's
> validated files. This SOURCES.md records their upstream coordinates so the copy is reproducible and
> independently verifiable.

---

## Stored files (relative links) — net-new to this skill

### Screen-flow discipline & the UI-coupling tension — [`screen-flow-discipline/`](./screen-flow-discipline/)
- [`cucumber-antipatterns-part-one.md`](./screen-flow-discipline/cucumber-antipatterns-part-one.md) —
  Theo England, 2016-07-01. Incidental-detail / multiple-rule anti-patterns; upstream context.
- [`cucumber-anti-patterns-part-two.md`](./screen-flow-discipline/cucumber-anti-patterns-part-two.md) —
  Theo England, 2016-08-31. **"Testing through the UI"** — the canonical statement of the
  UI-coupling-as-anti-pattern tension (brittleness, slowness, poor documentation). Load-bearing.
- [`fowler-page-object.md`](./screen-flow-discipline/fowler-page-object.md) — structured notes on
  Fowler's **Page Object** (2013-09-10). The admitted precedent for **screen-addressed steps**:
  named, stable abstraction over UI structure; navigation returns another screen; assertions stay in
  the test. © Martin Fowler — notes, not verbatim republication.

### Implementation targets (cite-only) — [`implementation-targets/`](./implementation-targets/)
- [`webdriver-w3c.md`](./implementation-targets/webdriver-w3c.md) — W3C WebDriver L1 (2018 REC) +
  L2 (2026-05-28 WD). The standardised browser-command vocabulary a downstream step layer binds to.
- [`playwright.md`](./implementation-targets/playwright.md) — Playwright **1.60.0** (Apache-2.0).
  Modern locator/test-id + web-first `expect` model; executable analogue of pinned-id screen addressing.

---

## Authority alignment

Precedence when sources appear to conflict:

1. **Syntax (what parses):** `gherkin.berp` + `gherkin-languages.json` + the `@cucumber/gherkin`
   v39.1.0 parser are **normative**. `testdata/good` / `testdata/bad` are the executable expression of
   that grammar and the tie-breaking oracle for any concrete syntax question (including error wording).
   Identical to the 06 skill — by design, since 06 and 10 share the Gherkin formalism, and 10's output
   must parse under the same parser.
2. **Semantics (what each construct means):** `cucumber.io/docs/gherkin/reference` is authoritative for
   the meaning/behavior of keywords/constructs (Background scope, Scenario Outline substitution,
   Examples, Data Tables, Doc Strings, tag inheritance, `# language:` headers). Grammar wins on form,
   reference wins on meaning.
3. **Style — the screen-flow discipline (how to write *good* flow-acceptance Gherkin):** ranked
   1. `writing-better-gherkin.md` + `cucumber-anti-patterns.mdx` + the **"Testing through the UI"**
      blog (part #2) — official cucumber.io canon on the UI-coupling tension; **primary**.
   2. Fowler **Page Object** — primary authority for the *screen-addressed-step* pattern (named,
      stable, navigation-returns-screen, assertion-free reference).
   3. Books (*Writing Great Specifications*, *The Cucumber Book 2e*, *BDD in Action 2e*) — deepen
      rationale; supporting, not syntax authority.
4. **Implementation targets (WebDriver, Playwright):** **cite-only, non-normative.** They never dictate
   `.feature` content; they are recorded so the realized-flow steps are known to compile down to a real
   standardised driver protocol. Where an implementation-target doc and the style canon appear to
   disagree, the **style canon wins** for the artifact and the implementation detail is pushed below
   the Gherkin line (into step definitions).

### The UI-coupling ruling (explicit)

The cucumber.io "Testing through the UI" anti-pattern and Fowler's Page Object together establish that
*ad-hoc* UI references in scenarios (buttons, fields, clicks, layout) are brittle, slow, and poor
documentation. **This skill's screen-walk does NOT trip that anti-pattern**, and the admitted sources
ground *why*:

- The anti-pattern targets **incidental, unstable UI detail** ("click the blue button", "fill the 3rd
  field") — references whose meaning evaporates when the UI is restyled. The cucumber.io complaint is
  literally about "buttons and links and fields and tables" terminology that fails to name the domain.
- This skill references screens by **pinned id from the verified upstream 09 UI-flow model** — a
  *named, stable, deliberately-assigned identity*, not incidental layout. That is precisely the
  Page-Object move: "model the structure that makes sense to the user" and address it through a stable
  application-specific name, so a UI restyle does not change the reference. Fowler's rule that
  *navigation returns another page object* is the same thing as the 09 model's screen→screen edges; the
  flow-acceptance feature walks exactly those edges.
- The pinned id is the spec-level mirror of Playwright's documented `data-testid` discipline (locate by
  a resilient, intentional identifier rather than CSS/structure) — the implementation-target evidence
  that pinned identity is the accepted way to make UI-addressed tests non-brittle.
- Outcomes are NOT asserted inside the screen reference; they bind to **06 scenarios by tag**. This
  honours Fowler's assertion-free rule (the screen abstraction provides access; the test owns the
  assertion) and keeps the domain rule — not the widget — as the documented behaviour, which is exactly
  what the "Testing through the UI" post asks for ("when I check my balance", not "click the balance
  button").

**Ruling:** the usual UI-coupling anti-pattern is *inapplicable* here because the reference target is a
**verified, pinned, named identity in an upstream model**, not ad-hoc UI detail — and because the
assertable behaviour stays in 06 (bound by tag), not in the screen-walk. The screen-walk is a
declarative traversal of a verified graph, which is the discipline the anti-pattern endorses, not the
brittleness it condemns. This ruling is grounded in: `cucumber-anti-patterns-part-two.md` (§"Testing
through the UI"), `fowler-page-object.md` (named-abstraction / navigation-returns-screen / assertion-
free), and `writing-better-gherkin.md` (declarative-over-imperative).

### Contradictions found and ruling

No hard contradictions among admitted sources. One **apparent** tension — "never reference the UI in
scenarios" (anti-pattern docs) versus this skill's deliberate screen-walk — is resolved by the
UI-coupling ruling above: the docs condemn *incidental* UI detail, while this skill references a
*verified, pinned* UI identity, which the same docs (and Fowler) endorse. The two are consistent once
the "incidental vs. pinned identity" distinction is drawn. Recorded so the build step does not
mistake the anti-pattern as a blanket prohibition.

---

## Exclusions (discovered but rejected)

| Material | Why discovered | Why rejected |
|---|---|---|
| `cucumber/docs` repo (`content/docs/...`) | Search surfaced it as a docs source | **Archived** (read-only), superseded by live `cucumber/website` (HEAD `0fcab8b`, 2026-06-03). Used `cucumber/website`. |
| Medium "Common Anti-patterns in automation coupled with BDD" (Atmaram Naik) | Search hit on UI-coupling | Single-author blog; the canonical UI-coupling material is in the admitted official cucumber.io part-two post. Redundant + non-authoritative. |
| thinkcode.se, TestEvolve, itsadeliverything "Declarative Gherkin" | Style blog hits | Secondary commentary; points fully covered by admitted official docs + Fowler + books. Kept the library conservative. |
| `cucumber/cucumber` wiki "Feature-Coupled Step Definitions (Antipattern)" + `martco/cucumber` fork wiki | Search hits | Content consolidated into the admitted official `anti-patterns.mdx`; the fork wiki is a non-canonical mirror. |
| Selenium / WebdriverIO / Cypress docs | Neighbours of the implementation targets | One standardised driver (WebDriver) + one representative modern framework (Playwright) are sufficient as *cite-only* implementation context. More would add no normative weight to a declarative artifact. |
| WebDriver **BiDi** separate explainer | Newest-driver search | Folded into the WebDriver L2 Working-Draft record; not separately vendored (implementation-target, cite-only). |
| `gherkin-official` (PyPI), parser forks, legacy `gherkin` npm, `gherkin-utils`/GherKing tooling | npm/GitHub neighbours | Same rationale as the 06 skill: non-canonical relative to `cucumber/gherkin@v39.1.0`. The JS parser + shared corpora are the chosen oracle. |
| `*.feature.tokens` / `*.feature.ast.json` testdata fixtures | Parser golden files | Cross-language parser-conformance fixtures, not authoring oracles. Coordinates: `cucumber/gherkin@v39.1.0:testdata/good/*.feature.{tokens,ast.json}`. |
| Page-object framework libraries (e.g. SerenityBDD screenplay, page-object gems) | Page-object literature search | The *pattern* (Fowler) is admitted as the precedent; specific framework implementations are tooling, out of scope for a source-of-truth library. |

---

## Validation / double-check log

- `@cucumber/gherkin` `latest` = **39.1.0**, published **2026-05-06T14:49:50Z**, license **MIT** —
  re-confirmed TODAY against `registry.npmjs.org/@cucumber/gherkin/latest` (did not assume any prior
  pin). Prior published versions: 39.0.0 (2026-03-01), 38.0.0 (2026-01-22), 37.0.1 (2025-12-22).
- GitHub `v39.1.0` (release 2026-05-06) confirmed newest tag via the releases/tags API; no newer
  release or pre-release as of 2026-06-04.
- `cucumber/website` default branch `main`, HEAD commit `0fcab8b`, committed **2026-06-03** — docs and
  both anti-pattern blog posts pulled from this commit. The older `cucumber/docs` repo is archived.
- W3C WebDriver: **Level 1** is the stable **Recommendation** (REC-webdriver1-20180605, 2018-06-05);
  **Level 2** latest published is a **Working Draft** (WD-webdriver2-20260528, 2026-05-28) — newest but
  not a Recommendation. Both confirmed against `w3.org/TR/` today.
- Playwright `latest` = **1.60.0**, published 2026-05-11, license **Apache-2.0** — confirmed against
  `registry.npmjs.org/playwright/latest` today.
- Sibling `gherkin` skill corpus listed (filenames only) at `../../gherkin/sources/`; its upstream
  coordinates independently re-validated here. Build step will COPY (never reference) the shared files.
