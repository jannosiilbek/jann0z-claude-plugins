# SOURCES — EventStorming source-of-truth provenance index

Provenance ONLY. No distilled content here (distillation happens later in `references/`).
Formalism: **EventStorming** (Alberto Brandolini). Skill #1 of the `schema-therapy`
modelling pipeline. Validation date for every row below: **2026-06-04**.

EventStorming is a workshop/whiteboard collaborative-modelling formalism, not a
machine-parsed DSL. There is therefore **no executable class** (no parser/validator/test
corpus exists or is expected). Discovery confirmed this — see Exclusions.

## Admitted sources

| # | Title | Version / Edition | Publication status (+ completeness) | Pub date | Canonical URL | Class | Validation date | Stored file |
|---|-------|-------------------|-------------------------------------|----------|---------------|-------|-----------------|-------------|
| 1 | EventStorming Glossary & Cheat sheet (ddd-crew) | Repo master @ commit 2024-06-06 | Published, complete & stable; community canon | 2024-06-06 (latest commit) | https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet | gatherable (CC BY 4.0) | 2026-06-04 | [ddd-crew-eventstorming-glossary-cheat-sheet.md](./ddd-crew-eventstorming-glossary-cheat-sheet.md) |
| 2 | Collaborative Process Modelling with EventStorming | Single revision (Medium) | Published, complete; freely readable | 2022-08-30 | https://medium.com/@ziobrando/collaborative-process-modelling-with-eventstorming-17ed363650c0 | gatherable (public article, content captured) | 2026-06-04 | [brandolini-collaborative-process-modelling-with-eventstorming.md](./brandolini-collaborative-process-modelling-with-eventstorming.md) |
| 3 | Introducing Event Storming (original post) | Single revision | Published, complete; HISTORICAL/origin reference (author says superseded for current practice) | 2013-11-18 | http://ziobrando.blogspot.com/2013/11/introducing-event-storming.html | gatherable (public blog, content captured) | 2026-06-04 | [brandolini-2013-introducing-event-storming-original-post.md](./brandolini-2013-introducing-event-storming-original-post.md) |
| 4 | eventstorming.com official reference | Site as of capture (©2025) | Published, current; mostly an index | 2025 (©) / captured 2026-06-04 | https://www.eventstorming.com/ | gatherable (official site; structure/self-description snapshot) | 2026-06-04 | [eventstorming-com-official-reference.md](./eventstorming-com-official-reference.md) |
| 5 | Introducing EventStorming (book) | Perpetual draft (no edition no.) | In progress: Big-Picture covered; Process & Software Design incomplete; FIXMEs remain | continuously updated | https://leanpub.com/introducing_eventstorming | cite-only (commercial) | 2026-06-04 | [cite-only-commercial-books.md](./cite-only-commercial-books.md) |
| 6 | The EventStorming Handbook | Leanpub digital ed. (no ISBN) | Published; in circulation since ~2019 | ~2019, updated since | https://leanpub.com/eventstorming_handbook | cite-only (commercial) | 2026-06-04 | [cite-only-commercial-books.md](./cite-only-commercial-books.md) |

Notes on completeness/validation:
- Row 5 (Brandolini's book) is a **perpetual draft** and is admitted because it is the
  recognized canonical authority for the formalism. Its incompleteness is recorded; the
  completed Big-Picture material is authoritative. Never store its full text.
- Row 1 (ddd-crew glossary) is the current, stable, CC-licensed community canon and is the
  primary *gatherable* substitute for the unfinished/commercial primary text. Confirmed it
  is the newest version (latest master commit 2024-06-06; no superseding fork or successor
  repo found).
- Rows 2 & 3 are Brandolini's own freely-published writings; #2 is current, #3 is the
  origin reference that the author himself flags as evolved-past for current practice.

## Exclusions (discovered but rejected, with reasons)

- **"50,000 Orange Stickies Later" talk (YouTube, ExploreDDD 2017)** — canonical overview,
  but a video; not storable text. Kept as a *pointer* inside gathered files, not a source row.
  https://www.youtube.com/watch?v=1i6QYvYhlYQ
- **awesome-eventstorming (mariuszgil)** — a curated link list, not a primary/normative
  source; would only re-point to materials already admitted or excluded.
  https://github.com/mariuszgil/awesome-eventstorming
- **wwerner/event-storming-cheatsheet** — a personal/third-party cheat sheet; superseded by
  the official ddd-crew glossary (row 1) which is the community-canonical version.
- **Xebia / Weave-IT / Qlerify / Boldare / Derave / Mr. Picky / devstyle.pl blog posts** —
  secondary tutorial/vendor content; derivative of Brandolini + ddd-crew; risk of drift,
  no normative authority. Excluded.
- **Grokipedia "Event storming" page** — AI-generated encyclopedia content of uncertain
  provenance; not authoritative. Excluded.
- **General DDD books** (Khononov *Learning DDD*, Vernon *IDDD*/*DDD Distilled*, Tune et al.,
  van Kelle/Verschatse/Baas-Schwegler *Collaborative Software Design*, Junker, Millet/Tune)
  — relevant to DDD broadly but not the EventStorming formalism's source-of-truth; downstream
  skills (glossary/aggregates/erd) may revisit. Excluded from *this* skill's library.
- **"DDD The First 15 Years" (free Leanpub community book)** — contains Brandolini's
  "Discovering Bounded Contexts with EventStorming" chapter (origin of several ddd-crew
  Big-Picture figures). Its EventStorming content is already represented via row 1's figures
  and rows 2/5. Kept as a *pointer* in the cite-only file rather than a separate gathered
  source to avoid redundancy. https://leanpub.com/ddd_first_15_years
- **Executable / parser / validator / test-corpus tooling** — none exists. EventStorming is
  a physical/whiteboard workshop notation with an intentionally open, non-formal grammar
  ("the pizza rule"); confirmed via search of the awesome list and GitHub topic. No
  executable class admitted.
- **Miro/Avanscoperta starter-kit templates** — proprietary downloadable assets, not
  storable normative text; their grammar content is fully covered by rows 1-2. Pointer kept
  in the official-reference file.

## Authority alignment (who wins on overlapping concepts)

The admitted sources do **not contradict** each other on the formalism. Where they overlap,
the authority order is:

1. **Core grammar & element definitions (event, command, policy, read model, actor, system,
   hotspot, aggregate/constraint) and the cause-effect chain** →
   **Brandolini's book (row 5)** is the canonical authority *in principle*; because it is
   commercial + partly unfinished, the operative gatherable authorities are the
   **ddd-crew glossary (row 1)** for per-element colour/definition and **Brandolini's 2022
   process-modelling article (row 2)** for how elements cascade. Rows 1 and 2 agree.

2. **The three formats (Big Picture / Process Modelling / Software Design) and their
   purposes** → **eventstorming.com (row 4)** and the **ddd-crew glossary (row 1)** are the
   authority; they agree.

3. **Terminology currency note (one resolved nuance, not a contradiction):** The word
   **"Aggregate"** is now treated as a *legacy* term in EventStorming; the current sticky is
   the **"Constraint"** (big yellow), per the ddd-crew glossary (row 1, current). The 2013
   original post (row 3) and older texts still say "Aggregate." **Row 1 wins** on current
   terminology; row 3 is retained only as historical origin. Downstream, the *aggregates*
   skill (#3 of the pipeline) consumes whichever name fits its own ubiquitous language — out
   of scope here.

4. **Facilitation mechanics** → ddd-crew cheat-sheet (row 1) and Rayner's Handbook (row 6,
   cite-only) are complementary; no conflict. Rayner is secondary and not load-bearing for
   the formalism.

## Double-check (newest-available re-verification, 2026-06-04)

- Row 1: ddd-crew repo latest master commit = 2024-06-06; no newer release, successor repo,
  or superseding official glossary found. CURRENT.
- Row 2: Medium article (2022-08-30) is Brandolini's latest standalone public process-modelling
  write-up; no newer revision found. CURRENT.
- Row 3: 2013 post — intentionally retained as historical; explicitly not the current
  authority. CONFIRMED HISTORICAL.
- Row 4: eventstorming.com shows ©2025 footer; still the live official site. CURRENT.
- Row 5: Leanpub book — perpetual draft, still the only/canonical edition; no superseding
  paper edition published yet. CURRENT (incomplete by design).
- Row 6: Leanpub Handbook — still the current digital edition. CURRENT.
