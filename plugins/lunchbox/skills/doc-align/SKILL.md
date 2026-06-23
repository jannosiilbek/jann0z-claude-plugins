---
name: doc-align
description: Iteratively refactors all .md documentation in a project until every claim has exactly one owner, zero overlap, zero vagueness, zero AI slop, and positive-only framing throughout. Use this skill whenever asked to "clean up docs", "align documentation", "fix the docs", "remove AI slop", "declutter", "organize markdown files", "docs are a mess", or any time documentation quality, redundancy, clarity, or structure across multiple .md files is the concern. Invoke proactively after large doc changes, spec rewrites, or any time documentation has grown organically and needs a coherence pass.
argument-hint: "[plan|edit]"
---

# Doc Align

Scans every `.md` file in the project, detects documentation violations, and fixes them — looping until a full pass finds zero violations. Works on markdown documents only: CLAUDE.md, READMEs, spec files, ADRs, runbooks. Never touches code files.

## Mode

| Argument | Behavior |
|----------|----------|
| *(none)* or `plan` | Inventory → detect → produce typed operation list → present to user → stop. No files touched. |
| `edit` | Full autonomous loop: plan → execute → verify → repeat until convergence or 5-pass cap. |

## Scope

**Include:** all `.md` files reachable from the project root.

**Exclude:** `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `coverage/`, `.cache/`, any `*-workspace/` directory, files larger than 100 KB (flag, skip).

**Link surfaces to update after renames:** all `.md` files, `plugin.json`, `evals.json` path references, skill `references/` entries.

## Phase 1 — Inventory

Build a lightweight index before reading any file in full:

1. Scan the project tree for `.md` files (respecting exclusions)
2. For each file record: path, size in bytes, first heading, one-line purpose inferred from filename + first heading alone
3. Sort by size ascending — process smaller files first
4. Report to yourself: N files found, total size, files skipped (too large)

Read full content only for files the current phase needs. In plan phase: read all non-oversized files. In execute phases: read only files involved in the current operation batch.

## Phase 2 — Plan

Produce a flat ordered list of operations. Each entry:

```
TYPE       RENAME | MERGE | DELETE | EDIT
TARGET     file path (or source → target for MERGE)
VIOLATION  violation code (see rubric)
DETAIL     one sentence: what changes and why
```

**Ownership tiebreaker** — when the same claim appears in multiple docs, the owner is:
1. The broadest-scope document (CLAUDE.md > README.md > spec/*.md > component docs)
2. Among equal-scope: the document whose filename matches the subject noun of the claim
3. All other occurrences → replace with a cross-reference link

**Operation ordering:**
- RENAME before EDIT (fix links before editing content)
- DELETE only after confirming zero inbound links across all link surfaces
- MERGE: target is the owner; source is deleted after unique content is absorbed

**Only include operations that represent a real change.** Never emit a no-op entry (e.g. "RENAME file → same file — no rename needed"). If no operation is required for a file, omit it from the table entirely.

**In `plan` mode:** present the operations as a table, then ask: *"Proceed with these changes? (yes / adjust)"* — stop and wait.

**In `edit` mode:** proceed directly to Phase 3.

## Phase 3 — Execute

Consume the plan verbatim. If execution uncovers something the plan missed, add it to a **deferred list** for the next iteration — do not modify the current plan mid-flight.

**RENAME protocol:**
1. Apply renames leaf-first (no collision risk)
2. After each rename, grep all link surfaces for the old path and update every reference found
3. Report unresolvable references as warnings — do not halt

**DELETE:** only after zero inbound links confirmed across all link surfaces.

**MERGE:** append unique content from source into target; skip content already present; delete source.

## Phase 4 — Verify and loop

After executing, run a full violation scan across all `.md` files.

- **0 violations found** → emit completion report, stop.
- **Violations remain, count dropped** → plan and execute another pass (up to 5 total).
- **Count did not drop** → mark remaining as UNRESOLVABLE, include in report, stop.
- **5-pass cap reached** → stop, report remaining violations.

No user approval required for passes 2–5 in `edit` mode.

## Violation types

See `references/violation-rubric.md` for detection rules and fix patterns per type.

| Code | Catches |
|------|---------|
| `OVERLAP` | Same claim in 2+ documents |
| `WRONG_OWNER` | Claim in the wrong document type for its function |
| `WRONG_SCOPE` | Global rule buried in a per-component or sub-scope doc |
| `SLOP` | Throat-clearing, hedging, banned vocabulary, low information density |
| `VAGUE` | Terms without concrete referents |
| `NEGATIVE_FRAMING` | "don't/never/avoid" with no positive alternative in the same paragraph |
| `DENSE_CLAIM` | More than one assertable fact in a single paragraph |
| `STALE_FILE` | Zero inbound links and no unique claims |
| `BAD_FILENAME` | Filename doesn't reflect the document's function |
| `DEAD_LINK` | Reference to a file that does not exist |

## Completion report

```
## Doc Align — Complete

Passes:        N
Files touched: N
Operations:    N RENAME  N MERGE  N DELETE  N EDIT

[Only if unresolved violations remain:]
Unresolved (N):
- <file>  <CODE>  <one-line description>

All other violations: 0
```
