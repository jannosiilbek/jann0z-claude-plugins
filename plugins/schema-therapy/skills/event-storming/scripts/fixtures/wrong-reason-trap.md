<!-- fingerprints:
order-fulfillment.md@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4
-->

## Upstream Fingerprint

Derived from impact map `00-impact-map.md`@sha256:00aa11bb22cc33dd and domain description `order-fulfillment.md`@sha256:1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4c6a8b0d1f3acb9d2e4 (captured 2026-06-04).

## Domain Events

| Event | Actor | Trigger | Notes | Deliverable |
|-------|-------|---------|-------|-------------|
| Place Order | Warehouse | Place Order command | pivotal | Order Tracking |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places an order |

## Hotspots

| Hotspot | Question | Blocks |
|---------|----------|--------|
| None identified | - | - |

## Lifecycle Skeletons

Note: this pipeline fixes the term **aggregate**; in current EventStorming the sticky is the **Constraint** (legacy "Aggregate").

### Order

1. Place Order
