# positioning.md lint

Run this as a double pass: draft → fix → clean re-read. A finding is a defect, not a suggestion — fix it
or convert it to an explicit `OPEN:` question for the user.

## Gate 1 — Single ownership (no restating)

- [ ] No sentence is copied verbatim from `brief.md`, `product.md`, or `personas.md`. Every product fact
      is **referenced by anchor** (e.g. "brief `## Current alternative`", "the personas.md Café Owner"),
      never re-typed.
- [ ] The value proposition appears as a *messaging treatment*, not a second copy of product.md's
      one-liner. If product.md exists and you restated its value-prop sentence, that's a defect.
- [ ] No price, plan name, quota, or trial length is stated here — those are product.md's. Reference them.
- [ ] No persona block (Role, JTBD) is reproduced — name the buyer and point at personas.md.

## Gate 2 — Evidence is real (no invention)

- [ ] Every proof point is either sourced + attributed, or written `OPEN: <what to get>`. Zero
      fabricated metrics, customer names, or testimonials.
- [ ] Every differentiation claim names a real alternative/competitor and a concrete capability — not
      "we're easier/faster/better".
- [ ] Objections are ones a real buyer raises (mined or asked), not strawmen you can knock down.
- [ ] `words to use` are verbatim phrases real buyers use (mined), not invented marketing phrasing.

## Gate 3 — Faithful to the spec

- [ ] Every messaging pillar maps to a real `scope.md` feature or `product.md` in-scope capability. A
      pillar promising something not in scope is a defect — add it to scope first or cut the pillar.
- [ ] No anti-persona contradicts the brief's actual target user.
- [ ] Glossary domain nouns keep their glossary spelling; `words to avoid` includes glossary-forbidden
      synonyms.

## Gate 4 — No fluff

- [ ] No banned term from the SKILL.md **Anti-vagueness gate** (that list is the single source — don't
      maintain a divergent copy here): the fluff adjectives plus `etc.`/`various`/`synergy`/
      `leverage`(verb)/`TBD`/`TODO`.
- [ ] Every section is filled or carries an explicit `OPEN:`; no `<placeholder>` remains.

## Structure

- [ ] Eleven core sections in fixed order; the optional Stakeholder-value section is present only for a
      multi-member buying committee and deleted for a single-actor product; nothing else added or dropped.
