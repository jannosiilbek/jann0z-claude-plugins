# Glossary — Course Platform
<!-- ddd: glossary -->

## Terms

### Student
- Definition: A person who enrolls in and takes courses.
- Maps to: ERD: students
- Forbidden synonyms: Learner, Pupil

### Course
- Definition: A scheduled offering with a title and a maximum capacity.
- Maps to: ERD: courses

### Enrollment
- Definition: The fact that a specific Student is taking a specific Course, with a lifecycle status.
- Maps to: ERD: enrollments

### Registrar
- Definition: Staff member who manages the catalog and enrollments; owns no rows of their own.

## Enumerations

| Enumeration | Values | Used by |
|-------------|--------|---------|
| enrollment_status | enrolled, completed, dropped | Enrollment |

## Changelog
- 2026-06-11 (ddd-domain): created
