# Impact Map — Closed Validation Rule Catalog

Role: this is the **closed rule catalog** for the `impact-map` skill (artifact `specs/00-impact-map.md`, artifact 0 — the scope-layer head of the 11-artifact schema-therapy pipeline). It is the **sole review vocabulary** — a reviewer may cite ONLY rules defined here, by ID. Each rule is machine-shaped as **Detect → Fix → Severity → Source**. **Pass condition: zero ❌ error findings.** ⚠️ warn and ℹ️ info findings are reported but never block. Severities: ❌ error (invalidates the artifact or breaks downstream consumption) / ⚠️ warn (canon violation degrading quality) / ℹ️ info (advisory).

The artifact owns the **business goal, the business actors, the impacts, and the deliverables** (every name set). It is the first link in the pipeline; its actor/impact/deliverable strings are downstream-consumed identifiers (01 event-storming carries business-actor names verbatim; 07 personas reference impacts by exact string).

Every rule cites its authority via `sources/SOURCES.md`. Sources referenced below: **[S-draw]** `impactmapping-org-drawing.md` — the authoritative goal/actor/impact/deliverable definitions and four-level hierarchy (drawing.html, CC BY 4.0); **[S-about]** `impactmapping-org-about.md` — "Why use Impact Mapping?" incl. the Defining-quality "a deliverable that supports no impact is a failure" rule (about.html); **[S-facil]** `impactmapping-org-facilitation.md` — session modes, "capture metrics for key impacts", "avoid listing the deliverables" / "high level deliverables only" (facilitation.html); **[S-home]** `impactmapping-org-home.md` — the Why/Who/How/What four-question framing and the "how to make an impact map" instruction (home page); **[S-ex]** `impactmapping-org-example.md` — the two worked examples (music site; gaming 1M players); **[S-book]** the cite-only book (ISBN 978-0-9556836-4-0) — SMART goal discipline (Part III "discover the real goal, define measurements") and the "Typical Mapping Mistakes" deliverables-as-impacts anti-pattern; **[PLAN]** pipeline contract (PLAN.md / downstream seams). Source authority order per SOURCES.md §"Authority alignment".

## Theme index

| Theme | Title | Rules |
|-------|-------|-------|
| A | Structure & format spec | A1–A8 |
| B | Goal (Why — measurable) | B1–B4 |
| C | Business Actors (Who) | C1–C4 |
| D | Impacts (How — behaviour changes) | D1–D5 |
| E | Deliverables (What — options) | E1–E4 |
| F | Hierarchy integrity | F1–F5 |
| G | Naming, language & pipeline contract | G1–G6 |
| H | Amendment discipline | H1–H4 |

---

## A — Structure & format spec

This theme pins the required sections and table shapes. It doubles as the format spec: a mechanical linter verifies headings and column shapes against these rules. It refines WITHIN the pinned artifact shape (seam S1); it never breaks it.

### A1 — Required top-level sections present, in order
- **Detect:** The artifact lacks any of these exact level-2 headings, or they do not appear in this order: `## Upstream Fingerprint`, `## Goal`, `## Business Actors`, `## Impacts`, `## Deliverables`.
- **Fix:** Add the missing section(s) with the exact heading text above, in the pinned order (fingerprint → goal → actors → impacts → deliverables).
- **Severity:** ❌
- **Source:** [PLAN] (pinned artifact shape S1); [S-draw] (the four aspects in their canonical order: goal → actors → impacts → deliverables).

### A2 — Upstream fingerprint block shape
- **Detect:** `## Upstream Fingerprint` is absent, or its body is not a comment block of the exact shape: a line `<!-- fingerprints:`, one or more lines `<intent-filename>@sha256:<64-hex>`, and a closing line `-->`.
- **Fix:** Add the fingerprint comment block fingerprinting the product-intent file(s): `<intent-filename>@sha256:<64 lowercase hex>`.
- **Severity:** ❌
- **Source:** [PLAN] (pipeline drift-detection contract; fingerprint block shape).

### A3 — Business Actors table shape
- **Detect:** The `## Business Actors` section does not contain a table with exactly these columns, in order: `Actor | Description`.
- **Fix:** Reformat the Business Actors table to the two-column shape above.
- **Severity:** ❌
- **Source:** [PLAN] (pinned shape S1); [S-draw] (Actors — the first branch).

### A4 — Impacts table shape
- **Detect:** The `## Impacts` section does not contain a table with exactly these columns, in order: `Impact | Business Actor (exact string)`.
- **Fix:** Reformat the Impacts table to the two-column shape above; the second column carries the verbatim Actor name from the Business Actors table.
- **Severity:** ❌
- **Source:** [PLAN] (pinned shape S1); [S-draw] (Impacts — the second branch, set in the perspective of an actor).

### A5 — Deliverables table shape
- **Detect:** The `## Deliverables` section does not contain a table with exactly these columns, in order: `Deliverable | Impact (exact string)`.
- **Fix:** Reformat the Deliverables table to the two-column shape above; the second column carries the verbatim Impact name from the Impacts table.
- **Severity:** ❌
- **Source:** [PLAN] (pinned shape S1); [S-draw] (Deliverables — the third branch, supporting the required impacts).

### A6 — Goal is a single statement
- **Detect:** The `## Goal` section body is not exactly one goal statement (a single sentence or single paragraph). It contains a list, multiple distinct goals, or more than one paragraph.
- **Fix:** Reduce to one measurable goal statement (the centre of the map); move any second goal out of this artifact.
- **Severity:** ❌
- **Source:** [S-draw] ("The centre of an impact map answers the most important question: Why are we doing this? This is the goal"); [S-facil] (focusing delivery requires "a single milestone goal").

### A7 — No empty required tables
- **Detect:** Any of the Business Actors / Impacts / Deliverables tables exists but has zero data rows.
- **Fix:** Populate the table; an impact map with no actors, no impacts, or no deliverables is incomplete.
- **Severity:** ❌
- **Source:** [S-draw] (all four levels are required to form the map); [PLAN] (downstream 01/07 consume non-empty actor/impact/deliverable sets).

### A8 — Fingerprint hash well-formed
- **Detect:** A fingerprint line's hash is not exactly 64 lowercase hexadecimal characters following `@sha256:`.
- **Fix:** Recompute the SHA-256 of the named intent file and record the full 64-hex digest.
- **Severity:** ❌
- **Source:** [PLAN] (drift-detection requires a stable, verifiable content hash).

---

## B — Goal (Why — measurable)

The goal answers **Why are we doing this?** and must be measurable (SMART discipline).

### B1 — Goal is measurable
- **Detect:** The goal statement contains no measurement — no number, metric, target, or quantified threshold (e.g. "improve the experience", "grow the business" with no figure).
- **Fix:** Add the metric and target that defines success (e.g. "increase mobile advertising revenue to £X/month", "reach 1 million active players").
- **Severity:** ❌
- **Source:** [S-book] (Part III "discover the real goal, define measurements"; SMART discipline); [S-facil] ("capture metrics for key impacts"); [S-ex] (canonical goals are quantified — "increase the number of active players to 1 million"). *Severity decision: ❌. impactmapping.org asserts measurability as constitutive of a goal and the canonical examples are all quantified; a goal with no measurement cannot anchor the downstream impact/deliverable chain, so its absence invalidates the artifact rather than merely degrading it.*

### B2 — Goal answers Why, not What
- **Detect:** The goal statement names a deliverable, feature, or solution ("build a mobile app", "launch the forum") instead of a business outcome.
- **Fix:** Restate as the business objective the solution serves (the outcome), not the solution itself.
- **Severity:** ❌
- **Source:** [S-draw] ("Why are we doing this?"); [S-home] (`Why`=goal, distinct from `What`=deliverables); [S-about] (impact maps prevent feature shopping-lists "without any context why").

### B3 — Goal is not a restatement of deliverables
- **Detect:** The goal merely lists or sums the deliverables (DRY violation within the artifact — the goal carries no information beyond the `## Deliverables` rows).
- **Fix:** Lift the goal to the business outcome the deliverables are assumed to produce; let deliverables stay in their own section.
- **Severity:** ⚠️
- **Source:** [S-about] (deliverables belong "in the context of the impacts they are supposed to achieve", not as the goal); [S-draw] (the four levels are distinct).

### B4 — Goal is achievable via the actors named
- **Detect:** The goal references outcomes for which no actor in `## Business Actors` can plausibly produce or obstruct the effect (the actor branch cannot reach the goal).
- **Fix:** Add the missing actor(s) who can influence the outcome, or narrow the goal.
- **Severity:** ⚠️
- **Source:** [S-draw] (Actors are "those who can influence the outcome"; the map connects actors → goal); [S-about] (Roadmap management — the assumption that the actor "will contribute to the overall objectives").

---

## C — Business Actors (Who)

Actors answer **Who can produce / obstruct / consume / be impacted by** the outcome.

### C1 — Actors are specific, not vague placeholders
- **Detect:** An `Actor` is a vague placeholder ("user", "the system", "someone", "stakeholders", "people") where a specific actor kind is meant.
- **Fix:** Replace with the specific business actor (e.g. "Super-fans with mobile devices", "Advertisers", "Players").
- **Severity:** ⚠️
- **Source:** [S-draw] (Actors are concrete kinds — "consumers or users of our product", those who "produce" or "obstruct"); [S-ex] (named actor groups: super-fans, advertisers, players).

### C2 — Actors are business/human/organizational, not systems
- **Detect:** A row in `## Business Actors` names a software system, service, API, or technical component rather than a person, role, organisation, or external party.
- **Fix:** Remove the system; systems are owned by artifact 01 (event-storming), not by the impact map's business-actor set.
- **Severity:** ⚠️
- **Source:** [PLAN] (scope gate: 01's human/organizational actors carry 00's names verbatim — "systems are 01-owned"); [S-draw] (actors are who is "impacted by" or "consumers or users", a business framing).

### C3 — Actor kinds span influence roles (advisory)
- **Detect:** Every actor is of a single kind (e.g. all are end-users), with no consideration of who could *obstruct* or *influence* the outcome where the domain plausibly has such an actor.
- **Fix:** Consider adding actors who can produce, obstruct, or influence the effect — not only direct consumers.
- **Severity:** ℹ️
- **Source:** [S-draw] ("Who can produce the desired effect? Who can obstruct it? … Who will be impacted by it?").

### C4 — Actor description states relevance to the goal
- **Detect:** An actor's `Description` does not state why the actor matters to the goal (how they could help or obstruct it).
- **Fix:** Describe the actor's relationship to the outcome (their stake or influence), not just who they are.
- **Severity:** ℹ️
- **Source:** [S-draw] (the actor branch "sets the actors in the perspective of our business goal"); [S-about] (Strategic planning — actors framed by business perspective).

---

## D — Impacts (How — behaviour changes)

Impacts answer **How should the actor's behaviour change?** This is the single most load-bearing discipline: **an impact is a change in actor behaviour, NOT a feature or deliverable.**

### D1 — Impact is a behaviour change, not a feature (mechanical subset)
- **Detect:** An `Impact` cell is phrased as a system feature: it matches deliverable shape (a noun phrase naming a thing to be built) **or** contains a software/solution noun from the closed blocklist: `app`, `application`, `system`, `platform`, `feature`, `button`, `screen`, `page`, `dashboard`, `API`, `endpoint`, `integration`, `module`, `notification`, `email`, `report`, `form`, `database`, `portal`, `widget`, `function`, `service`.
- **Fix:** Restate as the actor behaviour change it is meant to cause (e.g. not "Push notifications" but "Fans return to the site more frequently"; not "Invite feature" but "Players invite their friends").
- **Severity:** ❌ (for the mechanical subset above; residual feature-phrasing not caught by the blocklist is agent-judged and reported under D2)
- **Source:** [S-draw] (Impacts answer "How should our actors' behaviour change?" — "These are the impacts", distinct from "Deliverables, software features"); [S-home] ("Think about behaviour changes that would make a big impact"); [S-book] ("Typical Mapping Mistakes" — deliverables-as-impacts anti-pattern); [S-about] ("Make Impacts, not Software"). *Severity decision: ❌ for the mechanically detectable subset. impactmapping.org draws the impact/deliverable boundary as the method's central discipline — an impact phrased as a feature collapses the second and third branches and breaks the downstream contract (07 persona goals reference impacts; if an "impact" is really a deliverable, the persona layer inherits a feature, not a behaviour). The mechanical subset (deliverable-shaped noun phrase / blocklisted software noun) is unambiguous, so it errors; the semantic residue is agent-judged and warned (D2) to stay honest about what a linter can prove.*

### D2 — Impact reads as an outcome, not a solution (semantic)
- **Detect:** An `Impact` not caught by D1 still reads as a thing built or a task done rather than a change in what an actor does (agent judgement).
- **Fix:** Rephrase as an observable change in actor behaviour ("does more / less / differently of X").
- **Severity:** ⚠️
- **Source:** [S-draw] (Impacts = behaviour changes); [S-home] ("behaviour changes that would make a big impact on the users").

### D3 — Impact is set in the perspective of one actor
- **Detect:** An `Impact` describes a behaviour change with no clear single owning actor, or its behaviour change is not attributable to the actor named in the `Business Actor` column.
- **Fix:** Tie the impact to exactly one actor whose behaviour changes; split a multi-actor impact into one per actor.
- **Severity:** ⚠️
- **Source:** [S-draw] (the impact branch "sets the actors in the perspective of our business goal" — impacts hang off actors); [S-home] ("Group impacts by actors").

### D4 — Impact plausibly helps (or obstructs) the goal
- **Detect:** An `Impact` describes an actor behaviour change with no plausible connection to the measurable goal.
- **Fix:** Restate the impact so its link to the goal is clear, or remove it.
- **Severity:** ⚠️
- **Source:** [S-draw] ("How can they help us to achieve the goal? How can they obstruct or prevent us from succeeding?"); [S-about] (Roadmap management — impact assumed to contribute to the objective).

### D5 — Key impacts are measurable (advisory)
- **Detect:** Impacts carry no metric or success signal where the goal is quantified and the impact is a primary lever.
- **Fix:** Capture a metric for key impacts (the signal that tells you the behaviour actually changed).
- **Severity:** ℹ️
- **Source:** [S-facil] ("Make sure to capture metrics for key impacts, which could be later used to decide if the deliverables are achieving what the stakeholders expect"); not insisted on at vision-setting stage ("don't insist on it").

---

## E — Deliverables (What — options)

Deliverables answer **What can we do to support the required impacts?** They are **options, not commitments.**

### E1 — Deliverable supports an existing impact
- **Detect:** A `Deliverable`'s `Impact` column does not name an impact present in the `## Impacts` table (exact-string), or names none.
- **Fix:** Point the deliverable at the verbatim impact it supports; if it supports no impact, remove it.
- **Severity:** ❌
- **Source:** [S-draw] (Deliverables "support the required impacts"; the map "puts all the deliverables in the context of the impacts"); [S-about] (Defining quality — "If a deliverable does not support an impact … it is a failure and should be treated as a problem, enhanced or removed").

### E2 — Deliverable is a delivery option, not a guarantee (advisory phrasing)
- **Detect:** A `Deliverable` is phrased as a fixed commitment or promised feature ("we will ship X") rather than a candidate option to support the impact.
- **Fix:** Phrase as an option ("X could support …"); deliverables are scope candidates to compare and prune, not commitments.
- **Severity:** ℹ️
- **Source:** [S-draw] (the map lets us "compare deliverables", "throw out deliverables that do not really contribute", "re-evaluate them as new information becomes available"); [S-ex] ("if the team achieves the goal with just these impacts, they don't have to deliver any features for the other two groups").

### E3 — Deliverables stay high-level
- **Detect:** A `Deliverable` is a fine-grained implementation task or technical sub-step rather than a high-level feature or organisational activity.
- **Fix:** Raise to the high-level deliverable; fine detail belongs to downstream artifacts (01 events onward).
- **Severity:** ⚠️
- **Source:** [S-facil] ("focus the discussion on impacts and high level deliverables"; "impact maps should contain high level deliverables only, without too much detail"); [S-draw] (deliverables = "software features and organisational activities").

### E4 — Deliverable is a deliverable, not a restated impact
- **Detect:** A `Deliverable` cell merely repeats its impact (an actor behaviour change) instead of naming the feature or activity that would cause it.
- **Fix:** Name the concrete feature or organisational activity (the What) that supports the impact (the How).
- **Severity:** ⚠️
- **Source:** [S-draw] (Deliverables answer "What can we do … to support the required impacts?" — distinct from impacts); [S-home] (`What`=deliverables, distinct from `How`=impacts).

---

## F — Hierarchy integrity

The four-level hierarchy (goal → actors → impacts → deliverables) must resolve: every child names an existing parent, by exact string.

### F1 — Every impact names an existing actor (exact string)
- **Detect:** An `Impact` row's `Business Actor` value has no exact-string match in the `## Business Actors` table.
- **Fix:** Use the verbatim actor name from the Business Actors table, or add the missing actor.
- **Severity:** ❌
- **Source:** [S-draw] (impacts hang off actors — the second branch level depends on the first); [PLAN] (cross-table integrity; names are downstream identifiers).

### F2 — Every deliverable names an existing impact (exact string)
- **Detect:** A `Deliverable` row's `Impact` value has no exact-string match in the `## Impacts` table.
- **Fix:** Use the verbatim impact name from the Impacts table, or add the missing impact.
- **Severity:** ❌
- **Source:** [S-draw] (deliverables hang off impacts — the third branch level depends on the second); [PLAN] (cross-table integrity).

### F3 — No orphan actors
- **Detect:** A `Business Actor` is referenced by zero `Impact` rows.
- **Fix:** Add at least one impact for the actor, or remove the actor if they cannot influence the goal.
- **Severity:** ⚠️
- **Source:** [S-draw] (actors exist to be set "in the perspective of our business goal" via impacts; an actor with no impact does no work in the map); [PLAN] (every business actor is covered by ≥1 persona in 07 — an orphan actor signals a dead branch).

### F4 — No orphan impacts
- **Detect:** An `Impact` is referenced by zero `Deliverable` rows.
- **Fix:** Add at least one deliverable that could support the impact, **or** explicitly leave it as a backlog candidate (an impact deliberately not yet served).
- **Severity:** ⚠️
- **Source:** [S-ex] ("if the team achieves the goal with just these impacts, they don't have to deliver any features for the other two groups" — unserved impacts are legitimate, kept as backlog candidates); [S-draw] (deliverables support impacts). *Severity decision: ⚠️ not ❌. The facilitation/example pages explicitly treat unserved impacts as a valid prioritisation outcome (deliberately not delivering for some actors), so an orphan impact is a warn-worthy signal to confirm intent, not an invalidating error.*

### F5 — Every deliverable transitively serves the goal
- **Detect:** Following a deliverable up the chain (deliverable → impact → actor → goal) does not reach the goal (a broken link anywhere in its ancestry).
- **Fix:** Repair the broken link (F1/F2), or remove the deliverable as not contributing to the goal.
- **Severity:** ❌
- **Source:** [S-draw] ("throw out deliverables that do not really contribute to any impact that is critical for a particular goal"); [PLAN] (scope gate: every 01 aggregate serves ≥1 impact transitively via deliverables→impacts).

---

## G — Naming, language & pipeline contract

### G1 — No vague terms
- **Detect:** Any goal/actor/impact/deliverable uses vague filler from the closed blocklist: `manage`, `handle`, `process`, `support` (whole-word match — noun uses such as "customer support" may produce an acceptable non-blocking warn), `stuff`, `various`, `etc.`, `things`, `data`, `solution`, `leverage`, `optimize`, `streamline`, `seamless`, `robust` — in place of a precise term.
- **Fix:** Replace with the precise business word.
- **Severity:** ⚠️
- **Source:** [S-home] ("does not get in the way with complicated syntax or bureaucracy" — precise, plain language); [PLAN] (downstream 02 glossary derives one-concept-one-word terms — vagueness breaks that).

### G2 — Names unique within their table
- **Detect:** Two rows in the same table (Business Actors, Impacts, or Deliverables) carry the identical name string.
- **Fix:** Merge the duplicate, or rename so each name is unique within its table (names are identifiers).
- **Severity:** ❌
- **Source:** [PLAN] (names are downstream-consumed identifiers — a duplicated name is an ambiguous reference target for 01/07).

### G3 — Exact-string stability for downstream identifiers
- **Detect:** An actor/impact name as written in its owning table differs by trailing/leading whitespace, internal whitespace, or letter case from the same name where it is referenced (Impact's `Business Actor` column, or Deliverable's `Impact` column).
- **Fix:** Make every mention byte-identical to the owning-table spelling (no whitespace or case drift).
- **Severity:** ❌
- **Source:** [PLAN] (01 carries business-actor names *verbatim*; 07 persona goals reference impacts *by exact string* — case/whitespace drift breaks the seam).

### G4 — No technical/implementation leakage in actor or goal names
- **Detect:** A `Business Actor` or the goal contains tech artifacts (class names, table names, "API", "DB", "endpoint", HTTP codes, service names).
- **Fix:** Rename to the business-domain term; technical naming begins in artifact 01 and below.
- **Severity:** ⚠️
- **Source:** [S-draw] (the map is "created collaboratively by senior technical and business people" from a *business* perspective); [S-about] (Strategic planning — "not from a technical but from a business perspective").

### G5 — Impacts and deliverables not conflated across sections
- **Detect:** The same string appears both as an `Impact` and as a `Deliverable` name (the same item is filed under two branch levels).
- **Fix:** Decide whether it is a behaviour change (Impact) or a thing built (Deliverable); keep it in exactly one level.
- **Severity:** ⚠️
- **Source:** [S-draw] (the four levels are distinct branches); [S-book] ("Typical Mapping Mistakes" — confusing impacts and deliverables).

### G6 — Fingerprint covers the actual intent input
- **Detect:** The `## Upstream Fingerprint` block names no file, or names a file that is not the product-intent input this artifact was derived from.
- **Fix:** Fingerprint the actual free-text product-intent file(s) consumed.
- **Severity:** ⚠️
- **Source:** [PLAN] (fingerprint exists to detect upstream product-intent drift; an unrelated or empty fingerprint defeats it).

---

## H — Amendment discipline

This theme governs the **Amend** path (iterating an existing `specs/00-impact-map.md` from a scope delta — see SKILL.md "Amend mode"). It applies only when 00 already exists and a delta is being woven in; on a first Draft none of these rules fire. The mechanical backstop is the harness `--baseline` diff (the `baseline` block; check XD1) — these rules read that diff and judge what the harness cannot.

### H1 — Intent-first amendment
- **Detect:** An artifact element (an actor/impact/deliverable/goal change in the amended 00) has no backing in the **current** product-intent file — i.e. the amendment edited 00 without first weaving the change into the intent the artifact is fingerprinted against.
- **Fix:** Amend the intent file first, in plain business language; re-derive 00 from it; re-pin the fingerprint over the new intent bytes. The intent file stays the single source 00 is faithful to.
- **Severity:** ❌
- **Source:** [PLAN] (SKILL.md step 5 semantic-drift contract — every artifact element is faithful to the intent, no invented elements; the amend path inherits this faithfulness gate).

### H2 — Minimal diff
- **Detect:** The harness `--baseline` diff carries a content entry (an `added`/`removed`/`changed` row, or `goalChanged`) that the scope delta does not demand; untouched rows are not byte-identical to the baseline (fingerprint churn is exempt — `fingerprintChanged` is expected on any amendment).
- **Fix:** Revert the unrequested change; re-derive touching only what the delta demands, leaving every other row byte-identical to the baseline.
- **Severity:** ❌
- **Source:** [PLAN] (amend contract: a delta re-derives only what it touches; the `baseline` diff is the mechanical witness, XD1 §4.2).

### H3 — Delta traceability (the leak gate)
- **Detect:** Any `baseline` diff entry (`added`/`removed`/`changed`/`goalChanged`) that cannot be traced to the stated scope delta — judged by the delta-scoped professor over the mechanical diff, with a per-entry verdict from the closed schema `traces-to-delta | leak | style-drift`. Any `leak` or `style-drift` verdict is a finding.
- **Fix:** Remove the leaked content (it belongs in the conversation, not the artifact) or correct the drifted style; if the content is genuinely wanted, it must arrive as its own scope delta and be amended through the normal path.
- **Severity:** ❌
- **Source:** [PLAN] (the harness diff is mechanical only — XD1 §4.2 reconciles counts but does not judge warrant; delta traceability is the professor's job).

### H4 — One concern per delta
- **Detect:** A single scope delta bundles multiple unrelated concerns (e.g. a new deliverable AND an actor rename in one statement).
- **Fix:** Split into sequential deltas, each amended and reviewed separately, so every diff traces to exactly one concern.
- **Severity:** ⚠️
- **Source:** [PLAN] (amend hygiene: one concern per delta keeps the `baseline` diff legible and each entry traceable under H3).
