---
id: "03"
title: Delta — add waitlists to the course platform
sizing: delta
seed: ../../../skills/ddd-align/scripts/fixtures/golden/spec
---
The spec in ./spec already describes a course-enrollment platform (students enroll in courses,
enrollments have a status). Make the incremental change only — treat this as an existing, aligned spec.

New requirement: add **course waitlists**. When a course is full, a student joins its waitlist
instead of enrolling. A student holds at most one waitlist entry per course. When a seat opens
(an enrollment is dropped), the earliest waitlisted student is offered the seat; on acceptance
their waitlist entry converts to an enrollment.

Make the incremental change only: size this as a delta, preserve the existing artifacts and
their IDs, add the new terms / flow / use cases / model changes / tasks for waitlists, and keep
everything aligned. Run the pipeline stages in delta mode.
