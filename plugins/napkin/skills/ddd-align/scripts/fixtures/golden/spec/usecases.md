# Use cases — Course Platform
<!-- ddd: usecases -->

## UC-001 — Enroll student in course
- Actor: Registrar
- Trigger: Enroll student
- Status: active
- Main flow:
  1. Registrar picks a student and a course
  2. System records the enrollment with status `enrolled`
- Acceptance criteria:
  - AC-1: WHEN a student is enrolled in a course, THE SYSTEM SHALL record the enrollment with status `enrolled`.
  - AC-2: IF the student or course does not exist, THEN THE SYSTEM SHALL reject the enrollment.
- Data assertions:
  - DA-1: enrolling an existing student in an existing course inserts one row => expect: rowcount=1
  - DA-2: enrolling a non-existent student is rejected => expect: error ~ foreign key

## UC-002 — List a student's courses
- Actor: Student
- Trigger: Student enrolled
- Status: active
- Main flow:
  1. Student requests their course list
  2. System returns every course the student has an enrollment in
- Acceptance criteria:
  - AC-1: WHEN a student requests their courses, THE SYSTEM SHALL return every enrollment of that student.
- Data assertions:
  - DA-1: a student with two enrollments sees two courses => expect: rows=2

## UC-003 — Drop an enrollment
- Actor: Student
- Trigger: Drop enrollment
- Status: active
- Main flow:
  1. Student drops a course
  2. System keeps the enrollment row with status `dropped`
- Acceptance criteria:
  - AC-1: WHEN a student drops a course, THE SYSTEM SHALL set the enrollment status to `dropped` and keep the row.
- Data assertions:
  - DA-1: dropping flips the status of exactly one enrollment => expect: rowcount=1
  - DA-2: the dropped enrollment is still readable with its new status => expect: col:status=dropped

## Changelog
- 2026-06-11 (ddd-usecases): created
