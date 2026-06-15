---
id: "02"
title: Local services marketplace (greenfield)
sizing: full
seed: none
---
Spec a two-sided marketplace for local home services called "Handyhub".

There are two kinds of users: customers (who request work) and providers (who do the work);
a single person can be both. A provider lists services they offer, each in a category
(cleaning, plumbing, electrical, gardening) with an hourly rate. A customer creates a booking
request for a service at an address and a requested time window. A provider can accept or
decline a booking request; on acceptance it becomes a confirmed booking. After the work, the
customer marks the booking complete and leaves a rating (1–5) and an optional review for the
provider. A provider can only be rated for bookings they actually completed, and a customer
can rate a given booking at most once.

Payments are handled by an external processor — model only that a confirmed booking has a
price and a payment status (pending, paid, refunded), not the processor integration itself.
Postgres backend. Produce the full spec.
