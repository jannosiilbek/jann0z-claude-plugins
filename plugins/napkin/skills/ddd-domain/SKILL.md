---
name: ddd-domain
description: Use when the user wants to build a glossary or ubiquitous language, define domain terms, run an event storming, capture domain events/commands/flows, or model the domain language of a system — including "what are the concepts in this domain", "define our terminology", or the step after a project brief exists. Produces spec/glossary.md (terms, entity mappings, enumerations) and spec/flows.md (events, commands, actors, policies) — the artifacts the rest of the napkin DDD pipeline consumes. For the database schema/ERD itself, use erd-modeler instead — this skill produces the glossary that erd-modeler reads.
---

# DDD Domain

Distill a domain into its **ubiquitous language** (`spec/glossary.md`) and its
**event flows** (`spec/flows.md`). These two artifacts are the semantic backbone of the
pipeline: every actor, term, and enum spelling downstream — including the live-tested
data model — traces back to what is written here. Precision now is what makes the
alignment gate provable later.

The artifact grammar is defined once, in
`${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/references/spec-format.md` — read its §1
(cross-cutting rules), §3 (glossary.md) and §4 (flows.md) before writing anything.

## Workflow

### 1. Intake

- Read `spec/brief.md` if it exists — actors, scope, and the sizing decision come from
  there. If it doesn't, offer to run `ddd-brief` first; if the user prefers to proceed,
  work from their description and state assumptions explicitly.
- If `spec/glossary.md` or `spec/flows.md` exist, read them fully — you are in
  **delta mode** (stage 5).
- Read `references/event-storming.md` for the storming method.

### 2. Storm the flows

Work the domain narrative chronologically, as an event-storming session in text:

- **Events** — the facts, past tense ("Student enrolled"). Find the core lifecycle
  events first, then the unhappy paths the brief implies.
- **Commands** — the intents that cause events, imperative ("Enroll student").
- **Actors** — who issues each command; must come from the brief's actor list (extend it
  via the glossary if storming reveals a missing actor).
- **Policies** — automations: `Whenever <Event>, then <Command>`.
- **Bounded contexts**: only when the domain is genuinely large (see the heuristic in
  `references/event-storming.md`) note a `- Context:` field per flow and per term.
  Don't invent contexts for a domain that is one context — most are.

### 3. Write spec/flows.md

Follow spec-format.md §4: one `## FL-xxx — <name>` per flow, numbered steps each
starting with the closed kind `Command:` / `Event:` / `Policy:`.

### 4. Distill spec/glossary.md

Follow spec-format.md §3. The glossary is the single source of naming truth:

- One `### <Term>` per concept — singular, Capitalized, the word the domain experts
  actually use.
- `- Definition:` says what the term means *in this domain* — never a restatement of
  the word itself.
- `- Maps to: ERD: <table_name>` on every concept that owns persisted rows —
  **including relationship concepts that become bridge tables** (an *Enrollment*, a
  *Loan*): the alignment check requires every future DBML table to trace to a term, so
  name the relationship now, in domain language, before it becomes `student_courses`.
- Pure roles or system actors that own no rows (a *Registrar*, a *System*) get a term but
  **no `Maps to:` line at all** — simply omit it. Never write a placeholder such as
  `Maps to: —`, `Maps to: none`, or `Maps to: N/A`: the gate reads any `Maps to:` value
  that isn't `ERD: <table_name>` as malformed (AL-15).
- **Enumerations**: every closed value set, with exact, final spellings — these flow
  verbatim into DBML enums and then into live-tested SQL. `canceled` vs `cancelled` is
  a contract, not a style choice: preserve whatever spelling the user/domain uses, and
  never respell later.
- `- Forbidden synonyms:` wherever the domain has trap words (Client/Customer,
  User/Member) — the alignment gate warns when downstream prose uses them.

### 5. Delta mode

When updating existing artifacts, apply spec-format.md §1.4, plus the rules specific to
language artifacts:

- A user-edited `Definition:` is the user's voice — never overwrite it silently. If the
  definition has become wrong, show old vs. new and ask.
- Retire a term or flow by deprecation note in the changelog, never by deletion —
  downstream artifacts may still reference it.
- New flows take the next free `FL-` id; never renumber.

### 6. Gate

Run the **self-correcting exit gate** (ddd-align → "Self-correcting exit gate"): fix every
**error** routed to `glossary.md` / `flows.md` (e.g. a non-glossary actor, a malformed
`Maps to`, an undefined enumeration) and re-run until clean (≤3 passes) before reporting:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/
```

At this stage the gate proves internal consistency (actor closure, policy shapes,
structure). Glossary↔DBML checks activate automatically once erd-modeler has produced
`spec/data/model.dbml`.

### 7. Report

```
## Domain report — <project name>

### Glossary
| Term | Maps to | Notes |
|------|---------|-------|
| Student | ERD: students | |
| Enrollment | ERD: enrollments | bridge: Student↔Course |
| Registrar | — | role, no rows |

### Enumerations
| Enumeration | Values |
|-------------|--------|
| enrollment_status | enrolled, completed, dropped |

### Flows
- FL-001 — Enroll in a course (3 steps, 1 policy)

Alignment gate: ✅ ok
📄 Saved: spec/glossary.md, spec/flows.md
➡️ Next: run ddd-usecases to derive use cases from these flows
```

In delta mode, add a "Changed / preserved" line per artifact. The ➡️ pointer is the
**last line** of the report — nothing after it.
