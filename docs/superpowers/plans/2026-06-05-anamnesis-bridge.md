# Anamnesis Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the anamnesis bridge — `commands/anamnesis.md` (the orchestrator session), `skills/anamnesis/` (SKILL.md, closed rule catalog, zero-dependency harness implementing gates G0–G5 + the deterministic renderer, adversarial selftest + fixtures), the seeded-accident fixture engagement, and the README brownfield section — with **zero changes to any existing skill or command**.

**Architecture:** Same agent-orchestrated process that built the eleven pipeline skills: catalog expert → simulation designer → implementer (harness + adversarial selftest + fixtures + SKILL.md) → spec-compliance review → fix round → end-to-end engagement run on the seeded legacy fixture. The controller dispatches each agent with the complete contract inline (agents never read this plan or the design spec unless told a specific section), reviews results, and commits per task on branch `schema-therapy-anamnesis-bridge`.

**Tech Stack:** Node ≥18 plain ESM, **zero dependencies** (JSONL + closed-markdown-table parsing + a deterministic ledger→domain compiler — no engine exists for evidence-gated claim ledgers, so the oracle is vendored). Markdown/JSONL artifacts in the per-project `anamnesis/` engagement workspace (OUTSIDE `specs/` — drift-police never audits it) + `domain.md` renders at the project root.

**Spec:** `docs/superpowers/specs/2026-06-05-anamnesis-bridge-design.md` (commit `44714b8`) is the sole requirements authority. Where the spec leaves a detail open, §S below pins it; every pin must be dictated identically to every agent that touches it.

---

## §C — Suite conventions (dictate VERBATIM to every implementer/expert agent)

These are the conventions of the eleven built skills. Every new component must match them exactly:

1. Layout: `SKILL.md` (lean, <320 lines, staged/progressive disclosure, imperative) + `references/validation-rules.md` + `references/simulation.md` + `scripts/` (`harness.mjs`, `selftest.mjs`, `lib/*.mjs`, `fixtures/` + `manifest.json`). **No `sources/` dir for this skill** — there is no external formalism; the catalog's Source column cites the design spec as `[SPEC]` (analogous to `[PLAN]` in the pipeline skills).
2. Harness: sole pass/fail authority; stdout = stable-ordered machine-readable JSON summary (status, per-check results, counts, coverage/edge reconciliation, findings); stderr = diagnostics; exit codes 0 pass / 1 fail / 2 malformed / 3 broken-test; zero parsed checks ⇒ broken-test (never vacuous green); byte-identical double-runs (no clock/random values in asserted positions; fresh state per run).
3. Check classes: mechanical/lint (B*/L*/P*/D*/S* here), resolution (R*), reason-qualified negatives proven by dedicated fixtures, agent-judged (AJ*, non-blocking, closed enumerated verdict schemas, excluded from reconciliation). Closed assertion grammar — never extended ad hoc.
4. Every ❌ catalog rule ends with a mechanical owner check + a dedicated negative fixture; ship the full ❌-rule → owner-check → fixture reconciliation table in `references/simulation.md`, and the selftest's COVERAGE array asserts ≥1 positive + ≥1 negative per ❌ rule (distinct-rule count).
5. Mandatory fixtures: valid set(s), one owner-pinned negative per ❌ rule, a wrong-reason trap (two co-present defects; manifest pins the owner; selftest proves the owner fires for the stated reason), `vacuous` (⇒ exit 3), missing-input variants (⇒ broken-test). Every negative carries EXACTLY ONE injected defect (a fixture failing for any other reason is itself broken-test). Note: this skill has **no upstream pipeline artifacts**, so there is no `upstream-defect` finding class — its analogue is the **`bridge-defect`** finding class (S8) for tier breaches.
6. Adversarial selftest: runs every manifest fixture asserting exact status + owner + exit; proves the wrong-reason trap, the vacuous guard, counter/edge-reconciliation conflation detection, and byte-identical double-runs. Exit 0 only on full pass. Keep runtime < 5 min.
7. Zero deps ⇒ no `scripts/package.json`, no self-install path. The JSON `tooling` block states `externalEngine: 'none (no engine exists for evidence-gated claim ledgers; parser + renderer vendored)'`.
8. Emitted-document headers: the rendered domain file opens with the `.md` comment-dialect provenance header pinned in S6 (its fingerprint is the **ledger**, not pipeline artifacts — the bridge sits upstream of 01, which fingerprints the domain file itself).
9. SKILL.md body: (a) mechanical intake table at top (evidence/claims → render elements → the 01 elements that extract them — carry the spec's Output-contract table); (b) artifact contract (engagement workspace layout + the S1–S6 closed formats by reference); (c) run-time procedure per mode (professor gate catalog-constrained, zero ❌, bounded 5 per loop non-pooled; lint/simulation = the harness with the routing table — `malformed`/`broken-test` → fix the artifact or script per the verdict, never override the oracle; emit + fixed-format report with counts table and `Iterations to convergence: N`).
10. Description frontmatter: scoped strictly to the schema-therapy anamnesis bridge (the OPTIONAL brownfield entry), naming inputs/outputs, explicitly disclaiming general legacy-archaeology / reverse-engineering / code-migration territory.
11. Self-containment: the skill imports/reads nothing outside its own directory at runtime; sibling skills are style references only (copy patterns in, never import). Catalog: lettered themed rules, each Detect/Fix/Severity(❌/⚠️/ℹ️)/Source; honest severities — a harness check's blocking behavior must match its catalog rule's severity (⚠️ never blocks).
12. ISOLATION DIRECTIVE in every agent prompt: "Do not invoke or read any installed skills or other plugins. Authorities: this prompt + the named files."

## §S — Pinned seams (binding; quote the relevant pin VERBATIM to every agent that touches it)

The spec is authoritative for everything it states. The pins below resolve ONLY what it leaves open.

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

Rules: `Capability` unique, `^[a-z][a-z0-9-]*$`; `Class ∈ {code, test, doc, data, probe}`; `Tier` and `Environment` are non-`-` **iff** Class=probe; `Tier ∈ {none, browse-only, read-only, sandbox-full}`; Environment `production` (case-insensitive) ⇒ Tier ≠ `sandbox-full`; `Access` non-empty; ≥1 capability row. Absent brief file ⇒ `fail` (B-PARSE: no brief, no mining); a brief whose Capabilities table is syntactically unparseable ⇒ `malformed` (exit 2).

### S2 — `anamnesis/ledger.jsonl` schema + claim key + contradiction lock (G1 artifact)

One line per claim, holding the claim's **current** state ("append-only" is doctrine — claims are never deleted, accidents are recorded forever; an evidence merge / status change / verdict **rewrites that claim's line in place**, which is what makes "IDs unique" satisfiable). Closed field set (no others):

```json
{"id":"CLM-0042","concept":"order","kind":"transition",
 "statement":"An order in 'shipped' can return to 'pending' via manual support action",
 "evidence":[{"class":"code","source":"OrderService.java:412","capability":"repo"},
             {"class":"data","source":"audit_log: 137 occurrences 2019-2025","capability":"db-ro"}],
 "status":"confirmed","round":3,
 "verdict":{"by":"human","round":4,"reason":"support flow confirmed by ops lead"},
 "conflictsWith":["CLM-0017"]}
```

- `id` `^CLM-\d{4,}$`, unique. `concept` `^[a-z][a-z0-9_]*$` (snake_case; it is the render's `###` heading and the context map's vocabulary). `kind ∈ {actor, event, state, transition, rule, term, relation}`. `statement` non-empty, MUST NOT contain the substring `CLM-` (the annotation is appended by the renderer, never embedded). `evidence` ≥1 of `{class ∈ {code,test,doc,data,probe}, source non-empty, capability}`; `capability` resolves to a brief Capability by exact string AND the evidence `class` equals that capability's `Class` (evidence without an authorizing capability is the context-leak signature — hard fail). `status ∈ {unconfirmed, confirmed, accident, deferred}`. `round` = round of last **mining** add/update (verdicts do NOT touch it), integer ∈ [1, max journal round marker].
- `verdict` (optional) closed shape `{"by":"human","round":<int≥1>,"reason":"<non-empty one line>"}` — required for: `accident` (always), `deferred` (always), `confirmed` when triangulation is illegal (single class, or an illegal pair per S3), and ANY status change away from `unconfirmed` on a claim with non-empty `conflictsWith`.
- `conflictsWith` (optional) — the contradiction lock's representation: array of CLM ids that must resolve, and the link must be **symmetric** (if A lists B, B lists A). Conflicts are DETECTED by the merge step (agent judgment), RECORDED here, and NEVER auto-resolved: the harness blocks confirmation of a linked claim without a verdict, regardless of triangulation.
- **Claim key** = `(concept, kind, normalize(statement))` where `normalize` = lowercase, collapse internal whitespace to single spaces, trim, strip one trailing `.`/`!`/`?`. Duplicate keys are a hard fail (same key from two miners = ONE claim, merged evidence — the merge step's job; near-duplicates are flagged for orchestrator merge/split, never silently unioned).

### S3 — Independence matrix (pinned, closed)

A confirmation pair must span genuinely independent observation channels. Over `{code, test, doc, data, probe}`: a pair `{a,b}` confirms iff `a ≠ b` AND `{a,b} ≠ {code,test}` (tests assert what code does — same channel). Legal pairs (exhaustive): code+doc, code+data, code+probe, test+doc, test+data, test+probe, doc+data, doc+probe, data+probe. Same-class pairs never confirm. A claim is triangulation-confirmable iff its evidence set contains ≥1 legal pair.

### S4 — `anamnesis/probes.log` closed format (the engagement journal: G2 + G3 substrate)

JSONL, two entry kinds (no others; an unparseable line ⇒ `malformed`):

```json
{"kind":"round","round":3}
{"kind":"probe","round":3,"claim":"CLM-0042","capability":"api-stage","method":"GET","target":"/orders/42","outcome":"order 42 shows status pending after support reset"}
```

- A `round` marker is appended when a mining round completes — **including zero-yield rounds** (this is what makes the dry gate and resume purely disk-derivable; the current round on resume = max marker). Markers must be strictly increasing by 1 from 1 (D-SEQ).
- `probe` entries: `claim` resolves to a ledger id; `capability` resolves to a brief probe-class capability; `method` from the closed verb set `{GET, HEAD, OPTIONS, QUERY, READ, VISIT, POST, PUT, PATCH, DELETE, EXECUTE, WRITE, SUBMIT}`; `target` + `outcome` non-empty.
- **Tier discipline (closed, verified after the fact):** tier `none` ⇒ zero probe entries for that capability; `browse-only` ⇒ method ∈ {VISIT, READ}; `read-only` ⇒ method ∈ {GET, HEAD, OPTIONS, QUERY, READ, VISIT}; `sandbox-full` ⇒ any closed verb. Every probe-class **evidence** line on a claim must resolve to ≥1 journal probe entry matching `(claim id, capability)`.

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

Context slugs `^[a-z][a-z0-9_]*$`; each concept listed exactly once across all contexts; when the map exists, every ledger concept must be mapped (S-MAP). Map absent ⇒ ONE implicit context containing every concept, rendering `domain.md`. Map present with exactly 1 context ⇒ also `domain.md`. Map with >1 context ⇒ one `domain.<slug>.md` per context. The proposed map is itself an adjudication item — the file is only ever written from a human-confirmed map.

### S6 — Render format (the deterministic ledger→domain compiler)

The renderer is mechanical and lives IN the harness (`render` mode) — that is what makes "deterministic ledger → domain file" and the G4 byte-identical double-render checkable. Pinned output, byte-exact:

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

- Section order fixed: Actors, Domain events, Lifecycles, Rules, Terms, Relations, Open questions. Empty sections omitted entirely. Kind→section: actor→Actors; event→Domain events; state+transition→Lifecycles (grouped `### <concept>`, concepts sorted ascending, claims sorted by id within); rule→Rules; term→Terms; relation→Relations. Within every other section, claims sorted by id ascending.
- Body renders **`confirmed` claims of the context only**, statement verbatim + one trailing ` [CLM-nnnn]`. **Open questions** renders `deferred` and contradiction-locked claims of the context (statement + id) — nothing else; `accident` claims NEVER render and `unconfirmed` (unlocked) claims never render anywhere.
- The renderer writes the file (`domain.md` / `domain.<slug>.md` per S5) into the project dir and reports `{file, context, sha256, claims, openQuestions}` in the JSON summary. The "event-sequenced lifecycle" phrasing discipline (statements name their producing events) is a SKILL.md drafting obligation on the miners/merge, professor-checked — not renderer logic.

### S7 — Harness CLI, modes, summary, exits

```
node scripts/harness.mjs <project-dir> --gate <g0|merge|dry|handoff|render> [--context <slug>] [--no-checks]
```

`<project-dir>` contains `anamnesis/` + the domain file(s). Gate→mode mapping (each mode runs every gate listed, in order, and marks the rest `skipped` in the summary's `gates` block):

| Mode | Gates run | When the command uses it |
|---|---|---|
| `g0` | G0 | after composing/amending the brief |
| `merge` | G0 G1 G2 | after every mining-round merge |
| `dry` | G0 G1 G2 G3 | to certify Phase 1 may close |
| `render` | G0 G1 G2 + emit the S6 render for `--context` | Phase 3, before G4 |
| `handoff` | G0 G1 G2 G5 G4 (both scoped to `--context`) | the boundary oracle before dispatching event-storming |

`--context` defaults to the implicit single context (`-`) when the map is absent or has one context; required when the map has >1. Missing `<project-dir>` or `anamnesis/` ⇒ broken-test. `--no-checks` ⇒ broken-test (vacuous guard). Summary JSON (stable key order, sorted `checks[]`/`findings[]`): `{skill:'anamnesis', projectDir, mode, context, tooling, status, gates:{g0,g1,g2,g3,g5,g4: 'pass'|'fail'|'skipped'}, counts:{claims:{total,unconfirmed,confirmed,accident,deferred,locked}, evidence:{code,test,doc,data,probe}, contexts, rounds, probes, checks:{mechanical,resolution,exactValue,negative,agentJudged,total}, edgesWalked, edgesExpected}, renders:[{file,context,sha256,claims,openQuestions}], reconciled, coverage:{behaviorsWithPosAndNeg}, checks:[], findings:[]}`. Findings may carry `class:"bridge-defect"` (tier breaches, G2) — a finding class, never a fifth status. Exits 0/1/2/3 per §C-2.

### S8 — Check-ID table (closed; catalog rule ↔ owner check, gate by prefix)

| Gate | Theme | Rule | Owner | Severity | Checks |
|---|---|---|---|---|---|
| G0 | A1 | brief present + closed S1 format | B-PARSE | ❌ (absent ⇒ fail; garbled table ⇒ malformed) | file exists, sections present, table parses |
| G0 | A2 | capability rows well-formed | B-CAP | ❌ | unique snake names, closed Class, non-empty Access, ≥1 row |
| G0 | A3 | probe tier/environment discipline | B-TIER | ❌ | Tier+Environment iff probe; Tier in closed set |
| G0 | A4 | production never sandbox-full | B-PROD | ❌ | env `production` ⇒ tier ≠ sandbox-full |
| G1 | B1 | every line parses (closed JSON schema) | L-PARSE | ❌ → `malformed` | JSON object, exactly the S2 fields |
| G1 | B2 | id format + uniqueness | L-ID | ❌ | `^CLM-\d{4,}$`, no duplicates |
| G1 | B3 | closed enums | L-ENUM | ❌ | kind/status/evidence.class in closed sets |
| G1 | B4 | evidence ≥1, fields non-empty | L-EVID | ❌ | |
| G1 | B5 | capability authorization (context-leak signature) | L-CAP | ❌ | exact-string brief resolution + class match |
| G1 | B6 | claim-key uniqueness | L-KEY | ❌ | S2 normalize |
| G1 | B7 | rounds monotonic | L-ROUND | ❌ | 1 ≤ round ≤ max journal marker |
| G1 | B8 | naming hygiene | L-NAME | ❌ | concept snake_case; no `CLM-` in statement |
| G1 | C1 | `confirmed` ⇒ legal pair OR verdict | L-CONFIRM | ❌ | S3 matrix |
| G1 | C2 | code+test (and same-class) never confirms | L-PAIR | ❌ | the pinned matrix's negative arm |
| G1 | C3 | `accident` ⇒ human verdict, always | L-ACC | ❌ | |
| G1 | C4 | `deferred` ⇒ human verdict | L-DEF | ❌ | |
| G1 | C5 | verdict closed shape | L-VERDICT | ❌ | `{by:"human",round≥1,reason}` |
| G1 | C6 | conflict links resolve + symmetric | L-LOCKSYM | ❌ | |
| G1 | C7 | contradiction never auto-resolved | L-LOCK | ❌ | linked claim leaves `unconfirmed` only with a verdict |
| G2 | D1 | journal lines parse (closed S4 schema) | P-PARSE | ❌ → `malformed` | |
| G2 | D2 | probe evidence resolves to a journal entry | P-JRN | ❌ | match (claim, capability) |
| G2 | D3 | journal capability resolves to a brief probe capability | P-CAP | ❌ | |
| G2 | D4 | tier discipline (closed verb sets) | P-TIER | ❌, finding `class:"bridge-defect"` | S4 table incl. `none` ⇒ zero entries |
| G3 | E1 | round markers contiguous from 1 | D-SEQ | ❌ | |
| G3 | E2 | dry certified | D-DRY | ❌ | max marker N ≥ 2 AND no claim.round ∈ {N−1, N} |
| G5 | E3 | zero `unconfirmed` in the context | S-UNCONF | ❌ | |
| G5 | E4 | zero contradiction-locked in the context | S-LOCK | ❌ | |
| G5 | E5 | context map sound + total | S-MAP | ❌ | S5 rules; every ledger concept mapped |
| G4 | F1 | every `[CLM-…]` resolves | R-RESOLVE | ❌ | |
| G4 | F2 | annotation status legality | R-STATUS | ❌ | body ⇒ confirmed; Open questions ⇒ deferred/locked |
| G4 | F3 | reverse coverage | R-COV | ❌ | every confirmed claim of the context appears exactly once |
| G4 | F4 | zero accident leakage | R-ACC | ❌ | no accident id; no accident `concept` token in prose unless a confirmed claim shares that concept |
| G4 | F5 | double-render byte-identical | R-DET | ❌ | file bytes == in-memory S6 re-render |
| G4 | F6 | provenance header present + sha matches ledger | R-HDR | ❌ | |
| G4 | F7 | context-map consistency | R-CTX | ❌ | file ↔ map entry; only that context's concepts; S5 naming |
| G4 | F8 | code-smell in prose | R-SMELL | ⚠️ warn-only | regexes: `/\b\w+\.(java|py|js|ts|rb|php|cs|go|sql)\b/`, `/\w+::\w+/`, `/\w+\(\)/`, `/\b(SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,80}\b(FROM|INTO|SET)\b/i` |
| G4 | F9 | altitude control | R-SIZE | ⚠️ warn-only | rendered body claims > 120 ⇒ "this context is telling you it is two contexts" |

37 rules; **35 ❌-mechanizable** (R-SMELL/R-SIZE warn) — the coverage floor constant.

### S9 — Fixture set (dir → mode/context → status → owner)

Each fixture dir is a self-contained mini engagement (`anamnesis/brief.md`, `ledger.jsonl`, `probes.log` [, `context-map.md`] [, `domain*.md`]). The ten spec-named fixtures are marked ★.

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
| accident-leaked-to-render | handoff | fail | R-ACC ★ (a stale render from before the accident verdict — one injected defect; R-DET co-fires, owner is R-ACC) |
| hand-edited-render | handoff | fail | R-DET ★ nondeterministic render |
| missing-render-header | handoff | fail | R-HDR |
| wrong-context-concept | handoff (ordering) | fail | R-CTX |
| code-smell-prose | handoff | pass | warnOwner R-SMELL |
| oversized-context | handoff | pass | warnOwner R-SIZE |
| wrong-reason-trap | handoff | fail | owner R-ACC, trapNotOwner L-CONFIRM (both fire; owner pinned) |
| valid-single | handoff `--no-checks` | broken-test | vacuous |
| missing-engagement | merge | broken-test | no `anamnesis/` dir |

`valid-single` content obligations (so every positive arm is real): capabilities of all five classes incl. probe tiers `read-only`, `sandbox-full`, and `none`; ledger with every kind, pair-confirmed claims over ≥3 distinct legal S3 pairs, a verdict-confirmed single-class claim, an accident with verdict (and its concept also owned by a confirmed claim — F4's "unless" arm exercised positively), a deferred with verdict (renders in Open questions), a resolved former conflict (symmetric `conflictsWith` + verdicts); journal with a GET on read-only, a POST on sandbox-full, zero entries for the `none` capability, 4 round markers; `domain.md` = the exact S6 render.

### S10 — Seeded fixture engagement (the bridge's `test-workspace/`)

Location: `plugins/schema-therapy/skills/anamnesis/test-workspace/` (skill-self-containment; the plugin-level `test-workspace/` stays the pipeline's worked example and is untouched). A deliberately rotten small order-management legacy app — domain DISTINCT from conference-ticketing to avoid coupling. Layout:

```
test-workspace/
  legacy-app/
    src/models/order.js        ORDER_STATUS enum incl. dead 'ARCHIVED' + misleading comment
    src/models/invoice.js      entity named Invoice that is actually a quotation
    src/order_service.js       shipped→pending support-reset path; `if (order.total > 9999) sleep(500)` 2014 TODO workaround
    src/refund.js              rounding that favors the customer by one cent (the bug)
    test/refund_test.js        pins the WRONG rounding value (bug-compatible behavior)
    docs/billing.md            states quotes are stored in the invoices table; nothing posts to accounting
    docs/ops-runbook.md        documents the support reset flow
    ui/strings.json            users' word for shipment is "Parcel"
    data/order_status_counts.csv   status histogram — zero ARCHIVED rows
    data/audit_log_extract.csv     incl. 137 shipped→pending support resets
  SEEDED.md                    human-readable answer key (NEVER readable by miners)
  seeded.json                  machine answer key for the selftest acceptance PART
  anamnesis/                   produced by the Task-7 engagement run (brief, ledger, probes.log)
  domain.md                    produced by the Task-7 handoff render
```

Seeds (each row = SEEDED.md entry + `seeded.json` matcher; matchers are substrings expected in claim statements):

| Seed | Planted as | Expected end state |
|---|---|---|
| ACC-1 | dead enum value `ARCHIVED` (enum + zero data rows) | claim ends `accident` (or open question adjudicated to accident); `ARCHIVED` never in domain.md |
| ACC-2 | refund rounding favoring customer, pinned by test | `accident` — bug-compatible behavior, never rendered |
| ACC-3 | claim "an invoice is a posted billing document" (mined from the name) | `accident`; the value claim "the entity named invoice is a quotation; nothing posts to accounting" ends `confirmed` (doc+data) and renders |
| ACC-4 | `total > 9999` sleep workaround branch | `accident` — perf accident, never rendered |
| VAL-1 | invariant: a shipped order can never be cancelled (code + zero shipped→cancelled in audit data) | `confirmed`, renders |
| VAL-2 | shipped→pending via manual support action (code + 137 audit rows + runbook) | `confirmed`, renders |
| VAL-3 | term: users call a shipment a "parcel" (ui-strings + docs) | `confirmed`, renders |
| VAL-4 | order lifecycle placed→pending→paid→shipped (code + data histogram) | `confirmed` transitions, render event-sequenced |

`seeded.json`: `{"accidents":[{"id":"ACC-1","match":"ARCHIVED"},…],"values":[{"id":"VAL-2","match":"manual support action"},…]}` — one matcher per seed, chosen so it appears verbatim in the corresponding claim statement.

### S11 — Packaging + boundary doctrine strings

- Files: `plugins/schema-therapy/commands/anamnesis.md`; `plugins/schema-therapy/skills/anamnesis/{SKILL.md, references/validation-rules.md, references/simulation.md, scripts/{harness.mjs, selftest.mjs, lib/*.mjs, fixtures/**, fixtures/manifest.json}, test-workspace/**}`. Zero edits to any other skill, command, agent, or script.
- The doctrine sentence, quoted verbatim wherever the boundary is stated: **"The only thing that ever crosses from the legacy system into the pipeline is the rendered set of confirmed claims — never code, never chat, never probe output."**
- The three fences, stated in both the command and SKILL.md: the orchestrator never holds legacy content; the harness ensures the ledger never holds unauthorized content; the render gate ensures the pipeline never sees unconfirmed content.
- Skill modes (the command dispatches each as a FRESH isolated subagent run carrying ONLY the named crossing payload): **Brief** (confirmed capability manifest → brief.md → g0), **Merge** (claim lines + round marker + probe records → ledger/journal append → merge gate; non-claim output discarded + logged), **Adjudicate** (confirmed human verdicts → verdict objects on claims → merge gate; regenerate `queue.md`/`topics.md` views), **Segment** (confirmed context map → context-map.md → S-MAP via handoff-gate preflight), **Handoff** (context slug → G5 → render → G4 → report).
- lib decomposition (implementer follows unless it finds a strictly simpler split, documented): `lib/brief.mjs` (S1 parse), `lib/ledger.mjs` (S2 schema + keys + S3 matrix + lock legality), `lib/journal.mjs` (S4 parse + tier sets), `lib/contextmap.mjs` (S5), `lib/render.mjs` (S6 compiler), `lib/checks.mjs` (check records + reconciliation arithmetic, copied pattern from siblings, never imported).

## §T — Reusable dispatch templates (complete; tasks parameterize them)

- **T-catalog**: produce `references/validation-rules.md` only. Carries: §C 1/3/10/11 verbatim; S1–S8 verbatim; the design-spec sections "The claims ledger", "Harness & gates", "Output contract" copied in; the gherkin skill's catalog named as the style reference (lettered themes, Detect/Fix/Severity/Source per rule, a theme index with ❌ counts, "Pass condition: zero ❌"). Require: exactly the S8 rule set (37 rules, themes A–F), honest severities, every rule Source-cited `[SPEC]` with the spec phrase it mechanizes. Report themes/counts/3 example rules.
- **T-simulation**: produce `references/simulation.md` only, after reading the catalog. Carries: §C 2–8 verbatim; S7–S9 verbatim. Pins: oracle architecture (vendored closed-format parsers + the S6 renderer as the strongest oracle — G4's R-DET re-renders, it never trusts the file), the edge-reconciliation formula (edgesExpected = per-claim schema+status edges + per-probe-evidence journal edges + per-journal-entry parse edges + per-annotation resolve edges + per-context map edges; zero executed checks ⇒ broken-test), the TRUE ❌-rule → owner → fixture reconciliation table (35 rows from S8×S9), and the closed `bridge-defect` finding class. Report check counts/fixture count/tensions.
- **T-implementer**: build `scripts/lib/*.mjs`, `scripts/harness.mjs`, `scripts/fixtures/**` + `manifest.json`, `scripts/selftest.mjs`, `SKILL.md` per the two references. Carries: §C in full; S1–S9 + S11 verbatim; style siblings named (`ui-flows/scripts/` for the zero-dep harness + selftest + manifest patterns; `scope.md`/`gherkin/SKILL.md` for doc voice) — read patterns, never import. Selftest obligations (beyond §C-6): a matrix unit PART (every legal pair confirms, code+test and same-class do not), a dry-arithmetic unit PART (D-DRY/D-SEQ over synthetic journals), a RENDERER-HONESTY PART (mutating a confirmed claim's statement in a scratch ledger copy CHANGES the render bytes and flips R-DET against the stale file), a gate-interplay PART (valid-multi: ordering hands off green while catalog fails S-UNCONF in the same engagement), and the 35-rule coverage floor with `behaviorsWithPosAndNeg` honesty (harness constant === coverage-table length). RUN selftest to exit 0 and the harness on valid-single twice byte-identically before reporting. Report: selftest tail, valid output, SKILL.md line count, deviations with justification.
- **T-review**: spec-compliance review. Read every file; EXECUTE selftest + valid runs + ≥8 owner-pinned negatives (incl. all ten ★ spec-named fixtures) + vacuous + determinism double-run; verify catalog severity ↔ blocking match, S-pin conformance (spot-check 10 pins), cross-file consistency, documented deviations reconciled not silent; verdict ✅/❌ with numbered findings. Findings → dispatch a fix agent with the verbatim findings; re-verify (selftest + spot-runs) before proceeding.
- **T-engagement** (the Task-7 e2e): an agent that FOLLOWS `commands/anamnesis.md` end-to-end against `skills/anamnesis/test-workspace/legacy-app/` with the human played by a SCRIPTED ADJUDICATOR: at every echo-back/adjudication point, consult `test-workspace/SEEDED.md` for the verdict and record it verbatim. HARD RULES: mining subagents may read ONLY `legacy-app/**` (SEEDED.md and seeded.json are the answer key — a miner reading them is a void run); the orchestrating agent itself never reads `legacy-app/**` (the orchestrator-fence is part of what this run validates); all gates via the harness; bounded per the command. Deliver: the engagement workspace + domain.md + the final handoff-gate JSON + a yield report (claims by status/round, queue length at each adjudication sitting).

Controller triage rule: when a gate STOPs the e2e, independently verify whether the blocker is a genuine engagement-artifact defect or an over-strict/buggy check. The harness routing table is binding — fix the artifact or the script per the verdict (`fail` → artifact, `malformed` → artifact shape, `broken-test` → script/env), never override the oracle.

---

### Task 1: Catalog — `references/validation-rules.md`

**Files:** Create `plugins/schema-therapy/skills/anamnesis/references/validation-rules.md`

- [ ] **Step 1:** Dispatch T-catalog (parameters all in the template — S8 is the rule set).
- [ ] **Step 2:** Verify mechanically: 37 rules present, themes A–F, theme index counts sum, every ❌ rule names its S8 owner check, severities match S8 (`grep -c '^### ' validation-rules.md` → 37).
- [ ] **Step 3:** `git add plugins/schema-therapy/skills/anamnesis && git commit -m "feat(schema-therapy): anamnesis rule catalog (G0-G5)"`

### Task 2: Simulation contract — `references/simulation.md`

**Files:** Create `plugins/schema-therapy/skills/anamnesis/references/simulation.md`

- [ ] **Step 1:** Dispatch T-simulation.
- [ ] **Step 2:** Verify: the ❌-reconciliation table has 35 rows, each naming an S9 fixture that exists in the S9 table; CLI section matches S7 verbatim; `bridge-defect` documented as a finding class, not a status.
- [ ] **Step 3:** `git add plugins/schema-therapy/skills/anamnesis && git commit -m "feat(schema-therapy): anamnesis simulation contract"`

### Task 3: Harness + fixtures + selftest + SKILL.md

**Files:** Create `plugins/schema-therapy/skills/anamnesis/{scripts/lib/*.mjs, scripts/harness.mjs, scripts/fixtures/**, scripts/fixtures/manifest.json, scripts/selftest.mjs, SKILL.md}`

- [ ] **Step 1:** Dispatch T-implementer.
- [ ] **Step 2:** Run `cd plugins/schema-therapy/skills/anamnesis && node scripts/selftest.mjs` → expect `SELFTEST PASSED`, exit 0.
- [ ] **Step 3:** Run the harness twice on the valid fixture and diff: `node scripts/harness.mjs scripts/fixtures/valid-single --gate handoff > /tmp/a.json; node scripts/harness.mjs scripts/fixtures/valid-single --gate handoff > /tmp/b.json; diff /tmp/a.json /tmp/b.json` → no output, both exit 0.
- [ ] **Step 4:** `git add plugins/schema-therapy/skills/anamnesis && git commit -m "feat(schema-therapy): anamnesis harness, fixtures, selftest, SKILL.md"`

### Task 4: Spec-compliance review + fix round

- [ ] **Step 1:** Dispatch T-review.
- [ ] **Step 2:** Route findings to a fix agent (verbatim findings); re-run `node scripts/selftest.mjs` → exit 0.
- [ ] **Step 3:** `git add -A plugins/schema-therapy/skills/anamnesis && git commit -m "fix(schema-therapy): anamnesis review findings"` (skip if zero findings).

### Task 5: Seeded legacy app + answer keys

**Files:** Create `plugins/schema-therapy/skills/anamnesis/test-workspace/{legacy-app/**, SEEDED.md, seeded.json}`

- [ ] **Step 1:** Dispatch an author agent carrying S10 verbatim: write the legacy app files exactly as the S10 layout/seed table specifies (small — each src file ≤ 60 lines, realistic rot: misleading comments on ACC-1, a 2014-dated TODO on ACC-4, the test on ACC-2 asserting the buggy cent), `SEEDED.md` (one section per seed: what was planted, where, the scripted human verdict + its one-line reason), and `seeded.json` with one statement-substring matcher per seed.
- [ ] **Step 2:** Verify: every S10 seed has all three (planted artifact, SEEDED.md entry, seeded.json matcher); `node --check` passes on each `.js` file; grep confirms `ARCHIVED` has zero rows in `order_status_counts.csv`.
- [ ] **Step 3:** `git add plugins/schema-therapy/skills/anamnesis/test-workspace && git commit -m "feat(schema-therapy): seeded rotten legacy fixture + answer key"`

### Task 6: The session command — `commands/anamnesis.md`

**Files:** Create `plugins/schema-therapy/commands/anamnesis.md`

- [ ] **Step 1:** Write the command following `commands/scope.md`'s shape (frontmatter `description` + `argument-hint: "[<project-dir>]"`, numbered sections, host-rules blocks). Required content, in order:
  1. **Title + doctrine.** The S11 doctrine sentence verbatim; the three fences; "the artifact is only ever touched by isolated runs of the `schema-therapy:anamnesis` skill" (mirroring scope's boundary rule).
  2. **§1 Locate the workspace:** `<project-dir>` (default `.`); the engagement layout (S5/S11 file list); resume rule — re-read brief + ledger digest + journal, recompute gaps, continue (nothing lives only in conversation; interruption is a non-event).
  3. **§2 Phase 0 BRIEF:** scope-Gather-style interview over evidence classes/environments/tiers/access (echo-back confirmation per item; the closed tier set; production is never sandbox-full); on confirmation dispatch a fresh **Brief**-mode skill run carrying ONLY the confirmed capability manifest; gate `--gate g0`. No brief, no mining.
  4. **§3 Phase 1 ROUNDS (repeat until dry):** assign (compute gaps from the ledger digest ONLY — unmined capability×scope slices, unconfirmed claims, contradictions); mine (parallel subagents, one per evidence class × slice, carrying brief + assignment + claim-key digest, ISOLATION DIRECTIVE, return value = ONLY S2 claim lines); probe (hypothesis-driven: each probeable unconfirmed claim → one targeted probe within its capability's tier; results as probe-class evidence + S4 journal records); merge (fresh **Merge**-mode skill run: parse claim lines — discard + log anything unparseable; dedup by S2 claim key, merged evidence; flag near-duplicates for orchestrator merge/split, never silently union; append round marker; run `--gate merge`); dry check (`--gate dry`; 2 consecutive zero-yield rounds close Phase 1). Host rules: the orchestrator NEVER reads legacy code — it holds only the brief, the claim-key digest, and round state; an unauthorized probe is a bridge defect — surface and stop, never judgment-call it.
  5. **§4 Phase 1b SEGMENT:** cluster concepts from the ledger digest (states/rules/transitions referencing each other cluster; ID-only seams mark boundaries); the proposed map is an adjudication item; on human confirmation dispatch **Segment** mode → `context-map.md`.
  6. **§5 Phase 2 TOPIC LOOP:** topics cut from the context map, sized for one sitting; `topics.md` board + `queue.md` queue are regenerated VIEWS (ledger is the only state), entries ranked by blast radius (money, compliance, irreversible actions, high-frequency data first); each sitting opens with a ≤1-page topic brief (Settled one-liners + Open items each with the resolving question AND the mechanical impact line: which lifecycles/rules/relations reference it and which artifact class it feeds — lifecycle → 04/05, rule → 03, relation → 04); echo-back verdicts only — a verdict enters the ledger only after the human confirms it (**Adjudicate** mode); deferral is a verdict; sessions never block mining. Topic ready = zero unconfirmed + zero locked; context ready = all topics ready.
  7. **§6 Phase 3 HANDOFF (per context, independently):** `--gate handoff --context <slug>` (G5 then render then G4); on green, the actor-seam note verbatim — anamnesis mines → `/schema-therapy:scope` runs with the context map and actor claims on the table → the human decides which mined actors become 00 Business Actors → pipeline; then dispatch event-storming as the normal pipeline entry over the rendered domain file. The bridge never writes `specs/`.
  8. **§7 Rules for the host:** never edit an engagement artifact or domain file by hand; bounded 5 iterations per draft↔gate cycle (brief, segmentation, render) — mining rounds are bounded by the dry gate instead; harness `malformed`/`broken-test` routing per the skill; never auto-resolve a contradiction (not by recency, confidence, or majority); a long unadjudicated tail is safe by design (deferred claims become 01 hotspots).
- [ ] **Step 2:** Cross-check every harness invocation string in the command against S7 (paths relative to the plugin: `node plugins/schema-therapy/skills/anamnesis/scripts/harness.mjs …`).
- [ ] **Step 3:** `git add plugins/schema-therapy/commands && git commit -m "feat(schema-therapy): anamnesis session command"`

### Task 7: End-to-end fixture engagement

**Files:** Create `plugins/schema-therapy/skills/anamnesis/test-workspace/{anamnesis/**, domain.md}`

- [ ] **Step 1:** Dispatch T-engagement over `skills/anamnesis/test-workspace/`.
- [ ] **Step 2:** Acceptance check (the spec's criterion, by hand before locking it into the selftest): every `seeded.json` accident matcher → a ledger claim with `status:"accident"` + a recorded verdict, and the matcher absent from `domain.md`; every value matcher → a confirmed claim whose statement renders. Final handoff JSON: `status:"pass"`, exit 0.
- [ ] **Step 3:** Determinism: re-run `--gate handoff` twice, byte-identical summaries; `domain.md` re-render unchanged.
- [ ] **Step 4:** `git add plugins/schema-therapy/skills/anamnesis/test-workspace && git commit -m "feat(schema-therapy): converged seeded fixture engagement"`

### Task 8: Lock the acceptance criterion into the selftest

**Files:** Modify `plugins/schema-therapy/skills/anamnesis/scripts/selftest.mjs`

- [ ] **Step 1:** Add the final selftest PART: read `../test-workspace/seeded.json` + the committed engagement; assert per matcher (accidents: status `accident` + verdict present + matcher ∉ domain.md bytes; values: status `confirmed` + matcher ∈ domain.md bytes); run the harness `--gate handoff` over the test-workspace asserting `pass` + byte-identical double-run.
- [ ] **Step 2:** `node scripts/selftest.mjs` → exit 0 (now incl. the acceptance PART).
- [ ] **Step 3:** `git add plugins/schema-therapy/skills/anamnesis && git commit -m "test(schema-therapy): seeded-engagement acceptance locked into selftest"`

### Task 9: README + plugin metadata

**Files:** Modify `plugins/schema-therapy/README.md`, `plugins/schema-therapy/.claude-plugin/plugin.json`

- [ ] **Step 1:** README: after the `/schema-therapy:scope` Usage block, add a `### Brownfield entry — the anamnesis bridge (optional)` section: one paragraph (what it is: legacy-to-model extraction that mines domain value out of an existing system and renders the same `domain.md` the pipeline already consumes — a bridge-rendered domain file and a human-written one are indistinguishable to the pipeline, except every sentence carries evidence); the doctrine sentence verbatim; the command invocation `/schema-therapy:anamnesis`; the engagement order note (anamnesis mines → `/schema-therapy:scope` decides the business actors → pipeline); the closing line that greenfield projects keep writing `domain.md` by hand — the pipeline changes by zero bytes. Add one row to nothing else (the Skills table lists pipeline artifact owners; anamnesis is the optional entry path, documented in Usage only).
- [ ] **Step 2:** plugin.json: version `0.2.0` → `0.3.0`; append keywords `"legacy"`, `"brownfield"`, `"anamnesis"`. (Description untouched — the 11-skill pipeline summary stays accurate.)
- [ ] **Step 3:** `git add plugins/schema-therapy/README.md plugins/schema-therapy/.claude-plugin/plugin.json && git commit -m "docs(schema-therapy): anamnesis bridge README section + metadata"`

### Task 10: Final verification + handoff

- [ ] **Step 1:** Zero-regression proof: `git diff main --stat -- plugins/schema-therapy` shows ONLY `commands/anamnesis.md`, `skills/anamnesis/**`, `README.md`, `.claude-plugin/plugin.json`; `node plugins/schema-therapy/scripts/selftest.mjs` (the drift-police suite) → exit 0, untouched and green.
- [ ] **Step 2:** Fresh full run: `cd plugins/schema-therapy/skills/anamnesis && node scripts/selftest.mjs` → exit 0.
- [ ] **Step 3:** Dispatch `plugin-dev:plugin-validator` over the plugin → expect PASS (12 skills, 1 agent, 3 commands).
- [ ] **Step 4:** Confirm working tree committed; report the results table (task | verification | status) and offer merge options per superpowers:finishing-a-development-branch.

---

## Self-review checklist (run before execution)

- Spec coverage: Packaging → S11/Tasks 1–6; capability brief → S1/T6§2; claims ledger + status lifecycle + matrix → S2/S3; context segmentation → S5/T6§4; the loop + context-efficiency → T6§3; adjudication + topic loop → T6§5; output contract + determinism + annotation discipline → S6; gates G0–G5 → S7/S8; the ten named selftest fixtures → S9 (★ rows); error handling (bridge defect, malformed routing, merge rejection, bounded 5) → §C-5/S8 D4/T6§7; Testing (fixture engagement, renderer determinism, harness selftest) → S10/Tasks 5,7,8 + Task 3 Step 3; out-of-scope (no 00 drafting, no specs/ writes, value-equivalence exit) → T6§6/§7. The "real-world experiment" spec item is explicitly post-ship hardening — not in this plan. ✓
- Zero changes to existing skills/commands: enforced by Task 10 Step 1's diff check. ✓
- Pins the spec leaves open are all in §S (brief/journal/context-map/render formats, conflictsWith lock representation, in-place line rewrite vs append doctrine, renderer-in-harness, CLI modes, check IDs, fixture set, seeded app). Two deliberate convention-driven additions beyond the spec's packaging list, flagged for reviewer approval: `references/simulation.md` (§C-4 requires the reconciliation table to live somewhere) and the `R-SIZE` ⚠️ altitude warn (mechanizes the spec's capacity-model sentence). ✓
- Every agent prompt content is specified by template + §S parameters; no "TBD". ✓
