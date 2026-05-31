# Architecture — ShiftSwap (worked example)

> Example blueprint for a small SaaS: shift-swap management for hourly teams. The upstream napkin
> spec defined capabilities `scheduling`, `shift-swaps`, `approvals`, `billing`; roles `Owner`,
> `Manager`, `Worker`; entities `Org`, `User`, `Shift`, `SwapRequest`, `Approval`, `Subscription`;
> agent feature: a "suggest a cover" assistant. Shown filled to illustrate the shape — your values
> come from the actual spec.

## 1. Stack (verified 2026-05-31)

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
| MCP | @modelcontextprotocol/sdk | tools mirror UX actions |
| AI agent | Vercel AI SDK 5 (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) | verified 5.x; MockLanguageModelV1 for fixtures |
| Auth | Better Auth (org/multi-tenancy + RBAC) | Org = tenant; roles Owner/Manager/Worker |
| Frontend | latest React + Vite | verified 19.x |
| UI kit | Tailwind + shadcn/ui | tokens via impeccable |
| Client state | TanStack Query | |
| External I/O | ports/adapters (mock⇄real) | email, payments, LLM |
| Unit / E2E | Vitest / Playwright (on PGlite) | |
| Design | impeccable | |
| Observability | structured logs + Sentry | |
| CI/CD | Turbo pipeline | |
| Deploy | GCP Cloud Run via Pulumi | |

**Overrides:** none.

## 2. Architecture — one use-case layer, three surfaces

Every action (`requestSwap`, `approveSwap`, `publishShift`, `suggestCover`, …) is one function in
`packages/domain`, which enforces the `rbac-matrix.md` cell and `nfr.md` invariants (org isolation,
subscription gating on `billing`, audit). `apps/api` (Hono) and `apps/mcp` are thin bindings over
those functions; tests call them directly. No business logic lives in a surface.

**End-to-end type safety:** strict TS, no `any`; Drizzle rows → `z.infer` contracts → Hono typed
client → React; MCP tools reuse the same Zod schemas; env is Zod-validated. `typecheck` is a CI gate.

## 3. Monorepo layout

```
apps/   web · api · mcp
packages/ domain · db · contracts · ports · ui · config
infra/  Pulumi (Cloud Run)
spec/   napkin spec + this file (+ DESIGN.md, tokens)
```

## 4. Data layer (dual DB)

- Drizzle schema from `spec/data/model.dbml`: tables `org`, `user`, `shift`, `swap_request`,
  `approval`, `subscription` — names verbatim from glossary. Enum `swap_request.status` =
  `open | claimed | approved | refused | canceled` (glossary spelling).
- `DATABASE_DRIVER`: PGlite (local/e2e) ⇄ Postgres 16. Migrations + seed (an Org with Owner/Manager/
  Workers, some Shifts).

## 5. Contracts & ports

- Zod contracts: `RequestSwapInput`, `ApproveSwapInput`, `SuggestCoverInput`, … shared by API/MCP/UI.
- Ports: `email` (swap notifications), `payments` (Stripe — subscriptions), `llm` (cover suggestions).
  Each mock + real; `PORTS_MODE=mock` and `LLM_MODE=mock` by default.

## 6. Auth & multi-tenancy

- Better Auth: Org = tenant; roles Owner/Manager/Worker from `rbac-matrix.md`. Every query scoped by
  `org_id`; cross-org access impossible (org-isolation invariant from `nfr.md`).

## 7. AI agent & LLM testing

- `suggestCover` uses Vercel AI SDK 5 to recommend Workers who can cover an open swap. Behind the
  `llm` port; fixtures replay recorded suggestions; tests assert it calls `listEligibleWorkers` with
  the right shift + returns ranked user ids — not exact wording.

## 8. Design (impeccable)

- impeccable generates `spec/DESIGN.md` + tokens (packages/ui) from `product.md` (small-team
  scheduling, $19/$49 tiers) + `personas.md` (Owner, Manager, Worker). Landing page first; STOP gate.

## 9. Build sequence (DAG order: scheduling → shift-swaps → approvals → billing)

1. Scaffold (Bun + Turbo + config)
2. Env + dual DB
3. Data layer — org, user, shift, swap_request, approval, subscription
4. Contracts — per action
5. Ports — email, payments, llm
6. Domain — `scheduling` (publishShift, listShifts) → `shift-swaps` (requestSwap, claimSwap,
   suggestCover) → `approvals` (approveSwap, refuseSwap) → `billing` (gating) — rbac + nfr enforced
7. API routes — **all feature REST endpoints**, per use-case
8. MCP tools — per use-case (Worker/Manager parity)
9. LLM fixtures — `suggestCover`
10. E2E — one per scenario in `features/{scheduling,shift-swaps,approvals,billing}/**`; full business
    flows (e.g. publish shift → Worker requests swap → Manager approves → shift reassigned + audit row),
    every endpoint covered
    - **▸ Backend-complete checkpoint** — all feature REST endpoints done + green under business-flow e2e + `typecheck` green
11. Design via impeccable (DESIGN.md + tokens)
12. Landing page first — *only after the backend-complete gate passes*
    - **▸ STOP: show user, validate full stack**
13. React UX — Manager schedule board, Worker swap inbox, approvals queue, billing page
14. Observability + CI/CD + Pulumi/Cloud Run

## 10. Testing strategy

Vitest (use-cases + integration on PGlite) + Playwright (e2e on PGlite + mock ports). Every
`features/**` scenario → e2e; **every API endpoint covered by a full business-flow e2e** (the
swap-lifecycle journey above, asserting reassignment + audit, not per-route smoke). Factories build
org-scoped Shifts/SwapRequests. `suggestCover` tested on fixtures. `typecheck` is a hard gate. CI:
`lint → typecheck → unit → integration → e2e → drift-check`.

## 11. Env & secrets

`.env.template` documents `DATABASE_DRIVER`, `PORTS_MODE`, `PORT_EMAIL`, `PORT_PAYMENTS`, `LLM_MODE`,
`ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`. `.env.local` holds real secrets (gitignored). Zod env
schema validated at boot.

## 12. Ops & deploy

Structured logs + Sentry; audit rows on every approval/refusal (nfr). Turbo CI. Pulumi deploys
`api`, `mcp`, `web` containers to Cloud Run.

## 13. Drift-check protocol

Per-slice + CI: table/enum names == glossary (`canceled`, not `cancelled`); rbac cells covered by
tests; org isolation + billing gating + audit asserted; nothing built outside `product.md` scope
(no payroll, no native app); `requestSwap`/`approveSwap`/… exist on both API and MCP.

## 14. Handoff

Hand to `superpowers:writing-plans` (this file + `spec/features/**`) →
`superpowers:subagent-driven-development`; `impeccable` drives design; checkpoints preserved.
