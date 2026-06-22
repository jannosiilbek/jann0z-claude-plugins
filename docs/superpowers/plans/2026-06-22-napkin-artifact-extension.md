# Napkin DDD Artifact Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the napkin DDD pipeline with four new spec/ artifacts (stack.md, nfr.md, api.md, decisions.md) and four new alignment checks (AL-16..AL-19) so an AI coding agent can implement a system from spec/ without inventing anything.

**Architecture:** Three new pipeline skills/phases write structured artifacts at elicitation time (ddd-brief phase 2 → stack.md + nfr.md) and at contract-derivation time (new ddd-api skill → api.md), while erd-modeler auto-populates decisions.md from its Assumptions table. The mechanical gate (check-align.mjs) enforces cross-artifact consistency for all new artifacts.

**Tech Stack:** Node.js (ES modules, zero runtime deps for check-align.mjs), Markdown (SKILL.md + references), existing PGlite harness for erd-modeler self-test.

## Global Constraints

- check-align.mjs must remain zero-dependency (only Node built-ins: `node:fs`, `node:path`, `node:crypto`)
- All IDs (ADR-xxx, API-UC-xxx) are immutable and never reused — same discipline as UC-xxx, FL-xxx, T-xxx
- Every skill SKILL.md change follows the update protocol in spec-format.md §1.4 (read before writing, touch only affected sections, append changelog)
- Selftest must pass after every task that touches check-align.mjs: `cd plugins/napkin/skills/ddd-align/scripts && npm test`
- Smoke test after all tasks: `cd plugins/napkin/evals/pipeline && npm run smoke`
- All file paths are relative to repo root `/Users/janno/Projects/claude-plugins/`

---

## File Map

| File | Change |
|------|--------|
| `plugins/napkin/skills/ddd-align/references/spec-format.md` | Add §7 stack.md, §8 nfr.md, §9 api.md, §10 decisions.md; extend §1.2, §2, §3, §6; update interlock diagram |
| `plugins/napkin/skills/ddd-align/scripts/check-align.mjs` | Add KNOWN_TYPES entries, parseApi(), parseNfr(), AL-16..AL-19 |
| `plugins/napkin/skills/ddd-align/scripts/selftest.mjs` | Add 5 new test cases for AL-16..AL-19 |
| `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/stack.md` | New golden fixture |
| `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/nfr.md` | New golden fixture |
| `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/api.md` | New golden fixture |
| `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/data/model.dbml` | Add upstream-fingerprint comments |
| `plugins/napkin/skills/ddd-brief/SKILL.md` | Add phase 2 interview (stack + NFR); update outputs and report |
| `plugins/napkin/skills/ddd-brief/references/elicitation.md` | Add stack/NFR rows to coverage checklist and sizing rubric |
| `plugins/napkin/skills/ddd-api/SKILL.md` | New skill (full SKILL.md) |
| `plugins/napkin/skills/erd-modeler/SKILL.md` | Add decisions.md auto-population to stage 7 |
| `plugins/napkin/skills/ddd-plan/SKILL.md` | Add api.md + decisions.md to intake |

---

## Task 1: spec-format.md — Grammar Foundation

**Files:**
- Modify: `plugins/napkin/skills/ddd-align/references/spec-format.md`

**Interfaces:**
- Produces: canonical grammar for stack.md, nfr.md, api.md, decisions.md — every other task references these sections

- [ ] **Step 1: Extend §1.2 (Identifiers) — add ADR-xxx and superseded-by**

In the identifiers table, add a row after the `Milestone` row:

```markdown
| Architecture decision | `ADR-` + 3 digits | `ADR-001` | global |
```

After the identifiers table, add:

```markdown
**Superseded-by:** When an item is deprecated in favour of a replacement, add an optional
`- Superseded-by: <id>` field (e.g. `- Superseded-by: UC-007`). check-align verifies the
cited id exists and is active — an error if it points at another deprecated item or a
non-existent id.
```

- [ ] **Step 2: Extend §2 (brief.md) — add ddd-api to pipeline sizing block**

Replace the existing `- Stages:` example line in the §2 code block:

```markdown
- Stages: ddd-domain: yes|no|delta · ddd-usecases: yes|no|delta · erd-modeler: yes|no|delta · ddd-plan: yes|no|delta
```

With:

```markdown
- Stages: ddd-domain: yes|no|delta · ddd-usecases: yes|no|delta · ddd-api: yes|no|delta · erd-modeler: yes|no|delta · ddd-plan: yes|no|delta
```

- [ ] **Step 3: Extend §3 (glossary.md) — aggregate-root annotation**

In the §3 term grammar block, after `- Forbidden synonyms:` add:

```markdown
- Aggregate root: yes
- Aggregate: <root-term>
```

After the block, add the following paragraph:

```markdown
- `- Aggregate root: yes` — marks the entity that owns its cluster (the root of an
  aggregate). Omit the field for entities that are not aggregate roots.
- `- Aggregate: <Term>` — on leaf entities, points at the aggregate root term. When
  present, check-align warns if the FK from this entity's table to the root's table
  uses `ON DELETE CASCADE` (cross-aggregate cascade is a DDD violation: use RESTRICT or
  SET NULL instead).
```

- [ ] **Step 4: Extend §6 (plan.md) — Effort field on tasks**

In the §6 task grammar block, after `- Depends on: none` add:

```markdown
- Effort: M
```

After the block, add:

```markdown
- `- Effort:` — optional; `XS | S | M | L | XL`. `ddd-plan` populates it from the
  task's AC count + DA count + presence of external integrations. check-align warns when
  a task implements 3+ UCs and has no Effort field.
```

- [ ] **Step 5: Add §7 spec/stack.md**

After the existing §6 (plan.md) section and before the existing interlock diagram section, insert a new section:

```markdown
## 7. spec/stack.md

The technology stack contract. Declared once at brief time; every downstream skill
reads it rather than asking the user to repeat choices.

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

Fields are `- Key: value` lines. Unknown values write `unknown`; alignment checks skip
unknown fields. `Identity strategy` feeds erd-modeler's stage 1 — when present and not
`unknown`, erd-modeler uses it directly without prompting. `Interface: Kind` controls
which grammar branch ddd-api uses for api.md.

Known `Interface: Kind` values: `REST API`, `GraphQL`, `tRPC`, `CLI`, `library`,
`full-stack`, `none`. When `none`, ddd-api is skipped and api.md is not written.
```

- [ ] **Step 6: Add §8 spec/nfr.md**

```markdown
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
```

- [ ] **Step 7: Add §9 spec/api.md**

```markdown
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
```

- [ ] **Step 8: Add §10 spec/decisions.md**

```markdown
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
```

- [ ] **Step 9: Update the interlock diagram (now §11)**

Rename the existing `## 7. How the artifacts interlock` heading to `## 11. How the artifacts interlock` and replace the diagram with:

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

- [ ] **Step 10: Commit**

```bash
git add plugins/napkin/skills/ddd-align/references/spec-format.md
git commit -m "feat(napkin): extend spec-format.md grammar for stack, nfr, api, decisions artifacts"
```

---

## Task 2: check-align.mjs — New Artifact Types + Parsers

**Files:**
- Modify: `plugins/napkin/skills/ddd-align/scripts/check-align.mjs`

**Interfaces:**
- Consumes: spec-format.md §7-§10 (grammar defined in Task 1)
- Produces: `parseApi(art)` → `[{id, title, line, fields, errorCodes}]`; `parseNfr(art)` → `{errorCodes: Set<string>}`

- [ ] **Step 1: Add `node:crypto` to top-level imports**

Replace the existing import block:

```javascript
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
```

With:

```javascript
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
```

- [ ] **Step 2: Extend KNOWN_TYPES and EXPECTED_FILENAMES**

Replace:

```javascript
const KNOWN_TYPES = ["brief", "glossary", "flows", "usecases", "plan"];
const EXPECTED_FILENAMES = {
  "brief.md": "brief",
  "glossary.md": "glossary",
  "flows.md": "flows",
  "usecases.md": "usecases",
  "plan.md": "plan",
};
```

With:

```javascript
const KNOWN_TYPES = ["brief", "glossary", "flows", "usecases", "plan", "stack", "nfr", "api", "decisions"];
const EXPECTED_FILENAMES = {
  "brief.md": "brief",
  "glossary.md": "glossary",
  "flows.md": "flows",
  "usecases.md": "usecases",
  "plan.md": "plan",
  "stack.md": "stack",
  "nfr.md": "nfr",
  "api.md": "api",
  "decisions.md": "decisions",
};
```

- [ ] **Step 3: Add `parseApi()` function**

Insert after the `parseDbml()` function (after line ~252):

```javascript
function parseApi(art) {
  const ops = [];
  let current = null;
  const API_HEAD_RE = /^## (API-UC-\d{3}(?:-internal)?) — (.+)$/;
  const ERROR_RE = /^\s*- Response \d{3}: ([A-Z][A-Z0-9_]+)/;
  for (let i = 0; i < art.lines.length; i++) {
    const line = art.lines[i];
    const m = line.match(API_HEAD_RE);
    if (m) {
      current = { id: m[1], title: m[2].trim(), line: i + 1, fields: {}, errorCodes: [] };
      ops.push(current);
      continue;
    }
    if (/^## /.test(line) && !m) { current = null; continue; }
    if (current) {
      const f = line.match(FIELD_RE);
      if (f && line.match(/^- /)) current.fields[f[1]] = f[2].trim();
      const e = line.match(ERROR_RE);
      if (e) current.errorCodes.push({ code: e[1], line: i + 1 });
    }
  }
  return ops;
}

function parseNfr(art) {
  const errorCodes = new Set();
  let inErrorContracts = false;
  for (let i = 0; i < art.lines.length; i++) {
    const line = art.lines[i];
    if (/^## Error contracts/.test(line)) { inErrorContracts = true; continue; }
    if (/^## /.test(line)) { inErrorContracts = false; continue; }
    if (inErrorContracts) {
      const m = line.match(/^\s*- .+: \d{3} ([A-Z][A-Z0-9_]+)/);
      if (m) errorCodes.add(m[1]);
    }
  }
  return { errorCodes };
}
```

- [ ] **Step 4: Parse the new artifacts in the main block**

After the existing `const plan = artifacts.plan ? parsePlan(artifacts.plan) : null;` line (~line 295), add:

```javascript
const apiOps = artifacts.api ? parseApi(artifacts.api) : null;
const nfr = artifacts.nfr ? parseNfr(artifacts.nfr) : null;
```

- [ ] **Step 5: Add AL-16 (fingerprint staleness)**

Insert after the `// --- AL-14` block (after line ~515) and before the `// --- missing-artifact info` block:

```javascript
// --- AL-16: upstream-fingerprint staleness
if (existsSync(modelPath)) {
  const modelRaw = readFileSync(modelPath, "utf8");
  const fpRe = /^\/\/ upstream-fingerprint: (.+)@sha256:([0-9a-f]{64})/gm;
  for (const fp of modelRaw.matchAll(fpRe)) {
    const [, relPath, storedHash] = fp;
    const absPath = join(args.spec, "..", relPath);
    if (!existsSync(absPath)) {
      report("AL-16", "warn", "data/model.dbml", 1,
        `fingerprint references ${relPath} which does not exist`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(absPath)).digest("hex");
    if (actual !== storedHash) {
      report("AL-16", "warn", "data/model.dbml", 1,
        `upstream fingerprint mismatch for ${relPath} — model may be stale (stored ${storedHash.slice(0, 8)}…, actual ${actual.slice(0, 8)}…)`);
    }
  }
}

// --- AL-17: every active UC has an API-UC-xxx entry in api.md (when api.md exists)
if (apiOps !== null && ucs) {
  const apiIds = new Set(apiOps.map((op) => op.id));
  for (const uc of ucs) {
    if (uc.status !== "active") continue;
    const expected = "API-" + uc.id;
    if (!apiIds.has(expected)) {
      report("AL-17", "error", "api.md", 1,
        `${uc.id} is active but has no \`## ${expected}\` entry in api.md`);
    }
  }
}

// --- AL-18: every error code in api.md appears in nfr.md Error contracts (when both exist)
if (apiOps !== null && nfr !== null) {
  for (const op of apiOps) {
    for (const { code, line } of op.errorCodes) {
      if (!nfr.errorCodes.has(code)) {
        report("AL-18", "error", "api.md", line,
          `error code ${code} in ${op.id} is not declared in nfr.md §Error contracts`);
      }
    }
  }
}

// --- AL-19: every Policy command Y is the trigger of at least one active UC
if (flows && ucs) {
  const ucTriggers = new Set(
    ucs.filter((u) => u.status === "active").map((u) => u.fields["Trigger"]).filter(Boolean)
  );
  const POLICY_RE = /^Whenever .+, then (.+)$/;
  for (const fl of flows.flows) {
    for (const { line, n } of fl.body) {
      const s = line.match(/^\s*\d+\.\s+Policy:\s*(.+)$/);
      if (!s) continue;
      const m = s[1].match(POLICY_RE);
      if (!m) continue;
      const cmd = m[1].trim();
      if (!ucTriggers.has(cmd)) {
        report("AL-19", "warn", "flows.md", n,
          `policy command "${cmd}" is not the trigger of any active use case — implement it as a UC or document the deferral`);
      }
    }
  }
}
```

- [ ] **Step 6: Run selftest — expect failures on new cases not yet written**

```bash
cd plugins/napkin/skills/ddd-align/scripts && npm test
```

Expected: existing tests pass; the golden fixture baseline test may warn about unknown artifact types now recognized. Should not break existing cases.

- [ ] **Step 7: Commit**

```bash
git add plugins/napkin/skills/ddd-align/scripts/check-align.mjs
git commit -m "feat(napkin/ddd-align): add AL-16..AL-19 checks and parseApi/parseNfr parsers"
```

---

## Task 3: Golden Fixtures + Selftest Cases

**Files:**
- Create: `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/stack.md`
- Create: `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/nfr.md`
- Create: `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/api.md`
- Modify: `plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/data/model.dbml`
- Modify: `plugins/napkin/skills/ddd-align/scripts/selftest.mjs`

**Interfaces:**
- Consumes: parseApi(), parseNfr(), AL-16..AL-19 from Task 2
- Produces: verified green golden baseline + 5 adversarial test cases

- [ ] **Step 1: Create golden spec/stack.md**

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

## Deployment
- Target: container
- Environment config: dotenv

## Testing
- Framework: Vitest
- DB strategy: PGlite

## Changelog
- 2026-06-22 (ddd-brief): created
```

- [ ] **Step 2: Create golden spec/nfr.md**

```markdown
# Non-functional requirements — Course Platform
<!-- ddd: nfr -->

## Auth
- Public endpoints: none
- Authorization model: role-based; Registrar manages all enrollments, Student sees own

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

## Changelog
- 2026-06-22 (ddd-brief): created
```

- [ ] **Step 3: Create golden spec/api.md**

The golden fixture domain is "Course Platform" with UC-001 (Enroll), UC-002 (List courses), UC-003 (Drop enrollment). Error codes must match nfr.md §Error contracts exactly.

```markdown
# API — Course Platform
<!-- ddd: api -->

## API-UC-001 — Enroll student in course
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

## API-UC-002 — List a student's courses
- Interface: REST
- Method: GET
- Path: /students/{student_id}/courses
- Auth: required (role: Student | Registrar)
- Response 200 (array):
    - id: TypeID<courses>
    - title: text
    - status: enrollment_status
- Pagination: cursor-based (cursor, limit)

## API-UC-003 — Drop an enrollment
- Interface: REST
- Method: PATCH
- Path: /enrollments/{enrollment_id}/drop
- Auth: required (role: Student)
- Response 200:
    - id: TypeID<enrollments>
    - status: enrollment_status
- Response 404: NOT_FOUND — enrollment not found
- Response 403: FORBIDDEN — caller is not the enrolled student
- Pagination: n/a

## Changelog
- 2026-06-22 (ddd-api): created
```

- [ ] **Step 4: Add upstream-fingerprint to golden model.dbml**

Compute sha256 of `spec/glossary.md` inside the golden fixture dir:

```bash
shasum -a 256 plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/glossary.md
```

Prepend to the golden model.dbml (before the first `//` comment), replacing `<HASH>` with the actual 64-char hex:

```dbml
// upstream-fingerprint: spec/glossary.md@sha256:<HASH>
// Course Platform — data model
```

- [ ] **Step 5: Run selftest — golden baseline must still be green**

```bash
cd plugins/napkin/skills/ddd-align/scripts && npm test
```

Expected: the "golden fixture is green" case passes (all new artifacts present, AL-17/AL-18 pass, AL-16 passes with correct hash).

- [ ] **Step 6: Add selftest cases for AL-17, AL-18, AL-19, AL-16**

In `selftest.mjs`, add these cases after the existing case 13 (AL-14) and before the final `console.log`:

```javascript
// 14. AL-17: api.md exists but is missing an entry for an active UC.
testCase("api.md missing API-UC-002 entry → AL-17",
  (s) => edit(s, "api.md", (t) => t.replace(
    /## API-UC-002[\s\S]*?(?=## API-UC-003)/, "")),
  (r) => caught(r, "AL-17"));

// 15. AL-18: api.md uses an error code not declared in nfr.md.
testCase("api.md uses undeclared error code → AL-18",
  (s) => edit(s, "api.md", (t) => t.replace(
    "- Response 409: ENROLLMENT_EXISTS — student already enrolled in this course",
    "- Response 409: DUPLICATE_ENROLLMENT — student already enrolled in this course")),
  (r) => caught(r, "AL-18"));

// 16. AL-19: flows.md has a Policy whose command Y is not a UC trigger.
testCase("uncovered policy command → AL-19 warn",
  (s) => edit(s, "flows.md", (t) => t.replace(
    "## Changelog",
    "## FL-002 — Auto-notify on enrollment\n- Actor: Registrar\n- Steps:\n  1. Command: Enroll student\n  2. Event: Student enrolled\n  3. Policy: Whenever Student enrolled, then Send welcome email\n\n## Changelog")),
  (r) => (hasWarn(r, "AL-19") ? null : `"Send welcome email" has no UC trigger — expected AL-19 warn`));

// 17. AL-16: model.dbml fingerprint is stale (glossary was edited after model was saved).
testCase("stale upstream fingerprint → AL-16 warn",
  (s) => edit(s, "data/model.dbml", (t) =>
    t.replace(/sha256:[0-9a-f]{64}/, "sha256:" + "0".repeat(64))),
  (r) => (hasWarn(r, "AL-16") ? null : `stale fingerprint must produce an AL-16 warn`));

// 18. AL-17 only fires when api.md exists — a spec without api.md is fine.
testCase("spec without api.md does not trigger AL-17",
  (s) => { unlinkSync(join(s, "api.md")); },
  (r) => (r.exit === 0 && !hasCheck(r, "AL-17")
    ? null
    : `spec without api.md must not fire AL-17 (exit=${r.exit})`));
```

- [ ] **Step 7: Run selftest — all cases must pass**

```bash
cd plugins/napkin/skills/ddd-align/scripts && npm test
```

Expected output includes all new cases (14..18) passing. Zero failures.

- [ ] **Step 8: Commit**

```bash
git add plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/stack.md \
        plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/nfr.md \
        plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/api.md \
        plugins/napkin/skills/ddd-align/scripts/fixtures/golden/spec/data/model.dbml \
        plugins/napkin/skills/ddd-align/scripts/selftest.mjs
git commit -m "test(napkin/ddd-align): extend golden fixtures and selftest for AL-16..AL-19"
```

---

## Task 4: ddd-brief — Phase 2 Interview

**Files:**
- Modify: `plugins/napkin/skills/ddd-brief/SKILL.md`

**Interfaces:**
- Produces: skill writes `spec/stack.md` + `spec/nfr.md` after `spec/brief.md`; pipeline sizing block now includes `ddd-api` stage

- [ ] **Step 1: Add phase 2 intake rule in §1 (Intake)**

In the SKILL.md `### 1. Intake` section, after the line about `references/elicitation.md`, add:

```markdown
- **Existing stack/nfr**: if `spec/stack.md` or `spec/nfr.md` exists, read them — you
  are in **delta mode** for those artifacts (update, don't regenerate).
```

- [ ] **Step 2: Insert new §2a — Stack and NFR interview**

After the existing `### 2. Elicit — one question at a time` section and before `### 3. Size the pipeline`, insert:

```markdown
### 2a. Elicit stack and NFR — four questions max

After the domain elicitation (or in parallel when provided material already answers
domain questions), work through the stack/NFR coverage checklist in
`references/elicitation.md`. For each area:

- If provided material already answers it, record the answer — **never re-ask**.
- If genuinely uncovered, ask — **one question per message**, multiple-choice where
  possible, in this priority order:
  1. **Interface type** — REST API / GraphQL / tRPC / CLI / library / full-stack / none
  2. **Language + framework** — what runtime and web framework?
  3. **Auth mechanism** — JWT / session / API key / OAuth2 / none
  4. **Error contract shape** — RFC 7807 / `{code, message}` / framework default / unknown
- If the user has no preference on a field, write `unknown` — alignment checks skip
  unknown fields.
- When `Interface: Kind = none`, set `ddd-api: no` in the sizing block and skip the
  api.md prompt — there is no external surface to spec.
```

- [ ] **Step 3: Update §3 (Size the pipeline) — add ddd-api stage**

In the sizing block example, replace the Stages line:

```markdown
- Stages: ddd-domain: yes|no|delta · ddd-usecases: yes|no|delta · erd-modeler: yes|no|delta · ddd-plan: yes|no|delta
```

With:

```markdown
- Stages: ddd-domain: yes|no|delta · ddd-usecases: yes|no|delta · ddd-api: yes|no|delta · erd-modeler: yes|no|delta · ddd-plan: yes|no|delta
```

And add a note after the sizing rubric bullets:

```markdown
- `ddd-api`: `yes` when the project has an external surface (REST, CLI, library, etc.);
  `no` when `Interface: Kind = none` or the scope is purely internal. A lean data-layer
  tool usually has `ddd-api: no`.
```

- [ ] **Step 4: Add new §4 — Write spec/stack.md and spec/nfr.md**

After the existing `### 4. Write or update spec/brief.md` section and before `### 5. Gate`, insert:

```markdown
### 4a. Write or update spec/stack.md and spec/nfr.md

Follow the skeletons in spec-format.md §7 and §8 exactly.

- **Greenfield**: create both files (creating `spec/` if needed).
- **Delta mode**: apply spec-format.md §1.4 — touch only fields whose answers changed,
  preserve user edits verbatim, append one Changelog line. Never regenerate wholesale.
- Omit sections the user didn't specify — no placeholders. An nfr.md with only
  `## Error contracts` and `## Auth` is correct if the user didn't address performance.
- `unknown` values: a field the user has no opinion on is written as `unknown`. The
  alignment checks skip unknown fields; the implementing agent uses framework defaults.
```

- [ ] **Step 5: Update §5 (Gate) — note new artifacts are checked**

In the gate section, after the existing harness command, add:

```markdown
At this stage the gate checks structure of stack.md and nfr.md (marker presence,
section shape). It does not yet enforce AL-17/AL-18 (those activate only once api.md
exists after ddd-api runs).
```

- [ ] **Step 6: Update §6 (Report) — add new artifacts to report table**

Replace the existing report template's section table with:

```
| Section | Status |
|---------|--------|
| Problem statement | written |
| Actors | 2 identified |
| Scope | 3 in / 2 out |
| Constraints | 2 |
| Pipeline sizing | full — greenfield system of record |
| Stack | TypeScript / Fastify / REST API / JWT |
| NFR | auth + error contracts + performance |

Clarifications this session: N asked, M answered from provided material
Alignment gate: ✅ ok (or the harness's error lines)

📄 Brief saved to spec/brief.md
📄 Stack saved to spec/stack.md
📄 NFR saved to spec/nfr.md
➡️ Next: run ddd-domain to build the glossary and flows
```

- [ ] **Step 7: Commit**

```bash
git add plugins/napkin/skills/ddd-brief/SKILL.md
git commit -m "feat(napkin/ddd-brief): add phase 2 stack+NFR interview and write stack.md + nfr.md"
```

---

## Task 5: ddd-brief/references/elicitation.md — Stack/NFR Checklist

**Files:**
- Modify: `plugins/napkin/skills/ddd-brief/references/elicitation.md`

**Interfaces:**
- Consumes: spec-format.md §7 and §8 (grammar defined in Task 1)
- Produces: updated coverage checklist and sizing rubric that includes stack/NFR areas

- [ ] **Step 1: Add stack/NFR rows to the coverage checklist table**

In `elicitation.md`, in the `## The coverage checklist` table, add two rows after the existing `Non-functional` row:

```markdown
| Interface type | What kind of surface the system exposes (REST / CLI / library / none) | "Is there an HTTP API, or is this a library/CLI?" |
| Stack | Runtime language, framework, auth mechanism, error contract shape | "What language/framework? JWT or session auth?" |
```

- [ ] **Step 2: Add stack/NFR rows to the sizing rubric**

In `## Sizing rubric`, in the signal table, add a row:

```markdown
| No external API surface (internal tool, library, data pipeline) | **lean** — set `ddd-api: no` |
```

- [ ] **Step 3: Commit**

```bash
git add plugins/napkin/skills/ddd-brief/references/elicitation.md
git commit -m "feat(napkin/ddd-brief): add stack/NFR to elicitation coverage checklist"
```

---

## Task 6: ddd-api Skill — New Skill

**Files:**
- Create: `plugins/napkin/skills/ddd-api/SKILL.md`

**Interfaces:**
- Consumes: `spec/usecases.md` (active UCs), `spec/glossary.md` (term names + table names), `spec/stack.md` (interface kind, identity strategy), `spec/nfr.md` (error contracts)
- Produces: `spec/api.md` (one `## API-UC-xxx` per active UC)

- [ ] **Step 1: Create SKILL.md with frontmatter and overview**

Create `plugins/napkin/skills/ddd-api/SKILL.md` with:

```markdown
---
name: ddd-api
description: Use when the user wants to write an API contract, derive interface operations from use cases, specify REST endpoints, function signatures, or CLI commands from the napkin DDD pipeline — including "write the API spec", "what endpoints do we need", or the step after use cases exist. Reads spec/usecases.md + spec/glossary.md + spec/stack.md + spec/nfr.md and writes spec/api.md with one operation block per active use case. For domain terms use ddd-domain; for the data model use erd-modeler; for task breakdown use ddd-plan.
---

# DDD API

Derive `spec/api.md` from the use cases and stack contract: every active UC gets one
operation block in the grammar that matches the declared interface kind. The API spec
is what bridges domain intent (use cases) to implementation reality (endpoints,
signatures, error codes) — written once here, it stays consistent across all tasks in
the plan and across all agents that implement them.

The artifact grammar is defined once, in
`${CLAUDE_PLUGIN_ROOT}/skills/ddd-align/references/spec-format.md` — read its §1
(cross-cutting rules), §7 (stack.md), §8 (nfr.md), and §9 (api.md) before writing
anything.
```

- [ ] **Step 2: Add the Workflow section**

Append to the SKILL.md:

```markdown
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

Run the **self-correcting exit gate**: fix every **error** routed to `api.md`
(AL-17: missing entry for active UC, AL-18: undeclared error code) and re-run until
clean (≤3 passes) before reporting:

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
```

- [ ] **Step 3: Commit**

```bash
git add plugins/napkin/skills/ddd-api/SKILL.md
git commit -m "feat(napkin): add ddd-api skill — derives spec/api.md from use cases and stack contract"
```

---

## Task 7: erd-modeler — spec/decisions.md Auto-Population

**Files:**
- Modify: `plugins/napkin/skills/erd-modeler/SKILL.md`

**Interfaces:**
- Consumes: stage 7 Assumptions table (already generated in each erd-modeler run)
- Produces: erd-modeler now writes `spec/decisions.md` at the end of stage 7

- [ ] **Step 1: Update stage 1 to read stack.md identity strategy**

In the erd-modeler SKILL.md, in `### 1. Understand the domain`, locate the block that says:

```markdown
**Then choose the identity strategy** — the form every table's primary key takes. State it
up front as an explicit, overridable decision, recommending the default:
```

After the line that says "If the user already named a preference in their request, use it — no need to ask.", add:

```markdown
- If `spec/stack.md` exists and `Identity strategy:` is not `unknown`, use that value
  directly — no prompt needed. State: "Identity strategy: <value> (from spec/stack.md)."
```

- [ ] **Step 2: Add decisions.md output to stage 6 (Save the model)**

In `### 6. Save the model — always`, after the section that describes persisting `usecases.sql` to `spec/data/usecases.sql`, add:

```markdown
**Decisions log:** when a `spec/` directory exists, write every row from the Assumptions
table (stage 7) to `spec/decisions.md` as an ADR log following spec-format.md §10:

- If `spec/decisions.md` does not exist, create it.
- If it exists (delta run), **append** new ADR entries — never edit existing ones.
- Each row in the Assumptions table becomes one `## ADR-xxx` block. Use the next free
  `ADR-` number (scan the existing file for the highest ADR id and increment by 1).
- Set `- Skill: erd-modeler` and `- Date: <today's date>` on every generated entry.
- Minimum 1 ADR (the identity strategy choice is always recorded, even when it matches
  the default, so future delta sessions know it was an explicit decision and not an
  oversight).
```

- [ ] **Step 3: Update stage 7 report to include decisions.md**

In `### 7. Report`, after the `📄 Model saved to ...` line, add:

```markdown
📄 Decisions saved to spec/decisions.md (N decisions recorded)
```

- [ ] **Step 4: Commit**

```bash
git add plugins/napkin/skills/erd-modeler/SKILL.md
git commit -m "feat(napkin/erd-modeler): auto-populate spec/decisions.md from Assumptions table in stage 7"
```

---

## Task 8: ddd-plan — Intake Expansion

**Files:**
- Modify: `plugins/napkin/skills/ddd-plan/SKILL.md`

**Interfaces:**
- Consumes: `spec/api.md` (for operation-level context), `spec/decisions.md` (for rationale behind model choices)
- Produces: plan tasks whose `Terms:` field may now reference decision IDs

- [ ] **Step 1: Update §1 (Intake) — add api.md and decisions.md**

In the ddd-plan SKILL.md `### 1. Intake` section, after the line `Read \`spec/data/model.dbml\`, \`spec/glossary.md\`, and \`spec/brief.md\``, add:

```markdown
- Read `spec/api.md` (when present) — operation paths, request/response shapes, and
  error codes inform task scope. A task implementing UC-001 should cite the
  corresponding API-UC-001 entry as context for the implementing agent.
- Read `spec/decisions.md` (when present) — architectural rationale. Tasks that
  implement entities with non-default FK policies (e.g. RESTRICT) should reference the
  relevant ADR so the implementing agent does not re-derive it.
```

- [ ] **Step 2: Update §2 (Structure the plan) — optional ADR reference in task Terms**

In the `### 2. Structure the plan` section, in the bullet about the `- Terms:` field, append:

```markdown
  The `- Terms:` field may also cite `ADR-xxx` IDs from decisions.md when a task touches
  a decision that has non-obvious consequences (e.g. a task implementing deletes on a
  RESTRICT FK should cite the ADR that explains why RESTRICT was chosen, so the agent
  surfaces the correct 409 error rather than letting the DB error bubble through).
```

- [ ] **Step 3: Commit**

```bash
git add plugins/napkin/skills/ddd-plan/SKILL.md
git commit -m "feat(napkin/ddd-plan): read api.md + decisions.md in intake; allow ADR refs in Terms field"
```

---

## Task 9: Smoke Test

**Files:** None modified — verification only.

- [ ] **Step 1: Run the ddd-align selftest**

```bash
cd plugins/napkin/skills/ddd-align/scripts && npm test
```

Expected: all N cases pass (N = prior count + 5 new cases from Task 3). Zero failures.

- [ ] **Step 2: Run the pipeline smoke test**

```bash
cd plugins/napkin/evals/pipeline && npm run smoke
```

Expected: FAST gate passes — all oracle/harness selftests + grade golden clean. This proves no regressions in the existing pipeline from the skill.md edits.

- [ ] **Step 3: Verify new skill appears in the skill list**

```bash
grep -r "name: ddd-api" plugins/napkin/skills/ddd-api/SKILL.md
```

Expected: `name: ddd-api` found — skill frontmatter is present.

- [ ] **Step 4: Final commit (if any leftover staged changes)**

```bash
git status
```

If clean, no commit needed. If there are any untracked or modified files, investigate before committing.
