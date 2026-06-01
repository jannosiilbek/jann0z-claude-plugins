# spec/copy/<channel>.md lint

Double pass: draft → fix → clean re-read. Every finding is a defect to fix or an explicit `OPEN:` marker.

## Gate 1 — Fact-faithful (the cardinal gate)

- [ ] Every factual sentence traces to an owner. For each price, capability claim, number, comparison,
      and proof point, you can name the owner: a `scope.md` feature, a `product.md` price/scope item, or a
      `positioning.md` proof/differentiator.
- [ ] **No invented price.** Any price/plan/quota/trial exactly matches `product.md`. None stated if
      product.md doesn't own it.
- [ ] **No promised capability that isn't in scope.** No roadmap-as-fact, no feature the spec lacks.
- [ ] **No fabricated proof.** Every metric, customer name, testimonial, logo is a real `positioning.md`
      proof point. Where positioning proof is `OPEN:`, copy uses the *mechanism* and leaves an
      `<!-- OPEN: needs proof point -->` marker — it does not invent a result.

## Gate 2 — On-voice

- [ ] Tone matches `positioning.md` brand voice.
- [ ] No word from positioning's **words-to-avoid** list appears.
- [ ] Mined buyer phrases (words-to-use) are used where natural; glossary domain nouns keep their spelling.

## Gate 3 — Structure & craft

- [ ] File matches the channel reference's section order and limits (char counts, sequence length, etc.).
- [ ] Alternatives are provided where the reference asks (headlines, subject lines, ad variants), each
      annotated with the angle (pillar / objection / force) it takes.
- [ ] CTAs are action + outcome — never "Submit" / "Sign up" / "Learn more" alone.

## Gate 4 — No fluff

- [ ] No banned word: `seamless`, `powerful`, `intuitive`, `robust`, `best-in-class`, `game-changing`,
      `revolutionary`, `next-generation`, `world-class`, `cutting-edge`, `unlock`, `supercharge`,
      `effortless`, `etc.`, `TBD`, `TODO`.
- [ ] Numbers over adjectives; no `<placeholder>` left.

## Scope

- [ ] Exactly one channel in this file; written to the correct `spec/copy/<channel>.md` path.
