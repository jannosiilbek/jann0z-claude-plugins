# Pipeline eval — last result (detail)

_9 cells · judge claude-opus-4-8 · 5 repeats/cell (median±σ) · skills @ 8514f3610da2_

## Haiku 4.5 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 78±1.34 (buildable-with-gaps)
- gate: DRIFT — 4 errors · clar 67±3.29 · algn 40±0 · cmpl 100±0 · test 98±1.87 · actn 90±1.52
  - gap: How an end_user is created during submission — UC-001 requires a not-null end_user_id but no flow specifies find-or-create-by-email semantics
  - gap: The per-role permission matrix for owner/admin/agent — 'appropriate permissions' is never defined, yet triage (UC-002) and release creation (UC-005) assume role gating
  - gap: Organization and member onboarding — entirely absent from flows and use cases despite 'membership and roles' being in scope

## Haiku 4.5 × 02 (Local services marketplace (greenfield)) — BRI 83±1.67 (buildable-with-gaps)
- gate: aligned · clar 73±3.29 · algn 60±0 · cmpl 100±0 · test 100±2.61 · actn 90±2.24
  - gap: Provider reputation has no home in the data model despite being an explicit policy (FL-006), a use-case step (UC-006), and a core brief value prop — agent must invent storage and computation.
  - gap: Data assertions contradict their acceptance criteria on enforcement — most starkly UC-006 (AC-2: reject rating a non-completed Booking; DA-2: insert succeeds, rowcount=1) — leaving the agent unsure whether the rule exists and whether to enforce it in DB or app code.
  - gap: Business-rule constraints the brief/ACs require are missing from the schema: stars 1–5 range (no CHECK), 'rate only completed bookings', and 'cannot accept a declined request'.

## Haiku 4.5 × 03 (Delta — add waitlists to the course platform) — BRI 90±1.14 (ship-ready)
- gate: aligned · clar 67±4.67 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 90±1.64
  - gap: Capacity enforcement: when is a course 'full', and is direct enrollment rejected at capacity? This drives the entire enroll-vs-waitlist branch yet has no acceptance criterion — despite being the brief's core problem.
  - gap: Offer expiry: the duration of expires_at is unstated, and what happens when an offer expires (re-offer to the next waitlisted student?) is undefined — the 'expired' offer status and 'offered' entry status are orphaned by every flow.
  - gap: Waitlist entry terminal status: the status enum (pending/offered/declined) has no 'accepted/fulfilled' state, so the entry's fate after UC-005 acceptance is left to the agent to guess.

## Sonnet 4.6 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 94±0.89 (ship-ready)
- gate: aligned · clar 80±3.83 · algn 100±0 · cmpl 100±0 · test 100±0.55 · actn 94±1
  - gap: Status-transition semantics: enforced lifecycle state machine vs. any-valid-status free set (brief's arrow vs. UC-008 enum-only validation)
  - gap: Owner's initial is_active state at org registration (default false vs. UC-001 making the owner the active first member)
  - gap: Cross-org and single-owner / removed-member business rules are specified in ACs but not schema-enforced nor covered by data assertions — builder must implement and self-test them

## Sonnet 4.6 × 02 (Local services marketplace (greenfield)) — BRI 94±0.89 (ship-ready)
- gate: aligned · clar 80±3.13 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 94±0.71
  - gap: How is a booking's price determined on acceptance — computed from hourly_rate × window duration, or supplied as an agreed amount? (UC-005 'agreed price' vs. hard-coded DA value)
  - gap: Authorization/ownership is entirely unmodeled: who may accept/decline (the service's provider?), complete and rate (the booking's customer?) — no AC enforces it
  - gap: Status-transition and rating-eligibility enforcement is described only in DBML Notes; the trigger/CHECK implementation that makes the 'error ~ check' assertions pass must be authored from scratch

## Sonnet 4.6 × 03 (Delta — add waitlists to the course platform) — BRI 92±2.28 (ship-ready)
- gate: aligned · clar 73±7.37 · algn 100±0 · cmpl 100±0 · test 100±0.89 · actn 92±4.77
  - gap: How a 'seat offer' is represented between drop and accept — waitlist_entries has no offered state and there is no offer entity, yet UC-005/UC-006 and FL-005/FL-006 depend on it
  - gap: Whether enrollment must be rejected when the course is at capacity — the brief's stated 'double bookings' problem implies it, but no use case enforces it
  - gap: FL-001's 'Recount course seats' policy and 'Course seats recounted' event have no use case and no place in the data model (no seat-count column or view)

## Opus 4.8 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 94±0 (ship-ready)
- gate: aligned · clar 80±0 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 95±0.55
  - gap: Authorization: hierarchical owner/admin/agent privilege model asserted in the brief but no UC, AC, or live test enforces role-based denial — the agent must invent the authz layer.
  - gap: Transport/API surface unspecified (no endpoints, payloads, REST-vs-GraphQL), so the agent picks the external interface unilaterally.
  - gap: No use case for browsing/listing/filtering the inbox (only single-item history view) — primary read/query/pagination surface left to invention.

## Opus 4.8 × 02 (Local services marketplace (greenfield)) — BRI 94±3.29 (ship-ready)
- gate: aligned · clar 80±6.5 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 93±3.03
  - gap: Rating-on-completed-only is mandated by the brief as a hard data-layer invariant but the schema never enforces booking status on rating insert — agent must add a trigger/CHECK or knowingly ship a weaker model.
  - gap: Booking lifecycle transitions are unguarded: nothing prevents requested→completed or backward moves, though UC-007 assumes 'a confirmed Booking' is what gets completed.
  - gap: No authorization model: which actor may accept/decline a booking (must it be the service's provider?) and who may complete it — UPDATEs carry no ownership check.

## Opus 4.8 × 03 (Delta — add waitlists to the course platform) — BRI 94±4.12 (ship-ready)
- gate: aligned · clar 80±11.95 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 94±6.06
  - gap: Offer expiry is completely unspecified — no expires_at/timeout column, no rule for what happens to an unaccepted offer, no re-offer to the next waiting entry.
  - gap: Capacity/'full' is narrative only: occupancy is never defined and UC-001 enroll has no capacity guard, so 'a course is full' (UC-004) is unenforceable as written.
  - gap: Flows vs. use cases contradict on causation: FL-005/FL-006 make drop->offer and accept->enroll automatic policies, but the use cases and usecases.sql implement them as independent manual registrar UPDATEs/INSERTs.
