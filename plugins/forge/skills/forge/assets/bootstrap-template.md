# Bootstrap — <product name>

> **Start here.** The ordered runbook for standing the project up from the spec. Owned by `forge`.
> It owns the **order, the checkpoints, and the handoff**; it cites `spec/architecture.md` for *how*
> each piece is built (stack, layout, data design, ports, auth, testing) — it never restates those
> decisions. Read top to bottom; the order is a hard rule (`references/build-order.md`).

## Prerequisites
- `spec/` is complete (alignment-report clean, `features/**` present, `data/model.dbml` present).
- `spec/architecture.md` is written (the standing reference this runbook cites).

## Build sequence (this spec, in `capability-map.md` DAG order)

Each step names **this spec's** capabilities/features and cites the architecture section for the how.

1. **Scaffold** — Bun + Turborepo workspace; `tsconfig` base, lint/format, `config` package; empty
   `apps/*` + `packages/*` per *architecture §3 (layout)*.
2. **Env + dual DB** — `.env.template` + `.env.local`; Zod env schema; Drizzle PGlite⇄Postgres-16
   switch per *architecture §4, §10*.
3. **Data layer first** — Drizzle schema from `data/model.dbml` (glossary names verbatim); migrations
   + tenant-aware seed. *(architecture §4)*
4. **Contracts** — Zod schemas/types per action. *(architecture §5)*
5. **Ports** — interface + mock + real for each external `<list>` incl. the LLM. *(architecture §5, §7)*
6. **Domain use-cases** — one fn per action, in DAG order: `<capability 1 → … >`; rbac + nfr enforced.
   *(architecture §2, §6)*
7. **API routes** — **all feature REST endpoints**, per use-case. *(architecture §2)*
8. **MCP tools** — per use-case (UX parity). *(architecture §2)*
9. **LLM fixtures** — `<agent features>`. *(architecture §7, §9)*
10. **E2E** — meet the **business-flow e2e bar** (architecture §9 → `references/testing.md`).

### ▸ Backend-complete checkpoint (hard gate before any UI)
- [ ] **All feature REST endpoints implemented** (every action has its route).
- [ ] Same actions exist as **MCP tools** (parity).
- [ ] E2e suite meets the business-flow e2e bar (`testing.md`) — green on PGlite.
- [ ] data + contracts + ports + domain + LLM fixtures + **`typecheck`** all green.

11. **Design via impeccable** — `DESIGN.md` + tokens from `product.md` + `personas.md`. *(architecture §8)*
12. **Landing page first** — product- + persona-aware, on the fresh tokens. *Only after the
    backend-complete gate passes.* Also stands up the **`/design-guide`** gallery (all shadcn + main
    components incl. charts, theme switching) and the **DRY error/empty/loading UI base** (toast +
    error boundary), reused by all later screens. *(design.md; architecture §8 + error model §2)*

### ▸ STOP: show the user, validate the full stack
Pause. Show landing page + working backend/MCP. Get user sign-off on stack, design, and direction
**before** building the rest of the UI.

13. **React UX** — per persona/feature in DAG order; impeccable keeps screens consistent; TanStack
    Query over the API. *(architecture §2, §8)*
14. **Ops** — observability + CI/CD turbo pipeline + Pulumi → Cloud Run. *(architecture §11)*

Throughout: **DRY**, end-to-end **type safety**, and the **drift-check** protocol (*architecture §12*)
run on every slice.

## Handoff
Hand off to `superpowers:writing-plans` (against this runbook + `spec/architecture.md` +
`spec/features/**`) → `superpowers:subagent-driven-development`, with `impeccable` driving design and
the two checkpoints (backend-complete, STOP-after-landing-page) preserved as written here.
