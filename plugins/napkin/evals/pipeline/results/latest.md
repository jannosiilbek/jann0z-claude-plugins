# Pipeline eval — last result (detail)

_9 cells · judge null · n=1–5 per cell (replicated cells show median±σ) · skills @ 5903e36dca28_

## Haiku 4.5 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 93±1.22 (ship-ready)
- gate: aligned · clar 76.5±7.59 · algn 95±10.37 · cmpl 100±0 · test 100±0 · actn 92±4.15

## Haiku 4.5 × 02 (Local services marketplace (greenfield)) — BRI 94±3.49 (ship-ready)
- gate: DRIFT — 1 errors · clar 80±6.56 · algn 100±8.94 · cmpl 100±0 · test 100±0 · actn 93±5.45

## Haiku 4.5 × 03 (Delta — add waitlists to the course platform) — BRI 92±1.41 (ship-ready)
- gate: aligned · clar 73±4.6 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 91±0.84
  - gap: waitlist_entries has no ordering column (created_at/position/sequence) — 'offer seat to earliest waitlisted student' (UC-007 AC-1) cannot be implemented deterministically as specified
  - gap: 'Available seats' / capacity enforcement rule is undefined — which enrollment statuses (enrolled only? +completed?) count against courses.capacity, so UC-005's enroll-vs-waitlist routing must be guessed
  - gap: Waitlist-to-enrollment conversion is unspecified — on accept (UC-006), does the waitlist row become `accepted`, get linked to the enrollment, or get removed; and `declined` is never used by any flow

## Sonnet 4.6 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 92±0.58 (ship-ready)
- gate: aligned · clar 73±0 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 94±2.08
  - gap: RBAC enforcement: roles owner/admin/agent are defined but never mapped to permitted actions in any use case — the agent must invent the permission matrix the brief says is enforced at the app layer.
  - gap: Submission-token authentication: no token secret/hash is stored and the token→organization resolution path (UC-007) is asserted but neither modeled in the schema nor live-tested, so the actual auth mechanic must be invented.
  - gap: End User creation/identification: no use case covers upserting an End User by email on submission; UC-007 presumes the end_user_id already exists.

## Sonnet 4.6 × 02 (Local services marketplace (greenfield)) — BRI 92±1.53 (ship-ready)
- gate: aligned · clar 73±6.51 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 93±1.73
  - gap: Price calculation is unbuildable as specified: UC-005 multiplies hourly_rate by 'estimated duration', but no duration or time-window-end field exists on bookings or services — the agent must invent where duration comes from.
  - gap: Booking status transitions are unconstrained — the agent must guess and build the legal state machine (pending→accepted/declined, accepted→completed/cancelled); the model only enforces enum membership, not order.
  - gap: No authorization model — ownership rules ('only the Customer on the booking', 'only the Provider') and the email/password+session auth the brief assumes have no UC, task, or schema home.

## Sonnet 4.6 × 03 (Delta — add waitlists to the course platform) — BRI 96±3.06 (ship-ready)
- gate: aligned · clar 84.5±6.36 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 93±5.13
  - gap: Capacity is never enforced anywhere: no UC/AC blocks over-enrollment and UC-006 records a waitlist entry without checking the course is actually at capacity — the agent must invent the system's core invariant.
  - gap: WaitlistEntry removal/clearing on acceptance is unspecified: UC-007 asserts only the new enrollment row, never references or deletes the 'offered' entry, so the agent must guess how accept finds and clears the offer.
  - gap: FL-001's 'Recount course seats' policy has no use case or data model home, leaving a flow step the builder cannot act on.

## Opus 4.8 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 94 (ship-ready)
- gate: aligned · clar 80 · algn 100 · cmpl 100 · test 100 · actn 95
  - gap: Role-based authorization is narrated but never specified or tested — the agent must invent who-can-do-what (e.g. agent vs admin vs owner) and where it's enforced.
  - gap: Status-transition rules for feedback_status and release_status are unconstrained beyond enum membership; whether out-of-order transitions (shipped→new, planned→shipped skipping shipping) are legal is left to the builder.
  - gap: The feedback intake mechanism (widget/intake API/email-to-inbox) and member authentication are scoped out, so the submission/ingress surface and login flow are undefined despite being prerequisites for a working product.

## Opus 4.8 × 02 (Local services marketplace (greenfield)) — BRI 96±1.53 (ship-ready)
- gate: aligned · clar 89±5.2 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 95±1
  - gap: Authorization: nothing ties a lifecycle transition to a specific identity — any caller could confirm/decline/complete/rate a booking they don't own; the spec enforces state but not actor identity.
  - gap: Authentication model is absent (users have email/full_name but no credentials), so 'register' and 'act as Customer/Provider' have no login/session story.
  - gap: Price origin for a confirmed booking is undefined — derived from hourly_rate × duration or entered by the provider?

## Opus 4.8 × 03 (Delta — add waitlists to the course platform) — BRI 94±4.16 (ship-ready)
- gate: aligned · clar 76.5±4.95 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 90±5.77
  - gap: Capacity enforcement: no use case or acceptance criterion checks that an enrollment respects course capacity, despite a capacity column and the brief explicitly citing 'double bookings' as the problem to solve — the agent would have to invent this logic or stop to ask.
  - gap: Complete-enrollment behavior: FL-002 and the 'completed' enum value are in scope but unspecified — no UC, AC, task, or assertion, so the built system could never mark an enrollment complete.
  - gap: Duplicate-enrollment rejection: the unique (student_id, course_id) constraint exists in the model but is untested and unspecified in any acceptance criterion.
