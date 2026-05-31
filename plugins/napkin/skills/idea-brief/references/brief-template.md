# Brief output template

A brief only leaves the skill once it clears the **double validation** defined in SKILL.md — the three
content gates (emit vs. refuse) and the `references/lint.md` pass (emit vs. rewrite). This file gives
the exact output shape the lint checks against.

## Altitude — what this brief is and is not

The brief is the head of the napkin spec pipeline (mvp-scoping → collect-context → spec → build) and
also the seed for optional research (market / persona / competitor / gap). So it carries enough
build-relevant fact that the next step never has to re-interrogate the founder.

It is **not** the spec. Screens, data models, and feature lists are owned downstream (capability-map,
the ERD, gherkin), not here. The "Build seed" block is four lines of *constraints and direction*, not
a design.

On a clean lint pass the brief is written to `./spec/brief.md` (overwrite if present); that file is
what mvp-scoping and collect-context read. Keep every field heading below verbatim — they are the
stable anchors those skills parse (`## Problem`, `## Target user`, `## Build seed — what implementation
needs to know`, `## Non-goals`, etc.; the full anchor list is the "Brief field anchors" subsection in
`../../PIPELINE.md`).

## Drafting rules (the lint enforces these — write to them from the first draft)

- **One concrete, non-vague claim per field** — the kind a builder could act on without a follow-up
  question. No word-count cap; **density and definiteness are the bar, not length.** Every claim line
  ends with `[fact|assumption]` and a provenance word.
- A field is a lint failure when it is **vague, not when it is long.** `TBD`, "it depends", "varies by
  customer", or anything a downstream reader would have to ask about = fail.
- No meta-commentary, no `Note:`, no `Reframe:`, no "bottom line" paragraph, no reframing essays.
- No marketing adjectives (revolutionary, seamless, robust, powerful, game-changing).
- Verification log: one concrete checked claim per line in the fixed format below; no arbitrary
  line cap (a long but non-redundant log passes; a padded one does not).
- The tags and the riskiest-assumption line carry the signal. Do not narrate them in prose.

Provenance values: `founder-asserted` (they said it) · `interview-evidenced` (a concrete
past-behaviour account) · `evidence-checked` (verified via a capability — name it) · `external`
(a cited source).

## The brief (emit in exactly this shape)

```markdown
# Idea brief — <idea name — short, concrete>

**Stage:** new venture | existing-product extension
**Riskiest assumption:** <one sentence> · <desirability|viability|feasibility> · if wrong: <one clause>

## Problem
<one sentence>  `[fact|assumption]` · <provenance>

## Target user
<buyer; user if different — specific + reachable>  `[fact|assumption]` · <provenance>

## Opportunity (the need)
<unmet need; passes "more than one way to address this">  `[fact|assumption]` · <provenance>

## Current alternative
<what they do today instead>  `[fact|assumption]` · <provenance>

## Wedge
<the narrow first use-case>  `[fact|assumption]` · <provenance>

## Market & segment
<vertical(s) + SMB/mid/enterprise>  `[fact|assumption]` · <provenance>

## Why now
<researchable trigger>  `[fact|assumption]` · <provenance>

<!-- new venture only -->
## Business model
<who pays, rough price, monetisation>  `[fact|assumption]` · <provenance>

## Market size / reachability
<order-of-magnitude>  `[fact|assumption]` · <provenance>
<!-- /new venture only -->

## Build seed — what implementation needs to know
- **Core capability:** <the one thing v1 must do>  `[fact|assumption]` · <provenance>
- **Key inputs / integrations:** <data sources, APIs, systems v1 depends on>  `[fact|assumption]` · <provenance>
- **Hard constraints:** <non-negotiables: data residency, determinism, offline, latency, language>  `[fact|assumption]` · <provenance>
- **Thinnest first slice:** <smallest shippable cut that delivers the core capability>  `[fact|assumption]` · <provenance>

## Non-goals
- <firm exclusion>
- <firm exclusion>

## Open assumptions to verify (for downstream research)
1. <assumption> — check: <intent, e.g. "does this buyer exist at scale?">
2. <assumption> — check: <intent>

## Verification log
- <claim> → <evidence-checked | contradicted | still assumption> via <capability> — <result, ≤12 words>
```

## Blocked-response (a content gate failed — do NOT emit the brief)

Lead with the one-line verdict, then one line per failed gate. Stop there — no pre-written brief, no
verification. A blocked-response longer than the brief it refuses is itself a lint failure.

```markdown
# Brief blocked — missing load-bearing input

<one-line verdict, e.g. "that's a feature list, not a problem">
- **<gate>** — missing: <what> · matters: <why, one clause> · answer: <the single question that unblocks it>
```
