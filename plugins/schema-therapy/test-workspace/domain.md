# Sample domain — Conference Ticketing

> Fixed input for end-to-end testing of every schema-therapy skill (PLAN.md Phase 1
> creation gate and Phase 2 suite audit). Do not edit between skill runs: every
> artifact in `specs/` is derived from this exact text, and doctrine §6 requires
> byte-deterministic re-runs over identical inputs.

## Domain description

We run a conference ticketing business. Organizers create events; each event takes
place at a venue and runs for one or more dates. A venue offers seating sections
with limited capacity, and the same venue hosts many events over the year.

Customers buy tickets through orders. An order can contain tickets for several
events at once. A ticket is for one specific event (and a seating section, when
the venue is seated); general-admission events have no seat assignment. Orders are
paid by card; payment can fail and be retried. An unpaid order expires after
30 minutes and releases its tickets back to the pool.

Tickets can be cancelled individually before the event starts. A cancelled ticket
may be refunded according to the refund policy: full refund up to 14 days before
the event, 50% up to 48 hours before, nothing after that. Refunds are issued
against the original payment and can fail (e.g. expired card), in which case
finance retries or escalates to manual handling.

Organizers can reschedule an event to new dates or move it to a different venue;
ticket holders must be notified and may cancel with a full refund within 14 days
of the announcement regardless of the normal policy. An event can also be
cancelled outright, which refunds every sold ticket in full automatically.

Tickets are checked in at the door by scanning a QR code; a ticket can be checked
in only once, only for its own event, and only when it is paid and not cancelled.
Lost tickets can be re-issued (the old QR code is invalidated).

We oversell popular general-admission events by up to 5% to compensate for
no-shows; seated sections are never oversold. When an event sells out, customers
can join a waitlist and are offered tickets in order when cancellations free
capacity; an offer expires after 24 hours and passes to the next person.
