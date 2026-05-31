# Glossary — ShiftLoop

> Ubiquitous language. One concept = one word. Every domain noun and enum used in any
> spec or context file is defined here exactly once and reused verbatim. Other files
> reference these terms; they never redefine them.

## Terms

| Term | Type | Definition (one sentence) | Forbidden synonyms | Maps to |
|------|------|---------------------------|--------------------|---------|
| Business | Entity | The paying hospitality company that subscribes to ShiftLoop; the tenant root that owns all other data. | account, company, tenant, org | ERD: Business |
| Location | Entity | A single physical premises operated by a Business. | venue, store, branch, site | ERD: Location |
| User | Entity | A person with login credentials belonging to one Business. | account, member | ERD: User |
| Role | Role | The permission level a User holds in a Business: Owner, Manager, or Employee. | membership role, access level | ERD: Membership.role |
| Owner | Role | The User with full control of a Business, including billing. | admin, account holder | — |
| Manager | Role | A User who builds schedules and approves swaps and time-off for assigned Locations. | supervisor | — |
| Employee | Role | A User who is assigned to shifts and requests swaps and time-off. | staff, worker | — |
| Position | Entity | A category of work an Employee can perform, such as Barista or Server. | job role, skill | ERD: Position |
| Shift | Entity | A single block of scheduled work at a Location with a start time, end time, and Position. | slot, session | ERD: Shift |
| Schedule | Entity | The set of Shifts for one Location over one week. | roster, rota | ERD: Schedule |
| Swap | Entity | An Employee's request to hand an assigned Shift to another eligible Employee, subject to Manager approval. | trade, cover | ERD: Swap |
| Time-off | Entity | An Employee's request to be unavailable for a date range, subject to Manager approval. | leave, holiday, PTO | ERD: TimeOff |
| Availability | Entity | An Employee's recurring weekly pattern of when they can be scheduled. | preferences | ERD: Availability |
| Pay rate | Value | An Employee's pay per hour, in the Business currency. | wage, salary | ERD: Employee.pay_rate |
| Labor cost | Value | The sum of scheduled hours times pay rate for a Location over a period. | wage cost, payroll | — |
| Labor budget | Entity | An Owner-set labor-cost target for a Location for one week. | budget cap | ERD: LaborBudget |
| Subscription | Entity | A Business's paid plan, billed monthly. | plan, account plan | ERD: Subscription |
| Plan | Entity | A named pricing tier defining price and limits. | tier, package | ERD: Plan |
| Invitation | Entity | A pending offer for a person to join a Business as a User with a given Role. | invite | ERD: Invitation |
| Notification | Entity | A message sent to a User about a domain event. | alert, message | ERD: Notification |

## Enumerations

| Enum | Canonical values | Applies to |
|------|------------------|-----------|
| Subscription status | trialing, active, past_due, canceled | Subscription |
| Schedule status | draft, published | Schedule |
| Swap status | requested, accepted, approved, denied, canceled | Swap |
| Request status | pending, approved, denied, canceled | Time-off |
| Invitation status | pending, accepted, expired, revoked | Invitation |
