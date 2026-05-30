# RBAC matrix — <Product name>

> The single permission matrix. Roles and resources are `glossary.md` terms.
> Subscription-state gating lives in `nfr.md`, not here.

**Roles:** <Role A>, <Role B>, <Role C> (from `glossary.md`)

**Legend:** `✓` allowed · `✗` denied · `own` own records only · plus any named condition
from the Conditions list below

| Resource | Action | <Role A> | <Role B> | <Role C> |
|----------|--------|----------|----------|----------|
| <Glossary entity> | <verb> | ✓ | own | ✗ |

## Conditions

- **own** — the resource belongs to the acting User.
- **<condition>** — <one concrete sentence defining it>.
