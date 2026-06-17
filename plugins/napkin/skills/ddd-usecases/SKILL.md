---
name: ddd-usecases
description: Use when the user wants to write use cases, user stories, acceptance criteria, EARS requirements, or testable requirements for a system — including "derive the use cases", "write the acceptance criteria", or the step after a glossary/flows exist in the napkin DDD pipeline. Produces spec/usecases.md with UC-xxx use cases, EARS acceptance criteria, and data assertions that erd-modeler live-tests 1:1 against a real in-memory Postgres. For the domain terms themselves use ddd-domain; for the database schema use erd-modeler; for the task breakdown use ddd-plan.
---

# DDD Use Cases

Derive `spec/usecases.md` from the domain flows: every use case gets a stable `UC-xxx`
id, EARS-shaped acceptance criteria, and — the part that keeps this spec honest —
**data assertions** that the erd-modeler stage executes 1:1 against a real in-memory
Postgres. A use case here is not prose that rots; it is a claim the pipeline proves.

The artifact grammar is defined once, in
`${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/references/spec-format.md` — read its §1
(cross-cutting rules) and §5 (usecases.md) before writing anything. Read
`references/ears-and-assertions.md` for the EARS patterns and the assertion bridge.

## Workflow

### 1. Intake

- Read `spec/glossary.md` and `spec/flows.md` — both are required inputs. If they're
  missing, route to `ddd-domain` first (or, if the user insists on proceeding, derive a
  minimal glossary/flows pair on the way — never produce use cases whose actors and
  triggers point at nothing).
- Read `spec/brief.md` for scope and the sizing decision.
- If `spec/usecases.md` exists, read it fully — **delta mode** (stage 4).

### 2. Derive the use-case set

- Every `Command:` in flows.md is a use-case candidate — the actor wants something done.
- Every `Policy:` is a system-triggered use-case candidate (actor: the system's
  operator-of-record term, or the policy's acting term).
- Key read paths implied by the brief ("staff look up visit history") are use cases
  too, even though they emit no event.
- Confirm with the user only candidates that are genuinely ambiguous (one question at a
  time); otherwise proceed and let the report show what was derived.

Don't manufacture use cases the brief doesn't imply — the set should be exactly as big
as the domain, and the sizing decision in the brief bounds how much is in play.

### 3. Write each use case

Per spec-format.md §5:

- `- Actor:` — a glossary term, exact spelling.
- `- Trigger:` — the Command or Event name from flows.md, verbatim.
- `- Main flow:` — numbered steps in domain language.
- `- Acceptance criteria:` — ≥1 per UC, each in an EARS shape (see references). Write
  criteria that are *checkable*: a concrete condition and a concrete observable
  behavior. "THE SYSTEM SHALL work correctly" passes no review.
- `- Data assertions:` — each `DA-n: <description> => expect: <assertion>` with the
  assertion drawn **strictly** from the closed grammar. Aim for **two per UC where the
  domain allows: one positive proof and one negative** (`error ~ …`) guarding the
  integrity rule the UC depends on. These become erd-modeler's live-test blocks
  verbatim (`-- usecase: UC-xxx/DA-n`), so every operator you invent here is a test
  that can never run — the alignment gate rejects anything outside the grammar.

### 4. Delta mode

Apply spec-format.md §1.4, plus:

- Existing UC ids are immutable; new UCs take the next free number — never renumber.
- A UC that no longer applies gets `- Status: deprecated`, never deletion (plan tasks
  may cite it).
- Changed criteria/assertions are edited in place within their UC; everything else is
  preserved byte-for-byte.

### 5. Gate

Run the **self-correcting exit gate** (ddd-align → "Self-correcting exit gate"): fix every
**error** routed to `usecases.md` (a non-EARS criterion, an out-of-grammar assertion, a
non-glossary actor, a duplicate id) and re-run until clean (≤3 passes) before reporting:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/
```

This proves: EARS shapes (AL-07), assertion grammar (AL-08), actor closure (AL-09),
trigger closure (AL-12), id discipline (AL-10).

### 6. Report

```
## Use-case report — <project name>

| UC | Title | Actor | ACs | DAs (pos/neg) |
|----|-------|-------|-----|---------------|
| UC-001 | Enroll student in course | Registrar | 2 | 1/1 |
| UC-002 | List a student's courses | Student | 1 | 1/0 |

Coverage: N use cases from M flows · every assertion inside the closed grammar
Alignment gate: ✅ ok
📄 Saved to spec/usecases.md
➡️ Next: run erd-modeler — it will turn every data assertion into a live test
   against a real in-memory Postgres
```

In delta mode, add an "Added / changed / deprecated / preserved" line. The ➡️ pointer
is the **last line** of the report — nothing after it.
