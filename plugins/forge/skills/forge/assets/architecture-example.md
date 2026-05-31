# Architecture — ShiftSwap (worked example)

> Standing-architecture reference for a small SaaS: shift-swap management for hourly teams. The
> upstream napkin spec defined capabilities `scheduling`, `shift-swaps`, `approvals`, `billing`;
> roles `Owner`, `Manager`, `Worker`; entities `Org`, `User`, `Shift`, `SwapRequest`, `Approval`,
> `Subscription`; agent feature: a "suggest a cover" assistant. The ordered runbook is in
> `bootstrap-example.md`. Shown filled to illustrate the shape — your values come from the actual spec.

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
| AI agent | Vercel AI SDK 5 (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) | reflects the research gate at author time (confirm current major; user may opt into 6); MockLanguageModelV1 for fixtures |
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
spec/   napkin spec + architecture.md + bootstrap.md (+ DESIGN.md, tokens)
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

## 8. Design system (impeccable)

- impeccable generates `spec/DESIGN.md` + tokens (packages/ui) from `product.md` (small-team
  scheduling, $19/$49 tiers) + `personas.md` (Owner, Manager, Worker). All UI via impeccable.
- `/design-guide` (hidden, non-prod): every shadcn component + the schedule board, swap cards, and
  utilization charts, with a light/dark theme switcher — validated while previewing the landing page.
- Error/empty/loading base in `packages/ui` (toast + error boundary), mapped from typed errors (§2),
  reused by every screen; set up with the landing page.

## 9. Testing strategy

Vitest (use-cases + integration on PGlite) + Playwright (e2e on PGlite + mock ports). Every
`features/**` scenario → e2e; **every API endpoint covered by a full business-flow e2e** (the
swap-lifecycle journey, asserting reassignment + audit, not per-route smoke). Factories build
org-scoped Shifts/SwapRequests. `suggestCover` tested on fixtures. `typecheck` is a hard gate. CI:
`lint → typecheck → unit → integration → e2e → drift-check`.

## 10. Env & secrets

`.env.template` documents `DATABASE_DRIVER`, `PORTS_MODE`, `PORT_EMAIL`, `PORT_PAYMENTS`, `LLM_MODE`,
`ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`. `.env.local` holds real secrets (gitignored). Zod env
schema validated at boot.

## 11. Observability & deploy

Structured logs + Sentry; audit rows on every approval/refusal (nfr). Pulumi deploys `api`, `mcp`,
`web` containers to Cloud Run.

## 12. Drift-check protocol

Per-slice + CI: table/enum names == glossary (`canceled`, not `cancelled`); rbac cells covered by
tests; org isolation + billing gating + audit asserted; type safety (no `any`, typecheck green);
nothing built outside `product.md` scope (no payroll, no native app); `requestSwap`/`approveSwap`/…
exist on both API and MCP.
