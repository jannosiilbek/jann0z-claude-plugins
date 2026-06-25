# Analysis modes

## When to run analysis

Run when the user asks to:
- Analyze the canvas ("analyze this", "find gaps", "what am I missing")
- Check feature alignment ("do these fit together", "any conflicts")
- Get suggestions ("what should I build next", "what follows from this")
- Understand dependencies ("what does X depend on", "what does X unlock")

Analysis output lives in the conversation only. It never writes to the canvas.
When analysis surfaces a new feature worth adding, it enters Discuss mode —
the user decides whether to commit it.

---

## Canvas analysis — what to check

Read `product.md` before running any analysis. Work from what's actually there.

### 1. Cross-feature conflicts

Features that make contradictory assumptions or create contradictory states.
Look for:
- Two features that both own the same data or state in incompatible ways
- Features whose constraints directly clash (one needs speed, another needs consistency)
- Features that together create an edge case neither addresses alone

Name the specific pair and the exact conflict. Not "these might conflict" — state
what breaks.

### 2. Implicit dependencies

Features that silently depend on infrastructure or behavior another feature must
provide first. If the dependency isn't obvious to someone reading the canvas,
name it. Flag ordering: which feature needs to exist before the other can work?

### 3. Gaps — implied but missing

Features the existing set implies but doesn't include. If offline mode and guest
access both exist, conflict resolution UI is probably implied. If version history
exists, a storage retention policy feature is implied. Surface the implication and
name the missing piece.

### 4. Scope creep risk

Features whose constraint signals they're carrying more than one feature's worth
of complexity. If the constraint is conjunctive ("X and Y and Z"), the feature is
likely two features. Flag it.

### 5. AI/agent opportunities not yet captured

This is the most important check. For each feature on the canvas, ask: what does
this look like when an AI agent is doing it instead of the user? What collapses
from a multi-step user flow into a single agent action? What becomes proactive
instead of reactive?

Then ask: what's missing from the canvas entirely because it wasn't imaginable
without agents? Surface these as suggestions, not critiques.

### 6. Persona coverage

Every persona's `Goal` should be served by at least one feature. Every feature should
be relevant to at least one persona. Flag both directions:
- Personas with no feature serving their goal
- Features that no defined persona would use

### 7. Glossary coverage

Key terms that appear in 2+ entries across any section and are not universally obvious
should have a glossary definition. Every glossary term should appear in at least one
other section — an orphaned definition adds noise without alignment value.

### 8. Foundation coverage

Every foundation component should power at least one feature — a component nothing builds on is
dead engine weight. Every feature should ultimately rest on a foundation component; if a feature
needs an engine capability the Foundation doesn't list, that gap is worth surfacing. Flag both
directions:
- Foundation components no feature draws on
- Features that depend on an engine capability absent from Foundation

---

## Analysis output format

Use this structure in the conversation response:

```
## Canvas analysis

**Conflicts**
- [Feature A] × [Feature B]: [what breaks and why]

**Dependencies**
- [Feature A] must exist before [Feature B] can work: [why]

**Gaps**
- [Missing feature name]: implied by [Feature A] + [Feature B] because [reason]

**Persona coverage gaps**
- [Persona name]: goal not served by any feature
- Feature "[name]": no defined persona for whom this is relevant

**Glossary gaps**
- "[Term]" appears in N entries — no definition
- Glossary term "[Term]": not referenced in any other section

**Foundation coverage gaps**
- Component "[name]": no feature draws on this
- Feature "[name]": depends on [capability] not listed in Foundation

**Scope risks**
- [Feature name]: constraint suggests this is really two features — [what they are]

**AI/agent opportunities**
- [Feature name or new idea]: [what an agent-native version of this looks like]
```

Omit any section where there's nothing real to say. Do not pad with observations
that don't surface an actual issue or opportunity.

---

## Suggestions mode

When the user asks what to build next or what's missing:

1. Read the full canvas.
2. Run the gap and AI/agent opportunity checks from the analysis above.
3. Rank by: (a) implied by existing features, (b) highest user value, (c) most
   changed by AI/agents.
4. Surface 2–3 concrete suggestions, each as a brief pitch: feature name,
   what it does, why it follows from the current canvas.

Do not suggest things that are already implied by existing features' constraints
without naming the connection. Do not suggest abstract capabilities — every
suggestion should be a concrete feature the user could write a canvas entry for.

If a suggestion sparks interest, move into Discuss mode naturally.

---

## Alignment gate

Triggered by: "check alignment", "run alignment gate", "is the canvas consistent",
"validate the canvas". Runs after every commit and on demand.

All issues must be resolved before the canvas is considered complete — no partial passes.

### Checks

**1. Glossary coverage**
- Any term appearing in 2+ entries across any section that is not universally obvious
  must have a glossary definition. Flag the term and each entry that uses it.
- Every glossary term must appear in at least one other section. Flag orphaned definitions.

**2. Persona ↔ Feature coverage**
- Every persona's `Goal` must be served by at least one feature.
- Every feature must be relevant to at least one persona.

**3. Constraint ↔ Feature consistency**
- No feature may contradict a technical constraint. Flag the specific pair and state
  what conflicts.

**4. Access ↔ Feature coherence**
- Persona `Access` channels (MCP server, terminal, SMS, browser, agent, API…) must be
  reflected somewhere in the feature set. If a channel appears in personas but no feature
  accounts for it, flag the gap.

**5. Foundation ↔ Feature coherence**
- Every foundation component must power at least one feature.
- No feature may depend on an engine capability absent from Foundation. Flag both directions and
  name the specific component or feature.

**6. Ambiguity scan**
Banned phrases across every field of every entry:
`some`, `many`, `various`, `etc`, `and so on`, `usually`, `often`, `typically`,
`might`, `may` *(when not clearly intentional)*, `could`, `any user`, `most users`,
`in general`

Flag the entry name, field name, and exact phrase.

**7. Duplicate intent**
Two entries (any section) that describe the same thing. Name the specific pair and
state what makes them duplicates.

### Output format

```
## Alignment gate

PASS  (or FAIL — N issues found)

**Glossary gaps**
- "Agent" appears in 4 entries — no definition

**Persona coverage gaps**
- Persona "Non-technical founder" goal not served by any feature
- Feature "API key management": no defined persona for whom this is relevant

**Constraint conflicts**
- Feature "Offline mode" × Constraint "Cloud-only deployment": offline storage contradicts cloud-only persistence

**Access gaps**
- All personas access via MCP server; no feature reflects this channel

**Foundation gaps**
- Component "Event Bus": no feature draws on this

**Ambiguity**
- Feature "Smart routing" / **Why it matters**: contains "often"

**Duplicate intent**
- Feature "Smart routing" × Feature "Adaptive dispatch": appear to describe the same capability
```

Omit any section where nothing fires. On FAIL, list every issue — do not stop at the
first. Resolve all issues, then re-run the gate.
