# ui-flows — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `ui-flows` skill (artifact **09**, a
**directory artifact**: `specs/09-ui-flows/` holding **one `<snake(persona)>.xml` IFML model per
`07` persona** — a bijection with the `07` `### <PersonaName>` blocks). It defines the **sole
executable pass/fail authority** that ships with the skill: a **vendored, MM-faithful IFML-XMI-subset
reader + a flow-walk oracle** (the strongest oracle realizable for this format — the probe proved no
scriptable IFML validator exists, so the harness hand-rolls a reader over the pinned dialect and a
**deterministic BFS flow-walker** that re-derives the 08 nominal path and verifies it is *realizable*
as a navigation walk from home, then re-computes the KLM flow cost and compares it to the 08 budget)
plus a closed seam-resolution / exact-value / reason-qualified-negative checker, an optional-05
authority switch (copied PATTERN from the gherkin harness), and a minimal set of agent-judged residue
checks. It satisfies the verification doctrine §2 (closed assertion grammar, stdout JSON, stderr
diagnostics, status taxonomy `pass|fail|malformed|broken-test`, no vacuous green, agent judgment only
where the contract marks it + closed verdicts), §6 (determinism, fresh state, byte-identical re-runs),
and build steps B2 (formal-format artifact: validate under the authoritative validator — here the
pinned dialect's own hand-rolled reader, per the probe) and B3 (simulation design — strongest oracle =
exercise every relationship/path/edge; reuse over invention).

It is **paired with** `references/validation-rules.md` (the closed rule catalog, Themes A–F:
**A-a … A-l / B-a … B-d / C-a … C-d / D-a … D-c / E-a … E-d / F-a … F-f — 33 rules, 22 ❌**). Every
check below cites the catalog rule ID(s) it mechanizes. **The catalog is the review vocabulary; this
file is the executable harness over it.** No check here exists without a catalog rule behind it.

The `09` artifact is a **formal-format artifact** (a pinned, mechanically-lintable IFML-XMI subset
grounded in the OMG IFML 1.0 metamodel) — like `08` (CTT XML), `05` (SCXML→SCION), `06`
(Gherkin→pickles), `04` (DBML→Postgres). Per doctrine B3 ("prefer running the artifact on a real
engine of its formalism") and B2 ("must parse/validate under the authoritative validator … downstream
instantiation must succeed"), the strongest oracle should be **executable** — but the probe (§0)
proved **no scriptable IFML engine/validator exists**, so the authoritative validator is the
**vendored hand-rolled reader for the pinned IFML-XMI subset** (Theme A's grammar), and the
"downstream instantiation" arm is the **flow-walk**: the harness re-derives each realized 08 model's
nominal-path leaf sequence (the **vendored CTT walker PATTERN, copied from the `08` harness**), resolves
each leaf to its mapped `Event`(s), and **walks** the `NavigationFlow` graph from the home container to
prove the nominal path is *realizable* — then re-computes the KLM **flow cost** (compared to the 08
`Budget.klm`, warn-only) and the **screens-visited count** (compared to the 08 nominal leaf count + 3,
the blocking flow-bloat floor). This is the load-bearing layer designed below (§3.3 — the
**flow-walk oracle**).

The artifact is a **five-or-six-upstream** artifact (02 + both 04 + 07 + 08, plus **optional** 05),
validated against `specs/02-glossary.md` (enum `### <Name>Status` tables + `## Forbidden Synonyms`),
BOTH `specs/04-erd.dbml` + `specs/04-transitions.md` (table/enum vocabulary + transition tables
`From | Event | To`), `specs/07-personas.md` (the persona blocks fixing one model per file),
`specs/08-task-models/` (the realized task models with budgets + nominal-path trees), and **optionally**
`specs/05-statecharts/*.scxml` — **present only when 05 was emitted**. The harness pin:

```
node scripts/harness.mjs <09-dir> \
     --upstream-02 <02-glossary.md> \
     --upstream-04-dbml <04-erd.dbml> \
     --upstream-04-transitions <04-transitions.md> \
     --upstream-07 <07-personas.md> \
     --upstream-08 <08-task-models-dir> \
     [--upstream-05 <05-statecharts-dir>]
```

**The `--upstream-05` flag is optional and load-bearing for the lifecycle-authority rule (catalog Theme
D, "05-if-promoted-else-04").** When **present**, a promoted entity's `<entity>.scxml` is the lifecycle
authority and its 04 transition rows are superseded; when **absent**, lifecycle Events are judged
against **04 alone**, AND the harness verifies that **no model fingerprints a 05 `.scxml` or carries a
05-derived lifecycle claim** — a model that fingerprints a `05-statecharts/*.scxml` while `--upstream-05`
is absent is a `fail` (N-05ABSENT, §4.4). This is the harness expression of the catalog's
"05-if-promoted-else-04" authority (copied PATTERN from the `gherkin` harness §3.5).

The upstream parses use the **pinned 02/04/07/08 formats** (copied, never imported — see §1). 09
references all upstreams by exact string and **never restates** a 02 enum definition, a 04 row, a 07
persona prose block, or an 08 task-tree structure beyond the seams it must resolve (Theme E). 09 owns
only the **IFML structure derived via the pinned dialect** (containers with frozen ids, components +
04-resolved bindings, events + KLM costs + exact-01 annotations, navigation flows).

## 0 — Probe reference (no scriptable IFML validator exists → vendored hand-rolled IFML-XMI-subset reader)

`sources/PROBE-transcript.md` + `sources/SOURCES.md` → **"Probe"** record the empirical search for a
runnable, headless IFML validator that ingests genuine OMG **IFML-XMI** and reports conformance.
**Verdict: NO scriptable validator ingests genuine OMG IFML-XMI.** Recorded (Node v24.13.0, Python
3.9.6, probe dir `/tmp/ifml-probe`):

- **npm** `ifml` → **E404**. The only credible lead, `ifml-moddle@0.3.1`, is a moddle *wrapper*: its
  `moddle.create('ifml:ViewContainer')` path is **strict** (rejects `ifml:Nope` → `unknown type`), so
  the `ifml-moddle.schema.json` descriptor (77 types, faithful MM mirror) is a real **type/shape
  conformance reference** — but its `fromXML()` reader is **lenient and disqualifying**: on the
  package's own example it emits "unexpected element" *warnings* and a partial tree, "parses" a bogus
  model, and even a trivial native round-trip warns. moddle uses a **bespoke single-root
  attribute-flavored dialect**, NOT genuine OMG multi-root `<xmi:XMI>`/`xmi:id`/association XMI. **It
  parses leniently; it does not validate conformance.** Rejected as the oracle.
- **PyPI** `ifml` → **HTTP 404**. No pip validator.
- **Eclipse IFML editor** (`github.com/ifml/ifml-editor`) → Sirius/EMF **GUI-only**, last pushed
  2015-08-26, no headless/CLI validation mode. Its `.ecore`/`.genmodel`/`.xmi` are kept as
  **conformance reference only** (the machine shape), the runnable editor rejected.

**Tooling decision (SOURCES Probe conclusion, copied here as the §0 record):** the deterministic
oracle is a **vendored, MM-faithful hand-rolled reader for the pinned IFML-XMI subset** (Theme A's
grammar — `IFMLModel`/`Realizes`/`ViewContainer`/`ViewComponent`/`Event`/`NavigationFlow` + the
fingerprint comment + the `01-event` annotation comments), with the gathered metamodel files
(`IFML-Metamodel.xmi` OMG-normative, `IFML-Metamodel.ecore`, `ifml-moddle.schema.json` MIT) as the
**class/property conformance reference** for every Theme-A element name. The reader is the
**authoritative validator** B2 names (the dialect's own reader), because the probe proved no other
exists. There is **no engine-install path** here (no SCION-style self-install, no `@cucumber/gherkin`
dep): the reader and the flow-walker ship in-repo, so unlike `statecharts`/`gherkin` there is **no
"missing engine ⇒ broken-test" branch** for the 09 oracle itself.

**Why the harness does not use `ifml-moddle` as the oracle (the honest "reuse over invention"
tradeoff).** `ifml-moddle.fromXML` is the only installable IFML reader, but the probe proved it
*warns instead of failing* and consumes a different dialect than the pinned subset — using it would
degrade to a parse-that-never-rejects, the exact vacuous-green doctrine §2 forbids. So the harness
**vendors** a strict reader over the pinned subset (small, closed grammar — six element names + a fixed
attribute set) rather than wrap a lenient one, and keeps the moddle JSON schema as the *type-name
conformance reference* the reader's closed lexicons are checked against by construction.

**Determinism note from the probe (load-bearing).** The flow-walk's only would-be judgement variables
are (a) **which navigation path realizes the nominal leaf sequence** when several exist, and (b) the
**KLM M-count/placement** in event costs. Both are **pinned**: the walk is a **BFS shortest hop-count
path** that must visit the leaf-mapped events **in nominal order**, with **document order** breaking any
remaining ambiguity (§3.3); and the catalog pins the inherited 08 **M-placement convention** (exactly
one leading `M` per interaction/user Event, zero on system) plus the **`NAV_HOP_COST = BB = 1 token`**
convention (the 08-owned operator-TOKEN budget unit, where a full click `BB` is one token). With all
three pinned, `flow_cost` is a **pure function of the model + its 08 nominal path**
— the walker computes a single deterministic integer, asserted directly (§8).

## 1 — Tooling record (B2; oracle choice + self-contained, zero-dependency)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `task-models`/`statecharts`/`gherkin`/`glossary` harnesses (suite uniformity); probe ran on v24.13.0. |
| Entry points | `scripts/harness.mjs` (the oracle; the 6-or-7-arg invocation above), `scripts/selftest.mjs` (runs the harness over every shipped fixture set and asserts the expected status + failing-check + upstream-route + the 05-present/absent authority records). |
| **IFML-XMI-subset reader (the authoritative validator)** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/xml.mjs`. The probe (§0) proved no scriptable IFML validator exists and the one installable reader (`ifml-moddle.fromXML`) parses leniently on a different dialect — so the harness **vendors a strict reader** over the pinned IFML-XMI subset (Theme A): the six element names (`IFMLModel`/`Realizes`/`ViewContainer`/`ViewComponent`/`Event`/`NavigationFlow`), the fixed attribute sets, the leading `<!-- fingerprints: … -->` comment, and the `<!-- 01-event: … -->` annotation comments (a generic DOM parser drops these). It produces the typed `ParseError` that triggers `malformed`. Element/property names are checked against the **closed MM lexicon** (`scripts/lib/lexicon.mjs`), itself derived from `ifml-moddle.schema.json` + `IFML-Metamodel.xmi` so reader and metamodel agree by construction. |
| **Flow-walker (the oracle)** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/graph.mjs`. Builds the `NavigationFlow` directed graph (Event→Container edges via `from`/`to`), runs **BFS** from the `home` container, and — per realized 08 model — verifies the nominal-path leaf-mapped Events are reachable **in order** (B-d), computes the KLM **flow cost** (C-a, warn-only), and counts the **screens visited** against the bloat floor (C-d, blocking). The strongest realizable oracle here: there is no IFML execution engine, so the harness *walks the graph* and *re-derives the cost* rather than trusting a declared number. |
| **CTT nominal-path walker (08 reader)** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/taskmodel.mjs`. **COPIED from the `08` task-models harness `walker.mjs` PATTERN** (the nominal-path descent: enabling/concurrent → all children in order; `choice` → first document-order child; `disabling`/`suspendResume` → left; skip `optional`; `iterative` once), narrowed to the **nominal-path leaf list + leaf id/category + the per-model `Budget.klm`** 09 consumes. **Copied, never imported** (isolation directive). 09 does NOT re-certify 08's own tag/operator/KLM seams — that is the `08` harness's single-owned job (§9); it re-walks only to obtain the *ordered nominal leaf sequence* and the *budget integer* against which the flow is measured. |
| **DBML reader (04-erd.dbml)** | **Constrained hand-rolled reader**, dependency-free, vendored in `scripts/lib/dbml.mjs`. Reads **only** the emitted 04 shape 09 needs: `Table <name> { … }` names (snake_case singular) + the **status column** per table (the `<col> <enum>` line whose enum type is in the status-enum family — the REAL emitted **snake_case `<name>_status`** convention, e.g. `order_status`/`event_status`, OR the PascalCase `<Name>Status` form, matched case/style-insensitively on the `status` suffix). **NO `@dbml/core` dependency** — justified below. |
| **Markdown / SCXML readers** | Hand-rolled, dependency-free, vendored: `scripts/lib/md.mjs` (the `02`/`04-transitions.md`/`07` shape-reader — `### <Name>Status` value tables + `## Forbidden Synonyms` `Forbidden term\|Canonical term\|Reason`; `### <table>` `From\|Event\|To` + `∅` rows; `### <PersonaName>` blocks) **copied** from the sibling skills; `scripts/lib/scxml.mjs` (the optional 05 reader — `state` ids, `<!-- 01-event: … -->` annotations, the `<!-- supersedes: 04-transitions.md#<table> -->` target) **copied** from the `statecharts`/`gherkin` PATTERN, used **only when `--upstream-05` is present**, shape-read never simulated. |
| External deps | **None.** Self-contained; `selftest.mjs` requires no `npm install`. The probe proved there is no IFML engine to install, so the reader + flow-walker + CTT walker all ship in-repo. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Closed lexicons | `scripts/lib/lexicon.mjs` — the **pinned closed sets**: the six element names, the `ViewComponent type` set `{list,details,form}`, the `Event type` set `{submit,select,navigate}`, the **KLM alphabet** `{K,P,H,B,BB,M,W}` + the `nK` multiplier form, **`NAV_HOP_COST = BB = 1 token`** (the 08-owned operator-TOKEN budget unit, byte-faithful to the 08 lexicon: `BB` is one token), the **snake_case validator** `^[a-z][a-z0-9_]*$`, the **klm tokenizer** (greedy: `BB` before `B`; integer multiplier only before `K`), and the **MM type→class map** (Theme-A table, from `ifml-moddle.schema.json`). Closed and vendored; extended only by a committed edit, never ad hoc at runtime. |

**Rationale for the flow-walk oracle over a parse-only harness.** An IFML model's load-bearing claims
are *navigational* and *budgetary*: that the realized 08 nominal path is **walkable** from home (B-d)
and that the flow is **not bloated** — screens visited ≤ the 08 nominal leaf count + 3 (C-d), with the
flow cost vs the 08 budget surfaced as the advisory arm (C-a). Neither is a shape fact a reader surfaces —
both require *walking the NavigationFlow graph* and *summing KLM over the leaf-mapped events on the
path*. Doctrine B3 names the strongest oracle ("run on a real engine"); the probe proved no IFML
engine is pinnable, so the harness **vendors a flow-walker** and **walks** every realized model's
nominal path (reachability-from-home, in-order event realization, and — the heart — the **re-computed
flow cost** compared to the declared 08 budget), rather than re-deriving the cost by an inline formula
that could diverge from the leaf sequence the 08 walk actually produces. A parse-only harness would
leave 09's two most important claims (walkability + budget conformance) unverified. The reader (§2) only
inspects dialect shape + the cross-artifact seams the walk does not surface.

**Justification for NO `@dbml/core` dependency (single-ownership tooling note).** The `gherkin`/`erd`
harnesses parse `04-erd.dbml` with `@dbml/core` because *they* must validate the DBML's full
correctness (enum membership, FK integrity, parse-validity gating). **09 does not** — the `erd` harness
**single-owns** full DBML parsing and schema validity (§9). 09 consumes a **narrow slice**: the set of
**table names** (for binding resolution, A-i/E-d) and the **status column per table** (to classify an
entity as lifecycle-bearing, Theme D). A **constrained hand-rolled reader** over the emitted 04 shape
(`Table <name> { <col> <type> [settings] }`, with the status column recognized by its status-enum
type — the REAL snake_case `<name>_status` family, or the PascalCase `<Name>Status` form, matched
case/style-insensitively) reads exactly that slice deterministically and keeps the harness **zero-dependency and
self-contained** (the suite house style — every sibling's readers are hand-rolled), with **no
`npm install` and no "missing dep ⇒ broken-test" branch** to drag in. Pulling in `@dbml/core` here
would (a) re-verify DBML validity the `erd` harness already owns (double-ownership), and (b) break the
zero-dep self-containment the isolation directive requires. The hand-rolled slice-reader is the right
tool; full DBML semantics are not 09's job. A `04-erd.dbml` that does not yield the table+status slice
(unreadable shape) routes to `broken-test` (§9), never a silent skip.

**Reuse note (doctrine "reuse over invention: copied, never referenced").** The
`task-models`/`statecharts`/`gherkin`/`glossary` skills already ship hand-rolled `md.mjs`/`scxml.mjs`
readers, a `checks.mjs` grammar, and (in `08`) the **CTT nominal-path walker**. This skill **copies**
the `md.mjs` (02/04-transitions/07 slices), the `scxml.mjs` (optional-05 PATTERN), the `08` CTT walker
(narrowed to the nominal-leaf-list + budget slice), and the `checks.mjs` scaffold, then adds the
09-specific layers new to this skill: the hand-rolled **IFML-XMI-subset reader**, the constrained
**DBML slice-reader**, and the **NavigationFlow flow-walker** (no sibling has an IFML reader or a
graph flow-walk — uniquely, no external IFML engine exists to reuse, so the reader+walker are honestly
vendored). Copied, never cross-referenced — each skill stays self-contained and portable.

## 2 — Mechanical (no-walk) checks — structural; Theme A/B/D/E shape rules

Parse/lint/structure checks run first. Each `.xml` is read by the hand-rolled `xml.mjs`; `02`/
`04-transitions.md`/`07` by `md.mjs`; `04-erd.dbml` by `dbml.mjs`; each `05/*.scxml` (when present) by
`scxml.mjs`; each `08/*.xml` by `ctt.mjs`. Mechanical IDs are `M-*`. A **parse failure** (the reader
throws a typed `ParseError`) or a ❌ that prevents anchoring a model yields `malformed`; a ❌ over an
anchored model yields `fail`; ⚠️/ℹ️ are warn-only. **All checks here are no-walk** — they inspect IFML
shape + cross-artifact resolution the flow-walker does not surface.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| M-DECL | **XML declaration.** Each `.xml`'s first line is exactly `<?xml version="1.0" encoding="UTF-8"?>`; the reader accepts the document (a throw is a typed `ParseError`). | A-a | `malformed` |
| M-FP | **Fingerprint block present & complete.** Leading `<!-- fingerprints: … -->` comment present; carries one `sha256:<64-hex>` line (digest = exactly 64 chars `[0-9a-fA-F]`) per consumed input: `02-glossary.md`, `04-erd.dbml`, `04-transitions.md`, **each consumed 05 `.scxml`** (when 05 present), `07-personas.md`, **each consumed 08 file**; no placeholder (`0000…`/`xxxx…`/`<hex>`). | A-b | `fail` |
| M-ROOT | **Root is a persona-bound `IFMLModel`.** Root element is `<IFMLModel>`; `id` == `snake(persona)` == the filename stem; `persona` == an exact PascalCase `### <PersonaName>` heading in 07. | A-c | `fail` |
| M-REALIZES | **≥1 `<Realizes>` and each resolves to an 08 model of THIS persona.** ≥1 `<Realizes taskModel="…"/>`; each `taskModel` stem matches a `specs/08-task-models/<stem>.xml` AND that file's name begins with this model's `snake(persona)-` prefix. | A-d, A-e | `fail` |
| M-CID | **`ViewContainer` ids unique + snake_case.** No two `<ViewContainer>` share an `id`; every id matches `^[a-z][a-z0-9_]*$`. (These ids are 10's frozen walk vocabulary.) | A-f | `fail` |
| M-CTYPE | **Every `ViewComponent` `type` ∈ {`list`,`details`,`form`}.** | A-g | `fail` |
| M-ETYPE | **Every `Event` `type` ∈ {`submit`,`select`,`navigate`}.** | A-h | `fail` |
| M-BIND | **Every `ViewComponent binding` resolves to a 04 table.** `binding=` is a snake_case singular table name declared in `04-erd.dbml` (via the DBML slice-reader). | A-i, E-d | `fail` |
| M-NAVEND | **Every `NavigationFlow` endpoint resolves.** `from` is the `id` of some declared `<Event>`; `to` is the `id` of some declared `<ViewContainer>`. | A-j | `fail` |
| M-ANNOT | **Domain-affecting events carry an `01-event` annotation.** A `submit` Event whose container's component is bound to a lifecycle entity has a `<!-- 01-event: <exact string> -->` child. (Membership of the string in the authority is Theme D / R-AUTH below.) | A-k | `fail` |
| M-HOME | **Exactly one home container.** `count(<ViewContainer home="true">) === 1`. | A-l | `fail` |
| M-TASKREF | **Every `Event task=` resolves to a real 08 leaf.** Each `task=` value is a leaf-task id in some realized 08 model (via the CTT reader). | B-c | `fail` |
| M-KLM | **Every nominal-path Event carries a well-formed `klm`.** A leaf-mapped Event on a nominal path has `klm=`; tokenized greedily (`BB` before `B`; `nK` multiplier only before `K`), every token ∈ {`K`,`P`,`H`,`B`,`BB`,`M`,`W`}; an interaction/user Event's `klm` **begins with exactly one `M`** and carries no other `M`; a system-mapped Event carries **no `M`**. | C-b | `fail` |
| M-SNAKE | **All ids snake_case.** Every `id` (container, component, event) matches `^[a-z][a-z0-9_]*$`. | E-a | `fail` |
| M-FORBID | **No forbidden synonyms in ids/names/annotations.** No 02 `Forbidden term` appears in an `id`, `name`, or annotation **outside a mandated verbatim string** (an exact `01-event:` annotation, an exact 04 `binding` table name, or the exact 07 `persona` value — the **erd-L12 verbatim exemption**, those spans masked before scanning). | E-b, E-c | `fail` |
| M-BACKOUT | **User control — non-home container has an exit.** A non-home `<ViewContainer>` has ≥1 outgoing `NavigationFlow` (some Event in it whose flow leaves). | F-b | warn-only (⚠️) |
| M-CONSIST | **Consistent realization.** The same `01-event` / same 08 leaf realized by different `type`s across containers without cause. | F-e | warn-only (⚠️) |

M-KLM is the **mechanical precondition for the budget walk**: the flow-walker (§3.3) counts `klm`
tokens on the nominal-path events, so an illegal `klm` string must be caught *before* the walk, or the
flow cost is meaningless. M-FORBID/M-BIND are the **language/ownership** lints over an already-anchored
model. The forbidden-synonym list, the 04 table+status set, the 04-transition events, the 05
transition set (when present), and the 07 persona set are all **read fresh per run** from the parsed
upstreams (upstream-owned data, never vendored constants).

## 3 — Closed fixture / scenario format (B3)

The scenario has **two halves**, because the artifact has two oracles:

1. **Flow-walk runs** (§3.3) — the strongest oracle. Per realized 08 model: the CTT nominal path is
   re-walked, each interaction/user leaf resolved to its mapped Event(s), a navigation path from home
   realizing the leaf sequence is BFS-searched (W-REALIZE), the home is verified unique+reachable
   (W-HOME), the KLM flow cost is re-computed and compared to the 08 budget (W-COST — ⚠️ warn-only:
   the budget is 08's own declared ceiling), and the screens visited on the realizing walk are
   compared to the 08 nominal leaf count + 3 (W-BLOAT — ❌ the blocking flow-bloat floor).
2. **Mechanical scenarios** (§3.1–§3.2) — a walk over 09's own IFML claims (the hand-rolled model + the
   dialect lints) resolved against the parsed 02/04/05?/07/08 upstreams.

No external scenario data is injected into a *target* run; the upstreams + the 09 directory supply
every element. The shipped fixtures (§3.4) are **whole canned upstream sets + 09 directories** used
only by `selftest.mjs`.

### 3.1 Derived scenario graph (built fresh per run — §8)

From each parsed **09 `.xml`** (hand-rolled `xml.mjs`) the harness derives:
`model = {file, persona, id, fingerprints{}, realizes[] (08 stems), containers[] ({id, name, home,
components[] ({id, type, binding}), events[] ({id, type, task?, klm?, annotation?})}), flows[]
({from, to}), events[] (flat), homeContainer}`.

From parsed **07**: `personas07[]` (each `### <PersonaName>` → `{persona, slug=snake(persona)}`) — the
bijection target.
From parsed **08** (`ctt.mjs`): per realized model `taskModel08 = {stem, persona, budget,
nominalLeaves[] ({id, category}), allLeafIds[]}` (the nominal-path leaf list + the per-model
`Budget.klm`).
From **04** (`dbml.mjs`): `tables04[]` (names) + `statusTables04` (table → status enum). From
**04-transitions.md** (`md.mjs`): per entity `transitionTable = {entity, rows[] ({from, event01, to})}`
+ the `∅` row. From **02**: `enums02[]` (`### <Name>Status` values), `forbidden02[]`
(`Forbidden\|Canonical\|Reason`). From **05** (when present, `scxml.mjs`): per promoted entity
`scxmlGraph = {entity, transitions[] ({from, event01, to})}` (read from `state` ids +
`<!-- 01-event: … -->` annotations) + the **promoted-entity set** + each `supersedes` target.

**Authority selection (the binding lifecycle rule, copied from gherkin §3.5):** for each lifecycle
entity (a 04 table with a status column), `authority(entity) = scxmlGraph(entity)` **iff**
`--upstream-05` present AND `entity ∈ promoted set`; **else** `transitionTable(entity)`. The legal
01-event vocabulary for that entity is computed **from the authority**, not from 04 when 05 supersedes.

Closed traversal set (every relationship 09 claims becomes a walked edge):

1. **File↔07 bijection edge** — `{09 files (by slug)}` **==** `{07 personas (by slug)}` (both
   directions: a file with no 07 persona, OR a 07 persona with no file) (A-c persona arm; M-BIJ).
2. **Realizes→08 edge** — each `<Realizes>` stem resolves to an 08 file whose name carries this
   persona's prefix (A-e; R-REALIZE).
3. **Binding→04 edge** — each component `binding` ∈ `tables04` (A-i/E-d; R-BIND).
4. **Task-ref→08-leaf edge** — each Event `task=` ∈ some realized model's `allLeafIds` (B-c; R-TASK).
5. **Leaf→Event realization edge** — each interaction/user leaf of each realized 08 model maps to ≥1
   Event carrying `task=<leaf id>` (B-a; X-COV-LEAF).
6. **01-event→authority edge** — each `submit` Event on a lifecycle-bound container has an `01-event`
   annotation present in the entity's **authority** (05-if-promoted-else-04) (A-k/D-a/D-b; R-AUTH).
7. **NavigationFlow endpoint edges** — `from`∈Events, `to`∈Containers (A-j; tree/graph backbone).
8. **Walk edges** — per realized 08 model: home uniqueness+reachability (W-HOME), nominal-path
   realizability from home (W-REALIZE), flow-cost vs budget (W-COST, warn-only), screens visited ≤
   nominal leaf count + 3 (W-BLOAT, blocking).
9. **Language edges** — snake_case ids, no forbidden synonyms (verbatim-exempt), no invented bindings
   (E-a/E-b/E-c/E-d).

Every edge class is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Cross-artifact resolution (mechanical, no walk)

Edges 1–7, 9 are pure bijection / resolution / exact-value / DRY checks over the parsed IFML models +
the upstream models. Byte-deterministic, no walk. The pinned mappings (slug = `snake(persona)`; binding
= snake_case 04 table; task = 08 leaf id; 01-event = exact authority string; authority =
05-if-promoted-else-04) are the catalog's pinned conventions, copied into `scripts/lib/lexicon.mjs` so
the harness and the catalog agree by construction.

### 3.3 Flow-walk runs — the strongest-oracle design (B3, this skill's load-bearing layer)

After mechanical parse (M-DECL) and dialect-legality (M-CID…M-KLM), the harness **walks** each realized
08 model's nominal path over the 09 NavigationFlow graph. **No walker-generated value is ever asserted
blindly** (§8): the walk is *deterministic* (fixed CTT nominal-path rule + fixed BFS-shortest /
document-order tie-break + fixed KLM tokenizer + `NAV_HOP_COST = BB`), so the asserted positions — the
realizing path, the home-reachable set, and the **flow-cost integer** — are fixed for a given model.

**Walk inputs (per realized 08 model M).**
1. **`ctt.mjs`** re-walks M (copied 08 nominal-path rule) → `nominalLeaves` (ordered) + `budget`.
2. For each interaction/user leaf in `nominalLeaves`, resolve its **mapped Event(s)** in the 09 model
   (the Events whose `task=` equals the leaf id). System leaves impose no Event obligation (catalog
   B-b ℹ️) and are skipped in the realization sequence.
3. Build the **NavigationFlow graph**: nodes = containers; a directed edge `c1 → c2` exists for each
   Event `e` declared in `c1` with a `NavigationFlow from="e" to="c2"`. The **home** container is the
   `home="true"` one.

| ID | Step | Assertion | Catalog rule |
|----|------|-----------|--------------|
| W-HOME | locate `home="true"` and BFS the container graph from it | **exactly one** home container AND **every** container is reachable from home (no island). Zero/two homes is the M-HOME ❌ precondition; an unreachable container is the W-HOME ❌ (per catalog A-l ❌ for count; reachability is the ⚠️/❌ reach arm — here ❌ when a *realized* container is stranded, ⚠️ when a non-realized decorative container is unreached). | A-l |
| W-REALIZE | BFS the NavigationFlow graph from home, finding a path that visits the mapped Events of the ordered interaction/user leaf sequence **in order** | a path exists realizing the nominal leaf order from home (a required hop is never missing). **Pinned search:** BFS shortest hop-count path visiting the mapped events in sequence; remaining ambiguity broken by **document order** of events/flows. | B-d |
| W-COST | over the realizing path, sum `flow_cost = Σ count(event.klm)` over the nominal leaf-mapped Events **+ `BB`×(hops−1)** (first/home container free) | `flow_cost(M)` vs `M.budget` (the 08 `Budget.klm`) — **⚠️ warn-only**: the budget is the 08 model's own declared ceiling (W-BUDGET in 08 guards its honesty); an overage is surfaced for agent review with **both** values + the contributing event list + hop count, never a gate failure. | C-a |
| W-BLOAT | over the realizing walk, count screens visited = the home container + one per hop (revisits counted) | `screens(M) ≤ M.nominalLeafCount + 3` — **❌ blocking**: the ceiling is external to 09 (the job's own step count); a flow dragging the user through more screens than the job has steps (+3 slack) fails simulation. Both values reported. | C-d |

**(a) The realizability walk (W-REALIZE).** The 09 model *claims* that its screens realize the 08 task
flow. The harness proves this by **walking**: starting at home, it BFS-searches the NavigationFlow graph
for the shortest-hop path that fires the mapped events of the ordered interaction/user leaves **in their
nominal order**. If no such path exists (a hop is missing, an event is unreachable from home, the order
cannot be honored), W-REALIZE is the B-d failure — reported with the leaf sequence, the mapped events,
and the point at which the walk stranded. **Pinned determinism:** shortest hop-count first; ties broken
by the document order of the candidate events/flows, so the same model yields the same realizing path
every run (§8).

**(b) The budget verification (W-COST, ⚠️ warn-only) — the re-walked exact-value design.** The flow
cost is the artifact's most informative numeric claim, so it is verified by **walking the realizing
path and re-summing, not by an inline re-derivation**. The comparison is **advisory**: the 08
`Budget.klm` is the 08 model's own declared ceiling — a number derived from its own decomposition,
measuring nothing external — and 08's W-BUDGET already blocks on declaration honesty, so a 09 overage
is surfaced for agent judgment rather than failing the gate:

1. The walker takes the **realizing path** from W-REALIZE: an ordered list of nominal leaf-mapped
   Events + the container `hops` traversed.
2. For each nominal leaf-mapped Event, the walker **tokenizes** its `klm` string (the same greedy
   tokenizer M-KLM validated: `BB` → 1 token, `4K` → 4 `K`-tokens, each of `K`/`P`/`H`/`B`/`M`/`W`
   → 1) and counts the operator TOKENS (the 08-owned budget unit; byte-faithful to the 08 lexicon).
3. It adds **`NAV_HOP_COST × (hops − 1)`** = `1 × (hops − 1)` (the first/home container is free; each
   subsequent hop is one button **click** = the single `BB` operator = `1 token`, per the catalog's
   Card/Moran/Newell click=`BB` convention measured in the 08 operator-token unit).
4. `computedCost := Σ event-tokens + 1×(hops−1)`. **Compare `computedCost` to `M.budget`** (the 08
   `Budget.klm`). An over-budget flow is the `W-COST` **warning** (C-a, ⚠️) — reported with **both**
   the computed cost and the declared budget + the contributing event/hop list, so the author sees
   exactly what the walk counted. (09 never edits 08; an over-budget flow is improved by re-modeling
   09. It never blocks the gate.)

**(b2) The flow-bloat floor (W-BLOAT, ❌ blocking) — the gate the ceiling was really for.** Over the
same realizing walk, the walker counts **screens visited** = the home container + one per hop
(revisits counted — every hop drags the user through a screen). **Assert
`screens ≤ M.nominalLeafCount + 3`** (the realized 08 model's nominal-path leaf count, +3 slack for
home/landing). The ceiling is **external to 09** — the job's own step count — so unlike the 08-declared
budget it measures something the 09 author does not control. A flow that needs more screens than the
job has steps is bloated: that is the `W-BLOAT` failure (C-d), reported with both values + the hop
count. Fixed by collapsing pass-through containers or adding the missing direct `NavigationFlow`.

Because the nominal-path rule, the M-placement, the tokenizer, and `NAV_HOP_COST` are all **pinned and
deterministic**, `computedCost` is a pure function of the model + its 08 nominal path — the same model
yields the same integer every run (§8). The walker is the authority: the harness never trusts a
hand-computed cost, it **re-walks** and compares.

**(c) No negative walk on the graph itself.** The flow-walker has no event-input to "fire wrongly" — the
negatives here are the **illegal fixtures** (§3.4), each a 09 model with one injected defect the walker
or a mechanical check must reject for the stated reason (the `flow-bloat` fixture is the W-BLOAT
negative; `over-budget` is the W-COST **warn** witness — it passes the gate with the warning recorded;
`unrealized-leaf`/`dangling-navflow` are the W-REALIZE negatives; `no-home`/`dup-home` the
home negatives).

### 3.4 Shipped fixtures (`scripts/fixtures/`)

One shared deterministic **mini upstream set**, plus an **optional 05 dir** so both authority paths are
exercised:
- **`upstream-02.md`** — `### OrderStatus` value table (e.g. `placed, picking, shipped, delivered,
  cancelled`) with `Derived from event` cells quoting the exact 01 strings; a `## Forbidden Synonyms`
  table (e.g. `purchase`→`Order`, `voucher`→`Coupon`). Static.
- **`upstream-04.dbml`** + **`upstream-04-transitions.md`** — `Table order { … status order_status }`
  and an unpromoted `Table coupon { … status coupon_status }` in the REAL emitted **snake_case
  `<name>_status`** enum convention (the fixture mirrors the real lifecycle contract, so Theme D's
  lifecycle detection is exercised against the convention 04 actually ships); transition tables `### order`
  (`From|Event|To`, incl. one edge **beyond** 04 to exercise 05-supersedes when 05 is passed) and
  `### coupon`, each with a `∅` row. Static; mutually consistent.
- **`upstream-05/`** — `order.scxml` (the **promoted** entity; states + `<!-- 01-event: … -->`
  annotations incl. the beyond-04 transition + a `<!-- supersedes: 04-transitions.md#order -->`), so
  when `--upstream-05` is passed `order`'s lifecycle Events are judged against the **scxml graph**.
  `coupon` has no 05 file (always judged against 04).
- **`upstream-07.md`** — **2 personas** (`### Dispatcher`, `### Picker`) so the bijection runs both
  ways. PascalCase names. Static.
- **`upstream-08/`** — **3 task models** (valid per the `08` dialect, each fingerprint-clean):
  `dispatcher-fulfil_order.xml`, `dispatcher-cancel_order.xml`, `picker-pick_order.xml`, each with a
  `<Budget klm="…"/>` equal to its nominal-path sum and a tree whose nominal leaves the 09 flow must
  realize. Static; no clock/random.

Plus a **`valid-09/`** directory (a correct model per 07 persona — two files: `dispatcher.xml`
realizing the two dispatcher 08 models, `picker.xml` realizing the picker model; each fingerprinting
its consumed inputs (incl. `05-statecharts/order.scxml` only because `dispatcher` consumes the promoted
`order` lifecycle); each with a home container, navigable nominal paths, and a flow cost ≤ each realized
budget), the illegal 09 fixtures, and the broken-upstream fixtures. **Negative fixtures ship as
directory-form sets** (each a copy of `valid-09/` with exactly one injected defect in one model file;
the `.xml` filenames below name the *mutated model file*). Each illegal fixture carries **exactly one**
deliberate defect so its negative fires **for the stated reason** (a fixture failing for any other
reason is itself `broken-test`). The expected `(status, failingCheck, upstreamRoute?, authorityRecord)`
is recorded in `scripts/fixtures/manifest.json`.

**Two run modes** of `valid-09/` are asserted by selftest: **with `--upstream-05`** (`dispatcher`'s
`order` events judged against the scxml graph, incl. the beyond-04 transition) → `pass`; and a parallel
**`valid-09-no05/`** (no `order.scxml` consumed, no 05 fingerprint, `order` judged against 04 alone) run
**without** `--upstream-05` → `pass`.

| Fixture (09) | Run flag | Injected defect | Must fail | Expected status | Theme |
|--------------|----------|-----------------|-----------|-----------------|-------|
| `valid-09/` | `--upstream-05` | none — two correct models (dispatcher via 05, picker via 04) | nothing | `pass` | — |
| `valid-09-no05/` | (no 05) | none — dispatcher judged vs 04, no 05 fingerprint | nothing | `pass` | — |
| `malformed-xml.xml` | either | unclosed `<ViewContainer>` / bad declaration (reader throws) | M-DECL | `malformed` | A (structure) |
| `missing-fingerprint.xml` | either | leading `<!-- fingerprints: … -->` block absent | M-FP (A-b) | `fail` | A |
| `missing-realizes.xml` | either | zero `<Realizes>` children of the root | M-REALIZES (A-d) | `fail` | A |
| `bad-component-type.xml` | either | a `ViewComponent type="grid"` (∉ {list,details,form}) | M-CTYPE (A-g) | `fail` | A |
| `bad-event-type.xml` | either | an `Event type="hover"` (∉ {submit,select,navigate}) | M-ETYPE (A-h) | `fail` | A |
| `bad-klm-token.xml` | either | a nominal-path Event `klm="MXP"` (`X` off-alphabet) | M-KLM (C-b) | `fail` | C |
| `dup-home.xml` | either | two `<ViewContainer home="true">` | M-HOME (A-l) | `fail` | A |
| `no-home.xml` | either | zero `home="true"` containers | M-HOME (A-l) | `fail` | A |
| `ghost-binding.xml` | either | a `binding="invoice"` (no such 04 table) | M-BIND (A-i/E-d) | `fail` | A/E (realization) |
| `ghost-task-ref.xml` | either | an Event `task="t_nonexistent"` (no such 08 leaf) | M-TASKREF (B-c) | `fail` | B |
| `dangling-navflow.xml` | either | a `NavigationFlow to="missing_container"` (endpoint unresolved) | M-NAVEND (A-j) | `fail` | A |
| `unrealized-leaf/` | either | an interaction 08 leaf with NO mapped Event → nominal path not walkable | **X-COV-LEAF / W-REALIZE** (B-a/B-d) | `fail` | B (realization) |
| `over-budget.xml` | either | extra keystrokes push `flow_cost` > the 08 `Budget.klm` | nothing blocking — **W-COST** (C-a) records a ⚠️ warn [both values reported] | `pass` (with warn) | C (budget) |
| `flow-bloat/` | either | a chain of gratuitous pass-through containers pushes screens visited > nominal leaf count + 3 | **W-BLOAT** (C-d) [both values reported] | `fail` | C (budget) |
| `ghost-01-event.xml` | either | a `submit` Event's `01-event` annotation absent from the entity authority | R-AUTH (D-a) | `fail` | D (lifecycle) |
| `wrong-authority-event.xml` | `--upstream-05` | a `01-event` valid in the superseded **04** rows but `order` is promoted and the string is NOT in 05 | R-AUTH (D-b promotion precedence) | `fail` | D |
| `realizes-other-persona.xml` | either | `dispatcher.xml` `<Realizes taskModel="picker-pick_order"/>` (08 of another persona) | M-REALIZES (A-e) | `fail` | A/B |
| `missing-persona-model/` | either | a 07 persona (`picker`) with no `.xml` file | M-BIJ (A-c) | `fail` | A |
| `extra-model/` | either | a `.xml` for a persona not in 07 | M-BIJ (A-c) | `fail` | A |
| `forbidden-synonym-id.xml` | either | a container `id="purchase_queue"` (forbidden `purchase` in free id) | M-FORBID (E-b) | `fail` | E (language) |
| `non-snake-id.xml` | either | a `ViewContainer id="OrderQueue"` (not snake_case) | M-SNAKE/M-CID (E-a/A-f) | `fail` | E/A |
| `05-claimed-but-absent/` | **(no 05)** | a model fingerprints `05-statecharts/order.scxml` while `--upstream-05` is absent | N-05ABSENT (binding rule) | `fail` | D |
| `wrong-reason-trap.xml` | either | **two** defects — a bloated flow (C-d) AND a ghost binding (A-i) — proves the negative reports **W-BLOAT**, not M-BIND | W-BLOAT isolates over M-BIND | `fail` (reason = W-BLOAT) | C |
| `vacuous/` | `--no-checks` | structurally valid 09 but harness fed the disabled path | n/a | `broken-test` (zero checks) | — |
| `budget-broken-08/` | `--upstream-05` | a **realized 08 model whose declared `Budget.klm` ≠ its own recomputed nominal cost** (broken ruler) | upstream pre-check | `fail` (class=`upstream-defect`→the named 08 file) | §9 |
| `stuck-08/` | `--upstream-05` | a **realized 08 model that parses but whose nominal-path walker gets stuck** (an internal node — e.g. a `choice` whose only child is `optional` — selects an empty contributing set; nominal path underivable) | walker pre-check (W-REALIZE) | `fail` (class=`upstream-defect`→the named 08 file) | §9 |
| `valid-09/` | `malformed-upstream-07` | 07 drops the `### <PersonaName>` blocks (bijection unanchorable) | n/a | `broken-test` | §9 |
| `valid-09/` | `malformed-upstream-04` | `04-erd.dbml` not yielding the table+status slice (bindings unanchorable) | n/a | `broken-test` | §9 |
| `valid-09/` | `malformed-upstream-02` | 02 drops `## Forbidden Synonyms` (scan list unbuildable) | n/a | `broken-test` | §9 |
| `valid-09/` | `malformed-upstream-08` | a realized 08 `.xml` not well-formed (nominal path / budget unreadable) | n/a | `broken-test` | §9 |
| `valid-09/` | `malformed-upstream-05` | a supplied `05/order.scxml` not well-formed XML (authority unreadable) | n/a | `broken-test` | §9 |

`wrong-reason-trap.xml` is the explicit doctrine §2 guard: it would "pass for the wrong reason" under a
sloppy negative. The selftest asserts the failing-check ID equals `W-BLOAT`, not merely that *some*
check failed. `05-claimed-but-absent/` is the binding lifecycle-authority negative. `budget-broken-08/`
is the §9 upstream-defect route (a realized 08 whose own budget is wrong — 09 cannot be measured
against a broken ruler); the last five rows route to `broken-test` (an unparseable upstream).

### 3.5 The 05-authority logic (the binding lifecycle rule — copied PATTERN from gherkin §3.5)

This skill's lifecycle authority **switches by an optional input**, exactly as `gherkin` does. The
catalog's Theme D "05-if-promoted-else-04" is mechanized as:

1. **When `--upstream-05` is present:** the harness reads each `<entity>.scxml` with the copied
   `scxml.mjs` reader → `scxmlGraph(entity)` (`state` ids + `<!-- 01-event: … -->` annotations). For
   every **promoted** entity (a 04 status-bearing entity with a `.scxml`),
   `authority(entity) = scxmlGraph(entity)` — including transitions **beyond** the 04 table. A `submit`
   Event's `01-event` annotation on a container bound to that entity must be in the scxml graph's event
   set (R-AUTH / D-a); validating it against the *superseded* 04 rows is the D-b promotion-precedence
   failure (`wrong-authority-event.xml`). The 05 authority vocabulary for an entity is **all
   transition `01-event` annotations PLUS the initial-entry annotation** (the `<!-- 01-event: … -->`
   on/immediately preceding the machine's initial state — the creation event), exactly mirroring the
   04 table's `∅` (creation) row, so a creation screen for a promoted entity is judged identically to
   one for an unpromoted entity. Unpromoted entities (no `.scxml`) are judged against **04 rows**.
2. **When `--upstream-05` is absent:** `authority(entity) = transitionTable(entity)` for **every**
   entity — lifecycle Events are judged against **04 alone**. The harness additionally asserts **no
   model fingerprints a 05 `.scxml`** (no `05-statecharts/*.scxml` line in any fingerprint block) and
   **no model carries a 05-only lifecycle claim**. A model fingerprinting a 05 file under this mode ⇒
   `fail` (N-05ABSENT) — it cannot *claim* a 05 authority the run cannot verify.

The harness records the chosen authority per entity in the summary
(`authority: {order: "05-scxml", coupon: "04-table"}` or all-`"04-table"` when 05 absent), so the
verdict is transparent about which source each entity's lifecycle Events were judged against. **The 09
harness does not re-certify 05's own internal correctness** (the `statecharts` harness's single-owned
job); it consumes 05's transition set as the authority, routes an *unreadable* 05 to `broken-test`, and
a *well-formed-but-broken-budget* 08 to `upstream-defect`→08 (§9).

### 3.6 Manifest

`scripts/fixtures/manifest.json` records, per fixture,
`{files, runFlag (with05|no05), status, failingCheck, upstreamRoute?, authorityRecord}`. `selftest.mjs`
runs the harness over each entry and asserts the actual tuple equals the manifest — negatives are proven
to fire **for their stated reason**, the 05-present/absent authority records are asserted, and the
coverage floor (§5) is asserted true.

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a check means
editing this section AND `scripts/lib/checks.mjs` in a committed change, and the new check MUST cite a
catalog rule. The harness emits each check's `id`, `class`, `status`, and `rule` in its JSON summary
(§7). **Five** classes — the four B3 classes plus the walker class, the strongest-oracle layer.

### 4.1 Walker checks (`W` — the realized 08 nominal path is WALKED over the 09 NavigationFlow graph)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| W-HOME | exactly one `home="true"` container AND every realized container is reachable from home by BFS. | A-l |
| W-REALIZE | a navigation path from home realizes the ordered interaction/user nominal-leaf sequence's mapped Events in order (BFS shortest, doc-order tie-break). | B-d |
| W-COST | the re-computed `flow_cost` (Σ nominal event-klm TOKEN counts + `BB`×(hops−1), `BB`=1 token, the 08-owned unit) **vs** the realized 08 `Budget.klm`; both values + path reported. **⚠️ warn-only** (the budget is 08's own declared ceiling). | C-a |
| W-BLOAT | screens visited on the realizing walk (home + one per hop, revisits counted) **≤** the realized 08 model's nominal leaf count **+ 3**; both values reported. **❌ blocking.** | C-d |

### 4.2 Resolution checks (`R` — a referenced element exists / maps in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R-REALIZE | each `<Realizes>` stem resolves to an 08 file of THIS persona (name carries the `snake(persona)-` prefix). | A-e |
| R-BIND | each `ViewComponent binding` ∈ the 04 table set. | A-i, E-d |
| R-TASK | each Event `task=` ∈ some realized 08 model's leaf-id set. | B-c |
| R-AUTH | each `submit` Event's `01-event` annotation ∈ its entity's authority (05-if-promoted-else-04); no event validated against a superseded 04 row. | A-k, D-a, D-b |
| R-FP | the leading fingerprint block names every consumed input (02/04×2/07/each 08/each consumed 05 when present), each a `sha256:<64-hex>` digest (exactly 64 chars `[0-9a-fA-F]`). | A-b |

### 4.3 Exact-value / bijection checks (`X` — exact counts/values against the derived graph)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| M-BIJ | `{09 file slugs}` **deep-equals** `{07 persona slugs}` (both directions; a missing persona OR an extra file fails, naming the offending side + owner). | A-c |
| M-ATTR | each model's `id` == `snake(persona)` == filename stem AND `persona` == a verbatim 07 `### <PersonaName>`. | A-c |
| X-COV-LEAF | every interaction/user leaf of every realized 08 model has ≥1 mapped Event (`task=<leaf id>`). | B-a |
| X-COST-INT | each realized 08 `Budget.klm` parses as a single non-negative integer (the value the W-COST warning compares against). | C-a basis |
| X-RECON | the executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.4 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

Named negatives proven by the shipped illegal fixtures (§3.4). Each asserts both that the defect is
rejected AND that the failing-check ID matches the defect's owner rule (wrong-reason ⇒ `broken-test`).
N-IDs map 1:1 to the fixture rows; abbreviated:

| ID | Illegal input | For the reason | Owner check | Catalog rule |
|----|---------------|----------------|-------------|--------------|
| N1 | malformed XML | reader reject | M-DECL | A-a |
| N2 | missing fingerprint | block absent/incomplete | M-FP / R-FP | A-b |
| N3 | duplicate home | two `home="true"` | M-HOME | A-l |
| N4 | no home | zero `home="true"` | M-HOME | A-l |
| N5 | ghost binding | binding ∉ 04 tables | M-BIND / R-BIND | A-i/E-d |
| N6 | ghost task-ref | `task=` ∉ 08 leaves | M-TASKREF / R-TASK | B-c |
| N7 | dangling navflow | endpoint unresolved | M-NAVEND | A-j |
| N8 | unrealized leaf | interaction leaf with no mapped Event / unwalkable | **X-COV-LEAF / W-REALIZE** | B-a/B-d |
| N9 | bloated flow | screens visited > nominal leaf count + 3 | **W-BLOAT** | C-d |
| N10 | ghost 01-event | annotation ∉ authority | R-AUTH | D-a |
| N11 | wrong-authority event | 04-row event but entity promoted, not in 05 | R-AUTH | D-b |
| N12 | realizes other persona | 08 stem not this persona's | M-REALIZES / R-REALIZE | A-e |
| N13 | missing persona model | 07 persona with no file | M-BIJ | A-c |
| N14 | extra model | file with no 07 persona | M-BIJ | A-c |
| N15 | forbidden-synonym id | forbidden term in free id | M-FORBID | E-b |
| N16 | non-snake id | id ∉ `^[a-z][a-z0-9_]*$` | M-SNAKE / M-CID | E-a/A-f |
| N-05ABSENT | 05-claimed-but-absent | 05 fingerprint while `--upstream-05` absent | R-FP / R-AUTH | (binding lifecycle rule) |
| N17 | budget-broken-08 | realized 08 budget ≠ its own nominal cost | 08 budget pre-check | §9 → 08 |

### 4.5 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ-STATUS`, `AJ-ERRPREV`, `AJ-LIFEDISP` enumerated in §6. They run last, only over checks that
survived all mechanical + walker gates, and return enumerated verdicts only. **No ❌ catalog rule is
left to agent judgment** — every ❌ has a mechanical or walker owner above; the agent judges only Theme-F
residue at its own (⚠️/ℹ️) severity.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The 09 artifact owns these element sets per model: `models`, `containers`,
`components`, `events`, `flows`, plus the realized-08 `nominalLeaves`/`budgets`. The intake count is:

```
intake = |models| + Σ|model.containers| + Σ|model.components| + Σ|model.events| + Σ|model.flows|
```

The **edge / walk count** the harness must walk (from §3.1 + §3.3):

```
edgesExpected = 1                                   (M-BIJ: file-set ↔ 07 bijection, both ways)
              + |models|                            (M-ATTR: id/persona verbatim-07)
              + Σ|realizes|                          (R-REALIZE: each <Realizes> → 08 of this persona)
              + Σ|components|                        (R-BIND: each binding ∈ 04 tables)
              + Σ|events with task=|                 (R-TASK: each task= ∈ 08 leaves)
              + Σ|interaction/user nominal leaves|   (X-COV-LEAF: each leaf → ≥1 Event)
              + Σ|submit events on lifecycle entity| (R-AUTH: 01-event ∈ authority)
              + Σ|flows|                             (M-NAVEND: endpoints resolve)
              + Σ|models| (R-FP fingerprints)
              + WALK: Σ|realized models| (W-HOME + W-REALIZE + W-COST + W-BLOAT)
```

The **walk count** is reported separately in the summary (`counts.walker`) so the strongest-oracle
layer's coverage is visible: a `pass` with `counts.walker.total === 0` over an artifact that *has*
realized models is itself a `broken-test` (the walker layer was skipped).

**Every owned element exercised ≥1 time.** The harness asserts:
- every `model` is touched by W-HOME + W-REALIZE + W-COST + W-BLOAT (walk), M-ATTR, R-FP (fingerprints);
- every `container` is touched by M-CID (id) + W-HOME (reachability);
- every `component` is touched by M-CTYPE + R-BIND (binding);
- every `event` is touched by M-ETYPE, R-TASK (if `task=`), M-KLM (if nominal-path), R-AUTH (if a
  lifecycle `submit`);
- every `flow` is touched by M-NAVEND (endpoints);
- every realized `budget` is touched by X-COST-INT (shape) + W-COST (the walked comparison, ⚠️);
- every realized model's screen count is touched by W-BLOAT (the walked bloat floor, ❌).

**Reconciliation formula (X-RECON — no silently dropped checks):**

```
executedChecks = mechanicalRun + walkerRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected)
           && (executedChecks > 0)
           && (walkerRun > 0 when realized models > 0)   // strongest oracle never skipped
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠ edgesExpected` ⇒ a
check was silently dropped ⇒ `broken-test`. **If realized models > 0 but the walker layer ran zero
walks ⇒ `broken-test`** (strongest oracle skipped). Like `08`, 09 has **no not-emitted branch**: the
bijection (A-c) requires exactly one file per 07 persona, so an empty `09` dir over a non-empty 07 is a
`fail` (missing models), not a sanctioned absence — a `pass` always has `models > 0` and a non-empty
walker layer.

**Positive AND negative per claimed behavior.** Every behavior 09 claims is proven by **≥1 positive** (a
passing check over `valid-09/` and/or `valid-09-no05/`) AND **≥1 negative** (a shipped illegal fixture
that must fail). Abbreviated mapping (full ❌-reconciliation in the closing table):

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Well-formed dialect XML | A-a | M-DECL over `valid-09/` | `malformed-xml.xml` |
| Fingerprints complete | A-b | M-FP/R-FP over `valid-09/` | `missing-fingerprint.xml` |
| Persona-bound root + bijection | A-c | M-ROOT/M-BIJ/M-ATTR over `valid-09/` | `missing-persona-model/`, `extra-model/` |
| Realizes 08 of this persona | A-e | M-REALIZES/R-REALIZE over `valid-09/` | `realizes-other-persona.xml` |
| Unique snake_case container ids | A-f | M-CID over `valid-09/` | `non-snake-id.xml` |
| Component type valid | A-g | M-CTYPE over `valid-09/` | (in `malformed`/type-trap set) |
| Event type valid | A-h | M-ETYPE over `valid-09/` | (type-trap set) |
| Binding resolves to 04 | A-i/E-d | M-BIND/R-BIND over `valid-09/` | `ghost-binding.xml` |
| NavigationFlow endpoints resolve | A-j | M-NAVEND over `valid-09/` | `dangling-navflow.xml` |
| Domain events annotated | A-k | M-ANNOT/R-AUTH over `valid-09/` | `ghost-01-event.xml` |
| Exactly one home | A-l | M-HOME/W-HOME over `valid-09/` | `dup-home.xml`, `no-home.xml` |
| Every leaf maps to an Event | B-a | X-COV-LEAF over `valid-09/` | `unrealized-leaf/` |
| task= resolves to 08 leaf | B-c | R-TASK over `valid-09/` | `ghost-task-ref.xml` |
| Nominal path walkable from home | B-d | W-REALIZE over `valid-09/` | `unrealized-leaf/` |
| Screens visited ≤ leaf count + 3 | C-d | W-BLOAT over `valid-09/` | `flow-bloat/` |
| Flow cost vs 08 budget (warn) | C-a | W-COST over `valid-09/` | `over-budget.xml` (passes with W-COST warn) |
| KLM well-formed | C-b | M-KLM over `valid-09/` | (bad-klm trap in type set) |
| Lifecycle event ⊆ authority | D-a | R-AUTH over `valid-09/` | `ghost-01-event.xml` |
| Promotion precedence (05>04) | D-b | R-AUTH over `valid-09/` (05 mode) | `wrong-authority-event.xml` |
| 05-if-promoted-else-04 | binding | both run modes pass | `05-claimed-but-absent/` |
| snake_case ids | E-a | M-SNAKE over `valid-09/` | `non-snake-id.xml` |
| No forbidden synonyms | E-b | M-FORBID over `valid-09/` | `forbidden-synonym-id.xml` |
| Verbatim exemption | E-c | M-FORBID exempts 01-event/binding/persona spans | (exemption — no negative; ℹ️) |
| 08 budget sound | §9 | `valid-09/` + sound 08 | `budget-broken-08/` (upstream-defect→08) |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a negative entry —
the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; Theme-F heuristic residue; closed verdict schema)

These catalog rules are **inherently semantic** — they require domain understanding the mechanical +
walker layers cannot supply. Each runs only after mechanical gates pass and returns an **enumerated
verdict** (never prose). The harness records `{id, verdict, ruleId}`; any verdict other than the rule's
pass-verdict is reported at the catalog severity. **There are no ❌ agent-judged checks** — every ❌ rule
has its ❌ weight carried by a mechanical or walker subset; the agent judges only Theme-F residue at its
own (⚠️/ℹ️) severity. **Non-blocking** (Theme F never blocks the gate, per catalog Pass condition). The
mechanical preconditions (the nominal-path step list, the lifecycle-entity binding, the
container/component name text) are computed by the harness and handed to the agent, so it judges only
the semantic residue, never raw structure.

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ-STATUS | F-a (visibility of system status) | whether a long-running/system step on the nominal path has *meaningful* view feedback (a status `Details`/notification) vs none — the presence of a component is mechanical, but whether it conveys progress is judgment. | `{ status-visible \| no-feedback \| ambiguous }` |
| AJ-ERRPREV | F-d (error prevention on destructive submits) | whether a `submit` mapped to an irreversible/terminal transition has a *genuine* confirmation step (vs a token one) — terminal-transition detection is mechanical, confirmation adequacy is judgment. | `{ confirmation-present \| destructive-unguarded \| ambiguous }` |
| AJ-LIFEDISP | D-c / F-c (state-dependent display quality) | whether a state-conditioned action's display note / domain-language naming genuinely matches the persona's vocabulary and the entity's valid states — beyond the mechanical authority check. | `{ display-appropriate \| jargon-or-unguarded \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); reported as ℹ️, never silently dropped, never a
pass for reconciliation (counts as executed, verdict-recorded). No agent-judged check may emit free
prose in an asserted position. The mechanical + walker verdict remains byte-deterministic regardless of
agent output (§8).

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order, `checks[]`/
`findings[]`/`flows[]` sorted by `id`:

```json
{
  "skill": "ui-flows",
  "artifactDir": "specs/09-ui-flows/",
  "upstream02": "specs/02-glossary.md",
  "upstream04Dbml": "specs/04-erd.dbml",
  "upstream04Transitions": "specs/04-transitions.md",
  "upstream07": "specs/07-personas.md",
  "upstream08": "specs/08-task-models/",
  "upstream05": "specs/05-statecharts/ | null",
  "tooling": { "reader": "vendored-ifml-xmi-subset", "flowWalker": "vendored-bfs", "cttWalker": "copied-from-08", "dbml": "hand-rolled-slice-reader (no @dbml/core)", "node": ">=18", "externalEngine": "none (probe: no scriptable IFML validator exists)" },
  "status": "pass | fail | malformed | broken-test",
  "authority": { "order": "05-scxml", "coupon": "04-table" },
  "counts": {
    "intake": { "models": 0, "containers": 0, "components": 0, "events": 0, "flows": 0 },
    "checks": { "mechanical": 0, "walker": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "walker": { "walks": 0, "passed": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "flows": [
    { "model": "dispatcher", "taskModel": "dispatcher-fulfil_order", "computedCost": 18, "budget": 20, "hops": 3, "screens": 4, "bloatLimit": 8, "nominalLeaves": 5, "realizable": true }
  ],
  "_note": "the flows[] values above are ILLUSTRATIVE schema examples, not pinned to any fixture — computedCost/budget/hops/nominalLeaves come from the model under test; the names are likewise illustrative (the real slug is snake(persona), the taskModel a <snake(persona)>-<snake(job)> 08 stem)",
  "checks": [
    { "id": "M-BIND", "class": "mechanical", "rule": "A-i", "status": "pass" },
    { "id": "W-COST", "class": "walker", "rule": "C-a", "status": "warn", "detail": "flow_cost 24 > Budget.klm 20 for dispatcher-fulfil_order (events [open_order MK=2, start_picking MPBB=4, …] + BB×(4-1)=6); re-model 09 to cut hops/clicks" },
    { "id": "W-BLOAT", "class": "walker", "rule": "C-d", "status": "pass" },
    { "id": "R-AUTH", "class": "resolution", "rule": "D-a", "status": "pass" },
    { "id": "AJ-STATUS", "class": "agent-judged", "rule": "F-a", "verdict": "status-visible" }
  ],
  "findings": [
    { "id": "W-BLOAT", "rule": "C-d", "severity": "error", "detail": "screens visited 9 > nominal leaf count 5 + 3 = 8 for dispatcher-fulfil_order (home + 8 hops); cut gratuitous intermediate screens" }
  ]
}
```

- The `authority` block is **always present**; it records the lifecycle source each entity's events were
  judged against (`05-scxml` only when `--upstream-05` present AND the entity is promoted; otherwise
  `04-table`). `upstream05: null` ⇔ the flag was absent.
- The `flows[]` array records each realized model's computed flow cost vs the declared 08 budget + the
  hop count + screens-visited vs bloat limit + nominal-leaf count + realizability flag — the
  W-COST/W-BLOAT/W-REALIZE evidence, recorded for transparency (both values always reported on a
  W-COST warn and on a W-BLOAT fail; `status:"warn"` checks never enter `findings[]` and never block).
- The optional `class: "upstream-defect"` + `upstream: "<file>"` on a finding routes an
  02/04/05/07/08-origin defect (§9). It does **not** add a status; the status stays `fail` (taxonomy
  closed at four values).
- **stderr** — human-readable diagnostics only (reader parse throws, flow-walker stranded-path traces
  with the leaf sequence + mapped events, per-walk over-budget detail with computed-vs-declared + the
  contributing event/hop list, the unreachable-container trace, the wrong-reason-trap explanation, the
  05-claimed-but-absent note, the upstream-defect routing note naming which file to fix). Never the
  machine summary.
- **Exit codes:** `0` ⇔ `status === "pass"`. `1` = `fail` (incl. `upstream-defect`). `2` = `malformed`
  (a `.xml` not well-formed / dialect-unparseable). `3` = `broken-test` (check threw, wrong-reason,
  reconciliation mismatch, zero checks, **or an unparseable/unreadable 02/04/05/07/08 upstream**). The
  distinct codes let CI separate a wrong 09 (`1`), a malformed model (`2`), and a broken
  harness/fixture/upstream (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`. There is no
  sanctioned zero-check pass for this artifact.

## 8 — Determinism (doctrine §6; walker-value exclusion)

Running the vendored flow-walker is the determinism surface this skill must manage. The walk is **fully
deterministic** by construction — no clock, no randomness, no data computation:

- **The 08 nominal path is pinned**, not chosen at runtime (the copied 08 rule: enabling/concurrent →
  all children in order; `choice` → first document-order child; `disabling`/`suspendResume` → left; skip
  `optional`; iterative once). The same 08 tree yields the same nominal-leaf list every run.
- **The realizing navigation path is pinned**: **BFS shortest hop-count** path visiting the mapped
  events in nominal order, **document order** breaking any tie. The same 09 model + 08 path yields the
  same realizing path (and the same `hops`) every run.
- **M-placement is pinned** (one leading `M` on every interaction/user Event, zero on system), so the
  M-count — the sole judgement variable inherited from 08's KLM — is a pure function of the model.
- **The klm tokenizer + `NAV_HOP_COST` are pinned** (greedy `BB`-before-`B`; `nK` → `n` tokens;
  hop = `BB` = 1 token; first container free), so `flow_cost` is the same integer every run. **The cost is
  asserted as a computed integer the walker re-derives** — never a value the harness mints from a
  clock/random and never the declared budget echoed back (the budget is the *comparand*, the computed
  cost is the *oracle*).
- **The reachable-container set is asserted as a sorted id set** (set semantics), never an ordering the
  walker chose by a tie-break the harness did not also fix.
- **Cross-artifact sets are sorted** before comparison (the `{09 file slugs}` set, the `{07 persona
  slugs}` set, the table/leaf/event lists), so set-equality and resolution are order-independent.
- **The fingerprint digests are read from the artifacts** and only shape-checked (M-FP) — the harness
  never recomputes a sha256 and asserts equality (that would inject a value); it checks shape + naming
  and resolves references against the upstream files actually passed.
- **Fresh reader + walker state per model** (a fresh parse + walk per `.xml`); nothing carries between
  models. A re-run over byte-identical inputs is **byte-identical output** (stable key order, sorted
  `checks[]`/`findings[]`/`flows[]`).
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the reconciliation
  arithmetic and their verdicts are recorded, not invented into counts — so the **mechanical + walker
  verdict remains byte-deterministic** regardless of agent output.

## 9 — Upstream-defect routing + single-ownership notes (how an 02/04/05/07/08 defect is reported without patching around it)

09 is validated *against* five-or-six upstreams but consumes a **narrow slice** of each: 07's persona
set (A-c), 08's nominal path + budget (B-a/B-d/C-a), 04's table+status vocabulary (A-i/D), 02's
forbidden-synonym + enum vocabulary (E-b), and (when present) 05's promoted-entity transition set (D).
The harness checks only the **minimal preconditions** 09 legitimately needs, and **never silently
repairs or works around** a bad upstream — it surfaces the defect and routes it to the file that owns
the fix:

**Pinned preconditions (the only upstream invariants 09 verifies):**

1. **A realized 08 model's budget is sound** — its declared `<Budget klm>` equals its own recomputed
   nominal cost (via the copied CTT walker). **A realized 08 whose budget ≠ its own nominal cost is a
   broken ruler**: 09's flow cost cannot be meaningfully measured ≤ a budget the 08 itself contradicts.
   This is the one 08 invariant 09 *must* re-derive (it is the precondition for the C-a/W-COST
   comparison to mean anything). Routed `upstream-defect` → **the named 08 file**. Proven by
   `budget-broken-08/`. (09 does
   NOT otherwise re-verify 08's tag/operator/KLM-alphabet seams — those are the `08` harness's
   single-owned job.)

**Three upstream conditions are distinguished and routed:**

1. **Sound upstreams.** 07 parses with a clean persona set; each realized 08 parses and its budget ==
   its own nominal cost; 04 yields the table+status slice; 02 yields the forbidden/enum lists; (when 05
   present) each `.scxml` is well-formed and its transition set reads. The 09→upstream checks (M-BIJ,
   R-REALIZE, R-BIND, R-TASK, R-AUTH, W-*) run normally; a failure is a **09 defect** → `fail`, ordinary
   finding. In particular a **ghost 01-event** (an annotation absent from the authority) or a **ghost
   binding** (a table absent from 04) is a **09** defect (09 named something the upstream doesn't have),
   caught as an ordinary `fail` — not an upstream-defect.

2. **Well-formed but self-inconsistent upstream** (`upstream-defect`). Two cases 09 surfaces, both a
   realized 08 that parses but is self-broken: (a) its declared budget ≠ its own recomputed nominal
   cost (broken ruler, finding `X-COST-INT`); (b) its nominal-path walker gets **stuck** — an internal
   node selects an empty contributing set (e.g. a `choice` whose only child is `optional`), so the
   nominal path is underivable (finding `W-REALIZE`). Both route → `08-task-models/<file>.xml`. The
   harness runs these **pre-walk 08 self-checks before** the 09→08 walk; on failure the finding is
   tagged `class: "upstream-defect"`, `upstream: "<08 file>"`. Status `fail`, exit `1`; the fix routes
   **upstream to the 08 artifact** (an 08 regeneration, never a 09 edit). The copied CTT walker filters
   `optional` kids from the contributing set and detects the stuck case **identically to the 10
   (flow-acceptance) walker**, so the same 08 tree yields the same nominal-leaf set in 09 and 10.
   Proven by `budget-broken-08/` and `stuck-08/`.

3. **Unparseable 02 / 04 / 05 / 07 / 08** (`broken-test`, not `upstream-defect`). An upstream does not
   parse against its pinned format: 07 drops the `### <PersonaName>` blocks (the bijection cannot be
   anchored); `04-erd.dbml` does not yield the table+status slice (bindings cannot be resolved); 02
   drops `## Forbidden Synonyms` (the scan list cannot be built); a realized 08 `.xml` is not
   well-formed (the nominal path/budget cannot be read); a supplied `05/*.scxml` is not well-formed XML
   (the authority cannot be read). The harness cannot anchor its resolution/walk targets, so it cannot
   make a trustworthy statement about 09. Status `broken-test`, exit `3`, stderr "upstream <file>
   unparseable." Proven by the five `malformed-upstream-*` rows.

**What 09 deliberately does NOT re-verify (single ownership of checks).**
- **09 does not re-verify 08's internal seams.** It re-walks 08 *only* for the nominal-leaf list + the
  budget (and the budget-soundness precondition above); it does not re-litigate 08's tag resolution,
  operator legality, M-placement, or KLM-alphabet — the **`08` harness single-owns** those.
- **09 does not re-validate 04's schema.** It reads only the table names + status columns via the
  constrained slice-reader; full DBML correctness (FKs, enum membership, parse validity) is the **`erd`
  harness's** single-owned job — which is precisely why **no `@dbml/core` dependency** is pulled in (§1).
- **09 does not re-certify 05's machine semantics.** When `--upstream-05` is present it reads 05's
  transition set as the lifecycle *authority*; whether the SCXML is a faithful lifecycle model is the
  **`statecharts` harness's** single-owned job. An *unreadable* supplied 05 routes to `broken-test`; an
  *absent* 05 is NOT a defect — it switches the authority to 04 and asserts no-05-claims (§3.5,
  N-05ABSENT).
- **09 does not re-verify 02/07 provenance seams** (a 02 term's 01-event derivation, a 07 persona's role
  mapping) — those are the `glossary`/`personas` harnesses' single-owned jobs.

The splits are deliberate: `upstream-defect` (case 2) is an actionable content finding routed to the
correct upstream owner while keeping the §2 status set closed; `broken-test` (case 3) is the harness
honestly refusing to emit a verdict it cannot justify. No case lets the harness paper over an upstream
by inferring, substituting, or skipping a missing element. **The optional-05 case is handled the same
way:** an *absent* `--upstream-05` is not a defect, only an *unreadable* supplied one is `broken-test`.

---

*This contract mechanizes catalog rules A-a … A-l / B-a … B-d / C-a … C-d / D-a … D-c / E-a … E-d /
F-a … F-f. **Mechanical / walker ❌ coverage is complete:** every one of the 22 ❌-severity catalog
rules has BOTH (a) a mechanical or walker owner check and (b) a dedicated negative fixture **that ships
on disk** (a directory- or file-form set under `scripts/fixtures/`; the names identify the mutated model
file). No "(variant)" placeholders remain — the selftest's COVERAGE array runs every negative below and
asserts its owner fires. The full reconciliation (❌ rule → owner check → on-disk negative fixture):*

| ❌ rule | Owner check | On-disk negative fixture |
|---|---|---|
| A-a | M-DECL | `malformed-xml.xml` |
| A-b | M-FP / R-FP | `missing-fingerprint.xml` |
| A-c | M-ROOT / M-BIJ / M-ATTR | `missing-persona-model/` / `extra-model/` |
| A-d | M-REALIZES | `missing-realizes.xml` (zero `<Realizes>`) |
| A-e | M-REALIZES / R-REALIZE | `realizes-other-persona.xml` |
| A-f | M-CID | `non-snake-id.xml` |
| A-g | M-CTYPE | `bad-component-type.xml` (`type="grid"`) |
| A-h | M-ETYPE | `bad-event-type.xml` (`type="hover"`) |
| A-i | M-BIND / R-BIND | `ghost-binding.xml` |
| A-j | M-NAVEND | `dangling-navflow.xml` |
| A-k | M-ANNOT / R-AUTH | `ghost-01-event.xml` |
| A-l | M-HOME / W-HOME | `dup-home.xml` / `no-home.xml` |
| B-a | X-COV-LEAF | `unrealized-leaf/` |
| B-c | M-TASKREF / R-TASK | `ghost-task-ref.xml` |
| B-d | W-REALIZE | `unrealized-leaf/` (its unmapped leaf strands the walk) |
| C-b | M-KLM | `bad-klm-token.xml` (`klm="MXP"`) |
| C-d | **W-BLOAT** | `flow-bloat/` (both values reported) |
| D-a | R-AUTH | `ghost-01-event.xml` |
| D-b | R-AUTH | `wrong-authority-event.xml` |
| E-a | M-SNAKE / M-CID | `non-snake-id.xml` |
| E-b | M-FORBID | `forbidden-synonym-id.xml` |
| E-d | M-BIND / R-BIND | `ghost-binding.xml` |

*(The ⚠️/ℹ️ rules — C-a (flow cost vs the 08-declared budget → W-COST ⚠️, both values reported,
`over-budget.xml` passes the gate with the warning), C-c (nav-overhead accounting, mechanized inside
W-COST's `BB`×(hops−1) term), D-c (state-dependent display → AJ-LIFEDISP), E-c (verbatim exemption →
M-FORBID's masked spans), F-a/F-c/F-d/F-f (heuristic residue → AJ-STATUS/AJ-ERRPREV/AJ-LIFEDISP),
F-b/F-e (mechanical subsets → M-BACKOUT/M-CONSIST ⚠️) — each carries a mechanical or agent-judged
owner where one exists and an agent-judged residue where the rule is inherently semantic; none is left
as a blocking ❌ on the agent. The **flow-bloat floor (C-d) is the load-bearing blocking walk check** —
verified by the walker counting screens visited on the realizing walk against the 08 nominal leaf
count + 3, with the flow cost (C-a) re-derived alongside it as the advisory comparison, never by an
inline formula. The selftest's COVERAGE array asserts the positive+negative floor over the §5 table and
fails if any ❌ rule lacks either side. Pass = status `pass` = zero ❌ findings across Themes A–E,
reconciled, ≥1 check executed, walker layer non-empty; C-a/Theme-F ⚠️/ℹ️ never block the gate.*
