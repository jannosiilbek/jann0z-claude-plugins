---
name: context-rbac
description: Use when authoring or reviewing the spec/rbac-matrix.md context artifact — the authoritative roles-by-resources-by-actions permission matrix for a SaaS app. Enforces glossary-sourced roles and resources, no blank cells, concrete conditions from a small vocabulary, and no HTTP/denial-code or subscription-gating leakage.
---

# Context: rbac-matrix.md

`rbac-matrix.md` is the **single source of truth for who may do what**. It is the only
file that contains a permission matrix — `personas.md` must not. It
defines authorization in declarative, glossary-sourced terms. It does NOT define role
meanings (that is `glossary.md`), does NOT specify HTTP status codes or denial semantics
(implementation detail), and does NOT define subscription-state gating (that cross-cutting
invariant is owned by `nfr.md`).

## Output

Copy `assets/rbac-matrix-template.md` verbatim: a roles line, a legend, one matrix table,
and a conditions list. See `assets/rbac-matrix-example.md`.

## Rules

1. **Roles are glossary Roles**, used verbatim as the matrix columns. Do not invent roles
   or redefine them here.
2. **Resources are glossary Entity terms.** Each matrix row's resource must appear in
   `glossary.md`.
3. **No blank cells.** Every (resource, action, role) cell has a value from the legend.
   A blank is an undecided permission — resolve it or ask, never leave it.
4. **Conditions come from a small, named vocabulary** defined in the conditions list
   (e.g. `own`, `same-location`, `same-business`). Reuse the same condition names; do not
   free-write a new phrasing each row.
5. **Declarative only.** No HTTP codes (402/403/404), no "return not-found to avoid
   leaking existence", no predicate pseudo-code. Those are implementation choices the spec
   does not fix.
6. **No subscription gating here.** "Write actions require an active subscription" is a
   cross-cutting invariant owned by `nfr.md`; reference it, do not restate it.
7. **No invention.** If a permission is genuinely undecided, ask — do not guess a cell.

## Downstream-purpose map

- **Allowed cells** → permitted-action authorization scenarios.
- **Denied cells** → "is forbidden when role is X" scenarios (the negative cases).
- **Conditions** (own / same-location…) → the `Given` preconditions of those scenarios.
- **Roles + resources** → role / membership / permission entities in the ERD.

If a cell or condition serves none of these, it does not belong.

## Anti-vagueness gate

Banned: `etc.`, `various`, `as appropriate`, `where applicable`, `configurable` (without
naming the setting), `robust`, `TBD`, `TODO`, and any blank cell. Conditions are named and
defined; actions are concrete verbs.

## Self-check before done

- [ ] Columns are exactly the glossary Roles; rows' resources are glossary terms.
- [ ] No blank cells — every cell has a legend value.
- [ ] Every condition used is defined once in the conditions list and reused by name.
- [ ] No HTTP codes, denial semantics, or predicate code.
- [ ] No subscription-state gating (deferred to `nfr.md`); no permission matrix exists in
      any other file.
- [ ] No banned phrase; no `<placeholder>` left.
