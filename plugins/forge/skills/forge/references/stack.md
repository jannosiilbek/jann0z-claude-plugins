# The forge stack — hard defaults, overridable

These are **hard defaults**: forge always proposes them unless the user explicitly overrides a
choice. Overrides are allowed but **never silent** — record each one in the blueprint with a
one-line rationale (step 4 of the skill). Versions are **verified at author time** via
`research.md` — the notes below are the rationale, not a frozen lockfile.

## The spine: one use-case layer, three surfaces

The single most important rule. **Every spec action is one function in a `domain` (use-case)
package.** That function enforces `rbac-matrix.md` + `nfr.md` and is the *only* place business
logic lives. Three thin surfaces call it and nothing else:

- **HTTP API** (Hono) — for the React UI.
- **MCP server** — exposes the **same** actions as tools, so an agent can do everything the UX can.
- (tests call use-cases directly too.)

This is what makes "MCP mirrors UX actions" true *by construction* and keeps the code DRY: a new
action is one use-case + thin bindings, never duplicated logic.

```
                ┌── apps/api (Hono)  ──┐
spec action ──► packages/domain  ◄─────┼── apps/mcp (MCP tools)
  (use-case)    (rbac + nfr here)      └── tests (direct)
                      │
                packages/db (Drizzle) ──► PGlite ⇄ Postgres 16
                packages/ports ──► mock ⇄ real (incl. LLM)
```

## Layer-by-layer

| Layer | Default | Why |
|---|---|---|
| Runtime + package manager | **Bun** | One fast toolchain for install/run/test; native TS. |
| Monorepo | **Turborepo** | Task graph + caching across apps/packages; one repo for UI+API+MCP+domain. |
| Language | **TypeScript**, `strict` | End-to-end types from DB → contracts → UI. |
| Data ORM | **Drizzle** | Typed SQL-first schema; works against both PGlite and node-postgres with the **same** schema. |
| Local/e2e DB | **PGlite** | WASM Postgres, in-memory or file; instant, no docker — fast dev loop + fast e2e. (napkin's erd-modeler already live-tests on PGlite.) |
| Real DB | **PostgreSQL 16** | Production + full local. Selected by env (`DATABASE_DRIVER`), never code change. |
| Contracts | **Zod** | One schema layer shared by API input/output, MCP tool schemas, and UI forms. Single source of input truth. |
| API | **Hono** | Bun-native, tiny, edge/Cloud-Run friendly; thin handlers over use-cases. |
| MCP | **@modelcontextprotocol/sdk** | Exposes use-cases as tools; same Zod schemas. |
| AI agent engine | **Vercel AI SDK 5** — `ai`, `@ai-sdk/react`, `@ai-sdk/anthropic` | Typed agents/tools + first-class React hooks; ships `MockLanguageModelV1` for deterministic tests. (AI SDK 6 exists — use only if the user opts in.) |
| Auth | **Better Auth** (+ organization/multi-tenancy + RBAC plugins) | Self-hosted, free; built-in orgs/teams/roles map directly onto `rbac-matrix.md` + `nfr.md` tenant isolation. |
| Frontend | **latest React** + **Vite** | SPA over the API. (Next.js is a valid override when SSR/SEO is required.) |
| Styling / UI kit | **Tailwind** + **shadcn/ui** | Token-driven, composable; impeccable generates and governs the tokens. |
| Data fetching / client state | **TanStack Query** | Uniform API access, caching, mutations from the UI. |
| External I/O | **one ports/adapters abstraction** | See `ports-and-mocks.md`. Every external has mock + real, env-switched. |
| Unit tests | **Vitest** | Bun-friendly, fast. |
| E2E | **Playwright** on PGlite | Every feature spec drives an e2e (see `testing.md`). |
| Design | **impeccable** skill | Generates DESIGN.md + design tokens from product + personas; governs UI consistency. |
| Env | `.env.template` (committed) + `.env.local` (gitignored) + validated env schema | mock⇄real and PGlite⇄Postgres are both env-driven. |
| Observability | structured logging + error tracking (Sentry) | Wired to `nfr.md` audit invariants. |
| CI/CD | Turbo pipeline | lint → typecheck → unit → e2e (PGlite) → drift-check gate, per PR. |
| Deploy | **GCP Cloud Run** via **Pulumi** | Containerized; IaC in `infra/`. |

## Type safety (hard rule, non-negotiable)

The app is **end-to-end type-safe** — types flow unbroken from the database to the UI, and a change
in one layer surfaces as a compile error in every dependent layer.

- **`strict` TypeScript everywhere**; `noUncheckedIndexedAccess` on. **No `any`**, no unchecked casts,
  no `@ts-ignore` to silence real errors. `unknown` + a Zod parse at every boundary instead.
- **Drizzle** gives typed rows/queries; **Zod contracts** are the single input/output shape and types
  are **inferred** from them (`z.infer`) — never hand-redeclared.
- The **API exposes its types to the client** (e.g. Hono RPC / a typed client), so `apps/web` calls
  endpoints with full type inference — no stringly-typed fetches, no drift between client and server.
- **MCP tool schemas** are the same Zod schemas — tool inputs/outputs are typed identically to the API.
- **Env** is a typed, Zod-validated object (`packages/config`) — no raw `process.env` reads in app code.
- CI runs `typecheck` as a hard gate (see `testing.md`); a type error fails the build.

## Monorepo layout (the default shape)

```
apps/
  web/        # React + Vite UI (calls the API via TanStack Query)
  api/        # Hono HTTP API (thin handlers → domain)
  mcp/        # MCP server (thin tools → domain)
packages/
  domain/     # use-case layer: one fn per spec action; rbac + nfr enforced HERE
  db/         # Drizzle schema (from model.dbml) + dual-driver connection
  contracts/  # shared Zod schemas + inferred types
  ports/      # external-interface abstraction: interfaces + mock + real adapters (incl. LLM)
  ui/         # shared React components + design tokens (impeccable output)
  config/     # tsconfig base, eslint/biome, env schema (Zod)
infra/        # Pulumi program (GCP Cloud Run)
spec/         # napkin spec + forge's architecture.md (+ DESIGN.md, design tokens)
```

## Override protocol
1. The user must explicitly ask for the change (not forge guessing "this seems better").
2. Record it in the blueprint's Stack section: `Override: <layer> → <choice> (reason: <one line>)`.
3. Check the override doesn't break the spine (e.g. swapping the API framework is fine; deleting the
   use-case layer is not — that breaks MCP/UX parity and DRY).
