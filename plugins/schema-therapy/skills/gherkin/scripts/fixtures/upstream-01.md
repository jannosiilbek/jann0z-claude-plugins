<!-- fingerprints: 00-impact-map.md@sha256:deadbeef domain.md@sha256:deadbeef -->

# Event Storming

## Domain Events

| Event | Actor | Trigger | Notes |
|-------|-------|---------|-------|
| Order Placed | Customer | Place Order command | creation event |
| Order Paid | Payment Gateway | Order Placed | card payment succeeded |
| Order Shipped | Dispatcher | Ship Order command | goods dispatched |
| Order Delivered | Dispatcher | Order Shipped | goods arrived |
| Order Cancelled | Customer | Cancel Order command | before shipping |
| Order Refunded | Payment Gateway | Order Delivered | refund settled |
| Coupon Issued | Promo System | Order Shipped | reward token issued |
| Coupon Redeemed | Customer | Redeem Coupon command | discount applied |
| Coupon Expired | Promo System | Coupon Issued | offer lapsed |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places, pays, and cancels orders; redeems coupons |
| Dispatcher | role | Ships and delivers orders |
| Payment Gateway | system | Confirms card payments and settles refunds |
| Promo System | system | Issues and expires coupons |

## Lifecycle Skeletons

### Order

1. Order Placed
2. Order Paid
3. Order Shipped
4. Order Delivered

### Coupon

1. Coupon Issued
2. Coupon Redeemed
