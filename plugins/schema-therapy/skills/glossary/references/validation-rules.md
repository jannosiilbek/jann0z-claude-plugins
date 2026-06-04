# `glossary` — Validation Rules (closed catalog)

This is the **closed rule catalog** for reviewing `specs/02-glossary.md` (artifact 2 of the
schema-therapy pipeline). These lettered rules are the **sole review vocabulary** — no rule
outside this file may be invented or applied at review time. Each rule is shaped
**Detect → Fix → Severity → Source**; severities are ❌ error / ⚠️ warn / ℹ️ info.
**Pass condition: zero ❌ error findings.** Every citation resolves through this skill's
`sources/SOURCES.md`; pure pipeline-contract rules cite `[PLAN]` and are deliberately few.

## Theme index

| Theme | Title | Rules | ❌ | ⚠️ | ℹ️ |
|---|---|---|---|---|---|
| A | Structure & format (mechanically lintable) | A1–A7 | 6 | 1 | 0 |
| B | Upstream fingerprint & input discipline | B1–B4 | 3 | 0 | 1 |
| C | One-concept-one-word & ubiquitous-language discipline | C1–C8 | 5 | 3 | 0 |
| D | Enum derivation from lifecycle skeletons | D1–D8 | 6 | 1 | 1 |
| E | Reference-not-restate (DRY) | E1–E4 | 2 | 2 | 0 |
| F | Cross-reference integrity | F1–F5 | 5 | 0 | 0 |
| **Total** | | **36** | **27** | **8** | **3** |

---

## Theme A — Structure & format (mechanically lintable)

The artifact's skeleton is fixed so downstream skills and a linter can parse it by position.
Required top-level headings, in order: `## Upstream Fingerprint`, `## Terms`, `## Enums`,
`## Forbidden Synonyms`.

### A1 — Required headings present and ordered
- **Detect:** Any of the four required H2 headings is missing, misspelled, or out of the
  canonical order (`Upstream Fingerprint` → `Terms` → `Enums` → `Forbidden Synonyms`).
- **Fix:** Insert/rename/reorder the headings to the exact canonical set and order.
- **Severity:** ❌
- **Source:** [PLAN] (pipeline-contract structure theme)

### A2 — Terms table column shape
- **Detect:** The `## Terms` table header is not exactly
  `| Term | Definition | Owns 01 element? | 01 element (exact string) |`
  (4 columns, that order, those names).
- **Fix:** Rewrite the table header to the canonical shape; pad/trim rows to 4 cells.
- **Severity:** ❌
- **Source:** [PLAN]; technique grounded in Vernon *IDDD* ch.1 glossary-as-table (SOURCES.md → cite-only-books.md)

### A3 — Enums section sub-shape
- **Detect:** An entry under `## Enums` lacks the `### <EnumName>` subsection or its values
  table with header `| Value | Derived from event (exact 01 string) |`.
- **Fix:** Give every enum a `### <EnumName>` subsection and the 2-column values table.
- **Severity:** ❌
- **Source:** [PLAN]

### A4 — Forbidden-synonyms table column shape
- **Detect:** The `## Forbidden Synonyms` table header is not exactly
  `| Forbidden term | Canonical term | Reason |` (3 columns, that order).
- **Fix:** Rewrite the header to the canonical shape.
- **Severity:** ❌
- **Source:** Vernon *IDDD* ch.1 — list alternative/rejected terms (SOURCES.md → cite-only-books.md, "forbidden synonym discipline")

### A5 — Term cell is one canonical word/phrase
- **Detect:** A `Term` cell contains a slash, "/", "or", "aka", parentheses-alternative, or a
  comma-list (e.g. `Buyer / Purchaser`) — i.e. more than one candidate name in the cell.
- **Fix:** Pick one canonical term; move the rejected name to `## Forbidden Synonyms`.
- **Severity:** ❌
- **Source:** Evans *DDD Reference* p.10–11 "Ubiquitous Language" (use the same language; resolve confusion over terms) — SOURCES.md → evans-ddd-reference-2015-03.txt

### A6 — No empty cells
- **Detect:** Any cell in the Terms, Enums-values, or Forbidden-synonyms tables is blank or a
  placeholder (`-`, `TBD`, `???`).
- **Fix:** Fill the cell, or delete the row if the concept is not real.
- **Severity:** ❌
- **Source:** [PLAN]

### A7 — Bounded context declared once
- **Detect:** The artifact does not state, near its top, the single bounded context the
  glossary is scoped to (one line).
- **Fix:** Add a one-line bounded-context declaration above `## Terms`.
- **Severity:** ⚠️
- **Source:** Fowler *Bounded Context* — one term = one meaning holds only within a context (SOURCES.md → fowler-bliki-notes.md); Evans *DDD Reference* p.9 "Bounded Context"

---

## Theme B — Upstream fingerprint & input discipline

02 reads `specs/01-event-storming.md` ONLY. The fingerprint pins which 01 it was built against.

### B1 — Fingerprint block present and well-formed
- **Detect:** `## Upstream Fingerprint` lacks a line of the form
  `01-event-storming.md@sha256:<64-hex>`.
- **Fix:** Add the fingerprint line with the real sha256 of the consumed 01 artifact.
- **Severity:** ❌
- **Source:** [PLAN] (single-input contract)

### B2 — Exactly one upstream input
- **Detect:** The fingerprint block (or the prose) references any spec other than
  `01-event-storming.md` (e.g. cites 03/04, or an external glossary).
- **Fix:** Remove the foreign reference; 02's only input is 01.
- **Severity:** ❌
- **Source:** [PLAN] (input: specs/01-event-storming.md ONLY)

### B3 — Hex is a real digest, not a placeholder
- **Detect:** The sha256 value is `0000…`, `<hex>`, `xxxx…`, or not 64 hex chars.
- **Fix:** Compute and paste the actual digest of the 01 file consumed.
- **Severity:** ❌
- **Source:** [PLAN]

### B4 — Fingerprint freshness note
- **Detect:** No human-readable note of when/against-which-01 the glossary was generated.
- **Fix:** Add a short comment beside the digest (date or 01 revision).
- **Severity:** ℹ️
- **Source:** [PLAN]

---

## Theme C — One-concept-one-word & ubiquitous-language discipline

Each domain concept gets exactly one word; definitions speak domain language, not tech.

### C1 — Single ownership of each term
- **Detect:** The same concept appears as two rows under two different `Term` names, OR two
  rows share an identical `Term`.
- **Fix:** Collapse to one canonical term; record the loser in `## Forbidden Synonyms`.
- **Severity:** ❌
- **Source:** Evans *DDD Reference* p.10–11 "Ubiquitous Language" (a common, consistent language) — SOURCES.md → evans-ddd-reference-2015-03.txt; Vernon *IDDD* ch.1

### C2 — No synonyms left undeclared
- **Detect:** A term's definition (or another row) uses an alternative word for an already-owned
  concept without that word being captured in `## Forbidden Synonyms`.
- **Fix:** Add the alternative to the forbidden-synonyms table pointing at the canonical term.
- **Severity:** ⚠️
- **Source:** Vernon *IDDD* ch.1 — record alternative/rejected terms (SOURCES.md → cite-only-books.md)

### C3 — Definitions in domain language, not tech language
- **Detect:** A `Definition` cell describes implementation (table, column, foreign key, API,
  endpoint, JSON, service class, null) instead of the business concept.
- **Fix:** Re-express the definition in the language a domain expert would use.
- **Severity:** ❌
- **Source:** Evans *DDD Reference* p.9 "Bounded Context" / Fowler *Ubiquitous Language* — language based on the domain model, not tech (SOURCES.md → fowler-bliki-notes.md)

### C4 — No ambiguous / vague terms
- **Detect:** A `Term` or `Definition` is non-specific ("data", "info", "item", "thing",
  "manager", "process", "handle", "status" used bare) such that two readers could disagree.
- **Fix:** Replace with a precise domain word; software doesn't cope with ambiguity.
- **Severity:** ❌
- **Source:** Fowler *Ubiquitous Language* — "software doesn't cope well with ambiguity" (verbatim, SOURCES.md → fowler-bliki-notes.md)

### C5 — Terms drawn from 01 vocabulary, not invented
- **Detect:** A core `Term` names a domain entity/actor/aggregate that does not trace to any
  event/actor/aggregate name in 01, and is not a legitimately-introduced value concept.
- **Fix:** Either map the term to its 01 origin, or remove the invented vocabulary.
- **Severity:** ⚠️
- **Source:** [PLAN] (terms drawn from upstream vocabulary; no invented vocabulary)

### C6 — No dropped core concept
- **Detect:** A 01 actor name or 01 aggregate name has no corresponding owned term in `## Terms`.
- **Fix:** Add a term row for each missing 01 actor/aggregate.
- **Severity:** ❌
- **Source:** [PLAN]; Evans *DDD Reference* p.11 — model is the backbone of the language

### C7 — One definition per term (definition is self-contained)
- **Detect:** A `Definition` defers ("see X", "same as Y") instead of defining the concept.
- **Fix:** Write a standalone definition; cross-link only as supplementary prose.
- **Severity:** ⚠️
- **Source:** Vernon *IDDD* ch.1 — glossary of terms with simple definitions (SOURCES.md → cite-only-books.md)

### C8 — Term casing convention pinned
- **Detect:** Term names mix conventions (some `PascalCase`, some `lower case phrase`) without a
  declared convention; downstream 03/04 entity naming becomes nondeterministic.
- **Fix:** Pin one convention (PascalCase nouns recommended) and apply it to every term.
- **Severity:** ❌
- **Source:** [PLAN] (downstream 04 entity/column naming determinism)

---

## Theme D — Enum derivation from lifecycle skeletons

**Pinned derivation convention (deterministic, mechanically checkable):**
1. **One enum per skeleton.** Every `### <AggregateName>` lifecycle skeleton in 01 yields
   **exactly one** owned enum. No skeleton ⇒ no enum; no enum without a skeleton.
2. **Enum name** = `<AggregateName>Status`, where `<AggregateName>` is the exact 01 skeleton
   heading string (PascalCase preserved). Example: skeleton `### Order` → enum `OrderStatus`.
3. **Enum values** = one value per ordered event in that aggregate's skeleton, in skeleton
   order. Each value is `snake_case`, derived by taking the past-tense 01 event and rendering
   its state form (e.g. event `Order Placed` → value `placed`; event `Payment Captured` →
   value `payment_captured`). The mapping is recorded explicitly in the
   `Derived from event (exact 01 string)` column, which MUST hold the verbatim 01 event string.
4. **Resolution is by exact string:** every value's `Derived from event` cell must equal a
   Domain-Events / skeleton event of *that same aggregate* in 01, character-for-character.

### D1 — One enum per lifecycle skeleton (no missing enum)
- **Detect:** A `### <AggregateName>` skeleton exists in 01 with no matching enum in `## Enums`.
- **Fix:** Add the missing `<AggregateName>Status` enum derived from that skeleton.
- **Severity:** ❌
- **Source:** [PLAN] (every lifecycle skeleton yields exactly one enum)

### D2 — No enum without a skeleton
- **Detect:** An enum under `## Enums` has no corresponding `### <name>` skeleton in 01.
- **Fix:** Remove the orphan enum (or fix 01 if the skeleton was wrongly dropped upstream).
- **Severity:** ❌
- **Source:** [PLAN] (no enum without a skeleton)

### D3 — Enum name follows `<AggregateName>Status`
- **Detect:** An enum name is not `<exact 01 aggregate name>` + `Status`.
- **Fix:** Rename the enum to the pinned convention.
- **Severity:** ❌
- **Source:** [PLAN] (pinned derivation convention §2)

### D4 — One value per skeleton event, in skeleton order
- **Detect:** An enum's value count or ordering does not match its skeleton's ordered event
  list (missing event, extra value, reordered).
- **Fix:** Regenerate values one-per-event in skeleton order.
- **Severity:** ❌
- **Source:** [PLAN] (pinned derivation convention §3)

### D5 — Values are snake_case
- **Detect:** A `Value` cell is not lowercase `snake_case` (contains spaces, caps, hyphens).
- **Fix:** Re-render the value as `snake_case`.
- **Severity:** ❌
- **Source:** [PLAN] (pinned derivation convention §3)

### D6 — `Derived from event` is a verbatim 01 string
- **Detect:** A value's `Derived from event` cell is paraphrased, abbreviated, or empty rather
  than the exact 01 event string.
- **Fix:** Replace with the character-for-character 01 event name.
- **Severity:** ❌
- **Source:** [PLAN] (pinned convention §4; reference-by-exact-string upstream contract)

### D7 — Value semantically tracks its event (state vs action)
- **Detect:** A derived value reads as an action/command rather than a resulting state and so
  reads poorly as a status (e.g. `place` instead of `placed`).
- **Fix:** Render the value in past-tense/state form consistent with the event.
- **Severity:** ⚠️
- **Source:** Evans *DDD Reference* p.11 — language must flow naturally (SOURCES.md → evans-ddd-reference-2015-03.txt)

### D8 — Enum value names do not collide with term names
- **Detect:** An enum value, once Pascal-cased, would shadow an owned `Term` and confuse 04
  naming.
- **Fix:** Note the distinction or rename; keep enum values in the status namespace.
- **Severity:** ℹ️
- **Source:** [PLAN] (downstream 04 status-column/transition-table naming)

---

## Theme E — Reference-not-restate (DRY)

02 references 01 by name; it never re-narrates 01's content.

### E1 — No restated event tables
- **Detect:** The glossary reproduces 01's `Domain Events` table (Event/Actor/Trigger columns)
  or any multi-row event listing.
- **Fix:** Delete it; reference event names only where a value derives from one.
- **Severity:** ❌
- **Source:** [PLAN] (single-ownership: 01 owns event names; 02 references, never restates)

### E2 — No lifecycle narrative
- **Detect:** A `Definition` recaps an aggregate's lifecycle ("first placed, then paid,
  then shipped…") instead of defining the concept.
- **Fix:** Define the concept; the ordered lifecycle lives only in 01.
- **Severity:** ⚠️
- **Source:** [PLAN] (reference-not-restate; definitions define the concept)

### E3 — No restated actor responsibilities
- **Detect:** A term's definition copies 01's `Actor | Kind | Responsibility` responsibility text.
- **Fix:** Define the actor concept tersely; responsibilities stay owned by 01.
- **Severity:** ⚠️
- **Source:** [PLAN] (01 owns actor names/responsibilities)

### E4 — No hotspot restatement
- **Detect:** The glossary copies 01's hotspot questions/blocks.
- **Fix:** Remove; hotspots are owned by 01.
- **Severity:** ❌
- **Source:** [PLAN] (01 owns hotspots)

---

## Theme F — Cross-reference integrity

Every string that points at 01 must resolve.

### F1 — `01 element (exact string)` resolves
- **Detect:** For a term row with `Owns 01 element? = yes`, the `01 element (exact string)`
  cell does not match (character-for-character) an event/actor/aggregate name in 01.
- **Fix:** Correct the string to the exact 01 element, or set ownership to `no`.
- **Severity:** ❌
- **Source:** [PLAN] (cross-reference integrity; every term naming a 01 element matches exactly)

### F2 — No renamed 01 element
- **Detect:** A term claims to own a 01 element but uses a near-miss spelling/casing variant
  (e.g. `Order Placed` vs `order placed`).
- **Fix:** Use the exact 01 string; never rename 01 vocabulary.
- **Severity:** ❌
- **Source:** [PLAN] (02 must reference these by exact string and NEVER rename)

### F3 — Every enum value maps to an event of its OWNING aggregate
- **Detect:** A value's `Derived from event` is a real 01 event but belongs to a *different*
  aggregate's skeleton than the enum's aggregate.
- **Fix:** Use an event from the enum's own aggregate skeleton.
- **Severity:** ❌
- **Source:** [PLAN] (each enum derived from one aggregate's skeleton)

### F4 — Owning-aggregate of each enum exists in 01
- **Detect:** The `<AggregateName>` inside an enum name has no `### <AggregateName>` skeleton
  in 01.
- **Fix:** Rename to a real 01 aggregate or remove the enum (see D2).
- **Severity:** ❌
- **Source:** [PLAN]

### F5 — Forbidden-synonym canonical column resolves to an owned term
- **Detect:** A `## Forbidden Synonyms` row's `Canonical term` is not present in `## Terms`.
- **Fix:** Point the row at an existing owned term, or add that term.
- **Severity:** ❌
- **Source:** Vernon *IDDD* ch.1 forbidden-synonym discipline (SOURCES.md → cite-only-books.md); [PLAN] cross-ref integrity

---

*End of closed catalog. Reviewers cite only A1–F5. Pass = zero ❌.*
