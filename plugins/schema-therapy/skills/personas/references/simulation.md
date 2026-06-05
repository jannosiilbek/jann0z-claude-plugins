# Personas — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `personas` skill (artifact
`specs/07-personas.md`). It defines the **sole executable pass/fail authority** that ships
with the skill: a markdown linter + a mechanical resolution / exact-value /
reason-qualified-negative checker over a closed scenario format, plus a minimal set of
agent-judged checks. It satisfies the verification doctrine §2 (closed assertion grammar,
machine-readable summary, status taxonomy, no vacuous green, agent judgment only where the
contract marks it), §6 (determinism), and build steps B2 (lint design) and B3 (simulation
design).

It is **paired with** `references/validation-rules.md` (the closed rule catalog, A1–F5 —
36 rules, themes A–F). Every check below cites the catalog rule ID(s) it mechanizes. **The
catalog is the review vocabulary; this file is the executable harness over it.** No check
here exists without a catalog rule behind it.

Like `03-aggregates.md`, the personas artifact is a **two-upstream** artifact: it is
validated against BOTH `00-impact-map.md` (owns the goal, business actors, impacts,
deliverables) AND `01-event-storming.md` (owns domain events + system actors) it was
derived from. The harness therefore takes three file arguments and resolves every 07→00 and
07→01 reference by exact string:

```
node scripts/harness.mjs <07-artifact> --upstream-00 <00-artifact> --upstream-01 <01-artifact>
```

The two upstream parses use the **pinned 00/01 formats** (copied, never imported — see §1):

- **00** (impact-map): `## Goal` (prose); `## Business Actors` table `Actor | Description`;
  `## Impacts` table `Impact | Business Actor (exact string)`; `## Deliverables` table
  `Deliverable | Impact (exact string)`. **00 is authority for the goal, business-actor
  names, impacts, and deliverables.**
- **01** (event-storming): `## Domain Events` table `Event | Actor | Trigger | Notes |
  Deliverable (exact 00 string)`; `## Actors` table `Actor | Kind | Responsibility`;
  `## Hotspots` table `Hotspot | Question | Blocks`; `## Lifecycle Skeletons` with
  `### <AggregateName>` numbered event lists. **01 is authority for event/actor names +
  skeletons.**

07 references both and never renames either (catalog F-theme). 07 consumes 00's
**business actors + impacts** and 01's **domain events** only; it does not consume 00's
deliverables or 01's actors/hotspots/skeletons as resolution targets (those drive other
artifacts), though the skeletons are read for the advisory D6 causal sanity check.

## Index

Open the section the verdict points at; an agent debugging a `malformed`/`broken-test`/`upstream-defect` result can locate the right section from this table alone.

| § | Title | What you find |
|---|-------|---------------|
| §0 | Oracle summary | status taxonomy + `upstream-defect` case + unparseable-00/01 ⇒ `broken-test` |
| §1 | Tooling record | runtime, entry points (`--upstream-00/-01`), parser/reuse rationale |
| §2 | Lint checks | structural `L*` checks over 07 + `malformed` vs `fail` |
| §3 | Closed fixture / scenario format | derived graph, shipped fixture triples (`broken-test` causes) |
| §4 | Closed assertion grammar | resolution / exact-value / negative / agent-judged check vocabulary |
| §5 | Coverage floor & reconciliation | intake/edge counts, reconciliation, positive+negative mapping |
| §6 | Agent-judged checks | semantic `AJ*` checks + closed verdict schemas |
| §7 | Output contract | stdout JSON shape, exit codes, `upstream-defect` routing |
| §8 | Determinism | no clock/randomness; byte-identical re-runs |
| §9 | Upstream-defect routing | how a 00 defect is reported vs unparseable-upstream `broken-test` |

## 0 — Oracle summary (doctrine §2)

- **No engine, no executable corpus.** A persona model is a goal-directed-design document,
  not a runnable program. `sources/SOURCES.md` → "Executable sources: none. Verified — this
  domain (personas / goal-directed design) has no executable spec or runnable artifact." The
  artifact is itself the model. The **strongest available oracle is therefore mechanical**:
  parse 07's own markdown and the two pinned upstreams, lint 07's structure against the
  A-theme format spec, and run resolution / exact-value / reason-qualified-negative checks
  over the cross-document references — every `### <PersonaName>` block is a node; every
  `**Business actor:**` line is a link into 00's Business Actors; every goal's
  `[impact: …]` token is a link into 00's Impacts; every job `Outcome` cell is a link into
  01's Domain Events; every coverage gate (E1) is a reverse-resolution from 00 into 07.
- **Agent judgment** is admitted ONLY for the handful of inherently semantic catalog rules
  (§6), each listed with the reason it cannot be mechanical and a **closed verdict schema**
  (enumerated verdicts, never prose). **All ❌-severity catalog rules are mechanizable; no ❌
  rule is left to agent judgment.** Where a rule has a mechanical subset and a semantic
  residue (B1/B2, B3, C3, D4), the ❌ subset is mechanized and only the residue is
  agent-judged at the residue's own (non-blocking) severity.
- **Status taxonomy:** `pass | fail | malformed | broken-test`.
  - `pass` — all three artifacts parsed; every executed check passed; checks counter
    reconciled (§5); ≥1 check executed.
  - `fail` — all three artifacts parsed; ≥1 ❌-class check failed. **Includes the
    `upstream-defect` case** (a 00-origin defect surfaced through 07's resolution checks —
    §9): the status stays `fail` (the taxonomy is closed), but the finding carries the
    distinguished `upstream-defect` class plus the offending upstream filename, for routing.
  - `malformed` — the **07 artifact** is unparseable against the pinned A-theme format (the
    `## Upstream Fingerprints` or `## Personas` H2 absent or out of order, a
    `### <PersonaName>` block missing one of its three pinned fields, the goals list or jobs
    table absent or with the wrong column shape) such that downstream checks cannot be
    anchored. Distinct from a populated-but-wrong artifact, which is `fail`.
  - `broken-test` — a check could not evaluate (threw, indeterminate input), OR a
    reason-qualified negative passed for the wrong reason (the rejection fired but not on the
    asserted rule), OR the checks counter failed to reconcile (a silently dropped check), OR
    zero checks parsed (no vacuous green), OR **either upstream (00 or 01) is unparseable**
    against its pinned format (the harness cannot resolve references against a shapeless
    upstream — this is a broken *test fixture*, not a 07 defect; see §9 for the distinction
    from `upstream-defect`).
- **No vacuous green:** zero parsed/executed checks ⇒ exit failure with status
  `broken-test`. A typo'd negative check (a defect that should fail but the check never
  fired, or fired on the wrong rule) ⇒ `broken-test`, never `pass`.

## 1 — Tooling record (B2)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `event-storming` / `glossary` / `aggregates` harnesses (suite uniformity). |
| Entry points | `scripts/harness.mjs` (the oracle; `<07-artifact> --upstream-00 <00-artifact> --upstream-01 <01-artifact>`), `scripts/selftest.mjs` (runs the harness over every shipped fixture triple and asserts the expected status + failing-check + upstream-route). |
| Markdown parser | **Hand-rolled line/table/heading/labelled-line/list parser**, dependency-free, vendored in `scripts/lib/md.mjs` — shared shape-reader for the 07 artifact and both pinned upstreams (00 + 01). |
| Parser version pin | Internal module; pinned by the repo commit. No external version to track. |
| External deps | **None.** Self-contained; `selftest.mjs` requires no `npm install`. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Closed lexicons | `scripts/lib/lexicon.mjs` — the closed **software-noun blocklist** (B1: `{app, application, system, platform, feature, button, screen, page, dashboard, API, endpoint, integration, module, notification, email, report, form, database, portal, widget, function, service, menu, field, tab, modal, workflow}`), the **vague-filler blocklist** (F5: `{manage, handle, process, stuff, various, etc., things, data, user, someone, general, misc}`), the **PascalCase matcher** (F2: `^[A-Z][A-Za-z0-9]*$`), the **snake_case normalizer** (D5/A7 for `<persona>-<job>.xml`), and the upstream-shape readers. Closed and vendored; extended only by a committed edit, never ad hoc at runtime. |

**Rationale for hand-rolled over `marked`/`remark`:** the A-theme pins the *exact* shapes
the harness must verify — two fixed level-2 headings in canonical order (`## Upstream
Fingerprints` → `## Personas`, A1), one `### <PersonaName>` subsection per persona each
carrying three pinned fields in order (`**Business actor:**` line → `**Goals:**` list →
`**Jobs-to-be-done:**` table, A5), the goal-line `[impact: …]` token convention (A6), and
the three-column jobs table `Job | Trigger | Outcome` (A7). A general CommonMark AST is more
surface than these fixed shapes need; pinning a parser version + lockfile adds a moving
dependency to a skill whose whole point is byte-deterministic re-runs (§6). A small tolerant
table/heading/labelled-line reader covers every pinned shape, keeps the skill
dependency-free and copy-portable, and makes the `malformed` boundary explicit: the parser
yields a typed parse error exactly when an A-rule shape is violated, which is precisely the
`malformed` trigger.

**Reuse note (doctrine "reuse over invention: copied, never referenced"):** the
`event-storming` skill already ships a hand-rolled `md.mjs` reader and a `checks.mjs`
grammar for the pinned 01 format; the `impact-map` skill ships the reader for the pinned 00
format. This skill **copies both** upstream readers (it must parse the same pinned 00 *and*
01 shapes its two upstreams arrive in) and the `checks.mjs` class scaffold, then extends
them with the 07-specific shapes (persona blocks + goals list + jobs table). Copied, never
cross-referenced — each skill stays self-contained and portable. No external proven harness
exists for this formalism (SOURCES.md: verified-none).

## 2 — Lint checks (structural; mechanize the A-theme + mechanical B/F-theme rules)

Lint checks run first, over the **07 artifact** (the 00 + 01 upstreams are shape-validated
separately — an upstream shape failure is `broken-test`, see §9). Lint IDs are `L*`. A
failing ❌ lint that prevents anchoring 07 yields `malformed`; a failing ❌ lint over a
parseable 07 yields `fail`; ⚠️/ℹ️ lints are warn-only findings.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| L1 | Both exact level-2 headings present and in canonical order: `## Upstream Fingerprints` → `## Personas`. | A1 | `malformed` |
| L2 | `## Upstream Fingerprints` records BOTH a `00-impact-map.md@sha256:<64-hex>` line AND a `01-event-storming.md@sha256:<64-hex>` line (each 64 chars `[0-9a-f]`, neither a placeholder `0000…`/`xxxx…`/`<hex>`). | A2, A3 | `fail` |
| L3 | `## Personas` contains ≥1 `### <PersonaName>` subsection. | A4, A8 | `malformed` |
| L4 | Every `### <PersonaName>` block carries all three pinned fields, IN ORDER: a `**Business actor:**` line, a `**Goals:**` list, then a `**Jobs-to-be-done:**` table. | A5 | `malformed` |
| L5 | Every `**Jobs-to-be-done:**` table header is exactly `Job \| Trigger \| Outcome` (3 cols, that order). | A7 | `malformed` |
| L6 | Every `**Business actor:**` line names exactly one value (no `/`, ` and `, comma-list, or second token) — a persona maps to one actor. | B3 (mech subset) | `fail` |
| L7 | Every `**Goals:**` list entry ends with at least one `[impact: <text>]` token (the token is present and well-formed; resolution is R-class). | A6 | `fail` |
| L8 | No `**Goals:**` block has zero list entries; no `**Jobs-to-be-done:**` table has zero data rows. | A8, E2 | `fail` |
| L9 | No goal text (the substring before the first `[impact: …]` token) contains a software-noun from the closed B1 blocklist (whole-word, case-insensitive). | B1 | `fail` |
| L10 | Every `### <PersonaName>` heading name matches PascalCase `^[A-Z][A-Za-z0-9]*$`. | F2 | warn-only (⚠️) |
| L11 | No persona name, goal, or job text carries a vague-filler token from the closed F5 blocklist (whole-word, case-insensitive). | F5 | warn-only (⚠️) |
| L12 | No Business-Actors-shaped table (`Actor \| Description` header) and no Impacts-shaped table (`Impact \| Business Actor` header) appears anywhere inside 07 (a restated 00 table). | F4 (F4-mech) | `fail` |
| L13 | No Domain-Events-shaped table (`Event \| Actor \| Trigger \| Notes \| Deliverable` header) and no Actors-shaped table (`Actor \| Kind \| Responsibility` header) appears anywhere inside 07 (a restated 01 table). | F4 (F4-mech) | `fail` |
| L14 | No `**Business actor:**` line, goal text, or job cell restates ≥N (default 8) consecutive verbatim words of a 00 `Description` or a 01 `Responsibility` cell (a copied definition). | F4 (F4-mech, paraphrase residue → AJ4) | warn-only (⚠️) |

L12–L14 are **content lints** over a parseable 07 (`fail`/warn, not `malformed`): they scan
the already-anchored artifact's tables/cells and do **not** walk any resolution edge, so they
leave the §5 edge arithmetic untouched. The blocklists (B1 software-noun, F5 vague-filler),
the PascalCase matcher (F2), and the snake_case normalizer are **closed and vendored** in
`scripts/lib/lexicon.mjs`; the 00 `Description` / 01 `Responsibility` word-windows for L14
are **read fresh per run from the parsed upstreams** (upstream-owned data, not a vendored
constant). They are extended only by editing the vendored file in a committed change — never
ad hoc at runtime.

**L6 / B3 decision.** B3's ❌ subset ("a persona maps to 2+ business actors") is fully
mechanical: a `**Business actor:**` line carrying more than one value. The ⚠️ residue ("a
single-actor persona still mixes two behavioral patterns") is the agent-judged `AJ-B3`
(non-blocking). So B3's ❌ weight is carried mechanically by L6 + C1's resolution (R1).

## 3 — Closed fixture / scenario format (B3)

Because the artifact is the model (not executable), the "scenario" is **a walk over 07's own
claims resolved against the parsed 00 and 01 upstreams**. The harness builds, per run, three
in-memory graphs (07, 00, 01) and traverses the cross-document edges. No external scenario
data is injected into a *target* run — the three artifacts supply every element. The shipped
fixtures (below) are **whole canned artifact triples** used only by `selftest.mjs` to prove
the harness itself.

### 3.1 Derived scenario graph (built fresh per run — §6)

From parsed **07** the harness derives:

- `personas[]` — `### <PersonaName>` subsections: `{name, businessActor, goals[] ({text,
  impactTokens[]}), jobs[] ({job, trigger, outcome})}`.

From parsed **00** (pinned upstream) the harness derives the resolution targets:

- `businessActors00[]` — `## Business Actors` `Actor` cells (verbatim strings).
- `impacts00[]` — `## Impacts` rows: `{impact, businessActor}` (the `Impact` cell + its
  owning `Business Actor` cell).

From parsed **01** (pinned upstream) the harness derives the resolution targets:

- `events01[]` — `## Domain Events` `Event` cells (verbatim strings).
- `skeletons01[]` — `{aggregate, steps[] (ordered event strings)}` (read for advisory D6
  only; not a coverage target).

**Derived precondition (00 self-consistency → impact→actor resolution map).** Before any 07
check runs, the harness computes from 00 alone the map `impactOwner: impact →
businessActor`, and verifies each `impacts00[i].businessActor` resolves into
`businessActors00` (mirrors the impact-map harness's own actor-resolution check). This is a
**00 self-check** — the single minimal 00 precondition 07 legitimately needs (a goal token
points at an impact whose actor chain must be sound for E1/E3 to mean anything). Its result
is consumed by the §9 upstream-defect route when it fails. See §9 for what 07 deliberately
does **not** re-verify.

Closed traversal set (every relationship 07 claims becomes a walked edge):

1. **Persona→00-business-actor edge** — each `personas[i].businessActor` resolves into
   `businessActors00` by exact string (C1).
2. **00-business-actor→persona coverage edge** — each `businessActors00` name is named by
   ≥1 `personas[].businessActor` (E1, the reverse coverage gate).
3. **Goal-token→00-impact edge** — each `goals[j].impactTokens[k]` resolves into
   `impacts00` (by `impact` string) by exact string (E3).
4. **Job-outcome→01-event edge** — each `jobs[m].outcome` resolves into `events01` by exact
   string (D2/E4).
5. **Job-trigger classification edge** — each `jobs[m].trigger` is classified: exact-match
   into `events01` ⇒ `event` (recorded), else ⇒ `condition` (recorded). A near-miss
   (differs from a 01 event only by whitespace/case) is flagged ⚠️ (D3). **No failure for
   the condition branch** — the classification is recorded in output, never blocking.
6. **No-invented-party edge** — each `personas[i].businessActor` is present in
   `businessActors00 ∪ actors01` (C2; the business-actor field must trace, and free-text
   party leakage is the agent-judged residue `AJ-C2`).

Every edge class above is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Shipped fixtures (`scripts/fixtures/`)

One shared deterministic **upstream pair** (`upstream-00.md` + `upstream-01.md`, consistent
with each other) + one `valid.md` (a 07 that passes against the pair) + the illegal 07
fixtures + two broken-upstream fixtures. Each illegal fixture carries exactly one deliberate
defect, so its negative fires **for the stated reason** (a fixture that fails for any other
reason is itself `broken-test`). The expected `(status, failing-check, upstream-route)` is
recorded in `scripts/fixtures/manifest.json`.

**`upstream-00.md`** — a small but covering 00: **≥3 business actors** (`Dispatcher`,
`FieldTechnician`, `BillingClerk`), **≥4 impacts** each owned by a resolvable business actor
(e.g. `Dispatch jobs faster` → `Dispatcher`; `Close jobs on-site` → `FieldTechnician`;
`Invoice without rework` → `BillingClerk`; `Never miss an SLA breach` → `Dispatcher`), a
`## Goal` prose line, and a `## Deliverables` table. Every Impact's `Business Actor` cell
resolves into `## Business Actors` (sound impact→actor precondition). Static and stable; no
clock/random/engine values.

**`upstream-01.md`** — the matching event-storming over the same domain: **≥6 events** (e.g.
`Job Dispatched`, `Job Accepted`, `Job Completed`, `Invoice Raised`, `SLA Breach Flagged`,
`Job Reassigned`), `## Actors`, `## Hotspots`, and `## Lifecycle Skeletons`. Consistent with
`upstream-00.md` by construction.

**`valid.md`** — a minimal correct 07 over the pair: a fingerprints block naming both
upstreams; one `### Dispatcher` + one `### FieldTechnician` + one `### BillingClerk`
subsection (every 00 actor covered — E1); each persona with a `**Business actor:**` that
resolves; ≥1 goal per persona each with a resolving `[impact: …]` token; ≥1 job per persona
with a resolving `Outcome` event and a Trigger that is either an exact 01 event or a clean
free-text condition; goals phrased as end conditions (no B1 nouns); PascalCase names.

| Fixture file (07) | Upstream pair | Injected defect | Must fail | Expected status |
|-------------------|---------------|-----------------|-----------|-----------------|
| `valid.md` | `00`+`01` | none — minimal correct 07 | nothing | `pass` |
| `missing-section.md` | `00`+`01` | drops the `## Personas` heading | L1 | `malformed` |
| `bad-block-order.md` | `00`+`01` | a persona block puts `**Jobs-to-be-done:**` before `**Goals:**` | L4 | `malformed` |
| `missing-business-actor-line.md` | `00`+`01` | a persona block omits its `**Business actor:**` line | L4 | `malformed` |
| `bad-jobs-columns.md` | `00`+`01` | a jobs table header reordered to `Trigger \| Job \| Outcome` | L5 | `malformed` |
| `missing-fingerprint-00.md` | `00`+`01` | fingerprints block names only `01`, not `00` | L2 | `fail` |
| `placeholder-fingerprint.md` | `00`+`01` | a digest is a placeholder (64 zeros) | L2 | `fail` |
| `two-actors-one-persona.md` | `00`+`01` | a `**Business actor:**` line = `Dispatcher / BillingClerk` | L6 (B3) | `fail` |
| `ghost-business-actor.md` | `00`+`01` | a persona's `**Business actor:**` = `Scheduler` (absent from 00) | R1 (C1) | `fail` |
| `uncovered-business-actor.md` | `00`+`01` | 00 has `BillingClerk` but no persona names it | R2 / X4 (E1) | `fail` |
| `goal-without-impact-token.md` | `00`+`01` | a goal line carries no `[impact: …]` token | L7 (A6) | `fail` |
| `ghost-impact-token.md` | `00`+`01` | a goal token = `[impact: Reduce churn]` (absent from 00 Impacts) | R3 (E3) | `fail` |
| `persona-no-jobs.md` | `00`+`01` | a persona's jobs table has zero data rows | L8 (E2) | `fail` |
| `persona-no-goals.md` | `00`+`01` | a persona's goals list has zero entries | L8 (E2) | `fail` |
| `dup-job.md` | `00`+`01` | two jobs in one persona share the name `close_job` (snake_case collision) | X3 (D5/E5) | `fail` |
| `ghost-outcome-event.md` | `00`+`01` | a job `Outcome` = `Job Archived` (absent from 01) | R4 (D2/E4) | `fail` |
| `feature-goal.md` | `00`+`01` | a goal = `Use the reporting dashboard [impact: …]` (B1 noun `dashboard`) | L9 (B1) | `fail` |
| `non-pascal-persona.md` | `00`+`01` | a `### field_technician` heading (snake_case, not PascalCase) | L10 (F2) | `fail` *(⚠️ rule; fixture asserts the warn-finding fires, not a fail status)* |
| `restated-00-table.md` | `00`+`01` | a pasted Business-Actors-shaped table (`Actor \| Description`) inside 07 | L12 (F4-mech) | `fail` |
| `restated-01-table.md` | `00`+`01` | a pasted Domain-Events-shaped table inside 07 | L13 (F4-mech) | `fail` |
| `near-miss-trigger.md` | `00`+`01` | a job `Trigger` = `job dispatched` (differs from 01 `Job Dispatched` by case) | AJ/D3 ⚠️ | `pass` *(⚠️ near-miss warn-finding; condition branch never blocks)* |
| `wrong-reason-trap.md` | `00`+`01` | **two** defects — a ghost impact token (E3) AND a B1 feature-goal noun (B1) — proves the negative reports the **R3 impact** reason, not L9 | R3 isolates over L9 | `fail` (reason = R3) |
| `vacuous.md` | `00`+`01` | structurally valid 07 but harness fed the `--no-checks` disabled path | n/a | `broken-test` (zero checks) |
| `valid.md` | `broken-upstream-00.md`+`01` | **00 self-inconsistency** — an Impact's `Business Actor` cell = `Coordinator`, absent from 00's own Business Actors (impact→ghost actor) | 00 self-check (impactOwner) | `fail` (class = `upstream-defect` → 00) |
| `valid.md` | `malformed-upstream-00.md`+`01` | the 00 upstream drops `## Impacts` (unparseable) | n/a — cannot anchor 00 | `broken-test` |
| `valid.md` | `00`+`malformed-upstream-01.md` | the 01 upstream drops `## Domain Events` (unparseable) | n/a — cannot anchor 01 | `broken-test` |

`wrong-reason-trap.md` is the explicit doctrine §2 guard: it would "pass for the wrong
reason" under a sloppy negative. The selftest asserts the failing-check ID equals `R3`, not
merely that *some* check failed.

The last three rows are the **upstream triples**: the same `valid.md` 07 validated against a
*broken* upstream. They distinguish the upstream outcomes (§9): a 00 that is well-formed but
**self-inconsistent** (an impact whose business actor is a ghost) routes to `fail` +
`upstream-defect` (tagged → 00); an upstream that is **unparseable** (00 or 01) routes to
`broken-test`. Note there is **no** `broken-upstream-01.md` self-inconsistency fixture: 07
consumes only 01's flat `## Domain Events` *event names*, with no cross-table 01 invariant of
its own to violate — so 01's only failure modes 07 can observe are *unparseable*
(`broken-test`) or *ghost outcome event* (which is a **07** defect — the 07 row named an
event 01 doesn't have — caught by R4 as an ordinary `fail`, not an upstream-defect).

### 3.3 Trigger classification (pinned interpretation)

The catalog's exact-match-wins disambiguation (D3, A7's Trigger column) is pinned to an
exact mechanical classifier, with the near-miss residue handed to a warn-finding (not a
fail):

```
classifyTrigger(trigger):
  if trigger ∈ events01 (char-for-char)     → kind = "event"     (recorded)
  else if nearMiss(trigger, events01)       → kind = "condition", warn D3 (⚠️)
  else                                       → kind = "condition" (recorded)
```

`nearMiss(t, E)` is true iff `normalize(t)` (trim + lowercase + collapse whitespace) equals
`normalize(e)` for some `e ∈ E` while `t ≠ e` exactly. The classifier **never fails the
artifact for a condition** — a free-text domain condition is a legitimate trigger per A7. It
records `kind` per job in the output (§7) and only warns on the ambiguous near-miss. This
pins the mechanical part of D3 and leaves nothing ❌ to the agent.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a
check means editing this section AND `scripts/lib/checks.mjs` in a committed change, and the
new check MUST cite a catalog rule. The harness emits each check's `id`, `class`, `status`,
and `rule` in its JSON summary (§7). Four classes, per B3:

### 4.1 Resolution checks (`R` — a referenced element exists in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R1 | Every persona's `**Business actor:**` value resolves char-for-char to a 00 `## Business Actors` `Actor`. | C1 |
| R2 | Every 00 `## Business Actors` `Actor` is named by ≥1 persona's `**Business actor:**` field (reverse coverage — no unmodelled party). | E1 |
| R3 | Every goal's `[impact: <X>]` token value resolves char-for-char to a 00 `## Impacts` `Impact`. | E3, A6 |
| R4 | Every job `Outcome` cell resolves char-for-char to a 01 `## Domain Events` `Event`. | D2, E4 |
| R5 | Every persona's `**Business actor:**` value is present in `businessActors00 ∪ actors01` (no invented party at the reference field). | C2 |
| R6 | 00 self-consistency precondition: every 00 `## Impacts` `Business Actor` cell resolves into 00 `## Business Actors` (impact→actor chain sound). Failure ⇒ finding routed `upstream-defect` → 00. | §9 (precondition for E3) |

### 4.2 Exact-value checks (`X` — exact counts/values against the derived graph; no open-ended comparison)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| X1 | Every persona has ≥1 goal (`goals.length ≥ 1`) AND ≥1 job (`jobs.length ≥ 1`). | E2, A8 |
| X2 | Persona names are unique and distinct when snake_cased (`unique(names) === names.length` AND `unique(snake(names)) === names.length`). | F1 |
| X3 | Within each persona, job names are unique and distinct when snake_cased (`unique(jobs) === jobs.length` per persona). | D5, E5 |
| X4 | `coveredActors === businessActors00.length` — every 00 business actor is covered (the E1 reverse-coverage cardinality; pairs with R2). | E1, §5 |
| X5 | The executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.3 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

These are the named negatives proven by the shipped illegal fixtures. Each asserts both that
the defect is rejected AND that the failing-check ID matches the defect's owner rule
(wrong-reason ⇒ `broken-test`).

| ID | Illegal input rejected | For the reason | Fixture | Catalog rule |
|----|------------------------|----------------|---------|--------------|
| N1 | malformed 07 structure | required heading/field/table-order shape absent | `missing-section.md`, `bad-block-order.md`, `missing-business-actor-line.md`, `bad-jobs-columns.md` | A1/A4/A5/A7 |
| N2 | missing/placeholder fingerprint | a digest line absent or not 64-hex | `missing-fingerprint-00.md`, `placeholder-fingerprint.md` | A2/A3 |
| N3 | persona maps to two actors | `**Business actor:**` carries >1 value | `two-actors-one-persona.md` | B3 |
| N4 | ghost business actor | `**Business actor:**` absent from 00 | `ghost-business-actor.md` | C1 |
| N5 | uncovered business actor | a 00 actor named by no persona | `uncovered-business-actor.md` | E1 |
| N6 | goal without impact token | a goal line carries no `[impact: …]` | `goal-without-impact-token.md` | A6 |
| N7 | ghost impact token | `[impact: …]` value absent from 00 Impacts | `ghost-impact-token.md`, `wrong-reason-trap.md` | E3 |
| N8 | persona with no jobs / no goals | empty jobs table / empty goals list | `persona-no-jobs.md`, `persona-no-goals.md` | E2 |
| N9 | duplicate job in a persona | two jobs share a name/snake_case | `dup-job.md` | D5/E5 |
| N10 | ghost outcome event | `Outcome` absent from 01 events | `ghost-outcome-event.md` | D2/E4 |
| N11 | feature-phrased goal | goal text hits the B1 software-noun blocklist | `feature-goal.md` | B1 |
| N12 | non-PascalCase persona name | heading fails PascalCase | `non-pascal-persona.md` | F2 (⚠️) |
| N13 | restated 00 table | Business-Actors / Impacts-shaped table inside 07 | `restated-00-table.md` | F4-mech |
| N14 | restated 01 table | Domain-Events / Actors-shaped table inside 07 | `restated-01-table.md` | F4-mech |
| N15 | upstream-00 self-inconsistency | a 00 Impact's `Business Actor` absent from 00's own Business Actors (impact→ghost actor) | `broken-upstream-00.md` | §9 (`upstream-defect`→00) |

(Lint `L*` and negative `N*` IDs overlap by design where one rule has both a positive lint
pass and a negative fixture proof — they share the catalog rule, not the ID space: `L*` runs
over the target 07, `N*` is proven over a shipped fixture in selftest.)

### 4.4 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ1`–`AJ5` enumerated in §6. They run last, only over checks that survived all mechanical
gates, and return enumerated verdicts only.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The 07 artifact owns three element sets: `personas`, `goals`,
`jobs`. The intake count is:

```
intake = |personas| + Σ|persona.goals| + Σ|persona.jobs|
```

The cross-document **resolution edge count** the harness must walk (from §3.1):

```
edgesExpected = |personas|                          (R1 persona→00 business actor)
              + |businessActors00|                   (R2 reverse coverage: 00 actor→persona)
              + Σ|goal.impactTokens|                 (R3 goal token→00 impact)
              + Σ|jobs|                              (R4 job outcome→01 event)
              + |personas|                           (R5 no-invented-party at actor field)
              + Σ|jobs|                              (trigger classification edge, §3.3)
              + |impacts00|                           (R6 00 self-consistency precondition)
```

**Every owned element exercised ≥1 time.** The harness asserts:
- every `persona` is touched by R1/R5 (actor resolution), X1 (≥1 goal & job), X2 (name
  uniqueness), L4 (field shape), and L10 (PascalCase);
- every `goal` is touched by L7 (token present), R3 (each token resolves), and L9 (B1
  software-noun scan);
- every `job` is touched by R4 (outcome resolves), the trigger classifier (§3.3), X3 (name
  uniqueness per persona), and L5 (table shape);
- every `businessActor00` is touched by R2/X4 (covered by ≥1 persona).

**Reconciliation formula (X5 — no silently dropped checks):**

```
executedChecks = lintRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected) && (executedChecks > 0)
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠
edgesExpected` ⇒ a check was silently dropped ⇒ `broken-test`.

**Positive AND negative per claimed behavior.** Every behavior/constraint the artifact
claims is proven by **≥1 positive** (a passing check over `valid.md` / the target) **AND ≥1
negative** (a shipped illegal fixture that must fail). The mapping:

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Required headings present & ordered | A1 | L1 over `valid.md` | `missing-section.md` |
| Per-persona three fields, in order | A5 | L4 over `valid.md` | `bad-block-order.md`, `missing-business-actor-line.md` |
| Jobs table column shape | A7 | L5 over `valid.md` | `bad-jobs-columns.md` |
| Both fingerprints present, real digests | A2/A3 | L2 over `valid.md` | `missing-fingerprint-00.md`, `placeholder-fingerprint.md` |
| Persona maps to exactly one actor | B3 | L6 over `valid.md` | `two-actors-one-persona.md` |
| Persona actor resolves to 00 | C1 | R1 over `valid.md` | `ghost-business-actor.md` |
| Every 00 actor covered by ≥1 persona | E1 | R2/X4 over `valid.md` | `uncovered-business-actor.md` |
| No invented party | C2 | R5 over `valid.md` | `ghost-business-actor.md` (shares the R1 ghost) |
| Goal carries impact token | A6 | L7 over `valid.md` | `goal-without-impact-token.md` |
| Goal token resolves to 00 impact | E3 | R3 over `valid.md` | `ghost-impact-token.md` (+`wrong-reason-trap.md`) |
| Every persona has ≥1 goal & ≥1 job | E2 | X1/L8 over `valid.md` | `persona-no-jobs.md`, `persona-no-goals.md` |
| Jobs unique per persona | D5/E5 | X3 over `valid.md` | `dup-job.md` |
| Persona names unique | F1 | X2 over `valid.md` | (dup-name variant in `dup-job.md` family) |
| Job outcome resolves to 01 event | D2/E4 | R4 over `valid.md` | `ghost-outcome-event.md` |
| Goal is an end condition (no software noun) | B1 | L9 over `valid.md` | `feature-goal.md` |
| Persona name PascalCase | F2 | L10 over `valid.md` | `non-pascal-persona.md` (⚠️) |
| No restated 00 table | F4-mech | L12 over `valid.md` | `restated-00-table.md` |
| No restated 01 table | F4-mech | L13 over `valid.md` | `restated-01-table.md` |
| Trigger exact-match classification | D3/A7 | classifier over `valid.md` (event + condition) | `near-miss-trigger.md` (⚠️ near-miss) |
| 00 impact→actor chain sound | §9 | R6 over `valid.md`+sound 00 | `broken-upstream-00.md` (upstream-defect→00) |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a
negative entry above — the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; reason + closed verdict schema)

These catalog rules (or rule residues) are **inherently semantic** — they require domain
understanding the mechanical layer cannot supply. Each runs only after mechanical gates pass,
and returns an **enumerated verdict** (never prose). The harness records `{id, verdict,
ruleId}`; any verdict other than the rule's pass-verdict is reported as a finding at the
catalog severity. **There are no ❌ agent-judged checks** — every ❌ rule has its ❌ weight
carried by a mechanical subset; the agent only judges the residue at its own (⚠️/ℹ️)
severity.

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ1 | B2 (+ B1 residue) | whether a goal line *not* caught by the B1 blocklist still reads as a task/means ("click", "submit", "configure") vs the stable end condition — needs meaning beyond the closed noun list. | `{ end-condition \| task-or-means \| ambiguous }` |
| AJ2 | B4 / B5 | whether a persona has ≥1 *end* goal (an accomplishment) vs only experience/life-flavoured aspirations, and whether goals are usefully differentiated by goal level — taxonomy judgment beyond token matching. | `{ has-end-goal \| only-experience-or-life \| ambiguous }` |
| AJ3 | D4 | whether each job *serves* one of the persona's stated goals (the goal-in-context link) — a semantic tie the harness cannot string-match. | `{ serves-a-goal \| orphan-job \| ambiguous }` |
| AJ4 | C3 / B3 residue / F4 paraphrase | whether a single-actor persona is elastic (two behavioral patterns merged) OR restates a 00 description / 01 responsibility in paraphrase (the verbatim window subset is L14/L12/L13). | `{ one-pattern-no-restate \| elastic-or-restated \| ambiguous }` |
| AJ5 | C2 (free-text residue) / F3 | whether goal/job *free text* (not the resolved reference fields, which R1/R3/R4/R5 cover) coins a competing name for a 00 actor/impact or a 01 event — synonym judgment beyond exact-string resolution. | `{ uses-upstream-vocab \| invents-vocab \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); it is reported as an ℹ️ finding,
never silently dropped, and never counts as a pass for reconciliation purposes (it counts as
executed, verdict-recorded). No agent-judged check may emit free prose in an asserted
position.

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order,
`checks[]`/`findings[]` sorted by `id`:

```json
{
  "skill": "personas",
  "artifact": "specs/07-personas.md",
  "upstream00": "specs/00-impact-map.md",
  "upstream01": "specs/01-event-storming.md",
  "status": "pass | fail | malformed | broken-test",
  "counts": {
    "intake": { "personas": 0, "goals": 0, "jobs": 0 },
    "checks": { "lint": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "triggers": [
    { "persona": "Dispatcher", "job": "dispatch_job", "kind": "event" },
    { "persona": "FieldTechnician", "job": "close_job", "kind": "condition" }
  ],
  "_note": "the triggers[] values above are ILLUSTRATIVE schema examples, not pinned to any fixture — job-name casing and event|condition kinds come from the artifact under test",
  "checks": [
    { "id": "L1", "class": "lint", "rule": "A1", "status": "pass" },
    { "id": "R1", "class": "resolution", "rule": "C1", "status": "pass" },
    { "id": "AJ3", "class": "agent-judged", "rule": "D4", "verdict": "serves-a-goal" }
  ],
  "findings": [
    { "id": "R6", "rule": "E3", "severity": "error", "class": "upstream-defect", "upstream": "00-impact-map.md", "detail": "Impact 'Reduce churn' names Business Actor 'Coordinator' absent from 00 Business Actors" }
  ]
}
```

- The `triggers[]` array records each job's Trigger classification (`event` | `condition`)
  per §3.3 — recorded, never blocking (a condition is a legitimate trigger).
- The optional `class: "upstream-defect"` + `upstream: "<file>"` on a finding routes a
  00-origin defect (§9). It does **not** add a status; the status stays `fail` (the taxonomy
  is closed at four values).
- **stderr** — human-readable diagnostics only (parse errors, per-check failure traces, the
  wrong-reason trap explanation, the upstream-defect routing note naming which file to fix,
  the near-miss-trigger warn explanation). Never the machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. `1` = `fail` (including `upstream-defect`
  findings). `2` = `malformed` (07 unparseable). `3` = `broken-test` (check threw,
  wrong-reason, reconciliation mismatch, zero checks, **or an unparseable 00/01 upstream**).
  The distinct codes let CI separate a wrong 07 (`1`), a shapeless 07 (`2`), and a broken
  harness/fixture (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`.

## 8 — Determinism (doctrine §6)

- The harness reads only the three target artifacts (and, in selftest, the shipped fixture
  triples). It injects **no clock value, no randomness, no engine-generated value** into any
  asserted position. The `## Upstream Fingerprints` hashes are *read from 07* and only
  string-checked for presence/shape (L2) — never generated by the harness. The harness does
  **not** itself recompute the sha256 of 00/01 and assert equality (that would inject an
  engine value); it checks each digest's *shape* and resolves references against the upstream
  files actually passed via `--upstream-00` / `--upstream-01`.
- State is **built fresh per run** from the three parses; nothing is persisted between runs.
  A re-run over byte-identical inputs is **byte-identical output** (stable key order, sorted
  `checks[]`/`findings[]`/`triggers[]` by `id`/`persona`+`job`). The only externally-varying
  input is the upstream content itself.
- Fixtures in `scripts/fixtures/` are static committed files (the shared `upstream-00.md` +
  `upstream-01.md`, the broken/malformed upstreams, and the 07 fixtures) with a static
  `manifest.json` of expected `(status, failing-check, upstream-route)` tuples.
  `selftest.mjs` is therefore reproducible and order-independent.
- Agent-judged checks (§6) and the trigger classifier's `condition` branch are the only
  non-❌ steps; they do not feed the pass/fail mechanical verdict's reconciliation arithmetic
  (§5) and their verdicts/classifications are recorded, not invented into pass/fail counts —
  so the **mechanical verdict remains byte-deterministic** regardless of agent output.

## 9 — Upstream-defect routing (minimal preconditions; how a 00 defect is reported without patching around it)

07 is validated *against* two upstreams, but it consumes a **narrow slice** of each: 00's
business actors + impacts, and 01's domain-event *names*. The harness therefore checks only
the **minimal preconditions** 07 legitimately needs, and **never silently repairs or works
around** a bad upstream — it surfaces the defect and routes it to the file that owns the fix:

**Pinned preconditions (the only upstream invariants 07 verifies):**

1. **00 impacts table is internally resolvable** — every 00 `## Impacts` `Business Actor`
   cell resolves into 00's own `## Business Actors` (`R6`). This is the one 00 self-check 07
   needs: a goal token (E3) points at an impact whose owning actor chain must be sound, or
   E1/E3 mean nothing. If an impact names a ghost actor, that is a **00** defect → routed
   `upstream-defect` → 00.
2. **01 Domain Events table is parseable** — the `## Domain Events` table exists with its
   pinned `Event | Actor | Trigger | Notes | Deliverable` shape so the `events01` event-name
   set can be built for R4 / the trigger classifier. If it is unparseable, the harness cannot
   anchor any outcome/trigger resolution → `broken-test`.

**What 07 deliberately does NOT re-verify (single ownership of checks).** The event-storming
skill's own catalog already owns the check that **01's human/org `## Actors` are a subset of
00's Business Actors** (its `H1`-class cross-actor consistency check). 07 does **not**
re-run that check — re-verifying an upstream invariant another skill already owns would
duplicate ownership, double-report the same defect across two harnesses, and let 07 fail for
a reason that is not 07's to police. 07 reads 01's `## Actors` table *only* as a membership
set for the no-invented-party check `R5` (`businessActors00 ∪ actors01`), never to audit
whether 01's actors trace into 00. Likewise 07 does **not** verify 01 skeleton↔event
consistency (the aggregates skill owns that X7-style self-check), nor 00 deliverable↔impact
resolution (the impact-map skill owns it) — none of those are preconditions for the slice 07
consumes.

Three upstream conditions are distinguished and routed:

1. **Sound upstreams.** 00 parses and is impact→actor self-consistent (R6); 01 parses with a
   well-formed `## Domain Events` table. The 07→00/01 resolution checks (R1–R5) run normally;
   a failure is a **07 defect** → `fail`, ordinary finding. In particular a `ghost outcome
   event` (a job `Outcome` 01 doesn't have) is a **07** defect (07 named a non-existent
   event), caught by R4 as an ordinary `fail` — not an upstream-defect.

2. **Well-formed but self-inconsistent 00** (`upstream-defect` → 00). 00 parses, but an
   Impact's `Business Actor` cell references an actor absent from 00's own Business Actors
   (impact→ghost actor). A naive reading might blame a 07 goal token that resolves to that
   impact. Instead the harness runs the **pre-resolution 00 self-check** (`R6`) before R3; on
   failure the finding is tagged `class: "upstream-defect"`, `upstream: "00-impact-map.md"`,
   and names the offending impact + ghost actor. Status `fail`, exit `1`; the pipeline routes
   the fix **upstream to the impact-map artifact**, not to 07. Proven by `valid.md` +
   `broken-upstream-00.md`.

3. **Unparseable 00 or 01** (`broken-test`, not `upstream-defect`). An upstream does not
   parse against its pinned format at all (a required heading/table absent — 00's `##
   Impacts` or `## Business Actors`, or 01's `## Domain Events`). The harness cannot anchor
   the resolution targets, so it cannot make a trustworthy statement about 07. Status
   `broken-test`, exit `3`, stderr explains which upstream is unparseable. Proven by
   `valid.md` + `malformed-upstream-00.md` and `valid.md` + `malformed-upstream-01.md`.

The splits are deliberate: `upstream-defect` (case 2) is an actionable content finding routed
to the *00 owner* while keeping the §2 status set closed; `broken-test` (case 3) is the
harness honestly refusing to emit a verdict it cannot justify. No case lets the harness paper
over an upstream by inferring, substituting, or skipping a missing 00/01 element.

---

*This contract mechanizes catalog rules A1–F5. **Mechanical ❌ coverage is complete:** every
one of the 21 ❌-severity catalog rules has BOTH (a) a mechanical owner check and (b) a
dedicated negative fixture. The full reconciliation (❌ rule → owner check → negative
fixture):*

| ❌ rule | Owner check | Negative fixture |
|---|---|---|
| A1 | L1 | `missing-section.md` |
| A2 | L2 | `missing-fingerprint-00.md` |
| A3 | L2 | `placeholder-fingerprint.md` |
| A4 | L3 / L4 | `bad-block-order.md` |
| A5 | L4 | `missing-business-actor-line.md` |
| A6 | L7 | `goal-without-impact-token.md` |
| A7 | L5 | `bad-jobs-columns.md` |
| A8 | L8 / X1 | `persona-no-jobs.md` |
| B1 | L9 | `feature-goal.md` |
| B3 | L6 (mech subset) | `two-actors-one-persona.md` |
| C1 | R1 | `ghost-business-actor.md` |
| C2 | R5 | `ghost-business-actor.md` |
| D1 | L4 (jobs nested in persona block) | `bad-block-order.md` |
| D2 | R4 | `ghost-outcome-event.md` |
| D5 | X3 | `dup-job.md` |
| E1 | R2 / X4 | `uncovered-business-actor.md` |
| E2 | X1 / L8 | `persona-no-jobs.md` / `persona-no-goals.md` |
| E3 | R3 | `ghost-impact-token.md` |
| E4 | R4 | `ghost-outcome-event.md` |
| E5 | X3 | `dup-job.md` |
| F1 | X2 | (dup-name variant in `dup-job.md` family) |

*(D1 — "every job belongs to a persona" — is mechanized by L4: the jobs table is a pinned
*field of the persona block*, so a parseable 07 has no persona-less job; `bad-block-order.md`
exercises the per-block field check. B3's ❌ subset is L6 (2+ actors on one line); its
behavioral-pattern residue is ⚠️ AJ4. The ⚠️/ℹ️ rules — B2/B4/B5/B6, C3/C4/C5, D3/D4/D6,
E6, F2/F3/F4/F5 — each still carry a mechanical owner where one exists (L10 for F2, L11 for
F5, L12/L13/L14 for F4-mech, the §3.3 classifier for D3, R6 for the E6-adjacent impact
chain) and an agent-judged residue (AJ1–AJ5) where the rule is inherently semantic; none is
left as a blocking ❌ on the agent. The selftest's COVERAGE array asserts the
positive+negative floor over the §5 table and fails if any ❌ rule lacks either side.
Pass = status `pass` = zero ❌ findings, reconciled, ≥1 check executed.*
