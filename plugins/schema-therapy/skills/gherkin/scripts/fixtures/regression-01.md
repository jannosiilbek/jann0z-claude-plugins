<!-- fingerprints: 00-impact-map.md@sha256:deadbeef domain.md@sha256:deadbeef -->

# Event Storming

## Domain Events

| Event | Actor | Trigger | Notes |
|-------|-------|---------|-------|
| Order Placed | Clerk | Place Order command | creation event |
| Order Paid | Clerk | Order Placed | payment recorded |
| Order Shipped | Clerk | Ship Order command | goods dispatched |
| Order Delivered | Clerk | Order Shipped | goods arrived |
| Order Cancelled | Clerk | Cancel Order command | before shipping |
| Coupon Issued | Promo System | Order Shipped | reward token issued |
| Coupon Redeemed | Clerk | Redeem Coupon command | discount applied |
| Coupon Expired | Promo System | Coupon Issued | offer lapsed |
| Coupon Section Cleared | Promo System | Coupon Expired | section purged |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Clerk | person | The sole human operator — every human-bound event is exempt (no OTHER human actor exists) |
| Promo System | system | Issues, expires, and clears coupons |
