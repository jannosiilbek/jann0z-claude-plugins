---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

Write a design doc for moving our user sessions out of Postgres (table user_sessions) into Redis. Reasons: session reads are ~40% of our DB load and p95 login checks are slow. Constraints: sessions must survive a Redis restart, and the migration must be zero-downtime, nobody gets logged out. Sessions expire after 30 days of inactivity. Readers are the backend team who will build it. Please explain the expiry approach in detail, that's where we got burned last time. Save as session-store-design.md
