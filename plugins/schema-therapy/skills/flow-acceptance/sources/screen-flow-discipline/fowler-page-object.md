# Page Object (Martin Fowler — bliki)

> Provenance notes. Source: <https://martinfowler.com/bliki/PageObject.html>
> Author: Martin Fowler. Published: 10 September 2013. Tags: testing, encapsulation, web development.
> Class: **gatherable (notes)** — the bliki is © Martin Fowler, all rights reserved; this is a
> faithful structured summary retained for grounding, not a verbatim republication. Cite the URL as the
> authority. Validation date: 2026-06-04.
>
> RELEVANCE TO flow-acceptance: this is the canonical pattern admitted as the precedent for
> **screen-addressed steps** — steps that reference a screen (by its pinned id, from the 09 UI-flow
> model) as a named, stable abstraction rather than ad-hoc widget/HTML detail. The page object's
> defining moves map one-to-one onto this skill's discipline:
> - a screen is a *named application-specific abstraction* over UI structure (← "wraps an HTML page with an application-specific API");
> - the abstraction is addressed by a *stable identity*, not by incidental layout (← "model the structure that makes sense to the user");
> - *navigation returns another screen* (← "navigation methods return another page object") — exactly the screen→screen edges of the 09 UI-flow graph;
> - outcomes are asserted by the *test/scenario*, not buried in the screen reference (← "page objects should not make assertions") — outcomes bind to 06 scenarios by tag, kept out of the screen-walk itself.

## Core definition

A page object wraps an HTML page (or fragment) behind an **application-specific API**, so that a
test can manipulate page elements without digging around in the HTML. The abstraction hides the
underlying widgets/markup and exposes meaningful operations.

## Fundamental principle

> A page object should allow a software client to **do anything and see anything that a human can.**

It should also hide the underlying HTML: accessors return appropriate types (strings for text
fields, booleans for checkboxes, action-oriented methods for buttons). A change to the underlying UI
controls should not change the page object's public interface.

## Granularity and composition

Despite the name, a page object need not map 1:1 to a page. It should model **the structure in the
page that makes sense to the user of the application**. A complex page may be represented by *several*
page objects (e.g. an album-list object, per-album objects, header and footer objects). Structure
that exists purely for UI organisation, and means nothing to the user, should not be exposed.

## Navigation between pages

When an interaction navigates to another page, the method should **return another page object** for
the destination. In general, page-object methods return either fundamental types (strings, dates) or
other page objects.

## Assertions — the critical distinction

Page objects **should not make assertions themselves.** Assertions are the responsibility of the test
client; the page object only provides access to page state. Mixing them duplicates logic and blurs
responsibilities.

> Exception: a single assertion that you are on the *expected* page (a page invariant / "TestAndExit"
> style check) is acceptable even under the assertion-free rule.

## Applicability beyond web

Though it arose for HTML, the pattern applies to **any UI technology** (desktop, mobile, etc.). Page
objects were originally described as the **Window Driver** pattern; page objects are often used with,
but are distinct from, window drivers.

## Relationship to other patterns

When presentation-layer patterns (Presentation Model, Passive View, Supervising Controller) move
logic out of the UI, the need to test *through* the UI — and therefore the need for page objects —
diminishes. This is the same force the cucumber.io "Testing through the UI" anti-pattern names.
