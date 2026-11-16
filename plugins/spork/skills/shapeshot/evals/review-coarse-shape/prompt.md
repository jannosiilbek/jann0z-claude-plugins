---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I drafted the shape for our apartment research before we start. We will filter by monthly price, district and whether pets are allowed, and our relocation team will call the agents (one agent often lists several of the apartments). Can you check it?

```
Listings  — Rental apartments in Tallinn for our relocation team
  apartments    20..40
    title       str
    price       str             — eg "950 € / month + utilities"
    address     str
    agent       str             — name, phone, agency
    features    str             — eg "balcony, parking, pets ok"
    rooms       int
    sizeM2      num
```
