---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Agreed shape, fits. JSON only. Save the files in the current folder.

```
Listings  — Tallinn rentals to filter and call agents about
  asOf          date
  agents        1+
    id          slug unique
    name        str
    phone       str
    agency?     str
  apartments    1+
    url         url unique
    district    kesklinn | pohja-tallinn | kristiine | mustamae | haabersti | nomme | pirita | lasnamae
    eurMonth    num ≥0              — rent only
    utilities   included | extra
    pets        yes | no | ask
    rooms       int ≥1
    agent       → agents.id
```

Data, as of 2026-11-10 (from our team notes, no research needed):
- https://kv.example/a1, Kalamaja (Põhja-Tallinn), 950 €/month + utilities, pets ok, 2 rooms, agent Mari Tamm (+372 5550 1111, Uus Maa)
- https://kv.example/a2, Kadriorg (Kesklinn), 1200 € incl. utilities, no pets, 3 rooms, agent Mari Tamm
- https://kv.example/a3, Mustamäe, 640 € + utilities, ask about pets, 2 rooms, agent Jaan Kask (+372 5550 2222, private)
- https://kv.example/a4, Pirita, 1500 € + utilities, pets ok, 4 rooms, agent Jaan Kask
