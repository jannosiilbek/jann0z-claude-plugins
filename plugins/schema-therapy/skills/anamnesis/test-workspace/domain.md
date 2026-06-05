# Domain — legacy-orders

<!-- anamnesis: rendered from ledger.jsonl@sha256:658b724a180939a82b73453d2fc6c1ced7bb444648b3ed69cadead399d0c9e38; context: - — regenerate via the anamnesis harness render mode; do not hand-edit -->

## Domain events

- A customer placed an order, which set it to pending [CLM-0003]
- A customer paid for a pending order, which set it to paid [CLM-0004]
- An operator shipped a paid order, which set it to shipped [CLM-0005]

## Lifecycles

### invoice

- A quotation can be draft, sent, accepted, or expired [CLM-0012]

### order

- An order can be pending, paid, shipped, or cancelled [CLM-0001]
- An order is placed (then pending), then paid, then shipped [CLM-0006]
- A support agent reset a shipped order back to pending via a manual support action [CLM-0008]

## Rules

- A shipped order cannot be cancelled [CLM-0007]

## Terms

- The entity named invoice is a customer quotation; nothing is posted to accounting [CLM-0202]
- Users call a shipment a parcel [CLM-0205]
