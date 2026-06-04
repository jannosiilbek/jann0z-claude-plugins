<!-- fingerprints: 02-glossary.md@sha256:deadbeef -->

# Transitions

## Nope

### Order

| From | Event | To |
|------|-------|----|
| ∅ | Order Placed | placed |
| placed | Order Paid | paid |
| paid | Order Shipped | shipped |
| shipped | Order Delivered | delivered |
| placed | Order Cancelled | cancelled |

### Coupon

| From | Event | To |
|------|-------|----|
| ∅ | Coupon Issued | issued |
| issued | Coupon Redeemed | redeemed |
| issued | Coupon Expired | expired |
