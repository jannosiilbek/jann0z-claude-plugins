# CLAUDE.md

## What this repo is

- A personal Claude Code plugin marketplace: `plugins/napkin` and `plugins/lunchbox`.
- Plus eval infrastructure for measuring and hardening those skills.
- No build step — skills are markdown (`SKILL.md`) plus optional Node.js harnesses.

## Napkin plugin — DDD spec pipeline

`plugins/napkin` chains six skills into a DDD pipeline that writes persistent artifacts to the target project's `spec/` directory:

```
ddd-brief → ddd-domain → ddd-usecases → [ddd-api] → erd-modeler → ddd-plan
                                               │
                           ddd-align (exit gate on every step)
```

`[ddd-api]` is optional — runs when the brief's Pipeline sizing block declares `ddd-api: yes` (any project with an external surface).

| Skill | Writes |
|-------|--------|
| `ddd-brief` | `spec/brief.md`, `spec/stack.md`, `spec/nfr.md` |
| `ddd-domain` | `spec/glossary.md`, `spec/flows.md` |
| `ddd-usecases` | `spec/usecases.md` |
| `ddd-api` | `spec/api.md` (optional — skipped when `Interface: Kind = none`) |
| `erd-modeler` | `spec/data/model.dbml`, `spec/data/usecases.sql`, `spec/decisions.md` |
| `ddd-plan` | `spec/plan.md` |
| `ddd-align` | report only — never edits |
| `erd-diagram` | standalone render — never auto-triggers |

**`check-align.mjs`** validates `spec/` artifacts — see `plugins/napkin/skills/ddd-align/scripts/README.md` for the check list and output contract.

**`erd-modeler` and `erd-diagram` dependencies are not committed** — they install on first use.

## Lunchbox plugin — productivity skills

`plugins/lunchbox` contains four skills: `goal`, `council`, `doc-align`, and `product-sparring`.

- Prompt-only skills with optional `references/` and `evals/`.
- `product-sparring` also ships a `scripts/lint-canvas.mjs` harness.

## Testing

Run harness selftests from their `scripts/` directories:

```bash
cd plugins/napkin/skills/erd-modeler/scripts && npm test   # PGlite live-test harness
cd plugins/napkin/skills/ddd-align/scripts   && npm test   # spec-consistency harness
cd plugins/napkin/skills/erd-diagram/scripts && npm test   # renderer harness
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
