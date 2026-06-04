<!-- fingerprints:
01-event-storming.md@sha256:523aa37c481ec8791813797d23934cc0c18f94570a5185c1a657f96cbf377739
-->

## Upstream Fingerprint

01-event-storming.md@sha256:523aa37c481ec8791813797d23934cc0c18f94570a5185c1a657f96cbf377739 (captured 2026-06-04, against the converged 01-event-storming.md for the Conference Ticketing domain).

This glossary is scoped to the single bounded context: Conference Ticketing.

## Terms

| Term | Definition | Owns 01 element? | 01 element (exact string) |
|------|------------|------------------|---------------------------|
| Organizer | The party that opens conference events and registers the venues they run in. | yes | Organizer |
| Customer | A patron who places orders, acquires tickets, and joins waitlists. | yes | Customer |
| TicketHolder | The party that holds an acquired ticket and may give it up before its event begins. | yes | Ticket Holder |
| GateAgent | The party that admits a ticket at the door. | yes | Gate Agent |
| FinanceOfficer | The party accountable for the refund of a given ticket. | yes | Finance Officer |
| PaymentGateway | The external party that confirms whether an order has been paid and whether a refund has gone through. | yes | Payment Gateway |
| BoxOfficeSystem | The party that expires unpaid orders, returns capacity, notifies holders, and runs the waitlist. | yes | Box Office System |
| Event | A conference occurrence that an organizer opens, schedules, and may reschedule, sell out, or call off. | yes | Event |
| Venue | A place that hosts an event, partitioned into seating sections of bounded capacity. | yes | Venue |
| SeatingSection | A bounded-capacity partition of a venue against which capacity is counted. | no | Seating Section Defined |
| Order | A patron's intent to acquire one or more tickets, tracked until it is settled or lapses. | yes | Order |
| Ticket | A single acquired admission to one event and optional seating section, held by a patron. | yes | Ticket |
| Refund | A return of money owed against a cancelled ticket's original payment. | yes | Refund |
| WaitlistOffer | A time-bounded chance to acquire freed capacity, extended to a waiting patron in turn. | yes | WaitlistOffer |
| Waitlist | The ordered queue of patrons waiting for capacity on a sold-out event. | no | Waitlist Joined |
| Capacity | The bounded number of admissions a venue or seating section can hold at once. | no | Seating Section Defined |
| QrCode | The scannable credential a ticket carries, invalidated when the ticket is reissued. | no | Scan QR Code command |

## Enums

### EventStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| created | Event Created |
| scheduled | Event Scheduled |
| rescheduled | Event Rescheduled |
| sellout_reached | Event Sellout Reached |
| cancelled | Event Cancelled |

### VenueStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| registered | Venue Registered |
| seating_section_defined | Seating Section Defined |

### OrderStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| placed | Order Placed |
| payment_failed | Order Payment Failed |
| paid | Order Paid |
| expired | Order Expired |

### TicketStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| reserved | Ticket Reserved |
| sold | Ticket Sold |
| released | Ticket Released |
| cancelled | Ticket Cancelled |
| reissued | Ticket Reissued |
| holder_notified | Ticket Holder Notified |
| admitted | Ticket Admitted |

### RefundStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| requested | Refund Requested |
| issued | Refund Issued |
| failed | Refund Failed |
| escalated | Refund Escalated |

### WaitlistOfferStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| waitlist_joined | Waitlist Joined |
| waitlist_offer_made | Waitlist Offer Made |
| waitlist_offer_expired | Waitlist Offer Expired |

## Forbidden Synonyms

| Forbidden term | Canonical term | Reason |
|----------------|----------------|--------|
| Buyer | Customer | One name per patron concept; Buyer is a rejected alternative. |
| Attendee | TicketHolder | A held-admission patron is a TicketHolder in this context. |
| Conference | Event | The conference occurrence is named Event throughout. |
| Section | SeatingSection | Section is an abbreviation of the canonical SeatingSection. |
| Reservation | Order | An unpaid hold is the Order concept, not a separate term. |
| Promoter | Organizer | Promoter is a rejected alternative for the event-opening party. |
| Door Agent | GateAgent | Door Agent is a rejected alternative for the admitting party. |
