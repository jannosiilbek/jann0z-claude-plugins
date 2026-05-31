# Non-functional requirements — ShiftLoop

> Cross-cutting invariants. Each line is assertable (could be a Gherkin `Then`).
> Glossary terms and enum values are used verbatim. Anything undecided is flagged for
> follow-up, never invented.

## Tenancy & isolation

- **Model:** single-database, shared-schema; every tenant-owned row carries a `business_id`.
  The tenant root is the Business.
- **Isolation invariant:** a User never reads or writes any row whose `business_id` differs
  from the User's Business.

## Authentication

- Email-and-password login; password stored only as a salted hash.
- A session expires after 14 days of inactivity.
- Password reset is by a single-use link that expires after 60 minutes.
- MFA is not offered in v1.

## Subscription-state gating

- Write actions are permitted only when `Subscription status` is `trialing` or `active`.
- When `Subscription status` is `past_due` or `canceled`, the Business is read-only; only
  the Owner can reactivate by purchasing a Plan.

## Compliance & data

- Data is stored in the EU region only. (operational)
- On Business deletion, personal data is erased within 30 days; Shift and Labor cost
  records are anonymized (User reference removed) but retained for reporting.

## Limits & SLA

- An authenticated client is limited to 600 requests per minute. (operational)
- Target availability is 99.9% measured monthly. (operational)

## Audit

- Role changes, Schedule publishes, and billing changes are recorded with actor, timestamp,
  and Business, and retained for 365 days.
