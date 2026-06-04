<!-- fingerprints:
01-event-storming.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff
02-glossary.md@sha256:7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a49586776655443322110099a8b7c
-->

## Upstream Fingerprints

- 01-event-storming.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff
- 02-glossary.md@sha256:7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a49586776655443322110099a8b7c

## Aggregates

### Order

**Root:** Order · identity: OrderId (globally unique)

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Order | entity | Order |
| OrderId | value object | OrderId |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Order-1 | An order in status paid may not be returned to status placed. | within-boundary |
| INV-Order-2 | An order in status expired holds no payment. | within-boundary |

**References (by identity only):**

| Target aggregate | Identity field held | Reason |
|------------------|---------------------|--------|
| Ticket | TicketId | An order points at the seats it acquires by identity only. |

### Ticket

**Root:** Ticket · identity: TicketId (globally unique)

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Ticket | entity | Ticket |
| SeatNumber | value object | SeatNumber |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Ticket-1 | A ticket in status sold may not transition to status released. | within-boundary |

**References (by identity only):**

none

## Cross-Aggregate Policies

| Policy | Source event | Target aggregate | Mode | Justification |
|--------|--------------|------------------|------|---------------|
| POL-1 | Order Paid | Ticket | sync | Selling the allocation happens outside the paying user's transaction. |
| POL-2 | Order Placed | Order | transactional | Placing the order and reserving its own slot is the acting user's single atomic act. |
