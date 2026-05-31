---
name: context-personas
description: Use when authoring or reviewing the spec/personas.md context artifact — the actors of a SaaS app, each mapped to a canonical Role, with jobs-to-be-done, goals, and pains. Enforces one file for all personas, role names that match the glossary, observable jobs-to-be-done, and no permission matrix (that lives in rbac-matrix.md).
---

# Context: personas.md

`personas.md` is the **single source of truth for who uses the product and what each one
is trying to get done**. One file, all personas. It feeds the `As a <role>` clause of
every scenario and the priority of capabilities. It does NOT contain a permission matrix
(that is `rbac-matrix.md`), does NOT redefine role meanings (that is `glossary.md`), and
does NOT list authorization invariants (those are `nfr.md` / `rbac-matrix.md`).

## Output

Copy `assets/personas-template.md` verbatim. One `##` block per persona, same fields in
the same order. See `assets/personas-example.md`.

## Rules

1. **Each persona maps to exactly one canonical Role** from `glossary.md` (Owner, Manager,
   Employee…). Use the glossary term verbatim. If a persona needs a role not in the
   glossary, add the role to the glossary first.
   **External / unauthenticated actors** (e.g. a Customer who emails in) are NOT Roles and
   do NOT appear in `rbac-matrix.md`. Give such an actor `Role: none (external)`; its
   triggered behavior is written in gherkin as an event (`When an email arrives from a
   Customer`), never `As a Customer`. Do not reclassify an external actor as a Role to make
   it fit a matrix column.
2. **Jobs-to-be-done are observable tasks** — verb + object a scenario could assert
   ("publish next week's schedule", "request a swap for an assigned shift"). Not vibes
   ("wants to feel in control"), not feelings.
3. **No permission matrix, no allow/deny grids.** A persona block says which Role it holds;
   what that Role may do lives in `rbac-matrix.md`.
4. **Cover the brief's actors, no more.** 3–6 human personas is typical. Add an automated
   actor (billing system, scheduler job) only if it triggers behavior a scenario asserts,
   and keep it to one line.
5. **Pains are concrete.** Name the specific frustration, not "inefficiency".
6. **No invention.** If a persona's role or goal is undecided, ask — do not fabricate a
   user segment the brief never mentioned.

## Downstream-purpose map

- **Role mapping** → `As a <role>` clause; the actor in authorization scenarios; the
  user/role relationship in the ERD.
- **Jobs-to-be-done** → candidate scenarios and a cross-check that every job is covered by
  a `capability-map.md` capability.
- **Goals + pains** → capability priority and the "In order to <value>" clause.

If a line serves none of these, cut it.

## Anti-vagueness gate

Banned: `etc.`, `various`, `as needed`, `power user`, `seamless`, `intuitive`, `robust`,
`wants to feel`, `fast`/`quick`/`slow` without a number, `TBD`, `TODO`. Every job-to-be-done
starts with a verb and names an object; goals/pains name only outcomes the spec delivers.

## Self-check before done

- [ ] One block per persona, fixed fields, in order.
- [ ] Every persona's Role is a verbatim `glossary.md` Role term.
- [ ] Every job-to-be-done is a verb + object (observable).
- [ ] No permission matrix or allow/deny grid anywhere.
- [ ] No persona invented beyond the brief; no banned phrase; no `<placeholder>`.
