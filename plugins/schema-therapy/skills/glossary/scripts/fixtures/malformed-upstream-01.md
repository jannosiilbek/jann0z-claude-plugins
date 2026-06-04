<!-- fingerprints:
box-office.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff
-->

## Upstream Fingerprint

Derived from domain description `box-office.md`@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff (captured 2026-06-04).

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

Note: the `## Domain Events` section is ABSENT — this upstream is unparseable against the pinned 01 format, so the harness cannot anchor any resolution target.

### Order

1. Order Placed
2. Order Paid
3. Order Expired

### Ticket

1. Ticket Reserved
2. Ticket Sold
3. Ticket Released
