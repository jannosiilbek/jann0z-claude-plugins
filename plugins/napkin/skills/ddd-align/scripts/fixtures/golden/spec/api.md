# API — Course Platform
<!-- ddd: api -->

## API-UC-001 — Enroll student in course
- Interface: REST
- Method: POST
- Path: /enrollments
- Auth: required (role: Registrar)
- Request body:
    - student_id: TypeID<students> required
    - course_id: TypeID<courses> required
- Response 201:
    - id: TypeID<enrollments>
    - status: enrollment_status
    - enrolled_at: timestamp
- Response 400: VALIDATION_ERROR — missing or invalid field
- Response 409: ENROLLMENT_EXISTS — student already enrolled in this course
- Pagination: n/a

## API-UC-002 — List a student's courses
- Interface: REST
- Method: GET
- Path: /students/{student_id}/courses
- Auth: required (role: Student | Registrar)
- Response 200 (array):
    - id: TypeID<courses>
    - title: text
    - status: enrollment_status
- Pagination: cursor-based (cursor, limit)

## API-UC-003 — Drop an enrollment
- Interface: REST
- Method: PATCH
- Path: /enrollments/{enrollment_id}/drop
- Auth: required (role: Student)
- Response 200:
    - id: TypeID<enrollments>
    - status: enrollment_status
- Response 404: NOT_FOUND — enrollment not found
- Response 403: FORBIDDEN — caller is not the enrolled student
- Pagination: n/a

## Changelog
- 2026-06-22 (ddd-api): created
