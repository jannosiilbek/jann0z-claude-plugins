# Altitudes

Pick the level that matches the document's purpose. Each level answers its own question; lower-level answers are out of scope unless the user asks for them.

| Altitude | Answers | Belongs | Leave out |
|---|---|---|---|
| **Concept / vision** | Why and what, in principle | Problem, intent, core idea, key properties, boundaries, principles, non-goals, major open questions; when it supports a decision: value, main cost drivers and risks, stated qualitatively unless the user gave numbers | Components, data models, APIs, tech choices, UI layout and UI states, estimates, edge-case behaviour, mechanisms (how sync, upload or retry works) |
| **Product / PRD** | What the user gets and why it matters | Users, problems, outcomes, scope, requirements as behaviour, success measures, constraints, non-goals | Architecture, storage, internal APIs, implementation sequence |
| **Architecture** | How the system is shaped | Components and their responsibilities, boundaries, data flow, key interfaces at contract level, trade-offs, chosen vs rejected options, cross-cutting constraints that deviate from default | Function signatures, schemas field-by-field, config values, library minutiae |
| **Design doc / RFC** | How we'll build this one thing and why this way | The key mechanism in depth, alternatives with trade-offs, risks, migration/rollout, relevant concerns (security, scale, compat) only where non-default | Code-level detail the code will document, restated background |
| **Functional / API spec** | Exactly what it does at its boundary | Inputs, outputs, states, rules, errors that matter to the caller, limits, examples | Internal implementation, rationale essays, product pitch |
| **Implementation plan** | Who does what, in which order | Steps in order, dependencies, risks to the plan; for an agent, what each step touches and how it is checked; owners and milestones when people run it | Re-explaining the design |
| **ADR** | What we decided and why | Context (brief), decision, consequences, rejected options in one line each | History of the discussion |
| **Runbook / reference** | How to do or look up X | Exact steps, commands, values, preconditions, how to verify | Background, theory |

## Signals for inferring altitude

- Words the user uses: "concept", "idea", "vision", "high-level" → concept. "Requirements", "user stories" → PRD. "Architecture", "components" → architecture. "Endpoint", "schema", "contract" → functional/API.
- What the existing draft already contains: match its deepest *deliberate* level, not stray details.
- Who reads it: execs and stakeholders read concept/PRD; engineers read architecture and below.

## Mixed documents

Some documents legitimately span two levels (e.g. a PRD with an architecture sketch). Keep each section at one level and make the transition explicit with a section boundary, not a gradual drift.

## Example: same feature, three altitudes

Feature: users can export reports.

- **Concept**: "Users can take their reports out of the product in formats other tools read. Exports reflect what the user sees, including filters. Non-goal: scheduled exports."
- **PRD**: "Users export the current report view as CSV or PDF. The export keeps the active filters and the column order. A report with more than 50k rows exports in the background, and the user gets an email when it is ready. Success: support tickets about exports drop by half."
- **API spec**: "`POST /reports/{id}/exports` body `{format: csv|pdf, filters}` → `202 {exportId}`. `GET /exports/{exportId}` → `{status: pending|ready|failed, url?}`. URL valid 24 h."

Each is complete for its level. None contains the next level's details.
