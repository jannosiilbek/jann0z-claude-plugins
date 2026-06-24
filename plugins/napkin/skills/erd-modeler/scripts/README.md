# ERD live-test harness

`run-erd-test.mjs` loads a generated schema into an in-memory **PGlite** Postgres, seeds
it, and runs labeled business-use-case queries with assertions.

- **Role:** oracle for stage 5 of the erd-modeler skill (see `../references/live-testing.md`).
- **False-green prevention:** an assertion passes only when it has actually proven something.

`selftest.mjs` is an adversarial regression suite that proves the oracle catches
false-green (broken negative tests, vacuous passes, rowcount/rows conflation, fan-trap
inflation, malformed assertions, cross-use-case leakage). Run `node selftest.mjs`.

## Install — automatic

PGlite is the only dependency. **You don't need to install it manually**:
`run-erd-test.mjs` checks for it on startup and, if it's missing, runs `npm install` in
this directory once (using the version range in `package.json`). npm's output is routed
to stderr so it never corrupts the JSON summary on stdout.

This means the harness is **not** shipped with a frozen `node_modules` — a fresh install
picks up PGlite improvements and matches the local Node/OS. First run needs `npm` on
PATH and network access; after that it's offline. To force a manual/refresh install:

```bash
cd "${CLAUDE_PLUGIN_ROOT}/skills/erd-modeler/scripts"
npm install            # respects the version range in package.json
```

PGlite is a WASM build of Postgres — no native Postgres install is needed, and the
database lives entirely in memory.

## Run

```bash
node run-erd-test.mjs \
  --schema   /tmp/erd-test-1/schema.sql \
  --seed     /tmp/erd-test-1/seed.sql \
  --usecases /tmp/erd-test-1/usecases.sql
```

| Flag | Meaning |
|------|---------|
| `--schema` | Postgres DDL (CREATE TYPE/TABLE/INDEX). Run first. |
| `--seed` | INSERTs. Run second. |
| `--usecases` | Labeled use-case blocks (contract below). Run third. |

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
| `error` | rejected by a **genuine** runtime/constraint error; a `does not exist`/syntax error is a **broken test** → fails |
| `error ~ <reason>` | rejected for a specific reason: keyword `foreign key` (23503), `not null` (23502), `unique` (23505), `check` (23514), `enum` (22P02) — **or** any case-insensitive substring of the error message |
| `rowcount=N` | **writes only** — `affectedRows === N` |
| `rows=N` / `rows>=N` | **reads only** — returned row count |
| `value=<v>` | result is exactly one row, one column, equal to `<v>` |
| `col:<name>=<v>` | result is exactly one row; column `<name>` equals `<v>` |
| _(omitted)_ | the body executes without error |

- Reads MUST use `rows=`/`rows>=`/`value=`/`col:`; writes MUST use `rowcount=`. They are
  strictly distinct (a SELECT has `affectedRows=0`).
- `<v>` compares numerically when both sides are numbers (`70.00` == `70`), the literal
  `null` matches a SQL NULL, otherwise it's a trimmed string compare.
- Trailing inline comments (` -- ...` / ` # ...`) on count/value assertions are tolerated.
- An unrecognized assertion is reported with `status: "malformed"` (fix the assertion,
  not the model) — distinct from a content `fail`.

## Output

A JSON summary on stdout. Each use-case carries `label`, `command`, `statements`,
`expect`, `pass`, `status` (`pass`|`fail`|`malformed`|`broken-test`|`unexpected-error`|
`executed`), and a human-readable `detail`. The top level includes a `warnings[]` array
(dropped/duplicate blocks, coverage gaps) and `stats`.

```json
{
  "ok": true,
  "schema": { "ok": true, "errors": [] },
  "seed": { "ok": true, "errors": [] },
  "usecases": [
    { "label": "Reject orphan FK", "command": "INSERT", "statements": 1, "expect": "error ~ foreign key", "pass": true, "status": "pass", "detail": "rejected for \"foreign key\" (code 23503)" }
  ],
  "warnings": [],
  "stats": { "schema_errors": 0, "seed_errors": 0, "usecases_total": 1, "usecases_passed": 1, "warnings": 0 }
}
```

**Exit code is `0` only when**: schema + seed load cleanly, **at least one** use-case was
parsed, and **every** use-case passes. A non-empty `usecases.sql` that parses to zero
blocks exits non-zero (no vacuous green). Otherwise exit is non-zero, with per-statement
errors (message + SQLSTATE) for exact attribution.
