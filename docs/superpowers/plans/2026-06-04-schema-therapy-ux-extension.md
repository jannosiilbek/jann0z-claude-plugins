# Schema Therapy 0–10 Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement everything the extended PLAN.md (eleven skills, 0–10) specifies that does not exist yet: five new skills (`impact-map`, `personas`, `task-models`, `ui-flows`, `flow-acceptance`), the `event-storming` retrofit (its input contract gained upstream 00), the resulting stale-cascade re-verification of the sample suite, the drift-police extension, and the orchestrator/docs updates — 100% aligned with PLAN.md and with the conventions of the six built skills.

**Architecture:** Same agent-orchestrated process that built the first six skills, run from the main session: per skill, Phase 0 source research (isolated context) → B1 expert panel (catalog expert, then simulation designer) → implementer (harness + adversarial selftest + fixtures + SKILL.md) → spec-compliance review (execute everything) → fix round → end-to-end convergence run on the shared conference-ticketing sample. Then suite-level work: drift-police extension and the full audit. The controller (you) dispatches each agent with the complete contract inline (agents never read this plan or PLAN.md unless told a specific section), reviews results, and commits per task.

**Tech Stack:** Node ≥18 plain ESM harnesses (zero-dep unless an engine exists); pinned engines per Phase-0 probes; markdown/XML/feature artifacts in `specs/`; git per-task commits on branch `schema-therapy-plan-ux-extension`.

**Spec:** `/Users/janno/Projects/claude-plugins/PLAN.md` (commit `d3a77fc`) is the sole requirements authority. Where this plan pins a detail PLAN.md leaves open (the seams in §S), the pin must be dictated identically to every agent that touches it.

---

## §C — Suite conventions (dictate VERBATIM to every implementer/expert agent)

These are the conventions of the six built skills. Every new/changed component must match them exactly:

1. Layout per skill: `SKILL.md` (lean, <320 lines, staged/progressive disclosure, imperative) + `sources/` (+ `SOURCES.md` provenance index) + `references/validation-rules.md` + `references/simulation.md` + `scripts/` (`harness.mjs`, `selftest.mjs`, `lib/*.mjs`, `fixtures/` + `manifest.json`).
2. Harness: sole pass/fail authority; stdout = stable-ordered machine-readable JSON summary (status, per-check results, counts, coverage/edge reconciliation, findings); stderr = diagnostics; exit codes 0 pass / 1 fail / 2 malformed / 3 broken-test; zero parsed checks ⇒ broken-test (never vacuous green); byte-identical double-runs (no clock/random/engine-generated values in asserted positions; fresh state per run).
3. Check classes: lint (L/M*), resolution (R*), exact-value (X*), reason-qualified negatives (N*, proven by dedicated fixtures), agent-judged (AJ*, non-blocking, closed enumerated verdict schemas, excluded from reconciliation). Closed assertion grammar — never extended ad hoc.
4. Every ❌ catalog rule ends with a mechanical/engine owner check + a dedicated negative fixture; ship the full ❌-rule → owner-check → fixture reconciliation table in `references/simulation.md`, and the selftest's COVERAGE array asserts ≥1 positive + ≥1 negative per ❌ rule.
5. Mandatory fixtures: `valid` (+ a consistent mini upstream set), one owner-pinned negative per ❌ theme, a wrong-reason trap (two co-present defects; manifest pins the owner; selftest proves the owner fires for the stated reason), `vacuous` (⇒ exit 3), broken-upstream variants (⇒ findings `class:"upstream-defect"` with `upstream:"<file>"` naming the defective artifact — a finding class, never a fifth status), malformed-upstream variants (⇒ broken-test).
6. Adversarial selftest: runs every manifest fixture asserting exact status + owner; proves the wrong-reason trap, the vacuous guard, upstream-defect routing to the right file, counter/edge-reconciliation conflation detection, and byte-identical double-runs. Exit 0 only on full pass. Keep runtime < 5 min.
7. Deps: only when an engine exists — `scripts/package.json` + committed `package-lock.json` with EXACT pins (no `^`/`~`); harness self-installs (`npm ci` fallback `npm install --no-audit --no-fund`) when `node_modules` absent; absent + offline ⇒ broken-test with a clear stderr diagnostic. `node_modules` gitignored. Versions echoed in the JSON `tooling` block.
8. Fingerprint blocks (drift-police format): each emitted document opens with the format's comment syntax listing `<input-filename>@sha256:<64-lowercase-hex>` over the exact bytes of every consumed input. Dialects: `.md` → `<!-- fingerprints: ... -->`; `.dbml` → `// fingerprints:` lines; `.scxml`/`.xml` → `<!-- fingerprints: ... -->`; `.feature` → `# fingerprints:` comment lines before `Feature:`.
9. SKILL.md body: (a) mechanical intake table at top (upstream elements → this artifact's elements, names verbatim, content referenced never copied; doubles as the downstream drift-check contract); (b) artifact contract (path(s), pinned section order, fingerprint block); (c) the 6-step run-time pipeline exactly per PLAN.md "Run-time pipeline" (professor gate catalog-constrained, uncited findings discarded, zero ❌, bounded 5 per loop non-pooled; lint = harness incl. exact-string drift half; simulation = harness with routing table — malformed/broken-test→fix the check, fail→fix the artifact per rule, upstream-defect→STOP report against the named upstream; final DRY + semantic-drift checks; emit + fixed-format report with audit table, simulation table, coverage line, `Iterations to convergence: N`, artifact path(s); drift-police handoff as invocation, not file dependency).
10. Description frontmatter: scoped strictly to "step N of the schema-therapy modelling pipeline", naming inputs/outputs, explicitly disclaiming the formalism's general-purpose territory.
11. Self-containment: no skill imports/reads files outside its own directory at runtime; sibling skills are style references only (copy patterns in, never import). Catalog: lettered themed rules, each Detect/Fix/Severity(❌/⚠️/ℹ️)/Source (SOURCES.md-indexed citation or `[PLAN]`-marked, few); honest severities — and a harness check's blocking behavior must match its catalog rule's severity (⚠️ never blocks).
12. ISOLATION DIRECTIVE in every agent prompt: "Do not invoke or read any installed skills or other plugins. Authorities: this prompt + the named files."

## §S — Pinned seams (binding for every panel that touches them)

- **S1 — 00 artifact shape** (`specs/00-impact-map.md`, pinned coarse shape; 00's catalog A-theme refines within it): `## Upstream Fingerprint` (fingerprints the product-intent file) → `## Goal` (one measurable goal statement) → `## Business Actors` table `Actor | Description` → `## Impacts` table `Impact | Business Actor (exact string)` → `## Deliverables` table `Deliverable | Impact (exact string)`. 00 owns all four name sets.
- **S2 — 01 retrofit seam**: (a) actors with `Kind ∈ {person, role, department}` must have names exact-matching a 00 Business Actor; `Kind ∈ {system, automated-process}` are 01-owned (Scope gate). (b) The `## Domain Events` table gains a fifth column `Deliverable (exact 00 string)` — each event names the 00 deliverable it realizes, or `—`. Coverage (mechanical): every 00 deliverable appears ≥1 time in that column; every aggregate has ≥1 skeleton event whose Deliverable ≠ `—` (aggregate→impact is transitive through 00's Deliverable→Impact mapping). (c) 01's fingerprint block lists BOTH `00-impact-map.md` and the domain-description file.
- **S3 — 08→06/07 seam**: each 08 task model is one XML document per persona-job named `<persona>-<job>.xml` (persona = exact 07 persona name, snake_cased; job = snake_cased job name owned by 07). Each leaf task step carries ≥1 exact 06 tag string (from 06's closed grammar: `@invariant:INV-<Agg>-<n>` / `@transition:<entity>` / `@terminal:<entity>` / `@policy:<name>`) in a machine-readable attribute/annotation; the KLM budget is one machine-readable per-document declaration (operator count, integer). 08's panel pins the exact XML dialect (Phase-0 outcome) without breaking these resolvables.
- **S4 — 09 seam**: every ViewContainer/screen has a pinned snake_case `id` (the vocabulary 10 walks); data bindings name 04 tables by exact string; navigation events that fire domain behavior carry the exact 01 event string in a pinned annotation (mirror 05's `<!-- 01-event: ... -->` convention); each 09 document declares which 08 task model(s) it realizes by exact filename.
- **S5 — 10 seam**: one `.feature` per 08 task model; feature-level tag `@task-model:<persona>-<job>` (exact 08 filename stem); steps name screens by exact 09 screen id; each scenario binds outcomes by containing the exact 06 tag string(s) in designated outcome steps; domain assertions are never restated (reference by tag only).
- **S6 — new fingerprint coverage**: 07 fingerprints 00+01; 08 fingerprints 06 (directory: each consumed feature file) + 07; 09 fingerprints 02, 04 (both files), each consumed 05 file, 07, and each consumed 08 file; 10 fingerprints each consumed 06 feature, 08 file, and 09 file.

## §T — Reusable dispatch templates (complete; tasks parameterize them)

- **T-research** (Phase 0, one isolated agent per skill, parallel, background): the verbatim research prompt used for the first six skills — sole mandate Step 1 of PLAN.md; ISOLATION DIRECTIVE; target dir `plugins/schema-therapy/skills/<skill>/sources/`; the five steps Discover/Gather/Validate/Align/Double-check; SOURCES.md = pure provenance index (one row per source: title, version/edition, publication status incl. completeness for perpetual drafts, publication date, canonical URL, class gatherable/cite-only/executable, validation date = today) + Exclusions + Authority-alignment sections, relative links; gatherable full texts stored, cite-only for commercial works, executables pinned with exact versions; report back admitted sources/exclusions/contradictions/concerns. Parameterized by: skill name, artifact description + pipeline position, seed list (from PLAN.md's seeds table row), and any EMPIRICAL PROBE the skill needs (explicitly: install/run the candidate engine in /tmp, record the probe transcript for §0 of simulation.md).
- **T-catalog** (B1 expert A): produce `references/validation-rules.md` only; doctrine §1 quoted verbatim; the skill's artifact + inputs + upstream pinned formats (copied INTO the prompt — self-containment); the relevant §S seams quoted; require a Structure theme that pins the artifact format mechanically, honest severities, ~25–40 rules, `[PLAN]` marking; report themes/counts/3 example rules/grounding difficulties.
- **T-simulation** (B1 expert B): produce `references/simulation.md` only, after reading the catalog; doctrine §2/§6 + B2/B3 quoted verbatim; §C conventions 2–8 quoted; harness invocation pinned (exact flags per task); fixture list incl. §C-5 mandatory set; closed assertion grammar; coverage floor + reconciliation formula; agent-judged minimal with reasons + closed verdicts; the ❌ reconciliation table must be TRUE; §0 probe transcript when an engine candidate exists; report oracle architecture/check counts/fixtures/tensions.
- **T-implementer**: build everything per the two references; §C quoted in full; sibling style references named (read patterns, never import); deliverables = lib + harness + fixtures + manifest + selftest + SKILL.md; RUN selftest to exit 0 and harness on the valid set byte-identically before reporting; report status/selftest tail/valid output/SKILL.md line count/deviations with justification.
- **T-review** (spec-compliance): read every file, EXECUTE selftest + valid + ≥6 owner-pinned negatives + vacuous + upstream-defect + determinism double-run; verify closed grammar ⊆ simulation vocabulary, catalog severity↔blocking match (the C7-class breach check), cross-file consistency, documented deviations are reconciled not silent; verdict ✅/❌ with numbered findings + ⚠️ minors. Findings → dispatch a fix agent with the verbatim findings; re-verify (selftest + spot-run) before proceeding.
- **T-e2e** (creation gate): execute the skill end-to-end on the shared sample; ISOLATION DIRECTIVE; inputs = the named test-workspace files (read-only); no-subagent professor fallback = separate fresh maximalist catalog-only pass; 5-iteration bounds honest; harness sole authority; upstream-defect ⇒ STOP and report (controller triages: artifact defect → owning upstream skill; check defect → fix agent per routing); never modify the skill dir or upstreams; deliver the fixed-format report + final harness JSON + iteration history.

Controller triage rule (proven twice in the 1–6 build): when an e2e STOPs, independently verify whether the blocker is a genuine upstream-artifact defect or an invented/over-strict check in the new skill's harness. A new skill must never demand a stricter upstream shape than the upstream skill's own catalog pins — if it does, that is a check defect: fix the check (and its fixtures must mirror the REAL upstream contract, read from the upstream skill's catalog at build time).

---

### Task 1: Phase 0 — source research for the five new skills

**Files:** Create `plugins/schema-therapy/skills/{impact-map,personas,task-models,ui-flows,flow-acceptance}/sources/**` (+ `SOURCES.md` each)

- [ ] **Step 1:** Dispatch 5 parallel background T-research agents, seeds from PLAN.md rows:
  - `impact-map`: Adzic *Impact Mapping* (2012, cite-only); impactmapping.org; Adzic articles/workshop guides. No executables expected — verify-none.
  - `personas`: Cooper et al. *About Face* 4th ed. (cite-only); goal-directed design essays; NN/g persona methodology. Verify-none executables.
  - `task-models`: Paternò CTT papers + 1999 book (cite-only where commercial); W3C MBUI Task Models Note 2014 (gatherable); Card–Moran–Newell 1983 (cite-only) + 1980 CACM KLM paper. **EMPIRICAL PROBE:** hunt a runnable CTT simulator (CTTE is desktop Java; check npm/pip alternatives); if none is scriptable on Node ≥18, record that finding — the simulation designer will then specify a vendored Rec-faithful CTT-semantics walker (enabling/choice/interleaving over the pinned dialect) + deterministic KLM arithmetic as the oracle, citing the W3C Note's semantics.
  - `ui-flows`: OMG IFML 1.0 spec PDF (omg.org, gatherable); Brambilla & Fraternali 2014 (cite-only); Nielsen 10 heuristics + NN/g task-flow canon (professor sources). **EMPIRICAL PROBE:** IFML XMI tooling on Node (likely none headless) — if none, record it; oracle becomes hand-rolled metamodel-conformance checks over a pinned IFML-XMI subset (the simulation designer pins the subset grammar from the spec).
  - `flow-acceptance`: Gherkin reference + grammar (shared formalism); cucumber.io acceptance-testing guidance; WebDriver/Playwright docs (implementation target only, cite-only). Executable: `@cucumber/gherkin` exact current version + corpora (re-validate version — do NOT assume a prior pin).
- [ ] **Step 2:** Dispatch one T-review-style agent verifying all five SOURCES.md against PLAN.md Step 1 (provenance-only, classes, exclusions, alignment, no unauthorized commercial texts, probe transcripts present for task-models/ui-flows/flow-acceptance). Expect 5/5 ✅; route findings back per agent.
- [ ] **Step 3:** `git add plugins/schema-therapy/skills && git commit -m "feat(schema-therapy): Phase 0 sources for skills 00/07/08/09/10"`

### Task 2: Create the `impact-map` skill (00)

**Files:** Create `plugins/schema-therapy/skills/impact-map/{references/validation-rules.md,references/simulation.md,scripts/**,SKILL.md}`

- [ ] **Step 1:** Dispatch T-catalog. Parameters: artifact `specs/00-impact-map.md` per seam S1 (quote S1 verbatim); input = a free-text product intent; downstream = 01 (actors seam per S2a, deliverables/impacts per S2b — quote) and 07 (personas trace to business actors). Encode Adzic canon: goal is measurable (❌ when not), impacts are actor behavior changes not features, deliverables are options not commitments (⚠️ themes), tree integrity (every deliverable→impact→actor→goal resolves, ❌), no orphan rows, no vague terms.
- [ ] **Step 2:** Dispatch T-simulation. Harness invocation: `node scripts/harness.mjs <00-artifact>` (single input; no upstream artifact — the product-intent file is fingerprint-shape-checked only, like 01's domain file today). Prose/markdown artifact ⇒ structural lint + mechanical tree-resolution checks; zero-dep.
- [ ] **Step 3:** Dispatch T-implementer (style siblings: `event-storming` for the zero-dep md harness pattern).
- [ ] **Step 4:** Run `cd plugins/schema-therapy/skills/impact-map && node scripts/selftest.mjs` → expect `SELFTEST PASS`, exit 0.
- [ ] **Step 5:** Dispatch T-review; route findings to a fix agent; re-run selftest to exit 0.
- [ ] **Step 6:** `git add -A plugins/schema-therapy/skills/impact-map && git commit -m "feat(schema-therapy): impact-map skill (00)"`

### Task 3: Author the product intent + 00 end-to-end gate

**Files:** Create `plugins/schema-therapy/test-workspace/product-intent.md`, `plugins/schema-therapy/test-workspace/specs/00-impact-map.md`

- [ ] **Step 1:** Write `test-workspace/product-intent.md` exactly:

```markdown
# Product intent — Conference Ticketing

> Fixed input for end-to-end testing of the schema-therapy `impact-map` skill
> (PLAN.md Phase 1 creation gate and Phase 2 suite audit). Do not edit between
> runs: specs/00-impact-map.md is derived from this exact text.

We want to grow ticket revenue per event by 20% within a year while cutting
manual back-office handling in half. Organizers should fill events closer to
capacity with less effort; customers should buy, cancel, and get refunded
without contacting support; gate agents should admit attendees faster with
fewer disputes at the door; finance officers should resolve failed refunds
without spreadsheet work. We will deliver online ticket sales with seat
selection, self-service cancellation and refunds under a clear policy,
QR-code door check-in with re-issue for lost tickets, automatic waitlist
offers when capacity frees up, and reschedule notifications with free
cancellation windows.
```

- [ ] **Step 2:** Dispatch T-e2e for `impact-map`: input `test-workspace/product-intent.md`, output `test-workspace/specs/00-impact-map.md`. NOTE in the prompt: the Business Actors it derives must use the domain's natural party names (the intent text deliberately names organizers, customers, gate agents, finance officers — Ticket Holder is a Customer-side role the panel may or may not surface; the 01 retrofit reconciles exact strings later, 01 follows 00).
- [ ] **Step 3:** Verify: harness exit 0 on the emitted artifact; fixed-format report received with `Iterations to convergence: N ≤ 5`.
- [ ] **Step 4:** `git add plugins/schema-therapy/test-workspace && git commit -m "feat(schema-therapy): product intent + converged 00 sample artifact"`

### Task 4: Retrofit `event-storming` (01 consumes 00)

**Files:** Modify `plugins/schema-therapy/skills/event-storming/{references/validation-rules.md,references/simulation.md,SKILL.md,scripts/lib/checks.mjs,scripts/lib/md.mjs,scripts/harness.mjs,scripts/selftest.mjs,scripts/fixtures/**}`

- [ ] **Step 1:** Dispatch a retrofit expert (T-catalog variant, MODIFY not create): read the existing catalog + simulation.md first; add a new lettered theme for the Scope-gate seam per S2 (quote S2 verbatim): actor-name resolution rule (❌, human/org Kinds exact-match a 00 Business Actor; system Kinds 01-owned), Domain Events 5th column `Deliverable (exact 00 string)` (Structure-theme update, ❌ on wrong shape), deliverable-coverage rule (❌, every 00 deliverable ≥1), aggregate-serves-impact rule (❌, transitive via skeleton events), fingerprint rule update (both 00 + domain file). Update simulation.md: invocation becomes `node scripts/harness.mjs <artifact> --upstream-00 <00-artifact>` (domain file still fingerprint-shape-only); new R-checks for the seam; upstream-defect routing to `00-impact-map.md` (00 self-inconsistency: deliverable→impact→actor chain broken); new fixtures (mini `upstream-00.md`, `unknown-business-actor`, `bad-events-columns` updated to 5 columns, `uncovered-deliverable`, `aggregate-serves-nothing`, `broken-upstream-00`, `malformed-upstream-00`); extend the ❌ reconciliation table truthfully.
- [ ] **Step 2:** Dispatch T-implementer (MODIFY): update md.mjs/checks.mjs/harness.mjs/fixtures/selftest per the updated references; update ALL existing fixtures to the 5-column Domain Events shape + upstream-00 pairing; update SKILL.md (intake table gains the 00 rows; artifact contract fingerprints 00 + domain; description mentions consuming 00). Run selftest to exit 0.
- [ ] **Step 3:** Dispatch T-review scoped to the delta + full re-execution (selftest, valid, all negatives, both upstream-defect routes, determinism). Fix round if needed.
- [ ] **Step 4:** `git add -A plugins/schema-therapy/skills/event-storming && git commit -m "feat(schema-therapy): event-storming retrofit — consumes 00 (scope gate)"`

### Task 5: Regenerate 01 + stale cascade re-verification (02–06)

**Files:** Modify `plugins/schema-therapy/test-workspace/specs/{01,02,03,04*,05-statecharts/**,06-gherkin/**}`

- [ ] **Step 1:** Dispatch T-e2e for the retrofitted `event-storming`: inputs `test-workspace/specs/00-impact-map.md` + `test-workspace/domain.md`; output regenerates `specs/01-event-storming.md` (actors reconciled to 00's names; events gain Deliverable column). Expect convergence ≤5.
- [ ] **Step 2:** Doctrine §7: 01 regeneration marks 02–06 stale. Re-run T-e2e for `glossary`, `aggregates`, `erd`, `statecharts`, `gherkin` IN ORDER over the workspace (same inputs as their original runs, now with the new 01/02/… bytes). Each must end green with fresh fingerprints. Content drift is expected ONLY where 01 changed (e.g. actor renames propagate into 02 Terms); anything else routes per doctrine.
- [ ] **Step 3:** Run the existing mechanical audit to confirm the 01–06 chain is internally consistent again: `node plugins/schema-therapy/scripts/suite-drift.mjs plugins/schema-therapy/test-workspace/specs --domain plugins/schema-therapy/test-workspace/domain.md` → expect `status: pass` (the script does not yet know 00/07+; that lands in Task 10 — at this point 00's presence must at minimum not break it; if the script chokes on unknown `00-*`/`07+` files, note it and handle in Task 10, not by deleting artifacts).
- [ ] **Step 4:** `git add plugins/schema-therapy/test-workspace && git commit -m "feat(schema-therapy): regenerate 01 against 00 + stale-cascade re-verification 02-06"`

### Task 6: Create the `personas` skill (07)

**Files:** Create `plugins/schema-therapy/skills/personas/{references/**,scripts/**,SKILL.md}`

- [ ] **Step 1:** T-catalog. Artifact `specs/07-personas.md`; inputs 00–01 (quote S1 + the 01 pinned format incl. the 5-column Domain Events table). Pin in the Structure theme: `## Upstream Fingerprints` (00 + 01) → `## Personas` with one `### <PersonaName>` block per persona, each containing pinned sub-blocks: `**Business actor:**` (exact 00 string), `**Goals:**` (each goal references a 00 impact by exact string), `**Jobs-to-be-done:**` table `Job | Trigger | Outcome` where every Job's Trigger/Outcome reference 01 events by exact string and the Job name is snake_case-able (S3 consumes it). Cooper canon: goal-directed (goals ≠ tasks), persona is specific not elastic, every persona traces to research ground (here: the 00/01 vocabulary — no invented parties, ❌). Coverage: every 00 business actor is covered by ≥1 persona (❌); a persona maps to exactly one business actor (❌).
- [ ] **Step 2:** T-simulation. Invocation `node scripts/harness.mjs <07> --upstream-00 <00> --upstream-01 <01>`; zero-dep md harness; resolution edges: persona→business-actor, goal→impact, job trigger/outcome→01 events; upstream-defect routing to 00 or 01.
- [ ] **Step 3:** T-implementer (style sibling: `glossary` two-input harness → here three files).
- [ ] **Step 4:** `node scripts/selftest.mjs` → exit 0. T-review + fix round.
- [ ] **Step 5:** T-e2e: inputs workspace 00 + 01; output `specs/07-personas.md`. Verify green ≤5 iterations.
- [ ] **Step 6:** `git add -A plugins/schema-therapy/skills/personas plugins/schema-therapy/test-workspace && git commit -m "feat(schema-therapy): personas skill (07) + converged sample artifact"`

### Task 7: Create the `task-models` skill (08)

**Files:** Create `plugins/schema-therapy/skills/task-models/{references/**,scripts/**,SKILL.md}`

- [ ] **Step 1:** T-catalog. Artifact dir `specs/08-task-models/<persona>-<job>.xml`, one per 07 persona-job (bijection, ❌); inputs 06–07 (quote S3 verbatim + 06's tag grammar regexes: `@invariant:INV-[A-Za-z][A-Za-z0-9]*-\d+`, `@transition:[a-z][a-z0-9_]*`, `@terminal:[a-z][a-z0-9_]*`, `@policy:[A-Za-z0-9_-]+`). Themes: Structure (XML dialect per Phase-0 outcome — pinned root, task hierarchy, temporal operators from the CTT set {enabling, choice, interleaving, disabling…} as the panel grounds them in Paternò/W3C; fingerprints per S6); Tag binding (every leaf step ≥1 exact 06 tag that RESOLVES against the 06 suite, ❌; a tag's obligation must exist, ❌); Budget (one integer KLM operator-count declaration per document, ❌ when absent; budget arithmetic = the panel's pinned KLM operator mapping, exact-value); Sequencing sanity (a task model's step order must not contradict the lifecycle order implied by 06's @transition obligations — mechanical subset where derivable, rest AJ); language discipline (02 terms via 06 — no new vocabulary, forbidden-synonym scan).
- [ ] **Step 2:** T-simulation. Invocation `node scripts/harness.mjs <08-dir> --upstream-06 <06-dir> --upstream-07 <07>`; oracle per Phase-0 probe: vendored deterministic CTT-semantics walker (every leaf reachable, temporal-operator legality, ≥1 complete walk per model) + KLM arithmetic (computed operator count == declared budget tolerance 0, exact-value) — or the probed engine if one proved scriptable; reason-qualified negatives incl. `ghost-tag`, `missing-persona-job`, `extra-model-no-job`, `budget-missing`, `budget-mismatch`, `illegal-operator`, `unreachable-leaf`.
- [ ] **Step 3:** T-implementer (style siblings: `statecharts` for the XML-reader + dir-artifact patterns).
- [ ] **Step 4:** Selftest → exit 0. T-review + fix round.
- [ ] **Step 5:** T-e2e: inputs workspace 06 dir + 07; output `specs/08-task-models/`. Expect one model per 07 job; green ≤5.
- [ ] **Step 6:** Commit: `"feat(schema-therapy): task-models skill (08) + converged sample artifacts"`

### Task 8: Create the `ui-flows` skill (09)

**Files:** Create `plugins/schema-therapy/skills/ui-flows/{references/**,scripts/**,SKILL.md}`

- [ ] **Step 1:** T-catalog. Artifact dir `specs/09-ui-flows/<persona>.xml`, one IFML model per 07 persona (bijection ❌); inputs 02, 04 (both files), 05 when emitted, 07–08 (quote S4 verbatim + 04/05 pinned formats + S3). Themes: Structure (pinned IFML-XMI subset grammar per Phase-0 outcome: ViewContainers w/ snake_case ids, ViewComponents w/ DataBinding naming a 04 table exact, Events/Actions w/ `01-event:` annotation, NavigationFlows; fingerprints per S6; `realizes:` declaration naming 08 file(s)); Realization (every referenced 08 task model fully realized: each leaf step maps to ≥1 screen/action, ❌); Budget conformance (KLM count of the realized flow ≤ the 08 budget — Flow-efficiency floor, exact-value ❌); Binding integrity (04 tables exist, 05-else-04 lifecycle authority respected for state-dependent screens, ❌); Heuristics (Nielsen-grounded ⚠️/AJ professor territory: visibility of status, user control, error prevention — catalog-cited for the professor, AJ in harness).
- [ ] **Step 2:** T-simulation. Invocation `node scripts/harness.mjs <09-dir> --upstream-02 <02> --upstream-04-dbml <04.dbml> --upstream-04-transitions <04-transitions.md> --upstream-07 <07> --upstream-08 <08-dir> [--upstream-05 <05-dir>]` (05 optional, mirroring the gherkin skill's authority-switch pattern incl. the 05-claimed-but-absent guard); mechanical XMI-subset reader; KLM arithmetic shared convention with 08 (copy the operator mapping, never import).
- [ ] **Step 3:** T-implementer (style siblings: `gherkin` for optional-05 switching, `statecharts` for XML reading).
- [ ] **Step 4:** Selftest → exit 0. T-review + fix round.
- [ ] **Step 5:** T-e2e: workspace inputs (02, 04 pair, 05 dir, 07, 08 dir); output `specs/09-ui-flows/`. Green ≤5; budgets met.
- [ ] **Step 6:** Commit: `"feat(schema-therapy): ui-flows skill (09) + converged sample artifacts"`

### Task 9: Create the `flow-acceptance` skill (10)

**Files:** Create `plugins/schema-therapy/skills/flow-acceptance/{references/**,scripts/**,SKILL.md}`

- [ ] **Step 1:** T-catalog. Artifact dir `specs/10-flow-acceptance/*.feature`, exactly one feature per 08 task model (bijection ❌ — Acceptance closure quoted verbatim from PLAN.md); inputs 06, 08–09 (quote S5 + S3 + S4). Themes: Structure (parses under the pinned Gherkin parser; `# fingerprints:` per S6; feature tag `@task-model:<persona>-<job>` resolving to an 08 file, ❌); Walk integrity (steps name screens by exact 09 id, in an order navigable per 09's NavigationFlows, ❌); Outcome binding (designated outcome steps contain exact 06 tag strings that resolve, ❌; domain assertions never restated — DRY shape lints, ❌); Gherkin canon (declarative steps; single When per scenario where one action; the screen-walk uses Given/When/Then roles per the panel's grounded convention).
- [ ] **Step 2:** T-simulation. Invocation `node scripts/harness.mjs <10-dir> --upstream-06 <06-dir> --upstream-08 <08-dir> --upstream-09 <09-dir>`; engine = the pinned `@cucumber/gherkin` parse+pickle oracle (copy the gherkin skill's engine pattern, never import; re-pin the Phase-0-validated version); navigability check = mechanical walk over 09's flow graph.
- [ ] **Step 3:** T-implementer (style sibling: `gherkin` — closest harness).
- [ ] **Step 4:** Selftest → exit 0. T-review + fix round.
- [ ] **Step 5:** T-e2e: workspace inputs (06, 08, 09 dirs); output `specs/10-flow-acceptance/`. Green ≤5.
- [ ] **Step 6:** Commit: `"feat(schema-therapy): flow-acceptance skill (10) + converged sample artifacts"`

### Task 10: Extend the drift police (script + agent)

**Files:** Modify `plugins/schema-therapy/scripts/{suite-drift.mjs,selftest.mjs,lib/*.mjs,fixtures/**}`, `plugins/schema-therapy/agents/drift-police.md`

- [ ] **Step 1:** Dispatch an implementer (MODIFY): read the existing script + the five new skills' SKILL.md intake tables; extend `lib/intake.mjs` (parse 11 intake tables), `lib/model.mjs` (read 00/07 md shapes, 08/09 XML dialects, 10 features; new fingerprint dialect coverage incl. `--intent <path>` flag for 00's product-intent fingerprint, honest `skipped` when absent — mirroring `--domain`), `lib/checks.mjs` (new resolution families: 01→00 actors/deliverables, 07→00/01, 08→06 tags + 07 jobs, 09→04/05/07/08 + screen-id vocabulary, 10→06/08/09; new DRY shapes: 00-shaped tables downstream, persona blocks downstream, restated budgets), `lib/staleness.mjs` (recompute all S6 fingerprints). Extend fixtures (good mini-suite grows to 0–10; per-new-check-class negatives; stale/malformed variants for each new artifact) + manifest + selftest. §C-2/3/5/6 hold unchanged.
- [ ] **Step 2:** `cd plugins/schema-therapy/scripts && node selftest.mjs` → exit 0.
- [ ] **Step 3:** Update `agents/drift-police.md`: semantic pairs extended (00↔01, 00/01↔07, 06/07↔08, 08↔09, 06/09↔10), remediation registry 0→10 with the five new owning skills, invocation reference gains `--intent`; scope notes updated (statechart-gate note stays; add: KLM-budget conformance is owned by the 09 harness — route suspicion, don't re-judge).
- [ ] **Step 4:** T-review over the script delta (execute selftest, the good suite, ≥5 negatives incl. one per new artifact family, vacuous, determinism). Fix round.
- [ ] **Step 5:** Commit: `"feat(schema-therapy): drift police extended to the 0-10 suite"`

### Task 11: Full suite audit (Phase 2 gate)

- [ ] **Step 1:** `node plugins/schema-therapy/scripts/suite-drift.mjs plugins/schema-therapy/test-workspace/specs --domain plugins/schema-therapy/test-workspace/domain.md --intent plugins/schema-therapy/test-workspace/product-intent.md` → expect `status: pass`, checks > 0, reconciled, byte-identical double-run.
- [ ] **Step 2:** Dispatch the drift-police agent procedure (one agent following `agents/drift-police.md`) for the first full 0–10 audit incl. the extended semantic pairs (≥40 sampled elements). Expect ALIGNED; route findings per its report otherwise (bounded, pipeline order).
- [ ] **Step 3:** Commit: `"feat(schema-therapy): first 0-10 suite audit — ALIGNED"`

### Task 12: Orchestrator + docs

**Files:** Modify `plugins/schema-therapy/commands/pipeline.md`, `plugins/schema-therapy/README.md`

- [ ] **Step 1:** `commands/pipeline.md`: input resolution gains the product intent (`$ARGUMENTS` = intent + domain, file paths preferred; inline prose written to `product-intent.md` / `domain.md` for stable fingerprint bytes); steps table becomes 0→10 (rows mirror PLAN.md's Skills table: 0 impact-map … 10 flow-acceptance, 05 conditional note unchanged, 09's 05-when-emitted authority note, 10 terminal); stop conditions + audit + summary sections unchanged in semantics.
- [ ] **Step 2:** `README.md`: skills table gains the five rows with artifact paths; Usage examples updated (`/schema-therapy:pipeline product-intent.md domain.md`); chain sentence updated to the eleven-word ladder.
- [ ] **Step 3:** Dispatch `plugin-dev:plugin-validator` over the plugin → expect PASS (11 skills, 1 agent, 1 command).
- [ ] **Step 4:** Commit: `"feat(schema-therapy): pipeline command + README extended to 0-10"`

### Task 13: Final verification + handoff

- [ ] **Step 1:** Run all selftests fresh: for each of the 11 skills `node scripts/selftest.mjs` (in-skill cwd) + the plugin `scripts/selftest.mjs` → 12/12 green.
- [ ] **Step 2:** Re-run the Task 11 audit command once more → pass, byte-identical.
- [ ] **Step 3:** Confirm working tree committed; report the per-task results table (skill | selftest assertions | e2e iterations | status) and offer merge options per superpowers:finishing-a-development-branch.

---

## Self-review checklist (run before execution)

- Spec coverage: PLAN.md Skills rows 0,7,8,9,10 → Tasks 2,6,7,8,9. Row 1's new input → Task 4–5. Scope gate → Tasks 2/4 catalogs + Task 10 resolution. Flow-efficiency floor → Tasks 7 (budget ownership) + 8 (conformance). Acceptance closure → Task 9. Phase 0 → Task 1. Phase 1 order 0→10 → task ordering. Phase 2 → Tasks 10–11. Doctrine §1–§7 → §C dictation + per-task gates. ✓
- Every agent prompt content is specified by template + parameters; no "TBD". ✓
- Seam strings (S1–S6) used identically across Tasks 2,4,6,7,8,9,10. ✓
