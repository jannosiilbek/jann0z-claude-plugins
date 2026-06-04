# Glossary — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `glossary` skill (artifact
`specs/02-glossary.md`). It defines the **sole executable pass/fail authority** that ships
with the skill: a markdown linter + a mechanical resolution / exact-value /
reason-qualified-negative checker over a closed scenario format, plus a minimal set of
agent-judged checks. It satisfies the verification doctrine §2 (closed assertion grammar,
machine-readable summary, status taxonomy, no vacuous green, agent judgment only where the
contract marks it), §6 (determinism), and build steps B2 (lint design) and B3 (simulation
design).

It is **paired with** `references/validation-rules.md` (the closed rule catalog, A1–F5).
Every check below cites the catalog rule ID(s) it mechanizes. **The catalog is the review
vocabulary; this file is the executable harness over it.** No check here exists without a
catalog rule behind it.

Unlike `01-event-storming.md`, the glossary is a **two-input** artifact: it is validated
against the **upstream** `01-event-storming.md` it was derived from. The harness therefore
takes two file arguments and resolves every 02→01 reference by exact string:

```
node scripts/harness.mjs <02-artifact> --upstream <01-artifact>
```

The upstream parse uses the *pinned 01 format* (it is the same A-theme shape the
event-storming harness pins): `## Domain Events` table `Event | Actor | Trigger | Notes`;
`## Actors` table `Actor | Kind | Responsibility`; `## Hotspots` table
`Hotspot | Question | Blocks`; `## Lifecycle Skeletons` with `### <AggregateName>` numbered
lists of event names. The upstream is the **authority** for event/actor/aggregate names;
02 references them and never renames them (catalog F-theme).

## 0 — Oracle summary (doctrine §2)

- **No engine, no executable corpus.** A ubiquitous-language glossary is a definitional
  document, not a runnable program. `sources/SOURCES.md` → "Executable sources: none.
  Verified — this domain (ubiquitous language / glossaries) has no executable spec or
  runnable artifact." The artifact is itself the model. The **strongest available oracle
  is therefore mechanical**: parse 02's own markdown and the upstream 01, lint 02's
  structure against the A-theme format spec, and run resolution / exact-value /
  reason-qualified-negative checks over the cross-document references (each
  `01 element (exact string)` cell is a link to resolve into 01; each enum is a derivation
  from a 01 lifecycle skeleton to verify value-by-value; each forbidden-synonym row is a
  link to resolve into 02's own Terms).
- **Agent judgment** is admitted ONLY for the handful of inherently semantic catalog rules
  (§6), each listed with the reason it cannot be mechanical and a **closed verdict schema**
  (enumerated verdicts, never prose). All ❌-severity catalog rules are mechanizable; no ❌
  rule is left to agent judgment.
- **Status taxonomy:** `pass | fail | malformed | broken-test`.
  - `pass` — both artifacts parsed; every executed check passed; checks counter reconciled
    (§5); ≥1 check executed.
  - `fail` — both artifacts parsed; ≥1 ❌-class check failed. **Includes the
    `upstream-defect` case** (a 01 defect surfaced through 02's resolution checks — §9):
    the status stays `fail` (the taxonomy is closed), but the finding carries the
    distinguished `upstream-defect` class for routing.
  - `malformed` — the **02 artifact** is unparseable against the pinned A-theme format (a
    required H2 absent or out of order, a required table absent or with the wrong column
    shape, an enum subsection missing its values table) such that downstream checks cannot
    be anchored. Distinct from a populated-but-wrong artifact, which is `fail`.
  - `broken-test` — a check could not evaluate (threw, indeterminate input), OR a
    reason-qualified negative passed for the wrong reason (the rejection fired but not on
    the asserted rule), OR the checks counter failed to reconcile (a silently dropped
    check), OR zero checks parsed (no vacuous green), OR the **upstream 01 itself is
    unparseable** against the pinned 01 format (the harness cannot resolve references
    against a shapeless upstream — this is a broken *test fixture*, not a 02 defect; see §9
    for the distinction from `upstream-defect`).
- **No vacuous green:** zero parsed/executed checks ⇒ exit failure with status
  `broken-test`. A typo'd negative check (a defect that should fail but the check never
  fired, or fired on the wrong rule) ⇒ `broken-test`, never `pass`.

## 1 — Tooling record (B2)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `event-storming` harness convention (suite uniformity). |
| Entry points | `scripts/harness.mjs` (the oracle; `<02-artifact> --upstream <01-artifact>`), `scripts/selftest.mjs` (runs the harness over every shipped fixture pair and asserts the expected status + failing-check). |
| Markdown parser | **Hand-rolled line/table/heading/ordered-list parser**, dependency-free, vendored in `scripts/lib/md.mjs` — shared shape-reader for both the 02 artifact and the pinned 01 upstream. |
| Parser version pin | Internal module; pinned by the repo commit. No external version to track. |
| External deps | **None.** Self-contained; `selftest.mjs` requires no `npm install`. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Derivation lexicon | `scripts/lib/lexicon.mjs` — the closed vague-token blocklist (C4), tech-leak blocklist (C3), and the `event-string → snake_case state value` normalizer (D5/D7). Closed and vendored; extended only by a committed edit, never ad hoc at runtime. |

**Rationale for hand-rolled over `marked`/`remark`:** the A-theme pins the *exact* shapes
the harness must verify — four fixed level-2 headings in canonical order (A1), three tables
with fixed column orders (A2/A4 + the enum values table A3), and `### <EnumName>`
subsections each holding a 2-column values table (A3). A general CommonMark AST is more
surface than these fixed shapes need; pinning a parser version + lockfile adds a moving
dependency to a skill whose whole point is byte-deterministic re-runs (§6). A small
tolerant table/heading reader covers every pinned shape, keeps the skill dependency-free
and copy-portable, and makes the `malformed` boundary explicit: the parser yields a typed
parse error exactly when an A-rule shape is violated, which is precisely the `malformed`
trigger.

**Reuse note (doctrine "reuse over invention: copied, never referenced"):** the
`event-storming` skill already ships a hand-rolled `md.mjs` reader and a `checks.mjs`
grammar for the identical 01 format. This skill **copies** that 01 reader (it must parse
the same pinned 01 shape as the upstream) and the `checks.mjs` class scaffold, then extends
them with the 02-specific shapes (Terms / Enums / Forbidden Synonyms). Copied, never
cross-referenced — each skill stays self-contained and portable. No external proven harness
exists for this formalism (SOURCES.md: verified-none).

## 2 — Lint checks (structural; mechanize the A-theme + mechanical B-theme rules)

Lint checks run first, over the **02 artifact** (the 01 upstream is shape-validated
separately — a 01 shape failure is `broken-test`, see §9). Lint IDs are `L*`. A failing ❌
lint that prevents anchoring 02 yields `malformed`; a failing ❌ lint over a parseable 02
yields `fail`; ⚠️/ℹ️ lints are warn-only findings.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| L1 | All four exact level-2 headings present and in canonical order: `## Upstream Fingerprint` → `## Terms` → `## Enums` → `## Forbidden Synonyms`. | A1 | `malformed` |
| L2 | `## Terms` table header is exactly `Term \| Definition \| Owns 01 element? \| 01 element (exact string)` (4 cols, that order). | A2 | `malformed` |
| L3 | Every entry under `## Enums` has a `### <EnumName>` subsection AND a values table with header exactly `Value \| Derived from event (exact 01 string)` (2 cols). | A3 | `malformed` |
| L4 | `## Forbidden Synonyms` table header is exactly `Forbidden term \| Canonical term \| Reason` (3 cols, that order). | A4 | `malformed` |
| L5 | No empty / placeholder cell (`-`, `TBD`, `???`, blank) in the Terms, any Enum-values, or Forbidden-synonyms tables. | A6 | `fail` |
| L6 | No `Term` cell carries more than one candidate name (no `/`, ` or `, `aka`, parenthetical alternative, or comma-list). | A5 | `fail` |
| L7 | `## Upstream Fingerprint` records a line of the form `01-event-storming.md@sha256:<64-hex>`; the hex is 64 chars of `[0-9a-f]` and is not a placeholder (`0000…`, `xxxx…`, `<hex>`). | B1, B3 | `fail` |
| L8 | The fingerprint block / prose references **only** `01-event-storming.md` — no other spec (03/04, external glossary) is cited as an input. | B2 | `fail` |
| L9 | A one-line bounded-context declaration is present above `## Terms`. | A7 | warn-only (⚠️) |
| L10 | A fingerprint freshness note (date or 01 revision) sits beside the digest. | B4 | warn-only (ℹ️) |
| L11 | Every `Value` cell is lowercase `snake_case` (`^[a-z][a-z0-9_]*$`; no spaces, caps, hyphens). | D5 | `fail` |
| L12 | Term casing is consistent against the artifact's pinned convention (PascalCase nouns, declared once); mixed conventions without a declaration. | C8 | `fail` |
| L13 | No `Definition` cell carries a tech-leak token from the closed blocklist `{table, column, foreign key, API, endpoint, JSON, service class, null}` (whole-word, case-insensitive). | C3 | `fail` |
| L14 | No `Term` / `Definition` carries a vague-filler token from the closed blocklist `{data, info, item, thing, manager, process, handle}` or a bare `status`. | C4 | `fail` |
| L15 | No `Definition` defers instead of defining (`see X`, `same as Y`, `as above`). | C7 | warn-only (⚠️) |
| L16 | No Domain-Events-shaped table (`Event \| Actor \| Trigger \| Notes` header) appears anywhere inside 02 (a restated 01 event table). | E1 (E1-mech) | `fail` |
| L17 | No Hotspots-shaped table (`Hotspot \| Question \| Blocks` header) appears anywhere inside 02 (a restated 01 hotspot block). | E4 (E4-mech) | `fail` |
| L18 | No `Definition` contains ≥N (default 2) consecutive verbatim 01 event names from a single skeleton, in skeleton order (a restated lifecycle). | E2 (E2-mech) | `fail` |

L16/L17/L18 are **content lints** over a parseable 02 (`fail`, not `malformed`): they
scan the already-anchored artifact's tables/definitions and do **not** walk any resolution
edge, so they leave the §5 edge arithmetic untouched. The blocklists in L13/L14 and the
value-normalizer used by L11 are **closed and vendored**
in `scripts/lib/lexicon.mjs`. They are extended only by editing that file in a committed
change — never ad hoc at runtime.

## 3 — Closed fixture / scenario format (B3)

Because the artifact is the model (not executable), the "scenario" is **a walk over 02's
own claims resolved against the parsed 01 upstream**. The harness builds, per run, two
in-memory graphs (02 and 01) and traverses the cross-document edges. No external scenario
data is injected into a *target* run — the two artifacts supply every element. The shipped
fixtures (below) are **whole canned artifact pairs** used only by `selftest.mjs` to prove
the harness itself.

### 3.1 Derived scenario graph (built fresh per run — §6)

From parsed **02** the harness derives:

- `terms[]` — Terms rows: `{term, definition, ownsElement (yes|no), element01}`.
- `enums[]` — `### <EnumName>` subsections: `{enumName, values[] (ordered)}` where each
  value is `{value, derivedFromEvent}`.
- `forbidden[]` — Forbidden-synonyms rows: `{forbiddenTerm, canonicalTerm, reason}`.

From parsed **01** (the pinned upstream) the harness derives the resolution targets:

- `events01[]` — Domain-Events `Event` cells (the verbatim event strings).
- `actors01[]` — Actors `Actor` cells.
- `aggregates01[]` — `### <AggregateName>` skeleton headings.
- `skeletons01[]` — `{aggregate, steps[] (ordered event strings)}`.

Closed traversal set (every relationship 02 claims becomes a walked edge):

1. **Term→01-element edge** — each `terms[i]` with `ownsElement = yes` resolves
   `element01` into `events01 ∪ actors01 ∪ aggregates01` by exact string.
2. **01-actor/aggregate→Term membership** — each `actors01` name and each `aggregates01`
   name has a corresponding owned `terms[]` row (no dropped core concept).
3. **Enum→skeleton edge** — each `enums[k]` resolves its aggregate (name minus `Status`
   suffix) into `aggregates01`; and each `aggregates01` has exactly one matching enum.
4. **Enum-value→event edge** — each `enums[k].values[j].derivedFromEvent` resolves into
   `events01` by exact string AND into the **owning aggregate's** skeleton steps
   (`skeletons01` for that aggregate).
5. **Enum-value ordering** — `enums[k].values[*]` count and order equal the owning
   skeleton's ordered `steps` (one value per event, in skeleton order).
6. **Forbidden→Term edge** — each `forbidden[h].canonicalTerm` resolves into `terms[]`.

Every edge class above is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Shipped fixtures (`scripts/fixtures/`)

One shared deterministic upstream `upstream-01.md` (the 01 every 02 fixture is validated
against) + one `valid.md` (a 02 that passes against it) + the illegal 02 fixtures + one
broken **upstream** fixture. Each illegal fixture carries exactly one deliberate defect, so
its negative fires **for the stated reason** (a fixture that fails for any other reason is
itself `broken-test`). The expected `(status, failing-check, upstream?)` is recorded in
`scripts/fixtures/manifest.json`.

**`upstream-01.md`** — a small but covering 01: **≥2 aggregates with skeletons** (`Order`,
`Ticket` — distinct event sets), **≥6 events** (e.g. `Order Placed`, `Order Paid`,
`Order Expired`, `Ticket Reserved`, `Ticket Sold`, `Ticket Released`), **≥3 actors**
(`Customer`, `Payment Gateway`, `Box Office System`), **≥1 hotspot**. Static and stable; no
clock/random/engine values.

| Fixture file (02) | Upstream | Injected defect | Must fail | Expected status |
|-------------------|----------|-----------------|-----------|-----------------|
| `valid.md` | `upstream-01.md` | none — a minimal correct 02 over the shared 01 | nothing | `pass` |
| `missing-section.md` | `upstream-01.md` | drops `## Enums` heading | L1 | `malformed` |
| `bad-terms-columns.md` | `upstream-01.md` | Terms header reordered to `Definition \| Term \| …` | L2 | `malformed` |
| `bad-enum-subshape.md` | `upstream-01.md` | an enum lacks its `Value \| Derived from event…` table | L3 | `malformed` |
| `term-ghost-element.md` | `upstream-01.md` | a Term with `Owns = yes`, `01 element = Order Shipped` (absent from 01) | F1 (resolution) | `fail` |
| `enum-missing-for-skeleton.md` | `upstream-01.md` | `Order` skeleton exists in 01 but no `OrderStatus` enum in 02 | D1 | `fail` |
| `extra-enum-no-skeleton.md` | `upstream-01.md` | a `RefundStatus` enum whose `Refund` aggregate has no 01 skeleton | D2 | `fail` |
| `enum-value-wrong-aggregate.md` | `upstream-01.md` | `OrderStatus` has a value `derived from` `Ticket Sold` (a real 01 event of a *different* aggregate) | F3 (owner) | `fail` |
| `paraphrased-derived-from.md` | `upstream-01.md` | a value's `Derived from event` is `paid` instead of the verbatim `Order Paid` | D6/F2 (resolution) | `fail` |
| `duplicate-term.md` | `upstream-01.md` | two Terms rows with identical `Term` `Customer` | X-dup (owner; C1) | `fail` |
| `forbidden-synonym-unresolved.md` | `upstream-01.md` | a Forbidden-synonyms row whose `Canonical term` is not in `## Terms` | F5 (resolution) | `fail` |
| `vague-term.md` | `upstream-01.md` | a Term/Definition using `status` bare / `data` | L14 | `fail` |
| `definition-restates-lifecycle.md` | `upstream-01.md` | a Definition containing ≥N consecutive verbatim 01 event names (`Order Placed Order Paid Order Expired`) | L18 / E2-mech (DRY) | `fail` |
| `restated-event-table.md` | `upstream-01.md` | a pasted Domain-Events-shaped table (`Event\|Actor\|Trigger\|Notes`) inside 02 | L16 / E1-mech | `fail` |
| `restated-hotspot-block.md` | `upstream-01.md` | a pasted Hotspots-shaped table (`Hotspot\|Question\|Blocks`) inside 02 | L17 / E4-mech | `fail` |
| `forbidden-cols-bad.md` | `upstream-01.md` | Forbidden-synonyms header reordered to `Canonical term \| Forbidden term \| …` | L4 (A4) | `malformed` |
| `term-multi-name.md` | `upstream-01.md` | a `Term` cell carrying two candidate names (`Customer / Buyer`) | L6 (A5) | `fail` |
| `empty-cell.md` | `upstream-01.md` | a blank `Definition` cell in the Terms table | L5 (A6) | `fail` |
| `foreign-input.md` | `upstream-01.md` | the fingerprint prose cites a foreign spec (`03-context-map.md`) | L8 (B2) | `fail` |
| `placeholder-hex.md` | `upstream-01.md` | the sha256 is a placeholder (`0000…`, 64 zeros) | L7 (B1/B3) | `fail` |
| `tech-leak-definition.md` | `upstream-01.md` | a Definition leaks tech tokens (`table`, `foreign key`) | L13 (C3) | `fail` |
| `dropped-core-concept.md` | `upstream-01.md` | the `BoxOfficeSystem` term row is dropped (01 actor `Box Office System` has no owned term) | R2 (C6) | `fail` |
| `mixed-casing.md` | `upstream-01.md` | a `lower case phrase` term mixed into an otherwise PascalCase term set, no convention declared | L12 (C8) | `fail` |
| `reordered-enum-value.md` | `upstream-01.md` | `OrderStatus` values out of skeleton order (`paid` before `placed`) | X3 (D4) | `fail` |
| `mangled-enum-value.md` | `upstream-01.md` | an enum `Value` is not snake_case (`Order Placed`) while `Derived from event` stays verbatim-correct | L11 (D5) | `fail` |
| `wrong-reason-trap.md` | `upstream-01.md` | **two** defects — an unresolved `01 element` reference AND a vague term — proves the resolution negative reports the **F1 element** reason, not L14 | F1 isolates over L14 | `fail` (reason = F1) |
| `vacuous.md` | `upstream-01.md` | structurally valid 02 but harness fed the `--no-checks` disabled path | n/a | `broken-test` (zero checks) |
| `valid.md` | `broken-upstream-01.md` | **upstream defect** — the 01's `Order` skeleton references `Order Refunded`, an event absent from 01's Domain Events table (a self-inconsistent upstream) | enum-value resolution against 01 surfaces it | `fail` (finding class = `upstream-defect`) |
| `valid.md` | `malformed-upstream-01.md` | the 01 upstream itself drops `## Domain Events` (unparseable upstream) | n/a — cannot anchor 01 | `broken-test` (broken fixture, not a 02 defect) |

`wrong-reason-trap.md` is the explicit doctrine §2 guard: it would "pass for the wrong
reason" under a sloppy negative. The selftest asserts the failing-check ID equals `F1`, not
merely that *some* check failed.

The last two rows are the **upstream pair**: the same `valid.md` 02 validated against a
*broken* 01. They distinguish the two upstream outcomes (§9): a 01 that is well-formed but
**self-inconsistent** routes to `fail` + `upstream-defect`; a 01 that is **unparseable**
routes to `broken-test`.

**DRY mechanizable subset (E-theme decision).** Catalog E2 ("definition recaps an
aggregate's lifecycle") is split: the **mechanizable** subset is "a `Definition` contains
≥N (default 2) consecutive verbatim 01 event names from a single skeleton, in skeleton
order" → `E2-mech`, a deterministic string-window check **implemented as lint `L18`** and
proven by `definition-restates-lifecycle.md`. The **semantic** subset ("first placed, then
paid…" paraphrased without verbatim event strings) is left to agent-judged `AJ2`. E1
(restated event *table*) and E4 (restated hotspot block) are mechanical: a
Domain-Events-shaped (`Event|Actor|Trigger|Notes`) or Hotspots-shaped
(`Hotspot|Question|Blocks`) table appearing anywhere inside 02 →
`E1-mech` (**lint `L16`**) / `E4-mech` (**lint `L17`**), proven by
`restated-event-table.md` / `restated-hotspot-block.md`.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a
check means editing this section AND `scripts/lib/checks.mjs` in a committed change, and the
new check MUST cite a catalog rule. The harness emits each check's `id`, `class`, `status`,
and `rule` in its JSON summary (§7). Four classes, per B3:

### 4.1 Resolution checks (`R` — a referenced element exists in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R1 | Every Term with `Owns = yes` has its `01 element (exact string)` resolve (char-for-char) to a 01 event/actor/aggregate name. | F1, F2 |
| R2 | Every 01 actor name and every 01 aggregate name has a corresponding owned `Term` row (no dropped core concept). | C6 |
| R3 | Every enum's aggregate (enum name minus `Status`) resolves to a `### <AggregateName>` skeleton in 01. | F4, D2 |
| R4 | Every 01 lifecycle skeleton has exactly one matching `<AggregateName>Status` enum in 02. | D1, D3 |
| R5 | Every enum value's `Derived from event` resolves char-for-char to a 01 Domain-Events event string. | D6, F2 |
| R6 | Every enum value's `Derived from event` belongs to the **owning aggregate's** skeleton (not another aggregate's). | F3 |
| R7 | Every Forbidden-synonyms `Canonical term` resolves to a row in `## Terms`. | F5 |

### 4.2 Exact-value checks (`X` — exact counts/values against the derived graph; no open-ended comparison)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| X1 | `parsed.termCount` equals the number of Terms data rows AND equals the count the harness reconciled Term-edges against (intake reconciliation). | §5 |
| X2 | Distinct `Term` count equals Terms row count (`unique(terms) === terms.length`) — no duplicate term. | C1 |
| X3 | Each enum's value count **and order** equal its owning skeleton's ordered event list (`values.map(v) deep-equals skeleton.steps.map(normalize)`). | D4 |
| X4 | Enum count equals 01 skeleton count (`enums.length === aggregates01.length`) — bijection of skeletons↔enums. | D1+D2 |
| X5 | The executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.3 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

These are the named negatives proven by the shipped illegal fixtures. Each asserts both
that the defect is rejected AND that the failing-check ID matches the defect's owner rule
(wrong-reason ⇒ `broken-test`).

| ID | Illegal input rejected | For the reason | Fixture | Catalog rule |
|----|------------------------|----------------|---------|--------------|
| N1 | Term references nonexistent 01 element | `01 element` not in 01 (not vagueness, not anything else) | `term-ghost-element.md`, `wrong-reason-trap.md` | F1 |
| N2 | enum missing for an existing skeleton | a 01 skeleton has no enum | `enum-missing-for-skeleton.md` | D1 |
| N3 | extra enum without a skeleton | enum's aggregate absent from 01 | `extra-enum-no-skeleton.md` | D2/F4 |
| N4 | enum value maps to wrong aggregate's event | event belongs to a different skeleton | `enum-value-wrong-aggregate.md` | F3 |
| N5 | paraphrased (non-verbatim) derived-from | `Derived from event` not char-for-char in 01 | `paraphrased-derived-from.md` | D6/F2 |
| N6 | duplicate term | two rows share one `Term` string | `duplicate-term.md` | C1 |
| N7 | forbidden-synonym canonical unresolved | `Canonical term` not in `## Terms` | `forbidden-synonym-unresolved.md` | F5 |
| N8 | vague term | term/definition hits the vague blocklist | `vague-term.md` | C4 |
| N9 | definition restates lifecycle | ≥N consecutive verbatim 01 event names | `definition-restates-lifecycle.md` | E2-mech |
| N10 | non-snake_case enum value | `Value` fails `snake_case` | `mangled-enum-value.md` (owner L11) | D5 |
| N11 | malformed 02 structure | required heading/table shape absent | `missing-section.md`, `bad-terms-columns.md`, `bad-enum-subshape.md` | A1/A2/A3 |
| N12 | upstream self-inconsistency | a 01 skeleton step / referenced event absent from 01's own Domain Events | `broken-upstream-01.md` | F-theme via §9 (`upstream-defect`) |

(Lint `L*` and negative `N*` IDs overlap by design where one rule has both a positive lint
pass and a negative fixture proof — they share the catalog rule, not the ID space: `L*`
runs over the target 02, `N*` is proven over a shipped fixture in selftest.)

### 4.4 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ1`–`AJ5` enumerated in §6. They run last, only over checks that survived all mechanical
gates, and return enumerated verdicts only.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The 02 artifact owns four element sets: `terms`, `enums`,
`enum values`, `forbidden synonyms`. The intake count is:

```
intake = |terms| + |enums| + Σ|enum.values| + |forbidden|
```

The cross-document **resolution edge count** the harness must walk (from §3.1):

```
edgesExpected = |terms with ownsElement=yes|          (R1 Term→01)
              + |actors01| + |aggregates01|           (R2 core-concept membership)
              + |enums|                                (R3 enum→skeleton)
              + |aggregates01|                         (R4 skeleton→enum)
              + Σ|enum.values|                         (R5 value→event)
              + Σ|enum.values|                         (R6 value→owning skeleton)
              + |forbidden|                            (R7 forbidden→Term)
```

**Every owned element exercised ≥1 time.** The harness asserts:
- every `term` is touched by X1/X2 and by R1 (if it owns a 01 element) or R2 (as a
  core-concept target) and L6/L12 (shape/casing);
- every `enum` is touched by R3/R4/X4 and X3 (value bijection);
- every `enum value` is touched by R5 (event resolution), R6 (owning-aggregate), L11
  (snake_case), and X3 (ordering);
- every `forbidden synonym` is touched by R7 (canonical resolution) and L5 (non-empty).

**Reconciliation formula (X5 — no silently dropped checks):**

```
executedChecks = lintRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected)
            && (executedChecks > 0)
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠
edgesExpected` ⇒ a check was silently dropped ⇒ `broken-test`.

**Positive AND negative per claimed behavior.** Every behavior/constraint the artifact
claims is proven by **≥1 positive** (a passing check over `valid.md` / the target) **AND
≥1 negative** (a shipped illegal fixture that must fail). The mapping:

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Required headings present & ordered | A1 | L1 over `valid.md` | `missing-section.md` |
| Terms table column shape | A2 | L2 over `valid.md` | `bad-terms-columns.md` |
| Enums sub-shape | A3 | L3 over `valid.md` | `bad-enum-subshape.md` |
| Forbidden-synonyms column shape | A4 | L4 over `valid.md` | `forbidden-cols-bad.md` |
| Single-word term cell | A5 | L6 over `valid.md` | `term-multi-name.md` |
| No empty cells | A6 | L5 over `valid.md` | `empty-cell.md` |
| Fingerprint well-formed (real digest) | B1/B3 | L7 over `valid.md` | `placeholder-hex.md` |
| Exactly one upstream input | B2 | L8 over `valid.md` | `foreign-input.md` |
| Term→01 element resolves, never renamed | F1/F2 | R1 over `valid.md` | `term-ghost-element.md` (+`wrong-reason-trap.md`) |
| No dropped core concept | C6 | R2 over `valid.md` | `dropped-core-concept.md` |
| One enum per skeleton (bijection) | D1/D2 | R3/R4/X4 over `valid.md` | `enum-missing-for-skeleton.md`, `extra-enum-no-skeleton.md` |
| Enum values bijective & ordered | D4 | X3 over `valid.md` | `reordered-enum-value.md` |
| Value snake_case | D5 | L11 over `valid.md` | `mangled-enum-value.md` (N10) |
| Derived-from is verbatim 01 event | D6/F2 | R5 over `valid.md` | `paraphrased-derived-from.md` |
| Value of owning aggregate only | F3 | R6 over `valid.md` | `enum-value-wrong-aggregate.md` |
| No duplicate term | C1 | X2 over `valid.md` | `duplicate-term.md` |
| Forbidden canonical resolves | F5 | R7 over `valid.md` | `forbidden-synonym-unresolved.md` |
| No tech-leak language | C3 | L13 over `valid.md` | `tech-leak-definition.md` |
| No vague language | C4 | L14 over `valid.md` | `vague-term.md` |
| Term casing convention pinned | C8 | L12 over `valid.md` | `mixed-casing.md` |
| Definition does not restate lifecycle | E2-mech | L18 over `valid.md` | `definition-restates-lifecycle.md` |
| No restated 01 event table | E1-mech | L16 over `valid.md` | `restated-event-table.md` |
| No restated 01 hotspot block | E4-mech | L17 over `valid.md` | `restated-hotspot-block.md` |
| Upstream resolves against a sound 01 | §9 | `valid.md`+`upstream-01.md` | `valid.md`+`broken-upstream-01.md` |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a
negative entry above — the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; reason + closed verdict schema)

These catalog rules are **inherently semantic** — they require domain understanding the
mechanical layer cannot supply. Each runs only after mechanical gates pass, and returns an
**enumerated verdict** (never prose). The harness records `{id, verdict, ruleId}`; any
verdict other than the rule's pass-verdict is reported as a finding at the catalog severity
(⚠️/ℹ️ do not block; there are no ❌ agent-judged checks — all ❌ rules are mechanizable).

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ1 | C2 | whether a term's *definition* uses an alternative word for an already-owned concept (a synonym) needs meaning, not string equality (which C1/X2 already cover for identical strings). | `{ no-synonym \| undeclared-synonym \| ambiguous }` |
| AJ2 | E2 (semantic subset) | whether a Definition *paraphrases* a lifecycle ("first placed, then paid…") without verbatim event strings (the verbatim subset is N9/E2-mech) requires reading meaning. | `{ defines-concept \| restates-lifecycle \| ambiguous }` |
| AJ3 | C5 | whether a Term that does not trace to 01 is a *legitimately-introduced value concept* vs *invented vocabulary* needs domain judgment (R2 only covers the must-exist direction). | `{ traces-or-legit-value \| invented \| ambiguous }` |
| AJ4 | E3 | whether a Definition copies 01's actor *responsibility* text (vs a terse independent definition) is a paraphrase judgment beyond verbatim string windows. | `{ terse-definition \| restates-responsibility \| ambiguous }` |
| AJ5 | D7 | whether a derived value reads as a *resulting state* vs an *action/command* ("placed" vs "place") beyond the snake_case mechanical check (D5/L11) is a linguistic judgment. | `{ state-form \| action-form \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); it is reported as an ℹ️ finding,
never silently dropped, and never counts as a pass for reconciliation purposes (it counts
as executed, verdict-recorded). No agent-judged check may emit free prose in an asserted
position.

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order,
`checks[]`/`findings[]` sorted by `id`:

```json
{
  "skill": "glossary",
  "artifact": "specs/02-glossary.md",
  "upstream": "specs/01-event-storming.md",
  "status": "pass | fail | malformed | broken-test",
  "counts": {
    "intake": { "terms": 0, "enums": 0, "enumValues": 0, "forbidden": 0 },
    "checks": { "lint": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "checks": [
    { "id": "L1", "class": "lint", "rule": "A1", "status": "pass" },
    { "id": "R1", "class": "resolution", "rule": "F1", "status": "pass" },
    { "id": "AJ5", "class": "agent-judged", "rule": "D7", "verdict": "state-form" }
  ],
  "findings": [
    { "id": "R1", "rule": "F1", "severity": "error", "class": "upstream-defect", "detail": "01 skeleton step 'Order Refunded' absent from 01 Domain Events" }
  ]
}
```

- The optional `class: "upstream-defect"` on a finding routes a 01-origin defect (§9). It
  does **not** add a status; the status stays `fail` (the taxonomy is closed at four
  values).
- **stderr** — human-readable diagnostics only (parse errors, per-check failure traces, the
  wrong-reason trap explanation, the upstream-defect routing note). Never the machine
  summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. `1` = `fail` (including `upstream-defect`
  findings). `2` = `malformed` (02 unparseable). `3` = `broken-test` (check threw,
  wrong-reason, reconciliation mismatch, zero checks, **or unparseable 01 upstream**). The
  distinct codes let CI separate a wrong 02 (`1`), a shapeless 02 (`2`), and a broken
  harness/fixture (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`.

## 8 — Determinism (doctrine §6)

- The harness reads only the two target artifacts (and, in selftest, the shipped fixture
  pairs). It injects **no clock value, no randomness, no engine-generated value** into any
  asserted position. The `## Upstream Fingerprint` hash/date is *read from 02* and only
  string-checked for presence/shape (L7/L10) — never generated by the harness. The harness
  does **not** itself recompute the sha256 of 01 and assert equality (that would inject an
  engine value); it checks the digest's *shape* and resolves references against the 01 file
  actually passed via `--upstream`.
- State is **built fresh per run** from the two parses; nothing is persisted between runs. A
  re-run over byte-identical inputs is **byte-identical output** (stable key order, sorted
  `checks[]`/`findings[]` by `id`).
- Fixtures in `scripts/fixtures/` are static committed files (the shared `upstream-01.md`,
  the broken upstreams, and the 02 fixtures) with a static `manifest.json` of expected
  `(status, failing-check, upstream)` tuples. `selftest.mjs` is therefore reproducible and
  order-independent.
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the
  reconciliation arithmetic (§5) and their verdicts are recorded, not invented into counts
  — so the **pass/fail mechanical verdict remains byte-deterministic** regardless of agent
  output.

## 9 — Upstream-defect routing (how a 01 defect is reported without patching around it)

02 is validated *against* 01. Three upstream conditions are distinguished, and the harness
**never silently repairs or works around** a bad upstream — it surfaces the defect and
routes it:

1. **Sound upstream.** 01 parses against the pinned 01 format AND is self-consistent (every
   skeleton step is a real Domain-Events event of that aggregate). The 02→01 resolution
   checks (R1, R3–R6) run normally; a failure is a **02 defect** → `fail`, ordinary
   finding.

2. **Well-formed but self-inconsistent upstream** (the `upstream-defect` case). 01 parses,
   but it is internally broken — e.g. a `### Order` skeleton lists `Order Refunded`, an
   event absent from 01's own Domain Events table. When a *correct* 02 derives its enum
   values faithfully from that skeleton, the value's `Derived from event` cannot resolve
   into 01's events. The naive reading would blame **02**. Instead the harness runs a
   **pre-resolution upstream self-check** (every skeleton step must exist in 01's
   Domain Events; mirrors the event-storming N4/E6 check): if that self-check fails, the
   resolving R-check's finding is tagged `class: "upstream-defect"` and points at the **01
   element**, not the 02 row. Status is `fail` (taxonomy stays closed), exit `1`, and the
   finding's detail names the 01 file + the missing element so the pipeline routes the fix
   **upstream** to the event-storming artifact, not to 02. Proven by
   `valid.md` + `broken-upstream-01.md`.

3. **Unparseable upstream** (`broken-test`, not `upstream-defect`). 01 does not parse
   against the pinned format at all (a required 01 heading/table absent — e.g.
   `## Domain Events` missing). The harness cannot anchor *any* resolution target, so it
   cannot make a trustworthy statement about 02. This is a **broken test fixture / bad
   invocation**, not a 02 or 01 *content* defect the reviewer can act on per-row — status
   `broken-test`, exit `3`, stderr explains "upstream 01 unparseable: cannot resolve 02
   references." Proven by `valid.md` + `malformed-upstream-01.md`.

The split is deliberate: `upstream-defect` (case 2) is an actionable content finding routed
to the *01 owner* while keeping the §2 status set closed; `broken-test` (case 3) is the
harness honestly refusing to emit a green/red verdict it cannot justify. Neither case lets
the harness paper over the upstream by inferring, substituting, or skipping the missing 01
element.

---

*This contract mechanizes catalog rules A1–F5. **Mechanical ❌ coverage is complete:** every
one of the 27 ❌ catalog rules has BOTH (a) a mechanical owner check and (b) a dedicated
negative fixture. The full reconciliation (rule → owner check → negative fixture):*

| ❌ rule | Owner check | Negative fixture |
|---|---|---|
| A1 | L1 | `missing-section.md` |
| A2 | L2 | `bad-terms-columns.md` |
| A3 | L3 | `bad-enum-subshape.md` |
| A4 | L4 | `forbidden-cols-bad.md` |
| A5 | L6 | `term-multi-name.md` |
| A6 | L5 | `empty-cell.md` |
| B1 | L7 | `placeholder-hex.md` |
| B2 | L8 | `foreign-input.md` |
| B3 | L7 | `placeholder-hex.md` |
| C1 | X2 | `duplicate-term.md` |
| C3 | L13 | `tech-leak-definition.md` |
| C4 | L14 | `vague-term.md` |
| C6 | R2 | `dropped-core-concept.md` |
| C8 | L12 | `mixed-casing.md` |
| D1 | R4 / X4 | `enum-missing-for-skeleton.md` |
| D2 | R3 / X4 | `extra-enum-no-skeleton.md` |
| D3 | R4 | `enum-missing-for-skeleton.md` |
| D4 | X3 | `reordered-enum-value.md` |
| D5 | L11 | `mangled-enum-value.md` |
| D6 | R5 | `paraphrased-derived-from.md` |
| E1 | L16 (E1-mech) | `restated-event-table.md` |
| E4 | L17 (E4-mech) | `restated-hotspot-block.md` |
| F1 | R1 | `term-ghost-element.md` |
| F2 | R1 / R5 | `term-ghost-element.md` / `paraphrased-derived-from.md` |
| F3 | R6 | `enum-value-wrong-aggregate.md` |
| F4 | R3 | `extra-enum-no-skeleton.md` |
| F5 | R7 | `forbidden-synonym-unresolved.md` |

*(E2's mechanizable subset is owner L18, proven by `definition-restates-lifecycle.md`; E2 is
⚠️, listed here for completeness of the E-theme DRY trio L16/L17/L18.) The selftest's PART 7
COVERAGE array (25 behaviour rows) asserts the positive+negative floor over this table and
fails if any ❌ rule lacks either side. Agent-judged checks cover only the ⚠️/ℹ️ semantic
residue (C2, C5, D7, E2-paraphrase, E3) with closed verdict schemas. Pass = status `pass` =
zero ❌ findings, reconciled, ≥1 check executed.*
