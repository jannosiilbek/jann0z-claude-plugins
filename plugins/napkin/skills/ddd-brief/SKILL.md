---
name: ddd-brief
description: Use when the user wants to start a spec, scope a project or feature, write a project brief, kick off the DDD spec pipeline, or clarify what to build before designing anything — including "let's spec this out", "help me define this product", or when they hand over requirement documents/transcripts to turn into a structured starting point. Interactively elicits the problem, actors, scope, and constraints (one question at a time, never re-asking what provided material already answers), then writes or incrementally updates a living spec/brief.md, spec/stack.md, and spec/nfr.md, and sizes how much of the downstream pipeline (ddd-domain → ddd-usecases → [ddd-api →] erd-modeler → ddd-plan) the work actually warrants.
---

# DDD Brief

Turn a fuzzy "I want to build…" into a structured, living `spec/brief.md` — the entry
point of the napkin DDD spec pipeline. The brief states the problem, actors, scope, and
constraints; logs every clarification; and **sizes the pipeline** so a small change never
spawns a cascade of heavyweight artifacts.

The artifact grammar is defined once, in
`${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/references/spec-format.md` — read its §1
(cross-cutting rules) and §2 (brief.md) before writing anything.

## Workflow

### 1. Intake — read before asking

- **Existing brief**: if `spec/brief.md` exists, read it fully — you are in **delta
  mode** (stage 4 rules change, and the sizing decision is `delta`).
- **Provided material**: read every artifact the user supplied or pointed at —
  requirement docs, meeting transcripts, existing glossaries, README files, tickets.
  This material is evidence; mine it for answers before asking a single question.
- Read `references/elicitation.md` for the coverage checklist and questioning method.
- **Existing stack/nfr**: if `spec/stack.md` or `spec/nfr.md` exists, read them — you
  are in **delta mode** for those artifacts (update, don't regenerate).

### 2. Elicit — one question at a time

Work through the coverage checklist from `references/elicitation.md`, applying the
questioning discipline documented there. Record every covered answer in the brief; write
any stated assumptions into the matching brief section (Problem statement, Actors, Scope, Constraints, or Non-functional notes) where the user can correct them.

Every question asked and answer received is appended to the brief's
**Clarifications log** — that log is the audit trail that lets a future session see why
the spec says what it says.

### 2a. Elicit stack, infra, and CI — three dispatch questions, none count against the 5-question budget

- Ask these three questions **before** domain Tier 1/2 questions.
- Selecting a named option reads a preset file and considers that dimension fully covered.
- Custom runs the existing Tier 1/2 elicitation for that dimension only.

**Q1 — Stack (ask first):**
> "Which stack? **(1) Hono monorepo** [default — TypeScript, Hono, Drizzle, Vitest] /
> **(2) FastAPI** [Python, SQLAlchemy, pytest] / **(3) Custom** [I'll answer the questions]"

**Q2 — Cloud (ask second):**
> "Which cloud? **(1) Both** [default — AWS + GCP, Pulumi] / **(2) GCP** / **(3) AWS** /
> **(4) Custom**"

**Q3 — CI (ask third):**
> "Which CI? **(1) GitHub Actions** [default — GitHub Flow, preview/staging/production] /
> **(2) Custom**"

Auto-resolution rules (skip the question when provided material already answers it):
- Q1: auto-resolved when material names a framework (`Hono`, `FastAPI`, etc.)
- Q2: auto-resolved when material names a cloud provider or IaC target
- Q3: auto-resolved when material names a CI system

Preset file locations (relative to `${CLAUDE_PLUGIN_ROOT}/skills/ddd-brief/`):
- Stack preset: `references/stacks/<name>.md` where `<name>` is `hono-monorepo` or `fastapi`
- Infra preset: `references/infra/<name>.md` where `<name>` is `both`, `gcp`, or `aws`

The infra preset contains an `<env-config>` placeholder — its resolved value depends on the stack:
- TypeScript stack → `dotenv`
- Python stack → `python-dotenv`

### 3. Size the pipeline

Decide — and record in the **Pipeline sizing** block — how much machinery this work
warrants. Apply the sizing rubric from `references/elicitation.md`.

### 4. Write or update spec/brief.md

Follow the skeleton in spec-format.md §2 exactly (marker comment, section set, sizing
block, clarifications table, changelog).

- **Greenfield**: create `spec/brief.md` (creating `spec/` if needed).
- When subdomain classification was elicited (or is apparent from provided material),
  include the `## Subdomain classification` table per spec-format.md §2. Omit the
  section entirely when the project is clearly single-domain.
- **Delta mode**: apply the update protocol from spec-format.md §1.4 — read everything,
  touch only the sections your change affects, preserve user edits verbatim, append (not
  rewrite) the Clarifications log, and add one Changelog line.
- **The Pipeline sizing block is re-evaluated on every delta update — edit it in the
  file.** A change to an already-specced system is `delta`; leaving the block at `full`
  while calling the work a delta in the report is the spec contradicting itself, and the
  next session will trust the file, not the report.

### 4a. Write or update spec/stack.md and spec/nfr.md

**Greenfield:**
1. Read the selected stack preset file and the selected infra preset file.
2. Copy the stack preset into `spec/stack.md` **verbatim**. The only permitted transformations:
   - Substitute `<Project name>` and `<DATE>`.
   - Resolve `<env-config>` (see §2a for the value). Never write `<env-config>` literally.
   - Omit `## Integrations` only when the system has zero external dependencies.
3. Append `## Deployment` and `## Pipeline` from the infra preset **verbatim**
   (with `<env-config>` resolved as above).
4. Write `spec/stack.md` and `spec/nfr.md`.

If the user selected Custom for any dimension, elicit that dimension's fields via the
Tier 1/2 questions in `references/elicitation.md` and write the resulting values into
the matching sections of `stack.md` / `nfr.md` (per spec-format.md §7 / §8) instead
of copying from the preset.

**Delta mode:** apply spec-format.md §1.4 — touch only fields whose answers changed,
preserve user edits verbatim, append one Changelog line.
Omit sections the user didn't specify — no placeholders. An nfr.md with only
`## Error contracts` and `## Auth` is correct if the user didn't address performance.

**Exception:** when `Interface: Kind = none`, always write `Interface: Kind: none`
explicitly in stack.md's `## Interface` section (per spec-format.md §7).

`unknown` values: a field the user has no opinion on is written as `unknown`. The
alignment checks skip unknown fields; the implementing agent uses framework defaults.

**Defaults always written — no elicitation needed:**

- **`## Code quality` in nfr.md** — always include with `DRY: yes`, `Dead code: none`,
  `Drift safety: spec-traced`. Never ask; never omit. (Not in any preset — must be added
  explicitly when writing nfr.md.)

### 4b. Write spec/env.md

**Greenfield:** derive variables from the stack and integrations declared in stack.md:
1. One `DATABASE_URL` row whenever a SQL data layer is present.
2. One row per auth secret (e.g. `JWT_SECRET`, `SESSION_SECRET`, `OAUTH_CLIENT_SECRET`).
3. One row per external integration named in `## Integrations` (e.g. `STRIPE_SECRET_KEY`,
   `SENDGRID_API_KEY`, `CLERK_SECRET_KEY`). Mark these `Type: secret`.
4. One `USE_MOCK` row whenever `Mock: yes` is in `## Integrations`, with `Default: false`
   and `Required-in: dev, test`.
5. Any environment-specific URLs (e.g. `APP_URL`, `API_URL`) when the stack uses
   `Environments: preview, staging, production`.

Follow the skeleton in spec-format.md §12. Write `spec/env.md`.

**Delta mode:** append rows for new integrations only; never edit existing rows.
When no external integrations or auth secrets are present, skip this file silently.

### 5. Gate

Run the **self-correcting exit gate** (ddd-align → "Self-correcting exit gate"): run the
harness, fix every **error** routed to an artifact you wrote this session, re-run until clean,
then include the final one-line result:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/
```

A brief-only spec passes trivially on the cross-checks — the gate here catches
structural mistakes (missing marker, malformed sizing block) before they propagate.

At this stage the gate checks structure of stack.md and nfr.md (marker presence,
section shape) via AL-20–AL-24 (Conventions, Structure, Preset, Pipeline fields). It
does not yet enforce AL-17/AL-18 (those activate only once api.md exists after ddd-api
runs).

### 6. Report

```
## Brief report — <project name>

| Section | Status |
|---------|--------|
| Problem statement | written |
| Actors | 2 identified |
| Scope | 3 in / 2 out |
| Constraints | 2 |
| Pipeline sizing | full — greenfield system of record |
| Stack | TypeScript / Hono / REST API / JWT |
| NFR | auth + error contracts + performance |

Clarifications this session: N asked, M answered from provided material
Alignment gate: ✅ ok (or the harness's error lines)

📄 Brief saved to spec/brief.md
📄 Stack saved to spec/stack.md
📄 NFR saved to spec/nfr.md
➡️ Next: run ddd-domain to build the glossary and flows
```

In delta mode, replace the section table with a "Sections touched / preserved" table and
point ➡️ at whichever stages the sizing decision marked as running. The ➡️ pointer is
the **last line** of the report — nothing after it.
