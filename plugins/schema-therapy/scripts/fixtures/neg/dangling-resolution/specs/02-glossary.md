<!-- fingerprints:
01-event-storming.md@sha256:0015ffe02125551f5a973cab90ddbde02344c05cb62a05bdec7086e063617273
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
| paid | Order Settled |
| cancelled | Order Cancelled |

### CustomerStatus

| Value | Derived from event (exact 01 string) |
|-------|--------------------------------------|
| registered | Customer Registered |

## Forbidden Synonyms

| Forbidden term | Canonical term | Reason |
|----------------|----------------|--------|
| Buyer | Customer | One name per patron concept. |
