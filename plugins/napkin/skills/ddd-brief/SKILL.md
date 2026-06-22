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

### 2a. Elicit stack and NFR — four questions max

After the domain elicitation (or in parallel when provided material already answers
domain questions), work through the stack/NFR coverage checklist in
`references/elicitation.md`. For each area:

- If provided material already answers it, record the answer — **never re-ask**.
- If genuinely uncovered, ask — **one question per message**, multiple-choice where
  possible, in this priority order:
  1. **Interface type** — REST API / GraphQL / tRPC / CLI / library / full-stack / none
  2. **Language + framework** — what runtime and web framework?
  3. **Auth mechanism** — JWT / session / API key / OAuth2 / none
  4. **Error contract shape** — RFC 7807 / `{code, message}` / framework default / unknown
- If the user has no preference on a field, write `unknown` — alignment checks skip
  unknown fields.
- When `Interface: Kind = none`, set `ddd-api: no` in the sizing block and skip the
  api.md prompt — there is no external surface to spec.

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

Follow the skeletons in spec-format.md §7 and §8 exactly.

- **Greenfield**: create both files (creating `spec/` if needed).
- **Delta mode**: apply spec-format.md §1.4 — touch only fields whose answers changed,
  preserve user edits verbatim, append one Changelog line. Never regenerate wholesale.
- Omit sections the user didn't specify — no placeholders. An nfr.md with only
  `## Error contracts` and `## Auth` is correct if the user didn't address performance.
- **Exception**: when `Interface: Kind = none`, always write `Interface: Kind: none`
  explicitly in stack.md — do not omit the section. ddd-api reads this field to determine
  whether to skip.
- `unknown` values: a field the user has no opinion on is written as `unknown`. The
  alignment checks skip unknown fields; the implementing agent uses framework defaults.

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
| Stack | TypeScript / Fastify / REST API / JWT |
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
