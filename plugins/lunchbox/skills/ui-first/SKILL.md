---
name: ui-first
argument-hint: "[design|review]"
description: >-
  Use when the user wants to design or audit an application's UI structure — navigation, screens, surfaces, and workflow queues — derived from the user's work rather than the domain model. Trigger on "design the UX", "plan the navigation", "what should the nav be", "review my UI structure", "audit my screens", and on symptoms: "my navigation is a mess", "too many menu items", "the app just mirrors the database tables", "users can't find where to do X". Two modes: design (produce nav map, surface inventory, attention inbox, disclosure stages, boundary translation table) and review (per-element audit with principle verdicts and canonical fix moves). Pre-implementation structure only — not visual design, layout, color, typography, or component styling. In a project with napkin's spec/usecases.md, the screen-inventory artifact (spec/screens.md) belongs to napkin:ddd-screens; use this skill to design or audit the structure and the model/UI boundary.
---

# UI First

Designs or audits an application's UI structure — navigation, screens, surfaces, and workflow queues — derived from the user's work, never from the domain model.

## The doctrine

> **Core rule: The domain model is how the system thinks. The UI is how the user works. Never let the first leak into the second.**
>
> Model the engine rigorously (DDD, aggregates, clean boundaries). Then design the UI from scratch around the user's work — the two structures will not match, and they shouldn't.
>
> 1. **Design from the user's day, not the schema.** Before creating any screen or nav item, answer: "What recurring task does this serve?" Navigation = the user's daily verbs and owned nouns, max 7 top-level items. No nameable recurring task → no nav item.
> 2. **One concept, one place.** If two entities are the same thing in the user's mind, they share one surface (tabs/filters) — regardless of how many aggregates they are in the engine.
> 3. **Workflow states are queues, not destinations.** Work-in-progress (tasks, approvals, requests, alerts) lives in one "needs my attention" inbox and as tabs on its parent object — never as top-level nav.
> 4. **Show relationships, not tables.** Every derived object renders what it derives from. The user never performs a mental join.
> 5. **Progressive disclosure.** Show only what is actionable now. Features appear when their preconditions exist — never everything to everyone on day one.
> 6. **Empty states teach the next action.** An empty screen is an onboarding surface, never a blank table with a + button.
>
> **The first-shot test:** a domain-expert stranger completes their most common task without training. Any screen that requires knowing our internal model to navigate gets redesigned before anything is built on it.
>
> **Before building any user-facing structure:** state the plan in ≤5 lines and name which principle is most at risk. Then proceed.

## Mode selection

0. **Explicit argument wins**: an explicit `design` or `review` argument decides the mode outright. Rules 1–3 below apply only when no argument is given.
1. **Intent verbs first**: design/plan/create/add/extend → design mode; review/audit/critique/check/assess → review mode.
2. Artifact presence is only the **tiebreaker** when the verb is ambiguous.
3. Still ambiguous → ask one question.
4. **Design mode is delta-capable**: when structure already exists (brownfield), design mode first inventories the existing structure (same discovery recipe as review mode), the output extends it — existing rows marked, new rows marked — and any existing violation the new work touches is flagged inline. No third mode.

## Intake (both modes)

Priority-ordered sources; read what exists, ask only for what's genuinely missing:

1. The conversation/prompt content itself.
2. `spec/usecases.md` + `spec/brief.md` (napkin project: a UC is literally actor + recurring task — the interview collapses to zero questions *on the task set*; a UC carries neither frequency nor criticality, and both still have to be established).
3. `product.md` Personas (product-sparring project: Role/Goal/Friction).
4. README / product docs.
5. Route/nav code (discovery recipe below). **Source 5 never yields a grounded task** — it is the artifact under design or audit, not evidence about anyone's work.
6. **Grounding lookup** — gated, design mode only; see `references/grounding.md`.

Then **at most one batched question round** covering only missing actors/tasks; then proceed with stated assumptions. When the prompt already supplies a complete inventory — or instructs not to ask — **source 6 and the question round are both suppressed**. The task inventory records **frequency, criticality, and per-cell provenance** per task.

**Grounding lookup gate** — compute once, after reading sources 1–5, before the question round. A task is **grounded** when a source from 1–4 states it as something a named actor does repeatedly.

- **Do not run it** when any of these holds: the prompt supplies a complete inventory, instructs not to ask, or instructs to proceed with what is given; the mode is review; no source states a market or jurisdiction; no research tool is available.
- **Otherwise run it** only when: no source names any actor's tasks at all; or a named actor has 0 grounded tasks; or the primary actor has fewer than 3 grounded tasks.
- No blocker and no trigger → do not run it.

Read `references/grounding.md` before running it. It asks the user nothing, writes nothing, spawns nothing that writes, and terminates at the end of intake — only its tables cross into design step 3. Either way, design mode's output states the decision on the `Grounding lookup:` line of the contract.

## Design mode

1. **Intake** (above) → actor → recurring-task inventory (frequency, criticality, per-cell provenance).
2. **Shell decision**: when roles' workdays diverge, decide explicitly — one shared nav or per-role shells. The ≤7 cap applies **per role**; the attention inbox is per role; permissions are expressed as disclosure preconditions.
   - **The attention inbox is chrome, not a nav row.** By default it lives in a persistent affordance — bell, panel, badge — that sits outside the cap. Only when the form factor has no persistent chrome slot, as in a bottom-tab shell, may it take a nav slot; that slot then counts against the cap, and its `serves:` clause names the **recurring tasks whose work lands there**, never the inbox itself. A `serves:` clause naming a surface rather than a task is an orphan under P1, and the inbox is not exempt from that.
3. **Draft nav + surface inventory from the task inventory ALONE** — the domain model is deliberately not yet in context for this step (anti-anchoring: entity names in context bias nav labels — and so does any external product's navigation, which anchors harder because it needs no transformation to become a label). Nav slots are allocated **only from rows whose task provenance is `stated` or `confirmed`**, and among those go to frequent tasks; a `cited`/`assumed` row may share an existing surface or be raised in the question round for promotion, never hold a slot alone. Rare-but-critical tasks get a documented guaranteed path (nav placement only with stated justification).
4. **Now read the domain model** (glossary/DBML/schema/code, read-only) and use it for exactly three things: name the concept merges in the surface inventory; fill the boundary translation table; run a leak-check diff of drafted nav/surface names against aggregate names.
5. **Emit the design-mode output contract** (below).
6. **First-shot test walkthrough** — once per primary actor's top task, falsifiable format (below).

Before producing the first design output in a session, skim `references/example.md`.

## Review mode

1. **Discovery recipe** for the existing structure, in order: router/route files (framework conventions), nav/menu/sidebar components, `spec/screens.md`, any sitemap/screens doc; fallback — ask the user to point at the structure.
2. **Compressed intake**: establish actors and their top 3–5 tasks (shared intake sources) — P1 cannot be judged without a workday, and the first-shot test needs a task to walk.
3. **Audit per structural element** (nav item, surface): each finding cites evidence (literal label/route/file), the principle(s) violated, and exactly one fix move. The per-principle table is the **rollup**, not the working structure. P1's verdict must cite task-to-nav coverage (nav items serving no named task; top tasks with no first-class path).
   - **A finding must match a smell the playbook lists for its principle**, named in the evidence cell. An artifact matching no listed smell, and cited by no other finding, makes that principle `PASS` for that artifact — `AT-RISK` is not the safe default for "no defect found", and a principle with zero admissible findings is never below `PASS`. A stricter criterion invented during the audit is not grounds for a finding; when the written bar seems wrong, the playbook is what changes, not the verdict. Apply one criterion uniformly to every artifact of the same class in a single audit: a test that would condemn an artifact you passed is not a test, it is a preference.
   - **Absence is evidence only from an enumerable source.** P1's coverage check is the only absence-based verdict, and it is bounded by a closed task inventory. Every other principle's findings must cite an artifact **present** in an ingested source: that a source did not mention an empty state, a column, or a link for some surface is not evidence the product lacks one. Cite an absence only from a source exhaustive for that artifact class — route/component files, `spec/screens.md`, or a stated complete inventory — and name that source in the evidence cell. A prompt that lists three empty states is a sample offered for audit, not a manifest of every empty state that exists. This holds inside a single artifact too: one quoted string is a sample of one state, not proof the surface has no other state-specific variant, so "reads identically in both empty cases" is itself an absence claim and needs the same enumerable source.
   - **No finding may demand content on a surface the audit removes.** A surface that another finding cuts, merges, or gates behind a precondition cannot also carry a finding requiring content added to it — copy prescribed for a screen that fix N deletes is one defect double-counted with a mutually exclusive remedy. Resolve placement first, then re-check only the surviving surface. This binds across principles, not within one: `derive-and-show` on a cut screen is the same error as `teach-empty-state` on one.
4. **Before mapping any finding to a fix move, in either mode** — this review-mode step, or brownfield design mode's inline violation flagging (Mode selection, rule 4) — read `references/playbook.md`.
5. **Emit the review-mode output contract** (below). Report-only — never edits files.
6. When the audited structure is `spec/screens.md`: fixes are keyed by SC-id and phrased as ddd-screens delta instructions (e.g., "merge SC-003 + SC-007 into one surface with tabs: keep SC-003, deprecate SC-007 with Superseded-by"), closing with "apply via ddd-screens". Never re-check what the ddd-align gate already validates (citation resolution, status vocabulary, UC coverage).

Before emitting the first audit of a session, skim `references/example.md`'s audit section (Part 3).

## Output contracts

Closed vocabularies used by both contracts:

- **Verdict tokens**: `PASS` | `AT-RISK` | `FAIL` (per principle, written as `P<n>: <token>`).
- **Frequency tokens**: `per-day` | `daily` | `weekly` | `monthly` | `quarterly` | `yearly` | `event-driven`. No free text — "recurring, rate unknown" is not a frequency; it is `assumed` provenance on whichever token is the honest guess.
- **Criticality tokens**: `critical` | `high` | `medium` | `low`.
- **Provenance tokens**: `stated` (the user said it) | `confirmed` (the user confirmed a row put to them) | `cited` (a source states it verbatim) | `assumed` (model inference). Written **per cell**, as `<task>/<frequency>/<criticality>` — task existence and cadence fabricate independently, so one token per row would hide the failure. Precedence is strict: a cell never rises without a user act or a verbatim quote. Nav slots come only from rows whose task cell is `stated` or `confirmed`.
- **Fix moves** (canonical hyphenated names; detail lives in `references/playbook.md`):
  - `cut-nav-item` — remove a nav item that serves no recurring task.
  - `rename-to-user-noun` — relabel a nav/surface label from an engine/aggregate name to the user's word for the concept.
  - `merge-to-tabs` — combine two surfaces that are one concept in the user's mind into a single surface with tabs/filters.
  - `demote-to-queue` — move a workflow state out of top-level nav into the attention inbox and/or a tab on its parent object.
  - `derive-and-show` — replace a raw joinless list/table with a view that renders what the object derives from.
  - `stage-behind-precondition` — gate a feature so it appears only once its precondition exists, instead of showing it to everyone on day one.
  - `teach-empty-state` — replace a blank list/table with an onboarding surface that names the next action.

**Template metatext**: fragments annotated with "←" arrows inside the fenced templates below are commentary and are never emitted in output; the asterisk footnote line under the surface inventory (marked `*`) IS part of the output. A block marked **lookup-only** is emitted whole when the grounding lookup ran and omitted whole when it did not — the `Grounding lookup:` line is what says which, so an omitted block is never silent.

**Design-mode template** (all sections mandatory unless marked lookup-only):

```
## UI structure — <product/feature>
Form factor: <sidebar ≤7 | bottom tabs ≤5 | ...>   ← states the cap it designs to
Shell decision: <single shared nav | per-role shells> — <reason>
Grounding lookup: not run — <reason>   ← or: run — <n> actors, <k> cited rows, <j> obligations, 0 unconfirmed rows in nav

### Actors and tasks
| Actor | Task | Frequency | Criticality | Provenance (task/freq/crit) |

### Cited obligations — <market/jurisdiction>   ← lookup-only section; a row needs all three of cadence, recipient, consequence
| Actor | Obligation | Cadence / deadline | External recipient | Consequence of failure | Source class | Verbatim |

### User nouns — <market/jurisdiction>          ← lookup-only section
| Concept | User's word | Source class |

Not found: <fields the lookup could not evidence, per actor>   ← lookup-only line; never empty

### Nav map — <role>            ← one per role when shells diverge; ≤7 rows
| # | Label | Serves |                       ← row ids restart at N1 in each role's table
| N1 | <label> | serves: <recurring task> |

### Attention inbox — <role>
<what lands here, from which workflows, actions available>

### Surface inventory
| Surface | Merges (user concepts) | Shows derived-from | Empty-state teaching line* |
*only surfaces that can be empty on day one (lists, queues, dashboards, the inbox)

### Boundary translation table
| Engine concept | User-facing name | Home surface |
| `<aggregate>` | never surfaces | — |        ← engine-only concepts marked explicitly; the backtick rule applies inside this template row too

### Direct access
<mechanism (search / command palette / recents) and which object types it reaches>

### Disclosure stages
| Feature | Appears when (precondition) |

### Build plan (≤5 lines)
<1–5 numbered lines>
Most at risk: P<n> — <why>

### First-shot test — <actor>: <top task>
| Step | Sees | Source | Does | Risk |      ← Source names the section + row declaring each affordance in Sees
Verdict: PASS | FAIL — most-likely-to-fail step: <step>
```

**Engine-name backtick rule** (applies to both templates): whenever an engine/aggregate name appears anywhere in the output — boundary translation table, surface-merge notes, prose — it is backticked (`` `PartyAccount` ``). Nav and surface **labels** are never engine names; the leak-check diff renames any hit before emitting. This is what keeps the deterministic leak assertions sound: a bare `| PartyAccount` in the output can only be a leaked table cell, never a legitimate boundary-table row (those render as ``| `PartyAccount` |``).

First-shot test rules (make it falsifiable, not theater): **in both modes, one walkthrough per primary actor's top task** — never a single global walkthrough when shells diverge. When one shared shell serves all roles, a single walkthrough of the most load-bearing actor's top task suffices. *Sees* may contain only labels that literally exist in the produced structure — nav map, surface inventory, attention inbox, or disclosure stages — inventing an affordance mid-walkthrough is a spec bug, not a pass. **The `Source` column is what enforces this**, and it is why the check is a column rather than an instruction: every affordance a *Sees* cell names — nav item, tab, surface, action, count, badge — is listed there against the section and row that declares it. An affordance with no source is a gap in the structure, not a wording problem: add it to the section that should have carried it and re-check, or rewrite the step to use what the structure actually produced. An empty, partial, or hand-waved `Source` cell is `FAIL` however well the steps read, and so is a near-match in a different word ("Start job" against a structure that says "checked in") — that mismatch is exactly what a first-shot user trips over. Review mode sources against the ingested structure instead, naming the nav entry, route, or screen note. *Does* is the click a domain expert would choose knowing the domain but not the product. Hard-fail rule: any step whose correct next click requires an engine/internal term, or a location not derivable from the task, fails the test. The most-likely-to-fail step is named even on PASS. Review mode runs the same table against the actual ingested labels.

**Review-mode template**:

```
## UI structure audit — <target>

### Findings
| Element | Evidence | Principle(s) | Fix move |

### Principle rollup
P1: <PASS|AT-RISK|FAIL> — <one-line evidence, citing task-to-nav coverage>
...
P6: <token> — <one-line evidence>

### Observed boundary table   ← when the model/UI mapping is discoverable from the ingested
| Engine concept | User-facing name | Home surface(s) |    structure; double-homed and orphaned
                                                          concepts surface here as table defects (P2)

### Ordered fixes            ← deduped by move; one merge can clear three findings
1. <fix-move>: <concrete instruction>
   (spec/screens.md target: keyed by SC-id, ddd-screens delta phrasing, ends "apply via ddd-screens")   ← commentary — emit only for spec/screens.md targets

### First-shot test — <actor>: <top task>
| Step | Sees | Source | Does | Risk |      ← Source names the section + row declaring each affordance in Sees
Verdict: PASS | FAIL — most-likely-to-fail step: <step>
```

## Guardrails

- **Every constraint in this section binds any subagent this skill spawns.** A grounding-lookup agent inherits the never-write rules verbatim: it returns tables to this session and touches no file.
- **Never write into `spec/`** — that directory belongs to the napkin pipeline. When a napkin project wants UI structure persisted, route to ddd-screens. (An unmarked .md in spec/ is unvalidated drift; a marked one breaks the ddd-align gate with AL-15.)
- Review mode never edits any file.
- Output is in-chat; a file is written only when the user explicitly asks, at a path they name (outside `spec/`).
