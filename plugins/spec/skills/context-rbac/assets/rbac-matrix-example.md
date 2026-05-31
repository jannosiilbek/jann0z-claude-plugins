# RBAC matrix — ShiftLoop

> The single permission matrix. Roles and resources are `glossary.md` terms.
> Subscription-state gating lives in `nfr.md`, not here.

**Roles:** Owner, Manager, Employee (from `glossary.md`)

**Legend:** `✓` allowed · `✗` denied · `own` own records only · `loc` assigned Location only

| Resource | Action | Owner | Manager | Employee |
|----------|--------|-------|---------|----------|
| Subscription | manage | ✓ | ✗ | ✗ |
| Location | create | ✓ | ✗ | ✗ |
| Location | update | ✓ | loc | ✗ |
| Invitation | create | ✓ | loc | ✗ |
| User | change role | ✓ | ✗ | ✗ |
| Position | manage | ✓ | loc | ✗ |
| Pay rate | view | ✓ | loc | own |
| Pay rate | update | ✓ | loc | ✗ |
| Schedule | create draft | ✓ | loc | ✗ |
| Schedule | read draft | ✓ | loc | ✗ |
| Schedule | read published | ✓ | loc | loc |
| Schedule | publish | ✓ | loc | ✗ |
| Shift | assign | ✓ | loc | ✗ |
| Availability | set | ✗ | ✗ | own |
| Time-off | request | ✗ | ✗ | own |
| Time-off | decide | ✓ | loc | ✗ |
| Swap | request | ✗ | ✗ | own |
| Swap | approve | ✓ | loc | ✗ |
| Labor budget | set | ✓ | ✗ | ✗ |
| Labor cost | view | ✓ | loc | ✗ |

## Conditions

- **own** — the resource belongs to the acting User (their own Availability, Time-off,
  Swap, Pay rate).
- **loc** — the resource's Location is one the acting User is assigned to.
