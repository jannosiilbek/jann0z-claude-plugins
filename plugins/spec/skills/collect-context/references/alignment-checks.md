# Alignment checks

Run every check against the six `spec/` files. Each is pass/fail. The suite is complete
only when all pass. For a multi-file suite, dispatch one sub-agent reviewer per check
class in parallel, then collate.

## 1. Term consistency (glossary is law)

- Every domain noun used in any file appears in `glossary.md` exactly once.
- No file uses a word listed in another term's **Forbidden synonyms** (Venue→Location,
  Job-Role→Position, canceled vs cancelled, …).
- A term missing from the glossary but used elsewhere → FAIL (add it to the glossary).

## 2. Enum consistency

- Every status/value set is defined only in the glossary Enumerations table.
- Wherever a status value is used (nfr gating, product), it matches the
  glossary values verbatim. A different or extra value → FAIL.

## 3. Persona ↔ role integrity

- Every persona's Role in `personas.md` is a glossary Role term.
- Every column in `rbac-matrix.md` is a glossary Role term.
- Every Role that has a persona is covered by the matrix, and every matrix role has a
  persona — no orphan roles.

## 4. Capability ↔ scope integrity

- Every capability in `capability-map.md` corresponds to an in-scope item in `product.md`.
- No capability matches an out-of-scope item.
- `Depends on` references only lower-numbered capabilities (valid DAG, no cycles, no
  forward references).
- Exactly one walking skeleton is named.

## 5. Pricing ↔ gating consistency

- Plan names in `product.md` appear in the glossary.
- The trial behavior in `product.md` agrees with the subscription-state gating in
  `nfr.md` (e.g. "read-only at expiry" matches the `past_due`/`canceled` rule).
- No contradictory limit appears in two places.

## 6. RBAC completeness

- No blank cells in the matrix.
- Every condition used (own, loc, …) is defined once in the conditions list.
- Resources are glossary Entity terms.
- No HTTP codes, denial semantics, or subscription gating leaked into the matrix.

## 7. NFR testability

- Every invariant is a pass/fail statement.
- Every limit / SLA / retention / grace value is a number with a unit.
- Subscription gating is present here and nowhere else.

## 8. Single-ownership (no duplication)

- Exactly one glossary, one permission matrix, one scope list, one subscription-gating
  rule across the whole `spec/`. A second copy anywhere → FAIL.
- No file restates a fact another file owns (see the ownership contract in SKILL.md).

## 9. Anti-vagueness + completeness scan

- Grep every file for the banned vocabulary: `etc.`, `and so on`, `various`, `robust`,
  `user-friendly`, `seamless`, `intuitive`, `as appropriate`, `as needed`, `flexible`,
  `best-effort`, `should handle`, `scalable`/`fast`/`performant` without a number,
  `probably`, `we might`, `for now`, `TBD`, `TODO`, trailing `…`. Any hit → FAIL.
- No `OPEN:` marker remains.
- No `<placeholder>` from any template remains.
- Every section the templates require is present in each file.
