<!-- fingerprints:
00-impact-map.md@sha256:05ecaeab45dc7fe3d15352c946ea452692c965775778c495df9cb0c5ef066178
domain.md@sha256:06381e04ccd61138a01e07797ff046df11ed82729b5532ded3698f213cfea6b5
-->

## Domain Events

| Event | Actor | Trigger | Notes | Deliverable |
|-------|-------|---------|-------|-------------|
| Order Placed | Customer | Place Order command | a customer opens an order | Online order placement |
| Order Paid | Customer | Order Placed | payment succeeded | Self-service card payment |
| Order Cancelled | Customer | Cancel Order command | order called off | — |
| Customer Registered | Customer | Register command | a customer account opens | — |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places, pays, and cancels orders |
| Manager | role | Approves orders |

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
