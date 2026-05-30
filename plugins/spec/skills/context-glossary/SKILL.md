---
name: context-glossary
description: Use when authoring or reviewing the spec/glossary.md context artifact — the ubiquitous-language term list that seeds Gherkin scenarios and ERD entity names. Enforces one-concept-one-word, single ownership of every domain term and enum, forbidden-synonym tracking, and zero vague text.
---

# Context: glossary.md

`glossary.md` is the **single source of truth for domain vocabulary**. Every domain noun
and every enumerated value used anywhere in the spec — in `product.md`, `personas.md`,
`rbac-matrix.md`, `nfr.md`, `capability-map.md`, the Gherkin `.feature`
files, and the ERD — is defined here exactly once and reused verbatim. This file is the
alignment backbone: it exists so the other artifacts cannot drift.

## Output

Copy `assets/glossary-template.md` verbatim and fill it. Two tables only: **Terms** and
**Enumerations**. Do not add prose sections, rationale, or a "candidate ERD" essay — the
tables are the deliverable. See `assets/glossary-example.md`.

## Rules

1. **One concept = one word.** Each concept gets exactly one canonical term. If a synonym
   is tempting (Location/Venue, Role/Job-Role/Position, Cancel/Cancelled), pick one and
   list the rest in **Forbidden synonyms** so the alignment pass can reject drift.
2. **One sentence per definition.** No multi-paragraph entries, no examples inside the
   definition, no "(optional)" hedging.
3. **Enums live here, once.** Statuses and value sets (subscription status, schedule
   status, request status…) are defined ONLY in the Enumerations table, with the exact
   canonical values. No other file may restate or alter an enum's values.
4. **Type every term** — one of `Entity`, `Value`, `Enum`, `Role`, `Action`.
5. **Flag ERD entities.** In **Maps to**, write `ERD: <EntityName>` for terms that become
   tables; leave blank for pure language. Use one canonical casing for entity names.
6. **Completeness.** Every domain noun used in any other artifact MUST appear here. A term
   used elsewhere but missing here is an alignment failure.
7. **No invention.** If a term's meaning is genuinely undecided, do not guess — stop and
   ask. A guessed definition that later changes corrupts every downstream artifact.

## Downstream-purpose map (every row must serve at least one)

- **Term + Definition** → ubiquitous language for Gherkin steps; the words scenarios use.
- **Forbidden synonyms** → the alignment pass's drift check; the linter for the whole suite.
- **Type + Maps to** → ERD entity/attribute names and which terms become tables.
- **Enumerations** → `Given <X> in state <value>` preconditions and ERD enum columns.

If a row serves none of these, delete it.

## Anti-vagueness gate

Banned anywhere in the file: `etc.`, `and so on`, `various`, `e.g.` chains standing in for
a definition, `robust`, `user-friendly`, `as appropriate`, `as needed`, `flexible`,
`TBD`, `TODO`, trailing `…`. Every definition is a complete, concrete sentence.

## Self-check before done

- [ ] Exactly two tables; no extra sections.
- [ ] Every term: one canonical spelling, one-sentence definition, a Type.
- [ ] Every likely-confused term has Forbidden synonyms filled.
- [ ] Every enum and its values appear here and nowhere else.
- [ ] No banned phrase; no `<placeholder>` left.
