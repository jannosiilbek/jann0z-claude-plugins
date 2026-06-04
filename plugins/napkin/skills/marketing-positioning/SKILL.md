---
name: marketing-positioning
description: Use when authoring or reviewing the spec/positioning.md artifact — the sell-branch foundation of the napkin pipeline. Turns a validated brief + scope (and product/personas if present) into the persuasion layer every marketing asset reads: positioning statement, category, messaging pillars, differentiation, objections, anti-personas, JTBD switching forces, customer language (words to use/avoid), brand voice, and proof points. Use whenever the user wants to "write positioning", "nail the messaging", "what's our angle", "define the value prop for marketing", "set up the marketing foundation", "how do we talk about this", "what objections do we face", "find the customer language", "prep before writing copy", or wants a single source of truth for how the product is sold before generating landing/email/ad/social/launch copy. It is the first step of the napkin SELL branch (forks after mvp-scoping): marketing-positioning → spec/positioning.md → marketing-copy. Distinct from context-product (owns the neutral value prop, pricing, scope) — this skill owns the *persuasion treatment* of those facts and never restates them.
---

# Sell foundation: positioning.md

`positioning.md` is the **single source of truth for how the product is sold** — the persuasion layer
that every channel in `spec/copy/` reads before writing a word. It is to marketing copy what
`glossary.md` is to the spec: the canonical source the downstream assets must stay faithful to.

It is the first artifact of the napkin **sell branch**, which forks after `mvp-scoping` (see
`../../PIPELINE.md`). Its job is to settle the *message* once, so that landing pages, emails, ads,
social posts, and launch announcements all say the same true thing in the same voice — instead of each
asset re-inventing the angle and drifting.

It owns the message and **only** the message. It does NOT own product facts: the problem, target user,
wedge, and current alternative are `brief.md`'s; the value proposition, pricing, in-scope features, and
success metric are `product.md`'s; persona identity is `personas.md`'s. positioning.md **references each
by anchor and adds only what no other file owns.**

## Input

Read whatever the spec already has — the branch runs straight after scope, so context may be partial:

- **`spec/brief.md`** (always present) — `## Problem`, `## Target user`, `## Current alternative`,
  `## Wedge`, `## Opportunity (the need)`, `## Why now`. These are the raw material for differentiation
  and switching forces. Reference them; never copy the sentences in.
- **`spec/scope.md`** (always present after mvp-scoping) — the feature list. A messaging pillar may only
  promise a capability that is a scope feature.
- **`spec/product.md`** (if the build branch has run) — value proposition, pricing, in/out-of-scope,
  success metric. When present it is authoritative for the value prop and pricing; positioning derives
  its messaging *treatment* from it. When absent, derive provisionally from the brief and mark anything
  you'd otherwise pull from product.md with `OPEN:`.
- **`spec/personas.md`** (if present) — the buyer the message targets. When present, target a named
  buyer persona by reference. When absent, identify the buyer from the brief's `## Target user`.

**Mine real evidence — don't invent it.** Positioning fails when it's written from imagination. Before
asserting differentiation, objections, customer language, or proof, gather signal using whatever skills
and MCP tools are available at runtime (no hard dependency — discover them):

- **Competitive landscape / differentiation** → a competitor-research / competitor-profiling capability.
- **Customer language, objections, switching forces** → community-search skills (reddit / X / HN /
  Product Hunt search) — mine the *verbatim* words real buyers use for the problem and the alternatives.
- **Demand framing** → a market-fit / demand-validation capability.

Pull quotes and competitor facts from these; attribute them. What you cannot source, mark `OPEN:` and
ask — never fabricate a metric, a testimonial, or a competitor weakness.

## Output

Copy `assets/positioning-template.md` verbatim and fill it. Eleven core sections in fixed order, plus one
**optional** Stakeholder-value section — include it only for a multi-member buying committee (per
`personas.md`), delete it for a single-actor / self-serve product. Do not add other sections. See
`assets/positioning-example.md`. Run `references/lint.md` before declaring it done.

## Rules

1. **Reference, never restate.** The value-prop sentence, a price, the problem statement, a persona
   block — cite the owner (`product.md` value prop, `brief.md ## Problem`, the `personas.md` buyer),
   don't re-type it. If you find yourself copying a sentence from another spec file, stop: positioning
   adds the *angle*, not a second copy of the fact.
2. **Customer language is the ubiquitous voice.** The `words to use / words to avoid` list is binding on
   every downstream asset. Fill `words to use` with the **verbatim** phrases real buyers use (mined, not
   guessed); fill `words to avoid` with insider jargon, the competitor's framing, and any term the
   glossary forbids. A glossary domain noun keeps its glossary spelling here too.
3. **Differentiation is against a named alternative.** Differentiate against the brief's
   `## Current alternative` (and real named competitors), stating what *this* product does that they
   don't — a concrete capability or outcome, not "we're easier". The brief's `## Wedge` is the sharpest
   differentiator; lead with it.
4. **Objections are real and answered.** List the top 3–5 objections a buyer actually raises (mined or
   asked), each with a one-line response grounded in a real capability or proof point. No strawmen.
5. **Proof is real or `OPEN:`.** Every metric, named customer, testimonial, and guarantee is either
   sourced (attribute it) or written `OPEN: <what to get>`. A fabricated proof point becomes a false
   claim in copy and a legal risk. When there is no proof yet, say so — early-stage positioning leads
   with the mechanism, not invented numbers.
6. **Switching forces use the four-forces frame.** Push (what makes the status quo painful), Pull (what
   attracts them to this), Habit (inertia keeping them put), Anxiety (what they fear about switching).
   Each is one concrete sentence tied to the real buyer, not theory.
7. **No marketing fluff.** Ban "seamless", "powerful", "intuitive", "best-in-class", "robust",
   "revolutionary", "game-changing". Persuasion is specific outcomes + real proof, not adjectives. (Same
   ban as `product.md` — it holds across the whole sell branch.)
8. **No invention of product facts.** Don't promise a feature not in `scope.md` / `product.md` in-scope,
   don't state a price `product.md` doesn't own, don't invent a customer. Add the fact to its owner
   first, or mark `OPEN:`.

## Downstream-purpose map

- **Positioning statement + category** → the page's framing and the headline angle in `copy/landing.md`.
- **Messaging pillars** → the body sections and the email/social themes; each pillar becomes copy.
- **Differentiation + before→after** → comparison copy, the "why us" section, ad angles.
- **Objections + responses** → FAQ, objection-handling sections, sales-y email beats, ad rebuttals.
- **Anti-personas** → negative targeting and disqualifying copy (who to *repel*).
- **Switching forces** → the persuasion arc of a landing page and a nurture sequence.
- **Customer language (use/avoid)** → the binding vocabulary for all `copy/` — reused verbatim.
- **Brand voice** → the tone every channel writes in.
- **Proof points** → social-proof sections, ad trust signals, testimonial blocks.

If a line serves none of these, cut it.

## Anti-vagueness gate

Banned: `etc.`, `and so on`, `various`, `as needed`, `synergy`, `leverage` (as a verb), `seamless`,
`powerful`, `intuitive`, `robust`, `best-in-class`, `game-changing`, `revolutionary`, `next-generation`,
`world-class`, `cutting-edge`, `TBD`, `TODO`. Every differentiator names a concrete capability or
outcome; every proof point is a number, a name, or a quote (or `OPEN:`); every customer-language entry
is a phrase you could quote.

## Self-check before done

- [ ] Eleven core sections in fixed order; the optional Stakeholder-value section appears only for a real
      multi-member committee and is deleted otherwise; nothing else added.
- [ ] No sentence copied verbatim from brief.md / product.md / personas.md — all referenced by anchor.
- [ ] Differentiation covers do-nothing / adjacent / direct (each concrete or `OPEN:`); trial is
      *referenced* to product.md, not restated; any guarantee is positioning-owned (concrete or `OPEN:`).
- [ ] Every messaging pillar maps to a real `scope.md` feature or `product.md` in-scope capability.
- [ ] Differentiation is against a named alternative/competitor, stated as a concrete capability.
- [ ] `words to use` are mined verbatim buyer phrases; `words to avoid` includes glossary-forbidden terms.
- [ ] Every proof point is sourced and attributed, or written `OPEN:`.
- [ ] No banned phrase; no fabricated metric/testimonial/competitor weakness; no `<placeholder>` left.

## Related skills (the napkin pipeline)

- **mvp-scoping** — the producer of this skill's input (`spec/scope.md`); the sell branch forks from it.
- **marketing-copy** — the consumer of this skill's output; reads `positioning.md` as its foundation and
  renders channel copy (landing / email / ads / social / launch), reusing the voice and customer-language
  verbatim.
- **context-product / context-personas** — when the build branch has run, they own the value prop /
  pricing / scope and the buyer persona that this skill references by anchor.
- Any **competitor-research**, **market-fit-validator**, or **community-search** (reddit / X / HN /
  Product Hunt) capability — discovered at runtime to mine real differentiation, objections, customer
  language, and proof; no hardcoded dependency.
