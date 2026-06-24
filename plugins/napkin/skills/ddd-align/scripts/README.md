# Spec alignment harness

`check-align.mjs` parses the `spec/` artifacts defined in `../references/spec-format.md`
and mechanically proves their cross-references:

- **Role:** oracle for the ddd-align skill and exit gate every napkin DDD pipeline skill runs after writing an artifact.
- **False-green prevention:** a spec directory that parses to zero artifacts exits non-zero; structural damage is reported, never silently skipped.

`selftest.mjs` is an adversarial regression suite proving the checker catches drift
(renamed tables, deleted-but-cited use cases, enum respelling, invented assertion
operators, stripped markers, …). Run `node selftest.mjs` or `npm test`.

**Zero dependencies** — plain Node, no install step.

## Run

```bash
node check-align.mjs --spec path/to/spec [--require glossary,model,usecases,plan]
```

| Flag | Meaning |
|------|---------|
| `--spec` | The spec directory to audit (the one holding `brief.md`, `glossary.md`, …). |
| `--require` | Comma-separated artifacts that must be present: `brief`, `glossary`, `flows`, `usecases`, `plan`, `model` (= `data/model.dbml`), `sql` (= `data/usecases.sql`). Use at pipeline milestones; without it, partial pipelines are legal and missing artifacts are `info`. |

## Checks

| Check | Severity | Proves |
|-------|----------|--------|
| AL-01 | error | every glossary `Maps to: ERD: <t>` table exists in model.dbml |
| AL-02 | error | every model.dbml table traces back to a glossary term |
| AL-03 | error | every shared enum has the exact same value set and spelling in glossary and DBML (AL-03b warn: order differs) |
| AL-04 | error | every glossary Enumerations row exists as a DBML Enum (AL-04b warn: DBML enum missing from glossary) |
| AL-05 | error | every active UC is implemented by ≥1 plan task (when plan.md exists) |
| AL-06 | error | every plan `Implements:`/`Depends on:` reference resolves (AL-06b warn: cites a deprecated UC) |
| AL-07 | error | every active UC has ≥1 EARS-shaped acceptance criterion |
| AL-08 | error | every active UC has data assertions inside the closed assertion grammar (defined in `../../erd-modeler/scripts/README.md`) |
| AL-09 | error | every actor (flows + use cases) is a glossary term |
| AL-10 | error | ID format and uniqueness (UC/FL/T/M) |
| AL-11 | error | the plan dependency graph is acyclic |
| AL-12 | warn | every UC trigger names a Command/Event from flows.md |
| AL-13 | warn | forbidden synonyms do not appear in flows/usecases/plan |
| AL-14 | error | every active UC has a labeled block in `data/usecases.sql` (when present) |
| AL-15 | error | structural integrity: markers present, ID headings well-formed, policies parse — reported with line numbers, never silently skipped |
| AL-16 | warn | upstream-fingerprint in `data/model.dbml` is stale — a source file it hashes has changed since the model was last generated |
| AL-17 | error | every active UC has a corresponding `## API-UC-xxx` entry in `api.md` (when api.md exists) |
| AL-18 | error | every error code slug in a `Response 4xx:` line in `api.md` appears in `nfr.md § Error contracts` (when both exist) |
| AL-19 | warn | every `Policy: Whenever X, then Y` command Y is the trigger of at least one active UC — an unmatched policy command indicates a missing use case |
| AL-20 | error | `stack.md §Conventions` must exist with `File naming:` and `File structure:` fields present |
| AL-21 | error | `stack.md §Structure` must exist with `Repo:` field and ≥3 path entries (`- <path>/…: …` lines) |
| AL-22 | error | `Preset:` in `stack.md §Runtime` must be a known preset name when the field is present |
| AL-23 | error | when `Preset:` is declared, `File naming:` and `File structure:` in `§Conventions` must match the preset's canonical values |
| AL-24 | error | `stack.md §Pipeline` must exist with `CI:`, `Branching:`, and `Branch map:` fields present |
| AL-00 | info/error | artifact presence bookkeeping; `--require` misses are errors |


## Output

JSON on stdout:

```json
{
  "ok": true,
  "artifacts": { "found": ["brief", "glossary", "usecases"], "missing": ["flows", "plan"] },
  "findings": [
    { "check": "AL-01", "severity": "error", "artifact": "glossary.md", "line": 12,
      "message": "term \"Enrollment\" maps to table `enrollments` which does not exist in model.dbml (…)" }
  ],
  "stats": { "artifacts_found": 3, "errors": 1, "warnings": 0, "infos": 2, "usecases_active": 3, "plan_tasks": 0 }
}
```

**Exit code is `0` only when**: at least one artifact was parsed (no vacuous green),
there are zero `error` findings, and every `--require`d artifact is present.

## Fixtures

`fixtures/golden/spec/` is a complete, aligned sample spec (course platform domain)
exercising every grammar feature. The selftest mutates copies of it; it is also the
reference example of what a finished pipeline output looks like.
