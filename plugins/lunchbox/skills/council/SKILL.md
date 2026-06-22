---
name: council
description: Convenes a parallel council of six independent expert agents — architecture, DRY, zero-vagueness, SOLID, project alignment, and semantic alignment — each reviewing from a fully isolated context with no shared state and no conversation history. Use this skill immediately after any coding iteration finishes: feature implementation, refactor, bug fix, or any substantive code change that needs rigorous multi-domain validation before being considered done. Invoke on: "run council", "council review", "expert panel", "validate the work", "deep review", "is this solid?", "pressure-test this", or any signal that a coding task has just completed and the work needs independent expert judgment.
---

# Council

After a coding iteration, convene six expert agents in parallel. Each operates in a clean, isolated context — no shared state, no conversation history, no cross-contamination. The architecture expert does not see the SOLID expert's findings. The clarity expert is not anchored by the DRY analysis. Isolation is intentional: it forces each expert to reason from the code alone, which catches what a single reviewer — or a reviewer who saw another's notes first — would miss.

The council returns one verdict: **ship**, **revise**, or **rework**, with every finding mapped to a specific location and a concrete suggestion.

---

## Step 1: Collect context

Run these two commands in the current repository:

```bash
git diff HEAD
git diff HEAD --name-only
```

**Project conventions (`projectContext`):** Read the project's `CLAUDE.md` if it exists. Extract the section most relevant to the changed files — naming conventions, layering rules, module structure, domain vocabulary. Aim for 200–400 words. If no `CLAUDE.md` exists, write a brief summary of conventions visible in the changed code area.

**Artifacts (`artifacts`):** Find every document or artifact that makes claims about the changed area — README sections, architecture docs, ADRs, spec files, inline doc-comments, type definition files, OpenAPI/schema files, any `.md` or spec file under `docs/`, `spec/`, or the root. Read the ones most likely to be affected by or to conflict with the changes. Limit to the 5 most relevant; include their full content verbatim, separated clearly by filename headers.

This is the fuel for the Semantic Alignment expert — the agent whose sole job is to catch "one source says turn right, another says turn left." If artifacts are thin or absent, say so explicitly in the field; the expert needs to know what it has to work with.

---

## Step 2: Build the args object

Assemble exactly this — nothing more:

```
diff           → full output of `git diff HEAD`
changedFiles   → output of `git diff HEAD --name-only` (newline-separated)
projectContext → 200–400 word conventions summary or CLAUDE.md excerpt
artifacts      → full content of up to 5 relevant docs, each prefixed with "=== filename ==="
```

No conversation history. No unrelated files. No extra context beyond what is listed here. Each expert receives only the diff, their mandate, and the one field they need. Everything outside these boundaries is noise that degrades expert focus.

---

## Step 3: Launch the expert council

Two paths depending on what tools are available. Both produce the same output.

### Path A — Workflow tool available (preferred)

Read `references/workflow-script.js` from this skill's base directory (the path shown when this skill loaded). Pass its full contents verbatim as the `script` parameter to the Workflow tool, and pass the args object from Step 2 as `args`. The workflow handles parallelism and synthesis internally and returns a structured report object. Skip to Step 4.

### Path B — Workflow tool not available (fallback)

If the Workflow tool is not in your toolset, run the council directly using parallel Agent calls. **Spawn all six experts in a single message** — do not run them one at a time; parallelism is what makes the council fast and uncontaminated.

Read `references/experts.md` from this skill's base directory. It contains the exact mandate for each expert. For each expert, construct their prompt as:

```
[expert mandate from references/experts.md]

--- CODE CHANGES ---
Files changed:
[changedFiles]

Diff:
[diff]
--- END CODE CHANGES ---
```

Launch all six as parallel Agent calls in one message. Collect their structured findings.

Then run a seventh synthesis Agent call with:

```
Synthesize these expert reviews into a prioritized report with an overall verdict of "ship", "revise", or "rework".

Verdict rules:
- "ship": no critical or major issues
- "revise": major issues present but structure is sound; targeted fixes sufficient
- "rework": critical architecture or alignment issues requiring structural changes first

For every priority fix: include domain, exact location, the issue, and a concrete suggestion.
Findings flagged by multiple experts independently rank higher.

Expert findings:
[JSON of all six expert results]
```

Use the synthesis result to populate the report in Step 4.

---

## Step 4: Present the report

Format the returned report object as:

```
## Council Report

**Verdict: SHIP / REVISE / REWORK**

[report.summary]

### Priority Fixes
1. **[domain]** `[location]`
   [issue]
   → [suggestion]

2. ...

### Expert Verdicts
| Expert              | Severity | Verdict |
|---------------------|----------|---------|
| Architecture        | ...      | ...     |
| DRY                 | ...      | ...     |
| Clarity             | ...      | ...     |
| SOLID               | ...      | ...     |
| Project Alignment   | ...      | ...     |
| Semantic Alignment  | ...      | ...     |
```

Verdict guidance:
- **SHIP** — no critical or major issues. State it plainly. List minor notes below the table.
- **REVISE** — major issues present; structure is sound. Walk through priority fixes in order.
- **REWORK** — critical issues present. Lead with what is structurally broken before listing targeted fixes.

Close with: "Want me to address any of these findings?"
