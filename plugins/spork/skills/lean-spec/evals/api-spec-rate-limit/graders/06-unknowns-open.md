---
type: llm
focus:
  source: file
  path: rate-limit-spec.md
weight: 1
---

The user gave exactly these facts: limits per API key, 100 requests/min on free and 1000/min on pro; exceeding returns 429 with a Retry-After header; every response carries X-RateLimit-Limit, X-RateLimit-Remaining and X-RateLimit-Reset (Reset in unix seconds); enterprise limits are custom, configured by support.

The spec passes if everything else it says about behaviour (window type, whether rejected requests count, unauthenticated requests, when limit changes apply, the 429 body, Retry-After format) is omitted, listed as an open question, or given a default clearly marked as provisional, and none of those points is stated as decided fact elsewhere in the spec. Direct consequences of the given facts (e.g. Remaining is 0 on a 429) are fine.
