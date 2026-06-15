# Pipeline eval — last result (detail)

_Run 2026-06-15 · judge: claude-opus-4-8 · 9 cells (3 models × 3 scenarios); Fable 5 unavailable._

## Haiku 4.5 × 01 (B2B feedback inbox, full) — BRI 73 (buildable-with-gaps)
- gate: DRIFT — 4 errors · clarity 52 · alignment 40 · completeness 100 · testability 95 · actionability 89
  - gap: How an inbound feedback submission is routed to a specific organization (end_users has no org link; no submission endpoint/form/token mechanism specified).
  - gap: The role-based authorization model: owner/admin/agent are defined but no acceptance criterion enforces who may triage, create releases, or comment.
  - gap: Feedback status transition rules: UC-002 AC-4 privileges 'new' but the legal transition graph is otherwise undefined.

## Haiku 4.5 × 02 (Local services marketplace, full) — BRI 77 (buildable-with-gaps)
- gate: aligned · clarity 52 · alignment 60 · completeness 100 · testability 94 · actionability 85
  - gap: Booking lifecycle rules (accept-only-when-requested, complete-only-when-confirmed, rate-only-when-completed) are stated in ACs but enforced nowhere in the model; the agent must invent CHECK constraints, triggers, or app guards — and the live tests are inconsistent about whether these are DB errors or WHERE-clause no-ops.
  - gap: UC-006/DA-2 contradicts its own AC-2: the AC says rating a non-completed booking SHALL be rejected, but the live test inserts that rating and expects success (rowcount=1). The agent gets opposite signals from the same use case.
  - gap: stars 1-5 range has no CHECK constraint and no validation home despite being stated in glossary and UC-006.

## Haiku 4.5 × 03 (Course waitlists, delta) — BRI 83 (buildable-with-gaps)
- gate: aligned · clarity 40 · alignment 100 · completeness 100 · testability 100 · actionability 88
  - gap: Capacity enforcement and the enroll-vs-waitlist routing rule are never specified — the agent must guess how 'full' is detected and whether UC-001 rejects when at capacity.
  - gap: Offer lifecycle timing: expires_at has no concrete duration and the 'expired' status has no handling/re-offer policy.
  - gap: Re-enrollment contradiction: dropped enrollment rows are kept but unique(student_id,course_id) blocks re-enroll via waitlist; usecases.md ('error ~ check') and usecases.sql ('error ~ unique') disagree on UC-005/DA-3.

## Sonnet 4.6 × 01 (B2B feedback inbox, full) — BRI 90 (ship-ready)
- gate: aligned · clarity 64 · alignment 100 · completeness 100 · testability 100 · actionability 95
  - gap: Status-transition legality is undefined: ordered 'new→triaged→planned→shipped→declined' workflow in the brief vs. enum-only validation in UC-008 — agent must guess whether to enforce transition guards.
  - gap: Owner-uniqueness ('exactly one owner per org') is asserted in the glossary but enforced nowhere; UC-004 lets admins freely set the owner role.
  - gap: Invitee vs. removed member states both collapse to is_active=false with no distinct 'pending'/'invited' field, so UC-002's pending entry and UC-005's soft-delete are indistinguishable.

## Sonnet 4.6 × 02 (Local services marketplace, full) — BRI 93 (ship-ready)
- gate: aligned · clarity 76 · alignment 100 · completeness 100 · testability 100 · actionability 94
  - gap: Pricing rule on acceptance is unspecified — UC-005 'sets the agreed price' and the test hardcodes a value; the agent must guess hourly_rate x hours vs. provider-entered.
  - gap: Authorization/ownership is undefined — nothing ties the accepting/declining Provider to the service, the completing Customer to the booking, or the rating's Customer to the booking; the agent must invent who-may-act rules.
  - gap: Status-transition and rating-eligibility rules are labeled 'error ~ check' but require triggers (a plain CHECK cannot see the prior status); resolved only because model.dbml Notes explicitly say triggers enforce them.

## Sonnet 4.6 × 03 (Course waitlists, delta) — BRI 82 (buildable-with-gaps)
- gate: aligned · clarity 40 · alignment 100 · completeness 100 · testability 100 · actionability 81
  - gap: Seat-offer lifecycle is undefined: waitlist_entries has no offered/expires_at state, and UC-005 explicitly leaves 'mark as offered OR create offered-seat record' unresolved
  - gap: Offer expiry is promised in scope but has zero specification (no timeout, state, or AC)
  - gap: 'Course is full' / capacity enforcement is a brief assumption with no UC, AC, or DB constraint — nothing blocks enrolling past capacity or requires fullness before waitlisting

## Opus 4.8 × 01 (B2B feedback inbox, full) — BRI 93 (ship-ready)
- gate: aligned · clarity 76 · alignment 100 · completeness 100 · testability 100 · actionability 95
  - gap: Authorization: hierarchical owner/admin/agent privilege model asserted in the brief but no UC, AC, or live test enforces role-based denial — the agent must invent the authz layer.
  - gap: Transport/API surface unspecified (no endpoints, payloads, REST-vs-GraphQL), so the agent picks the external interface unilaterally.
  - gap: No use case for browsing/listing/filtering the inbox (only single-item history view) — primary read/query/pagination surface left to invention.

## Opus 4.8 × 02 (Local services marketplace, full) — BRI 93 (ship-ready)
- gate: aligned · clarity 76 · alignment 100 · completeness 100 · testability 100 · actionability 95
  - gap: Booking lifecycle transition guards live only at the application layer and are never specified -- legal status moves (requested->confirmed/declined, confirmed->completed) and the rate-only-completed-bookings rule must be invented; the schema enforces uniqueness/CHECK/FK but not transition legality.
  - gap: Price-at-acceptance rule is left open: A5/UC-005 say it is 'derivable from hourly_rate x window' but 'stored as an explicit amount', so the agent must choose compute-vs-free-entry.
  - gap: No transport/auth/API surface is specified -- fine for the stated data-of-record scope, but a full app build would invent it.

## Opus 4.8 × 03 (Course waitlists, delta) — BRI 79 (buildable-with-gaps)
- gate: aligned · clarity 28 · alignment 100 · completeness 100 · testability 100 · actionability 81
  - gap: Offer expiry is completely unspecified — no expires_at/timeout column, no rule for what happens to an unaccepted offer, no re-offer to the next waiting entry.
  - gap: Capacity/'full' is narrative only: occupancy is never defined and UC-001 enroll has no capacity guard, so 'a course is full' (UC-004) is unenforceable as written.
  - gap: Flows vs. use cases contradict on causation: FL-005/FL-006 make drop->offer and accept->enroll automatic policies, but the use cases and usecases.sql implement them as independent manual registrar UPDATEs/INSERTs.
