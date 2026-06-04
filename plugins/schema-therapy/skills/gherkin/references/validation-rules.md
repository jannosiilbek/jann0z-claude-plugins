# `gherkin` validation-rules — closed rule catalog

Validation catalog for **artifact 06** of the `schema-therapy` pipeline — the
**final** artifact. Artifact 06 is a **directory artifact** —
`specs/06-gherkin/` — holding **one `.feature` file per 03 aggregate**, encoding
the **executable behavior scenarios** for the modelled domain.

**Inputs:** `specs/02-glossary.md` (terms, enums `### <Aggregate>Status`,
forbidden synonyms), `specs/03-aggregates.md` (aggregates, boundaries,
invariants `INV-<Agg>-<n>`, cross-aggregate policies),
`specs/04-erd.dbml` + `specs/04-transitions.md` (data model + transition
tables), and `specs/05-statecharts/*.scxml` **when emitted** (the lifecycle
authority for each promoted entity). 06 **references** upstream by exact string
and **never restates** definitions, invariant text, enum listings, or 04 rows
(DRY). 06 is terminal: nothing consumes it, and it **never edits** upstream.

**Lifecycle-authority rule (binding).** For an entity **promoted** to 05, the
`<entity>.scxml` is the lifecycle authority and 04's table for it is
superseded. For every **non-promoted** entity, the 04 transition table is the
authority. A scenario MUST exercise transitions from the authoritative source
for its entity and MUST NOT assert a `From→To` that the authority does not
contain.

**Normative authorities** (per `sources/SOURCES.md` authority ruling):
- **Syntax (what parses)** → `gherkin.berp` grammar + `gherkin-languages.json`
  + the **`@cucumber/gherkin` v39.1.0** reference parser (normative; the
  tie-breaking oracle is `sources/testdata/{good,bad}/`). Every emitted
  `.feature` MUST parse clean under this pinned parser.
- **Semantics (what each construct means)** →
  `sources/gherkin-docs/gherkin-reference.md` (cucumber.io reference):
  Feature/Rule/Scenario, Given/When/Then, Background, Scenario Outline +
  Examples, Data Tables, Doc Strings, Tags, Comments, `# language:`.
- **Style / scenario canon (how to write good Gherkin)** →
  `sources/gherkin-docs/writing-better-gherkin.md` (declarative-over-imperative)
  + `sources/gherkin-docs/cucumber-anti-patterns.mdx` (conjunction steps,
  feature-coupling, UI-coupling) + `sources/gherkin-docs/gherkin-step-organization.mdx`
  (domain-concept grouping, DRY steps).

## Pinned conventions (binding for every rule below)

- **Directory + file naming (PINNED).** Artifact root = `specs/06-gherkin/`.
  One file per 03 aggregate named `<aggregate>.feature`, where `<aggregate>` is
  the **`snake_case` of the exact 03 `### <AggregateName>`** (e.g. aggregate
  `Order` → `order.feature`; `PurchaseOrder` → `purchase_order.feature`). One
  `Feature:` per file (grammar permits exactly one). Pin exactly: one file per
  aggregate, no more, no fewer.
- **`Feature:` name (PINNED).** The `Feature:` line text is the **exact 03
  `### <AggregateName>`** string (e.g. `Feature: Order`), verbatim — not the
  snake_case filename, not a paraphrase.
- **Fingerprint block (PINNED).** Each file opens with a comment block listing
  ALL consumed upstreams as `<file>@sha256:<64-hex>`, one per line, before the
  `Feature:` line. Always: `02-glossary.md`, `03-aggregates.md`,
  `04-erd.dbml`, `04-transitions.md`. Plus, for **each** 05 file this feature's
  scenarios consume, that `<entity>.scxml`. Form (Gherkin comments start with
  `#`, the only legal placement per the reference — start of a new line):
  ```
  # fingerprints:
  #   02-glossary.md@sha256:<64-hex>
  #   03-aggregates.md@sha256:<64-hex>
  #   04-erd.dbml@sha256:<64-hex>
  #   04-transitions.md@sha256:<64-hex>
  #   05-statecharts/order.scxml@sha256:<64-hex>   # only if consumed
  ```
- **Tag grammar (PINNED, CLOSED).** Tags are alphanumeric tokens with no
  whitespace (grammar: `A tag may not contain whitespace`). Every scenario
  carries **exactly one** source-linking tag drawn from this closed set, tying
  it to its upstream obligation:
  - `@invariant:INV-<Agg>-<n>` — scenario proving the 03 invariant
    (verbatim INV id from 03).
  - `@transition:<entity>` — scenario exercising a lifecycle transition of the
    04/05 entity (`<entity>` = the 04 `### <TableName>` / 05 file stem,
    snake_case).
  - `@terminal:<entity>` — negative scenario proving a terminal state admits no
    further transition.
  - `@policy:<PolicyName>` — scenario exercising a 03 cross-aggregate policy
    (`<PolicyName>` = the 03 `Policy` cell, whitespace→`_`; an internal hyphen is
    preserved verbatim, so an id-style policy name like `POL-1` stays `@policy:POL-1`).
  No other tag namespaces are permitted. (Framework-execution tags like `@wip`
  are out of scope for this catalog and MUST NOT substitute for a source tag.)
  Tag-name character classes (closed): `@invariant:INV-<Agg>-<n>` and
  `@policy:<PolicyName>` admit the hyphen (both source-name forms legally carry one —
  the `INV-…-n` id and a `POL-1`-style policy name); `@transition:<entity>` /
  `@terminal:<entity>` are snake_case 04/05 stems (`[a-z][a-z0-9_]*`, no hyphen — the
  filename mapping folds `-`→`_`).
- **Event-phrasing convention (PINNED, ONE form — exact-string-embedded).** A
  `When` step that exercises a lifecycle transition MUST contain the **exact 01
  event string** (the `Event` cell from 04, which is the exact 01 string) as a
  literal substring, in domain words. E.g. for event `Order Placed`:
  `When the Order Placed event occurs` or `When the customer places the order
  (Order Placed)`. The exact 01 string MUST appear verbatim somewhere in the
  `When` step text. This is the single mechanical hook linking a `When` to its
  transition row; no transform variant is permitted.
- **Scenario-naming convention (PINNED).** Each scenario title describes the
  **behavioral outcome** (not the mechanics), present tense, third-person, e.g.
  `Placing an order on a draft cart confirms the order`, not
  `Test order placement` or `User clicks Place Order`. Negative/terminal
  scenarios name the rejected outcome, e.g. `A cancelled order rejects further
  placement`.
- **State language (PINNED).** Steps naming a lifecycle state use the **02 enum
  value verbatim** (`### <Aggregate>Status` `Value`). Steps naming a domain
  concept use the **02 Term verbatim**. No invented entities, states, or
  events anywhere.

## Theme index

- **A. Structure & file shape** (A1–A8) — directory artifact, per-aggregate file, fingerprints, single Feature, parse-clean, tags, naming. [8]
- **B. Coverage obligations** (B1–B6) — every invariant, every transition, every terminal, every policy gets ≥1 correctly-tagged scenario; no contradiction of the authority. [6]
- **C. Gherkin canon** (C1–C9) — declarative style, one-behavior, G/W/T roles, single When, no conjunction steps, Background scope, Scenario Outline, no incidental detail. [9]
- **D. Language discipline & ubiquitous language** (D1–D5) — 02 Terms/enums verbatim, exact-01-event in When, no forbidden synonyms, no invented vocabulary. [5]
- **E. DRY & single ownership** (E1–E4) — no restated invariant text, no enum listings, no transition-table dumps, reference upstream by tag/id. [4]

**Pass condition: zero ❌.** Severities: ❌ blocker · ⚠️ advisory/judgment · ℹ️ info.
Rules tagged **[PLAN]** are pure pipeline-contract rules (no classical source).

---

## A. Structure & file shape

### A1 — Directory artifact present; one `.feature` per 03 aggregate
- **Detect:** `specs/06-gherkin/` is absent, empty, OR the set of `*.feature`
  files ≠ the set of 03 `### <AggregateName>` blocks (a missing aggregate file,
  an extra file for no aggregate, or two files for one aggregate).
- **Fix:** Emit `specs/06-gherkin/` with exactly one `.feature` per 03
  aggregate; no more, no fewer.
- **Severity:** ❌
- **Source:** [PLAN] (structure theme: one file per aggregate).

### A2 — File named `<aggregate>.feature` (snake_case of exact 03 name)
- **Detect:** A file is not named `<snake_case(03 AggregateName)>.feature`
  (wrong casing, pluralization, paraphrase, or mismatched stem).
- **Fix:** Name each file the snake_case of the exact 03 aggregate +
  `.feature` (e.g. `Order` → `order.feature`).
- **Severity:** ❌
- **Source:** [PLAN] (pinned filename convention).

### A3 — `Feature:` name is the exact 03 aggregate string
- **Detect:** The `Feature:` line text ≠ the exact 03 `### <AggregateName>`
  (uses the snake_case stem, a paraphrase, or a description instead of the
  name).
- **Fix:** Set `Feature: <exact 03 AggregateName>` verbatim.
- **Severity:** ❌
- **Source:** [PLAN] (Feature name = 03 aggregate); reference (one `Feature`
  per file).

### A4 — Fingerprint block present, well-formed, names all consumed upstreams
- **Detect:** No leading `# fingerprints:` comment block, OR it omits any of
  `02-glossary.md`, `03-aggregates.md`, `04-erd.dbml`, `04-transitions.md`, OR
  it omits a `05-statecharts/<entity>.scxml` whose transitions this feature's
  scenarios consume, OR any hash is not 64 hex chars, OR the block is placed
  after the `Feature:` line (comments are legal only at the start of a line; a
  leading block is required).
- **Fix:** Emit the pinned `# fingerprints:` block before `Feature:`, listing
  all four base upstreams plus every consumed 05 file; recompute on every
  regeneration.
- **Severity:** ❌
- **Source:** [PLAN] (fingerprint all consumed upstreams); reference (comments
  start a line).

### A5 — Every file parses clean under `@cucumber/gherkin` v39.1.0
- **Detect:** A `.feature` file produces a `parseError` from the pinned parser
  — e.g. text before `Feature` (`expected: …, got '…'`), an inconsistent
  data-table cell count, an unclosed Doc String, a tag containing whitespace,
  an unsupported `# language:`, or unexpected EOF.
- **Fix:** Make every file accepted by the pinned parser; the
  `sources/testdata/bad/*.errors.ndjson` corpus is the oracle for which
  malformations are rejected and with what diagnostic.
- **Severity:** ❌
- **Source:** grammar `gherkin.berp` + `@cucumber/gherkin` v39.1.0
  (normative parser); `sources/testdata/bad/`.

### A6 — Exactly one source-linking tag per scenario, from the closed grammar
- **Detect:** A scenario (or Scenario Outline) carries zero source-linking
  tags, more than one, or a tag outside the closed set
  `@invariant:` / `@transition:` / `@terminal:` / `@policy:`, OR a tag
  contains whitespace (parser-rejected), OR the tag's referent does not exist
  upstream (e.g. `@invariant:INV-Order-9` with no INV-Order-9 in 03).
- **Fix:** Give every scenario exactly one tag from the closed grammar whose
  referent resolves to a real 03 invariant / 04|05 entity / 03 policy.
- **Severity:** ❌
- **Source:** [PLAN] (pinned closed tag grammar); grammar (tags carry no
  whitespace — `sources/testdata/bad/whitespace_in_tags.feature`).

### A7 — Scenario titles describe the behavioral outcome (pinned naming)
- **Detect:** A scenario title is mechanical / implementation-flavored
  (`Test X`, `User clicks …`, `Verify endpoint`), is empty, or restates the
  step text rather than the outcome.
- **Fix:** Title each scenario by its behavioral outcome, present tense,
  third-person (e.g. `Placing an order on a draft cart confirms the order`).
- **Severity:** ⚠️
- **Source:** writing-better-gherkin (describe behaviour, *what* not *how*);
  [PLAN] (pinned naming convention).

### A8 — English dialect; no stray `# language:` header
- **Detect:** A file declares a non-`en` `# language:` header (the pipeline is
  English-keyword), OR uses a non-supported language code (parser-rejected:
  `Language not supported`), OR mixes localized keywords.
- **Fix:** Omit the header (English is the default) or pin `# language: en`;
  use only the English primary keywords.
- **Severity:** ⚠️
- **Source:** `gherkin-languages.json` (`en` keyword set); reference
  (Spoken Languages); `sources/testdata/bad/invalid_language.feature`.

---

## B. Coverage obligations

### B1 — Every 03 invariant has ≥1 scenario proving it (violating action rejected)
- **Detect:** A 03 invariant `INV-<Agg>-<n>` has no scenario tagged
  `@invariant:INV-<Agg>-<n>` in the aggregate's feature, OR the tagged
  scenario's `When` performs a **permitted** action rather than the
  invariant-**violating** one (so it does not actually exercise the rule).
- **Fix:** For each 03 invariant, emit ≥1 scenario whose `When` attempts the
  action the invariant forbids and whose `Then` asserts rejection; tag it
  `@invariant:INV-<Agg>-<n>`.
- **Severity:** ❌
- **Source:** [PLAN] (coverage: every invariant ≥1 violating-action scenario);
  03 invariant ownership.

### B2 — Every lifecycle transition has ≥1 happy-path scenario (authoritative source)
- **Detect:** A transition from the **authoritative source** for the entity
  (05 `<entity>.scxml` if promoted, else the 04 `### <table>` row) has no
  scenario exercising it — i.e. no `@transition:<entity>` scenario whose
  `Given` is the `From` state, whose `When` embeds the exact 01 event string,
  and whose `Then` asserts the `To` state.
- **Fix:** Emit ≥1 happy-path scenario per authoritative transition; tag
  `@transition:<entity>`.
- **Severity:** ❌
- **Source:** [PLAN] (coverage: every transition ≥1 happy-path, from the
  authoritative source).

### B3 — Every terminal state has a no-further-transition negative scenario
- **Detect:** A state that is **terminal** in the authoritative source (no
  outgoing transition: a 04 `To` value never appearing as a `From`, or a 05
  `<final>` / sink) has no `@terminal:<entity>` scenario showing that a further
  event is rejected / has no effect.
- **Fix:** For each terminal state, emit a negative scenario: `Given` the
  terminal state, `When` a further event is attempted, `Then` it is rejected /
  the state is unchanged; tag `@terminal:<entity>`.
- **Severity:** ❌
- **Source:** [PLAN] (coverage: terminal-state no-further-transition negative
  scenario).

### B4 — Every cross-aggregate policy has ≥1 scenario (eventual mode phrased as eventual)
- **Detect:** A 03 `## Cross-Aggregate Policies` row has no `@policy:<PolicyName>`
  scenario, OR an **eventual**-mode policy is phrased as an immediate/synchronous
  outcome rather than an eventual consequence.
- **Fix:** Emit ≥1 scenario per policy: `When` the source event (exact 01
  string) occurs on the source aggregate, `Then` the target-aggregate
  consequence follows. For **eventual** mode, phrase the `Then` as an eventual
  consequence — PINNED phrasing: `Then eventually <target consequence>` (e.g.
  `Then eventually the Shipment is scheduled`). For **transactional** mode,
  phrase it as an immediate `Then`. Tag `@policy:<PolicyName>`.
- **Severity:** ❌
- **Source:** [PLAN] (coverage: every policy ≥1 scenario; eventual phrased as
  eventual consequence); 03 policy ownership.

### B5 — No scenario contradicts the authoritative transition source
- **Detect:** A scenario asserts a `From→To` (Given state → Then state under an
  event) that the authoritative source does **not** contain — an invented edge,
  a removed edge re-asserted, or a transition contradicting a 05 statechart for
  a promoted entity (e.g. using the superseded 04 table instead).
- **Fix:** Assert only transitions present in the authoritative source; for
  promoted entities consume the 05 statechart, never the superseded 04 table.
- **Severity:** ❌
- **Source:** [PLAN] (no asserting a From→To that does not exist;
  lifecycle-authority rule).

### B6 — Data-varied behavior uses Scenario Outline + Examples, not copy-paste
- **Detect:** Two or more near-identical scenarios differ only in data values
  (e.g. several invariant-boundary cases) and are copy-pasted instead of
  collapsed into a `Scenario Outline` with an `Examples` table.
- **Fix:** Collapse data-varied scenarios into a `Scenario Outline` with
  `< >`-delimited parameters and an `Examples` table; keep the source tag on
  the outline.
- **Severity:** ⚠️
- **Source:** reference (Scenario Outline / Examples); writing-better-gherkin
  (avoid copy-paste).

---

## C. Gherkin canon

### C1 — Declarative, not imperative (domain language, no UI mechanics)
- **Detect:** A step describes UI mechanics — "click", "press the button",
  "type … in the field", "visit /login", "see X on the page" — instead of the
  domain behavior (*how*, not *what*).
- **Fix:** Rewrite in domain language (`When the customer places the order`,
  not `When I click "Place Order"`); push mechanics into step definitions.
- **Severity:** ❌
- **Source:** writing-better-gherkin (declarative style; "Imagine it's 1922");
  anti-patterns (UI-coupling).

### C2 — One behavior per scenario
- **Detect:** A scenario asserts more than one independent behavior / business
  rule (multiple unrelated `When`→`Then` arcs, or a `Then` block proving two
  distinct outcomes), so it could fail for unrelated reasons.
- **Fix:** Split into one scenario per behavior; each scenario illustrates a
  single rule/example.
- **Severity:** ❌
- **Source:** reference (Example illustrates one rule); example-mapping
  (one example per rule facet).

### C3 — Single `When`: exactly one action/event per scenario
- **Detect:** A scenario has more than one `When` step (or a `When … And …`
  chaining two actions), so it exercises more than one event.
- **Fix:** Keep exactly one `When` describing one action/event; if a second
  action is needed it is a separate scenario (or belongs in `Given` as
  established context).
- **Severity:** ❌
- **Source:** reference (When = an event/action); writing-better-gherkin.

### C4 — Given/When/Then role discipline (no actions in Then; Given is context)
- **Detect:** A `Then` step performs a further action (not an assertion), OR a
  `Given` describes user interaction / an action instead of established state,
  OR `When`/`Then` order is scrambled.
- **Fix:** `Given` = context (past/present state, the scene), `When` = the one
  action/event, `Then` = outcome assertion(s) only — no further actions in
  `Then`.
- **Severity:** ❌
- **Source:** reference (Given/When/Then semantics: Given puts the system in a
  known state, Then asserts an observable outcome).

### C5 — No conjunction steps (one fact per step)
- **Detect:** A single step combines multiple facts/actions with "and"
  (`Given I have shades and a brand new Mustang`, `When X and Y happen`).
- **Fix:** Split into separate steps joined by `And`/`But`
  (`Given I have shades` / `And I have a brand new Mustang`); keep steps
  atomic.
- **Severity:** ⚠️
- **Source:** anti-patterns (Conjunction steps — "keep your steps atomic").

### C6 — `And`/`But` overuse / step-count discipline
- **Detect:** A scenario has so many `And`/`But` steps it loses expressive
  power (reference guidance: ~3–5 steps; long step lists signal incidental
  detail or multiple behaviors).
- **Fix:** Reduce to the essential steps; lift shared `Given`s to `Background`,
  raise the abstraction level, or split the scenario.
- **Severity:** ⚠️
- **Source:** reference (recommend 3–5 steps per example); writing-better-gherkin.

### C7 — `Background` holds only shared context (Given), never actions
- **Detect:** A `Background` contains `When`/`Then` steps, sets up complicated
  incidental state the reader needn't know, or duplicates a `Given` that only
  some scenarios share.
- **Fix:** Put only shared `Given` context in `Background`, keep it short
  (≤4 lines) and vivid; if not shared by all scenarios, inline it or split via
  `Rule`/feature.
- **Severity:** ⚠️
- **Source:** reference (Background = shared `Given` steps; tips for using
  Background).

### C8 — No incidental detail; observable outcomes only
- **Detect:** Steps specify values that don't matter to the behavior (exact IDs,
  emails, timestamps where any value works), OR a `Then` asserts a non-observable
  internal state ("a row exists in the database") instead of an observable
  outcome.
- **Fix:** Drop incidental specifics (use higher-level domain steps); assert
  only observable outcomes (reports, messages, state visible to a user/external
  system).
- **Severity:** ⚠️
- **Source:** reference (Then asserts an *observable* outcome; "resist looking
  in the database"); writing-better-gherkin (hide incidental detail).

### C9 — No duplicate step text differing only by keyword
- **Detect:** Two steps share identical text under different keywords
  (`Given there is money in my account` / `Then there is money in my
  account`) — the parser treats these as the same step definition, an
  ambiguity smell.
- **Fix:** Disambiguate by phrasing `Given` as established state and `Then` as
  an assertion with distinct wording (`Given my account has a balance of £430`
  / `Then my account should have a balance of £430`).
- **Severity:** ℹ️
- **Source:** reference (Steps — keywords are ignored when matching; duplicates
  forced apart by clearer domain language).

---

## D. Language discipline & ubiquitous language

### D1 — Steps use 02 Terms verbatim for domain concepts
- **Detect:** A step names a domain concept with a word that is not the exact
  02 `Term` (a paraphrase, plural drift, or near-synonym not in 02).
- **Fix:** Use the exact 02 Term; the feature speaks the glossary's ubiquitous
  language.
- **Severity:** ❌
- **Source:** [PLAN] (ubiquitous language = 02 Terms); reference (Gherkin uses
  the domain experts' language).

### D2 — State steps use 02 enum values verbatim
- **Detect:** A step naming a lifecycle state uses a word that is not the exact
  02 `### <Aggregate>Status` enum `Value` (e.g. `shipped` where the enum value
  is `Dispatched`).
- **Fix:** Use the 02 enum value verbatim for every state mentioned in
  `Given`/`Then`.
- **Severity:** ❌
- **Source:** [PLAN] (state language = 02 enum values); 02 enum ownership.

### D3 — `When` steps embed the exact 01 event string (pinned phrasing)
- **Detect:** A `@transition:` or `@policy:` scenario's `When` step does not
  contain the exact 01 event string (the 04 `Event` cell) as a literal
  substring, OR embeds a paraphrased/transformed event name.
- **Fix:** Phrase the `When` in domain words **and** include the exact 01 event
  string verbatim (e.g. `When the Order Placed event occurs`).
- **Severity:** ❌
- **Source:** [PLAN] (pinned event-phrasing: exact-string-embedded, one form).

### D4 — No forbidden synonyms anywhere
- **Detect:** A `Forbidden term` from 02's forbidden-synonyms table appears in
  any step, title, tag, description, or comment **as free prose**. The ban
  targets free prose, NOT a token that lies inside a MANDATED verbatim
  derivation: a forbidden sub-token occurring inside an embedded exact 01 event
  string (which D3 *compels* the `When` to contain verbatim), or inside a
  verbatim 02 Term / 02 enum value, is exempt — e.g. forbidden `Section` inside
  the exact 01 event `Seating Section Defined` does not fire. (Suite precedent:
  the erd L12 exemption — a forbidden token compelled by a downstream rule is not
  a synonym choice.) A forbidden token OUTSIDE every such span still fires.
- **Fix:** Replace any free-prose occurrence with the canonical 02 term; leave
  mandated verbatim derivations (the exact 01 event / Term / enum value) intact.
- **Severity:** ❌
- **Source:** [PLAN] (02 forbidden-synonyms contract).

### D5 — No invented entities, states, or events
- **Detect:** A step references an aggregate/entity, state, or event that
  exists in no upstream (not a 02 Term, not a 02 enum value, not a 04/01 event,
  not a 03 aggregate) — fabricated domain vocabulary.
- **Fix:** Reference only upstream-defined vocabulary; if the domain truly
  needs a new concept, it belongs upstream (02/03/04), not invented here.
- **Severity:** ❌
- **Source:** [PLAN] (no invented entities/states/events; single ownership
  upstream).

---

## E. DRY & single ownership

### E1 — Scenarios never restate invariant rule text verbatim
- **Detect:** A step, title, or description copies a 03 invariant's `Rule` text
  instead of demonstrating it by example and linking via `@invariant:` tag.
- **Fix:** Demonstrate the invariant through a concrete violating-action
  scenario; reference the rule only by its `@invariant:INV-<Agg>-<n>` tag — do
  not paste the rule text.
- **Severity:** ❌
- **Source:** [PLAN] DRY (03 owns invariant text); example-mapping (examples
  illustrate rules, they don't restate them).

### E2 — No enum value listings
- **Detect:** A step, description, comment, or Examples table enumerates an
  aggregate's full status enum (dumping all 02 `### <Aggregate>Status` values)
  rather than naming the specific states a scenario needs.
- **Fix:** Name only the specific enum value(s) the scenario exercises; 02 owns
  the enum.
- **Severity:** ❌
- **Source:** [PLAN] DRY (02 owns enums).

### E3 — No transition-table dumps in comments/descriptions
- **Detect:** A comment, Feature/Scenario description, or Data Table reproduces
  a 04 transition table (or a 05 transition set) wholesale instead of
  exercising individual transitions as scenarios.
- **Fix:** Encode each needed transition as a scenario; reference the table by
  artifact name (`04-transitions.md#<table>` or the 05 file), never paste it.
- **Severity:** ❌
- **Source:** [PLAN] DRY (04/05 own the transition data).

### E4 — Upstream is referenced by tag/id, not paraphrased
- **Detect:** A description or comment paraphrases upstream content (an
  invariant, a policy, a definition) instead of pointing to it by tag or
  artifact + identifier.
- **Fix:** Link by the closed tag (`@invariant:INV-Order-1`,
  `@policy:<Name>`) or a by-name reference (`03 aggregate Order`,
  `01 event "Order Placed"`); never paraphrase.
- **Severity:** ⚠️
- **Source:** [PLAN] DRY; step-organization (organize by domain concept, reuse
  not restate).
