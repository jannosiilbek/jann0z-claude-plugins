# Handoff — from blueprint to the build loop

Once `spec/architecture.md` and `spec/bootstrap.md` are written, forge hands off. It does **not**
plan tasks, scaffold, or write code — it invokes `superpowers:writing-plans` and gets out of the way.

## What the downstream skills actually do (don't over-trust them)
- **`superpowers:writing-plans`** — turns a spec into a concrete, bite-sized plan saved under
  `docs/superpowers/plans/`, in a git worktree. It then **offers an execution choice** — it does
  **not** auto-chain into execution.
- **`superpowers:subagent-driven-development`** — executes a plan task-by-task with fresh subagents
  and two-stage review. **It runs a plan to completion without stopping to check in.** This is the
  key constraint below.
- **`impeccable`** — drives the design phase (DESIGN.md + tokens) and every UI surface.

**These skills know nothing about forge's stack, checkpoints, impeccable step, landing-page-first
rule, or drift-check unless those are written into the plan as explicit tasks/gates.** They reproduce
only what the handed spec makes explicit. So the handoff's whole job is to make `writing-plans`
transcribe `bootstrap.md` faithfully.

## How the STOP gate survives — split into two plans
forge's `bootstrap.md` has a hard **▸ STOP: validate the full stack** gate after the landing page.
But `subagent-driven-development` is built to blow through in-plan pauses. So the gate cannot live
*inside* one plan — it must be a **plan boundary**. Instruct `writing-plans` to produce **two plans**:

1. **Plan A — backend + landing page** (`bootstrap.md` steps 1–12): scaffold → data → contracts →
   ports → domain → API → MCP → LLM fixtures → e2e (backend-complete checkpoint) → impeccable design
   → landing page. Plan A *ends* at the STOP gate — its completion (via
   `superpowers:finishing-a-development-branch`) **is** the validation pause where the user signs off.
2. **Plan B — the rest of the UI** (`bootstrap.md` steps 13–14): per-persona/feature screens + ops.
   Authored/started only after the user validates Plan A.

This aligns with `writing-plans`' own "one plan per subsystem" guidance instead of fighting
`subagent-driven-development`'s continuous-execution rule.

## What forge instructs `writing-plans` to do
- **Build against:** `spec/bootstrap.md` (the ordered runbook — start here) + `spec/architecture.md`
  (the standing reference) + `spec/features/**` (behavior) + the rest of `spec/` (glossary, product,
  capability-map, rbac, nfr, model.dbml).
- **Transcribe, don't assume:** carry `bootstrap.md`'s ordered steps, the **impeccable design step**,
  and the **backend-complete** checkpoint into Plan A as explicit tasks/gates; put the **STOP** at the
  Plan A/B boundary. Make the **drift-check** (`drift-check.md`) a per-task review criterion. The
  **Scaffold task must include creating the root `CLAUDE.md`** from forge's template (router into
  `spec/`) — otherwise the build never creates it.
- **Two plans, capability-DAG order**, as above.

## Handoff message (what forge says)
> "`spec/architecture.md` + `spec/bootstrap.md` are written — opinionated stack, data-first build
> order, checkpoints, and drift protocol. Handing off to `superpowers:writing-plans` to plan the
> build against the runbook + the gherkin features. I've asked it to produce two plans split at the
> stop-to-validate gate (backend + landing page first, then the rest of the UI), with the impeccable
> design step and drift-checks transcribed in. `writing-plans` will offer you an execution choice
> (recommended: `subagent-driven-development`); the build pauses after the landing page so you can
> validate the full stack."

Then invoke `superpowers:writing-plans`.

## Boundaries
- forge runs **no** shell commands and writes **no** code or config beyond `spec/architecture.md` and
  `spec/bootstrap.md`.
- If the user wants to skip planning and start coding immediately, still route through
  `superpowers:writing-plans` — the blueprint is the input, not a replacement for a plan.
- If the spec was incomplete, forge should have stopped at the precondition gate, not reached handoff.
