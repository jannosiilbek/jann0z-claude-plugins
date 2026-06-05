# anamnesis validation-rules — closed rule catalog

Validation catalog for the **anamnesis bridge** — the OPTIONAL brownfield entry path
into the `schema-therapy` modelling pipeline. The bridge mines domain **value** out of a
legacy system as evidence-gated **claims** and renders only human/triangulation-confirmed
claims into the `domain.md` file the **event-storming** skill (pipeline step 01) already
consumes. A mechanical harness (gates G0–G5) is the **sole** pass/fail authority; the
command never hand-verifies what the harness owns. This catalog is the closed rule set
that harness implements.

**The artifact set** — a per-project **engagement workspace** OUTSIDE `specs/` (the
drift-police never audits it), plus the rendered domain file(s):

```
<project>/
  anamnesis/
    brief.md          capability manifest (confirmed, closed S1 format) — G0
    ledger.jsonl      claims ledger (one claim's current state per line) — G1
    probes.log        probe journal (audit trail, G2 + G3 substrate)
    context-map.md    confirmed bounded-context map (multi-context systems) — S5
    topics.md         topic board — a regenerated VIEW; the harness IGNORES it
    queue.md          adjudication queue — a regenerated VIEW; the harness IGNORES it
  domain.md           single-context render — the pipeline's existing input — G4
  domain.<context>.md per-context renders when the context map has >1 context — G4
  specs/              untouched; 01 is only ever written by event-storming
```

**Boundary doctrine (quoted verbatim from the spec).**

> The only thing that ever crosses from the legacy system into the pipeline is the
> rendered set of confirmed claims — never code, never chat, never probe output.

**The three mechanical fences (all enforced here, none by hand):**

1. The orchestrator never holds legacy content.
2. The harness ensures the ledger never holds unauthorized content (the
   `capability`-authorization check is the context-leak signature).
3. The render gate ensures the pipeline never sees unconfirmed content.

**Pass condition: zero ❌.** Severities: ❌ blocker · ⚠️ advisory/warn-only (never
blocks). All 37 rules below are sourced from the design spec, cited `[SPEC]` (this skill
has no external formalism — there is no `sources/` dir; `[SPEC]` is the analogue of the
pipeline skills' `[PLAN]`).

**Status routing.** `malformed` (exit 2) is what an unparseable artifact returns — the
B1 (L-PARSE) ledger-line and D1 (P-PARSE) journal-line failures surface as harness status
`malformed`, not `fail`. The `bridge-defect` finding class (tier breaches) rides on **D4
(P-TIER)** — it is a finding `class`, never a fifth status.

---

## Pinned conventions (binding for every rule below)

These reproduce the closed formats the spec leaves open (plan pins S1–S6). They are the
substrate every rule fires against; a rule's Detect/Fix reads against these.

### S1 — `anamnesis/brief.md` closed format (G0 artifact)

```markdown
# Anamnesis Brief — <project>

## Engagement
- project: <name>
- specs-dir: <path where the pipeline will later run; informational>

## Capabilities
| Capability | Class | Environment | Tier | Access |
|------------|-------|-------------|------|--------|
| repo       | code  | -           | -    | <non-empty access detail> |
| api-stage  | probe | staging     | sandbox-full | https://stage.example.test |
| app-prod   | probe | production  | read-only    | https://app.example.com |
```

Rules: `Capability` unique, `^[a-z][a-z0-9-]*$`; `Class ∈ {code, test, doc, data, probe}`;
`Tier` and `Environment` are non-`-` **iff** Class=probe; `Tier ∈ {none, browse-only,
read-only, sandbox-full}`; Environment `production` (case-insensitive) ⇒ Tier ≠
`sandbox-full`; `Access` non-empty; ≥1 capability row. Absent brief file ⇒ `fail` (no
brief, no mining); a brief whose Capabilities table is syntactically unparseable ⇒
`malformed` (exit 2).

### S2 — `anamnesis/ledger.jsonl` schema + claim key + contradiction lock (G1 artifact)

One line per claim, holding the claim's **current** state. "Append-only" is doctrine —
an evidence merge / status change / verdict **rewrites that claim's line in place** (what
makes "IDs unique" satisfiable). Closed field set (no others):

```json
{"id":"CLM-0042","concept":"order","kind":"transition",
 "statement":"An order in 'shipped' can return to 'pending' via manual support action",
 "evidence":[{"class":"code","source":"OrderService.java:412","capability":"repo"},
             {"class":"data","source":"audit_log: 137 occurrences 2019-2025","capability":"db-ro"}],
 "status":"confirmed","round":3,
 "verdict":{"by":"human","round":4,"reason":"support flow confirmed by ops lead"},
 "conflictsWith":["CLM-0017"]}
```

- `id` `^CLM-\d{4,}$`, unique. `concept` `^[a-z][a-z0-9_]*$` (snake_case; it is the
  render's `###` heading and the context map's vocabulary). `kind ∈ {actor, event, state,
  transition, rule, term, relation}`. `statement` non-empty, MUST NOT contain the
  substring `CLM-` (the annotation is appended by the renderer, never embedded).
  `evidence` ≥1 of `{class ∈ {code,test,doc,data,probe}, source non-empty, capability}`;
  `capability` resolves to a brief Capability by exact string AND the evidence `class`
  equals that capability's `Class`. `status ∈ {unconfirmed, confirmed, accident,
  deferred}`. `round` = round of last **mining** add/update (verdicts do NOT touch it),
  integer ∈ [1, max journal round marker].
- `verdict` (optional) closed shape `{"by":"human","round":<int≥1>,"reason":"<non-empty
  one line>"}` — required for: `accident` (always), `deferred` (always), `confirmed` when
  triangulation is illegal (single class, or an illegal pair per S3), and ANY status
  change away from `unconfirmed` on a claim with non-empty `conflictsWith`.
- `conflictsWith` (optional) — the contradiction lock's representation: array of CLM ids
  that must resolve, and the link must be **symmetric** (if A lists B, B lists A).
  Conflicts are DETECTED by the merge step (agent judgment), RECORDED here, and NEVER
  auto-resolved.
- **Claim key** = `(concept, kind, normalize(statement))` where `normalize` = lowercase,
  collapse internal whitespace to single spaces, trim, strip one trailing `.`/`!`/`?`.
  Duplicate keys are a hard fail.

### S3 — Independence matrix (pinned, closed)

Over `{code, test, doc, data, probe}`: a pair `{a,b}` confirms iff `a ≠ b` AND `{a,b} ≠
{code,test}` (tests assert what code does — same channel). **Legal pairs (exhaustive):**
`code+doc`, `code+data`, `code+probe`, `test+doc`, `test+data`, `test+probe`, `doc+data`,
`doc+probe`, `data+probe`. Same-class pairs never confirm. A claim is
triangulation-confirmable iff its evidence set contains ≥1 legal pair.

### S4 — `anamnesis/probes.log` closed format (engagement journal: G2 + G3 substrate)

JSONL, two entry kinds (no others; an unparseable line ⇒ `malformed`):

```json
{"kind":"round","round":3}
{"kind":"probe","round":3,"claim":"CLM-0042","capability":"api-stage","method":"GET","target":"/orders/42","outcome":"order 42 shows status pending after support reset"}
```

- A `round` marker is appended when a mining round completes — **including zero-yield
  rounds**. Markers must be **strictly increasing by 1 from 1** (D-SEQ).
- `probe` entries: `claim` resolves to a ledger id; `capability` resolves to a brief
  probe-class capability; `method` from the **closed verb set** `{GET, HEAD, OPTIONS,
  QUERY, READ, VISIT, POST, PUT, PATCH, DELETE, EXECUTE, WRITE, SUBMIT}`; `target` +
  `outcome` non-empty.
- **Tier discipline (closed, verified after the fact):**

  | Tier | Permitted methods |
  |---|---|
  | `none` | (zero probe entries for that capability) |
  | `browse-only` | `VISIT`, `READ` |
  | `read-only` | `GET`, `HEAD`, `OPTIONS`, `QUERY`, `READ`, `VISIT` |
  | `sandbox-full` | any closed verb |

  Every probe-class **evidence** line on a claim must resolve to ≥1 journal probe entry
  matching `(claim id, capability)`.

### S5 — `anamnesis/context-map.md` closed format (segmentation artifact)

```markdown
# Context Map — <project>

## Contexts

### ordering
- order
- payment

### catalog
- event
- venue
```

Context slugs `^[a-z][a-z0-9_]*$`; each concept listed **exactly once** across all
contexts; when the map exists, **every** ledger concept must be mapped (S-MAP). Map
absent ⇒ ONE implicit context (slug `-`) containing every concept, rendering `domain.md`.
Map present with exactly 1 context ⇒ also `domain.md`. Map with >1 context ⇒ one
`domain.<slug>.md` per context. The file is only ever written from a human-confirmed map.

### S6 — Render format (the deterministic ledger→domain compiler)

The renderer is mechanical and lives IN the harness (`render` mode) — that is what makes
"deterministic ledger → domain file" and the G4 byte-identical double-render checkable.
Pinned output, byte-exact:

```markdown
# Domain — <context slug, or the brief's project name for the implicit single context>

<!-- anamnesis: rendered from ledger.jsonl@sha256:<64-lowercase-hex over the exact ledger bytes>; context: <slug|-> — regenerate via the anamnesis harness render mode; do not hand-edit -->

## Actors

- <statement, verbatim> [CLM-0003]

## Domain events

- <statement> [CLM-0007]

## Lifecycles

### order

- <statement> [CLM-0010]

## Rules

- <statement> [CLM-0014]

## Terms

- <statement> [CLM-0001]

## Relations

- <statement> [CLM-0018]

## Open questions

- <statement> [CLM-0021]
```

- Section order fixed: Actors, Domain events, Lifecycles, Rules, Terms, Relations, Open
  questions. **Empty sections omitted entirely.** Kind→section: actor→Actors;
  event→Domain events; state+transition→Lifecycles (grouped `### <concept>`, concepts
  sorted ascending, claims sorted by id within); rule→Rules; term→Terms; relation→
  Relations. Within every other section, claims sorted by id ascending.
- Body renders **`confirmed` claims of the context only**, statement verbatim + one
  trailing ` [CLM-nnnn]`. **Open questions** renders `deferred` and contradiction-locked
  claims of the context (statement + id) — nothing else; `accident` claims NEVER render
  and `unconfirmed` (unlocked) claims never render anywhere.

---

## Theme index

Gate-by-prefix: **G0** = theme A; **G1** = themes B + C; **G2** = theme D; **G3 + G5** =
theme E; **G4** = theme F.

- **A. Brief gate (G0)** (A1–A4) — brief present + closed S1 format; capability rows;
  probe tier/environment; production never sandbox-full. **[4 rules, 4 ❌]**
- **B. Ledger schema & hygiene (G1)** (B1–B8) — every line parses; id format/uniqueness;
  closed enums; evidence present; capability authorization (context-leak signature);
  claim-key uniqueness; rounds monotonic; naming hygiene. **[8 rules, 8 ❌]**
- **C. Confirmation & contradiction (G1)** (C1–C7) — legal-pair-or-verdict; same-channel
  never confirms; accident-needs-verdict; deferred-needs-verdict; verdict shape; lock
  symmetry; contradiction never auto-resolved. **[7 rules, 7 ❌]**
- **D. Probe audit (G2)** (D1–D4) — journal lines parse; probe evidence resolves to a
  journal entry; journal capability resolves to a brief capability; tier discipline
  (carries the `bridge-defect` finding). **[4 rules, 4 ❌]**
- **E. Dry & readiness (G3 + G5)** (E1–E5) — round markers contiguous; dry certified;
  zero unconfirmed; zero contradiction-locked; context map sound + total. **[5 rules, 5 ❌]**
- **F. Render boundary oracle (G4)** (F1–F9) — annotation resolution; status legality;
  reverse coverage; zero accident leakage; double-render byte-identical; provenance
  header; context-map consistency; code-smell warn; altitude warn. **[9 rules, 7 ❌ + 2 ⚠️]**

**Totals: 37 rules — 35 ❌, 2 ⚠️ (F8 R-SMELL, F9 R-SIZE). Pass condition: zero ❌.**

---

## A. Brief gate (G0)

### A1 — brief present + closed S1 format
- **Detect:** `anamnesis/brief.md` is absent (⇒ status `fail`), OR the file lacks the
  required sections (`# Anamnesis Brief`, `## Engagement`, `## Capabilities`), OR the
  Capabilities table is syntactically unparseable (⇒ status `malformed`, exit 2).
- **Fix:** Compose the brief in the exact S1 format with all sections and a parseable
  Capabilities table before any mining.
- **Severity:** ❌ (absent ⇒ fail; garbled table ⇒ malformed)
- **Owner:** B-PARSE
- **Source:** `[SPEC]` "G0 Brief gate (before any mining): brief.md parses … No brief, no mining (gate G0)."

### A2 — capability rows well-formed
- **Detect:** Two capability rows share a `Capability` name; a name violates
  `^[a-z][a-z0-9-]*$`; a `Class` is outside `{code, test, doc, data, probe}`; an `Access`
  cell is empty; or the table has zero capability rows.
- **Fix:** Make every `Capability` a unique snake/kebab name in the closed pattern, set
  `Class` from the closed set, fill every `Access`, and declare ≥1 row.
- **Severity:** ❌
- **Owner:** B-CAP
- **Source:** `[SPEC]` "every available evidence class names its access."

### A3 — probe tier/environment discipline
- **Detect:** A row has a non-`-` `Tier` or `Environment` while `Class ≠ probe`, OR a
  `Class=probe` row leaves `Tier`/`Environment` as `-`, OR a `Tier` value is outside
  `{none, browse-only, read-only, sandbox-full}`.
- **Fix:** Set `Tier` + `Environment` to non-`-` values **iff** the class is `probe`;
  draw `Tier` from the closed set.
- **Severity:** ❌
- **Owner:** B-TIER
- **Source:** `[SPEC]` "every environment declares a probe tier from the closed set: none | browse-only | read-only | sandbox-full."

### A4 — production never sandbox-full
- **Detect:** A capability row with `Environment` = `production` (case-insensitive)
  declares `Tier = sandbox-full`.
- **Fix:** Lower the production tier to `read-only` or `browse-only`; mutating probes
  belong only to a dedicated sandbox environment.
- **Severity:** ❌
- **Owner:** B-PROD
- **Source:** `[SPEC]` "Production is never `sandbox-full`."

---

## B. Ledger schema & hygiene (G1)

### B1 — every line parses (closed JSON schema)
- **Detect:** A `ledger.jsonl` line is not a JSON object, or carries a field outside the
  closed S2 set, or is missing a required field. Surfaces as harness status `malformed`
  (exit 2), not `fail`.
- **Fix:** Make every line a JSON object with exactly the S2 fields; route the failure as
  `malformed` — fix the artifact, never override the oracle.
- **Severity:** ❌ → `malformed`
- **Owner:** L-PARSE
- **Source:** `[SPEC]` "every line parses against the closed schema."

### B2 — id format + uniqueness
- **Detect:** A claim `id` does not match `^CLM-\d{4,}$`, OR two claim lines share an `id`.
- **Fix:** Give every claim a unique `CLM-nnnn` id (≥4 digits); an evidence/status change
  rewrites the existing line in place, it never adds a second line for the same id.
- **Severity:** ❌
- **Owner:** L-ID
- **Source:** `[SPEC]` "IDs unique."

### B3 — closed enums
- **Detect:** A claim's `kind`, `status`, or any `evidence[].class` is outside its closed
  set (`kind ∈ {actor, event, state, transition, rule, term, relation}`; `status ∈
  {unconfirmed, confirmed, accident, deferred}`; `class ∈ {code, test, doc, data, probe}`).
- **Fix:** Use only closed-set values for `kind`, `status`, and evidence `class`.
- **Severity:** ❌
- **Owner:** L-ENUM
- **Source:** `[SPEC]` "kinds/classes/statuses in closed sets."

### B4 — evidence ≥1, fields non-empty
- **Detect:** A claim has an empty `evidence` array, OR an evidence object has an empty
  `source` or a missing `class`/`capability`.
- **Fix:** Give every claim ≥1 evidence object, each with a non-empty `source`, a `class`,
  and a `capability`.
- **Severity:** ❌
- **Owner:** L-EVID
- **Source:** `[SPEC]` "every claim has ≥1 evidence."

### B5 — capability authorization (context-leak signature)
- **Detect:** An evidence object's `capability` does not resolve to a brief Capability by
  **exact string**, OR resolves but the evidence `class` differs from that capability's
  declared `Class`. This is the context-leak signature — a hard fail.
- **Fix:** Cite, by exact string, a brief capability whose `Class` matches the evidence
  class; evidence without an authorizing capability never enters the ledger.
- **Severity:** ❌
- **Owner:** L-CAP
- **Source:** `[SPEC]` "evidence without an authorizing capability is the context-leak signature — hard fail."

### B6 — claim-key uniqueness
- **Detect:** Two claim lines share a claim key `(concept, kind, normalize(statement))`
  (S2 `normalize` = lowercase, collapse internal whitespace, trim, strip one trailing
  `.`/`!`/`?`).
- **Fix:** Merge same-key claims into one line with unioned evidence (the merge step's
  job); flag near-duplicates for orchestrator merge/split, never silently union.
- **Severity:** ❌
- **Owner:** L-KEY
- **Source:** `[SPEC]` "Same key from two miners = one claim, merged evidence … no duplicate claim keys."

### B7 — rounds monotonic
- **Detect:** A claim's `round` is not an integer in `[1, max journal round marker]`.
- **Fix:** Set each claim's `round` to its last mining add/update round (verdicts do not
  touch it); never exceed the highest `round` marker in the journal.
- **Severity:** ❌
- **Owner:** L-ROUND
- **Source:** `[SPEC]` "rounds monotonic."

### B8 — naming hygiene
- **Detect:** A `concept` violates `^[a-z][a-z0-9_]*$`, OR a `statement` contains the
  substring `CLM-`.
- **Fix:** Make every `concept` snake_case; keep `CLM-` out of statements — the renderer
  appends the annotation, it is never embedded.
- **Severity:** ❌
- **Owner:** L-NAME
- **Source:** `[SPEC]` "no CLM string inside a canonical name … nothing downstream ever carries one into an identifier."

---

## C. Confirmation & contradiction (G1)

### C1 — `confirmed` ⇒ legal pair OR verdict
- **Detect:** A claim with `status = confirmed` has neither a legal S3 evidence pair
  (≥1 of the exhaustive legal-pair list) NOR a logged human `verdict`.
- **Fix:** Confirm only by triangulation (≥2 classes spanning a legal S3 pair) or by a
  recorded human verdict.
- **Severity:** ❌
- **Owner:** L-CONFIRM
- **Source:** `[SPEC]` "`confirmed` requires ≥2 classes per the independence matrix OR a logged human verdict."

### C2 — code+test (and same-class) never confirms
- **Detect:** A claim with `status = confirmed`, no verdict, whose only cross-class span
  is `{code, test}` (same channel), OR whose evidence is all one class — i.e. no legal S3
  pair exists yet it was auto-confirmed.
- **Fix:** Treat `code+test` and same-class evidence as a single channel; require a
  genuinely independent pair or a human verdict to confirm.
- **Severity:** ❌
- **Owner:** L-PAIR
- **Source:** `[SPEC]` "`code+test` does NOT count (tests assert what code does — same channel)."

### C3 — `accident` ⇒ human verdict, always
- **Detect:** A claim with `status = accident` carries no human `verdict` object.
- **Fix:** Mark a claim `accident` only with a recorded human verdict; accidents are never
  auto-classified and are recorded forever so no future round re-mines them.
- **Severity:** ❌
- **Owner:** L-ACC
- **Source:** `[SPEC]` "unconfirmed → accident by human verdict ONLY — never automatically."

### C4 — `deferred` ⇒ human verdict
- **Detect:** A claim with `status = deferred` carries no human `verdict` object.
- **Fix:** Defer only by recorded human verdict; deferred claims render as open questions.
- **Severity:** ❌
- **Owner:** L-DEF
- **Source:** `[SPEC]` "unconfirmed → deferred by human verdict; deferred claims render as open questions."

### C5 — verdict closed shape
- **Detect:** A `verdict` object is not exactly `{"by":"human","round":<int≥1>,
  "reason":"<non-empty one line>"}` — wrong/extra keys, `by ≠ "human"`, non-integer or
  `<1` round, or empty `reason`.
- **Fix:** Record every verdict in the closed shape with `by:"human"`, a positive integer
  `round`, and a non-empty one-line `reason`.
- **Severity:** ❌
- **Owner:** L-VERDICT
- **Source:** `[SPEC]` "a `verdict` object (`{\"by\":\"human\",\"round\":N,\"reason\":\"<one line>\"}`) added at adjudication time."

### C6 — conflict links resolve + symmetric
- **Detect:** A `conflictsWith` id does not resolve to an existing claim, OR the link is
  asymmetric (A lists B but B does not list A).
- **Fix:** Make every `conflictsWith` id resolve and every link symmetric — if A lists B,
  B lists A.
- **Severity:** ❌
- **Owner:** L-LOCKSYM
- **Source:** `[SPEC]` "the link must be symmetric (if A lists B, B lists A)."

### C7 — contradiction never auto-resolved
- **Detect:** A claim with non-empty `conflictsWith` changed status away from
  `unconfirmed` without a human `verdict` — i.e. a contradiction was auto-resolved by
  recency, confidence, majority, or triangulation.
- **Fix:** A contradiction-locked claim leaves `unconfirmed` ONLY with a human verdict;
  the lock blocks confirmation regardless of triangulation.
- **Severity:** ❌
- **Owner:** L-LOCK
- **Source:** `[SPEC]` "contradictions are never auto-resolved, not by recency, confidence, or majority. (Contradiction is a lock, not a status.)"

---

## D. Probe audit (G2)

### D1 — journal lines parse (closed S4 schema)
- **Detect:** A `probes.log` line is not a JSON object of one of the two closed kinds
  (`round`, `probe`) with the S4 fields. Surfaces as harness status `malformed` (exit 2).
- **Fix:** Make every journal line a parseable `round` or `probe` entry per S4; route the
  failure as `malformed`.
- **Severity:** ❌ → `malformed`
- **Owner:** P-PARSE
- **Source:** `[SPEC]` "every probe-class evidence line resolves to a `probes.log` journal entry."

### D2 — probe evidence resolves to a journal entry
- **Detect:** A claim carries `probe`-class evidence with no matching `probe` journal
  entry on `(claim id, capability)`.
- **Fix:** For every probe-class evidence line, append a `probe` journal entry matching
  the claim id and capability.
- **Severity:** ❌
- **Owner:** P-JRN
- **Source:** `[SPEC]` "every probe-class evidence line resolves to a `probes.log` journal entry."

### D3 — journal capability resolves to a brief probe capability
- **Detect:** A `probe` journal entry's `capability` does not resolve to a brief
  Capability whose `Class = probe`.
- **Fix:** Cite, in every probe entry, a brief probe-class capability by exact string.
- **Severity:** ❌
- **Owner:** P-CAP
- **Source:** `[SPEC]` "capability names the brief entry that authorized the access, by exact string."

### D4 — tier discipline (closed verb sets)
- **Detect:** A `probe` entry uses a `method` outside its capability's tier verb set —
  e.g. a mutating verb on a `read-only`/`browse-only` tier, OR any probe entry exists for
  a `none`-tier capability. Emits a finding `class:"bridge-defect"`. (The `bridge-defect`
  finding class rides on this rule.)
- **Fix:** Keep every probe method within its tier's closed verb set (S4 table); a
  `none`-tier capability gets zero probe entries. An unauthorized probe is a bridge
  defect, surfaced and stopped — not a judgment call.
- **Severity:** ❌ (finding `class:"bridge-defect"`)
- **Owner:** P-TIER
- **Source:** `[SPEC]` "on `read-only`/`browse-only` tiers the journal contains no mutating methods (closed verb list). The tier promise is verified after the fact."

---

## E. Dry & readiness (G3 + G5)

### E1 — round markers contiguous from 1
- **Detect:** The `round` markers in `probes.log` are not strictly increasing by 1 from 1
  (a gap, a repeat, or a start ≠ 1).
- **Fix:** Append exactly one `round` marker per completed mining round — including
  zero-yield rounds — so markers run 1, 2, 3, … contiguously.
- **Severity:** ❌
- **Owner:** D-SEQ
- **Source:** `[SPEC]` "Resume after interruption = re-read brief + ledger + journal, recompute gaps, continue. Nothing lives only in conversation."

### E2 — dry certified
- **Detect:** Phase 1 close is attempted when the journal's max marker `N < 2`, OR some
  claim's `round ∈ {N−1, N}` — i.e. the last 2 rounds did not both add zero new/changed
  ledger lines.
- **Fix:** Continue mining until two consecutive rounds add zero new/changed claims, then
  certify dry.
- **Severity:** ❌
- **Owner:** D-DRY
- **Source:** `[SPEC]` "the harness verifies the last 2 rounds added zero new/changed ledger lines before Phase 1 may close."

### E3 — zero `unconfirmed` in the context
- **Detect:** The context being handed off (scoped via the context map) contains ≥1 claim
  with `status = unconfirmed`.
- **Fix:** Adjudicate or triangulate every unconfirmed claim in the context (confirm,
  defer, or rule accident) before handoff; deferred passes.
- **Severity:** ❌
- **Owner:** S-UNCONF
- **Source:** `[SPEC]` "a context may hand off only when it contains zero `unconfirmed` … claims."

### E4 — zero contradiction-locked in the context
- **Detect:** The handoff context contains ≥1 contradiction-locked claim (non-empty
  `conflictsWith`, still `unconfirmed`).
- **Fix:** Adjudicate every contradiction lock in the context before handoff (the human
  resolves it — never auto-resolved).
- **Severity:** ❌
- **Owner:** S-LOCK
- **Source:** `[SPEC]` "a context may hand off only when it contains zero … contradiction-locked claims."

### E5 — context map sound + total
- **Detect:** A context slug violates `^[a-z][a-z0-9_]*$`; a concept is listed in more
  than one context or in none; OR a ledger `concept` is absent from the map (when the map
  exists, every ledger concept must be mapped).
- **Fix:** List every concept exactly once across contexts; map every ledger concept; use
  closed-pattern slugs. The map is only written from a human-confirmed adjudication.
- **Severity:** ❌
- **Owner:** S-MAP
- **Source:** `[SPEC]` "The proposed context map is itself an adjudication item; the human confirms or redraws it."

---

## F. Render boundary oracle (G4)

### F1 — every `[CLM-…]` resolves
- **Detect:** A `[CLM-nnnn]` annotation in a domain file resolves to no claim id in the
  ledger.
- **Fix:** Render only annotations whose ids exist in the ledger; regenerate via the
  harness render mode, never hand-edit.
- **Severity:** ❌
- **Owner:** R-RESOLVE
- **Source:** `[SPEC]` "every `[CLM-nnnn]` in a domain file resolves to a `confirmed` claim."

### F2 — annotation status legality
- **Detect:** A `[CLM-…]` in a body section resolves to a claim that is not `confirmed`,
  OR a `[CLM-…]` in **Open questions** resolves to a claim that is not `deferred` and not
  contradiction-locked.
- **Fix:** Body sections carry only `confirmed` claims; Open questions carries only
  `deferred` / contradiction-locked claims.
- **Severity:** ❌
- **Owner:** R-STATUS
- **Source:** `[SPEC]` "every `[CLM-nnnn]` … resolves to a `confirmed` claim, or sits in Open questions and resolves to a `deferred` or contradiction-locked claim."

### F3 — reverse coverage
- **Detect:** A `confirmed` claim of the rendered context does not appear (exactly once)
  in the domain file.
- **Fix:** Render every confirmed claim of the context exactly once; the renderer is the
  authority for what appears.
- **Severity:** ❌
- **Owner:** R-COV
- **Source:** `[SPEC]` "reverse coverage — every confirmed claim in the rendered context appears in the file."

### F4 — zero accident leakage
- **Detect:** An `accident` claim's id appears in the file, OR an `accident` claim's
  `concept` token appears in prose unless a `confirmed` claim of the context also owns
  that concept.
- **Fix:** Never render accident claims; an accident's canonical names may appear in prose
  only when a confirmed claim legitimately owns the same concept.
- **Severity:** ❌
- **Owner:** R-ACC
- **Source:** `[SPEC]` "zero accident leakage — no accident claim renders, and no accident claim's canonical names appear in prose unless also owned by a confirmed claim."

### F5 — double-render byte-identical
- **Detect:** The on-disk domain file bytes differ from the harness's in-memory S6
  re-render of the same ledger (a stale, hand-edited, or nondeterministic render).
- **Fix:** Regenerate via the harness; re-rendering an unchanged ledger must produce
  byte-identical output.
- **Severity:** ❌
- **Owner:** R-DET
- **Source:** `[SPEC]` "Re-rendering an unchanged ledger must produce byte-identical output, or it triggers a false staleness cascade."

### F6 — provenance header present + sha matches ledger
- **Detect:** The domain file lacks the S6 `<!-- anamnesis: rendered from
  ledger.jsonl@sha256:… -->` header, OR its sha256 does not match the sha over the exact
  ledger bytes.
- **Fix:** Emit the pinned provenance comment with the lowercase-hex sha256 of the exact
  ledger bytes; recompute on every render.
- **Severity:** ❌
- **Owner:** R-HDR
- **Source:** `[SPEC]` "01 fingerprints the domain file."

### F7 — context-map consistency
- **Detect:** A rendered file does not map to exactly one context-map entry, OR contains a
  concept that belongs to a different context, OR its filename violates the S5 slug
  naming.
- **Fix:** Render one file per confirmed context, named per S5, containing only that
  context's concepts.
- **Severity:** ❌
- **Owner:** R-CTX
- **Source:** `[SPEC]` "context-map consistency — every rendered file maps to one context-map entry and contains only that context's concepts."

### F8 — code-smell in prose
- **Detect:** A rendered statement matches a code-smell regex: a file path
  `/\b\w+\.(java|py|js|ts|rb|php|cs|go|sql)\b/`, call syntax `/\w+::\w+/` or `/\w+\(\)/`,
  or an SQL fragment `/\b(SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,80}\b(FROM|INTO|SET)\b/i`.
- **Fix:** Re-state the claim in domain prose; push file paths, call syntax, and SQL out
  of rendered statements. (Warn-only — does NOT block handoff.)
- **Severity:** ⚠️ (warn-only)
- **Owner:** R-SMELL
- **Source:** `[SPEC]` "warn-tier lint for code-smell in prose (file paths, call syntax, SQL fragments)."

### F9 — altitude control
- **Detect:** A rendered domain file's body has > 120 claims — the context is telling you
  it is two contexts.
- **Fix:** Re-segment: take the oversized context back to the queue and split it; never
  ship a bigger file. (Warn-only — does NOT block handoff.)
- **Severity:** ⚠️ (warn-only)
- **Owner:** R-SIZE
- **Source:** `[SPEC]` "the ledger is the unbounded archive; a domain file is a bounded, per-context, altitude-controlled view … that is the cluster saying it is two contexts — back to the queue, never a bigger file."
