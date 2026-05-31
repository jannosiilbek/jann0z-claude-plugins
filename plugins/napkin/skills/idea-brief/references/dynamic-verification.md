# Dynamic verification

Promote (or kill) the most decision-relevant assumptions by checking them cheaply against whatever
capabilities the environment offers. Never hardcode a tool list — discover at runtime so the skill
stays correct as the toolbox changes.

**Precondition: the three gates must already pass.** Verification only runs once there is a real
problem and a specific user — otherwise the claims aren't concrete enough to check and you'd burn
effort confirming that "restaurants have problems". If the brief is blocked, skip this entirely.

## Step 1 — Discover capabilities

Inventory what is actually available right now:
- **Skills** — the available-skills list in context.
- **MCP tools** — connected tools (search them if the catalogue is deferred).
- **Built-ins** — web search, browser, fetch.

Do not assume any specific named skill exists. Match on what a capability *does*.

## Step 2 — Pick what to check

Do not verify everything — keep it fast. Select the **2–4 claims** that are both:
- **riskiest** (a gate field, or the named riskiest assumption), and
- **cheaply checkable** (a capability plausibly answers it without deep work).

A check that can't change a decision isn't worth running.

## Step 3 — Express each check as an intent, then bind

Map the claim to an abstract intent, then bind the intent to the best available capability by
purpose. Examples of intents → the kind of capability that serves them:

| Intent | Capability type that serves it |
|---|---|
| Does this buyer population exist and is it reachable? | professional / people / company lookup; web search; browser |
| Do people voice this pain in their own words? | community / forum / social search; review mining; web search |
| Who already serves this, and how crowded is it? | competitor research; product-directory search; web search |
| Will buyers pay / do they have budget? | buyer-power / willingness-to-pay research; web search |
| Is there demand volume? | keyword / search-volume tooling; web search |
| Is the market saturated? | saturation / competitive-density research; web search |
| Does this named integration / API / data source exist and is it self-serve reachable (not partnership/enterprise-gated)? | web/internet search; API-docs lookup; common knowledge of well-known APIs |
| Is the core capability buildable on a vibecode stack, or does it need custom ML / research / hardware? | common knowledge of the build toolkit; web search; optionally a helper agent |

**Feasibility is a first-class intent class** here — but keep it light: the Build seed is direction,
not a spec, so check only the Build-seed claims a builder would otherwise discover the hard way (a
named **key input / integration / data source**, or the **core capability**). Do not turn this into a
full feasibility audit; that is mvp-scoping's job.

Binding rules:
- Prefer a **specific skill or MCP tool** whose purpose matches the intent.
- Otherwise fall back to **web search / browser**.
- If nothing fits, **leave the claim `[assumption]`** and note "unverifiable with available tools".

## Step 4 — Run, re-tag, propose

- Run the selected checks (in parallel if subagents/parallel calls are available).
- Re-tag each checked field:
  - `evidence-checked` — capability corroborated it → propose promotion to `[fact]`.
  - `still assumption` — inconclusive.
  - `contradicted` — capability found the opposite.
- Set provenance to the capability that produced the result (name it, e.g. "evidence-checked via
  reddit-search").
- **Surface contradictions loudly.** A contradicted *gate field* (named user doesn't exist at scale;
  market already saturated; nobody voices the pain) is the single highest-value finding — lead with
  it. A contradicted **Build-seed feasibility claim** ("the named integration has no public API /
  requires a partnership", "the core capability needs a custom model nobody ships off-the-shelf",
  "this implies months not days-weeks") is surfaced **just as loudly** — feed it into the riskiest
  assumption. The brief refuses to pass a Build seed whose feasibility is *contradicted*, the same way
  it refuses a contradicted gate.
- **Propose, don't auto-trust.** The founder confirms before any promotion to `[fact]`. Never
  silently upgrade. Record everything in the brief's Verification log.

## Why this design

Hardcoding `linkedin-search` etc. breaks the moment a tool is added, renamed, or removed.
Intent-based binding means: add a new capability tomorrow and it gets used automatically; remove one
and the skill degrades to web/browser instead of failing. The brief records *how* each fact was
checked, so downstream research can trust-rank inputs by the quality of the capability behind them.
