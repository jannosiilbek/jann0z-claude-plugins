# Playwright — implementation-target record

> Class: **cite-only / implementation-target.** NOT normative for the flow-acceptance artifact.
> Recorded only as a representative, current browser-automation framework that a downstream step layer
> could bind the realised screen-walk to. Its locator/assertion vocabulary is illustrative of how
> screen-addressed steps become executable; it is NOT a source of Gherkin syntax or scenario style.
> Validation date: 2026-06-04.

- Title: **Playwright** (Node.js)
- Current version: **1.60.0** (npm `playwright`, validated against the registry 2026-06-04)
- Published: 2026-05-11
- License: **Apache-2.0**
- Docs: <https://playwright.dev/docs/intro>
- API / locators: <https://playwright.dev/docs/locators>
- Test assertions: <https://playwright.dev/docs/test-assertions>

## Why recorded

Playwright's **locator** model (role/text/test-id-based, stable handles to UI structure) and its
web-first **`expect`** assertions are a modern realisation of the same page-object discipline Fowler
describes: a screen/element is addressed by a *stable, meaningful identity* rather than by brittle
positional HTML. This is the executable analogue of this skill's "walk screens BY PINNED ID" rule.
The pinned screen ids come from the upstream 09 UI-flow model; a Playwright (or WebDriver) step layer
is one concrete way they get exercised. The flow-acceptance `.feature` artifact stays driver-agnostic.

## Note on `data-testid` / pinned identity

Playwright's documented recommendation to locate elements by a resilient, intentionally-assigned
identifier (e.g. `data-testid`) rather than CSS/structure is the implementation-level mirror of the
skill's pinned-screen-id contract — it is the practical reason the usual UI-coupling anti-pattern does
*not* apply when the reference target is a deliberately pinned, verified identity rather than ad-hoc
UI detail. Cite the Playwright "Locate by test id" guidance under
<https://playwright.dev/docs/locators#locate-by-test-id>.
