# Ports & mocks — one abstraction for every external, env-switched

Everything that crosses the app boundary — payment processor, email/SMS, third-party APIs, object
storage, **and the LLM** — goes through **one** abstraction: a **port** (a TypeScript interface) with
two interchangeable **adapters**, a **mock** and a **real**, chosen by env. The rest of the app
depends only on the interface, never on a concrete SDK.

This buys three things at once with one pattern:
1. A **fast local dev loop** — run entirely on mocks, no external accounts or network.
2. **Deterministic e2e** — the same mocks back the Playwright suite.
3. A **clean swap to production** — flip env, no code change.

## Shape

```
packages/ports/
  <external>/
    port.ts        # the interface (the contract the app codes against)
    mock.ts        # in-memory/fixture-backed adapter — local dev + e2e
    real.ts        # the actual SDK-backed adapter — staging/prod
    index.ts       # selects adapter by env (e.g. PORTS_MODE / per-port override)
```

- The interface is **narrow and domain-shaped** — model the action the app needs ("charge a
  subscription", "send the invite email"), not the vendor's whole SDK. Vendor types stay inside `real.ts`.
- `domain` use-cases receive ports by injection; they never `import` an SDK directly. This keeps the
  use-case layer pure and testable.
- Each port's mock is **observable** (records calls) and **controllable** (seed responses/failures)
  so tests can assert "the invite email was sent" and simulate "payment declined".

## Env switches (all env-driven, never code edits)

| Switch | Values | Controls |
|---|---|---|
| `DATABASE_DRIVER` | `pglite` (default local/e2e) · `postgres` | PGlite vs Postgres 16 — same Drizzle schema. |
| `PORTS_MODE` | `mock` (default local/e2e) · `real` | All external adapters at once. |
| `PORT_<NAME>` | `mock` · `real` | Per-port override (e.g. real DB but mock payments). |
| `LLM_MODE` | `mock` (default local/e2e) · `real` | LLM adapter — fixtures vs live model (see below). |

Wire these through the validated env schema (`packages/config`) so an invalid combination fails at
boot, not at first use. `.env.template` documents every switch with safe local defaults; `.env.local`
holds developer overrides and real secrets (gitignored).

## The LLM is a port too

The AI agent engine (Vercel AI SDK 5) sits behind a port like any other external:
- `mock.ts` uses the AI SDK's mock language model (`MockLanguageModelV1` / stream simulation) backed
  by **recorded fixtures** — deterministic, offline, free.
- `real.ts` uses `@ai-sdk/anthropic`.
- Selected by `LLM_MODE`. Agent features are developed and e2e-tested entirely on fixtures; production
  flips to `real`.

See `testing.md` for how fixtures are recorded and kept in sync with the spec.

## DRY discipline
- One port per external — never two adapters for the same vendor scattered across packages.
- Mock and real implement the **same** interface; if a method exists on one it exists on the other.
- No `if (test) { ... }` branches in domain code — the seam is the adapter selection, nothing else.
