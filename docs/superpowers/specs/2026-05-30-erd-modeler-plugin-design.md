# Design: erd-modeler plugin (landing an existing skill)

**Date:** 2026-05-30
**Status:** Approved (autonomous) — packaging an already-implemented skill
**Author:** janno

## 1. Overview

Land the already-implemented `erd-modeler` skill (currently at `~/.claude/skills/erd-modeler`)
as the **second plugin** in the `jann0z-claude-plugins` marketplace, following the same
structure established by the `gherkin` plugin.

The skill turns a natural-language domain description into a clean, normalized **DBML** model,
validates it against best practices, then **live-tests** it against an in-memory Postgres
(PGlite) — looping until every business use-case passes. It ships a Node harness
(`scripts/run-erd-test.mjs`) and an adversarial self-test (`scripts/selftest.mjs`).

This is a packaging task, not a feature build: the skill content is finished and is copied
verbatim. The design decisions below are about *how it lands in the repo*.

## 2. Key decisions

- **New plugin id:** `erd-modeler`, at `plugins/erd-modeler/`, mirroring `plugins/gherkin/`.
- **Skill location:** `plugins/erd-modeler/skills/erd-modeler/` (auto-discovery path).
- **Dependency handling — ship source only, NOT vendored `node_modules`.** The skill author
  documented this explicitly in `scripts/README.md`: the harness is deliberately *not* shipped
  with a frozen `node_modules`; `run-erd-test.mjs` runs `npm install` once on first use so it
  picks up PGlite improvements and matches the local Node/OS. Vendoring the ~MB WASM build
  (`pglite.wasm`, `pglite.data`) would bloat a public repo and contradict that design. The repo
  root `.gitignore` already excludes `node_modules/`.
- **Omit `package-lock.json`** as well, to honor the author's "fresh install floats within the
  `^0.4.6` caret range" rationale. `package.json` is shipped (it carries the dependency range the
  auto-installer uses).
- **Files shipped:** `SKILL.md`, `references/{metamodel,validation-rules,live-testing}.md`,
  `scripts/{run-erd-test.mjs, selftest.mjs, package.json, README.md}`.
- **plugin.json / marketplace entry:** mirror gherkin's shape (version `0.1.0`, MIT, author janno).
- **README:** add an `### erd-modeler` entry under Plugins.

## 3. Resulting structure

```
plugins/erd-modeler/
├── .claude-plugin/
│   └── plugin.json
└── skills/erd-modeler/
    ├── SKILL.md
    ├── references/
    │   ├── metamodel.md
    │   ├── validation-rules.md
    │   └── live-testing.md
    └── scripts/
        ├── run-erd-test.mjs      # PGlite harness; auto-installs pglite on first run
        ├── selftest.mjs          # adversarial false-green regression suite
        ├── package.json          # declares @electric-sql/pglite ^0.4.6
        └── README.md
```

## 4. Validation

1. **Structural** — `marketplace.json` lists both `gherkin` and `erd-modeler`; both `plugin.json`
   manifests parse; the skill is at the auto-discovery path with valid frontmatter.
2. **Harness self-test** — run `node scripts/selftest.mjs` in the landed location; it auto-installs
   PGlite (needs npm + network on first run) and must exit 0 (the adversarial suite proves the
   oracle refuses false-green). If the environment is offline, record that and fall back to
   structural validation.
3. **Smoke run** — feed a tiny schema/seed/usecases trio through `run-erd-test.mjs` and confirm a
   green JSON summary.
4. **No `node_modules/` committed** — confirm git does not track any `node_modules` path.

## 5. Non-goals

- No edits to the skill's content/logic (it is finished; copied verbatim).
- No changes to the `gherkin` plugin.

## 6. Next step

Hand to writing-plans → subagent-driven execution → finish branch.
