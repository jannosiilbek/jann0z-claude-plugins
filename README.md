<!-- Public-facing marketplace README. Read-only — do not edit programmatically or as part of doc-align passes. -->

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
ddd-brief  →  ddd-domain  →  ddd-usecases  →  [ddd-api →]  erd-modeler  →  ddd-plan
   │             │               │                               │              │
 brief.md   glossary.md      usecases.md                    model.dbml       plan.md
            flows.md                                         usecases.sql
                                  └──────── ddd-align (consistency gate, runs throughout) ──────┘
```

- **Plain-language triggers** — each step is its own skill; say *"let's spec this out"* and `ddd-brief` takes it from there.
- **Incremental** — artifacts are updated in place, never regenerated wholesale.
- **Stable IDs** — `UC-xxx` and `T-xxx` IDs are immutable so links between artifacts stay stable.

See [CLAUDE.md](CLAUDE.md) for the full skill list and what each one writes.

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

## Development

See [CLAUDE.md](CLAUDE.md) for the repo layout, development workflow, and testing harnesses.

## License

MIT — see [LICENSE](LICENSE).
