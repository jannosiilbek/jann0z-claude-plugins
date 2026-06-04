# 04 — Transition Tables

## Transition Tables

### order

| From | Event | To |
|------|-------|----|
| ∅ | Order Placed | placed |
| placed | Order Paid | paid |
| paid | Order Shipped | shipped |

### coupon

| From | Event | To |
|------|-------|----|
| ∅ | Coupon Issued | issued |
| issued | Coupon Redeemed | redeemed |
| issued | Coupon Expired | expired |
