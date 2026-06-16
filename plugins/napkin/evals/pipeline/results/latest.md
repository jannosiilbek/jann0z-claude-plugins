# Pipeline eval — last result (detail)

_9 cells · judge claude-opus-4-8 · n=4–5 per cell (replicated cells show median±σ) · skills @ 8514f3610da2_

## Haiku 4.5 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 89.5±0.96 (ship-ready)
- gate: aligned · clar 67±2.5 · algn 100±0 · cmpl 100±0 · test 99±2.83 · actn 87±2.52
  - gap: Feedback type (bug/idea/question) and the feedback description have nowhere to live in the data model, yet UC-001 requires recording both.
  - gap: status_history records no actor — contradicts the glossary definition and UC-003 AC-2 ('record who changed it').
  - gap: members have no email or name, so UC-008 (invite by email) and AC-3 (reject duplicate email) are unimplementable as written.

## Haiku 4.5 × 02 (Local services marketplace (greenfield)) — BRI 88±17.84 (ship-ready)
- gate: DRIFT — 13 errors · clar 62±4.87 · algn 95±53.9 · cmpl 100±33.35 · test 97±2.12 · actn 90±1.22
  - gap: Location/service-area matching is the core premise but unmodeled — providers have no zones, service_area is unused free text, and UC-001/003 location filtering cannot be built or tested
  - gap: payments.amount is required with no derivation rule (hourly_rate × estimated_duration_hours is implied but never stated)
  - gap: Refund contradiction: brief puts refunds out of scope, but UC-012 AC-2 / FL-006 mandate refund initiation, and payment_status has no 'refunded' value

## Haiku 4.5 × 03 (Delta — add waitlists to the course platform) — BRI 92±1.34 (ship-ready)
- gate: aligned · clar 73±3.83 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 91±2.19
  - gap: Seat-tracking mechanism: nothing links an enrollment INSERT to courses.available_seats, yet UC-005/DA-2 expects a CHECK violation when a course is full — the decrement-on-enroll trigger (or app logic) is entirely unspecified, so the live test cannot pass as written.
  - gap: Seat lifecycle on drop/complete: UC-005 recounts only on enroll while dropped rows are kept — the agent must guess whether dropping or completing frees a seat back.
  - gap: Interface and access control: T-002 assumes an API with no contract, and Student-facing UC-002 ('view their own enrollments') has no student identity/authentication model to scope ownership.

## Sonnet 4.6 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 91±1.3 (ship-ready)
- gate: aligned · clar 73±4.6 · algn 100±8.22 · cmpl 100±0 · test 100±0.89 · actn 92±1.3
  - gap: No organization-creation / first-Owner bootstrap path — the tenant boundary and Owner role are defined but never instantiated by any use case, flow, or task.
  - gap: Feedback submission needs a not-null end_user_id but the spec never states how the end_user is resolved from the submitted email (find-or-create vs reject).
  - gap: No read/list use cases for the Inbox itself (listing/filtering feedback, viewing status history, listing comments/releases) even though the Inbox is the product's core concept.

## Sonnet 4.6 × 02 (Local services marketplace (greenfield)) — BRI 92±1.34 (ship-ready)
- gate: aligned · clar 73±5.5 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 93±1.14
  - gap: No interface/transport layer specified — the agent must choose how the use cases are exposed (REST/GraphQL/RPC).
  - gap: Authorization & ownership enforcement is assumed by the use-case narratives but unspecified and out of scope — who may accept/decline/complete/rate is undecided.
  - gap: payment_status progression is ambiguous: ordered (pending→paid→refunded) per the brief vs. free enum per the model/use cases (no transition guard).

## Sonnet 4.6 × 03 (Delta — add waitlists to the course platform) — BRI 92±1.79 (ship-ready)
- gate: aligned · clar 73±2.68 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 92±6.54
  - gap: Capacity is modeled (courses.capacity) but never enforced — no UC/AC/DA rejects enrolling into a full course, leaving the brief's core anti-double-booking goal unimplemented.
  - gap: Accepting a waitlist offer is said to 'convert to enrollment' (FL-005/UC-007), but no acceptance criterion or data assertion creates the enrollment row; its interaction with unique(student_id,course_id) and prior dropped enrollments is undefined.
  - gap: Offer-next-seat automation is ambiguous: UC-006 lists Actor=Registrar but Trigger=Enrollment dropped — automatic policy or manual action?

## Opus 4.8 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 92±0.89 (ship-ready)
- gate: aligned · clar 73±3.13 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 94±1.14
  - gap: Authentication: members sign in but there is no credential model or sign-in flow — the agent must choose one to ship.
  - gap: Cross-org integrity for assignment and release-linking is claimed 'structurally impossible' but the FKs don't constrain organization and no assertion tests a cross-tenant link — it's actually unspecified app-layer logic.
  - gap: Status-transition validity graph is undefined (which lifecycle transitions are legal; whether 'declined' is reachable from any state).

## Opus 4.8 × 02 (Local services marketplace (greenfield)) — BRI 92±3.46 (ship-ready)
- gate: aligned · clar 76.5±4.04 · algn 100±4.47 · cmpl 100±0 · test 100±0 · actn 94±3.13

## Opus 4.8 × 03 (Delta — add waitlists to the course platform) — BRI 94±0 (ship-ready)
- gate: aligned · clar 80±0 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 93±1.3
  - gap: No capacity enforcement: nothing defines how a course is 'full' or makes enrollment reject/route to the waitlist when at capacity — yet the entire waitlist feature is premised on full courses.
  - gap: FL-001's 'Recount course seats' policy and 'Course seats recounted' event have no use case, table column, task, or data assertion — the agent must invent what they compute and where the result lives.
  - gap: The unique (student_id, course_id) index on enrollments conflicts with keeping dropped rows: re-enrolling or accepting a waitlist offer after a prior dropped enrollment in the same course would violate it — needs a partial-index decision.
