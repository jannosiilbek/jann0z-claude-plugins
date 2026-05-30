# Non-functional requirements — <Product name>

> Cross-cutting invariants. Each line is assertable (could be a Gherkin `Then`).
> Glossary terms and enum values are used verbatim. Anything undecided is flagged for
> follow-up, never invented.

## Tenancy & isolation

- **Model:** <single-DB shared-schema / schema-per-tenant / …; the tenant root is <Entity>>.
- **Isolation invariant:** <a User never reads or writes data belonging to another tenant>.

## Authentication

- <login mechanism; session lifetime with a number; password reset; MFA yes/no>.

## Subscription-state gating

- Write actions are permitted only when `Subscription status` is <values from glossary>.
- When <status>, the Business is <read-only / locked>; <who> can <reactivate>.

## Compliance & data

- <data residency; retention window in days; deletion vs anonymization rule>.

## Limits & SLA

- <rate limit with a number; availability/latency target with a number>.

## Audit

- <which actions are recorded, by whom, retained for how long>.
