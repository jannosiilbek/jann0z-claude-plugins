---
name: ddd-align
description: Use when the user wants to check, validate, or audit the consistency of a spec/ directory — glossary vs data model, use cases vs plan, spec drift, traceability, or "is my spec still aligned". Also runs as the exit gate of every napkin DDD pipeline skill (ddd-brief, ddd-domain, ddd-usecases, erd-modeler, ddd-plan). Mechanically parses spec/ artifacts with a Node harness and proves their cross-references — then judges what a parser can't. Not for designing models or writing specs; it only audits them.
---

# DDD Align

- Audits a `spec/` directory for cross-artifact drift.
- The mechanical work is done by a harness — `scripts/check-align.mjs` — that parses every artifact and **proves** the cross-references (glossary ↔ DBML tables and enums, actors ↔ terms, use cases ↔ plan tasks, data assertions ↔ the closed assertion grammar, use cases ↔ live-test SQL).
- Your job on top of the harness is to judge the things a parser cannot see.

Never hand-verify what the harness verifies. A human-sounding "I checked the glossary
against the model and it looks consistent" is exactly the false-green this skill exists
to eliminate — run the harness and cite its findings instead.

## Workflow

### 1. Locate the spec

The spec directory is `spec/` in the project being worked on, unless the user pointed
somewhere else. If no directory with `ddd:`-marked artifacts exists, say so and stop —
there is nothing to audit (suggest `ddd-brief` to start a spec).

### 2. Run the mechanical check

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/
```

- Add `--require <list>` when auditing a milestone where specific artifacts must exist
  (e.g. `--require glossary,usecases,model,plan` for a "finished" pipeline). Without it,
  partial pipelines are legal — missing artifacts are informational.
- The JSON output contract and the full check list (AL-00…AL-24) are documented in
  `scripts/README.md`. Read it if a finding needs interpreting.

### 3. Judge the residue

The harness proves structure; it cannot judge meaning. Review the artifacts for what's
left — flag, with artifact and location:

- **Vacuous acceptance criteria** — EARS-shaped but content-free ("THE SYSTEM SHALL work
  correctly"). The shape passed AL-07; the substance is your call.
- **Definitions that restate the term** ("An Enrollment is when someone enrolls") —
  a glossary entry that defines nothing invites every reader to invent their own meaning.
- **Sizing vs. artifact mismatch** — a brief sized `delta` next to artifacts whose
  changelogs show wholesale regeneration; or a bug-fix-sized problem statement with a
  ten-task plan (artifact bloat — the pipeline's documented failure mode).
- **Prose drift** — downstream prose using concepts the glossary doesn't name (beyond
  the exact forbidden synonyms AL-13 already catches), or use-case main flows that
  contradict the brief's scope.
- **Stale changelogs** — artifacts whose content visibly changed without a changelog
  entry (compare against git history when available).
- **Deletion instead of deprecation** — when a finding traces to an item that was
  removed outright (a dangling `Implements:` cite, an orphaned flow), say so in terms
  of the spec-format rule: items are retired with `Status: deprecated`, never deleted,
  precisely so citations can't dangle. Recommend restoring the item as deprecated.

Judge only what you can point to. This stage adds findings, never overturns the
harness: a mechanical `error` stays an error.

### 4. Report

Emit the report in this fixed format:

```
## Spec alignment report — <spec path>

### Mechanical findings (check-align.mjs)

| Check | Severity | Location | Message | Fix via |
|-------|----------|----------|---------|---------|
| AL-01 | ❌ error | glossary.md:12 | term "X" maps to missing table `y` | ddd-domain / erd-modeler |

### Judged findings

| Severity | Location | Finding | Fix via |
|----------|----------|---------|---------|
| ⚠️ warn | usecases.md UC-002 | AC-1 is vacuous ("…work correctly") | ddd-usecases |

✅ Aligned — N artifacts, 0 errors, W warnings
```

(or `❌ Drift detected — E errors, W warnings` when the harness exits non-zero.)

The ✅/❌ summary line is the **last line** of the report — routing notes and
recommendations belong in the Fix via column or above the footer, never after it, so
the verdict is always where a reader (or a script) expects it.

The **Fix via** column routes each finding to the skill that owns the artifact:
glossary/flows → `ddd-domain`, use cases → `ddd-usecases`, api → `ddd-api`,
model/DBML → `erd-modeler`, plan → `ddd-plan`, brief → `ddd-brief`. Never edit an
artifact from inside ddd-align — audit and route; the owning skill carries the update
protocol.

## As an exit gate

- The other pipeline skills run stage 2 (harness only) after writing their artifact and append the result to their own report.
- When invoked that way, skip stage 3 — the full judged audit is for explicit `ddd-align` invocations.
- Self-correct first instead of merely reporting the errors.

### Self-correcting exit gate

After writing your artifact(s), run the harness — then loop, do not just report:

1. **Fix what you own.** For every finding of severity **error** whose **Fix via** routes to
   an artifact you wrote **this session**, fix it in place, then re-run the harness.
2. **Bounded.** Repeat until no owned-error remains, or you have run **3 fix passes** (most
   specs clear in one; the cap stops a genuinely hard inconsistency from looping forever).
3. **Don't touch what you don't own.** A finding routed to an upstream artifact (a skill
   earlier in the pipeline owns it) is **surfaced in your report** so it routes back — never
   silently passed, never edited by you.
4. **Warnings** are reported, never looped on.
5. **Report honestly.** Append the final one-line result. If errors remain after 3 passes,
   show them — never hide a failing gate behind a green checkmark.

A clean artifact passes on the first run, so this loop is a **no-op when nothing is wrong**;
it only does work when your output actually drifted.
