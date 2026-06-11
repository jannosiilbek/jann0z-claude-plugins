# jann0z-claude-plugins

A personal [Claude Code](https://claude.com/claude-code) plugin marketplace, packaged so it
can be installed and shared from one place.

## Install

Add the marketplace once, then install the plugin:

```
/plugin marketplace add jannosiilbek/jann0z-claude-plugins
/plugin install napkin@jann0z-claude-plugins
```

## Plugins

| Plugin | What it does |
|--------|--------------|
| [`napkin`](plugins/napkin) | **erd-modeler** — design, validate, and live-test a relational data model; **erd-diagram** — render a DBML model into an interactive HTML ER diagram |

### napkin → erd-modeler

Turn a domain description into a clean, normalized **DBML** data model, **validate** it against
best practices, then **prove it works** by live-testing against a real in-memory Postgres
(PGlite):

```
domain description (or an optional glossary)
  → DBML model
  → best-practices audit (normalization, keys, relationships, traps)
  → live-test on PGlite: generate schema.sql + seed.sql + one asserting query per
    business use-case, loop with fixes until every use-case passes
  → model.dbml   (the deliverable)
```

- Normalized DBML with TypeID primary keys, explicit types, inline refs, and bridge tables for
  every many-to-many.
- A best-practices audit (`references/validation-rules.md`) run on every invocation.
- A closed-loop live test against PGlite (a WASM build of Postgres) that refuses false-greens:
  an assertion passes only when it has actually proven something.

The skill triggers on its own — "design a data model for…", "create an ERD", "model this domain",
"validate this DBML/schema". It works standalone from a natural-language description; if a
`spec/glossary.md` is present it is used as the canonical source of entity names and enum values.

### napkin → erd-diagram

Render an existing **DBML** model into a single, self-contained, professional HTML ER diagram
(dbdiagram.io-style layout, interactive pan/zoom) and open it in the browser. The diagram is
produced by a real layout engine (WASM Graphviz via `@softwaretechnik/dbml-renderer`), never
hand-drawn, and the HTML works fully offline.

Manual-only by design: it never auto-triggers — invoke it explicitly:

```
/erd-diagram [path-to.dbml]
```

## Repository layout

```
.claude-plugin/marketplace.json        # marketplace manifest
plugins/napkin/
  .claude-plugin/plugin.json           # plugin manifest
  skills/erd-modeler/                  # modelling skill: SKILL.md + references/ + scripts/
  skills/erd-diagram/                  # rendering skill: SKILL.md + scripts/
```

## Development

Each skill's harness has its own self-test:

```
cd plugins/napkin/skills/erd-modeler/scripts && npm test
cd plugins/napkin/skills/erd-diagram/scripts && npm test
```

## License

MIT — see [LICENSE](LICENSE).
