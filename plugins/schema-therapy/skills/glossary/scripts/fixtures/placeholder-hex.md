<!-- fingerprints:
01-event-storming.md@sha256:0000000000000000000000000000000000000000000000000000000000000000
-->

## Upstream Fingerprint

01-event-storming.md@sha256:0000000000000000000000000000000000000000000000000000000000000000 (captured 2026-06-04).

This glossary is scoped to the single bounded context: Box Office Ticketing.

## Terms

| Term | Definition | Owns 01 element? | 01 element (exact string) |
|------|------------|------------------|---------------------------|
| Customer | A patron who places and pays for an order. | yes | Customer |
| PaymentGateway | The external party that confirms whether an order has been paid. | yes | Payment Gateway |
| BoxOfficeSystem | The party that reserves, sells and releases seats. | yes | Box Office System |
| Order | A patron's intent to acquire seats, tracked until it is settled. | yes | Order |
| Ticket | A single allocated seat that a patron holds once an order is settled. | yes | Ticket |

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
