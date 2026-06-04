# EventStorming — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `event-storming` skill (artifact
`specs/01-event-storming.md`). It defines the **sole executable pass/fail authority** that
ships with the skill: a markdown linter + a mechanical resolution/exact-value/negative
checker over a closed scenario format, plus a minimal set of agent-judged checks. It
satisfies the verification doctrine §2 (oracle), §6 (determinism), and build steps B2
(lint design) and B3 (simulation design).

It is **paired with** `references/validation-rules.md` (the closed rule catalog). Every
check below cites the catalog rule ID(s) it mechanizes. **The catalog is the review
vocabulary; this file is the executable harness over it.** No check here exists without a
catalog rule behind it.

## 0 — Oracle summary (doctrine §2)

- **No engine, no executable corpus.** EventStorming is a whiteboard notation with an
  intentionally non-formal grammar (the "pizza rule"); SOURCES.md §Exclusions confirms
  `verified-none`: no parser, validator, or test corpus exists or is expected. The
  artifact is itself the model (not executable). The **strongest available oracle is
  therefore mechanical**: parse the artifact's own markdown, lint its structure against
  the A-theme format spec, and run resolution / exact-value / reason-qualified-negative
  checks over the artifact's own claims (each lifecycle skeleton is a path to traverse;
  each event/actor/trigger/blocks reference is a cross-table link to resolve).
- **Agent judgment** is admitted ONLY for the handful of inherently semantic catalog
  rules (§6 below), each listed with the reason it cannot be mechanical and a **closed
  verdict schema** (enumerated verdicts, never prose).
- **Status taxonomy:** `pass | fail | malformed | broken-test`.
  - `pass` — artifact parsed; every executed check passed; checks counter reconciled
    (§5); ≥1 check executed.
  - `fail` — artifact parsed; ≥1 ❌-class check failed.
  - `malformed` — artifact unparseable against the pinned A-theme format (e.g. a required
    section heading absent, a required table absent or with the wrong column shape) such
    that downstream checks cannot be anchored. Distinct from a populated-but-wrong
    artifact, which is `fail`.
  - `broken-test` — a check could not evaluate (threw, indeterminate input), OR a
    reason-qualified negative passed for the wrong reason (the rejection fired but not on
    the asserted rule), OR the checks counter failed to reconcile (a silently dropped
    check), OR zero checks parsed (no vacuous green).
- **No vacuous green:** zero parsed/executed checks ⇒ exit failure with status
  `broken-test`.

## 1 — Tooling record (B2)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (ESM). Matches the schema-therapy harness convention. |
| Entry points | `scripts/harness.mjs` (the oracle; run against a target artifact), `scripts/selftest.mjs` (runs the harness over every shipped fixture and asserts the expected status). |
| Markdown parser | **Hand-rolled line/table parser**, dependency-free, vendored in `scripts/lib/md.mjs`. |
| Parser version pin | Internal module; pinned by the repo commit. No external version to track. |
| External deps | **None.** Self-contained; `selftest.mjs` requires no `npm install`. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |

**Rationale for hand-rolled over `marked`/`remark`:** the A-theme pins the *exact* shapes
the harness must verify — five fixed level-2 headings (A1), three tables with fixed column
orders (A3/A4/A5), and `### <Aggregate>` subsections each holding a numbered list
(A6/E1). A general CommmonMark AST is more surface than these fixed shapes need, and
pinning a parser version + lockfile adds a moving dependency to a skill whose whole point
is byte-deterministic re-runs (§6). A ~150-line tolerant table/heading/ordered-list reader
covers every pinned shape, keeps the skill dependency-free and copy-portable (no
cross-plugin references — doctrine "reuse over invention: copied, never referenced"), and
makes the `malformed` boundary explicit: the parser yields a typed parse error exactly
when an A-rule shape is violated, which is precisely the `malformed` trigger.

**Reuse note:** no proven harness exists for this formalism (verified-none). Nothing to
adapt in. The `md.mjs` reader and the `checks.mjs` grammar are authored standalone for
this skill and may later be *copied* (never referenced) by sibling schema-therapy skills.

## 2 — Lint checks (structural; mechanize the A-theme + mechanical B/C/D/E/G rules)

Lint checks run first. Lint IDs are `L*`. A failing ❌ lint that prevents anchoring the
artifact yields `malformed`; a failing ❌ lint over a parseable artifact yields `fail`.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| L1 | All five exact level-2 headings present: `## Upstream Fingerprint`, `## Domain Events`, `## Actors`, `## Hotspots`, `## Lifecycle Skeletons`. | A1 | `malformed` |
| L2 | `## Upstream Fingerprint` block records a source label/title AND a stable identifier (a content hash `[0-9a-f]{7,}` OR an ISO date `\d{4}-\d{2}-\d{2}`). | A2 | `malformed` |
| L3 | `## Domain Events` contains a table with columns exactly `Event | Actor | Trigger | Notes` in order. | A3 | `malformed` |
| L4 | `## Actors` contains a table with columns exactly `Actor | Kind | Responsibility` in order. | A4 | `malformed` |
| L5 | `## Hotspots` contains a table with columns exactly `Hotspot | Question | Blocks` in order. | A5 | `malformed` |
| L6 | `## Lifecycle Skeletons` contains ≥1 `### <AggregateName>` subsection, each body an ordered (numbered) list. | A6, E1 | `malformed` |
| L7 | Every Actors-table `Kind` cell ∈ `{person, role, department, system, automated-process}`. | A4 (enum) | `fail` |
| L8 | Domain Events table has ≥1 data row; Actors table has ≥1 data row. | A8 (❌ part) | `fail` |
| L9 | Hotspots table is non-absent: it has ≥1 data row OR exactly one explicit `None identified` row. | A8 (ℹ️ part), D4 | warn-only (ℹ️) |
| L10 | A terminology-mapping note ("aggregate" ↔ "Constraint") is present in `## Lifecycle Skeletons` or a glossary footnote. | A7 | warn-only (⚠️) |
| L11 | Every `Event` cell matches the past-tense heuristic (last token ends `-ed`, OR is on the vendored irregular-past list e.g. `Sent/Paid/Built/Made/Signed/Shipped/Cancelled/Received/Lost/Begun/Set`). Non-matches are flagged for confirmation by AJ1. | B1, E2 | `fail` (❌) |
| L12 | No `Event` cell contains a vague-filler token from the closed blocklist `{manage, process, handle, stuff, various, etc, data}` (whole-word, case-insensitive); same blocklist applied to Actor names and Aggregate headings. | G1 | warn-only (⚠️) |
| L13 | No `Event`/`Actor`/`Aggregate` name contains a tech-leak token from the closed blocklist `{API, DB, endpoint, HTTP, table, class, SQL, JSON, UUID}` (whole-word, case-insensitive). | G3 | warn-only (⚠️) |

Blocklists in L12/L13 and the irregular-past list in L11 are **closed and vendored** in
`scripts/lib/lexicon.mjs`. They are extended only by editing that file in a committed
change — never ad hoc at runtime.

## 3 — Closed fixture / scenario format (B3)

Because the artifact is the model (not executable), the "scenario" is **a walk over the
artifact's own claims**. The harness builds, per run, an in-memory graph from the parsed
artifact and traverses it. No external scenario data is injected into a *target* artifact's
checks — the artifact supplies its own elements. The shipped fixtures (below) are
**whole canned artifacts** used only by `selftest.mjs` to prove the harness itself.

### 3.1 Derived scenario graph (built fresh per run — §6)

From the parsed artifact the harness derives:

- `events[]` — rows of the Domain Events table: `{event, actor, trigger, notes}`.
- `actors[]` — rows of the Actors table: `{actor, kind, responsibility}`.
- `hotspots[]` — rows of the Hotspots table: `{hotspot, question, blocks}`.
- `skeletons[]` — `### <Aggregate>` subsections: `{aggregate, steps[] (ordered events)}`.

Closed traversal set (every relationship the artifact claims becomes a walked edge):
1. **Event→Actor edge** — each non-empty `events[i].actor` is a reference into `actors[]`.
2. **Event→Trigger edge** — each `events[i].trigger` that names another event resolves
   into `events[]` (upstream-event triggers only; command/action triggers are free text).
3. **Skeleton-step→Event edge** — each `skeletons[k].steps[j]` resolves into `events[]`.
4. **Event→Skeleton membership** — each `events[i].event` should appear in ≥1 skeleton.
5. **Hotspot→Blocks edge** — each `hotspots[h].blocks` (unless `-`) resolves into
   `events[]` ∪ `{aggregate names}`.
6. **Skeleton uniqueness** — each event appears in ≤1 skeleton (cross-aggregate check).

Every edge class above is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Shipped illegal fixtures (`scripts/fixtures/`)

Each is a complete `01-event-storming.md`-shaped file with one deliberate defect, used by
`selftest.mjs` to prove a specific negative fires **for the stated reason** (a fixture that
fails for any other reason is itself `broken-test`). The expected `(status, failing-check)`
is recorded in `scripts/fixtures/manifest.json`.

| Fixture file | Injected defect | Must fail | Expected status |
|--------------|-----------------|-----------|-----------------|
| `valid.md` | none — a minimal correct artifact | nothing | `pass` |
| `missing-section.md` | drops `## Hotspots` heading | L1 | `malformed` |
| `bad-events-columns.md` | Domain Events table columns reordered to `Actor | Event | Trigger | Notes` | L3 | `malformed` |
| `bad-actor-kind.md` | an Actors row with `Kind: customer` (not in enum) | L7 | `fail` |
| `empty-events.md` | Domain Events table present, zero data rows | L8 | `fail` |
| `present-tense-event.md` | event `Place Order` (not past tense) | L11 | `fail` |
| `unknown-actor.md` | Domain Events references actor `Warehouse` absent from Actors table | N3 (resolution) | `fail` |
| `skeleton-ghost-event.md` | skeleton step `Order Archived` absent from Domain Events table | N4 (resolution) | `fail` |
| `dup-skeleton-event.md` | `Order Placed` listed under two `### <Aggregate>` subsections | X4 (owner; mechanizes catalog E5 — the N6 negative is proven through this exact-value check) | `fail` |
| `dangling-blocks.md` | Hotspots `Blocks` cell names event `Refund Issued` that does not exist | N5 (resolution) | `fail` |
| `duplicate-event.md` | two identical `Order Placed` rows in Domain Events | X2 (owner; mechanizes catalog B3 — the N7 negative is proven through this exact-value check) | `fail` |
| `wrong-reason-trap.md` | references actor `Warehouse` absent AND has a present-tense event — proves the unknown-actor negative reports the **actor** reason, not the tense reason | N3 isolates over L11 | `fail` (reason = N3) |
| `vacuous.md` | structurally valid headings/tables but the harness is fed `--no-checks` flag disabled path | n/a | `broken-test` (zero checks) |

`wrong-reason-trap.md` is the explicit doctrine §2 guard: it would "pass for the wrong
reason" under a sloppy negative. The selftest asserts the failing-check ID equals `N3`,
not merely that *some* check failed.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a
check means editing this section AND `scripts/lib/checks.mjs` in a committed change, and
the new check MUST cite a catalog rule. The harness emits each check's `id`, `class`,
`status`, and `rule` in its JSON summary (§7). Four classes, per B3:

### 4.1 Resolution checks (`R`/`N`-resolution — a referenced element exists in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| N3 | Every non-empty Domain-Events `Actor` resolves to an Actors-table row. | C3 |
| N4 | Every skeleton step resolves to a Domain-Events `Event` row. | E6 |
| N5 | Every Hotspots `Blocks` value (≠ `-`) resolves to an event OR an aggregate name. | D3 |
| N8 | Every Domain-Events `Event` appears in ≥1 skeleton (membership), else its `Notes` carries an explicit omission justification. | B5 |
| N9 | Every Trigger that names a known event resolves to a Domain-Events row (and is not the event's own name → no self-trigger). | F1 (direction, mechanical subset) |

### 4.2 Exact-value checks (`X` — exact counts/values against the derived fixture; no open-ended comparison)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| X1 | `parsed.eventCount` equals the number of Domain-Events data rows AND equals the count the harness reconciled edges against (intake reconciliation). | §5 |
| X2 | Distinct event-name count equals row count (no duplicates) — i.e. `unique(events) === events.length`. | B3 |
| X3 | Every skeleton's first step is distinct from its last step (a lifecycle has ≥2 ordered, non-identical bounds) — exact `steps.length ≥ 2 && first ≠ last`. | E3 (mechanical bound) |
| X4 | Each event appears in **exactly** `≤1` skeleton: `max(skeletonMembershipCount(event)) === 1`. | E5 |
| X5 | The executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.3 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

These are the named negatives proven by the shipped illegal fixtures. Each asserts both
that the defect is rejected AND that the failing-check ID matches the defect's owner rule
(wrong-reason ⇒ `broken-test`).

| ID | Illegal input rejected | For the reason | Fixture | Catalog rule |
|----|------------------------|----------------|---------|--------------|
| N3 | unknown actor reference | actor not in Actors table (not tense, not anything else) | `unknown-actor.md`, `wrong-reason-trap.md` | C3 |
| N4 | ghost skeleton event | event not in Domain Events table | `skeleton-ghost-event.md` | E6 |
| N5 | dangling Blocks ref | blocks target not in events/aggregates | `dangling-blocks.md` | D3 |
| N6 | event in two skeletons | event owned by >1 aggregate | `dup-skeleton-event.md` | E5 |
| N7 | duplicate event row | two rows denote one event by identical name | `duplicate-event.md` | B3 |
| N10 | non-enum actor Kind | `Kind` ∉ closed enum | `bad-actor-kind.md` | A4 |
| N11 | present-tense event | event fails past-tense heuristic | `present-tense-event.md` | B1 |
| N12 | malformed structure | required heading/table shape absent | `missing-section.md`, `bad-events-columns.md` | A1/A3 |

(Lint `L*` and negative `N*` IDs overlap by design where one rule has both a positive lint
pass and a negative fixture proof — they share the catalog rule, not the ID space: `L*`
runs over the target artifact, `N*` is proven over a shipped fixture in selftest.)

### 4.4 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ1`–`AJ7` enumerated in §6. They run last, only over checks that survived all mechanical
gates, and return enumerated verdicts only.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The artifact owns four element sets: `events`, `actors`, `hotspots`,
`lifecycle entries (skeleton steps)`. The intake count is:

```
intake = |events| + |actors| + |hotspots(excl. "None identified")| + Σ|skeleton.steps|
```

**Every element exercised ≥1 time.** The harness asserts:
- every `event` is touched by X1/X2 and by N8 (membership) and N4-domain (as a resolution
  target);
- every `actor` is touched by N3 (as a resolution target) and L7 (Kind enum);
- every `hotspot` is touched by N5 (Blocks resolution);
- every `skeleton step` is touched by N4 (resolution) and X3/X4 (bounds/uniqueness).

**Reconciliation formula (X5 — no silently dropped checks):**

```
executedChecks = lintRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (Σ per-element edges walked) === (expected edges from intake graph)
            && (executedChecks > 0)
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If the walked-edge count ≠
the intake-derived expected-edge count ⇒ a check was silently dropped ⇒ `broken-test`.

**Positive AND negative per claimed behavior.** Every behavior/constraint the artifact
claims is proven by **≥1 positive** (a passing check over `valid.md` / the target) **AND
≥1 negative** (a shipped illegal fixture that must fail). The mapping:

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Required structure present | A1/A3/A4/A5/A6 | L1–L6 over `valid.md` | `missing-section.md`, `bad-events-columns.md` |
| Actor Kind is enumerated | A4 | L7 over `valid.md` | `bad-actor-kind.md` |
| Required tables non-empty | A8 | L8 over `valid.md` | `empty-events.md` |
| Events are past-tense | B1/E2 | L11 over `valid.md` | `present-tense-event.md` |
| Actor references resolve | C3 | N3 over `valid.md` | `unknown-actor.md` (+`wrong-reason-trap.md`) |
| Skeleton events registered | E6 | N4 over `valid.md` | `skeleton-ghost-event.md` |
| Single aggregate ownership | E5 | X4/N6 over `valid.md` | `dup-skeleton-event.md` |
| No duplicate events | B3 | X2 over `valid.md` | `duplicate-event.md` |
| Blocks references resolve | D3 | N5 over `valid.md` | `dangling-blocks.md` |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a
negative entry above — the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; reason + closed verdict schema)

These catalog rules are **inherently semantic** — they require domain understanding the
mechanical layer cannot supply. Each runs only after mechanical gates pass, and returns an
**enumerated verdict** (never prose). The harness records `{id, verdict, ruleId}`; any
verdict other than the rule's pass-verdict is reported as a finding at the catalog
severity (⚠️/ℹ️ do not block; there are no ❌ agent-judged checks — all ❌ rules are
mechanizable).

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ1 | B2 | "domain-relevant fact vs UI/CRUD mechanic" needs domain semantics; a blocklist cannot enumerate all technical mechanics. Confirms L11 past-tense borderline cases too. | `{ domain-fact \| technical-mechanic \| ambiguous }` |
| AJ2 | B7 | "atomic fact vs multi-step process" — distinguishing "Order Processing" from a real event needs world knowledge. | `{ atomic-fact \| process-or-state \| ambiguous }` |
| AJ3 | C1 / C4 | whether a Responsibility ties to a real decision, and whether an actor name is a concrete role vs vague placeholder, is a meaning judgment. | `{ concrete-and-tied \| vague-or-untied \| ambiguous }` |
| AJ4 | D1 / D2 | whether a Hotspot is a genuine open question (vs a resolved fact mis-filed) is semantic. | `{ open-question \| resolved-or-misfiled \| ambiguous }` |
| AJ5 | E3 / E4 | whether the named aggregate coheres with the events whose state it changes (beyond the mechanical ≥2-bound X3) needs domain meaning. | `{ coherent \| incoherent \| ambiguous }` |
| AJ6 | F2 / F4 | whether a cross-aggregate reaction needs a named policy, and whether an absolute policy hides an exception, is a semantic stress-test. | `{ policy-sound \| missing-or-absolute-policy \| ambiguous }` |
| AJ7 | G2 / G5 | synonym detection ("Order Placed" vs "Order Submitted" = one fact?) requires meaning, not string equality (which N7/X2 already cover for identical strings). | `{ consistent \| unresolved-synonym \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); it is reported as an ℹ️ finding,
never silently dropped, and never counts as a pass for reconciliation purposes (it counts
as executed, verdict-recorded). No agent-judged check may emit free prose in an asserted
position.

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary):

```json
{
  "skill": "event-storming",
  "artifact": "specs/01-event-storming.md",
  "status": "pass | fail | malformed | broken-test",
  "counts": {
    "intake": { "events": 0, "actors": 0, "hotspots": 0, "skeletonSteps": 0 },
    "checks": { "lint": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "checks": [
    { "id": "L1", "class": "lint", "rule": "A1", "status": "pass" },
    { "id": "N3", "class": "resolution", "rule": "C3", "status": "pass" },
    { "id": "AJ1", "class": "agent-judged", "rule": "B2", "verdict": "domain-fact" }
  ],
  "findings": [
    { "id": "L12", "rule": "G1", "severity": "warn", "detail": "vague token 'process' in event 'Order Processing'" }
  ]
}
```

- **stderr** — human-readable diagnostics only (parse errors, per-check failure traces,
  the wrong-reason trap explanation). Never the machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. Non-zero for `fail`, `malformed`,
  `broken-test`. `broken-test` and `malformed` use distinct non-zero codes (`3` and `2`
  respectively; `fail` = `1`) so CI can distinguish a wrong artifact from a broken harness.
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`.

## 8 — Determinism (doctrine §6)

- The harness reads only the target artifact (and, in selftest, the shipped fixtures). It
  injects **no clock value, no randomness, no engine-generated value** into any asserted
  position. The `## Upstream Fingerprint` hash/date is *read from the artifact* and only
  string-checked for presence/shape (L2) — never generated by the harness.
- State is **built fresh per run** from the parse; nothing is persisted between runs. A
  re-run over byte-identical input is **byte-identical output** (the JSON summary is
  emitted with stable key order and sorted `checks[]`/`findings[]` by `id`).
- Fixtures in `scripts/fixtures/` are static committed files with a static
  `manifest.json` of expected `(status, failing-check)` pairs. `selftest.mjs` is therefore
  reproducible and order-independent.
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the
  reconciliation arithmetic (§5) and their verdicts are recorded, not invented into
  counts — so the **pass/fail mechanical verdict remains byte-deterministic** regardless
  of agent output.
