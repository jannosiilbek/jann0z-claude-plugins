---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Shape for the signup flow of our invoicing app, as we agreed:

```
SignupFlow  — Onboarding for a B2B invoicing app
  entry         → pages.id
  pages         2..12
    id          slug unique
    title       str ≤40
    kind        form | info | choice | done
    fields?     1+                  — only when kind = form
      name      slug
      input     text | email | password | select | checkbox
      required  bool
    exits       str 1+              — button labels
  edges         1+
    from        → pages.id
    to          → pages.id
    on          str                 — which exit
    when?       str                 — condition, eg plan = team
  where         every page reachable from entry; only kind = done has no edges out
```

Fits. Markdown please. Now design the flow: sign up with email and password, verify the email, enter company details (name, VAT number optional, country), choose a plan (solo or team), invite teammates (only for the team plan), then a done page. Save the files in the current folder.
