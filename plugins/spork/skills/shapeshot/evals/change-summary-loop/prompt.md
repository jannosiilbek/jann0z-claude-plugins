---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

We're doing the note-app comparison shape first, before any research. Your last proposal was:

```
CompetitorAnalysis  — Pick a note app for a 12-person agency
  asOf          date
  competitors   3..6
    name        str unique
    site        url
    segment     smb | mid | ent
    pricing     1+
      tier      str
      usdSeat?  num ≥0              — empty = contact sales
    strengths   1..5 @src
      text      str ≤140
    weaknesses  1..5 @src
      text      str ≤140
  verdict       str ≤400
  gaps?         str 0+
```

Changes: drop segment, add a market share estimate for each competitor, and make it exactly 5 competitors. Also rename verdict to recommendation.
