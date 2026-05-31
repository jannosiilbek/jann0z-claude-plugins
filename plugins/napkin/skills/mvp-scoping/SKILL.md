---
name: mvp-scoping
description: The second step of the napkin spec pipeline — read the validated `spec/brief.md` and judge whether the idea is a tight, Claude-Code-shippable MVP or is sprawling (compliance suites, ERP, EHR, multi-stakeholder marketplaces). Emits a thin, lint-gated `spec/scope.md` verdict: a tier (🟢 crisp / 🟡 workable / 🔴 sprawling), the 3-use-case test outcome (the named jobs v1 must do), a feasibility check, per-integration reachability verdicts, and — only if 🔴 — 3 wedge proposals. Use whenever the user wants to "scope an MVP", "check if the spec is writable", "can I greenfield this", "can Claude Code build this from a brief", "spec this idea out", "is this idea sprawling", "is this scope realistic for one person", "what's the wedge for X", "narrow this idea down to a buildable wedge", "find the wedge", or "is this product too broad to vibecode". Distinct from buildability-check (tech feasibility, domain, Stripe, integrations) — this skill judges *spec clarity*: can a coding agent ship 80% of v1 without you re-deciding things mid-build? Runs a 3-use-case test, scans for sprawl flags (regulatory drift, parity-incumbent comparison, multi-role branching, audit/evidence variance), and OPTIONALLY discovers any competitor-feature-matrix skill available at runtime to gauge parity-expectation pressure. It is the pipeline's bridge layer: it consumes the brief's business facts (never restating them) and produces only the buildable-boundary verdict that collect-context and the rest of the pipeline read. Does NOT carry pricing, screens, a data model, or any fact a downstream spec file owns. Does NOT validate demand, market size, or distribution.
allowed-tools: Bash, Read, Write, Edit, Skill
argument-hint: "[--competitors c1,c2,c3]  (reads spec/brief.md)"
---

# mvp-scoping — can a coding agent ship the v1 without you re-deciding mid-build?

A coding agent ships at the speed of your spec. If the spec has 50 open questions, you'll burn the build window clarifying instead of shipping. This skill checks whether the idea is *spec-tight* (Claude Code can run with it) or *spec-sprawling* (compliance suites, accounting, EHR, multi-stakeholder marketplaces where every customer expects different things).

This is a tech-feasibility-adjacent but distinct judgement: a tech-feasibility check judges complexity (domain, Stripe, integrations, weekend/week/month); this skill judges *spec clarity*. An idea can be technically trivial (CRUD + Stripe + LLM API) yet impossibly sprawling to spec.

## Inputs

This skill is the **bridge layer** of the napkin pipeline: it reads `spec/brief.md`, judges
buildability, and writes a thin `spec/scope.md` verdict. The single source of truth for who owns which
fact — the brief→scope ownership split, the consume-don't-re-derive rule, and the **exact brief field
anchors** mvp-scoping parses — is `../../PIPELINE.md` (this plugin's root). Read it before ingesting.

### Step 0 — Ingest the brief

**Read `./spec/brief.md`** (relative to the current working directory) and **CONSUME it** per
PIPELINE.md's brief→scope split — do **not** re-ask or re-derive anything the brief already answers.
`brief.md` is always present in the pipeline (idea-brief produces it). If a user invokes this skill with
no `spec/brief.md` on disk, ask them to run `idea-brief` first — that is the producer of this skill's
input.

Strip the `[fact|assumption]` tag + provenance word when carrying a value across (keep the tag only
when *referencing* the riskiest assumption as build-risk context). What the brief feeds:

- `## Problem` + `## Opportunity (the need)` + `## Wedge` → the **job-to-be-done** the 3-use-case test runs against.
- `## Target user` → the **persona** the test runs for.
- `## Build seed · Core capability` + `## Build seed · Thinnest first slice` → the **v1 scope boundary** the 3 use-cases must cover.
- `## Build seed · Key inputs / integrations` → the **candidate integration list** whose reachability you validate (Step 3.5).
- `## Current alternative` + `## Market & segment` → **parity/incumbent context** for the sprawl scan.
- `**Riskiest assumption:**` + `## Why now` + `## Verification log` → **build-risk context** for the feasibility pass.

**Reference, never restate.** Carry these as input to your judgement; do **not** re-transcribe brief
sentences into `scope.md`. The brief owns them — `scope.md` cites by anchor. In particular `scope.md`
carries **no pricing, no business-model facts, no Non-goals/out-of-scope list, no hard-constraints
section** — those are owned downstream (`product.md`, `nfr.md`); see PIPELINE.md.

You **derive** on your own: **the tier, the 3-use-case test outcome, the sprawl scan, the
feasibility-validation pass, the per-integration reachability verdicts, and (if 🔴) the wedge
proposals.** That is the entirety of `scope.md`.

- **competitors** (optional) — comma-separated list of known incumbents. Used for the parity-pressure check; if omitted, judge from the brief alone.

## The 5 steps

### Step 1 — The 3-use-case test

Try to name 3 specific jobs v1 must do, concretely enough to write the screens for each. Each use-case must be:

- **Atomic** — one input → one output, no "depending on..."
- **Screenable** — you could sketch the UI on a napkin
- **Standalone-valuable** — a buyer would pay even if the other two weren't there

Example (🟢 NIS2 supplier-questionnaire wedge):
1. Generate a supplier-risk questionnaire from a template
2. Export an auditor-ready PDF
3. Track remediation tasks with owner + due date

Example (🔴 NIS2 compliance suite — can't pass the test):
1. "Compliance management" — too broad, branches by sector
2. "Audit support" — varies by jurisdiction, by auditor
3. "Risk management" — entire frameworks (ISO 27005, NIST 800-30) live here

**Output of this step:** either 3 clean use-cases (→ 🟢/🟡 candidate) or evidence that you can't extract them (→ 🔴 candidate).

### Step 2 — Detect sprawl triggers

Scan the idea for the heuristic flags in [references/sprawl-flags.md](references/sprawl-flags.md). Count hits.

Short version of the flag list:

- Regulatory framework with version drift or sector branching (NIS2, GDPR sub-articles, SOX, HIPAA, PCI-DSS, AI Act, CSRD)
- Customers benchmark you against a feature-rich incumbent (Vanta, Drata, Salesforce, NetSuite, Epic, SAP, Workday)
- Multiple user roles with different permissions AND different primary flows (not just admin vs. member)
- Audit-trail / evidence / reporting requirements that vary by sector or jurisdiction
- "Workflow engine", "configurable rules", or "no-code builder" in the value prop
- Output requires expert review (legal doc, medical report, financial filing)
- Domain knowledge you don't have AND can't read up on in an afternoon
- "It depends on the customer" appears in your description of any core flow

**Scoring:** 0-1 hits → 🟢, 2 hits → 🟡, 3+ hits → strong 🔴 signal regardless of Step 1.

### Step 3 — Parity-pressure check (optional, evidence-gathering)

If a **competitor feature-matrix** capability is available this run, use it to gauge how many features the market expects at parity:

1. **Discover** the capability at runtime — match by *purpose*, not a hardcoded name: scan the live
   available-skills list, read each candidate's description (not just its name), and pick the one whose
   description covers competitor-feature mining (G2 / Capterra mining, competitor feature extraction,
   feature-matrix scraping, app-review mining, software-review aggregation). If none fits, this step is
   simply skipped.
2. **Invoke** it with 2-3 named competitors (from `--competitors` input, or extracted from the brief, or from the user's mention of "alternative to X").
3. **Synthesize** the median feature count across top competitors:
   - **<10 features per top competitor** → low parity pressure → 🟢 supportable
   - **10-30 features** → moderate parity pressure → 🟡
   - **30+ features** → high parity pressure → customers will reject you for missing "table stakes" → 🔴 unless you wedge

If no such capability is available, **skip this step and rely on Steps 1+2**. Don't fall through to a heavier deep-competitor-profiling workflow unless the user explicitly asks for a deep competitive dive — that's a separate workflow.

**Why this is optional:** the rubric works without it; the parity-pressure data just sharpens the verdict when available.

### Step 3.5 — Feasibility-validation pass (is it actually buildable?)

Definiteness proves the scope is *clear*; this pass proves it is *buildable*. A 🟢 must mean "a coding
agent can ship this on a buy-a-domain / vibecode / plug-in-Stripe stack in days-to-weeks" — evidenced,
not assumed. Run it after the 3-use-case test and the candidate integration list are in hand, before the
tier synthesis. Like idea-brief's dynamic verification, it **discovers capabilities at runtime** and
binds each doubt to a capability by *purpose*, never a hardcoded tool name.

**F1 — Extract the feasibility intents.** Pull every claim the build depends on, across four classes:
1. **Integration / API / data-source reachability** — does each named external system exist, expose a
   public/programmatic interface (API, webhook, SDK, export), and is it reachable **without** a signed
   partnership, enterprise sales call, or closed beta?
2. **Core-capability achievability** — can the v1 promise / each use-case be built with the common
   vibecode toolkit (CRUD + auth, hosted DB, LLM/text API, file parse/generate, standard third-party
   APIs, Stripe) — or does it need custom ML training, novel research, real-time/low-latency infra,
   hardware, or accuracy guarantees no off-the-shelf model gives?
3. **Data availability** — does each consumed data source exist in an accessible form (public dataset,
   user-supplied upload, a reachable API) rather than proprietary data with no access path?
4. **Effort realism** — against the brief's Thinnest first slice + Hard constraints, is the total
   build realistic for one person in days-to-weeks, or does screen×integration×difficulty imply months?

If the brief already carries a Verification log or buildability evidence, **consume it — do not
re-check what the brief settled.** Only validate intents the brief left open or the scope newly
introduced (e.g. an integration mvp-scoping itself added).

**F2 — Bind each intent to an available capability by purpose.** Prefer a specific skill/MCP tool
whose purpose matches (e.g. a docs-lookup tool for "does this API exist"); else fall back to
web/internet search; else common knowledge of well-known APIs (Stripe, Google, Slack, OpenAI…). For
"is this buildable / effort realistic" where no search settles it, spawn a helper agent (if sub-agents
exist) or reason it through. If nothing can settle an intent, mark that item `feasibility-unconfirmed`
and say so — never silently assume it works. Run checks in parallel where possible; keep it
proportional (a plain "list" screen needs no check; a "pull bank transactions via Plaid" integration
does).

**F3 — Promote to feasibility-validated** only when ALL hold: every named integration/data source
exists and is **self-serve reachable** (public API, documented webhook, user-supplied export, or
OAuth a solo builder can self-register for); the core capability + every use-case are achievable on
the common toolkit; required data is accessible; the total scope is realistic for the stated
effort/persona honoring Hard constraints. Record the evidence as a compact **`## Feasibility check`**
block in scope.md — one line per load-bearing intent (`intent → verdict → via capability → result`,
≤12 words). Do not narrate.

**F4 — Failure modes that MUST flag (and flip the verdict).** Name the item, the failure mode, and
the fix:
- **Integration doesn't exist** (vaporware) → replace or drop. Not feasibility-validated.
- **Partnership/enterprise/closed-beta-gated** (no self-serve API for a solo builder — direct bank
  data without an aggregator, a payor claims API, an MLS feed) → flag **partnership-gated**; route
  through a self-serve aggregator or it blocks v1 (push toward 🔴 if the core use-case depends on it).
- **Paywalled beyond a solo budget** (enterprise-only pricing, "contact sales") → flag **cost-gated**.
- **Needs ML training / research / accuracy guarantees beyond a common build** → flag **research-gated**;
  not a days-to-weeks build → not 🟢 unless reducible to an off-the-shelf LLM/API call.
- **Required data proprietary / unobtainable** → flag **data-gated**.
- **Scope implies months, not days-weeks** → a *feasibility* fail (not a count fail); push to 🟡/🔴 and
  carve the Thinnest first slice tighter.

**F5 — Size is allowed to grow.** Feasibility is about *doability*, not size. A scope with many
capabilities and 4 integrations **passes** if every item is justified and non-redundant, every
integration self-serve-reachable, the capability off-the-shelf, and the whole still ships in
days-to-weeks. Counts are smell-tests, not gates.

### Step 4 — Synthesize tier + deliver the artifact

**Tier (synthesize from Steps 1–3.5).** The tier is keyed off **definiteness + feasibility + sprawl**,
**not** raw item counts:

| Tier | Signal | Effort to draft v1 spec |
|---|---|---|
| 🟢 **Crisp** | 3 atomic, fully-defined, feasibility-validated use-cases (every integration self-serve, capability off-the-shelf, ships in days-to-weeks); ≤1 sprawl flag; low/skipped parity | 1-2 hours |
| 🟡 **Workable** | definite and mostly feasible but with one cost/partnership/effort caveat to resolve, OR open edges, OR 2 sprawl flags, OR moderate parity | Half-day |
| 🔴 **Sprawling** | can't name 3 clean use-cases, OR a load-bearing piece is partnership/research/data-gated with no self-serve path, OR the justified scope implies months, OR 3+ sprawl flags, OR vague scope, OR high parity | Days-to-weeks |

**Then deliver the artifact.** `scope.md` is a **thin verdict layer**, not a spec sketch. It carries
only what mvp-scoping owns: the tier, the 3-use-case test outcome, the sprawl/parity verdict, the
feasibility check, and the per-integration reachability verdicts. It carries **no** persona/JTBD prose
(the brief owns those — cite by reference if needed), **no** screens, **no** data model, **no** pricing,
**no** hard-constraints section, and **no** out-of-scope list — those are owned by `brief.md`,
`product.md`, and `nfr.md` downstream (see PIPELINE.md). Re-introducing any of them is a lint failure.

For **🟢/🟡**, the artifact is:

```markdown
# scope verdict: <🟢/🟡> <idea name>

**Tier:** <Crisp / Workable>
**3-use-case test:** <passed cleanly | passed with caveats>
**Sprawl flags hit:** <count> — <list flag names>
**Parity-pressure:** <low / moderate / skipped — no competitor-matrix capability available>

## 3-use-case test
<!-- the named jobs v1 must do — this outcome seeds capability-map; it is NOT an authoritative spec list -->
1. <use-case 1 — concrete input → concrete output>
2. <use-case 2 — concrete input → concrete output>
3. <use-case 3 — concrete input → concrete output>

## Integrations
<!-- per-integration reachability VERDICTS only (Step 3.5) — name the real system + verdict + routing note.
     The integration's name is owned by glossary.md when it is a domain noun; here it is the verdict that matters. -->
- <real system> — <self-serve | partnership-gated | cost-gated | data-gated>[, <routing note e.g. "via aggregator X">]
- ...

## Feasibility check
<!-- one line per load-bearing intent, from Step 3.5; verdicts only, never numeric operational limits (those are nfr's) -->
- <intent → verdict → via capability → result, ≤12 words>
- ...
```

For **🔴**, do NOT write the verdict sketch. Instead, generate **3 wedge proposals** — each one carves a narrower persona + narrower use-case + standalone-sellable cut:

```markdown
# Wedge proposals for <idea>

## Wedge 1: <name>
- **Persona:** <narrower, ~10k addressable buyers>
- **Use-case:** <single most painful job>
- **Why standalone-sellable:** <why a buyer pays for just this, even without the rest>
- **3-use-case test for this wedge:** <which 3 atomic jobs v1 does>

## Wedge 2: ...
## Wedge 3: ...
```

The user picks one wedge, then re-runs this skill on the wedge to get the 🟢 spec sketch.

### Step 5 — Lint the artifact (the second half of the double validation)

The tier is one gate; the artifact passing **`references/lint.md`** is the other — together they are
the double validation. Run the lint as a **double pass**: lint the draft (verdict *or* wedge
proposals), fix every hit, then re-read the whole artifact once more clean and confirm zero
violations. Emit only on a clean second read.

The lint is strict because the verdict's value is that the rest of the pipeline runs on it unattended —
every "it depends" left in is a downstream stall. It is **intelligent, not arithmetic**: the hard gate
is **definiteness + feasibility + no slop**, never a raw item count. Key rules it enforces: every line
concrete and non-vague (no `TBD` / "it depends" / "varies by customer"); each integration line names a
real self-serve system and is a reachability **verdict**, not a bare name or a numeric limit; the scope
is **feasibility-validated** (Step 3.5); no marketing adjectives; and — critically — **`scope.md`
carries none of the cut sections** (no pricing/business facts, no Screens, no Data model, no
`## Constraints`, no out-of-scope list, no `## Context (from brief)`) and **no verbatim sentence copied
from `brief.md`** — it references the brief by anchor, never restates it. Counts are **smell-tests, not
gates**. If a section can't be filled without "it depends", the tier is wrong — drop it and re-tier,
never pad.

### Step 6 — Write `./spec/scope.md`

Once the artifact passes the lint clean, **write it to `./spec/scope.md`** (relative to cwd; create
`./spec/` if missing; overwrite any existing `scope.md`). Report just the path — do **not** echo the
full artifact into chat. Output is file-only; the lint is not satisfied by an in-chat draft.

## The wedge principle

Any 🔴 idea can be 🟢'd by carving a wedge — the *single* most painful use case for a *specific* persona, sold standalone. The test: would buyers pay for the wedge *on its own*? If yes → 🟢. If not, you don't have an MVP, you have a feature.

The pattern is always: **vertical narrowing** (specific industry + region + sub-segment) + **use-case narrowing** (one painful job, not a suite) + **standalone-sellability** (priced for the wedge alone, not a teaser for the suite).

Example transformations:
- "NIS2 compliance suite" 🔴 → "NIS2 supplier-questionnaire generator for Estonian energy-sector MSPs" 🟢
- "Practice management for therapists" 🔴 → "Insurance superbill generator for cash-pay therapists in California" 🟢
- "Restaurant operations platform" 🔴 → "Daily prep-list generator for single-location pizzerias" 🟢
- "AI-powered legal assistant" 🔴 → "NDA reviewer for Series-A SaaS founders" 🟢

## Output format

The artifact is **file-only**: write `./spec/scope.md` and report just the path. In chat, give a
one-line summary — the tier, the 3-use-case test result, sprawl-flag count, and parity-pressure — and
point to the file. Do not echo the full artifact. The written `scope.md` must have passed the Step 5
lint (`references/lint.md`): never emit a verdict with a `TBD`, an "it depends", a vague or infeasible
line, a restated brief sentence, or any of the cut sections.

## What this skill does NOT do

- **No demand validation** — that is a market-fit-validation concern.
- **No tech feasibility check** of the buildability-check kind (domain, Stripe, complexity rating). This skill's Step 3.5 validates *integration reachability* for the scope, not the full tech-complexity tier.
- **No GTM / channel check.**
- **No deep competitor profiling.** The Step 3 parity check is a feature count, not a comparison; a deep competitive dive is a separate workflow.
- **No code-writing.** The output is a scope verdict the rest of the pipeline consumes, not running code.
- **No pricing, screens, data model, or out-of-scope list** — those are owned by `brief.md` / `product.md` / `nfr.md` / the ERD (see PIPELINE.md). scope.md carries only the buildability verdict.
- **No customer interviews.** A 🟢 verdict is "buildable as scoped", not "validated buyers will pay for this exact scope." Talk to humans before building.

## Related skills (the napkin pipeline)

- **idea-brief** — the producer of this skill's input (`spec/brief.md`); the business layer.
- **collect-context** — the consumer of this skill's output; reads `spec/scope.md` (tier gate, feasibility, integration verdicts) plus `spec/brief.md` to author the context layer.
- Any **G2/Capterra / app-review / feature-matrix** capability — discovered at runtime for Step 3 parity-pressure scoring (no hardcoded dependency).
- For a separate **tech-feasibility complexity rating** or a **deep competitor dive**, discover at runtime any skill whose description covers that — neither is a hard dependency of this skill.
