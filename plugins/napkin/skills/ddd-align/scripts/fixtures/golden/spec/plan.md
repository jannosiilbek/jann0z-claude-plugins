# Plan — Course Platform
<!-- ddd: plan -->
<!-- upstream-fingerprint: spec/usecases.md@sha256:5c002abf5b0fbf4b56312eaa62b20b1a902d5c4f462778aa4aab91eb4c6c2d0c -->
<!-- upstream-fingerprint: spec/api.md@sha256:b564796b52f55316f45aaac37198605fd02b5668c2b7e92f5a54665728a25bb8 -->
<!-- upstream-fingerprint: spec/data/model.dbml@sha256:470a39cf8dbc6829746150e66446f06f1fa5e95ff6e1452c33a347b8dc4c7840 -->
<!-- upstream-fingerprint: spec/screens.md@sha256:73f2820431ab227aa1d21b663af787ce4caee9c0b477157687a3775e7bbff64c -->

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
- Screens: SC-001
- Acceptance: the acceptance criteria of UC-002 pass

### T-003 — Drop flow
- Implements: UC-003
- Depends on: T-001
- Status: todo
- Acceptance: the acceptance criteria of UC-003 pass

## Changelog
- 2026-06-11 (ddd-plan): created
