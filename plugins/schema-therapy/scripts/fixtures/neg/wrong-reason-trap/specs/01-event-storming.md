<!-- fingerprints:
domain.md@sha256:06381e04ccd61138a01e07797ff046df11ed82729b5532ded3698f213cfea6b5
-->

## Domain Events

| Event | Actor | Trigger | Notes |
|-------|-------|---------|-------|
| Order Placed | Customer | Place Order command | a customer opens an order |
| Order Paid | Customer | Order Placed | payment succeeded |
| Order Cancelled | Customer | Cancel Order command | order called off |
| Customer Registered | Customer | Register command | a customer account opens |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places, pays, and cancels orders |

## Hotspots

| Hotspot | Question | Blocks |
|---------|----------|--------|
| Cancellation window | How long may a placed order be cancelled? | Order Cancelled |

## Lifecycle Skeletons

### Order

1. Order Placed
2. Order Paid
3. Order Cancelled

### Customer

1. Customer Registered
