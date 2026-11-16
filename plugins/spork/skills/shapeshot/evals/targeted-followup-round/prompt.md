---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

We are agreeing the shape for comparing three team chat tools before any research. Your last proposal was:

```
ChatToolComparison  — Pick a team chat tool for a 40-person company
  asOf          date
  features      8..12
    id          slug unique
    name        str ≤40
  products      3
    name        str unique
    tiers       1..4 @src
      id        slug unique
      name      str
      usdSeat?  num ≥0              — per month; empty = contact sales
      billing   monthly | annual
      features  → features.id 0+
  verdict       str ≤400
  gaps?         str 0+
```

Questions you asked:
1. tiers.usdSeat — list price per seat per month, or the price at 40 seats? Default: list price per seat.
2. features — a fixed list from me, or the 8..12 most mentioned in reviews? Default: most mentioned.

My answers: 1 ok. 2: fixed list: SSO, audit log, guest accounts, Slack Connect-style shared channels, message retention control. Also add a vendor support email to each tier.
