# Canvas format

## Full document structure

```markdown
# [Product name]
> [One-line vision]

**What it is:** [One or two sentences. What the product does, for whom.]
**Who it's for:** [One sentence. The specific user and their context.]
**What makes it different:** [One sentence. The core differentiator.]

---

## Personas

### [Group name]

#### [Persona name]
**Role:** [One sentence. Who this person is and what context they operate in.]
**Goal:** [One sentence. The job they're trying to get done with this product.]
**Access:** [One line. How they interact — e.g. MCP server, terminal CLI, their own agent, browser, SMS, API.]
**Friction:** [One sentence. The biggest thing that slows or blocks them.]

---

## Technical Constraints

#### [Constraint name]
**What:** [One sentence. The architectural decision, platform commitment, or hard technical reality.]
**Shapes:** [One or two sentences. How this constrains feature design — what it makes easier, harder, or impossible.]
**Locked by:** [Optional. One line. The specific tech, vendor, API, or commitment that makes this fixed.]

---

## Glossary

#### [Term]
**Means:** [One sentence. What this term means in this product's context.]
**Disambiguates:** [Optional. One line. What it's not, or how it differs from a term people confuse it with.]

---

## Features

### [Section name]

#### [Feature name]
**What:** [One sentence. User-facing. What does this thing do?]
**Why it matters:** [One or two sentences. The job it does or problem it solves.]
**Sharpest constraint:** [One sentence. The hardest thing to get right.]
**Enabled by:** [Optional. One line naming the technology or approach that makes this feasible.]
```

The intro block is written once, on first commit. All three fields are required —
if any can't be filled without guessing, ask one question before proceeding.

The section order is fixed: **Personas → Technical Constraints → Glossary → Features**.
Not every section needs entries on day one; add sections as the product takes shape.

---

## Sections

Features are grouped under named sections. Sections surface the product's logical
structure and keep the canvas readable as it grows.

**Rules:**
- Every feature must be inside a section. No feature sits directly under `## Features`.
- Section names are 1–3 words, noun phrases. Not verb phrases. Not sentences.
- A section needs at least one feature. Empty sections must be removed.
- The skill owns section organization proactively — the user can rename or reorganize at any time.

**Common section names:** Core, Onboarding, Growth, Monetization, Collaboration,
Admin, Developer Experience. Let the product's domain drive the naming — group by
user journey or problem space, not technical layer.

---

## Personas

Users of the product, grouped by type. Sections (### groups) are required — same rules
as Feature sections: noun phrase, 1–3 words, no verb prefix, no empty groups.

**Entry template:**

```markdown
#### [Persona name]
**Role:** [One sentence. Who this person is and what context they operate in.]
**Goal:** [One sentence. The job they're trying to get done with this product.]
**Access:** [One line. How they interact — e.g. MCP server, terminal CLI, their own agent, browser, SMS, API.]
**Friction:** [One sentence. The biggest thing that slows or blocks them.]
```

**Field rules:**

- **Persona name** — Noun phrase, 2–4 words. Not a verb phrase. Does not start with a verb.
- **Role** — Exactly one sentence. Who this person is, in what context. Not a job title alone.
- **Goal** — Exactly one sentence. The job they are trying to do with this product.
- **Access** — One line. The channel(s) they use: MCP server, terminal CLI, their own agent, browser, SMS, API integration. Multiple channels comma-separated. No sentence terminator required.
- **Friction** — Exactly one sentence. The biggest blocker or slowdown they face.

**Example:**

```markdown
### Builders

#### Solo indie hacker
**Role:** A solo developer shipping and validating products without a team.
**Goal:** Move from idea to launched product without operational overhead.
**Access:** terminal CLI, MCP server
**Friction:** Context switching between disconnected tools fragments their flow.
```

---

## Technical Constraints

Architectural decisions, platform commitments, and hard technical realities that shape
what features are possible and how they must be designed. Flat — no ### groups.

**Entry template:**

```markdown
#### [Constraint name]
**What:** [One sentence. The architectural decision, platform commitment, or hard technical reality.]
**Shapes:** [One or two sentences. How this constrains feature design — what it makes easier, harder, or impossible.]
**Locked by:** [Optional. One line. The specific tech, vendor, API, or commitment that makes this fixed.]
```

**Field rules:**

- **Constraint name** — Noun phrase, 2–4 words. Not a verb phrase.
- **What** — Exactly one sentence. The technical fact or decision.
- **Shapes** — One or two sentences. How this changes what features are in scope, how they must be designed, or what trade-offs they carry.
- **Locked by** *(optional)* — One line. The specific commitment: a vendor, API contract, licensing constraint, or technical dependency. Use when what locks this in isn't obvious from the What field.

**Example:**

```markdown
#### Cloud-only deployment
**What:** All application data lives in managed cloud infrastructure with no local persistence layer.
**Shapes:** Features requiring offline access or local-first sync are out of scope; all operations assume network availability and carry cloud-storage cost implications.
**Locked by:** AWS S3 + Aurora Serverless — contractual commitment through 2027.
```

---

## Glossary

Shared definitions for terms used across the canvas. Flat — no ### groups.

**Entry template:**

```markdown
#### [Term]
**Means:** [One sentence. What this term means in this product's context.]
**Disambiguates:** [Optional. One line. What it's not, or how it differs from a term people confuse it with.]
```

**Field rules:**

- **Term name** — 1–3 words. Noun phrase or technical term. Not a verb phrase.
- **Means** — Exactly one sentence. Product-context definition — what this word means here, not a dictionary entry.
- **Disambiguates** *(optional)* — One line. Used when the term is commonly confused with another. State the other term and the difference.

**Example:**

```markdown
#### Agent
**Means:** An autonomous process that invokes tools and makes sequencing decisions without per-action user confirmation.
**Disambiguates:** Not a chatbot (reactive, single-turn) or a rule-based automation (no LLM reasoning).
```

---

## Feature entry template

```markdown
#### [Feature name]
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

### Sentence counts by section

| Section | Field | Count |
|---------|-------|-------|
| Personas | Role | exactly 1 |
| Personas | Goal | exactly 1 |
| Personas | Access | 1 line (no sentence required) |
| Personas | Friction | exactly 1 |
| Technical Constraints | What | exactly 1 |
| Technical Constraints | Shapes | 1–2 |
| Technical Constraints | Locked by | 1 line (no sentence required) |
| Glossary | Means | exactly 1 |
| Glossary | Disambiguates | 1 line (no sentence required) |
| Features | What | exactly 1 |
| Features | Why it matters | 1–2 |
| Features | Sharpest constraint | exactly 1 |
| Features | Enabled by | 1 line (no sentence required) |

---

## Style lock

When adding any entry (feature, persona, constraint, or term):

1. Read the two most recent entries **from anywhere on the canvas** to establish register (technical vs. product/user language). If the canvas has no existing entries, skip register calibration.
2. Compute per-field word count against **same-section-type entries only** (personas against personas, constraints against constraints, glossary against glossary, features against features). Field names differ across types — cross-type comparison is meaningless.
3. Land within ±20% of that per-field average. Skip word-count calibration if no same-type entries exist yet (first entry of that section type).
4. Match register canvas-wide: if existing entries use technical language, match it; if they use product/user language, match that.
5. Never adjust existing entries to match the new one — the existing entries are the baseline.

---

## What doesn't belong in the canvas

- Conversation references: "as discussed", "as mentioned", "building on", "earlier"
- Implementation details beyond what the constraint implies
- Open questions — those stay in the conversation
- Verb-phrase feature names — a sign the idea isn't concrete yet

---

## Examples

### Core

#### Offline mode
**What:** Users can read and edit documents without an internet connection.
**Why it matters:** Network drops during travel make the app unusable; work shouldn't
wait for reconnection.
**Sharpest constraint:** Conflict resolution when the same document is edited offline
on two devices.
**Enabled by:** CRDTs (Yjs) for automatic merge of concurrent offline edits.

### Growth

#### Guest access
**What:** Anyone with a link can view a project without signing up.
**Why it matters:** Sharing work with stakeholders who won't create accounts is a
constant friction point.
**Sharpest constraint:** Deciding what guests can and cannot see — overly permissive
leaks sensitive context.

#### Version history
**What:** Users can browse and restore any previous version of a document.
**Why it matters:** Accidental overwrites are unrecoverable today; people work around
this with duplicate files.
**Sharpest constraint:** Storage cost grows unboundedly without a clear retention
policy.
