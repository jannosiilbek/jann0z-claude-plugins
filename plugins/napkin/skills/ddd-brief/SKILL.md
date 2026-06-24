---
name: ddd-brief
description: Use when the user wants to start a spec, scope a project or feature, write a project brief, kick off the DDD spec pipeline, or clarify what to build before designing anything — including "let's spec this out", "help me define this product", or when they hand over requirement documents/transcripts to turn into a structured starting point. Interactively elicits the problem, actors, scope, and constraints (one question at a time, never re-asking what provided material already answers), then writes or incrementally updates a living spec/brief.md, spec/stack.md, and spec/nfr.md, and sizes how much of the downstream pipeline (ddd-domain → ddd-usecases → ddd-api → erd-modeler → ddd-plan) the work actually warrants.
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
  mode** (stage 4 rules change, and the sizing decision usually becomes `delta`).
- **Provided material**: read every artifact the user supplied or pointed at —
  requirement docs, meeting transcripts, existing glossaries, README files, tickets.
  This material is evidence; mine it for answers before asking a single question.
- Read `references/elicitation.md` for the coverage checklist and questioning method.
- **Existing stack/nfr**: if `spec/stack.md` or `spec/nfr.md` exists, read them — you
  are in **delta mode** for those artifacts (update, don't regenerate).

### 2. Elicit — one question at a time

Work through the coverage checklist (problem, actors, scope in/out, constraints,
non-functional needs). For each area:

- If the request or provided material already answers it, record the answer — **never
  ask the user something their material already told you**. Re-asking erodes trust and
  wastes their time.
- If it is genuinely uncovered or ambiguous *and the answer changes the spec*, ask —
  **one question per message**, multiple-choice where possible.
- Cap yourself at about **5 questions**. Past that, proceed with explicitly stated
  assumptions (write them into the brief where the user can correct them) rather than
  interrogating. When coverage is already complete, ask **zero** questions and say so.

Every question asked and answer received is appended to the brief's
**Clarifications log** — that log is the audit trail that lets a future session see why
the spec says what it says.

### 2a. Elicit stack, infra, and CI — three dispatch questions, none count against the 5-question budget

Ask these three questions **before** domain Tier 1/2 questions. Each is a dispatch —
selecting a named option reads a preset file and considers that dimension fully covered.
Custom runs the existing Tier 1/2 elicitation for that dimension only.

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

When reading infra preset files, resolve the `<env-config>` placeholder before writing:
- TypeScript stack → `dotenv`
- Python stack → `python-dotenv`

**DRY, dead code, and drift safety** are never asked — always write `## Code quality` in
nfr.md with `DRY: yes`, `Dead code: none`, `Drift safety: spec-traced`.

### 3. Size the pipeline

Decide — and record in the **Pipeline sizing** block — how much machinery this work
warrants. This is the anti-bloat contract: read the sizing rubric in
`references/elicitation.md` and choose:

- **full** — new domain or major feature: every downstream stage runs.
- **lean** — modest scope: mark stages that add nothing as `no` (e.g. a pure data-layer
  tool may not need `ddd-plan`).
- **delta** — a change to an already-specced system: downstream skills update existing
  artifacts incrementally; a bug fix may need nothing but a clarifying line and one
  changed use case.
- `ddd-api`: `yes` when the project has an external surface (REST, CLI, library, etc.);
  `no` when `Interface: Kind = none` or the scope is purely internal. A lean data-layer
  tool usually has `ddd-api: no`.

The rule of thumb: the spec must always be lighter than the work it describes. If
reviewing the artifacts would take longer than reviewing the change itself, you've
over-sized — shrink the decision.

### 4. Write or update spec/brief.md

Follow the skeleton in spec-format.md §2 exactly (marker comment, section set, sizing
block, clarifications table, changelog).

- **Greenfield**: create `spec/brief.md` (creating `spec/` if needed).
- **Delta mode**: apply the update protocol from spec-format.md §1.4 — read everything,
  touch only the sections your change affects, preserve user edits verbatim, append (not
  rewrite) the Clarifications log, and add one Changelog line. Never regenerate the file
  wholesale.
- **The Pipeline sizing block is re-evaluated on every delta update — edit it in the
  file.** A change to an already-specced system is `delta`; leaving the block at `full`
  while calling the work a delta in the report is the spec contradicting itself, and the
  next session will trust the file, not the report.

### 4a. Write or update spec/stack.md and spec/nfr.md

**Greenfield:** Read the selected stack preset file and the selected infra preset file.
Merge them: stack preset content first, then `## Deployment` and `## Pipeline` from the
infra preset (with `<env-config>` resolved), then the nfr.md defaults. Substitute
`<Project name>` with the project name from the brief and `<DATE>` with today's date.
Write the merged result as `spec/stack.md` and `spec/nfr.md`.

If the user selected Custom for any dimension, elicit that dimension's fields via Tier
1/2 questions (§2a) and write the resulting values into the appropriate sections instead
of copying from the preset.

**Delta mode:** apply spec-format.md §1.4 — touch only fields whose answers changed,
preserve user edits verbatim, append one Changelog line. Never regenerate wholesale.
Omit sections the user didn't specify — no placeholders. An nfr.md with only
`## Error contracts` and `## Auth` is correct if the user didn't address performance.

**Exception:** when `Interface: Kind = none`, always write `Interface: Kind: none`
explicitly in stack.md — do not omit the section.

`unknown` values: a field the user has no opinion on is written as `unknown`. The
alignment checks skip unknown fields; the implementing agent uses framework defaults.

**Defaults always written — no elicitation needed:**

- **`## Conventions` in stack.md** — always include. Default is `File naming: stereotype.identifier
  (e.g. enrollment.aggregate.ts, enroll-student.usecase.ts)` and `File structure: flat per stereotype`.
  Write the elicited value if the user confirmed a different convention; write the default
  if they confirmed it or if it was not asked yet.
- **`## Integrations` in stack.md** — include with `Adapter pattern: yes`, `Mock: yes`,
  `Mock activation: USE_MOCK=true`, `Mock scope: local dev, unit tests, e2e` whenever the
  brief or domain mentions any external service, API, or third-party integration. Omit
  only when the system has no external dependencies at all.
- **`## Structure` in stack.md** — always include the canonical monorepo layout (see
  spec-format.md §7 reference tree). Write the default workspace list; customise
  `packages/domains` entries once bounded contexts are known (update this field when running
  ddd-domain, or leave generic for the implementing agent).
  Omit entries that don't apply (e.g. omit `apps/www` for a pure API product).
- **`## Code quality` in nfr.md** — always include with `DRY: yes`, `Dead code: none`,
  `Drift safety: spec-traced`. Never ask; never omit.

### 5. Gate

Run the **self-correcting exit gate** (ddd-align → "Self-correcting exit gate"): run the
harness, fix every **error** routed to an artifact you wrote this session, re-run until clean
(≤3 passes), then include the final one-line result:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/
```

A brief-only spec passes trivially on the cross-checks — the gate here catches
structural mistakes (missing marker, malformed sizing block) before they propagate.

At this stage the gate checks structure of stack.md and nfr.md (marker presence,
section shape). It does not yet enforce AL-17/AL-18 (those activate only once api.md
exists after ddd-api runs).

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
