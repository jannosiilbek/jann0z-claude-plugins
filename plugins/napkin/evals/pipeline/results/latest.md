# Pipeline eval — last result (detail)

_9 cells · judge claude-opus-4-8 · n=3–5 per cell (replicated cells show median±σ) · skills @ a4f6a326b50d_

## Haiku 4.5 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 90±3.11 (ship-ready)
- gate: DRIFT — 2 errors · clar 73±2.68 · algn 90±12.45 · cmpl 100±0 · test 100±2.24 · actn 90±1.87
  - gap: Role-based authorization matrix: roles (owner/admin/agent) and 'by Agent/Admin' triggers are named, but no UC/AC specifies the permission rules the agent must enforce.
  - gap: Status-transition state machine: legal transitions and the 'immutable once shipped/declined' rule are asserted in ACs but neither modeled (no CHECK/trigger) nor specified as a transition table — the agent must invent enforcement.
  - gap: Org-scoped FK validation: ACs require member/release to belong to the same organization, but the model only enforces global existence, so cross-tenant assignment/attachment would silently succeed.

## Haiku 4.5 × 02 (Local services marketplace (greenfield)) — BRI 88±11.52 (ship-ready)
- gate: DRIFT — 13 errors · clar 80±3.83 · algn 80±38.99 · cmpl 100±22.36 · test 100±1.34 · actn 92±1.34
  - gap: Status-transition enforcement: DAs expect a 'check' error and the plan promises a state machine, but model.dbml has no CHECK/trigger defining valid or terminal (shipped/declined) transitions — agent must invent it.
  - gap: Auto status-history creation mechanism (DB trigger vs application code) is asserted as a policy but never specified.
  - gap: End-user feedback ingestion: no public submission endpoint/contract and no spec for how the embedded form identifies and authorizes the target organization.

## Haiku 4.5 × 03 (Delta — add waitlists to the course platform) — BRI 90±14.6 (ship-ready)
- gate: DRIFT — 6 errors · clar 73±5.32 · algn 100±42.43 · cmpl 100±24.17 · test 100±0 · actn 87±6.5
  - gap: How a course is determined to be 'full' and how over-enrollment is prevented — the trigger for the entire waitlist feature, but no UC, constraint, or seat-count is specified (UC-001 enrolls with no capacity check).
  - gap: Notifications referenced in FL-005/FL-006 ('Student notified of offer') — never specified as a UC or integration, nor placed out of scope.
  - gap: Whether waitlist ordering is authoritative on queue_position or created_at — both exist and UC-005 references queue position while indexes/seed lean on created_at.

## Sonnet 4.6 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 92±2.7 (ship-ready)
- gate: aligned · clar 73±3.13 · algn 100±10.84 · cmpl 100±0 · test 100±0 · actn 94±2
  - gap: Role/authorization enforcement: distinct Owner/Admin/Agent powers are specified in prose but no UC, data assertion, or task operationalizes them — the agent must invent the entire authz layer.
  - gap: Same-org integrity between feedback_items and its assignee/release/end_user references is not enforced (FKs point to global PKs), contradicting the stated no-cross-org-leakage NFR.
  - gap: Status lifecycle is described as ordered but UC-008 permits any enum-to-any-enum transition; the agent must decide whether to constrain it.

## Sonnet 4.6 × 02 (Local services marketplace (greenfield)) — BRI 94±0.89 (ship-ready)
- gate: aligned · clar 80±4.02 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 93±1.87
  - gap: Authentication & password storage — UC-001 collects a password but the schema models no credentials and no auth flow exists
  - gap: Booking state-machine guards — legal transitions are unenforced, and 'rate only a completed booking' is prose-only (schema enforces just one-rating-per-booking)
  - gap: Authorization/ownership rules — only-the-targeted-provider-accepts and only-the-customer-rates are implied by actor labels but never made checkable

## Sonnet 4.6 × 03 (Delta — add waitlists to the course platform) — BRI 94±2.61 (ship-ready)
- gate: aligned · clar 80±4.5 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 92±3.97
  - gap: Define 'enrolled-count' in the courses capacity trigger — it must count only status='enrolled' (excluding dropped/waitlisted), otherwise a freed seat is never seen and UC-007 accept-enrollment is blocked by the capacity check.
  - gap: Specify where the seat-offer policy lives (DB trigger vs. application service): FL-003/FL-006 and UC-006/UC-008-AC-2 describe 'offer the earliest waiting entry on drop/decline' but the data model only encodes the offered status, not what fires the transition.
  - gap: Clarify or drop FL-001's 'Recount course seats' policy/event — it has no use case, data assertion, or distinct effect, so a builder must guess whether it's a no-op or a real responsibility.

## Opus 4.8 × 01 (B2B feedback inbox (greenfield SaaS)) — BRI 94±0 (ship-ready)
- gate: aligned · clar 80±0 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 95±0.89
  - gap: The role permission matrix: which role may perform each action and how an unauthorized action is rejected — promised in the brief ('pinned in ddd-usecases') but never turned into testable acceptance criteria.
  - gap: Cross-tenant write enforcement: ACs assert 'same organization' for assignee/release links, but neither composite FKs nor any live test enforce it — the agent must invent org-scoping guards on every write.
  - gap: Append-only enforcement mechanism for status_changes (DB-level trigger/revoke vs. application convention) — the requirement is first-class but its enforcement point is unstated.

## Opus 4.8 × 02 (Local services marketplace (greenfield)) — BRI 94±3.46 (ship-ready)
- gate: aligned · clar 80±0 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 95±2.89
  - gap: How a booking's price is set at acceptance — provider-entered or computed from hourly_rate x (ends_at - starts_at)? UC-003 only says 'agreed price', leaving the agent to guess the pricing rule.
  - gap: The entire application/API layer is unspecified (endpoints, payloads, framework) and auth + per-account data isolation are deferred — the agent must invent the enforcement mechanism behind the UC-009/010 isolation tests.
  - gap: TypeID generation (prefix scheme is documented, but the library/mechanism to mint acct_/svc_/book_/rating_ ids is not pinned).

## Opus 4.8 × 03 (Delta — add waitlists to the course platform) — BRI 92±1.1 (ship-ready)
- gate: aligned · clar 73±3.13 · algn 100±0 · cmpl 100±0 · test 100±0 · actn 90±1.95
  - gap: Capacity / over-enrollment is modeled (courses.capacity) but no use case, AC, or data assertion enforces it — the brief's stated reason for the system (double bookings) is left unspecified.
  - gap: The `completed` status and FL-002 (Complete enrollment) have no use case and no plan task; the builder must invent the completion flow end-to-end.
  - gap: FL-001's 'Recount course seats' policy has no use case or task — unclear if seat counts are derived, cached, or ignored.
