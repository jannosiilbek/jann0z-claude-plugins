---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Agreed shape, fits:

```
TrialConversion  — Which trial behaviours go with converting to paid
  dataset       str                 — file used
  rows          int ≥0
  conversion    pct                 — overall share converted
  drivers       1..4
    factor      invited_teammate | connected_bank | plan_viewed | signup_source
    withRate    pct                 — conversion when factor is yes (or best source)
    withoutRate pct                 — conversion otherwise
    evidence    str ≤200            — calculation used
  gaps?         str 0+
```

Build it as a UI I can open in the browser. The data is in trials.csv. Save the files in the current folder.

Input files: trials.csv
