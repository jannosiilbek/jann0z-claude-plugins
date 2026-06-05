---
description: Run the full schema-therapy modelling pipeline — product intent + domain description → specs/00–10 + drift-police audit
argument-hint: <intent-file> <domain-file> (or inline descriptions)
---

# schema-therapy pipeline — one-shot orchestrator

Run the eleven schema-therapy modelling skills in pipeline order over one
product intent and one domain description, then audit the resulting suite with
the drift police. This command is pure orchestration: each step's discipline
(catalog, professor gate, harness, routing, report) lives inside its skill —
never restate or shortcut it here.

## 1. Resolve the inputs

`$ARGUMENTS` carries two inputs:

- **The product intent** (what the business wants): a file path (preferred) or
  inline prose. Inline prose is written verbatim to `product-intent.md` first,
  so the 00 fingerprint has stable bytes.
- **The domain description** (how the domain works): a file path (preferred) or
  inline prose; inline prose goes to `domain.md` for the same reason.
- **Either missing**: ask for it before doing anything. No written intent at
  all yet? Start with `/schema-therapy:scope` (Gather mode interviews the
  scope out of a blank idea) and return here when it settles.

Resolve the project's flat `specs/` root (create it if absent). All artifacts
land there: `00-impact-map.md`, `01-event-storming.md`, `02-glossary.md`,
`03-aggregates.md`, `04-erd.dbml` + `04-transitions.md`,
`05-statecharts/` (conditional), `06-gherkin/`, `07-personas.md`,
`08-task-models/`, `09-ui-flows/`, `10-flow-acceptance/`.

## 2. Run the steps in pipeline order

Invoke each skill via the Skill tool and follow it exactly. A step is complete
only when its own harness run is green (its step 6 report says so) — never
start the next step before that.

| # | Skill | Consumes | Emits |
|---|-------|----------|-------|
| 0 | `schema-therapy:impact-map` | the product-intent file | `specs/00-impact-map.md` |
| 1 | `schema-therapy:event-storming` | 00, plus the domain file | `specs/01-event-storming.md` |
| 2 | `schema-therapy:glossary` | 01 | `specs/02-glossary.md` |
| 3 | `schema-therapy:aggregates` | 01–02 | `specs/03-aggregates.md` |
| 4 | `schema-therapy:erd` | 02–03 | `specs/04-erd.dbml` + `specs/04-transitions.md` |
| 5 | `schema-therapy:statecharts` | 01–04 | `specs/05-statecharts/<entity>.scxml` — **conditional**: honor the gate; not-emitted is a valid outcome (record the gate decision) |
| 6 | `schema-therapy:gherkin` | 02–04, + 05 when emitted | `specs/06-gherkin/*.feature` |
| 7 | `schema-therapy:personas` | 00–01 | `specs/07-personas.md` |
| 8 | `schema-therapy:task-models` | 06–07 | `specs/08-task-models/<persona>-<job>.xml` |
| 9 | `schema-therapy:ui-flows` | 02, 04, 07–08, + 05 when emitted | `specs/09-ui-flows/<persona>.xml` |
| 10 | `schema-therapy:flow-acceptance` | 06, 08–09 | `specs/10-flow-acceptance/*.feature` — **terminal** |

## 3. Stop conditions (never proceed past a non-green step)

- **`upstream-defect`** raised by any step ⇒ STOP the whole pipeline. Report
  the defect against the named upstream artifact per the step's routing table.
  Never patch around it; never let a later step run over a defective upstream.
- **Non-convergence** (a step exhausts its 5-iteration bound) ⇒ STOP and
  surface that step's non-convergence report verbatim (failing checks,
  per-iteration history, leading hypothesis, the one unblocking question).
- A `malformed` / `broken-test` verdict from a step's harness is a check
  defect, not an artifact defect — the step's own routing handles it; the
  pipeline waits.

## 4. Audit

After step 10 goes green, invoke the `schema-therapy:drift-police` agent over
the suite (give it the specs dir, the domain file, and the intent file). The
pipeline is done only on an **ALIGNED** verdict; on findings, the police
routes remediation to the owning skills (pipeline order, bounded) — follow
its report.

## 5. Final summary

End with one table plus the audit verdict:

| Step | Artifact path(s) | Iterations to convergence | Harness |
|------|------------------|---------------------------|---------|
| 0–10…| …                | N (or gate: not-emitted)  | pass    |

**Drift police:** ALIGNED (or the verdict + routed findings).
