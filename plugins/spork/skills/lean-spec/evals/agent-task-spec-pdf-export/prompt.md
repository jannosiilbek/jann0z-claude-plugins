---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

Write a spec that Claude Code will pick up and implement in this repo: add PDF export for reports. It should work like the CSV export we already have, same filters and column order. Don't change what `GET /reports/:id/export?format=csv` returns, the mobile app parses it. Reports up to 10,000 rows must export; above that we haven't decided whether to cap or go async. Product hasn't decided yet whether PDFs include the report's charts. Save as pdf-export-spec.md
