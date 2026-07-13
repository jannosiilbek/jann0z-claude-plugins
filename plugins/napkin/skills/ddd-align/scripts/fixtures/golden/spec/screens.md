# Screens — Course Platform
<!-- ddd: screens -->
<!-- upstream-fingerprint: spec/usecases.md@sha256:5c002abf5b0fbf4b56312eaa62b20b1a902d5c4f462778aa4aab91eb4c6c2d0c -->

## SC-001 — My courses
- Route: /me/courses
- Actor: Student
- Serves: UC-002
- States: loading, empty, error, ready
- Navigation: from entry; to SC-002
- Status: active

## SC-002 — Course enrollment detail
- Route: /me/courses/:enrollment_id
- Actor: Student
- Serves: UC-003
- States: loading, error, ready
- Navigation: from SC-001
- Status: active

## SC-003 — Enrollment management
- Route: /enrollments
- Actor: Registrar
- Serves: UC-001
- States: loading, empty, error, ready
- Navigation: from entry
- Status: active

## Changelog
- 2026-07-13 (ddd-screens): created
