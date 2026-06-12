# EARS criteria and the assertion bridge

## EARS — the four shapes

EARS (Easy Approach to Requirements Syntax) constrains acceptance criteria to shapes
that are unambiguous and individually testable. Pick the shape that fits; don't force
one:

| Shape | Template | Use for |
|-------|----------|---------|
| Event-driven | `WHEN <trigger>, THE SYSTEM SHALL <behavior>.` | The normal case: something happens, the system responds |
| State-driven | `WHILE <state>, THE SYSTEM SHALL <behavior>.` | Behavior that holds during a condition ("WHILE a membership is lapsed, …") |
| Unwanted behavior | `IF <unwanted condition>, THEN THE SYSTEM SHALL <behavior>.` | Guards, rejections, error handling |
| Ubiquitous | `THE SYSTEM SHALL <behavior>.` | Invariants that always hold |

What makes a criterion *good* inside the shape:

- **Concrete condition** — "WHEN a student is enrolled in a full course" beats "WHEN
  there's a problem".
- **Observable behavior** — something a test could check: a recorded row, a rejection,
  a returned list. "Handle gracefully" is not observable.
- **One claim per criterion** — split "records X and notifies Y" into AC-1 and AC-2.

## The assertion bridge

Every data assertion's `=> expect:` tail uses erd-modeler's **closed assertion
grammar** — erd-modeler's `scripts/README.md` is normative; this table mirrors it:

| Assertion | Proves | Use with |
|-----------|--------|----------|
| `error` | the operation is rejected (any genuine constraint error) | writes |
| `error ~ <reason>` | rejected for a specific reason: `foreign key`, `not null`, `unique`, `check`, `enum`, or a message substring | writes (negative tests) |
| `rowcount=N` | a write affected exactly N rows | INSERT/UPDATE/DELETE |
| `rows=N` / `rows>=N` | a read returned N / at least N rows | SELECT |
| `value=<v>` | a read returned exactly one cell equal to `<v>` | aggregate SELECTs |
| `col:<name>=<v>` | a read returned one row whose column `<name>` equals `<v>` | single-row lookups |

**Do not invent operators** (`rows>2`, `count=`, `exists` do not exist). The alignment
gate rejects anything outside this table, because an assertion that the harness can't
parse is a test that will never run — the exact false-confidence this pipeline exists
to prevent.

### How a DA becomes a live test

`UC-001`'s `DA-2: enrolling a non-existent student is rejected => expect: error ~ foreign key`
becomes, in erd-modeler's stage 4:

```sql
-- usecase: UC-001/DA-2 enrolling a non-existent student is rejected
INSERT INTO enrollments (id, status, enrolled_at, student_id, course_id)
VALUES ('enr_x', 'enrolled', now(), 'stu_ghost', 'crs_1');
-- expect: error ~ foreign key
```

erd-modeler writes the SQL; you write the *claim*. A good DA description names the
scenario precisely enough that the SQL writes itself.

### Positive + negative pairing

For every UC that writes data, ask: which integrity rule protects this operation?
That rule deserves a negative DA:

- a foreign key → `error ~ foreign key`
- a uniqueness rule ("an invoice can be refunded at most once") → `error ~ unique` —
  model at-most-once as a **unique constraint** on the owning table, not as a check
  constraint or a status guard; uniqueness is what the database actually enforces
- a mandatory field → `error ~ not null`
- a closed value set → `error ~ enum` (or `error ~ check`)

A spec whose every assertion is positive proves only the happy path — and erd-modeler's
coverage floor (≥1 write, ≥1 negative) will push back anyway. Seed the negatives here,
where the domain knowledge lives.

### Read use cases

Pure read UCs (listings, lookups, reports) still get DAs: `rows=N` against a seeded
scenario, `value=` for aggregates, `col:` for lookups. If a read can't be asserted
against deterministic seed data, the use case is too vague — tighten its criteria.
