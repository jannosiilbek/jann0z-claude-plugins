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
