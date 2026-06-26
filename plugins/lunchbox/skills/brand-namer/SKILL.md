---
name: brand-namer
description: Generate and vet brand names for a product that also have a free, registerable domain. Use this skill whenever someone wants to NAME a product, app, startup, company, SaaS, or feature and wants a name whose domain is actually gettable — "find a brand name", "name my product/app/startup", "what should I call my company/this product", "come up with product name ideas", "naming ideas with a free .com", "every name I like has the domain taken, find ones that are free", "I need a short memorable name with an available domain", "help me name my business", "rebrand and check the domain". It brainstorms many candidates across naming archetypes, screens them for global/linguistic safety and target-persona fit, scores and ranks them, then verifies domain availability (.com/.io/.ai/.co/.app via RDAP + DNS + WHOIS) plus social handles, and returns a ranked shortlist of names whose domains are free. It is specifically for inventing and choosing a NEW brand name; a one-off lookup of a single domain already chosen, registering a domain, DNS or registrar questions, a standalone trademark search, logo design, taglines or copy for a name that already exists, and naming a person, pet, or code identifier are separate tasks this skill does not handle.
---

# Brand namer

Turn a product idea into a ranked shortlist of strong, brandable names **whose domains are actually free**. The order is deliberate: generate a wide, diverse pool first, vet and rank it on naming merit, then spend live availability checks only on the best candidates — so the top name that surfaces is both good *and* gettable.

Results are presented **inline** as a ranked shortlist. This skill does not write files.

A name is only worth shortlisting if it survives four lenses at once: it sounds good and is easy to remember, it fits the target personas, it carries no bad meaning or unsayable sound in the markets that matter, and its domain is free. A great name with a taken `.com` and no good alternative is not a usable answer — surface the names that win on all four.

---

## Step 1 — Gather the brief

Work from whatever is already in context first (a product brief, a `product.md`, the conversation). Only ask for what's genuinely missing, in one compact batch:

- **What the product does** — one or two sentences. The function, the outcome it delivers, the category.
- **Target personas** — who buys/uses it (e.g. enterprise security teams, indie developers, designers, clinicians, mass-market consumers). This sets the *register* the name must project.
- **Primary markets / languages** — where it will be sold and which languages its audience speaks. This focuses the linguistic-safety check. Default to a global English-first audience plus the major-language safety screen if unspecified.
- **Style steer (optional)** — any direction (playful vs serious, real-word vs coined, must-include or must-avoid sounds, names they already like).
- **TLDs / handles (optional)** — defaults are `.com .io .ai .co .app` with a `.com`-available bonus, plus GitHub/X/Instagram handles. Accept overrides, and **fit the TLD set to the product**: keep `.com` first, but add the category-native extensions the audience actually respects — `.dev`/`.sh` for developer/CLI tools, `.health`/`.care` for clinical, `.design`/`.studio` for creative, `.app` for mobile/consumer. A free `.dev` for a CLI tool beats a free `.com` nobody will type.

Don't over-interview. Two or three sentences of product context plus the personas is enough to start generating.

---

## Step 2 — Generate a large, diverse pool

Read **[references/naming-craft.md](references/naming-craft.md)** and follow its generation strategy. Produce **60–100+ raw candidates**, deliberately spanning the naming archetypes (real-word, compound, portmanteau, invented, foreign-word, metaphor, abstract) rather than 80 variants of one idea — range is what lets a free domain surface without dropping to a weak name.

Quantity first, judgment second. Don't self-censor during generation; that happens in the next step.

---

## Step 3 — Self-filter and vet for global soundness

Two passes, both covered in detail in **[references/naming-craft.md](references/naming-craft.md)**:

1. **Cheap self-filter** — drop the obvious losers (over-13 letters, unpronounceable clusters, forced numbers/hyphens, blatant incumbent clones). Keep ~40–60 survivors.
2. **Linguistic-safety self-check** — for every survivor, read it and its near-homophones across the major-language screen (es, pt, fr, de, it, hi, zh, ja, ar, ru, plus the brief's specific markets). Flag rude, morbid, or unsayable readings. A **HARD flag** (offensive/embarrassing/unsayable in a target market) drops the name now. A **SOFT flag** (mildly awkward) is kept but noted. Also flag obvious **big-brand / trademark collisions** here.

The linguistic and trademark checks you can do from your own knowledge cover the common cases; for the final shortlist, note that a native-speaker slang pass and a formal trademark search (USPTO/EUIPO) are still required before anyone commits to a name. Say so honestly rather than implying the name is cleared.

---

## Step 4 — Score and rank

Score every remaining candidate with the weighted rubric in **[references/scoring-rubric.md](references/scoring-rubric.md)** (pronounceability, memorability/distinctiveness, brevity, linguistic safety, persona fit, meaning fit, domain plausibility). Apply the gates, rank, and group into tiers.

Carry the **top ~12–15** names into the availability check — oversample, because many exact `.com` matches will be taken and you want a free, high-ranked name to survive. Ranking sets the *order* in which names are checked so the best gettable one surfaces fast.

---

## Step 5 — Check domain (and handle) availability

Check the **top ~12–15** names for domains, choosing a TLD set that fits the product (Step 1). The path is relative to this skill's directory:

```
node <skill-dir>/scripts/check-availability.mjs --names "name1,name2,...,name15" --tlds com,io,ai,co,app
```

Then add social handles **only for the final ~5 picks** (the GitHub/X/Instagram checks are slower and the unauthenticated GitHub API rate-limits quickly, so don't spend them on names you won't recommend):

```
node <skill-dir>/scripts/check-availability.mjs --names "finalist1,...,finalist5" --tlds com,io --social github,x,instagram
```

`<skill-dir>` is the directory containing this SKILL.md. The script prints JSON to stdout: one entry per name with a `domains` array and a `social` array. The first run fetches and caches the IANA RDAP bootstrap (~24h), so it may take a moment.

**Run it as one synchronous call and present whatever it returns.** The checker already handles its own timeouts, per-host throttling, and retries — there is nothing to wait for. If some cells come back `unknown` (rate-limited or no-RDAP TLD), report them as `unknown` and move on. Never wait on, poll, re-run-loop, or background the check hoping for a cleaner result — a shortlist with a few honest `unknown` cells is the correct deliverable; a stalled non-answer is not.

Read the results honestly — every domain is a **tri-state**, never a bare yes/no:

| status | meaning | how to present it |
|--------|---------|-------------------|
| `registered` | proven taken | taken |
| `available` | proven free (RDAP 404 / WHOIS "no match") | **free** — but always add "verify at registrar; premium/reserved pricing may apply" |
| `unknown` | could not prove either way (rate-limited, no RDAP+WHOIS, timeout) | mark as unknown — never report it as free |

Social handles: `github` and `npm` are high-confidence (404 = free). `x` and `instagram` are **low-confidence** (those sites gate bots behind login walls) — present them as best-effort with the profile URL to verify by hand, not as fact.

If too few top-tier names have a free domain, go back to Step 2 for another targeted generation pass rather than recommending a weak name or a degraded `get-`/`use-` domain.

---

## Step 6 — Present the ranked shortlist

Lead with the names that win on all four lenses. Use this shape:

**Top picks** — a short ranked list (3–6), each as:

> **N. Name** — *archetype* · fits *persona/register*
> Free: `name.io`, `name.ai`, `name.app` · Taken: `name.com` · Handles: github free, x unknown
> *One line on what it evokes and why it fits the product + personas. Any soft linguistic flag noted here.*

Then a compact **summary table** of every checked candidate so the user can scan the field:

| # | Name | Archetype | Register | `.com` | `.io` | `.ai` | `.co` | `.app` | Handles | Lang | Score |
|---|------|-----------|----------|--------|-------|-------|-------|--------|---------|------|-------|

Use `free` / `taken` / `?` in the domain cells. `Lang` shows `OK` or the soft-flag note.

Close with an honest **caveats** line: `available` means unregistered, not free-of-charge or cleared — a registrar will confirm price/eligibility, and a trademark search plus (for finalists) a native-speaker slang check are still owed before committing.

---

## What good output looks like

- The #1 pick is genuinely strong *and* has a free, recall-friendly domain — not a great name on a domain nobody can get, nor a free domain on a forgettable name.
- Every recommended name passes the radio test (say it, the listener spells it right) and carries no hard linguistic or big-brand collision.
- The register matches the personas (no jokey name for clinicians, no cold enterprise abstraction for a consumer app).
- Availability is reported as a tri-state with caveats, never as a bare "it's free."

---

## References

- **[references/naming-craft.md](references/naming-craft.md)** — archetypes, the generation strategy, quality gates, the linguistic-safety screen, persona→register mapping, and anti-patterns.
- **[references/scoring-rubric.md](references/scoring-rubric.md)** — the weighted scoring dimensions, elimination gates, tiering, and how many candidates to carry into the availability check.
- **`scripts/check-availability.mjs`** — the zero-dependency domain + handle checker (RDAP → DNS → WHOIS, plus social handles). Run its selftest with `npm test` from `scripts/`.
