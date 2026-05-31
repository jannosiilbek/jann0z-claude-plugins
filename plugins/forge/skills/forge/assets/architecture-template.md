# Architecture — <product name>

> The build blueprint. Owned by `forge`. Cites spec owners (glossary, product, capability-map,
> rbac-matrix, nfr, features, model.dbml); restates nothing they own. Build = `superpowers` +
> `impeccable`; this file is the *how* and the *order*.

## 1. Stack (verified <date>)

State the chosen stack. Annotate each fast-moving piece with the version verified via the research
gate. Mark any user override explicitly.

| Layer | Choice | Verified / Note |
|---|---|---|
| Runtime + pkg mgr | Bun | |
| Monorepo | Turborepo | |
| Language | TypeScript (strict) | |
| Data ORM | Drizzle | |
| Local/e2e DB | PGlite | default `DATABASE_DRIVER=pglite` |
| Real DB | PostgreSQL 16 | `DATABASE_DRIVER=postgres` |
| Contracts | Zod | shared API + MCP + UI |
| API | Hono | |
| MCP | @modelcontextprotocol/sdk | |
| AI agent | Vercel AI SDK 5 (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) | verified <ver>; MockLanguageModelV1 for fixtures |
| Auth | Better Auth (org/multi-tenancy + RBAC) | |
| Frontend | latest React + Vite | verified <ver> |
| UI kit | Tailwind + shadcn/ui | tokens via impeccable |
| Client state | TanStack Query | |
| External I/O | ports/adapters (mock⇄real) | |
| Unit / E2E | Vitest / Playwright (on PGlite) | |
| Design | impeccable | |
| Observability | structured logs + Sentry | |
| CI/CD | Turbo pipeline | |
| Deploy | GCP Cloud Run via Pulumi | |

**Overrides:** `<none>` *(or: `<layer> → <choice> (reason: …)`)*

## 2. Architecture — one use-case layer, three surfaces

One sentence on the spine: every spec action is a `domain` use-case; API (Hono), MCP, and tests call
it; nothing duplicates business logic. Note where rbac + nfr are enforced (the use-case layer).

**End-to-end type safety (hard rule):** strict TS everywhere, no `any`/`@ts-ignore`; types flow
unbroken DB (Drizzle) → contracts (`z.infer`) → API (typed client) → MCP → UI; env is typed +
Zod-validated; `typecheck` is a CI gate. See `references/stack.md`.

## 3. Monorepo layout

```
apps/   web · api · mcp
packages/ domain · db · contracts · ports · ui · config
infra/  Pulumi (Cloud Run)
spec/   napkin spec + this file (+ DESIGN.md, tokens)
```

## 4. Data layer (dual DB)

- Drizzle schema from `spec/data/model.dbml`, glossary names verbatim.
- `DATABASE_DRIVER` switch: PGlite (local/e2e) ⇄ Postgres 16 (prod/full local).
- Migrations + tenant-aware seed.

## 5. Contracts & ports

- Zod contracts: one per action input/output, shared across surfaces.
- Ports: one interface per external (list them) + mock + real, env-switched (`PORTS_MODE`,
  `PORT_<NAME>`). The LLM is a port (`LLM_MODE`).

## 6. Auth & multi-tenancy

- Better Auth: sessions, organizations/tenants, roles from `rbac-matrix.md`.
- Tenant isolation mechanism per `nfr.md` (cite it; don't restate).

## 7. AI agent & LLM testing

- Engine: Vercel AI SDK 5. Which features are agent/LLM-backed (cite features).
- LLM behind a port; fixtures via mock model; assert tool calls/outcomes (see testing).

## 8. Design (impeccable)

- impeccable generates `spec/DESIGN.md` + tokens (in `packages/ui`) from `product.md` + `personas.md`.
- All UI via impeccable; landing page first; STOP-to-validate gate.

## 9. Build sequence (this spec, in capability-map DAG order)

Number the slices in `build-order.md`'s order, naming **this spec's** capabilities/features per
slice. Include the checkpoints inline:

1. Scaffold (Bun + Turbo + config)
2. Env + dual DB
3. Data layer — `<entities from model.dbml>`
4. Contracts — `<per action>`
5. Ports — `<externals>` (+ LLM)
6. Domain use-cases — `<capability 1 → … in DAG order>` (rbac + nfr enforced)
7. API routes — **all feature REST endpoints**, per use-case
8. MCP tools — per use-case (UX parity)
9. LLM fixtures — `<agent features>`
10. E2E — one per `features/**` scenario; **validates full business use-case flows logically**, every endpoint covered
   - **▸ Backend-complete checkpoint** — all feature REST endpoints implemented + every endpoint green under business-flow e2e + `typecheck` green (hard gate before any UI)
11. Design via impeccable (DESIGN.md + tokens)
12. Landing page first — *only after the backend-complete gate passes*
   - **▸ STOP: show user, validate full stack**
13. React UX — `<screens per persona/feature>`
14. Observability + CI/CD + Pulumi/Cloud Run

## 10. Testing strategy

Vitest (unit/integration on PGlite) + Playwright (e2e on PGlite + mock ports). Every feature scenario
→ e2e; **every API endpoint covered by an e2e that validates the full business use-case flow logically**
(multi-step journey + business-outcome/post-state assertions, not smoke checks). DRY factories/steps/
fixtures. LLM fixtures for agents. CI gate: `lint → typecheck → unit → integration → e2e → drift-check`.

## 11. Env & secrets

`.env.template` (committed, documents every switch) + `.env.local` (gitignored). Zod env schema
validated at boot. Switches: `DATABASE_DRIVER`, `PORTS_MODE`, `PORT_<NAME>`, `LLM_MODE`.

## 12. Ops & deploy

Structured logging + Sentry (tied to `nfr.md` audit). Turbo CI pipeline. Pulumi program in `infra/`
deploying containers to GCP Cloud Run.

## 13. Drift-check protocol

Embed `drift-check.md`'s checklist (or link it) + name the CI drift step. Glossary-verbatim names,
rbac coverage, nfr invariants, scope boundary, action parity, DRY seams — checked per slice and in CI.

## 14. Handoff

Hand off to `superpowers:writing-plans` (against this file + `spec/features/**`) →
`superpowers:subagent-driven-development`, with `impeccable` driving design and the three checkpoints
preserved.
