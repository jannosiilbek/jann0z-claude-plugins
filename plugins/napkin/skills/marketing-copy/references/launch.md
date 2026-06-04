# Channel: launch — launch kit (Product Hunt / HN / announcement)

Writes `spec/copy/launch.md`. A launch is a coordinated set of assets that all say the same thing in the
positioning voice, pointed at one launch day. Ask: new product vs feature, the date, the channels. If
unspecified, produce the full kit below.

## Launch-day asset checklist (write copy for each that applies)

- **Announcement email** to the existing list (uses the `email` structure, one big CTA). *If
  `spec/copy/email.md` already exists, this collapses to a pointer to it plus launch-specific subject
  lines — don't re-author the body.*
- **Product Hunt listing** — tagline (≤60 chars), description, first maker comment (the story + the wedge).
- **Hacker News Show HN** — title (`Show HN: {what it is} – {one-line benefit}`) + a plain, non-marketing
  first comment (HN punishes hype; lead with the mechanism and what's honestly unfinished).
- **Social posts** — 3–5 launch posts (X thread + LinkedIn), per `social.md`. *If `spec/copy/social.md`
  already exists, point at which posts to use on launch day rather than rewriting them.*
- **In-app / banner** announcement — one line + CTA.
- **Blog/announcement post** — problem → what we built → how it works → CTA.

## Messaging structure for the launch narrative

1. **The problem** (brief `## Problem`, in customer language) — why now (brief `## Why now`).
2. **What we built** — the positioning statement, one line.
3. **The wedge** — the one thing that's different (lead with it; it's what gets shared).
4. **Proof / who it's for** — real proof points or the pilot story; the target persona; the anti-persona
   (who it's not for — honesty builds trust on PH/HN).
5. **CTA** — the one action, with any launch-day incentive (only if product.md/positioning owns it).

## Channel-specific tone

- **Product Hunt:** warm, founder-voice, gracious; the maker comment tells the origin story.
- **HN:** understated, technical, candid about limitations; no superlatives — they get flagged.
- **Email/social:** the brand voice from positioning.

## Output structure (in the file)

A `## Launch overview` (what's launching, date, channels, the one metric to watch), then one `###` block
per asset with ready-to-post copy and a `— note:` on the channel's tone. Reuse, don't re-invent — the
landing/email/social copy already written should be referenced, not rewritten.
