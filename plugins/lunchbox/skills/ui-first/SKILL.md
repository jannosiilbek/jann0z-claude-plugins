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

0. **Explicit argument wins**: an explicit `design` or `review` argument decides the mode outright. The rules below apply only when no argument is given.
1. **Intent verbs first**: design/plan/create/add/extend → design mode; review/audit/critique/check/assess → review mode.
2. Artifact presence is only the **tiebreaker** when the verb is ambiguous.
3. Still ambiguous → ask one question.
4. **Design mode is delta-capable**: when structure already exists (brownfield), design mode first inventories the existing structure (same discovery recipe as review mode), the output extends it — existing rows marked, new rows marked — and any existing violation the new work touches is flagged inline. No third mode.

## Intake (both modes)

Priority-ordered sources; read what exists, ask only for what's genuinely missing:

1. The conversation/prompt content itself.
2. `spec/usecases.md` + `spec/brief.md` (napkin project: a UC is literally actor + recurring task — the interview collapses to zero questions).
3. `product.md` Personas (product-sparring project: Role/Goal/Friction).
4. README / product docs.
5. Route/nav code (discovery recipe below).

Then **at most one batched question round** covering only missing actors/tasks; then proceed with stated assumptions. When the prompt already supplies a complete inventory, proceed without asking anything. The task inventory records **frequency and criticality** per task.

## Design mode

1. **Intake** (above) → actor → recurring-task inventory (frequency + criticality).
2. **Shell decision**: when roles' workdays diverge, decide explicitly — one shared nav or per-role shells. The ≤7 cap applies **per role**; the attention inbox is per role; permissions are expressed as disclosure preconditions.
3. **Draft nav + surface inventory from the task inventory ALONE** — the domain model is deliberately not yet in context for this step (anti-anchoring: entity names in context bias nav labels). Nav slots go to frequent tasks; rare-but-critical tasks get a documented guaranteed path (nav placement only with stated justification).
4. **Now read the domain model** (glossary/DBML/schema/code, read-only) and use it for exactly three things: name the concept merges in the surface inventory; fill the boundary translation table; run a leak-check diff of drafted nav/surface names against aggregate names.
5. **Emit the design-mode output contract** (below).
6. **First-shot test walkthrough** — once per primary actor's top task, falsifiable format (below).

Before producing the first design output in a session, skim `references/example.md`.

## Review mode

1. **Discovery recipe** for the existing structure, in order: router/route files (framework conventions), nav/menu/sidebar components, `spec/screens.md`, any sitemap/screens doc; fallback — ask the user to point at the structure.
2. **Compressed intake**: establish actors and their top 3–5 tasks (shared intake sources) — P1 cannot be judged without a workday, and the first-shot test needs a task to walk.
3. **Audit per structural element** (nav item, surface): each finding cites evidence (literal label/route/file), the principle(s) violated, and exactly one fix move. The per-principle table is the **rollup**, not the working structure. P1's verdict must cite task-to-nav coverage (nav items serving no named task; top tasks with no first-class path).
4. **Before mapping any finding to a fix move, in either mode** — this review-mode step, or brownfield design mode's inline violation flagging (Mode selection, rule 4) — read `references/playbook.md`.
5. **Emit the review-mode output contract** (below). Report-only — never edits files.
6. When the audited structure is `spec/screens.md`: fixes are keyed by SC-id and phrased as ddd-screens delta instructions (e.g., "merge SC-003 + SC-007 into one surface with tabs: keep SC-003, deprecate SC-007 with Superseded-by"), closing with "apply via ddd-screens". Never re-check what the ddd-align gate already validates (citation resolution, status vocabulary, UC coverage).

Before emitting the first audit of a session, skim `references/example.md`'s audit section (Part 3).

## Output contracts

Closed vocabularies used by both contracts:

- **Verdict tokens**: `PASS` | `AT-RISK` | `FAIL` (per principle, written as `P<n>: <token>`).
- **Fix moves** (canonical hyphenated names; detail lives in `references/playbook.md`):
  - `cut-nav-item` — remove a nav item that serves no recurring task.
  - `rename-to-user-noun` — relabel a nav/surface label from an engine/aggregate name to the user's word for the concept.
  - `merge-to-tabs` — combine two surfaces that are one concept in the user's mind into a single surface with tabs/filters.
  - `demote-to-queue` — move a workflow state out of top-level nav into the attention inbox and/or a tab on its parent object.
  - `derive-and-show` — replace a raw joinless list/table with a view that renders what the object derives from.
  - `stage-behind-precondition` — gate a feature so it appears only once its precondition exists, instead of showing it to everyone on day one.
  - `teach-empty-state` — replace a blank list/table with an onboarding surface that names the next action.

**Template metatext**: fragments annotated with "←" arrows inside the fenced templates below are commentary and are never emitted in output; the asterisk footnote line under the surface inventory (marked `*`) IS part of the output.

**Design-mode template** (all sections mandatory unless marked):

```
## UI structure — <product/feature>
Form factor: <sidebar ≤7 | bottom tabs ≤5 | ...>   ← states the cap it designs to
Shell decision: <single shared nav | per-role shells> — <reason>

### Actors and tasks
| Actor | Task | Frequency | Criticality |

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
| Step | Sees | Does | Risk |
Verdict: PASS | FAIL — most-likely-to-fail step: <step>
```

**Engine-name backtick rule** (in SKILL.md, applies to both templates): whenever an engine/aggregate name appears anywhere in the output — boundary translation table, surface-merge notes, prose — it is backticked (`` `PartyAccount` ``). Nav and surface **labels** are never engine names; the leak-check diff renames any hit before emitting. This is what keeps the deterministic leak assertions sound: a bare `| PartyAccount` in the output can only be a leaked table cell, never a legitimate boundary-table row (those render as ``| `PartyAccount` |``).

First-shot test rules (make it falsifiable, not theater): **in both modes, one walkthrough per primary actor's top task** — never a single global walkthrough when shells diverge. When one shared shell serves all roles, a single walkthrough of the most load-bearing actor's top task suffices. *Sees* may contain only labels that literally exist in the produced nav map / surface inventory — inventing an affordance mid-walkthrough is a spec bug, not a pass. *Does* is the click a domain expert would choose knowing the domain but not the product. Hard-fail rule: any step whose correct next click requires an engine/internal term, or a location not derivable from the task, fails the test. The most-likely-to-fail step is named even on PASS. Review mode runs the same table against the actual ingested labels.

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
   (spec/screens.md target: keyed by SC-id, ddd-screens delta phrasing, ends "apply via ddd-screens")

### First-shot test — <actor>: <top task>
| Step | Sees | Does | Risk |
Verdict: PASS | FAIL — most-likely-to-fail step: <step>
```

## Guardrails

- **Never write into `spec/`** — that directory belongs to the napkin pipeline. When a napkin project wants UI structure persisted, route to ddd-screens. (An unmarked .md in spec/ is unvalidated drift; a marked one breaks the ddd-align gate with AL-15.)
- Review mode never edits any file.
- Output is in-chat; a file is written only when the user explicitly asks, at a path they name (outside `spec/`).
