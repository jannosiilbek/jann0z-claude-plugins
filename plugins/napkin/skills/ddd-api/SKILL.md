---
name: ddd-api
description: Use when the user wants to write an API contract, derive interface operations from use cases, specify REST endpoints, function signatures, or CLI commands from the napkin DDD pipeline — including "write the API spec", "what endpoints do we need", or the step after use cases exist. Reads spec/usecases.md + spec/glossary.md + spec/stack.md + spec/nfr.md and writes spec/api.md with one operation block per active use case. For domain terms use ddd-domain; for the data model use erd-modeler; for task breakdown use ddd-plan.
---

# DDD API

- Derives `spec/api.md` from the use cases and stack contract: every active UC gets one operation block in the grammar that matches the declared interface kind.
- The API spec bridges domain intent (use cases) to implementation reality (endpoints, signatures, error codes) — written once here, it stays consistent across all tasks and agents that implement them.

The artifact grammar is defined once, in
`${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/references/spec-format.md` — read its §1
(cross-cutting rules), §7 (stack.md), §8 (nfr.md), and §9 (api.md) before writing
anything.

## Workflow

### 1. Intake

- Read `spec/usecases.md` — required. If absent, route to `ddd-usecases` first.
- Read `spec/stack.md` — required. If absent, route to `ddd-brief` first (it writes
  stack.md in phase 2). If `Interface: Kind = none`, report "no external surface declared
  — ddd-api is not needed for this project" and exit without writing anything.
- Read `spec/nfr.md` — required for error code validation. If absent, proceed but note
  that AL-18 will not activate (no error codes to cross-check).
- Read `spec/glossary.md` — for entity type names used in request/response field types.
- If `spec/api.md` exists, read it fully — **delta mode** (step 5).

### 2. Determine interface grammar branch

Read `stack.md → Interface: Kind` and select the grammar branch from spec-format.md §9:
- `REST API` → §9a (Method, Path, Auth, Request body, Response N, Pagination)
- `GraphQL` → §9a variant (Query/Mutation instead of Method/Path)
- `tRPC` → §9b variant (procedure name instead of path)
- `library` → §9b (Module, Signature, Throws)
- `CLI` → §9c (Command, Auth, Output, Exit codes)
- `full-stack` → §9a for server routes + note client components separately
- `unknown` → default to §9a (REST); record assumption explicitly

### 3. Derive one operation per active UC

For each active UC in usecases.md, derive its operation:

- **`Command:` use cases** (actor initiates an action) → write/mutation operation
  - REST: infer HTTP method from verb semantics (Create → POST, Update → PUT/PATCH,
    Delete → DELETE)
  - Path: derive from the primary entity in the UC title (`/enrollments`, `/courses/{id}`)
  - Request body: map the UC's main flow step 1 inputs to typed fields using glossary
    table names for TypeID<table_name> references
  - Response success: the entity created/modified, with its identity strategy PK type
    from stack.md
- **Read-path UCs** (actor retrieves data, no event emitted) → query/read operation
  - REST: GET with the entity's collection path
  - Include pagination for list operations (cursor-based by default)
- **`Policy:` steps** → mark as `- Interface: Internal` and use `## API-UC-xxx-internal`;
  these are excluded from AL-17 (no external auth requirement)

### 4. Apply error codes from nfr.md

For every `IF unwanted condition` acceptance criterion in a UC:

- Determine the appropriate HTTP status from nfr.md `## Error contracts`
- Use the exact error code slug declared there — never invent new codes
- If the right code doesn't exist in nfr.md, note it in the report under
  "Missing error codes — update nfr.md with: ..." and use a placeholder
  `MISSING_CODE` which AL-18 will flag as an error (correct fix: update nfr.md, then
  re-run ddd-api)

### 5. Delta mode

Apply spec-format.md §1.4, plus:

- Existing `API-UC-xxx` IDs are immutable. New UCs take the matching number (API-UC-004
  for UC-004). Deprecated UCs get `- Status: deprecated`, never deletion.
- Changed request/response fields are edited in place within their operation block;
  everything else is preserved byte-for-byte.

### 6. Gate

Run the **self-correcting exit gate** (ddd-align → "Self-correcting exit gate"): fix every
**error** routed to `api.md` (AL-17: missing entry for active UC, AL-18: undeclared error
code) and re-run until clean before reporting:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/scripts/check-align.mjs" --spec spec/
```

### 7. Report

```
## API report — <project name>

| Operation | Interface | Method/Cmd | Auth | Responses |
|-----------|-----------|------------|------|-----------|
| API-UC-001 | REST | POST /enrollments | Registrar | 201, 400, 409 |
| API-UC-002 | REST | GET /students/{id}/courses | Student|Registrar | 200, 404 |
| API-UC-003 | REST | PATCH /enrollments/{id}/drop | Student | 200, 403, 404 |

Coverage: N operations from M active UCs
Error codes declared in nfr.md: VALIDATION_ERROR, NOT_FOUND, ENROLLMENT_EXISTS, FORBIDDEN, UNAUTHORIZED
Alignment gate: ✅ ok
📄 Saved to spec/api.md
➡️ Next: run erd-modeler to build the data model, then ddd-plan
```

In delta mode, add "Operations added / changed / deprecated / preserved" line. The ➡️
pointer is the **last line** of the report — nothing after it.
