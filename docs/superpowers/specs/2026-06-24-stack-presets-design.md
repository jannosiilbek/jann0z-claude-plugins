# Stack Presets Design

## Problem

The napkin DDD pipeline's `## Structure` and `## Conventions` sections in `stack.md` are:

1. **Detail-poor** — the implementing agent gets compact bullet lines; the exhaustive annotated file tree lives only in `spec-format.md`, not in the generated artifact.
2. **TypeScript-only** — the defaults assume Hono monorepo unconditionally; other languages get the same scaffold emitted verbatim.
3. **Gate-invisible** — `check-align.mjs` skips `## Conventions` and `## Structure`; errors pass the gate silently.
4. **Dead-letter `packages/domains`** — `ddd-brief` writes a generic placeholder; `ddd-domain` was instructed to update it but its SKILL.md makes no mention of doing so.

## Solution

Introduce named stack presets (language/framework) and infra presets (cloud target) — one file per preset — plus gate enforcement for structure and convention fields.

---

## Preset files

Two separate preset dimensions, each with one file per option:

**Stack presets** — language, framework, ORM, testing, conventions, monorepo structure:

**Location:** `plugins/napkin/skills/ddd-brief/references/stacks/`

```
stacks/
  hono-monorepo.md   ← current defaults, promoted to explicit preset
  fastapi.md         ← new Python/FastAPI preset
```

**Infra presets** — cloud target, IaC, environments, deployment shape. Pulumi is the constant default across all three:

**Location:** `plugins/napkin/skills/ddd-brief/references/infra/`

```
infra/
  both.md   ← aws + gcp [default]
  gcp.md    ← GCP only
  aws.md    ← AWS only
```

Each infra preset contains the `## Deployment` and `## Pipeline` sections; both are merged into `stack.md` after the stack preset is applied. The stack preset does **not** include these sections — they come exclusively from the infra preset.

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

### Infra presets

All three infra presets share the same shape; only `Clouds:` differs. Each contains two sections — `## Deployment` and `## Pipeline`:

```
## Deployment
- Target: container
- Environment config: <dotenv | python-dotenv>   ← resolved from stack preset
- IaC: Pulumi
- Clouds: <aws, gcp | gcp | aws>
- Environments: preview, staging, production
- Preview: per-PR

## Pipeline
- CI: GitHub Actions
- Branching: GitHub Flow
- Branch map: feature/* → preview · main → staging · staging → production (manual)
- Gates: lint · type-check · test · build · deploy
```

`Environment config` is the one field that varies by language (`dotenv` for TypeScript, `python-dotenv` for Python) — the infra preset uses a placeholder that the skill resolves from the active stack preset before writing.

`Branch map` encodes the full promotion chain: feature branches auto-deploy to ephemeral preview environments (per-PR), merging to `main` auto-deploys to staging, and staging → production is a manual promote (GitHub Actions `workflow_dispatch`). The `·` separator matches the existing spec-format.md inline-list convention.

`Gates` are the ordered CI steps that run on every PR: lint → type-check → test → build → deploy (to preview). On merge to `main`: same gates, deploy target is staging.

---

## Elicitation flow change (`ddd-brief`)

Two preset dispatch questions are added before Tier 1 domain questions, neither counted against the ~5 question budget:

**Q1 — Stack:**
> "Which stack? **(1) Hono monorepo** [default — TypeScript, Hono, Drizzle, Vitest] / **(2) FastAPI** [Python, SQLAlchemy, pytest] / **(3) Custom** [answer the questions manually]"

**Q2 — Cloud:**
> "Which cloud? **(1) Both** [default — AWS + GCP] / **(2) GCP** / **(3) AWS** / **(4) Custom**"

**Q3 — CI:**
> "Which CI? **(1) GitHub Actions** [default] / **(2) Custom**"

Rules:

- If provided material already names a framework or cloud, the skill selects the matching preset automatically and states which ones were chosen — no question asked.
- If provided material already names a framework, cloud, or CI tool, the skill auto-selects and states which presets were chosen — no question asked for that dimension.
- Selecting a named preset for stack or cloud: skill reads the corresponding file; all Tier 1 + Tier 2 fields for that dimension are considered covered. Override questions are asked only when provided material contradicts a preset field.
- Q3 CI: selecting GitHub Actions uses the preset's `## Pipeline` section verbatim. Selecting Custom triggers manual elicitation of `CI:`, `Branching:`, `Branch map:`, and `Gates:`.
- Selecting Custom for any dimension: normal Tier 1/2 elicitation runs for that dimension only.
- All three questions must be answered (or auto-resolved) before writing any artifact.

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

### AL-23 — Convention conformance

When a `Preset:` field is declared, the gate reads the corresponding preset file and checks that `File naming:` and `File structure:` in `stack.md` match the preset's declared values exactly. This is the one conformance check — catching the most common drift (e.g., writing a FastAPI preset but leaving TypeScript dot-notation in `## Conventions`).

```
AL-23 stack.md §Conventions File naming mismatch: expected "stereotype_identifier", got "stereotype.identifier"
AL-23 stack.md §Conventions File structure mismatch: expected "flat per stereotype", got "domain-grouped"
```

### AL-24 — `## Pipeline` shape

Fails if `## Pipeline` section is absent, or if `CI:`, `Branching:`, or `Branch map:` fields are missing.

```
AL-24 stack.md §Pipeline missing required field: CI
AL-24 stack.md §Pipeline missing required field: Branching
AL-24 stack.md §Pipeline missing required field: Branch map
```

Gate is structural for AL-20/21/22/24, and convention-conformant for AL-23. Path entries in `## Structure` and gate step values in `## Pipeline` are not validated — correctness there is the model's responsibility.

Selftest fixtures: one malformed `stack.md` per check (triggers the error), one correct `stack.md` (passes all five).

---

## Artifacts touched

| Artifact | Change |
|----------|--------|
| `ddd-brief/references/stacks/hono-monorepo.md` | New file — current defaults as explicit preset (no `## Deployment` section) |
| `ddd-brief/references/stacks/fastapi.md` | New file — Python/FastAPI preset (no `## Deployment` section) |
| `ddd-brief/references/infra/both.md` | New file — AWS + GCP infra preset [default] |
| `ddd-brief/references/infra/gcp.md` | New file — GCP-only infra preset |
| `ddd-brief/references/infra/aws.md` | New file — AWS-only infra preset |
| `ddd-brief/SKILL.md` | Add three dispatch questions (stack + cloud + CI) to §2a; add preset + infra file read + merge to §4a |
| `ddd-brief/references/elicitation.md` | Add preset, infra, and CI dispatch to Stack/NFR coverage checklist |
| `ddd-domain/SKILL.md` | Add `packages/domains` update step after glossary write |
| `ddd-align/references/spec-format.md` | Document `Preset:` field in §7; document `## Pipeline` section in §7; add AL-20–AL-24 to check list |
| `ddd-align/scripts/check-align.mjs` | Implement AL-20, AL-21, AL-22, AL-23, AL-24 |
| `ddd-align/scripts/selftest.mjs` | Add fixtures for AL-20, AL-21, AL-22, AL-23, AL-24 |

## Out of scope

- Full conformance gate (checking every field against the preset definition) — deferred; `Preset:` field enables it later without changes to stack.md format.
- Additional presets (e.g. Django, Express, Nest.js) — the one-file-per-preset pattern makes them additive; out of scope for this iteration.
- Additional infra presets (e.g. Azure, multi-cloud beyond aws+gcp) — same pattern, out of scope for this iteration.
- Updating pipeline eval scenarios to include `stack.md` — separate work.
