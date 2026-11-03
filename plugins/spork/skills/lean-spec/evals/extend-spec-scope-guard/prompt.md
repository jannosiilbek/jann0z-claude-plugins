---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

Update our rate limit spec (rate-limit-spec.md). We decided: fixed calendar-minute windows, and rejected 429 requests do not count against the limit. Also add how we bill Enterprise customers for overage and the admin dashboard support uses to configure custom limits. Save the updated file as rate-limit-spec.md

Input files: rate-limit-spec.md
