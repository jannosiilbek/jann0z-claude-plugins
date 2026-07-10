# Flows — Course Platform
<!-- ddd: flows -->

## FL-001 — Enroll in a course
- Actor: Student
- Read paths: student's course list
- Steps:
  1. Command: Enroll student (Actor: Registrar)
  2. Event: Student enrolled
  3. Policy: Whenever Student enrolled, then Send welcome email

## FL-002 — Leave a course
- Actor: Student
- Steps:
  1. Command: Drop enrollment
  2. Event: Enrollment dropped

## Changelog
- 2026-07-09 (ddd-domain): created
