---
name: marketing-copy
description: Use when generating marketing copy for a product that has a napkin spec — the second step of the napkin SELL branch (forks after mvp-scoping). Reads spec/positioning.md (plus brief/scope/product/personas) and writes fact-faithful, on-voice copy to spec/copy/<channel>.md for one channel per invocation. Channel modes — landing (homepage / landing-page copy), email (sequences: welcome, nurture, launch, re-engagement), ads (Google / Meta / LinkedIn / X paid copy), social (LinkedIn / X / Instagram organic posts & threads), launch (Product Hunt / HN / announcement assets). IMPORTANT — "copy" here means marketing/sales text written to a spec artifact, NOT application source code; this skill never edits app code. Use whenever the user wants to "write the landing page", "write marketing copy", "draft the homepage copy", "write a welcome email sequence", "write a cold email", "write ad copy", "write Google ads", "write LinkedIn posts", "draft launch tweets", "write the Product Hunt launch", "generate the hero section", "write CTAs", "write copy after scoping", or generate any go-to-market text from the spec. Pairs with marketing-positioning, which it reads as its foundation — run that first; this skill refuses to invent the angle.
---

# Marketing copy: spec/copy/<channel>.md

This skill renders **on-voice, fact-faithful marketing copy** from the spec. It is the payoff of the
napkin sell branch: once `positioning.md` settles the message, this skill turns it into the actual words
for a specific channel — and writes them to `spec/copy/<channel>.md` so the copy lives on the spec like
every other artifact, under the same single-ownership discipline (see `../../PIPELINE.md`).

Its discipline is simple and strict: **say only what the spec owns, in the voice positioning.md
mandates.** No invented metric, price, feature, or testimonial. Persuasion comes from real outcomes and
real proof, arranged well — not from making things up.

## Pick exactly one channel per invocation

Decide the moment you start. Each channel writes one file and reads one reference:

| Channel | Writes | Reference | Use when the user wants… |
|---------|--------|-----------|--------------------------|
| `landing` | `spec/copy/landing.md` | `references/landing.md` | homepage / landing-page copy, hero, sections, CTAs |
| `email`   | `spec/copy/email.md`   | `references/email.md`   | a sequence (welcome / nurture / launch / re-engagement) or a single email |
| `ads`     | `spec/copy/ads.md`     | `references/ads.md`     | paid ad copy for Google / Meta / LinkedIn / X |
| `social`  | `spec/copy/social.md`  | `references/social.md`  | organic posts / threads for LinkedIn / X / Instagram |
| `launch`  | `spec/copy/launch.md`  | `references/launch.md`  | a launch kit (Product Hunt, HN, announcement email + posts) |

If the user names several channels, do the one they emphasized first, write it, then offer the next —
one file per invocation keeps each tight and reviewable. **`launch` reads best last:** its reference tells
it to *reference, don't rewrite* the landing/email/social copy, so write those channels first when a full
launch kit is the goal. Read the matching reference file in full before writing; it carries the per-channel
structure, formulas, and limits.

## Inputs (read before writing)

1. **`spec/positioning.md`** — **required foundation.** Pull the positioning statement, the messaging
   pillars (these become your sections/emails/posts), differentiation, objections, switching forces,
   proof points, the before→after, and — binding — the **brand voice** and **customer language (words to
   use / words to avoid)**. If `positioning.md` does not exist, stop and run `marketing-positioning`
   first; do not invent the angle here.
2. **`spec/product.md`** (if present) — the only source of a price, plan name, quota, or trial length you
   may state, and the in-scope boundary for what you may promise.
3. **`spec/scope.md`** — the feature list; a benefit may only reference a real feature.
4. **`spec/brief.md`** — problem, target user, wedge for framing (reference, don't restate).
5. **`spec/personas.md`** (if present) — the buyer/channel you're writing *to*; if buyers carry a
   `Reached via` field, let it steer channel choice and tone.

## How to write

1. **Adopt the voice first.** Before drafting, internalize `positioning.md` brand voice and the
   words-to-use / words-to-avoid lists. They are binding the way `glossary.md` is binding for the spec —
   a word on the avoid-list must not appear; mined buyer phrases should.
2. **Source every claim.** Each concrete statement — a benefit, a number, a comparison, a proof point —
   must trace to an owner: a `scope.md` feature, a `product.md` price/scope item, or a `positioning.md`
   proof point / differentiator. As you draft, you should be able to point at the owner for every factual
   sentence. If you can't, it's invention — cut it or mark `OPEN:` and ask.
3. **Let the structure come from the reference.** Each channel reference gives the section order,
   headline/subject formulas, and limits. Follow it; don't free-form.
4. **Render alternatives where the reference asks** (e.g. 2–3 headline options, 3 subject lines) so the
   user can choose — each annotated with the angle it takes (which pillar / objection / switching force).
5. **Delegate the artifact when a better tool exists.** For `landing`, if a `landing-page` capability is
   available at runtime, hand it the finished copy to scaffold the actual page — this skill owns the
   *words*, that skill owns the *page*. Don't reimplement page-building here.
6. **Write the file, then show it.** Save to `spec/copy/<channel>.md` using the reference's output
   structure, run `references/lint.md`, then show the user the copy and offer the next channel.

## The cardinal rule — fact-faithful copy

Marketing copy is where invention is most tempting and most dangerous (a fabricated "10,000 teams trust
us" is a lie that ships). So:

- **A price appears only if `product.md` owns it.** Never round, never invent a "from $X".
- **A capability is promised only if it is `scope.md` / `product.md` in-scope.** No roadmap-as-fact.
- **A metric, customer name, or testimonial appears only if `positioning.md` owns it as proof.** If
  proof is `OPEN:` in positioning, the copy uses the *mechanism* ("see cost before you publish"), not an
  invented result ("cut labor 20%"). Leave a `<!-- OPEN: needs proof point -->` marker where a number
  would strengthen it, so the user knows what to collect.
- **Words-to-avoid never appear; banned fluff never appears.**

## Anti-vagueness gate

Banned (same spine as the rest of the pipeline): `seamless`, `powerful`, `intuitive`, `robust`,
`best-in-class`, `game-changing`, `revolutionary`, `next-generation`, `world-class`, `cutting-edge`,
`unlock`, `supercharge`, `effortless`, `etc.`, `TBD`, `TODO`. CTAs are action + outcome ("Start my free
trial", not "Submit"). Numbers over adjectives.

## Self-check before done

- [ ] Exactly one channel; written to `spec/copy/<channel>.md`; structure matches the channel reference.
- [ ] Every factual sentence traces to an owner (scope feature / product price-or-scope / positioning proof).
- [ ] No price, capability, metric, customer, or testimonial that no spec file owns. Proof gaps marked `OPEN:`.
- [ ] Voice matches `positioning.md`; no word from the avoid-list; mined buyer phrases used where natural.
- [ ] No banned fluff; CTAs are action + outcome; alternatives annotated with their angle.

## Related skills (the napkin pipeline)

- **marketing-positioning** — the producer of this skill's foundation (`spec/positioning.md`). Run it first.
- **mvp-scoping** — where the sell branch forks; produces `spec/scope.md` (the features copy may promise).
- **context-product / context-personas** — own the price/scope and the buyer this copy is written to.
- A **landing-page** capability — discovered at runtime to scaffold the actual page from `landing` copy.
- Community-search (reddit / X / HN) — discovered at runtime if you need more verbatim buyer phrasing
  than `positioning.md` captured; no hardcoded dependency.
