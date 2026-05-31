# Capability map — <Product name>

> Authoritative capability set + build order; becomes the `spec/features/` folders, one per
> capability. Foundation-first: each capability depends only on lower-numbered ones. The
> Primary feature file is the canonical `# Depends on:` target.

| # | Capability (kebab) | Primary feature file | Outcome (one line) | Depends on | Personas served |
|---|--------------------|----------------------|--------------------|------------|-----------------|
| 1 | <kebab-name> | <kebab-name>.feature | <value delivered> | — | <Role(s)> |

**Walking skeleton:** capability #1, <the thinnest end-to-end slice, trivial behavior> —
its primary feature file above.
