---
name: context-personas
description: Use when authoring or reviewing the spec/personas.md context artifact — the actors of a SaaS app, each mapped to a canonical Role, with jobs-to-be-done, goals, and pains. Enforces one file for all personas, role names that match the glossary, observable jobs-to-be-done, and no permission matrix (that lives in rbac-matrix.md).
---

# Context: personas.md

`personas.md` is the **single source of truth for who interacts with the product — both who
*uses* it and who *buys* it — and what each one is trying to get done**. One file, all personas.
It feeds the `As a <role>` clause of every scenario and the priority of capabilities, and it is the
buyer the sell branch's `positioning.md` targets. It does NOT contain a permission matrix
(that is `rbac-matrix.md`), does NOT redefine role meanings (that is `glossary.md`), does NOT list
authorization invariants (those are `nfr.md` / `rbac-matrix.md`), and does NOT carry the *message* to a
buyer — objections, switching forces, and voice live in `positioning.md`. This file owns **who they
are**; positioning.md owns **how to sell to them**.

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
7. **The buying committee lives here too (optional sell-branch fields).** When the sell branch
   needs it, the people who *buy* — not just use — are personas in this same file. A buyer who
   uses the app is an ordinary persona with a Role; a buyer who **never logs in** (a CFO who only
   signs the cheque) is `Role: none (external)`, exactly like any other external actor — it never
   enters `rbac-matrix.md`. Such personas may carry three **optional** fields the template defines —
   `Buyer role` (Champion / Decision-Maker / Economic-Buyer / User), `Buying trigger`, `Reached via` —
   added **only** to personas in the purchase, omitted everywhere else. Keep the *message* (objections,
   rebuttals, switching forces, voice) out of here — that is `positioning.md`. A persona block names a
   buyer's trigger and channel; how you persuade them is owned downstream.
   **Single-actor products:** when one person both buys and uses (a solo/self-serve tool), there is no
   committee — tag them `Buyer role: User` or omit the buyer fields entirely. Don't manufacture a
   Champion / Decision-Maker / Economic-Buyer split that doesn't exist; the fields are for genuine
   multi-stakeholder purchases.

## Downstream-purpose map

- **Role mapping** → `As a <role>` clause; the actor in authorization scenarios; the
  user/role relationship in the ERD.
- **Jobs-to-be-done** → candidate scenarios and a cross-check that every job is covered by
  a `capability-map.md` capability.
- **Goals + pains** → capability priority and the "In order to <value>" clause.
- **Buyer role / buying trigger / reached via** (optional) → the buyer `positioning.md` writes the
  message for and the channel `marketing-copy` writes copy for. Build-branch scenarios ignore them.

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
- [ ] Optional sell-branch fields (Buyer role / Buying trigger / Reached via) appear only on personas in
      the purchase; non-login buyers are `Role: none (external)`; no objection/message text leaked in.
- [ ] No persona invented beyond the brief; no banned phrase; no `<placeholder>`.
