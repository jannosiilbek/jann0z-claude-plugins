# `statecharts` validation-rules — closed rule catalog

Validation catalog for **artifact 05** of the `schema-therapy` pipeline. Artifact 05
is a **directory artifact** — `specs/05-statecharts/` — holding **one
`<entity>.scxml` SCXML state machine per gate-passing lifecycle entity** (entity =
the 04 `### <TableName>`). It is **conditional**: emitted only when at least one
entity passes the statechart gate; when none pass, the directory is **not emitted**
and downstream skills consume the 04 transition tables directly.

**The statechart gate (plan-owned, verbatim):** "04 owns a transition table for
every entity with a lifecycle. statecharts promotes each entity that passes the
gate — **>4 states, guards, transition actions, or concurrency** — into its own
SCXML document, declaring inside the 05 document that it supersedes the entity's 04
table; **04 is never edited**. When no entity passes the gate, 05 is not emitted and
downstream skills consume the 04 transition tables."

**Inputs:** `specs/01-event-storming.md` (domain event names),
`specs/02-glossary.md` (enums `### <Aggregate>Status` with `Value | Derived from
event`; forbidden synonyms), `specs/03-aggregates.md` (aggregates, invariants),
`specs/04-erd.dbml` + `specs/04-transitions.md` (transition tables). 05
**references** upstream by exact string and **never restates** definitions,
invariant text, or 04 rows beyond the required transitions (DRY). **04 is never
edited** — 05 declares supersession instead.

**Normative authorities** (per `sources/SOURCES.md` authority ruling):
- SCXML syntax + execution semantics → **W3C SCXML Recommendation
  `REC-scxml-20150901`** (`sources/gathered/w3c-scxml-recommendation-2015.html`) +
  its **Errata** (`sources/gathered/w3c-scxml-errata.html`). When any source
  conflicts on *what the machine does*, the Rec wins (SOURCES.md authority #1).
- Conformance oracle → **W3C IRP test suite**
  (`sources/gathered/w3c-irp-tests/manifest.xml` + stored `.txml` slice). Passing
  the suite *is* conformance (authority #2).
- The formalism's concepts (hierarchy/XOR-AND decomposition, orthogonality,
  history, depth) → **Harel 1987**
  (`sources/gathered/harel-1987-statecharts-visual-formalism.pdf`); normative on
  *why* statecharts are shaped this way, never overriding the Rec on SCXML
  execution (authority #3).
- Executable interpreter (dormant, version-pinned) → **SCION
  `@scion-scxml/core@2.6.24` / `@scion-scxml/scxml@4.3.27`** (authority #2 oracle;
  staleness-flagged in SOURCES.md "Concerns").

## Pinned conventions (binding for every rule below)

- **Directory + file naming.** Artifact root = `specs/05-statecharts/`. One file
  per gate-passing entity named `<table_name>.scxml`, where `<table_name>` is the
  exact 04 `### <TableName>` (already `snake_case` singular, e.g. `order.scxml`).
- **Event-name transform (PINNED, ONE convention).** SCXML `event` attribute names
  are alphanumeric tokens segmented by `.` (Rec §3.12.1); spaces are illegal. The
  04 `Event` column carries the **exact 01 string with spaces** (e.g. `Order
  Placed`). Transform: **`event` attr = lowercase the 01 string and replace each
  run of whitespace with a single `_`** → `order_placed`. The **exact original 01
  string MUST be recorded** on the same `<transition>` as a **machine-readable
  annotation** — PINNED form: `<!-- 01-event: Order Placed -->` immediately
  preceding (or as the first child of) the `<transition>`. This is the single
  pinned convention; no `<data>`-element variant is permitted (one machine-readable
  form only). Round-trip: `01-event` annotation → transform → `event` attr MUST
  reproduce the attr exactly.
- **datamodel (PINNED = `null`).** The root `<scxml>` carries
  `datamodel="null"`. Rationale: these machines encode *lifecycle structure* (the
  04 table promoted with hierarchy/parallel/guards-as-structure), not data
  computation. The null datamodel is fully supported by SCION and is the most
  portable conformance target (no ECMAScript engine dependency on the dormant
  oracle). Guards that need expression evaluation are the **one** exception: a file
  whose gate justification is *guards* and which therefore needs `cond`
  expressions MAY pin `datamodel="ecmascript"` instead — but MUST then declare it
  and keep every `cond` to SCION-supported ECMAScript. Default and preferred:
  `null`.
- **supersedes declaration (PINNED, machine-readable).** Each file MUST carry, in
  its header comment region, exactly:
  `<!-- supersedes: 04-transitions.md#<table_name> -->` naming the 04 table this
  machine replaces. This is the in-document assertion the gate requires; **04 is
  never edited**.
- **refines declaration (PINNED, machine-readable).** Any transition, guard,
  action, hierarchy boundary, or parallel region the machine adds **beyond** the 04
  table MUST be annotated `<!-- refines: <free-text reason> -->` on the adding
  element. The machine MAY refine (that is its value) but MUST NOT **contradict**
  04 (see Theme D). A new basic-state→basic-state `From→To` pair not present in 04
  is only legal when carrying a `refines:` annotation.
- **State ids = 02 enum values verbatim.** The machine's **basic-state** ids are
  exactly the entity's 02 `### <Aggregate>Status` enum values (`snake_case`, as
  copied into 04). Compound/parallel/initial/history wrapper states introduced for
  structure carry fresh ids that MUST NOT collide with any enum value.
- **Initial state = the 04 `∅`-row `To` value.** Root `<scxml initial="…">` (or
  document-order first child) resolves to the state named in the 04 initial
  (`From = ∅`) row.
- **Fingerprints.** A leading `<!-- fingerprints: … -->` comment block lists ALL
  consumed upstreams as `<file>@sha256:<64-hex>`:
  `01-event-storming.md`, `02-glossary.md`, `03-aggregates.md`, `04-erd.dbml`,
  `04-transitions.md`.

## Theme index

- **A. Structure & document shape** (A1–A8) — directory artifact, per-file scaffolding, fingerprints, supersedes, version/xmlns/datamodel. [8]
- **B. Gate / promotion** (B1–B5) — promote iff gate passes; no unjustified or missed promotions; non-promoted absent. [5]
- **C. Fidelity to 04** (C1–C6) — basic-state set, every 04 row present, initial, no contradiction, refinement annotated. [6]
- **D. SCXML / Harel canon** (D1–D9) — schema-validity, id uniqueness, target existence, reachability, finals, determinism, hierarchy/concurrency. [9]
- **E. Language discipline & DRY** (E1–E4) — no forbidden synonyms, no restated rows/invariants, reference by name, event-annotation round-trip. [4]

**Pass condition: zero ❌.** Severities: ❌ blocker · ⚠️ advisory/judgment · ℹ️ info.
Rules tagged **[PLAN]** are pure pipeline-contract rules (no classical source).

---

## A. Structure & document shape

### A1 — Directory artifact present iff the gate fires
- **Detect:** `specs/05-statecharts/` exists but contains no `.scxml` file, OR it is absent while ≥1 entity passes the gate (see Theme B), OR it exists while **no** entity passes the gate.
- **Fix:** Emit `specs/05-statecharts/` with exactly one file per gate-passing entity; emit nothing (no directory) when no entity passes.
- **Severity:** ❌
- **Source:** [PLAN] (statechart gate; conditional artifact).

### A2 — One file per gate-passing entity, named `<table_name>.scxml`
- **Detect:** A file is not named `<04 TableName>.scxml`, two files target the same entity, or a gate-passing entity has no file.
- **Fix:** Name each file with the exact 04 `### <TableName>` (snake_case singular) + `.scxml`; one machine per document.
- **Severity:** ❌
- **Source:** [PLAN] (structure theme).

### A3 — XML declaration + well-formed XML
- **Detect:** A file lacks the `<?xml version="1.0" encoding="UTF-8"?>` declaration, or is not well-formed XML / fails to parse.
- **Fix:** Begin each document with the XML declaration; ensure well-formedness.
- **Severity:** ❌
- **Source:** W3C SCXML Rec (documents are XML); SCION parse.

### A4 — Fingerprint block present, well-formed, names all five upstreams
- **Detect:** No leading `<!-- fingerprints: … -->` block, or it omits any of `01-event-storming.md`, `02-glossary.md`, `03-aggregates.md`, `04-erd.dbml`, `04-transitions.md`, or any hex is not 64 hex chars.
- **Fix:** List all five upstreams as `<file>@sha256:<64-hex>`; recompute on every regeneration.
- **Severity:** ❌
- **Source:** [PLAN] (structure theme: fingerprint all consumed upstreams).

### A5 — Machine-readable supersedes declaration present
- **Detect:** A file lacks `<!-- supersedes: 04-transitions.md#<table_name> -->`, or the `<table_name>` does not match this file's entity, or names a 04 table that does not exist.
- **Fix:** Add the pinned supersedes comment naming this entity's 04 table; do **not** edit 04.
- **Severity:** ❌
- **Source:** [PLAN] (gate: "declaring inside the 05 document that it supersedes the entity's 04 table; 04 is never edited").

### A6 — Root `<scxml>` carries version="1.0", xmlns, and a valid initial
- **Detect:** Root element is not `<scxml>`, `version` ≠ `"1.0"`, `xmlns` ≠ `"http://www.w3.org/2005/07/scxml"`, or `initial` (when present) names a non-existent / non-child target.
- **Fix:** `<scxml version="1.0" xmlns="http://www.w3.org/2005/07/scxml" initial="<initial-state>" …>`; `xmlns`/`version` MUST equal the fixed values.
- **Severity:** ❌
- **Source:** W3C SCXML Rec §3.2 / §3.2.1 (`version` decimal MUST be 1.0; `xmlns` MUST be the SCXML namespace URI; `initial` is a legal state specification).

### A7 — `initial` resolves to the 04 `∅`-row target
- **Detect:** Root `initial` (or, when omitted, the first child in document order) is not the state named in this entity's 04 `From = ∅` row's `To`.
- **Fix:** Point `initial` at the 04 initial state; if relying on the default, make that state the first child in document order.
- **Severity:** ❌
- **Source:** W3C SCXML Rec §3.2.1 + §3.13 (default initial = first child in document order; IRP `test355`, `test576`); [PLAN] (∅-row contract).

### A8 — datamodel pinned and SCION-supported
- **Detect:** Root `<scxml>` has no `datamodel` attribute, OR `datamodel="ecmascript"` is used without a gate justification of *guards* and a declared note, OR a `cond` expression is present under `datamodel="null"`.
- **Fix:** Pin `datamodel="null"` (default/preferred). Use `datamodel="ecmascript"` **only** for a guard-justified machine that needs `cond` expressions, declaring it; keep `cond`s within SCION's ECMAScript support.
- **Severity:** ❌
- **Source:** [PLAN] (datamodel pinned); W3C SCXML Rec §5 (`datamodel`); SCION support (SOURCES.md oracle).

---

## B. Gate / promotion

### B1 — Promotion only for gate-passing entities
- **Detect:** A `<entity>.scxml` exists for an entity whose 04 table does **not** pass the gate — i.e. ≤4 distinct states AND no guards AND no transition actions AND no concurrency in the modelled machine.
- **Fix:** Remove the file; a non-passing entity must NOT appear in 05 (its 04 table is consumed downstream).
- **Severity:** ❌
- **Source:** [PLAN] (gate: promote iff >4 states OR guards OR actions OR concurrency).

### B2 — No unjustified promotion (the file must contain its gate-justifying feature)
- **Detect:** A promoted file has ≤4 basic states **and** contains no guard (`cond`), no executable transition action, and no `<parallel>` — the gate feature that justified promotion is absent from the document.
- **Fix:** Either realize the gate-justifying feature in the SCXML (the >4-state count, the guard, the action, or the parallel region) or drop the promotion.
- **Severity:** ❌
- **Source:** [PLAN] (gate: "a document with ≤4 states and no guard/action/parallel is an unjustified promotion").

### B3 — No missed promotion (mechanical >4-states arm)
- **Detect:** An entity whose 04 transition table has **>4 distinct states** (count of distinct `From`/`To` enum values, excluding `∅`) has **no** file in 05.
- **Fix:** Promote it — emit `<table_name>.scxml`. (The guard/action/concurrency arms are judgment; the state-count arm is checkable mechanically against 04.)
- **Severity:** ❌
- **Source:** [PLAN] (gate: ">4 states"; missed promotion is checkable against 04 state counts).

### B4 — Guard / action / concurrency arms (judgment, when 04 state count ≤4)
- **Detect:** An entity with ≤4 states whose 04 table or domain (03 invariants, 01 branching events) implies **conditional transitions, transition-time effects, or genuinely orthogonal regions** is left unpromoted.
- **Fix:** Promote it and realize the qualifying feature; or record why the lifecycle is simple enough to stay in 04. Judgment call — mark honestly.
- **Severity:** ⚠️
- **Source:** [PLAN] (gate: guards / actions / concurrency arms — not mechanically checkable from 04 alone).

### B5 — Non-promoted entities absent from 05
- **Detect:** A 04 lifecycle entity that did not pass the gate nonetheless has a file, OR a non-lifecycle 04 table (no transition block) has a file.
- **Fix:** Remove files for non-promoted / non-lifecycle entities.
- **Severity:** ❌
- **Source:** [PLAN] (gate: "non-promoted entities must NOT appear").

---

## C. Fidelity to 04

### C1 — Basic-state set equals the entity's 02 enum values (exact)
- **Detect:** The set of **basic-state** ids ≠ the entity's 02 `### <Aggregate>Status` enum values (a missing value, an extra basic state, or an id that is not the exact `snake_case` enum value).
- **Fix:** Make the basic states exactly the 02 enum values, ids verbatim; structural wrapper states (compound/parallel/initial/history) are not basic states and use fresh non-colliding ids.
- **Severity:** ❌
- **Source:** [PLAN] (state ids = 02 enum values); 02 enum ownership.

### C2 — Every 04 transition row appears as a `<transition>`
- **Detect:** A 04 row `From | Event | To` (non-`∅`) has no `<transition>` whose source state = `From`, `event` = the pinned transform of `Event`, and `target` = `To`.
- **Fix:** Emit one transition per 04 row with source/event/target matching exactly (the machine MAY also restructure via hierarchy, but every 04 edge must be expressible/present).
- **Severity:** ❌
- **Source:** [PLAN] (fidelity: every 04 row is a transition); SOURCES.md authority #1.

### C3 — Initial state matches the 04 `∅` row
- **Detect:** The active initial configuration's basic state ≠ the 04 `∅`-row `To` value.
- **Fix:** Align `initial` (Theme A7) so the machine starts in the 04 initial state.
- **Severity:** ❌
- **Source:** [PLAN] (initial = ∅ row); W3C SCXML Rec §3.13.

### C4 — No contradiction of 04 (no removed edges, no unannotated new edges)
- **Detect:** A 04 transition is **absent** from the machine, OR a transition exists between two **basic states** forming a `From→To` pair **not** in 04 and **not** carrying a `<!-- refines: … -->` annotation.
- **Fix:** Restore every 04 edge; annotate any genuinely-new basic-state edge with `refines:` (and justify), or remove it. The machine refines 04, never contradicts it.
- **Severity:** ❌
- **Source:** [PLAN] (fidelity: "MUST NOT contradict 04 … no new From→To pairs between basic states unless annotated").

### C5 — Added structure / guards / actions / parallel are annotated `refines:`
- **Detect:** The machine adds hierarchy, a guard, a transition action, or a parallel region beyond 04 without a `<!-- refines: … -->` annotation on the adding element.
- **Fix:** Annotate each refinement with `refines:` and a free-text reason; refinement is the machine's value but must be declared.
- **Severity:** ⚠️
- **Source:** [PLAN] (refines convention).

### C6 — Terminal enum values handled (final vs justified non-final)
- **Detect:** An enum value with **no outgoing transition in 04** is modelled as an ordinary `<state>` with no outgoing transitions and no justification (it should be a sink/`<final>`).
- **Fix:** Model 04-terminal values as `<final>`, OR keep as `<state>` with a `<!-- refines: … -->` note justifying a non-final sink (e.g. awaiting a refinement event). Honest call.
- **Severity:** ℹ️
- **Source:** W3C SCXML Rec §3.7 (`<final>`); [PLAN] (terminal enum values).

---

## D. SCXML / Harel canon

### D1 — Schema-valid SCXML / accepted by the interpreter
- **Detect:** The document is not schema-valid SCXML per the Rec, or SCION (`@scion-scxml/core@2.6.24`) rejects it on load.
- **Fix:** Conform to the SCXML schema and element/attribute model; the Rec + IRP are ground truth, SCION is the executable oracle.
- **Severity:** ❌
- **Source:** W3C SCXML Rec (normative schema); SOURCES.md authority #2 (IRP / SCION).

### D2 — All `id` attributes unique within the document
- **Detect:** Two elements share an `id` value (state/parallel/final/history/initial ids collide).
- **Fix:** Make every `id` unique; ids are XML Schema type `ID` and MUST be unique within the session.
- **Severity:** ❌
- **Source:** W3C SCXML Rec §3.14 ("the values of all attributes of type 'id' MUST be unique within the session").

### D3 — Every transition target exists
- **Detect:** A `<transition target="…">` (or `initial`/`<initial>`/history `<transition>`) names an id that no element declares.
- **Fix:** Point every target at a declared state id.
- **Severity:** ❌
- **Source:** W3C SCXML Rec §3.5 / §3.11 (targets are legal state specifications); IRP target-resolution tests.

### D4 — No unreachable states
- **Detect:** A state (other than the initial configuration) is never the target of any transition and is not entered via a compound/parallel default.
- **Fix:** Add the transition(s) that reach it, or remove it. (For basic states this mirrors 04 reachability; see C1.)
- **Severity:** ❌
- **Source:** Harel 1987 (reachable configurations); [PLAN] (no orphan states, cf. 04 reachability).

### D5 — Compound-state `initial` is valid; atomic states have none
- **Detect:** A compound state's `initial` attribute / `<initial>` child names a non-child, OR an atomic state declares `initial`, OR `initial` attr and `<initial>` element co-occur.
- **Fix:** Give every compound state a single valid default child via `initial` **or** `<initial>` (not both); atomic states declare neither.
- **Severity:** ❌
- **Source:** W3C SCXML Rec §3.3.1 / §3.6 (`initial` MUST NOT occur in atomic states; MUST NOT co-occur with `<initial>`).

### D6 — History states legal
- **Detect:** A `<history>` is used as a transition source/target where illegal, lacks a default `<transition>` where required, or its `type` is not `shallow`/`deep`.
- **Fix:** Use `<history>` only as a target with a legal default transition; appears in a compound state, never in the final configuration.
- **Severity:** ⚠️
- **Source:** W3C SCXML Rec §3.10 (`<history>`); IRP `test579` (default history content), `test580` (history pseudo-state never in configuration).

### D7 — Event names are legal tokens (and match the pinned transform)
- **Detect:** A `<transition event="…">` value contains spaces or characters outside dot-segmented alphanumeric descriptor tokens, OR does not equal the pinned transform of its `<!-- 01-event: … -->` annotation.
- **Fix:** Use the pinned transform (lowercase, whitespace→`_`); record the exact 01 string in the `01-event` annotation.
- **Severity:** ❌
- **Source:** W3C SCXML Rec §3.12.1 (event descriptors = alphanumeric tokens segmented by `.`, separated by spaces); [PLAN] (event-name transform).

### D8 — Determinism: no ambiguous same-event transitions from one state
- **Detect:** Two transitions enabled in the same atomic state by the **same event** with **overlapping or both-absent guards** — the choice is resolved only by document order (`cond`-less duplicates, or `cond`s that can be simultaneously true).
- **Fix:** Make guards mutually exclusive (or add a guarded/default ordering), so at most one transition is optimally enabled. The Rec resolves ties by document order, but ambiguity is flagged.
- **Severity:** ⚠️
- **Source:** W3C SCXML Rec §3.5 + §3.13 ("if more than one transition matches, the first one in document order will be taken"; *optimally enabled* definition); IRP `test403a` (conflict resolution by document order).

### D9 — Hierarchy/concurrency used meaningfully (Harel)
- **Detect:** Compound nesting that adds no shared-transition / shared-entry value, OR a `<parallel>` whose regions are **not** genuinely orthogonal (one region's state determines the other's — sequential logic masquerading as concurrency).
- **Fix:** Flatten gratuitous hierarchy; use `<parallel>` only for independent concurrent regions. Advisory — judgment, mark honestly.
- **Severity:** ⚠️
- **Source:** Harel 1987 (XOR-decomposition for hierarchy; AND-decomposition/orthogonality for concurrency); W3C SCXML Rec §3.1.3 (`<parallel>`).

---

## E. Language discipline & DRY

### E1 — No forbidden synonyms in ids, names, or annotations
- **Detect:** A state id, `name`, comment, or `refines:`/`01-event` annotation uses a `Forbidden term` from 02's forbidden-synonyms table.
- **Fix:** Use the canonical 02 term; ids are the 02 enum values verbatim.
- **Severity:** ❌
- **Source:** [PLAN] (02 forbidden-synonyms contract).

### E2 — No restated 04 rows, enum definitions, or invariant text
- **Detect:** Comments restate 04 rows beyond the required transitions, copy 02 enum definitions, or paste 03 invariant text.
- **Fix:** Encode only the required transitions; reference upstream by name (e.g. "see 03 invariant INV-3"), never copy.
- **Severity:** ❌
- **Source:** [PLAN] DOCTRINE / DRY (single ownership).

### E3 — References to upstream are by name, not paraphrase
- **Detect:** An annotation paraphrases upstream content instead of pointing to it by artifact + identifier.
- **Fix:** Replace paraphrase with a by-name reference (`01 event "Order Placed"`, `03 aggregate Order`).
- **Severity:** ⚠️
- **Source:** [PLAN] DRY.

### E4 — Event annotation round-trips to the `event` attribute
- **Detect:** Applying the pinned transform to a transition's `<!-- 01-event: … -->` string does not reproduce that transition's `event` attribute exactly, OR the annotation is missing on a 04-derived transition.
- **Fix:** Record the exact 01 string in `01-event`; ensure `transform(01-event) == event`.
- **Severity:** ❌
- **Source:** [PLAN] (event-name transform: exact 01 string recorded machine-readably, ONE convention).
