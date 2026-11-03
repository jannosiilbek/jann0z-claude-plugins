---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I need a functional spec for API rate limiting on our public REST API. Limits are per API key: 100 requests/min on the free plan, 1000/min on pro. When exceeded return 429 with a Retry-After header. Also please include exactly which response headers we send on every request, I want X-RateLimit-Limit, X-RateLimit-Remaining and X-RateLimit-Reset (unix seconds). Enterprise customers get custom limits configured by support. Save as rate-limit-spec.md
