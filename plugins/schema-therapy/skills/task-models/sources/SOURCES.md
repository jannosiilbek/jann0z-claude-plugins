# Sources — `task-models` skill (schema-therapy #8)

Grounded source-of-truth library for hierarchical task modelling (ConcurTaskTrees / CTT)
and the Keystroke-Level Model (KLM). This skill turns behavior specs (06 gherkin) and
personas (07) into `specs/08-task-models/<persona>-<job>.xml` — one CTT task model per
persona-job, with CTT temporal operators and a per-job KLM efficiency budget.

**Validation date for every row below: 2026-06-04.**

Source classes:
- **gatherable** — open, redistributable; the file is vendored in this directory.
- **cite-only** — authoritative but commercial / not redistributable; cite, never copy.
- **executable** — runnable tooling probed empirically (see the Probe section).

---

## Provenance table

| Title | Version / Edition | Publication status | Publication date | Canonical URL | Class | Validation date |
|---|---|---|---|---|---|---|
| MBUI — Task Models | NOTE-task-models-20140408 | W3C Working Group Note (off Rec-track) | 2014-04-08 | https://www.w3.org/TR/2014/NOTE-task-models-20140408/ | gatherable | 2026-06-04 |
| Concur Task Trees (CTT) — Paternò, Santoro, Spano (W3C member submission backing doc) | W3C member submission, Feb 2012 | W3C Working Group Submission / member-supplied spec | 2012-02-02 | https://www.w3.org/2012/02/ctt/ (PDF: https://www.w3.org/wiki/images/6/62/W3c-ctt.pdf) | gatherable | 2026-06-04 |
| ConcurTaskTrees: An Engineered Notation for Task Models (chapter in *The Handbook of Task Analysis for HCI*, Diaper & Stanton, eds.) | 1st ed., ch. 24, ISBN 0805844325 | Published book chapter (author postprint, openly hosted by ISTI-CNR) | 2004 (ISTI pub. id 2003-A1-07) | http://giove.isti.cnr.it/AssetsSitoLab/publications/2003-A1-07.pdf | gatherable | 2026-06-04 |
| Using the Keystroke-Level Model to Estimate Execution Times — David Kieras | © 1993, rev. course text | Public course text (U. Michigan), openly hosted | 1993 | https://www.cs.umd.edu/~golbeck/INST631/KSM.pdf | gatherable | 2026-06-04 |
| The keystroke-level model for user performance time with interactive systems — Card, Moran & Newell | CACM vol. 23 no. 7, pp. 396–410, DOI 10.1145/358886.358895 | Peer-reviewed journal article (CMU University Libraries open scan) | 1980-07 | https://iiif.library.cmu.edu/file/Newell_box00072_fld05090_doc0005/Newell_box00072_fld05090_doc0005.pdf | gatherable | 2026-06-04 |
| ConcurTaskTrees: A Diagrammatic Notation for Specifying Task Models — Paternò, Mancini, Meniconi (INTERACT '97) | INTERACT '97 proceedings | Peer-reviewed conference paper (commercial proceedings) | 1997 | https://doi.org/10.1007/978-0-387-35175-9_58 | cite-only | 2026-06-04 |
| Model-Based Design and Evaluation of Interactive Applications — Fabio Paternò | Springer, ISBN 978-1-85233-155-2 | Commercial monograph | 1999 | https://link.springer.com/book/10.1007/978-1-4471-0445-2 | cite-only | 2026-06-04 |
| The Psychology of Human-Computer Interaction — Card, Moran & Newell | Lawrence Erlbaum, ISBN 0898592437 | Commercial monograph (KLM canonical source) | 1983 | https://doi.org/10.1201/9780203736166 | cite-only | 2026-06-04 |
| HAMSTERS / HAMSTERS-XL — Martinie, Palanque et al. (IRIT ICS) | tool + notation, ongoing | Academic CASE tool (request-gated desktop Java) | 2011– | https://www.irit.fr/recherches/ICS/softwares/hamsters/ | cite-only (assessed, not admitted as engine) | 2026-06-04 |
| CTTE — ConcurTaskTrees Environment (ISTI-CNR / HIIS) | desktop Java GUI tool | Academic desktop application (legacy) | 2002– | https://giove.isti.cnr.it/lab/research/CTTE/home | executable (probed, rejected) | 2026-06-04 |

---

## Gathered files (this directory)

- [`w3c-task-models-note-2014.html`](./w3c-task-models-note-2014.html) — the W3C Note, full HTML. **The canonical machine-readable task-model format**: UML meta-model + XML Schema + operator descriptions.
- [`w3c-ctt-paterno-santoro-spano.pdf`](./w3c-ctt-paterno-santoro-spano.pdf) — Paternò/Santoro/Spano CTT spec PDF (companion to the 2012 W3C submission); operator catalogue + notation.
- [`paterno-2003-concurtasktrees-engineered-notation.pdf`](./paterno-2003-concurtasktrees-engineered-notation.pdf) — Paternò's engineered-notation chapter; the fullest open statement of CTT operator semantics & precedence by the canonical author.
- [`kieras-using-klm-estimate-execution-times.pdf`](./kieras-using-klm-estimate-execution-times.pdf) — Kieras course text; **the open, authoritative KLM operator table** with concrete second values (verbatim below).
- [`card-moran-newell-1980-klm-cacm.pdf`](./card-moran-newell-1980-klm-cacm.pdf) — the original 1980 CACM KLM paper (CMU open scan); the primary KLM source.

### KLM operator table (verbatim from the Kieras course text — the harness's KLM arithmetic basis)

| Operator | Meaning | Time (sec) |
|---|---|---|
| **K** | Keystroke / button press | 0.28 (recommended for typical user; range .12 expert–1.2 worst) |
| **T(n)** | Type a chunk of n chars | n × K |
| **P** | Point with mouse to target | 1.1 (Fitts'-law range .8–1.5) |
| **B** | Press *or* release mouse button | 0.1 |
| **BB** | Click (press+release) | 0.2 |
| **H** | Home hands between keyboard/mouse | 0.4 |
| **M** | Mental act (routine thinking/perception) | 1.2 (range .6–1.35) |
| **W(t)** | Wait for system response | t (must be measured; "R" in Card/Moran/Newell) |

KLM total = simple sum of operator times along the expert, error-free action sequence.
Determinism rule for the budget: per-job KLM budget is a deterministic sum; the only
judgement variable is M-count/placement — the skill must fix an M-placement convention
(Kieras' heuristics: initiate-task M, retrieve-chunk M, locate-on-screen M, verify-step M)
so the budget is reproducible.

### CTT temporal operators (consolidated from the W3C Note + Paternò chapter)

N-ary (parent → 2+ children), with XML element names from the W3C Note Schema:
- **Enabling** `>>` `<Enabling>` — T2 cannot start until T1 completes. Variant **Enabling-with-information-passing** `[]>>` (`SequentialEnablingInfo`): completed task hands data to the next.
- **Choice** `[]` `<Choice>` — pick one task from the set; once one starts, the others are disabled.
- **Interleaving** `|||` `<Interleaving>` — concurrent, no constraint.
- **Synchronisation** `|[]|` `<Synchronization>` — concurrent *and* exchange information.
- **Parallelism** `<Parallelism>` — true parallel execution.
- **Order Independence** `|=|` `<OrderIndependence>` — any order, but one finishes before the next starts.
- **Disabling** `[>` `<Disabling>` — the left task is deactivated once the right task starts.
- **Suspend-Resume** `|>` `<SuspendResume>` — right task interrupts left; left resumes from its prior state afterward.

Unary (parent → 1 child):
- **Iteration** `T*` `<Iterative>` — repeats from the beginning on termination; `T{n}` for finite count.
- **Optional** `[T]` `<Optional>` — the task may be skipped.

Task categories (W3C Note): **User**, **System**, **Interaction**, **Abstract**.
Precedence (Paternò/CTT, tightest → loosest): unary (iteration/optional) bind tightest,
then enabling/disabling, then choice, then the concurrent family (interleaving / sync /
parallelism / order-independence). The skill's walker must encode this precedence to
parse flat operator sequences; the W3C XML Schema sidesteps precedence by making the tree
explicit (operators nest as elements), so a Schema-conformant XML file is unambiguous.

Maps onto the gherkin scenario tags the skill consumes:
`@transition` → Enabling / SequentialEnablingInfo; `@policy`/`@invariant` → Precondition /
PostCondition `ConditionGroup`; `@terminal` → leaf Interaction/System task or Disabling target.

---

## Probe — empirical search for a runnable, scriptable CTT engine

**Verdict: NO maintained, scriptable CTT simulation engine exists. Recommendation: vendor a
Rec-faithful CTT walker over the W3C Note's operator semantics + deterministic KLM arithmetic.**

Environment: Node v24.13.0, npm 11.6.2, Python 3.9.6, Java present (jenv shims). Workspace: `/tmp/ctt-probe`.

What was searched and found:

1. **npm** — `npm search` for `concurtasktrees`, `ctt task model`, `task-model ctt`,
   `hierarchical task analysis`, `ctt simulator`; plus the registry full-text API
   (`registry.npmjs.org/-/v1/search?text=concurtasktrees` → **total 0**; `…text=ctt+task+model+temporal`
   → 0 relevant; matches were the unrelated *ctt-web-components* Portuguese design system and
   GFM markdown *task-list-item* utilities). **No CTT engine on npm.**
2. **PyPI** — JSON-API probes: `concurtasktrees` 404, `ctt-task-model` 404, `task-model-ctt` 404,
   `hamsters-task-model` 404. `pyctt` returned HTTP 200 → **investigated and rejected**: it is a
   Python client for **CTT.pt, the Portuguese postal service** (Correios de Portugal package
   tracking, v1.0.1, 2019) — nothing to do with ConcurTaskTrees. **No CTT engine on PyPI.**
3. **GitHub** — repo search: `concurtasktrees` → **0 results**; `ConcurTaskTrees simulator` → 0;
   `CTT temporal operator parser` → 0; `task model enabling operator` → 1 unrelated repo.
   **No CTT engine on GitHub.**
4. **CTTE (ConcurTaskTrees Environment, ISTI-CNR)** — the original Paternò-group tool. It *does*
   ship a "Task Model Simulator" that enables-only the currently-performable tasks — exactly the
   semantics we need — **but it is a desktop Java GUI** launched as `ctte` / `java DrawTree`. No
   documented headless/batch/CLI mode, no published API artifact, distributed as a legacy GUI
   bundle (Inria CADP also redistributes it as a GUI). Headless invocation is **not realistic**:
   the simulator is bound to the Swing/AWT UI. **Rejected as an automated oracle.**
5. **HAMSTERS / HAMSTERS-XL (IRIT ICS, Martinie & Palanque)** — a more expressive LOTOS-operator
   task tool that advertises "a task model simulator as a dedicated API for simulating execution
   of task sequences." Assessed and **not admitted**: it is a desktop Java CASE tool; the "API" is
   an internal Java library inside the GUI distribution, the download is request/academic-gated
   (`irit.fr/ICS/tools/`), there is no npm/pip/Maven-pinnable artifact and no headless CLI. Not
   reproducibly pinnable in a CI harness. **Cite-only.**

**Conclusion for the simulation contract (§0).** Both engines that exist (CTTE, HAMSTERS) are
unmaintained-for-scripting desktop Java GUIs; the package ecosystems are empty. The deterministic
oracle must therefore be a **vendored, Rec-faithful CTT walker** implementing the W3C Note's
operator semantics (the consolidated operator table above is the spec), which:
- parses the W3C-Schema XML task model into the operator tree,
- given a task-execution state, enumerates the **ENABLED set** (the tasks currently performable
  under the temporal operators — the same notion CTTE's simulator computes), and
- pairs with **deterministic KLM arithmetic** (the Kieras operator table above, with a fixed
  M-placement convention) to compute the per-job efficiency budget.
This is fully grounded in gatherable sources and needs no external engine.

---

## Exclusions

- **`pyctt` (PyPI)** — Portuguese postal-service tracker; false-positive acronym collision. Excluded.
- **`ctt-web-components` (npm)** — CTT.pt design system (Lit web components); unrelated. Excluded.
- **GFM `*-task-list-item` packages (npm)** — markdown checkbox parsers; unrelated "task". Excluded.
- **Grokipedia "ConcurTaskTrees" page** — unvetted aggregator; not an authority. Excluded.
- **ResearchGate / Sci-Hub / scispace copies** of the primary papers — used only to confirm
  identity; the openly-licensed CMU library scan and ISTI-CNR / U.Maryland / U.Michigan author
  copies are the gathered artifacts. Pirate/aggregator mirrors excluded as canonical URLs.
- **CTTE & HAMSTERS as executable oracles** — assessed in the Probe; rejected (GUI-bound, not
  scriptable/pinnable). HAMSTERS retained cite-only for its operator-semantics corroboration.
- **HCI textbook secondary KLM tables** (Sauro composite-operators, NAU/CubeOS lecture PDFs) —
  derivative; the Kieras course text + 1980 CACM paper are the primary, authoritative operator sources.

---

## Authority alignment (precedence on contradiction)

1. **CTT operator semantics** → **Fabio Paternò is canonical.** Order of authority:
   Paternò's *Model-Based Design and Evaluation* (1999, cite-only) and the engineered-notation
   chapter (2004, gathered) define the operators and their formal/LOTOS-based semantics; the
   INTERACT '97 paper is the origin cite. Where the W3C Note and Paternò agree (they do — Paternò
   is a Note editor), either may be quoted.
2. **The XML interchange format / meta-model** → **the W3C Task Models Note (2014) is canonical.**
   Standing: it is a **Working Group Note**, *not* a Recommendation — the WG stopped advancing it
   on the Rec-track. A Note does **not** carry Rec-level normative weight and is not superseded the
   way a Rec is; but it remains **the only standardized, machine-readable CTT task-model format
   (UML meta-model + XML Schema)** and is co-authored by the canonical CTT authors (Paternò,
   Santoro, Spano + Raggett). Treat it as the authoritative *format* spec, with Paternò's writings
   authoritative for any *semantic* fine point the Schema leaves implicit (e.g., operator
   precedence, which the explicit XML tree renders moot in practice).
3. **KLM operators & arithmetic** → **Card, Moran & Newell are canonical** (1980 CACM paper for
   the model; *The Psychology of HCI*, 1983, cite-only, for the full treatment). The **Kieras
   course text (1993, gathered)** is the authoritative *open* operator table and the practical
   M-placement guidance the skill should codify; where Kieras renames/extends (W for Wait vs. the
   original R for Response, M-placement heuristics) he flags it explicitly and defers to
   Card/Moran/Newell — so no contradiction, Kieras is an admitted faithful extension.

### Contradictions found + ruling
- **Engineered-notation chapter date: 2003 vs 2004.** The ISTI-CNR publication id is `2003-A1-07`
  and the filename carries "2003", but the host book — *The Handbook of Task Analysis for HCI*
  (Diaper & Stanton, eds., ISBN 0805844325) — is a **2004** publication (PDF metadata Title/ISBN
  confirm the book). **Ruling: cite as 2004** (book year), note the 2003 ISTI internal id.
- **Operator naming drift across sources.** Card/Moran/Newell call the wait operator **R**
  (Response time); Kieras renames it **W** (Wait) and says so. CTT "Concurrency" appears as
  **Interleaving / Synchronisation / Parallelism** (three distinct W3C-Schema elements) rather than
  one operator. **Ruling: adopt the W3C Note element names as the canonical surface vocabulary**
  for the XML the skill emits, and **Kieras' W** for the KLM wait operator; record the originals as
  synonyms so the skill never silently invents a name.
