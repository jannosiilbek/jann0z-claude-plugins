# EventStorming — Closed Validation Rule Catalog

Role: this is the **closed rule catalog** for the `event-storming` skill (artifact `specs/01-event-storming.md`). It is the **sole review vocabulary** — a reviewer may cite ONLY rules defined here, by ID. Each rule is machine-shaped as **Detect → Fix → Severity → Source**. **Pass condition: zero ❌ error findings.** ⚠️ warn and ℹ️ info findings are reported but never block. Severities: ❌ error (invalidates the artifact or breaks downstream consumption) / ⚠️ warn (canon violation degrading quality) / ℹ️ info (advisory).

Every rule cites its authority via `sources/SOURCES.md`. Sources referenced below: **[S1]** ddd-crew Glossary & Cheat sheet (row 1), **[S2]** Brandolini, Collaborative Process Modelling with EventStorming, 2022 (row 2), **[S3]** Brandolini, Introducing Event Storming, 2013 — historical (row 3), **[S4]** eventstorming.com official reference (row 4), **[PLAN]** pipeline contract (PLAN.md). Source authority order per SOURCES.md §"Authority alignment".

## Theme index

| Theme | Title | Rules |
|-------|-------|-------|
| A | Structure & format spec | A1–A8 |
| B | Domain Events | B1–B7 |
| C | Actors | C1–C4 |
| D | Hotspots | D1–D4 |
| E | Lifecycle skeletons | E1–E7 |
| F | Cause-effect grammar | F1–F4 |
| G | Naming & ubiquitous language | G1–G5 |
| H | Scope gate (00 seam) | H1–H5 |

---

## A — Structure & format spec

This theme pins the required sections and table shapes. It doubles as the format spec: a mechanical linter verifies headings and column shapes against these rules.

### A1 — Required top-level sections present
- **Detect:** The artifact lacks any of these exact level-2 headings: `## Upstream Fingerprint`, `## Domain Events`, `## Actors`, `## Hotspots`, `## Lifecycle Skeletons`.
- **Fix:** Add the missing section(s) with the exact heading text above.
- **Severity:** ❌
- **Source:** [PLAN] (artifact 01 owns domain events, actors, hotspots, per-aggregate lifecycle skeletons); element set per [S1] Glossary.

### A2 — Upstream fingerprint block (dual entry)
- **Detect:** `## Upstream Fingerprint` is absent, or does not record BOTH upstream identities used to detect drift: (1) the impact map `00-impact-map.md@sha256:<hex>`, AND (2) the domain-description source (a source label/title and a content hash or capture date). Missing either entry fires this rule.
- **Fix:** Add a fingerprint block naming both upstreams: the `00-impact-map.md@sha256:<hex>` digest AND the domain-description source with its stable identifier (hash or date) it was derived from.
- **Severity:** ❌
- **Source:** [PLAN] (pipeline drift-detection contract; 01's input is now "00, plus the domain description" — both upstreams are fingerprinted).

### A3 — Domain Events table shape
- **Detect:** The `## Domain Events` section does not contain a table with exactly these columns, in order: `Event | Actor | Trigger | Notes | Deliverable`. (`Trigger` records the command/action or upstream event that causes it; `Notes` is free; `Deliverable` names the exact 00 deliverable string this event realizes, or the `—` sentinel — an EMPTY `Deliverable` cell is an unfilled cell, NOT the sentinel, and is rejected.)
- **Fix:** Reformat the Domain Events table to the five-column shape above; fill every `Deliverable` cell with a 00 deliverable string or the explicit `—` sentinel (never leave it blank).
- **Severity:** ❌
- **Source:** [S1] Glossary (Domain Event, Actor/Agent); [S2] grammar (Command→Event); [PLAN] Scope gate (every 00 deliverable is realized by ≥1 lifecycle event — the `Deliverable` column carries that realization claim).

### A4 — Actors table shape
- **Detect:** The `## Actors` section does not contain a table with exactly these columns, in order: `Actor | Kind | Responsibility`. (`Kind` ∈ {person, role, department, system, automated-process}.)
- **Fix:** Reformat the Actors table to the three-column shape above.
- **Severity:** ❌
- **Source:** [S1] Glossary (Actor/Agent, System); [S2] (Person/Actor — "a human being responsible for a given decision").

### A5 — Hotspots table shape
- **Detect:** The `## Hotspots` section does not contain a table with exactly these columns, in order: `Hotspot | Question | Blocks`. (`Blocks` names the event/aggregate the open question affects, or `-`.)
- **Fix:** Reformat the Hotspots table to the three-column shape above.
- **Severity:** ❌
- **Source:** [S1] Glossary (HotSpot — captures conflicts/questions/issues).

### A6 — Per-aggregate lifecycle subsections
- **Detect:** Under `## Lifecycle Skeletons` there is not at least one level-3 subsection of the form `### <AggregateName>` each containing an ordered list of events.
- **Fix:** Add one `### <AggregateName>` subsection per aggregate, each with its ordered event sequence.
- **Severity:** ❌
- **Source:** [PLAN] ("per-aggregate lifecycle skeletons"); [S1] Glossary (Constraint/aggregate as the unit a lifecycle forms around).

### A7 — Aggregate/Constraint terminology mapping note
- **Detect:** The artifact uses the lifecycle term "aggregate" without a note recording that EventStorming's current sticky is "Constraint" and that this pipeline fixes the term "aggregate" for the lifecycle/section name.
- **Fix:** Add a one-line note (in `## Lifecycle Skeletons` or a glossary footnote) mapping the pipeline's "aggregate" onto the EventStorming "Constraint" (legacy "Aggregate") sticky, citing the source.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (Constraint — "called an aggregate before which is now officially a legacy word"); [PLAN] (artifact 03 is `aggregates`).

### A8 — No empty required tables
- **Detect:** Any of the Domain Events / Actors / Hotspots tables exists but has zero data rows. (Hotspots MAY legitimately be empty — see D4.)
- **Fix:** Populate the table, or — for Hotspots only — leave a single explicit `None identified` row.
- **Severity:** ❌ (Domain Events, Actors) / ℹ️ (Hotspots)
- **Source:** [S1] Glossary (Domain Events are the mandatory base — "the dough"); [S4] notation philosophy (events + timeline are mandatory).

---

## B — Domain Events

### B1 — Events are past-tense
- **Detect:** Any `Event` cell is not phrased as a verb in the past tense (e.g. "Place Order", "Order Placement" instead of "Order Placed").
- **Fix:** Rename to a past-tense verb phrase (e.g. "Order Placed", "Contract Signed").
- **Severity:** ❌
- **Source:** [S1] Glossary (Domain Event — "a verb at the past tense"); [S2] (Event — "named as a verb in the past tense").

### B2 — Events are domain-relevant facts
- **Detect:** An `Event` describes a UI/technical/CRUD mechanic (e.g. "Button Clicked", "Row Inserted", "Form Submitted") rather than a fact meaningful to domain experts.
- **Fix:** Replace with the domain-meaningful fact it represents, or delete it.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (Domain Event — "relevant for the domain experts and contextual for the domain").

### B3 — No duplicate events
- **Detect:** Two `Event` rows denote the same fact (identical or synonymous names).
- **Fix:** Merge into one event; remove the duplicate (the "enforce the timeline" discipline).
- **Severity:** ⚠️
- **Source:** [S1] Cheat sheet, Step 2 "Enforce the timeline" — "Remove duplicate events".

### B4 — Each event has an actor or an upstream trigger
- **Detect:** An `Event` row has BOTH `Actor` empty/`-` AND `Trigger` empty/`-` (it appears from nowhere).
- **Fix:** Record the responsible actor and/or the command/event that triggers it.
- **Severity:** ⚠️
- **Source:** [S2] grammar (every event is produced by a command, which an actor or automated policy issues); [S3] (commands "decide which events fire").

### B5 — Events also appear in a lifecycle skeleton
- **Detect:** An `Event` listed in the Domain Events table appears in no `### <Aggregate>` lifecycle skeleton.
- **Fix:** Place the event into the appropriate aggregate's ordered lifecycle, or justify its omission in Notes.
- **Severity:** ⚠️
- **Source:** [PLAN] (lifecycle skeletons consume the events); [S1] Glossary (Timeline — events ordered into the flow).

### B6 — Pivotal events identifiable
- **Detect:** The artifact provides no way to mark the few most significant events (no `pivotal` flag/marker in Notes or no dedicated marking convention) when more than ~8 events exist.
- **Fix:** Mark the small set of pivotal events (e.g. "Order Placed", "Payment Received") in Notes.
- **Severity:** ℹ️
- **Source:** [S1] Glossary (Pivotal Events — "the few most significant events"); [S4] (Pivotal Events).

### B7 — Events are atomic facts, not processes
- **Detect:** An `Event` names a multi-step process or ongoing state (e.g. "Order Processing", "Customer Onboarding") rather than a single completed fact.
- **Fix:** Split into the discrete past-tense facts that compose it (e.g. "Order Validated", "Order Shipped").
- **Severity:** ⚠️
- **Source:** [S2] (Event — "a relevant fact that happened"; the stable anchors of the timeline).

---

## C — Actors

### C1 — Actor responsibility tied to a decision/event
- **Detect:** An `Actor` row's `Responsibility` does not connect the actor to any command, decision, or domain event in the artifact.
- **Fix:** State which decision/event the actor is responsible for, or remove the actor.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (Actor/Agent — "involved around a (group of) Domain Event(s)"); [S2] (Person/Actor — "responsible for a given decision").

### C2 — Human actor vs system distinguished
- **Detect:** A non-human target of commands (software/external service) is recorded as a person/role, or a person is recorded with `Kind: system`.
- **Fix:** Set `Kind` to `system`/`automated-process` for software, and `person`/`role`/`department` for humans.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (System distinct from Actor/Agent); [S2] (System = target of commands; Actor = human).

### C3 — Actors referenced by events exist in the Actors table
- **Detect:** An `Actor` value used in the Domain Events table has no matching row in the Actors table.
- **Fix:** Add the missing actor to the Actors table (with consistent naming — see G2).
- **Severity:** ❌
- **Source:** [PLAN] (cross-table integrity for downstream consumption); [S1] Glossary (Actor/Agent).

### C4 — Actor names are concrete
- **Detect:** An `Actor` is a vague placeholder ("user", "the system", "someone", "stakeholder") where a specific role/department is meant.
- **Fix:** Replace with the specific role, department, or named system.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (Actor/Agent — "a department, a team or a specific person"); cheat sheet's anti-jargon stance.

---

## D — Hotspots

### D1 — Hotspot is an unresolved question/conflict
- **Detect:** A `Hotspot` row records a resolved decision, a fact, or an event rather than an open conflict, question, friction, dissent, or "explore-later".
- **Fix:** Move resolved items out of Hotspots (into the relevant table); keep only genuinely open issues.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (HotSpot — "hot conflicts… inconsistencies, frictions, questions, dissent, objections, issues or procrastinating going deep to explore for later").

### D2 — Hotspot phrased as a question
- **Detect:** A hotspot's `Question` cell is not phrased as an open question or explicit unknown.
- **Fix:** Rephrase as the open question it captures (e.g. "Who approves refunds over $500?").
- **Severity:** ℹ️
- **Source:** [S1] Cheat sheet, Step 3 — "Hotspots can also mean pain points or questions that are unanswered".

### D3 — Hotspots do not silently invent answers downstream
- **Detect:** An event, actor, or lifecycle step depends on a decision that is itself recorded as an open Hotspot, yet the artifact asserts it as settled without cross-reference.
- **Fix:** Reference the blocking hotspot from the dependent item (use the Hotspot `Blocks` column), or resolve the hotspot.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (HotSpot — capturing what is NOT yet resolved); [PLAN] (no silent invention).

### D4 — Empty hotspots are explicit, not omitted
- **Detect:** No hotspots were found but the table is absent or blank rather than carrying an explicit `None identified` row.
- **Fix:** Add a single `None identified` row.
- **Severity:** ℹ️
- **Source:** [PLAN] (explicit-emptiness for mechanical verification); [S1] Glossary (Hotspots are an expected output to surface).

---

## E — Lifecycle skeletons

A lifecycle skeleton is an **ordered event sequence per aggregate** — the spine that downstream artifacts (03 aggregates, 05 statecharts) consume.

### E1 — Each skeleton is an ordered event list
- **Detect:** A `### <Aggregate>` subsection's body is not an ordered (numbered) list of events, or mixes non-events into the sequence.
- **Fix:** Express the lifecycle as a numbered list of past-tense domain events in timeline order.
- **Severity:** ❌
- **Source:** [PLAN] ("per-aggregate lifecycle skeletons" as ordered sequences); [S1] Glossary (Timeline — left-to-right ordering).

### E2 — Skeleton entries are past-tense events
- **Detect:** A lifecycle entry is not a past-tense domain event (e.g. it is a command, state, or noun).
- **Fix:** Replace with the corresponding past-tense event; move commands/states elsewhere.
- **Severity:** ❌
- **Source:** [S1] Glossary (Domain Event — past tense); applies B1 to lifecycle sequences.

### E3 — Lifecycle begins with a creation event and reaches a terminal event
- **Detect:** A skeleton has no clear initial (creation/first) event or no terminal (end-of-life) event.
- **Fix:** Add the missing creation and/or terminal event so the lifecycle is bounded.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (Pivotal Events example spans creation→delivery — a bounded lifecycle); [S2] (events are the stable anchors of the timeline).

### E4 — Aggregate name matches a lifecycle subject
- **Detect:** A `### <Aggregate>` name does not correspond to a coherent thing whose state the listed events change (the events are unrelated to the named aggregate).
- **Fix:** Rename the aggregate, or regroup the events under the aggregate whose lifecycle they form.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (Constraint/aggregate — the consistency unit a command acts on); [PLAN] (artifact 03 derives aggregate roots from these).

### E5 — No event appears in two aggregates' skeletons
- **Detect:** The same event is listed under more than one `### <Aggregate>` subsection.
- **Fix:** Assign the event to the single aggregate that owns the state change; cross-reference if another aggregate reacts to it (that is a policy — see F-theme).
- **Severity:** ⚠️
- **Source:** [PLAN] (single-ownership pipeline principle); [S2] (cross-aggregate reaction is a Policy, not shared ownership).

### E6 — Every lifecycle event is also in the Domain Events table
- **Detect:** An event listed in a skeleton has no corresponding row in the `## Domain Events` table.
- **Fix:** Add the event to the Domain Events table (or correct the skeleton).
- **Severity:** ❌
- **Source:** [PLAN] (Domain Events table is the event registry consumed downstream); cross-table integrity.

### E7 — Complex lifecycles flagged for statecharts
- **Detect:** A skeleton with branching/looping/conditional transitions is recorded as a flat list with no note that it is a candidate for promotion to a statechart.
- **Fix:** Add a note flagging the aggregate as a statechart candidate (consumed by artifact 05).
- **Severity:** ℹ️
- **Source:** [PLAN] (artifact 05 promotes complex lifecycles to statecharts).

---

## F — Cause-effect grammar

These rules apply the ReadModel → Command → Event → Policy chain where the artifact records causation. This artifact does not own commands/read-models/policies as primary sections, but where it records a `Trigger` or a cross-aggregate reaction it must respect the grammar.

### F1 — Triggers respect Command→Event direction
- **Detect:** A `Trigger` cell names something downstream of its event (an effect, not a cause), inverting the chain.
- **Fix:** Record the actual cause — the command/action or upstream event that produces this event.
- **Severity:** ⚠️
- **Source:** [S2] grammar ("Read Model → Command → Event → Policy"; command produces event).

### F2 — Cross-aggregate reactions named as policies
- **Detect:** One aggregate's event causes another aggregate's event with no policy ("whenever X, do Y") recorded to connect them (in Notes or a reactions list).
- **Fix:** Record the connecting policy as "Whenever <event>, <command>" so the causal link is explicit.
- **Severity:** ⚠️
- **Source:** [S2] (Policy — "Whenever this happens, we have to do that"; connects an event to the next command).

### F3 — Automated triggers distinguished from actor triggers
- **Detect:** An event triggered by an automated policy/reactor is attributed to a human actor (or vice versa).
- **Fix:** Attribute automated triggers to the policy/automated-process; human-initiated ones to the actor.
- **Severity:** ℹ️
- **Source:** [S1] Glossary (Policy — "automated process or manual"); [S2] (Command initiated by actor or automated process).

### F4 — Policies stress-tested for hidden cases
- **Detect:** A recorded policy uses "always"/"immediately"/"whenever" with no acknowledged exception, where domain reality likely has one (the policy is suspiciously absolute).
- **Fix:** Note the exception or open it as a Hotspot.
- **Severity:** ℹ️
- **Source:** [S2] ("Stress-testing a policy with the words 'always' and 'immediately' surfaces hidden behaviours and exceptions").

---

## G — Naming & ubiquitous language

### G1 — No vague terms
- **Detect:** Any event/actor/aggregate/hotspot uses vague filler ("manage", "process", "handle", "stuff", "various", "etc.", "data") in place of a precise domain term.
- **Fix:** Replace with the precise domain word.
- **Severity:** ⚠️
- **Source:** [S1] Cheat sheet ("avoid jargon as much as possible"); [PLAN] (downstream glossary derives one-concept-one-word terms — vagueness breaks that).

### G2 — Consistent naming across sections
- **Detect:** The same concept is named differently across tables/skeletons (e.g. "Order Placed" vs "Order Submitted" for one fact; "Customer" vs "Buyer" for one actor).
- **Fix:** Pick one term and use it everywhere.
- **Severity:** ❌
- **Source:** [S1] Glossary (avoid inconsistencies in language — a Hotspot trigger); [PLAN] (artifact 02 derives one-concept-one-word terms from these).

### G3 — No technical/implementation leakage in names
- **Detect:** An event/actor/aggregate name contains tech artifacts (table names, HTTP codes, class names, "API", "DB", "endpoint").
- **Fix:** Rename to the business-domain term.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (Domain Event relevant to *domain experts*); [S2] (business-stakeholder-facing language).

### G4 — Aggregate names are singular domain nouns
- **Detect:** A `### <Aggregate>` heading is a verb, a plural, or a technical noun rather than a singular domain concept.
- **Fix:** Rename to a singular domain noun (e.g. "Order", not "Orders" or "OrderManager").
- **Severity:** ℹ️
- **Source:** [PLAN] (artifact 03 derives aggregate roots — names must be clean nouns); [S1] Glossary (Constraint as a domain concept).

### G5 — Names free of unresolved synonyms
- **Detect:** Two names are used for one concept and neither is recorded as the canonical term nor the conflict raised as a Hotspot.
- **Fix:** Choose the canonical term; record the rejected synonym, or raise a Hotspot if the team disagrees.
- **Severity:** ⚠️
- **Source:** [S1] Glossary (HotSpot captures "inconsistencies (in language)"); [PLAN] (forbidden-synonym tracking seeds artifact 02).

---

## H — Scope gate (00 seam)

This theme encodes the seam to the upstream **`impact-map` (00)** artifact. Per [PLAN] Scope gate: *"`impact-map` (00) owns the business goal, the business actors, the impacts, and the deliverables. 01's human and organizational actors carry 00's business-actor names verbatim; purely internal actors (systems) are 01-owned. Every 00 deliverable is realized by ≥1 lifecycle event in 01, and every 01 aggregate serves ≥1 impact — a 01 element serving no deliverable is scope creep, a deliverable no event realizes is an unmodelled promise; both are findings, never notes."*

00's pinned format (the four name sets 00 owns, copied here for self-containment): `## Goal` (one statement) → `## Business Actors` table `Actor | Description` → `## Impacts` table `Impact | Business Actor (exact string)` → `## Deliverables` table `Deliverable | Impact (exact string)`. The exact strings in 00's `Business Actors`, `Impacts`, and `Deliverables` columns are the authoritative name sets this theme resolves 01 against. 00's `Deliverable → Impact` mapping is the transitive bridge by which an aggregate "serves an impact": an aggregate serves an impact iff ≥1 of its events realizes a 00 deliverable, which 00 maps to an impact.

### H1 — Human/organizational actors resolve to a 00 Business Actor (S2(a))
- **Detect:** An `Actors` row with `Kind ∈ {person, role, department}` has an `Actor` name that does not exact-string-match (case- and whitespace-sensitive) a 00 `Business Actors` entry. (`Kind ∈ {system, automated-process}` are purely internal, 01-owned, and exempt.)
- **Fix:** Rename the human/organizational actor to carry the 00 business-actor name verbatim, or — if it is genuinely a system — set its `Kind` to `system`/`automated-process`. If 00 is missing the actor, that is a 00 defect, not a 01 fix.
- **Severity:** ❌
- **Source:** [PLAN] Scope gate ("01's human and organizational actors carry 00's business-actor names verbatim; purely internal actors (systems) are 01-owned"); 00 owns the Business Actors name set.

### H2 — Deliverable cells resolve to a 00 Deliverable (S2(b))
- **Detect:** A Domain Events `Deliverable` cell holds a value other than `—` that does not exact-string-match a 00 `Deliverables` entry.
- **Fix:** Correct the cell to the exact 00 deliverable string it realizes, or set it to `—` if the event realizes no 00 deliverable. If the intended deliverable is absent from 00, that is a 00 defect.
- **Severity:** ❌
- **Source:** [PLAN] Scope gate ("each event names the 00 deliverable it realizes, or `—`"); 00 owns the Deliverables name set.

### H3 — Every 00 deliverable is realized by ≥1 event (coverage)
- **Detect:** A 00 `Deliverables` entry appears in NO Domain Events `Deliverable` cell (it is realized by no event). This is an **unmodelled promise**.
- **Fix:** Add (or annotate) the lifecycle event(s) that realize the deliverable, naming the exact 00 string in the `Deliverable` column. A deliverable no event realizes is never silenced into a Note.
- **Severity:** ❌
- **Source:** [PLAN] Scope gate ("Every 00 deliverable is realized by ≥1 lifecycle event in 01… a deliverable no event realizes is an unmodelled promise… a finding, never a note").

### H4 — Every aggregate serves ≥1 impact (aggregate-serves)
- **Detect:** An aggregate (`### <Aggregate>` subsection) has NO skeleton event whose Domain-Events `Deliverable` cell is a non-`—` value resolving to a 00 deliverable. Because 00 maps every deliverable to an impact, such an aggregate serves no impact — it is **scope creep** (a whole-aggregate orphan). NOTE: a single event with `Deliverable = —` is legitimate domain mechanics and is NOT a finding; only an entire aggregate serving nothing is.
- **Fix:** Either give the aggregate ≥1 event that realizes a 00 deliverable (revealing the impact it serves), or remove the aggregate as out-of-scope. A whole orphan aggregate is never explained away in a Note.
- **Severity:** ❌
- **Source:** [PLAN] Scope gate ("every 01 aggregate serves ≥1 impact — a 01 element serving no deliverable is scope creep… a finding, never a note"); transitive through 00's Deliverable→Impact mapping.

### H5 — Pervasive `—` deliverable cells (scope-creep smell)
- **Detect:** A large fraction of events carry `Deliverable = —` (most events realize no 00 deliverable) while H3/H4 still pass. Each `—` event is individually legitimate, but a pervasive cloud of them is an advisory smell that 01 may be modelling beyond 00's promised scope.
- **Fix:** Review whether the `—` events are genuine supporting domain mechanics or unscoped expansion; if the latter, trim or raise the gap upstream to 00. No mechanical block — advisory only.
- **Severity:** ℹ️ (⚠️ if the `—` share is overwhelming and at least one aggregate is borderline orphaned)
- **Source:** [PLAN] Scope gate (scope-creep direction — "a 01 element serving no deliverable"; the honest reading is that a single `—` event is not a finding while the per-aggregate H4 check is the mechanical arm).
