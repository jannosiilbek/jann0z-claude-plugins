# Personas — Closed Validation Rule Catalog

Role: this is the **closed rule catalog** for the `personas` skill (artifact `specs/07-personas.md`, artifact 7 of the 11-artifact schema-therapy pipeline). It is the **sole review vocabulary** — a reviewer may cite ONLY rules defined here, by ID. Each rule is machine-shaped as **Detect → Fix → Severity → Source**. **Pass condition: zero ❌ error findings.** ⚠️ warn and ℹ️ info findings are reported but never block. Severities: ❌ error (invalidates the artifact or breaks downstream consumption) / ⚠️ warn (canon violation degrading quality) / ℹ️ info (advisory).

The artifact owns the **persona names, the persona goals, and the jobs-to-be-done** (the job names downstream 08 builds one task model per persona-job from, and 09 builds one UI-flow per persona from). Its INPUTS are `specs/00-impact-map.md` (owns the goal, business actors, impacts, deliverables) and `specs/01-event-storming.md` (owns the domain events and system actors). 07 references 00 actors/impacts and 01 events **by exact string**; it never restates their definitions or descriptions.

Every rule cites its authority via `sources/SOURCES.md`. Sources referenced below: **[S-AF]** *About Face: The Essentials of Interaction Design*, 4th ed., Cooper/Reimann/Cronin/Noessel, 2014 — the canonical (cite-only) goal-directed text; home of the goal taxonomy and persona roles (SOURCES row 1); **[S-orig]** Cooper, "The Origin of Personas," 2003 — first-person origin account, goal-differentiated archetypes (row 2); **[S-dub]** Dubberly, "Alan Cooper and the Goal-Directed Design Process," 2001 — verbatim Cooper goals-vs-tasks quotes (row 3); **[S-nng-mem]** NN/g, Dykes, "Personas Make Users Memorable," 2025 — practical include/exclude and research-grounding authority (row 4); **[S-nng-types]** NN/g, Laubheimer, "3 Persona Types," 2020 — research-investment taxonomy, qualitative default (row 5); **[S-jtbd]** Christensen et al., "Know Your Customers' 'Jobs to Be Done'," HBR 2016 — the citable JTBD canon, admitted **SUBORDINATE** to Cooper (row 7); **[PLAN]** pipeline contract (PLAN.md / upstream & downstream seams). Source authority order per SOURCES.md §"Authority alignment": Cooper (rows 1–3) governs what a persona/goal *is*; NN/g (rows 4–5) governs construction; JTBD (row 7) is the subordinate job lens and never displaces the persona as the unit of modeling.

## Theme index

| Theme | Title | Rules |
|-------|-------|-------|
| A | Structure & format spec | A1–A8 |
| B | Goal-directed canon (Cooper) | B1–B6 |
| C | Specificity & research grounding | C1–C5 |
| D | Jobs-to-be-done (subordinate) | D1–D6 |
| E | Coverage & referential integrity | E1–E6 |
| F | Naming & language discipline | F1–F5 |

---

## A — Structure & format spec

This theme pins the required sections and block shapes. It doubles as the format spec: a mechanical linter verifies headings, per-persona block order, and the goal-line and job-table conventions against these rules. It refines WITHIN the pinned artifact shape (the persona-block seam); it never breaks it.

### A1 — Required top-level sections present, in order
- **Detect:** The artifact lacks either of these exact level-2 headings, or they do not appear in this order: `## Upstream Fingerprints`, `## Personas`.
- **Fix:** Add the missing section(s) with the exact heading text above, in the pinned order (fingerprints → personas).
- **Severity:** ❌
- **Source:** [PLAN] (pinned artifact shape: fingerprints block, then one `### <PersonaName>` block per persona under `## Personas`).

### A2 — Upstream fingerprints block (dual entry)
- **Detect:** `## Upstream Fingerprints` is absent, or does not record BOTH upstream identities used to detect drift: (1) `00-impact-map.md@sha256:<hex>`, AND (2) `01-event-storming.md@sha256:<hex>`. Missing either entry fires this rule.
- **Fix:** Add a fingerprints block naming both upstreams with their full digests: `00-impact-map.md@sha256:<64-hex>` AND `01-event-storming.md@sha256:<64-hex>`.
- **Severity:** ❌
- **Source:** [PLAN] (pipeline drift-detection contract; 07's two inputs are 00 and 01, both fingerprinted).

### A3 — Fingerprint hashes well-formed
- **Detect:** A fingerprint line's hash is not exactly 64 lowercase hexadecimal characters following `@sha256:`.
- **Fix:** Recompute the SHA-256 of the named upstream artifact and record the full 64-hex digest.
- **Severity:** ❌
- **Source:** [PLAN] (drift detection requires a stable, verifiable content hash).

### A4 — One `### <PersonaName>` block per persona
- **Detect:** Under `## Personas` there is not at least one level-3 subsection of the form `### <PersonaName>`, or content meant to be a persona is not wrapped in such a heading.
- **Fix:** Give each persona its own `### <PersonaName>` subsection.
- **Severity:** ❌
- **Source:** [PLAN] (one persona block per persona — the unit downstream 08/09 key off); [S-dub] (a persona = name + portrait, "on a single sheet").

### A5 — Per-persona block contains the three fields, in order
- **Detect:** A `### <PersonaName>` block does not contain, IN ORDER, all three of: a `**Business actor:**` line, a `**Goals:**` list, and a `**Jobs-to-be-done:**` table.
- **Fix:** Add the missing field(s) in the pinned order: `**Business actor:**` (one exact 00 string) → `**Goals:**` (list) → `**Jobs-to-be-done:**` (table).
- **Severity:** ❌
- **Source:** [PLAN] (pinned per-persona shape); [S-dub] (persona carries name, role/job description, goals).

### A6 — Goals list uses the impact-reference convention
- **Detect:** A `**Goals:**` list entry does not end with a machine-readable impact reference of the exact form `[impact: <exact 00 Impact string>]`. (A goal line carrying no `[impact: …]` token fires this rule.)
- **Fix:** Append `[impact: <exact 00 Impact string>]` to each goal line, naming at least one 00 Impact the goal advances (verbatim). A goal may reference multiple impacts with repeated tokens.
- **Severity:** ❌
- **Source:** [PLAN] (pinned goal-line convention: every goal references ≥1 00 Impact by exact string via the `[impact: …]` token — this is the machine-checkable bridge from persona goals up to 00).

### A7 — Jobs-to-be-done table shape
- **Detect:** A `**Jobs-to-be-done:**` table does not have exactly these columns, in order: `Job | Trigger | Outcome`. (`Job` = a short imperative name, snake_case-able; `Trigger` = an exact 01 event string OR a free-text domain condition; `Outcome` = an exact 01 event string — the job's success event.)
- **Fix:** Reformat the jobs table to the three-column shape above.
- **Severity:** ❌
- **Source:** [PLAN] (pinned job-table shape: `Job | Trigger (exact 01 event or domain condition) | Outcome (exact 01 event)`; downstream 08 file names are `<persona>-<job>.xml`, both snake_cased).

### A8 — No empty persona blocks or tables
- **Detect:** The `## Personas` section has zero `### <PersonaName>` blocks, OR a persona block's `**Goals:**` list has zero entries, OR its `**Jobs-to-be-done:**` table has zero data rows.
- **Fix:** Populate the artifact: at least one persona, and every persona with ≥1 goal and ≥1 job (see E2). A persona with no goal or no job is incomplete.
- **Severity:** ❌
- **Source:** [PLAN] (every persona has ≥1 goal and ≥1 job; downstream 08/09 consume non-empty goal/job sets); [S-nng-mem] (a persona without goals carries no design-relevant content).

---

## B — Goal-directed canon (Cooper)

The load-bearing discipline of this artifact: **a goal is an end condition the persona wants, NOT a task, feature, or thing built.** "Goals are not the same thing as tasks. A goal is an end condition, whereas a task is an intermediate process… The goal is a steady thing. The tasks are transient" ([S-dub]). Tasks/means are modeled later (08); here we model only stable goals.

### B1 — Goal is an end condition, not a system feature (mechanical subset)
- **Detect:** A `**Goals:**` line (text before its `[impact: …]` token) is phrased as a thing built or a software artifact: it contains a software/solution noun from the closed blocklist: `app`, `application`, `system`, `platform`, `feature`, `button`, `screen`, `page`, `dashboard`, `API`, `endpoint`, `integration`, `module`, `notification`, `email`, `report`, `form`, `database`, `portal`, `widget`, `function`, `service`, `menu`, `field`, `tab`, `modal`, `workflow`.
- **Fix:** Restate as the end condition the persona wants (e.g. not "Use the reporting dashboard" but "Know how the business is performing without digging"; not "Get a notification" but "Never miss a time-critical event").
- **Severity:** ❌ (for the mechanical blocklist subset; residual feature/task phrasing not caught by the blocklist is agent-judged and reported under B2)
- **Source:** [S-dub] (goals are end conditions, distinct from tasks; "until the user is precisely defined, the programmer can always imagine that he is the user"); [S-AF] (goal taxonomy — goals are how the user wants to feel / what they want to accomplish / who they want to be, never the software). *Severity decision: ❌ for the mechanically detectable subset. Cooper draws the goal/task (and goal/feature) boundary as the method's central discipline — a "goal" phrased as a feature collapses the persona layer into a feature list and breaks the downstream contract (08 builds task models FROM goals-in-context; a feature smuggled in as a goal poisons that). The blocklisted-noun subset is unambiguous, so it errors; the semantic residue is agent-judged and warned (B2).*

### B2 — Goal reads as an end condition, not a task or means (semantic)
- **Detect:** A goal line not caught by B1 still reads as a task, an intermediate step, or a means-to-an-end (an imperative process — "click", "submit", "configure", "navigate to") rather than the stable end state the persona wants (agent judgement).
- **Fix:** Lift to the end condition the task would serve ("the goal the task is in service of"); the task itself is modeled downstream in 08, not here.
- **Severity:** ⚠️
- **Source:** [S-dub] (Cooper: "The tasks are transient"; user goals tell designers which tasks are even worth supporting — you do not start from task analysis); [S-AF] (end goals = what the user wants to accomplish, not the steps).

### B3 — One persona = one behavioral pattern (not elastic)
- **Detect:** A single `### <PersonaName>` block describes two or more distinct behavioral patterns merged into one persona (e.g. goals/jobs that belong to clearly different user motivations stuffed under one name), OR a persona's `**Business actor:**` field names more than one 00 actor.
- **Fix:** Split into one persona per behavioral pattern, each grounded in exactly one 00 Business Actor.
- **Severity:** ❌ (when a persona maps to 2+ business actors — mechanically detectable); ⚠️ (when a single business actor's persona still mixes two behavioral patterns — agent-judged)
- **Source:** [S-orig] (the three founding personas — Chuck, Cynthia, Rob — were split by distinct goals/skill, each one pattern, never an elastic everyone); [S-AF] (a persona is a specific archetype representing one behavioral pattern, not a stretched average); [PLAN] (one persona traces to exactly one 00 Business Actor).

### B4 — Persona has at least one end goal
- **Detect:** A persona's `**Goals:**` list contains only experience-flavored or life-flavored aspirations (how the user wants to feel / who they want to be) with no end goal (what they want to accomplish) — leaving nothing for the jobs to serve.
- **Fix:** Add at least one end goal (an accomplishment the persona seeks); experience/life goals enrich but cannot stand alone here because jobs attach to end goals.
- **Severity:** ⚠️
- **Source:** [S-AF] (goal taxonomy — experience / end / life goals; end goals are "what the user wants to accomplish" and are the ones product behaviour must satisfy); [PLAN] (jobs serve the persona's stated goals — there must be an accomplishment-type goal to serve).

### B5 — Goal taxonomy enrichment (advisory)
- **Detect:** No persona's goals are differentiated by Cooper/About-Face goal level (experience = how they want to feel; end = what they want to accomplish; life = who they want to be), where the domain plausibly carries more than the end-goal level.
- **Fix:** Consider annotating goals by level for richness; successful products satisfy all three. Advisory only — end goals (B4) are the load-bearing minimum.
- **Severity:** ℹ️
- **Source:** [S-AF] (the experience / end / life goal taxonomy; "successful products satisfy all three levels"); mapped onto Norman's visceral/behavioral/reflective levels (cited in SOURCES exclusions, not admitted).

### B6 — Persona name is the design-decision language (advisory)
- **Detect:** Persona names are anonymous labels ("Persona 1", "User A", "Actor-2") that cannot serve as shared decision shorthand.
- **Fix:** Give each persona a memorable, specific name the team can reason through ("what would <Name> do?"), as the founding personas (Chuck, Cynthia, Rob) were named.
- **Severity:** ℹ️
- **Source:** [S-orig] (the persona names became the team's shared decision language — "what Cynthia would do"); [S-nng-mem] (the persona's name becomes team shorthand for a cluster of behaviours — memorability is the point).

---

## C — Specificity & research grounding

Here the research ground is the **00/01 vocabulary** — the impact map and event storming ARE the validated research this skill builds on. No party may be invented outside them.

### C1 — Persona's business actor resolves to a 00 Business Actor (exact string)
- **Detect:** A persona's `**Business actor:**` value does not exact-string-match (case- and whitespace-sensitive) a 00 `Business Actors` entry.
- **Fix:** Set the `**Business actor:**` field to the verbatim 00 business-actor name the persona embodies. If the intended actor is absent from 00, that is a 00 defect, not a 07 fix — do not invent.
- **Severity:** ❌
- **Source:** [PLAN] (every persona traces to exactly one 00 Business Actor; no invented parties); [S-nng-mem] / [S-nng-types] (personas are grounded in research — here the 00/01 vocabulary is the research ground); [S-orig] (the founding personas came from user interviews, not invention).

### C2 — No invented parties
- **Detect:** A persona, a goal, or a job introduces a named party, actor, or stakeholder that exists in neither 00 (Business Actors) nor 01 (Actors) — a fabricated user with no upstream trace.
- **Fix:** Remove the invented party, or trace it to its 00 Business Actor / 01 Actor. The scope layer (00) already enumerates every modeled party; 07 personifies them, it does not add new ones.
- **Severity:** ❌
- **Source:** [PLAN] (no invented parties; the scope layer demands every party be modeled upstream); [S-nng-mem] (ground personas in real research — fabrication "risks reinforcing wrong assumptions"); [S-nng-types] (proto-personas built without research are the explicitly-risky low end).

### C3 — Exactly one persona per behavioral pattern of an actor — no elastic personas
- **Detect:** A persona's goals/jobs blend two genuinely different user motivations such that the persona stands for "anyone who uses the actor's part of the product" rather than one behavioral cluster (the elastic-user anti-pattern).
- **Fix:** Split the elastic persona into specific personas, one behavioral pattern each (a single 00 actor MAY back two personas if it genuinely splits into two patterns — see E1/E6).
- **Severity:** ⚠️
- **Source:** [S-orig] (specific goal-differentiated archetypes, not an average user); [S-AF] (the "elastic user" is the anti-pattern personas exist to kill — precise definition ends "the programmer can always imagine he is the user").

### C4 — Goals/jobs carry only design-relevant content (no decoration)
- **Detect:** A persona block carries detail with no bearing on a downstream design decision (demographic flavour, backstory, biography) crowding the goals/jobs that 08/09 actually consume.
- **Fix:** Drop detail not tied to a design decision; "each piece of information should have a purpose." Keep goals and jobs; the artifact's downstream consumers (08/09) read only those.
- **Severity:** ℹ️
- **Source:** [S-nng-mem] ("What to exclude: anything not tied to a design decision… each piece of information should have a purpose for being included"); irrelevant detail reduces memorability.

### C5 — Persona type / grounding honesty (advisory)
- **Detect:** The artifact presents personas as research-grounded without acknowledging that, in this pipeline, the grounding is the 00/01 model (a qualitative-equivalent derivation), not fresh user interviews.
- **Fix:** Note that personas here are derived from the validated 00/01 vocabulary (the pipeline's research surrogate), not invented and not from new field research — staying honest per NN/g's persona-type framing.
- **Severity:** ℹ️
- **Source:** [S-nng-types] (qualitative persona is the recommended default; honesty about research depth matters — proto vs qualitative vs statistical); [PLAN] (00/01 is the research ground for this skill).

---

## D — Jobs-to-be-done (subordinate)

JTBD is admitted **SUBORDINATE** to Cooper: the **persona** is the unit of modeling; the **job** is the *content of a persona's goal in context* — never modeled without its persona. "JTBD must never displace persona as the modeling unit" (SOURCES §3). These rules pin the job table's exact-match resolution and the job→goal subordination.

### D1 — Every job belongs to a persona (never standalone)
- **Detect:** A job appears outside a `### <PersonaName>` block (a global jobs list, or a job table not nested under a persona).
- **Fix:** Move every job inside its owning persona's `**Jobs-to-be-done:**` table. There is no persona-less job in this artifact.
- **Severity:** ❌
- **Source:** [PLAN] / SOURCES §3 ruling ("never model a job without its persona"; downstream 08/09 key off the persona, with the job as the persona's goal-in-context); [S-jtbd] (the job framing is admitted, but as the persona's content — Cooper wins on the unit of modeling).

### D2 — Job Outcome resolves to a 01 domain event (exact string)
- **Detect:** A `Job` row's `Outcome` cell does not exact-string-match a 01 `Domain Events` `Event` entry. (The Outcome is the job's success event and MUST resolve.)
- **Fix:** Set the `Outcome` to the verbatim 01 event string that marks the job's success. If no 01 event represents that success, that is a 01 gap (raise upstream) — do not invent an event here.
- **Severity:** ❌
- **Source:** [PLAN] (pinned job-table contract: Outcome = an exact 01 event string, the job's success event, MUST resolve; 01 owns the event names); cross-artifact integrity for downstream 08/09.

### D3 — Job Trigger is either an exact 01 event or a free-text condition (exact-match-wins)
- **Detect:** A `Job` row's `Trigger` cell is ambiguous under the pinned disambiguation rule: a trigger that exact-string-matches a 01 event is treated AS that event; otherwise it is treated as a free-text domain condition. This rule fires when a trigger *almost* matches a 01 event (differs only by whitespace/case), making its intent (event vs. condition) ambiguous.
- **Fix:** Either make the trigger byte-identical to the intended 01 event (so exact-match resolves it to that event), or rephrase it so it clearly reads as a free-text domain condition and could not be mistaken for a near-miss event reference.
- **Severity:** ⚠️
- **Source:** [PLAN] (pinned: Trigger = an exact 01 event string OR a free-text condition; exact-match wins, else treated as a condition — a near-miss defeats the disambiguation).

### D4 — Job serves at least one of the persona's stated goals
- **Detect:** A job in a persona's table cannot be tied to any goal in that same persona's `**Goals:**` list (the job advances none of the persona's stated end conditions) — agent judgement where the link is unclear.
- **Fix:** Either connect the job to a stated goal (the goal it makes progress toward), or add the goal it serves, or remove the job. A job is the content of a persona's goal-in-context; an orphan job has no goal to be the context of.
- **Severity:** ⚠️
- **Source:** SOURCES §3 ruling (a job is admitted only as "the content of a persona's goal in context"; the job is the persona's goal-in-context — it must serve a stated goal); [S-jtbd] (a job is the progress a person is trying to make — here, progress toward a persona goal).

### D5 — Job name is a short imperative, unique per persona, snake_case-able
- **Detect:** Within one persona's jobs table, two `Job` names are identical or collide when snake_cased; OR a `Job` name is not a short imperative phrase (it is a noun-only label, a sentence, or a feature name); OR it cannot be cleanly snake_cased for the downstream `<persona>-<job>.xml` filename.
- **Fix:** Rename to a short, unique imperative job name that snake_cases cleanly (e.g. `reconcile invoice` → `reconcile_invoice`). Uniqueness is per persona (two different personas MAY share a job name).
- **Severity:** ❌
- **Source:** [PLAN] (pinned: Job = short imperative name, unique per persona, snake_case-able; downstream 08 file names are `<persona>-<job>.xml` with both snake_cased — a collision or unrenderable name breaks file generation).

### D6 — Trigger ↔ Outcome causal sanity (advisory)
- **Detect:** A job's `Outcome` event plausibly precedes or is unrelated to its `Trigger` (the success event could not follow from the trigger in 01's lifecycle ordering), inverting cause and effect.
- **Fix:** Check the job against 01's lifecycle skeletons: the Trigger condition/event should precede the Outcome event. Correct whichever is mis-assigned.
- **Severity:** ℹ️
- **Source:** [PLAN] (jobs ride on 01's event timeline — trigger before outcome); [S-jtbd] (a job is circumstance-triggered progress toward a result — the circumstance precedes the progress).

---

## E — Coverage & referential integrity

The scope layer (00) demands every party be modeled; this theme is the coverage gate and the exact-string resolution of every cross-artifact reference.

### E1 — Every 00 Business Actor is covered by ≥1 persona
- **Detect:** A 00 `Business Actors` entry is named by NO persona's `**Business actor:**` field (the actor is modeled in scope but personified nowhere). This is an **unmodelled party**.
- **Fix:** Add at least one persona for the uncovered business actor. A 00 actor with no persona is never silenced into a note — the scope layer demands every party be modeled.
- **Severity:** ❌
- **Source:** [PLAN] (every 00 business actor covered by ≥1 persona — the scope layer demands every party modeled); [S-AF] (every relevant user type the design serves needs a persona — coverage of the served set).

### E2 — Every persona has ≥1 goal and ≥1 job
- **Detect:** A `### <PersonaName>` block has zero goals in its `**Goals:**` list OR zero data rows in its `**Jobs-to-be-done:**` table.
- **Fix:** Give every persona at least one goal and at least one job. (A1/A8 catch the structural absence; this rule is the per-persona completeness floor.)
- **Severity:** ❌
- **Source:** [PLAN] (every persona has ≥1 goal and ≥1 job); [S-dub] (a persona without goals does no design work — "personas are the foundation for all subsequent goal-directed design").

### E3 — Every goal's impact reference resolves to a 00 Impact (exact string)
- **Detect:** A goal line's `[impact: <X>]` token holds a value `<X>` that does not exact-string-match a 00 `Impacts` entry.
- **Fix:** Correct the token to the verbatim 00 Impact string the goal advances. If the intended impact is absent from 00, that is a 00 defect (raise upstream) — do not invent.
- **Severity:** ❌
- **Source:** [PLAN] (goal impact-references resolve to 00 Impacts; A6 pins the token, this resolves it); [S-dub] (user goals drive design — and here they are tied to the measured impacts 00 owns).

### E4 — Every job Outcome resolves to a 01 event (exact string)
- **Detect:** A job's `Outcome` cell does not exact-string-match a 01 `Domain Events` entry. (Duplicate of D2's resolution from the coverage side — both are ❌; this is the coverage-gate phrasing.)
- **Fix:** Make every `Outcome` byte-identical to the 01 event it names, or raise the missing event upstream to 01.
- **Severity:** ❌
- **Source:** [PLAN] (every job's Outcome resolves to a 01 event); 01 owns the event names; cross-artifact integrity.

### E5 — Jobs unique per persona
- **Detect:** Within one persona's `**Jobs-to-be-done:**` table, two `Job` rows carry the identical (or snake_case-colliding) name. (Same collision D5 catches, here as the integrity-gate phrasing — a duplicate job is an ambiguous downstream filename.)
- **Fix:** Merge or rename so each job name is unique within its persona.
- **Severity:** ❌
- **Source:** [PLAN] (jobs unique per persona; `<persona>-<job>.xml` must be a unique downstream filename per job).

### E6 — Each 00 Impact is advanced by ≥1 persona goal (advisory)
- **Detect:** A 00 `Impacts` entry is referenced by NO goal's `[impact: …]` token across all personas (the behaviour-change impact has no persona pursuing it).
- **Fix:** Consider adding a persona goal that advances the orphan impact, or confirm the impact is deliberately not yet personified. Unlike E1 (party coverage, ❌), impact coverage is advisory — 00's own F4 already treats some impacts as deliberate backlog candidates.
- **Severity:** ℹ️
- **Source:** [PLAN] (00 impacts are the behaviour-change levers; personas pursue them via goals — but 00 permits deliberately-unserved impacts as backlog candidates, so this is advisory not blocking); [S-AF] (goals connect to the outcomes the product seeks).

---

## F — Naming & language discipline

Language discipline here is **00/01 vocabulary only**. (Artifact 02's Forbidden Synonyms exist but 02 is NOT an input to 07 — do NOT create a dependency on it.)

### F1 — Persona names unique
- **Detect:** Two `### <PersonaName>` headings carry the identical name string (or collide when snake_cased for the downstream `<persona>-<job>.xml` filename).
- **Fix:** Rename so every persona name is unique and snake_cases distinctly (persona names are downstream filename components).
- **Severity:** ❌
- **Source:** [PLAN] (persona names unique; `<persona>` is half of the downstream 08 filename — a collision is an ambiguous file target); [S-orig] (each founding persona had a distinct name — Chuck, Cynthia, Rob).

### F2 — Persona name casing convention (PascalCase)
- **Detect:** A `### <PersonaName>` heading is not in **PascalCase** (a single capitalized token or capitalized concatenation, e.g. `FieldTechnician`, `Cynthia`), e.g. it is lower-case, snake_case, kebab-case, or a multi-word spaced phrase.
- **Fix:** Render persona names in PascalCase so they snake_case deterministically for the `<persona>-<job>.xml` filename and read as proper-noun archetypes.
- **Severity:** ⚠️
- **Source:** [PLAN] (a single casing convention must be pinned for deterministic downstream filenames — PascalCase chosen); [S-orig] (personas are named proper-noun archetypes).

### F3 — No invented vocabulary beyond 00/01
- **Detect:** A persona name, goal, or job introduces domain vocabulary (an entity, event, or actor term) that contradicts or invents around the 00/01 ubiquitous language — a synonym for a 00 actor/impact or a 01 event that is not the verbatim string.
- **Fix:** Use the 00/01 terms verbatim where referencing them; persona/goal/job phrasing may add natural language but must not coin competing names for upstream-owned concepts. (Resolution of the *reference fields* is enforced by C1/E3/E4; this rule covers free-text leakage.)
- **Severity:** ⚠️
- **Source:** [PLAN] (language discipline = 00/01 vocabulary only; do not create a 02 dependency); [S-orig] (personas carry the team's shared, consistent vocabulary).

### F4 — No restated 00 descriptions or 01 responsibilities (DRY)
- **Detect:** A persona block restates an actor's 00 `Description` text or an actor's 01 `Responsibility` text (copied/near-copied table content) instead of referencing the actor by exact string and adding only persona-layer content (goals, jobs).
- **Fix:** Reference the business actor by its exact 00 string only; do not restate its 00 description or 01 responsibility. 07 personifies the actor (goals + jobs); it never re-defines it.
- **Severity:** ⚠️
- **Source:** [PLAN] (07 references 00 actors/01 events by exact string; never restates definitions/descriptions — single-ownership / DRY); [S-nng-mem] (carry only purpose-driven, non-redundant content).

### F5 — No vague filler in names
- **Detect:** A persona name, goal, or job uses vague filler from the closed blocklist: `manage`, `handle`, `process`, `stuff`, `various`, `etc.`, `things`, `data`, `user`, `someone`, `general`, `misc` — in place of a precise term. (Whole-word match; "user" as a persona name is the elastic-user smell C3 targets.)
- **Fix:** Replace with the precise persona/goal/job term grounded in 00/01.
- **Severity:** ⚠️
- **Source:** [S-nng-mem] (precise, purpose-driven content — no filler); [S-AF] ("user" as a name is the elastic-user anti-pattern); [PLAN] (precise downstream identifiers).
