# Naming craft

The methodology for generating and vetting brand-name candidates. SKILL.md drives the workflow; this file is the backbone for Steps 2–3 (generate, self-filter, vet). Scoring lives in [scoring-rubric.md](scoring-rubric.md).

Contents:
- [Naming archetypes](#naming-archetypes)
- [Generation strategy](#generation-strategy)
- [Quality gates](#quality-gates)
- [Linguistic-safety screen](#linguistic-safety-screen)
- [Persona → register mapping](#persona--register-mapping)
- [Anti-patterns](#anti-patterns)

---

## Naming archetypes

Sample across all of these so the pool has range. For software, weight toward **compound, portmanteau, invented, and metaphor** — they balance meaning, ownability, and `.com` odds. Treat acronyms as a near-veto for a new brand.

| Archetype | What it is | Examples | Fits when |
|-----------|-----------|----------|-----------|
| Real-word | An existing word used as-is | Stripe, Notion, Sentry, Amber | The word is short, ownable in-category, not generic. (`.com` usually taken.) |
| Compound | Two real words joined | Mailchimp, Dropbox, GitHub, ServiceNow | You want instant meaning + better domain odds. Keep to 2 short morphemes, ≤12 letters. |
| Portmanteau / blend | Two words fused at a shared sound | Pinterest, Instagram, Netflix, Twitch | You want meaning *and* a coined, ownable feel. Best blends share a seam phoneme. |
| Invented / coined | Built from sounds/morphemes, no prior meaning | Google, Spotify, Twilio, Figma, Zapier, Algolia | You want a blank slate that's trademarkable and `.com`-gettable. Highest meaning-building cost. |
| Foreign-word | An evocative word from another language | Volvo, Audi, Sonos, Asana, Lumen, Vero | The word is short, pronounceable to the primary market, and carries the right connotation. Verify the real meaning. |
| Metaphor / evocative | A concrete image standing for the benefit | Bolt, Anchor, Beacon, Lattice, Compass, Sequoia | You want emotional resonance and a logo handle. Pick one dominant, on-strategy association. |
| Abstract / expressive | Suggestive sound, loose meaning | Verizon, Accenture, Hulu, Vimeo | An umbrella/enterprise brand needs gravitas + whitespace. Risk: empty if sounds aren't chosen well. |
| Founder / person / place | A name | Tesla, Bloomberg, Cisco, Adobe | Heritage/premium plays or agencies. Weak for self-service software. |
| Acronym / initialism | Initials | IBM, SAP, AWS | Only when already known or it forms a sayable word (NASA-style). Avoid for greenfield. |

---

## Generation strategy

Work in passes so the pool has range instead of one idea repeated. Target **60–100+ candidates** before any filtering.

**Step 0 — Concept harvest.** From the product description + personas, build three word banks:
- *Function words* — what it does: sync, ship, draft, route, merge, watch, build, flow, stack.
- *Benefit / feeling words* — the outcome: calm, fast, clear, sharp, free, bright, sure, ready.
- *Metaphor words* — concrete images for the benefit: bolt, anchor, beacon, compass, lattice, river, forge, atlas, prism, ember.
- Also pull *roots* — Latin/Greek morphemes for the core idea: lumen (light), tempus (time), vox (voice), nimbus (cloud), opus (work), verus (true), celer (fast), cura (care), flux (flow), porta (gate).

**Step 1 — Seed from concept words, one pass per archetype** (force coverage):
- Real-word: pick evocative single words from the metaphor bank.
- Compound: glue function+benefit or benefit+noun (Flowstack, Brightship, Clearmerge). ≤12 letters.
- Portmanteau: blend two banks at a shared phoneme (sync+canopy → Syncopy; nimbus+notes → Nimbo).
- Invented: take a root + a brandable ending (Step 2).
- Foreign: translate the core concept into Latin/Spanish/Italian/Japanese, keep the short, pretty ones (light → Lumina/Hikari; true → Vero; calm → Calma).
- Metaphor: name the product after the image that captures the benefit.

**Step 2 — Morpheme & affix machine** (invented/blended names). Combine a meaningful stem with productive brand affixes:
- Suffixes that read as software/company: `-ly` (Calendly), `-io`/`-eo` (Twilio, Vimeo), `-ify` (Spotify), `-r`/`-er` (Flickr, Zapier), `-o` (Venmo), `-a`/`-ia` (Algolia, Figma), `-on` (Notion), `-um`/`-us` (Lumen), `-ix`/`-ex` (Wix, Plex); semantic tails `-flow -base -deck -loop -grid`.
- Prefixes (sparingly): re-, up-, co-, neo-, omni-, meta-.

**Step 3 — Sound-pattern pass** (ignore meaning, chase phonetics). Generate snappy CVCV / CVCVC skeletons and fill them (Kavo, Vela, Orin, Zuma). Use sound symbolism on purpose:
- Front vowels (i, e) feel small / fast / light. Back vowels (o, u) feel big / solid / calm.
- Plosives (b, p, t, k, d, g) feel sharp / techy. Sonorants (l, m, n, r) feel smooth / trustworthy.
- Pick sounds that match the brand promise.

**Step 4 — Diversity quotas.** Before stopping, ensure ~6–8 candidates in *each* of real-word, compound, portmanteau, invented, foreign, metaphor. Thin bucket → another targeted pass.

---

## Quality gates

Make each a checkable gate, not a vibe. A strong software name passes most of these (full scoring in [scoring-rubric.md](scoring-rubric.md)).

**Length** — 4–10 letters ideal, hard ceiling 13. 2 syllables is the sweet spot; >3 is a penalty. One spoken word.

**Pronounceability (first-read-aloud test)** — a literate non-expert reads it correctly on the first try, with one obvious stress pattern and no ambiguous vowel. Avoid consonant clusters foreign to English/Romance phonotactics (Xqr, Ptkn). Alternating consonant-vowel reads well (Twilio, Algolia).

**Spellability-on-hearing (radio test)** — say the name; a listener writes it down and produces the canonical spelling. Penalize multiple plausible spellings (Lyft/Lift, Flickr/Flicker) and homophone collisions, unless you'll own every variant + redirects.

**Memorability** — concrete imagery, rhythm, or a sound hook aids recall. Plosive-led names and `-ee`/`-oh` endings feel snappy (Zoom, Loom). A name you can picture (Bolt, Anchor) sticks better than a pure abstraction.

**Distinctiveness** — far from category generics and from the top-5 incumbents (sound, spelling, first 3 letters). Survives the search test (Googling it isn't drowned by unrelated results).

**Type-ability** — lowercases cleanly; no awkward double letters or easily-confused chars (rn/m, l/I/1, 0/O); works as a handle, CLI command, package slug, email local-part.

**`.com`-friendliness** — short enough that the exact `.com` is plausibly gettable; no hyphen or number; doesn't force a `get-`/`use-` workaround that hurts recall.

**Extensibility** — doesn't over-fit one feature you'll outgrow ("PdfMergePro"); no fad/year/tech baggage that will date.

**Bonus — verb test** — can it become a verb ("just Slack me", "Google it")? A signal of a frictionless, ownable name.

---

## Linguistic-safety screen

Goal: never ship a name that's rude, morbid, or unsayable in a market that matters. Run this on every survivor of the cheap self-filter.

**Languages to screen** (largest speaker/market bases): Spanish (es), Portuguese (pt-BR + pt-PT), French (fr), German (de), Italian (it), Hindi (hi), Mandarin (zh, by sound), Japanese (ja, by katakana rendering), Arabic (ar, by sound), Russian (ru) — plus any specific markets named in the brief.

**Sub-checks** — run the candidate *and its near-homophones*:
- **Profanity / sexual / scatological collisions**, whole-word and as a standalone substring. Known traps: `-pinto` (PT), `pajero` (ES), `puta` (ES/PT), `cul`/`con` (FR), `fica`/`figa` (IT), `kut` (NL), `negr-`, and English `fart`/`ass`/`shit` substrings.
- **Sound-alikes, not just spelling**: "Nova" → "no va" (ES, "doesn't go"). Say the name in each language's default phonology and listen.
- **CJK morbid transliteration**: a syllable string can map onto unlucky/morbid characters — flag names whose dominant syllable reads near "death"/"4" in Mandarin/Cantonese/Japanese.
- **Big-brand collision by sound** (also a legal risk): too close to Google, Apple, Oracle, Meta, Stripe, etc.
- **Diacritic hazard**: needs accented chars to be "correct" (café, naïve) — stripped in domains/handles. Flag.
- **Unsayable phonemes**: contains sounds absent from a target market (English "th" in many languages; "r/l" for ja; heavy clusters for es/ja). Flag names a target audience literally can't say.

**Status per name:** `OK` / `SOFT-FLAG` (mildly awkward — keep, note) / `HARD-FLAG` (rude/morbid/unsayable in a target market — **drop before domain-checking**).

**Honesty.** The self-check covers common cases. Two things genuinely need external follow-up for finalists, and you should say so rather than imply clearance:
- Long-tail / regional slang in dialects outside your confidence → native-speaker or localized-slang pass.
- Trademark conflicts (USPTO/EUIPO/WIPO) → a formal legal search, out of scope for meaning but required.

---

## Persona → register mapping

Tone is a strategy decision, not taste. Map the dominant persona to a register, then bias generation and scoring toward that band. Penalize candidates whose register is more than one step away. Connotation beats cleverness when stakes are high.

| Persona | Register | Lean toward | Avoid |
|---------|----------|-------------|-------|
| Enterprise / B2B buyers | Credible, stable, "won't get me fired" | Real-word gravitas (Sentry, Lattice, Vanta), trust/structure metaphors (Anchor, Keystone, Vault) | Cutesy misspellings, puns, slang, diminutives |
| Indie devs / technical early adopters | Clever, terse, lowercase, a little irreverent; CLI-feel | Coined-short (Deno, Bun, Vite, Turso), playful real-word (Raycast), lightly-worn Greek/Latin | Corporate abstraction, anything that smells like a committee |
| Prosumer / self-serve SaaS | Friendly, modern, confident, approachable | Real-word metaphor (Notion, Figma, Loom, Linear), compound (Calendly, Webflow) | Enterprise coldness *and* meme-y immaturity |
| Consumers / mass market | Emotional, simple, instantly sayable, often warm/fun | Real-word/metaphor (Hinge, Calm, Headspace), playful coined (Venmo, Duolingo) | Technical jargon, acronyms, anything needing explanation |
| Clinicians / regulated / safety-critical | Serious, reassuring, precise, zero ambiguity | Latin/Greek care-adjacent roots (Lumen, Vital, Cura, Clara), calm metaphor (Maven) | Jokes, edgy slang; especially morbid sound-collisions |

Tag each candidate with the register it projects (playful / neutral / serious / clinical) and score the distance to the target.

---

## Anti-patterns

Down-rank or veto these.

1. **Trendy misspellings** — dropped vowels / cute substitutions (Flickr, Qik, Cardz) impose a permanent spelling tax. Veto by default; z-for-s, ph-for-f, and numbers-as-letters (Gr8) are hard vetoes.
2. **Too close to big brands / trademarks** — sound-alikes or riffs on famous marks. Legal landmine + distinctiveness failure. Veto within one or two phonemes of a major mark in an overlapping category.
3. **Generic / descriptive terms** — CloudData, SmartPay, DataSync. Unownable, untrademarkable, invisible in search. Veto bare category words.
4. **Unpronounceable strings** — hard consonant clusters a literate reader hesitates on. Cut.
5. **Numbers and hyphens in the name** — break the radio test, look spammy, hurt the domain. Veto in the name; tolerate `get-`/`use-` domain prefixes only as a flagged last resort.
6. **Over-long / multi-word** — >13 letters or anything needing a pause when spoken. Won't fit a logo, handle, or memory. Veto.
7. **Over-fitting a feature or fad** — PDFMergePro, AICopyBot, 2024Planner. Dates instantly and boxes the product in. Veto.
8. **Ambiguous spelling / homophone traps** — multiple plausible spellings (Klariti/Clarity) or homophones routing to a competitor. Veto unless the canonical spelling overwhelmingly dominates.
9. **Acronyms as new brands** — unpronounceable initialisms for an unknown company. Veto unless it forms a sayable word.
10. **Confusable characters** — rn~m, cl~d, l/I/1, O/0. Down-rank.
11. **Morbid / profane sound collisions** — covered by the linguistic screen; veto.

Meta-rule: when two names tie, prefer the one with fewer of these patterns and the cleaner radio test. Cleverness that costs spellability or distinctiveness is a net loss.
