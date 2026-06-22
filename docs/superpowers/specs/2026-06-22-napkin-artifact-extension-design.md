# Design: napkin DDD pipeline artifact extension

**Date:** 2026-06-22
**Status:** approved

## Problem

The napkin DDD pipeline is excellent at proving what data a system stores (DBML → PGlite live tests) and what domain behavior is intended (EARS use cases + event flows). However, it produces zero specification of the system's external surface. An AI coding agent reading the spec must independently invent the API contract, the auth model, and the error taxonomy — meaning two agents from the same spec produce incompatible implementations.

A 5-expert panel (DDD expert, agentic coding expert, prompt engineer, skill creation expert, context analyst) found 4 CRITICAL and 4 IMPORTANT gaps, with 5/5 experts agreeing that the absence of an interface contract is the highest-impact deficiency.

## Goal

Extend the artifact set so that an AI coding agent can implement a system from `spec/` without inventing anything. The spec is the single source of truth — complete, unambiguous, implementation-ready.

## Approach: Hybrid (C)

- `spec/stack.md` and `spec/nfr.md` are project-level constraints elicited at brief time — added as a second interview phase in `ddd-brief`.
- `spec/api.md` is substantial enough to warrant its own skill (`ddd-api`), inserted between `ddd-usecases` and `erd-modeler`.
- `spec/decisions.md` is auto-populated by `erd-modeler` from its existing Assumptions table — no new skill, zero user authoring.
- `check-align.mjs` gains four new checks (AL-16..AL-19).
- Three grammar extensions added to existing artifacts in `spec-format.md`.

## Updated pipeline

```
ddd-brief  →  ddd-domain  →  ddd-usecases  →  ddd-api (NEW)  →  erd-modeler  →  ddd-plan
    ↓               ↓              ↓                ↓                  ↓               ↓
 brief.md       glossary.md    usecases.md        api.md          model.dbml        plan.md
 stack.md ★     flows.md                                          usecases.sql
 nfr.md ★                                                         decisions.md ★
```

★ = new artifact. Six commands, three new spec/ files added.

## Artifact ownership

| Artifact | Produced by | Consumed by |
|----------|-------------|-------------|
| `spec/stack.md` | ddd-brief (phase 2) | ddd-api, erd-modeler, ddd-plan |
| `spec/nfr.md` | ddd-brief (phase 2) | ddd-api, ddd-plan |
| `spec/api.md` | ddd-api | ddd-plan |
| `spec/decisions.md` | erd-modeler (auto) | ddd-plan, future delta sessions |

---

## 1. ddd-brief changes

### Phase 2: stack and NFR interview

After writing `brief.md`, the skill runs a second focused interview (≤4 questions total, same one-at-a-time discipline) covering:

- **Interface type** — REST API / GraphQL / tRPC / CLI / library / full-stack / none
- **Language + framework** — What runtime and framework?
- **Auth mechanism** — JWT / session / API key / OAuth2 / none
- **Error contract shape** — RFC 7807 / `{code, message}` / framework default / unknown

Answers already present in provided material are never re-asked. If the user has no preference on a field, write `unknown` — alignment checks skip unknown fields.

### Pipeline sizing block update

`ddd-brief` extends the sizing block to include the `ddd-api` stage:

```
- Stages: ddd-domain: yes|no|delta · ddd-usecases: yes|no|delta · ddd-api: yes|no|delta · erd-modeler: yes|no|delta · ddd-plan: yes|no|delta
```

When `Interface: Kind = none` or the brief sizes `ddd-api: no`, the skill does not run and `spec/api.md` is not written. AL-17 only activates when `api.md` exists, so no alignment error fires for projects with no external surface.

### spec/stack.md format

```markdown
# Stack — <Project name>
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

## Deployment
- Target: container
- Environment config: dotenv

## Testing
- Framework: Vitest
- DB strategy: PGlite

## Changelog
- 2026-06-22 (ddd-brief): created
```

`Identity strategy` in stack.md replaces erd-modeler's in-session prompt — the strategy is declared once at brief time and read by erd-modeler downstream, eliminating repeated asking across sessions. erd-modeler reads this field at the start of stage 1; if `stack.md` is absent or the field is `unknown`, erd-modeler falls back to its existing in-session prompt (TypeID default, user can override).

### spec/nfr.md format

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
- Conflict: 409 <domain-slug>
- Forbidden: 403 FORBIDDEN
- Unauthorized: 401 UNAUTHORIZED

## Performance
- List endpoints: p99 < 500ms
- Write endpoints: p99 < 200ms

## Data retention
- PII entities: User
- Soft-delete: deleted_at column on all entities; hard delete not exposed

## Audit
- Status transitions: logged to status_history

## Changelog
- 2026-06-22 (ddd-brief): created
```

Sections the user doesn't specify are omitted (no placeholders). ddd-api reads `## Error contracts` to populate error codes in api.md — no invented codes allowed.

---

## 2. ddd-api skill (new)

### Position in pipeline

Reads: `spec/usecases.md`, `spec/glossary.md`, `spec/stack.md`, `spec/nfr.md`
Writes: `spec/api.md`
Gate: ddd-align (AL-17, AL-18)

### Workflow

1. **Intake** — read all four upstream artifacts. If `stack.md` is absent, route to `ddd-brief`. If `Interface: Kind = none`, report `ddd-api: skipped — no external surface declared` and exit without writing anything.
2. **Derive operations** — one operation per active UC. Every `Command:` use case → request/response pair. Read-path UCs → query operation. `Policy:` use cases → `Internal:` operation (excluded from auth checks).
3. **Adapt grammar to interface kind** — branch on `stack.md → Interface: Kind`. Default to REST if `unknown`; record assumption.
4. **Apply error contracts** — every `IF unwanted condition` AC in a UC must have a corresponding error code in the api.md entry; the code must appear in `nfr.md § Error contracts`. No invented codes.
5. **Delta mode** — apply spec-format.md §1.4. `API-UC-xxx` IDs are immutable. Deprecated UCs get `- Status: deprecated` entries, never deletion. New UCs take the next free number (matching their UC-xxx number).
6. **Gate** — run ddd-align; fix AL-17 / AL-18 errors (≤3 passes).
7. **Report** — operations table showing method, path, auth, response codes.

### spec/api.md format

**Artifact marker type:** `api`

**REST branch (§9a):**

```markdown
# API — <Project name>
<!-- ddd: api -->

## API-UC-001 — Enroll Student in Course
- Interface: REST
- Method: POST
- Path: /enrollments
- Auth: required (role: Student)
- Request body:
    - student_id: TypeID<students> required
    - course_id: TypeID<courses> required
- Response 201:
    - id: TypeID<enrollments>
    - status: enrollment_status
    - enrolled_at: timestamp
- Response 400: VALIDATION_ERROR — missing or invalid field
- Response 409: ENROLLMENT_EXISTS — student already enrolled in this course
- Response 403: FORBIDDEN — caller is not the named student
- Pagination: n/a

## API-UC-002 — List Student's Courses
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

**Function/library branch (§9b):**

```markdown
## API-UC-001 — Process Payment
- Interface: function
- Module: payments/process
- Signature: processPayment(amount: Money, source: PaymentSource): Promise<PaymentResult>
- Auth: n/a (internal)
- Throws: PaymentDeclinedError | ValidationError
```

**CLI branch (§9c):**

```markdown
## API-UC-001 — Deploy Application
- Interface: CLI
- Command: deploy <app-name> [--env <env>]
- Auth: ambient (host credentials)
- Output: progress stream → "Deployed <app> to <env> in <n>s"
- Exit codes: 0 success · 1 validation error · 2 deploy failed
```

### Identifier discipline

`API-UC-xxx` IDs mirror UC IDs — `API-UC-001` is always the contract for `UC-001`. AL-17 validation is therefore O(1): for each active UC, check that an entry with the matching number exists. No separate numbering sequence.

---

## 3. erd-modeler changes: spec/decisions.md

### Auto-population

At the end of stage 7 (report), erd-modeler writes its Assumptions table to `spec/decisions.md` as a structured ADR log. If the file already exists (delta run), new entries are appended; existing entries are never edited.

### spec/decisions.md format (§10)

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

## ADR-002 — RESTRICT on enrollments.course_id
- Date: 2026-06-22
- Status: accepted
- Skill: erd-modeler
- Context: Archived courses must remain resolvable via enrollment history.
- Decision: ON DELETE RESTRICT on enrollments.course_id. A course with active
  enrollments cannot be deleted; the API must surface 409 COURSE_HAS_ENROLLMENTS.
- Consequences: Delete-course endpoint must check enrollment count before deleting.
- Supersedes: n/a

## Changelog
- 2026-06-22 (erd-modeler): created, 4 decisions recorded
```

**Field vocabulary:**
- `- Status:` — `accepted | deprecated | superseded`
- `- Skill:` — which pipeline skill generated the entry
- `- Supersedes:` — `n/a` or `ADR-xxx` (check-align verifies the target exists and is active)

IDs (`ADR-xxx`) are immutable and never reused — same discipline as all other pipeline IDs.

---

## 4. check-align.mjs: four new checks (AL-16..AL-19)

| Check | Severity | Condition | What it validates |
|-------|----------|-----------|-------------------|
| **AL-16** | warn | `model.dbml` has `// upstream-fingerprint:` lines | Recomputes SHA-256 of referenced files; warns on mismatch (model may be stale) |
| **AL-17** | error | `spec/api.md` exists | Every active UC has a matching `## API-UC-xxx` entry in api.md |
| **AL-18** | error | Both `spec/api.md` and `spec/nfr.md` exist | Every `Response 4xx: ERROR_CODE` in api.md appears in `nfr.md § Error contracts` |
| **AL-19** | warn | `spec/flows.md` and `spec/usecases.md` exist | Every `Policy: Whenever X, then Y` — command Y is the `- Trigger:` of at least one active UC |

AL-16 and AL-19 are non-blocking (warns). AL-17 and AL-18 are blocking (errors): they represent spec-vs-spec contradictions that cause incorrect agent output.

---

## 5. spec-format.md grammar extensions

### Effort field on plan tasks (extends §6)

```markdown
### T-001 — Create enrollment endpoints
- Implements: UC-001, UC-002
- Depends on: none
- Effort: M
- Terms: Enrollment, Course, Student
- Status: todo
- Acceptance: the acceptance criteria of UC-001, UC-002 pass
```

Values: `XS | S | M | L | XL`. Optional field. AL-warn when a task implements 3+ UCs and has no Effort field. `ddd-plan` populates it using: (AC count) + (DA count) + (external integration presence).

### Aggregate-root annotation on glossary terms (extends §3)

```markdown
### Enrollment
- Definition: The relationship between a Student and a Course they are attending.
- Maps to: ERD: enrollments
- Aggregate root: no
- Aggregate: Course
```

`- Aggregate root: yes` marks an entity that owns its cluster. `- Aggregate: <Term>` points leaf entities at their root. Both optional. When present, AL-check (warn) validates that cross-aggregate FK cascade policies in model.dbml are RESTRICT or SET NULL, never CASCADE (aligns with erd-modeler rule C5).

### Superseded-by on deprecated items (extends §1.2)

Applies to UCs, tasks, and flows:

```markdown
## UC-003 — Cancel Enrollment (legacy)
- Actor: Student
- Status: deprecated
- Superseded-by: UC-007
```

check-align verifies that the cited item exists and is active (error if it points at another deprecated item or a non-existent ID).

---

## 6. What was deliberately excluded

- **DDD purism artifacts** (aggregate boundary diagrams, value object catalog, context maps as CML): Real DDD gaps but the wrong tradeoff for a lightweight pipeline targeting agentic implementation. The erd-modeler's ON DELETE policies and the new aggregate-root annotation cover the practical impact at low authoring cost.
- **Seed/fixture data artifact** (`spec/data/seed.sql`): A one-line erd-modeler output-stage change, not a new pipeline artifact requiring design. Handle in erd-modeler SKILL.md separately.
- **Migration artifact** (`spec/data/migration.sql`): Fully derivable from model.dbml diffs at implementation time. Adding it creates a maintenance obligation without adding information.
- **UI/frontend contract, observability spec, integration event catalog**: NICE-TO-HAVE; correctly deferred.

---

## Implementation scope summary

| Component | Change type | Owned by |
|-----------|-------------|----------|
| `ddd-brief` SKILL.md | Extended (phase 2 interview, 2 new outputs) | napkin plugin |
| `spec/stack.md` grammar | New §7 in spec-format.md | napkin plugin |
| `spec/nfr.md` grammar | New §8 in spec-format.md | napkin plugin |
| `ddd-api` skill | New skill + SKILL.md | napkin plugin |
| `spec/api.md` grammar | New §9a/b/c in spec-format.md | napkin plugin |
| `erd-modeler` SKILL.md | Extended (decisions.md output in stage 7) | napkin plugin |
| `spec/decisions.md` grammar | New §10 in spec-format.md | napkin plugin |
| `check-align.mjs` | Extended (AL-16..AL-19) | napkin plugin |
| `spec-format.md` | Extended (effort, aggregate-root, superseded-by) | napkin plugin |
| Pipeline sizing block | Updated in ddd-brief + spec-format.md §2 | napkin plugin |
