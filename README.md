# jann0z-claude-plugins

A personal [Claude Code](https://claude.com/claude-code) plugin marketplace — a small,
curated set of skills, packaged so they can be installed and shared from one place.

## Install

Add the marketplace once, then install whichever plugins you want:

```
/plugin marketplace add jannosiilbek/jann0z-claude-plugins
/plugin install gherkin@jann0z-claude-plugins
/plugin install erd-modeler@jann0z-claude-plugins
```

## Plugins

| Plugin | What it does |
|--------|--------------|
| [`gherkin`](plugins/gherkin) | Author & review framework-agnostic Gherkin/BDD specs |
| [`erd-modeler`](plugins/erd-modeler) | Design, validate & live-test DBML data models |

### gherkin

Author and review **framework-agnostic Gherkin/BDD specs**. The skill enforces
declarative, single-behavior scenarios; DRY discipline; consistent naming and
ubiquitous language; foundation-first suite ordering; and a multi-pass validation
checklist (mechanical lint → judgment passes → Three-Amigos sign-off). It is tuned
for spec-driven development with coding agents — declarative specs become the
machine-checkable acceptance gate.

Triggers on prompts like "write Gherkin for…", "review these feature files", or
"are these scenarios DRY?".

### erd-modeler

Turn a natural-language domain description into a clean, normalized **DBML** data model,
**validate** it against best practices, then **prove it works** by live-testing it against a
real in-memory Postgres (PGlite) — generating SQL, seed data, and asserting business-use-case
queries, looping until every use-case passes. The PGlite harness auto-installs its one
dependency on first run (no manual setup, no native Postgres needed).

Triggers on prompts like "design a data model for…", "create an ERD", or "validate this schema".

## Repository layout

```
.claude-plugin/marketplace.json   # marketplace manifest (lists the plugins below)
plugins/<name>/                    # one directory per plugin
  .claude-plugin/plugin.json       # plugin manifest
  skills/<name>/                   # the skill (SKILL.md + references/ + assets|scripts/)
docs/superpowers/                  # design specs, implementation plans, validation records
```

## Development

Each plugin is built from a design spec and an implementation plan under
`docs/superpowers/`, then validated before landing. The `erd-modeler` PGlite harness has
its own self-test:

```
cd plugins/erd-modeler/skills/erd-modeler/scripts && npm test
```

## License

MIT — see [LICENSE](LICENSE).
