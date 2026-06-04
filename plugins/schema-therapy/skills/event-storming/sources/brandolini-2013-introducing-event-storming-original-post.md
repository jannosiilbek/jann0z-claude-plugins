# Introducing Event Storming (original 2013 blog post) — Alberto Brandolini

> GATHERED SOURCE — public blog post; captured content + canonical pointer stored.
> Canonical URL: http://ziobrando.blogspot.com/2013/11/introducing-event-storming.html
> Author: Alberto Brandolini (Ziobrando's Lair)
> Published: 2013-11-18
> Captured: 2026-06-04
>
> HISTORICAL/SEED status: This is the seminal post that named and first described
> the technique. Brandolini himself notes the format has evolved significantly since,
> and points readers to the "50,000 orange stickies later" talk and the book as better
> contemporary entry points. Treat as the origin-of-notation reference, NOT as the
> current authority on the grammar (the book + the 2022 Medium process-modelling
> article + the ddd-crew glossary supersede it).

## Captured summary of content

Event Storming is "a workshop format for quickly exploring complex business domains."
Described as powerful, engaging, efficient, easy to understand, and fun.

### Basic workshop steps (as of 2013)

1. Gather the right participants — 6-8 people mixing domain experts with people who ask questions.
2. Create unlimited modelling space — e.g. an IKEA paper roll on a long wall.
3. Map Domain Events on orange sticky notes arranged chronologically (left to right).
4. Identify what causes each event using colored stickies: blue for Commands, purple for external factors / things outside the system.
5. Locate Aggregates — the portions of the system that receive commands and decide which events fire.

### Optional extensions ("bonus targets")

Depending on how deep the discussion goes, the model can be expanded to explore:
- Subdomains
- Bounded Contexts
- User Personas (yellow stickies)
- Acceptance Tests
- Read Model artifacts

### Key advantage stated

The resulting behavioural model maps naturally onto Domain-Driven Design implementation,
especially Event Sourcing, letting teams "start coding almost immediately."

### Author's own caveat

"The format has evolved significantly since this seminal article" — Brandolini recommends
his "50,000 orange stickies later" presentation as a better contemporary entry point.
