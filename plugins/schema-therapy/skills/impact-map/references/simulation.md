# Impact Map — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `impact-map` skill (artifact
`specs/00-impact-map.md`). It defines the **sole executable pass/fail authority** that
ships with the skill: a markdown linter + a mechanical resolution / exact-value /
reason-qualified-negative checker over a closed fixture format, plus a minimal set of
agent-judged checks. It satisfies the verification doctrine §2 (oracle), §6
(determinism), and build steps B2 (lint design) and B3 (simulation design).

It is **paired with** `references/validation-rules.md` (the closed rule catalog). Every
check below cites the catalog rule ID(s) it mechanizes. **The catalog is the review
vocabulary; this file is the executable harness over it.** No check here exists without a
catalog rule behind it.

## 0 — Oracle summary (doctrine §2)

- **No engine, no executable corpus.** Impact Mapping is a facilitation and diagramming
  formalism (a collaboratively-grown mind map); `sources/SOURCES.md` §"Executable
  materials — verify-none" confirms it has **no schema, grammar, linter, CLI, or
  reference implementation** — none exists or is expected. The artifact is itself the
  model (not executable). The **strongest available oracle is therefore mechanical**:
  parse the artifact's own markdown, lint its structure against the A-theme format spec,
  and run resolution / exact-value / reason-qualified-negative checks over the artifact's
  own claims. The four-level hierarchy (goal → actors → impacts → deliverables) is a tree
  to traverse: each impact's `Business Actor` cell and each deliverable's `Impact` cell is
  a cross-table link to resolve by **exact string** (F1/F2/F5).
- **Agent judgment** is admitted ONLY for the handful of inherently semantic catalog
  rules (§6 below), each listed with the reason it cannot be mechanical and a **closed
  verdict schema** (enumerated verdicts, never prose). There are **no ❌ agent-judged
  checks** — every ❌ rule in the catalog is mechanizable.
- **Status taxonomy:** `pass | fail | malformed | broken-test`.
  - `pass` — artifact parsed; every executed check passed; checks counter reconciled
    (§5); ≥1 check executed.
  - `fail` — artifact parsed; ≥1 ❌-class check failed.
  - `malformed` — artifact unparseable against the pinned A-theme format (a required
    level-2 heading absent or out of pinned order, a required table absent or with the
    wrong column shape, or the fingerprint block shape unrecoverable) such that downstream
    checks cannot be anchored. Distinct from a populated-but-wrong artifact, which is
    `fail`.
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
| Entry points | `scripts/harness.mjs` (the oracle; run against a target artifact), `scripts/selftest.mjs` (runs the harness over every shipped fixture and asserts the expected status + owner check). |
| Markdown parser | **Hand-rolled line/table parser**, dependency-free, vendored in `scripts/lib/md.mjs`. |
| Parser version pin | Internal module; pinned by the repo commit. No external version to track. |
| External deps | **None.** Self-contained; `selftest.mjs` requires no `npm install`. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Lexicon | Closed blocklists vendored in `scripts/lib/lexicon.mjs` (D1 software-noun list, G1 vague-term list, G4 tech-leak list). |

**Harness invocation (pinned):** `node scripts/harness.mjs <00-artifact>` — a **single
artifact argument**. The free-text product-intent file is **NOT passed**: the
`## Upstream Fingerprint` block is **shape-checked only** (A2/A8 — presence + comment-block
shape + 64-hex digest form), mirroring the sibling's domain-file handling. Recomputing the
SHA-256 to confirm the digest matches the actual intent file is the **drift police's** job
under a separate `--intent` path, not this harness's.

**Rationale for hand-rolled over `marked`/`remark`:** the A-theme pins the *exact* shapes
the harness must verify — five fixed level-2 headings in a fixed order (A1:
`## Upstream Fingerprint` → `## Goal` → `## Business Actors` → `## Impacts` →
`## Deliverables`), three tables with fixed column orders (A3 `Actor | Description`, A4
`Impact | Business Actor (exact string)`, A5 `Deliverable | Impact (exact string)`), a
single-statement Goal body (A6), and a fingerprint comment block of fixed shape (A2). A
general CommonMark AST is more surface than these fixed shapes need, and pinning a parser
version + lockfile adds a moving dependency to a skill whose whole point is byte-
deterministic re-runs (§6). A ~150-line tolerant table/heading/paragraph reader covers
every pinned shape, keeps the skill dependency-free and copy-portable (no cross-plugin
references — doctrine "reuse over invention: copied, never referenced"), and makes the
`malformed` boundary explicit: the parser yields a typed parse error exactly when an
A-rule shape is violated, which is precisely the `malformed` trigger.

**Reuse note:** no proven harness exists for this formalism (verify-none, confirmed in
SOURCES.md). Nothing external to adapt in. The `md.mjs` reader and the `checks.mjs` grammar
are **copied** (never referenced) from the sibling `event-storming` harness and re-pinned
to the A-theme shapes above — reuse over invention, with no cross-skill import.

## 2 — Lint checks (structural; mechanize the A-theme + mechanical D/E/G rules)

Lint checks run first. Lint IDs are `L*`. A failing ❌ lint that prevents anchoring the
artifact yields `malformed`; a failing ❌ lint over a parseable artifact yields `fail`.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| L1 | All five exact level-2 headings present **and in the pinned order**: `## Upstream Fingerprint`, `## Goal`, `## Business Actors`, `## Impacts`, `## Deliverables`. | A1 | `malformed` |
| L2 | `## Upstream Fingerprint` body is a comment block of the exact shape: a `<!-- fingerprints:` line, ≥1 `<intent-filename>@sha256:<hex>` line, a closing `-->` line. | A2 | `malformed` |
| L3 | `## Business Actors` contains a table with columns exactly `Actor | Description` in order. | A3 | `malformed` |
| L4 | `## Impacts` contains a table with columns exactly `Impact | Business Actor (exact string)` in order. | A4 | `malformed` |
| L5 | `## Deliverables` contains a table with columns exactly `Deliverable | Impact (exact string)` in order. | A5 | `malformed` |
| L6 | `## Goal` body is exactly one statement (a single sentence or single paragraph): no list, no blank-line-separated second paragraph, no second goal. | A6 | `malformed` |
| L7 | Each fingerprint line's hash is exactly `[0-9a-f]{64}` after `@sha256:` — a placeholder (`<...>`, `xxxx`, fewer/more than 64 chars, or uppercase hex) fails. | A8 | `fail` |
| L8 | Business Actors, Impacts, **and** Deliverables tables each have ≥1 data row (no empty required table). | A7 | `fail` |
| L9 | No `Impact` cell contains a software/solution noun from the closed D1 blocklist (`app, application, system, platform, feature, button, screen, page, dashboard, API, endpoint, integration, module, notification, email, report, form, database, portal, widget, function, service`), whole-word, case-insensitive. | D1 | `fail` (❌) |
| L10 | No goal/actor/impact/deliverable name contains a vague-filler token from the closed G1 blocklist (`manage, handle, process, support, stuff, various, etc., things, data, solution, leverage, optimize, streamline, seamless, robust`), whole-word, case-insensitive. (`support`/`process`/`handle`/`manage` flagged only as the whole verb, per G1.) | G1 | warn-only (⚠️) |
| L11 | The goal statement contains ≥1 measurement token: a number/percentage/currency figure OR a quantified-threshold pattern (`\d`, `%`, currency sign, or a number-word from the closed list). Non-matches flagged for AJ2 confirmation. | B1 | `fail` (❌) |
| L12 | No `Business Actor` name or goal statement contains a tech-leak token from the closed G4 blocklist (`API, DB, endpoint, HTTP, table, class, SQL, JSON, UUID, service`), whole-word, case-insensitive. | G4 | warn-only (⚠️) |
| L13 | No string appears as both an `Impact` name and a `Deliverable` name (impacts/deliverables not conflated across sections). | G5 | warn-only (⚠️) |

Blocklists in L9/L10/L12 and the measurement-token list in L11 are **closed and vendored**
in `scripts/lib/lexicon.mjs`. They are extended only by editing that file in a committed
change — never ad hoc at runtime.

## 3 — Closed fixture / scenario format (B3)

Because the artifact is the model (not executable), the "scenario" is **a walk over the
artifact's own claims**. The harness builds, per run, an in-memory tree from the parsed
artifact and traverses it. No external scenario data is injected into a *target* artifact's
checks — the artifact supplies its own elements. The shipped fixtures (below) are **whole
canned artifacts** used only by `selftest.mjs` to prove the harness itself.

### 3.1 Derived scenario graph (built fresh per run — §6)

From the parsed artifact the harness derives:

- `goal` — the single Goal statement string.
- `actors[]` — rows of the Business Actors table: `{actor, description}`.
- `impacts[]` — rows of the Impacts table: `{impact, actor}` (actor = the `Business Actor` cell).
- `deliverables[]` — rows of the Deliverables table: `{deliverable, impact}` (impact = the `Impact` cell).

Closed traversal set (every relationship the artifact claims becomes a walked edge):
1. **Impact→Actor edge** — each `impacts[i].actor` is an exact-string reference into `actors[]` (F1).
2. **Deliverable→Impact edge** — each `deliverables[j].impact` is an exact-string reference into `impacts[]` (F2).
3. **Deliverable→Goal chain** — each deliverable resolves transitively deliverable → impact → actor → goal (F5).
4. **G3 stability pair** — for every reference (impact's actor cell, deliverable's impact cell) that matches an owner row *case/whitespace-insensitively*, assert it matches **byte-identically** to the owning-table spelling (G3). Each such pair is a walked edge.

Every edge class above is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Shipped illegal fixtures (`scripts/fixtures/`)

Each is a complete `00-impact-map.md`-shaped file with one deliberate defect (except the
wrong-reason trap, which carries two), used by `selftest.mjs` to prove a specific negative
fires **for the stated reason** (a fixture that fails for any other reason is itself
`broken-test`). The expected `(status, failing-check, args)` is recorded in
`scripts/fixtures/manifest.json`.

| Fixture file | Injected defect | Must fail | Expected status |
|--------------|-----------------|-----------|-----------------|
| `valid.md` | none — a minimal correct artifact | nothing | `pass` |
| `missing-section.md` | drops `## Impacts` heading | L1 | `malformed` |
| `out-of-order-sections.md` | `## Impacts` placed before `## Business Actors` | L1 (order) | `malformed` |
| `bad-actors-columns.md` | Business Actors columns reordered to `Description | Actor` | L3 | `malformed` |
| `bad-impacts-columns.md` | Impacts columns are `Business Actor | Impact` (swapped) | L4 | `malformed` |
| `multi-goal.md` | `## Goal` body is a 2-item bullet list (two goals) | L6 | `malformed` |
| `malformed-fingerprint-block.md` | `## Upstream Fingerprint` body is free prose, not the `<!-- fingerprints: … -->` comment-block shape | L2 (A2) | `malformed` |
| `placeholder-fingerprint.md` | comment-block shape intact, but the hash is `<sha256-here>` (not 64 hex) | L7 (A8) | `fail` |
| `empty-deliverables.md` | Deliverables table present, zero data rows | L8 | `fail` |
| `feature-impact.md` | an `Impact` cell reads `Push notification feature` (blocklisted noun) | L9 (D1) | `fail` |
| `unmeasurable-goal.md` | goal `Grow the business` — no metric | L11 (B1) | `fail` |
| `unknown-actor.md` | an Impact's `Business Actor` cell names `Advertisers` absent from Business Actors table | N1 (resolution, F1) | `fail` |
| `dangling-deliverable.md` | a Deliverable's `Impact` cell names an impact absent from Impacts table | N2 (resolution, F2) | `fail` |
| `case-drift-actor.md` | Impact references `players` where Actors table has `Players` (case drift) | N3 (G3 stability) | `fail` |
| `dup-actor.md` | two identical `Players` rows in Business Actors | X2 (owner; mechanizes G2 — the N4 negative is proven through this exact-value check) | `fail` |
| `dup-impact.md` | two identical impact rows in Impacts | X3 (owner; mechanizes G2 — N4 over the Impacts table) | `fail` |
| `broken-chain.md` | a deliverable points at an impact whose actor cell is unknown (chain breaks at impact→actor) | N5 (F5 transitive) | `fail` |
| `wrong-reason-trap.md` | references an unknown actor AND carries an unmeasurable goal — proves the unknown-actor negative reports the **F1/N1** reason, not the **B1/L11** reason | N1 isolates over L11 | `fail` (reason = N1) |
| `vacuous.md` | structurally valid headings/tables but the harness is fed the `--no-checks` disabled path | n/a | `broken-test` (zero checks) |

`wrong-reason-trap.md` is the explicit doctrine §2 guard: it has **two co-present defects**
(unknown actor reference + unmeasurable goal), the owner is pinned to **N1**, and the
selftest asserts the failing-check ID equals `N1` (not merely that *some* check failed) —
proving reason isolation.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a
check means editing this section AND `scripts/lib/checks.mjs` in a committed change, and
the new check MUST cite a catalog rule. The harness emits each check's `id`, `class`,
`status`, and `rule` in its JSON summary (§7). Four classes, per B3.

### 4.1 Resolution checks (`N`-resolution — a referenced element exists in its owner, by exact string)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| N1 | Every Impacts-table `Business Actor` cell resolves (exact string) to a Business Actors row. | F1 |
| N2 | Every Deliverables-table `Impact` cell resolves (exact string) to an Impacts row. | F2 |
| N3 | Every reference that matches an owner row case/whitespace-insensitively matches it **byte-identically** (no leading/trailing/internal whitespace or case drift). | G3 |
| N5 | Every deliverable resolves the full chain deliverable → impact → actor → goal (no broken link in its ancestry). | F5 |

### 4.2 Exact-value checks (`X` — exact counts/values against the derived graph; no open-ended comparison)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| X1 | `parsed.actorCount`/`impactCount`/`deliverableCount` each equal their table's data-row count AND equal the counts the harness reconciled edges against (intake reconciliation). | §5 |
| X2 | Distinct actor-name count equals Business Actors row count: `unique(actors) === actors.length`. | G2 |
| X3 | Distinct impact-name count equals Impacts row count; distinct deliverable-name count equals Deliverables row count. | G2 |
| X4 | Exactly one Goal statement exists (`goal` is a single non-empty string; the parser yielded one paragraph, not a list). | A6 |
| X5 | The executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.3 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

These are the named negatives proven by the shipped illegal fixtures. Each asserts both
that the defect is rejected AND that the failing-check ID matches the defect's owner rule
(wrong-reason ⇒ `broken-test`).

| ID | Illegal input rejected | For the reason | Fixture | Catalog rule |
|----|------------------------|----------------|---------|--------------|
| N1 | unknown actor reference | actor not in Business Actors table (not the goal, not anything else) | `unknown-actor.md`, `wrong-reason-trap.md` | F1 |
| N2 | dangling deliverable | impact target not in Impacts table | `dangling-deliverable.md` | F2 |
| N3 | case/whitespace drift | reference not byte-identical to owner spelling | `case-drift-actor.md` | G3 |
| N4 | duplicate name in a table | two rows denote one identifier (proven via X2/X3) | `dup-actor.md`, `dup-impact.md` | G2 |
| N5 | broken transitive chain | a deliverable's ancestry does not reach the goal | `broken-chain.md` | F5 |
| N6 | feature-shaped impact | `Impact` cell carries a D1-blocklisted software noun | `feature-impact.md` | D1 |
| N7 | unmeasurable goal | goal carries no measurement token | `unmeasurable-goal.md` | B1 |
| N8 | placeholder/malformed fingerprint | hash ≠ 64 lowercase hex | `placeholder-fingerprint.md` | A8 |
| N9 | malformed structure | required heading/order/table/fingerprint-block shape absent | `missing-section.md`, `out-of-order-sections.md`, `bad-actors-columns.md`, `bad-impacts-columns.md`, `multi-goal.md`, `malformed-fingerprint-block.md` | A1/A2/A3/A4/A6 |

(Lint `L*` and negative `N*` IDs overlap by design where one rule has both a positive lint
pass and a negative fixture proof — they share the catalog rule, not the ID space: `L*`
runs over the target artifact, `N*` is proven over a shipped fixture in selftest.)

### 4.4 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ1`–`AJ5` enumerated in §6. They run last, only over checks that survived all mechanical
gates, and return enumerated verdicts only.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The artifact owns four element sets: `goal` (1), `actors`,
`impacts`, `deliverables`. The intake count is:

```
intake = |actors| + |impacts| + |deliverables| + 1   (the single goal)
```

**Edge count (resolution + stability edges):**

```
edgesExpected = |impacts|            (each impact → its actor, F1)
              + |deliverables|       (each deliverable → its impact, F2)
              + |deliverables|       (each deliverable's transitive chain, F5)
              + (# references that case/whitespace-match an owner row, G3 stability pairs)
```

**Every element exercised ≥1 time.** The harness asserts:
- the `goal` is touched by X4 (single-statement), L11 (measurable), and as the F5 chain root;
- every `actor` is touched by N1 (as a resolution target), X2 (uniqueness), and L12 (tech-leak);
- every `impact` is touched by N1 (actor link), N2 (as a resolution target), X3 (uniqueness), L9 (D1 noun), and L13 (no impact/deliverable conflation);
- every `deliverable` is touched by N2 (impact link), N5 (chain), and X3 (uniqueness).

**Reconciliation formula (X5 — no silently dropped checks):**

```
executedChecks = lintRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected) && (executedChecks > 0)
PASS requires reconciled === true && status === "pass"
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked !==
edgesExpected` ⇒ a check was silently dropped ⇒ `broken-test`.

**Positive AND negative per claimed behavior.** Every behavior/constraint the artifact
claims is proven by **≥1 positive** (a passing check over `valid.md` / the target) **AND
≥1 negative** (a shipped illegal fixture that must fail). `selftest.mjs` FAILS if any
catalog-mechanizable behavior lacks both a positive and a negative entry below — the
coverage floor is itself asserted.

### 5.1 ❌-rule reconciliation table (the completeness claim, proven)

Every ❌ rule in the catalog maps to exactly one owner check and ≥1 dedicated negative
fixture. This table is the closed completeness proof — `selftest.mjs` asserts every ❌
catalog rule appears here with a non-empty owner + fixture.

| ❌ Catalog rule | Owner check | Negative fixture | Positive (over `valid.md`) |
|-----------------|-------------|------------------|----------------------------|
| A1 (sections present + order) | L1 | `missing-section.md`, `out-of-order-sections.md` | L1 |
| A2 (fingerprint block shape) | L2 | `malformed-fingerprint-block.md` | L2 |
| A3 (Actors table shape) | L3 | `bad-actors-columns.md` | L3 |
| A4 (Impacts table shape) | L4 | `bad-impacts-columns.md` | L4 |
| A5 (Deliverables table shape) | L5 | (covered by parser malform; shares N9) | L5 |
| A6 (single goal statement) | L6 / X4 | `multi-goal.md` | L6, X4 |
| A7 (no empty required tables) | L8 | `empty-deliverables.md` | L8 |
| A8 (fingerprint hash 64-hex) | L7 | `placeholder-fingerprint.md` | L7 |
| B1 (goal measurable) | L11 | `unmeasurable-goal.md` | L11 |
| B2 (goal answers Why, not What) | L9 over goal + AJ2 | `feature-impact.md` (D1 share) / AJ residue | L9, AJ2 |
| D1 (impact not a feature, mechanical) | L9 | `feature-impact.md` | L9 |
| E1 (deliverable supports existing impact) | N2 | `dangling-deliverable.md` | N2 |
| F1 (impact names existing actor) | N1 | `unknown-actor.md` | N1 |
| F2 (deliverable names existing impact) | N2 | `dangling-deliverable.md` | N2 |
| F5 (deliverable transitively serves goal) | N5 | `broken-chain.md` | N5 |
| G2 (names unique within table) | X2 / X3 | `dup-actor.md`, `dup-impact.md` | X2, X3 |
| G3 (exact-string stability) | N3 | `case-drift-actor.md` | N3 |

(B2's mechanical subset is "goal names a deliverable/feature" — covered by the D1 software-
noun scan over the goal string via L9's lexicon; the residual "names a solution without a
blocklisted noun" is the agent-judged AJ2 ⚠️ residue. No ❌ rule is left to agent judgment.)

## 6 — Agent-judged checks (minimal; reason + closed verdict schema)

These catalog rules are **inherently semantic** — they require domain understanding the
mechanical layer cannot supply. Each runs only after mechanical gates pass, and returns an
**enumerated verdict** (never prose). The harness records `{id, verdict, ruleId}`; any
verdict other than the rule's pass-verdict is reported as a finding at the catalog severity
(⚠️/ℹ️ do not block; there are **no ❌ agent-judged checks**). These cover only the ⚠️/ℹ️
semantic residue called out in the catalog: D2, B-theme goal quality beyond L11's
measurement-presence check, C-theme actor-kind guidance, and E-theme options-not-commitments.

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ1 | D2 | residual feature-phrasing not caught by the D1 blocklist ("a thing built / task done" without a blocklisted noun) needs domain semantics; a blocklist cannot enumerate all feature phrasings. | `{ behaviour-change \| feature-or-task \| ambiguous }` |
| AJ2 | B2 / B3 | whether the goal is a genuine business outcome vs a disguised solution / a mere restatement of the deliverables is a meaning judgment beyond L9's noun scan and L11's metric scan. | `{ outcome \| solution-or-deliverable-restatement \| ambiguous }` |
| AJ3 | C1 / C3 | whether an actor is a concrete business kind vs a vague placeholder ("user", "stakeholders"), and whether the actor set spans influence roles (produce / obstruct / consume), is semantic. | `{ concrete-and-spanning \| vague-or-single-kind \| ambiguous }` |
| AJ4 | D3 / D4 | whether an impact is set in the perspective of exactly one actor and plausibly helps/obstructs the goal needs world knowledge. | `{ single-actor-and-goal-linked \| multi-actor-or-unlinked \| ambiguous }` |
| AJ5 | E2 / E3 | whether a deliverable reads as an option (not a fixed commitment) and stays high-level (not a fine-grained task) is a semantic stress-test. | `{ option-and-high-level \| commitment-or-too-detailed \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); it is reported as an ℹ️ finding,
never silently dropped, and never counts as a pass for reconciliation purposes (it counts
as executed, verdict-recorded). No agent-judged check may emit free prose in an asserted
position.

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary):

```json
{
  "skill": "impact-map",
  "artifact": "specs/00-impact-map.md",
  "status": "pass | fail | malformed | broken-test",
  "counts": {
    "intake": { "goal": 1, "actors": 0, "impacts": 0, "deliverables": 0 },
    "checks": { "lint": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "checks": [
    { "id": "L1", "class": "lint", "rule": "A1", "status": "pass" },
    { "id": "N1", "class": "resolution", "rule": "F1", "status": "pass" },
    { "id": "AJ1", "class": "agent-judged", "rule": "D2", "verdict": "behaviour-change" }
  ],
  "findings": [
    { "id": "L10", "rule": "G1", "severity": "warn", "detail": "vague token 'streamline' in deliverable 'Streamline checkout'" }
  ]
}
```

- **stderr** — human-readable diagnostics only (parse errors, per-check failure traces,
  the wrong-reason trap explanation). Never the machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. Non-zero for `fail`, `malformed`,
  `broken-test`. `broken-test` and `malformed` use distinct non-zero codes (`3` and `2`
  respectively; `fail` = `1`) so CI can distinguish a wrong artifact from a broken harness.
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`.
- **stdout key order is stable** and `checks[]`/`findings[]` are sorted by `id`.

## 8 — Determinism (doctrine §6)

- The harness reads only the target artifact (and, in selftest, the shipped fixtures). It
  injects **no clock value, no randomness, no engine-generated value** into any asserted
  position. The `## Upstream Fingerprint` hash is *read from the artifact* and only
  string-checked for presence/shape/64-hex form (L2/L7) — **never recomputed** by this
  harness (recomputation is the drift police's `--intent` path, §1).
- State is **built fresh per run** from the parse; nothing is persisted between runs. A
  re-run over byte-identical input is **byte-identical output** (stable key order, sorted
  `checks[]`/`findings[]`).
- Fixtures in `scripts/fixtures/` are static committed files with a static `manifest.json`
  of expected `(status, failing-check, args)` triples. `selftest.mjs` is therefore
  reproducible and order-independent.
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the
  reconciliation arithmetic (§5) and their verdicts are recorded, not invented into counts
  — so the **pass/fail mechanical verdict remains byte-deterministic** regardless of agent
  output.

## 9 — No upstream-defect class (free-text input)

Unlike a mid-pipeline artifact, `00-impact-map.md` has **no upstream artifact** — its input
is a **free-text product-intent file**, not a prior spec artifact with its own checkable
shape. Mirroring the sibling's note on its domain file: **there is NO upstream-defect check
class here.** The harness does not parse, validate, or reason about the intent file at all;
it only shape-checks the fingerprint block that records the intent file's digest (A2/A8 via
L2/L7). Drift detection — confirming the recorded digest still matches the actual intent
file — is the **drift police's** job under `--intent`, deliberately out of this harness's
scope (§1).

**Where the boundary sits.** An intent that **contradicts itself** (asks for two
incompatible outcomes, names an impossible metric, etc.) is **not** a harness finding —
the harness has no access to the intent and no oracle for intent-internal consistency. Such
contradictions are surfaced **at draft time as clarifying questions** by the skill while
authoring the artifact, before any harness runs. The harness's sole authority is the
**self-consistency of the produced artifact** (sections, tables, hierarchy resolution,
naming, lexicon) — never the truth or coherence of the free-text intent behind it.
