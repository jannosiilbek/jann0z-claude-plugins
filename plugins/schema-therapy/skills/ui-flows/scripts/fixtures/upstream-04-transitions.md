<!-- fingerprints:
02-glossary.md@sha256:3333333333333333333333333333333333333333333333333333333333333333
-->

## Transition Tables

### order

| From | Event | To |
|------|-------|----|
| ∅ | `place order` | placed |
| placed | `start picking` | picking |
| picking | `ship order` | shipped |
| shipped | `confirm delivery` | delivered |
| placed | `cancel order` | cancelled |
| placed | `hold order` | placed |

### coupon

| From | Event | To |
|------|-------|----|
| ∅ | `issue coupon` | active |
| active | `redeem coupon` | redeemed |
