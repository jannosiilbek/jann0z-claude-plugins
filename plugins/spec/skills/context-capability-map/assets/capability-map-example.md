# Capability map — ShiftLoop

> Authoritative capability set + build order; becomes the `features/` folders, one per
> capability. Foundation-first: each capability depends only on lower-numbered ones.

| # | Capability (kebab) | Outcome (one line) | Depends on | Personas served |
|---|--------------------|--------------------|------------|-----------------|
| 1 | identity-access | A person signs up, creating a Business and its first Owner, and can log in. | — | Owner, Manager, Employee |
| 2 | business-location-setup | An Owner configures the Business and its Locations. | 1 | Owner |
| 3 | team-positions | A Business invites Users, assigns Roles, and defines Positions. | 2 | Owner, Manager |
| 4 | availability-timeoff | An Employee sets Availability and requests Time-off; a Manager decides it. | 3 | Employee, Manager |
| 5 | scheduling | A Manager builds a draft Schedule by assigning Employees to Shifts. | 3, 4 | Manager |
| 6 | schedule-publishing | A Manager publishes a Schedule and affected Employees are notified. | 5 | Manager, Employee |
| 7 | shift-swaps | An Employee swaps an assigned Shift with Manager approval. | 6 | Employee, Manager |
| 8 | labor-cost-budget | An Owner sets a Labor budget and sees Labor cost against it while scheduling. | 5 | Owner, Manager |
| 9 | subscription-billing | A Business trials, subscribes to a Plan, and is gated when the Subscription lapses. | 1 | Owner |

**Walking skeleton:** capability #1, sign up → create a Business → log in → see an empty
Schedule, proving the auth and tenant seam end to end.
