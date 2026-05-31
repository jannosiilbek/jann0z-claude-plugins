# Research gate — verify the stack is current before pinning it

Run this at **step 2** of the skill, before writing the blueprint. The stack in `stack.md` is the
*intent*; this gate confirms the *current* best practice and versions for the fast-moving pieces, so
the build doesn't start on stale assumptions. Use **WebSearch** and **context7** (`resolve-library-id`
→ `query-docs`). Always search for "today's date / latest" — do not trust memory for version numbers.

## What to verify (and why each moves)

| Piece | Verify | Why it moves |
|---|---|---|
| **Vercel AI SDK** | Current major (`ai` pkg), the exact `@ai-sdk/*` package names, and the **current test/mock helper** name (e.g. `MockLanguageModelV1`/`simulateReadableStream`) + agentic API. | Major versions (4 → 5 → 6) change types (`UIMessage`/`ModelMessage`), tool schema keys (`inputSchema`), and the test helpers. The blueprint defaults to **SDK 5** per spec; confirm 5 is still installable and note if the user opted into 6. |
| **React** | Current stable major + the Vite React plugin status. | "Latest React" must resolve to a real version at build time. |
| **Drizzle + PGlite** | Current `drizzle-orm` connect API for PGlite **and** node-postgres; `drizzle-kit` config API; **that the same committed migrations apply to PGlite (migrate, not push)** so both drivers share one schema source. | The connect/config API has changed across minors; confirm the dual-driver pattern + migration flow still holds. |
| **Better Auth** | Current version + the **organization/multi-tenancy** and **RBAC/access-control** plugin names and setup. | Plugin names/APIs evolve; multi-tenancy is load-bearing for `nfr.md` tenant isolation. |
| **shadcn/ui + Tailwind** | Current CLI + Tailwind major (config vs CSS-first). | Tailwind 3→4 changed config; shadcn install flow tracks it. |
| **Pulumi + Cloud Run** | Current `@pulumi/gcp` Cloud Run resource (v1 vs v2 service). | GCP resource shapes change; pick the current one. |
| **Hono / MCP SDK** | Current majors + Bun adapter. | Confirm Bun runtime support and current middleware patterns. |

## How to record what you verified

In the blueprint's **Stack** section, annotate each verified row with the confirmed version and the
date, e.g.:

```
- Vercel AI SDK: verified 5.x (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) — MockLanguageModelV1 for fixtures [verified <date>]
- Drizzle + PGlite: verified <ver>, dual-driver via DATABASE_DRIVER [verified <date>]
```

## Guardrails
- **Don't expand the stack.** The gate confirms versions/APIs of the chosen tools; it does not invite
  swapping tools because something newer is trending. Tool swaps are user overrides only.
- **Don't block forever.** Up to ~3 context7 calls and a handful of searches. If a version can't be
  pinned confidently, record the latest known-good and flag it as "confirm at install" in the blueprint.
- **It's the build that installs.** forge records versions; superpowers runs the installs. If reality
  differs at install time, the build adjusts and the blueprint is the record of intent.
