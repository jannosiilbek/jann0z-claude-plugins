# Stack — <Project name>
<!-- ddd: stack -->

## Runtime
- Language: TypeScript
- Framework: Hono
- Preset: hono-monorepo
- Package manager: pnpm

## TypeScript
- Config hierarchy: packages/tsconfig/base.json → packages/tsconfig/node.json → each app/package tsconfig.json
- strict: true
- target: ES2022
- module: Preserve
- moduleResolution: Bundler
- verbatimModuleSyntax: true (enforces import type for type-only imports; implies isolatedModules — required by Vite's single-file transpiler which has no type information)
- noUncheckedIndexedAccess: true

## Interface
- Kind: REST API
- Protocol: HTTP/1.1

## UI
- Component library: shadcn/ui (Radix primitives)
- Package: @workspace/ui
- Primitive location: packages/ui/src/components/<name>.tsx (flat; one file per component)
- App components (web): apps/web/src/components/<feature>-<noun>.tsx (flat; same stereotype convention as domain)
- App components (www): apps/www/src/components/<noun>.tsx (noun-only; marketing components carry no feature prefix)
- CSS: Tailwind v4 (single packages/ui/src/styles/globals.css; @source directives cover all apps)
- Icons: lucide-react
- Config: components.json at packages/ui/ root and at each apps/*/ root

## Data layer
- ORM: Drizzle
- Migration tool: drizzle-kit
- Identity strategy: TypeID
- Identity generation: domain layer (Entity initialisation); Drizzle stores as plain text column

## Auth
- Mechanism: JWT
- Library: jose
- Token lifetime: <set per project>
- Refresh: <set per project>
- Revocation: <set per project>
- Role source: JWT claims (sub + role); role field declared in nfr.md ## Auth

## Conventions
- File naming: stereotype.identifier (e.g. enrollment.aggregate.ts, enroll-student.usecase.ts)
- File structure: flat per stereotype
- BC isolation: cross-BC imports forbidden (eslint-plugin-boundaries in tooling/eslint); cross-BC interaction via published domain events or explicit ACL only
- ACL translators: co-located in the consuming BC (packages/domain/<consuming-bc>/<upstream-bc>.acl.ts); translate upstream-BC events/DTOs into local domain types; must contain no business logic

## Domain model
- DomainEvent: { readonly eventName: string; readonly aggregateId: string; readonly occurredAt: Date } — all three fields required; concrete event classes implement this interface and add their own payload fields; aggregateId carries the emitting aggregate's id
- ValueObject: extend ValueObject<TProps> from packages/core; constructor is private; expose a static create(raw) that throws a descriptive Error on invalid input; enum-backed VOs expose a .value getter returning the validated literal type; never use a plain type alias for the .value-object.ts stereotype
- AggregateRoot: extend AggregateRoot<TId>; protected record(event: DomainEvent) collects events; readonly domainEvents getter exposes them; clearEvents() drains after commit; private constructor + static create() factory; static reconstitute(props) for repository hydration
- TypeID: newId('<prefix>') where <prefix> is the TypeID prefix declared in the glossary term — up to 4 lowercase ASCII letters, unique within project, derived by taking the first 2 letters of each word in the term name (single-word: first 4 letters); inline implementation via node:crypto (no external typeid package required)

## Integrations
- Adapter pattern: yes
- Mock: yes
- Mock activation: USE_MOCK=true (read at composition root only; throws at startup if truthy in NODE_ENV=production)
- Mock scope: local dev, unit tests, e2e
- Validation: Zod + hono/zod-validator (HTTP boundary only; use cases receive typed inputs)
- Event dispatch: in-memory synchronous bus; events collected on aggregate during work, drained to handlers after successful commit only; non-transactional side effects (email, HTTP, jobs) defer to after-commit
- CORS: required (apps/web and apps/www are distinct origins from apps/api); configure in packages/api/middleware

## Agentic
- Framework: Mastra (@mastra/core, @mastra/mcp)
- Primitives: agents (open-ended LLM tasks), tools (domain use-case adapters), workflows (deterministic multi-step), skills (reusable instruction sets loaded by agents)
- File naming: flat (see § Conventions) — <name>.agent.ts, <verb>-<noun>.tool.ts, <verb>-<noun>.workflow.ts, <name>.skill.ts
- Tool boundary: Zod-validated inputs; wraps domain use cases via Adapter pattern; USE_MOCK applies
- MCP server: MCPServer (@mastra/mcp) mounted via startHonoSSE() on the Mastra Hono server (apps/agents); exposes agents + tools to MCP-compatible clients (Claude, AI coding tools, custom agents)
- MCP coverage: one tool per domain operation — same use cases the REST layer calls, served over MCP
- MCP + mock guard: USE_MOCK=true must not be set when apps/agents is reachable by real MCP clients (Claude, coding tools, custom agents); the production guard (NODE_ENV=production) does not cover staging — set USE_MOCK=false explicitly in any environment where the MCP server accepts external connections
- Workflow continuity: Mastra workflows support suspend/resume natively — a step calls suspend(payload), the orchestrator persists a snapshot to the workflow_snapshots table, and execution resumes via resume(runId, step, data); long-running domain processes (process managers, sagas) are implemented as workflows using this mechanism

## Testing
- Framework: Vitest
- DB strategy: PGlite (pin production Postgres major to PGlite bundled major; per-test isolation via fresh instance + transaction rollback); known gaps: COPY ... FROM STDIN unsupported, advisory-lock session semantics differ under the WASM single-user process model, extension availability limited to PGlite WASM contrib set — verify each production extension is included; schema drift (ALTER TABLE in prod not mirrored in test schema) is the primary real-world failure mode — add a schema-parity CI job against a real Postgres container to catch it
- Domain unit: aggregates, value objects, domain events in packages/domain (Vitest, no DB, no HTTP, no ORM); assert invariant enforcement, VO rejection, and domain event emission on aggregate
- Route integration: Hono testClient(app) in packages/api (Vitest + PGlite); owns 400/401/403/404 paths unreachable from the domain tier
- E2E: playwright-bdd
- Step scope: domain steps invoke use cases directly (PGlite + USE_MOCK); browser steps in tests/e2e drive apps/api (happy-path cross-domain flows only — HTTP contract owned by route integration tier)
- Agentic unit: tools via tool.execute() directly + inputSchema.safeParse(); workflows via workflow.createRun() + run.start(); timeTravel({ step }) for step isolation; vi.mock() for deps — no Mastra instance needed
- LLM mock: MockLanguageModelV3 (ai/test) in-process; @copilotkit/aimock for SSE-accurate multi-turn scripting
- MCP server: startHonoSSE() mounted in a Hono app served by Bun.serve (port 0); connect SSEClientTransport from @modelcontextprotocol/sdk/client/sse.js; share one Client across the test suite; run agentic tests with bun test (not Vitest — apps/agents uses @types/bun); assert result.isError before content — errors do not throw
- Tool schema drift: zod-to-json-schema + toMatchSnapshot() per tool inputSchema; snapshot delta = intentional schema change
- Agentic CI evals: runEvals + createToolCallAccuracyScorerCode() from @mastra/evals; separate CI job (real LLM, USE_MOCK=false); score ≥ 0.9

## Structure
- Repo: monorepo
- apps/api: Hono server (shared by web + www)
- apps/web: authenticated SaaS product
- apps/www: public marketing site
- apps/agents: Mastra Hono server + MCP server; imports domain use cases from packages/domain
- packages/api: Hono routes + middleware; AppType for RPC
- packages/domain: DDD bounded contexts
- packages/core: AggregateRoot, Entity, ValueObject, DomainEvent
- packages/ui (@workspace/ui): shadcn primitives, cn() utility, Tailwind v4 CSS entry point; consumed by apps/web and apps/www
- packages/db: Drizzle schema, migrations, typed client, repository implementations
- packages/tsconfig: shared TypeScript config
- tooling/eslint: shared ESLint config
- tests/e2e: browser flows (cross-domain)
- tests/fixtures: playwright fixtures

Reference tree (one sample file per folder — see spec-format.md §7 for the annotated canonical layout):

```
apps/
  api/
    src/
      index.ts                    — serve(app) + runtime adapter
  web/
    src/
      components/
        <feature>-<noun>.tsx      — app-specific composed components (e.g. enrollment-form.tsx)
      index.tsx
    components.json               — shadcn config (ui → @workspace/ui/components; components → @/components)
    vite.config.ts
  www/
    src/
      components/
        <noun>.tsx                — marketing-specific composed components (e.g. hero.tsx, pricing.tsx)
      index.tsx
    components.json               — shadcn config (same aliases as web)
    vite.config.ts
  agents/
    src/
      index.ts                    — Mastra() instance + MCPServer registration
      <name>.agent.ts             — one per domain or capability
      <name>.skill.ts             — reusable instruction set (createSkill())
      <verb>-<noun>.tool.ts       — domain use-case adapter; Zod input
      <verb>-<noun>.workflow.ts   — deterministic multi-step AI process

packages/
  api/
    routes/
      <noun>.ts                   — one file per resource group
    middleware/
      auth.ts
    index.ts                      — AppType export for hc<AppType> RPC client

  domain/                         — flat stereotype naming inside each bc folder
    <bc>/
      <bc>.aggregate.ts
      <noun>.entity.ts
      <noun>.value-object.ts
      <noun>.domain-event.ts
      <bc>.repository.ts          — persistence interface (domain layer)
      <verb>-<noun>.usecase.ts    — one use case per file
      <verb>-<noun>.feature       — Gherkin spec, co-located (maps to UC-xxx)
      <verb>-<noun>.steps.ts      — playwright-bdd step definitions (in-memory, PGlite)
      <upstream-bc>.acl.ts        — ACL translator (consuming BC owns it); no business logic

  core/
    aggregate-root.ts
    entity.ts
    value-object.ts
    domain-event.ts
    repository.ts                 — generic Repository<T> interface
    usecase.ts                    — UseCase<TInput, TOutput> interface

  ui/                               — @workspace/ui
    src/
      components/
        <name>.tsx                — shadcn primitives (button, input, card…); flat, one file per component
      lib/
        utils.ts                  — cn() utility
      styles/
        globals.css               — Tailwind v4 entry point; @source directives cover all apps
    components.json               — shadcn config (aliases → @workspace/ui/*)

  db/
    drizzle.config.ts
    src/
      client.ts                   — driver setup, exports Db type
      migrate.ts
      schema/
        <noun>.ts                 — one file per domain concept
        index.ts
      repositories/
        <bc>/
          <bc>.repo.ts            — Drizzle implementation of domain repository interface
          <bc>.mapper.ts          — domain ↔ persistence mapping
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
