<!-- fingerprints:
order-fulfillment.md@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4
-->

## Upstream Fingerprint

Derived from domain description `order-fulfillment.md`@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4 (captured 2026-06-04).

## Domain Events

| Event | Actor | Trigger | Notes |
|-------|-------|---------|-------|
| Order Placed | Customer | Place Order command | pivotal |
| Order Shipped | Warehouse Clerk | Order Placed | |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places an order |
| Warehouse Clerk | role | Ships the order |

## Hotspots

| Hotspot | Question | Blocks |
|---------|----------|--------|
| Refund authority | Who approves refunds over $500? | Refund Issued |

## Lifecycle Skeletons

Note: this pipeline fixes the term **aggregate**; in current EventStorming the sticky is the **Constraint** (legacy "Aggregate").

### Order

1. Order Placed
2. Order Shipped
