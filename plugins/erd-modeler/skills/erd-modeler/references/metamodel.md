# ERD metamodel + DBML cheat-sheet

## The six concepts

An entity-relationship model has a small, stable vocabulary. Everything else is
decoration on top of these six concepts.

1. **Entity** — a thing you store rows about. Becomes a `Table`.
2. **Attribute** — a typed field on an entity. Becomes a column.
3. **Key** — identity and reference:
   - **Primary key (PK)** — the unique, stable, non-null identifier of an entity.
   - **Foreign key (FK)** — a column that references another entity's PK.
4. **Relationship** — a link between two entities.
5. **Cardinality** — how many on each end: **1:1**, **1:N**, **N:M**.
6. **Optionality / participation** — whether each end is mandatory or optional:
   `0..1` (optional, at most one), `1` (exactly one), `0..*` (optional, many),
   `1..*` (mandatory, many).

**Type notes:** use `timestamptz` for timestamps (the DDL conversion maps `timestamp`
→ `timestamptz`); use `numeric(p,s)` (e.g. `numeric(12,2)`) for money/amounts — **never**
`float`/`double`, which corrupt the aggregates the live-test checks.

A relationship is fully described by its cardinality **and** the participation of each
end. "An order must belong to exactly one customer; a customer may have zero or more
orders" = a 1:N where the order side is mandatory (`1`) and the customer side is
optional-many (`0..*`).

## DBML cheat-sheet

### Table and columns

```dbml
Table orders {
  id          int       [pk]                    // surrogate primary key
  order_no    varchar   [unique, not null]      // natural unique attribute
  status      order_status [not null, default: 'pending']
  customer_id int       [not null, ref: > customers.id]  // FK, many-to-one
  created_at  timestamp [not null, default: `now()`]

  indexes {
    customer_id
  }

  Note: 'A single customer order.'
}
```

### Column attributes

| Attribute | Meaning |
|---|---|
| `[pk]` | primary key |
| `[unique]` | unique constraint |
| `not null` | mandatory (NOT NULL) |
| `[ref: > t.c]` | foreign key reference (this column is the many side) |
| `[default: ...]` | default value (`` `now()` `` for expressions) |
| `[note: '...']` | inline documentation |
| `[increment]` | auto-increment |

### Relationship operators

In `[ref: ...]` or a standalone `Ref`, the operator encodes cardinality:

| Operator | Meaning |
|---|---|
| `>` | many-to-one (put on the FK / many side) |
| `<` | one-to-many |
| `-` | one-to-one — **must** add `[unique]` to the FK column (a plain FK only enforces 1:N) |
| `<>` | many-to-many — **do not use**; resolve to a bridge table instead |

**1:1:** put the FK on the optional/dependent side and mark it `[unique, ref: > parent.id]`.
A mandatory-on-both-sides 1:1 is better modeled as a single table.

Standalone refs (equivalent to inline `[ref]`):

```dbml
Ref: orders.customer_id > customers.id
```

### ON DELETE policy (recorded as a comment)

DBML has **no** native ON DELETE syntax, but the model still needs to carry the policy
(the live-test proves it). Record it as a trailing `//` comment on the FK column:

```dbml
order_id   int [not null, ref: > orders.id]    // ON DELETE CASCADE  (owned child)
manager_id int [ref: > employees.id]           // ON DELETE SET NULL (optional)
customer_id int [not null, ref: > customers.id] // ON DELETE RESTRICT (blocking ref)
```

The DDL conversion (live-testing.md §1) turns each comment into the matching
`REFERENCES … ON DELETE …` clause.

### Enums

Use an `Enum` instead of free-text or boolean-soup status columns:

```dbml
Enum order_status {
  pending
  paid
  shipped
  cancelled
}
```

## Worked example: resolving a many-to-many

Conceptually, students enroll in many courses and a course has many students — a N:M
relationship. This is **never** modeled directly. Resolve it with a bridge table whose
PK is the composite of the two FKs (or a surrogate `id` plus a unique composite), each
FK `not null`:

```dbml
Table students {
  id    int     [pk]
  email varchar [unique, not null]
}

Table courses {
  id    int     [pk]
  title varchar [not null]
}

Table enrollments {
  student_id  int       [not null, ref: > students.id]
  course_id   int       [not null, ref: > courses.id]
  enrolled_at timestamp [not null, default: `now()`]

  indexes {
    (student_id, course_id) [pk]   // composite primary key
  }
}
```

The bridge table is named for the relationship (`enrollments`), not `students_courses`,
and can carry its own attributes (`enrolled_at`) — which is exactly why a direct N:M
can never be future-proof.
