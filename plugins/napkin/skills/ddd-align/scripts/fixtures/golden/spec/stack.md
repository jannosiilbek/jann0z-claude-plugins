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
- packages/domain: DDD bounded contexts (enrollment/)
- packages/core: AggregateRoot, Entity, ValueObject, DomainEvent
- packages/db: schema, migrations, typed client
- packages/tsconfig: shared TypeScript config
- tooling/eslint: shared ESLint config

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
