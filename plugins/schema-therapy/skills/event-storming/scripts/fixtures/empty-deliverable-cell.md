<!-- fingerprints:
order-fulfillment.md@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4
-->

## Upstream Fingerprint

Derived from impact map `00-impact-map.md`@sha256:00aa11bb22cc33dd and domain description `order-fulfillment.md`@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4 (captured 2026-06-04).

## Domain Events

| Event | Actor | Trigger | Notes | Deliverable |
|-------|-------|---------|-------|-------------|
| Order Placed | Customer | Place Order command | pivotal | Order Tracking |
| Payment Received | Payment Gateway | Order Placed | pivotal | |
| Order Shipped | Warehouse Clerk | Payment Received | | Dispatch Scheduling |
| Order Delivered | Carrier | Order Shipped | terminal | — |
| Invoice Issued | Billing System | Payment Received | | Invoice Generation |
| Invoice Settled | Billing System | Invoice Issued | | — |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places an order |
| Payment Gateway | system | Confirms payment for an order |
| Warehouse Clerk | role | Ships the order |
| Carrier | system | Delivers the order |
| Billing System | system | Issues and settles invoices |

## Hotspots

| Hotspot | Question | Blocks |
|---------|----------|--------|
| Refund authority | Who approves refunds over $500? | Order Delivered |

## Lifecycle Skeletons

Note: this pipeline fixes the term **aggregate** for the lifecycle/section name; in current EventStorming the corresponding sticky is the **Constraint** (legacy "Aggregate"), per the ddd-crew glossary.

### Order

1. Order Placed
2. Payment Received
3. Order Shipped
4. Order Delivered

### Invoice

1. Invoice Issued
2. Invoice Settled
