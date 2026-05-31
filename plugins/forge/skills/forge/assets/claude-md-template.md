<!--
forge template → the generated app's root CLAUDE.md. Fill every <…> from the real workspace
(package.json / turbo.json / .env.template). It is a router: point into spec/, never restate a fact
spec/architecture.md owns. One screen, no filler. Delete this comment when authoring.
-->
# <product>

Bun + Turborepo monorepo built from the napkin spec in `spec/`. **On any conflict, `spec/architecture.md` wins.**

## Read first
- **How it's built** — stack, layout, data/ports/auth/AI, testing, drift: `spec/architecture.md`
- **Build order + checkpoints:** `spec/bootstrap.md`
- **Names** `spec/glossary.md` · **scope** `spec/product.md` · **permissions** `spec/rbac-matrix.md` · **invariants** `spec/nfr.md` · **behavior** `spec/features/**`

## Where is what
| Path | What lives here |
|---|---|
| `apps/web` | React + Vite UI (TanStack Query → API) |
| `apps/api` | Hono — thin handlers → domain |
| `apps/mcp` | MCP — thin tools → domain (parity with API) |
| `packages/domain` | use-cases: one fn per spec action; rbac + nfr enforced here |
| `packages/db` | Drizzle schema (from `spec/data/model.dbml`) + dual driver |
| `packages/contracts` | shared Zod schemas + inferred types |
| `packages/ports` | external I/O: interface + mock + real (incl. LLM) |
| `packages/ui` | shared components + design tokens |
| `packages/config` | tsconfig, lint, Zod env schema |
| `infra` | Pulumi (Cloud Run) |

## Commands
<install · dev · test · typecheck · lint · db:migrate · db:seed — from package.json>
Local + e2e run on **PGlite + mock ports + LLM fixtures** (no docker/network).
Env: `DATABASE_DRIVER` pglite|postgres · `PORTS_MODE` mock|real · `PORT_<NAME>` · `LLM_MODE` mock|real (see `.env.template`).
CI: `lint → typecheck → unit → integration → e2e → drift-check`.

## Rules
- Type-safe end to end: no `any`/`@ts-ignore`; types inferred from Zod.
- Business logic only in `packages/domain`; `apps/*` stay thin.
- Every action on both API and MCP, over one domain fn.
- Names verbatim from `spec/glossary.md`; build nothing outside `spec/product.md` scope.
- Externals only via `packages/ports`; no SDK imports in domain.
- Errors via the shared error model → one toast/error-boundary; no ad-hoc try/catch.
- Spec change? Edit the napkin spec first — never add an entity/feature/capability in code alone.

Before a feature: read its `spec/features/**` scenario + the matching `spec/bootstrap.md` step; follow capability-DAG order.
