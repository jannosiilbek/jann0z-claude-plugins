# Schema Therapy

Schema Therapy is a practice, not a tool. Bring a tangled data model, a fuzzy domain, or a legacy schema nobody understands, and a couch full of modelling specialists works through it with you. Each one is grounded in the old discipline (Codd's normal forms, Chen's entities, a little category theory when the relationship is genuinely complicated) and backed by a modern AI that reads your DDL without flinching.

## Skills

A chain of modelling skills, each owning exactly one artifact: scope → discovery → language → boundaries → data → lifecycle → behavior → personas → tasks → surfaces → acceptance. Every skill is fully self-contained — its validated source specifications, rule catalog, simulation contract, and test harness all live inside the skill's own directory.

| Skill | Status | Artifact |
|-------|--------|----------|
| `impact-map` | ✅ | `specs/00-impact-map.md` — business goal, business actors, impacts, deliverables |
| `event-storming` | ✅ | `specs/01-event-storming.md` — domain events, actors, hotspots, lifecycle skeletons |
| `glossary` | ✅ | `specs/02-glossary.md` — one-concept-one-word term list with owned enums |
| `aggregates` | ✅ | `specs/03-aggregates.md` — aggregate roots, invariants, transactional boundaries |
| `erd` | ✅ | `specs/04-erd.dbml` + `specs/04-transitions.md` — the data model, live-tested on Postgres (PGlite) |
| `statecharts` | ✅ | `specs/05-statecharts/*.scxml` — entity lifecycles, where the gate warrants (SCION-executed) |
| `gherkin` | ✅ | `specs/06-gherkin/*.feature` — behavior specs, parsed by the official Gherkin parser |
| `personas` | ✅ | `specs/07-personas.md` — goal-directed personas with jobs-to-be-done |
| `task-models` | ✅ | `specs/08-task-models/*.xml` — one CTT task model per persona-job, with KLM budgets |
| `ui-flows` | ✅ | `specs/09-ui-flows/*.xml` — IFML screens + navigation, measured against the budgets |
| `flow-acceptance` | ✅ | `specs/10-flow-acceptance/*.feature` — screen-walk acceptance, outcomes bound to 06 by tag |

Together 06 + 10 make the built product end-to-end validatable: 06 proves the
domain layer, 10 proves the assembled product.

**Out of scope: sad-path UI.** 09 and 10 walk only the nominal (happy) paths.
Domain rejections are covered by 06 `@invariant`/`@terminal`/`@authz` scenarios;
screen-level error states (validation messages, retry affordances, error pages)
are the implementation's responsibility and are deliberately unspecified here.

Plugin-level: the `drift-police` agent + mechanical suite-drift script re-verify
the whole `specs/` tree (resolution, DRY, staleness, semantic drift) as an
independent double-assurance layer.

## Usage

**Start here** — from a blank idea, no documents needed:

```
/schema-therapy:scope
```

Gather mode interviews you (Why → Who → How → What) into a first validated
impact map, then the same session keeps iterating it: discuss freely, and each
confirmed change crosses into an isolated amendment as a distilled scope delta
(the conversation never leaks into the artifact), gets diff-reviewed in a
separate context, and the map stays lint-green throughout. Downstream
staleness is batched — the cascade is offered once, when the scope settles.

### Brownfield entry — the anamnesis bridge (optional)

Modelling an existing system instead of a blank idea? The anamnesis bridge is
legacy-to-model extraction: agents mine domain **value** out of a legacy codebase
(code, tests, docs, data, live probes) into an evidence-gated claims ledger, a
human adjudicates the doubtful cases topic-by-topic, and the bridge renders only
confirmed claims into the same `domain.md` the pipeline already consumes — a
bridge-rendered domain file and a human-written one are indistinguishable to the
pipeline, except every sentence in the bridge's version carries evidence. The
boundary rule: **the only thing that ever crosses from the legacy system into the
pipeline is the rendered set of confirmed claims — never code, never chat, never
probe output.**

```
/schema-therapy:anamnesis
```

Engagement order: anamnesis mines → `/schema-therapy:scope` runs with the context
map and actor claims on the table (the human decides which mined actors become
business actors — the legacy cannot dictate the future product) → the pipeline
runs as normal over the rendered domain file. Greenfield projects keep writing
`domain.md` by hand; the pipeline changes by zero bytes.

Already have the inputs written? Run the batch path:

```
/schema-therapy:pipeline product-intent.md domain.md
```

This drives all eleven steps in order and finishes with the drift-police audit
(done only on an ALIGNED verdict).

Step by step instead: say "run the schema-therapy pipeline on product-intent.md
and domain.md" to start (step 0), then "run schema-therapy step 1" … "step 10".
Audit any time with "is the suite aligned".

Re-running the pipeline command over an existing `specs/` tree **resumes**: a
step whose artifacts exist with every declared upstream fingerprint still
matching is skipped; only stale or missing steps run. After editing one
upstream artifact, the cheap path is even shorter: regenerate it via its
**owning skill** (e.g. "run schema-therapy step 1" after editing the domain),
then run drift-police ("is the suite aligned") — its staleness findings route
the **minimal** downstream regeneration to the owning skills, instead of
re-walking all eleven steps.

A complete worked example lives in [test-workspace/](test-workspace/) —
the conference-ticketing intent + domain and their full green `specs/` tree
(00–10).

## Requirements

- **Node.js ≥ 18** — every skill ships an executable verification harness
  (`scripts/harness.mjs`) that is the artifact's sole pass/fail authority.
- **Network on first run (some skills)** — the erd, statecharts, gherkin, and
  flow-acceptance harnesses self-install their pinned npm dependencies
  (`@dbml/core` + PGlite, SCION, `@cucumber/gherkin`) into the skill's
  `scripts/node_modules` on first use (`npm ci`). Offline with deps absent, a
  harness refuses to certify (`broken-test`) rather than degrade — it never
  silently passes.

## Installation

From this marketplace:

```
/plugin install schema-therapy@jann0z-claude-plugins
```

Or test locally:

```bash
claude --plugin-dir /path/to/claude-plugins/plugins/schema-therapy
```
