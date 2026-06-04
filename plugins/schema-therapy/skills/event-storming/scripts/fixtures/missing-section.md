<!-- fingerprints:
order-fulfillment.md@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4
-->

## Upstream Fingerprint

Derived from domain description `order-fulfillment.md`@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4 (captured 2026-06-04).

## Domain Events

| Event | Actor | Trigger | Notes |
|-------|-------|---------|-------|
| Order Placed | Customer | Place Order command | pivotal |
| Payment Received | Payment Gateway | Order Placed | pivotal |
| Order Shipped | Warehouse Clerk | Payment Received | |
| Order Delivered | Carrier | Order Shipped | terminal |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places an order |
| Payment Gateway | system | Confirms payment for an order |
| Warehouse Clerk | role | Ships the order |
| Carrier | system | Delivers the order |

## Lifecycle Skeletons

Note: this pipeline fixes the term **aggregate**; in current EventStorming the sticky is the **Constraint** (legacy "Aggregate").

### Order

1. Order Placed
2. Payment Received
3. Order Shipped
4. Order Delivered
