// checks.mjs — the CLOSED check-record grammar + reconciliation arithmetic for the anamnesis
// bridge oracle (references/simulation.md §2/§4). Pattern copied from the sibling
// schema-therapy harnesses (never imported across the skill boundary), re-pinned to the
// anamnesis dialect. Five check classes:
//   mechanical   — shape rules over a parsed artifact (G0/G1/G2/G3/G5 owner checks).
//   resolution   — a cross-artifact reference resolves (R-RESOLVE, P-JRN, …).
//   exactValue   — a recomputed value equals a declared one (R-HDR sha, R-DET bytes).
//   negative     — the selftest's negative arm (counted there, never in a live run).
//   agentJudged   — closed-verdict residue the mechanical layer cannot supply (none here).
//
// Each check is one { id, class, rule, gate, status, detail } record. The harness collects
// them into checks[] (pass|warn|fail) and findings[] (the blocking fail/​warn details that
// carry a class). A check's blocking behaviour MUST match its catalog severity: R-SMELL and
// R-SIZE are warn-only (status:"warn", never findings, never block).

export const rec = (id, cls, rule, gate, status, detail) =>
  ({ id, class: cls, rule, gate, status, detail: detail || '' });

// ---------------------------------------------------------------------------
// Reconciliation (§4). The harness counts the edges it MUST walk and compares to the count
// it DID walk; a mismatch is a broken-test (a check was silently dropped). Zero executed
// checks ⇒ broken-test (the vacuous-green guard). Extracted so the arithmetic is
// unit-testable: a dropped edge / zero checks must flip the run to broken-test, never a
// silent pass.
// ---------------------------------------------------------------------------
export function reconcile({ edgesWalked, edgesExpected, executedChecks }) {
  return (edgesWalked === edgesExpected) && (executedChecks > 0);
}

// ONE precedence — broken-test > malformed > fail > pass — so a reconciliation failure
// surfaces as broken-test EVEN WHEN malformed findings are present.
export function reconcileStatus({ edgesWalked, edgesExpected, executedChecks, anyMalformed, hasFail }) {
  if (executedChecks === 0) {
    return { status: 'broken-test', reason: 'zero executed checks (vacuous-green guard)' };
  }
  if (edgesWalked !== edgesExpected) {
    return {
      status: 'broken-test',
      reason: `edge reconciliation mismatch (walked ${edgesWalked} ≠ expected ${edgesExpected}) — a check was silently dropped`,
    };
  }
  if (anyMalformed) return { status: 'malformed', reason: 'one or more ledger/journal/brief artifacts unparseable' };
  if (hasFail) return { status: 'fail', reason: '' };
  return { status: 'pass', reason: '' };
}
