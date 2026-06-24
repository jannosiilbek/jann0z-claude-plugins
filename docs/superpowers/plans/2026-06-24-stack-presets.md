# Stack Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce named stack presets (`hono-monorepo`, `fastapi`) and infra presets (`both`, `gcp`, `aws`) so `ddd-brief` writes a complete, language-correct `stack.md` from templates instead of hardcoded TypeScript defaults; gate-enforce the structure/convention/pipeline sections with AL-20–AL-24.

**Architecture:** Preset files live in `ddd-brief/references/stacks/` and `ddd-brief/references/infra/`; `ddd-brief/SKILL.md` selects them via three dispatch questions (stack, cloud, CI); `check-align.mjs` gains five new checks activated whenever `stack.md` is present. The `ddd-domain` skill is patched to resolve the dead-letter `packages/domains` update. `spec-format.md` is updated as the canonical grammar reference.

**Tech Stack:** Node.js ESM (zero additional dependencies), Markdown template files.

## Global Constraints

- `check-align.mjs` must remain zero-runtime-dependency — no `import` of external packages.
- Preset files are valid `stack.md` fragment stubs in the same Markdown grammar spec-format.md defines.
- All new AL checks activate only when `spec/stack.md` is present; they never fire on specs that predate the stack artifact.
- Stack preset files (`stacks/`) must NOT include `## Deployment` or `## Pipeline` — those come exclusively from infra presets (`infra/`).
- Infra preset files (`infra/`) must NOT include a `<!-- ddd: ... -->` marker — they are partial templates, not spec artifacts.
- `npm test` in `plugins/napkin/skills/ddd-align/scripts/` must pass after every task that touches `check-align.mjs` or `selftest.mjs`.

---

### Task 1: Create stack preset files

**Files:**
- Create: `plugins/napkin/skills/ddd-brief/references/stacks/hono-monorepo.md`
- Create: `plugins/napkin/skills/ddd-brief/references/stacks/fastapi.md`

**Interfaces:**
- Produces: two complete `stack.md` templates (minus `## Deployment` / `## Pipeline`) read by `ddd-brief/SKILL.md` in Task 5

- [ ] **Step 1: Create `stacks/hono-monorepo.md`**

```
plugins/napkin/skills/ddd-brief/references/stacks/hono-monorepo.md
```

Content:

```markdown
# Stack — <Project name>
<!-- ddd: stack -->

## Runtime
- Language: TypeScript
- Framework: Hono
- Preset: hono-monorepo
- Package manager: pnpm

## Interface
- Kind: REST API
- Protocol: HTTP/1.1

## Data layer
- ORM: Drizzle
- Migration tool: drizzle-kit
- Identity strategy: TypeID

## Auth
- Mechanism: JWT
- Library: jose

## Conventions
- File naming: stereotype.identifier (e.g. enrollment.aggregate.ts, enroll-student.usecase.ts)
- File structure: flat per stereotype

## Integrations
- Adapter pattern: yes
- Mock: yes
- Mock activation: USE_MOCK=true
- Mock scope: local dev, unit tests, e2e

## Testing
- Framework: Vitest
- DB strategy: PGlite
- E2E: playwright-bdd

## Structure
- Repo: monorepo
- apps/api: Hono server (shared by web + www)
- apps/web: authenticated SaaS product
- apps/www: public marketing site
- packages/api: Hono routes + middleware; AppType for RPC
- packages/domains: DDD bounded contexts
- packages/core: AggregateRoot, Entity, ValueObject, DomainEvent
- packages/ui: shared component library
- packages/db: Drizzle schema, migrations, typed client
- packages/tsconfig: shared TypeScript config
- tooling/eslint: shared ESLint config
- tests/e2e: browser flows (cross-domain)
- tests/fixtures: playwright fixtures

Reference tree (one sample file per folder — implementing agents use this as the canonical layout):

```
apps/
  api/
    src/
      index.ts                    — serve(app) + runtime adapter
  web/
    src/
      index.tsx
  www/
    src/
      index.tsx

packages/
  api/
    routes/
      <noun>.ts                   — one file per resource group
    middleware/
      auth.ts
    index.ts                      — AppType export for hc<AppType> RPC client

  domains/                        — flat stereotype naming inside each bc folder
    <bc>/
      <bc>.aggregate.ts
      <noun>.entity.ts
      <noun>.value-object.ts
      <noun>.domain-event.ts
      <bc>.repository.ts          — persistence interface (domain layer)
      <verb>-<noun>.usecase.ts    — one use case per file
      <verb>-<noun>.feature       — Gherkin spec, co-located (maps to UC-xxx)
      <verb>-<noun>.steps.ts      — playwright-bdd step definitions
      <bc>.repo.ts                — Drizzle implementation of repository
      <bc>.mapper.ts              — domain ↔ persistence mapping

  core/
    aggregate-root.ts
    entity.ts
    value-object.ts
    domain-event.ts
    repository.ts                 — generic Repository<T> interface
    usecase.ts                    — UseCase<TInput, TOutput> interface

  ui/
    src/
      button.tsx
      form.tsx
      index.ts

  db/
    drizzle.config.ts
    src/
      client.ts                   — driver setup, exports Db type
      migrate.ts
      schema/
        <noun>.ts                 — one file per domain concept
        index.ts
      index.ts                    — export { schema, createDb, type Db }
    drizzle/                      — generated migrations (gitignored)

  tsconfig/
    base.json
    node.json

tooling/
  eslint/
    index.js

tests/
  e2e/
    features/
      <flow>.feature
      <flow>.steps.ts
  fixtures/
    api-world.ts
    ui-world.ts

playwright.config.ts
```

## Changelog
- <DATE> (ddd-brief): created from hono-monorepo preset
```

- [ ] **Step 2: Create `stacks/fastapi.md`**

```
plugins/napkin/skills/ddd-brief/references/stacks/fastapi.md
```

Content:

```markdown
# Stack — <Project name>
<!-- ddd: stack -->

## Runtime
- Language: Python
- Framework: FastAPI
- Preset: fastapi
- Package manager: uv

## Interface
- Kind: REST API
- Protocol: HTTP/1.1

## Data layer
- ORM: SQLAlchemy
- Migration tool: Alembic
- Identity strategy: UUID

## Auth
- Mechanism: JWT
- Library: python-jose

## Conventions
- File naming: stereotype_identifier (e.g. enrollment_aggregate.py, enroll_student_usecase.py)
- File structure: flat per stereotype

## Integrations
- Adapter pattern: yes
- Mock: yes
- Mock activation: USE_MOCK=true
- Mock scope: local dev, unit tests, e2e

## Testing
- Framework: pytest
- DB strategy: SQLite (in-memory)
- E2E: playwright-bdd

## Structure
- Repo: monorepo
- apps/api: FastAPI server
- packages/domains: DDD bounded contexts
- packages/core: AggregateRoot, Entity, ValueObject, DomainEvent
- packages/db: SQLAlchemy models, Alembic migrations, typed session
- tests/e2e: browser flows (cross-domain)
- tests/fixtures: pytest fixtures / conftest

Reference tree (one sample file per folder — implementing agents use this as the canonical layout):

```
apps/
  api/
    src/
      main.py                     — FastAPI app + router registration
      dependencies.py             — DI dependencies (db session, current user)

packages/
  domains/                        — flat stereotype naming inside each bc folder
    <bc>/
      <bc>_aggregate.py
      <noun>_entity.py
      <noun>_value_object.py
      <noun>_domain_event.py
      <bc>_repository.py          — persistence interface (domain layer)
      <verb>_<noun>_usecase.py    — one use case per file
      <verb>_<noun>.feature       — Gherkin spec, co-located (maps to UC-xxx)
      <verb>_<noun>_steps.py      — playwright-bdd step definitions
      <bc>_repo.py                — SQLAlchemy implementation of repository
      <bc>_mapper.py              — domain ↔ persistence mapping

  core/
    aggregate_root.py
    entity.py
    value_object.py
    domain_event.py
    repository.py                 — generic Repository[T] protocol
    usecase.py                    — UseCase[TInput, TOutput] protocol

  db/
    alembic.ini
    src/
      client.py                   — engine + session setup, exports Session type
      models/
        <noun>.py                 — one file per domain concept
        __init__.py
      index.py                    — export engine, Session, Base
    alembic/
      versions/                   — generated migration scripts (gitignored)
      env.py

tests/
  e2e/
    features/
      <flow>.feature
      <flow>_steps.py
  fixtures/
    conftest.py                   — pytest fixtures (db session, client, auth)

playwright.config.ts
```

## Changelog
- <DATE> (ddd-brief): created from fastapi preset
```

- [ ] **Step 3: Commit**

```bash
git add plugins/napkin/skills/ddd-brief/references/stacks/
git commit -m "feat(napkin/ddd-brief): add hono-monorepo and fastapi stack preset templates"
```

---

### Task 2: Create infra preset files

**Files:**
- Create: `plugins/napkin/skills/ddd-brief/references/infra/both.md`
- Create: `plugins/napkin/skills/ddd-brief/references/infra/gcp.md`
- Create: `plugins/napkin/skills/ddd-brief/references/infra/aws.md`

**Interfaces:**
- Produces: three `## Deployment` + `## Pipeline` fragments merged into `stack.md` by `ddd-brief/SKILL.md` in Task 5
- `<env-config>` placeholder is resolved by `ddd-brief` from the active stack preset (`dotenv` for TypeScript, `python-dotenv` for Python) before writing

- [ ] **Step 1: Create `infra/both.md`**

```markdown
<!-- infra-preset: both -->

## Deployment
- Target: container
- Environment config: <env-config>
- IaC: Pulumi
- Clouds: aws, gcp
- Environments: preview, staging, production
- Preview: per-PR

## Pipeline
- CI: GitHub Actions
- Branching: GitHub Flow
- Branch map: feature/* → preview · main → staging · staging → production (manual)
- Gates: lint · type-check · test · build · deploy
```

- [ ] **Step 2: Create `infra/gcp.md`**

```markdown
<!-- infra-preset: gcp -->

## Deployment
- Target: container
- Environment config: <env-config>
- IaC: Pulumi
- Clouds: gcp
- Environments: preview, staging, production
- Preview: per-PR

## Pipeline
- CI: GitHub Actions
- Branching: GitHub Flow
- Branch map: feature/* → preview · main → staging · staging → production (manual)
- Gates: lint · type-check · test · build · deploy
```

- [ ] **Step 3: Create `infra/aws.md`**

```markdown
<!-- infra-preset: aws -->

## Deployment
- Target: container
- Environment config: <env-config>
- IaC: Pulumi
- Clouds: aws
- Environments: preview, staging, production
- Preview: per-PR

## Pipeline
- CI: GitHub Actions
- Branching: GitHub Flow
- Branch map: feature/* → preview · main → staging · staging → production (manual)
- Gates: lint · type-check · test · build · deploy
```

- [ ] **Step 4: Commit**

```bash
git add plugins/napkin/skills/ddd-brief/references/infra/
git commit -m "feat(napkin/ddd-brief): add both/gcp/aws infra preset templates"
```

---

### Task 3: Add failing selftest cases for AL-20–AL-24 + update golden fixture

**Files:**
- Modify: `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/stack.md`
- Modify: `plugins/napkin/skills/ddd-align/scripts/selftest.mjs`

**Interfaces:**
- Consumes: the existing `selftest.mjs` pattern (`testCase`, `edit`, `caught`, `hasCheck`)
- Produces: 6 new failing test cases; golden updated to include `## Pipeline` (required for AL-24 baseline)

- [ ] **Step 1: Add `## Pipeline` section to golden `stack.md`**

In `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/stack.md`, insert before `## Changelog`:

```markdown
## Pipeline
- CI: GitHub Actions
- Branching: GitHub Flow
- Branch map: feature/* → preview · main → staging · staging → production (manual)
- Gates: lint · type-check · test · build · deploy

```

Final file should look like:

```markdown
# Stack — Course Platform
<!-- ddd: stack -->

## Runtime
- Language: TypeScript
- Framework: Fastify
- Package manager: pnpm

## Interface
- Kind: REST API
- Protocol: HTTP/1.1

## Data layer
- ORM: Prisma
- Migration tool: Prisma Migrate
- Identity strategy: TypeID

## Auth
- Mechanism: JWT
- Library: jose

## Conventions
- File naming: stereotype.identifier (e.g. enrollment.aggregate.ts, enroll-student.usecase.ts)
- File structure: flat per stereotype

## Structure
- Repo: monorepo
- apps/api: API server entry point
- packages/api: routes + middleware; AppType for RPC
- packages/domains: DDD bounded contexts (enrollment/)
- packages/core: AggregateRoot, Entity, ValueObject, DomainEvent
- packages/db: schema, migrations, typed client
- packages/tsconfig: shared TypeScript config

## Deployment
- Target: container
- Environment config: dotenv

## Pipeline
- CI: GitHub Actions
- Branching: GitHub Flow
- Branch map: feature/* → preview · main → staging · staging → production (manual)
- Gates: lint · type-check · test · build · deploy

## Testing
- Framework: Vitest
- DB strategy: PGlite

## Changelog
- 2026-06-22 (ddd-brief): created
```

- [ ] **Step 2: Add 6 failing test cases to `selftest.mjs`**

Append before the final `console.log` line in `selftest.mjs`:

```javascript
// AL-20: File naming field missing from ##Conventions.
testCase("stack.md missing File naming in §Conventions → AL-20",
  (s) => edit(s, "stack.md", (t) =>
    t.replace(/- File naming:.*\n/, "")),
  (r) => caught(r, "AL-20"));

// AL-21: Repo field missing from ##Structure.
testCase("stack.md missing Repo in §Structure → AL-21",
  (s) => edit(s, "stack.md", (t) =>
    t.replace(/- Repo:.*\n/, "")),
  (r) => caught(r, "AL-21"));

// AL-21: Fewer than 3 path entries in ##Structure.
testCase("stack.md §Structure fewer than 3 path entries → AL-21",
  (s) => edit(s, "stack.md", (t) => {
    let kept = 0;
    return t.replace(/^- (apps|packages|tests|tooling)\/.+$/gm, (m) => {
      kept++;
      return kept <= 2 ? m : "";
    });
  }),
  (r) => caught(r, "AL-21"));

// AL-22: Preset field set to an unrecognised name.
testCase("stack.md Preset: unknown-preset → AL-22",
  (s) => edit(s, "stack.md", (t) =>
    t.replace("- Language: TypeScript\n", "- Language: TypeScript\n- Preset: unknown-preset\n")),
  (r) => caught(r, "AL-22"));

// AL-23: Preset declared as hono-monorepo but File naming uses underscore convention.
testCase("stack.md Preset: hono-monorepo with wrong File naming → AL-23",
  (s) => edit(s, "stack.md", (t) =>
    t.replace("- Language: TypeScript\n", "- Language: TypeScript\n- Preset: hono-monorepo\n")
     .replace(/- File naming:.*/, "- File naming: stereotype_identifier (e.g. enrollment_aggregate.ts)")),
  (r) => caught(r, "AL-23"));

// AL-24: ##Pipeline section stripped entirely.
testCase("stack.md missing §Pipeline → AL-24",
  (s) => edit(s, "stack.md", (t) =>
    t.replace(/\n## Pipeline\n[\s\S]*?(?=\n## )/, "")),
  (r) => caught(r, "AL-24"));
```

- [ ] **Step 3: Run selftest — verify baseline passes and new cases all fail**

```bash
cd plugins/napkin/skills/ddd-align/scripts && npm test
```

Expected output: baseline passes, 6 new cases each print `❌ ... expected exit!=0 with an AL-2x error`.

- [ ] **Step 4: Commit**

```bash
git add plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/stack.md \
        plugins/napkin/skills/ddd-align/scripts/selftest.mjs
git commit -m "test(napkin/ddd-align): add failing AL-20–AL-24 selftest cases + update golden"
```

---

### Task 4: Implement AL-20–AL-24 in `check-align.mjs`

**Files:**
- Modify: `plugins/napkin/skills/ddd-align/scripts/check-align.mjs`

**Interfaces:**
- Consumes: `artifacts.stack` (already loaded by the existing artifact-scan loop)
- Produces: AL-20, AL-21, AL-22, AL-23, AL-24 error findings in the JSON output

- [ ] **Step 1: Add `PRESET_CONVENTIONS` constant after the `MARKER_RE` declaration**

After line `const MARKER_RE = /<!--\s*ddd:\s*([a-z]+)\s*-->/;` add:

```javascript
// Known preset conventions — inline to preserve zero-dependency contract.
// Adding a new preset requires updating this map AND adding an AL-22 known value.
const PRESET_CONVENTIONS = {
  "hono-monorepo": { "File naming": "stereotype.identifier", "File structure": "flat per stereotype" },
  "fastapi":       { "File naming": "stereotype_identifier",  "File structure": "flat per stereotype" },
};
```

- [ ] **Step 2: Add `parseStack` function after the `parseNfr` function**

After the closing `}` of `function parseNfr(art) { ... }` (around line 296), add:

```javascript
function parseStack(art) {
  const sections = {};
  let currentSection = null;
  for (let i = 0; i < art.lines.length; i++) {
    const line = art.lines[i];
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      currentSection = h2[1].trim();
      if (!sections[currentSection]) sections[currentSection] = { fields: {}, pathEntries: [] };
      continue;
    }
    if (!currentSection) continue;
    const f = line.match(FIELD_RE);
    if (f) {
      const key = f[1].trim();
      sections[currentSection].fields[key] = f[2].trim();
      if (key.includes("/")) sections[currentSection].pathEntries.push(key);
    }
  }
  return sections;
}
```

- [ ] **Step 3: Add `parseStack` call in the artifact-parse block**

After `const nfr = artifacts.nfr ? parseNfr(artifacts.nfr) : null;` (around line 342), add:

```javascript
const stackSections = artifacts.stack ? parseStack(artifacts.stack) : null;
```

- [ ] **Step 4: Add AL-20–AL-24 checks before the `// --- missing-artifact info` comment**

Insert the following block before the line `// --- missing-artifact info + --require` (around line 630):

```javascript
// --- AL-20..AL-24: stack.md structural checks (activate only when stack.md present)
if (stackSections) {
  // AL-20: ##Conventions must have File naming + File structure fields.
  const conv = stackSections["Conventions"];
  if (!conv) {
    report("AL-20", "error", "stack.md", 1, "§Conventions section is missing");
  } else {
    for (const field of ["File naming", "File structure"]) {
      if (!conv.fields[field]) {
        report("AL-20", "error", "stack.md", 1, `§Conventions missing required field: ${field}`);
      }
    }
  }

  // AL-21: ##Structure must have Repo field + at least 3 path entries.
  const struct = stackSections["Structure"];
  if (!struct) {
    report("AL-21", "error", "stack.md", 1, "§Structure section is missing");
  } else {
    if (!struct.fields["Repo"]) {
      report("AL-21", "error", "stack.md", 1, "§Structure missing Repo field");
    }
    if (struct.pathEntries.length < 3) {
      report("AL-21", "error", "stack.md", 1,
        `§Structure has fewer than 3 path entries (found ${struct.pathEntries.length})`);
    }
  }

  // AL-22: Preset: value must be a known preset name (when field is present).
  const preset = stackSections["Runtime"]?.fields?.["Preset"];
  if (preset !== undefined && !PRESET_CONVENTIONS[preset]) {
    report("AL-22", "error", "stack.md", 1, `unknown Preset value: ${preset}`);
  }

  // AL-23: When Preset: declared, File naming + File structure must match preset's values.
  if (preset && PRESET_CONVENTIONS[preset] && conv) {
    for (const [field, expectedVal] of Object.entries(PRESET_CONVENTIONS[preset])) {
      const actual = conv.fields[field];
      if (actual && !actual.startsWith(expectedVal)) {
        report("AL-23", "error", "stack.md", 1,
          `§Conventions ${field} mismatch: expected "${expectedVal}…", got "${actual}"`);
      }
    }
  }

  // AL-24: ##Pipeline must exist with CI, Branching, and Branch map fields.
  const pipeline = stackSections["Pipeline"];
  if (!pipeline) {
    report("AL-24", "error", "stack.md", 1, "§Pipeline section is missing");
  } else {
    for (const field of ["CI", "Branching", "Branch map"]) {
      if (!pipeline.fields[field]) {
        report("AL-24", "error", "stack.md", 1, `§Pipeline missing required field: ${field}`);
      }
    }
  }
}
```

- [ ] **Step 5: Run selftest — all cases must pass**

```bash
cd plugins/napkin/skills/ddd-align/scripts && npm test
```

Expected: all lines `✅`, final line `N passed, 0 failed`. Count must be 6 higher than before Task 3.

- [ ] **Step 6: Commit**

```bash
git add plugins/napkin/skills/ddd-align/scripts/check-align.mjs
git commit -m "feat(napkin/ddd-align): implement AL-20–AL-24 stack structure/convention/pipeline gate checks"
```

---

### Task 5: Fix dead-letter `packages/domains` update in `ddd-domain/SKILL.md`

**Files:**
- Modify: `plugins/napkin/skills/ddd-domain/SKILL.md`

**Interfaces:**
- Consumes: `spec/glossary.md` (bounded context names = `### <Term>` entries with `- Aggregate root: yes`)
- Produces: updated `- packages/domains/<bc>:` lines in `spec/stack.md`

- [ ] **Step 1: Add §4a after the closing paragraph of §4 in `ddd-domain/SKILL.md`**

After `### 4. Distill spec/glossary.md` section (the paragraph ending with "...never respell later."), insert:

```markdown
### 4a. Update packages/domains in spec/stack.md

When `spec/stack.md` exists and contains a `- packages/domains:` entry, replace it with
one line per bounded context identified during storming:

```
- packages/domains/<bc>: <bc> bounded context
```

where `<bc>` is the lowercase, hyphenated bounded context name (e.g. `enrollment`,
`payment-processing`). Apply the §1.4 update protocol: read the full file first, replace
only the `packages/domains` line(s), append one Changelog entry. If `spec/stack.md` does
not exist or has no `packages/domains` line, skip this step silently.
```

- [ ] **Step 2: Verify the edit looks correct**

```bash
grep -n "packages/domains" plugins/napkin/skills/ddd-domain/SKILL.md
```

Expected: the new §4a lines appear, with the instruction text.

- [ ] **Step 3: Commit**

```bash
git add plugins/napkin/skills/ddd-domain/SKILL.md
git commit -m "fix(napkin/ddd-domain): add §4a to update packages/domains in stack.md after glossary write"
```

---

### Task 6: Update `ddd-brief/SKILL.md` — add three dispatch questions

**Files:**
- Modify: `plugins/napkin/skills/ddd-brief/SKILL.md`

**Interfaces:**
- Consumes: `stacks/hono-monorepo.md`, `stacks/fastapi.md`, `infra/both.md`, `infra/gcp.md`, `infra/aws.md` (Task 1 + 2)
- Produces: complete `stack.md` (stack preset + infra preset merged, `<env-config>` resolved, `<DATE>` substituted with today's date, `<Project name>` substituted with the project name from the brief)

- [ ] **Step 1: Replace §2a in `ddd-brief/SKILL.md`**

Find the existing `### 2a. Elicit stack and NFR` section and replace it entirely with:

```markdown
### 2a. Elicit stack, infra, and CI — three dispatch questions, none count against the 5-question budget

Ask these three questions **before** domain Tier 1/2 questions. Each is a dispatch —
selecting a named option reads a preset file and considers that dimension fully covered.
Custom runs the existing Tier 1/2 elicitation for that dimension only.

**Q1 — Stack (ask first):**
> "Which stack? **(1) Hono monorepo** [default — TypeScript, Hono, Drizzle, Vitest] /
> **(2) FastAPI** [Python, SQLAlchemy, pytest] / **(3) Custom** [I'll answer the questions]"

**Q2 — Cloud (ask second):**
> "Which cloud? **(1) Both** [default — AWS + GCP, Pulumi] / **(2) GCP** / **(3) AWS** /
> **(4) Custom**"

**Q3 — CI (ask third):**
> "Which CI? **(1) GitHub Actions** [default — GitHub Flow, preview/staging/production] /
> **(2) Custom**"

Auto-resolution rules (skip the question when provided material already answers it):
- Q1: auto-resolved when material names a framework (`Hono`, `FastAPI`, etc.)
- Q2: auto-resolved when material names a cloud provider or IaC target
- Q3: auto-resolved when material names a CI system

Preset file locations (relative to `${CLAUDE_PLUGIN_ROOT}/skills/ddd-brief/`):
- Stack preset: `references/stacks/<name>.md` where `<name>` is `hono-monorepo` or `fastapi`
- Infra preset: `references/infra/<name>.md` where `<name>` is `both`, `gcp`, or `aws`

When reading infra preset files, resolve the `<env-config>` placeholder before writing:
- TypeScript stack → `dotenv`
- Python stack → `python-dotenv`

**DRY, dead code, and drift safety** are never asked — always write `## Code quality` in
nfr.md with `DRY: yes`, `Dead code: none`, `Drift safety: spec-traced`.
```

- [ ] **Step 2: Replace §4a in `ddd-brief/SKILL.md`**

Find the existing `### 4a. Write or update spec/stack.md and spec/nfr.md` section and replace the opening paragraphs with:

```markdown
### 4a. Write or update spec/stack.md and spec/nfr.md

**Greenfield:** Read the selected stack preset file and the selected infra preset file.
Merge them: stack preset content first, then `## Deployment` and `## Pipeline` from the
infra preset (with `<env-config>` resolved), then the nfr.md defaults. Substitute
`<Project name>` with the project name from the brief and `<DATE>` with today's date.
Write the merged result as `spec/stack.md` and `spec/nfr.md`.

If the user selected Custom for any dimension, elicit that dimension's fields via Tier
1/2 questions (§2a) and write the resulting values into the appropriate sections instead
of copying from the preset.

**Delta mode:** apply spec-format.md §1.4 — touch only fields whose answers changed,
preserve user edits verbatim, append one Changelog line. Never regenerate wholesale.
Omit sections the user didn't specify — no placeholders. An nfr.md with only
`## Error contracts` and `## Auth` is correct if the user didn't address performance.

**Exception:** when `Interface: Kind = none`, always write `Interface: Kind: none`
explicitly in stack.md — do not omit the section.

`unknown` values: a field the user has no opinion on is written as `unknown`. The
alignment checks skip unknown fields; the implementing agent uses framework defaults.
```

- [ ] **Step 3: Verify the edit looks correct**

```bash
grep -n "dispatch\|Q1\|Q2\|Q3\|preset" plugins/napkin/skills/ddd-brief/SKILL.md | head -20
```

Expected: lines from the new §2a appear with Q1/Q2/Q3 labels and preset file paths.

- [ ] **Step 4: Commit**

```bash
git add plugins/napkin/skills/ddd-brief/SKILL.md
git commit -m "feat(napkin/ddd-brief): add stack/cloud/CI dispatch questions and preset file reading"
```

---

### Task 7: Update `ddd-brief/references/elicitation.md` — add dispatch to coverage checklist

**Files:**
- Modify: `plugins/napkin/skills/ddd-brief/references/elicitation.md`

**Interfaces:**
- Consumes: the three dispatch questions defined in Task 6

- [ ] **Step 1: Add a Preset dispatch block at the top of the Stack/NFR coverage checklist**

Find the heading `## Stack/NFR coverage checklist` and insert immediately after it (before the `**Tier 1** ...` paragraph):

```markdown
## Preset dispatch (before Tier 1/2, not counted against the 5-question budget)

| Dimension | Question | Auto-resolved when |
|-----------|----------|--------------------|
| Stack | "Which stack? (1) Hono monorepo [default] / (2) FastAPI / (3) Custom" | Material names a framework |
| Cloud | "Which cloud? (1) Both [default — AWS + GCP] / (2) GCP / (3) AWS / (4) Custom" | Material names a cloud or IaC target |
| CI | "Which CI? (1) GitHub Actions [default] / (2) Custom" | Material names a CI system |

Named selections read the corresponding preset file and mark all fields in that dimension
as covered. Custom selections fall through to Tier 1/2 for that dimension only. Ask
questions in order (stack → cloud → CI) — Q1's answer may auto-resolve Q3 (e.g. "we use
GitHub Actions" in Q1 material).
```

- [ ] **Step 2: Verify**

```bash
grep -n "Preset dispatch\|Stack/NFR" plugins/napkin/skills/ddd-brief/references/elicitation.md
```

Expected: both headings appear, Preset dispatch before Stack/NFR coverage checklist.

- [ ] **Step 3: Commit**

```bash
git add plugins/napkin/skills/ddd-brief/references/elicitation.md
git commit -m "feat(napkin/ddd-brief): add preset dispatch block to elicitation coverage checklist"
```

---

### Task 8: Update `spec-format.md` — document new fields and AL-20–AL-24

**Files:**
- Modify: `plugins/napkin/skills/ddd-align/references/spec-format.md`

**Interfaces:**
- Produces: updated canonical grammar for `## Runtime › Preset:`, `## Pipeline`, and AL-20–AL-24

- [ ] **Step 1: Add `Preset:` field documentation in §7**

Find the paragraph in §7 that starts with `` `## Conventions` fields — `` and add before it:

```markdown
`- Preset: <name>` — optional field in `## Runtime`; names the stack preset that
produced this file (`hono-monorepo`, `fastapi`). When present, AL-22 validates it is a
known preset name and AL-23 validates that `File naming:` and `File structure:` in
`## Conventions` match the preset's declared values. Omit when no preset was used
(Custom selection or pre-preset spec).
```

- [ ] **Step 2: Add `## Pipeline` section documentation in §7**

After the `## Integrations` fields paragraph, add:

```markdown
`## Pipeline` — always included; declares the CI system, branching model, and
environment promotion chain:

```
## Pipeline
- CI: GitHub Actions
- Branching: GitHub Flow
- Branch map: feature/* → preview · main → staging · staging → production (manual)
- Gates: lint · type-check · test · build · deploy
```

Required fields (AL-24): `CI:`, `Branching:`, `Branch map:`. `Gates:` is optional but
strongly recommended. `Branch map:` uses the notation
`<branch-pattern> → <env>` with ` · ` as separator; `(manual)` appended to an env
signals a manual workflow_dispatch promote rather than an automatic deploy.
```

- [ ] **Step 3: Add AL-20–AL-24 to the check list in §11 (or wherever AL-17–AL-19 are documented)**

Find the line that documents AL-19 (or the paragraph describing the checks) and append:

```markdown
- **AL-20** — `stack.md §Conventions` shape: section must exist; `File naming:` and `File structure:` fields must be present.
- **AL-21** — `stack.md §Structure` shape: section must exist; `Repo:` field must be present; at least 3 path entries (`- <path>/…: …` lines) must be present.
- **AL-22** — `stack.md §Runtime Preset:` value must be a known preset name when the field is present.
- **AL-23** — When `Preset:` is declared, `File naming:` and `File structure:` in `§Conventions` must match the preset's canonical values.
- **AL-24** — `stack.md §Pipeline` shape: section must exist; `CI:`, `Branching:`, and `Branch map:` fields must be present.
```

- [ ] **Step 4: Run selftest one final time to confirm nothing regressed**

```bash
cd plugins/napkin/skills/ddd-align/scripts && npm test
```

Expected: all `✅`, `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add plugins/napkin/skills/ddd-align/references/spec-format.md
git commit -m "docs(napkin/spec-format): document Preset: field, §Pipeline section, and AL-20–AL-24"
```

---

## Self-Review

**Spec coverage:**
- ✅ Stack preset files (`hono-monorepo`, `fastapi`) — Task 1
- ✅ Infra preset files (`both`, `gcp`, `aws`) — Task 2
- ✅ Exhaustive reference tree in each stack preset — Task 1 Steps 1–2
- ✅ AL-20 (§Conventions shape) — Tasks 3 + 4
- ✅ AL-21 (§Structure shape) — Tasks 3 + 4
- ✅ AL-22 (Preset: known value) — Tasks 3 + 4
- ✅ AL-23 (convention conformance) — Tasks 3 + 4
- ✅ AL-24 (§Pipeline shape) — Tasks 3 + 4
- ✅ Three dispatch questions (Q1 stack, Q2 cloud, Q3 CI) — Tasks 6 + 7
- ✅ Dead-letter `packages/domains` fix — Task 5
- ✅ `spec-format.md` grammar update — Task 8
- ✅ `<env-config>` resolution (`dotenv` / `python-dotenv`) — Task 6 §4a
- ✅ `infra/` presets excluded from `<!-- ddd: ... -->` marker — Task 2 (files use `<!-- infra-preset: ... -->`)

**Placeholder scan:** None. All task steps contain actual file content or exact shell commands.

**Type consistency:** `PRESET_CONVENTIONS` keys match the `Preset:` field values in the preset files (`hono-monorepo`, `fastapi`). `parseStack` returns `sections[name].fields[key]` — consumed as `stackSections["Conventions"]?.fields?.["File naming"]` consistently across all five checks.

**Scope:** 8 tasks, no sprawl. Each task commits independently and leaves the selftest green.
