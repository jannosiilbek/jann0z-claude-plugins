<!-- fingerprints:
01-event-storming.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff
-->

## Upstream Fingerprint

01-event-storming.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff (captured 2026-06-04).

This glossary is scoped to the single bounded context: Box Office Ticketing.

## Terms

| Definition | Term | Owns 01 element? | 01 element (exact string) |
|------------|------|------------------|---------------------------|
| A patron who places and pays for an order. | Customer | yes | Customer |
| The external party that confirms whether an order has been paid. | PaymentGateway | yes | Payment Gateway |
| The party that reserves, sells and releases seats. | BoxOfficeSystem | yes | Box Office System |
| A patron's intent to acquire seats, tracked until it is settled. | Order | yes | Order |
| A single allocated seat that a patron holds once an order is settled. | Ticket | yes | Ticket |

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

## Forbidden Synonyms

| Forbidden term | Canonical term | Reason |
|----------------|----------------|--------|
| Buyer | Customer | One name per patron concept; Buyer is a rejected alternative. |
| Seat | Ticket | A held seat is a Ticket in this context. |
