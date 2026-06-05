# Anamnesis Brief — acme-orders

## Engagement
- project: acme-orders
- specs-dir: specs/

## Capabilities
| Capability | Class | Environment | Tier | Access |
|------------|-------|-------------|------|--------|
| repo | code | - | - | git@host:acme/orders.git |
| suite | test | - | - | repo path test/ |
| handbook | doc | - | - | docs/ + UI strings |
| warehouse | data | - | - | read replica DSN ref |
| api-stage | probe | staging | sandbox-full | https://stage.example.test |
| app-prod | probe | production | read-only | https://app.example.com |
| crm-prod | probe | production | none | https://crm.example.com |
