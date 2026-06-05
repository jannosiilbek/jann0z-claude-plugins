# flow-acceptance — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `flow-acceptance` skill (artifact **10**, the
pipeline's **terminal** artifact — nothing consumes it): a **directory artifact**
`specs/10-flow-acceptance/` holding **one `<persona>-<job>.feature` file per `08` task model** (a
bijection with the `08-task-models/<persona>-<job>.xml` models). It defines the **sole executable
pass/fail authority** that ships with the skill: a **`@cucumber/gherkin` v39.1.0 parse-and-compile
oracle** (the engine layer — every emitted `.feature` is *parsed on the format's own reference parser
and compiled to pickles*, exactly as 06 is, since 10's output must parse under the same formalism) plus
a **walk-replay oracle** (the heart — the step sequence extracted from each feature's pickles is
**replayed against the persona's 09 navigation model**, proving the walk starts at home, traces real
NavigationFlow edges in order, realizes the 08 nominal-path leaf order, and binds every walked leaf's
scenario-tag to a resolvable 06 tag), a set of mechanical over-AST structure checks, a closed
resolution / exact-value / reason-qualified-negative checker, and a minimal set of agent-judged residue
checks. It satisfies the verification doctrine §2 (closed assertion grammar, stable JSON stdout, stderr
diagnostics, status taxonomy `pass|fail|malformed|broken-test`, success exit only on full pass, zero
checks ⇒ failure, agent judgment only where the contract marks it + closed verdicts), §6 (determinism,
fresh state, byte-identical re-runs, ids never asserted), and build steps B2 (formal-format oracle —
every `.feature` must PARSE under `@cucumber/gherkin@39.1.0` AND compile to ≥1 pickle — the engine
oracle) and B3 (closed fixtures; ≥3 classes; coverage floor + TRUE ❌ reconciliation — every ❌ rule
gets a dedicated on-disk negative; strongest oracle = run on the format's real engine + replay the walk
over the verified 09 graph; reuse over invention — the gherkin engine pattern + the ui-flows walker are
copied, never imported).

It is **paired with** `references/validation-rules.md` (the closed rule catalog, Themes A–E:
**A-a … A-j / B-a … B-f / C-a … C-d / D-a … D-f / E-a … E-d — 30 rules**). Every check below cites the
catalog rule ID(s) it mechanizes. **The catalog is the review vocabulary; this file is the executable
harness over it.** No check here exists without a catalog rule behind it.

The `10` artifact is a **formal-format artifact** with a real engine of its formalism — the
`@cucumber/gherkin` reference parser — exactly like `06` (Gherkin→pickles), `04` (DBML→Postgres), `05`
(SCXML→SCION). Per doctrine B3 ("prefer running the artifact on a real engine of its formalism") and B2
("must parse/validate under the authoritative validator … downstream instantiation must succeed"), the
strongest oracle is **executable**: parse each `.feature` on the pinned `@cucumber/gherkin` v39.1.0 →
**GherkinDocument AST**, then **compile** it to **pickles** (the compiled-scenario objects every
Cucumber runner instantiates). But unlike 06, 10's load-bearing claim is not merely *valid Gherkin* —
it is that **the step chain is a real walk of the verified 09 graph realizing the 08 happy path**.
Neither walkability nor leaf-order conformance is a shape fact the parser surfaces. So the heart of this
harness is a **walk-replay oracle** (§3.3) that extracts the ordered step sequence from each feature's
pickles and **replays it against the 09 model** — the same "run the artifact, don't trust a declared
number" discipline `ui-flows`'s flow-walker uses, copied as a PATTERN.

The artifact reads **three upstream inputs** — `06-gherkin/` (the domain layer; **owns the tag
vocabulary**), `08-task-models/` (the nominal-path leaf order — the happy path), `09-ui-flows/` (the
screen graph — the walk vocabulary). **There are no 02/04/05/07 inputs:** 10 reads personas, screens,
and events **THROUGH 09** (the 09 `persona` attribute, `ViewContainer` ids, `Event` ids + `01-event`
annotations, `NavigationFlow` edges) and behaviors **THROUGH 06 tags** (single ownership — 10 never
re-reaches past its three direct upstreams). The harness pin:

```
node scripts/harness.mjs <10-dir> \
     --upstream-06 <06-gherkin-dir> \
     --upstream-08 <08-task-models-dir> \
     --upstream-09 <09-ui-flows-dir>
```

All three flags are **required** (10 is unconditional: every 08 model has exactly one 10 feature —
A-a). 10 references all upstreams by exact string and **never restates** a 06 scenario body, an 08
task-tree structure beyond the nominal leaf order it walks, or a 09 model beyond the screen/event/edge
vocabulary it traces (Themes C/D/E). 10 owns only the **Gherkin walk structure derived via the pinned
dialect** (file name = exact 08 stem; `Feature:` name = natural-cased 08 job; `@task-model:` tag; the
fingerprint block; the closed step grammar: location `Given … is on the "<screen id>" screen`,
interaction `When` (01-event verbatim if domain-affecting else quoted Event id), navigation `Then … is
taken to the "<screen id>" screen`, outcome `Then the outcome of "<06 tag>" holds`).

## Index

Open the section the verdict points at; an agent debugging a `malformed`/`broken-test`/`upstream-defect` result can locate the right section from this table alone.

| § | Title | What you find |
|---|-------|---------------|
| §0 | Probe / oracle provenance | `@cucumber/gherkin` parse+compile oracle + copied sibling corpus |
| §1 | Tooling record | gherkin parser pin, entry points (`--upstream-06/-08/-09`), self-install/offline mode |
| §2 | Mechanical (over-AST) checks | structural `M*` checks over the AST + `malformed` vs `fail` |
| §3 | Closed fixture / scenario format | derived graph, **walk-replay oracle** (§3.3), fixtures, manifest |
| §4 | Closed assertion grammar | engine + walk-replay / resolution / exact-value / negative / agent-judged |
| §5 | Coverage floor & TRUE ❌ reconciliation | intake/edge counts, per-❌ negative floor, positive+negative mapping |
| §6 | Agent-judged checks | Theme-D canon residue; closed verdict schemas |
| §7 | Output contract | stdout JSON shape, exit codes, `upstream-defect` routing |
| §8 | Determinism | ids never asserted; no replay-minted value; byte-identical re-runs |
| §9 | Upstream-defect routing + single-ownership | how an 06/08/09 defect is reported; ownership notes |

## 0 — Probe / oracle provenance (`@cucumber/gherkin` v39.1.0 parse+compile oracle; copied sibling corpus)

The pinned oracle is **`@cucumber/gherkin` v39.1.0** (SOURCES.md: npm `latest`, published
2026-05-06T14:49:50Z, MIT; GitHub tag `v39.1.0`; no newer release exists as of the source-pin date) —
the same reference parser the `06` skill pins, **by design**: 10's emitted `.feature` files are the
identical formalism as 06's, so they must parse under the identical parser. Per the isolation directive
the parser is **executable / not vendored** (installed at the pinned version when a runnable oracle is
needed), and the **`testdata/{good,bad}` corpus is COPIED at build from the sibling `gherkin` skill**
into this skill's `sources/testdata/` (SOURCES.md "Shared corpus — COPY (never reference)") so the skill
stays self-contained. `testdata/bad` (11 `.feature` + 11 `.errors.ndjson`) is the **parse-negative
oracle**; the harness asserts BOTH that the parser threw AND that `e.errors[0].message` matches the
expected `*.errors.ndjson` shape.

**Engine provenance (the `gherkin` sibling §0 probe, copied as the oracle record).** The `gherkin`
skill empirically verified `@cucumber/gherkin@39.1.0` on current Node (v24.13.0) as both parser and
pickle compiler; this skill **reuses that verification** (identical parser, identical formalism), and
re-runs the same probe shape at build:

```js
import { Parser, AstBuilder, GherkinClassicTokenMatcher, compile } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

const newId = IdGenerator.incrementing();           // PINNED: deterministic sequential ids (§8); never uuid
function parseFeature(src, uri) {
  const parser = new Parser(new AstBuilder(newId), new GherkinClassicTokenMatcher());
  const gherkinDocument = parser.parse(src);         // → AST (throws CompositeParserException on malformed)
  gherkinDocument.uri = uri;
  const pickles = compile(gherkinDocument, uri, newId);  // → pickles (the instantiation oracle)
  return { gherkinDocument, pickles };
}
```

Recorded facts the harness depends on (from the gherkin §0 probe, identical here):
- `gherkinDocument.comments` **preserves comment text** with `location` — so the leading `# fingerprints:`
  block is readable for A-d, and "before `Feature:`" is checkable by `location.line`.
- `pickle.steps` carry `{type: Context|Action|Outcome, text}`; **the pickle step text is the
  fully-rendered step line** (keyword stripped) — this is the string the walk-replay tokenizes.
- a `Feature:` with no scenario compiles to **`pickles.length === 0`** — the vacuous oracle (A-f/A-g).
- the parser **throws** `CompositeParserException` on malformed input; `e.errors[]` each carry
  `{message, location}` matching the `testdata/bad` `.errors.ndjson` oracles byte-for-byte.

**Self-install + offline (pinned).** The dep is **not vendored**. On startup the harness checks for
`scripts/node_modules/@cucumber/gherkin` + `@cucumber/messages`. **Present** → run. **Absent + network**
→ `npm ci --prefix scripts --no-audit --no-fund` (lockfile present) else `npm install …` — one-time,
~2 s per the gherkin probe. **Absent + no network** → the harness does **not** silently skip the parser
and emit a green; it exits `status: broken-test`, exit `3`, stderr naming the missing package + install
command. This is the `gherkin`/`erd`/`statecharts` "missing engine ⇒ broken-test, never a vacuous pass"
rule. **The 09/08/06 readers are hand-rolled and zero-dependency** (below), so the *only* install path
is the Gherkin parser; an unreadable upstream is `broken-test` for a different reason (§9), never a
missing-dep.

## 1 — Tooling record (B2; oracle choice + versions + self-install + offline mode)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `gherkin`/`ui-flows`/`task-models` harnesses (suite uniformity); the shared gherkin probe ran on v24.13.0. |
| Entry points | `scripts/harness.mjs` (the oracle; the 4-arg invocation above), `scripts/selftest.mjs` (runs the harness over every shipped fixture set and asserts the expected status + failing-check + upstream-route + the parse-negative error-shapes + the coverage floor). |
| **Parse + compile oracle** | **`@cucumber/gherkin` 39.1.0** (pinned; SOURCES.md normative parser; identical to the `06` skill — 10 emits the same formalism). The probe-verified flow (`new Parser(new AstBuilder(id), new GherkinClassicTokenMatcher())` → `parse(src)` → AST; `compile(doc, uri, id)` → pickles) is the **parse + downstream-instantiate** B2 requires. The format's own reference implementation — the strongest possible "reuse over invention." |
| **Messages peer** | **`@cucumber/messages`** (pinned; the parser's declared peer — supplies `IdGenerator` and the AST/pickle message schema). `IdGenerator.incrementing()` pinned for determinism (§8); **no id value is ever asserted regardless.** |
| **09 IFML-XMI-subset reader** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/ifml.mjs`. **COPIED PATTERN from the `ui-flows` (09) harness `xml.mjs`** (the strict reader over the pinned IFML-XMI subset: `IFMLModel`/`Realizes`/`ViewContainer`/`ViewComponent`/`Event`/`NavigationFlow` + the fingerprint comment + the `<!-- 01-event: … -->` annotation comments). Narrowed to the slice 10 *walks*: the persona attribute, the `ViewContainer` ids + `home="true"`, each `Event` (`id`, `task=`, `01-event` annotation if present), and the `NavigationFlow` edges. **Copied, never imported** (isolation directive). The reader only inspects shape; the walk-replay (not this reader) is the authority on what the graph *does*. 10 does NOT re-certify 09's own seams (budgets, bindings, KLM) — that is the 09 harness's single-owned job (§9). |
| **08 CTT nominal-path walker** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/taskmodel.mjs`. **COPIED PATTERN from the `08`/`09` CTT walker `walker.mjs`** (the nominal-path descent: enabling/concurrent → all children in order; `choice` → first document-order child; `disabling`/`suspendResume` → left; skip `optional`; `iterative` once), narrowed to the **ordered nominal-path leaf list + each leaf's id + its `scenario-tags`** 10 needs to re-derive the happy-path order and the per-leaf tag obligations. **Copied, never imported.** 10 does NOT re-verify 08's tag/operator/KLM/budget seams — single ownership (§9); it re-walks only to obtain the ordered nominal-leaf sequence + each walked leaf's scenario-tags. |
| **06 tag-scanner** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/tags.mjs`. **COPIED PATTERN from the `08` (task-models) `tags.mjs`**: a minimal line scanner over each `06/*.feature` collecting every `@…` token on tag lines that precede a `Scenario:`/`Scenario Outline:` keyword → the `tags06` set (the 06 tag vocabulary 10's outcome bindings resolve against — C-a/E-b). **No Gherkin parser over the 06 files** — single-ownership: the `06` harness owns full `.feature` parsing (§9); 10 reads 06 only for its tag set. |
| External deps | **Only `@cucumber/gherkin` + `@cucumber/messages`** (the engine, for parsing the *10* features). The 09/08/06 readers are all hand-rolled + zero-dep (copied PATTERNs); no `@dbml/core`, no IFML engine (the 09 probe proved none exists), no SCXML reader (10 never touches 05). |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Closed lexicons | `scripts/lib/lexicon.mjs` — the pinned closed sets: the **step-grammar matchers** (location / interaction / navigation / outcome regexes, below), the **closed 06 tag grammar** (`@invariant:INV-[A-Za-z][A-Za-z0-9]*-\d+` / `@transition:[a-z][a-z0-9_]*` / `@terminal:[a-z][a-z0-9_]*` / `@policy:[A-Za-z0-9_-]+`, copied from the 06/08 lexicon), the **`@task-model:` feature-tag shape**, the **snake_case validator** `^[a-z][a-z0-9_]*$` (screen/event id shape), and the **UI-mechanics blocklist** (B-f/D-a: `click`, `press`, `type`, `fill`, `visit`, URL/CSS/pixel tokens). Closed and vendored; extended only by a committed edit, never ad hoc. |

**Rationale for the walk-replay oracle over a parse-only harness.** A 10 feature's load-bearing claims
are **navigational** and **referential**: that the step chain *walks a real path through the 09 graph
from home* (B-b/B-c), *realizes the 08 nominal-path leaf order* (B-d), and *binds every walked leaf's
tag to a resolvable 06 tag* (C-a/C-b). None is a shape fact the Gherkin parser surfaces — each requires
*replaying the step sequence against the verified 09 graph* and *cross-referencing the 08 walker + 06
tag set*. Doctrine B3 names the strongest oracle ("run on a real engine"); for the `.feature` *syntax*
the engine is `@cucumber/gherkin`, but for the *walk* the engine is the **09 NavigationFlow graph**
itself — so the harness **replays the walk over it** rather than regex-matching step text in isolation.
The step grammar is closed and mechanically matchable, but a step that is *individually well-formed*
("`Given the Dispatcher is on the "ghost_screen" screen`") is only caught by *replaying it against the
real graph* (the screen is absent ⇒ V-LOC fails). A parse-only harness would leave 10's three most
important claims (walkability, leaf-order, tag-resolution) unverified. The Gherkin engine and the
mechanical layer inspect AST shape + step grammar the replay does not surface; the replay walks the
graph the parser cannot see.

## 2 — Mechanical (over-AST) checks — structural; A/B/C/D/E shape rules

After the engine layer (§3.3, W-*) produces an AST + pickle set per feature, structure checks run over
the AST. Each `10/*.feature` is parsed by `@cucumber/gherkin`; each `09/*.xml` by the copied `ifml.mjs`;
each `08/*.xml` by the copied `taskmodel.mjs`; each `06/*.feature` by the copied `tags.mjs`. Mechanical
IDs are `M-*`. A **parse failure** (the Gherkin parser throws) yields `malformed` (matched against the
`testdata/bad` oracle for negatives); a ❌ over a successfully-parsed feature yields `fail`; ⚠️/ℹ️ are
warn-only. **All checks here inspect AST shape + step grammar the walk-replay does not surface.**

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| M-BIJECT | **Directory ↔ 08 bijection.** `specs/10-flow-acceptance/` exists and is non-empty; the set of `*.feature` files **==** the set of `08-task-models/*.xml` models (exact stem bijection) — no missing feature for some 08 model, no extra feature with no 08 model, no two features for one 08 model. | A-a | `fail` |
| M-FILENAME | Each file is named `<exact 08 filename stem>.feature` (no casing drift, no reordered `<job>-<persona>`, no paraphrase, no stem matching no 08 file). | A-b | `fail` |
| M-PARSE | Each file **parses clean** on `@cucumber/gherkin` (no `CompositeParserException`). On throw, the diagnostic is matched against the `testdata/bad` negative oracle. | A-f | `malformed` |
| M-FEATNAME | Exactly one `Feature:` per file; its name text **==** the **natural-cased 08 job name** (job `fulfil-order` → `Feature: Fulfil order`; not the kebab stem, not the persona, not a mechanics paraphrase). | A-c, A-i | `fail` |
| M-FINGERPRINT | **Fingerprint block present, well-formed, leading.** A `# fingerprints:` comment block appears **before** the `Feature:` line (read from `gherkinDocument.comments`, all with `location.line` < the `Feature:` line); names every **consumed 06 `.feature`**, the persona's **09 model** (`09-ui-flows/<persona>.xml`), and the **08 model** (`08-task-models/<persona>-<job>.xml`), each `<file>@sha256:<64-hex>` (64 chars `[0-9a-f]`, none a placeholder `0000…`/`xxxx…`/`<hex>`). | A-d | `fail` |
| M-FEATTAG | **Feature-level `@task-model:` tag present + well-formed.** The `Feature:` carries `@task-model:<exact 08 stem>`; the stem **==** this file's 08 model stem (so it resolves to this file's 08 model); no whitespace (parser-rejected at M-PARSE). | A-e | `fail` |
| M-THEN-SHAPE | **Every `Then`/`And`/`But` under a `Then` is a navigation OR an outcome step** — matches `… is taken to the "<screen>" screen` (navigation) **or** `the outcome of "<06 tag>" holds` (outcome). A `Then` asserting domain state in prose (the C-c violation — "the order is Dispatched") matches neither ⇒ fail. (The mechanical enforcement of "domain assertions are never restated.") | C-c | `fail` |
| M-WHEN-FORM | **Each interaction `When` matches exactly one pinned form, performing one interaction.** A `When` step text matches **either** `When the <persona> <…>: "<embedded string>"` (domain-affecting form) **or** `When the <persona> triggers the "<id>" event` (quoted-id form) — never both, never a paraphrase of either; and contains **exactly one** quoted interaction token (no `… and …` chaining two events). (The shape arm of B-e; the Event-kind correctness is V-EVENT in the replay.) | B-e, D-b | `fail` |
| M-PERSONA | **Persona natural name consistent + no pronoun.** Every step names the actor with the **exact 09 `<IFMLModel persona="…">` value** verbatim; no paraphrase, no role drift, no `I`/`me`/`my`. (The natural-name value is read from the persona's 09 model; consistency is mechanical, resolution to 09 is E-a.) | E-a | `fail` |
| M-NO06BODY | **No 06 scenario body copied (DRY shape-lint).** No 10 step text reproduces a 06 scenario's Given/When/Then body or embeds a 06 invariant's rule text (≥6 consecutive verbatim tokens from a single 06 scenario step) — the walk duplicating 06 instead of binding it by tag. (Spans that are a *mandated verbatim* 09 `01-event` string the `When` is compelled to embed are masked first — the erd-L12 / catalog E-c exemption.) | E-d, E-c | `fail` |
| M-DECLARATIVE | **Steps are declarative — no UI mechanics below the screen id.** No step text contains a token from the UI-mechanics blocklist (`click`/`press`/`type`/`fill`/`visit`, a CSS selector, a URL, pixel/button language) outside a masked verbatim 09 `01-event` span. (B-f obvious-imperative arm; the style residue is AJ-DECL, §6.) | B-f, D-a | `fail` |
| M-ONEWHEN | **Single interaction per `When`.** Per pickle, no `When`-typed step joins two actions (`When X and Y`) or two events. (Each scenario chain has several `When`s as it walks; each is exactly one Event.) | D-b | `fail` |
| M-GWT | **G/W/T role discipline.** Per pickle, the step `type` sequence is `Context (Action Outcome*)*` — a `Given` (location) establishes context, a `When` (Action) acts, a `Then` (Outcome) is navigation-or-outcome only; no Outcome before the first Action, no Action smuggled into an Outcome position. | D-c | `fail` |
| M-TITLE | **Scenario title is behavioral.** Title is non-empty, not mechanical (`Walk the screens`/`Test fulfil order`/`Click through`), and not a verbatim restatement of step text. | D-e | warn-only (⚠️) |
| M-BACKGROUND | **`Background` holds only shared `Given` context.** `Background` (when present) holds only `Context` (Given) steps — no `When`/`Then`. | D-d | warn-only (⚠️) |
| M-LANG | **English dialect.** No `# language:` header, or `# language: en`; any non-`en`/unsupported code ⇒ caught at M-PARSE (parser-rejected) or flagged here. | A-h | warn-only (⚠️) |
| M-DESC | **Feature description carries no domain assertion / upstream dump.** The free-text block under `Feature:` (when present) is a short job framing — does not restate a 06 invariant, dump a 09 nav table, or copy an 08 task list. | A-j | warn-only (⚠️) |
| M-INCIDENTAL | **No incidental detail in the walk.** No step specifies values that don't matter (timestamps, emails, exact ids where the screen-id/event/tag abstraction suffices). | D-f | warn-only (ℹ️) |

M-BIJECT / M-FEATTAG are the **structural backbone**; M-THEN-SHAPE / M-WHEN-FORM are the **closed
step-grammar backbone** (the C-c "every Then = nav|outcome" enforcement + the single-When B-e shape);
M-NO06BODY / M-DECLARATIVE the **DRY/declarative backbone**. The 06 tag set, the 09 persona/screen/event
vocabulary, and the 08 nominal-leaf order are all **read fresh per run** from the parsed upstreams
(upstream-owned data, never vendored constants).

## 3 — Closed fixture / scenario format (B3)

The scenario has **two halves**, because the artifact has two oracles:

1. **Engine layer (§3.3, W-*)** — each emitted `.feature` is parsed on `@cucumber/gherkin` and compiled
   to pickles; parse-clean + non-empty pickle set is the instantiation assertion (positive); the
   `testdata/bad` corpus subset is the parse-negative oracle.
2. **Walk-replay oracle (§3.3, V-*) — the heart** — the ordered step sequence extracted from each
   feature's pickles is replayed against the persona's 09 model, then cross-referenced to the 08 walker
   + 06 tag set (mechanical scenarios §3.1–§3.2 carry the structural/DRY claims).

No external scenario data is injected into a *target* run; the upstreams + the 10 directory supply every
element. The shipped fixtures (§3.4) are **whole canned upstream sets + 10 directories** used only by
`selftest.mjs`.

### 3.1 Derived scenario graph (built fresh per run — §8)

From each parsed **10 `.feature`** (AST + pickles) the harness derives:
`feature = {stem, featureName, featureTag, fingerprints{}, scenarios[] ({title, steps[] ({type,
text})}), pickles[]}`. From each pickle's `steps[]`, each step text is classified by the closed step
grammar into `{kind: location|interaction|navigation|outcome, screenId?, eventToken?, embeddedString?,
tag?}` → the **ordered walk step list**.

From parsed **09** (`ifml.mjs`): per persona `model09 = {persona, homeContainer, containers[] (id),
events[] ({id, container, task?, annotation01?}), flows[] ({fromEvent, toContainer})}`.
From parsed **08** (`taskmodel.mjs`): per model `taskModel08 = {stem, persona, nominalLeaves[] ({id,
scenarioTags[]})}` (the ordered nominal-path leaf list + each leaf's scenario-tags).
From the **06** tag-scanner: `tags06` = the set of every `@…` token on a scenario-preceding tag line
across all `06/*.feature` files (the resolvable 06 tag vocabulary).

Closed traversal set (every relationship 10 claims becomes a walked edge):

1. **Bijection edge** — `{10 feature files} == {08 models}` (M-BIJECT).
2. **Feature-tag edge** — each `@task-model:` tag resolves to this file's 08 model (M-FEATTAG).
3. **Walk-start edge** — each scenario chain's first location `Given` is the persona's home container
   (V-START).
4. **Location edge** — each location `Given`'s `<screen id>` ∈ the persona's 09 containers (V-LOC).
5. **Interaction edge** — each `When`'s Event resolves to an Event of the current container, by the
   correct form per the domain-affecting disambiguation (V-EVENT).
6. **Navigation edge** — each navigation `Then` follows an existing 09 `NavigationFlow` from the
   preceding `When`'s Event to the named container (V-NAV).
7. **Leaf-order edge** — the walked interaction sequence (Events → 08 leaves via `task=`) realizes the
   08 nominal-path **interaction/user**-leaf order (V-ORDER; `system` nominal leaves carry no walk
   obligation and are excluded from both sides — note d.4).
8. **Coverage edge** — every walked 08 leaf's scenario-tag is covered by an outcome binding (V-COVER).
9. **Tag-resolution edge** — each outcome binding's `<06 tag>` ∈ `tags06`, within the closed grammar
   (V-TAG / C-a).
10. **Instantiation edge** — each feature parses + compiles to ≥1 pickle (W-*; §3.3).
11. **Shape / DRY edges** — Then-shape, single-When, persona-consistency, no-06-body, declarative
    (M-THEN-SHAPE / M-WHEN-FORM / M-PERSONA / M-NO06BODY / M-DECLARATIVE).

Every edge class is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Cross-artifact resolution (mechanical, no replay)

Edges 1–2, 9, 11 are pure bijection / resolution / grammar / DRY checks over the parsed AST + upstream
models. Byte-deterministic, no replay. The pinned mappings (file name = exact 08 stem; `Feature:` name
= natural-cased 08 job; `@task-model:` = exact 08 stem; step grammar; outcome tag ∈ 06 vocabulary) are
the catalog's "Pinned conventions" block, copied into `scripts/lib/lexicon.mjs` so the harness and the
catalog agree by construction.

### 3.3 Engine layer + walk-replay oracle — the strongest-oracle design (B3, this skill's load-bearing layer)

**Engine layer (`W-*`).** For each `.feature`, the harness **parses and compiles** it on
`@cucumber/gherkin`. **No parser-minted value is ever asserted** (§8): the AST and pickles are
*deterministic* functions of the input bytes (with `IdGenerator.incrementing()`), and ids are never
asserted regardless.

| ID | Step | Assertion | Catalog rule |
|----|------|-----------|--------------|
| W-PARSE | `parser.parse(src)` | returns an AST without throwing (positive); on a negative fixture, **throws** with a message matching the expected `testdata/bad`-shaped oracle (wrong-shape throw ⇒ `broken-test`). | A-f |
| W-FEAT | inspect `gherkinDocument.feature` | exactly one feature; `feature.name` == natural-cased 08 job. | A-c, A-i |
| W-INST | `compile(doc, uri, id)` | **pickle set is non-empty** (`pickles.length ≥ 1`) — the instantiation oracle; **zero pickles ⇒ `fail` (vacuous feature: a `Feature:` with no executable scenario)**. | A-f, A-g |

**Walk-replay oracle (`V-*`) — the heart.** After the engine layer + mechanical step-grammar gates
(M-THEN-SHAPE / M-WHEN-FORM), the harness **extracts the ordered step sequence from each feature's
pickles** and **REPLAYS it against the persona's 09 model**. **No replay-derived value is ever asserted
blindly** (§8): the replay is *deterministic* — the step order is fixed by the pickle, the 08 nominal
path is pinned (copied 08 rule), the graph lookup is exact (no search ambiguity — each step names its
target container/event explicitly). The persona is the 09 model whose `persona` value matches the 08
model's persona (derived from the 08 stem); a feature whose `@task-model:` persona has no 09 model is a
fail surfaced at M-FEATTAG / the 09-resolution edge.

| ID | Replay step | Assertion | Catalog rule |
|----|-------------|-----------|--------------|
| V-START | initialize `current := home="true"` container; check the chain's first location `Given` | the first location `Given`'s `<screen id>` **==** the persona's home container. | B-b |
| V-LOC | for each location `Given`, match `<screen id>` against `current` | each location `Given`'s `<screen id>` is a 09 `ViewContainer.id` **and equals the current container** the walk has reached (a `Given` naming a screen absent from 09 ⇒ the B-a finding; a `Given` naming a real-but-wrong screen ⇒ the walk desynchronized ⇒ B-c). | B-a, B-c |
| V-EVENT | for each interaction `When`, resolve to an Event of `current` | the `When` resolves to exactly one `Event` declared in `current` — **by the pinned disambiguation**: if the Event is **domain-affecting** (carries an `01-event` annotation in 09), the `When` text must contain that exact `01-event` string verbatim; if **non-domain-affecting** (no `01-event`), the `When` must contain the exact `Event` id in quotes. Wrong form for the Event's kind ⇒ fail. | B-e |
| V-NAV | for each navigation `Then`, follow a 09 edge from the preceding `When`'s Event | a `NavigationFlow` exists whose `from` == the immediately-preceding `When`'s resolved Event and whose `to` == the navigation `Then`'s `<screen id>`; **update `current := <screen id>`**. No such edge ⇒ the walk traces a path that does not exist in the 09 graph (B-c). | B-c |
| V-ORDER | collect the walked interaction Events → 08 leaves (via `Event.task=`); re-derive the 08 nominal-path leaf order (copied 08 walker), **restricted to the interaction/user leaves** | the ordered walked-leaf sequence **==** the 08 nominal-path **interaction/user**-leaf order (no reorder, skip, or off-nominal interleave). **A `system`-category nominal leaf imposes NO screen/Event obligation** (the verified 09 contract's B-b system-leaf-no-obligation clause, `INTERACTION_LEAF_CATEGORIES = {interaction, user}`), so it is excluded from BOTH sides of the comparison — never realized by an 09 Event, never required in the walked order (excluded leaves reported as `systemLeavesExcluded`). | B-d |
| V-COVER | collect each walked 08 leaf's `scenario-tags`; collect the chain's outcome bindings | every walked leaf's scenario-tag has ≥1 matching `Then the outcome of "<that tag>" holds` step in the chain. | C-b |
| V-TAG | for each outcome binding, resolve `<06 tag>` | the quoted `<06 tag>` ∈ `tags06` (resolves to a tag carried by some 06 scenario) AND is within the closed 06 grammar. | C-a |

**(a) The replay walk (V-START…V-NAV).** The 10 feature *claims* its step chain walks the 09 screen
flow. The harness proves this by **replaying**: it initializes `current` to the home container
(V-START), then steps through the pickle's ordered steps maintaining `current` — each location `Given`
must equal `current` (V-LOC), each interaction `When` must resolve to an Event of `current` by the
correct form (V-EVENT), each navigation `Then` must follow a real 09 edge from the preceding Event,
advancing `current` (V-NAV). If any step names a screen/event absent from 09, or a navigation with no
backing edge, the replay strands at that step — reported with the step text, `current`, and the missing
target. **Pinned determinism:** the replay is a single forward pass with no search (each step names its
exact target), so the same feature + 09 model yields the same outcome every run (§8).

**(b) The leaf-order + tag binding (V-ORDER…V-TAG) — the cross-artifact heart.** The walk's interaction
Events map (via `Event.task=`) to 08 leaf ids; the harness re-walks the 08 model (copied nominal-path
rule) to obtain the **happy-path leaf order** — restricted to the **interaction/user** leaves, since the
verified 09 contract imposes no screen/Event obligation on `system` leaves (note d.4) — and asserts the
walked sequence realizes it exactly (V-ORDER). Each walked leaf carries `scenario-tags` (read from the 08 leaf); the chain's outcome
bindings must cover every such tag (V-COVER), and each binding's tag must resolve against the 06
vocabulary (V-TAG / C-a). **Domain assertions are never restated** — only the bindings appear; the
M-THEN-SHAPE mechanical gate already forbids a prose `Then`, and V-TAG/V-COVER prove the bindings
present + resolvable. The three [PLAN] acceptance-closure findings are each a ❌ owned here: **a step
naming a screen absent from 09** (V-LOC / B-a), **a 06 tag that resolves nowhere** (V-TAG / C-a), **an
08 task model with no 10 feature** (M-BIJECT / A-a).

**(b-strand) Strand-stops-evaluation — the forward pass STOPS at the strand point.** The replay is a
single forward pass that maintains `current`. The moment a chain **strands** — a V-LOC / V-EVENT /
V-NAV failure desynchronizes the walk from the 09 graph (a ghost screen, a wrong-form/absent event, a
missing edge) — every subsequent step of that chain is **unreachable**: the walk is no longer standing
where the spec claims, so a later interaction's leaf realization or a later outcome's tag binding
cannot be trusted and **must not be evaluated**. From the strand point on, the harness stops collecting
walked leaves and bound tags (the skipped steps are counted as `skippedAfterStrand` in the replay
result for transparency), and the derived cross-references **V-ORDER / V-COVER / V-TAG evaluate only the
reachable prefix**. Consequently V-ORDER and V-TAG do **not** co-fire on the unreachable tail: when the
walk stranded, V-ORDER is recorded `pass` (leaf order is unassessable — the strand reason owns the
failure), and V-TAG sees only pre-strand bindings (a post-strand ghost tag never reaches it). This is
exactly what the `wrong-reason-trap` fixture proves: a feature carrying **both** a ghost screen (B-a,
V-LOC) and a post-strand ghost outcome tag (C-a, V-TAG) reports **V-LOC alone** — the first real
reason — never V-TAG. Edge arithmetic: the per-feature V-* checks are each still recorded exactly once
(the edge counts in §5 are static step-counts, unchanged), but the post-strand elements carry no
pass/fail obligation — the same exclusion principle as the vacuous-feature replay skip (a zero-scenario
feature contributes no replay edges; here a stranded tail contributes no leaf/tag obligation).

**(c) No negative walk on the graph itself.** The replay has no event-input to "fire wrongly" — the
negatives are the **illegal fixtures** (§3.4), each a 10 feature with one injected defect the replay or
a mechanical check must reject for the stated reason (`walk-not-from-home` is the V-START negative,
`ghost-screen-id` the V-LOC negative, `broken-nav-edge` the V-NAV negative, `out-of-order-walk` the
V-ORDER negative, `uncovered-leaf-tag` the V-COVER negative, `ghost-outcome-tag` the V-TAG negative).

**(d) Implementation notes — replay deviations from the naive spec (the harness as built).** Four
mechanics in `scripts/lib/replay.mjs` refine the §3.3 description and are recorded here so the doc and
code agree:

1. **V-ORDER nominal-leaf filtering.** The walked-leaf sequence compared against the 08 nominal order is
   built **only from interaction Events whose `task=` resolves to an 08 *nominal* leaf** (`nominalLeafIdSet`
   membership). A walked Event that is a non-domain *navigation* Event — one whose `task` is not an 08
   nominal leaf — is part of the walk (it advances `current`) but realizes **no** leaf, so it does not
   enter the V-ORDER comparison. Without this filter, navigation chrome would pollute the leaf-order
   equality and produce spurious V-ORDER failures.
2. **Vacuous-feature replay skip with edge exclusion.** A feature that compiles to zero scenarios/pickles
   has **no walk to replay**; W-INST (A-f/A-g) already records the blocking vacuous-feature failure. The
   harness therefore **skips the replay entirely** for such a feature AND **excludes its replay edges**
   from `edgesExpected`, so the §5 reconciliation arithmetic does not expect replay edges that cannot be
   walked (a skipped replay must not look like a silently-dropped check).
3. **Strand-stops-evaluation skip (new, see (b-strand)).** Once a chain strands (V-LOC/V-EVENT/V-NAV
   desync), the post-strand steps are excluded from leaf/tag collection (`skippedAfterStrand`), and
   V-ORDER is recorded `pass` (unassessable; strand owns the failure) while V-TAG/V-COVER see only the
   reachable prefix. Edge counts are static step-counts and stay balanced — only the pass/fail obligation
   of the unreachable tail is dropped, exactly like the vacuous-skip precedent in note 2.
4. **V-ORDER nominal-side system-leaf filter (the symmetric counterpart of note 1).** Note 1 filters the
   **walked** side to Events whose `task=` resolves to an 08 nominal leaf. The **nominal** side carries
   the matching filter: the 08 nominal-path leaf list compared by V-ORDER is restricted to leaves whose
   `category ∈ {interaction, user}`; `system`-category nominal leaves are dropped from the comparison
   (and reported as `systemLeavesExcluded` in the replay result). This mirrors the verified 09 contract,
   which imposes **no screen/Event obligation on system leaves** (the 09 B-b clause: `system` leaves are
   dropped from the realization sequence, `INTERACTION_LEAF_CATEGORIES = {interaction, user}`, copied
   from `ui-flows/lib/lexicon.mjs`). Because the 09 contract forbids any Event from realizing a system
   leaf, the 10 walk can never realize one either — so a system leaf left in the nominal comparison would
   make every real 08 model carrying a system leaf on its nominal path **unwalkable** (walked side
   `[…interaction/user…]` ≠ nominal side `[…interaction/user… + system…]`). The filter restores the
   symmetry: V-ORDER compares interaction/user leaves on both sides, exactly as 09's B-b does. The
   `taskmodel.mjs` nominal-leaf builder carries each leaf's `category` so the filter can apply. Proven by
   the shared `upstream-08/picker-pick_order.xml` regression (a `reserve-stock` system leaf between
   `pick` and `complete`, realized by no 09 Event) — `valid-10` still passes V-ORDER; selftest §3b
   asserts the leaf is excluded + reported.

### 3.4 Shipped fixtures (`scripts/fixtures/`)

One shared deterministic **mini upstream set** — REUSING the `ui-flows`/`task-models` sibling
mini-upstream shapes as the PATTERN (snake_case ids, snake_case statuses, two personas):

- **`upstream-06/`** — **2 `.feature` files** carrying tags across their scenarios (e.g.
  `order.feature` with `@transition:order`, `@terminal:order`; `shipment.feature` with
  `@transition:shipment`), tags on tag lines preceding `Scenario:` keywords (the 06 tag vocabulary 10's
  bindings resolve against). Static; mutually consistent.
- **`upstream-08/`** — **2–3 task models** (valid per the 08 dialect, each fingerprint-clean):
  `dispatcher-fulfil_order.xml`, `dispatcher-cancel_order.xml`, `picker-pick_order.xml`, each with a
  nominal-path tree whose leaves carry `scenario-tags` drawn from the 06 set, in a happy-path order the
  10 walk must realize. Static; no clock/random.
- **`upstream-09/`** — **1–2 IFML models** consistent with 06+08: `dispatcher.xml` (home container, the
  `ViewContainer` ids the walk visits, the `Event`s with `task=` mappings to the 08 leaves + `01-event`
  annotations on domain-affecting events, the `NavigationFlow` edges the walk traces), and
  `picker.xml`. Static; the graph is internally sound (so a `valid-10/` walk succeeds).

Plus a **`valid-10/`** directory (a correct `.feature` per 08 model — `dispatcher-fulfil_order.feature`,
`dispatcher-cancel_order.feature`, `picker-pick_order.feature`; each with a leading `# fingerprints:`
block naming its consumed 06 features + the persona's 09 model + its 08 model, the natural-cased
`Feature:` name + `@task-model:` tag, a scenario chain starting at home, tracing real 09 edges in the 08
nominal-leaf order, every walked leaf's tag bound to a resolvable 06 tag), the illegal 10 fixtures, and
the broken-upstream fixtures.

Each illegal fixture carries **exactly one** deliberate defect so its negative fires **for the stated
reason** (a fixture failing for any other reason is itself `broken-test`). The expected
`(status, failingCheck, upstreamRoute?, errorShape?)` is recorded in `scripts/fixtures/manifest.json`.

| Fixture (10) | Injected defect | Must fail | Expected status |
|--------------|-----------------|-----------|-----------------|
| `valid-10/` | none — minimal correct 10 (one feature per 08 model) | nothing | `pass` |
| **Structure (Theme A):** | | | |
| `missing-feature/` | an 08 model with no `.feature` (bijection break — the [PLAN] finding) | M-BIJECT (A-a) | `fail` |
| `extra-feature/` | a `.feature` for no 08 model (bijection break) | M-BIJECT (A-a) | `fail` |
| `bad-filename.feature` | file named `dispatcher-fulfil-order.feature` when 08 stem is `dispatcher-fulfil_order` (stem mismatch) | M-FILENAME (A-b) | `fail` |
| `wrong-feature-name.feature` | `Feature: dispatcher-fulfil_order` (kebab stem, not natural-cased job) | M-FEATNAME (A-c) | `fail` |
| `missing-fingerprint.feature` | no leading `# fingerprints:` block | M-FINGERPRINT (A-d) | `fail` |
| `placeholder-fingerprint.feature` | a digest is `<hex>`, not 64-hex | M-FINGERPRINT (A-d) | `fail` |
| `missing-task-model-tag.feature` | `Feature:` lacks `@task-model:` | M-FEATTAG (A-e) | `fail` |
| `ghost-task-model-tag.feature` | `@task-model:dispatcher-nope` (resolves to no 08 model) | M-FEATTAG (A-e) | `fail` |
| `parse-not-gherkin.feature` | text before `Feature` (adapted `testdata/bad` `not_gherkin`) | M-PARSE / W-PARSE (A-f) | `malformed` (msg = `(1:1): expected …, got 'not gherkin'`) |
| `parse-whitespace-tag.feature` | a tag containing whitespace (adapted `whitespace_in_tags`) | M-PARSE / W-PARSE (A-f) | `malformed` (msg = `(r:c): A tag may not contain whitespace`) |
| `parse-bad-language.feature` | `#language:no-such` header (adapted `invalid_language`) | M-PARSE / W-PARSE (A-f/A-h) | `malformed` (msg = `(1:1): Language not supported: no-such`) |
| `zero-pickles.feature` | a `Feature:` with no scenario (compiles to **zero pickles**) | W-INST (A-f/A-g) | `fail` |
| **The walk (Theme B):** | | | |
| `ghost-screen-id.feature` | a location `Given` names `"ghost_screen"` (absent from 09 — the [PLAN] finding) | V-LOC (B-a) | `fail` |
| `walk-not-from-home.feature` | the chain's first `Given` is a non-home container | V-START (B-b) | `fail` |
| `broken-nav-edge.feature` | a navigation `Then` to a container with no backing 09 `NavigationFlow` from the preceding Event | V-NAV (B-c) | `fail` |
| `out-of-order-walk.feature` | the interaction sequence reorders two 08 nominal leaves | V-ORDER (B-d) | `fail` |
| `when-form-violation.feature` | a `When` uses the quoted-id form for a **domain-affecting** Event (must embed the `01-event` string) | V-EVENT / M-WHEN-FORM (B-e) | `fail` |
| **Outcome binding (Theme C):** | | | |
| `prose-then.feature` | a `Then` asserts domain state in prose ("the order is Dispatched") — neither nav nor outcome | M-THEN-SHAPE (C-c) | `fail` |
| `uncovered-leaf-tag.feature` | a walked 08 leaf's `scenario-tag` has no outcome binding | V-COVER (C-b) | `fail` |
| `ghost-outcome-tag.feature` | `Then the outcome of "@transition:nonexistent" holds` (resolves nowhere — the [PLAN] finding) | V-TAG (C-a) | `fail` |
| **Language / DRY (Theme E):** | | | |
| `copied-06-body.feature` | a step copies a 06 scenario's Given/When/Then body verbatim | M-NO06BODY (E-d) | `fail` |
| `single-when-violation.feature` | a `When` chains two events (`When X and Y`) | M-ONEWHEN / M-WHEN-FORM (D-b) | `fail` |
| `bad-persona-pronoun.feature` | a step uses `I` instead of the 09 persona natural name | M-PERSONA (E-a) | `fail` |
| **Wrong-reason / vacuous guards:** | | | |
| `wrong-reason-trap.feature` | **two** defects — a ghost screen id (B-a, V-LOC) AND a ghost outcome tag (C-a, V-TAG) — proves the negative reports the **V-LOC** reason (the walk strands before reaching the outcome binding) | V-LOC isolates over V-TAG | `fail` (reason = V-LOC) |
| `vacuous-harness/` (`--no-checks`) | structurally valid 10 but harness fed the disabled path | n/a | `broken-test` (zero checks) |
| `no-engine/` | valid 10 but `node_modules` absent + network blocked | n/a | `broken-test` (missing parser) |
| **Upstream-defect routing (§9):** | | | |
| `dangling-09-in-path/` | a 09 model whose `NavigationFlow` graph the walk must traverse has a **dangling edge end in the walked path** (a `to` container absent from the model, on a hop the 10 walk needs) | walk strands on a broken upstream edge | `fail` (class=`upstream-defect` → the named 09 file) |
| `stuck-08-walker/` | a realized 08 model that **parses but whose nominal-path walker gets stuck** (e.g. a `choice` with no document-order child) | 08 nominal path underivable from a parseable tree | `fail` (class=`upstream-defect` → the named 08 file) |
| `malformed-upstream-06/` | a `06/*.feature` not well-formed (tag set unreadable) | n/a | `broken-test` |
| `malformed-upstream-08/` | a realized `08/*.xml` not well-formed (nominal path unreadable) | n/a | `broken-test` |
| `malformed-upstream-09/` | a `09/*.xml` not well-formed (the walk graph unreadable) | n/a | `broken-test` |

`wrong-reason-trap.feature` is the explicit doctrine §2 guard: it would "pass for the wrong reason"
under a sloppy negative; the selftest asserts the failing-check ID equals `V-LOC`, not merely that
*some* check failed. The `dangling-09-in-path/` and `stuck-08-walker/` rows route a
parseable-but-broken upstream to `fail` + `upstream-defect`→owner; the three `malformed-upstream-*` rows
route an **unparseable** upstream to `broken-test` (§9).

### 3.5 Manifest

`scripts/fixtures/manifest.json` records, per fixture,
`{files, status, failingCheck, upstreamRoute?, errorShape?}`. `selftest.mjs` runs the harness over each
entry and asserts the actual tuple equals the manifest — negatives are proven to fire **for their
stated reason**, the parse-negative `errorShape` matches the copied `testdata/bad` oracle, the
upstream-defect routes name the correct file, and the coverage floor (§5) is asserted true.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a check means
editing this section AND `scripts/lib/checks.mjs` in a committed change, and the new check MUST cite a
catalog rule. The harness emits each check's `id`, `class`, `status`, and `rule` in its JSON summary
(§7). **Five** classes — the four B3 classes plus the engine (parse+compile) class.

### 4.1 Engine / parse+compile checks (`W` — the feature is RUN on the reference parser)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| W-PARSE | every feature parses on `@cucumber/gherkin` without throwing (positive); a negative fixture throws with a message matching the expected `testdata/bad`-shaped oracle. | A-f |
| W-FEAT | exactly one `Feature:` per file; `feature.name` == natural-cased 08 job. | A-c, A-i |
| W-INST | `compile(...)` yields a **non-empty** pickle set; zero pickles ⇒ vacuous ⇒ fail. | A-f, A-g |

### 4.2 Walk-replay checks (`V` — the step chain is REPLAYED over the 09 graph + cross-referenced to 08/06)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| V-START | the chain's first location `Given` is the persona's `home="true"` container. | B-b |
| V-LOC | each location `Given`'s `<screen id>` is a 09 container AND equals the walk's current container. | B-a, B-c |
| V-EVENT | each interaction `When` resolves to one Event of the current container, by the pinned domain-affecting disambiguation (01-event verbatim, else quoted Event id). | B-e |
| V-NAV | each navigation `Then` follows a real 09 `NavigationFlow` from the preceding Event to the named container. | B-c |
| V-ORDER | the walked interaction sequence (Events → 08 leaves) realizes the 08 nominal-path leaf order. | B-d |
| V-COVER | every walked 08 leaf's scenario-tag is covered by ≥1 outcome binding. | C-b |
| V-TAG | each outcome binding's `<06 tag>` ∈ the 06 tag vocabulary, within the closed grammar. | C-a |

### 4.3 Resolution / shape checks (`R` — a referenced element exists / a step matches its closed form)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R-BIJECT | `{10 feature files} == {08 models}` (exact-stem bijection, both directions). | A-a |
| R-FILENAME | each file is named the exact 08 stem + `.feature`. | A-b |
| R-FEATTAG | each `@task-model:` tag stem == this file's 08 model stem (resolves). | A-e |
| R-FINGERPRINT | the leading `# fingerprints:` block names every consumed 06 feature + the persona 09 model + the 08 model, each a 64-hex digest. | A-d |
| R-THENSHAPE | every `Then`/`And`/`But`-under-`Then` matches navigation OR outcome (no prose assertion). | C-c |
| R-WHENFORM | each interaction `When` matches exactly one pinned form, one interaction. | B-e, D-b |
| R-PERSONA | every step names the actor with the exact 09 persona value; no pronoun. | E-a |
| R-NO06BODY | no step reproduces a 06 scenario body (≥6-token verbatim run, verbatim-exempt spans masked). | E-d, E-c |
| R-DECLARATIVE | no step contains a UI-mechanics blocklist token outside a masked verbatim span. | B-f, D-a |

### 4.4 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

Named negatives proven by the shipped illegal fixtures (§3.4). Each asserts both that the defect is
rejected AND that the failing-check ID matches the defect's owner rule (wrong-reason ⇒ `broken-test`).
N-IDs map 1:1 to the fixture rows; abbreviated:

| ID | Illegal input | For the reason | Owner check | Catalog rule |
|----|---------------|----------------|-------------|--------------|
| N1 | missing / extra `.feature` | bijection break | M-BIJECT / R-BIJECT | A-a |
| N2 | bad filename | not `<08 stem>.feature` | M-FILENAME / R-FILENAME | A-b |
| N3 | wrong `Feature:` name | ≠ natural-cased 08 job | M-FEATNAME / W-FEAT | A-c |
| N4 | missing / placeholder fingerprint | block invalid | M-FINGERPRINT / R-FINGERPRINT | A-d |
| N5 | missing / ghost `@task-model:` | tag absent / unresolved | M-FEATTAG / R-FEATTAG | A-e |
| N6 | parse error (×3 corpus) | parser throws, shape matches oracle | M-PARSE / W-PARSE | A-f |
| N7 | zero pickles | vacuous feature | W-INST | A-f/A-g |
| N8 | ghost screen id | screen ∉ 09 | V-LOC | B-a |
| N9 | walk not from home | first `Given` ≠ home | V-START | B-b |
| N10 | broken nav edge | `Then` has no backing 09 edge | V-NAV | B-c |
| N11 | out-of-order walk | leaf order ≠ 08 nominal | V-ORDER | B-d |
| N12 | when-form violation | wrong form for Event kind | V-EVENT / M-WHEN-FORM | B-e |
| N13 | prose `Then` | neither nav nor outcome | M-THEN-SHAPE / R-THENSHAPE | C-c |
| N14 | uncovered leaf tag | leaf tag has no binding | V-COVER | C-b |
| N15 | ghost outcome tag | tag ∉ 06 vocabulary | V-TAG | C-a |
| N16 | copied 06 body | 06 scenario body restated | M-NO06BODY / R-NO06BODY | E-d |
| N17 | single-When violation | `When` chains two events | M-ONEWHEN / M-WHEN-FORM | D-b |
| N18 | persona pronoun | `I` instead of 09 persona | M-PERSONA / R-PERSONA | E-a |
| N-WRONGREASON | two-defect trap | reports V-LOC, not V-TAG | V-LOC isolates over V-TAG | §2 guard |
| N19 | dangling 09 in path | walked edge end absent in 09 | walk strands → route→09 | §9 → 09 |
| N20 | stuck 08 walker | parseable 08, nominal path underivable | 08 walk pre-check → route→08 | §9 → 08 |

### 4.5 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ-DECL`, `AJ-TITLE`, `AJ-INCIDENTAL` enumerated in §6. They run last, only over checks that survived
all mechanical + engine + replay gates, and return enumerated verdicts only. **No ❌ catalog rule is
left to agent judgment** — every ❌ has a mechanical / engine / replay owner above; the agent judges only
Theme-D residue at its own (⚠️/ℹ️) severity.

## 5 — Coverage floor & TRUE ❌ reconciliation (B3)

**Element ownership.** The 10 artifact owns four element sets: `features`, `scenarios`, `steps`,
`bindings` (the outcome-binding steps). The intake count is:

```
intake = |features| + Σ|feature.scenarios| + Σ|scenario.steps| + Σ|outcome-bindings|
```

The **edge / replay count** the harness must walk (from §3.1 + §3.3):

```
edgesExpected = 1                                   (R-BIJECT: dir ↔ 08 bijection)
              + Σ|features|                          (R-FEATTAG + R-FINGERPRINT + W-PARSE/W-FEAT/W-INST per feature)
              + Σ|features|                          (V-START: one home-start per chain)
              + Σ|location Givens|                   (V-LOC: each screen ∈ 09 + == current)
              + Σ|interaction Whens|                 (V-EVENT: each → an Event of current, correct form)
              + Σ|navigation Thens|                  (V-NAV: each follows a real 09 edge)
              + Σ|features|                          (V-ORDER: walked leaf order == 08 nominal, per feature)
              + Σ|walked 08 leaves|                  (V-COVER: each leaf tag covered)
              + Σ|outcome bindings|                  (V-TAG: each tag ∈ 06 vocabulary)
              + Σ|Then steps|                        (R-THENSHAPE: each = nav|outcome)
              + Σ|steps|                             (R-PERSONA / R-NO06BODY / R-DECLARATIVE)
```

The **engine + replay counts** are reported separately (`counts.engine`, `counts.replay`) so the
strongest-oracle layers' coverage is visible: a `pass` with `counts.engine.total === 0` OR
`counts.replay.total === 0` over an artifact that *has* feature files is itself a `broken-test` (an
oracle layer was skipped). There is **no sanctioned zero-feature pass** — 10 is unconditional (every 08
model ⇒ ≥1 feature); a zero-feature directory over a non-empty 08 dir is an M-BIJECT failure, not a
sanctioned empty pass.

**Every owned element exercised ≥1 time.** The harness asserts:
- every `feature` is touched by W-PARSE + W-FEAT + W-INST (engine) + R-FEATTAG + R-FINGERPRINT + V-START
  + V-ORDER;
- every `scenario` is touched by its replay walk (V-LOC/V-EVENT/V-NAV) + M-GWT (role order);
- every `step` is touched by R-PERSONA + R-NO06BODY + R-DECLARATIVE, and (if a location `Given`) V-LOC,
  (if an interaction `When`) V-EVENT + M-WHEN-FORM, (if a navigation `Then`) V-NAV, (if an outcome
  `Then`) R-THENSHAPE;
- every `outcome-binding` is touched by V-TAG (resolution) + V-COVER (it discharges a leaf obligation).

**Reconciliation formula (X-RECON — no silently dropped checks):**

```
executedChecks = engineRun + replayRun + resolutionRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected)
           && (executedChecks > 0)
           && (engineRun > 0 when features > 0)        // strongest syntax oracle never skipped
           && (replayRun > 0 when features > 0)         // walk oracle never skipped
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠ edgesExpected` ⇒ a
check was silently dropped ⇒ `broken-test`. **If `features > 0` but the engine or replay layer ran zero
runs ⇒ `broken-test`** (a strongest-oracle layer skipped).

**TRUE ❌ reconciliation — every ❌ rule → owner check → on-disk negative fixture.** Every behavior 10
claims is proven by **≥1 positive** (a passing check over `valid-10/`) AND **≥1 dedicated on-disk
negative** (a shipped illegal fixture that must fail for the stated reason). `selftest.mjs` FAILS if any
❌-mechanizable behavior lacks both sides — the coverage floor is itself asserted.

| ❌ rule | Owner check | On-disk negative fixture |
|---|---|---|
| A-a | M-BIJECT / R-BIJECT | `missing-feature/` / `extra-feature/` |
| A-b | M-FILENAME / R-FILENAME | `bad-filename.feature` |
| A-c | M-FEATNAME / W-FEAT | `wrong-feature-name.feature` |
| A-d | M-FINGERPRINT / R-FINGERPRINT | `missing-fingerprint.feature` / `placeholder-fingerprint.feature` |
| A-e | M-FEATTAG / R-FEATTAG | `missing-task-model-tag.feature` / `ghost-task-model-tag.feature` |
| A-f | M-PARSE / W-PARSE / W-INST | `parse-not-gherkin` / `parse-whitespace-tag` / `parse-bad-language` / `zero-pickles.feature` |
| A-g | W-INST | `zero-pickles.feature` |
| A-i | M-FEATNAME / W-FEAT | (one-Feature arm of `wrong-feature-name.feature`) |
| B-a | V-LOC | `ghost-screen-id.feature` |
| B-b | V-START | `walk-not-from-home.feature` |
| B-c | V-NAV / V-LOC | `broken-nav-edge.feature` |
| B-d | V-ORDER | `out-of-order-walk.feature` |
| B-e | V-EVENT / M-WHEN-FORM | `when-form-violation.feature` |
| B-f | M-DECLARATIVE / R-DECLARATIVE | (UI-mechanics arm; covered by `copied-06-body`/declarative trap) |
| C-a | V-TAG | `ghost-outcome-tag.feature` |
| C-b | V-COVER | `uncovered-leaf-tag.feature` |
| C-c | M-THEN-SHAPE / R-THENSHAPE | `prose-then.feature` |
| D-a | M-DECLARATIVE / R-DECLARATIVE | (shares B-f; AJ-DECL is the style residue) |
| D-b | M-ONEWHEN / M-WHEN-FORM | `single-when-violation.feature` |
| D-c | M-GWT | (role-order arm; covered via `prose-then`/`single-when`) |
| E-a | M-PERSONA / R-PERSONA | `bad-persona-pronoun.feature` |
| E-b | V-TAG / V-LOC / V-EVENT | `ghost-outcome-tag.feature` / `ghost-screen-id.feature` (no-invented-vocab consolidation) |
| E-d | M-NO06BODY / R-NO06BODY | `copied-06-body.feature` |

*(The ⚠️/ℹ️ rules — A-h (M-LANG), A-j (M-DESC), C-d (outcome-after-interaction ordering, mechanized
inside the V-EVENT→V-COVER sequence check), D-d (M-BACKGROUND), D-e (M-TITLE → AJ-TITLE residue), D-f
(M-INCIDENTAL → AJ-INCIDENTAL residue), E-c (verbatim exemption → the masked spans in
M-NO06BODY/M-DECLARATIVE) — each carries a mechanical or agent-judged owner; none is left as a blocking
❌ on the agent. The selftest's COVERAGE array asserts the positive+negative floor over this table and
fails if any ❌ rule lacks either side.)*

## 6 — Agent-judged checks (minimal; Theme-D canon residue; closed verdict schema)

These catalog rules (or rule residues) are **inherently semantic** — they require domain understanding
the mechanical + engine + replay layers cannot supply. Each runs only after mechanical gates pass and
returns an **enumerated verdict** (never prose). The harness records `{id, verdict, ruleId}`; any
verdict other than the rule's pass-verdict is reported at the catalog severity. **There are no ❌
agent-judged checks** — every ❌ rule has its ❌ weight carried by a mechanical / engine / replay subset;
the agent judges only Theme-D residue at its own (⚠️/ℹ️) severity. **Non-blocking** (⚠️/ℹ️ never block
the gate, per catalog Pass condition). The mechanical preconditions (the step text set, the scenario
titles, the screen-id/event/tag tokens) are computed by the harness and handed to the agent, so it
judges only the semantic residue, never raw structure.

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ-DECL | B-f / D-a residue | whether a step that passes the UI-mechanics blocklist is *genuinely declarative domain language* vs imperative phrasing the blocklist did not catch is a style judgment beyond the closed token list. | `{ declarative \| imperative-ui-coupled \| ambiguous }` |
| AJ-TITLE | D-e residue | whether a non-empty, non-mechanical scenario title genuinely describes the *behavioral outcome of the walked job* vs merely restating the steps is a judgment. | `{ behavioral \| mechanical-or-restated \| ambiguous }` |
| AJ-INCIDENTAL | D-f residue | whether a step carries *incidental* detail (a value that doesn't matter to the walk) vs a load-bearing token is a judgment beyond the screen-id/event/tag abstraction. | `{ no-incidental \| incidental-noise \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); reported as ℹ️, never silently dropped, never a
pass for reconciliation (counts as executed, verdict-recorded). No agent-judged check may emit free
prose in an asserted position. The mechanical + engine + replay verdict remains byte-deterministic
regardless of agent output (§8).

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order, `checks[]`/
`findings[]`/`walks[]` sorted by `id`:

```json
{
  "skill": "flow-acceptance",
  "artifactDir": "specs/10-flow-acceptance/",
  "upstream06": "specs/06-gherkin/",
  "upstream08": "specs/08-task-models/",
  "upstream09": "specs/09-ui-flows/",
  "tooling": { "gherkin": "39.1.0", "messages": "32.3.1", "ifmlReader": "copied-from-09", "cttWalker": "copied-from-08", "tagScanner": "copied-from-08", "node": ">=18" },
  "status": "pass | fail | malformed | broken-test",
  "counts": {
    "intake": { "features": 0, "scenarios": 0, "steps": 0, "bindings": 0 },
    "checks": { "engine": 0, "replay": 0, "resolution": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "engine": { "parsed": 0, "compiled": 0, "pickles": 0, "total": 0 },
    "replay": { "walks": 0, "stranded": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "walks": [
    { "feature": "dispatcher-fulfil_order", "persona": "Dispatcher", "home": "order_queue", "hops": 3, "walkedLeaves": 3, "nominalLeaves": 3, "realizable": true, "tagsBound": 2, "tagsRequired": 2 }
  ],
  "_note": "the walks[] values above are ILLUSTRATIVE schema examples, not pinned to any fixture — home/hops/walkedLeaves/nominalLeaves/tagsBound come from the feature + 09 model under test; names are illustrative (the real stem is the 08 <persona>-<job>, the persona the 09 persona attribute).",
  "checks": [
    { "id": "V-LOC", "class": "replay", "rule": "B-a", "status": "pass" },
    { "id": "V-ORDER", "class": "replay", "rule": "B-d", "status": "pass" },
    { "id": "V-TAG", "class": "replay", "rule": "C-a", "status": "pass" },
    { "id": "W-INST", "class": "engine", "rule": "A-f", "status": "pass" },
    { "id": "AJ-DECL", "class": "agent-judged", "rule": "B-f", "verdict": "declarative" }
  ],
  "findings": [
    { "id": "V-LOC", "rule": "B-a", "severity": "error", "detail": "location Given names screen 'ghost_screen' absent from 09 model dispatcher.xml (walk stranded at step 2; current='order_queue')" }
  ]
}
```

- The `walks[]` array records each feature's replay result — home, hop count, walked-vs-nominal leaf
  counts, realizability flag, and tag-binding coverage — the V-* evidence, recorded for transparency
  (the heart of the replay layer; the stranded step + current container are reported on any walk fail).
- The optional `class: "upstream-defect"` + `upstream: "<file>"` on a finding routes an 06/08/09-origin
  defect (§9). It does **not** add a status; the status stays `fail` (taxonomy closed at four values).
- **stderr** — human-readable diagnostics only (Gherkin parse throws with the `(line:col): <message>`
  shape + the matched `testdata/bad` oracle name for negatives, the vacuous-feature note, the
  walk-replay stranded-step trace with the step text + current container + missing target, the
  out-of-order-walk leaf-sequence diff, the uncovered-leaf-tag / ghost-outcome-tag detail, the
  wrong-reason-trap explanation, the upstream-defect routing note naming which file to fix, the
  missing-parser install command). Never the machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"` (success exit only on full pass). `1` = `fail` (incl.
  `upstream-defect`, walk/coverage/tag failures). `2` = `malformed` (a `.feature` the parser rejects).
  `3` = `broken-test` (a check threw, wrong-reason, reconciliation mismatch, zero checks, **missing
  parser**, **or an unparseable 06/08/09 upstream**). The distinct codes let CI separate a wrong 10
  (`1`), a malformed feature (`2`), and a broken harness/fixture/missing-parser/upstream (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`. There is no
  sanctioned zero-check pass for this artifact.

## 8 — Determinism (doctrine §6; ids never asserted; replay-value exclusion)

Running a real parser + replaying a walk are the two determinism surfaces this skill must manage. Both
are **pure functions of the input bytes** — no clock, no random, no network:

- **The `IdGenerator` is the only parser nondeterminism source, and it is excluded from assertions.**
  `compile(...)` mints pickle/step `id`s. The harness pins **`IdGenerator.incrementing()`** (the
  deterministic sequential generator) so re-runs produce identical ids — AND the harness **never asserts
  an id value** regardless; it asserts pickle *count*, *step types*, and *step text* (all input-derived),
  never a minted id. So even under `uuid()` the verdict is stable. (The pinned-IdGenerator + ids-never-
  asserted rule, copied from the gherkin sibling §8.)
- **The pickle step text is asserted by content** (the rendered step line the replay tokenizes), never
  by a parser-minted handle.
- **The walk-replay is a single forward pass with no search.** Each step names its exact target
  container/event — there is no BFS, no tie-break, no ambiguity — so the replay (the `current` trajectory,
  the stranded step, the walked-leaf sequence) is a fixed function of the feature + 09 model. The 08
  nominal path is pinned (the copied 08 rule: enabling/concurrent → all children in order; `choice` →
  first document-order child; `disabling`/`suspendResume` → left; skip `optional`; iterative once), so
  the walked-vs-nominal comparison is deterministic.
- **Cross-artifact sets are sorted** before comparison (the `{10 files}` set, the `{08 models}` set, the
  `tags06` set, the 09 container/event lists), so bijection / resolution / coverage arithmetic are
  order-independent and stable.
- **Fingerprint digests are read from the artifacts** and only shape-checked (M-FINGERPRINT) — the
  harness never recomputes a sha256 and asserts equality (that would inject a value); it checks shape +
  naming and resolves references against the upstream files actually passed.
- **Fresh reader + replay state per feature** (a fresh parse + replay per `.feature`); nothing carries
  between features. A re-run over byte-identical inputs is **byte-identical output** (stable key order,
  sorted `checks[]`/`findings[]`/`walks[]`).
- **Pinned parser version** (`@cucumber/gherkin` 39.1.0 + its `@cucumber/messages` peer) recorded in
  `tooling`: the grammar/tokenizer is version-stable, so the asserted AST shapes and parse-error
  messages do not drift across the locked tree (the `testdata/bad` error-shape parity is pinned to
  39.1.0).
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the reconciliation
  arithmetic and their verdicts are recorded, not invented into counts — so the **mechanical + engine +
  replay verdict remains byte-deterministic** regardless of agent output.

## 9 — Upstream-defect routing + single-ownership (how an 06/08/09 defect is reported without patching around it)

10 is validated *against* three upstreams but consumes a **narrow slice** of each: 06's tag set (C-a /
the outcome vocabulary), 08's nominal-path leaf order + per-leaf scenario-tags (B-d / C-b), 09's
container/event/edge walk vocabulary (B-a/B-c/B-e). The harness checks only the **minimal preconditions**
10 legitimately needs to *walk*, and **never silently repairs or works around** a bad upstream — it
surfaces the defect and routes it to the file that owns the fix.

**Pinned preconditions (the only upstream invariants 10 verifies — exactly what 10 must walk):**

1. **The 09 graph the walk traverses is internally navigable along the walked path.** 10 must trace
   `NavigationFlow` edges; if a *walked* hop's edge ends in a container absent from the 09 model (a
   **dangling navflow end on the path the 10 walk needs**), the walk cannot proceed — and this is a 09
   defect, not a 10 one (10 referenced a real edge the 09 model itself broke). Routed `upstream-defect`
   → **the named 09 file**. Proven by `dangling-09-in-path/`. (10 does NOT otherwise re-verify 09's KLM
   budgets, bindings, or home-reachability of *non-walked* containers — those are the `09` harness's
   single-owned job.)
2. **The realized 08 nominal path is derivable.** 10 must realize the 08 nominal-leaf order; if a
   realized 08 model **parses but its nominal-path walker gets stuck** (a parseable-but-malformed tree —
   e.g. a `choice` with no document-order child), the leaf order against which V-ORDER measures is
   underivable. **Decided honestly:** an *unparseable* 08 ⇒ `broken-test` (case 3 below); a
   *parseable-but-walker-stuck* 08 ⇒ `upstream-defect` → **the named 08 file** (the tree is well-formed
   XML but the nominal path it declares is broken). Proven by `stuck-08-walker/`.

**Three upstream conditions are distinguished and routed:**

1. **Sound upstreams.** Each 06 `.feature` parses (the tag scanner reads its tags); each realized 08
   parses AND its nominal path walks cleanly; each 09 `.xml` parses AND the walked path's edges resolve.
   The 10→upstream checks (V-*, R-*) run normally; a failure is a **10 defect** → `fail`, ordinary
   finding. In particular a **ghost screen id** (a `Given` naming a screen absent from 09) or a **ghost
   outcome tag** (a binding tag absent from 06) is a **10** defect (10 named something the upstream
   doesn't have), caught as an ordinary `fail` — not an upstream-defect.
2. **Well-formed but self-broken upstream** (`upstream-defect`). The two cases 10 surfaces: a 09 model
   with a dangling navflow end *on the walked path* → routed → `09-ui-flows/<persona>.xml`; a realized
   08 that parses but whose nominal-path walker is stuck → routed → `08-task-models/<file>.xml`. The
   harness runs these **pre-walk upstream self-checks before** the 10→upstream replay; on failure the
   finding is tagged `class: "upstream-defect"`, `upstream: "<file>"`. Status `fail`, exit `1`; the fix
   routes **upstream** (a 09 / 08 regeneration, never a 10 edit). Proven by `dangling-09-in-path/`,
   `stuck-08-walker/`.
3. **Unparseable 06 / 08 / 09** (`broken-test`, not `upstream-defect`). An upstream does not parse
   against its pinned format: a `06/*.feature` is not well-formed (the tag set cannot be built); a
   realized `08/*.xml` is not well-formed (the nominal path cannot be read); a `09/*.xml` is not
   well-formed (the walk graph cannot be read). The harness cannot anchor its walk/resolution targets,
   so it cannot make a trustworthy statement about 10. Status `broken-test`, exit `3`, stderr "upstream
   <file> unparseable." Proven by the three `malformed-upstream-*` rows.

**What 10 deliberately does NOT re-verify (single ownership of checks).**
- **10 does not re-verify 09's budgets, bindings, or non-walked structure.** It reads only the
  container/event/edge slice it *walks*; whether a 09 flow cost ≤ the 08 budget, whether a binding
  resolves to a 04 table, whether a non-walked container is reachable — all the **`09` harness's**
  single-owned job. 10 walks the graph; it does not re-certify it.
- **10 does not re-verify 08's tag seams, operators, KLM, or budget.** It re-walks 08 *only* for the
  nominal-leaf order + each walked leaf's scenario-tags (and the nominal-path-derivability precondition
  above); whether each leaf's `scenario-tags` are themselves grammar-valid, whether the budget equals
  the nominal cost — the **`08` harness's** single-owned job.
- **10 does not re-verify 06's coverage or domain assertions.** It reads only the *tag vocabulary* via
  the tag-scanner; whether each 06 scenario covers its invariant/transition/terminal/policy, whether a
  06 tag's referent resolves in 03/04/05 — the **`06` harness's** single-owned job. 10 binds to 06 by
  tag; it does not re-litigate 06's internal correctness.
- **10 reads NO 02/04/05/07.** Personas/screens/events come THROUGH 09; behaviors come THROUGH 06 tags.
  10 never reaches past its three direct upstreams (single ownership) — there is no 04↔02 self-check, no
  05 authority switch, no 07 persona-role check in this harness.

The splits are deliberate: `upstream-defect` (case 2) is an actionable content finding routed to the
correct upstream owner while keeping the §2 status set closed; `broken-test` (case 3) is the harness
honestly refusing to emit a verdict it cannot justify. No case lets the harness paper over an upstream
by inferring, substituting, or skipping a missing element.

---

*This contract mechanizes catalog rules A-a … A-j / B-a … B-f / C-a … C-d / D-a … D-f / E-a … E-d.
**Mechanical / engine / replay ❌ coverage is complete:** every ❌-severity catalog rule has BOTH (a) a
mechanical, engine, or walk-replay owner check and (b) a dedicated negative fixture **that ships on
disk** (a directory- or file-form set under `scripts/fixtures/`; the names identify the mutated feature
file). No placeholders remain — the selftest's COVERAGE array runs every negative in the §5 table and
asserts its owner fires for the stated reason. The **walk-replay (V-*) is the load-bearing layer** — the
step chain is replayed against the verified 09 graph (start-from-home, real-edge-in-order,
08-nominal-leaf-order) and cross-referenced to the 08 walker + 06 tag set, never regex-matched in
isolation. The three [PLAN] acceptance-closure findings are each a ❌ owned here: a step naming a screen
absent from 09 (V-LOC / B-a), a 06 tag that resolves nowhere (V-TAG / C-a), an 08 task model with no 10
feature (M-BIJECT / A-a). Pass = status `pass` = zero ❌ findings across Themes A–E, reconciled, ≥1 check
executed, engine + replay layers non-empty; Theme-D ⚠️/ℹ️ never block the gate.*
