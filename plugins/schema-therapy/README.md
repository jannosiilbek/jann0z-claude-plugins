# Schema Therapy

Schema Therapy is a practice, not a tool. Bring a tangled data model, a fuzzy domain, or a legacy schema nobody understands, and a couch full of modelling specialists works through it with you. Each one is grounded in the old discipline (Codd's normal forms, Chen's entities, a little category theory when the relationship is genuinely complicated) and backed by a modern AI that reads your DDL without flinching.

## Skills

A chain of modelling skills, each owning exactly one artifact: discovery → language → boundaries → data → lifecycle → behavior. Every skill is fully self-contained — its validated source specifications, rule catalog, simulation contract, and test harness all live inside the skill's own directory.

| Skill | Status | Artifact |
|-------|--------|----------|
| `event-storming` | ✅ | `specs/01-event-storming.md` — domain events, actors, hotspots, lifecycle skeletons |
| `glossary` | ✅ | `specs/02-glossary.md` — one-concept-one-word term list with owned enums |
| `aggregates` | ✅ | `specs/03-aggregates.md` — aggregate roots, invariants, transactional boundaries |
| `erd` | ✅ | `specs/04-erd.dbml` + `specs/04-transitions.md` — the data model, live-tested on Postgres (PGlite) |
| `statecharts` | ✅ | `specs/05-statecharts/*.scxml` — entity lifecycles, where the gate warrants (SCION-executed) |
| `gherkin` | ✅ | `specs/06-gherkin/*.feature` — behavior specs, parsed by the official Gherkin parser |

Plugin-level: the `drift-police` agent + mechanical suite-drift script re-verify
the whole `specs/` tree (resolution, DRY, staleness, semantic drift) as an
independent double-assurance layer.

## Usage

One-shot, from a domain description (file or prose):

```
/schema-therapy:pipeline domain.md
```

This drives all six steps in order and finishes with the drift-police audit
(done only on an ALIGNED verdict).

Step by step instead: say "run the schema-therapy pipeline on domain.md" to
start (step 1), then "run schema-therapy step 2" … "step 6". Audit any time
with "is the suite aligned".

A complete worked example lives in [test-workspace/](test-workspace/) —
the conference-ticketing domain and its full green `specs/` tree.

## Installation

From this marketplace:

```
/plugin install schema-therapy@jann0z-claude-plugins
```

Or test locally:

```bash
claude --plugin-dir /path/to/claude-plugins/plugins/schema-therapy
```
