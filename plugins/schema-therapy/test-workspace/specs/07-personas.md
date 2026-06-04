## Upstream Fingerprints

- 00-impact-map.md@sha256:8e22e8901a873b1d73b9e640540237c562f434720ed36fb3a5177be4d5229457
- 01-event-storming.md@sha256:8808edde01f35a1a3d5d6a4aba10133d725920d68c42d432c6d5bbc5d872ddd4

## Personas

### Organizer

**Business actor:** Organizer

**Goals:**

- Have events filled close to capacity without chasing attendees [impact: Organizer fills events closer to capacity with less effort]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| open event | Create Event command | Event Created |
| schedule event | Event Created | Event Scheduled |
| register venue | Register Venue command | Venue Registered |
| define seating | Venue Registered | Seating Section Defined |

### Customer

**Business actor:** Customer

**Goals:**

- Buy, cancel, and be refunded for a ticket entirely alone [impact: Customer buys, cancels, and gets refunded without contacting support]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| place order | Place Order command | Order Placed |
| buy ticket | Order Paid | Ticket Sold |
| cancel ticket | Cancel Ticket command | Ticket Cancelled |
| join waitlist | Join Waitlist command | Waitlist Joined |

### GateAgent

**Business actor:** Gate Agent

**Goals:**

- Let every attendee through the door quickly with no argument [impact: Gate Agent admits attendees faster with fewer disputes at the door]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| admit ticket | Scan QR Code command | Ticket Admitted |

### FinanceOfficer

**Business actor:** Finance Officer

**Goals:**

- Clear every refund, even the ones that fail, without spreadsheet work [impact: Finance Officer resolves failed refunds without spreadsheet work]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| request refund | Ticket Cancelled | Refund Requested |
| issue refund | Refund Requested | Refund Issued |
| escalate refund | Refund Failed | Refund Escalated |
