---
name: idea-brief
description: Turn a founder's rough idea dump into a concise, validated brief that carries both business context AND build-relevant detail (core capability, key integrations, hard constraints, thinnest first slice) so it hands straight to implementation. A high-thinking elicitation skill that interrogates vague input, refuses feature-lists and wishful thinking, tags every claim as fact vs assumption, surfaces the single riskiest assumption, dynamically verifies the most checkable claims using whatever skills/MCP tools are available, and emits a strict, lint-gated brief with no slop — refusing to emit at all when the load-bearing gates can't be met. Use whenever the user wants to "write an idea brief", "capture my startup/product idea", "turn this idea into a brief", "validate my idea before building", "make my idea implementation-ready", "what do I need to start building X", "pressure-test my business idea", "what's the riskiest assumption in my idea", "scope the business context before research", "I have a rough idea for X", "prep an idea for market/persona research", "create a product brief", or dumps a raw business idea and wants it sharpened into something rigorous and buildable. It is the head of the napkin spec pipeline and the business layer of it: idea-brief → mvp-scoping (the buildable-scope verdict) → collect-context → spec. Distinct from mvp-scoping (judges the brief into a thin buildable-scope verdict) — this skill produces the validated brief that mvp-scoping and the rest of the pipeline consume.
---

# Idea brief

Turn a founder's rough idea into a concise, validated brief that is **high-signal fuel for both
downstream research and implementation** — not a plan, not a pitch deck, not a filled-in canvas, and
not a skeptic's teardown.

The brief sits at the head of the napkin spec pipeline and also feeds optional research:

```
rough dump → [THIS SKILL] idea brief ─┬→ mvp-scoping → collect-context → gherkin → erd → build
                                      └→ (optional) market / persona / competitor / gap research
```

Everything downstream trusts this brief, so it has two jobs at once:

1. Be **honest about what is known vs guessed** — a brief full of confident-sounding guesses poisons
   every step after it.
2. Be **dense and actionable** — every line earns its place; the founder can hand it straight to
   mvp-scoping or a coding agent without re-explaining the idea.

These pull in the same direction: the way to be trustworthy *and* actionable is to be hard on vague
input during the conversation, then emit a tight, lint-clean document. The rigour lives in the
**process**; the output is a clean artifact, never an essay of caveats. Be hard on the founder — but
help them reach a sharp answer rather than just rejecting them.

## The core stance

Grounded in the discovery canon (Cagan/SVPG, Paul Graham/YC, Strategyzer + David Bland, Teresa
Torres, Rob Fitzpatrick's *Mom Test*, the Design Sprint), all of which converge on the same idea:

- **A brief is a structured set of testable hypotheses with evidence labels, not a finished plan.**
- **Desirability is load-bearing.** Nearly all failure funnels through *not making something users
  want*. Make that risk — and its evidence or absence — impossible to hide.
- **Fact vs assumption is decided by observable past behaviour.** A compliment, a prediction, "people
  would love this" — all assumptions. Only what someone actually *did* is a fact.
- **Problem space ≠ solution space.** If there is only one way to address a stated need, it is a
  solution in disguise; reframe it to the underlying need.

## The output: a tagged brief

Every field carries two tags so downstream research can trust-rank it:

- **Evidence:** `[fact]` (observable past-behaviour evidence) or `[assumption]`.
- **Provenance:** `founder-asserted` / `interview-evidenced` / `evidence-checked` / `external`.

The **riskiest assumption** is named at the top — the belief most critical to success with the least
evidence (importance × evidence). It tells the downstream research what to verify first.

The brief also carries a **Build seed**: four concrete lines (core capability · key inputs/integrations
· hard constraints · thinnest first slice) that hand the idea to mvp-scoping or a coding agent
without re-interrogating the founder. It is direction and constraint, not a spec.

See `references/brief-template.md` for the exact output format and the stable field anchors. Read it
before emitting a brief. The template is strict on purpose — it is half of the double validation (below).

## The double validation (two gates the output must clear)

A brief only leaves the skill once it passes **both** of these. This is the heart of the redesign:
all the rigour, none of the slop.

**Gate 1 — content gates (emit vs. refuse).** The skill **refuses to emit a brief** unless all three
are answered. These are the load-bearing questions; without them the brief is fiction and everything
downstream is wasted.

1. **Crisp problem** — one clear problem statement, not a feature list.
2. **Specific, reachable user** — named precisely, and you can point to real instances of them.
3. **Riskiest assumption** — explicitly identified.

If a gate cannot be met, return *what is missing and why* — not a half-brief. This is a feature: a
founder who cannot name their user has learned something important.

**Gate 2 — lint (emit vs. rewrite).** Once the content gates pass and the draft is written, run it
through `references/lint.md` as a **double pass**: lint the draft, fix every hit, then re-read the
whole brief once more clean and confirm zero violations. The lint is what keeps the output a tight,
actionable artifact instead of the sprawling caveat-essay this skill must never produce. A draft that
fails lint is not emitted — it is rewritten until clean.

On a clean pass, the brief is then **written to `./spec/brief.md`** (file-only output, see the write
step in *The flow* below); a brief that fails either gate is never written.

**Keep the blocked-response tight.** It is a prompt for the founder to answer, not an essay. Lead
with the one-line verdict (e.g. "that's a feature list, not a problem"), then for each failed gate
give: what's missing, one line on why it matters, and the single question that unblocks it. Add the
riskiest-assumption you'd flag, in one line. Stop there. Do not pre-write the brief, do not run
verification, do not enumerate every downstream concern — that work is wasted until the gates pass.
A blocked-response longer than the brief it's refusing to write is a smell.

## The field set (stage-adaptive)

First establish the stage, because the right brief shape depends on it (Cagan: a full business-model
field set is mostly irrelevant for an existing-product extension):

- **New venture** — net-new business/product; monetisation, distribution, market existence all open.
- **Existing-product extension** — a new capability on an established product; pricing/channel/cost
  already settled.

The full field set and which fields apply per stage are in `references/field-set.md`. The
always-mandatory core: problem, target user, opportunity (the underlying need), current alternative,
wedge, market & segment (vertical + SMB/mid/enterprise), why-now, riskiest assumption, **build seed**
(core capability · key inputs/integrations · hard constraints · thinnest first slice), non-goals.

## The flow

Work one question at a time. Do not dump a questionnaire — interrogate only what is missing or
vague, and explain *why* you are pushing when you push.

1. **Detect stage** — new venture vs existing-product extension; select the field set.
2. **Parse the dump** — extract everything already answerable; tag each statement `[fact]` or
   `[assumption]` (default `[assumption]` unless real past-behaviour evidence is present).
3. **Check the gates first.** Assess the three hard gates immediately. **If any gate fails, stop
   here** — interrogate the gaps (using the refusal primitives below) or, in a single-shot context,
   emit the blocked-response and stop. Do **not** run the pressure-panel or verification on input
   that can't clear the gates — verifying claims attached to a problem/user that don't exist yet
   wastes effort and tells the founder nothing. The fastest, most useful thing you can do for a thin
   dump is block cleanly and ask the right questions.
4. **(Gates pass) Elicit the build seed** — pin the four build-seed lines (core capability · key
   inputs/integrations · hard constraints · thinnest first slice). If any can only be answered with
   "it depends", that is signal — flag it as (or against) the riskiest assumption, don't pad it.
5. **(Gates pass) Expert pressure-panel** — attack the draft from independent lenses and fold
   corrections back (see Pressure-panel).
6. **(Gates pass) Dynamic light verification** — cheaply check the most decision-relevant claims
   using available capabilities (see Dynamic verification). Only now — once there's a real
   problem + user — is a claim concrete enough to be worth verifying.
7. **Lint, then write the file** — write the draft to `references/brief-template.md`'s shape, run the
   `references/lint.md` double pass (lint → fix → re-read clean). Only once it passes clean: write the
   brief to `./spec/brief.md` (relative to the current working directory; create `./spec/` if missing;
   overwrite any existing `brief.md`). Report just the path — do **not** echo the full brief into chat.
   A blocked or refused brief is **never** written to file.

The brief is the head of the napkin spec pipeline (`./spec/brief.md` → mvp-scoping → `./spec/scope.md`
→ collect-context → the spec layer). It is the **business layer**: it owns the problem, user, market,
why-now, pricing/business-model, riskiest assumption, build-seed *direction*, and Non-goals — and
every downstream file *cites* those, never restates them. The ownership split, the consume-don't-
re-derive rule, and the **exact field anchors** mvp-scoping and collect-context parse all live in
`../../PIPELINE.md` (this plugin's root). Keep the field anchors in `references/brief-template.md`
stable — downstream skills parse them.

## Refusal primitives (how to be hard on vague input)

These are the moves that turn mush into signal. Use them whenever an answer is weak.

- **De-feature the problem** (Cagan). The most common failure is a founder answering "what problem?"
  with a list of features. Reject it: *"That's a feature. In one sentence — what problem does it
  solve, for whom?"* The problem field is the hardest and most-failed; do not let it slide.

- **Disguised-solution test** (Torres). For any stated need, ask: *"Is there more than one way to
  address this?"* If no, it is a solution masquerading as a problem — push with *"why do they want
  that?"* until you reach a real need. ("I want to go out to eat" is a solution; "I have no time to
  cook" is the need.)

- **Mom-Test filter** (Fitzpatrick). Compliments, hypotheticals, and predictions are not evidence.
  *"People would love this"* / *"I think the market is huge"* → record as `[assumption]`, never
  `[fact]`. Ask instead about concrete past behaviour: *"Who has this problem today, and what have
  you watched them actually do about it?"* Only the answer to that can earn a `[fact]`.

- **Refuse false precision.** "$4.2B TAM" sourced from nothing is worse than "order-of-magnitude
  unknown, assumption." Down-rank confident numbers with no source to `[assumption]`.

## Pressure-panel (agentic)

Before emitting, stress-test the draft from independent perspectives. If subagents are available,
spawn a small panel in parallel; otherwise reason through each lens yourself. Fold the findings back
into the brief (usually by re-tagging optimistic `[fact]`s to `[assumption]`, or sharpening the
riskiest assumption).

- **Skeptic** — what is the riskiest *unstated* assumption? Is the named riskiest assumption really
  the one that kills this if wrong?
- **Market realist** — is the segment real and reachable? Is "SMB vs enterprise" coherent with the
  problem, price, and buyer? A €20/mo tool sold to enterprise procurement is a contradiction.
- **Customer-truth** — which `[fact]`s are actually compliments or founder optimism wearing a fact's
  clothing? Demote them.

Keep it proportional — a few sharp lenses, not a committee.

## Dynamic verification (capability-discovering — nothing hardcoded)

Some assumptions need not stay assumptions. Cheaply check the **2–4 most decision-relevant** claims
(riskiest + cheapest to check) using **whatever capabilities this environment actually offers** — do
not hardcode a tool list, because the toolbox changes and a hardcoded skill rots.

Full method in `references/dynamic-verification.md`. The essence:

1. **Discover at runtime** — inventory available skills, connected MCP tools, and built-ins (web
   search, browser, fetch). Use what is present.
2. **Express checks as intent, not tool** — e.g. *does this buyer population exist and is it
   reachable?* · *do people voice this pain in their own words?* · *who already serves this / how
   crowded?* · *will buyers pay / do they have budget?* · *is there demand volume?*
3. **Bind intent → capability by purpose** — match each intent to the best available capability for
   what it does, not its name (a people/professional-lookup capability serves "buyer exists" whether
   it is a LinkedIn-style skill, an MCP tool, or a browser lookup). Prefer specific skills/MCP tools;
   fall back to web search / browser; if nothing fits, leave the claim `[assumption]` and say so.
4. **Run, re-tag, propose** — re-tag each checked field `evidence-checked` / `still assumption` /
   `contradicted`, with provenance = which capability produced it. Surface a **contradicted
   gate-field loudly** (e.g. the named user does not exist at scale; the market is already
   saturated) — that is the highest-value output the skill can produce. The founder confirms before
   any promotion to `[fact]`; never silently upgrade a claim.

## Anti-patterns (what this skill must not become)

- A Lean Canvas with the serial numbers filed off. Generic canvas fields are low-signal; the value
  is in the fact/assumption tagging and the riskiest-assumption surfacing.
- A polite scribe that records whatever the founder says as truth. If you never demoted a claim to
  `[assumption]` or pushed back on a feature-list, you did it wrong.
- A questionnaire dump. One question at a time, only what's missing, always with the *why*.
- A success-metrics-at-seed-stage fantasy. 6–12-month KPIs are fiction this early; don't ask for
  them — they invite exactly the vague slop the skill exists to filter out.
- **A caveat-essay.** The output is a tight document, not a teardown. Reframing notes, "bottom line"
  paragraphs, hedge-stacked parentheticals, and a verification log that runs longer than the brief
  are all lint failures. The rigour belongs in the *process*; the artifact stays clean and dense.
- A spec in disguise. The build seed is four constrained lines, not screens or a data model — that is
  mvp-scoping's job. Over-filling it is sprawl, not thoroughness.
