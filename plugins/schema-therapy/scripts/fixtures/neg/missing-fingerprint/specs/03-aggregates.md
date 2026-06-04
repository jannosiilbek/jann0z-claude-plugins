
## Aggregates

### Order

**Root:** Order · identity: OrderId

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Order | entity | Order |
| OrderId | value object | — |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Order-1 | An Order in status paid may not return to status placed or status cancelled. | within-boundary |

**References (by identity only):**

| Target aggregate | Identity field held | Reason |
|------------------|---------------------|--------|
| Customer | CustomerId | An order is owned by one customer, held by identity only. |

### Customer

**Root:** Customer · identity: CustomerId

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Customer | entity | Customer |
| CustomerId | value object | — |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Customer-1 | A registered Customer holds a unique CustomerId. | within-boundary |

**References (by identity only):**

none

## Cross-Aggregate Policies

| Policy | Source event | Target aggregate | Mode | Justification |
|--------|--------------|------------------|------|---------------|
| POL-1 | Order Paid | Customer | eventual | Crediting the customer happens outside the paying transaction. |
