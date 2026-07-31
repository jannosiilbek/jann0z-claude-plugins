# CLAUDE.md

## What this repo is

- A personal Claude Code plugin marketplace: `plugins/napkin` and `plugins/lunchbox`.
- Plus eval infrastructure for measuring and hardening those skills.
- No build step — skills are markdown (`SKILL.md`) plus optional Node.js harnesses.

## Napkin plugin — DDD spec pipeline

`plugins/napkin` chains six skills into a DDD pipeline that writes persistent artifacts to the target project's `spec/` directory:

```
ddd-brief → ddd-domain → ddd-usecases → [ddd-api] → [ddd-screens] → erd-modeler → ddd-plan
                                               │
                           ddd-align (exit gate on every step)
```

`[ddd-api]` and `[ddd-screens]` are optional — each runs when the brief's Pipeline sizing block declares it `yes` (`ddd-api` for any project with an external surface, `ddd-screens` for any project with a human-facing UI).

| Skill | Writes |
|-------|--------|
| `ddd-brief` | `spec/brief.md`, `spec/stack.md`, `spec/nfr.md` |
| `ddd-domain` | `spec/glossary.md`, `spec/flows.md` |
| `ddd-usecases` | `spec/usecases.md` |
| `ddd-api` | `spec/api.md` (optional — skipped when `Interface: Kind = none`) |
| `ddd-screens` | `spec/screens.md` (optional — skipped when there is no human-facing UI) |
| `erd-modeler` | `spec/data/model.dbml`, `spec/data/usecases.sql`, `spec/decisions.md` |
| `ddd-plan` | `spec/plan.md` |
| `ddd-align` | report only — never edits |
| `erd-diagram` | standalone render — never auto-triggers |

**`check-align.mjs`** validates `spec/` artifacts — see `plugins/napkin/skills/ddd-align/scripts/README.md` for the check list and output contract.

**`erd-modeler` and `erd-diagram` dependencies are not committed** — they install on first use
(into `$CLAUDE_PLUGIN_DATA/<skill>` at plugin runtime; into the skill's `scripts/` dir in a dev checkout).

## Lunchbox plugin — productivity skills

`plugins/lunchbox` contains six skills: `goal`, `council`, `doc-align`, `product-sparring`, `brand-namer`, and `ui-first`.

- Prompt-only skills with optional `references/` and `evals/`.
- `product-sparring` also ships a `scripts/lint-canvas.mjs` harness.
- `ui-first` is dual-mode (design | review) and must never write into a target project's `spec/`. Its gated grounding lookup is the only place in either plugin that spawns subagents with web access; they run isolated, return tables only, and inherit the skill's never-write guardrails.

## Testing

Run harness selftests from their `scripts/` directories:

```bash
cd plugins/napkin/skills/erd-modeler/scripts && npm test   # PGlite live-test harness
cd plugins/napkin/skills/ddd-align/scripts   && npm test   # spec-consistency harness
cd plugins/napkin/skills/erd-diagram/scripts && npm test   # renderer harness
cd plugins/napkin/skills/ddd-usecases/scripts && npm test  # usecase-scaffolder harness
```

Pipeline eval — see `plugins/napkin/evals/README.md` for the full improvement loop:

```bash
cd plugins/napkin/evals/pipeline && npm run smoke   # fast gate — always run first
cd plugins/napkin/evals/pipeline && npm test        # grader + regression-gate selftests
```

**A skill change is not done until the selftest(s) it touches pass.**

## Gitignore conventions

- `*-workspace/` — skill-creator eval output, reproducible, never commit
- `pipeline/runs/` — pipeline eval raw output, reproducible, never commit
- `package-lock.json` for erd-modeler and erd-diagram — deps float by design, never commit
- `.claude/settings.local.json` and `.claude/scheduled_tasks.lock` — machine-local, never commit
