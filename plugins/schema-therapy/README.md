# Schema Therapy

Schema Therapy is a practice, not a tool. Bring a tangled data model, a fuzzy domain, or a legacy schema nobody understands, and a couch full of modelling specialists works through it with you. Each one is grounded in the old discipline (Codd's normal forms, Chen's entities, a little category theory when the relationship is genuinely complicated) and backed by a modern AI that reads your DDL without flinching.

> Work in progress — skills under construction.

## Skills

A chain of modelling skills, each owning exactly one artifact: discovery → language → boundaries → data → lifecycle → behavior. Every skill is fully self-contained — its validated source specifications, rule catalog, simulation contract, and test harness all live inside the skill's own directory.

| Skill | Status | Artifact |
|-------|--------|----------|
| `event-storming` | planned | domain events, actors, hotspots, lifecycle skeletons |
| `glossary` | planned | one-concept-one-word term list with owned enums |
| `aggregates` | planned | aggregate roots, invariants, transactional boundaries |
| `erd` | planned | the data model (DBML) — source of truth |
| `statecharts` | planned | entity lifecycles (SCXML), where complexity warrants |
| `gherkin` | planned | behavior specs (`.feature` files) |

## Installation

From this marketplace:

```
/plugin install schema-therapy@jann0z-claude-plugins
```

Or test locally:

```bash
claude --plugin-dir /path/to/claude-plugins/plugins/schema-therapy
```
