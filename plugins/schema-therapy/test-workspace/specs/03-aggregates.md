<!-- fingerprints:
01-event-storming.md@sha256:523aa37c481ec8791813797d23934cc0c18f94570a5185c1a657f96cbf377739
02-glossary.md@sha256:2c472777ffccf7a0275c19adec734cd7f050329d2f6c8197fc48c5a3bb6cab37
-->

## Upstream Fingerprints

- 01-event-storming.md@sha256:523aa37c481ec8791813797d23934cc0c18f94570a5185c1a657f96cbf377739
- 02-glossary.md@sha256:2c472777ffccf7a0275c19adec734cd7f050329d2f6c8197fc48c5a3bb6cab37

## Aggregates

### Event

**Root:** Event · identity: EventId (globally unique)

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Event | entity | Event |
| EventId | value object | — |
| EventDates | value object | — |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Event-1 | An event may not reach status scheduled without carrying assigned EventDates. | within-boundary |
| INV-Event-2 | An event in status cancelled may not return to status scheduled or status rescheduled. | within-boundary |
| INV-Event-3 | An event reaches status sellout_reached only while in status scheduled or status rescheduled. | within-boundary |

**References (by identity only):**

| Target aggregate | Identity field held | Reason |
|------------------|---------------------|--------|
| Venue | VenueId | An event is hosted at one place, held by identity only so the two settle independently. |

### Venue

**Root:** Venue · identity: VenueId (globally unique)

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Venue | entity | Venue |
| VenueId | value object | — |
| SeatingSection | entity | SeatingSection |
| Capacity | value object | Capacity |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Venue-1 | A Venue in status registered holds at least one SeatingSection, each bounded by a declared Capacity. | within-boundary |
| INV-Venue-2 | Every SeatingSection within the boundary holds a Capacity of at least one. | within-boundary |

**References (by identity only):**

none

### Order

**Root:** Order · identity: OrderId (globally unique)

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Order | entity | Order |
| OrderId | value object | — |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Order-1 | An Order in status paid may not return to status placed or status payment_failed. | within-boundary |
| INV-Order-2 | An Order in status expired holds no settled payment and may not later reach status paid. | within-boundary |

**References (by identity only):**

none

### Ticket

**Root:** Ticket · identity: TicketId (globally unique)

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Ticket | entity | Ticket |
| TicketId | value object | — |
| QrCode | value object | QrCode |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Ticket-1 | A Ticket in status sold may not transition to status reserved or status released. | within-boundary |
| INV-Ticket-2 | A Ticket may reach status admitted only once and only while in status sold and not in status cancelled. | within-boundary |
| INV-Ticket-3 | A Ticket that reaches status reissued carries a fresh QrCode, invalidating the prior one. | within-boundary |

**References (by identity only):**

| Target aggregate | Identity field held | Reason |
|------------------|---------------------|--------|
| Event | EventId | A Ticket admits to one occurrence, held by identity only so admission settles within the ticket boundary. |

### Refund

**Root:** Refund · identity: RefundId (globally unique)

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| Refund | entity | Refund |
| RefundId | value object | — |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-Refund-1 | A Refund may reach status issued only from status requested. | within-boundary |
| INV-Refund-2 | A Refund in status failed may reach status escalated but may not silently return to status issued. | within-boundary |

**References (by identity only):**

| Target aggregate | Identity field held | Reason |
|------------------|---------------------|--------|
| Ticket | TicketId | A Refund is owed against one admission, held by identity only so settlement is independent. |

### WaitlistOffer

**Root:** WaitlistOffer · identity: WaitlistOfferId (globally unique)

**Boundary contents:**

| Member | Kind | 02 Term |
|--------|------|---------|
| WaitlistOffer | entity | WaitlistOffer |
| WaitlistOfferId | value object | — |

**Invariants:**

| ID | Rule | Scope |
|----|------|-------|
| INV-WaitlistOffer-1 | A WaitlistOffer in status waitlist_offer_made expires into status waitlist_offer_expired once its 24-hour window lapses. | within-boundary |
| INV-WaitlistOffer-2 | A WaitlistOffer may reach status waitlist_offer_made only after status waitlist_joined. | within-boundary |

**References (by identity only):**

| Target aggregate | Identity field held | Reason |
|------------------|---------------------|--------|
| Event | EventId | An offer is for capacity on one occurrence, held by identity only. |

## Cross-Aggregate Policies

| Policy | Source event | Target aggregate | Mode | Justification |
|--------|--------------|------------------|------|---------------|
| POL-1 | Order Paid | Ticket | eventual | Selling the held allocation happens outside the paying patron's own transaction. |
| POL-2 | Order Expired | Ticket | eventual | Returning reserved capacity is the system's job once the unpaid hold lapses, not the patron's act. |
| POL-3 | Event Cancelled | Refund | eventual | Refunding every sold admission is finance's downstream job, not part of cancelling the occurrence. |
| POL-4 | Ticket Cancelled | Refund | eventual | Requesting the money back is finance's job, downstream of the holder giving up the admission. |
| POL-5 | Ticket Released | WaitlistOffer | eventual | Extending a freed-capacity offer is the waitlist's job once capacity returns to the pool. |
| POL-6 | Event Rescheduled | Ticket | eventual | Notifying each affected holder is the system's downstream job, not part of moving the occurrence. |
