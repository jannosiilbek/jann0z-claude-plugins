# `task-models` — validation rules

Closed rule catalog for artifact **`specs/08-task-models/<persona>-<job>.xml`** — one
ConcurTaskTrees (CTT) task model per persona-job, carrying a hierarchical task tree,
CTT temporal operators, per-leaf KLM operator strings, and a per-job KLM efficiency
budget. Artifact 8 of the 11-skill pipeline.

This catalog is **closed**: every accepted/rejected property of an `08` document is one
of the lettered rules below. Each rule is machine-shaped **Detect → Fix → Severity → Source**.
Sources cite `../sources/SOURCES.md` rows (W3C Note 2014 = format; Paternò = CTT semantics;
Kieras = KLM operator table; the recorded naming + M-placement rulings).

**Pass condition: zero ❌.** ⚠️ are agent-judged advisories the author should resolve or
justify; ℹ️ are informational.

Severities: ❌ blocking · ⚠️ advisory (agent-judged) · ℹ️ informational.

---

## The pinned XML dialect (load-bearing)

`08` documents are a **minimal, mechanically-lintable XML dialect grounded in the W3C
Task Models Note (2014) meta-model**. The Note's XML Schema nests operators as elements;
this dialect instead pins the temporal operator as an **attribute on the parent task**
(`operator="…"`), because a flat per-parent attribute is trivially lintable and the parent
task already groups its `2..N` children — the same relation the Note models as
`Composition(Task→Task, associated-with N-aryOperator)`. The operator **vocabulary** is the
Note's element-name set verbatim (per the SOURCES naming ruling). Unary operators (iteration,
optionality) are pinned as boolean-ish attributes on the task they wrap.

### Pinned document shape (full example)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- fingerprints:
       specs/06-gherkin/account.feature        sha256:3f9a…c1
       specs/06-gherkin/transfer.feature        sha256:b27d…90
       specs/07-personas.md                     sha256:11ef…aa
-->
<TaskModel id="accountholder-transfer_funds"
           persona="AccountHolder"
           job="transfer_funds">
  <Budget klm="14"/>
  <Task id="transfer-funds" category="abstract" operator="enabling">
    <Task id="choose-account" category="abstract" operator="choice">
      <Task id="pick-checking" category="interaction"
            scenario-tags="@transition:select_source_account"
            klm="MPBB"/>
      <Task id="pick-savings" category="interaction"
            scenario-tags="@transition:select_source_account"
            klm="MPBB"/>
    </Task>
    <Task id="enter-amount" category="interaction"
          scenario-tags="@transition:enter_amount @invariant:INV-Amount-1"
          klm="MH4K"/>
    <Task id="confirm-transfer" category="interaction"
          scenario-tags="@transition:confirm_transfer @terminal:transfer_posted"
          klm="MBB"/>
    <Task id="post-ledger-entry" category="system"
          scenario-tags="@policy:double-entry-ledger"
          klm="W"/>
  </Task>
</TaskModel>
```

### Pinned closed sets

**Task categories** (W3C Note, `category` attribute) — exactly: `abstract`, `user`,
`interaction`, `system`. (Note §"Task Categories": user=internal cognitive; system=performed
by the application; interaction=user↔system; abstract=decomposes into >1 category.)

**Temporal operators** (`operator` attribute, N-ary, parent with ≥2 children) — exactly the
W3C-Note element-name set, lower-camel:
`enabling`, `sequentialEnablingInfo`, `choice`, `interleaving`, `synchronization`,
`parallelism`, `orderIndependence`, `disabling`, `suspendResume`.

**Unary operators** (attributes on a single task) — `iterative="true"` (or `iterative="N"`
for finite count) and `optional="true"`. These wrap one task; they are **not** `operator=`
values.

**KLM operator alphabet** (`klm` attribute, per leaf) — the spec-level subset of the Kieras
table: `K`, `P`, `B`, `BB`, `H`, `M`, `W`. A `klm` string is a concatenation of these tokens
(two-letter `BB` is one token; a leading integer multiplier is allowed only immediately before
`K`, meaning "n keystrokes", e.g. `4K`). `T(n)` is expressed as `nK`. The fixed durations are
K=.28, P=1.1, B=.1, BB=.2, H=.4, M=1.2, W=measured — but the **budget counts operator
instances, not seconds** (see budget arithmetic).

**Fixed M-placement convention** (codified per the SOURCES determinism caveat, from Kieras'
heuristics): **exactly one `M` is placed at the start of every leaf task that bears a decision
or a chunk retrieval — operationally, every `interaction` and `user` leaf carries exactly one
leading `M`; `system` leaves carry no `M`** (they are application acts, not human cognition).
No other M's are inserted. This makes M-count a pure function of the tree, hence reproducible.

**Budget arithmetic** (pinned): `Budget.klm` = the integer **count of KLM operator instances**
summed over the leaves on the **nominal path**. The nominal path is the single happy-path walk
of the tree under the operators: follow every `enabling`/`sequentialEnablingInfo`/`interleaving`/
`orderIndependence`/`synchronization`/`parallelism` child (all of them — they all execute), and
for every `choice` take **exactly the first child in document order**; `disabling` and
`suspendResume` count the left (primary) task; `optional="true"` leaves are **excluded** from
the nominal path; an `iterative` task counts its leaves **once**. For each nominal-path leaf,
count the operator tokens in its `klm` string (`BB`=1 token, `4K`=4 tokens, `W`=1 token). The
declared `<Budget klm>` must equal this computed integer. (Kieras/CMN: KLM total is the simple
sum of operators along the expert error-free sequence; we count instances so the budget is a
deterministic integer `09` can be measured against.)

---

## Theme index

| # | Theme | Rules | Blocking (❌) |
|---|---|---|---|
| A | Document structure & dialect | A1–A9 | A1–A8 |
| B | Hierarchy canon (Paternò/Note) | B1–B7 | B1,B2,B4,B5,B6 |
| C | Operator legality | C1–C6 | C1,C2,C3,C4 |
| D | KLM & budget | D1–D8 | D1,D2,D3,D4,D5,D7 |
| E | Seam: 06/07 bijection & references | E1–E7 | E1,E2,E3,E4,E5 |
| F | DRY / language | F1–F4 | F1,F2 |

Total: **41 rules**, 30 blocking. `[PLAN]` marks rules that encode a cross-artifact contract
from the pipeline plan (PLAN.md / build prompt).

---

## Theme A — Document structure & dialect

### A1 — Well-formed XML with declaration
- **Detect:** File does not parse as XML, or lacks the `<?xml version="1.0" encoding="UTF-8"?>` declaration as its first line.
- **Fix:** Emit the declaration; ensure every tag is balanced and attribute-quoted.
- **Severity:** ❌
- **Source:** W3C Note 2014 (XML interchange format) — SOURCES §"Authority alignment" #2.

### A2 — Fingerprint comment block present and complete
- **Detect:** Missing the leading `<!-- fingerprints: … -->` comment, OR it omits any consumed `06` `.feature` file, OR omits `specs/07-personas.md`, OR any entry lacks a `sha256:` token.
- **Fix:** List every consumed input (each `06` feature file used by this model + `07-personas.md`) with its sha256, one per line, inside the comment.
- **Severity:** ❌
- **Source:** Pipeline single-ownership / regeneration contract — SOURCES §"Probe" (vendored-walker determinism). `[PLAN]`

### A3 — Root element is `TaskModel` with required attributes
- **Detect:** Root is not `<TaskModel>`, or is missing any of `id`, `persona`, `job`.
- **Fix:** Use `<TaskModel id="<persona>-<job>" persona="<exact 07 name>" job="<exact 07 job>">`.
- **Severity:** ❌
- **Source:** W3C Note 2014 meta-model (root Task Model) + dialect pin.

### A4 — `id` attribute is the canonical persona-job slug
- **Detect:** `TaskModel/@id` ≠ `<snake(persona)>-<snake(job)>` matching the filename stem.
- **Fix:** Set `id` to the filename stem (`<persona>-<job>`).
- **Severity:** ❌
- **Source:** Build prompt artifact key (`<persona>-<job>.xml`). `[PLAN]`

### A5 — Exactly one `<Budget>` element
- **Detect:** Zero `<Budget>` elements, or more than one, or `<Budget>` lacks an integer `klm` attribute.
- **Fix:** Place exactly one `<Budget klm="<integer>"/>` as the first child of `<TaskModel>`.
- **Severity:** ❌
- **Source:** Build prompt (Budget absent = ❌); Flow-efficiency floor. `[PLAN]`

### A6 — Exactly one root `<Task>` tree
- **Detect:** `<TaskModel>` has zero or more than one child `<Task>` (after `<Budget>`).
- **Fix:** Model the whole job as a single root `<Task>` (the job itself).
- **Severity:** ❌
- **Source:** W3C Note 2014 (one task tree per model) — SOURCES §"CTT temporal operators".

### A7 — Every `<Task>` has a unique `id` and a legal `category`
- **Detect:** A `<Task>` lacks `id`; or two tasks share an `id`; or `category` ∉ {`abstract`,`user`,`interaction`,`system`}.
- **Fix:** Give every task a document-unique `id` and one of the four Note categories.
- **Severity:** ❌
- **Source:** W3C Note 2014 §"Task Categories" (User/System/Interaction/Abstract). 

### A8 — No unknown elements or attributes
- **Detect:** Any element other than `TaskModel`/`Budget`/`Task`; or any attribute on `<Task>` outside {`id`,`category`,`operator`,`scenario-tags`,`klm`,`iterative`,`optional`}.
- **Fix:** Remove or re-express invented vocabulary within the pinned dialect.
- **Severity:** ❌
- **Source:** Dialect closure (minimal lintable subset of the Note Schema).

### A9 — Root task category is `abstract` for non-trivial jobs
- **Detect:** Root `<Task>` has children but `category` ≠ `abstract`.
- **Fix:** A decomposed job root is an abstract task; set `category="abstract"`.
- **Severity:** ⚠️
- **Source:** W3C Note 2014 (abstract = task decomposing into sub-tasks of mixed category).

---

## Theme B — Hierarchy canon

### B1 — Leaf tasks are never `abstract`
- **Detect:** A `<Task>` with no child `<Task>` has `category="abstract"`.
- **Fix:** A leaf must be `interaction`, `system`, or `user`; either decompose it or recategorise.
- **Severity:** ❌
- **Source:** W3C Note 2014 / Paternò 2004 — abstract = decomposition node, never a leaf.

### B2 — Abstract tasks have ≥2 children
- **Detect:** A `category="abstract"` task has exactly one child `<Task>`.
- **Fix:** A single-child decomposition is meaningless; add the sibling task(s) or collapse the abstract node.
- **Severity:** ❌
- **Source:** Paternò 2004 §decomposition; W3C Note (N-ary composition is `2..N`). 

### B3 — Non-trivial jobs decompose ≥2 levels
- **Detect:** Root task's children are all leaves AND the job's `06` feature has >1 scenario (non-trivial).
- **Fix:** Introduce an intermediate abstract grouping so the tree is ≥2 levels deep.
- **Severity:** ⚠️
- **Source:** Paternò 2004 (hierarchical refinement) — SOURCES §"Authority alignment" #1.

### B4 — Every task is reachable from the root
- **Detect:** A `<Task>` is not nested (directly or transitively) under the single root task.
- **Fix:** Re-parent orphan tasks into the tree.
- **Severity:** ❌
- **Source:** W3C Note 2014 (single rooted tree).

### B5 — Leaf categories are restricted to the leaf set
- **Detect:** A leaf `<Task>` has `category` ∉ {`interaction`,`system`,`user`}.
- **Fix:** Set the leaf to one of the three executable categories.
- **Severity:** ❌
- **Source:** W3C Note 2014 §"Task Categories". (Companion to B1.)

### B6 — The job terminates (no unbounded root iteration)
- **Detect:** The ROOT `<Task>` carries `iterative="true"` (or a numeric `iterative="N"`) — an unboundedly iterative job loop. (A tree-structured input cannot express a containment cycle — the reader builds a strict tree — so the constructible non-termination smell is an iteratively-unbounded root, not a graph cycle.)
- **Fix:** Remove `iterative` from the root task. The root task **is** the job (A6: one root `<Task>` per model = the job itself); a job with no terminating nominal path is non-terminating. Express iteration on an *inner* sub-task instead, where the loop is bounded by its parent's operator.
- **Severity:** ❌
- **Source:** Paternò 2004 (CTT is a tree; the root task is the whole job) — and the Note's nominal-path termination requirement (an unboundedly iterative job has no terminating happy path). `[PLAN]`

### B7 — Abstract decomposition mixes or refines, not relabels
- **Detect:** An abstract task's children are a single category trivially renaming the parent (advisory heuristic).
- **Fix:** Ensure decomposition adds task-analytic detail (sub-steps), not a synonym layer.
- **Severity:** ℹ️
- **Source:** Paternò 2004 (refinement adds detail).

---

## Theme C — Operator legality

### C1 — `operator` only on tasks with ≥2 children
- **Detect:** A `<Task>` carries `operator=` but has fewer than 2 child `<Task>` elements.
- **Fix:** N-ary temporal operators require `2..N` subtasks; remove the operator or add children.
- **Severity:** ❌
- **Source:** W3C Note 2014 ("N-ary operator relationship is associated to 2..N subtasks").

### C2 — Parents of ≥2 children carry an `operator`
- **Detect:** A `<Task>` with ≥2 child `<Task>` elements lacks an `operator` attribute.
- **Fix:** Every multi-child task must declare how its children compose temporally.
- **Severity:** ❌
- **Source:** W3C Note 2014 (composition is always operator-associated).

### C3 — `operator` value is in the pinned set
- **Detect:** `operator` ∉ {`enabling`,`sequentialEnablingInfo`,`choice`,`interleaving`,`synchronization`,`parallelism`,`orderIndependence`,`disabling`,`suspendResume`}.
- **Fix:** Use a W3C-Note operator name (the recorded canonical surface vocabulary).
- **Severity:** ❌
- **Source:** W3C Note 2014 operator elements + SOURCES naming ruling.

### C4 — Unary operators are attributes, not `operator` values
- **Detect:** `operator="iterative"` / `"optional"` (or any unary name) used as an N-ary `operator`; OR `iterative`/`optional` attribute value not in {`true`,`false`,integer (iterative only)}.
- **Fix:** Express iteration/optionality as `iterative="true"`/`iterative="N"` / `optional="true"` on the single task.
- **Severity:** ❌
- **Source:** W3C Note 2014 ("iteration and optionality … are both unary").

### C5 — Order-bearing operators imply meaningful child order
- **Detect:** `operator` ∈ {`enabling`,`sequentialEnablingInfo`,`disabling`,`suspendResume`} but child order looks arbitrary vs the `06` `@transition` sequence (agent-judged).
- **Fix:** Order children to match the behavioral sequence the operator encodes (these operators are non-commutative).
- **Severity:** ⚠️
- **Source:** W3C Note 2014 ("associative and commutative except for disabling, suspend-resume, and enabling").

### C6 — `synchronization`/`parallelism`/`interleaving` are justified concurrency
- **Detect:** A concurrent-family operator is used where the `06` scenarios imply strict sequencing (advisory).
- **Fix:** Prefer `enabling` unless the behaviors are genuinely concurrent/independent.
- **Severity:** ℹ️
- **Source:** Paternò 2004 (operator selection semantics).

---

## Theme D — KLM & budget

### D1 — Every leaf carries a `klm` attribute
- **Detect:** A leaf `<Task>` (interaction/system/user) lacks `klm`.
- **Fix:** Add the leaf's KLM operator string.
- **Severity:** ❌
- **Source:** Kieras KLM table — SOURCES §"KLM operator table". `[PLAN]`

### D2 — `klm` string is over the closed alphabet
- **Detect:** A `klm` string contains a token outside {`K`,`P`,`B`,`BB`,`H`,`M`,`W`} (ignoring a leading integer before `K`).
- **Fix:** Re-express using only the pinned KLM operators; spell `T(n)` as `nK`.
- **Severity:** ❌
- **Source:** Kieras KLM table + SOURCES naming ruling (W not R). `[PLAN]`

### D3 — Non-leaf tasks carry no `klm`
- **Detect:** A `<Task>` with children has a `klm` attribute.
- **Fix:** KLM operators belong only to leaf (executable) tasks; remove it from abstract nodes.
- **Severity:** ❌
- **Source:** Kieras KLM (operators are atomic actions) — dialect pin.

### D4 — M-placement matches the fixed convention
- **Detect:** An `interaction`/`user` leaf's `klm` does **not** begin with exactly one `M`; OR contains more than one `M`; OR a `system` leaf contains any `M`.
- **Fix:** Apply the pinned convention — one leading `M` on every interaction/user leaf, zero `M` on system leaves.
- **Severity:** ❌
- **Source:** SOURCES §"KLM operator table" determinism caveat (fixed M-placement). `[PLAN]`

### D5 — Declared budget equals computed budget
- **Detect:** `<Budget klm>` ≠ the operator-instance count along the nominal path (per the pinned arithmetic).
- **Fix:** Recompute the nominal-path sum (all enabling/concurrent children; first child of each `choice`; left of disabling/suspendResume; skip `optional`; iterative counted once) and set `Budget.klm` to it.
- **Severity:** ❌
- **Source:** CMN 1980 / Kieras (KLM = sum of operators on the expert sequence); Flow-efficiency floor. `[PLAN]`

### D6 — System-task `W` is acknowledged as measured/unbudgeted-time
- **Detect:** A `system` leaf uses `W` but the model treats its wait as a human-effort cost (advisory).
- **Fix:** `W` counts as one operator instance for budget parity but represents system response time, not user effort; ensure that's intended.
- **Severity:** ⚠️
- **Source:** Kieras (W = wait, must be measured; "R" in CMN) — SOURCES naming ruling.

### D7 — `nK` multiplier is a positive integer
- **Detect:** A `klm` token has a non-integer or zero/negative multiplier, or a multiplier on a token other than `K`.
- **Fix:** Only `K` may carry a leading positive-integer multiplier (`T(n)=nK`).
- **Severity:** ❌
- **Source:** Kieras KLM table (`T(n) = n × K`).

### D8 — Budget is plausibly tight, not padded
- **Detect:** Budget contains operators for leaves clearly off the nominal happy path (advisory; complements D5's exactness).
- **Fix:** Confirm only nominal-path leaves contributed; padding inflates the `09` allowance.
- **Severity:** ℹ️
- **Source:** Flow-efficiency floor (budget is the `09` ceiling). `[PLAN]`

---

## Theme E — Seam: 06/07 bijection & references

### E1 — File ↔ 07 persona-job bijection
- **Detect:** The set of `08` files ≠ the set of `(persona, job)` pairs in `07-personas.md` (a file with no matching 07 job, or a 07 job with no file).
- **Fix:** Emit exactly one file per `07` persona × jobs-to-be-done row; none extra, none missing.
- **Severity:** ❌
- **Source:** Build prompt (07 owns persona+job names; one model per persona-job). `[PLAN]`

### E2 — `persona`/`job` attributes exact-match 07
- **Detect:** `TaskModel/@persona` is not a verbatim `07` `### <PersonaName>` (PascalCase); OR `@job` is not a verbatim `07` jobs-to-be-done Job cell.
- **Fix:** Copy the exact `07` strings; the filename slug is derived, but the attributes are verbatim.
- **Severity:** ❌
- **Source:** 07 upstream contract (07 owns names) — SOURCES seam. `[PLAN]`

### E3 — Every leaf has ≥1 `scenario-tags` entry
- **Detect:** A leaf `<Task>` lacks `scenario-tags`, or it is empty.
- **Fix:** Reference at least one `06` scenario tag the leaf sequences.
- **Severity:** ❌
- **Source:** Flow-efficiency floor ("every 08 task step references the 06 scenario(s) it sequences by tag"). `[PLAN]`

### E4 — Every `scenario-tags` token resolves against the 06 suite
- **Detect:** A `scenario-tags` token is not a tag actually present on a scenario in the consumed `06` `.feature` files.
- **Fix:** Use only tags that exist; fix typos; regenerate if `06` changed (then refresh fingerprints).
- **Severity:** ❌
- **Source:** 06 upstream contract (06 owns the addressable tag vocabulary). `[PLAN]`

### E5 — `scenario-tags` tokens match the 06 closed tag grammar
- **Detect:** A token does not match one of `@invariant:INV-[A-Za-z][A-Za-z0-9]*-\d+` / `@transition:[a-z][a-z0-9_]*` / `@terminal:[a-z][a-z0-9_]*` / `@policy:[A-Za-z0-9_-]+`.
- **Fix:** Re-express the reference using the closed `06` tag grammar.
- **Severity:** ❌
- **Source:** 06 upstream contract (closed source-tag grammar). `[PLAN]`

### E6 — Operator/tag alignment with 06 obligations
- **Detect:** A subtree sequenced by `@transition` tags uses a non-enabling operator where 06 implies a transition order; or a `@terminal` leaf is not at/under a `disabling` or end-of-`enabling` position (agent-judged).
- **Fix:** Align temporal structure with the `06` transition/terminal semantics (`@transition`→enabling/sequentialEnablingInfo; `@terminal`→disabling target or terminal leaf).
- **Severity:** ⚠️
- **Source:** SOURCES §"Maps onto the gherkin scenario tags". `[PLAN]`

### E7 — Every consumed 06 feature is fingerprinted (and vice-versa)
- **Detect:** A `06` feature file referenced by some `scenario-tags` token is absent from the fingerprint block, OR a fingerprinted feature contributes no referenced tag.
- **Fix:** Keep the fingerprint block and the referenced-tag set mutually consistent.
- **Severity:** ⚠️
- **Source:** Regeneration/fingerprint contract. `[PLAN]`

---

## Theme F — DRY / language

### F1 — No restated scenario text
- **Detect:** A `<Task>` attribute or comment contains Gherkin-looking prose (`Given`/`When`/`Then`/`And`/`Scenario`/`Feature` lines, or a copied step sentence).
- **Fix:** Reference behavior by tag only; the task tree sequences, it does not restate `06`.
- **Severity:** ❌
- **Source:** Single-ownership DRY (06 owns scenario text) — build prompt §5. `[PLAN]`

### F2 — No invented domain vocabulary
- **Detect:** A persona/job attribute, tag, operator, category, or KLM token not sourced from 07/06/the pinned sets.
- **Fix:** Use only vocabulary owned upstream or pinned in this catalog.
- **Severity:** ❌
- **Source:** Single-ownership (no silent invention) — build prompt §5. `[PLAN]`

### F3 — Task `id`s are descriptive slugs, not sentences
- **Detect:** A `Task/@id` is a full sentence or contains step prose rather than a kebab-case label.
- **Fix:** Use short kebab-case action labels (`enter-amount`, `confirm-transfer`).
- **Severity:** ⚠️
- **Source:** DRY/language hygiene.

### F4 — One model's tree describes one job only
- **Detect:** A task tree mixes steps that belong to a different `07` job (advisory).
- **Fix:** Keep each file scoped to its single persona-job; cross-job steps belong in their own model.
- **Severity:** ℹ️
- **Source:** Single-ownership (one model per persona-job). `[PLAN]`
