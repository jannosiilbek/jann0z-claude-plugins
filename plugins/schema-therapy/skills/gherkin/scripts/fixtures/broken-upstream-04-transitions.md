<!-- fingerprints: 02-glossary.md@sha256:deadbeef -->

# Transitions

## Transition Tables

### Order

| From | Event | To |
|------|-------|----|
| ∅ | Order Placed | placed |
| placed | Order Paid | paid |
| paid | Order Shipped | shippd |
| shipped | Order Delivered | delivered |
| placed | Order Cancelled | cancelled |

### Coupon

| From | Event | To |
|------|-------|----|
| ∅ | Coupon Issued | issued |
| issued | Coupon Redeemed | redeemed |
| issued | Coupon Expired | expired |
