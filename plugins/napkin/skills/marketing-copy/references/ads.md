# Channel: ads — paid copy (Google / Meta / LinkedIn / X)

Writes `spec/copy/ads.md`. Ask the platform and goal; if unspecified, default to **Google Search RSA**
(highest-intent) plus one **Meta** set. Each ad angle should come from a positioning pillar, objection,
or the Push/Pull force.

## Platform formats & limits

- **Google Responsive Search Ad (RSA):** up to **15 headlines (≤30 chars each)**, **4 descriptions
  (≤90 chars each)**. Write ≥8 distinct headlines (mix benefit, feature, brand, CTA, objection) and 4
  descriptions. Include the keyword in some headlines. No fabricated claims (Google disapproves them).
- **Meta (FB/IG):** Primary text (~125 chars before "see more"), Headline (~40 chars), Description
  (~30 chars). Lead the primary text with the hook in the first line.
- **LinkedIn (Sponsored):** Intro text (≤150 chars visible), Headline (≤70 chars). B2B, decision-maker
  framing — speak to the Economic-Buyer/Champion from personas.
- **X (promoted):** ≤280 chars, one clear hook + CTA; tech-audience tone.

## Angle frameworks (offer 3–5 ad variants, annotate the angle)

- **Benefit angle** — the pillar outcome in customer language.
- **Pain/Push angle** — name the status-quo pain, then the relief.
- **Objection angle** — lead with the objection's rebuttal ("no install for staff").
- **Differentiation angle** — the wedge vs the named alternative.
- **Proof angle** — a real positioning proof point (skip if all `OPEN:`).

## Output structure (in the file)

Group by platform. Per platform: the assets in its exact slots (headlines list, descriptions list,
primary text), then 3–5 full ad variants each with a `— angle:` annotation. CTAs are action + outcome.
Add a one-line **targeting note** per platform drawn from personas `Reached via` + anti-personas (who to
exclude). State landing destination = the `landing` CTA.
