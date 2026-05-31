# jann0z-claude-plugins

A personal [Claude Code](https://claude.com/claude-code) plugin marketplace — a small,
curated set of skills, packaged so they can be installed and shared from one place.

## Install

Add the marketplace once, then install the plugin:

```
/plugin marketplace add jannosiilbek/jann0z-claude-plugins
/plugin install napkin@jann0z-claude-plugins
```

## Plugins

| Plugin | What it does |
|--------|--------------|
| [`napkin`](plugins/napkin) | Turn a raw idea into a validated brief, a buildable-scope verdict, an aligned spec workspace, Gherkin specs, and a live-tested data model |

### napkin

One end-to-end **spec pipeline** that takes a SaaS idea from a rough dump to
machine-checkable specs and a schema, with no drift between the stages:

```
idea → idea-brief → spec/brief.md → mvp-scoping → spec/scope.md → collect-context → spec/*.md → gherkin → spec/features/ → erd-modeler → spec/data/model.dbml
```

- **idea-brief** interrogates a rough idea dump into a validated, lint-clean `spec/brief.md` — the
  **business layer**: problem, user, market, pricing, riskiest assumption, build seed, non-goals, every
  claim tagged fact vs. assumption.
- **mvp-scoping** reads the brief and judges it into a thin `spec/scope.md` **verdict** — a buildability
  tier (🟢/🟡/🔴), the 3-use-case test outcome, a feasibility check, and per-integration reachability
  verdicts — consuming the brief without restating it.
- **collect-context** (+ six `context-*` workers) reads the brief and scope, then gathers the upstream
  context — product, personas, glossary, capability map, RBAC, NFRs — into a flat `spec/` workspace of
  strictly-templated files, and validates 100% cross-artifact alignment with zero vague text.
- **gherkin** authors and reviews **framework-agnostic Gherkin/BDD specs** from that context:
  declarative single-behavior scenarios, DRY discipline, ubiquitous language, foundation-first
  ordering, and a multi-pass validation checklist (mechanical lint → judgment passes →
  Three-Amigos), with a spec-conformance gate over the handoff.
- **erd-modeler** designs a clean, normalized **DBML** data model from the same context,
  **validates** it, and **proves it works** by live-testing against in-memory Postgres (PGlite)
  — generating SQL, seed data, and asserting business-use-case queries until every one passes.

The single-ownership contract that keeps the three stages aligned is defined once in
[`plugins/napkin/PIPELINE.md`](plugins/napkin/PIPELINE.md). Each skill also triggers on its own —
"collect the context for…", "write Gherkin for…", "design a data model for…".

## Repository layout

```
.claude-plugin/marketplace.json   # marketplace manifest
plugins/napkin/
  .claude-plugin/plugin.json       # plugin manifest
  PIPELINE.md                      # the cross-skill spec/ contract (single source of ownership)
  skills/<name>/                   # each skill (SKILL.md + references/ + assets|scripts/)
docs/superpowers/                  # design specs, implementation plans, validation records
```

## Development

Skills are built from a design spec and an implementation plan under `docs/superpowers/`,
then validated before landing. The `erd-modeler` PGlite harness has its own self-test:

```
cd plugins/napkin/skills/erd-modeler/scripts && npm test
```

## License

MIT — see [LICENSE](LICENSE).
