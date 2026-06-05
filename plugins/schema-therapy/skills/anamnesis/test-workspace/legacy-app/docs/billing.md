# Billing — Architecture Notes

## Quote storage

Quotes sent to customers are stored in the `invoices` table for historical
reasons.  The table was created when the platform was called "Invoicer" (before
the 2013 rebrand) and the name has never been migrated.

Key fields that signal this is a quotation, not an invoice:

- `quoted_total` — the amount offered to the customer, subject to change before
  acceptance.
- `valid_until` — quotes expire; true invoices do not.
- `status` ∈ {draft, sent, accepted, expired} — none of these are accounting
  lifecycle states.

## Accounting integration

**Nothing is posted to accounting from this system.**  The accounting team
receives a nightly CSV export from the ERP (a separate application).  This
system has no outbound accounting calls, no ledger writes, and no journal
entries.

## ARCHIVED order status

The `ARCHIVED` value in the `ORDER_STATUS` enum was intended for a nightly
sweep job that would move orders older than five years out of the live table.
That job was designed but never deployed in production; it was formally retired
from the roadmap in Q3 2019.  The enum value remains in code because removing
an enum member was considered risky without a full regression pass, which was
never scheduled.  There are zero rows in the `orders` table with
`status = 'archived'`.
