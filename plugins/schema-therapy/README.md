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

Plugin-level: the `drift-police` agent + mechanical suite-drift script re-verify
the whole `specs/` tree (resolution, DRY, staleness, semantic drift) as an
independent double-assurance layer.

## Usage

One-shot, from a product intent + a domain description (files or prose):

```
/schema-therapy:pipeline product-intent.md domain.md
```

This drives all eleven steps in order and finishes with the drift-police audit
(done only on an ALIGNED verdict).

Step by step instead: say "run the schema-therapy pipeline on product-intent.md
and domain.md" to start (step 0), then "run schema-therapy step 1" … "step 10".
Audit any time with "is the suite aligned".

Iterate on the scope conversationally:

```
/schema-therapy:scope
```

Discuss freely; each confirmed change crosses into an isolated amendment as a
distilled scope delta (the conversation never leaks into the artifact), gets
diff-reviewed in a separate context, and the impact map stays lint-green
throughout. Downstream staleness is batched — the cascade is offered once,
when the scope settles.

A complete worked example lives in [test-workspace/](test-workspace/) —
the conference-ticketing intent + domain and their full green `specs/` tree
(00–10).

## Installation

From this marketplace:

```
/plugin install schema-therapy@jann0z-claude-plugins
```

Or test locally:

```bash
claude --plugin-dir /path/to/claude-plugins/plugins/schema-therapy
```
