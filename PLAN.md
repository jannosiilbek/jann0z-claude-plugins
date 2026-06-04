# PLAN — Schema Therapy modelling skills

## Why

Schema Therapy turns a domain description into a chain of validated modelling artifacts: discovery → language → boundaries → data → lifecycle → behavior. Each skill owns exactly one artifact, consumes only the artifacts upstream of it, and never restates their content (DRY). No artifact is emitted before passing the run-time pipeline (Step 2) under the Verification doctrine. The same single-ownership rule governs this document: every requirement has exactly one owning section; all other mentions are pointers.

All skills live in `plugins/schema-therapy/skills/<skill-name>/`.
All artifacts are emitted to a flat `specs/` root: single-file artifacts as `specs/NN-{artifact-name}.{ext}`, multi-file artifacts (05, 06) as a directory `specs/NN-{artifact-name}/`.

## Skills

| # | Skill | Artifact | Input | Position |
|---|-------|----------|-------|----------|
| 1 | `event-storming` | `specs/01-event-storming.md` (events, actors, hotspots, per-aggregate lifecycle skeletons) | domain description | always |
| 2 | `glossary` | `specs/02-glossary.md` (one-concept-one-word terms, owned enums derived from lifecycle skeletons) | 01 | always |
| 3 | `aggregates` | `specs/03-aggregates.md` (aggregate roots, invariants, transactional boundaries) | 01–02 | always |
| 4 | `erd` | `specs/04-erd.dbml` | 02–03 | always |
| 5 | `statecharts` | `specs/05-statecharts/<entity>.scxml` (one machine per document) | 01–04 | conditional per entity — see the statechart gate |
| 6 | `gherkin` | `specs/06-gherkin/*.feature` | 02–04, plus 05 when emitted | always |

**Statechart gate** — `erd` (04) owns a transition table for every entity with a lifecycle. `statecharts` promotes each entity that passes the gate — >4 states, guards, transition actions, or concurrency — into its own SCXML document, declaring inside the 05 document that it supersedes the entity's 04 table; 04 is never edited. When no entity passes the gate, 05 is not emitted and downstream skills consume the 04 transition tables.

## Verification doctrine

Seven principles every created skill MUST implement — enforced per skill in Phase 1, audited suite-wide in Phase 2.

1. **Closed rule catalog** — each skill ships `references/validation-rules.md`: lettered rules (A1, A2, … grouped by theme), each rule machine-shaped as **Detect → Fix → Severity** (`❌ error` / `⚠️ warn` / `ℹ️ info`), every rule citing its source via the skill's `sources/SOURCES.md` index. Pass condition: zero `❌ error` findings. Warns and infos are reported but never block.
2. **Oracle refuses false-green** — each skill ships an executable harness that is the sole pass/fail authority: a closed assertion grammar (never extended ad hoc), a machine-readable summary on stdout (diagnostics on stderr), success exit only on full pass, **zero parsed checks = failure exit** (no vacuous green), and the status taxonomy `pass | fail | malformed | broken-test`. A typo'd negative check reports `broken-test`, never `pass`. Agent judgment is permitted only where the skill's simulation contract marks a check `agent-judged`, and even then it must return a closed verdict schema (enumerated verdicts), never prose.
3. **Oracle selftest** — every harness ships an adversarial selftest: a regression suite proving the oracle catches false-greens (broken negative checks, vacuous passes, conflated counters, leakage between checks). A skill is not done until its selftest passes.
4. **Routed failures** — fixed routing table, applied identically in every skill: `malformed` / `broken-test` → fix the check, not the artifact; content `fail` → fix the artifact per the matching catalog rule; **`upstream-defect`** — the agent's sub-classification of a content `fail` whose artifact cannot pass because an upstream artifact is wrong (the §2 taxonomy stays closed) → STOP, report the defect against the upstream artifact, never patch around it.
5. **Bounded convergence** — every loop (draft↔professor, lint/simulation repair) is bounded at **5 iterations**, per loop, not pooled. On exhaustion: stop and report exactly which checks still fail, the per-iteration history, the leading hypothesis, and the one specific question whose answer unblocks convergence. Never claim success without a clean green harness run after the last change.
6. **Determinism** — simulation fixtures are explicit and stable: no clock values, randomness, or engine-generated values in any asserted position. The harness builds fresh state per run and never persists, so a re-run over identical inputs is byte-deterministic and does **not** count as an iteration — only re-generation after a change does.
7. **Single ownership across the suite** — every concept (term, enum, entity, state, rule) has exactly one owning artifact; downstream artifacts reference it by name and never restate it. An upstream regeneration marks every downstream artifact **stale** until re-verified — staleness is a violation, not a cosmetic note. Per-skill enforcement: run-time pipeline steps 3 and 5; suite-wide enforcement: the drift police (Plugin-level drift police).

## Per-skill creation guideline

Apply both steps to every skill, in order.

### Skill anatomy

Every skill uses this layout (progressive disclosure — `SKILL.md` stays lean and loads each reference only at the stage that needs it):

```
plugins/schema-therapy/skills/<skill-name>/
  SKILL.md                        # lean staged workflow
  sources/                        # validated original specs + SOURCES.md provenance index (Step 1)
  references/validation-rules.md  # the closed rule catalog (contract: doctrine §1)
  references/simulation.md        # the simulation contract (contents: B2–B3)
  scripts/                        # oracle harness + adversarial selftest (doctrine §2/§3); deps self-installing
```

Plugin-level components (owned by Plugin-level drift police):

```
plugins/schema-therapy/agents/drift-police.md   # the drift-police agent
plugins/schema-therapy/scripts/                 # the mechanical suite-drift script
```

`sources/` serves twice: at build time it is the reference set the expert panel distills from; at use time it is the lookup library for the agents running the skill (the professor gate cites passages from it). A skill is fully self-contained — no skill depends on files outside its own directory.

`SOURCES.md` is a pure provenance index — one row per source: title, version/edition, publication status (including completeness for perpetual drafts), publication date, canonical URL, class (gatherable / cite-only / executable), validation date — plus an exclusions section justifying discovered-but-rejected materials (Step 1). Everything distilled from the sources lives in `references/` (B1), never in `sources/`.

**Mechanical intake table** — each `SKILL.md` opens with a table mapping upstream artifact elements → this artifact's elements: element names carried verbatim, content referenced, never copied. The table doubles as the artifact contract that the downstream skill's drift check verifies in reverse.

### Step 1 — Source research (separate context, per skill)

The validated original specifications are each skill's single source of truth and live inside it (`sources/` — Skill anatomy). Each skill's creation begins with a dedicated **deep-research step, executed in its own separate context** (a research subagent), whose sole mandate is to build that skill's grounded source of truth:

1. **Discover** — deep-research the full universe of available materials for the skill's formalism: normative specifications and grammars, canonical texts, current community canon, **and executable materials** (authoritative parsers/validators, reference engines, published test corpora) — B2/B3 need the executable materials as much as B1 needs the documents. The seed table below lists starting points, never a ceiling; the research step must search beyond it and justify in `SOURCES.md` why anything found was excluded.
2. **Gather** — collect every source into `sources/`, classifying each as **gatherable** (full text legally storable: open specs, free PDFs, public repos — store it) or **cite-only** (commercial books: record bibliographic identity, edition, and pointers to authoritative public excerpts — never store full text). The professor gate's lookup library (Skill anatomy) consists of the gatherable set plus the recorded excerpts.
3. **Validate** — confirm against the publisher that each source is the current version/edition (not superseded); record every source in `SOURCES.md`. A perpetual-draft source is admissible when it is the recognized canonical authority for its formalism; record its completeness status in `SOURCES.md`.
4. **Align** — sources within one skill must not contradict each other; where two cover the same concept, record which is authoritative.
5. **Double-check** — re-verify every source is the newest available. No skill is built on unvalidated or stale sources.

Per-skill seeds (starting points for the research step, not exhaustive lists):

| Skill | Specification seeds | Executable-material seeds |
|-------|--------------------|---------------------------|
| `event-storming` | Brandolini, *Introducing EventStorming* (canonical, perpetual draft); eventstorming.com reference material; ddd-crew EventStorming resources | — |
| `glossary` | Evans, *Domain-Driven Design* (Ubiquitous Language chapters, cite-only); Evans, *DDD Reference* (free PDF, gatherable); Fowler, UbiquitousLanguage + BoundedContext bliki | — |
| `aggregates` | Evans, *DDD* (tactical design, cite-only); Evans, *DDD Reference*; Vernon, *Effective Aggregate Design* parts I–III (dddcommunity.org / kalele.io PDFs) | — |
| `erd` | Chen, *The Entity-Relationship Model* (1976); Codd 1970 + Codd 1971 (2NF/3NF); Boyce–Codd 1974 (BCNF); Fagin 1977 (4NF); Kent 1983, *A Simple Guide to Five Normal Forms*; DBML language spec (dbml.dbdiagram.io) | `@dbml/core` parser; PGlite (Postgres) as execution engine |
| `statecharts` | Harel, *Statecharts: A Visual Formalism* (1987); W3C SCXML Recommendation; statecharts.dev glossary; XState docs (implementation target only) | W3C SCXML IRP test suite; SCION interpreter |
| `gherkin` | Official Gherkin reference (cucumber.io); Gherkin grammar from `cucumber/gherkin` repo; cucumber.io *Writing Better Gherkin* | `cucumber/gherkin` reference parsers + `testdata/good` / `testdata/bad` corpora |

### Step 2 — Create the skill with `skill-creator`

Use `skill-creator` to build each skill. Build-time work happens once, inside `skill-creator`; the run-time pipeline is encoded in the created `SKILL.md` and executes on every invocation. Each skill's description must scope triggering to this pipeline — `glossary`, `erd`, and `gherkin` share territory with the napkin plugin.

#### Build-time (once)

- **B1 — Expert panel**: hire relevant agent experts (subagents) whose output is the skill's two reference files, `references/validation-rules.md` and `references/simulation.md`, distilled from the validated sources.
- **B2 — Lint design**: decide the concrete lint checks from the artifact's format and record the tooling (name, version, rationale) in `references/simulation.md`:
   - a **formal-format artifact** (one with a published grammar or schema) must parse/validate under the authoritative parser or validator for that format, and any downstream generation or instantiation that format supports must succeed;
   - a **prose/markdown artifact** gets a structural lint: required sections present, table shapes correct, naming convention enforced, no vague terms.
- **B3 — Simulation design**: the expert panel records in `references/simulation.md`, for this artifact:
   - **a closed fixture/scenario format** — deterministic sample data and scenarios that *exercise* the artifact (cover every relationship, path, and edge the artifact claims), not merely fill it;
   - **a closed assertion grammar** (doctrine §2) with at minimum three check classes: *resolution* (a referenced element exists in its owner), *exact-value* (assert exact counts/values against the deterministic fixtures — no open-ended comparisons), and *reason-qualified negative* (an illegal input is rejected **for the stated reason** — a check that passes for the wrong reason is `broken-test`);
   - **a coverage floor**: every element the artifact owns is exercised ≥1 time; every behavior, constraint, or rule the artifact claims is proven by ≥1 positive AND ≥1 negative check; the executed-check total reconciles against the intake-table element count (no silently dropped checks);
   - **the execution oracle, strongest available**: prefer running the artifact on a real engine of its formalism (a database for a data model, an interpreter for a state machine, a reference parser for a spec language), recorded per B2; where no engine exists, mechanical resolution checks over the closed scenario format; only what remains is `agent-judged`, each such check listed with the reason it cannot be mechanical (verdict schema: doctrine §2);
   - **reuse over invention**: where a proven harness already exists for the artifact's formalism, adapt it into the skill as standalone code — copied, never referenced across plugins.

#### Run-time pipeline (every invocation, encoded in `SKILL.md`)

1. **Draft** — produce the artifact per the intake table and the catalog.
2. **Professor gate** — a maximalist reviewer subagent, **constrained by the catalog**: every finding must cite a rule ID from `references/validation-rules.md` or an exact passage from the validated sources; an uncited finding is discarded. The professor has the catalog in context and the skill's `sources/` available for lookup. Loop draft ↔ professor until zero `❌ error` findings, bounded per doctrine §5.
3. **Lint** — run the checks recorded at B2, plus the mechanical half of the drift check: every upstream-owned name used in the artifact must resolve by exact string match against its owner artifact.
4. **Simulation** — run the harness on the fixtures (design: B3); loop on failures per the routing table (doctrine §4), bounded per doctrine §5.
5. **Final checks** — always run both:
   - **DRY check** — the artifact restates nothing owned by an upstream artifact; it references by name.
   - **Semantic drift check** — an agent verifies that every term, enum, entity, and state used carries its upstream owner's *meaning*, not just its spelling (the mechanical name-resolution half already ran in lint); zero unresolved or stale references.
6. **Emit + report** — write the artifact to its `specs/` path; naming, structure, and section order identical across runs; the artifact carries its upstream fingerprint block (format: Plugin-level drift police). End with a fixed-format report: audit table (rule findings + fixes applied), simulation table (per check: label, assertion, result, notes), coverage line, `Iterations to convergence: N`, artifact path. On non-convergence, report per doctrine §5. Then hand off to the drift police (Plugin-level drift police).

## Plugin-level drift police

The suite-wide enforcement arm of doctrine §7 — a **double assurance** layer: it never replaces per-skill checks, it re-verifies their combined result independently. Two plugin-level components (paths: Skill anatomy):

- **`agents/drift-police.md`** — the agent that runs the audit and drives remediation.
- **plugin `scripts/`** — the mechanical suite-drift script, the sole mechanical authority for cross-artifact checks; it obeys doctrine §2 (machine-readable summary on stdout, no vacuous green, status taxonomy `pass | fail | malformed | broken-test`) and ships its own adversarial selftest per doctrine §3.

**Checks** — over the entire `specs/` tree:

1. *Resolution* — every upstream-owned name used in any artifact resolves by exact string match to exactly one owner; ownership contracts are read from each skill's intake table.
2. *DRY* — no artifact restates content owned by an upstream artifact (doctrine §7).
3. *Staleness* — upstream fingerprint mismatch (below).
4. *Semantic* — agent-judged meaning-drift check across artifact pairs, closed verdict schema per doctrine §2 (mechanical checks 1–3 belong to the script; only this check is the agent's own judgment).

**Upstream fingerprints** — every emitted artifact carries a fingerprint block listing `<upstream-artifact>@sha256:<content-hash>` for each input it consumed. Content hashes, never timestamps — re-emitting over identical inputs stays byte-identical (doctrine §6). The script recomputes each hash; a mismatch is a `stale` finding against the downstream artifact.

**Powers** — report, then remediate: emit a fixed-format alignment report (per finding: check class, artifacts involved, owning skill), route each finding per doctrine §4, then drive re-runs — invoke the owning skill of each stale or defective artifact in pipeline order (1→6), re-running the police after each regeneration until the suite is green, bounded per doctrine §5. `upstream-defect` findings STOP per doctrine §4 — the police never patches around an upstream defect.

**Triggers** — (1) hand-off from every skill's run-time step 6; (2) on demand ("check spec alignment", "is the suite aligned"). The hand-off is an *invocation* of a plugin-level component, not a file dependency — a skill's own pipeline must go green without the police present (Skill anatomy's self-containment rule holds).

## Execution order

1. **Phase 0 — sources**: run Step 1 for all six skills, each in its own separate research context. No skill creation starts until every source set passes Step 1.
2. **Phase 1 — skills**: create the six skills in pipeline order (1→6) — each skill's drift check needs its upstream artifact contract defined first. A skill counts as created only when (a) its harness selftest passes, and (b) it converges end-to-end on the shared sample domain within the doctrine §5 bound.
3. **Phase 2 — suite check**: cross-skill DRY and drift audit — single ownership of every concept across all six artifact contracts, verified by the plugin's drift police (Plugin-level drift police) in its first end-to-end run; consistent `specs/` naming; each skill tested end-to-end on the shared sample domain: **conference ticketing** (orders, tickets, events, venues, refunds — rich lifecycles for 05, an M:N for 04, multi-aggregate transactions for 03).
