# Field set

Stage-adaptive. Establish stage first, then use the matching column. Mandatory-core fields apply to
both stages; new-venture-only fields are skipped for an existing-product extension (its pricing,
channel, and cost are already settled — asking would produce filler).

| Field | New venture | Existing-product extension | Notes |
|---|---|---|---|
| **Problem** | ✓ gate | ✓ gate | One crisp statement. Not a feature list. |
| **Target user** | ✓ gate | ✓ gate | Specific + reachable; name buyer vs user if different. |
| **Opportunity (the need)** | ✓ | ✓ | The unmet need behind the idea. Must pass the "more than one way to address this?" test, else it's a solution in disguise. |
| **Current alternative** | ✓ | ✓ | What they do today instead (incl. spreadsheets, nothing, a competitor). The most researchable, least delusional field. |
| **Wedge** | ✓ | ✓ | The narrow first use-case, not the grand vision. |
| **Market & segment** | ✓ | ✓ | Vertical(s) + SMB / mid / enterprise. Buyer power should match the segment. |
| **Why now** | ✓ | ✓ | The researchable reason this is timely (regulation, tech shift, behaviour change). Not a boast. |
| **Riskiest assumption** | ✓ gate | ✓ gate | The leap of faith — critical to success, least evidence. Surfaced at the top of the brief. |
| **Non-goals** | ✓ | ✓ | Firm exclusions. Prevents downstream research flagging intentional scope as gaps. |
| **Business model** | ✓ | — | Who pays, rough price, monetisation. Already settled for an extension. |
| **Market size / reachability** | ✓ | — | Order-of-magnitude only. Refuse false precision. |
| **Build seed** | ✓ | ✓ | The bridge to implementation. Four lines, no more — see below. |
| **Differentiator / moat** | optional | optional | Often self-flattery at seed stage — accept only if it survives the skeptic lens; otherwise fold into "why now". |

## Build seed (the implementation bridge)

Four mandatory one-line sub-fields. They carry enough *constraint and direction* that mvp-scoping and
the rest of the pipeline can start without re-interrogating the founder — but they are **not** a spec
(no screens, no data model, no feature list; those are owned downstream).

| Sub-field | What it captures |
|---|---|
| **Core capability** | The single thing v1 must do for the idea to be true. |
| **Key inputs / integrations** | The data sources, APIs, or systems v1 depends on (e.g. a registry API, bank-statement import). |
| **Hard constraints** | Non-negotiables a builder must honour: data residency, determinism, offline-first, latency, language. |
| **Thinnest first slice** | The smallest shippable cut that still delivers the core capability. |

Each sub-field is tagged `[fact|assumption]` like any other claim. If a sub-field can only be
answered with "it depends", that is a signal the idea isn't ready for the build path yet — flag it as
the riskiest assumption rather than padding it.

## Deliberately excluded

- **Success metrics / KPIs** — 6–12-month numbers are fiction at seed stage and invite vague slop.
- **Detailed financials / projections** — not a brief's job; downstream.
- **Solution/feature design** — that's the spec-generation step, not this one.

## Risk-taxonomy note

Several frameworks enumerate the risk categories differently — Cagan's four (value, usability,
feasibility, business viability), Strategyzer's four (desirability, feasibility, viability,
adaptability), Torres's five (adds ethical). Don't create a field per category from every taxonomy;
that produces redundant fields. Lean on the **desirability / viability / feasibility** triad when
classifying the riskiest assumption, and note an ethical risk only when one genuinely exists.
