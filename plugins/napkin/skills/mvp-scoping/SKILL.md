---
name: mvp-scoping
description: The second step of the napkin spec pipeline. Reads the validated `spec/brief.md` and curates the MVP **scope** as a consistently-templated list of features in `spec/scope.md`. IMPORTANT — here a "feature" means an item in the product's MVP scope (a row in the `spec/scope.md` plan), NOT a code change to a running app; this skill never writes or edits application source code, it only writes the scope/feature-list spec artifact. Runs in two phases. PHASE 1 (scope) — derive the candidate feature list from the brief, feasibility-check each, write the list, then STOP and show it. PHASE 2 (curate) — work the list one feature at a time (add, remove, refine, or split a scoped feature); every edit is surgical (one edit) in the exact same strict template — an `### F<n> · name` block with three fixed fields, Persona, In → Out, Feasibility — so the list stays perfectly consistent. Use whenever the user wants to "scope an MVP", "scope this idea", "spec this idea out", "list the MVP features", "what features should v1 have", "add a feature to the scope", "add a scoped feature for X", "remove this feature from the scope", "drop feature F3", "refine feature F2", "split feature F1", "what should I cut from the scope", "what features am I missing", "trim the scope", "is this scope too broad to build", or "narrow this idea down to a buildable feature set". Pick the right neighbor instead when the ask is really: writing the brief itself / problem / user / wedge / business model (that is idea-brief, the producer of this skill's input); judging tech complexity, domain availability, or Stripe-compatibility (buildability-check); writing Gherkin or `.feature` behavior files (gherkin); building the capability-map, personas, RBAC, or glossary (collect-context); the data model / ERD / DBML (erd-modeler); or validating demand, market size, or distribution (market-fit-validator). It is also NOT ordinary app coding — "add a dark-mode feature to my Next.js app", "remove the unused import in F3.tsx", or any edit to real source files are normal code tasks, not this skill. It consumes the brief's business facts (never restating them) and produces only the scoped feature list that collect-context and the rest of the pipeline read; it carries no pricing, screens, data model, or any fact a downstream spec file owns.
allowed-tools: Bash, Read, Write, Edit, Skill
argument-hint: "scope | add <feature> | remove F<n> | refine F<n> | split F<n> | what to cut?   (reads spec/brief.md, writes spec/scope.md)"
---

# mvp-scoping — curate a tight, consistent, buildable feature list

A coding agent ships at the speed of your spec. If the feature set is vague, inconsistent, or full of
"it depends", you burn the build window re-deciding instead of shipping. This skill turns the brief into
a **curated feature list** where every feature is described the *same way*, is atomic enough to build,
and is feasibility-validated — and then it hands the list back to you so you can work it feature by
feature.

It is a **feature curator**, not a verdict machine. There is no tier badge, no sprawl score, no wedge
sketch. Instead there is one disciplined artifact — a list of features in a strict template — and a set
of curation moves (add / remove / refine / split) that keep that list consistent no matter how many
times you touch it.

## Two phases

This skill does exactly one of two things per invocation. Decide which the moment you start:

- **Phase 1 — SCOPE** (no `spec/scope.md` yet, or the user says "scope the MVP" / "spec this out").
  Read the brief, derive the candidate feature list, feasibility-check each feature, write the list,
  then **stop and show it**. Do not proceed to anything downstream.
- **Phase 2 — CURATE** (`spec/scope.md` already exists and the user names a curation move — "add a
  feature for X", "remove F3", "refine F2", "split F1", "what should I cut?"). Make **one surgical
  edit** in the **exact same template**, re-lint, and show the change. Never rewrite the whole file.

If a user asks to curate but no `spec/scope.md` exists, run Phase 1 first. If `spec/scope.md` exists and
the user says "scope the MVP" again, treat it as a fresh re-scope only if they explicitly ask to start
over — otherwise assume they mean curate.

## The feature template — the strict contract

Every feature, no matter when it was added, is one block in **exactly** this shape:

```markdown
### F1 · <verb-led feature name, 3–6 words>
- **Persona:** <one role, traceable to the brief — never "various users">
- **In → Out:** <one concrete input> → <one concrete output>
- **Feasibility:** <self-serve | partnership-gated | cost-gated | data-gated | research-gated> — <≤6-word evidence>
```

The consistency is the whole point. Three fields, always in this order, always present, never more,
never fewer. The lint (`references/lint.md`) enforces this field by field. Why it matters:

- **`### F<n> · name`** gives every feature a stable anchor you can point at ("refine F2"). The `n` is a
  number that **never changes** once assigned — removing a feature leaves its number retired, it does
  not renumber the rest. Renumbering would mean rewriting every line (the opposite of a surgical edit)
  and would break any downstream reference. The name is verb-led ("Generate auditor PDF", not "PDF
  stuff"), 3–6 words, no marketing adjectives.
- **Persona** — a single role taken from the brief's `## Target user`. One feature serves one primary
  persona. If you need "and also admins" you probably have two features.
- **In → Out** — the atomic test. One input, one output, with a literal `→`. If you need "depending
  on…", an "and/or" list, or "etc.", the feature is not atomic — split it (Phase 2) or tighten it.
  This is what makes a feature *screenable*: you could sketch the one screen that turns that input into
  that output.
- **Feasibility** — the per-feature reachability verdict from the feasibility pass below. It is a
  *verdict word* + short evidence ("self-serve — camt.053 file parse"), never a vague restatement and
  never a numeric operational limit (those belong to `nfr.md`).

A feature that can't be written in this template without a vague placeholder isn't ready — tighten it
or cut it. Don't pad the template to make it fit.

## Inputs — the brief is consumed, never restated

This skill is the **bridge layer** of the napkin pipeline: it reads `spec/brief.md`, curates the
feature list, and writes `spec/scope.md`. The single source of truth for who owns which fact — the
brief→scope ownership split, the consume-don't-re-derive rule, and the **exact brief field anchors**
this skill parses — is `../../PIPELINE.md` (this plugin's root). Read it before ingesting.

**Read `./spec/brief.md`** (relative to the current working directory) and **CONSUME it** per
PIPELINE.md's brief→scope split — do **not** re-ask or re-derive anything the brief already answers.
`brief.md` is always present in the pipeline (idea-brief produces it). If a user invokes this skill with
no `spec/brief.md` on disk, ask them to run `idea-brief` first — that is the producer of this skill's
input.

Strip the `[fact|assumption]` tag + provenance word when carrying a value across. What the brief feeds:

- `## Problem` + `## Opportunity (the need)` + `## Wedge` → the **jobs** the features must cover.
- `## Target user` → the **persona** every feature's Persona field draws from.
- `## Build seed · Core capability` + `## Build seed · Thinnest first slice` → the **scope boundary**
  the feature list must cover (and not exceed).
- `## Build seed · Key inputs / integrations` → the **candidate integrations** whose reachability the
  per-feature Feasibility field reports.
- `## Current alternative` + `## Market & segment` → context for the curation signals (what's table
  stakes vs. what bloats).
- `**Riskiest assumption:**` + `## Why now` + `## Verification log` → **build-risk context** for the
  feasibility pass.

**Reference, never restate.** Carry these as input to your judgement; do **not** re-transcribe brief
sentences into `scope.md`. The brief owns them. In particular `scope.md` carries **no pricing, no
business facts, no out-of-scope list, no hard-constraints section, no screens, no data model** — those
are owned downstream (`brief.md`, `product.md`, `nfr.md`); see PIPELINE.md.

You **derive** on your own: **the feature list and each feature's feasibility verdict.** That is the
entirety of `scope.md`.

- **competitors** (optional, `--competitors c1,c2,c3`) — known incumbents, used only as input to the
  curation signals (what features the market treats as table stakes). If omitted, judge from the brief.

---

# Phase 1 — Scope (derive the list, then stop)

### Step 1 — Derive the candidate features

Walk the brief's core capability and thinnest first slice and name the features v1 needs. Each one must
pass three tests before it earns a place on the list:

- **Atomic** — one input → one output, no "depending on…".
- **Screenable** — you could sketch the single screen for it on a napkin.
- **Standalone-valuable** — a buyer would get value from it even if the others didn't exist.

Cover the brief's core job end to end, but no further. A v1 is usually **3–7 features**; that is a
smell-test, not a gate. If the brief's core job genuinely needs more, that's fine — but watch the
curation signals (below), because most over-long lists are hiding non-atomic or out-of-scope features.

If you cannot name even 3 atomic features from the brief — every candidate keeps branching into "it
depends" — the idea is too broad to scope as-is. Don't force a list. Say so plainly, point at the
curation signals that are firing, and ask the user to narrow the persona or the core job before you
build the list. (This replaces the old "tier 🔴 + wedge proposals" move: the cure for sprawl is a
narrower brief, then a clean list — not a verdict badge.)

### Step 2 — Feasibility-check each feature

Definiteness proves a feature is *clear*; this proves it is *buildable*. A feature stays on the list
only if a coding agent can ship it on a buy-a-domain / vibecode / plug-in-Stripe stack in
days-to-weeks. Run the check per feature, discovering capabilities at runtime (bind each doubt to a
capability by *purpose*, never a hardcoded tool name). Details and failure modes:
**[references/feasibility.md](references/feasibility.md)**.

In short, for each feature:

1. **Does every external system it touches exist and is it self-serve reachable?** (public/documented
   API, webhook, SDK, user-supplied export, or OAuth a solo builder can self-register for — *not*
   partnership/enterprise/closed-beta-gated.)
2. **Is the core work doable on the common toolkit?** (CRUD + auth, hosted DB, LLM/text API,
   file parse/generate, standard third-party APIs, Stripe — *not* custom ML training, novel research,
   real-time/low-latency infra, hardware, or accuracy guarantees no off-the-shelf model gives.)
3. **Is the data it needs accessible?** (public dataset, user upload, reachable API — not proprietary
   with no access path.)

Bind each real doubt to a capability by purpose: a docs-lookup tool for "does this API exist", else web
search, else common knowledge of well-known APIs, else (if sub-agents exist) a helper agent. Keep it
proportional — a plain list screen needs no check; "pull bank transactions via Plaid" does. If nothing
can settle a doubt, write the Feasibility verdict as `feasibility-unconfirmed — <what to verify>` and
surface it. Never silently assume it works.

If the brief already carries a Verification log covering an integration, **consume it — don't re-check
what the brief settled.** Only validate what the brief left open or the scope newly introduced.

The result of this step is each feature's **Feasibility** field. A feature whose load-bearing
integration is partnership-/cost-/data-/research-gated does not belong on a clean v1 list — flag it for
the user to cut or re-route, don't quietly list it as `self-serve`.

### Step 3 — Write the list, lint it, and write the file

Compose every feature in the strict template, numbered `F1`, `F2`, … in dependency-friendly order
(foundational features first). Then lint the whole list against **[references/lint.md](references/lint.md)**
as a **double pass**: lint the draft, fix every hit, then re-read the whole list once more clean and
confirm zero violations. Write the file only on a clean second read.

The artifact is exactly:

```markdown
# scope: <idea name>

> Feature list for v1. Each feature is atomic, screenable, standalone-valuable, and feasibility-checked.
> Curate with mvp-scoping: add / remove / refine / split — one feature at a time, same template.

## Scoped features

### F1 · <verb-led name>
- **Persona:** <role>
- **In → Out:** <input> → <output>
- **Feasibility:** <verdict> — <evidence>

### F2 · <verb-led name>
- **Persona:** <role>
- **In → Out:** <input> → <output>
- **Feasibility:** <verdict> — <evidence>

### F3 · ...
```

Write it to `./spec/scope.md` (relative to cwd; create `./spec/` if missing; overwrite any existing
`scope.md`).

### Step 4 — Stop and show the list

This is the deliberate stopping point. After writing the file, **stop** — do not run collect-context or
anything else. Show the user the numbered list in chat (this is the curation surface; unlike a thin
verdict, the list is *meant* to be read here) and invite the next move:

> Wrote N features to `spec/scope.md`. Tell me what to change:
> - **add** a feature — "add a feature for exporting a VAT report"
> - **remove** one — "drop F3"
> - **refine** one — "make F2's output a PDF, not CSV"
> - **split** one that's doing too much — "split F1"
> - or ask **"what should I cut / add?"** and I'll point at the signals.

If any feature is feasibility-gated or any candidate had to be dropped for sprawl, say so in one line
here so the user can decide — don't bury it.

Once the list settles, the pipeline **forks** — point the user at both branches (don't auto-run either):

> The scope is set. Two ways forward, off the same spec:
> - **build it** → `collect-context` (context spec → gherkin → erd → forge)
> - **sell it** → `marketing-positioning` (the message), then `marketing-copy` (landing / email / ads /
>   social / launch copy)
>
> The sell branch only needs the brief + this scope, so you can write copy now — or build first and the
> copy gets richer once `product.md` and `personas.md` exist.

---

# Phase 2 — Curate (one feature at a time, surgically)

The user now works the list. **The discipline that makes this trustworthy: one request → one edit, in
the exact same template, then re-lint.** Specifically, every curation move obeys these rules so the file
never drifts:

- **Touch only the feature in question.** Never rewrite the whole file, never reflow or "tidy" features
  the user didn't mention, never renumber. Use a single `Edit` that changes exactly the target block
  (or appends exactly one new block).
- **Write new/edited features in the identical template** — same three fields, same order, same
  formatting as every existing block. A reader must not be able to tell which feature was added last.
- **Re-lint the touched block** against `references/lint.md`, plus a quick consistency scan that every
  block still matches the template. Fix before reporting.
- **Show only what changed** — the new/edited block and a one-line confirmation. Don't re-echo the
  whole list unless asked.

### Add a feature

1. Confirm it's atomic, screenable, standalone-valuable (Step 1 tests). If it's really two features,
   say so and offer to add both.
2. Feasibility-check it (Step 2) to fill the Feasibility field.
3. Assign the **next unused number** (max existing `F<n>` + 1 — never reuse a retired number).
4. **One Edit:** append the new block at the end of `## Scoped features`, in the template.
5. Lint the new block; confirm: "Added F8 · <name>."

### Remove a feature

1. **One Edit:** delete exactly that `### F<n> …` block (header + its three fields + the surrounding
   blank line). Leave all other numbers untouched — the gap is intentional.
2. Confirm: "Removed F3. (F1, F2, F4… unchanged.)"

### Refine a feature

The user changes one aspect (the output, the persona, the input, the name). **One Edit** to that block
only, keeping every other field intact and the template exact. If the change makes the feature
non-atomic (e.g. the new output depends on the input type), say so and offer to split instead.

### Split a feature (when it's doing too much)

When one feature hides two atomic jobs (its In → Out has an "and" or a "depending on"):

1. Define the two (or more) atomic features.
2. **Edits:** replace the original block in place with the first atomic feature (keep its number), and
   append the rest as new features with next numbers. Keep each in the template.
3. Confirm: "Split F1 into F1 · <a> and F8 · <b>."

### "What should I add / cut?" — advisory

Use the **curation signals** in [references/curation-signals.md](references/curation-signals.md) to
advise, without editing anything until the user picks:

- **What to cut:** features that trip a sprawl signal (branches by sector/role/jurisdiction, needs
  expert review, "configurable", "it depends on the customer", or a parity feature you'll never match a
  feature-rich incumbent on). Name the feature and the signal it trips.
- **What to add:** a gap in the brief's core job — a necessary step between two listed features with no
  feature covering it. Name the gap and propose the feature (don't add it until the user says yes).

Present the advice as a short bulleted list ("F4 trips the multi-role signal — consider cutting or
narrowing to one role"). Then wait for the user's decision and apply it as a normal curation move.

---

## The DRY boundary — what scope.md never carries

`scope.md` is the feature list and nothing else. It references the brief by anchor; it never restates a
brief sentence, and it never carries a fact a downstream spec file owns. Re-introducing any of these is
a lint failure:

- **No pricing or business-model facts** — `product.md` owns those.
- **No out-of-scope / Non-goals list** — `product.md` owns the build boundary.
- **No hard-constraints / `## Constraints` section** — `nfr.md` is the sole sharpener of brief
  constraints.
- **No screens or UI detail** — gherkin owns behavior; the In → Out line is a verdict, not a wireframe.
- **No data model** — the ERD owns schema.
- **No `## Context (from brief)` block, no restated persona/JTBD prose** — the brief owns those; cite by
  anchor if you must reference one.
- **No numeric operational limits** in the Feasibility field (SLAs, rate limits, quotas) — `nfr.md` owns
  those.

## What this skill does NOT do

- **No demand validation** — that's a market-fit concern.
- **No tech-feasibility complexity tier** of the buildability-check kind (domain, Stripe, weekend/week
  rating). This skill's feasibility pass validates *per-feature reachability*, not a complexity grade.
- **No GTM / channel check. No deep competitor profiling.** The curation signals use competitor names
  only as a table-stakes input, not a comparison.
- **No code-writing.** The output is the feature list the rest of the pipeline consumes.
- **No pricing, screens, data model, constraints, or out-of-scope list** — owned downstream (see the
  DRY boundary).
- **No customer interviews.** A clean, feasible feature is "buildable as scoped", not "validated buyers
  will pay for exactly this." Talk to humans before building.

## Related skills (the napkin pipeline)

- **idea-brief** — the producer of this skill's input (`spec/brief.md`); the business layer.
- **collect-context** — the **build-branch** consumer of this skill's output; reads `spec/scope.md` (the
  feature list + per-feature feasibility) plus `spec/brief.md` to author the context layer. The feature
  list seeds the capability-map; each feature's Feasibility verdict guards capability-map against specing
  a capability whose sole enabler isn't self-serve.
- **marketing-positioning** — the **sell-branch** consumer of this skill's output; the pipeline forks
  here. Reads `spec/scope.md` + `spec/brief.md` (richer if `product.md`/`personas.md` exist) to settle
  the message in `spec/positioning.md`, which **marketing-copy** then renders into channel copy. A
  feature in this list is the most a marketing pillar may promise.
- Any **G2/Capterra / app-review / feature-matrix** capability — discovered at runtime to sharpen the
  curation signals (table-stakes pressure); no hardcoded dependency.
- For a separate **tech-feasibility complexity rating** or a **deep competitor dive**, discover at
  runtime any skill whose description covers that — neither is a hard dependency.
