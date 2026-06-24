# The spec/ artifact format

This is the **canonical grammar** for every artifact the napkin DDD pipeline reads and
writes. The pipeline skills (`ddd-brief`, `ddd-domain`, `ddd-usecases`, `erd-modeler`,
`ddd-plan`) generate these artifacts; the `check-align.mjs` harness in
`../scripts/` parses them and mechanically proves their cross-references. Grammar and
parser live in the same skill so they cannot drift apart — if you change one, change the
other, and the selftest pins both.

Two audiences read these files: **humans**, who edit them by hand between pipeline runs,
and **the parser**, which needs unambiguous anchors. The grammar is therefore plain,
diff-friendly Markdown with a small set of strict shapes. Everything outside those shapes
is free prose the parser ignores and the skills must preserve.

## 1. Cross-cutting rules

### 1.0 Artifact locations

Artifacts live at fixed paths under the target project's `spec/` directory —
`spec/brief.md`, `spec/glossary.md`, `spec/flows.md`, `spec/usecases.md`,
`spec/stack.md`, `spec/nfr.md`, `spec/api.md`, `spec/decisions.md`,
`spec/plan.md`, and `spec/data/` for the model and its live-test record. Create
`spec/` when it doesn't exist yet; never write these files at the project root or
anywhere else — every downstream skill and the alignment harness looks for them only
here.

### 1.1 Artifact marker

The first line after the H1 title is an HTML comment naming the artifact type:

```markdown
# Brief — Course Platform
<!-- ddd: brief -->
```

Types: `brief`, `glossary`, `flows`, `usecases`, `plan`, `stack`, `nfr`, `api`, `decisions`. The marker — not the filename —
is how the parser identifies an artifact, so it survives renames and case differences.
A spec file without a marker is invisible to the alignment check; never remove it.

### 1.2 Identifiers

| Kind | Format | Example | Scope |
|------|--------|---------|-------|
| Use case | `UC-` + 3 digits | `UC-001` | global |
| Flow | `FL-` + 3 digits | `FL-001` | global |
| Task | `T-` + 3 digits | `T-001` | global |
| Milestone | `M` + number | `M1` | plan.md |
| Architecture decision | `ADR-` + 3 digits | `ADR-001` | global |
| Acceptance criterion | `AC-` + number | `AC-1` | within its UC |
| Data assertion | `DA-` + number | `DA-1` | within its UC |

**Superseded-by:** When an item is deprecated in favour of a replacement, add an optional
`- Superseded-by: <id>` field (e.g. `- Superseded-by: UC-007`). check-align verifies the
cited id exists and is active — an error if it points at another deprecated item or a
non-existent id.

IDs are **immutable and never reused**. A new item takes the next free number — even if
lower numbers have been retired. An item that is no longer wanted is **deprecated, not
deleted** (set `- Status: deprecated`); this keeps every downstream citation resolvable
forever. Renumbering breaks the traceability chain and is never worth it.

### 1.3 Headings and fields

Items with IDs use exactly this heading shape (em dash, single spaces):

```markdown
## UC-001 — Enroll student in course
```

Machine-read fields are list lines of the form `- Field: value` directly under their
heading:

```markdown
- Actor: Student
- Status: active
```

Field names are fixed per artifact (sections 2–6). Unknown list lines and any prose are
ignored by the parser and **must be preserved verbatim** by skills when updating.

### 1.4 Update protocol (every skill, every write)

These artifacts are living documents — the pipeline updates them across many sessions and
users hand-edit them in between. To keep that safe:

1. **Read the whole existing artifact before writing.** Never write blind.
2. **Modify only the sections your change touches.** User-added prose, unknown fields,
   and unrelated sections are preserved byte-for-byte.
3. **Never regenerate an existing artifact wholesale.** If the model believes a wholesale
   rewrite is needed, say so and ask — don't do it silently.
4. `## Clarifications log` (brief) and `## Changelog` (all artifacts) are **append-only**.
5. Every write appends one Changelog line: `- <YYYY-MM-DD> (<skill-name>): <summary>`.
6. Retire by deprecation (1.2), never by deletion.

### 1.5 Changelog

Every artifact ends with:

```markdown
## Changelog
- 2026-06-11 (ddd-brief): created
- 2026-06-12 (ddd-brief): added refund scope after clarification
```

## 2. spec/brief.md

```markdown
# Brief — <Project name>
<!-- ddd: brief -->

## Problem statement
<prose: the problem, who has it, why now>

## Actors
- **<Actor>** — <one-line description>

## Scope

### In scope
- <item>

### Out of scope
- <item>

## Constraints
- <item: technical, regulatory, budget…>

## Non-functional notes
- <item: performance, security, compliance…>

## Pipeline sizing
- Decision: full | lean | delta
- Stages: ddd-domain: yes|no|delta · ddd-usecases: yes|no|delta · ddd-api: yes|no|delta · erd-modeler: yes|no|delta · ddd-plan: yes|no|delta
- Rationale: <one line>

## Clarifications log

| # | Date | Question | Answer |
|---|------|----------|--------|
| 1 | 2026-06-11 | <question asked> | <answer given> |

## Changelog
- 2026-06-11 (ddd-brief): created
```

The **Pipeline sizing** block is the anti-bloat contract: it pre-declares which
downstream stages this piece of work warrants, so a bug-fix-sized request never spawns a
full artifact cascade. `full` = run everything; `lean` = skip stages marked `no`;
`delta` = downstream skills update existing artifacts incrementally.

## 3. spec/glossary.md

The ubiquitous language. One term per domain concept, exact spellings everywhere.
This is the same format the erd-modeler skill consumes for structured intake.

```markdown
# Glossary — <Project name>
<!-- ddd: glossary -->

## Terms

### <Term>
- Definition: <what it means in this domain — not a dictionary definition>
- Maps to: ERD: <table_name>
- Forbidden synonyms: <a>, <b>
- Context: <bounded context name>
- Aggregate root: yes
- Aggregate: <root-term>

## Enumerations

| Enumeration | Values | Used by |
|-------------|--------|---------|
| enrollment_status | enrolled, completed, dropped | Enrollment |

## Changelog
- ...
```

- `- Aggregate root: yes` — marks the entity that owns its cluster (the root of an
  aggregate). Omit the field for entities that are not aggregate roots.
- `- Aggregate: <Term>` — on leaf entities, points at the aggregate root term. When
  present, check-align warns if the FK from this entity's table to the root's table
  uses `ON DELETE CASCADE` (cross-aggregate cascade is a DDD violation: use RESTRICT or
  SET NULL instead).
- `### <Term>` — singular, Capitalized domain name. Every actor, flow step subject, and
  use-case actor in the other artifacts must be one of these terms.
- `- Maps to: ERD: <table_name>` — **only** for concepts persisted as a table;
  `table_name` is the DBML table name (snake_case, plural). Concepts that become
  **bridge tables get their own term** (e.g. *Enrollment* for students↔courses) — the
  alignment check requires every DBML table to trace back to a glossary term.
  Pure roles/actors that own no rows (e.g. *Registrar*) simply omit the field.
- `- Forbidden synonyms:` — optional; trap words that must not appear in other artifacts
  (e.g. `Client` when the term is *Customer*).
- `- Context:` — optional; only when the domain is large enough to have bounded contexts.
- **Enumerations**: values are comma-separated, exact spelling, order significant — they
  become DBML `Enum`s verbatim (`canceled`, `past_due` — never respell). `Used by` names
  the glossary term(s) whose table carries the enum.

## 4. spec/flows.md

Event-storming output in linear text: what happens, in what order, caused by whom.

```markdown
# Flows — <Project name>
<!-- ddd: flows -->

## FL-001 — <Flow name>
- Context: <bounded context>
- Actor: <Glossary term>
- Steps:
  1. Command: <Imperative phrase> (Actor: <Glossary term>)
  2. Event: <Past-tense phrase>
  3. Policy: Whenever <Event>, then <Command>
  4. Event: <Past-tense phrase>

## Changelog
- ...
```

- Each step starts with one of the closed kinds:
  - `Command:` — an intent, imperative mood ("Enroll student"). Optionally followed by
    `(Actor: <Glossary term>)` when the actor differs from the flow's actor.
  - `Event:` — a fact, past tense ("Student enrolled").
  - `Policy:` — automation, exactly `Whenever <X>, then <Y>`.
- `- Context:` is optional (large domains only); `- Actor:` is required and must be a
  glossary term.

## 5. spec/usecases.md

The bridge from domain language to executable proof. Every active use case here becomes
a live-tested SQL assertion when erd-modeler runs.

```markdown
# Use cases — <Project name>
<!-- ddd: usecases -->

## UC-001 — <Title>
- Actor: <Glossary term>
- Trigger: <Command or Event name from flows.md>
- Status: active
- Main flow:
  1. <step>
  2. <step>
- Acceptance criteria:
  - AC-1: WHEN <condition>, THE SYSTEM SHALL <behavior>.
- Data assertions:
  - DA-1: <what this proves at the data layer> => expect: rowcount=1
  - DA-2: <the matching negative proof> => expect: error ~ foreign key

## Changelog
- ...
```

- `- Status:` is `active` or `deprecated` (missing = active).
- **Acceptance criteria** use EARS shapes — pick the one that fits:
  - `WHEN <trigger>, THE SYSTEM SHALL <behavior>.` (event-driven)
  - `WHILE <state>, THE SYSTEM SHALL <behavior>.` (state-driven)
  - `IF <unwanted condition>, THEN THE SYSTEM SHALL <behavior>.` (unwanted behavior)
  - `THE SYSTEM SHALL <behavior>.` (ubiquitous)
- **Data assertions** end with `=> expect: <assertion>` where `<assertion>` is drawn
  **strictly** from erd-modeler's closed assertion grammar — do not invent operators:

  | Assertion | Proves |
  |-----------|--------|
  | `error` | the operation is rejected |
  | `error ~ <reason>` | rejected for a specific reason (`foreign key`, `not null`, `unique`, `check`, `enum`, or a message substring) |
  | `rowcount=N` | a write affected exactly N rows |
  | `rows=N` / `rows>=N` | a read returned N / at least N rows |
  | `value=<v>` | a read returned exactly one cell equal to `<v>` |
  | `col:<name>=<v>` | a read returned one row whose column `<name>` equals `<v>` |

  In erd-modeler's live test, `UC-001`'s `DA-1` becomes the block label
  `-- usecase: UC-001/DA-1 <description>` with `-- expect: <assertion>` — a 1:1 mapping,
  which is what makes the spec executable rather than aspirational. Give every UC at
  least one positive assertion and, wherever the domain has an integrity rule worth
  protecting, one negative (`error ~ …`) assertion.

## 6. spec/plan.md

```markdown
# Plan — <Project name>
<!-- ddd: plan -->

## M1 — <Milestone name>

### T-001 — <Task title>
- Implements: UC-001, UC-003
- Depends on: none
- Effort: M
- Terms: Order, Customer
- Status: todo
- Acceptance: the acceptance criteria of UC-001, UC-003 pass

## Changelog
- ...
```

- `- Implements:` — comma-separated UC ids; every task cites what it delivers.
- `- Depends on:` — `none` or comma-separated T-ids; the dependency graph must be acyclic.
- `- Terms:` — optional glossary anchors for the implementing agent.
- `- Status:` — `todo` | `in-progress` | `done`. Tasks marked `done` are history:
  never edit them, add new tasks instead.
- `- Acceptance:` — points at the cited UCs' criteria. Don't write new acceptance
  language here; that would create a second source of truth that drifts.
- `- Effort:` — optional; `XS | S | M | L | XL`. `ddd-plan` populates it from the
  task's AC count + DA count + presence of external integrations. check-align warns when
  a task implements 3+ UCs and has no Effort field.

## 7. spec/stack.md

The technology stack contract. Declared once at brief time; every downstream skill
reads it rather than asking the user to repeat choices.

```markdown
# Stack — <Project name>
<!-- ddd: stack -->

## Runtime
- Language: TypeScript
- Framework: Hono
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

## Deployment
- Target: container
- Environment config: dotenv
- IaC: Pulumi
- Clouds: aws, gcp
- Environments: preview, staging, production
- Preview: per-PR

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

## Changelog
- 2026-06-22 (ddd-brief): created
```

Fields are `- Key: value` lines. Unknown values write `unknown`; alignment checks skip
unknown fields. `Identity strategy` feeds erd-modeler's stage 1 — when present and not
`unknown`, erd-modeler uses it directly without prompting. `Interface: Kind` controls
which grammar branch ddd-api uses for api.md.

Known `Interface: Kind` values: `REST API`, `GraphQL`, `tRPC`, `CLI`, `library`,
`full-stack`, `none`. When `none`, ddd-api is skipped and api.md is not written.

`- Preset: <name>` — optional field in `## Runtime`; names the stack preset that
produced this file (`hono-monorepo`, `fastapi`). When present, AL-22 validates it is a
known preset name and AL-23 validates that `File naming:` and `File structure:` in
`## Conventions` match the preset's declared values. Omit when no preset was used
(Custom selection or pre-preset spec).

`## Conventions` fields — `File naming:` is free text; `stereotype.identifier` is the
canonical keyword for the flat-stereotype pattern (one file per stereotype role per domain
concept, e.g. `enrollment.aggregate.ts`, `enroll-student.usecase.ts`). Known `File
structure:` values: `flat per stereotype`, `feature-sliced`, `domain-grouped`, `unknown`.

`## Structure` declares the repository layout. Each line is `- <path>: <one-line
description>`. The canonical monorepo reference (one sample file per folder — no guessing
what goes where):

```
apps/
  api/                            — Hono server (shared by web + www)
    src/
      index.ts                    — serve(app) + runtime adapter
  web/                            — authenticated SaaS product
    src/
      index.tsx
  www/                            — public marketing site
    src/
      index.tsx

packages/
  api/                            — Hono routes + middleware; AppType for RPC
    routes/
      newsletter.ts               — public route (www + web)
      contact.ts                  — public route
      enrollments.ts              — private route (auth required)
      users.ts                    — private route (auth required)
    middleware/
      auth.ts
    index.ts                      — AppType export for hc<AppType> RPC client

  domains/                        — DDD bounded contexts (flat stereotype naming)
    <bc>/                         — one folder per bounded context
      <bc>.aggregate.ts           — aggregate root
      <noun>.entity.ts            — non-root entity
      <noun>.value-object.ts      — immutable value
      <noun>.domain-event.ts      — fact that occurred
      <bc>.repository.ts          — persistence interface (domain layer)
      <verb>-<noun>.usecase.ts    — one use case per file
      <verb>-<noun>.feature       — Gherkin spec, co-located (maps to UC-xxx)
      <verb>-<noun>.steps.ts      — playwright-bdd step definitions, co-located
      <bc>.repo.ts                — Drizzle implementation of repository
      <bc>.mapper.ts              — domain ↔ persistence mapping

  core/                           — DDD base classes (imported by every domain)
    aggregate-root.ts
    entity.ts
    value-object.ts
    domain-event.ts
    repository.ts                 — generic Repository<T> interface
    usecase.ts                    — UseCase<TInput, TOutput> interface

  ui/                             — shared component library
    src/
      button.tsx
      form.tsx
      index.ts

  db/                             — Drizzle schema, migrations, typed client
    drizzle.config.ts
    src/
      client.ts                   — driver setup, exports Db type
      migrate.ts                  — migration runner
      schema/
        <noun>.ts                 — one file per domain concept (bare name)
        index.ts                  — export * from each schema file
      index.ts                    — export { schema, createDb, type Db }
    drizzle/                      — generated SQL migrations (gitignored)
      0000_initial.sql

  tsconfig/                       — shared TypeScript config
    base.json
    node.json

tooling/
  eslint/                         — shared ESLint config
    index.js

tests/
  e2e/                            — browser flows (cross-domain UI tests)
    features/
      <flow>.feature              — cross-domain Gherkin scenario
      <flow>.steps.ts             — playwright-bdd step definitions
  fixtures/
    api-world.ts                  — APIRequestContext fixture
    ui-world.ts                   — Page + custom fixtures

playwright.config.ts              — projects[]: api-bdd (domains/**) + ui-bdd (tests/e2e/)
```

Implementing agents use this tree as the canonical reference — every file has a known home.
`packages/domains/<bc>/` co-locates Gherkin specs with domain code so missing specs are
visible by inspection. `apps/api` is the single Hono deployment serving both `apps/web`
(private routes) and `apps/www` (public routes); both import `AppType` from `packages/api`
for typed RPC via `hc<AppType>` — no separate API client package needed.

`## Integrations` fields — `Mock activation:` and `Mock scope:` are omitted when
`Mock: no`. `Conventions`, `Integrations`, and the extended `Deployment` fields are read
by the implementing agent for code-generation guidance; the alignment checks skip them.

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

Extended `## Deployment` fields — `IaC:` the infrastructure-as-code tool, e.g. `Pulumi`,
`Terraform`, `CDK`, `none`, `unknown`. `Clouds:` comma-separated target cloud(s), e.g.
`aws, gcp`. `Environments:` comma-separated environment names in promotion order, e.g.
`preview, staging, production`. `Preview:` how preview environments are created, e.g.
`per-PR`, `manual`; omit when no preview environment exists.

## 8. spec/nfr.md

Structured non-functional requirements. Sections the user doesn't specify are omitted
(no placeholders). ddd-api reads `## Error contracts` to populate error codes in
api.md — codes not declared here cannot appear in api.md (AL-18).

```markdown
# Non-functional requirements — <Project name>
<!-- ddd: nfr -->

## Auth
- Public endpoints: none
- Authorization model: ownership-scoped; callers see only their own org's data

## Error contracts
- Body shape: {"code": "<SLUG>", "message": "<human-readable>"}
- Validation error: 400 VALIDATION_ERROR
- Not found: 404 NOT_FOUND
- Conflict: 409 ENROLLMENT_EXISTS
- Forbidden: 403 FORBIDDEN
- Unauthorized: 401 UNAUTHORIZED

## Performance
- List endpoints: p99 < 500ms
- Write endpoints: p99 < 200ms

## Code quality
- DRY: yes
- Dead code: none
- Drift safety: spec-traced

## Data retention
- PII entities: User
- Soft-delete: deleted_at column on all entities; hard delete not exposed

## Audit
- Status transitions: logged to status_history

## Changelog
- 2026-06-22 (ddd-brief): created
```

The `## Error contracts` lines follow the shape `- <label>: <HTTP-status> <ERROR_CODE>`.
AL-18 parses the `<ERROR_CODE>` token (all-caps + underscores) and checks that every
error code referenced in api.md appears here.

`## Code quality` fields — `DRY: yes` mandates that every piece of logic has exactly one
implementation; no duplication. `Dead code: none` mandates that unreachable or unused
exports are removed before merge; no placeholder stubs. `Drift safety: spec-traced` means
every module traces to a UC, AC, or task; code with no spec citation is presumed dead and
must be removed or backed by a new task. These fields follow the same "omit if not
specified" rule as all nfr.md sections — never write placeholders.

## 9. spec/api.md

One operation block per use case. The identifier `API-UC-xxx` mirrors the UC-xxx
number — `API-UC-001` is always the contract for `UC-001`. Grammar adapts to the
interface kind declared in stack.md.

**Artifact marker:** `<!-- ddd: api -->`

### §9a REST branch

```markdown
# API — <Project name>
<!-- ddd: api -->

## API-UC-001 — <UC title>
- Interface: REST
- Method: POST
- Path: /enrollments
- Auth: required (role: Registrar)
- Request body:
    - student_id: TypeID<students> required
    - course_id: TypeID<courses> required
- Response 201:
    - id: TypeID<enrollments>
    - status: enrollment_status
    - enrolled_at: timestamp
- Response 400: VALIDATION_ERROR — missing or invalid field
- Response 409: ENROLLMENT_EXISTS — student already enrolled in this course
- Pagination: n/a

## API-UC-002 — <UC title>
- Interface: REST
- Method: GET
- Path: /students/{student_id}/courses
- Auth: required (role: Student | Registrar)
- Response 200 (array):
    - id: TypeID<courses>
    - title: text
    - status: enrollment_status
- Pagination: cursor-based (cursor, limit)

## Changelog
- 2026-06-22 (ddd-api): created
```

### §9b Function/library branch

```markdown
## API-UC-001 — <UC title>
- Interface: function
- Module: payments/process
- Signature: processPayment(amount: Money, source: PaymentSource): Promise<PaymentResult>
- Auth: n/a (internal)
- Throws: PaymentDeclinedError | ValidationError
```

### §9c CLI branch

```markdown
## API-UC-001 — <UC title>
- Interface: CLI
- Command: deploy <app-name> [--env <env>]
- Auth: ambient (host credentials)
- Output: progress stream → "Deployed <app> to <env> in <n>s"
- Exit codes: 0 success · 1 validation error · 2 deploy failed
```

### Field rules

- `- Response 4xx: ERROR_CODE — description`: the `ERROR_CODE` token must appear in
  `nfr.md § Error contracts` (AL-18 enforces this when both files exist).
- `- Status: deprecated` + `- Superseded-by: API-UC-xxx` follow the same deprecation
  discipline as UCs and tasks.
- `Internal:` operations (from Policy flows) use `## API-UC-xxx-internal` and are
  excluded from AL-17 (they have no external auth requirement).

## 10. spec/decisions.md

Architecture decision log. Auto-populated by erd-modeler from its Assumptions table
at stage 7; human authors may also append entries. Append-only — existing entries are
never edited.

```markdown
# Decisions — <Project name>
<!-- ddd: decisions -->

## ADR-001 — TypeID over UUID for primary keys
- Date: 2026-06-22
- Status: accepted
- Skill: erd-modeler
- Context: The data model requires globally unique identifiers that are human-readable
  in logs and type-safe at the application layer.
- Decision: Use TypeID (base32 ULID with a type prefix) for all primary keys,
  generated by the application using typeid-js at entity creation time.
- Consequences: Postgres does not generate these; the application must supply the id
  on INSERT. No auto-increment fallback.
- Supersedes: n/a

## Changelog
- 2026-06-22 (erd-modeler): created, 2 decisions recorded
```

Field vocabulary:
- `- Status:` — `accepted | deprecated | superseded`
- `- Skill:` — which pipeline skill generated the entry
- `- Supersedes:` — `n/a` or `ADR-xxx` (check-align verifies the target exists and is active)

IDs (`ADR-xxx`) are immutable and never reused.

## 11. How the artifacts interlock

```
brief.md ──actors──▶ glossary.md ──terms──▶ flows.md ──commands──▶ usecases.md
stack.md ──────────────────────────────────────────────────────────────────┐  │
nfr.md ─────────────────────────────────────────────────────────────────┐ │  │
                    │                                                    │ │  │ DA => expect
                    │ Maps to: ERD / Enumerations                        ▼ ▼  ▼
                    ▼                                               api.md  data/usecases.sql
               data/model.dbml ◀──────live-tested against──────────────────────┘
                    │                                                              ▲
                    └──Assumptions──▶ decisions.md                                │
                                                                            plan.md
                                                              (Implements: UC-xxx, reads api.md + decisions.md)
```

`check-align.mjs` proves these edges mechanically (see `../scripts/README.md` for the
full check list AL-01…AL-24): glossary↔DBML table tracing, enum spelling fidelity,
actor closure, UC→plan coverage, DA grammar validity, UC→usecases.sql labeling,
ID uniqueness, and dependency acyclicity. Run it after every artifact write; a spec
that fails the gate is not done.

- **AL-20** — `stack.md §Conventions` shape: section must exist; `File naming:` and `File structure:` fields must be present.
- **AL-21** — `stack.md §Structure` shape: section must exist; `Repo:` field must be present; at least 3 path entries (`- <path>/…: …` lines) must be present.
- **AL-22** — `stack.md §Runtime Preset:` value must be a known preset name when the field is present.
- **AL-23** — When `Preset:` is declared, `File naming:` and `File structure:` in `§Conventions` must match the preset's canonical values.
- **AL-24** — `stack.md §Pipeline` shape: section must exist; `CI:`, `Branching:`, and `Branch map:` fields must be present.
