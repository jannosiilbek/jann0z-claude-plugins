<!-- fingerprints:
00-impact-map.md@sha256:1111111111111111111111111111111111111111111111111111111111111111
01-event-storming.md@sha256:2222222222222222222222222222222222222222222222222222222222222222
-->

## Glossary

| Term | Definition |
|------|------------|
| Order | A customer's request to be fulfilled |
| Coupon | A discount token |

## Enums

### OrderStatus

| Value | Derived from event |
|-------|--------------------|
| placed | `place order` |
| picking | `start picking` |
| shipped | `ship order` |
| delivered | `confirm delivery` |
| cancelled | `cancel order` |

### CouponStatus

| Value | Derived from event |
|-------|--------------------|
| active | `issue coupon` |
| redeemed | `redeem coupon` |

