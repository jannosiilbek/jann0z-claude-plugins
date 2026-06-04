# 04 — Transition Tables

## Transition Tables

### order

| From | Event | To |
|------|-------|----|
| ∅ | Order Placed | placed |
| placed | Order Paid | paid |
| placed | Order Cancelled | cancelled |
| paid | Order Shipped | shipped |
| paid | Order Cancelled | cancelled |
| shipped | Order Delivered | delivered |
| delivered | Order Refunded | refunded |

### coupon

| From | Event | To |
|------|-------|----|
| ∅ | Coupon Issued | issued |
| issued | Coupon Redeemed | redeemed |
| issued | Coupon Expired | expired |
