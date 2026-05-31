# Architecture — <product name>

> The **standing architecture reference**. Owned by `forge`. Cites spec owners (glossary, product,
> capability-map, rbac-matrix, nfr, features, model.dbml); restates nothing they own. This file holds
> the architectural decisions you consult *throughout* the build. **To start the build, follow
> `spec/bootstrap.md`** (the ordered runbook) — it cites the sections here for the "how".

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

**Error model (DRY):** errors are part of the typed contract — domain use-cases raise typed errors,
mapped **once** to API error responses and **once** to a single client toast/error-boundary set (see
§8). No ad-hoc `try/catch`-and-alert scattered across surfaces.

## 3. Monorepo layout

```
apps/   web · api · mcp
packages/ domain · db · contracts · ports · ui · config
infra/  Pulumi (Cloud Run)
spec/   napkin spec + architecture.md (this file) + bootstrap.md (+ DESIGN.md, tokens)
```

## 4. Data layer (dual DB)

- Drizzle schema from `spec/data/model.dbml`, glossary names verbatim.
- `DATABASE_DRIVER` switch: PGlite (local/e2e) ⇄ Postgres 16 (prod/full local).
- **One migration source of truth:** the same drizzle-kit migration files run against *both* drivers.
  PGlite e2e **applies the committed migrations** (not ad-hoc schema push) so the tested schema equals
  the production schema. Tenant-aware seed.

## 5. Contracts & ports

- Zod contracts: one per action input/output, shared across surfaces.
- Ports: one interface per external (list them) + mock + real, env-switched (`PORTS_MODE`,
  `PORT_<NAME>`). The LLM is a port (`LLM_MODE`).
- **Inbound events:** any external that pushes state back (e.g. payments webhooks) defines an inbound
  endpoint → use-case, signature-verified and processed **idempotently** (dedupe by event id). Mock
  adapter emits the same events so state transitions are e2e-testable offline. See `ports-and-mocks.md`.

## 6. Auth & multi-tenancy

- Better Auth: sessions, organizations/tenants, roles from `rbac-matrix.md`.
- Tenant isolation invariant per `nfr.md` (cite it; don't restate).
- **Enforcement point (forge owns the how):** tenant scope is enforced at the data-access boundary —
  every domain query is parameterized by the caller's tenant/org id, the tenant id is **never**
  client-supplied to a query, and an integration test asserts cross-tenant reads/writes are impossible.
  (Better Auth's org plugin gives roles/membership, not row-level scoping — this is the layer that leaks.)

## 7. AI agent & LLM testing

- Engine: Vercel AI SDK 5. Which features are agent/LLM-backed (cite features).
- LLM behind a port; fixtures via mock model; assert tool calls/outcomes (see testing).

## 8. Design system (impeccable)

- impeccable generates `spec/DESIGN.md` + tokens (in `packages/ui`) from `product.md` + `personas.md`.
- All UI via impeccable; tokens are the single design source. (The *when* — landing page first, STOP
  gate — lives in `bootstrap.md`.)
- **`/design-guide` route** (hidden/unlinked, non-prod): living gallery of every shadcn component + all
  main app components **including charts**, with a **theme switcher** — validates the design system
  while previewing the landing page. See `references/design.md`.
- **Error/empty/loading UI base** in `packages/ui` (toast + error boundary + shared states), the DRY
  surface every screen reuses, set up with the landing page and shown in `/design-guide`. See
  `references/design.md` + the error model (§2).

## 9. Testing strategy

Vitest (unit/integration on PGlite) + Playwright (e2e on PGlite + mock ports), meeting the
**business-flow e2e bar** (owner: `references/testing.md`). DRY factories/steps/fixtures. LLM fixtures
for agents. CI gate: `lint → typecheck → unit → integration → e2e → drift-check`.

## 10. Env & secrets

`.env.template` (committed, documents every switch) + `.env.local` (gitignored). Zod env schema
validated at boot. Switches: `DATABASE_DRIVER`, `PORTS_MODE`, `PORT_<NAME>`, `LLM_MODE`.

## 11. Observability & deploy

Structured logging + Sentry (tied to `nfr.md` audit). Pulumi program in `infra/` deploying containers
to GCP Cloud Run.

## 12. Drift-check protocol

Embed `drift-check.md`'s checklist (or link it) + name the CI drift step. Glossary-verbatim names,
rbac coverage, nfr invariants, scope boundary, action parity, type safety, DRY seams — checked per
slice and in CI. (`bootstrap.md` runs this per build step; this file owns the protocol.)
