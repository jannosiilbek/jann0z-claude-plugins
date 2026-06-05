# anamnesis — Simulation Contract (executable harness spec)

Role: this is the **closed simulation contract** for the **anamnesis bridge** — the OPTIONAL
brownfield entry path into the `schema-therapy` modelling pipeline. It pins the **sole executable
pass/fail authority** that ships with the skill: a zero-dependency Node ≥18 ESM harness
(`scripts/harness.mjs`) over the gates **G0–G5**, built from **vendored closed-format parsers**
(S1 brief tables, S2 ledger JSONL, S4 journal JSONL, S5 context map) plus the **S6 deterministic
ledger→domain renderer** — the strongest oracle, run IN the harness so a render can be re-derived and
byte-compared rather than trusted.

It is **paired with** `references/validation-rules.md` (the closed rule catalog, themes A–F:
**A1–A4 / B1–B8 / C1–C7 / D1–D4 / E1–E5 / F1–F9 — 37 rules, 35 ❌, 2 ⚠️**). Every check below cites
the catalog rule it mechanizes. **The catalog is the review vocabulary; this file is the executable
harness over it.** No check here exists without a catalog rule behind it.

The bridge sits **upstream of pipeline step 01** (event-storming), so unlike the eleven pipeline
skills it has **no upstream pipeline artifacts** — therefore **no `upstream-defect` finding class**.
Its analogue is the **`bridge-defect`** finding class (tier breaches, owner P-TIER): a finding `class`,
never a fifth status. There is **no `sources/` dir** (no external formalism); the catalog cites the
design spec as `[SPEC]`. There is **no external engine for evidence-gated claim ledgers**, so the
parsers and the renderer are honestly vendored — no `package.json`, no self-install.

## Index

| § | Title | What you find |
|---|-------|---------------|
| §0 | Oracle architecture | vendored parsers + the S6 renderer as the strongest oracle (R-DET re-renders) |
| §1 | CLI + modes | the S7 invocation, gate→mode table, `--context`, vacuous/missing-dir guards |
| §2 | JSON summary | the S7 shape verbatim, exits 0/1/2/3, status precedence |
| §3 | Check execution per gate | owner checks per gate + what each mechanically computes |
| §4 | Reconciliation formula | `edgesExpected` arithmetic; zero checks ⇒ broken-test |
| §5 | Fixture suite | the S9 table, `valid-single` obligations, `manifest.json` semantics |
| §6 | ❌-rule → owner → fixture | the TRUE 35-row reconciliation table + coverage floor |
| §7 | Selftest obligations | the parts the selftest must run; runtime < 5 min |
| §8 | Status routing for the skill | fail/malformed/broken-test → which artifact or script to fix |

## 0 — Oracle architecture (B3 strongest oracle; zero external dependency)

There is **no scriptable engine** for an evidence-gated claim ledger — no validator ingests an
anamnesis brief/ledger/journal/context-map and reports gate conformance, and no compiler renders a
claim ledger to a domain file. So the harness **vendors** every parser and **the renderer itself**,
and the renderer is the load-bearing oracle.

| Layer | Vendored module | Reads | The seam it owns |
|-------|-----------------|-------|------------------|
| Brief parser | `lib/brief.mjs` | `anamnesis/brief.md` (S1) | the Capabilities table (rows, classes, tiers, environments) — G0 |
| Ledger parser | `lib/ledger.mjs` | `anamnesis/ledger.jsonl` (S2) | the closed claim schema, claim keys, the S3 independence matrix, lock legality — G1 |
| Journal parser | `lib/journal.mjs` | `anamnesis/probes.log` (S4) | the two closed entry kinds, tier verb sets, round markers — G2 + G3 |
| Context-map parser | `lib/contextmap.mjs` | `anamnesis/context-map.md` (S5) | context slugs, concept→context assignment — G5 |
| **S6 renderer** | `lib/render.mjs` | the parsed ledger + context | **the deterministic ledger→domain compiler — the strongest oracle** |
| Check grammar | `lib/checks.mjs` | — | check records + reconciliation arithmetic (copied pattern from siblings, never imported) |

**The renderer is the strongest oracle (R-DET).** The S6 compiler is mechanical and lives IN the
harness. At G4 the harness **re-renders the ledger in memory** for the handoff context and
**byte-compares** the result against the on-disk `domain.md` / `domain.<slug>.md`. The harness
**never trusts a declared render** — a stale, hand-edited, or nondeterministic file is caught because
the in-memory re-render differs byte-for-byte (R-DET). This is what makes "deterministic ledger →
domain file" and the G4 byte-identical double-render checkable. Re-rendering an unchanged ledger
yields byte-identical output by construction (no clock, no random, sorted everywhere).

**Zero external deps.** Self-contained; `selftest.mjs` requires no `npm install`. No
`scripts/package.json`, no self-install path. The JSON `tooling` block states
`externalEngine: 'none (no engine exists for evidence-gated claim ledgers; parser + renderer vendored)'`.

## 1 — CLI + modes (S7)

```
node scripts/harness.mjs <project-dir> --gate <g0|merge|dry|handoff|render> [--context <slug>] [--no-checks]
```

`<project-dir>` contains `anamnesis/` + the domain file(s). Gate→mode mapping (each mode runs every
gate listed, in order, and marks the rest `skipped` in the summary's `gates` block):

| Mode | Gates run | When the command uses it |
|---|---|---|
| `g0` | G0 | after composing/amending the brief |
| `merge` | G0 G1 G2 | after every mining-round merge |
| `dry` | G0 G1 G2 G3 | to certify Phase 1 may close |
| `render` | G0 G1 G2 + emit the S6 render for `--context` | Phase 3, before G4 |
| `handoff` | G0 G1 G2 G5 G4 (both scoped to `--context`) | the boundary oracle before dispatching event-storming |

- `--context` defaults to the implicit single context (`-`) when the map is absent or has one context;
  **required** when the map has >1 (a missing required `--context` ⇒ broken-test).
- `--no-checks` ⇒ **broken-test** (the vacuous guard — the harness never reports green with zero
  checks executed).
- A missing `<project-dir>` **or** a missing `anamnesis/` directory ⇒ **broken-test** (the harness
  cannot anchor any gate; this is a script/env error, not an artifact `fail`).
- `render` mode writes the S6 file into the project dir and records `{file, context, sha256, claims,
  openQuestions}` in `renders[]`; it runs G0 G1 G2 first so it never renders an unparseable ledger.

## 2 — JSON summary + exits (S7)

**stdout** — a single machine-readable JSON object, **stable key order**, `checks[]`/`findings[]`
sorted by `id`:

```json
{
  "skill": "anamnesis",
  "projectDir": "<project-dir>",
  "mode": "g0 | merge | dry | render | handoff",
  "context": "<slug | ->",
  "tooling": {
    "briefParser": "vendored-s1", "ledgerParser": "vendored-s2-jsonl",
    "journalParser": "vendored-s4-jsonl", "contextMapParser": "vendored-s5",
    "renderer": "vendored-s6-compiler (in-harness, the R-DET oracle)",
    "node": ">=18",
    "externalEngine": "none (no engine exists for evidence-gated claim ledgers; parser + renderer vendored)"
  },
  "status": "pass | fail | malformed | broken-test",
  "gates": { "g0": "pass|fail|skipped", "g1": "...", "g2": "...", "g3": "...", "g5": "...", "g4": "..." },
  "counts": {
    "claims": { "total": 0, "unconfirmed": 0, "confirmed": 0, "accident": 0, "deferred": 0, "locked": 0 },
    "evidence": { "code": 0, "test": 0, "doc": 0, "data": 0, "probe": 0 },
    "contexts": 0, "rounds": 0, "probes": 0,
    "checks": { "mechanical": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "edgesWalked": 0, "edgesExpected": 0
  },
  "renders": [ { "file": "domain.md", "context": "-", "sha256": "<64-hex>", "claims": 0, "openQuestions": 0 } ],
  "reconciled": true,
  "coverage": { "behaviorsWithPosAndNeg": 35 },
  "checks": [
    { "id": "L-CONFIRM", "class": "mechanical", "rule": "C1", "gate": "g1", "status": "pass" },
    { "id": "R-DET", "class": "resolution", "rule": "F5", "gate": "g4", "status": "pass" }
  ],
  "findings": [
    { "id": "P-TIER", "rule": "D4", "gate": "g2", "severity": "error", "class": "bridge-defect",
      "detail": "probe DELETE on read-only capability app-prod (claim CLM-0042)" }
  ]
}
```

- The `gates` block is **always present** with all six keys; a gate not run in the mode is `skipped`.
- `findings[]` may carry **`class:"bridge-defect"`** on a P-TIER finding (D4 tier breach). It is a
  **finding class, never a fifth status** — the status stays `fail`, the taxonomy stays at four values.
- `renders[]` is non-empty only in `render`/`handoff` modes (the modes that emit/compare an S6 file).
- `coverage.behaviorsWithPosAndNeg` is the emitted constant; it **MUST equal 35** — the length of the
  §6 reconciliation table (asserted by the selftest, §7).

**Exit codes:** `0` ⇔ `status === "pass"`; `1` = `fail`; `2` = `malformed` (a ledger/journal line
that is not valid closed-schema JSON, or a syntactically unparseable brief Capabilities table); `3` =
`broken-test` (a check threw, the reconciliation mismatched, zero checks executed, a missing
`<project-dir>`/`anamnesis/`, a missing required `--context`, or `--no-checks`).

**Status precedence (highest wins):** `broken-test` > `malformed` > `fail` > `pass`. A run that
both fails an ordinary ❌ and hits a malformed ledger line reports `malformed`; a run that also hit a
script/env error reports `broken-test`.

## 3 — Check execution per gate (S8 owner checks; gate by prefix)

Gate-by-prefix: **G0** = theme A (B-*); **G1** = themes B + C (L-*); **G2** = theme D (P-*);
**G3** = D-* (E1–E2); **G5** = S-* (E3–E5); **G4** = theme F (R-*). A gate runs its checks in order;
a ❌ over a parseable artifact yields `fail`; an L-PARSE/P-PARSE failure or a garbled brief table
yields `malformed`; ⚠️ checks (R-SMELL, R-SIZE) are warn-only and never block.

### G0 — Brief gate (theme A, `lib/brief.mjs`)

| Owner | Rule | Mechanically computes | Fail mode |
|-------|------|-----------------------|-----------|
| B-PARSE | A1 | `anamnesis/brief.md` exists; required sections (`# Anamnesis Brief`, `## Engagement`, `## Capabilities`) present; Capabilities table parses. | absent ⇒ `fail`; garbled table ⇒ `malformed` |
| B-CAP | A2 | each `Capability` unique + `^[a-z][a-z0-9-]*$`; `Class ∈ {code,test,doc,data,probe}`; `Access` non-empty; ≥1 row. | `fail` |
| B-TIER | A3 | `Tier` + `Environment` non-`-` **iff** `Class=probe`; `Tier ∈ {none,browse-only,read-only,sandbox-full}`. | `fail` |
| B-PROD | A4 | a row with `Environment = production` (case-insensitive) has `Tier ≠ sandbox-full`. | `fail` |

### G1 — Ledger schema & confirmation (themes B + C, `lib/ledger.mjs`)

| Owner | Rule | Mechanically computes | Fail mode |
|-------|------|-----------------------|-----------|
| L-PARSE | B1 | every line is a JSON object with exactly the S2 fields (no extras, none missing). | `malformed` |
| L-ID | B2 | `id` matches `^CLM-\d{4,}$`; no two lines share an `id`. | `fail` |
| L-ENUM | B3 | `kind`, `status`, every `evidence[].class` in their closed sets. | `fail` |
| L-EVID | B4 | `evidence` length ≥1; each has non-empty `source`, a `class`, a `capability`. | `fail` |
| L-CAP | B5 | each evidence `capability` resolves to a brief Capability by **exact string** AND the evidence `class` equals that capability's `Class` (the context-leak signature). | `fail` |
| L-KEY | B6 | no two lines share the claim key `(concept, kind, normalize(statement))` — `normalize` = lowercase, collapse internal whitespace, trim, strip one trailing `.`/`!`/`?`. | `fail` |
| L-ROUND | B7 | each `round` is an integer in `[1, max journal round marker]`. | `fail` |
| L-NAME | B8 | `concept` matches `^[a-z][a-z0-9_]*$`; `statement` does not contain `CLM-`. | `fail` |
| L-CONFIRM | C1 | a `confirmed` claim has **either** a legal S3 evidence pair **or** a logged human `verdict`. | `fail` |
| L-PAIR | C2 | a `confirmed` claim with no verdict is rejected when its only cross-class span is `{code,test}` or it is all one class (no legal S3 pair). | `fail` |
| L-ACC | C3 | a `accident` claim carries a human `verdict`. | `fail` |
| L-DEF | C4 | a `deferred` claim carries a human `verdict`. | `fail` |
| L-VERDICT | C5 | every `verdict` is exactly `{by:"human", round:<int≥1>, reason:"<non-empty one line>"}`. | `fail` |
| L-LOCKSYM | C6 | every `conflictsWith` id resolves; every link is symmetric (A↔B). | `fail` |
| L-LOCK | C7 | a claim with non-empty `conflictsWith` left `unconfirmed` **only** with a human `verdict` (never auto-resolved by recency/confidence/majority/triangulation). | `fail` |

**S3 independence-matrix evaluation (L-CONFIRM / L-PAIR).** Over `{code,test,doc,data,probe}`, the
parser computes the set of distinct evidence classes on a claim and tests for ≥1 **legal pair**: a
pair `{a,b}` confirms iff `a ≠ b` AND `{a,b} ≠ {code,test}`. The exhaustive legal-pair table (pinned
in `lib/ledger.mjs`, not re-derived at runtime): `code+doc, code+data, code+probe, test+doc,
test+data, test+probe, doc+data, doc+probe, data+probe`. A claim is triangulation-confirmable iff its
class set contains ≥1 of these. L-CONFIRM passes a `confirmed` claim with ≥1 legal pair OR a verdict;
L-PAIR is the negative arm — a `confirmed`, verdict-less claim whose classes are all one class or only
`{code,test}` is the same-channel trap.

**Lock arithmetic (L-LOCK).** A claim is **contradiction-locked** iff `conflictsWith` is non-empty and
`status === "unconfirmed"` (the lock is a state, not a status). L-LOCKSYM verifies the symmetric
graph: for every claim A listing B in `conflictsWith`, B must list A and B must resolve. L-LOCK then
verifies that any claim carrying a non-empty `conflictsWith` whose `status !== "unconfirmed"` has a
human `verdict` — a status change away from `unconfirmed` on a linked claim without a verdict is an
auto-resolution, the hard fail.

### G2 — Probe audit (theme D, `lib/journal.mjs`)

| Owner | Rule | Mechanically computes | Fail mode |
|-------|------|-----------------------|-----------|
| P-PARSE | D1 | every `probes.log` line is a JSON object of one closed kind (`round`/`probe`) with the S4 fields. | `malformed` |
| P-JRN | D2 | each `probe`-class evidence line on a claim resolves to ≥1 `probe` journal entry matching `(claim id, capability)`. | `fail` |
| P-CAP | D3 | each `probe` entry's `capability` resolves to a brief Capability whose `Class = probe`. | `fail` |
| P-TIER | D4 | each `probe` entry's `method` is in its capability's tier verb set; a `none`-tier capability has zero probe entries. Emits finding **`class:"bridge-defect"`**. | `fail` |

Tier verb sets (S4): `none` ⇒ zero entries; `browse-only` ⇒ `{VISIT, READ}`; `read-only` ⇒
`{GET, HEAD, OPTIONS, QUERY, READ, VISIT}`; `sandbox-full` ⇒ any of the closed verb set
`{GET, HEAD, OPTIONS, QUERY, READ, VISIT, POST, PUT, PATCH, DELETE, EXECUTE, WRITE, SUBMIT}`.

### G3 — Dry & readiness (E1–E2, `lib/journal.mjs`)

| Owner | Rule | Mechanically computes | Fail mode |
|-------|------|-----------------------|-----------|
| D-SEQ | E1 | the `round` markers in `probes.log` are strictly increasing by 1 from 1 (no gap, no repeat, start = 1). | `fail` |
| D-DRY | E2 | **max marker `N ≥ 2` AND no claim has `round ∈ {N−1, N}`** — the last two rounds added zero new/changed ledger lines. | `fail` |

### G5 — Handoff readiness (E3–E5, `lib/contextmap.mjs`)

| Owner | Rule | Mechanically computes | Fail mode |
|-------|------|-----------------------|-----------|
| S-UNCONF | E3 | the handoff context (scoped via the map) contains zero `unconfirmed` claims (deferred passes). | `fail` |
| S-LOCK | E4 | the handoff context contains zero contradiction-locked claims (non-empty `conflictsWith`, still `unconfirmed`). | `fail` |
| S-MAP | E5 | context slugs `^[a-z][a-z0-9_]*$`; each concept listed exactly once across contexts; every ledger concept mapped when the map exists. | `fail` |

### G4 — Render boundary oracle (theme F, `lib/render.mjs`)

| Owner | Rule | Mechanically computes | Fail mode |
|-------|------|-----------------------|-----------|
| R-RESOLVE | F1 | every `[CLM-nnnn]` annotation in the file resolves to a ledger claim id. | `fail` |
| R-STATUS | F2 | a body annotation resolves to `confirmed`; an Open-questions annotation resolves to `deferred` or contradiction-locked. | `fail` |
| R-COV | F3 | every `confirmed` claim of the rendered context appears exactly once. | `fail` |
| R-ACC | F4 | no `accident` claim id appears; no `accident` `concept` token appears in prose unless a `confirmed` claim of the context owns that concept. | `fail` |
| **R-DET** | F5 | the on-disk file bytes **equal** the harness's in-memory S6 re-render of the same ledger. **The harness never trusts the declared file — it re-renders and byte-compares.** | `fail` |
| R-HDR | F6 | the S6 provenance header is present and its `sha256:` equals the sha over the exact ledger bytes. | `fail` |
| R-CTX | F7 | the file maps to exactly one context-map entry, contains only that context's concepts, and is named per S5. | `fail` |
| R-SMELL | F8 | **⚠️ warn-only.** a rendered statement matches `/\b\w+\.(java\|py\|js\|ts\|rb\|php\|cs\|go\|sql)\b/`, `/\w+::\w+/`, `/\w+\(\)/`, or `/\b(SELECT\|INSERT\|UPDATE\|DELETE)\b[\s\S]{0,80}\b(FROM\|INTO\|SET)\b/i`. | warn (never blocks) |
| R-SIZE | F9 | **⚠️ warn-only.** the rendered body has > 120 claims ("this context is telling you it is two contexts"). | warn (never blocks) |

## 4 — Reconciliation formula (no silently dropped checks)

The harness counts the **edges it must walk** and compares to the count it **did walk**; a mismatch is
a `broken-test`. The arithmetic is simple and countable:

```
edgesExpected = Σ|claims| × 2                  (per-claim schema + status edges: L-* schema pass + the
                                                C-* confirmation/lock edge per claim line)
              + Σ|probe-class evidence lines|   (P-JRN: each probe evidence → a journal entry)
              + Σ|journal entries|              (P-PARSE: each round/probe line parses)
              + Σ|render annotations|           (R-RESOLVE: each [CLM-nnnn] resolves)
              + Σ|context-map entries|          (S-MAP: each concept→context assignment)
```

```
executedChecks = mechanicalRun + resolutionRun + exactValueRun + negativeRun(selftest) + agentJudgedRun
reconciled := (edgesWalked === edgesExpected) && (executedChecks > 0)
PASS requires reconciled === true
```

- **Zero executed checks ⇒ `broken-test`** (no vacuous green) — this is the `--no-checks` and the
  empty-engagement outcome.
- `edgesWalked ≠ edgesExpected` ⇒ a check was silently dropped ⇒ `broken-test`.
- The **counter classes must sum to `counts.checks.total`** (`mechanical + resolution + exactValue +
  negative + agentJudged === total`); a mismatch is conflation ⇒ `broken-test`.
- Gates not run in the current mode contribute no edges (their edge classes are zero for that run);
  reconciliation is computed over the gates the mode actually ran.

## 5 — Fixture suite (S9)

Each fixture dir is a self-contained mini engagement (`anamnesis/brief.md`, `ledger.jsonl`,
`probes.log` [, `context-map.md`] [, `domain*.md`]). The ten spec-named fixtures are marked ★. Every
negative carries **exactly one** injected defect (a fixture failing for any other reason is itself
`broken-test`).

| dir | mode (context) | status | owner / notes |
|---|---|---|---|
| valid-single | dry | pass | journal rounds 1..4, all claim rounds ≤ 2 |
| valid-single | handoff | pass | owner null; exercises every check's positive arm |
| valid-multi | handoff (ordering) | pass | 2-context map; ordering ready |
| valid-multi | handoff (catalog) | fail | S-UNCONF ★ context-handed-off-with-unconfirmed-claims |
| missing-brief | g0 | fail | B-PARSE |
| garbled-brief | g0 | malformed | B-PARSE |
| dup-capability | g0 | fail | B-CAP |
| bad-tier | g0 | fail | B-TIER |
| prod-sandbox-full | g0 | fail | B-PROD |
| malformed-ledger-line | merge | malformed | L-PARSE |
| bad-claim-id | merge | fail | L-ID |
| bad-kind | merge | fail | L-ENUM |
| no-evidence | merge | fail | L-EVID |
| unauthorized-capability | merge | fail | L-CAP ★ |
| wrong-class-capability | merge | fail | L-CAP (class-mismatch arm) |
| dup-claim-key | merge | fail | L-KEY |
| ghost-round | merge | fail | L-ROUND |
| clm-in-statement | merge | fail | L-NAME |
| single-class-auto-confirm | merge | fail | L-CONFIRM ★ |
| code-test-pair-confirm | merge | fail | L-PAIR (the same-channel trap) |
| auto-accident | merge | fail | L-ACC ★ |
| auto-deferred | merge | fail | L-DEF |
| bad-verdict-shape | merge | fail | L-VERDICT |
| asymmetric-lock | merge | fail | L-LOCKSYM |
| contradiction-auto-resolved | merge | fail | L-LOCK ★ |
| malformed-journal-line | merge | malformed | P-PARSE |
| probe-without-journal | merge | fail | P-JRN ★ |
| ghost-journal-capability | merge | fail | P-CAP |
| mutating-probe-on-read-only | merge | fail | P-TIER ★ + finding `class:"bridge-defect"` |
| probe-on-none-tier | merge | fail | P-TIER (`none` arm) |
| broken-round-seq | dry | fail | D-SEQ |
| not-dry | dry | fail | D-DRY |
| handoff-locked | handoff | fail | S-LOCK |
| unmapped-concept | handoff (ordering) | fail | S-MAP |
| ghost-annotation | handoff | fail | R-RESOLVE |
| deferred-in-body | handoff | fail | R-STATUS (deferred passes G5, so G4 is reachable) |
| confirmed-claim-dropped | handoff | fail | R-COV ★ |
| accident-leaked-to-render | handoff | fail | R-ACC ★ (stale render from before the accident verdict — one injected defect; R-DET co-fires, owner is R-ACC) |
| hand-edited-render | handoff | fail | R-DET ★ nondeterministic render |
| missing-render-header | handoff | fail | R-HDR |
| wrong-context-concept | handoff (ordering) | fail | R-CTX |
| code-smell-prose | handoff | pass | warnOwner R-SMELL |
| oversized-context | handoff | pass | warnOwner R-SIZE |
| wrong-reason-trap | handoff | fail | owner R-ACC, trapNotOwner L-CONFIRM (both fire; owner pinned) |
| valid-single | handoff `--no-checks` | broken-test | vacuous |
| missing-engagement | merge | broken-test | no `anamnesis/` dir |

**`valid-single` content obligations (so every positive arm is real).** Capabilities of all five
classes including probe tiers `read-only`, `sandbox-full`, and `none`; a ledger with **every kind**,
pair-confirmed claims over **≥3 distinct legal S3 pairs**, a verdict-confirmed single-class claim, an
accident with verdict (and its concept **also owned by a confirmed claim** — F4's "unless" arm
exercised positively), a deferred with verdict (renders in Open questions), a resolved former conflict
(symmetric `conflictsWith` + verdicts); a journal with a GET on read-only, a POST on sandbox-full,
zero entries for the `none` capability, 4 round markers; `domain.md` = the **exact S6 render**.

**`manifest.json` field semantics.** Per fixture entry:

| Field | Meaning |
|-------|---------|
| `dir` | the fixture directory under `scripts/fixtures/` |
| `mode` | the `--gate` value to run (`g0`/`merge`/`dry`/`render`/`handoff`) |
| `context` | the `--context` slug (omitted ⇒ implicit `-`) |
| `status` | the expected harness status (`pass`/`fail`/`malformed`/`broken-test`) |
| `owner` | the check ID that must fire on a `fail`/`malformed` (null on a `pass`) |
| `warnOwner` | the warn-only check expected to fire on a `pass`-with-warning (R-SMELL/R-SIZE) |
| `trap` / `trapOwner` / `trapNotOwner` | the wrong-reason trap: `trapOwner` is the pinned owner that MUST be the failing check; `trapNotOwner` is the co-present defect that must NOT be reported as the reason |
| `vacuous` | true for the `--no-checks` fixture (⇒ `broken-test`, zero checks) |
| `brokenTest` | true for missing-dir/missing-engagement fixtures (⇒ `broken-test`) |
| `args` | the exact extra CLI args (e.g. `["--no-checks"]`) |

## 6 — TRUE ❌-rule → owner-check → negative-fixture reconciliation (35 rows)

Every ❌-severity catalog rule (35 of the 37; F8/F9 are ⚠️) has BOTH (a) a mechanical owner check and
(b) a dedicated on-disk negative fixture. The selftest's COVERAGE array runs every negative below and
asserts its owner fires.

| ❌ rule | Owner check | Gate | On-disk negative fixture |
|---|---|---|---|
| A1 | B-PARSE | G0 | `missing-brief` (fail) / `garbled-brief` (malformed) |
| A2 | B-CAP | G0 | `dup-capability` |
| A3 | B-TIER | G0 | `bad-tier` |
| A4 | B-PROD | G0 | `prod-sandbox-full` |
| B1 | L-PARSE | G1 | `malformed-ledger-line` (malformed) |
| B2 | L-ID | G1 | `bad-claim-id` |
| B3 | L-ENUM | G1 | `bad-kind` |
| B4 | L-EVID | G1 | `no-evidence` |
| B5 | L-CAP | G1 | `unauthorized-capability` ★ / `wrong-class-capability` |
| B6 | L-KEY | G1 | `dup-claim-key` |
| B7 | L-ROUND | G1 | `ghost-round` |
| B8 | L-NAME | G1 | `clm-in-statement` |
| C1 | L-CONFIRM | G1 | `single-class-auto-confirm` ★ |
| C2 | L-PAIR | G1 | `code-test-pair-confirm` |
| C3 | L-ACC | G1 | `auto-accident` ★ |
| C4 | L-DEF | G1 | `auto-deferred` |
| C5 | L-VERDICT | G1 | `bad-verdict-shape` |
| C6 | L-LOCKSYM | G1 | `asymmetric-lock` |
| C7 | L-LOCK | G1 | `contradiction-auto-resolved` ★ |
| D1 | P-PARSE | G2 | `malformed-journal-line` (malformed) |
| D2 | P-JRN | G2 | `probe-without-journal` ★ |
| D3 | P-CAP | G2 | `ghost-journal-capability` |
| D4 | P-TIER | G2 | `mutating-probe-on-read-only` ★ / `probe-on-none-tier` (bridge-defect) |
| E1 | D-SEQ | G3 | `broken-round-seq` |
| E2 | D-DRY | G3 | `not-dry` |
| E3 | S-UNCONF | G5 | `valid-multi` handoff (catalog) ★ |
| E4 | S-LOCK | G5 | `handoff-locked` |
| E5 | S-MAP | G5 | `unmapped-concept` |
| F1 | R-RESOLVE | G4 | `ghost-annotation` |
| F2 | R-STATUS | G4 | `deferred-in-body` |
| F3 | R-COV | G4 | `confirmed-claim-dropped` ★ |
| F4 | R-ACC | G4 | `accident-leaked-to-render` ★ |
| F5 | R-DET | G4 | `hand-edited-render` ★ |
| F6 | R-HDR | G4 | `missing-render-header` |
| F7 | R-CTX | G4 | `wrong-context-concept` |

**Coverage floor.** The selftest asserts every ❌ rule has **≥1 positive** (a passing owner check over
`valid-single` and/or `valid-multi`) **AND** the named negative — as a **distinct-rule count**. The
harness emits `coverage.behaviorsWithPosAndNeg`, and the selftest asserts that constant **=== this
table's length (35)**. If any ❌ rule lacks either side, the selftest fails.

## 7 — Selftest obligations (`scripts/selftest.mjs`)

`selftest.mjs` runs the harness over every `manifest.json` fixture and asserts the **exact
`(status, owner, exit)`** for each. Beyond that floor it runs these PARTS, and exits 0 only on full
pass, runtime **< 5 min**:

- **Wrong-reason trap.** `wrong-reason-trap` carries two co-present defects (an accident leaked into
  the render AND a confirmed claim lacking a legal pair). Selftest asserts the failing-check ID equals
  the pinned **owner R-ACC** AND that the co-present **L-CONFIRM also fires** — proving the owner is
  reported for the stated reason, not merely that *some* check failed.
- **Matrix unit PART.** A direct test of the S3 matrix: every one of the nine legal pairs confirms;
  `{code,test}` and every same-class pair do **not** confirm.
- **Dry-arithmetic unit PART.** D-DRY / D-SEQ over synthetic journals: `N < 2` fails dry; a claim with
  `round ∈ {N−1, N}` fails dry; contiguous markers from 1 pass D-SEQ, a gap/repeat/non-1-start fails.
- **RENDERER-HONESTY PART.** Mutating a `confirmed` claim's `statement` in a **scratch copy** of a
  valid ledger **changes the in-memory S6 render bytes** and **flips R-DET** against the stale on-disk
  file — proving the renderer is the oracle, not the file.
- **Gate-interplay PART.** `valid-multi`: the **ordering** context hands off green while the
  **catalog** context fails S-UNCONF **in the same engagement** — proving per-context scoping.
- **Vacuous PART.** the `--no-checks` run reports `broken-test` with zero checks executed.
- **Byte-identical double-runs.** the harness over `valid-single` produces byte-identical stdout on two
  consecutive runs (stable key order, sorted arrays, no clock/random in asserted positions).
- **Coverage floor.** the 35-row §6 table is asserted as the positive+negative-per-❌-rule floor, and
  `coverage.behaviorsWithPosAndNeg === 35` (the harness constant === the table length).

## 8 — Status routing for the skill

The harness routing table is **binding** — fix the artifact or the script per the verdict, never
override the oracle:

- **`fail` → fix the named engagement artifact.** The owner check names the defect (e.g. L-CONFIRM ⇒
  the claim was auto-confirmed without a legal pair or verdict; S-UNCONF ⇒ adjudicate the unconfirmed
  claims in the context; R-COV ⇒ a confirmed claim is missing from the render — re-render). A
  `bridge-defect` finding (P-TIER) is a genuine tier breach: an unauthorized probe was logged — stop
  and remediate, it is not a judgment call.
- **`malformed` → fix the artifact's shape.** A ledger or journal line that is not valid closed-schema
  JSON (L-PARSE / P-PARSE), or a garbled brief Capabilities table (B-PARSE). Repair the artifact's
  syntax so it parses; the gate then re-evaluates its content.
- **`broken-test` → fix the script/env.** A missing `<project-dir>` or `anamnesis/` directory, a
  missing required `--context`, `--no-checks` (the vacuous guard), a reconciliation mismatch, or a
  check that threw. This is a harness/environment problem, not an engagement defect.

In all three cases the oracle is authoritative: when a gate STOPs, independently verify whether the
blocker is a genuine artifact defect or an over-strict/buggy check — then fix the artifact or the
script, **never** silence or override the harness.
