<!-- fingerprints:
02-glossary.md@sha256:7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a49586776655443322110099a8b7c
03-aggregates.md@sha256:1b2c3d4e5f60718293a4b5c6d7e8f9001122334455667788990aabbccddeeff0
-->

## Transition Tables

### order

| From | Event (exact 01 string) | To |
|------|-------------------------|----|
| ∅ | Order Placed | placed |
| placed | Order Paid | paid |
| placed | Order Expired | expired |
