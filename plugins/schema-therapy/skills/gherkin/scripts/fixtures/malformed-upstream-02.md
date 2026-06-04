<!-- fingerprints: 01-event-storming.md@sha256:deadbeef -->

# Glossary

## Terms

| Term | Definition |
|------|------------|
| Order | A customer's request to purchase goods |
| Coupon | A redeemable discount token |
| Customer | The party placing an order |
| Shipment | The dispatch of an order's goods |

## Enums

### OrderStatus

| Value | Derived from event |
|-------|--------------------|
| placed | Order Placed |
| paid | Order Paid |
| shipped | Order Shipped |
| delivered | Order Delivered |
| cancelled | Order Cancelled |
| refunded | Order Refunded |

### CouponStatus

| Value | Derived from event |
|-------|--------------------|
| issued | Coupon Issued |
| redeemed | Coupon Redeemed |
| expired | Coupon Expired |

