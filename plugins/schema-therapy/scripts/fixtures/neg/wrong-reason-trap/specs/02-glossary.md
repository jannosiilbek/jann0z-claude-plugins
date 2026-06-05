<!-- fingerprints:
01-event-storming.md@sha256:31aceed43ab3137e1ec2ebcfb25ff325c221284385ec2d8f462d5e74ba8bf226
-->

## Terms

| Term | Definition | Owns 01 element? | 01 element (exact string) |
|------|------------|------------------|---------------------------|
| Customer | A party that opens and settles orders. | yes | Customer |
| Order | A patron's intent to acquire goods, tracked until settled. | yes | Order |

## Enums

### OrderStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| placed | Order Placed |
| paid | Order Paid |
| cancelled | Order Cancelled |

### CustomerStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| registered | Customer Registered |

## Forbidden Synonyms

| Forbidden term | Canonical term | Reason |
|----------------|----------------|--------|
| Buyer | Customer | One name per patron concept. |

## Restated

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Customer | person | Places orders |
