# Ops Runbook — Order Support Procedures

## Support reset: SHIPPED → PENDING

**Frequency:** a few times a week (typically 2–5 resets per week based on
2022–2024 ops logs).

**When to use:** a customer contacts support after shipment has been recorded
but before the parcel has physically left the warehouse.  Reasons include:
address corrections, item substitutions, or cancellation before dispatch.

**How to perform the reset:**

1. Log in to the admin console at `/admin/orders`.
2. Search for the order by order ID or customer email.
3. Open the order detail page.
4. Under **Status actions**, select **Reset to Pending** (only shown when
   current status is SHIPPED).
5. Confirm the dialog.  The system moves the order back to PENDING and logs
   the actor and timestamp.

**Restrictions:**

- The reset is only available from SHIPPED status.  Orders in other states
  do not show the Reset button.
- A SHIPPED order **cannot** be cancelled — if the customer wants a
  cancellation after the reset, the support agent must first reset to PENDING
  and then cancel the order from PENDING.
- Only users with the `support` or `admin` role can perform this action.

## Order cancellation

Orders may be cancelled from PENDING or PAID status only.  A shipped order
cannot be cancelled directly; use the support reset procedure above first.

## Escalation

For orders that cannot be reset via the admin console (e.g. already handed off
to the courier), escalate to the warehouse ops team.
