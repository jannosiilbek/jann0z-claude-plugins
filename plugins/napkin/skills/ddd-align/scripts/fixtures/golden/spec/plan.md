# Plan — Course Platform
<!-- ddd: plan -->
<!-- upstream-fingerprint: spec/usecases.md@sha256:ec87cc821d3737f1eb24d75f4643c059bee4a97d7bb93aa01da7bf29fd6eaf54 -->
<!-- upstream-fingerprint: spec/api.md@sha256:f6ccc5d625f0233a25afcb4acb627bb25c6526d028f813e2f537e9a043b03e4b -->
<!-- upstream-fingerprint: spec/data/model.dbml@sha256:edef257ceabb1409b72340bd1dda0e4e4f7823c0aa2db9a310a7d1caecbac9c5 -->

## Execution contract

- Gate: every edit to `spec/` re-runs the alignment gate (`ddd-align`); a failing gate blocks the change that caused it.
- Schema: `spec/data/usecases.sql` is the schema's regression test — it must pass against every migration.
- Traceability: every module cites the UC-xxx or T-xxx it implements; code with no citation is presumed dead (nfr.md §Code quality).
- Deprecation: spec items are retired with `Status: deprecated`, never deleted, so citations cannot dangle.
- Staleness: derived artifacts carry `upstream-fingerprint` lines; when the gate reports AL-16, regenerate the artifact via its owning skill.

## M1 — Foundations

### T-001 — Stand up schema and migrations
- Implements: UC-001
- Depends on: none
- Terms: Student, Course, Enrollment
- Status: todo
- Acceptance: the acceptance criteria of UC-001 pass

## M2 — Enrollment lifecycle

### T-002 — Enrollment listing API
- Implements: UC-002
- Depends on: T-001
- Status: todo
- Acceptance: the acceptance criteria of UC-002 pass

### T-003 — Drop flow
- Implements: UC-003
- Depends on: T-001
- Status: todo
- Acceptance: the acceptance criteria of UC-003 pass

## Changelog
- 2026-06-11 (ddd-plan): created
