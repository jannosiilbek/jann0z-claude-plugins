<!-- fingerprints:
01-event-storming.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff
-->

## Upstream Fingerprint

01-event-storming.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff (captured 2026-06-04).

This glossary is scoped to the single bounded context: Box Office Ticketing.

## Terms

| Term | Definition | Owns 01 element? | 01 element (exact string) |
|------|------------|------------------|---------------------------|
| Customer | A patron who places and pays for an order. | yes | Customer |
| PaymentGateway | The external party that confirms whether an order has been paid. | yes | Payment Gateway |
| BoxOfficeSystem | The party that reserves, sells and releases seats. | yes | Box Office System |
| Order | A patron's intent to acquire seats, tracked until it is settled. | yes | Order |
| Ticket | A single allocated seat that a patron holds once an order is settled. | yes | Ticket |
| OrderId | The globally unique handle for an order. | no | — |
| TicketId | The globally unique handle for a ticket. | no | — |
| SeatNumber | The physical seat a ticket allocates. | no | — |

## Enums

### OrderStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| placed | Order Placed |
| paid | Order Paid |
| expired | Order Expired |

### TicketStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| reserved | Ticket Reserved |
| sold | Ticket Sold |
| released | Ticket Released |

## Synonyms Recap

| Forbidden term | Canonical term | Reason |
|----------------|----------------|--------|
| Booking | Order | One name per intent-to-acquire concept; Booking is a rejected alternative. |
| Seat | Ticket | A held seat is a Ticket in this context. |
