# Martin Fowler bliki — Ubiquitous Language & Bounded Context (structured notes)

These two bliki entries are © Martin Fowler. They carry no open license, so the
full text is **not** stored here. This file records the canonical URLs, exact
publication dates, and short verbatim quotations (fair use) of the load-bearing
sentences, plus structured notes. Read the originals at the URLs below for full text.

---

## Ubiquitous Language

- Canonical URL: <https://martinfowler.com/bliki/UbiquitousLanguage.html>
- Author: Martin Fowler
- Publication date (as shown on page): 31 October 2006
- Tag: Domain Driven Design
- License: © Martin Fowler — all rights reserved (cite-only / quote as fair use)

Verbatim opening definition (quoted):

> "Ubiquitous Language is the term Eric Evans uses in Domain Driven Design for the
> practice of building up a common, rigorous language between developers and users."

Key verbatim sentences (quoted):

> "This language should be based on the Domain Model used in the software - hence the
> need for it to be rigorous, since software doesn't cope well with ambiguity."

> "Evans makes clear that using the ubiquitous language in conversations with domain
> experts is an important part of testing it, and hence the domain model."

> "He also stresses that the language (and model) should evolve as the team's
> understanding of the domain grows."

Notes:
- Fowler explicitly frames Ubiquitous Language as Evans's term — Fowler is secondary
  to Evans on the definition itself.
- The article's distinctive contribution is the *rigour* framing ("software doesn't
  cope well with ambiguity") and the *testability* framing (you validate the language,
  and therefore the model, by speaking it with domain experts).
- Fowler endorses pervasive use ("using the model-based language pervasively and not
  being satisfied until it flows").

---

## Bounded Context

- Canonical URL: <https://martinfowler.com/bliki/BoundedContext.html>
- Author: Martin Fowler
- Publication date (as shown on page): 15 January 2014
- License: © Martin Fowler — all rights reserved (cite-only / quote as fair use)

Verbatim opening definition (quoted):

> "Bounded Context is a central pattern in Domain-Driven Design. It is the focus of
> DDD's strategic design section which is all about dealing with large models and teams."

Verbatim sentence linking model to language (quoted):

> "A model acts as a UbiquitousLanguage to help communication between software
> developers and domain experts."

Notes (relevant to a glossary skill):
- A Bounded Context is the scope within which a single Ubiquitous Language / glossary
  is internally consistent. The same word may mean different things in different
  bounded contexts (polysemy / homonyms), and translation happens at the boundary.
- This is the authority for *why* a glossary must declare its bounded context and why
  one term = one meaning holds only **within** a context, not globally.
- Related Fowler entry on homonyms/polysemes: TypeInstanceHomonym
  <https://martinfowler.com/bliki/TypeInstanceHomonym.html> (noted, not gathered —
  tangential to a glossary's one-concept-one-word rule).
