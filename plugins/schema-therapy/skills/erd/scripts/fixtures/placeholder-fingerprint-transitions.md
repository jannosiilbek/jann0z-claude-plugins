<!-- fingerprints:
02-glossary.md@sha256:0000000000000000000000000000000000000000000000000000000000000000
03-aggregates.md@sha256:1b2c3d4e5f60718293a4b5c6d7e8f9001122334455667788990aabbccddeeff0
-->
## Transition Tables

### order

| From | Event (exact 01 string) | To |
|------|-------------------------|----|
| ∅ | Order Placed | placed |
| placed | Order Paid | paid |
| placed | Order Expired | expired |

### ticket

| From | Event (exact 01 string) | To |
|------|-------------------------|----|
| ∅ | Ticket Reserved | reserved |
| reserved | Ticket Sold | sold |
| reserved | Ticket Released | released |
