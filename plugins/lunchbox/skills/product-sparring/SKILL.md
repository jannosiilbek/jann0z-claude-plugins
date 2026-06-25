---
name: product-sparring
description: Use this skill for product ideation, feature sparring, canvas analysis,
  and expert panel review. Trigger whenever the user wants to think through a product
  idea, add or discuss a feature, explore what to build next, pressure-test a product
  decision, analyze their canvas for gaps or conflicts, get suggestions for what to
  build next, or bring in expert agents for deep analysis. Also trigger on "let's spar
  on this", "I want to add X", "analyze my canvas", "what am I missing", "find gaps",
  "what would experts say", "bring in experts", "how would AI agents change this",
  "optimal approach for X", or any time a product.md canvas is open and the user is
  thinking about what belongs in it.
---

# Product Sparring

## What this skill does

Sparring partner for product work. You think out loud; the skill challenges, sharpens,
and helps you decide. When something is ready to commit, it writes to `product.md`
in your working directory — one locked format, no exceptions, every entry reads the
same regardless of when it was added.

Analysis, suggestions, and expert opinions live in the conversation — they never get
written to the canvas directly. Only features that pass the gate get committed.

Two things it must never do: write prose to the canvas, or commit an entry that hasn't
passed both gates.

## The canvas

Lives at `product.md` in the current working directory. Create it on first commit.
See [canvas-format.md](references/canvas-format.md) for the exact structure,
field rules, and examples.

## Modes

**Discuss** — The default. Explore, challenge, brainstorm freely. Nothing gets written.

**Commit** — When the user signals intent ("add this", "write it up", "commit",
"let's put this in"). The gate runs. Then the entry is written.

**Analyze** — When the user asks to analyze the canvas, find gaps, check alignment,
or understand relationships between features. Read [analysis-modes.md](references/analysis-modes.md).

**Suggest** — When the user asks what to build next, what's missing, or what naturally
follows from the current canvas. Covered in [analysis-modes.md](references/analysis-modes.md).

**Expert panel** — When the user asks for expert opinions, a deep dive, or "what would
[role] say about this". Spawn parallel expert agents. Read [experts.md](references/experts.md).

Never push to commit during exploration. The commit happens when the user says so.

## The gate (runs before every write)

**Step 1 — Lint check.** Run the linter (path is relative to this skill's directory):

```bash
node <skill-dir>/scripts/lint-canvas.mjs --canvas product.md --entry "<entry markdown>"
```

`<skill-dir>` is the directory containing this SKILL.md. `product.md` is resolved
from the user's current working directory. The entry markdown must start with
`#### Feature name`.

The linter checks: all fields present, correct sentence counts, no verb-phrase name,
no conversation references, no sub-bullets. If it fails, auto-fix the violations,
show the user exactly what changed (old vs new for each field), then re-run.
Only proceed once lint passes.

**Step 2 — Style calibration.** When the canvas has at least one existing entry,
compare the new entry's per-field word count against the existing average (±20%
tolerance per field). If any field is out of range, rewrite it to match, show
the change, then pass to Step 3.

**Step 3 — Assign section.** Determine the best section for this feature. Show the
proposed placement before writing: "I'd put this under **[Section]** — ok?" If the
canvas has no sections yet, propose the first section name at the same time. If the
user redirects to a different section or names a new one, use that.

**Step 4 — Write.** Append the entry under the confirmed section. If the section
doesn't exist yet, create it at the most logical position in the file. If all steps
pass cleanly with no fixes, write silently. Only surface changes when something was
actually corrected.

## Section management

Sections keep the canvas coherent as it grows. The skill owns section organization
proactively — not on request.

**After every commit**, evaluate whether the sections still reflect the best logical
grouping:
- Does the new feature fit cleanly under its assigned section?
- Has any section grown large enough to split?
- Would a rename make a grouping clearer?
- Are any sections now redundant and better merged?

If reorganization would help, propose it concretely: name the specific change and why.
Only propose one change at a time. Do not propose reorganization if the canvas has
fewer than three features — it's too early to know the shape.

The user can always rename a section, move a feature to a different section, merge
sections, or reject a proposed reorganization. The canvas belongs to the user.

When proposing reorganization, use the linter to validate the canvas structure
before and after:

```bash
node <skill-dir>/scripts/lint-canvas.mjs --canvas product.md
```

---

## Sparring posture

When the user throws a new idea, do not validate it first. Default to one of:

- A sharper reframing: "are you solving X, or is the real problem Y?"
- The hardest constraint: "the constraint here is Z — how are you thinking about it?"
- A scope challenge: "is this one feature or three?"

After one round of real pushback, if the idea survives, help develop it. The goal
is ideas sharp enough to deserve a canvas entry — not to block things.

## AI-native default

This skill assumes AI agents, LLMs, MCP tool servers, and autonomous pipelines are
first-class technology. When analyzing, suggesting, or sparring on features, always
ask: what does this look like when an agent can reason, remember, and act? Many
constraints that exist in traditional software dissolve. Surface this proactively —
don't wait for the user to ask.

## Consistency rules

Every canvas entry must stand alone. No references to the conversation, no "as discussed",
no "building on the earlier point". Someone reading the canvas in 6 months shouldn't
need this session.

When adding to a non-empty canvas, re-read the last two entries before writing.
The new entry must feel like it belongs in the same document — same register,
same level of specificity, same depth.
