# Brief — Course Platform
<!-- ddd: brief -->

## Problem statement
A small training company runs evening courses and tracks enrollments in a spreadsheet.
Double bookings and stale completion records are common. They need a minimal system of
record for students, courses, and enrollments.

## Actors
- **Student** — takes courses, views their own enrollments
- **Registrar** — manages courses and enrollments on behalf of the company

## Scope

### In scope
- Course catalog with capacity
- Enrollment lifecycle (enroll, complete, drop)
- Per-student course listing

### Out of scope
- Payments and invoicing
- Waitlists
- Instructor scheduling

## Constraints
- Single-tenant, single region
- Postgres-compatible storage

## Non-functional notes
- Tens of thousands of rows; no special performance work needed

## Pipeline sizing
- Decision: full
- Stages: ddd-domain: yes · ddd-usecases: yes · ddd-api: yes · erd-modeler: yes · ddd-plan: yes
- Rationale: greenfield system of record; full pipeline warranted

## Clarifications log

| # | Date | Question | Answer |
|---|------|----------|--------|
| 1 | 2026-06-11 | Should dropped enrollments be kept for history? | Yes, keep with status `dropped` |

## Changelog
- 2026-06-11 (ddd-brief): created
