<!-- Worked fill of claude-md-template.md for the ShiftSwap example. -->
# ShiftSwap

Bun + Turborepo monorepo (shift-swap management for hourly teams) built from the napkin spec in `spec/`. **On any conflict, `spec/architecture.md` wins.**

## Read first
- **How it's built:** `spec/architecture.md`
- **Build order + checkpoints:** `spec/bootstrap.md`
- **Names** `spec/glossary.md` · **scope** `spec/product.md` · **permissions** `spec/rbac-matrix.md` · **invariants** `spec/nfr.md` · **behavior** `spec/features/**`

## Where is what
| Path | What lives here |
|---|---|
| `apps/web` | React + Vite UI — schedule board, swap inbox, approvals queue, billing |
| `apps/api` | Hono — thin handlers → domain |
| `apps/mcp` | MCP — `requestSwap`/`approveSwap`/… tools (parity with API) |
| `packages/domain` | use-cases: publishShift, requestSwap, claimSwap, approveSwap, suggestCover, … (rbac + nfr enforced) |
| `packages/db` | Drizzle schema: org, user, shift, swap_request, approval, subscription + dual driver |
| `packages/contracts` | Zod schemas (RequestSwapInput, …) |
| `packages/ports` | email, payments (Stripe), llm — mock + real |
| `packages/ui` | shared components + tokens; `/design-guide` gallery |
| `packages/config` | tsconfig, lint, Zod env schema |
| `infra` | Pulumi (Cloud Run) |

## Commands
`bun install` · `bun run dev` · `bun test` · `bun run typecheck` · `bun run lint` · `bun run db:migrate` · `bun run db:seed`
Local + e2e run on **PGlite + mock ports + LLM fixtures** (no docker/network).
Env: `DATABASE_DRIVER` pglite|postgres · `PORTS_MODE` mock|real · `PORT_EMAIL`/`PORT_PAYMENTS` · `LLM_MODE` mock|real (see `.env.template`).
CI: `lint → typecheck → unit → integration → e2e → drift-check`.

## Rules
- Type-safe end to end: no `any`; types inferred from Zod.
- Business logic only in `packages/domain`; `apps/*` stay thin.
- Every action on both API and MCP, over one domain fn.
- Names verbatim from `spec/glossary.md` (`canceled`, `Owner`, `Manager`, `Worker`); nothing outside `spec/product.md` scope (no payroll, no native app).
- Externals only via `packages/ports`; no SDK imports in domain.
- Errors via the shared toast/error-boundary base.
- Spec change? Edit the napkin spec first.

Before a feature: read its `spec/features/{scheduling,shift-swaps,approvals,billing}/**` scenario + the matching `spec/bootstrap.md` step; DAG order scheduling → shift-swaps → approvals → billing.
