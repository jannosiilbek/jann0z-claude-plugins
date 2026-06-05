## Upstream Fingerprints

- 00-impact-map.md@sha256:05ecaeab45dc7fe3d15352c946ea452692c965775778c495df9cb0c5ef066178
- 01-event-storming.md@sha256:31aceed43ab3137e1ec2ebcfb25ff325c221284385ec2d8f462d5e74ba8bf226

## Personas

### Customer

**Business actor:** Customer

**Goals:**

- Place and pay for an order entirely alone [impact: Customer self-serves orders end to end]

**Jobs-to-be-done:**

| Job | Trigger | Outcome |
|-----|---------|---------|
| place order | Place Order command | Order Placed |
| pay order | Order Placed | Order Paid |
