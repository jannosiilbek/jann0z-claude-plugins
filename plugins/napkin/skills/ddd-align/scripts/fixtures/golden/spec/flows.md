# Flows — Course Platform
<!-- ddd: flows -->

## FL-001 — Enroll in a course
- Actor: Student
- Steps:
  1. Command: Enroll student (Actor: Registrar)
  2. Event: Student enrolled
  3. Policy: Whenever Student enrolled, then Recount course seats
  4. Event: Course seats recounted

## FL-002 — Finish a course
- Actor: Registrar
- Steps:
  1. Command: Complete enrollment
  2. Event: Enrollment completed

## FL-003 — Leave a course
- Actor: Student
- Steps:
  1. Command: Drop enrollment
  2. Event: Enrollment dropped

## Changelog
- 2026-06-11 (ddd-domain): created
