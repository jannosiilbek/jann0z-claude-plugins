# Scoring rubric

How to rank candidates (SKILL.md Step 4) so the few names you spend live availability checks on are the best ones. Generation and vetting live in [naming-craft.md](naming-craft.md).

---

## Gates (apply first — these eliminate, not penalize)

Drop a candidate outright if any holds:

- **HARD linguistic flag** in any target market (rude / morbid / unsayable). See the linguistic-safety screen in [naming-craft.md](naming-craft.md).
- **Near-identical collision** with a top-5 incumbent in the category (sound or spelling).
- **>13 letters** or unsayable on first read.

Everything that survives the gates gets scored.

---

## Weighted scoring

Score each survivor 0–5 on every dimension, multiply by the weight, sum to a weighted total out of 100.

| # | Dimension | Weight | What a 5 looks like |
|---|-----------|:------:|---------------------|
| 1 | Pronounceability + spellability-on-hearing | 22 | First-read-aloud correct *and* radio-test spellable. The single biggest predictor of word-of-mouth survival. |
| 2 | Memorability + distinctiveness | 20 | Sticky (concrete or rhythmic), far from incumbents and category generics, survives the search test. |
| 3 | Brevity / shape | 12 | 4–10 letters, 1–3 syllables, one spoken word. Score down per letter over 10 and per syllable over 3. |
| 4 | Linguistic safety | 15 | `OK` across the screen. **SOFT-FLAG caps this at 2–3.** (HARD-FLAG was already gated out.) |
| 5 | Persona / register fit | 12 | Tone lands exactly on the target persona's register. −1 per step of mismatch. |
| 6 | Meaning / strategy fit | 10 | Evokes the right benefit or category without over-fitting one feature. Pure-noise names score mid unless brandability is high. |
| 7 | Domain / handle plausibility (pre-check heuristic) | 9 | Short + coined → exact `.com` more gettable. Common real word → probably taken. Score the *likelihood* before checking. |

Weighted total = Σ(score × weight) ÷ 5, giving a 0–100 scale.

---

## Tiers

Sort by weighted total and group:

| Tier | Score | Action |
|------|:-----:|--------|
| A | ≥ 80 | Check domains first — these are the lead candidates. |
| B | 65–79 | Check if Tier A's domains come back taken. |
| C | < 65 | Backups only. |

---

## How many to carry into the availability check

Carry the **top ~12–15** names (Tiers A and B). Oversample deliberately: exact `.com` matches are taken far more often than not, so a thin shortlist tends to leave you choosing between a great name with no domain and a free domain on a weak name. The ranking decides the *order* domains are checked, so the highest-scoring name that's actually free surfaces first. Run social-handle checks only for the final ~5 picks — they're slower and the unauthenticated GitHub API rate-limits quickly.

If fewer than ~3 strong names come back with a free, recall-friendly domain, return to generation (Step 2) for another targeted pass rather than recommending a weak name or a degraded `get-`/`use-` domain.

---

## Combining score with availability for the final order

The pre-check score ranks naming *merit*. The final shortlist order (SKILL.md Step 6) blends merit with what's actually gettable:

- A free `.com` is a strong positive — it's the default expectation and the most recall-friendly. Give a free-`.com` name a clear bump.
- A free `.io`/`.ai`/`.app` on a high-merit name is a good outcome; present it as such.
- A name whose only free TLDs are obscure, or whose domains are all `unknown`, ranks below an equally-good name with a confirmed free domain.
- Never let availability alone crown a winner: a free domain on a name that fails the radio test or carries a soft flag is not the top pick.

Present the blend transparently — show the merit and the availability side by side so the user sees *why* a name leads.
