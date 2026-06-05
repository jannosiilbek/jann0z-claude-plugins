<!-- fingerprints:
02-glossary.md@sha256:5f13227739cd2a3444b73a7c531d1d4de611054b81ba40bda62c1e6966ed4fca
03-aggregates.md@sha256:ac07c8635123654f57f21235d857ab809782c2e0b9f3fbf0938fb8a51fb398d4
-->

# 04 Transition Tables — Conference Ticketing

Companion to `04-erd.dbml`. One transition table per lifecycle entity (a table with
a `status` enum column). `From`/`To` are 02 enum values; the `Event` column carries
the exact 01 string each `To` value is derived from per 02. The `∅` row is the
initial-state row. Rows are sorted by `(From in 02 enum order, then To in 02 enum
order)` with `∅` first. Branch/guard semantics belong to 03 invariants and to 05
statecharts — not restated here.

## Transition Tables

### event

| From | Event (exact 01 string) | To |
|------|-------------------------|-----|
| ∅ | Event Created | created |
| created | Event Scheduled | scheduled |
| scheduled | Event Rescheduled | rescheduled |
| scheduled | Event Sellout Reached | sellout_reached |
| scheduled | Event Cancelled | cancelled |
| rescheduled | Event Sellout Reached | sellout_reached |
| rescheduled | Event Cancelled | cancelled |
| sellout_reached | Event Cancelled | cancelled |

### venue

| From | Event (exact 01 string) | To |
|------|-------------------------|-----|
| ∅ | Venue Registered | registered |
| registered | Seating Section Defined | seating_section_defined |

### order

| From | Event (exact 01 string) | To |
|------|-------------------------|-----|
| ∅ | Order Placed | placed |
| placed | Order Payment Failed | payment_failed |
| placed | Order Paid | paid |
| placed | Order Expired | expired |
| payment_failed | Order Paid | paid |

### ticket

| From | Event (exact 01 string) | To |
|------|-------------------------|-----|
| ∅ | Ticket Reserved | reserved |
| reserved | Ticket Sold | sold |
| reserved | Ticket Released | released |
| sold | Ticket Cancelled | cancelled |
| sold | Ticket Reissued | reissued |
| sold | Ticket Holder Notified | holder_notified |
| sold | Ticket Admitted | admitted |

### refund

| From | Event (exact 01 string) | To |
|------|-------------------------|-----|
| ∅ | Refund Requested | requested |
| requested | Refund Issued | issued |
| issued | Refund Failed | failed |
| failed | Refund Escalated | escalated |

### waitlist_offer

| From | Event (exact 01 string) | To |
|------|-------------------------|-----|
| ∅ | Waitlist Joined | waitlist_joined |
| waitlist_joined | Waitlist Offer Made | waitlist_offer_made |
| waitlist_offer_made | Waitlist Offer Expired | waitlist_offer_expired |
