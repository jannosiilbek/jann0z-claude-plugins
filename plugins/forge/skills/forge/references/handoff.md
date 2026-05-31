# Handoff — from blueprint to the build loop

Once `spec/architecture.md` is written, forge hands off. It does **not** plan tasks, scaffold, or
write code — it invokes the skills that do, and gets out of the way.

## Who does what after forge
- **`superpowers:writing-plans`** — turns the blueprint + features into a concrete, bite-sized
  implementation plan (file paths, tasks, tests, commands). Operates in a git worktree.
- **`superpowers:subagent-driven-development`** — executes that plan task-by-task with fresh
  subagents and two-stage review (spec compliance + code quality). This is where scaffolding,
  migrations, and code actually happen.
- **`impeccable`** — invoked within the build for the design phase (DESIGN.md + tokens) and for every
  UI surface, keeping design consistent (`design.md`).

## What forge passes to `writing-plans`
- **The spec to build against:** `spec/architecture.md` (how) + `spec/features/**` (what behavior) +
  the rest of `spec/` as reference (glossary, product, capability-map, rbac, nfr, model.dbml).
- **The build order:** the sequence + checkpoints from the blueprint (`build-order.md`). The plan
  must follow capability-DAG order and preserve the three checkpoints:
  1. **▸ Backend-complete** (data + contracts + ports + domain + API + MCP + LLM fixtures + e2e green),
  2. **Design via impeccable → landing page first**,
  3. **▸ STOP: show the user, validate the full stack** before the rest of the UI.
- **The drift-check** (`drift-check.md`) as a per-slice + CI gate.

## Handoff message (what forge says)
> "`spec/architecture.md` is written — opinionated stack + data-first build order + checkpoints +
> drift protocol. Handing off to `superpowers:writing-plans` to plan the build against the blueprint
> and the gherkin features, then `superpowers:subagent-driven-development` to execute, with
> `impeccable` driving design. The build will stop after the landing page so you can validate the
> full stack before the rest of the UI is built."

Then invoke `superpowers:writing-plans`.

## Boundaries
- forge runs **no** shell commands and writes **no** code or config beyond `spec/architecture.md`.
- If the user wants to skip planning and start coding immediately, still route through
  `superpowers:writing-plans` — the blueprint is the input, not a replacement for a plan.
- If the spec was incomplete, forge should have stopped at the precondition gate, not reached handoff.
