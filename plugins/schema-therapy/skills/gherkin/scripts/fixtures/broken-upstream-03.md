<!-- fingerprints: 02-glossary.md@sha256:deadbeef -->

# Aggregates

## Aggregates

### Order

The order aggregate owns its lifecycle and payment.

### Coupon

The coupon aggregate owns redemption.

## Invariants

| Id | Rule |
|----|------|
| INV-Order-1 | A cancelled order rejects further placement |
| INV-Order-1 | A duplicated invariant id |

## Cross-Aggregate Policies

| Policy | Mode | Source Event | Target Consequence |
|--------|------|--------------|--------------------|
| OrderShipsCoupon | eventual | Order Shipped | the Coupon is issued |
