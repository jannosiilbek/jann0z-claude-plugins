# Stack Presets Design

## Problem

The napkin DDD pipeline's `## Structure` and `## Conventions` sections in `stack.md` are:

1. **Detail-poor** — the implementing agent gets compact bullet lines; the exhaustive annotated file tree lives only in `spec-format.md`, not in the generated artifact.
2. **TypeScript-only** — the defaults assume Hono monorepo unconditionally; other languages get the same scaffold emitted verbatim.
3. **Gate-invisible** — `check-align.mjs` skips `## Conventions` and `## Structure`; errors pass the gate silently.
4. **Dead-letter `packages/domains`** — `ddd-brief` writes a generic placeholder; `ddd-domain` was instructed to update it but its SKILL.md makes no mention of doing so.

## Solution

Introduce named stack presets — one file per preset — and gate enforcement for structure fields.

---

## Preset files

**Location:** `plugins/napkin/skills/ddd-brief/references/stacks/`

```
stacks/
  hono-monorepo.md   ← current defaults, promoted to explicit preset
  fastapi.md         ← new Python/FastAPI preset
```

Each file is a **complete `stack.md` + `nfr.md` template** in the same markdown format that the pipeline writes. The skill reads the file and copies it verbatim, substituting only the project name. Presets stay in sync with the artifact grammar defined in `spec-format.md` by construction — they are valid artifact stubs.

Each preset includes:

- `- Preset: <name>` field in `## Runtime` (new field; identifies which preset was applied)
- The **exhaustive annotated reference tree** in `## Structure` — one file per folder, per-stereotype filenames inside `packages/domains/<bc>/`. This is the detail currently buried in `spec-format.md §7`; moving it into the preset means implementing agents get it from `stack.md` directly.

### `hono-monorepo` preset (current defaults)

Full TypeScript stack: Hono, pnpm, Drizzle + drizzle-kit, TypeID, JWT via jose, Vitest, PGlite, playwright-bdd. File naming: `stereotype.identifier` (e.g. `enrollment.aggregate.ts`, `enroll-student.usecase.ts`). File structure: flat per stereotype.

Monorepo layout:
- `apps/api` — Hono server (shared by web + www)
- `apps/web` — authenticated SaaS product
- `apps/www` — public marketing site
- `packages/api` — Hono routes + middleware; AppType for RPC
- `packages/domains` — DDD bounded contexts (flat stereotype naming)
- `packages/core` — AggregateRoot, Entity, ValueObject, DomainEvent base classes
- `packages/ui` — shared component library
- `packages/db` — Drizzle schema, migrations, typed client
- `packages/tsconfig` — shared TypeScript config
- `tooling/eslint` — shared ESLint config
- `tests/e2e` — cross-domain browser flows
- `tests/fixtures` — playwright fixtures

### `fastapi` preset

Python stack: FastAPI, uv, SQLAlchemy + Alembic, UUID identity, JWT via python-jose, pytest + SQLite in-memory, playwright-bdd. File naming: `stereotype_identifier` (e.g. `enrollment_aggregate.py`, `enroll_student_usecase.py`). File structure: flat per stereotype.

Monorepo layout:
- `apps/api` — FastAPI server
- `packages/domains` — DDD bounded contexts (flat stereotype naming)
- `packages/core` — AggregateRoot, Entity, ValueObject, DomainEvent base classes
- `packages/db` — SQLAlchemy models, Alembic migrations, typed session
- `tests/e2e` — cross-domain browser flows
- `tests/fixtures` — pytest fixtures / conftest

---

## Elicitation flow change (`ddd-brief`)

A preset dispatch question is added as the first stack question — before Tier 1 domain questions, not counted against the ~5 question budget:

> "Which stack? **(1) Hono monorepo** [default — TypeScript, Hono, Drizzle, Vitest] / **(2) FastAPI** [Python, SQLAlchemy, pytest] / **(3) Custom** [answer the questions manually]"

Rules:

- If provided material already names a framework, the skill selects the matching preset automatically and states which one was chosen — no question asked.
- Selecting (1) or (2): skill reads the preset file; all Tier 1 + Tier 2 stack fields are considered covered. Override questions are asked only when provided material contradicts the preset.
- Selecting (3): normal Tier 1/2 elicitation runs unchanged.

---

## Dead-letter fix (`ddd-domain`)

`ddd-domain/SKILL.md` gains an explicit step: after writing `spec/glossary.md`, update the `packages/domains` entries in `spec/stack.md` — replacing the generic `- packages/domains: DDD bounded contexts` line with one entry per bounded context:

```
- packages/domains/<bc>: <bc> bounded context
```

This is a delta update per the §1.4 update protocol (read first, touch only that line, append one Changelog entry).

---

## Gate enforcement (`check-align.mjs`)

Three new checks, activating whenever `spec/stack.md` is present:

### AL-20 — `## Conventions` shape

Fails if `## Conventions` section is absent, or if `File naming:` or `File structure:` fields are missing.

```
AL-20 stack.md §Conventions missing required field: File naming
AL-20 stack.md §Conventions missing required field: File structure
```

### AL-21 — `## Structure` shape

Fails if `## Structure` section is absent, `Repo:` field is absent, or fewer than 3 path entries (`- <path>: <description>` lines) are present.

```
AL-21 stack.md §Structure missing Repo field
AL-21 stack.md §Structure has fewer than 3 path entries (found N)
```

### AL-22 — `Preset:` is a known value

Fails if a `Preset:` field is present but its value is not a known preset name. Known values: `hono-monorepo`, `fastapi`.

```
AL-22 stack.md unknown Preset value: <value>
```

Gate is structural — it verifies section existence and minimum population, not that every path entry is valid. This keeps the gate fast and false-positive-free.

Selftest fixtures: one malformed `stack.md` per check (triggers the error), one correct `stack.md` (passes all three).

---

## Artifacts touched

| Artifact | Change |
|----------|--------|
| `ddd-brief/references/stacks/hono-monorepo.md` | New file — current defaults as explicit preset |
| `ddd-brief/references/stacks/fastapi.md` | New file — Python/FastAPI preset |
| `ddd-brief/SKILL.md` | Add preset dispatch question to §2a; add preset file read to §4a |
| `ddd-brief/references/elicitation.md` | Add preset dispatch to Stack/NFR coverage checklist |
| `ddd-domain/SKILL.md` | Add `packages/domains` update step after glossary write |
| `ddd-align/references/spec-format.md` | Document `Preset:` field in §7; add AL-20/AL-21/AL-22 to check list |
| `ddd-align/scripts/check-align.mjs` | Implement AL-20, AL-21, AL-22 |
| `ddd-align/scripts/selftest.mjs` | Add fixtures for AL-20, AL-21, AL-22 |

## Out of scope

- Conformance gate (checking every field against the preset definition) — deferred; `Preset:` field enables it later without changes to stack.md format.
- Additional presets (e.g. Django, Express, Nest.js) — the one-file-per-preset pattern makes them additive; out of scope for this iteration.
- Updating pipeline eval scenarios to include `stack.md` — separate work.
