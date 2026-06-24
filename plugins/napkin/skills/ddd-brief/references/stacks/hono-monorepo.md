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

Reference tree (one sample file per folder — see spec-format.md §7 for the annotated canonical layout):

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
