# task-models — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `task-models` skill (artifact
08, a **directory artifact**: `specs/08-task-models/` holding **one
`<snake(persona)>-<snake(job)>.xml` ConcurTaskTrees (CTT) task model per `07` persona-job**
— a bijection with the `07` jobs-to-be-done rows). It defines the **sole executable
pass/fail authority** that ships with the skill: a **vendored, Rec-faithful CTT walker
oracle** (the strongest oracle available for this format — every task tree is *loaded and
executed* over the W3C-Note operator semantics, the enabled-set computed at each step and
the nominal-path KLM budget summed by the walker) plus a **hand-rolled mechanical reader**
over the pinned XML dialect, a closed seam-resolution / exact-value / reason-qualified-
negative checker, and a minimal set of agent-judged checks. It satisfies the verification
doctrine §2 (closed assertion grammar, machine-readable summary, status taxonomy, no
vacuous green, agent judgment only where the contract marks it), §6 (determinism), and
build steps B2 (formal-format artifact: parse/validate under the authoritative validator)
and B3 (simulation design — strongest oracle = run the artifact on a real engine of its
formalism).

It is **paired with** `references/validation-rules.md` (the closed rule catalog, A1–A9 /
B1–B7 / C1–C6 / D1–D8 / E1–E7 / F1–F4 — **41 rules, 30 blocking ❌**). Every check below
cites the catalog rule ID(s) it mechanizes. **The catalog is the review vocabulary; this
file is the executable harness over it.** No check here exists without a catalog rule
behind it.

The `08` artifact is a **formal-format artifact** (a pinned, mechanically-lintable XML
dialect grounded in the W3C Task Models Note 2014 meta-model) — exactly like `05`
(SCXML→SCION) and `04` (DBML→Postgres). Per doctrine B3 ("prefer running the artifact on
a real engine of its formalism") and B2 ("must parse/validate under the authoritative
validator … downstream instantiation must succeed"), the strongest oracle here is
**executable** — but the probe (§0) proved **no scriptable CTT engine exists**, so the
authoritative validator/engine is the **vendored Rec-faithful CTT walker** the skill ships:
it parses the dialect into the operator tree, computes the **enabled set** under the Note's
operator semantics, **walks the nominal path** deterministically, and **sums the KLM
budget**. This is the load-bearing layer designed below (§3.3 — the **walker oracle**).

The artifact is a **two-upstream** artifact, validated against `specs/06-gherkin/`
(`.feature` files — the addressable *scenario-tag vocabulary*) and `specs/07-personas.md`
(the persona × jobs-to-be-done bijection that fixes one model per file). The harness takes
the `08` directory plus two upstream arguments:

```
node scripts/harness.mjs <08-dir> --upstream-06 <06-dir> --upstream-07 <07-personas.md>
```

The upstream parses use the **pinned 06/07 formats** (copied, never imported — see §1):

- **07** (personas): `### <PersonaName>` subsections (PascalCase) each carrying a
  `**Jobs-to-be-done:**` table `Job | Trigger | Outcome`. **07 is authority for the
  `(persona, job)` set** — its cartesian of every `### <PersonaName>` × every `Job` cell is
  the exact file set `08` must emit (E1 bijection). `@persona`/`@job` attributes are
  verbatim `07` strings (E2). 08 references 07 only through these attributes; it never
  restates 07 prose.
- **06** (gherkin): `.feature` files. **06 is authority for the addressable
  scenario-tag vocabulary.** 08 reads 06 **only** for its tag set, via a **minimal
  mechanical tag-scanner** over the `.feature` text: the scanner reads tag lines (lines
  whose tokens all begin `@`) that immediately precede a `Scenario:`/`Scenario Outline:`
  keyword and collects every `@…` token. **It does NOT parse Gherkin** — no steps, no
  examples tables, no backgrounds — that is the `06` harness's single-owned job (see §9
  single-ownership). The scanner needs no dependency and produces exactly the tag set
  needed for E4/E5 resolution.

08 references both and **never restates** a 06 scenario sentence (F1) or a 07 persona/job
description; it owns only the **CTT task tree structure** (categories, operators, KLM
strings, the per-job budget) derived under the pinned dialect (catalog "pinned XML
dialect" block).

## Index

Open the section the verdict points at; an agent debugging a `malformed`/`broken-test`/`upstream-defect` result can locate the right section from this table alone.

| § | Title | What you find |
|---|-------|---------------|
| §0 | Probe reference | why no external CTT engine exists → vendored Rec-faithful walker |
| §1 | Tooling record | walker oracle choice, entry points (`--upstream-06/-07`), zero-dependency design |
| §2 | Mechanical (no-walker) checks | structural `M*` shape checks + `malformed` vs `fail` |
| §3 | Closed fixture / scenario format | derived graph, **walker oracle** (§3.3), fixtures, manifest |
| §4 | Closed assertion grammar | walker / resolution / exact-value / negative / agent-judged vocabulary |
| §5 | Coverage floor & reconciliation | intake/edge/walk counts, reconciliation, positive+negative mapping |
| §6 | Agent-judged checks | sequencing / decomposition / W-semantics; closed verdict schemas |
| §7 | Output contract | stdout JSON shape, exit codes, `upstream-defect` routing |
| §8 | Determinism | no walker-minted value asserted; byte-identical re-runs |
| §9 | Upstream-defect routing + single-ownership | how a 06/07 defect is reported; ownership notes |

## 0 — Probe reference (no external CTT engine exists → vendored Rec-faithful walker)

`sources/SOURCES.md` → **"Probe"** records the empirical search for a runnable, scriptable
CTT simulation engine. **Verdict: NO maintained, scriptable CTT engine exists.** Recorded:
npm full-text search for `concurtasktrees` → **total 0** (only the unrelated CTT.pt
Portuguese design system and GFM task-list utilities); PyPI `concurtasktrees` /
`ctt-task-model` → 404 (`pyctt` is the Portuguese postal-service package tracker — acronym
collision, rejected); GitHub `concurtasktrees` → 0 repos. The two engines that *do* exist —
**CTTE** (ISTI-CNR; ships a "Task Model Simulator" computing exactly the enabled-set
semantics we need) and **HAMSTERS** (IRIT; advertises a simulation API) — are both
**unmaintained-for-scripting desktop Java GUIs**, Swing/AWT-bound, with no headless/CLI mode
and no npm/pip/Maven-pinnable artifact. **Both rejected as automated oracles.**

**Tooling decision (SOURCES Probe conclusion, copied here as the §0 record):** the
deterministic oracle is a **vendored, Rec-faithful CTT walker** implementing the W3C Note's
operator semantics (the consolidated operator table in SOURCES is the spec), which (a)
parses the pinned-dialect XML into the operator tree, (b) given a task-execution state
enumerates the **ENABLED set** (the same notion CTTE's simulator computes), and (c) pairs
with **deterministic KLM arithmetic** (the Kieras operator table + the fixed M-placement
convention) to compute the per-job efficiency budget. This is **fully grounded in
gatherable sources and needs no external engine** — the strongest oracle realizable, and
the honest "reuse over invention" tradeoff: there is nothing to reuse, so the harness
vendors a Rec-faithful walker rather than degrading to a parse-only verdict. The walker is
the **authoritative validator** B2 names (the dialect's own reader+executor), because the
probe proved no other exists.

**Determinism note from the probe (load-bearing).** The SOURCES KLM row flags the **only**
judgement variable in the budget as M-count/placement — so the catalog **pins a fixed
M-placement convention** (one leading `M` on every interaction/user leaf, zero `M` on system
leaves) and a **fixed nominal-path rule** (first document-order `choice` child; all
enabling/concurrent children; left of disabling/suspendResume; skip `optional`; iterative
once). With both pinned, the budget is a **pure function of the tree** — the walker computes
a single deterministic integer, asserted directly (§8).

## 1 — Tooling record (B2; oracle choice + self-contained, zero-dependency)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `statecharts` / `personas` / `glossary` harnesses (suite uniformity). |
| Entry points | `scripts/harness.mjs` (the oracle; the 3-arg invocation above), `scripts/selftest.mjs` (runs the harness over every shipped fixture set and asserts the expected status + failing-check + upstream-route). |
| **CTT walker (the oracle)** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/walker.mjs`. The probe (§0) proved no scriptable CTT engine exists, so the harness **vendors a Rec-faithful walker** over the W3C-Note operator semantics (SOURCES operator table). It parses the dialect into the operator tree, computes the **enabled set** at each step, walks the **nominal path**, and sums the **KLM budget**. This is the format's executor — the **load+run** B2 requires — and the authoritative validator the probe proved must be vendored. |
| **Mechanical XML reader** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/xml.mjs`. The pinned dialect is small and constrained — only `TaskModel` / `Budget` / `Task` elements + the leading fingerprint comment + a fixed attribute set — so a hand-rolled, comment-preserving reader is feasible and is the **zero-dep house style** (matching the siblings' hand-rolled readers). It reads structure (the task tree, ids, categories, operators, klm strings, scenario-tags, unary attrs, fingerprints) for the mechanical checks, and produces the typed `ParseError` that triggers `malformed`. A generic XML library is overkill (and would discard the fingerprint comment a generic DOM parser drops); a hand-rolled reader is the right tool. The walker (not this reader) is the authority on what the tree *does*; the reader only inspects shape. |
| **06 tag-scanner** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/tags.mjs`. A minimal line scanner over each `.feature`: collect every `@…` token on tag lines that precede a `Scenario:`/`Scenario Outline:` keyword. **No Gherkin parser** — single-ownership: the `06` harness owns full `.feature` parsing (§9). Produces the `tags06` set for E4 and the per-file tag→feature index for E7. |
| Markdown parser | **Hand-rolled line/table/heading parser**, dependency-free, vendored in `scripts/lib/md.mjs` — the shape-reader for `07-personas.md` (`### <PersonaName>` subsections + `**Jobs-to-be-done:**` tables). **Copied** from the sibling `personas` skill (same pinned 07 shape), narrowed to the persona-name + jobs-table slice 08 consumes. |
| External deps | **None.** Self-contained; `selftest.mjs` requires no `npm install`. The probe proved there is no engine to install — so unlike `statecharts` (which self-installs SCION) there is no engine-install path and **no "missing engine ⇒ broken-test" branch** here: the engine ships in-repo as `walker.mjs`. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Closed lexicons | `scripts/lib/lexicon.mjs` — the **pinned closed sets** (the 4 categories, the 9 operator names, the 7 KLM tokens), the **snake_case slug transform** (`lowercase(s).replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'_')`, for the A4 filename/`id` slug), the **closed 06 tag regexes** (E5: `@invariant:INV-[A-Za-z][A-Za-z0-9]*-\d+` / `@transition:[a-z][a-z0-9_]*` / `@terminal:[a-z][a-z0-9_]*` / `@policy:[A-Za-z0-9_-]+`), the **klm tokenizer** (greedy: `BB` before `B`, integer-multiplier only before `K`), and the **Gherkin-keyword set** (F1 restated-text scan). Closed and vendored; extended only by a committed edit, never ad hoc at runtime. |

**Rationale for the walker oracle over a mechanical-only harness.** A CTT task model is a
*runnable* formalism — its tasks become enabled and disabled under the temporal operators,
exactly as CTTE's simulator computes — and the per-job KLM budget is an **exact integer**
the model *claims* (the `<Budget klm>` value) that only a walk of the tree can verify.
Doctrine B3 names the strongest oracle ("run on a real interpreter"); the probe proved no
external interpreter is pinnable, so the harness **vendors** a Rec-faithful one and **runs**
every tree on it (reachability, termination, enabled-set legality, and — the heart — the
budget sum), rather than re-deriving the budget by an inline formula that could diverge from
the operator semantics. A parse-only harness would leave the artifact's single most
important exact-value claim (the budget) unverified, or verified by a formula not grounded
in the enabled-set walk. The mechanical reader (§2) only inspects shape the walker doesn't
surface (dialect legality, M-placement, fingerprints, DRY, seam resolution).

**Reuse note (doctrine "reuse over invention: copied, never referenced").** The
`personas`/`glossary`/`statecharts` skills already ship a hand-rolled `md.mjs` reader and a
`checks.mjs` grammar. This skill **copies** the `md.mjs` persona/jobs-table slice and the
`checks.mjs` scaffold, then adds the 08-specific layers new to this skill: the hand-rolled
**XML reader**, the **06 tag-scanner**, and the **CTT walker** (no sibling has a CTT engine
because no sibling's artifact is a runnable task tree, and — uniquely — no external engine
exists to reuse, so the walker is honestly vendored). Copied, never cross-referenced — each
skill stays self-contained and portable.

## 2 — Mechanical (no-walker) checks — structural; A/B/C/D/E/F shape rules

Parse/lint/structure checks run first. Each `.xml` is read by the hand-rolled `xml.mjs`;
`07-personas.md` by `md.mjs`; the `06` `.feature` files by `tags.mjs`. Mechanical
IDs are `M*`. A parse failure or a ❌ that prevents anchoring a tree yields `malformed`; a
❌ over an anchored tree yields `fail`; ⚠️/ℹ️ are warn-only. **All checks here are
no-walker** — they inspect XML shape + cross-artifact resolution the walker does not
surface.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| M1 | **Well-formed XML + declaration.** Each `.xml` parses (hand-rolled reader accepts) AND begins with `<?xml version="1.0" encoding="UTF-8"?>` as its first line. A parse throw is a typed `ParseError`. | A1 | `malformed` |
| M2 | **Fingerprint block present & complete.** Leading `<!-- fingerprints: … -->` comment present; lists every consumed `06` `.feature` file (each referenced by some `scenario-tags` token — §3.1) AND `specs/07-personas.md`; each entry carries a `sha256:` token (exactly 64 hex chars `[0-9a-fA-F]{64}`, not a `0000…`/`xxxx…`/`<hex>` placeholder). | A2 | `fail` |
| M3 | **Root `TaskModel` with required attrs.** Root element is `<TaskModel>` carrying `id`, `persona`, `job`. | A3 | `fail` |
| M4 | **`id` is the canonical slug.** `TaskModel/@id` == `<snake(persona)>-<snake(job)>` == the filename stem. | A4 | `fail` |
| M5 | **Exactly one `<Budget klm="<int>"/>`** as the first child of `<TaskModel>`; `klm` parses as a non-negative integer. | A5 | `fail` |
| M6 | **Exactly one root `<Task>`** after `<Budget>`. | A6 | `fail` |
| M7 | **Every `<Task>` has a unique `id` and a legal `category`** ∈ {`abstract`,`user`,`interaction`,`system`}; no two tasks share an `id`. | A7 | `fail` |
| M8 | **No unknown vocabulary.** No element other than `TaskModel`/`Budget`/`Task`; no `<Task>` attribute outside {`id`,`category`,`operator`,`scenario-tags`,`klm`,`iterative`,`optional`}. | A8 | `fail` |
| M9 | **Leaf is never `abstract`.** A `<Task>` with no child `<Task>` does not have `category="abstract"`; its `category` ∈ {`interaction`,`system`,`user`}. | B1, B5 | `fail` |
| M10 | **Abstract has ≥2 children.** A `category="abstract"` task has ≥2 child `<Task>` elements. | B2 | `fail` |
| M11 | **Single rooted tree, no orphans; job terminates.** Every `<Task>` is reachable from the single root by containment; the containment graph is a tree (no `id` is its own ancestor); AND the **root task is not iteratively unbounded** (`iterative` on the root = a non-terminating job — B6's constructible non-termination smell, since a tree cannot express a cycle). | B4, B6 | `fail` |
| M12 | **`operator` only on ≥2-child tasks.** No `<Task>` carries `operator=` with fewer than 2 child `<Task>`. | C1 | `fail` |
| M13 | **≥2-child tasks carry an `operator`.** Every `<Task>` with ≥2 child `<Task>` declares an `operator`. | C2 | `fail` |
| M14 | **`operator` value in the pinned 9-set** {`enabling`,`sequentialEnablingInfo`,`choice`,`interleaving`,`synchronization`,`parallelism`,`orderIndependence`,`disabling`,`suspendResume`}. | C3 | `fail` |
| M15 | **Unary operators are attributes.** No unary name (`iterative`/`optional`) used as an `operator` value; `iterative` ∈ {`true`,`false`,positive-integer}; `optional` ∈ {`true`,`false`}. | C4 | `fail` |
| M16 | **Every leaf carries a `klm` attribute** (interaction/system/user leaves). | D1 | `fail` |
| M17 | **`klm` over the closed alphabet.** Tokenized greedily (`BB` before `B`; integer multiplier only immediately before `K`), every token ∈ {`K`,`P`,`B`,`BB`,`H`,`M`,`W`}; no stray characters. | D2 | `fail` |
| M18 | **Non-leaf tasks carry no `klm`.** A `<Task>` with children has no `klm` attribute. | D3 | `fail` |
| M19 | **M-placement convention.** Every `interaction`/`user` leaf's `klm` **begins with exactly one `M`** and contains **no other `M`**; every `system` leaf's `klm` contains **no `M`**. | D4 | `fail` |
| M20 | **`nK` multiplier is a positive integer on `K` only.** No zero/negative/non-integer multiplier; no multiplier on a token other than `K`. | D7 | `fail` |
| M21 | **Every leaf has ≥1 non-empty `scenario-tags` entry.** | E3 | `fail` |
| M22 | **`scenario-tags` tokens match the closed 06 grammar** (the four E5 regexes, vendored in `lexicon.mjs`). | E5 | `fail` |
| M23 | **No restated scenario text.** No `<Task>` attribute or comment contains a Gherkin keyword line (`Given`/`When`/`Then`/`And`/`But`/`Scenario`/`Feature`/`Background`/`Examples`, whole-word) or a copied step sentence (≥8 consecutive verbatim words from a single `06` step — the step text is read fresh from the consumed feature files). | F1 | `fail` |
| M24 | **No invented vocabulary.** Every persona/job attribute, tag, operator, category, KLM token traces to 07/06/the pinned sets (the residue beyond M3/M14/M17/M22/E2 — a token resolving to none of the owned sources). | F2 | `fail` |
| M25 | **Root task category is `abstract` for decomposed jobs** — a root `<Task>` with children whose `category` ≠ `abstract`. | A9 | warn-only (⚠️) |
| M26 | **Non-trivial job decomposes ≥2 levels** — root's children all leaves while the job's `06` feature has >1 scenario. | B3 | warn-only (⚠️) |
| M27 | **Abstract decomposition refines, not relabels** — an abstract task's children are a single category trivially renaming the parent. | B7 | warn-only (ℹ️) |
| M28 | **Task `id`s are descriptive slugs** — a `Task/@id` is a full sentence / step prose, not kebab-case. | F3 | warn-only (⚠️) |
| M29 | **One model = one job** — a tree mixes steps belonging to a different 07 job (advisory). | F4 | warn-only (ℹ️) |

M19 (M-placement) and M17/M20 (the klm alphabet + multiplier) are the **mechanical
preconditions for the budget walk**: the walker (§3.3) counts tokens, so an illegal klm
string must be caught *before* the walk, or the budget sum is meaningless. M23/M24 are the
**DRY/ownership** content lints over an already-anchored tree (they walk no resolution edge,
so they leave the §5 edge arithmetic untouched).

## 3 — Closed fixture / scenario format (B3)

The scenario has **two halves**, because the artifact has two oracles:

1. **Walker runs** (§3.3) — the strongest oracle. Each emitted tree is loaded into the
   vendored walker, its enabled set computed, its nominal path walked, and its KLM budget
   summed; reachability, termination, step-legality, and the **declared==computed budget**
   are asserted.
2. **Mechanical scenarios** (§3.1–§3.2) — a walk over 08's own claims (the hand-rolled XML
   model + the dialect lints) resolved against the parsed 06 tag set + 07 bijection.

No external scenario data is injected into a *target* run; the 06 dir + 07 file + the 08
directory supply every element. The shipped fixtures (§3.4) are **whole canned upstream
sets + 08 directories** used only by `selftest.mjs`.

### 3.1 Derived scenario graph (built fresh per run — §6)

From each parsed **08 `.xml`** (hand-rolled reader) the harness derives:
`model = {file, persona, job, id, budget, root, tasks[] ({id, category, operator?,
iterative?, optional?, scenarioTags[], klm?, children[], parent}), leaves[],
fingerprints{}}`.

From parsed **07** (pinned upstream) the harness derives the bijection target:
`personaJobs07[]` — the cartesian `{persona (### name), job (Job cell), slug
(snake(persona)-snake(job))}` over every `### <PersonaName>` × every `**Jobs-to-be-done:**`
`Job` cell.

From the **06** tag-scanner the harness derives:
`tags06` — the set of every `@…` token on a scenario-preceding tag line across all
`.feature` files; and `tagFile06: tag → {features…}` — which feature(s) carry each tag (for
E7). Also `featureScenarioCount06: feature → N` (scenario count, for the B3/M26 advisory).

Closed traversal set (every relationship 08 claims becomes a walked edge):

1. **File↔07 bijection edge** — the set of `08` files (by slug) **equals** `personaJobs07`
   (both directions: a file with no 07 pair, OR a 07 pair with no file) (E1, M-BIJ).
2. **Attr→07 exact-match edge** — each model's `@persona` is a verbatim `### <PersonaName>`
   and `@job` a verbatim `Job` cell of that persona (E2, M-ATTR).
3. **Leaf→06-tag resolution edge** — each leaf's every `scenario-tags` token ∈ `tags06`
   (E4, R-TAG); and the token matches the closed grammar (E5, M22).
4. **Fingerprint↔referenced-feature edge** — each `06` feature contributing a referenced
   tag is fingerprinted, and each fingerprinted feature contributes ≥1 referenced tag
   (E7, R-FP).
5. **Tree-structure edges** — id uniqueness, single-root reachability, acyclicity,
   abstract-arity, leaf-category, operator-arity/value, unary-attr legality (A7/B1/B2/B4/
   B5/B6/C1–C4; M7/M9–M15).
6. **KLM edges** — every leaf has a legal klm (D1/D2/D7; M16/M17/M20), correct M-placement
   (D4; M19), and non-leaves carry none (D3; M18).
7. **Walker edges** — per tree: load (W-LOAD), initial enabled set (W-STEP first step),
   reachability of every leaf (W-REACH), nominal-path termination (W-TERM), step-legality
   (W-STEP), and the **budget sum** (W-BUDGET).

Every edge class is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Cross-artifact resolution (mechanical, no walker)

Edges 1–4 are pure bijection / exact-value / DRY checks over the parsed models + the 07
bijection + the 06 tag set. Byte-deterministic, no walker. The pinned mappings (slug =
`snake(persona)-snake(job)`; tag grammar = the four E5 regexes; `@persona`/`@job` = verbatim
07 strings) are the catalog's pinned conventions, copied into `scripts/lib/lexicon.mjs` so
the harness and the catalog agree by construction.

### 3.3 Walker runs — the strongest-oracle design (B3, this skill's load-bearing layer)

After mechanical parse (M1) and dialect-legality (M7–M20), the harness **runs** each tree
on the vendored walker. **No walker-generated value is ever asserted blindly** (§8): the
walk is *deterministic* (fixed enabled-set semantics + fixed nominal-path rule + fixed
M-placement), so the asserted positions — the reachable-leaf set, the termination flag, and
the **budget integer** — are fixed for a given tree.

**Walker semantics (per operator — the enabled-set rule the walker encodes, from the
SOURCES operator table / W3C Note).** For a parent `P` with children `C1..Cn` in document
order, the **initial enabled set** contributed by `P` is:

| Operator | Initial-enabled rule | Nominal-path contribution |
|----------|----------------------|---------------------------|
| `enabling` (`>>`) | only `C1` enabled; `Ck` enabled when `C(k-1)` completes | **all** children, in order |
| `sequentialEnablingInfo` (`[]>>`) | as `enabling` (+ data passed left→right) | **all** children, in order |
| `choice` (`[]`) | **all** children enabled; once one starts, the rest disable | **C1 only** (first in document order) |
| `interleaving` (`\|\|\|`) | **all** children enabled, no order constraint | **all** children |
| `synchronization` (`\|[]\|`) | **all** children enabled (+ info exchange) | **all** children |
| `parallelism` | **all** children enabled (true parallel) | **all** children |
| `orderIndependence` (`\|=\|`) | **all** children enabled; one finishes before the next starts | **all** children |
| `disabling` (`[>`) | left `C1` enabled **and** right `C2` always enabled-to-interrupt | **left (C1)** only |
| `suspendResume` (`\|>`) | left `C1` enabled; right may interrupt, left resumes after | **left (C1)** only |

Unary attributes: `optional="true"` — the task may be skipped, **excluded** from the nominal
path; `iterative="true"`/`iterative="N"` — repeats from the start on termination, but its
leaves are counted **once** on the nominal path (and the walker executes it once, asserting
W-TERM — no infinite loop). Leaves contribute their own enabled-set entry (they are
immediately performable once enabled by their parent's operator).

**(a) Positive walk (`W-*`).** For each tree the walker:

| ID | Step | Assertion | Catalog rule |
|----|------|-----------|--------------|
| W-LOAD | parse the dialect into the operator tree | tree loads without throw; root is the single `<Task>`; every operator/category is in the pinned set (re-confirms M7/M14 at the walker boundary) | A6, B4 |
| W-REACH | enumerate, over **all** walks (every `choice` branch, every concurrent ordering modulo equivalence), the set of leaves that become enabled on **some** walk | **every** leaf in the tree is reachable on some walk (no dead leaf the operators can never enable) | B4 (reachability arm) |
| W-STEP | walk the **nominal path** step-by-step (enabling/concurrent: all children in order; choice: first doc-order child; disabling/suspendResume: left; skip `optional`; iterative once) | at every step the **enabled set is non-empty until completion** (W-STEP legality — the walk never strands with work remaining and nothing enabled) | C1, C2 (operator legality is executable here) |
| W-TERM | run the nominal walk to completion | the walk **terminates** — the bounded-step descent guard: an `iterative` subtree executes exactly once; the walk reaches a state with empty enabled set | (bounded-step guard; B6 is owned mechanically by M11 — the iterative-root smell) |
| W-BUDGET | sum KLM operator-instance counts over the **nominal-path leaves** (per leaf, count `klm` tokens: `BB`=1, `4K`=4, `W`=1, each of `K`/`P`/`B`/`H`/`M`=1) | the computed integer **equals** the declared `<Budget klm>` | **D5** (the exact-value heart) |

**(b) The budget verification (W-BUDGET) — the load-bearing exact-value design.** The
budget is the artifact's single most important numeric claim (the `09` flow-efficiency
ceiling), so it is verified by **executing the walk, not by an inline re-derivation**:

1. The walker computes the **nominal-path leaf list** by descending the tree under the
   nominal-path rule above (a deterministic depth-first descent: at each parent, recurse
   into all children for the enabling/concurrent operators, into the first document-order
   child for `choice`, into the left child for `disabling`/`suspendResume`; skip any subtree
   rooted at an `optional="true"` task; descend an `iterative` subtree exactly once). The
   result is an **ordered, deterministic** list of leaves.
2. For each nominal-path leaf, the walker **tokenizes** its `klm` string (the same greedy
   tokenizer M17 validated: `BB` before `B`; `nK` expands to `n` `K`-instances) and counts
   the instances. `W` counts as one instance (system response time — budget parity, not user
   effort; the catalog's D6 ⚠️ advisory records this intent).
3. `computedBudget := Σ instances`. **Assert `computedBudget === model.budget`** (the M5
   integer). A mismatch is the `W-BUDGET` failure (D5) — reported with **both** the declared
   and the computed value + the contributing leaf list, so the author sees exactly which
   leaves the walk counted.

Because the nominal-path rule, the M-placement, and the tokenizer are all **pinned and
deterministic**, `computedBudget` is a pure function of the tree — the same tree yields the
same integer every run (§8). The walker is the authority: the harness never trusts a
hand-computed budget, it **re-walks** and compares.

**(c) No negative walk on the tree itself** (unlike `statecharts`' disabled-event probe):
the CTT walker has no event input to "fire wrongly" — the negatives here are the **illegal
fixtures** (§3.4), each an 08 tree with one injected defect the walker or a mechanical check
must reject for the stated reason (the `budget-mismatch` fixture is the W-BUDGET negative;
`unreachable-leaf` is the W-REACH negative).

### 3.4 Shipped fixtures (`scripts/fixtures/`)

One shared deterministic **mini upstream set**:
- **`upstream-07.md`** — **2 personas, 3 jobs total** (so the bijection is exercised both
  ways): `### AccountHolder` with jobs `transfer_funds` and `view_balance`; `### Teller`
  with job `open_account`. PascalCase names; `**Jobs-to-be-done:**` tables with the pinned
  `Job | Trigger | Outcome` columns. Static and stable.
- **`upstream-06/`** — **2 `.feature` files** carrying **~8 tags** across their scenarios:
  e.g. `account.feature` (tags `@transition:select_source_account`, `@transition:enter_amount`,
  `@invariant:INV-Amount-1`, `@transition:confirm_transfer`, `@terminal:transfer_posted`,
  `@policy:double-entry-ledger`) and `onboarding.feature` (`@transition:capture_kyc`,
  `@terminal:account_opened`). Tags placed on tag lines preceding `Scenario:` keywords so
  the scanner finds exactly the intended set. Static; no clock/random.

Plus a **`valid-08/`** directory (a correct model per 07 pair — three files:
`accountholder-transfer_funds.xml`, `accountholder-view_balance.xml`,
`teller-open_account.xml`, each fingerprinting its consumed feature(s) + `07-personas.md`,
each with a budget equal to its nominal-path sum), the illegal 08 fixtures, and the
broken-upstream fixtures. **The negative fixtures ship as directory-form sets** (each a full
copy of the `valid-08/` directory with exactly one injected defect in one model file — see
the line-~196 note: "the shipped fixtures … are whole canned upstream sets + 08 directories"),
not as bare `.xml` files; the `.xml` filenames in the table below name the *mutated model
file* inside each negative's directory. Each illegal fixture carries **exactly one** deliberate
defect so its negative fires **for the stated reason** (a fixture failing for any other reason
is itself `broken-test`). The expected `(status, failing-check, upstream-route)` is recorded in
`scripts/fixtures/manifest.json`.

| Fixture (08) | Upstream | Injected defect | Must fail | Expected status |
|--------------|----------|-----------------|-----------|-----------------|
| `valid-08/` | mini set | none — three correct models | nothing | `pass` |
| `malformed-xml.xml` | mini set | unclosed `<Task>` tag (XML malformed) | M1 | `malformed` |
| `missing-fingerprint.xml` | mini set | leading fingerprint block absent | M2 (A2) | `fail` |
| `missing-budget.xml` | mini set | no `<Budget>` element | M5 (A5) | `fail` |
| `budget-mismatch.xml` | mini set | `<Budget klm="99">` ≠ computed nominal sum | **W-BUDGET** (D5) | `fail` |
| `bad-operator.xml` | mini set | `operator="precedes"` (not in the 9-set) | M14 (C3) | `fail` |
| `bad-category.xml` | mini set | a `category="action"` | M7 (A7) | `fail` |
| `bad-klm-token.xml` | mini set | a leaf `klm="MXP"` (`X` off-alphabet) | M17 (D2) | `fail` |
| `m-on-system-leaf.xml` | mini set | a `system` leaf `klm="MW"` (illegal M) | M19 (D4) | `fail` |
| `missing-m-on-interaction-leaf.xml` | mini set | an `interaction` leaf `klm="PBB"` (no leading M) | M19 (D4) | `fail` |
| `single-child-abstract.xml` | mini set | an `abstract` task with exactly one child | M10 (B2) | `fail` |
| `operator-on-single-child.xml` | mini set | a task with one child carrying `operator="enabling"` | M12 (C1) | `fail` |
| `abstract-leaf.xml` | mini set | a childless `<Task category="abstract">` | M9 (B1/B5) | `fail` |
| `ghost-scenario-tag.xml` | mini set | a leaf tag `@transition:nonexistent` (well-formed, absent from 06) | R-TAG (E4) | `fail` |
| `untagged-leaf.xml` | mini set | a leaf with no `scenario-tags` | M21 (E3) | `fail` |
| `missing-model/` | mini set | a 07 job (`teller`/`open_account`) with no file | M-BIJ (E1) | `fail` |
| `extra-model/` | mini set | a file for a `(persona,job)` not in 07 | M-BIJ (E1) | `fail` |
| `persona-attr-mismatch.xml` | mini set | `@persona="AccountOwner"` (not the 07 `AccountHolder`) | M-ATTR (E2) | `fail` |
| `restated-gherkin-text.xml` | mini set | a comment pasting a `When …`/`Then …` step line | M23 (F1) | `fail` |
| `unreachable-leaf/` | mini set | a leaf nested under a klm-bearing task → a dead branch (W-REACH) AND that task is now a non-leaf carrying `klm` (M18/D3) | **W-REACH** (B4) [+ M18/D3] | `fail` |
| `root-not-taskmodel/` | mini set | root element is `<TaskTree>`, not `<TaskModel>` (tree cannot be anchored) | M3 (A3) | `fail` |
| `id-not-slug/` | mini set | `@id="ah-viewbal"` ≠ `snake(persona)-snake(job)` | M4 (A4) | `fail` |
| `multi-root-task/` | mini set | two top-level `<Task>` children under `<TaskModel>` | M6 (A6) | `fail` |
| `unknown-attribute/` | mini set | an undeclared `priority="high"` attribute on a `<Task>` | M8 (A8) | `fail` |
| `multi-child-no-operator/` | mini set | a ≥2-child task with no `operator` attribute | M13 (C2) | `fail` |
| `unary-as-operator/` | mini set | `operator="optional"` (a unary name used as an N-ary operator) | M15 (C4) | `fail` |
| `klm-absent-leaf/` | mini set | an `interaction` leaf with no `klm` attribute | M16 (D1) | `fail` |
| `bad-multiplier/` | mini set | a leaf `klm="MH0K"` (zero multiplier on `K`) | M20 (D7) | `fail` |
| `iterative-root/` | mini set | `iterative="true"` on the ROOT task = an unbounded job loop (no terminating nominal path) | M11 (B6) | `fail` |
| `wrong-reason-trap.xml` | mini set | **two** defects — a budget mismatch (D5) AND a ghost tag (E4) — proves the negative reports the **W-BUDGET** reason, not R-TAG | W-BUDGET isolates over R-TAG | `fail` (reason = W-BUDGET) |
| `vacuous/` | mini set | structurally valid 08 but harness fed the `--no-checks` disabled path | n/a | `broken-test` (zero checks) |
| `dup-job-07/` | **07 with a duplicate `(AccountHolder, transfer_funds)` pair** (filename collision) | 07 self-inconsistency 08 legitimately needs | bijection pre-check | `fail` (class=`upstream-defect`→`07-personas.md`) |
| `bad-tag-06/` | **06 with a scenario tag matching no closed grammar class** (e.g. `@weird-thing`) | 06 tag-grammar violation | 06 self-check | `fail` (class=`upstream-defect`→the named `.feature`) |
| `valid-08/` | `malformed-upstream-07` (drops the `**Jobs-to-be-done:**` table) | 07 unparseable — cannot anchor bijection | n/a | `broken-test` |
| `valid-08/` | `malformed-upstream-06` (a `.feature` not readable / no `Scenario` keyword scannable) | 06 unscannable — cannot anchor tags | n/a | `broken-test` |

`wrong-reason-trap.xml` is the explicit doctrine §2 guard: it would "pass for the wrong
reason" under a sloppy negative. The selftest asserts the failing-check ID equals
`W-BUDGET`, not merely that *some* check failed. The `dup-job-07/` and `bad-tag-06/` rows
are **upstream-defect** routes (§9); the last two rows route to `broken-test` (an unparseable
upstream).

### 3.5 Manifest

`scripts/fixtures/manifest.json` records, per fixture,
`{files, status, failingCheck, upstreamRoute?}`. `selftest.mjs` runs the harness over each
entry and asserts the actual tuple equals the manifest — negatives are proven to fire **for
their stated reason**, the upstream routes are asserted, and the coverage floor (§5) is
asserted true.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a
check means editing this section AND `scripts/lib/checks.mjs` in a committed change, and the
new check MUST cite a catalog rule. The harness emits each check's `id`, `class`, `status`,
and `rule` in its JSON summary (§7). **Five** classes — the four B3 classes plus the walker
class, which is the strongest-oracle layer.

### 4.1 Walker checks (`W` — the tree is RUN on the vendored Rec-faithful CTT walker)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| W-LOAD | every tree loads into the operator tree without throw; root is the single `<Task>`. | A6 |
| W-REACH | every leaf is reachable (becomes enabled) on **some** walk under the operators. | B4 |
| W-STEP | along the nominal walk, the enabled set is non-empty until completion (no stranded step). | C1, C2 |
| W-TERM | the nominal walk terminates (bounded-step descent guard); an `iterative` subtree executes exactly once. | — (B6 owned by M11) |
| W-BUDGET | the computed nominal-path KLM operator-instance sum **equals** the declared `<Budget klm>`. | D5 |

### 4.2 Resolution checks (`R` — a referenced element exists / maps in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R-TAG | every leaf `scenario-tags` token ∈ `tags06` (present on a 06 scenario). | E4 |
| R-FP | each 06 feature contributing a referenced tag is fingerprinted, and each fingerprinted feature contributes ≥1 referenced tag. | E7 (⚠️) |

### 4.3 Exact-value / bijection checks (`X` — exact counts/values against the derived graph)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| M-BIJ | the set of `08` file slugs **deep-equals** `personaJobs07` slugs (both directions; a missing pair OR an extra file fails, naming the offending side + owner). | E1 |
| M-ATTR | each model's `@persona` is a verbatim 07 `### <PersonaName>` AND `@job` a verbatim `Job` cell **of that persona**. | E2 |
| X-ID | every `Task/@id` unique within a document (`count(distinct) === count`). | A7 |
| X-BUDGET-INT | `<Budget klm>` parses as a single non-negative integer (the value W-BUDGET compares against). | A5 |
| X-RECON | the executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.4 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

Named negatives proven by the shipped illegal fixtures (§3.4). Each asserts both that the
defect is rejected AND that the failing-check ID matches the defect's owner rule
(wrong-reason ⇒ `broken-test`). N-IDs map 1:1 to the fixture rows; abbreviated:

| ID | Illegal input | For the reason | Owner check | Catalog rule |
|----|---------------|----------------|-------------|--------------|
| N1 | malformed XML | parser reject | M1 | A1 |
| N2 | missing fingerprint | block absent/incomplete | M2 | A2 |
| N3 | missing budget | no `<Budget>` | M5 | A5 |
| N4 | budget mismatch | declared ≠ computed | **W-BUDGET** | D5 |
| N5 | bad operator | not in the 9-set | M14 | C3 |
| N6 | bad category | not in the 4-set | M7 | A7 |
| N7 | bad klm token | off-alphabet token | M17 | D2 |
| N8 | M on system leaf | illegal M | M19 | D4 |
| N9 | missing M on interaction leaf | no leading M | M19 | D4 |
| N10 | single-child abstract | abstract arity <2 | M10 | B2 |
| N11 | operator on single child | operator arity <2 | M12 | C1 |
| N12 | abstract leaf | childless abstract | M9 | B1/B5 |
| N13 | ghost scenario-tag | tag absent from 06 | R-TAG | E4 |
| N14 | untagged leaf | leaf without scenario-tags | M21 | E3 |
| N15 | missing model | 07 job with no file | M-BIJ | E1 |
| N16 | extra model | file with no 07 pair | M-BIJ | E1 |
| N17 | persona-attr mismatch | `@persona` ≠ 07 | M-ATTR | E2 |
| N18 | restated gherkin text | step line pasted in | M23 | F1 |
| N19 | unreachable leaf | dead branch | **W-REACH** | B4 |
| N20 | dup-job-07 | 07 duplicate pair (filename collision) | bijection pre-check | §9 → 07 |
| N21 | bad-tag-06 | 06 tag matches no grammar class | 06 self-check | §9 → 06 feature |

### 4.5 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ1`–`AJ4` enumerated in §6. They run last, only over checks that survived all mechanical
+ walker gates, and return enumerated verdicts only. **No ❌ catalog rule is left to agent
judgment** — every ❌ has a mechanical or walker owner above.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The 08 artifact owns four element sets per model: `models`, `tasks`
(internal + leaves), `leaves` (the klm/tag-bearing subset), and `tags` (the
`scenario-tags` tokens), plus the per-model `budget`. The intake count is:

```
intake = |models| + Σ|model.tasks| + Σ|model.leaves| + Σ|leaf.scenarioTags| + |models| (budgets)
```

The **edge / walk count** the harness must walk (from §3.1 + §3.3):

```
edgesExpected = 1                                    (M-BIJ: file-set ↔ 07 bijection, both ways)
              + |models|                             (M-ATTR: persona/job verbatim-07)
              + Σ|leaf.scenarioTags|                 (R-TAG: each token ∈ tags06; M22 grammar)
              + |referenced features|                (R-FP: fingerprint ↔ referenced-tag)
              + Σ|tasks|                             (X-ID + tree-structure: M7/M9–M15)
              + Σ|leaves|                            (KLM: M16/M17/M19/M20; M18 over non-leaves)
              + WALK: Σ|models| (W-LOAD + W-TERM + W-BUDGET)
                    + Σ|leaves| (W-REACH, one per leaf)
                    + Σ|nominal-path leaves| (W-STEP)
```

The **walk count** is reported separately in the summary (`counts.walker`) so the
strongest-oracle layer's coverage is visible: a `pass` with `counts.walker.total === 0`
over an artifact that *has* models is itself a `broken-test` (the walker layer was skipped).

**Every owned element exercised ≥1 time.** The harness asserts:
- every `model` is touched by W-LOAD + W-TERM + W-BUDGET (run), M-ATTR, M2 (fingerprints);
- every `task` is touched by X-ID, M7 (category), and the tree-structure checks (M9–M15);
- every `leaf` is touched by M16/M17/M19/M20 (klm), M21 (tag present), and W-REACH (run);
- every `tag` is touched by M22 (grammar) + R-TAG (resolves into 06);
- every `budget` is touched by X-BUDGET-INT (shape) + W-BUDGET (the walked sum).

**Reconciliation formula (X-RECON — no silently dropped checks):**

```
executedChecks = mechanicalRun + walkerRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected)
           && (executedChecks > 0)
           && (walkerRun > 0 when models > 0)        // strongest oracle never skipped
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠
edgesExpected` ⇒ a check was silently dropped ⇒ `broken-test`. **If `models > 0` but the
walker layer ran zero walks ⇒ `broken-test`** (strongest oracle skipped). Unlike
`statecharts`, 08 has **no not-emitted branch**: the bijection (E1) requires exactly one
file per 07 pair, so an empty `08` dir over a non-empty 07 is a `fail` (missing models), not
a sanctioned absence — a `pass` always has `models > 0` and a non-empty walker layer.

**Positive AND negative per claimed behavior.** Every behavior 08 claims is proven by **≥1
positive** (a passing check over `valid-08/`) AND **≥1 negative** (a shipped illegal fixture
that must fail). Abbreviated mapping (full ❌-reconciliation in the closing table):

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Well-formed dialect XML | A1 | M1 over `valid-08/` | `malformed-xml.xml` |
| Fingerprints complete | A2 | M2 over `valid-08/` | `missing-fingerprint.xml` |
| Exactly one integer budget | A5 | M5/X-BUDGET-INT over `valid-08/` | `missing-budget.xml` |
| Declared budget == walked sum | D5 | W-BUDGET over `valid-08/` | `budget-mismatch.xml` |
| Operator in the 9-set | C3 | M14 over `valid-08/` | `bad-operator.xml` |
| Category in the 4-set | A7 | M7 over `valid-08/` | `bad-category.xml` |
| klm over the alphabet | D2 | M17 over `valid-08/` | `bad-klm-token.xml` |
| M-placement convention | D4 | M19 over `valid-08/` | `m-on-system-leaf.xml` / `missing-m-on-interaction-leaf.xml` |
| Abstract arity ≥2 | B2 | M10 over `valid-08/` | `single-child-abstract.xml` |
| Operator arity ≥2 | C1 | M12 over `valid-08/` | `operator-on-single-child.xml` |
| Leaf never abstract | B1/B5 | M9 over `valid-08/` | `abstract-leaf.xml` |
| Every leaf reachable | B4 | W-REACH over `valid-08/` | `unreachable-leaf.xml` |
| Tag resolves to 06 | E4 | R-TAG over `valid-08/` | `ghost-scenario-tag.xml` |
| Every leaf tagged | E3 | M21 over `valid-08/` | `untagged-leaf.xml` |
| File↔07 bijection | E1 | M-BIJ over `valid-08/` | `missing-model/` / `extra-model/` |
| Persona/job verbatim 07 | E2 | M-ATTR over `valid-08/` | `persona-attr-mismatch.xml` |
| No restated gherkin | F1 | M23 over `valid-08/` | `restated-gherkin-text.xml` |
| 07 bijection sound | §9 | `valid-08/` + sound 07 | `dup-job-07/` (upstream-defect→07) |
| 06 tags well-formed | §9 | `valid-08/` + sound 06 | `bad-tag-06/` (upstream-defect→06) |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a
negative entry — the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; sequencing/decomposition/W-semantics; closed verdict schema)

These catalog rules (or rule residues) are **inherently semantic** — they require domain
understanding the mechanical + walker layers cannot supply. Each runs only after mechanical
gates pass and returns an **enumerated verdict** (never prose). The harness records `{id,
verdict, ruleId}`; any verdict other than the rule's pass-verdict is reported at the catalog
severity. **There are no ❌ agent-judged checks** — every ❌ rule has its ❌ weight carried by
a mechanical or walker subset; the agent judges only residue at its own (⚠️/ℹ️) severity.
The mechanical preconditions (the operator family, the `@transition` tag set on a subtree,
the decomposition shape) are computed by the harness and handed to the agent, so it judges
only the semantic residue, never raw structure.

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ1 | C5 / E6 (sequencing vs @transition obligations) | whether an order-bearing operator's child order matches the `06` `@transition` behavioral sequence (the non-commutative operators are order-meaningful), and whether a `@terminal` leaf sits at an end-of-`enabling` / `disabling` position — needs the behavioral meaning of the tags, not their syntax. | `{ order-matches-transitions \| order-arbitrary \| terminal-misplaced \| ambiguous }` |
| AJ2 | B3 / B7 (decomposition quality) | whether the abstract decomposition adds task-analytic detail (sub-steps) vs trivially relabelling the parent, and whether a non-trivial job is refined to a useful depth — a modelling judgment the arity/depth count (M26/M27) only shapes. | `{ refines-with-detail \| relabel-or-shallow \| ambiguous }` |
| AJ3 | C6 / D6 (W-semantics / concurrency justification — advisory) | whether a concurrent-family operator (`interleaving`/`synchronization`/`parallelism`) is genuine concurrency vs sequential logic that should be `enabling`, and whether a `system`-leaf `W` is intended as system response time (budget parity) rather than mistaken human effort. | `{ concurrency-justified-and-W-intended \| false-concurrency-or-W-misused \| ambiguous }` |
| AJ4 | F4 (one model = one job — advisory residue) | whether a tree's steps all belong to the *one* 07 job it is scoped to vs leaking steps of another job (the mechanical M29 flags only gross cross-job id overlap; intent is judged). | `{ single-job \| leaks-other-job \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); reported as ℹ️, never silently
dropped, never a pass for reconciliation (counts as executed, verdict-recorded). No
agent-judged check may emit free prose in an asserted position. The mechanical + walker
verdict remains byte-deterministic regardless of agent output (§8).

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order,
`checks[]`/`findings[]` sorted by `id`:

```json
{
  "skill": "task-models",
  "artifactDir": "specs/08-task-models/",
  "upstream06": "specs/06-gherkin/",
  "upstream07": "specs/07-personas.md",
  "tooling": { "walker": "vendored-rec-faithful-ctt", "node": ">=18", "externalEngine": "none (probe: no scriptable CTT engine exists)" },
  "status": "pass | fail | malformed | broken-test",
  "counts": {
    "intake": { "models": 0, "tasks": 0, "leaves": 0, "tags": 0, "budgets": 0 },
    "checks": { "mechanical": 0, "walker": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "walker": { "walks": 0, "passed": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "budgets": [
    { "model": "accountholder-transfer_funds", "declared": 14, "computed": 14, "nominalLeaves": 5 }
  ],
  "_note": "the budgets[] values above are ILLUSTRATIVE schema examples, not pinned to any fixture — declared/computed/nominalLeaves come from the model under test; the model NAMES in these examples are likewise illustrative (the real slug is snake(persona)-snake(job), e.g. accountholder-transfer_funds)",
  "checks": [
    { "id": "M14", "class": "mechanical", "rule": "C3", "status": "pass" },
    { "id": "W-BUDGET", "class": "walker", "rule": "D5", "status": "pass" },
    { "id": "R-TAG", "class": "resolution", "rule": "E4", "status": "pass" },
    { "id": "AJ1", "class": "agent-judged", "rule": "C5", "verdict": "order-matches-transitions" }
  ],
  "findings": [
    { "id": "M-BIJ", "rule": "E1", "severity": "error", "class": "upstream-defect", "upstream": "07-personas.md", "detail": "07 declares duplicate (AccountHolder, transfer_funds) — filename collision" }
  ]
}
```

- The `budgets[]` array records each model's declared vs walker-computed budget + the
  nominal-path leaf count — the W-BUDGET evidence, recorded for transparency (the heart of
  the exact-value layer).
- The optional `class: "upstream-defect"` + `upstream: "<file>"` on a finding routes a
  06/07-origin defect (§9). It does **not** add a status; the status stays `fail` (taxonomy
  closed at four values).
- **stderr** — human-readable diagnostics only (XML parse throws, walker load errors,
  per-walk failures with the declared-vs-computed budget + contributing leaf list, the
  unreachable-leaf trace, the wrong-reason trap explanation, the upstream-defect routing
  note naming which file to fix). Never the machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. `1` = `fail` (incl. `upstream-defect`). `2` =
  `malformed` (a `.xml` not well-formed / dialect-unparseable). `3` = `broken-test` (check
  threw, wrong-reason, reconciliation mismatch, zero checks, **or an unparseable/unscannable
  06/07 upstream**). The distinct codes let CI separate a wrong 08 (`1`), a malformed model
  (`2`), and a broken harness/fixture/upstream (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`.

## 8 — Determinism (doctrine §6; walker-value exclusion)

Running the vendored walker is the determinism surface this skill must manage. The walk is
**fully deterministic** by construction — no clock, no randomness, no data computation:

- **The nominal path is pinned**, not chosen at runtime: first document-order `choice`
  child; all enabling/concurrent children in order; left of `disabling`/`suspendResume`;
  skip `optional`; iterative once. The same tree yields the same nominal-path leaf list every
  run.
- **M-placement is pinned** (one leading `M` on every interaction/user leaf, zero on system
  leaves), so M-count — the SOURCES-flagged sole judgement variable — is a pure function of
  the tree, not a per-run decision.
- **The klm tokenizer is pinned** (greedy `BB`-before-`B`; `nK` → `n` instances), so the
  budget sum is the same integer every run. **The budget is asserted as a computed integer
  the walker re-derives** — never a value the harness mints from a clock/random and never the
  declared value echoed back (the declared value is the *comparand*, the computed value is the
  *oracle*).
- **The enabled set and reachable-leaf set are asserted as sorted id sets** (set semantics),
  never an ordering the walker chose by a tie-break the harness did not also fix.
- **Fresh walker state per model** (a fresh parse + walk per `.xml`); nothing carries between
  walks. A re-run over byte-identical inputs is **byte-identical output** (stable key order,
  sorted `checks[]`/`findings[]`/`budgets[]`).
- The fingerprint digests are **read from the artifacts** and only shape-checked (M2) — the
  harness never recomputes a sha256 and asserts equality (that would inject a value); it
  checks shape + naming and resolves tags against the 06 files actually passed via
  `--upstream-06`.
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the
  reconciliation arithmetic and their verdicts are recorded, not invented into counts — so
  the **mechanical + walker verdict remains byte-deterministic** regardless of agent output.

## 9 — Upstream-defect routing + single-ownership notes (how a 06/07 defect is reported without patching around it)

08 is validated *against* two upstreams but consumes a **narrow slice** of each: 07's
`(persona, job)` bijection set (E1/E2) and 06's *scenario-tag vocabulary* (E4/E5). The
harness checks only the **minimal preconditions** 08 legitimately needs, and **never
silently repairs or works around** a bad upstream — it surfaces the defect and routes it to
the file that owns the fix:

**Pinned preconditions (the only upstream invariants 08 verifies):**

1. **07 persona-job set is collision-free** — the cartesian of `### <PersonaName>` × `Job`
   cells yields **distinct** slugs. A **duplicate `(persona, job)` pair** in 07 means two
   models would collide on one filename (`<persona>-<job>.xml`) — a defect 08 cannot resolve
   (which model owns the name?). Routed `upstream-defect` → `07-personas.md`. Proven by
   `dup-job-07/`.
2. **06 scenario tags are well-formed** — every `@…` token the tag-scanner collects matches
   one of the four closed grammar classes (E5 regexes). A **06 tag matching no class** (e.g.
   `@weird-thing`) means the addressable vocabulary 08 resolves against is itself malformed;
   08 cannot decide whether a leaf tag "resolves" to a tag the grammar rejects. Routed
   `upstream-defect` → **the named `.feature` file**. Proven by `bad-tag-06/`.

**What 08 deliberately does NOT re-verify (single ownership of checks).**
- **08 does not parse Gherkin.** It runs a **minimal tag-scanner** (tag lines preceding
  `Scenario`/`Scenario Outline`), never a Gherkin parser — the `06` skill's own harness
  single-owns full `.feature` parsing, step validity, examples-table expansion, and **06's
  coverage obligations** (that every scenario carries exactly one source tag, etc.). 08 reads
  06 *only* for the tag set; it does not re-litigate 06's internal coverage. (The one 06
  invariant 08 *does* surface — tag-grammar well-formedness — is a precondition for 08's own
  E4 resolution to mean anything, so it is checked and routed, not silently consumed.)
- **08 does not re-verify 07's goal/impact seams.** Whether a 07 persona's goals resolve to
  the `00` impact map, or its job Outcomes to `01` events, is the **`personas` skill's**
  single-owned job. 08 consumes only the `(persona, job)` names; it does not re-run the 07→00/
  01 resolution. Re-verifying an upstream invariant another skill already owns would duplicate
  ownership and double-report the same defect across two harnesses.

**Three upstream conditions are distinguished and routed:**

1. **Sound upstreams.** 07 parses with collision-free `(persona, job)` slugs; every 06 tag
   is grammar-legal. The 08→06/07 checks (M-BIJ, M-ATTR, R-TAG) run normally; a failure is a
   **08 defect** → `fail`, ordinary finding. In particular a **ghost scenario-tag** (a leaf
   tag absent from 06) is an **08** defect (08 named a tag 06 doesn't have), caught by R-TAG
   as an ordinary `fail` — not an upstream-defect.

2. **Well-formed but self-inconsistent upstream** (`upstream-defect`). 07 parses but
   declares a duplicate `(persona, job)` pair (filename collision) → routed → `07-personas.md`;
   OR a 06 feature carries a tag matching no closed grammar class → routed → the named
   `.feature`. The harness runs these **pre-resolution self-checks before** the 08→upstream
   checks; on failure the finding is tagged `class: "upstream-defect"`, `upstream: "<file>"`.
   Status `fail`, exit `1`; the fix routes **upstream**. Proven by `dup-job-07/` and
   `bad-tag-06/`.

3. **Unparseable 06 / 07** (`broken-test`, not `upstream-defect`). 07 does not parse against
   its pinned format (no `### <PersonaName>` / no `**Jobs-to-be-done:**` table, so the
   bijection set cannot be built), OR a 06 `.feature` is unreadable/unscannable (no scannable
   `Scenario` keyword, so the tag set cannot be built). The harness cannot anchor its
   resolution targets, so it cannot make a trustworthy statement about 08. Status
   `broken-test`, exit `3`, stderr "upstream <file> unparseable." Proven by `valid-08/` +
   `malformed-upstream-07` and `valid-08/` + `malformed-upstream-06`.

The splits are deliberate: `upstream-defect` (case 2) is an actionable content finding
routed to the correct upstream owner while keeping the §2 status set closed; `broken-test`
(case 3) is the harness honestly refusing to emit a verdict it cannot justify. No case lets
the harness paper over an upstream by inferring, substituting, or skipping a missing element.

---

*This contract mechanizes catalog rules A1–A9 / B1–B7 / C1–C6 / D1–D8 / E1–E7 / F1–F4.
**Mechanical / walker ❌ coverage is complete:** every one of the 30 ❌-severity catalog
rules has BOTH (a) a mechanical or walker owner check and (b) a dedicated negative fixture
**that ships on disk** (a directory-form set under `scripts/fixtures/`; the `.xml` names
below identify the mutated model file inside each). No "(variant)" placeholders remain — the
selftest's COVERAGE array runs every negative below and asserts its owner fires. The full
reconciliation (❌ rule → owner check → on-disk negative fixture):*

| ❌ rule | Owner check | On-disk negative fixture |
|---|---|---|
| A1 | M1 | `malformed-xml/` |
| A2 | M2 | `missing-fingerprint/` |
| A3 | M3 | `root-not-taskmodel/` |
| A4 | M4 | `id-not-slug/` |
| A5 | M5 / X-BUDGET-INT | `missing-budget/` |
| A6 | M6 / W-LOAD | `multi-root-task/` |
| A7 | M7 / X-ID | `bad-category/` |
| A8 | M8 | `unknown-attribute/` |
| B1 | M9 | `abstract-leaf/` |
| B2 | M10 | `single-child-abstract/` |
| B4 | M11 / W-REACH | `unreachable-leaf/` |
| B5 | M9 | `abstract-leaf/` |
| B6 | **M11** | `iterative-root/` |
| C1 | M12 / W-STEP | `operator-on-single-child/` |
| C2 | M13 / W-STEP | `multi-child-no-operator/` |
| C3 | M14 | `bad-operator/` |
| C4 | M15 | `unary-as-operator/` |
| D1 | M16 | `klm-absent-leaf/` |
| D2 | M17 | `bad-klm-token/` |
| D3 | M18 | `unreachable-leaf/` (its nested-leaf defect makes a klm-bearing task non-leaf) |
| D4 | M19 | `m-on-system-leaf/` / `missing-m-on-interaction-leaf/` |
| D5 | **W-BUDGET** | `budget-mismatch/` |
| D7 | M20 | `bad-multiplier/` |
| E1 | M-BIJ | `missing-model/` / `extra-model/` |
| E2 | M-ATTR | `persona-attr-mismatch/` |
| E3 | M21 | `untagged-leaf/` |
| E4 | R-TAG | `ghost-scenario-tag/` |
| E5 | M22 | `bad-upstream-06/` (06 tag matching no grammar class) |
| F1 | M23 | `restated-gherkin-text/` |
| F2 | M24 | `bad-category/` (the invented category is also off the owned 4-set) |

B6's owner is now **M11** (the constructible non-termination smell — an iteratively-unbounded
root task, since a tree-structured input cannot express a containment cycle). The walker's
**W-TERM** remains the bounded-step descent guard but no longer masquerades as B6's owner.

*(The ⚠️/ℹ️ rules — A9, B3/B7, C5/C6, D6/D8, E6/E7, F3/F4 — each still carry a mechanical
or walker owner where one exists (M25 for A9, M26/M27 for B3/B7, AJ1 for C5/E6, AJ3 for
C6/D6, R-FP for E7, M28 for F3, M29/AJ4 for F4, M-BIJ-uniqueness-guard for D8's padding
residue) and an agent-judged residue (AJ1–AJ4) where the rule is inherently semantic; none
is left as a blocking ❌ on the agent. The **budget (D5) is the load-bearing exact-value
check** — verified by the walker re-deriving the nominal-path sum and comparing to the
declared integer, never by an inline formula. The selftest's COVERAGE array asserts the
positive+negative floor over the §5 table and fails if any ❌ rule lacks either side.
Pass = status `pass` = zero ❌ findings, reconciled, ≥1 check executed, walker layer
non-empty.*
