# Bootstrap — ShiftSwap (worked example)

> Ordered runbook for the ShiftSwap example. Cites `architecture-example.md` (here just "architecture")
> for the how; owns the order + checkpoints + handoff.

## Prerequisites
- `spec/` complete; `spec/architecture.md` written.

## Build sequence (DAG order: scheduling → shift-swaps → approvals → billing)

1. **Scaffold** — Bun + Turbo + `config` package per *architecture §3*.
2. **Env + dual DB** — `.env.template`/`.env.local`, Zod env schema, `DATABASE_DRIVER` PGlite⇄Postgres
   per *architecture §4, §10*.
3. **Data layer** — Drizzle schema + migrations + seed an Org with Owner/Manager/Workers.
   *(tables/enums owned by architecture §4)*
4. **Contracts** — one Zod schema per action. *(architecture §5)*
5. **Ports** — the externals from *architecture §5*; mock + real. *(architecture §5, §7)*
6. **Domain use-cases** — `scheduling` (publishShift, listShifts) → `shift-swaps` (requestSwap,
   claimSwap, suggestCover) → `approvals` (approveSwap, refuseSwap) → `billing` (gating); rbac + nfr
   enforced. *(architecture §2, §6)*
7. **API routes** — **all feature REST endpoints**, per use-case. *(architecture §2)*
8. **MCP tools** — per use-case (Worker/Manager parity). *(architecture §2)*
9. **LLM fixtures** — `suggestCover`. *(architecture §7, §9)*
10. **E2E** — one per scenario in `features/{scheduling,shift-swaps,approvals,billing}/**`; full
    business flows, e.g. **publish shift → Worker requests swap → Manager approves → shift reassigned
    + audit row**, every endpoint covered. *(architecture §9)*

### ▸ Backend-complete checkpoint (hard gate before any UI)
- [ ] All feature REST endpoints implemented; same actions as MCP tools.
- [ ] Every endpoint green under business-flow e2e on PGlite; `typecheck` green.

11. **Design via impeccable** — `DESIGN.md` + tokens from `product.md` + `personas.md`. *(architecture §8)*
12. **Landing page first** — small-team scheduling pitch, Owner/Manager/Worker aware. *Only after the
    gate.* Also stands up `/design-guide` (shadcn + the schedule board, swap cards, charts, theme
    switch) and the DRY toast/error-boundary base reused by every screen. *(design.md; architecture §8)*

### ▸ STOP: show the user, validate the full stack
Show landing page + working API/MCP (the swap lifecycle). Get sign-off before the rest of the UI.

13. **React UX** — Manager schedule board, Worker swap inbox, approvals queue, billing page; impeccable
    keeps them consistent; TanStack Query over the API. *(architecture §2, §8)*
14. **Ops** — Sentry + structured logs, turbo CI, Pulumi → Cloud Run. *(architecture §11)*

Throughout: DRY, end-to-end type safety, drift-check (*architecture §12*) per slice.

## Handoff
`superpowers:writing-plans` (this runbook + architecture + `features/**`) →
`superpowers:subagent-driven-development`; impeccable drives design; checkpoints preserved.
