# gherkin — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `gherkin` skill (artifact **06**,
the **final** pipeline artifact: a **directory artifact** `specs/06-gherkin/` holding
**one `<aggregate>.feature` BDD feature file per 03 aggregate**, encoding the executable
behavior scenarios for the modelled domain). It defines the **sole executable pass/fail
authority** that ships with the skill: a **`@cucumber/gherkin` v39.1.0 parse-and-compile
oracle** (the strongest oracle available for a `.feature` file — every feature is *parsed
on the format's own reference parser of its formalism and compiled to pickles*, exactly as
the format's downstream consumers instantiate it) plus a set of **mechanical checks over
the produced AST** (structure, tag grammar, coverage arithmetic, canon, language, DRY), a
**minimal hand-rolled SCXML reader** for the optional 05 authority (copied PATTERN, never
imported), and a closed resolution / exact-value / reason-qualified-negative checker plus a
minimal set of agent-judged residue checks. It satisfies the verification doctrine §2
(closed assertion grammar, stdout JSON, stderr diagnostics, status taxonomy, no vacuous
green, agent judgment only where the contract marks it + closed verdicts), §6
(determinism, fresh state, byte-identical re-runs), and build steps B2 (formal-format
oracle — the feature must PARSE under the authoritative parser AND its downstream
instantiation must succeed) and B3 (simulation design — strongest oracle = run on the
format's real engine; reuse over invention).

It is **paired with** `references/validation-rules.md` (the closed rule catalog, A1–A8 /
B1–B7 / C1–C9 / D1–D5 / E1–E4 — 33 rules). Every check below cites the catalog rule ID(s)
it mechanizes. **The catalog is the review vocabulary; this file is the executable harness
over it.** No check here exists without a catalog rule behind it.

The `.feature` artifact is a **formal-format artifact** with a real engine of its
formalism — exactly like `erd` (DBML → Postgres) and `statecharts` (SCXML → SCION). Per
doctrine B3 ("prefer running the artifact on a real engine of its formalism") and B2 ("must
parse/validate under the authoritative validator … downstream instantiation must succeed"),
the strongest oracle here is **executable**: parse each `.feature` on the pinned
`@cucumber/gherkin` v39.1.0 reference parser to produce a **GherkinDocument AST**, then
**compile** it to **pickles** (the compiled-scenario objects every Cucumber runner
instantiates). **Instantiation oracle pinned (B2):** for `.feature` files, "downstream
instantiation succeeds" means *pickle compilation succeeds and the produced pickle set is
non-empty per file*. A feature that parses clean but compiles to zero pickles (a `Feature:`
with no scenario/example) is **vacuous** — it instantiates nothing — and is a `fail`, not a
pass (§3.3 W-INST). This is the same strongest-oracle clause that bites in `erd` and
`statecharts`; it is designed precisely below.

The artifact is a **five-or-six-upstream** artifact, validated against
`specs/02-glossary.md` (Terms, enums `### <Aggregate>Status`, forbidden synonyms),
`specs/03-aggregates.md` (aggregates, invariants `INV-<Agg>-<n>`, cross-aggregate
policies), BOTH `specs/04-erd.dbml` + `specs/04-transitions.md` (data model + transition
tables `From | Event | To`), and **optionally** `specs/05-statecharts/*.scxml` — **present
only when 05 was emitted**. The harness takes four required upstream arguments plus the 06
directory plus an **optional** 05-dir flag:

```
node scripts/harness.mjs <06-dir> \
     --upstream-01 <01-event-storming.md> \
     --upstream-02 <02-glossary.md> \
     --upstream-03 <03-aggregates.md> \
     --upstream-04-dbml <04-erd.dbml> \
     --upstream-04-transitions <04-transitions.md> \
     [--upstream-05 <05-dir>]
```

**The `--upstream-05` flag is optional and load-bearing for the lifecycle-authority rule
(catalog "Lifecycle-authority rule (binding)").** When **present**, a promoted entity's
`<entity>.scxml` is the lifecycle authority and its 04 table is superseded; when **absent**,
lifecycle coverage is judged against **04 alone**, AND the harness verifies that **no
feature file claims a 05 fingerprint or asserts supersedes-based authority** — a feature
that fingerprints a `05-statecharts/*.scxml` while `--upstream-05` is absent is a `fail`
(N-05ABSENT, §4.4). This is the harness expression of the catalog's "05-if-promoted-else-04"
lifecycle authority.

The upstream parses use the **pinned 02/03/04 formats** (copied, never imported — see §1).
06 references all upstreams by exact string and **never restates** a 02 enum definition, a
03 invariant text, or a 04/05 row beyond exercising the required transition (catalog
E-theme). 06 owns only the **Gherkin structure derived via the pinned conventions** (file
name = snake_case 03 aggregate; `Feature:` name = exact 03 aggregate string; one source tag
per scenario from the closed grammar; the exact-01-event embedded in the `When`).

## 0 — Probe transcript (`@cucumber/gherkin` v39.1.0 parse+compile oracle — empirical verification on current Node)

The pinned oracle (SOURCES.md: `@cucumber/gherkin` **39.1.0**, the format's own reference
parser; the executable expression of `gherkin.berp` + `gherkin-languages.json`) was
**empirically verified on the current Node** in a scratch dir (`/tmp/gherkin-probe`) before
being pinned. Transcript:

```
$ node --version                                   →  v24.13.0   (≥18 — the pinned runtime floor)
$ npm install @cucumber/gherkin@39.1.0 @cucumber/messages
    added 4 packages in 2s                         # @cucumber/messages is the peer (IdGenerator + message types)
```

**API shape that works (recorded for §1) — parse + compile to pickles:**

```js
import { Parser, AstBuilder, GherkinClassicTokenMatcher, compile } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

const newId = IdGenerator.uuid();
function parseFeature(src, uri) {
  const parser = new Parser(new AstBuilder(newId), new GherkinClassicTokenMatcher());
  const gherkinDocument = parser.parse(src);     // → AST (throws CompositeParserException on malformed)
  gherkinDocument.uri = uri;
  const pickles = compile(gherkinDocument, uri, newId);  // → compiled scenarios (the instantiation oracle)
  return { gherkinDocument, pickles };
}
```

**Empirical results — every critical case PASS on Node 24:**

| Case | Input | Result |
|------|-------|--------|
| **AST + tags + steps** | a `Feature: Order` with a `# fingerprints:` comment block, `@invariant:INV-Order-1` tag, G/W/T scenario | `feature.name === "Order"`; `feature.language === "en"`; `gherkinDocument.comments` = `["# fingerprints:", "#   02-glossary.md@sha256:aaaa…"]` (comment text **preserved**, accessible for fingerprint checks); `scenario.tags` = `["@invariant:INV-Order-1"]`; steps carry `{keyword, keywordType, text}` with `keywordType ∈ {Context, Action, Outcome, Conjunction, Unknown}`. |
| **pickle compilation (instantiation oracle)** | same feature | `pickles.length === 1`; `pickle[0].name`, `pickle[0].tags` (= `["@invariant:INV-Order-1"]`), `pickle[0].steps` with `{type: Context\|Action\|Outcome, text}`. Downstream instantiation **succeeds**. |
| **vacuous feature** | `Feature: Empty\n` (no scenario) | parses clean, **`pickles.length === 0`** — the empty-pickle-set oracle for B2/W-INST fires: a feature that compiles to zero pickles instantiates nothing. |
| **Scenario Outline expansion** | one outline + 2-row `Examples` | `pickles.length === 2`; **the source tag is inherited onto every expanded pickle** (`@invariant:INV-Order-2` on both) — so tag-coverage arithmetic counts outlines correctly. |
| **`When … And <action>` keywordType** | `When a is paid` / `And b is shipped` | the `When` step is `keywordType: "Action"`; the chaining `And` is **`keywordType: "Conjunction"`** (NOT `Action`). Recorded for the multi-When rule (C3): see §2 note. |
| **two explicit `When`** | `When a` / `When b` | **both** report `keywordType: "Action"` and `keyword.trim() === "When"`; explicit-When count = 2 — the mechanical multi-When detector. |
| **parse error shape** | `not gherkin\n` | throws `CompositeParserException`; `e.errors` is an **array**, each entry carrying `.message` (e.g. `"(1:1): expected: #EOF, #Language, #TagLine, #FeatureLine, #Comment, #Empty, got 'not gherkin'"`) and `.location {line, column}`. |

**Error-shape parity (the `testdata/bad` oracle reproduces byte-for-byte).** The pinned
parser was run over the catalog's own malformation corpus; the messages match the
`*.feature.errors.ndjson` oracles **exactly**:

| Malformation | Reproduced parser message |
|--------------|---------------------------|
| `whitespace_in_tags` | `(3:3): A tag may not contain whitespace` |
| `invalid_language` | `(1:1): Language not supported: no-such` |
| `inconsistent_cell_count` | `(6:7): inconsistent cell count within the table` (+ a 2nd at `14:5`) |
| `not_gherkin` | `(1:1): expected: #EOF, #Language, #TagLine, #FeatureLine, #Comment, #Empty, got 'not gherkin'` |

**Verdict: `@cucumber/gherkin` v39.1.0 WORKS as both parser and pickle compiler on Node 24.**
It is pinned as the parse-and-instantiate oracle. No fallback chain is needed. The
`@cucumber/messages` peer is required (it supplies `IdGenerator.uuid()` for `AstBuilder`
and `compile`, and the pickle/AST message types). Two gotchas pinned: (1) `compile(...)`
requires the **third `idGenerator` arg** — omitting it throws; (2) the parser **throws** on
malformed input rather than returning errors — the harness wraps `parse()` in try/catch and
reads `e.errors[]` (each `{message, location}`) to classify against the negative oracles.

## 1 — Tooling record (B2; oracle choice + versions + self-install + offline mode)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `event-storming`/`glossary`/`aggregates`/`erd`/`statecharts` harnesses (suite uniformity); probe ran on v24.13.0. |
| Entry points | `scripts/harness.mjs` (the oracle; the 5-or-6-arg invocation above), `scripts/selftest.mjs` (runs the harness over every shipped fixture set and asserts the expected status + failing-check + upstream-route + the 05-present/absent records). |
| **Parse + compile oracle** | **`@cucumber/gherkin` 39.1.0** (pinned; SOURCES.md normative parser). The probe-verified flow (`new Parser(new AstBuilder(id), new GherkinClassicTokenMatcher())` → `parse(src)` → AST; `compile(doc, uri, id)` → pickles) is the **parse + downstream-instantiate** B2 requires. This is the format's own reference implementation — the strongest possible "reuse over invention." |
| **Messages peer** | **`@cucumber/messages`** (pinned; the parser's declared peer — supplies `IdGenerator.uuid()` and the AST/pickle message schema). Verified empirically as required in §0. |
| **Hand-rolled SCXML reader (05 only)** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/scxml.mjs`. Used **only when `--upstream-05` is present** to read each `<entity>.scxml`'s transition set (`From`-state, `<!-- 01-event: … -->` annotation, `To`-state) for the 05-authority coverage logic (§3.5). It reads the constrained SCXML subset (`scxml / state / parallel / final / transition / datamodel` + comment annotations). **This is the statecharts skill's reader PATTERN, COPIED — never imported** (isolation directive; each skill stays self-contained). The reader only inspects shape; it never simulates. The 06 harness does **not** re-run SCXML on an engine — 05 is an *input authority* here, and its own correctness was certified by the statecharts harness; 06 reads its transition set as the lifecycle authority. |
| Markdown parser | **Hand-rolled line/table/heading parser**, dependency-free, vendored in `scripts/lib/md.mjs` — shared shape-reader for `02-glossary.md`, `03-aggregates.md`, and `04-transitions.md`. **Copied** from the sibling skills (same pinned 02/03/04 shapes). The `.dbml` is parsed by `@dbml/core` (copied from the `erd` harness) solely as a parse-validity gate + table/enum enumeration on `04-erd.dbml` (unparseable `.dbml` ⇒ broken-test). |
| Dependency pin | `scripts/package.json` pins `"@cucumber/gherkin": "39.1.0"`, `"@cucumber/messages": "32.3.1"`, and `"@dbml/core": "8.2.5"` **exactly** (no `^`/`~`); a committed `scripts/package-lock.json` locks the trees. Versions recorded in the JSON summary's `tooling` block so a drifted re-run is detectable. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Closed lexicons | `scripts/lib/lexicon.mjs` — the **snake_case validator** (`^[a-z][a-z0-9_]*$`), the **enum-value-shape detector** (a token matching the enum-value shape that must ∈ 02 values — D5/M-INVENT), the **closed tag grammar** (`@invariant:` / `@transition:` / `@terminal:` / `@policy:` / `@authz:` regexes), the **Then-block action-verb blocklist** (§2, C4), and the **forbidden-synonym scan** (read fresh per run from 02). Closed and vendored; extended only by a committed edit, never ad hoc. |

**Rationale for the parse+compile oracle over a regex/lint harness.** Gherkin, like DBML
and SCXML, **has** a real engine of its formalism — the `@cucumber/gherkin` reference
parser — and the probe (§0) proves the pinned one parses AND compiles pickles on current
Node. Doctrine B3 names the strongest oracle ("run on a real engine"); B2 requires a
formal-format artifact to "parse/validate under the authoritative validator, and downstream
instantiation must succeed." A hand-rolled Gherkin lexer would be **weaker than the engine
the format ships** and would risk diverging from the grammar's tokenizer (tag-whitespace
rejection, data-table cell-count consistency, doc-string closing, `# language:` validation)
that the reference parser already implements and the `testdata/{good,bad}` corpora already
certify. So the harness **parses and compiles** every feature on `@cucumber/gherkin`,
asserts a non-empty pickle set (instantiation), and walks the produced AST for the
mechanical checks. The mechanical layer only inspects AST shape + cross-artifact resolution
that the parser does not surface (tag-target resolution, coverage arithmetic, language
discipline, DRY). This is the same engine-plus-mechanical split `erd` and `statecharts` use.

**Self-install + offline failure mode (pinned).** The deps are **not vendored** into the
repo. On startup the harness checks for `scripts/node_modules/@cucumber/gherkin`,
`scripts/node_modules/@cucumber/messages`, and `scripts/node_modules/@dbml/core`:

- **Present** → run normally.
- **Absent + network reachable** → self-install into its own `scripts/` dir:
  `npm ci --prefix scripts --no-audit --no-fund` if `package-lock.json` is present
  (preferred, reproducible), else `npm install --prefix scripts --no-audit --no-fund`.
  One-time; subsequent runs hit the "present" path. (The probe confirms a clean install in
  ~2 s.)
- **Absent + no network** → the harness does **not** silently skip the parser and emit a
  green. It exits `status: broken-test`, exit code `3`, with a stderr diagnostic naming the
  missing package(s) and the install command. This is the `erd`/`statecharts` "missing
  engine ⇒ broken-test, never a vacuous pass" rule: the strongest oracle is unavailable, so
  the harness honestly refuses to certify rather than degrade to a regex-only verdict.

**Reuse note (doctrine "reuse over invention: copied, never referenced").** The
`event-storming`/`glossary`/`aggregates`/`erd`/`statecharts` skills already ship a
hand-rolled `md.mjs` reader and a `checks.mjs` grammar for the pinned 02/03/04 markdown
shapes; `erd` ships the `@dbml/core` enum/table reader; `statecharts` ships the hand-rolled
`scxml.mjs` reader. This skill **copies** those readers (it parses the same pinned 02/03/04
shapes, re-uses erd's DBML enumeration, and copies statecharts' SCXML-reader pattern for the
optional 05 authority) and the `checks.mjs` scaffold, then adds the 06-specific layer new to
this skill: the **`@cucumber/gherkin` parse+pickle oracle** (no sibling parses Gherkin). For
the parser itself the harness **reuses the format's own reference implementation** rather
than inventing one — the strongest possible "reuse over invention." Copied, never
cross-referenced — each skill stays self-contained and portable.

## 2 — Mechanical (over-AST) checks — structural; A/B/C/D/E shape rules

After the parse+compile oracle (§3.3) produces an AST + pickle set per feature, structure
checks run over the AST. Each `.feature` is parsed by `@cucumber/gherkin`; `02`/`03`/
`04-transitions.md` by `md.mjs`; `04-erd.dbml` by `@dbml/core`; each `05/*.scxml` (when
present) by `scxml.mjs`. Mechanical IDs are `M*`. A **parse failure** (the parser throws)
yields `malformed` (matched against the negative oracle for negatives); a ❌ over a
successfully-parsed feature yields `fail`; ⚠️/ℹ️ are warn-only. **All checks here inspect
AST shape + cross-artifact resolution that the parser does not surface.**

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| M1 | **Directory ↔ 03 aggregate bijection.** `specs/06-gherkin/` exists and is non-empty; the set of `*.feature` files **==** the set of 03 `### <AggregateName>` blocks (snake_case stem bijection) — no missing aggregate, no extra file, no two files for one aggregate. | A1 | `fail` |
| M2 | Each file is named `<snake_case(03 AggregateName)>.feature` exactly (no casing/plural/paraphrase drift). | A2 | `fail` |
| M3 | Each file **parses clean** on `@cucumber/gherkin` (no `CompositeParserException`). On throw, the diagnostic is matched against the negative oracle. | A5 | `malformed` |
| M4 | Exactly one `Feature:` per file; its name text **==** the exact 03 `### <AggregateName>` string (verbatim, not the snake_case stem, not a paraphrase). | A3 | `fail` |
| M5 | **Fingerprint block present, well-formed, leading.** A `# fingerprints:` comment block appears **before** the `Feature:` line (read from `gherkinDocument.comments`, ordered by location, all with location.line < the `Feature:` line); it names all five base upstreams (`01-event-storming.md`, `02-glossary.md`, `03-aggregates.md`, `04-erd.dbml`, `04-transitions.md`) each `<file>@sha256:<64-hex>` (64 chars `[0-9a-f]`, none a placeholder `0000…`/`xxxx…`/`<hex>`); **and**, when `--upstream-05` is present, names every `05-statecharts/<entity>.scxml` whose transitions this feature consumes. | A4 | `fail` |
| M6 | **Exactly one source tag per scenario, from the closed grammar.** Every `scenario`/`scenarioOutline` carries **exactly one** tag matching `@invariant:INV-<Agg>-<n>` \| `@transition:<entity>` \| `@terminal:<entity>` \| `@policy:<Name>` \| `@authz:<entity>`; zero, two, or an out-of-namespace tag ⇒ fail. (Tag-whitespace is impossible — the parser rejects it at M3.) | A6 | `fail` |
| M7 | **Tag target resolves.** `@invariant:INV-<Agg>-<n>` id ∈ 03 invariants; `@transition:<entity>` / `@terminal:<entity>` / `@authz:<entity>` stem ∈ 04 table names (snake_case) — and, when 05 present, ∈ the promoted-entity set where authority is 05; `@policy:<Name>` ∈ 03 `## Cross-Aggregate Policies` rows (whitespace→`_`, **internal hyphens preserved** — an id-style policy name `POL-1` stays `@policy:POL-1`; the closed `@policy:` / `@invariant:` character classes admit `-` so a hyphenated source name can both classify and resolve). An unresolved referent ⇒ fail. | A6 | `fail` |
| M8 | **English dialect.** No `# language:` header, or `# language: en`; any non-`en`/unsupported code ⇒ caught at M3 (parser-rejected) or flagged here. | A8 | warn-only (⚠️) |
| M9 | **Scenario title is behavioral.** Title is non-empty, not `Test …`/`User clicks …`/`Verify …`, and not a verbatim restatement of its step text. | A7 | warn-only (⚠️) |
| M10 | **Single `When` (one action/event).** Per scenario (pre-expansion), `count(steps where keyword.trim()==='When' OR keywordType==='Action') === 1`. >1 explicit-When ⇒ fail. *(The `When … And <action>` case — a `Conjunction` step carrying a second action — is the agent-judged residue AJ-CONJ, §6, because `And` text is not mechanically classifiable as action-vs-context.)* | C3 | `fail` |
| M11 | **G/W/T role discipline + keyword order.** Step `keywordType` sequence per scenario matches `Context* (Conjunction)* Action (Conjunction)* Outcome+ (Conjunction)*` — Context (Given) precede the single Action (When) precede Outcome (Then); no Outcome before the Action; no Action after an Outcome. | C4 | `fail` |
| M12 | **No action verbs in `Then`-block.** Steps in the Outcome block (the first `Outcome` step + its trailing `Conjunction` steps) contain no token from the closed **action-verb blocklist** (`click`, `press`, `type`, `enter`, `submit`, `place`, `cancel`, `pay`, `ship`, `create`, `delete`, `add`, `remove`, `send`, `issue`, `redeem`, … — the pinned 06 list in `lexicon.mjs`, drawn from the 04 event verbs + UI mechanics). A `Then` performing an action ⇒ fail. | C4 | `fail` |
| M13 | **Background scope.** `Background` (when present) holds only `Context`/`Conjunction` (Given) steps — no `When`/`Then`; ≤4 steps. A `When`/`Then` in Background ⇒ fail; >4 Given steps ⇒ ⚠️. | C7 | `fail` (action in bg) / ⚠️ (length) |
| M14 | **`When` embeds the exact 01 event string.** For every `@transition:` / `@policy:` / `@authz:` scenario, the single `Action` (`When`) step text **contains the exact 01 event string** (the 04 `Event` cell for the transition/policy) as a literal substring. Missing/paraphrased ⇒ fail. | D3 | `fail` |
| M15 | **State steps use 02 enum values verbatim.** Every token in a `Given`/`Then` step matching the **enum-value shape** (the snake_case/TitleCase form of a `### <Aggregate>Status` `Value`) **∈** that aggregate's 02 enum values verbatim. A state-shaped token not in 02 ⇒ fail (the "no invented state token" rule). | D2, D5 | `fail` |
| M16 | **Domain concepts use 02 Terms verbatim.** Step text naming a domain concept uses the exact 02 `Term` (no paraphrase/plural-drift of a known Term). | D1 | `fail` |
| M17 | **No forbidden synonyms in free prose.** No 02 `Forbidden term` appears in any step text, title, tag, description, or comment (whole-word; tokens that ARE a 02 Term/enum value verbatim are exempt from sub-token scanning, as in the erd L12 exemption). **A forbidden sub-token whose occurrence lies INSIDE a MANDATED verbatim derivation is exempt** — i.e. inside an embedded exact 01 event string (any event from the authoritative-transition / 02-enum-derivation set, which D3 compels the `When` to embed) or a verbatim 02 Term / 02 enum value occurrence. Those spans are masked before tokenising; only forbidden tokens in free prose fire. (e.g. forbidden `Section` inside the exact event `Seating Section Defined` does not fire; `Section` in free prose does.) | D4 | `fail` |
| M18 | **No invented entities/states/events.** Every aggregate/entity, state, and event named is upstream-defined (∈ 02 Term, ∈ 02 enum value, ∈ 04/01 event, or ∈ 03 aggregate); a fabricated domain token ⇒ fail. (M15 is the state-token arm; this is the entity/event arm.) **The entity arm masks every known verbatim 01 event string and multi-word 02 Term BEFORE scanning for `the <Cap>` entity captures** — so the leading word of a multi-word event after "the" (e.g. `Seating` in `the Seating Section Defined event occurs`) is not mis-captured as an invented entity (the one-token `(?!\s+event)` lookahead cannot see past the next word). Captures outside masked spans still fire. | D5 | `fail` |
| M19 | **No restated invariant text.** No step/title/description copies a 03 invariant `Rule` text (≥6 consecutive verbatim tokens from a single 03 invariant cell). | E1 | `fail` |
| M20 | **No enum-value listings.** No step/description/comment/Examples-table enumerates an aggregate's **full** `### <Aggregate>Status` value set (≥ all values of one enum in one place). | E2 | `fail` |
| M21 | **No transition-table dumps.** No comment/description/Data-Table reproduces a 04 transition table or a 05 transition set wholesale (≥N rows of `From\|Event\|To` shape in one block, or a verbatim ≥6-token run from a 04 table). | E3 | `fail` |
| M22 | **Upstream referenced by tag/id, not paraphrased.** Descriptions/comments point to upstream by closed tag or artifact+id, not paraphrase. | E4 | warn-only (⚠️) |
| M23 | **Data-varied scenarios collapsed to Outline.** Two+ near-identical scenarios differing only in data values (≥80% step-text identity, different literals) flagged to use `Scenario Outline` + `Examples`. | B6 | warn-only (⚠️) |
| M24 | **No duplicate step text under different keywords.** Two steps with identical text under different keyword types (e.g. a `Given` and a `Then` with the same text) flagged (parser-ambiguity smell). | C9 | warn-only (ℹ️) |
| M25 | **Step-count discipline / no conjunction steps.** A scenario with a step whose text joins two facts with " and " (conjunction step), or with so many `And`/`But` it loses expressive power (>~7 steps), flagged. | C5, C6, C8 | warn-only (⚠️) |

M1/M6/M7 are the **structural backbone** (bijection + closed-tag + tag-resolution); M14–M18
are the **language-discipline backbone**; M19–M21 the **DRY backbone**. The forbidden-list
(M17), Term set (M16), enum values (M15), invariant/policy ids (M7), 04 events (M14), and
05 transition set (when present) are all **read fresh per run from the parsed upstreams**
(upstream-owned data, never vendored constants).

**Multi-When note (the load-bearing C3 call).** The probe (§0) proved two explicit `When`
keywords both report `keywordType: "Action"` (so M10 counts them mechanically), but a
`When … And <x>` reports the `And` as `keywordType: "Conjunction"` — the parser does not
decide whether that `And` text is a *second action* or a *qualifier*. So M10 mechanizes the
**explicit-multi-When** arm (❌, fully mechanical) and the **And-chained-action** arm is
handed to the agent (AJ-CONJ, §6, ⚠️) — disclosed honestly: a second action smuggled into
an `And` cannot be classified from the token alone.

## 3 — Closed fixture / scenario format (B3)

The scenario has **two halves**, because the artifact has two oracles:

1. **Parse+compile oracle (§3.3)** — the strongest oracle. Each emitted `.feature` is
   parsed on `@cucumber/gherkin` and compiled to pickles; parse-clean + non-empty pickle
   set is the instantiation assertion (positive); the `testdata/bad` corpus subset is the
   parse-negative oracle.
2. **Mechanical scenarios (§3.1–§3.2)** — a walk over 06's own AST claims (structure, tag
   grammar, coverage arithmetic, canon, language, DRY) resolved against the parsed
   02/03/04(/05) upstreams.

No external scenario data is injected into a *target* run; the upstreams + the 06 directory
supply every element. The shipped fixtures (§3.4) are **whole canned upstream sets + 06
directories** used only by `selftest.mjs`.

### 3.1 Derived scenario graph (built fresh per run — §8)

From each parsed **06 `.feature`** (AST) the harness derives:
`feature = {aggregate, name, fingerprints{}, background?, scenarios[] ({title, tags[],
sourceTag, givenSteps[], whenStep?, thenSteps[], examples?, pickles[]})}`.

From parsed **03**: `aggregates03[]`, `invariants03[]` (`{id, agg, ruleText}`),
`policies03[]` (`{name, mode (transactional|eventual), sourceEvent01, targetConsequence}`).
From **02**: `terms02[]`, `enums02[]` (`{agg, values[]}`), `forbidden02[]`. From **04**:
per entity `transitionTable = {entity, rows[] ({from, event01, to})}` (from
`04-transitions.md`) + `statusEnum` + `tables[]` (from `04-erd.dbml`); `terminals04` =
states appearing as a `To` but never a `From`. From **05** (when present): per promoted
entity `scxmlGraph = {entity, transitions[] ({from, event01, to})}` (hand-rolled reader),
and the **promoted-entity set**.

**Authority selection (the binding lifecycle rule):** for each entity,
`authority(entity) = scxmlGraph(entity)` **iff** `--upstream-05` present AND `entity ∈
promoted set`; **else** `transitionTable(entity)`. `terminals(entity)` and the covered
transition set are computed **from the authority**, not from 04 when 05 supersedes it.

Closed traversal set (every relationship 06 claims becomes a walked edge):

1. **Bijection edge** — `{feature files} == {03 aggregates}` (M1).
2. **Tag-resolution edge** — each scenario's one source tag resolves to a real 03 invariant
   / 04|05 entity / 03 policy (M6/M7); `@authz:<entity>` resolves like `@transition:` (A6).
3. **Invariant-coverage edge** — each 03 invariant has ≥1 `@invariant:` scenario whose
   `When` attempts the forbidden action (mechanical subset: scenario exists + tag resolves;
   the "actually violating" semantics is agent residue AJ-VIOLATE) (B1).
4. **Transition-coverage edge** — each **authoritative** transition (05 graph if promoted
   else 04 row) has ≥1 `@transition:<entity>` scenario whose `When` embeds the exact 01
   event string (B2 / D3).
5. **Terminal-coverage edge** — each **authoritative** terminal state has a
   `@terminal:<entity>` negative scenario (B3).
6. **Policy-coverage edge** — each 03 policy has a `@policy:<Name>` scenario; eventual-mode
   ⇒ `Then eventually …` phrasing (B4).
6b. **Authorization-coverage edge** — each B7 obligation (an authoritative non-creation
   transition event bound in 01 to a human actor, with ≥1 other human actor) has ≥1
   `@authz:<entity>` scenario: exact event embedded, a different 01 human actor attempting,
   `Then` rejected; exempt events admit no `@authz` scenario (B7).
7. **No-contradiction edge** — no scenario asserts a `From→To` (Given state → Then state
   under the `When` event) absent from the **authority** (B5).
8. **Instantiation edge** — each feature parses + compiles to ≥1 pickle (B2; §3.3).
9. **Language / DRY edges** — exact-event, enum-verbatim, Term-verbatim, no-forbidden,
   no-invented, no-restated (D1–D5 / E1–E3).

Every edge class is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Cross-artifact resolution (mechanical, no engine)

Edges 1–7, 9 are pure resolution / exact-value / coverage-arithmetic / DRY checks over the
parsed AST + upstream models. Byte-deterministic, no engine. The pinned mappings (file name
= snake_case 03 aggregate; `Feature:` name = exact 03 aggregate; tag grammar; event =
exact-01-string-embedded-in-When; authority = 05-if-promoted-else-04) are the catalog's
"Pinned conventions" block, copied into `scripts/lib/lexicon.mjs` so the harness and the
catalog agree by construction.

### 3.3 Parse + compile walks — the strongest-oracle design (B3, this skill's load-bearing layer)

For each `.feature`, the harness **parses and compiles** it on `@cucumber/gherkin`. **No
parser-generated value is ever asserted into a position the harness invented** (§8): the
AST and pickles are *deterministic* functions of the input bytes.

| ID | Step | Assertion | Catalog rule |
|----|------|-----------|--------------|
| W-PARSE | `parser.parse(src)` | returns an AST without throwing `CompositeParserException` (positive); on a negative fixture, **throws** with a message matching the expected `testdata/bad`-shaped oracle | A5 |
| W-FEAT | inspect `gherkinDocument.feature` | exactly one feature; `feature.name` == exact 03 aggregate | A3 |
| W-INST | `compile(doc, uri, id)` | **pickle set is non-empty** (`pickles.length ≥ 1`) — the instantiation oracle; **zero pickles ⇒ `fail` (vacuous feature)** | B2 |
| W-TAGEXP | inspect each pickle's `tags` | the source tag is present on every expanded pickle (outline expansion preserves the tag — §0) so coverage arithmetic counts outlines once per obligation, not once per example | A6, B6 |

W-INST is the B2 instantiation pin: a feature that parses but compiles to zero pickles
(`Feature:` with no `Scenario`/`Scenario Outline`, or an outline with an empty `Examples`)
instantiates nothing downstream and is a **`fail`**, never a vacuous pass. Negative parses
are matched against the `testdata/bad` corpus subset (§3.4) — the harness asserts BOTH that
the parser threw AND that `e.errors[0].message` matches the expected shape (wrong-shape
throw ⇒ `broken-test`, not a silent malformed-pass).

### 3.4 Shipped fixtures (`scripts/fixtures/`)

Two shared deterministic **upstream sets** (`02.md` + `03.md` + `04.dbml` +
`04-transitions.md`, mutually consistent, **≥2 aggregates**), plus an **optional 05 dir** so
both authority paths are exercised:

- **`order`** aggregate — **promoted** entity: a small `order.scxml` exists (states
  `placed, paid, shipped, delivered, cancelled, refunded`; transitions incl. one **beyond
  04** to exercise the 05-supersedes-04 authority arm), so when `--upstream-05` is passed
  its coverage is judged against the **scxml graph**.
- **`coupon`** aggregate — **unpromoted** entity (states `issued, redeemed, expired`, no
  05 file), so its coverage is always judged against **04 rows**.

This mirrors the `statecharts` fixture upstream shapes (the PATTERN, copied). 02 carries
`### OrderStatus` (6) + `### CouponStatus` (3) with each value's `Derived from event`
quoting the exact 01 string; `## Forbidden Synonyms` carries `purchase`→`Order` and
`voucher`→`Coupon`; the 04 `Event` cells carry the exact 01 strings. 03 carries the two
aggregates with ≥1 invariant each and ≥1 `## Cross-Aggregate Policies` row (one **eventual**
mode — e.g. `OrderShipsCoupon` → `Then eventually …`).

**Valid 06 directory** (`fixtures/valid-06/`) — `order.feature` + `coupon.feature`,
covering **everything**: a leading `# fingerprints:` block (five base upstreams + the
`05-statecharts/order.scxml` line, present only because `order` consumes 05); `Feature:
Order` / `Feature: Coupon` (exact 03 names); one `@invariant:` scenario per 03 invariant
(its `When` attempts the forbidden action); one `@transition:<entity>` scenario per
**authoritative** transition (`When` embeds the exact 01 event string); one
`@terminal:<entity>` negative per terminal; one `@policy:<Name>` scenario per policy
(eventual policy uses `Then eventually …`); behavioral titles; single `When` each; 02 enum
values + Terms verbatim. A correct, parse-clean, pickle-producing pair.

**Two run modes** of `valid-06/` are asserted by selftest: **with `--upstream-05`** (order
judged against the scxml graph, incl. the beyond-04 transition) → `pass`; and a parallel
**`valid-06-no05/`** (no `order.scxml` consumed, no 05 fingerprint, order judged against 04
alone) run **without** `--upstream-05` → `pass`.

Each illegal fixture carries exactly one deliberate defect so its negative fires **for the
stated reason** (a fixture failing for any other reason is itself `broken-test`). The
expected `(status, failingCheck, upstreamRoute?, authorityRecord?)` is recorded in
`scripts/fixtures/manifest.json`.

| Fixture (06) | Run flag | Injected defect | Must fail | Expected status |
|--------------|----------|-----------------|-----------|-----------------|
| `valid-06/` | `--upstream-05` | none — minimal correct 06 (order via 05, coupon via 04) | nothing | `pass` |
| `valid-06-no05/` | (no 05) | none — order judged vs 04, no 05 fingerprint | nothing | `pass` |
| **parse-error corpus (≥3, adapted from `testdata/bad`, copied into the skill):** | | | | |
| `not-gherkin.feature` | either | text before `Feature` (`not gherkin`) — adapted `not_gherkin` | M3/W-PARSE (A5) | `malformed` (msg = `(1:1): expected …, got 'not gherkin'`) |
| `inconsistent-cells.feature` | either | a data-table row with a wrong cell count — adapted `inconsistent_cell_count` | M3/W-PARSE (A5) | `malformed` (msg = `(r:c): inconsistent cell count within the table`) |
| `whitespace-in-tag.feature` | either | a source tag containing whitespace — adapted `whitespace_in_tags` | M3/W-PARSE (A5) | `malformed` (msg = `(r:c): A tag may not contain whitespace`) |
| `invalid-language.feature` | either | `#language:no-such` header — adapted `invalid_language` | M3/W-PARSE (A5/A8) | `malformed` (msg = `(1:1): Language not supported: no-such`) |
| **coverage / structure illegals:** | | | | |
| `uncovered-invariant/` | either | a 03 invariant with no `@invariant:` scenario | M-COV-INV (B1) | `fail` |
| `uncovered-transition/` | `--upstream-05` | an authoritative (05) transition with no `@transition:` scenario | M-COV-TRANS (B2) | `fail` |
| `uncovered-transition-04/` | (no 05) | a 04 transition (coupon) with no `@transition:` scenario | M-COV-TRANS (B2) | `fail` |
| `contradicting-scenario/` | `--upstream-05` | a scenario asserting a `From→To` **not** in the authority (uses the superseded 04 edge for the promoted `order`) | M-NOCONTRA (B5) | `fail` |
| `missing-terminal/` | either | a terminal state with no `@terminal:` negative scenario | M-COV-TERM (B3) | `fail` |
| `uncovered-policy/` | either | a 03 policy with no `@policy:` scenario | M-COV-POL (B4) | `fail` |
| `uncovered-authz/` | either | a B7-obligated actor-bound event with no `@authz:` scenario | X-COV-AUTHZ (B7) | `fail` |
| `authz-not-rejected/` | either | an `@authz` scenario whose `Then` asserts no rejection | X-AUTHZ (B7) | `fail` |
| `authz-not-implied/` | either | an `@authz` scenario targeting a SYSTEM-bound event (a rejection the domain doesn't imply) | X-AUTHZ (B7) | `fail` |
| `eventual-as-immediate/` | either | an eventual-mode policy phrased as an immediate `Then` (no `eventually`) | M-COV-POL (B4) | `fail` |
| `bad-tag-namespace.feature` | either | a `@requirement:…` tag (outside the closed grammar) | M6 (A6) | `fail` |
| `tag-target-unresolved.feature` | either | `@invariant:INV-Order-9` (no such invariant in 03) | M7 (A6) | `fail` |
| `two-source-tags.feature` | either | a scenario with both `@invariant:` and `@transition:` | M6 (A6) | `fail` |
| `multi-when.feature` | either | a scenario with two explicit `When` steps | M10 (C3) | `fail` |
| `action-in-then.feature` | either | a `Then`-block step using a blocklisted action verb | M12 (C4) | `fail` |
| `forbidden-synonym.feature` | either | a step uses forbidden `purchase` | M17 (D4) | `fail` |
| `invented-state.feature` | either | a `Given`/`Then` names a state token not in the 02 enum | M15 (D2/D5) | `fail` |
| `invented-entity.feature` | either | a step names an entity/event in no upstream | M18 (D5) | `fail` |
| `restated-invariant.feature` | either | a step copies a 03 invariant `Rule` text verbatim | M19 (E1) | `fail` |
| `enum-listing.feature` | either | an Examples table dumps the full `OrderStatus` value set | M20 (E2) | `fail` |
| `transition-dump.feature` | either | a comment restates the full 04 `order` table | M21 (E3) | `fail` |
| `missing-fingerprint.feature` | either | no leading `# fingerprints:` block | M5 (A4) | `fail` |
| `placeholder-fingerprint.feature` | either | a digest is a placeholder, not 64-hex | M5 (A4) | `fail` |
| `missing-event-string.feature` | either | a `@transition:` `When` omits the exact 01 event string | M14 (D3) | `fail` |
| `wrong-feature-name.feature` | either | `Feature: order` (snake_case stem, not the exact 03 `Order`) | M4 (A3) | `fail` |
| `bad-filename.feature` | either | file named `orders.feature` (not `<aggregate>`) | M2 (A2) | `fail` |
| `extra-feature-file/` | either | a `.feature` for no 03 aggregate (bijection break) | M1 (A1) | `fail` |
| `missing-feature-file/` | either | a 03 aggregate with no `.feature` (bijection break) | M1 (A1) | `fail` |
| `05-claimed-but-absent/` | **(no 05)** | a feature fingerprints `05-statecharts/order.scxml` while `--upstream-05` is absent | N-05ABSENT (binding rule) | `fail` |
| `vacuous.feature` | either | a `Feature:` with no scenario (compiles to **zero pickles**) | W-INST (B2) | `fail` |
| `wrong-reason-trap.feature` | either | **two** defects — an uncovered invariant (B1) AND a forbidden synonym (D4) — proves the negative reports the **B1/M-COV-INV** reason | M-COV-INV isolates over M17 | `fail` (reason = M-COV-INV) |
| `valid-06/` | `--upstream-05` + `broken-upstream-03` | a 03 with a **duplicated `INV-Order-1` id** | resolution surfaces it | `fail` (class=`upstream-defect`→03) |
| `valid-06/` | `broken-upstream-04` | a 04 `Event` cell inconsistent with 02 (a `To` not in the enum) | resolution surfaces it | `fail` (class=`upstream-defect`→04) |
| `vacuous-harness/` | `--no-checks` | structurally valid 06 but harness fed the disabled path | n/a | `broken-test` (zero checks) |
| `no-engine/` | either | valid 06 but `node_modules` absent + network blocked | n/a | `broken-test` (missing parser) |
| `valid-06/` | `malformed-upstream-02` | 02 drops `## Forbidden Synonyms` (scan list cannot be built) | n/a | `broken-test` |
| `valid-06/` | `malformed-upstream-04` | 04 drops `## Transition Tables` (rows cannot be anchored) | n/a | `broken-test` |
| `valid-06/` | `malformed-upstream-05` | a `05/order.scxml` not well-formed XML (authority cannot be read) | n/a | `broken-test` |

`wrong-reason-trap.feature` is the explicit doctrine §2 guard: it would "pass for the wrong
reason" under a sloppy negative. The selftest asserts the failing-check ID equals
`M-COV-INV`, not merely that *some* check failed. `05-claimed-but-absent/` is the binding
lifecycle-authority negative: a feature may not claim 05 authority (fingerprint a scxml,
assert a supersedes-only edge) when 05 was not supplied. The upstream-set rows route a
well-formed-but-inconsistent 03/04 to `fail` + `upstream-defect`→owner; an unparseable
upstream (incl. an unreadable 05) routes to `broken-test` (§9).

### 3.5 The 05-authority logic (the binding lifecycle rule — unique to this skill)

This skill is the only artifact whose authority **switches by an optional input**. The
catalog's "Lifecycle-authority rule (binding)" + "05-if-promoted-else-04" is mechanized as:

1. **When `--upstream-05` is present:** the harness reads each `<entity>.scxml` with the
   copied `scxml.mjs` reader → `scxmlGraph(entity)` (`From`-state, `<!-- 01-event: … -->`
   annotation, `To`-state). For every **promoted** entity (a 04 entity with a `.scxml`),
   `authority(entity) = scxmlGraph(entity)` — including transitions **beyond** the 04 table
   (05 may add lifecycle detail). Its `@transition`/`@terminal` coverage (B2/B3) is judged
   against the scxml graph, and a scenario asserting a `From→To` **absent from the scxml
   graph** ⇒ `fail` (B5 / M-NOCONTRA) — even if that edge exists in the *superseded* 04
   table. Unpromoted entities (no `.scxml`) are judged against **04 rows**.

2. **When `--upstream-05` is absent:** `authority(entity) = transitionTable(entity)` for
   **every** entity — lifecycle coverage is judged against **04 alone**. The harness
   additionally asserts **no feature file claims a 05 fingerprint** (no
   `05-statecharts/*.scxml` line in any `# fingerprints:` block) and **no scenario asserts
   supersedes-based authority** (no `From→To` that exists only in a 05 graph the harness was
   not given). A feature fingerprinting a 05 file under this mode ⇒ `fail` (N-05ABSENT). This
   prevents a feature from *claiming* a 05 authority that the run cannot verify.

The harness records the chosen authority per entity in the summary
(`authority: {order: "05-scxml", coupon: "04-table"}` or all-`"04-table"` when 05 absent),
so the verdict is transparent about which source each entity's coverage was judged against.
**The 06 harness does not re-certify 05's own internal correctness** (that is the
`statecharts` harness's single-owned job); it consumes 05's transition set as the authority,
and routes an *unreadable* 05 to `broken-test`, a *well-formed-but-inconsistent* 04↔02 to
`upstream-defect`→04 (§9).

### 3.6 Manifest

`scripts/fixtures/manifest.json` records, per fixture,
`{files, runFlag (with05|no05), status, failingCheck, upstreamRoute?, authorityRecord, errorShape?}`.
`selftest.mjs` runs the harness over each entry and asserts the actual tuple equals the
manifest — negatives are proven to fire **for their stated reason**, the 05-present/absent
authority records are asserted, the parse-negative `errorShape` matches the `testdata/bad`
oracle, and the coverage floor (§5) is asserted true.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a
check means editing this section AND `scripts/lib/checks.mjs` in a committed change, and the
new check MUST cite a catalog rule. The harness emits each check's `id`, `class`, `status`,
and `rule` in its JSON summary (§7). **Five** classes — the four B3 classes plus the engine
(parse+compile) class, which is the strongest-oracle layer.

### 4.1 Engine / parse+compile checks (`W` — the feature is RUN on the reference parser)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| W-PARSE | every feature parses on `@cucumber/gherkin` without throwing (positive); a negative fixture throws with a message matching the expected `testdata/bad`-shaped oracle. | A5 |
| W-FEAT | exactly one `Feature:` per file; `feature.name` == exact 03 aggregate. | A3 |
| W-INST | `compile(...)` yields a **non-empty** pickle set; zero pickles ⇒ vacuous ⇒ fail. | B2 |
| W-TAGEXP | the source tag is inherited onto every expanded outline pickle. | A6, B6 |

### 4.2 Resolution checks (`R` — a referenced element exists / maps in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R-BIJECT | `{feature files} == {03 aggregates}` (snake_case bijection). | A1 |
| R-TAG | each scenario has exactly one closed-grammar source tag. | A6 |
| R-TAGTARGET | each tag's referent resolves (INV ∈ 03 / entity ∈ 04|05 / policy ∈ 03). | A6 |
| R-EVENT | each `@transition`/`@policy`/`@authz` `When` embeds the exact 01 event string. | D3 |
| R-STATE | each state-shaped token in `Given`/`Then` ∈ the 02 enum values. | D2, D5 |
| R-TERM | each domain-concept token uses a 02 Term verbatim. | D1 |
| R-AUTHORITY | each entity's authority is `05-if-promoted-else-04`; no scenario asserts a `From→To` absent from it. | B5 |
| R-FINGERPRINT | the leading `# fingerprints:` block names all five base upstreams (+ each consumed 05 when 05 present), each a 64-hex digest. | A4 |

### 4.3 Exact-value / coverage-arithmetic checks (`X` — exact counts against the derived graph)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| X-COV-INV | every 03 invariant has ≥1 resolving `@invariant:` scenario. | B1 |
| X-COV-TRANS | every **authoritative** transition has ≥1 `@transition:` scenario whose `When` embeds the exact 01 event. | B2 |
| X-COV-TERM | every **authoritative** terminal state has a `@terminal:` negative scenario. | B3 |
| X-COV-POL | every 03 policy has a `@policy:` scenario; eventual-mode ⇒ `Then eventually …`. | B4 |
| X-COV-AUTHZ | every B7 obligation (an authoritative non-creation transition event bound in 01 to a human actor, with ≥1 other human actor defined) has ≥1 `@authz:<entity>` scenario whose `When` embeds the exact event. | B7 |
| X-AUTHZ | every `@authz` scenario is well-formed: targets an obligated event (never an exempt one — a rejection the domain doesn't imply is itself the failure), names a 01 human actor other than the bound one, and its `Then`-block asserts rejection. | B7 |
| X-ONEWHEN | each scenario has exactly one `Action` (When) step. | C3 |
| X-ROLEORDER | step `keywordType` sequence is `Context* Action Conjunction* Outcome+ …` (no Outcome-before-Action). | C4 |
| X-FEATURE-ONE | exactly one `Feature:` per file. | A3 |
| X-RECON | the executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.4 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

Named negatives proven by the shipped illegal fixtures (§3.4). Each asserts both that the
defect is rejected AND that the failing-check ID matches the defect's owner rule
(wrong-reason ⇒ `broken-test`). N-IDs map 1:1 to the fixture rows; abbreviated:

| ID | Illegal input | For the reason | Owner check | Catalog rule |
|----|---------------|----------------|-------------|--------------|
| N1 | extra / missing `.feature` | bijection break | M1 / R-BIJECT | A1 |
| N2 | bad filename | not `<aggregate>.feature` | M2 | A2 |
| N3 | wrong `Feature:` name | ≠ exact 03 aggregate | M4 / W-FEAT | A3 |
| N4 | missing / placeholder fingerprint | block invalid | M5 / R-FINGERPRINT | A4 |
| N5 | parse error (×4 corpus) | parser throws, shape matches oracle | M3 / W-PARSE | A5 |
| N6 | bad tag namespace | tag ∉ closed grammar | M6 / R-TAG | A6 |
| N7 | tag target unresolved | referent ∉ upstream | M7 / R-TAGTARGET | A6 |
| N8 | two source tags | >1 source tag | M6 / R-TAG | A6 |
| N9 | uncovered invariant | no `@invariant:` scenario | X-COV-INV | B1 |
| N10 | uncovered transition (05 & 04) | no `@transition:` scenario | X-COV-TRANS | B2 |
| N11 | missing terminal | no `@terminal:` negative | X-COV-TERM | B3 |
| N12 | uncovered policy / eventual-as-immediate | no `@policy:` / wrong phrasing | X-COV-POL | B4 |
| N13 | contradicting scenario | `From→To` ∉ authority | R-AUTHORITY | B5 |
| N14 | multi-When | >1 `When` | M10 / X-ONEWHEN | C3 |
| N15 | action in `Then` | blocklisted verb in Outcome block | M12 / X-ROLEORDER | C4 |
| N16 | missing event string | `When` omits exact 01 event | M14 / R-EVENT | D3 |
| N18 | uncovered authz obligation | an actor-bound event with no `@authz:` scenario | X-COV-AUTHZ | B7 |
| N19 | malformed authz scenario | `Then` not a rejection / targets an exempt event | X-AUTHZ | B7 |
| N17 | invented state token | state ∉ 02 enum | M15 / R-STATE | D2/D5 |
| N18 | invented entity/event | not upstream-defined | M18 | D5 |
| N19 | forbidden synonym | 02 forbidden term used | M17 | D4 |
| N20 | restated invariant | 03 `Rule` text copied | M19 | E1 |
| N21 | enum listing | full enum dumped | M20 | E2 |
| N22 | transition-table dump | 04 table copied | M21 | E3 |
| N23 | vacuous feature | zero pickles | W-INST | B2 |
| N-05ABSENT | 05-claimed-but-absent | 05 fingerprint while `--upstream-05` absent | R-FINGERPRINT / R-AUTHORITY | (binding lifecycle rule) |
| N24 | upstream-03 dup invariant id | `INV-*` duplicated | §9 route→03 | (upstream) |
| N25 | upstream-04 self-inconsistency | a `To`/`Event` not in 02 | §9 route→04 | (upstream) |

### 4.5 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ-VIOLATE`, `AJ-DECL`, `AJ-EVENTUAL`, `AJ-CONJ` enumerated in §6. They run last, only over
checks that survived all mechanical + engine gates, and return enumerated verdicts only.
**No ❌ catalog rule is left to agent judgment** — every ❌ has a mechanical or engine owner
above; the agent judges only residue at its own (⚠️/ℹ️) severity.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The 06 artifact owns four element sets: `features`, `scenarios`,
`steps`, `tags`. The intake count is:

```
intake = |features| + Σ|feature.scenarios| + Σ|scenario.steps| + Σ|scenario.tags|
```

The **edge / coverage count** the harness must walk (from §3.1):

```
edgesExpected = 1                                   (R-BIJECT, the directory↔03 bijection)
              + Σ|scenarios|                        (R-TAG / R-TAGTARGET, per scenario)
              + |03 invariants|                     (X-COV-INV, one per invariant)
              + |authoritative transitions|         (X-COV-TRANS, per authority transition)
              + |authoritative terminals|           (X-COV-TERM, per terminal)
              + |03 policies|                        (X-COV-POL, per policy)
              + Σ|scenarios with a From→To|          (R-AUTHORITY no-contradiction)
              + Σ|@transition/@policy scenarios|     (R-EVENT exact-01-event)
              + Σ|features|                          (W-PARSE + W-FEAT + W-INST + R-FINGERPRINT)
              + Σ|state/Term tokens|                 (R-STATE / R-TERM / M15–M18)
```

The **parse/compile scenario count** is reported separately (`counts.engine`) so the
strongest-oracle layer's coverage is visible: a `pass` with `counts.engine.total === 0`
over an artifact that *has* feature files is itself a `broken-test` (the parser layer was
skipped). There is **no sanctioned zero-feature pass** — 06 is unconditional (06 always has
≥1 aggregate ⇒ ≥1 feature); a zero-feature directory is an M1 bijection failure, not a
sanctioned empty pass.

**Every owned element exercised ≥1 time.** The harness asserts:
- every `feature` is touched by W-PARSE + W-FEAT + W-INST (run) + R-FINGERPRINT;
- every `scenario` is touched by R-TAG + R-TAGTARGET and by its coverage edge (X-COV-*);
- every `step` is touched by X-ROLEORDER and (if `Given`/`Then`) R-STATE/R-TERM and (if
  `When`) X-ONEWHEN + R-EVENT;
- every `tag` is touched by R-TAG (grammar) + R-TAGTARGET (resolution).

**Reconciliation formula (X-RECON — no silently dropped checks):**

```
executedChecks = engineRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected)
           && (executedChecks > 0)
           && (engineRun > 0 when features > 0)
           && (coverageEdgesWalked === |inv| + |authTransitions| + |terminals| + |policies|)
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠
edgesExpected` ⇒ a check was silently dropped ⇒ `broken-test`. **If `features > 0` but the
parse layer ran zero compiles ⇒ `broken-test`** (strongest oracle skipped). The coverage
arithmetic (X-COV-*) must have walked one edge per invariant / authoritative transition /
terminal / policy, or a coverage obligation was dropped ⇒ `broken-test`.

**Positive AND negative per claimed behavior.** Every behavior 06 claims is proven by **≥1
positive** (a passing check over `valid-06/` and/or `valid-06-no05/`) AND **≥1 negative** (a
shipped illegal fixture that must fail). Abbreviated mapping (full ❌-reconciliation in the
closing table):

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Dir ↔ 03 bijection | A1 | M1/R-BIJECT over `valid-06/` | `extra-feature-file/`, `missing-feature-file/` |
| File/Feature naming | A2/A3 | M2/M4/W-FEAT over `valid-06/` | `bad-filename.feature`, `wrong-feature-name.feature` |
| Fingerprints (4 + 05) | A4 | M5/R-FINGERPRINT over `valid-06/` | `missing/placeholder-fingerprint.feature` |
| Parses clean | A5 | W-PARSE over `valid-06/` | `not-gherkin` / `inconsistent-cells` / `whitespace-in-tag` / `invalid-language.feature` |
| Compiles ≥1 pickle | B2 | W-INST over `valid-06/` | `vacuous.feature` |
| One closed tag/scenario | A6 | M6/R-TAG over `valid-06/` | `bad-tag-namespace`, `two-source-tags.feature` |
| Tag target resolves | A6 | M7/R-TAGTARGET over `valid-06/` | `tag-target-unresolved.feature` |
| Every invariant covered | B1 | X-COV-INV over `valid-06/` | `uncovered-invariant/` |
| Every transition covered | B2 | X-COV-TRANS over `valid-06/` (05) + `valid-06-no05/` | `uncovered-transition/`, `uncovered-transition-04/` |
| Every terminal covered | B3 | X-COV-TERM over `valid-06/` | `missing-terminal/` |
| Every policy covered | B4 | X-COV-POL over `valid-06/` | `uncovered-policy/`, `eventual-as-immediate/` |
| Every authz obligation covered + well-formed | B7 | X-COV-AUTHZ / X-AUTHZ over `valid-06/` | `uncovered-authz/`, `authz-not-rejected/`, `authz-not-implied/` |
| No authority contradiction | B5 | R-AUTHORITY over `valid-06/` | `contradicting-scenario/` |
| 05-if-promoted-else-04 | binding | both run modes pass | `05-claimed-but-absent/` |
| Single When | C3 | X-ONEWHEN over `valid-06/` | `multi-when.feature` |
| No action in Then | C4 | M12/X-ROLEORDER over `valid-06/` | `action-in-then.feature` |
| Exact-01-event in When | D3 | R-EVENT over `valid-06/` | `missing-event-string.feature` |
| State = 02 enum | D2 | R-STATE over `valid-06/` | `invented-state.feature` |
| No invented vocab | D5 | M18 over `valid-06/` | `invented-entity.feature` |
| No forbidden synonym | D4 | M17 over `valid-06/` | `forbidden-synonym.feature` |
| No restated invariant | E1 | M19 over `valid-06/` | `restated-invariant.feature` |
| No enum listing | E2 | M20 over `valid-06/` | `enum-listing.feature` |
| No transition dump | E3 | M21 over `valid-06/` | `transition-dump.feature` |
| Upstream-03/04 sound | §9 | `valid-06/` + sound set | `broken-upstream-03/04` |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a
negative entry — the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; violating-action semantics + declarative quality + eventual phrasing + And-conjunction; closed verdict schema)

These catalog rules (or rule residues) are **inherently semantic** — they require domain
understanding the mechanical + engine layers cannot supply. Each runs only after mechanical
gates pass and returns an **enumerated verdict** (never prose). The harness records
`{id, verdict, ruleId}`; any verdict other than the rule's pass-verdict is reported at the
catalog severity. **There are no ❌ agent-judged checks** — every ❌ rule has its ❌ weight
carried by a mechanical or engine subset; the agent judges only residue at its own
(⚠️/ℹ️/closed) severity.

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ-VIOLATE | B1 residue | the mechanical subset proves an `@invariant:` scenario *exists* and its tag *resolves*; whether its `When` performs the **invariant-violating** action (vs a permitted one) is a domain judgment the AST does not encode. | `{ violates-the-rule \| performs-a-permitted-action \| ambiguous }` |
| AJ-DECL | C1 (declarative) | whether a step is declarative domain language vs imperative UI mechanics ("click", "the page shows") is a style judgment beyond a verb blocklist (the blocklist catches the obvious; the residue is judged). | `{ declarative \| imperative-ui-coupled \| ambiguous }` |
| AJ-EVENTUAL | B4 residue | the mechanical subset proves an eventual-mode policy *uses* `Then eventually …`; whether the phrased consequence is genuinely the *eventual* target-aggregate consequence (vs a synchronous outcome mislabeled `eventually`) is a judgment. | `{ eventual-consequence-correct \| immediate-mislabeled \| ambiguous }` |
| AJ-CONJ | C3/C5 residue | whether a `When … And <x>` (a `Conjunction` step the parser does not classify, §2) smuggles a **second action** (a multi-When violation) vs a context qualifier is a judgment. | `{ single-action \| second-action-smuggled \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); reported as ℹ️, never silently
dropped, never a pass for reconciliation (counts as executed, verdict-recorded). No
agent-judged check may emit free prose in an asserted position. The mechanical preconditions
for each (the resolving `@invariant:` scenario + its `When` text for AJ-VIOLATE; the
step-text set for AJ-DECL; the eventual-policy `Then` step for AJ-EVENTUAL; the
`When`-block `Conjunction` steps for AJ-CONJ) are computed by the harness and handed to the
agent, so the agent judges only the semantic residue, never raw structure.

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order,
`checks[]`/`findings[]` sorted by `id`:

```json
{
  "skill": "gherkin",
  "artifactDir": "specs/06-gherkin/",
  "upstream02": "specs/02-glossary.md",
  "upstream03": "specs/03-aggregates.md",
  "upstream04Dbml": "specs/04-erd.dbml",
  "upstream04Transitions": "specs/04-transitions.md",
  "upstream05": "specs/05-statecharts/ | null",
  "tooling": { "gherkin": "39.1.0", "messages": "32.3.1", "dbmlCore": "8.2.5", "node": ">=18" },
  "status": "pass | fail | malformed | broken-test",
  "authority": { "order": "05-scxml", "coupon": "04-table" },
  "counts": {
    "intake": { "features": 0, "scenarios": 0, "steps": 0, "tags": 0 },
    "checks": { "engine": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "engine": { "parsed": 0, "compiled": 0, "pickles": 0, "total": 0 },
    "coverage": { "invariants": 0, "transitions": 0, "terminals": 0, "policies": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "checks": [
    { "id": "W-INST", "class": "engine", "rule": "B2", "status": "pass" },
    { "id": "X-COV-TRANS", "class": "exactValue", "rule": "B2", "status": "pass" },
    { "id": "R-AUTHORITY", "class": "resolution", "rule": "B5", "status": "pass" },
    { "id": "AJ-VIOLATE", "class": "agent-judged", "rule": "B1", "verdict": "violates-the-rule" }
  ],
  "findings": [
    { "id": "X-COV-TRANS", "rule": "B2", "severity": "error", "detail": "authoritative transition placed→cancelled (event 'Order Cancelled') for entity 'order' has no @transition:order scenario" }
  ]
}
```

- The `authority` block is **always present**; it records the lifecycle source each entity's
  coverage was judged against (`05-scxml` only when `--upstream-05` present AND the entity is
  promoted; otherwise `04-table`). `upstream05: null` ⇔ the flag was absent.
- The optional `class: "upstream-defect"` + `upstream: "<file>"` on a finding routes a
  02/03/04-origin defect (§9). It does **not** add a status; the status stays `fail`
  (taxonomy closed).
- **stderr** — human-readable diagnostics only (parse throws with the
  `(line:col): <message>` shape + the matched `testdata/bad` oracle name for negatives, the
  vacuous-feature note, per-coverage missing-obligation detail, the wrong-reason-trap
  explanation, the 05-claimed-but-absent note, the upstream-defect routing note naming which
  file to fix, the missing-parser install command). Never the machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. `1` = `fail` (incl. `upstream-defect`,
  coverage gaps, 05-claimed-but-absent). `2` = `malformed` (a `.feature` the parser rejects).
  `3` = `broken-test` (check threw, wrong-reason, reconciliation mismatch, zero checks,
  unparseable upstream/05, **or missing parser**). The distinct codes let CI separate a wrong
  06 (`1`), a malformed feature (`2`), and a broken harness/fixture/missing-parser (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`.
  There is no sanctioned zero-check pass for this artifact.

## 8 — Determinism (doctrine §6; parser-value exclusion)

Running a real parser is the determinism risk this skill must manage. The
`@cucumber/gherkin` parser is a **pure function of the input bytes** — no clock, no random,
no network; the same `.feature` yields the same AST and the same pickle set every run (the
probe confirms byte-identical ASTs across runs). The harness keeps every non-deterministic
value out of asserted positions:

- **The `IdGenerator` is the only nondeterminism source, and it is excluded from
  assertions.** `compile(...)` mints pickle/step `id`s. The probe uses `IdGenerator.uuid()`,
  but the harness pins **`IdGenerator.incrementing()`** (the deterministic sequential
  generator) so re-runs produce identical ids — AND the harness **never asserts an id value**
  regardless; it asserts pickle *count*, *names*, *tags*, and *step types/text* (all
  input-derived), never a minted id. So even under `uuid()` the verdict is stable.
- **The pickle set is asserted by count + content** (non-empty for W-INST; tag-inheritance
  by tag-name for W-TAGEXP), never by a parser-minted handle.
- **Fingerprint digests are read from the artifacts** and only shape-checked (M5) — the
  harness never recomputes a sha256 and asserts equality (that would inject a value); it
  checks shape + naming and resolves references against the files actually passed.
- **Cross-artifact sets are sorted** before comparison (the `{feature files}` set, the
  `{03 aggregates}` set, the authoritative-transition list ordered by `(from, event, to)`),
  so set-equality and coverage arithmetic are order-independent and stable.
- **Fresh parse per feature** (one `new Parser(...)` per file); nothing carries between
  files. A re-run over byte-identical inputs is **byte-identical output** (stable key order,
  sorted `checks[]`/`findings[]`).
- **Pinned parser version** (`@cucumber/gherkin` 39.1.0 + its `@cucumber/messages` peer)
  recorded in `tooling`: the grammar/tokenizer is version-stable, so the asserted AST shapes
  and parse-error messages do not drift across the locked tree (the §0 error-shape parity is
  pinned to 39.1.0).
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the
  reconciliation arithmetic and their verdicts are recorded, not invented into counts — so
  the **pass/fail mechanical+engine verdict remains byte-deterministic** regardless of agent
  output.

## 9 — Upstream-defect routing (how a 02/03/04/05 defect is reported without patching around it)

06 is validated *against* five-or-six upstreams. The harness **never silently repairs or
works around** a bad upstream — it surfaces the defect and routes it to the file that owns
the fix:

1. **Sound upstreams.** 02/03/04(/05) all parse against their pinned formats AND are
   self/mutually consistent **in the ways gherkin can legitimately see**: every 03 invariant
   id is **unique**; every 03 policy row names a real source event + target aggregate; every
   04 `From`/`To` (≠`∅`) ∈ the entity's 02 enum; every 04 `Event` quotes a string the 02
   `Derived from event` carries; (when 05 present) every `.scxml` is well-formed and its
   transition set reads. The 06→0n resolution + coverage checks run normally; a failure is a
   **06 defect** → `fail`, ordinary finding.

   **gherkin does not re-verify what an upstream skill single-owns.** Whether a 02 value's
   derivation is a real 01 event is the **glossary** harness's check; whether a 04 row's
   `Event` quotes 01 verbatim is the **erd** harness's check; whether a 05 machine is a
   faithful lifecycle model is the **statecharts** harness's check. gherkin *consumes* those
   strings/edges (the `When` must embed the event; coverage is judged against the authority)
   but does not re-litigate their upstream provenance — it checks only the 06-internal
   resolution + the cross-edges it can see.

2. **Well-formed but self-inconsistent 03** (`upstream-defect` → 03). 03 parses, but an
   `INV-<Agg>-<n>` id is **duplicated** (so a `@invariant:` tag resolves ambiguously), or a
   policy row is malformed. A naive reading might blame 06's tag. Instead the harness runs a
   **pre-resolution 03 self-check** (invariant-id uniqueness; policy-row well-formedness)
   **before** the 06→03 checks; on failure the finding is tagged `class: "upstream-defect"`,
   `upstream: "03-aggregates.md"`. Status `fail`, exit `1`; fix routes **upstream to the
   aggregates artifact**. Proven by `valid-06/` + `broken-upstream-03`.

3. **Well-formed but self-inconsistent 04** (`upstream-defect` → 04). 04 parses, but a
   transition `To`/`From` value is not in the entity's 02 enum, or an `Event` cell is
   inconsistent with 02 (so a faithful `When`/state step would have no 02 owner). The harness
   runs a **04↔02 self-check** before the 06→04 coverage checks; on failure the finding is
   tagged `upstream: "04-transitions.md"` (or `04-erd.dbml`). Status `fail`, exit `1`; fix
   routes **upstream to the erd artifact**. Proven by `valid-06/` + `broken-upstream-04`.

4. **Unparseable 02 / 03 / 04, or unreadable 05** (`broken-test`, not `upstream-defect`). An
   upstream does not parse against its pinned format (02 drops `## Forbidden Synonyms` so the
   M17 scan list cannot be built; 04 drops `## Transition Tables` so the rows cannot be
   anchored; a `05/*.scxml` is not well-formed XML so the authority cannot be read). The
   harness cannot anchor its resolution/coverage targets, so it cannot make a trustworthy
   statement about 06. Status `broken-test`, exit `3`, stderr "upstream <file> unparseable."
   Proven by `valid-06/` + `malformed-upstream-02` / `malformed-upstream-04` /
   `malformed-upstream-05`.

The splits are deliberate: `upstream-defect` (cases 2–3) is an actionable content finding
routed to the correct upstream owner while keeping the §2 status set closed; `broken-test`
(case 4) is the harness honestly refusing to emit a verdict it cannot justify. No case lets
the harness paper over an upstream by inferring, substituting, or skipping a missing element.
**The optional-05 case is handled the same way:** an *absent* `--upstream-05` is NOT a
defect — it switches the authority to 04 and asserts no-05-claims (§3.5); only an
*unreadable* supplied 05 is `broken-test`.

---

*This contract mechanizes catalog rules A1–A8 / B1–B6 / C1–C9 / D1–D5 / E1–E4. **Mechanical
/ engine ❌ coverage is complete:** every ❌-severity catalog rule has BOTH (a) a mechanical
or engine owner check and (b) a dedicated negative fixture. The full reconciliation (❌ rule
→ owner check → negative fixture):*

| ❌ rule | Owner check | Negative fixture |
|---|---|---|
| A1 | M1 / R-BIJECT | `extra-feature-file/` / `missing-feature-file/` |
| A2 | M2 | `bad-filename.feature` |
| A3 | M4 / W-FEAT / X-FEATURE-ONE | `wrong-feature-name.feature` |
| A4 | M5 / R-FINGERPRINT | `missing/placeholder-fingerprint.feature` |
| A5 | M3 / W-PARSE | `not-gherkin` / `inconsistent-cells` / `whitespace-in-tag` / `invalid-language.feature` |
| A6 | M6 / M7 / R-TAG / R-TAGTARGET | `bad-tag-namespace` / `tag-target-unresolved` / `two-source-tags.feature` |
| B1 | X-COV-INV | `uncovered-invariant/` |
| B2 | X-COV-TRANS / W-INST | `uncovered-transition/` / `uncovered-transition-04/` / `vacuous.feature` |
| B3 | X-COV-TERM | `missing-terminal/` |
| B4 | X-COV-POL | `uncovered-policy/` / `eventual-as-immediate/` |
| B7 | X-COV-AUTHZ / X-AUTHZ | `uncovered-authz/` / `authz-not-rejected/` / `authz-not-implied/` |
| B5 | R-AUTHORITY | `contradicting-scenario/` |
| C1 | M12 (subset) / AJ-DECL | `action-in-then.feature` |
| C2 | X-ROLEORDER (one-behavior subset) | (covered via multi-When / role-order) |
| C3 | M10 / X-ONEWHEN | `multi-when.feature` |
| C4 | M11 / M12 / X-ROLEORDER | `action-in-then.feature` |
| D1 | M16 / R-TERM | (Term-drift variant of `invented-entity.feature`) |
| D2 | M15 / R-STATE | `invented-state.feature` |
| D3 | M14 / R-EVENT | `missing-event-string.feature` |
| D4 | M17 | `forbidden-synonym.feature` |
| D5 | M15 / M18 | `invented-state.feature` / `invented-entity.feature` |
| E1 | M19 | `restated-invariant.feature` |
| E2 | M20 | `enum-listing.feature` |
| E3 | M21 | `transition-dump.feature` |
| binding (05-if-promoted-else-04) | R-AUTHORITY / R-FINGERPRINT | `05-claimed-but-absent/` |

*(A7/A8/B6/C5/C6/C7/C8/C9/E4 are ⚠️/ℹ️ rules: each still carries a mechanical owner
(M9/M8/M23/M25/M25/M13/M25/M24/M22) and, where a behaviour can fail concretely, a fixture.
C1's obvious imperative-UI arm is caught by the M12 blocklist (❌); the style residue is
AJ-DECL (⚠️). The binding **lifecycle-authority rule** is mechanized by R-AUTHORITY (the
05-if-promoted-else-04 authority selection + no-contradiction) and R-FINGERPRINT (the
no-05-claims-when-absent guard), with the `05-claimed-but-absent/` negative and BOTH run
modes of `valid-06/` (with-05 / no-05) as the dual positive. The B2 **instantiation oracle**
is pinned to pickle-compilation: parse-clean + ≥1 pickle is the positive, `vacuous.feature`
(zero pickles) the negative. The selftest's COVERAGE array asserts the positive+negative
floor over the §5 table and fails if any ❌ rule lacks either side. Agent-judged checks cover
only the violating-action semantics, declarative-style quality, eventual-phrasing quality,
and the And-conjunction residue, with closed verdict schemas. Pass = status `pass` = zero ❌
findings, reconciled, ≥1 check executed, engine layer non-empty.*
