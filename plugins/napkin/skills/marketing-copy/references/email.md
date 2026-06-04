# Channel: email — sequences & single emails

Writes `spec/copy/email.md`. Ask which sequence (or single email); default to a **welcome sequence** for
a new signup if unspecified.

## Sequence types (pick one)

| Sequence | Length / cadence | Goal | Arc |
|----------|------------------|------|-----|
| Welcome | 5–7 emails, ~12–14 days | activate a new signup | quick win → story → proof → objection → feature → ask |
| Nurture | 6–8 emails, 2–3 weeks | move a lead to trial/demo | problem deep-dive → framework → case study → offer |
| Onboarding | 5–7 emails, ~14 days | reach the "aha" (the walking-skeleton win) | getting-started → key feature → success story → upgrade |
| Re-engagement | 3–4 emails, ~2 weeks | win back inactive | check-in → value reminder → incentive → clean break |

Each **email theme** should map to a positioning messaging pillar, objection, or switching force.

## Per-email structure

1. **Subject line** (40–60 chars) + **preview text** (90–140 chars that *extends*, not repeats).
2. **Hook** (first line — earns the open).
3. **Context** → **Value** (one idea) → **one CTA** (one job per email).
4. **Sign-off** (warm, human).

Length: 50–125 words transactional; 150–300 educational; 300–500 story-driven. Short paragraphs (1–3
sentences), mobile-first.

## Subject-line patterns (offer 3 per email, annotate)

- Question: "Still {pain}?"  · How-to: "How to {outcome} in {timeframe}"  · Number: "3 ways to {benefit}"
  · Direct: "{First name}, your {thing} is ready". Clarity over cleverness; no clickbait the body can't pay off.

## Output structure (in the file)

Start with a **Sequence overview** (trigger, goal, length, timing, exit condition). Then per email:
`### Email N — Day X` → subject (+2 alts) → preview → full body → CTA button text + destination →
`— why:` (the pillar/objection it serves). One primary CTA per email; value before any ask.
