# Canvas format

## Full document structure

```markdown
# [Product name]
> [One-line vision]

**What it is:** [One or two sentences. What the product does, for whom.]
**Who it's for:** [One sentence. The specific user and their context.]
**What makes it different:** [One sentence. The core differentiator.]

---

## Features

[entries]
```

The intro block is written once, on first commit. All three fields are required —
if any can't be filled without guessing, ask one question before proceeding.

---

## Feature entry template

```markdown
### [Feature name]
**What:** [One sentence. User-facing. What does this thing do?]
**Why it matters:** [One or two sentences. The job it does or problem it solves.]
**Sharpest constraint:** [One sentence. The hardest thing to get right.]
**Enabled by:** [Optional. One line naming the technology or approach that makes this feasible.]
```

`**Enabled by:**` is optional — include it only when the technology meaningfully changes
how you'd scope or evaluate the feature. Omit it when it's obvious or irrelevant.
No sub-bullets. No prose after the last field.

---

## Field rules

**Feature name** — Noun phrase, 2–4 words. Not a verb phrase ("Add dark mode" →
"Dark mode"). Not a full sentence. Does not start with a verb.

**What** — Exactly one sentence. User-facing language, not implementation language.
Should complete the sentence "Users can now…". No semicolons splitting it into two
thoughts.

**Why it matters** — One or two sentences max. Answers: what job does this do, or
what breaks without it? Not a restatement of What.

**Sharpest constraint** — Exactly one sentence. The hardest design, technical, or
product decision embedded in this feature. Forces clarity on what makes it
non-trivial.

**Enabled by** *(optional)* — One line. The specific technology, API, or architectural
approach that makes this feature tractable or changes its scope. Examples: "Claude
Agent SDK with MCP tool calls", "WebRTC data channels", "PGlite in-browser SQLite".
Use it when the tech isn't obvious and knowing it would change how you'd evaluate
the feature.

---

## Style lock

When adding a new entry to a non-empty canvas:

1. Read the two most recent entries.
2. Compute the word count per field across all existing entries.
3. Write the new entry to land within ±20% of the per-field average.
4. Match register: if existing entries use technical language, match it; if they
   use product/user language, match that.
5. Never adjust existing entries to match the new one — the baseline is the canon.

---

## What doesn't belong in the canvas

- Conversation references: "as discussed", "as mentioned", "building on", "earlier"
- Implementation details beyond what the constraint implies
- Open questions — those stay in the conversation
- Verb-phrase feature names — a sign the idea isn't concrete yet

---

## Examples

### Offline mode
**What:** Users can read and edit documents without an internet connection.
**Why it matters:** Network drops during travel make the app unusable; work shouldn't
wait for reconnection.
**Sharpest constraint:** Conflict resolution when the same document is edited offline
on two devices.
**Enabled by:** CRDTs (Yjs) for automatic merge of concurrent offline edits.

### Guest access
**What:** Anyone with a link can view a project without signing up.
**Why it matters:** Sharing work with stakeholders who won't create accounts is a
constant friction point.
**Sharpest constraint:** Deciding what guests can and cannot see — overly permissive
leaks sensitive context.

### Version history
**What:** Users can browse and restore any previous version of a document.
**Why it matters:** Accidental overwrites are unrecoverable today; people work around
this with duplicate files.
**Sharpest constraint:** Storage cost grows unboundedly without a clear retention
policy.
