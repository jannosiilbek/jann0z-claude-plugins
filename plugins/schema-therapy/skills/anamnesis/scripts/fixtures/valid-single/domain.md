# Domain — acme-orders

<!-- anamnesis: rendered from ledger.jsonl@sha256:c4c0d0c3ba916cf70ed452ec1ff909e0476b58a25abc5c859bb0d9ea578b7ee7; context: - — regenerate via the anamnesis harness render mode; do not hand-edit -->

## Actors

- A support agent resolves order issues raised by customers [CLM-0002]

## Domain events

- A customer placed an order [CLM-0003]

## Lifecycles

### order

- An order awaiting payment is pending [CLM-0004]
- A shipped order returned to pending by a support agent [CLM-0005]

## Rules

- An order above the approval threshold requires a manager sign-off [CLM-0006]
- A refund cannot exceed the original order total [CLM-0008]
- A payment is captured at order placement [CLM-0011]
- A payment is captured only at fulfillment [CLM-0012]

## Terms

- An order is a customer's request to purchase one or more items [CLM-0001]
- A customer is the party that owns one or more orders [CLM-0013]

## Relations

- Each order belongs to exactly one customer [CLM-0007]

## Open questions

- A refund may be reversed within the dispute window [CLM-0010]
