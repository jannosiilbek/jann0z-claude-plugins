# Non-functional requirements — Course Platform
<!-- ddd: nfr -->

## Auth
- Public endpoints: none
- Authorization model: role-based; Registrar manages all enrollments, Student sees own

## Error contracts
- Body shape: {"code": "<SLUG>", "message": "<human-readable>"}
- Validation error: 400 VALIDATION_ERROR
- Not found: 404 NOT_FOUND
- Conflict: 409 ENROLLMENT_EXISTS
- Forbidden: 403 FORBIDDEN
- Unauthorized: 401 UNAUTHORIZED

## Performance
- List endpoints: p99 < 500ms
- Write endpoints: p99 < 200ms

## Changelog
- 2026-06-22 (ddd-brief): created
