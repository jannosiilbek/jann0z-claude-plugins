# Aggregates — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `aggregates` skill (artifact
`specs/03-aggregates.md`). It defines the **sole executable pass/fail authority** that ships
with the skill: a markdown linter + a mechanical resolution / exact-value /
reason-qualified-negative checker over a closed scenario format, plus a minimal set of
agent-judged checks. It satisfies the verification doctrine §2 (closed assertion grammar,
machine-readable summary, status taxonomy, no vacuous green, agent judgment only where the
contract marks it), §6 (determinism), and build steps B2 (lint design) and B3 (simulation
design).

It is **paired with** `references/validation-rules.md` (the closed rule catalog,
S1–S9 / A1–A8 / I1–I6 / X1–X7 / L1–L6 / D1–D5 — 41 rules). Every check below cites the
catalog rule ID(s) it mechanizes. **The catalog is the review vocabulary; this file is the
executable harness over it.** No check here exists without a catalog rule behind it.

Unlike `01-event-storming.md` (zero upstream) and `02-glossary.md` (one upstream), the
aggregates artifact is a **two-upstream** artifact: it is validated against BOTH the
`01-event-storming.md` (owns event/actor/aggregate names + lifecycle skeletons) AND the
`02-glossary.md` (owns terms, enum values, forbidden synonyms) it was derived from. The
harness therefore takes three file arguments and resolves every 03→01 and 03→02 reference by
exact string:

```
node scripts/harness.mjs <03-artifact> --upstream-01 <01-artifact> --upstream-02 <02-artifact>
```

The two upstream parses use the **pinned 01/02 formats** (copied, never imported — see §1):

- **01** (event-storming): `## Domain Events` table `Event | Actor | Trigger | Notes`;
  `## Actors` table `Actor | Kind | Responsibility`; `## Hotspots` table
  `Hotspot | Question | Blocks`; `## Lifecycle Skeletons` with `### <AggregateName>` numbered
  event lists. **01 is authority for event/actor/aggregate names + skeletons.**
- **02** (glossary): `## Terms` table `Term | Definition | Owns 01 element? | 01 element (exact string)`;
  `## Enums` with `### <AggregateName>Status` subsections each holding a values table
  `Value | Derived from event (exact 01 string)`; `## Forbidden Synonyms` table
  `Forbidden term | Canonical term | Reason` (exact 3-column shape per the glossary catalog
  A4 — pinned there, copied here). **02 is authority for terms, enum values, forbidden
  synonyms.**

03 references both and never renames either (catalog L-theme).

## 0 — Oracle summary (doctrine §2)

- **No engine, no executable corpus.** An aggregate-boundary model is a tactical-design
  document, not a runnable program. `sources/SOURCES.md` → "No **executable** sources exist
  for this domain (verified — aggregate design is conceptual/textual)." The artifact is
  itself the model. The **strongest available oracle is therefore mechanical**: parse 03's
  own markdown and the two pinned upstreams, lint 03's structure against the S-theme format
  spec, and run resolution / exact-value / reason-qualified-negative checks over the
  cross-document references — every `### <AggregateName>` subsection is a node to bijection
  against a 01 skeleton; every Boundary-contents `02 Term` cell, every References target,
  every policy `Source event` / `Target aggregate`, and every enum value cited in an
  invariant is a link to resolve into 01 or 02 by exact string.
- **Agent judgment** is admitted ONLY for the handful of inherently semantic catalog rules
  (§6), each listed with the reason it cannot be mechanical and a **closed verdict schema**
  (enumerated verdicts, never prose). **All ❌-severity catalog rules are mechanizable; no ❌
  rule is left to agent judgment.** Where a rule has a mechanical subset and a semantic
  residue (I3, X4, A5), the ❌ subset is mechanized and only the residue is agent-judged at
  the residue's own (non-blocking) severity.
- **Status taxonomy:** `pass | fail | malformed | broken-test`.
  - `pass` — all three artifacts parsed; every executed check passed; checks counter
    reconciled (§5); ≥1 check executed.
  - `fail` — all three artifacts parsed; ≥1 ❌-class check failed. **Includes the
    `upstream-defect` case** (a 01- or 02-origin defect surfaced through 03's resolution
    checks — §9): the status stays `fail` (the taxonomy is closed), but the finding carries
    the distinguished `upstream-defect` class plus the offending upstream filename, for
    routing.
  - `malformed` — the **03 artifact** is unparseable against the pinned S-theme format (the
    `## Aggregates` H2 absent or duplicated, the `## Upstream Fingerprints` or
    `## Cross-Aggregate Policies` H2 absent, a per-aggregate pinned sub-block absent or with
    the wrong column shape) such that downstream checks cannot be anchored. Distinct from a
    populated-but-wrong artifact, which is `fail`.
  - `broken-test` — a check could not evaluate (threw, indeterminate input), OR a
    reason-qualified negative passed for the wrong reason (the rejection fired but not on the
    asserted rule), OR the checks counter failed to reconcile (a silently dropped check), OR
    zero checks parsed (no vacuous green), OR **either upstream (01 or 02) is unparseable**
    against its pinned format (the harness cannot resolve references against a shapeless
    upstream — this is a broken *test fixture*, not a 03 defect; see §9 for the distinction
    from `upstream-defect`).
- **No vacuous green:** zero parsed/executed checks ⇒ exit failure with status
  `broken-test`. A typo'd negative check (a defect that should fail but the check never
  fired, or fired on the wrong rule) ⇒ `broken-test`, never `pass`.

## 1 — Tooling record (B2)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `event-storming` and `glossary` harnesses (suite uniformity). |
| Entry points | `scripts/harness.mjs` (the oracle; `<03-artifact> --upstream-01 <01-artifact> --upstream-02 <02-artifact>`), `scripts/selftest.mjs` (runs the harness over every shipped fixture triple and asserts the expected status + failing-check + upstream-route). |
| Markdown parser | **Hand-rolled line/table/heading/ordered-list parser**, dependency-free, vendored in `scripts/lib/md.mjs` — shared shape-reader for the 03 artifact and both pinned upstreams (01 + 02). |
| Parser version pin | Internal module; pinned by the repo commit. No external version to track. |
| External deps | **None.** Self-contained; `selftest.mjs` requires no `npm install`. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Closed lexicons | `scripts/lib/lexicon.mjs` — the closed **generic-justification blocklist** (X4: `{"for convenience", "simpler", "easier", "" (empty)}`), the **enum-token detector** (snake_case candidate regex `\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b` plus single-word lowercase tokens that match a known 02 value), the **generic-collection blocklist** (A8: `{list, map, set, collection, registry, …}`), and the upstream-shape readers. Closed and vendored; extended only by a committed edit, never ad hoc at runtime. |

**Rationale for hand-rolled over `marked`/`remark`:** the S-theme pins the *exact* shapes the
harness must verify — three fixed level-2 headings (`## Upstream Fingerprints`,
`## Aggregates`, `## Cross-Aggregate Policies`), one `### <AggregateName>` subsection per 01
aggregate each carrying four pinned sub-blocks in order (`**Root:**` line, Boundary-contents
table `Member | Kind | 02 Term`, Invariants table `ID | Rule | Scope`, References table
`Target aggregate | Identity field held | Reason`), and the policies table
`Policy | Source event | Target aggregate | Mode | Justification`. A general CommonMark AST is
more surface than these fixed shapes need; pinning a parser version + lockfile adds a moving
dependency to a skill whose whole point is byte-deterministic re-runs (§6). A small tolerant
table/heading/labelled-line reader covers every pinned shape, keeps the skill dependency-free
and copy-portable, and makes the `malformed` boundary explicit: the parser yields a typed
parse error exactly when an S-rule shape is violated, which is precisely the `malformed`
trigger.

**Reuse note (doctrine "reuse over invention: copied, never referenced"):** the
`event-storming` skill already ships a hand-rolled `md.mjs` reader and a `checks.mjs` grammar
for the pinned 01 format; the `glossary` skill ships the copied-and-extended reader for the
pinned 02 format. This skill **copies both** upstream readers (it must parse the same pinned
01 *and* 02 shapes its two upstreams arrive in) and the `checks.mjs` class scaffold, then
extends them with the 03-specific shapes (aggregate sub-blocks + policies table). Copied,
never cross-referenced — each skill stays self-contained and portable. No external proven
harness exists for this formalism (SOURCES.md: verified-none).

## 2 — Lint checks (structural; mechanize the S-theme + mechanical D-theme shape rules)

Lint checks run first, over the **03 artifact** (the 01 + 02 upstreams are shape-validated
separately — an upstream shape failure is `broken-test`, see §9). Lint IDs are `L*`. A
failing ❌ lint that prevents anchoring 03 yields `malformed`; a failing ❌ lint over a
parseable 03 yields `fail`; ⚠️/ℹ️ lints are warn-only findings.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| L1 | All three exact level-2 headings present, exactly one each: `## Upstream Fingerprints`, `## Aggregates`, `## Cross-Aggregate Policies`. | S1, S2, S9 | `malformed` |
| L2 | `## Upstream Fingerprints` contains BOTH a `01-event-storming.md@sha256:<64-hex>` line AND a `02-glossary.md@sha256:<64-hex>` line (each 64 chars `[0-9a-f]`, neither a placeholder `0000…`/`xxxx…`/`<hex>`). | S1 | `fail` |
| L3 | Every `### <AggregateName>` subsection under `## Aggregates` carries all four pinned sub-blocks in order: a `**Root:**` line, a Boundary-contents table, an Invariants table, a References table-or-`none`. | S5, S6, S7, S8 | `malformed` |
| L4 | Boundary-contents table header is exactly `Member \| Kind \| 02 Term` (3 cols, that order). | S7 | `malformed` |
| L5 | Invariants table header is exactly `ID \| Rule \| Scope` (3 cols, that order). The table may hold zero rows (I6) but must exist. | S6 | `malformed` |
| L6 | References table header is exactly `Target aggregate \| Identity field held \| Reason` (3 cols), OR the block is the literal `none`. | S8 | `malformed` |
| L7 | `## Cross-Aggregate Policies` table header is exactly `Policy \| Source event \| Target aggregate \| Mode \| Justification` (5 cols, that order), OR the section is the literal `none`. | S9 | `malformed` |
| L8 | Every `**Root:**` line names exactly one root entity AND declares its identity field `globally unique` (matches `\*\*Root:\*\* .+ · identity: .+ \(globally unique\)`). | S5, A1 | `fail` |
| L9 | Every Boundary-contents `Kind` cell ∈ `{entity, value object}`. | S7 (enum) | `fail` |
| L10 | Every Invariants `ID` matches `INV-<token>-<n>` (`n` a positive integer) and is unique within the artifact; every `Scope` cell is exactly `within-boundary`. | I1, I2 | `fail` (Scope ❌ / ID ⚠️) |
| L11 | Every policy `Mode` cell ∈ `{transactional, eventual}` (exact). | X3 | `fail` |
| L12 | No forbidden-synonym token (the closed list read from 02's `## Forbidden Synonyms` `Forbidden term` column) appears anywhere in 03's prose cells (Root lines, Boundary/Invariants/References/Policies cells). Whole-word, case-insensitive. | L2 | `fail` |
| L13 | No Domain-Events-shaped table (`Event \| Actor \| Trigger \| Notes` header) appears anywhere inside 03 (a restated 01 event table). | D1 (D1-mech) | `fail` |
| L14 | No Hotspots-shaped table (`Hotspot \| Question \| Blocks` header) and no Actors-shaped table (`Actor \| Kind \| Responsibility` header) appears anywhere inside 03 (a restated 01 hotspot/actor block). | D5 (D5-mech) | warn-only (ℹ️) |
| L15 | No Terms-shaped table (`Term \| Definition \| Owns 01 element? \| 01 element (exact string)` header) appears anywhere inside 03 (a restated 02 glossary). | D3 (D3-mech) | `fail` |
| L16 | No `<AggregateName>Status`-values listing appears inside 03 — i.e. no table with a `Value \| Derived from event (exact 01 string)` header, and no prose listing of ≥2 of a single enum's 02 values as an enumeration rather than a single cited value. | D4 (D4-mech) | `fail` |
| L17 | No Invariants `Rule` cell, and no References `Reason` cell, contains ≥N (default 3) consecutive verbatim 01-skeleton event names from a single skeleton, in skeleton order (a restated lifecycle). | D2 (D2-mech) | `fail` |

L13–L17 are **content lints** over a parseable 03 (`fail`/warn, not `malformed`): they scan
the already-anchored artifact's tables/cells and do **not** walk any resolution edge, so they
leave the §5 edge arithmetic untouched. The blocklists (X4-generic, A8-collection,
forbidden-synonym, enum-token detector) and the consecutive-event window used by L17 are
**closed and vendored** in `scripts/lib/lexicon.mjs`; the forbidden-synonym list for L12 is
**read fresh per run from the parsed 02** (it is upstream-owned data, not a vendored constant).
They are extended only by editing the vendored file in a committed change — never ad hoc at
runtime.

## 3 — Closed fixture / scenario format (B3)

Because the artifact is the model (not executable), the "scenario" is **a walk over 03's own
claims resolved against the parsed 01 and 02 upstreams**. The harness builds, per run, three
in-memory graphs (03, 01, 02) and traverses the cross-document edges. No external scenario
data is injected into a *target* run — the three artifacts supply every element. The shipped
fixtures (below) are **whole canned artifact triples** used only by `selftest.mjs` to prove
the harness itself.

### 3.1 Derived scenario graph (built fresh per run — §6)

From parsed **03** the harness derives:

- `aggregates[]` — `### <AggregateName>` subsections: `{name, root, identityField,
  members[] ({member, kind, term02}), invariants[] ({id, rule, scope}), references[]
  ({targetAgg, identityField, reason})}`.
- `policies[]` — Cross-Aggregate-Policies rows: `{policy, sourceEvent, targetAgg, mode,
  justification}`.
- `enumTokensInInvariants[]` — snake_case / known-value tokens detected in each invariant's
  `Rule` cell (candidate enum-value references), tagged with their host aggregate.

From parsed **01** (pinned upstream) the harness derives the resolution targets:

- `events01[]` — Domain-Events `Event` cells (verbatim strings).
- `aggregates01[]` — `### <AggregateName>` skeleton headings.
- `skeletons01[]` — `{aggregate, steps[] (ordered event strings)}`.

From parsed **02** (pinned upstream) the harness derives the resolution targets:

- `terms02[]` — Terms `Term` cells.
- `enums02[]` — `### <AggregateName>Status` subsections: `{aggregate, values[] (strings)}`.
- `forbidden02[]` — Forbidden-synonyms `Forbidden term` cells (the closed scan list for L12).

**Derived precondition (01 self-consistency → event→aggregate ownership map).** Before any
03 check runs, the harness computes from 01 alone the map
`eventOwner: event → {aggregates that list it as a skeleton step}` (mirrors the
event-storming harness's `X4`/`N6` single-ownership check). This is a **01 self-check**: it is
the mechanical interpretation of X7 (see §3.3). Its result is consumed by X7-mech and X4-mech
below and routed as an `upstream-defect` against 01 when it fails (§9).

Closed traversal set (every relationship 03 claims becomes a walked edge):

1. **Aggregate↔skeleton bijection edge** — the set of 03 `aggregates[].name` is matched
   1:1 against `aggregates01` (every 01 skeleton has exactly one 03 subsection; no 03
   subsection without a 01 skeleton; headings byte-identical).
2. **Boundary-member→02-Term edge** — each `members[j].term02` that is not `—` resolves into
   `terms02` by exact string.
3. **Reference→aggregate edge** — each `references[j].targetAgg` resolves into the 03
   aggregate set (= `aggregates01`), AND is not an interior member name of any aggregate
   (reference-to-member trap, A3/A7).
4. **Invariant-enum-token→02-value edge** — each `enumTokensInInvariants[i]` resolves into
   the **host aggregate's own** `enums02` value set (exact-string; L4 + L6 ownership).
5. **Policy-source→01-event edge** — each `policies[k].sourceEvent` resolves into `events01`
   by exact string (X5).
6. **Policy-target→01-aggregate edge** — each `policies[k].targetAgg` resolves into
   `aggregates01` (X6) and into the 03 aggregate set.
7. **Transactional-policy justification edge** — each policy with `mode = transactional`
   whose `targetAgg ≠ eventOwner(sourceEvent)` is checked for a non-generic `justification`
   (X4-mech, see §3.3).
8. **Cross-aggregate-invariant edge** — each invariant `Rule` is scanned for another
   aggregate's `name` (≠ its host aggregate) appearing as a token (I3-mech, see §3.3).

Every edge class above is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Shipped fixtures (`scripts/fixtures/`)

One shared deterministic **upstream pair** (`upstream-01.md` + `upstream-02.md`, consistent
with each other) + one `valid.md` (a 03 that passes against the pair) + the illegal 03
fixtures + two broken-upstream fixtures. Each illegal fixture carries exactly one deliberate
defect, so its negative fires **for the stated reason** (a fixture that fails for any other
reason is itself `broken-test`). The expected `(status, failing-check, upstream-route)` is
recorded in `scripts/fixtures/manifest.json`.

**`upstream-01.md`** — a small but covering 01: **≥2 aggregates with skeletons** (`Order`,
`Ticket` — distinct event sets), **≥6 events** (`Order Placed`, `Order Paid`, `Order
Expired`, `Ticket Reserved`, `Ticket Sold`, `Ticket Released`), **≥3 actors** (`Customer`,
`Payment Gateway`, `Box Office System`), **≥1 hotspot**. Each event is listed under exactly
one skeleton (so `eventOwner` is single-valued — a sound X7 precondition). Static and stable;
no clock/random/engine values.

**`upstream-02.md`** — the matching glossary over `upstream-01.md`: Terms for every 01
actor/aggregate (`Order`, `Ticket`, `Customer`, …) plus value concepts; enums `OrderStatus`
(`placed, paid, expired`) and `TicketStatus` (`reserved, sold, released`) derived value-by-value
from the skeletons; a `## Forbidden Synonyms` table (e.g. `Forbidden term = Booking`,
`Canonical term = Order`). Consistent with `upstream-01.md` by construction.

**`valid.md`** — a minimal correct 03 over the pair: one `### Order` + one `### Ticket`
subsection (bijection); roots with globally-unique identity; boundary members with exact `02
Term` or `—`; ≥1 invariant per aggregate phrased in exact 02 values; a References row Order→Ticket
by identity; ≥1 `eventual` policy and one *justified* `transactional` policy.

| Fixture file (03) | Upstream pair | Injected defect | Must fail | Expected status |
|-------------------|---------------|-----------------|-----------|-----------------|
| `valid.md` | `01`+`02` | none — minimal correct 03 | nothing | `pass` |
| `missing-aggregates-section.md` | `01`+`02` | drops the `## Aggregates` heading | L1 | `malformed` |
| `missing-policies-section.md` | `01`+`02` | drops `## Cross-Aggregate Policies` | L1 | `malformed` |
| `missing-fingerprints.md` | `01`+`02` | `## Upstream Fingerprints` block absent / only one digest | L1 / L2 | `malformed` / `fail` |
| `placeholder-fingerprint.md` | `01`+`02` | fingerprint block present but a digest cell is a placeholder, not 64-hex | L2 | `fail` |
| `bad-boundary-columns.md` | `01`+`02` | Boundary-contents header reordered to `Kind \| Member \| 02 Term` | L4 | `malformed` |
| `missing-subblock.md` | `01`+`02` | an aggregate subsection lacks its Invariants table | L3 / L5 | `malformed` |
| `missing-aggregate.md` | `01`+`02` | 01 has `Ticket` skeleton but 03 has no `### Ticket` subsection | R1 / X1 (bijection) | `fail` |
| `extra-aggregate.md` | `01`+`02` | 03 adds a `### Refund` subsection with no 01 skeleton | R1 / X1 (bijection) | `fail` |
| `heading-casing.md` | `01`+`02` | `### order` (lowercase) vs 01's `Order` | R1 (S4) | `fail` |
| `ghost-boundary-term.md` | `01`+`02` | a Boundary `02 Term` cell = `Voucher` (absent from 02 Terms) | R2 (resolution) | `fail` |
| `reference-to-member.md` | `01`+`02` | Order's References row targets `OrderLine` (an interior member of another aggregate, not its root) | R3 (A3/A7) | `fail` |
| `cross-aggregate-invariant.md` | `01`+`02` | an `### Order` invariant `Rule` names `Ticket` and constrains it | N-I3 (I3-mech) | `fail` |
| `transactional-no-justification.md` | `01`+`02` | a `transactional` policy, target ≠ source-event owner, `Justification` empty | N-X4 (X4-mech) | `fail` |
| `transactional-generic-justification.md` | `01`+`02` | same, `Justification = for convenience` (hits the X4 blocklist) | N-X4 (X4-mech) | `fail` |
| `ghost-source-event.md` | `01`+`02` | a policy `Source event = Order Shipped` (absent from 01) | R5 (X5) | `fail` |
| `ghost-target-aggregate.md` | `01`+`02` | a policy `Target aggregate = Invoice` (absent from 01) | R6 (X6) | `fail` |
| `forbidden-synonym-used.md` | `01`+`02` | the word `Booking` (a 02 forbidden term for `Order`) used in a Reason cell | L12 (L2) | `fail` |
| `restated-event-table.md` | `01`+`02` | a pasted Domain-Events-shaped table inside 03 | L13 (D1-mech) | `fail` |
| `restated-terms-table.md` | `01`+`02` | a pasted Terms-shaped table inside 03 | L15 (D3-mech) | `fail` |
| `restated-enum-listing.md` | `01`+`02` | a pasted `Value \| Derived from event…` listing inside 03 | L16 (D4-mech) | `fail` |
| `restated-lifecycle.md` | `01`+`02` | an invariant Rule with ≥3 consecutive verbatim 01 events in skeleton order | L17 (D2-mech) | `fail` |
| `mangled-enum-value.md` | `01`+`02` | an `### Order` invariant cites `paidd` (snake_case-shaped token absent from `OrderStatus`) | R4 (L4) | `fail` |
| `wrong-aggregate-enum-value.md` | `01`+`02` | an `### Order` invariant cites `sold` (a real value of `TicketStatus`, not `OrderStatus`) | R4 (L6) | `fail` |
| `bad-mode.md` | `01`+`02` | a policy `Mode = sync` (∉ `{transactional, eventual}`) | L11 (X3) | `fail` |
| `non-unique-root.md` | `01`+`02` | a `**Root:**` line names two entities | L8 (A1) | `fail` |
| `wrong-reason-trap.md` | `01`+`02` | **two** defects — a ghost source event (X5) AND a generic transactional justification (X4) — proves the negative reports the **X5 source-event** reason, not X4 | R5 isolates over N-X4 | `fail` (reason = R5) |
| `vacuous.md` | `01`+`02` | structurally valid 03 but harness fed the `--no-checks` disabled path | n/a | `broken-test` (zero checks) |
| `valid.md` | `broken-upstream-01.md`+`02` | **01 self-inconsistency** — `Order` skeleton lists `Order Refunded`, absent from 01 Domain Events (also makes `eventOwner` undefined for it) | X7 pre-check | `fail` (class = `upstream-defect` → 01) |
| `valid.md` | `01`+`inconsistent-upstream-02.md` | **02-vs-01 inconsistency** — `OrderStatus` enum value `refunded` derives from `Order Refunded`, absent from 01 (02 inconsistent with its own upstream) | R4 surfaces it via the 02 self-check | `fail` (class = `upstream-defect` → 02) |
| `valid.md` | `malformed-upstream-01.md`+`02` | the 01 upstream drops `## Domain Events` (unparseable) | n/a — cannot anchor 01 | `broken-test` |
| `valid.md` | `01`+`malformed-upstream-02.md` | the 02 upstream drops `## Forbidden Synonyms` (unparseable) | n/a — cannot anchor 02 | `broken-test` |

`wrong-reason-trap.md` is the explicit doctrine §2 guard: it would "pass for the wrong
reason" under a sloppy negative. The selftest asserts the failing-check ID equals `R5`, not
merely that *some* check failed.

The last four rows are the **upstream triples**: the same `valid.md` 03 validated against a
*broken* upstream. They distinguish the upstream outcomes (§9): an upstream that is
well-formed but **self-inconsistent** (01) or **inconsistent with its own upstream** (02)
routes to `fail` + `upstream-defect` (tagged with which file to fix); an upstream that is
**unparseable** routes to `broken-test`.

### 3.3 X7 / X4 / I3 mechanical design (pinned interpretations)

The three rules whose catalog text reads semantic are pinned here to **exact mechanical
checks**, with the residue (and only the residue) handed to agent judgment (§6).

**X7 — event→transaction ownership (one aggregate per transaction).** 01's skeletons already
assign each event to one aggregate (an event listed under a `### <AggregateName>` skeleton is
*committed* by that aggregate's transaction). The X7 invariant — *every state-changing 01 event
is owned by exactly one aggregate transaction* — is therefore **a 01 self-consistency
precondition**, derivable from 01 alone (it is the same single-ownership property the
event-storming harness proves with its `X4`/`N6` "event in ≤1 skeleton" check). Mechanical
check **X7-pre** runs over 01 before any 03 check:

- *zero owners* — a state-changing event in 01's Domain Events appears in **no** skeleton ⇒
  X7 violation, routed `upstream-defect` → **01** (the fix is upstream; 03 cannot invent an
  owner).
- *double owners* — an event appears in **two or more** skeletons ⇒ X7 violation, routed
  `upstream-defect` → **01**.

03 itself does **not** re-declare event ownership; it consumes the derived `eventOwner` map.
03's only X7-adjacent obligation is that its `transactional` cross-aggregate policies do not
smuggle a second aggregate into a transaction — which is exactly X4-mech below. So X7 is fully
mechanical: zero/double ownership is checkable, and it is checked against **01**, not 03
(encoded as the §9 upstream-defect route, not a 5th status).

**X4 — transactional cross-aggregate policy requires a justified exception.** Mechanical
check **X4-mech** over each `policies[k]`:

```
if mode == "transactional"
   and targetAgg != eventOwner(sourceEvent)        // crosses an aggregate boundary
   and normalize(justification) ∈ X4_GENERIC_BLOCKLIST   // closed list, vendored
        → FAIL (rule X4)
```

`X4_GENERIC_BLOCKLIST = {"for convenience", "simpler", "easier", ""}` (lower-cased, trimmed;
empty cell included). A `transactional` policy whose `targetAgg == eventOwner(sourceEvent)`
(same aggregate that already owns the event's transaction) is **not** a cross-boundary
transaction and needs no justification — it passes. A `transactional` cross-boundary policy
with a **non-generic** justification passes the mechanical gate (the *quality* of that
justification — does the acting user genuinely own the consistency, per Vernon's "whose job is
it" — is the agent-judged residue `AJ3`, ⚠️, non-blocking). This pins X4's ❌ subset
mechanically (empty/blocklisted justification) and leaves only the semantic residue to the
agent.

**I3 — no cross-aggregate invariants.** Mechanical check **I3-mech** (the catalog's pinned
mechanical subset): an Invariants `Rule` cell under host aggregate `H` that contains, as a
whole-word token, the **name** of a *different* 03 aggregate (`name ∈ aggregates01, name ≠ H`)
⇒ FAIL (rule I3). This catches "an Order is valid only if its Ticket is sold"-shaped rules
that name another aggregate and bind it. The **semantic residue** — a rule that constrains
another aggregate's data *without naming it* (paraphrase, pronoun) — is agent-judged `AJ2`
(❌-severity rule, but its mechanical subset already carries the ❌ weight; the residue verdict
is reported and, per doctrine, the ❌ block is the mechanical I3-mech, so no ❌ is left
*only* to the agent).

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a
check means editing this section AND `scripts/lib/checks.mjs` in a committed change, and the
new check MUST cite a catalog rule. The harness emits each check's `id`, `class`, `status`,
and `rule` in its JSON summary (§7). Four classes, per B3:

### 4.1 Resolution checks (`R`/`N` — a referenced element exists in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R1 | The set of 03 `### <AggregateName>` headings equals the set of 01 skeleton headings, byte-for-byte (bijection: none missing, none extra, exact casing). | S3, S4 |
| R2 | Every Boundary-contents `02 Term` cell (≠ `—`) resolves char-for-char to a 02 `## Terms` `Term`. | L1, L3 |
| R3 | Every References `Target aggregate` resolves to a 01 aggregate name AND is not the interior-member name of any aggregate (references go to a root, never an interior member). | A3, A7 |
| R4 | Every enum-value token detected in an invariant `Rule` resolves char-for-char to a value of the **host aggregate's own** `<host>Status` enum in 02 (exact value, owning aggregate). | I5, L4, L6 |
| R5 | Every policy `Source event` resolves char-for-char to a 01 Domain-Events `Event`. | X5 |
| R6 | Every policy `Target aggregate` resolves to a 01 aggregate name (and is present as a `### ` subsection in 03). | X6 |
| R7 | Every state-changing 01 event is owned by **exactly one** aggregate skeleton (X7-pre, the 01 self-consistency precondition); zero/double ownership ⇒ finding routed `upstream-defect` → 01. | X7 |

### 4.2 Exact-value checks (`X` — exact counts/values against the derived graph; no open-ended comparison)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| X1 | `aggregates.length === aggregates01.length` AND `set(03 headings) === set(01 headings)` — exact bijection cardinality (intake reconciliation for the aggregate set). | S3, §5 |
| X2 | Every aggregate's `**Root:**` names exactly one root entity (`rootCount === 1`); identity declared globally unique. | A1, A2 |
| X3 | Every Invariants `ID` is unique across the artifact (`unique(ids).length === ids.length`) and matches `INV-<token>-<n>`. | I1 |
| X4 | Every policy `Mode` ∈ `{transactional, eventual}` exactly; every X4-mech-applicable policy (transactional + cross-boundary) has a non-blocklisted justification. | X3, X4 |
| X5 | The executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.3 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

These are the named negatives proven by the shipped illegal fixtures. Each asserts both that
the defect is rejected AND that the failing-check ID matches the defect's owner rule
(wrong-reason ⇒ `broken-test`).

| ID | Illegal input rejected | For the reason | Fixture | Catalog rule |
|----|------------------------|----------------|---------|--------------|
| N1 | missing aggregate subsection | a 01 skeleton has no 03 subsection | `missing-aggregate.md` | S3 |
| N2 | extra aggregate subsection | a 03 subsection has no 01 skeleton | `extra-aggregate.md` | S3 |
| N3 | heading casing/string mismatch | heading not byte-identical to 01 | `heading-casing.md` | S4 |
| N4 | ghost boundary term | `02 Term` cell absent from 02 Terms | `ghost-boundary-term.md` | L1/L3 |
| N5 | reference to interior member | References target is a member, not a root | `reference-to-member.md` | A3/A7 |
| N6 | cross-aggregate invariant | invariant Rule names + binds another aggregate | `cross-aggregate-invariant.md` | I3 (I3-mech) |
| N7 | transactional policy, no justification | empty justification, cross-boundary transactional | `transactional-no-justification.md` | X4 |
| N8 | transactional policy, generic justification | justification ∈ X4 blocklist | `transactional-generic-justification.md` | X4 |
| N9 | ghost source event | `Source event` not in 01 events | `ghost-source-event.md`, `wrong-reason-trap.md` | X5 |
| N10 | ghost target aggregate | `Target aggregate` not in 01 aggregates | `ghost-target-aggregate.md` | X6 |
| N11 | forbidden synonym used | a 02 forbidden token appears in 03 prose | `forbidden-synonym-used.md` | L2 |
| N12 | restated 01 event table | Domain-Events-shaped table inside 03 | `restated-event-table.md` | D1-mech |
| N13 | restated 02 terms table | Terms-shaped table inside 03 | `restated-terms-table.md` | D3-mech |
| N14 | restated enum listing | enum-values listing inside 03 | `restated-enum-listing.md` | D4-mech |
| N15 | restated lifecycle | ≥N consecutive verbatim 01 events in a cell | `restated-lifecycle.md` | D2-mech |
| N16 | mangled enum value in invariant | enum token absent from host enum | `mangled-enum-value.md` | I5/L4 |
| N17 | wrong-aggregate enum value | enum token belongs to another aggregate's enum | `wrong-aggregate-enum-value.md` | L6 |
| N18 | non-enum policy Mode | `Mode` ∉ closed set | `bad-mode.md` | X3 |
| N19 | multi-entity root | `**Root:**` names >1 entity | `non-unique-root.md` | A1 |
| N20 | malformed 03 structure | required heading/table/sub-block shape absent | `missing-aggregates-section.md`, `bad-boundary-columns.md`, `missing-subblock.md` | S1/S2/S5–S9 |
| N21 | upstream-01 self-inconsistency | a 01 skeleton step / event absent from 01's own Domain Events (X7-pre zero/double owner) | `broken-upstream-01.md` | X7 via §9 (`upstream-defect`→01) |
| N22 | upstream-02 inconsistency | a 02 enum value derives from a 01 event absent from 01 | `inconsistent-upstream-02.md` | §9 (`upstream-defect`→02) |

(Lint `L*` and negative `N*` IDs overlap by design where one rule has both a positive lint
pass and a negative fixture proof — they share the catalog rule, not the ID space: `L*` runs
over the target 03, `N*` is proven over a shipped fixture in selftest.)

### 4.4 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ1`–`AJ5` enumerated in §6. They run last, only over checks that survived all mechanical
gates, and return enumerated verdicts only.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The 03 artifact owns five element sets: `aggregates`, `boundary
members`, `invariants`, `references`, `policies`. The intake count is:

```
intake = |aggregates| + Σ|aggregate.members| + Σ|aggregate.invariants|
       + Σ|aggregate.references| + |policies|
```

The cross-document **resolution edge count** the harness must walk (from §3.1):

```
edgesExpected = |aggregates01|                              (R1 bijection: 01 → 03 subsection)
              + |aggregates|                                (R1 bijection: 03 → 01 skeleton)
              + |members with term02 ≠ "—"|                 (R2 member→02 Term)
              + Σ|references|                               (R3 reference→aggregate/root)
              + |enumTokensInInvariants|                    (R4 invariant token→02 value)
              + |policies|                                  (R5 source→01 event)
              + |policies|                                  (R6 target→01 aggregate)
              + |policies transactional & cross-boundary|   (X4-mech justification edge)
              + Σ|invariants|                               (I3-mech cross-aggregate scan)
              + |state-changing events01|                   (R7/X7-pre ownership precondition)
```

**Every owned element exercised ≥1 time.** The harness asserts:
- every `aggregate` is touched by R1/X1 (bijection) and X2 (root) and L3 (sub-block shape);
- every `boundary member` is touched by R2 (if `term02 ≠ —`) or L4/L9 (shape/Kind enum);
- every `invariant` is touched by L5/L10 (shape/scope/ID), X3 (ID uniqueness), R4 (its enum
  tokens, ≥0), and I3-mech (cross-aggregate scan);
- every `reference` is touched by R3 (target resolution + member trap);
- every `policy` is touched by R5 (source), R6 (target), L11 (Mode enum), and — when
  transactional+cross-boundary — X4-mech.

**Reconciliation formula (X5 — no silently dropped checks):**

```
executedChecks = lintRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected) && (executedChecks > 0)
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠ edgesExpected`
⇒ a check was silently dropped ⇒ `broken-test`.

**Positive AND negative per claimed behavior.** Every behavior/constraint the artifact claims
is proven by **≥1 positive** (a passing check over `valid.md` / the target) **AND ≥1 negative**
(a shipped illegal fixture that must fail). The mapping:

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Required headings present (3 H2) | S1/S2/S9 | L1 over `valid.md` | `missing-aggregates-section.md`, `missing-policies-section.md` |
| Both fingerprints present, real digests | S1 | L2 over `valid.md` | `missing-fingerprints.md` |
| Per-aggregate sub-blocks present & shaped | S5–S8 | L3–L6 over `valid.md` | `missing-subblock.md`, `bad-boundary-columns.md` |
| Aggregate↔skeleton bijection | S3 | R1/X1 over `valid.md` | `missing-aggregate.md`, `extra-aggregate.md` |
| Heading strings match 01 exactly | S4 | R1 over `valid.md` | `heading-casing.md` |
| Single globally-unique root | A1/A2 | L8/X2 over `valid.md` | `non-unique-root.md` |
| Boundary term resolves to 02 | L1/L3 | R2 over `valid.md` | `ghost-boundary-term.md` |
| References go to a root, not a member | A3/A7 | R3 over `valid.md` | `reference-to-member.md` |
| Invariant uses exact host-enum value | I5/L4/L6 | R4 over `valid.md` | `mangled-enum-value.md`, `wrong-aggregate-enum-value.md` |
| No cross-aggregate invariant | I3 | I3-mech over `valid.md` | `cross-aggregate-invariant.md` |
| Invariant ID/Scope discipline | I1/I2 | L10/X3 over `valid.md` | (ID dup / bad-scope variant in `missing-subblock.md` family) |
| Policy Source resolves to 01 event | X5 | R5 over `valid.md` | `ghost-source-event.md` (+`wrong-reason-trap.md`) |
| Policy Target resolves to 01 aggregate | X6 | R6 over `valid.md` | `ghost-target-aggregate.md` |
| Policy Mode from closed set | X3 | L11 over `valid.md` | `bad-mode.md` |
| Transactional cross-boundary needs justification | X4 | X4-mech over `valid.md` | `transactional-no-justification.md`, `transactional-generic-justification.md` |
| No forbidden synonym | L2 | L12 over `valid.md` | `forbidden-synonym-used.md` |
| No restated 01 event table | D1-mech | L13 over `valid.md` | `restated-event-table.md` |
| No restated 02 terms table | D3-mech | L15 over `valid.md` | `restated-terms-table.md` |
| No restated enum listing | D4-mech | L16 over `valid.md` | `restated-enum-listing.md` |
| No restated lifecycle | D2-mech | L17 over `valid.md` | `restated-lifecycle.md` |
| Every event owned by exactly one aggregate (X7) | X7 | R7/X7-pre over `valid.md` (sound 01) | `broken-upstream-01.md` (zero/double owner) |
| Upstream-02 consistent with 01 | §9 | `valid.md`+sound pair | `inconsistent-upstream-02.md` |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a negative
entry above — the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; reason + closed verdict schema)

These catalog rules (or rule residues) are **inherently semantic** — they require domain
understanding the mechanical layer cannot supply. Each runs only after mechanical gates pass,
and returns an **enumerated verdict** (never prose). The harness records `{id, verdict,
ruleId}`; any verdict other than the rule's pass-verdict is reported as a finding at the
catalog severity. **There are no ❌ agent-judged checks** — every ❌ rule (including I3 and X4)
has its ❌ weight carried by a mechanical subset; the agent only judges the residue at its own
(⚠️/ℹ️) severity.

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ1 | A5 / A6 | whether a large boundary's members are genuinely bound by a true invariant (sizing) vs over-stuffed needs domain meaning beyond the mechanical >7-member / has-invariant count. | `{ small-and-bound \| oversized-or-unbound \| ambiguous }` |
| AJ2 | I3 (semantic residue) | whether an invariant constrains another aggregate's data **without naming it** (paraphrase/pronoun) — the verbatim-name subset is N6/I3-mech. | `{ within-boundary \| spans-aggregates \| ambiguous }` |
| AJ3 | X2 / X4 (semantic residue) | whether a `transactional` cross-boundary policy's **non-generic** justification genuinely passes Vernon's "whose job is it" test (the empty/blocklist subset is X4-mech). | `{ justified-exception \| unjustified \| ambiguous }` |
| AJ4 | I4 | whether an invariant is a **true, falsifiable business rule** vs a tautology / restated data-type / CRUD rule (cannot be string-matched). | `{ true-invariant \| tautology-or-crud \| ambiguous }` |
| AJ5 | A8 / I6 | whether an aggregate is a real domain concept with behavior vs a generic collection / anaemic shell (beyond the A8 name-blocklist and the I6 zero-invariant count). | `{ domain-concept \| collection-or-anaemic \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); it is reported as an ℹ️ finding, never
silently dropped, and never counts as a pass for reconciliation purposes (it counts as
executed, verdict-recorded). No agent-judged check may emit free prose in an asserted position.

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order,
`checks[]`/`findings[]` sorted by `id`:

```json
{
  "skill": "aggregates",
  "artifact": "specs/03-aggregates.md",
  "upstream01": "specs/01-event-storming.md",
  "upstream02": "specs/02-glossary.md",
  "status": "pass | fail | malformed | broken-test",
  "counts": {
    "intake": { "aggregates": 0, "members": 0, "invariants": 0, "references": 0, "policies": 0 },
    "checks": { "lint": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "checks": [
    { "id": "L1", "class": "lint", "rule": "S1", "status": "pass" },
    { "id": "R1", "class": "resolution", "rule": "S3", "status": "pass" },
    { "id": "AJ3", "class": "agent-judged", "rule": "X4", "verdict": "justified-exception" }
  ],
  "findings": [
    { "id": "R7", "rule": "X7", "severity": "error", "class": "upstream-defect", "upstream": "01-event-storming.md", "detail": "event 'Order Refunded' owned by zero skeletons in 01" }
  ]
}
```

- The optional `class: "upstream-defect"` + `upstream: "<file>"` on a finding routes a
  01- or 02-origin defect (§9). It does **not** add a status; the status stays `fail` (the
  taxonomy is closed at four values).
- **stderr** — human-readable diagnostics only (parse errors, per-check failure traces, the
  wrong-reason trap explanation, the upstream-defect routing note naming which file to fix).
  Never the machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. `1` = `fail` (including `upstream-defect`
  findings). `2` = `malformed` (03 unparseable). `3` = `broken-test` (check threw,
  wrong-reason, reconciliation mismatch, zero checks, **or an unparseable 01/02 upstream**).
  The distinct codes let CI separate a wrong 03 (`1`), a shapeless 03 (`2`), and a broken
  harness/fixture (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`.

## 8 — Determinism (doctrine §6)

- The harness reads only the three target artifacts (and, in selftest, the shipped fixture
  triples). It injects **no clock value, no randomness, no engine-generated value** into any
  asserted position. The `## Upstream Fingerprints` hashes are *read from 03* and only
  string-checked for presence/shape (L2) — never generated by the harness. The harness does
  **not** itself recompute the sha256 of 01/02 and assert equality (that would inject an
  engine value); it checks each digest's *shape* and resolves references against the upstream
  files actually passed via `--upstream-01` / `--upstream-02`.
- State is **built fresh per run** from the three parses; nothing is persisted between runs.
  A re-run over byte-identical inputs is **byte-identical output** (stable key order, sorted
  `checks[]`/`findings[]` by `id`). The forbidden-synonym scan list (L12) is read fresh from
  the parsed 02 each run, so the only externally-varying input is the upstream content itself.
- Fixtures in `scripts/fixtures/` are static committed files (the shared `upstream-01.md` +
  `upstream-02.md`, the broken/inconsistent/malformed upstreams, and the 03 fixtures) with a
  static `manifest.json` of expected `(status, failing-check, upstream-route)` tuples.
  `selftest.mjs` is therefore reproducible and order-independent.
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the
  reconciliation arithmetic (§5) and their verdicts are recorded, not invented into counts —
  so the **pass/fail mechanical verdict remains byte-deterministic** regardless of agent
  output.

## 9 — Upstream-defect routing (how a 01/02 defect is reported without patching around it)

03 is validated *against* two upstreams. Five upstream conditions are distinguished across the
two files, and the harness **never silently repairs or works around** a bad upstream — it
surfaces the defect and routes it to the file that owns the fix:

1. **Sound upstreams.** Both 01 and 02 parse against their pinned formats AND are
   self/mutually consistent (every 01 skeleton step is a real 01 Domain-Events event of that
   aggregate; every 02 enum value's `Derived from event` is a real 01 event of its aggregate;
   `eventOwner` is single-valued). The 03→01/02 resolution checks (R1–R6) run normally; a
   failure is a **03 defect** → `fail`, ordinary finding.

2. **Well-formed but self-inconsistent 01** (`upstream-defect` → 01). 01 parses, but it is
   internally broken — e.g. a `### Order` skeleton lists `Order Refunded`, an event absent
   from 01's own Domain Events table, OR an event is owned by zero/two skeletons (X7-pre). A
   naive reading might blame 03's policies/invariants that reference it. Instead the harness
   runs the **pre-resolution 01 self-check** (`R7`/X7-pre: every skeleton step exists in 01
   Domain Events AND every state-changing event has exactly one owner). On failure, the
   finding is tagged `class: "upstream-defect"`, `upstream: "01-event-storming.md"`, and
   names the offending 01 element. Status `fail`, exit `1`; the pipeline routes the fix
   **upstream to the event-storming artifact**, not to 03. Proven by
   `valid.md` + `broken-upstream-01.md`.

3. **Well-formed but inconsistent-with-01 02** (`upstream-defect` → 02). 02 parses, but a
   value's `Derived from event` cell references a 01 event that does not exist (02 is
   inconsistent with its own upstream). When a *correct* 03 cites that 02 enum value in an
   invariant, `R4` cannot reconcile the value's provenance. The harness runs a **02 self-check**
   (every 02 enum value's `Derived from event` resolves into 01) before R4; on failure the
   finding is tagged `class: "upstream-defect"`, `upstream: "02-glossary.md"`. Status `fail`,
   exit `1`; the fix routes **upstream to the glossary artifact**. Proven by
   `valid.md` + `inconsistent-upstream-02.md`.

4. **Unparseable 01** (`broken-test`, not `upstream-defect`). 01 does not parse against the
   pinned format at all (a required 01 heading/table absent — e.g. `## Domain Events`
   missing). The harness cannot anchor *any* 01 resolution target, so it cannot make a
   trustworthy statement about 03. Status `broken-test`, exit `3`, stderr explains "upstream
   01 unparseable: cannot resolve 03 references." Proven by `valid.md` + `malformed-upstream-01.md`.

5. **Unparseable 02** (`broken-test`). Symmetric to (4) for 02 — e.g. `## Forbidden Synonyms`
   absent so the L12 scan list and the term/enum resolution targets cannot be built. Status
   `broken-test`, exit `3`. Proven by `valid.md` + `malformed-upstream-02.md`.

The splits are deliberate: `upstream-defect` (cases 2–3) is an actionable content finding
routed to the *correct upstream owner* (01 vs 02) while keeping the §2 status set closed;
`broken-test` (cases 4–5) is the harness honestly refusing to emit a green/red verdict it
cannot justify. No case lets the harness paper over an upstream by inferring, substituting, or
skipping the missing 01/02 element.

---

*This contract mechanizes catalog rules S1–S9 / A1–A8 / I1–I6 / X1–X7 / L1–L6 / D1–D5.
**Mechanical ❌ coverage is complete:** every ❌-severity catalog rule has BOTH (a) a mechanical
owner check and (b) a dedicated negative fixture. The full reconciliation (❌ rule → owner
check → negative fixture):*

| ❌ rule | Owner check | Negative fixture |
|---|---|---|
| S1 | L1 / L2 | `missing-fingerprints.md` |
| S2 | L1 | `missing-aggregates-section.md` |
| S3 | R1 / X1 | `missing-aggregate.md` / `extra-aggregate.md` |
| S4 | R1 (N3) | `heading-casing.md` |
| S5 | L3 / L8 | `missing-subblock.md` |
| S6 | L3 / L5 | `missing-subblock.md` |
| S7 | L4 | `bad-boundary-columns.md` |
| S9 | L1 / L7 | `missing-policies-section.md` |
| A1 | L8 / X2 | `non-unique-root.md` |
| A3 | R3 | `reference-to-member.md` |
| A4 | R3 | `reference-to-member.md` |
| A7 | R3 | `reference-to-member.md` |
| I2 | L10 | `missing-subblock.md` (bad-scope variant) |
| I3 | I3-mech (N6) | `cross-aggregate-invariant.md` |
| I5 | R4 | `mangled-enum-value.md` |
| X3 | L11 / X4 | `bad-mode.md` |
| X4 | X4-mech (N7/N8) | `transactional-no-justification.md` / `transactional-generic-justification.md` |
| X5 | R5 | `ghost-source-event.md` |
| X6 | R6 | `ghost-target-aggregate.md` |
| X7 | R7 / X7-pre | `broken-upstream-01.md` (upstream-defect→01) |
| L1 | R2 | `ghost-boundary-term.md` |
| L2 | L12 | `forbidden-synonym-used.md` |
| L4 | R4 | `mangled-enum-value.md` |
| L5 | L5 (lint) | `missing-subblock.md` |

*(D1/D3/D4 are ⚠️ DRY rules whose mechanizable subsets are owners L13/L15/L16, proven by
`restated-event-table.md` / `restated-terms-table.md` / `restated-enum-listing.md`; D2-mech is
L17, proven by `restated-lifecycle.md` — listed for completeness of the D-theme DRY family.
S8/A2/A5/A6/A8/I1/I4/I6/L3/L6/X1/X2/D5 are ⚠️/ℹ️ rules: each still carries a mechanical owner
(L6/X2/AJ1/AJ5/L10/AJ4/L14, R4-owner L6, etc.) and, where a behaviour can fail concretely, a
negative fixture — e.g. L6-ownership is proven by `wrong-aggregate-enum-value.md`. The
selftest's COVERAGE array asserts the positive+negative floor over the §5 table and fails if
any ❌ rule lacks either side. Agent-judged checks cover only the ⚠️/ℹ️ semantic residue (A5/A6
sizing, I3-paraphrase, X4-quality, I4 truth, A8/I6 anaemia) with closed verdict schemas.
Pass = status `pass` = zero ❌ findings, reconciled, ≥1 check executed.*

---

## Appendix — sanctioned implementation deviations

Three implementer decisions, each documented inline in `scripts/` and reconciled here (none weakens an ❌-rule):

1. **Pinned header strings follow this file over the catalog's illustrative parentheticals** — the executable shapes are `Member | Kind | 02 Term`, `ID | Rule | Scope`, `Policy | Source event | Target aggregate | Mode | Justification`; the catalog's template block now matches.
2. **L16 (D4-mech) threshold = full value-set recap** — a prose enumeration trips only when it lists *all* values of one 02 enum (a subset cited inside an invariant is a legitimate business constraint, not a restatement); the table-shaped recap (L16's table form) is caught unconditionally.
3. **R3 flags only pure interior members** — a References target whose name is both a member and a 01 aggregate is a legitimate reference-by-identity to that aggregate; only targets that exist solely as another aggregate's interior member trip A3/A7.
