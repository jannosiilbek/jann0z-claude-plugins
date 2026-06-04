# SOURCES — Personas (goal-directed, with jobs-to-be-done) source-of-truth provenance index

Provenance ONLY. No distilled content here (distillation happens later in `references/`).
Formalism: **Goal-directed personas** (Alan Cooper lineage), constructed per **NN/g**
practice, with **jobs-to-be-done** (Christensen) admitted as a subordinate complementary
lens. Skill #7 of the `schema-therapy` 11-skill modelling pipeline. It turns the scope
artifact (00 impact map) and discovery artifact (01 event storming) into
`specs/07-personas.md`. Downstream: 08 task model per persona-job; 09 UI-flow per persona.
Validation date for every row below: **2026-06-04**.

There is **no executable class** for this skill (no parser/validator/test corpus). Personas
are a design-modelling artifact in prose, not a machine-parsed DSL. Discovery confirmed this
— verify-none expected and confirmed. See Exclusions.

## Admitted sources

| # | Title | Version / Edition | Publication status (+ completeness) | Pub date | Canonical URL | Class | Validation date | Stored file |
|---|-------|-------------------|-------------------------------------|----------|---------------|-------|-----------------|-------------|
| 1 | About Face: The Essentials of Interaction Design | 4th edition (current; no 5th exists) | Published, complete; canonical commercial text | 2014 | https://www.wiley.com/en-gb/About+Face:+The+Essentials+of+Interaction+Design,+4th+Edition-p-9781118766576 | cite-only (commercial, Wiley, ISBN 9781118766576) | 2026-06-04 | [cite-only-commercial.md](./cite-only-commercial.md) |
| 2 | The Origin of Personas (Cooper Journal essay) | Single revision | Published, complete; freely readable; ORIGIN/first-person account | 2003-08-01 | https://www.cooper.com/journal/2003/08/the_origin_of_personas.html | gatherable (author's newsletter; content captured) | 2026-06-04 | [cooper-origin-of-personas-2003.md](./cooper-origin-of-personas-2003.md) |
| 3 | Alan Cooper and the Goal-Directed Design Process | Single revision (AIGA Gain v1n2) | Published, complete; freely hosted on author site | 2001-03-01 | https://www.dubberly.com/articles/alan-cooper-and-the-goal-directed-design-process.html | gatherable (public article, content captured) | 2026-06-04 | [dubberly-cooper-goal-directed-design-process-2001.md](./dubberly-cooper-goal-directed-design-process-2001.md) |
| 4 | Personas Make Users Memorable (NN/g) | Current refresh @ capture | Published, current; freely readable | 2025-10-03 | https://www.nngroup.com/articles/persona/ | gatherable (public article, content captured) | 2026-06-04 | [nng-personas-make-users-memorable-dykes-2025.md](./nng-personas-make-users-memorable-dykes-2025.md) |
| 5 | 3 Persona Types: Lightweight, Qualitative, and Statistical (NN/g) | Single revision | Published, complete; freely readable | 2020-06-21 | https://www.nngroup.com/articles/persona-types/ | gatherable (public article, content captured) | 2026-06-04 | [nng-persona-types-laubheimer-2020.md](./nng-persona-types-laubheimer-2020.md) |
| 6 | The Inmates Are Running the Asylum | 1st ed. 1999; reissue 2004 | Published, complete; ORIGIN citation | 1999 (reissue 2004) | https://ptgmedia.pearsoncmg.com/images/9780672326141/samplepages/0672326140.pdf | cite-only (commercial, Sams, ISBN 9780672326141) | 2026-06-04 | [cite-only-commercial.md](./cite-only-commercial.md) |
| 7 | Know Your Customers' "Jobs to Be Done" (Christensen, Hall, Dillon, Duncan) | HBR Sep 2016 feature | Published, complete; paywalled | 2016-09 | https://hbr.org/2016/09/know-your-customers-jobs-to-be-done | cite-only (commercial, HBR) — SUBORDINATE | 2026-06-04 | [cite-only-commercial.md](./cite-only-commercial.md) |

Notes on completeness/validation:
- **Row 1 (About Face 4e)** is the canonical authority but commercial → cite-only. Its
  goal taxonomy (experience / end / life goals) and persona-type roles (primary, secondary,
  supplemental, served, customer, negative) are the load-bearing concepts. Confirmed 4th ed.
  (2014) is the latest — no 5th/fifth edition exists. Identity corroborated across Wiley,
  VitalSource (ISBN 9781118766408 e-book), ACM DL (DOI 10.5555/2688796), Google Books
  (id w9Q5BAAAQBAJ). Wiley page itself returns HTTP 403 to automated fetch (not a validity
  problem — human-reachable).
- **Rows 2 & 3** are the freely-gatherable Cooper-lineage substitutes for the commercial
  primary text: row 2 is Cooper's own first-person origin story (goal-differentiated
  archetypes), row 3 (Dubberly) preserves verbatim Cooper quotes on the goals-vs-tasks
  distinction. Row 2's live cooper.com path was unstable to auto-fetch in 2026; content was
  captured via corroborating fetches (Tim Strehle 2003 capture + search excerpts); Wayback
  copy exists at web.archive.org/web/20101116073351/… (blocked to this fetcher).
- **Rows 4 & 5 (NN/g)** are the current practical-construction authority. Row 4 is the live,
  recently-refreshed "what a persona is / include-exclude" article (2025-10-03). Row 5 is the
  persona-types taxonomy (proto / qualitative / statistical), with **qualitative** as the
  recommended default. No newer NN/g superseding article found.
- **Row 6 (Inmates)** admitted cite-only as the *origin* publication of personas (1999); not
  load-bearing for method.
- **Row 7 (JTBD / Christensen)** admitted **subordinate** — see Authority alignment §3 and
  the ruling in [cite-only-commercial.md](./cite-only-commercial.md). The skill's output is
  "goal-directed personas *with* jobs-to-be-done," so the JTBD canon earns a citation, but it
  never displaces the persona as the unit of modeling.

## Exclusions (discovered but rejected, with reasons)

- **IxDF "Creating Personas from User Research Results"** — solid tutorial, but IxDF is a
  secondary training aggregator; its content is derivative of Cooper + NN/g (rows 1–5) and
  adds no independent authority. Excluded to avoid drift/redundancy.
- **Medium write-ups** ("User Personas: the complete guide", "On Goal-Directed Personas",
  Bart Szczepansky "User Goals", etc.) — secondary/derivative blog content; no normative
  authority; restate About Face/NN/g. Excluded.
- **NN/g video pages** (Proto Personas; Statistically-Generated Personas; Personas 101;
  "What are personas") — same authority as rows 4–5 but video, not storable text. Kept as
  pointers, not source rows. https://www.nngroup.com/topic/personas/
- **NN/g "Personas: Study Guide" and "Segment Analytics Data Using Personas"** — index/
  application pieces; the normative substance is already in rows 4–5. Not separate sources.
- **UXmatters "Personas, Goals, and Emotional Design"** — useful secondary essay echoing the
  three-goal-levels (visceral/behavioral/reflective) framing, but it is a re-exposition of
  About Face + Norman's *Emotional Design*; no independent authority. Excluded (pointer kept).
- **Don Norman, *Emotional Design*** — origin of the visceral/behavioral/reflective levels
  that About Face maps goal-types onto. Genuinely upstream of the *experience/end/life* goal
  framing, but it is a general design-psychology book, not a personas source-of-truth; About
  Face (row 1) already carries the goal-taxonomy this skill needs. Excluded from *this*
  skill's library (cite-only-adjacent; not admitted).
- **Christensen, *Competing Against Luck* (2016 book)** and **"The Cause and the Cure of
  Marketing Malpractice" (HBR 2005)** — the JTBD book-length / earlier-origin canon. The
  2016 HBR feature (row 7) is the tighter, citable statement already admitted as subordinate;
  these are kept as lineage pointers in the cite-only file, not separate admitted rows.
- **Tony Ulwick / "Outcome-Driven Innovation" (Strategyn) JTBD variant** — a competing JTBD
  school. Out of scope: it would over-weight the subordinate lens and conflicts in framing
  with Christensen. Excluded.
- **Grokipedia / AI-generated encyclopedia pages, copyprogramming "complete guide", Scribd
  decks** — uncertain provenance / SEO/derivative content. Excluded.
- **Bootleg full-text PDFs of About Face** (e.g. fall14se.files.wordpress.com,
  archive.org borrow) — copyright-infringing full copies. NOT stored and NOT linked as a
  source; row 1 stays cite-only. (Legitimate single-chapter teaching PDFs are listed only as
  verification pointers inside the cite-only file.)
- **Executable / parser / validator / test-corpus tooling** — none exists or is expected.
  Personas are prose design artifacts. No executable class admitted (verify-none confirmed).

## Authority alignment (who wins on overlapping concepts)

The admitted sources do **not contradict** each other on substance. Authority order:

1. **What a goal-directed persona *is*, and the goal taxonomy (experience / end / life
   goals); persona roles (primary, secondary, supplemental, served, customer, negative)** →
   **About Face 4e (row 1)** is the canonical authority. Because it is commercial, the
   operative gatherable carriers are **the Origin essay (row 2)** and **Dubberly (row 3)** —
   which agree with it. Row 2 establishes the goal-differentiated (not demographic) nature of
   the archetype; row 3 supplies Cooper's verbatim goals-vs-tasks distinction.

2. **Practical persona construction — research depth, persona types, what to include/exclude**
   → **NN/g (rows 4–5)** is the operative authority. NN/g's **qualitative persona** is the
   recommended default; proto/statistical are the bracketing extremes. NN/g and Cooper agree:
   personas must be grounded (in research or, for proto, explicit assumptions) and must carry
   only design-relevant detail.

3. **Jobs-to-be-done framing** → **Christensen HBR 2016 (row 7)** is the citable JTBD canon,
   but it is **SUBORDINATE** to Cooper. Ruling: the **persona** (Cooper, goal-differentiated
   archetype) is the unit of modeling; the **job** (Christensen, circumstance-driven progress)
   is admitted only as the *content of a persona's goal in context*. Where the lenses might
   pull apart — e.g. JTBD's "fire the persona, model only the job" stance — **Cooper wins**:
   downstream skills 08/09 key off the persona, with the job as the persona's goal. JTBD must
   never displace persona as the modeling unit.

4. **Goals vs. tasks boundary** → Cooper (rows 1–3) is authoritative: goals are stable end
   conditions; tasks are transient means. This is the seam between skill #7 (personas/goals,
   here) and skill #8 (one task model per persona-job). No source disputes this.

## Double-check (newest-available re-verification, 2026-06-04)

- Row 1: About Face — 4th ed. (2014) confirmed the **latest**; no 5th/fifth edition published.
  CURRENT (canonical).
- Row 2: Origin essay (2003-08-01) — Cooper's definitive origin account; no superseding
  first-person version. CONFIRMED ORIGIN; content captured despite live-path fetch instability.
- Row 3: Dubberly (2001) — stable archival article on author's site; no revision. CURRENT.
- Row 4: NN/g "Personas Make Users Memorable" — last updated 2025-10-03; live and newest at
  the canonical URL. CURRENT.
- Row 5: NN/g "3 Persona Types" (2020-06-21) — still the live persona-types reference; no
  superseding NN/g article found. CURRENT.
- Row 6: Inmates — 1999 origin / 2004 reissue; no newer edition; origin-citation only. STABLE.
- Row 7: Christensen et al. HBR (2016-09) — the canonical citable JTBD feature; still live and
  unrevised. CURRENT (subordinate).
