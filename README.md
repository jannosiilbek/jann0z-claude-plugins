# jann0z-claude-plugins

A personal [Claude Code](https://claude.com/claude-code) plugin marketplace, packaged so it
can be installed and shared from one place.

## Install

Add the marketplace once, then install the plugin:

```
/plugin marketplace add jannosiilbek/jann0z-claude-plugins
/plugin install napkin@jann0z-claude-plugins
```

## What you get: napkin

**napkin** turns a napkin-sketch idea into an executable spec. It is a Domain-Driven Design
spec pipeline: a chain of skills that each write one persistent, hand-editable artifact into
your project's `spec/` directory — the single source of truth for what you're building.

```
ddd-brief  →  ddd-domain  →  ddd-usecases  →  erd-modeler  →  ddd-plan
   │             │               │                │              │
 brief.md   glossary.md      usecases.md      model.dbml       plan.md
            flows.md                          usecases.sql
                                  └─────── ddd-align (consistency gate, runs throughout) ───────┘
```

Each step is its own skill and triggers from plain language — you don't have to memorize the
pipeline. Say *"let's spec this out"* and `ddd-brief` takes it from there; say *"now derive the
use cases"* later and `ddd-usecases` picks up where the brief left off. Everything is
incremental: artifacts are updated in place, never regenerated wholesale, and IDs (UC-xxx,
T-xxx) are immutable so links between artifacts stay stable.

| Skill | Writes | Job |
|-------|--------|-----|
| `ddd-brief` | `spec/brief.md` | Interactive elicitation (one question at a time) of problem, actors, scope, constraints — then sizes how much of the pipeline the work actually warrants (full / lean / delta). |
| `ddd-domain` | `spec/glossary.md`, `spec/flows.md` | Ubiquitous language (terms, entities, enums) + domain event/command/actor/policy flows. |
| `ddd-usecases` | `spec/usecases.md` | UC-xxx use cases with EARS acceptance criteria and data assertions written in erd-modeler's closed, testable grammar. |
| `erd-modeler` | `spec/data/model.dbml`, `spec/data/usecases.sql` | A clean, normalized **DBML** data model, **live-tested** against an in-memory Postgres (PGlite): every use-case data assertion becomes a real query that must pass. |
| `ddd-plan` | `spec/plan.md` | Milestones + T-xxx tasks in dependency order, each citing the UC-xxx it implements. |
| `ddd-align` | (report only) | A mechanical cross-artifact consistency gate run by every skill above — catches broken IDs, orphan references, and drift between artifacts. |

Plus one standalone, manual-only skill:

| Skill | Job |
|-------|-----|
| `erd-diagram` | Render an existing `.dbml` into a single self-contained, interactive HTML ER diagram (WASM Graphviz via `@softwaretechnik/dbml-renderer`). Render-only; never designs a model. |

### Why it's different

- **The spec is executable, not just prose.** Use-case data assertions are run as real SQL
  against a real Postgres (PGlite). A model ships only when every assertion actually passes —
  the harness refuses false-greens.
- **One living source of truth.** Everything lands in `spec/` as plain markdown + DBML you can
  read, edit, and commit. Re-running a skill updates the relevant artifact in place.
- **Self-checking.** `ddd-align` runs on every step, so the artifacts can't silently drift out
  of sync with each other.

## How to use it

### Start with the brief

The pipeline starts with `ddd-brief`. Just describe what you want to build, or hand over a
requirements doc / transcript:

```
You:    Let's spec this out — I want to build a tool where coaches schedule
        sessions with clients and clients can book open slots.

napkin: (ddd-brief) Got it. One question at a time so we get this right.
        Who are the distinct actors here — is "coach" the only one who
        creates availability, or can an admin do it too?

You:    Just coaches create availability. Admins exist but only for billing.

napkin: ...
```

`ddd-brief` asks one focused question at a time, never re-asking anything your material already
answered, and writes `spec/brief.md`. It then tells you how much of the downstream pipeline the
work warrants. From there you continue in plain language:

```
"Now build the glossary and the flows"        → ddd-domain
"Derive the use cases and acceptance criteria" → ddd-usecases
"Design and live-test the data model"          → erd-modeler
"Break this into a development plan"           → ddd-plan
```

You can also jump straight to a step if the upstream artifacts already exist — each skill reads
what's in `spec/` and fills in the gaps.

### Render an ER diagram (manual)

`erd-diagram` never auto-triggers — invoke it explicitly on a DBML file:

```
/erd-diagram spec/data/model.dbml
```

## Repository layout

```
.claude-plugin/marketplace.json        # marketplace manifest
plugins/napkin/
  .claude-plugin/plugin.json           # plugin manifest
  skills/ddd-brief/                     # each skill = SKILL.md + references/ + scripts/
  skills/ddd-domain/
  skills/ddd-usecases/
  skills/erd-modeler/
  skills/ddd-plan/
  skills/ddd-align/                     # spec-format grammar + consistency harness
  skills/erd-diagram/                   # render-only HTML ER diagram skill
```

## Development

There is no build step — skills are markdown plus Node.js harnesses. The harnesses that have a
self-test (the oracles for live-testing and consistency) each run with `npm test`:

```
cd plugins/napkin/skills/erd-modeler/scripts && npm test   # PGlite live-test harness selftest
cd plugins/napkin/skills/ddd-align/scripts   && npm test   # spec-consistency harness selftest (zero deps)
cd plugins/napkin/skills/erd-diagram/scripts && npm test   # renderer selftest
```

A skill change is not done until its selftest passes.

## License

MIT — see [LICENSE](LICENSE).
