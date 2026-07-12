# ERD live-test harness

`run-erd-test.mjs` mechanically exports Postgres DDL from a DBML model (via @dbml/core),
loads it into an in-memory **PGlite** Postgres, seeds it, and runs labeled
business-use-case queries with assertions — so PGlite tests exactly what the saved
model declares.

- **Role:** oracle for stage 5 of the erd-modeler skill (see `../references/live-testing.md`).
- **False-green prevention:** an assertion passes only when it has actually proven something.

`selftest.mjs` is an adversarial regression suite that proves the oracle catches
false-green (broken negative tests, vacuous passes, rowcount/rows conflation, fan-trap
inflation, malformed assertions, cross-use-case leakage). Run `node selftest.mjs`.
Set `ERD_SELFTEST_DATA_DIR=1` to also exercise the `CLAUDE_PLUGIN_DATA` install path
(does a real `npm install` into a temp dir — slower, needs network or a warm npm cache).

## Install — automatic

**You don't need to install dependencies manually**: `run-erd-test.mjs` checks for them
on startup and runs `npm install` once when missing (using the version ranges in
`package.json`). npm's output is routed to stderr so it never corrupts the JSON summary
on stdout. Where they install:

- **Plugin runtime** (`CLAUDE_PLUGIN_DATA` set by Claude Code): into
  `$CLAUDE_PLUGIN_DATA/erd-modeler/node_modules`. The plugin install tree itself is
  ephemeral (replaced on every plugin update), so dependencies live in the plugin's
  persistent data directory and survive updates. A copy of `package.json` kept there
  detects dependency changes across updates and triggers a reinstall.
- **Dev checkout** (env var unset, e.g. `npm test`): next to the scripts, in this
  directory.

The harness is **not** shipped with a frozen `node_modules` — a fresh install picks up
library improvements and matches the local Node/OS. First run needs `npm` on PATH and
network access; after that it's offline. Two simultaneous first runs could race the
install; npm handles this idempotently in practice. To force a manual/refresh install,
run `npm install` in the active deps directory — `$CLAUDE_PLUGIN_DATA/erd-modeler` at
plugin runtime, or this `scripts/` directory in a dev checkout.

PGlite is a WASM build of Postgres — no native Postgres install is needed, and the
database lives entirely in memory.

## Run

```bash
node run-erd-test.mjs \
  --dbml     /tmp/erd-test-1/model.dbml \
  --seed     /tmp/erd-test-1/seed.sql \
  --usecases /tmp/erd-test-1/usecases.sql
```

| Flag | Meaning |
|------|---------|
| `--dbml` | **Primary.** The DBML model; the harness exports the Postgres DDL from it via @dbml/core and loads that. A syntax error surfaces as a `dbml`-phase error (with line/column) and exits non-zero. |
| `--emit-schema` | Optional (with `--dbml`): also write the exported DDL to this path. |
| `--schema` | Legacy alternative to `--dbml`: hand-supplied Postgres DDL (CREATE TYPE/TABLE/INDEX). Exactly one of `--dbml`/`--schema` is required. |
| `--seed` | INSERTs. Run second. |
| `--usecases` | Labeled use-case blocks (contract below). Run third. |

With `--dbml`, delete policies come from native standalone-Ref settings
(`Ref: a.b > c.d [delete: cascade]`). A legacy `// ON DELETE` comment in the model
produces a warning — comment-only policies export as NO ACTION and prove nothing.

## usecases.sql contract

One block per business use-case:

```sql
-- usecase: <human label>            (append [persist] to commit instead of rolling back)
<one or more SQL statements>          (multi-statement: assertion applies to the LAST)
-- expect: <assertion>
```

Each use-case runs in **its own transaction that is rolled back**, so use-cases are
order-independent (a write in one does not leak into a later read). Append `[persist]` to
the label to `COMMIT` instead.

### Assertion grammar (CLOSED set — do not invent operators)

| `-- expect:` | Passes when |
|---|---|
| `error` | rejected by a **genuine** runtime/constraint error; a `does not exist`/syntax-class error is a **broken test** → fails |
| `error ~ <reason>` | rejected for a specific reason: keyword `foreign key` (23503), `not null` (23502), `unique` (23505), `check` (23514), `enum` (22P02) — **or** any case-insensitive substring of the error message. The broken-test check runs **first**: a qualified reason can never launder a typo'd table/column into a pass |
| `rowcount=N` | **writes only** — `affectedRows === N`; on a read final statement fails as `expect-mismatch` |
| `rows=N` / `rows>=N` | **reads only** — returned row count; on a write final statement without `RETURNING` fails as `expect-mismatch`; `rows>=0` is vacuous and fails as `malformed` |
| `value=<v>` | result is exactly one row, one column, equal to `<v>` |
| `col:<name>=<v>` | result is exactly one row; column `<name>` equals `<v>` |
| _(omitted)_ | **setup blocks only** — the body executes without error. A block labeled `UC-xxx…` claims a spec proof and MUST carry an expect; without one it fails as `missing-expect` |

- Reads MUST use `rows=`/`rows>=`/`value=`/`col:`; writes MUST use `rowcount=`. The
  harness enforces this against the final statement's command; statements it can't
  classify (e.g. `WITH`, which can wrap either kind) are exempt from the check.
- Broken-test detection is **SQLSTATE-first**: when the engine reports a code, the code
  decides (so an application `RAISE EXCEPTION '... does not exist'` — P0001 — is a genuine
  domain error, while a typo'd table — 42P01 — is always a broken test).
- `<v>` compares numerically when both sides are numbers (`70.00` == `70`), the literal
  `null` matches a SQL NULL, otherwise it's a trimmed string compare.
- Trailing inline comments (` -- ...` / ` # ...`) on count/value assertions are tolerated.
- An unrecognized assertion is reported with `status: "malformed"` (fix the assertion,
  not the model) — distinct from a content `fail`.

## Output

A JSON summary on stdout. Each use-case carries `label`, `command`, `statements`,
`expect`, `pass`, `status` (`pass`|`fail`|`malformed`|`broken-test`|`unexpected-error`|
`executed`|`missing-expect`|`expect-mismatch`), and a human-readable `detail`. The top
level includes a `warnings[]` array (dropped/duplicate blocks, coverage gaps) and `stats`.
In `stats`, `usecases_asserted`/`asserted_passed` count only blocks that carry an expect —
that is the pass rate that proves something; `executed_only` counts setup blocks.

On the `--dbml` path the summary additionally carries a `dbml` phase
(`{ "ok": true, "source": "model.dbml", "errors": [] }`); export failures list
line/column-anchored diagnostics and fail the run before anything loads.

```json
{
  "ok": true,
  "schema": { "ok": true, "errors": [] },
  "seed": { "ok": true, "errors": [] },
  "usecases": [
    { "label": "Reject orphan FK", "command": "INSERT", "statements": 1, "expect": "error ~ foreign key", "pass": true, "status": "pass", "detail": "rejected for \"foreign key\" (code 23503)" }
  ],
  "warnings": [],
  "stats": { "schema_errors": 0, "seed_errors": 0, "usecases_total": 1, "usecases_passed": 1, "usecases_asserted": 1, "asserted_passed": 1, "executed_only": 0, "warnings": 0 }
}
```

**Exit code is `0` only when**: schema + seed load cleanly, **at least one** use-case was
parsed, and **every** use-case passes. A non-empty `usecases.sql` that parses to zero
blocks exits non-zero (no vacuous green). Otherwise exit is non-zero, with per-statement
errors (message + SQLSTATE) for exact attribution.
