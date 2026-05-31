# Scope-sketch lint — the intelligent gate before you write `./spec/scope.md`

Two things must hold before the artifact leaves the skill: the **tier is honestly assigned** (keyed
off definiteness + feasibility + sprawl) and the **artifact passes this lint**. Together they are the
double validation. Lint is a **double pass**: lint the draft, fix every hit, then re-read the whole
artifact once more clean and confirm zero violations. The lint runs on what you write to
`./spec/scope.md`.

This lint is **intelligent, not arithmetic**. Its job is three things — exclude AI slop, demand
defined (non-vague) structure, and confirm the thing is actually **buildable**. It does **not** gate
on raw item counts. A large but fully-justified, feasibility-validated, non-vague scope passes; a
small but inflated, vague, or infeasible one fails. The hard gate is **definiteness + feasibility +
no slop**.

Run every rule. Any fail → fix and re-run the section.

## 1. No AI slop
- [ ] No marketing adjectives (revolutionary, seamless, robust, powerful, game-changing).
- [ ] No narrative preamble, no bottom-line paragraph, no restating the idea back as prose.
- [ ] No meta-commentary or reframing essays. No hedge-stacks or filler.

## 2. Only defined structure (the anti-vagueness gate)
Every item must be concrete and handoff-ready — the next pipeline step must never have to ask a
follow-up question about it. **Vagueness, not size, is the failure.**
- [ ] No `TBD`, no "it depends", no "varies by customer", no "etc." standing in for real content.
- [ ] Each use-case atomic: one input → one output, screenable, standalone-sellable.
- [ ] Each integration line names the actual system (e.g. Stripe Billing API, Plaid `/transactions`),
  not "a payments integration", and states a reachability **verdict** — not a bare name, not a purpose.
- [ ] If a line cannot be filled without a vague placeholder, the tier is wrong — drop it and
  re-tier, never pad.

## 3. Feasibility — is it actually buildable?
- [ ] The scope ran through the **Step 3.5 feasibility pass** (web search + common knowledge,
  optionally a helper agent); the `## Feasibility check` block carries evidenced lines
  (`intent → verdict → via capability → result`).
- [ ] Every named integration / data source **exists** and is **self-serve reachable** — a real,
  available public/programmatic API/feed/webhook/export (not vaporware, deprecated, or
  partnership/enterprise/closed-beta-gated for a solo builder).
- [ ] The core capability is achievable on a vibecode stack (CRUD + auth, hosted DB, LLM/text API,
  file parse/generate, standard third-party APIs, Stripe) — **not** a research project, custom ML
  training, novel research, real-time/low-latency infra, or hardware dependency.
- [ ] Required data is accessible (public dataset, user upload, reachable API) — not proprietary with
  no access path.
- [ ] The total scope is realistic for one person in days-to-weeks, honoring the brief's Hard
  constraints — a scope that implies months is a **feasibility** fail, carve the slice tighter.
- [ ] A **🟢 tier is backed by feasibility evidence.** If any load-bearing integration or the core
  capability is infeasible (partnership/cost/research/data-gated), the tier is **not** 🟢 — re-tier.
- [ ] Any intent nothing could settle is marked `feasibility-unconfirmed` and surfaced — never a
  silent pass.

## 4. Counts are smell-tests, NOT gates
- [ ] If past ~3 integrations: re-check each item is justified, non-redundant, and
  feasibility-validated. A justified, feasible, non-vague large scope passes.
- [ ] Bloat fails only when items are redundant, unjustified, or push the scope past buildable —
  judged item by item, not by a number.

## 5. DRY-boundary contract (scope.md is a thin verdict, never a restatement)
`brief.md` is always consumed. `scope.md` references it by anchor — it never re-transcribes it, and it
never carries a fact a downstream spec file owns. See PIPELINE.md for the ownership split.
- [ ] **None of the cut sections appear.** No pricing or business-model fact; no `## Screens`; no
  `## Data model`; no `## Constraints`; no `## Out of scope for v1`; no `## Context (from brief)`;
  no standalone persona/JTBD prose block. Any of these → FAIL (the fact is owned downstream).
- [ ] **No verbatim sentence copied from `brief.md`.** A brief fact is referenced by anchor, not
  restated. A re-transcribed brief sentence → FAIL.
- [ ] **No re-derivation that contradicts the brief.** The use-cases, persona framing, and integration
  candidates trace to the brief, not re-invented against it.
- [ ] `scope.md` `## Integrations` lines are reachability **verdicts** (self-serve / partnership-gated /
  cost-gated / data-gated, + optional routing note) — not bare names and not numeric operational limits
  (those belong to `nfr.md`).

## 6. Tier honesty + artifact shape
- [ ] Tier matches **definiteness + feasibility + sprawl**: 🟢 = 3 atomic fully-defined
  feasibility-validated use-cases + ≤1 sprawl flag; 🟡 = open edges, a feasibility caveat, or moderate
  sprawl/parity; 🔴 = cannot name 3 clean use-cases, OR an infeasible load-bearing piece, OR high
  sprawl, OR vague scope.
- [ ] If 🔴: **no verdict sketch** — 3 **wedge proposals** instead. If 🟢/🟡: the verdict, **no** wedge list.

## 7. The artifact was written
- [ ] `./spec/scope.md` was actually written (created `./spec/` if missing; overwritten if it
  existed). Output is **file-only** — the lint is not satisfied by an in-chat draft.

---
If you cannot fill a section without "it depends", the tier is wrong. Drop it and re-tier — never pad.
Size may grow as long as every item is justified, feasible, and non-vague.
