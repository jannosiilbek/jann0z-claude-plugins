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
