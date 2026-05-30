# jann0z-claude-plugins

A personal [Claude Code](https://claude.com/claude-code) plugin marketplace.

## Install

```
/plugin marketplace add jannosiilbek/jann0z-claude-plugins
/plugin install gherkin@jann0z-claude-plugins
/plugin install erd-modeler@jann0z-claude-plugins
```

## Plugins

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

## License

MIT — see [LICENSE](LICENSE).
