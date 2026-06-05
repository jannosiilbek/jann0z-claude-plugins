<!-- fingerprints:
field-service.md@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff
-->

## Upstream Fingerprint

Derived from domain description `field-service.md`@sha256:9a8b7c6d5e4f30211f2e3d4c5b6a79880d1c2b3a4958677665544332211009ff (captured 2026-06-04).

## Domain Events

| Event | Actor | Trigger | Notes | Deliverable |
|-------|-------|---------|-------|-------------|
| Job Dispatched | Dispatcher | Allocate Job command | pivotal | Auto-routing job board |
| Job Accepted | FieldTechnician | Job Dispatched | | — |
| Job Completed | FieldTechnician | Job Accepted | pivotal | On-site close-out capture |
| Invoice Raised | BillingClerk | Job Completed | pivotal | Straight-through invoicing |
| SLA Breach Flagged | Dispatcher | Job Dispatched | terminal | — |
| Job Reassigned | Dispatcher | Job Dispatched | | — |

## Actors

| Actor | Kind | Responsibility |
|-------|------|----------------|
| Dispatcher | person | Allocates jobs and tracks the SLA clock |
| FieldTechnician | person | Accepts and completes jobs on site |
| BillingClerk | person | Raises and reconciles invoices |

## Hotspots

| Hotspot | Question | Blocks |
|---------|----------|--------|
| Reassignment authority | Who may reassign an accepted job? | Job Reassigned |

## Lifecycle Skeletons

### Job

1. Job Dispatched
2. Job Accepted
3. Job Completed

### Invoice

1. Invoice Raised
