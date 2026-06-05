<!-- fingerprints:
order-fulfillment.md@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4
-->

## Upstream Fingerprint

Derived from impact map `00-impact-map.md`@sha256:00aa11bb22cc33dd and domain description `order-fulfillment.md`@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4 (captured 2026-06-04).

## Domain Events

| Event | Actor | Trigger | Notes | Deliverable |
|-------|-------|---------|-------|-------------|
| Order Placed | Customer | Place Order command | pivotal | Order Tracking |
| Order Shipped | Warehouse | Order Placed | | Dispatch Scheduling |
| Invoice Issued | Billing System | Order Placed | | Invoice Generation |
| Invoice Settled | Billing System | Invoice Issued | | — |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places an order |
| Warehouse Clerk | role | Ships the order |
| Billing System | system | Issues and settles invoices |

## Hotspots

| Hotspot | Question | Blocks |
|---------|----------|--------|
| None identified | - | - |

## Lifecycle Skeletons

Note: this pipeline fixes the term **aggregate**; in current EventStorming the sticky is the **Constraint** (legacy "Aggregate").

### Order

1. Order Placed
2. Order Shipped

### Invoice

1. Invoice Issued
2. Invoice Settled
