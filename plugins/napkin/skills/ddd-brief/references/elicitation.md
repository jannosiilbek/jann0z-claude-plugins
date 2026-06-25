# Elicitation method

## The coverage checklist

A brief is complete when each of these is either answered or explicitly assumed:

| Area | What "covered" means | Typical gap question |
|------|----------------------|----------------------|
| Problem | Who has what pain, and why solving it now matters | "What goes wrong today when X happens?" |
| Actors | Every kind of person/system that touches the system | "Who else reads or changes this data?" |
| Scope in | The capabilities v1 must have | "Is reporting part of this, or later?" |
| Scope out | The tempting neighbors explicitly excluded | "Payments: in or out?" |
| Constraints | Tech, regulatory, budget, deadline boundaries | "Any storage/stack it must run on?" |
| Non-functional | Performance, security, compliance expectations that shape design | "Roughly how many records/users?" |
| Subdomain type | Core / Supporting / Generic classification for each major capability | "Is auth your differentiator, or are you buying Clerk?" |
| Interface type | What kind of surface the system exposes (REST / CLI / library / none) | "Is there an HTTP API, or is this a library/CLI?" |
| Stack | Runtime language, framework, auth mechanism, error contract shape | "What language/framework? JWT or session auth?" |

Walk the checklist against the user's request **and every provided document** first.
Mark each area covered/uncovered. Only uncovered-and-consequential areas earn a
question.

## Questioning discipline

- **One question per message.** A wall of questions gets a wall of half-answers.
- **Multiple-choice beats open-ended** — options show the user you understood the
  domain, and the "Other" escape hatch still exists.
- **Ask only what changes the spec.** "What color should the UI be" never changes a
  brief. "Can an order exist without a customer" always does.
- **Question vs. assumption — the structure test.** Reserve questions for decisions
  that alter scope, actors, or the shape of the data; details that merely tune behavior
  (which field a QR code encodes, the wording of a rejection message) become stated
  assumptions, not questions. When several gaps survive that test, ask the single most
  consequential one first — often its answer settles the others.
- **~5 question budget.** When it's spent, switch to stated assumptions: write
  "Assumed: X (correct me)" into the relevant brief section. An assumption the user can
  see and veto is worth more than a tenth question they won't read.
- **Zero is a valid number of questions.** A detailed request plus good documents often
  covers the checklist outright. Say "your material covered everything — no questions"
  and move on. This is also why the skill works non-interactively.

## Stack/NFR coverage checklist

Preset dispatch questions (Q1 Stack, Q2 Cloud, Q3 CI) are specified in full in §2a of
the skill. After the preset dispatch, a stack.md + nfr.md are complete when each area
is either answered or recorded as `unknown`:

**Tier 1 — always ask if uncovered (affect every downstream stage):**

| Area | What "covered" means | Question to ask |
|------|----------------------|-----------------|
| Interface type | The kind of external surface (or none) | "REST API / GraphQL / tRPC / CLI / library / full-stack / or none?" |
| Language + framework | Runtime and web framework | "Which language and web framework?" |
| Auth mechanism | How callers authenticate | "JWT / session cookie / API key / OAuth2 / or none?" |

**Tier 2 — ask if uncovered AND the project has an external surface or deployment concerns:**

| Area | What "covered" means | Question to ask |
|------|----------------------|-----------------|
| Error contract shape | How errors are serialised | "RFC 7807 Problem Details / `{code, message}` / framework default / or unknown?" |
| File naming convention | Confirm or override the default stereotype pattern | "File naming default is `stereotype.identifier` (e.g. `enrollment.aggregate.ts`) — keep it, or use a different convention?" |
| IaC tool | Infrastructure-as-code tool for deployments | "IaC: Pulumi / Terraform / CDK / none?" |
| Cloud targets | Which cloud provider(s) will host the system | "Cloud targets: AWS / GCP / Azure / multi-cloud / unknown?" |
| Environments | Named deploy environments in promotion order | "Environments: preview (per-PR) + staging + production, or different?" |

Walk these areas against provided material first. Only genuinely uncovered areas earn a
question — and only one question per message. If the user has no preference, write
`unknown`; the alignment checks skip those fields.

`DRY`, `Dead code`, and `Drift safety` — team-wide quality stances; write per §4a
defaults in the skill.

## Sizing rubric (the anti-bloat contract)

The documented failure mode of spec pipelines is weight that doesn't adapt: one
published case turned a small bug fix into 4 user stories with 16 acceptance criteria —
reviewers concluded they'd rather review the code. The sizing block exists so that
never happens here.

| Signal | Size |
|--------|------|
| New domain, no existing spec/ artifacts | **full** |
| New capability inside an already-specced domain | **delta** (domain/usecases/plan update incrementally) |
| Data-model-only work (a tool, a report, an import) | **lean** — often `ddd-domain: yes, ddd-usecases: yes, erd-modeler: yes, ddd-plan: no` |
| Bug fix / small behavior change | **delta**, usually touching one use case and nothing else — and if not even a use case changes, say the pipeline isn't needed at all |
| Spike / prototype the user calls throwaway | **lean** at most — and say that the spec can be skipped entirely; don't manufacture ceremony |
| No external API surface (internal tool, library, data pipeline) | **lean** — set `ddd-api: no` |

Two tests before settling:

1. **The review test** — would reviewing the artifacts take longer than reviewing the
   change? If yes, size down.
2. **The consumer test** — will anything downstream actually read this artifact? An
   artifact nothing consumes is dead weight; mark its stage `no`.

**Subdomain classification question:** Ask only when the domain has 2+ clearly separable
capability areas. Single-context, single-purpose tools (a CLI, a data import job) are
trivially all Core — don't ask. When asked, phrase it as:
> "Which parts of this system are your actual competitive differentiator versus standard
> plumbing? (e.g. auth, payments, email sending — buy or use a library? pricing engine,
> recommendation algorithm — build?)"
Record one row per answer in `## Subdomain classification` in brief.md.
