# statecharts — Simulation Contract (Verification Harness Spec)

Role: this is the **closed simulation contract** for the `statecharts` skill (artifact
05, a **directory artifact**: `specs/05-statecharts/` holding **one `<entity>.scxml`
SCXML state machine per gate-passing lifecycle entity**, OR **no directory at all**
when no entity passes the gate). It defines the **sole executable pass/fail authority**
that ships with the skill: an **SCXML execution-engine oracle** (the strongest oracle
available — every machine is *loaded and run on a real SCXML interpreter of its own
formalism*, configurations driven event-by-event from the 04 transition table) plus a
**hand-rolled mechanical reader** over the constrained SCXML subset and a closed
resolution / exact-value / reason-qualified-negative checker, plus a minimal set of
agent-judged checks. It satisfies the verification doctrine §2 (closed assertion
grammar, machine-readable summary, status taxonomy, no vacuous green, agent judgment
only where the contract marks it), §6 (determinism), and build steps B2 (formal-format
oracle design — the machine must LOAD and RUN on the execution oracle) and B3
(simulation design — strongest oracle = run on a real interpreter).

It is **paired with** `references/validation-rules.md` (the closed rule catalog,
A1–A8 / B1–B5 / C1–C6 / D1–D9 / E1–E4 — 32 rules). Every check below cites the catalog
rule ID(s) it mechanizes. **The catalog is the review vocabulary; this file is the
executable harness over it.** No check here exists without a catalog rule behind it.

Unlike `01-event-storming.md` (zero upstream) and the conceptual/textual `02`/`03`
artifacts (whose strongest oracle is *mechanical* because "the artifact is the model"),
the `statecharts` artifact is a **formal-format artifact** (SCXML) with a real engine of
its formalism — exactly like `erd` (DBML → Postgres). Per doctrine B3 ("prefer running
the artifact on a real engine of its formalism") and B2 ("must parse/validate under the
authoritative validator … downstream instantiation must succeed — the machine must LOAD
and RUN on the execution oracle"), the strongest oracle here is **executable**: load
each `.scxml` into the pinned SCXML interpreter, **start the machine, fire the 04
transition events in sequence, and assert the resulting configuration after every
step**. This is the second skill (after `erd`) where the strongest-oracle clause bites,
and it is designed precisely below (§3.3 — the **walk oracle**).

The artifact is a **five-upstream** artifact, validated against `specs/01-event-storming.md`
(domain event names), `specs/02-glossary.md` (enums `### <Aggregate>Status` with
`Value | Derived from event`; forbidden synonyms), `specs/03-aggregates.md` (aggregates,
invariants), and BOTH `specs/04-erd.dbml` + `specs/04-transitions.md` (the transition
tables 05 promotes). The harness takes five upstream arguments plus the 05 directory and
resolves every 05→0n reference by exact string under the pinned conventions of the
catalog ("Pinned conventions" block):

```
node scripts/harness.mjs <05-dir> \
     --upstream-01 <01-event-storming.md> \
     --upstream-02 <02-glossary.md> \
     --upstream-03 <03-aggregates.md> \
     --upstream-04-dbml <04-erd.dbml> \
     --upstream-04-transitions <04-transitions.md>
```

The upstream parses use the **pinned 01/02/03/04 formats** (copied, never imported —
see §1):

- **01** (event storming): the domain event names (exact strings, e.g. `Order Placed`)
  that the 04 `Event` column quotes verbatim and that 05 transforms into `event`
  attributes. 05 references 01 strings only through the `<!-- 01-event: … -->`
  annotation; it never restates 01 prose.
- **02** (glossary): `## Enums` with `### <Aggregate>Status` subsections each holding
  `Value | Derived from event (exact 01 string)`; `## Forbidden Synonyms` table
  `Forbidden term | Canonical term | Reason`. **02 is authority for the enum values
  (the machine's basic-state ids) and forbidden synonyms.**
- **03** (aggregates): aggregate roots + invariants — consulted for the B4 guard/action
  judgment arm (does an invariant imply a conditional transition?), never restated.
- **04** (`.dbml` + `.md`): `04-transitions.md` carries the `### <TableName>` transition
  blocks `From | Event | To` (the `∅`-origin row = initial); `04-erd.dbml` carries the
  `<Name>Status` enum + the table set (used to enumerate lifecycle entities and confirm
  state counts). **04 is authority for the transition rows; 05 supersedes the table
  in-document and 04 is NEVER edited.**

05 references all five and **never restates** a 02 enum definition, a 03 invariant text,
or a 04 row beyond the required transitions (catalog E-theme). 05 owns only the **SCXML
structure derived via the pinned mapping** (state ids = 02 enum values; `event` =
pinned transform of the 01 string; transitions = 04 rows; refinements annotated).

## 0 — Probe transcript (SCION execution oracle — empirical verification on current Node)

The pinned oracle (SOURCES.md authority #2: `@scion-scxml/core@2.6.24` +
`@scion-scxml/scxml@4.3.27`) is **dormant** (last publish 2021-07-04; no commits since
2021-05-16). Before pinning it as the execution oracle, it was **empirically verified on
the current Node** in a scratch dir (`/tmp/scion-probe`). Transcript:

```
$ node --version        →  v24.13.0           (≥18 — the pinned runtime floor)
$ npm install @scion-scxml/core@2.6.24 @scion-scxml/scxml@4.3.27
    added 105 packages in 27s
    npm warn EBADENGINE  text-to-js-identifier@0.0.4 requires node 0.6.x (cosmetic,
                         transitive; install + run unaffected)
    # several deprecation warnings (request/har-validator/uuid@3) — all transitive,
    # none fatal. Installs CLEAN.
```

**API shape that works (recorded for §1):**

```
const scxml = require('@scion-scxml/scxml');           // facade exposes:
//   pathToModel, urlToModel, documentToModel, documentStringToModel,
//   core (the engine — core.Statechart), ext, util, ...

// (a) from a file:
scxml.pathToModel('order.scxml', (err, modelFactory) => {
  modelFactory.prepare((err2, fnModel) => {            // ← MUST prepare()
    const sc = new scxml.core.Statechart(fnModel);     // (scxml.scion is deprecated alias)
    sc.start();                       // → ["placed"]        initial configuration
    sc.gen({ name: 'order_paid' });   // → ["paid"]          fire event, returns config
    sc.gen({ name: 'no_such' });      // → ["paid"]          negative: config unchanged
    sc.gen({ name: 'order_shipped' });// → ["shipped"]
    sc.isFinal();                     // → true
  });
});

// (b) from an in-memory string (used for fixtures):
scxml.documentStringToModel('mem://order', docString, (err, mf) => { mf.prepare(...) });
```

**Empirical results — all four critical cases PASS on Node 24:**

| Case | Machine | Result |
|------|---------|--------|
| **null datamodel (literal attr)** | `datamodel="null"`, 3 states, 2 transitions | `start → ["placed"]`; `order_paid → ["paid"]`; `order_shipped → ["shipped"]`; `isFinal → true`. Configurations advance exactly per the 04 walk. |
| **negative walk** | same machine, fire `no_such` in `paid` | configuration stays `["paid"]` — unmatched event **silently discarded**, no error, no change (SCXML semantics confirmed). |
| **`<parallel>` (concurrency arm)** | two orthogonal regions | `start → ["unpaid","unshipped"]` (both regions active); firing `paid` settles only payment → `["unshipped","settled"]` — genuine orthogonality, the other region untouched. |
| **`datamodel="ecmascript"` guard** | two `cond`-guarded `approve` transitions | with `amount=0` → `approve` takes the `amount<=100` branch → `["auto_approved"]`; with `amount=500` → `approve` takes the `amount>100` branch → `["manual_review"]`. Guard-path verification is **viable** — see §3.3(c). |

**Two dormancy gotchas pinned (the harness MUST honor both, or it silently mis-reads):**

1. `documentStringToModel(null, doc, cb)` **throws** on modern Node —
   `TypeError: options.filename must be of type string` (the null first-arg is forwarded
   into `vm.Script` as the filename, which Node ≥ recent rejects). **Fix:** always pass a
   non-null URI string (`'mem://<entity>'`).
2. The `Statechart` constructor MUST be handed the **prepared** model
   (`modelFactory.prepare(cb)` → `fnModel`), not the raw `ModelFactoryFactory`. Handing
   it the unprepared factory yields a vacuous machine whose configuration reads
   `["$generated-state-0"]` and never advances — a **silent** wrong-green if the harness
   asserted against it. The harness's engine layer calls `prepare()` and asserts the
   first `start()` is a real 02 enum value (never `$generated-state-0`), so this failure
   mode is caught, not passed.

**Verdict: SCION WORKS. It is pinned as the execution oracle.** No fallback chain is
needed. (Had it failed, the recorded fallback order was: legacy `scion`/`scxml` npm 5.0.4
→ a Rec-faithful minimal interpreter for the null-datamodel subset vendored into the
skill, citing the Rec's *SelectingTransitions*/*microstep* algorithm — the
reuse-over-invention tradeoff being honestly worse than running the format's own proven
interpreter. SCION passing removes that need; we run the format's real engine.)

## 1 — Tooling record (B2; oracle choice + versions + self-install + offline mode)

| Field | Decision |
|-------|----------|
| Runtime | **Node.js ≥ 18** (plain ESM). Matches the sibling `event-storming` / `glossary` / `aggregates` / `erd` harnesses (suite uniformity); probe ran on v24.13.0. |
| Entry points | `scripts/harness.mjs` (the oracle; the 6-arg invocation above), `scripts/selftest.mjs` (runs the harness over every shipped fixture set and asserts the expected status + failing-check + upstream-route + the not-emitted records). |
| **Execution engine (the oracle)** | **`@scion-scxml/core` 2.6.24 + `@scion-scxml/scxml` 4.3.27** (pinned, SOURCES.md authority #2 oracle). The probe-verified flow (`pathToModel`/`documentStringToModel` → `modelFactory.prepare(cb)` → `new core.Statechart(fnModel)` → `start()` / `gen({name})`) is the **load+run** B2 requires. This is the format's own historical IRP reference interpreter — the strongest possible "reuse over invention." |
| **Mechanical SCXML reader** | **Hand-rolled, dependency-free**, vendored in `scripts/lib/scxml.mjs`. The pinned SCXML subset is small and constrained — only `scxml / state / parallel / final / initial / transition / history / datamodel / data` elements + comments — so a hand-rolled reader is feasible and is the **zero-dep house style** (matching the siblings' hand-rolled `md.mjs`). It reads structure (state tree, ids, transitions, events, `cond`s, annotations, fingerprints) for the mechanical checks. **The engine, not this reader, is the authority on what the machine *does*** — the reader never simulates; it only inspects shape. Rationale for hand-rolled over a vendored XML parser: the constrained element set makes a full XML library overkill, and the harness must read SCXML-specific comment annotations (`<!-- 01-event: … -->`, `<!-- supersedes: … -->`, `<!-- refines: … -->`, `<!-- fingerprints: … -->`) that a generic DOM parser discards — so a comment-preserving hand-rolled reader is the right tool. Well-formedness (A3) is double-checked: the reader rejects malformed XML, and SCION's own JSDOM parse (it uses `jsdom` internally) rejects it again at load. |
| Markdown parser | **Hand-rolled line/table/heading parser**, dependency-free, vendored in `scripts/lib/md.mjs` — shared shape-reader for `04-transitions.md` and the 01/02/03 upstreams. **Copied** from the sibling skills (same pinned 01/02/03 shapes), extended with the 04 transition-block shape. The `.dbml` is parsed by `@dbml/core` (copied from the `erd` harness) only to enumerate the `<Name>Status` enums + table set for the gate state-count and lifecycle-entity enumeration. |
| Dependency pin | `scripts/package.json` pins `"@scion-scxml/core": "2.6.24"`, `"@scion-scxml/scxml": "4.3.27"`, and `"@dbml/core": "8.2.5"` **exactly** (no `^`/`~`); a committed `scripts/package-lock.json` locks the trees (incl. SCION's transitive `jsdom`/`sax`). Versions recorded in the JSON summary's `tooling` block so a drifted re-run is detectable. |
| Assertion lib | None external — a vendored `assert`-style closed grammar in `scripts/lib/checks.mjs` (the enumerated check classes of §4). |
| Closed lexicons | `scripts/lib/lexicon.mjs` — the **event-name transform** (`lowercase(s).replace(/\s+/g,'_')`, the catalog's ONE pinned convention), the **snake_case validator** (`^[a-z][a-z0-9_]*$`), and the **forbidden-synonym scan** (read fresh per run from 02). Closed and vendored; extended only by a committed edit, never ad hoc. |

**Rationale for the engine oracle over a mechanical-only harness.** SCXML, like DBML,
**has** a real interpreter of its formalism, and the probe (§0) proves the pinned one
runs on current Node. Doctrine B3 names the strongest oracle — "run on a real
interpreter" — and B2 requires that a formal-format artifact "parse/validate under the
authoritative validator, and downstream instantiation must succeed." Hand-rolling a
state-machine interpreter would be **weaker than the oracle the format ships** and would
risk diverging from the Rec's transition-selection semantics (optimal enablement,
microstep ordering, parallel entry) that SCION already implements and the IRP suite
already certifies. So the harness **loads and runs** every machine on SCION and asserts
configurations; the mechanical reader only inspects shape (structure the engine doesn't
surface: annotations, fingerprints, DRY, forbidden synonyms). This is the same
engine-plus-mechanical split the `erd` harness uses.

**Self-install + offline failure mode (pinned).** The engine deps are **not vendored**
into the repo. On startup the harness checks for `scripts/node_modules/@scion-scxml/core`,
`scripts/node_modules/@scion-scxml/scxml`, and `scripts/node_modules/@dbml/core`:

- **Present** → run normally.
- **Absent + network reachable** → self-install into its own `scripts/` dir:
  `npm ci --prefix scripts --no-audit --no-fund` if `package-lock.json` is present
  (preferred, reproducible), else `npm install --prefix scripts --no-audit --no-fund`.
  One-time; subsequent runs hit the "present" path. (The probe confirms a clean install
  in ~27 s; the EBADENGINE/deprecation warnings are non-fatal and ignored.)
- **Absent + no network** → the harness does **not** silently skip the engine and emit a
  green. It exits `status: broken-test`, exit code `3`, with a stderr diagnostic naming
  the missing package(s) and the install command. This is the §0/erd "missing engine ⇒
  broken-test, never a vacuous pass" rule: the strongest oracle is unavailable, so the
  harness honestly refuses to certify rather than degrade to a parse-only verdict that
  would let an un-runnable machine through.

**Reuse note (doctrine "reuse over invention: copied, never referenced").** The
`event-storming`/`glossary`/`aggregates`/`erd` skills already ship a hand-rolled `md.mjs`
reader and a `checks.mjs` grammar for the pinned 01/02/03 markdown shapes, and `erd`
ships the `@dbml/core` enum/table reader. This skill **copies** those readers (it parses
the same pinned 01/02/03 shapes and re-uses erd's DBML enum enumeration) and the
`checks.mjs` scaffold, then adds the 05-specific layers new to this skill: the
hand-rolled **SCXML reader** and the **SCION engine layer** (no sibling has an SCXML
engine because no sibling's artifact is a runnable state machine). For the engine itself
the harness **reuses the format's own proven interpreter** (SCION — the historical IRP
reference implementation) rather than inventing one — the strongest possible "reuse over
invention." Copied, never cross-referenced — each skill stays self-contained and
portable.

## 2 — Mechanical (no-engine) checks — structural; A/B/C/D/E shape rules

Parse/lint/structure checks run first. Each `.scxml` is read by the hand-rolled
`scxml.mjs`; `04-transitions.md` and the 01/02/03 upstreams by `md.mjs`; `04-erd.dbml`
by `@dbml/core`. Mechanical IDs are `M*`. A parse failure or a ❌ that prevents anchoring
a machine yields `malformed`; a ❌ over an anchored machine yields `fail`; ⚠️/ℹ️ are
warn-only. **All checks here are no-engine** — they inspect SCXML shape + cross-artifact
resolution that the interpreter does not surface.

| ID | Checks | Catalog rule(s) | Status on fail |
|----|--------|-----------------|----------------|
| M1 | **Directory presence matches the gate.** `specs/05-statecharts/` exists ⇔ ≥1 entity passes the gate; it contains ≥1 `.scxml` when present; it is **absent** when no entity passes (the not-emitted case — §3.6). | A1, B1, B3, B5 | `fail` (or `pass` for a correct not-emitted record — §3.6) |
| M2 | Each file is named `<04 TableName>.scxml`; no two files target the same entity; every gate-passing entity has a file. | A2 | `fail` |
| M3 | Each `.scxml` begins with `<?xml version="1.0" encoding="UTF-8"?>` and is **well-formed XML** (hand-rolled reader accepts; SCION also re-parses at load, M-LOAD). | A3 | `malformed` |
| M4 | Leading `<!-- fingerprints: … -->` block present and names ALL **five** upstreams (`01-event-storming.md`, `02-glossary.md`, `03-aggregates.md`, `04-erd.dbml`, `04-transitions.md`), each `<file>@sha256:<64-hex>` (64 chars `[0-9a-f]`, none a placeholder `0000…`/`xxxx…`/`<hex>`). | A4 | `fail` |
| M5 | `<!-- supersedes: 04-transitions.md#<table_name> -->` present in the header region; `<table_name>` matches this file's entity AND names a 04 table that exists. | A5 | `fail` |
| M6 | Root is `<scxml>` with `version="1.0"` and `xmlns="http://www.w3.org/2005/07/scxml"` exactly; `initial` (when present) names an existing child. | A6 | `fail` |
| M7 | `datamodel` attribute present and pinned: `="null"` (default), OR `="ecmascript"` **only** when this file's gate justification is *guards* and a declaring note is present; **no `cond` present under `datamodel="null"`**. | A8 | `fail` |
| M8 | **Gate arithmetic — missed promotion (mechanical >4-states arm).** For each 04 lifecycle entity, count distinct `From`/`To` enum values (excluding `∅`); an entity with **>4** distinct states and **no** file ⇒ fail. | B3 | `fail` |
| M9 | **Gate arithmetic — unjustified promotion.** A promoted file with **≤4** basic states AND no `cond`, no executable transition action (`<onentry>`/`<onexit>`/`<assign>`/`<raise>`/`<send>` on a transition path), and no `<parallel>` ⇒ the gate-justifying feature is absent ⇒ fail. | B1, B2 | `fail` |
| M10 | **Non-promoted / non-lifecycle absent.** A file for a 04 entity that did not pass the gate, or for a 04 table with no transition block, ⇒ fail. | B5 | `fail` |
| M11 | **Basic-state set == 02 enum values (exact).** The set of basic-state ids equals the entity's 02 `### <Aggregate>Status` enum values verbatim (`snake_case`); a missing value, an extra basic state, or a non-enum id ⇒ fail. Structural wrapper states (compound/parallel/initial/history) carry fresh ids that MUST NOT collide with any enum value. | C1 | `fail` |
| M12 | **Every 04 row present as a `<transition>`.** Each 04 row `From | Event | To` (non-`∅`) has a `<transition>` whose source state = `From`, `event` = `transform(Event)`, target = `To`. | C2 | `fail` |
| M13 | **No contradiction of 04.** No 04 edge absent; no basic-state `From→To` pair **not** in 04 unless it carries `<!-- refines: … -->`. | C4 | `fail` |
| M14 | **`initial` resolves to the 04 `∅`-row target** (mechanical id check; the engine confirms the runtime config in §3.3). | A7, C3 | `fail` |
| M15 | **id uniqueness** — every `id` attribute unique within the document. | D2 | `fail` |
| M16 | **target existence** — every `<transition target>`, `initial`, `<initial>`, and history default-transition target names a declared id. | D3 | `fail` |
| M17 | **reachability** — every state (other than the initial configuration) is the target of some transition or entered via a compound/parallel default; no orphan. | D4 | `fail` |
| M18 | **compound `initial` validity** — every compound state has a single valid default child (`initial` attr OR `<initial>`, not both); atomic states declare neither. | D5 | `fail` |
| M19 | **event-token legality + round-trip** — every `event` value is dot-segmented alphanumeric (no spaces); every 04-derived transition carries `<!-- 01-event: … -->` and `transform(annotation) === event` exactly. | D7, E4 | `fail` |
| M20 | **No forbidden synonyms** — no state id, `name`, comment, or `refines:`/`01-event` annotation uses a 02 forbidden term (whole-word; ids that ARE the pinned 02 enum value verbatim are exempt from sub-token scanning, as in the erd L12 exemption). | E1 | `fail` |
| M21 | **No restated 04 rows / enum defs / invariant text** — comments do not restate 04 rows beyond the required transitions, copy 02 enum definitions, or paste 03 invariant text (≥6 consecutive verbatim tokens from a single upstream cell). | E2 | `fail` |
| M22 | **refines annotation on added structure** — hierarchy / guard / action / parallel beyond 04 carries `<!-- refines: … -->` on the adding element. | C5 | warn-only (⚠️) |
| M23 | **terminal enum handling** — an enum value with no outgoing 04 transition is a `<final>` OR a `<state>` with a `refines:` note justifying a non-final sink. | C6 | warn-only (ℹ️) |
| M24 | **history legality** — `<history>` used only as a target with a legal default `<transition>`, `type ∈ {shallow, deep}`. | D6 | warn-only (⚠️) |
| M25 | **references by name, not paraphrase** — annotations point to upstream by artifact + identifier, not paraphrase. | E3 | warn-only (⚠️) |

M8–M10 are the **gate arithmetic** — the load-bearing mechanical promotion checks
(missed / unjustified / non-lifecycle). The state-count arm (M8) is checkable purely
against 04; the guard/action/concurrency arms are agent-judged (B4 → §6). M20's forbidden
list is **read fresh per run from the parsed 02** (upstream-owned data, never a vendored
constant).

## 3 — Closed fixture / scenario format (B3)

The scenario has **two halves**, because the artifact has two oracles:

1. **Engine walks** (§3.3) — the strongest oracle. Each emitted machine is loaded on
   SCION, started, and driven event-by-event from its 04 transition table; the
   configuration is asserted after every step (positive walks), and disabled events are
   fired to assert configuration-unchanged (negative walks).
2. **Mechanical scenarios** (§3.1–§3.2) — a walk over 05's own claims (the hand-rolled
   SCXML model + the gate arithmetic) resolved against the parsed 01/02/03/04 upstreams.

No external scenario data is injected into a *target* run; the five upstreams + the 05
directory supply every element. The shipped fixtures (§3.4) are **whole canned upstream
quintuples + 05 directories** used only by `selftest.mjs`.

### 3.1 Derived scenario graph (built fresh per run — §6)

From each parsed **05 `.scxml`** (hand-rolled reader) the harness derives:
`machine = {entity, datamodel, initial, basicStates[], wrapperStates[] ({id,kind}),
transitions[] ({source, event, target, cond?, actions[], events01Annotation, refines?}),
finals[], history[], fingerprints{}, supersedes}`.

From parsed **04** the harness derives, per lifecycle entity:
`transitionTable = {entity, rows[] ({from, event01, to})}` (from `04-transitions.md`) and
`statusEnum = {entity, values[]}` (from the `<Name>Status` enum in `04-erd.dbml`).
From **02**: `enums02[]` (`{name, values[], derivations[] (value→event01)}`),
`forbidden02[]`. From **01**: `events01[]` (exact strings). From **03**: `invariants03[]`
(consulted for the B4 judgment arm only).

Closed traversal set (every relationship 05 claims becomes a walked edge):

1. **Gate edge** — each 04 lifecycle entity's distinct-state count (>4 arm) decides
   promote/not; presence/absence of a file is checked against it (B1/B3/B5, M8–M10).
2. **Basic-state→02-enum edge** — each machine's basic-state set == the entity's 02 enum
   values verbatim (C1, M11).
3. **04-row→transition edge** — each 04 row resolves to a `<transition>` with matching
   source/event/target (C2, M12); and each machine transition between basic states is a
   04 pair or carries `refines:` (C4, M13).
4. **event→01 round-trip edge** — each transition's `event` == `transform(01-event
   annotation)`, and the annotated string ∈ 01 events (D7/E4, M19).
5. **initial→∅-row edge** — `initial` id == the 04 `∅`-row `To` (A7/C3, M14) AND the
   engine's `start()` configuration == that state (§3.3 W-INIT).
6. **id/target/reachability edges** — id uniqueness, target existence, reachability,
   compound-initial validity (D2–D5, M15–M18).
7. **walk edges** — per 04 row, a positive engine walk step (§3.3 W-STEP); per
   disabled-event probe, a negative engine walk (§3.3 W-NEG).
8. **DRY / synonym edges** — no forbidden synonym, no restated upstream text (E1/E2,
   M20–M21).

Every edge class is exercised ≥1 time by §4 checks (coverage floor, §5).

### 3.2 Cross-artifact resolution (mechanical, no engine)

Edges 2–6, 8 are pure resolution / exact-value / DRY checks over the parsed models.
Byte-deterministic, no engine. The pinned mappings (state id = 02 enum value; `event` =
`transform(01 string)` = `lowercase.replace(/\s+/g,'_')`; supersedes target = 04 table
name; initial = ∅-row `To`) are the catalog's "Pinned conventions" block, copied into
`scripts/lib/lexicon.mjs` so the harness and the catalog agree by construction.

### 3.3 Engine walks — the strongest-oracle design (B3, this skill's load-bearing layer)

After mechanical parse (M3) and SCION load (M-LOAD), the harness **runs** each machine.
**No engine-generated value is ever asserted** (§8): configurations in the null datamodel
are *deterministic* — the asserted positions are the **configuration sets** (sorted state-id
arrays) the engine returns, which are fixed for a given machine + event sequence.

**(a) Positive walks (`W-*`).** For each machine, the harness mechanically derives an
event walk from the 04 transition table — **each row is one step**:

| ID | Step | Assertion | Catalog rule |
|----|------|-----------|--------------|
| W-LOAD | `pathToModel` + `prepare` + `new Statechart` | model loads + prepares without throw; never `["$generated-state-0"]` (the §0 gotcha-2 guard) | D1 |
| W-INIT | `start()` | configuration == the singleton/closure of the 04 `∅`-row `To` (parallel: the entry closure of all orthogonal regions) | A7, C3 |
| W-STEP | for each 04 row, drive the machine to the row's `From` (by replaying a derived prefix walk from `initial`, deterministically; for an unreachable-by-prefix `From`, the row is flagged — but M17 reachability guarantees a prefix exists), then `gen({name: transform(Event)})` | the resulting configuration **contains** the row's `To` (set membership — `<parallel>` configs hold sibling-region states too) | C2 |
| W-FINAL | after exhausting a terminal walk | `isFinal()` agrees with the machine having entered a top-level `<final>` (when one exists) | C6 |

The prefix walk for each `From` is **deterministic**: the harness BFS-orders the
transition graph from `initial` and records, for each basic state, the shortest event
sequence reaching it; W-STEP replays that prefix on a **fresh** Statechart (one machine
instance per step — §8 fresh state) before firing the row's event. Same machine ⇒ same
walks ⇒ byte-identical configurations every run.

**(b) Negative walks (`W-NEG`).** For each basic state, fire an event that is **not**
enabled in that state (a 04 event whose `From` ≠ this state, or a synthetic
`__no_such_event__`). The probe (§0) confirms SCXML discards an unmatched event silently:
the assertion is **reason-qualified** — *configuration unchanged AND no `error.*` event
raised*. A machine that changes configuration on a disabled event, or raises an error,
fails W-NEG (the catalog has no rule *requiring* error-on-unmatched; the negative asserts
the Rec's actual discard semantics, so a wrong machine is caught for the stated reason).

**(c) Guard walks (`W-GUARD`) — for `datamodel="ecmascript"` machines.** The probe (§0)
proves SCION evaluates `cond` correctly: with the data value below the threshold the
`<=` branch fires, above it the `>` branch fires. So guard-path verification is **NOT
left to agent judgment** — the harness runs it. The SKILL ships, per guard-justified
machine, a `specs/05-statecharts/<entity>.scenarios.json` of **pinned data scenarios**
(`{datamodel: {var: value}, event, expectConfig}`); the harness seeds the data (via the
machine's `<datamodel>` initial `expr`, or a scenario-injected assign), fires the event,
and asserts the configuration matches `expectConfig`. Each guarded transition needs ≥2
scenarios (one per branch) so both arms are exercised. A guard-justified machine with
**zero** scenarios is itself a `fail` (the gate-justifying feature is unverified — no
vacuous engine pass on the guard arm). *Residue handed to the agent (§6):* only whether
the *set* of shipped scenarios covers every semantically-distinct guard region — the
*execution* of each scenario is mechanical.

### 3.4 Shipped fixtures (`scripts/fixtures/`)

One shared deterministic **upstream quintuple** (`01.md` + `02.md` + `03.md` +
`04.dbml` + `04-transitions.md`, mutually consistent) with **≥2 lifecycle entities**:
**`order`** — **>4 states** (`placed, paid, shipped, delivered, cancelled, refunded` = 6),
so it PASSES the mechanical >4-states gate arm; and **`coupon`** — **≤4 states**
(`issued, redeemed, expired` = 3) with no guard/action/parallel, so it does NOT pass.
Plus a valid 05 directory (a machine for `order` only), the illegal 05 fixtures, the
not-emitted fixtures, and the broken-upstream fixtures. Each illegal fixture carries
exactly one deliberate defect so its negative fires **for the stated reason** (a fixture
failing for any other reason is itself `broken-test`). The expected
`(status, failing-check, upstream-route, gate-record)` is recorded in
`scripts/fixtures/manifest.json`.

**`01.md` / `02.md` / `03.md` / `04.*`** — a small covering consistent quintuple
mirroring the real shapes in miniature. 01 lists the events (`Order Placed`, `Order Paid`,
`Order Shipped`, `Order Delivered`, `Order Cancelled`, `Order Refunded`, `Coupon Issued`,
`Coupon Redeemed`, `Coupon Expired`). 02 carries `### OrderStatus` (6 values) +
`### CouponStatus` (3 values), each value's `Derived from event` quoting the 01 string
verbatim; `## Forbidden Synonyms` carries `purchase`→`Order` and `voucher`→`Coupon` (the
latter so the sub-token exemption is exercised — a state id that IS `coupon`-derived must
not trip the scan). 04 carries `### order` (6-state table, `∅`-row → `placed`) and
`### coupon` (3-state table, `∅`-row → `issued`) + a `<Name>Status` enum each. Static and
stable; no clock/random/engine values.

**Valid 05 directory** (`fixtures/valid-05/`) — `order.scxml` only: root
`<scxml version="1.0" xmlns="…" datamodel="null" initial="placed">`; six basic states ==
the 02 `OrderStatus` values verbatim; one `<transition>` per 04 `order` row with
`event = transform(01 string)` + the `<!-- 01-event: … -->` annotation; `delivered` and
`refunded` as `<final>` (04-terminal); a leading fingerprint block naming all five
upstreams; the `<!-- supersedes: 04-transitions.md#order -->` declaration; `coupon` has
**no** file (it did not pass the gate). A correct, runnable machine.

| Fixture (05) | Upstream | Injected defect | Must fail | Expected status |
|--------------|----------|-----------------|-----------|-----------------|
| `valid-05/` | quintuple | none — minimal correct 05 (order machine, no coupon) | nothing | `pass` |
| `not-emitted-correct/` | **no-gate-passer** quintuple (both entities ≤4 states, no guard/action/parallel) + **no 05 dir** | none — absence is correct | nothing | `pass` (record `gate: not-emitted`) |
| `not-emitted-wrong/` | the standard quintuple (order >4 states) + **no 05 dir** | a gate-passer (`order`) exists but no dir ⇒ missed promotion | M1/M8 (B3) | `fail` |
| `dir-empty/` | quintuple | `05-statecharts/` exists but holds no `.scxml` | M1 (A1) | `fail` |
| `bad-filename.scxml` | quintuple | machine file named `orders.scxml` (not `<TableName>`) | M2 (A2) | `fail` |
| `not-wellformed.scxml` | quintuple | unclosed `<state>` tag (XML malformed) | M3 + M-LOAD (A3) | `malformed` |
| `missing-fingerprint.scxml` | quintuple | fingerprint block absent | M4 (A4) | `fail` |
| `placeholder-fingerprint.scxml` | quintuple | a digest is a placeholder, not 64-hex | M4 (A4) | `fail` |
| `missing-fifth-upstream.scxml` | quintuple | fingerprint block omits `04-transitions.md` | M4 (A4) | `fail` |
| `missing-supersedes.scxml` | quintuple | `<!-- supersedes: … -->` absent | M5 (A5) | `fail` |
| `bad-version.scxml` | quintuple | `<scxml version="2.0" …>` | M6 (A6) | `fail` |
| `bad-xmlns.scxml` | quintuple | wrong `xmlns` | M6 (A6) | `fail` |
| `cond-under-null.scxml` | quintuple | a `cond` present while `datamodel="null"` | M7 (A8) | `fail` |
| `unjustified-promotion/` | a quintuple where `coupon` (3 states, no feature) has a file | promoted ≤4-state machine with no guard/action/parallel | M9 (B1/B2) | `fail` |
| `missed-promotion/` | standard quintuple, but `order` (6 states) absent from 05 (coupon promoted instead) | gate-passer not promoted | M8 (B3) | `fail` |
| `non-lifecycle-promoted/` | quintuple + a `.scxml` for a 04 table with no transition block | non-lifecycle entity promoted | M10 (B5) | `fail` |
| `extra-state.scxml` | quintuple | a basic state not in the 02 `OrderStatus` enum | M11 (C1) | `fail` |
| `missing-state.scxml` | quintuple | a 02 enum value with no basic state | M11 (C1) | `fail` |
| `missing-04-row.scxml` | quintuple | a 04 `order` row with no matching `<transition>` | M12 (C2) | `fail` |
| `contradicting-transition.scxml` | quintuple | a basic `From→To` pair not in 04, **no** `refines:` | M13 (C4) | `fail` |
| `wrong-initial.scxml` | quintuple | `initial="paid"` (not the ∅-row `placed`) — also fails W-INIT | M14 + W-INIT (A7/C3) | `fail` |
| `bad-event-token.scxml` | quintuple | `event="order paid"` (space — illegal token) | M19 (D7) | `fail` |
| `roundtrip-mismatch.scxml` | quintuple | `<!-- 01-event: Order Paid -->` but `event="order_payed"` (transform ≠ attr) | M19 (E4) | `fail` |
| `duplicate-id.scxml` | quintuple | two elements share an `id` | M15 (D2) | `fail` |
| `dangling-target.scxml` | quintuple | a `<transition target="ghost">` to no declared id | M16 (D3) | `fail` |
| `unreachable-state.scxml` | quintuple | a basic state never a target, not initial | M17 (D4) | `fail` |
| `forbidden-synonym.scxml` | quintuple | a comment/`refines:` uses forbidden `purchase` | M20 (E1) | `fail` |
| `restated-04-table.scxml` | quintuple | a comment restates the full 04 `order` table (DRY) | M21 (E2) | `fail` |
| `guard-unverified/` | a guard-justified quintuple (`order` w/ a `cond` approve branch, `datamodel="ecmascript"`) but **no** `.scenarios.json` | guard arm unverified | W-GUARD (B2) | `fail` |
| `negative-walk-broken.scxml` | quintuple | a machine that (via a stray `event="*"` catch-all) **changes** configuration on a disabled event | W-NEG (Rec discard semantics) | `fail` |
| `wrong-reason-trap.scxml` | quintuple | **two** defects — a missing 04 row (C2) AND a forbidden synonym (E1) — proves the negative reports the **M12** reason, not M20 | M12 isolates over M20 | `fail` (reason = M12) |
| `vacuous/` | quintuple | structurally valid 05 but harness fed the `--no-checks` disabled path | n/a | `broken-test` (zero checks) |
| `no-engine/` | quintuple | valid 05 but `node_modules` absent + network blocked | n/a | `broken-test` (missing engine) |
| `valid-05/` | `broken-upstream-04` (a 04 `To` value not in the entity's 02 enum) | 04 transitions self-inconsistent | resolution surfaces it | `fail` (class=`upstream-defect`→04) |
| `valid-05/` | `malformed-upstream-02` (drops `## Forbidden Synonyms`) | 02 unparseable — cannot anchor | n/a | `broken-test` |
| `valid-05/` | `malformed-upstream-04` (drops `## Transition Tables`) | 04 unparseable — cannot anchor | n/a | `broken-test` |

`wrong-reason-trap.scxml` is the explicit doctrine §2 guard: it would "pass for the wrong
reason" under a sloppy negative. The selftest asserts the failing-check ID equals `M12`,
not merely that *some* check failed. The last three rows are **upstream quintuples**: a
well-formed-but-self-inconsistent 04 routes to `fail` + `upstream-defect`→04; an
unparseable upstream routes to `broken-test` (§9).

### 3.5 Manifest

`scripts/fixtures/manifest.json` records, per fixture,
`{files, status, failingCheck, upstreamRoute?, gateRecord?}`. `selftest.mjs` runs the
harness over each entry and asserts the actual tuple equals the manifest — negatives are
proven to fire **for their stated reason**, the not-emitted records are asserted, and the
coverage floor (§5) is asserted true.

### 3.6 The not-emitted design (absence is an assertable outcome — unique to this skill)

This skill is the only pipeline artifact that is **conditional**: when no 04 entity
passes the gate, the correct artifact is **no directory at all**. The harness therefore
treats **absence as a first-class, assertable outcome** — it does NOT skip or error on a
missing dir; it *decides* whether the absence is correct.

The harness invocation passes a `<05-dir>` path that **may not exist**. On a nonexistent
or empty dir, the harness:

1. Reads the upstreams and runs the **gate arithmetic** (M8 — distinct-state count per 04
   lifecycle entity, the mechanical >4-states arm).
2. **If no entity passes the gate** (every lifecycle entity ≤4 states AND — per the
   agent-judged B4 arm, §6 — no guard/action/concurrency need): the absence is
   **CORRECT**. Status `pass`, with a distinguished record `gate: not-emitted` in the
   summary (`{gate: "not-emitted", entitiesEvaluated: N, gatePassers: 0}`). This is a
   **real pass with zero `.scxml` checks** — and it is the *one* sanctioned zero-machine
   pass, justified because the gate arithmetic IS the executed check (it is not vacuous:
   M8 ran over every entity and found none promotable). Proven by `not-emitted-correct/`.
3. **If ≥1 entity passes the >4-states arm** but the dir is absent: the absence is a
   **missed promotion** ⇒ status `fail`, owner check **M8 (B3)**, finding names the
   un-promoted entity. Proven by `not-emitted-wrong/`. The **owner of the not-emitted-wrong
   verdict is the missed-promotion check (M8)** — the same check that catches a present-dir
   missed promotion — so the absence case and the presence case share one owner and one
   reason.

This makes "the directory is correctly absent" a verdict the harness *certifies* (pass +
`gate: not-emitted`) rather than a silent skip, and "the directory is wrongly absent" a
verdict it *fails* (missed promotion) — the two halves of `M1`. The `not-emitted-correct/`
pass is the **only** pass with `counts.machines === 0`, and it is gated on
`gateRecord === "not-emitted"` so it can never be reached by a machine-bearing artifact
whose checks were silently dropped (that path is `broken-test`, §5).

## 4 — Closed assertion grammar (doctrine §2)

The full enumerated check vocabulary. **This grammar is NEVER extended ad hoc.** Adding a
check means editing this section AND `scripts/lib/checks.mjs` in a committed change, and
the new check MUST cite a catalog rule. The harness emits each check's `id`, `class`,
`status`, and `rule` in its JSON summary (§7). **Five** classes — the four B3 classes plus
the engine (walk) class, which is the strongest-oracle layer.

### 4.1 Engine / walk checks (`W` — the machine is RUN on a real SCXML interpreter)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| W-LOAD | every machine loads + `prepare`s on SCION without throw; initial config is a real 02 enum value, never `["$generated-state-0"]`. | D1 |
| W-INIT | `start()` configuration == the entry closure of the 04 `∅`-row `To`. | A7, C3 |
| W-STEP | for each 04 row, after replaying the deterministic prefix to `From`, `gen({name})` yields a configuration **containing** `To`. | C2 |
| W-NEG | firing a disabled event leaves the configuration unchanged and raises no `error.*` (reason-qualified). | D7 (Rec discard semantics) |
| W-GUARD | for each `ecmascript` machine, every shipped data scenario drives the `cond`-selected branch to its `expectConfig`. | B2 (guard arm) |
| W-FINAL | `isFinal()` agrees with top-level `<final>` entry on terminal walks. | C6 |

### 4.2 Resolution checks (`R` — a referenced element exists / maps in its owner)

| ID | Assertion | Catalog rule |
|----|-----------|--------------|
| R-STATES | basic-state set == the entity's 02 enum values (set + verbatim text). | C1 |
| R-ROW | every 04 row resolves to a `<transition>` with matching source/event/target. | C2 |
| R-NOCONTRA | no 04 edge absent; every basic `From→To` pair ∈ 04 or carries `refines:`. | C4 |
| R-EVENT | every transition `event` == `transform(01-event annotation)` and the annotated string ∈ 01 events. | D7, E4 |
| R-INIT | `initial` id == the 04 `∅`-row `To`. | A7, C3 |
| R-SUPERSEDES | the supersedes target names this entity's existing 04 table. | A5 |
| R-TARGET | every transition/initial/history target names a declared id. | D3 |
| R-REACH | every state is reachable (target of a transition or a compound/parallel default). | D4 |

### 4.3 Exact-value / arithmetic checks (`X` — exact counts/values against the derived graph)

| ID | Assertion | Catalog rule / basis |
|----|-----------|----------------------|
| X-GATE | per 04 lifecycle entity, distinct-state count (excl. `∅`); >4 ⇒ must be promoted; ≤4 + no feature ⇒ must NOT be promoted (file-presence reconciled against the count). | B1, B3, B5 |
| X-STATES | each machine's basic-state array **deep-equals** the 02 enum value set (order-insensitive set equality; verbatim text). | C1 |
| X-ID | every `id` unique; `count(distinct ids) === count(ids)`. | D2 |
| X-INITONE | exactly one root `initial` resolution per machine; compound states have exactly one default child. | A6, D5 |
| X-ROUNDTRIP | for every 04-derived transition, `transform(01-event) === event` (string equality). | E4 |
| X-RECON | the executed-check total equals the sum of class counters and equals the reconciliation target (§5); mismatch ⇒ `broken-test`. | §5 |

### 4.4 Reason-qualified-negative checks (`N` — an illegal input is rejected for the *stated* reason)

Named negatives proven by the shipped illegal fixtures (§3.4). Each asserts both that the
defect is rejected AND that the failing-check ID matches the defect's owner rule
(wrong-reason ⇒ `broken-test`). N-IDs map 1:1 to the fixture rows; abbreviated:

| ID | Illegal input | For the reason | Owner check | Catalog rule |
|----|---------------|----------------|-------------|--------------|
| N1 | dir present but empty | no machine for a passer | M1 | A1 |
| N2 | bad filename | not `<TableName>.scxml` | M2 | A2 |
| N3 | not well-formed XML | parser/SCION reject | M3 + W-LOAD | A3 |
| N4 | missing / placeholder / 4th-of-5 fingerprint | fingerprint block invalid | M4 | A4 |
| N5 | missing supersedes | declaration absent | M5 | A5 |
| N6 | bad version / xmlns | root attrs wrong | M6 | A6 |
| N7 | `cond` under null datamodel | datamodel pin violated | M7 | A8 |
| N8 | unjustified promotion | ≤4 states, no feature | M9 | B1/B2 |
| N9 | missed promotion (present dir) | >4-state entity absent | M8 | B3 |
| N10 | **not-emitted-wrong** | gate-passer exists, no dir | M8 | B3 |
| N11 | non-lifecycle promoted | file for a non-lifecycle 04 table | M10 | B5 |
| N12 | extra / missing basic state | state set ≠ 02 enum | M11 + X-STATES | C1 |
| N13 | missing 04 row | row has no transition | M12 + R-ROW | C2 |
| N14 | contradicting transition | new basic pair, no `refines:` | M13 + R-NOCONTRA | C4 |
| N15 | wrong initial | initial ≠ ∅-row | M14 + W-INIT | A7/C3 |
| N16 | bad event token | space in `event` | M19 | D7 |
| N17 | round-trip mismatch | transform(01-event) ≠ event | M19 + X-ROUNDTRIP | E4 |
| N18 | duplicate id | two `id`s collide | M15 + X-ID | D2 |
| N19 | dangling target | target to no declared id | M16 + R-TARGET | D3 |
| N20 | unreachable state | orphan state | M17 + R-REACH | D4 |
| N21 | forbidden synonym | 02 forbidden term used | M20 | E1 |
| N22 | restated 04 table | 04 rows copied into a comment | M21 | E2 |
| N23 | guard arm unverified | `ecmascript` machine, no scenarios | W-GUARD | B2 |
| N24 | negative-walk broken | config changes on disabled event | W-NEG | D7 |
| N25 | upstream-04 self-inconsistency | a `To` not in the 02 enum | §9 route→04 | (upstream) |

### 4.5 Agent-judged checks (`AJ` — see §6; closed verdict schema, never prose)

`AJ1`–`AJ4` enumerated in §6. They run last, only over checks that survived all
mechanical + engine gates, and return enumerated verdicts only. **No ❌ catalog rule is
left to agent judgment** — every ❌ has a mechanical or engine owner above.

## 5 — Coverage floor & reconciliation (B3)

**Element ownership.** The 05 artifact owns four element sets: `machines`, `states`
(basic + wrapper), `transitions`, `annotations` (fingerprint / supersedes / 01-event /
refines). The intake count is:

```
intake = |machines| + Σ|machine.states| + Σ|machine.transitions| + Σ|machine.annotations|
```

The **edge / walk count** the harness must walk (from §3.1 + §3.3):

```
edgesExpected = |lifecycle entities|                       (X-GATE, one per 04 entity)
              + |machines|                                 (R-STATES/X-STATES set-eq)
              + Σ|transition rows|                         (R-ROW / R-EVENT / X-ROUNDTRIP)
              + Σ|machine basic pairs|                     (R-NOCONTRA)
              + |machines|                                 (R-INIT + R-SUPERSEDES, per machine)
              + Σ|states|                                  (R-TARGET / R-REACH / X-ID)
              + WALK: Σ|machines| (W-LOAD + W-INIT)
                    + Σ|transition rows| (W-STEP)
                    + Σ|basic states| (W-NEG)
                    + Σ|guard scenarios| (W-GUARD)
                    + Σ|terminal machines| (W-FINAL)
```

The **walk scenario count** is reported separately in the summary (`counts.engine`) so
the strongest-oracle layer's coverage is visible: a `pass` with `counts.engine.total ===
0` over an artifact that *has* machines is itself a `broken-test` (the engine layer was
skipped). **The one exception is the not-emitted pass** (§3.6): `counts.machines === 0`
AND `gateRecord === "not-emitted"` ⇒ a sanctioned engine-empty pass, because the executed
check is the gate arithmetic (X-GATE over every entity), not zero checks.

**Every owned element exercised ≥1 time.** The harness asserts:
- every `machine` is touched by W-LOAD + W-INIT (run), R-STATES (state set), R-SUPERSEDES;
- every `state` is touched by X-ID, R-TARGET/R-REACH, and — if basic — R-STATES + W-NEG;
- every `transition` is touched by R-ROW/R-EVENT, X-ROUNDTRIP, and W-STEP (run);
- every `annotation` is touched by M4 (fingerprints) / M5 (supersedes) / M19 (01-event) /
  M22 (refines).

**Reconciliation formula (X-RECON — no silently dropped checks):**

```
executedChecks = mechanicalRun + engineRun + resolutionRun + exactValueRun + negativeRun(selftest) + ajRun
reconciled := (edgesWalked === edgesExpected)
           && (executedChecks > 0)
           && (engineRun > 0 when machines > 0)
           && (gateArithmeticRun > 0)            // X-GATE always runs, even on not-emitted
PASS requires reconciled === true
```

If `executedChecks === 0` ⇒ `broken-test` (no vacuous green). If `edgesWalked ≠
edgesExpected` ⇒ a check was silently dropped ⇒ `broken-test`. **If `machines > 0` but
the engine layer ran zero walks ⇒ `broken-test`** (strongest oracle skipped). **The
not-emitted pass requires `gateRecord === "not-emitted"` AND `gateArithmeticRun > 0`** —
so a zero-machine artifact can only pass via the certified gate-arithmetic path, never via
a silently empty run.

**Positive AND negative per claimed behavior.** Every behavior 05 claims is proven by
**≥1 positive** (a passing check over `valid-05/`) AND **≥1 negative** (a shipped illegal
fixture that must fail). Abbreviated mapping (full ❌-reconciliation in the closing table):

| Claimed behavior | Catalog rule | Positive | Negative |
|------------------|--------------|----------|----------|
| Dir present iff gate fires | A1/B1/B3/B5 | M1/X-GATE over `valid-05/` | `dir-empty/`, `not-emitted-wrong/`, `unjustified-promotion/`, `missed-promotion/`, `non-lifecycle-promoted/` |
| Correct not-emission | A1/B3 | `not-emitted-correct/` (pass + `gate: not-emitted`) | `not-emitted-wrong/` |
| Machine loads + runs | D1 | W-LOAD over `valid-05/` | `not-wellformed.scxml` |
| Initial == ∅ row | A7/C3 | W-INIT/R-INIT over `valid-05/` | `wrong-initial.scxml` |
| Every 04 row a transition | C2 | R-ROW/W-STEP over `valid-05/` | `missing-04-row.scxml` |
| No contradiction of 04 | C4 | R-NOCONTRA over `valid-05/` | `contradicting-transition.scxml` |
| Basic states == 02 enum | C1 | R-STATES/X-STATES over `valid-05/` | `extra-state.scxml` / `missing-state.scxml` |
| Disabled event discarded | D7 | W-NEG over `valid-05/` | `negative-walk-broken.scxml` |
| Guard branches verified | B2 | W-GUARD over guarded fixture | `guard-unverified/` |
| Event token + round-trip | D7/E4 | M19/X-ROUNDTRIP over `valid-05/` | `bad-event-token.scxml` / `roundtrip-mismatch.scxml` |
| Fingerprints (all five) | A4 | M4 over `valid-05/` | `missing/placeholder/missing-fifth-upstream.scxml` |
| Supersedes declared | A5 | M5/R-SUPERSEDES over `valid-05/` | `missing-supersedes.scxml` |
| Root version/xmlns | A6 | M6 over `valid-05/` | `bad-version/bad-xmlns.scxml` |
| Datamodel pinned | A8 | M7 over `valid-05/` | `cond-under-null.scxml` |
| id unique | D2 | M15/X-ID over `valid-05/` | `duplicate-id.scxml` |
| Target exists | D3 | M16/R-TARGET over `valid-05/` | `dangling-target.scxml` |
| Reachable states | D4 | M17/R-REACH over `valid-05/` | `unreachable-state.scxml` |
| No forbidden synonym | E1 | M20 over `valid-05/` | `forbidden-synonym.scxml` |
| No restated 04 | E2 | M21 over `valid-05/` | `restated-04-table.scxml` |
| Upstream-04 sound | §9 | `valid-05/` + sound quintuple | `broken-upstream-04` |

`selftest.mjs` FAILS if any catalog-mechanizable behavior lacks both a positive and a
negative entry — the coverage floor is itself asserted.

## 6 — Agent-judged checks (minimal; gate B4 + Harel quality + guard-set coverage; closed verdict schema)

These catalog rules (or rule residues) are **inherently semantic** — they require domain
understanding the mechanical + engine layers cannot supply. Each runs only after
mechanical gates pass and returns an **enumerated verdict** (never prose). The harness
records `{id, verdict, ruleId}`; any verdict other than the rule's pass-verdict is
reported at the catalog severity. **There are no ❌ agent-judged checks** — every ❌ rule
has its ❌ weight carried by a mechanical or engine subset; the agent judges only residue
at its own (⚠️/ℹ️) severity.

**Gate mechanization decision (the load-bearing call for B-theme).** The gate has four
arms — **>4 states OR guards OR transition actions OR concurrency**. The **>4-states arm
is fully mechanical** (X-GATE / M8 — a distinct-state count against 04; missed and
unjustified promotions on this arm are ❌ and blocked mechanically). The **guard / action
/ concurrency arms are NOT mechanically derivable from 04 alone** — whether a ≤4-state
entity's domain (a 03 invariant, an 01 branching event) *implies* a conditional
transition, a transition-time effect, or genuinely orthogonal regions is a judgment. So
the harness mechanizes the state-count arm and leaves the feature-need arms to the agent
(B4, ⚠️). This is honestly disclosed: a ≤4-state entity that *should* have been promoted
for a guard/action/concurrency need cannot be caught mechanically; the agent judges it,
and its `should-promote` verdict is reported as a ⚠️ finding (never a silent miss).

| ID | Catalog rule | Why it cannot be mechanical | Closed verdict schema |
|----|--------------|-----------------------------|------------------------|
| AJ1 | B4 (guard/action/concurrency arms) | whether a ≤4-state entity's 03 invariant / 01 branching event implies a conditional transition, a transition-time effect, or orthogonal regions is a domain judgment 04 alone does not encode (the >4-state arm is mechanical, X-GATE). | `{ correctly-unpromoted \| should-promote-guard \| should-promote-action \| should-promote-concurrency \| ambiguous }` |
| AJ2 | D9 (Harel hierarchy quality) | whether compound nesting adds shared-transition/shared-entry value, or a `<parallel>`'s regions are *genuinely* orthogonal (vs sequential logic masquerading as concurrency), is a modelling judgment the structure does not settle. | `{ hierarchy-meaningful \| gratuitous-nesting \| parallel-genuinely-orthogonal \| parallel-false-concurrency \| ambiguous }` |
| AJ3 | D8 (determinism residue) | whether two same-event transitions with overlapping/both-absent guards are an intended ordered-default vs an accidental ambiguity — the mechanical layer flags the *shape* (same event, overlapping cond), the agent judges intent. | `{ unambiguous \| intended-ordered-default \| accidental-ambiguity \| ambiguous }` |
| AJ4 | B2 (guard-scenario set completeness) | whether the shipped `W-GUARD` scenarios cover every *semantically distinct* guard region (the execution of each scenario is mechanical; only set-completeness is judged). | `{ regions-covered \| region-uncovered \| ambiguous }` |

`ambiguous` is a real verdict (the agent is uncertain); reported as ℹ️, never silently
dropped, never a pass for reconciliation (counts as executed, verdict-recorded). No
agent-judged check may emit free prose in an asserted position. The mechanical
preconditions for AJ1 (the ≤4-state set), AJ2 (the compound/parallel structure), AJ3 (the
same-event/overlapping-cond shape), and AJ4 (the scenario set vs guard count) are computed
by the harness and handed to the agent, so the agent judges only the semantic residue,
never raw structure.

## 7 — Output contract

**stdout** — a single machine-readable JSON object (the summary), stable key order,
`checks[]`/`findings[]` sorted by `id`:

```json
{
  "skill": "statecharts",
  "artifactDir": "specs/05-statecharts/",
  "upstream01": "specs/01-event-storming.md",
  "upstream02": "specs/02-glossary.md",
  "upstream03": "specs/03-aggregates.md",
  "upstream04Dbml": "specs/04-erd.dbml",
  "upstream04Transitions": "specs/04-transitions.md",
  "tooling": { "scionCore": "2.6.24", "scionScxml": "4.3.27", "dbmlCore": "8.2.5", "node": ">=18" },
  "status": "pass | fail | malformed | broken-test",
  "gate": { "record": "emitted | not-emitted", "entitiesEvaluated": 0, "gatePassers": 0 },
  "counts": {
    "intake": { "machines": 0, "states": 0, "transitions": 0, "annotations": 0 },
    "checks": { "mechanical": 0, "engine": 0, "resolution": 0, "exactValue": 0, "negative": 0, "agentJudged": 0, "total": 0 },
    "engine": { "walks": 0, "passed": 0, "total": 0 },
    "edgesWalked": 0,
    "edgesExpected": 0
  },
  "reconciled": true,
  "coverage": { "elementsExercised": 0, "elementsTotal": 0, "behaviorsWithPosAndNeg": 0 },
  "checks": [
    { "id": "M12", "class": "mechanical", "rule": "C2", "status": "pass" },
    { "id": "W-STEP", "class": "engine", "rule": "C2", "status": "pass" },
    { "id": "R-STATES", "class": "resolution", "rule": "C1", "status": "pass" },
    { "id": "AJ1", "class": "agent-judged", "rule": "B4", "verdict": "correctly-unpromoted" }
  ],
  "findings": [
    { "id": "M8", "rule": "B3", "severity": "error", "class": "upstream-defect", "upstream": "04-transitions.md", "detail": "transition To value 'returned' not in OrderStatus enum" }
  ]
}
```

- The `gate` block is **always present**; `record: "not-emitted"` + `status: "pass"` is the
  sanctioned correct-absence verdict (§3.6); `record: "not-emitted"` + a missed-promotion
  finding is the wrong-absence `fail`.
- The optional `class: "upstream-defect"` + `upstream: "<file>"` on a finding routes a
  01/02/03/04-origin defect (§9). It does **not** add a status; the status stays `fail`
  (taxonomy closed).
- **stderr** — human-readable diagnostics only (XML parse throws, SCION load errors, the
  `$generated-state-0` guard trip, per-walk configuration mismatches with the expected vs
  actual config, the wrong-reason trap explanation, the upstream-defect routing note
  naming which file to fix, the missing-engine install command). Never the machine
  summary.
- **Exit codes:** `0` ⇔ `status === "pass"` (incl. the correct not-emitted pass). `1` =
  `fail` (incl. `upstream-defect` and missed/unjustified promotion). `2` = `malformed`
  (a `.scxml` not well-formed / SCION rejects load). `3` = `broken-test` (check threw,
  wrong-reason, reconciliation mismatch, zero checks, unparseable upstream, **or missing
  engine**). The distinct codes let CI separate a wrong 05 (`1`), a malformed machine
  (`2`), and a broken harness/fixture/missing-engine (`3`).
- **Zero parsed checks** (`counts.checks.total === 0`) ⇒ `status: broken-test`, exit `3`
  — **except** the certified not-emitted pass, where `counts.machines === 0` but X-GATE ran
  over every entity (so `total > 0`).

## 8 — Determinism (doctrine §6; engine-value exclusion)

Running a real engine is the determinism risk this skill must manage. In the **null
datamodel** (the pinned default), SCXML configurations are **fully deterministic** — there
is no clock, random, or data computation; the same machine + the same event sequence
yields the same configuration set every run (the probe confirms: byte-identical
`["placed"]→["paid"]→["shipped"]` across runs). The harness asserts configurations
**directly** and keeps every non-deterministic value out of asserted positions:

- **Configurations are asserted as sorted state-id arrays** (set semantics) — never an
  engine-minted value, never an ordering the engine chose by document-order tie-break that
  the harness did not also fix. `<parallel>` configs are asserted by **set membership**
  (W-STEP asserts the target ∈ the config), so sibling-region ordering is irrelevant.
- **No `<send delay>` / wall-clock timing is asserted.** The pinned subset uses no delayed
  `<send>` (the IRP `test576`-style `delay="1s"` failure-catchers are a test idiom, not a
  spec construct); machines are driven by explicit `gen()` calls, so there is no timer race
  and no `setTimeout` in an asserted path. If a machine contained a delayed send, the
  harness would neither advance the clock nor assert the timed event — it asserts only the
  event-driven configuration.
- **Guard data is fixed, never random/clock.** W-GUARD scenarios pin literal data values
  (`amount: 500`), never `Math.random()`/`Date.now()`; the `ecmascript` datamodel is
  seeded deterministically.
- **Fresh Statechart per walk** (one `new core.Statechart(fnModel)` per W-STEP prefix
  replay — §3.3); nothing carries between walks. A re-run over byte-identical inputs is
  **byte-identical output** (stable key order, sorted `checks[]`/`findings[]`, configs as
  sorted id arrays).
- **Pinned engine versions** (`@scion-scxml/core` 2.6.24, `@scion-scxml/scxml` 4.3.27)
  recorded in `tooling`: the transition-selection semantics are version-stable, so the
  asserted configurations do not drift across machines running the locked tree.
- The fingerprint digests are **read from the artifacts** and only shape-checked (M4) — the
  harness never recomputes a sha256 and asserts equality (that would inject a value); it
  checks shape + naming and resolves references against the files actually passed.
- Agent-judged checks (§6) are the only non-mechanical step; they do not feed the
  reconciliation arithmetic and their verdicts are recorded, not invented into counts — so
  the **pass/fail mechanical+engine verdict remains byte-deterministic** regardless of
  agent output.

## 9 — Upstream-defect routing (how a 01/02/03/04 defect is reported without patching around it)

05 is validated *against* five upstreams. The harness **never silently repairs or works
around** a bad upstream — it surfaces the defect and routes it to the file that owns the
fix:

1. **Sound upstreams.** 01/02/03/04 all parse against their pinned formats AND are
   self/mutually consistent **in the ways statecharts can legitimately see**: every 02
   `### <Name>Status` enum has a non-empty value table; every 04 `From`/`To` (≠`∅`) ∈ the
   entity's 02 enum; every 04 `Event` quotes a string the 02 `Derived from event` column
   carries; every 04 lifecycle entity has a `<Name>Status` enum. The 05→0n resolution
   checks run normally; a failure is a **05 defect** → `fail`, ordinary finding.

   **statecharts does not re-verify what an upstream skill single-owns.** Whether a 02
   value's `Derived from event` is a real 01 event is the **glossary** harness's check;
   whether a 04 row's `Event` quotes 01 verbatim is the **erd** harness's check
   (D3/R-TEVENT). statecharts *consumes* those strings (the `01-event` annotation must
   reproduce them) but does not re-litigate their 01 provenance — it checks only the
   05-internal round-trip + the 04→02 cross-edge it can see.

2. **Well-formed but self-inconsistent 04** (`upstream-defect` → 04). 04 parses, but a
   transition `To` value is not in the entity's 02 enum (so a faithful machine would have
   a basic state with no 02 owner), or two 04 rows contradict. A naive reading might blame
   05's extra/missing state. Instead the harness runs a **pre-resolution 04 self-check**
   (every `From`/`To` ∈ the entity's 02 enum; exactly one `∅` row) **before** the 05→04
   checks; on failure the finding is tagged `class: "upstream-defect"`,
   `upstream: "04-transitions.md"`. Status `fail`, exit `1`; the fix routes **upstream to
   the erd artifact**. Proven by `valid-05/` + `broken-upstream-04`.

3. **Well-formed but 02-inconsistent 02** (`upstream-defect` → 02). 02 parses but a
   `### <Name>Status` enum has a blank/duplicate value, or the enum 05's states map to is
   missing a value 04 uses. The harness runs a **02 self-check** (every enum value table
   non-empty, blank-free, no dup) before R-STATES; on failure the finding is tagged
   `upstream: "02-glossary.md"`. Status `fail`, exit `1`; fix routes **upstream to the
   glossary artifact**.

4. **Unparseable 02 / 03 / 04** (`broken-test`, not `upstream-defect`). An upstream does
   not parse against its pinned format (a required heading/table absent — e.g. 02 drops
   `## Forbidden Synonyms` so the M20 scan list cannot be built, or 04 drops
   `## Transition Tables` so the rows cannot be anchored). The harness cannot anchor its
   resolution targets, so it cannot make a trustworthy statement about 05. Status
   `broken-test`, exit `3`, stderr "upstream <file> unparseable." Proven by `valid-05/` +
   `malformed-upstream-02` and `valid-05/` + `malformed-upstream-04`.

The splits are deliberate: `upstream-defect` (cases 2–3) is an actionable content finding
routed to the correct upstream owner while keeping the §2 status set closed; `broken-test`
(case 4) is the harness honestly refusing to emit a verdict it cannot justify. No case
lets the harness paper over an upstream by inferring, substituting, or skipping a missing
element.

---

*This contract mechanizes catalog rules A1–A8 / B1–B5 / C1–C6 / D1–D9 / E1–E4. **Mechanical
/ engine ❌ coverage is complete:** every ❌-severity catalog rule has BOTH (a) a mechanical
or engine owner check and (b) a dedicated negative fixture. The full reconciliation (❌ rule
→ owner check → negative fixture):*

| ❌ rule | Owner check | Negative fixture |
|---|---|---|
| A1 | M1 / X-GATE | `dir-empty/` / `not-emitted-wrong/` |
| A2 | M2 | `bad-filename.scxml` |
| A3 | M3 / W-LOAD | `not-wellformed.scxml` |
| A4 | M4 | `missing/placeholder/missing-fifth-upstream.scxml` |
| A5 | M5 / R-SUPERSEDES | `missing-supersedes.scxml` |
| A6 | M6 / X-INITONE | `bad-version.scxml` / `bad-xmlns.scxml` |
| A7 | M14 / W-INIT / R-INIT | `wrong-initial.scxml` |
| A8 | M7 | `cond-under-null.scxml` |
| B1 | M9 / X-GATE | `unjustified-promotion/` |
| B2 | M9 / W-GUARD | `unjustified-promotion/` / `guard-unverified/` |
| B3 | M8 / X-GATE | `missed-promotion/` / `not-emitted-wrong/` |
| B5 | M10 / X-GATE | `non-lifecycle-promoted/` |
| C1 | M11 / R-STATES / X-STATES | `extra-state.scxml` / `missing-state.scxml` |
| C2 | M12 / R-ROW / W-STEP | `missing-04-row.scxml` |
| C3 | M14 / W-INIT | `wrong-initial.scxml` |
| C4 | M13 / R-NOCONTRA | `contradicting-transition.scxml` |
| D1 | W-LOAD | `not-wellformed.scxml` |
| D2 | M15 / X-ID | `duplicate-id.scxml` |
| D3 | M16 / R-TARGET | `dangling-target.scxml` |
| D4 | M17 / R-REACH | `unreachable-state.scxml` |
| D5 | M18 / X-INITONE | (atomic-with-initial variant) |
| D7 | M19 / W-NEG / X-ROUNDTRIP | `bad-event-token.scxml` / `negative-walk-broken.scxml` |
| E1 | M20 | `forbidden-synonym.scxml` |
| E2 | M21 | `restated-04-table.scxml` |
| E4 | M19 / X-ROUNDTRIP | `roundtrip-mismatch.scxml` |

*(B4 is a ⚠️ gate-arm rule whose **>4-states arm** is mechanical (M8/X-GATE, ❌) and whose
**guard/action/concurrency arms** are agent-judged (§6, AJ1, ⚠️) — disclosed honestly: a
≤4-state feature-need promotion cannot be caught mechanically from 04 alone, so the agent's
`should-promote-*` verdict carries that ⚠️ weight. C5/C6/D6/D8/D9/E3 are ⚠️/ℹ️ rules: each
still carries a mechanical or engine owner (M22/M23-and-W-FINAL/M24/AJ3/AJ2/M25) and, where
a behaviour can fail concretely, a negative fixture. The not-emitted design (§3.6) makes
**absence an assertable outcome**: a correct non-emission is a certified `pass` with
`gate: not-emitted` (owner X-GATE), and a wrong non-emission is a `fail` owned by the
missed-promotion check (M8/B3) — the same owner as a present-dir missed promotion. The
selftest's COVERAGE array asserts the positive+negative floor over the §5 table and fails
if any ❌ rule lacks either side. Agent-judged checks cover only the gate feature-need arms,
Harel hierarchy/concurrency quality, the determinism-intent residue, and guard-set
completeness, with closed verdict schemas. Pass = status `pass` = zero ❌ findings,
reconciled, ≥1 check executed, engine layer non-empty (or the certified not-emitted
record).*
