# Validation record — `erd-modeler` plugin

Date: 2026-05-30
Branch: `add-erd-modeler-plugin`
Task: Task 2 — validate & dogfood the newly landed `erd-modeler` plugin.

## Step 1 — Structural validation

```
structure OK
```

- `marketplace.json` plugins == `{gherkin, erd-modeler}`.
- All expected skill/reference/script files present.
- `scripts/node_modules` NOT committed; `scripts/package-lock.json` NOT committed.

## Step 2 — Adversarial harness self-test

Ran: `node selftest.mjs` in `plugins/erd-modeler/skills/erd-modeler/scripts`.

Result: **exit=0** — ran successfully (network available; PGlite auto-installed on first run).

Summary: all 15 oracle self-tests passed.

```
[erd-test] @electric-sql/pglite not found — installing once via npm (this happens only on first run)...
added 1 package, and audited 2 packages in 1s
found 0 vulnerabilities
  PASS  broken-test caught (P1)
  PASS  FK reason matches (P1)
  PASS  wrong reason rejected (P1)
  PASS  unique reason matches (P1)
  PASS  vacuous pass blocked (P2)
  PASS  rowcount/rows not conflated (P3)
  PASS  value= passes correct (P4)
  PASS  value= catches inflation (P4)
  PASS  malformed expect flagged (P5)
  PASS  multi-statement asserts final (P6)
  PASS  use-cases are isolated (P7)
  PASS  coverage warns (P13)
  PASS  correct suite goes green (no false-red)
  PASS  enum reason-qualified (dogfood)
  PASS  delete-then-verify counts as write (dogfood)

ALL ORACLE SELF-TESTS PASSED
exit=0
```

## Step 3 — Smoke-test on a tiny model

Ran the harness against a 2-table customers/orders model with seed data and two use-cases
(a counting query and an orphan-FK rejection).

Result: **exit=0**, `"ok": true`, both use-cases passed (2/2).

```json
{
  "ok": true,
  "schema": { "ok": true, "errors": [] },
  "seed": { "ok": true, "errors": [] },
  "usecases": [
    {
      "label": "list orders for a customer",
      "command": "SELECT",
      "wrote": false,
      "statements": 1,
      "expect": "value=1",
      "pass": true,
      "status": "pass",
      "detail": "value 1 == 1",
      "rows": 1,
      "affected": 0
    },
    {
      "label": "reject orphan order",
      "command": "INSERT",
      "wrote": true,
      "statements": 1,
      "expect": "error ~ foreign key",
      "pass": true,
      "status": "pass",
      "detail": "rejected for \"foreign key\" (code 23503)",
      "error": "insert or update on table \"orders\" violates foreign key constraint \"orders_customer_id_fkey\"",
      "code": "23503"
    }
  ],
  "warnings": [],
  "stats": {
    "schema_errors": 0,
    "seed_errors": 0,
    "usecases_total": 2,
    "usecases_passed": 2,
    "warnings": 0
  }
}
```

## Step 4 — No node_modules / package-lock tracked

- `git ls-files | grep -c node_modules` == **0**.
- No `erd-modeler` `package-lock.json` tracked (count == 0).
- `node_modules/` is covered by the repo root `.gitignore` (line 1: `node_modules/`); the
  created `scripts/node_modules` exists locally but is git-ignored and remains untracked.
- npm also created `scripts/package-lock.json` as a side effect; it is untracked and was NOT
  staged or committed (only the validation doc is committed).

## Conclusion

**PASS** — structure valid; adversarial self-test green (15/15, exit=0); smoke-run green
(`ok: true`, 2/2 use-cases, exit=0); no `node_modules` or `package-lock` tracked.
