# Per-feature feasibility pass — is each feature actually buildable?

A feature earns its place on the list only if a coding agent can ship it on a buy-a-domain / vibecode /
plug-in-Stripe stack in days-to-weeks — **evidenced, not assumed.** This pass produces each feature's
`Feasibility` field. Run it per feature; keep it proportional (a plain list screen needs no check; a
"pull bank transactions via Plaid" feature does).

Like idea-brief's verification, it **discovers capabilities at runtime** and binds each doubt to a
capability by *purpose*, never a hardcoded tool name.

## What to check (three classes)

1. **Integration / data-source reachability** — does every external system the feature touches exist,
   expose a public/programmatic interface (API, webhook, SDK, export), and is it reachable **without** a
   signed partnership, enterprise sales call, or closed beta?
2. **Core-work achievability** — can the feature's In → Out be built with the common vibecode toolkit
   (CRUD + auth, hosted DB, LLM/text API, file parse/generate, standard third-party APIs, Stripe) — or
   does it need custom ML training, novel research, real-time/low-latency infra, hardware, or accuracy
   guarantees no off-the-shelf model gives?
3. **Data availability** — does each consumed data source exist in an accessible form (public dataset,
   user-supplied upload, a reachable API) rather than proprietary data with no access path?

If the brief already carries a Verification log covering an integration, **consume it — don't re-check
what the brief settled.** Only validate what the brief left open or the scope newly introduced.

## How to settle a doubt

Bind each real doubt to an available capability by purpose:

- a **docs-lookup / library-docs** tool for "does this API exist / is it self-serve",
- else **web search**,
- else **common knowledge** of well-known APIs (Stripe, Google, Slack, OpenAI, Plaid…),
- else, for "is this buildable / effort realistic" where no search settles it, a **helper sub-agent**
  (if sub-agents exist) or reason it through.

Run checks in parallel where possible. If nothing can settle a doubt, the verdict is
`feasibility-unconfirmed — <what to verify>` — surfaced, never a silent pass.

## The verdict words

Write one of these in the Feasibility field, then `— <≤6-word evidence>`:

| Verdict | Means | What to do |
|---|---|---|
| `self-serve` | Real, reachable, off-the-shelf for a solo builder | Keep — this is the clean case |
| `partnership-gated` | No self-serve API (direct bank data, payor claims API, MLS feed) | Re-route via a self-serve aggregator, or cut — flag it for the user |
| `cost-gated` | Enterprise-only pricing / "contact sales", beyond a solo budget | Flag for the user — find a cheaper path or cut |
| `data-gated` | Required data is proprietary / unobtainable | Cut or find an accessible source |
| `research-gated` | Needs ML training / novel research / accuracy guarantees beyond a common build | Reduce to an off-the-shelf LLM/API call, or cut |
| `feasibility-unconfirmed` | Nothing could settle it this run | Surface what to verify; don't list it as `self-serve` |

A feature whose load-bearing integration is anything other than `self-serve` does **not** belong on a
clean v1 list as-is. Don't disguise it — flag it so the user can cut, re-route, or accept the risk.

## Effort realism (a feature-set check, not a per-feature one)

Feasibility is about *doability*, not size. A list with several features and a few self-serve
integrations is fine if every feature is justified, atomic, and individually feasible, and the whole
still ships in days-to-weeks. If the *combined* scope implies months, that's a signal to cut features
(use `references/curation-signals.md`), not to mark any single feature infeasible.
