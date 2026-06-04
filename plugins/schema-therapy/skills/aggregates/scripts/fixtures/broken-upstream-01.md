<!-- fingerprints:
box-office.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff
-->

## Upstream Fingerprint

Derived from domain description `box-office.md`@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff (captured 2026-06-04).

## Domain Events

| Event | Actor | Trigger | Notes | Deliverable |
|-------|-------|---------|-------|-------------|
| Order Placed | Customer | Place Order command | pivotal | — |
| Order Paid | Payment Gateway | Order Placed | pivotal | — |
| Order Expired | Box Office System | Order Placed | terminal | — |
| Ticket Reserved | Box Office System | Order Placed | | — |
| Ticket Sold | Box Office System | Order Paid | | — |
| Ticket Released | Box Office System | Order Expired | terminal | — |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places and pays for an order |
| Payment Gateway | system | Confirms payment for an order |
| Box Office System | system | Reserves, sells and releases tickets |

## Hotspots

| Hotspot | Question | Blocks |
|---------|----------|--------|
| Resale authority | Who may resell a released ticket? | Ticket Released |

## Lifecycle Skeletons

### Order

1. Order Placed
2. Order Paid
3. Order Expired
4. Order Refunded

### Ticket

1. Ticket Reserved
2. Ticket Sold
3. Ticket Released
