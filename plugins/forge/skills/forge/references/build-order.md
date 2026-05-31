# Build order — data-first, foundation-first, with checkpoints

> This reference is the **authoring guide for `spec/bootstrap.md`** (the kickoff runbook). The order,
> checkpoints, and handoff below are written into `bootstrap.md`, with each step citing the relevant
> `spec/architecture.md` section for the *how*. `architecture.md` owns the standing decisions; this
> sequence owns the order.

`spec/bootstrap.md` must lay out the build in **this order**, mapped to *this* spec's capabilities in
`capability-map.md`'s dependency-DAG order. The order is opinionated for a reason: the data and
use-case layers are the foundation every surface depends on, so they come first; the UI comes last,
after a human has validated the full stack on a landing page.

## The sequence

**0. Research gate** *(forge, at author time)* — versions verified per `research.md`.

**1. Scaffold** *(superpowers)* — Bun + Turborepo workspace; `tsconfig` base, lint/format,
`config` package; the empty `apps/*` and `packages/*` from the layout in `stack.md`.

**2. Env + dual DB** — `.env.template` (committed) + `.env.local`; a Zod **env schema** validated at
boot; Drizzle wired for the **PGlite⇄Postgres-16** switch (`DATABASE_DRIVER`). PGlite is the default
for local + e2e; Postgres 16 is opt-in via env. See `ports-and-mocks.md`.

**3. Data layer first** — translate `spec/data/model.dbml` into the Drizzle schema in `packages/db`,
**using glossary entity/enum names verbatim**. Migrations + a seed script (seed/demo data, tenant-aware).

**4. Contracts** — Zod schemas + inferred types in `packages/contracts`, one per action's
input/output. These are reused by API, MCP, and UI forms.

**5. Ports** — the external-interface abstraction in `packages/ports`: an interface per external
(payments, email, third-party APIs, **and the LLM**), each with a **mock** adapter and a **real**
adapter, selected by env. See `ports-and-mocks.md`.

**6. Domain / use-case layer** — `packages/domain`: **one function per spec action**. This is where
`rbac-matrix.md` (who may do it) and `nfr.md` invariants (tenant isolation, subscription gating,
limits, audit) are enforced. Use-cases call `db` and `ports`, never the reverse.

**7. API** — `apps/api` (Hono): thin route per use-case, in capability-DAG order. Better Auth wired
(sessions + org/tenant + RBAC). Input/output validated with the shared Zod contracts.

**8. MCP** — `apps/mcp`: one MCP tool per use-case that the UX exposes, over the **same** domain
functions and the **same** Zod schemas. MCP action set == UX action set.

**9. LLM fixtures** — record/author deterministic fixtures for every agent/LLM-backed feature using
the AI SDK mock model, so agent behavior is testable without live calls. See `testing.md`.

**10. E2E** — `apps/*` Playwright suites on PGlite, meeting the **business-flow e2e bar** defined in
`testing.md` (every scenario drives a test; every endpoint covered by a full multi-step business
journey, not smoke checks). DRY shared step + factory libraries.

### ▸ Backend-complete checkpoint (hard gate before any UI)
Stop and confirm **all** of the following before the design/landing-page work starts:
- [ ] **Every feature's REST API endpoints are implemented** — every action in `capability-map.md` /
      `features/**` has its API route over a use-case. Complete, not partial.
- [ ] The same actions exist as **MCP** tools (action parity).
- [ ] The e2e suite meets the business-flow e2e bar (`testing.md`) — all green on PGlite.
- [ ] data + contracts + ports + domain + LLM fixtures + `typecheck` all green.

Only when the backend + agent surface are *provably* working and type-safe do we build real UI.

**11. Design via impeccable** — invoke `impeccable` to generate `DESIGN.md` + design tokens from
`spec/product.md` + `spec/personas.md` (+ context). Tokens land in `packages/ui`. See `design.md`.

**12. Landing page first** — build the marketing/landing page, product- and persona-aware, on the
fresh tokens. This is the first thing the user *sees*. **Precondition: the backend-complete checkpoint
has passed.** The landing page is never built on top of an unfinished API. This slice also stands up
two reusable bases (see `design.md`): the **`/design-guide` route** (hidden gallery of every shadcn
component + main components incl. charts, with theme switching) and the **DRY error/empty/loading UI
base** (one toast + error boundary mapped from the typed error model) — so the foundation is right
before any feature screen reuses it.

### ▸ STOP: show the user, validate the full stack
Pause the build. Show the landing page + the working backend/MCP. Let the user validate stack,
design direction, and direction-of-travel **before** committing to the full UI.

**13. React UX** — per persona/feature, in capability-DAG order; impeccable keeps every screen
consistent with the tokens; TanStack Query over the API.

**14. Ops** — observability (structured logs + error tracking tied to `nfr.md` audit), CI/CD turbo
pipeline (the gate defined in `testing.md`), Pulumi → Cloud Run deploy.

*(Steps 11–12 may be prepared in parallel with late backend work, but the STOP checkpoint is a hard
gate before step 13.)*

## Spec-artifact → build-slice map

| Build slice | Driven by |
|---|---|
| Drizzle schema, migrations, seed | `data/model.dbml` (+ glossary names) |
| Zod contracts | `glossary.md` enums + feature step data |
| Ports (which externals exist) | `glossary.md` (integration names that are domain nouns) + `nfr.md` (build constraints) + any `features/**` touching an external |
| Use-case functions (the set + their order) | `capability-map.md` DAG + `features/**` scenarios |
| Authorization in use-cases + Better Auth | `rbac-matrix.md` |
| Tenant isolation, subscription gating, limits, audit | `nfr.md` |
| API routes + MCP tools | one per use-case (the action set) |
| E2E tests | one per `features/**/*.feature` scenario |
| LLM fixtures | features whose behavior is agent/LLM-backed |
| Design tokens + landing page + screens | `product.md` + `personas.md` (via impeccable) |
| Pricing/quota/trial behavior | `product.md` tiers + `nfr.md` gating |

## Hard rules
- **Nothing outside `product.md` scope** gets built. The out-of-scope list is a wall.
- **Foundation order is not optional**: no API route before its use-case; no use-case before its
  data + contracts; no full UI before the STOP checkpoint.
- **Every action exists on both surfaces** (API + MCP) or neither.
- **End-to-end type safety is a hard rule** (owner: `stack.md`).
- **All feature REST endpoints are implemented and pass the business-flow e2e bar (`testing.md`)
  before the landing page.** The backend is complete and provably correct before any UI exists.
