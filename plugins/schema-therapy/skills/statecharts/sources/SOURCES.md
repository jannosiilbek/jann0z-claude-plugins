# Statecharts / SCXML — Source-of-Truth Library

Provenance index for the `statecharts` skill (skill #5 of the `schema-therapy`
pipeline). This file records **provenance only** — no distilled content. All
validation performed **2026-06-04**.

The skill emits one SCXML state machine per qualifying entity to
`specs/05-statecharts/<entity>.scxml`. Downstream build steps need an executable
oracle, so this library admits both **normative documents** and **executable
materials** (the W3C conformance test suite plus an SCXML interpreter).

## Admitted sources

| Title | Version / Edition | Publication status | Publication date | Canonical URL | Class | Validated |
|-------|-------------------|--------------------|------------------|---------------|-------|-----------|
| State Chart XML (SCXML): State Machine Notation for Control Abstraction | `REC-scxml-20150901` (1.0) | W3C Recommendation (current; not superseded) | 2015-09-01 | https://www.w3.org/TR/scxml/ | gatherable | 2026-06-04 |
| SCXML Recommendation — Errata | Living errata page | W3C errata (normative corrections) | last updated post-2015 | https://www.w3.org/2015/08/scxml-errata.html | gatherable | 2026-06-04 |
| Harel, D. — *Statecharts: A Visual Formalism for Complex Systems* | Original, *Science of Computer Programming* 8(3):231–274 | Published peer-reviewed paper (author-distributed PDF) | 1987-06 | https://www.sciencedirect.com/science/article/pii/0167642387900359 | gatherable | 2026-06-04 |
| W3C SCXML 1.0 Implementation Report Plan (IRP) — assertion/test manifest | IRP for the 2014 Candidate Recommendation | W3C conformance test suite (manifest + `.txml` templates) | 2013–2015 (manifest last-modified 2015-03-10) | https://www.w3.org/Voice/2013/scxml-irp/ | executable | 2026-06-04 |
| SCION — StateCharts Interpretation and Optimization eNgine | `@scion-scxml/core` 2.6.24 / `@scion-scxml/scxml` 4.3.27 (monorepo) | npm package; **maintenance dormant** (see notes) | last npm publish 2021-07-04; last monorepo commit 2021-05-16 | https://gitlab.com/scion-scxml/scion | executable | 2026-06-04 |
| statecharts.dev — glossary & concept pages | Living site (no versioning) | Community reference site (**no declared content license** — see Exclusions) | content current (repo pushed 2025-07-12) | https://statecharts.dev/ | cite-only | 2026-06-04 |
| XState — documentation | v5 | Library docs (implementation only) | v5 GA 2023-12 | https://stately.ai/docs | cite-only | 2026-06-04 |
| Harel, D. & Politi, M. — *Modeling Reactive Systems with Statecharts* | McGraw-Hill, 1998 | Commercial book | 1998 | https://www.wisdom.weizmann.ac.il/~harel/reactive_systems.html | cite-only | 2026-06-04 |

## Gathered files (relative links)

- [Harel 1987 paper (PDF, 44 pp)](gathered/harel-1987-statecharts-visual-formalism.pdf) — author-distributed copy via state-machine.com (`Harel87.pdf`); identical content also mirrored at dubroy.com.
- [W3C SCXML Recommendation (HTML)](gathered/w3c-scxml-recommendation-2015.html) — full `REC-scxml-20150901`, stored under the W3C Document License (copies permitted).
- [W3C SCXML Errata (HTML)](gathered/w3c-scxml-errata.html) — normative corrections to the Recommendation.
- [W3C IRP — assertion/test manifest](gathered/w3c-irp-tests/manifest.xml) — full machine-readable manifest mapping every normative assertion to its conformance test(s).
- [W3C IRP — plan index (HTML)](gathered/w3c-irp-tests/irp-plan-index.html) — the IRP landing page (test format, `.txml` templating conventions, run procedure).
- Representative IRP conformance tests (`.txml` templates) under [gathered/w3c-irp-tests/](gathered/w3c-irp-tests/):
  - `test355.txml` — default initial state = first in document order
  - `test144.txml` — internal event queue ordering (FIFO by raise order)
  - `test403a.txml` — optimal-enablement / transition-conflict resolution by document order
  - `test570.txml` — `done.state.id` generated when a parallel state's children all reach final
  - `test576.txml` — `<scxml initial=…>` attribute respected
  - `test579.txml` — default history content executed correctly
  - `test580.txml` — a history pseudo-state never appears in the configuration
- [statecharts.dev — glossary index](gathered/statecharts-dev/glossary-index.html) — stored as a *reference snapshot only* (see license caveat in Exclusions).
- [statecharts.dev — "What is a statechart?"](gathered/statecharts-dev/what-is-a-statechart.html) — reference snapshot only.

> **`.txml` note:** IRP tests are *templates*. `conf:`-namespaced attributes
> (e.g. `conf:targetpass`, `conf:datamodel`) are substituted per datamodel
> (null / ecmascript / xpath) to produce runnable `.scxml`. The full suite
> (~200 numbered tests, several with `a`/`b`/`c` variants) is retrievable from
> the manifest at the canonical URL above; only a representative slice is stored
> here. Full retrieval coordinate: `https://www.w3.org/Voice/2013/scxml-irp/<id>/test<id>.txml`.

## Validation notes

- **SCXML Recommendation is current.** Header confirms *This Version* =
  `http://www.w3.org/TR/2015/REC-scxml-20150901/`, *Latest Version* =
  `https://www.w3.org/TR/scxml/`, status "W3C Recommendation 1 September 2015".
  Publication history (w3.org/standards/history/scxml) lists **no edition after
  2015-09-01**; no superseding document. Errata page exists and may carry
  normative corrections — treated as part of the normative source.
- **SCION versions pinned.** Legacy npm `scion`/`scxml` top out at 5.0.4
  (2018-10-08). The maintained line moved to the GitLab `@scion-scxml` monorepo:
  `@scion-scxml/core` **2.6.24** and `@scion-scxml/scxml` **4.3.27**, both last
  published **2021-07-04**; last monorepo commit **2021-05-16** (Jacob Beard).
  **Maintenance status: dormant** (no releases or commits in ~5 years). It is
  still the most complete pure-JS SCXML interpreter and historically the IRP
  reference implementation, so it is admitted as the executable oracle with an
  explicit staleness flag. If a live interpreter is later required, Apache
  Commons SCXML (Java; 2.0 still pre-release / milestone) or uSCXML (C/C++) are
  the maintained fallbacks — recorded in Exclusions, not admitted now.
- **statecharts.dev currency.** Source repo (`statecharts/statecharts.github.io`)
  last pushed 2025-07-12 — content is current. **However it ships no LICENSE
  file** and the site declares no content license, so it is downgraded from
  freely-gatherable to **cite-only**; the two stored HTML pages are kept as
  small reference snapshots, not as redistributable corpus.
- **XState** is implementation-only and explicitly non-normative: its own docs
  describe it as *compatible with* SCXML, and v5 deliberately dropped parts of
  SCXML event semantics (`_event.origin` / SCXML events). Cite-only.

## Exclusions

| Material | Reason for rejection |
|----------|----------------------|
| XState docs (stately.ai/docs) | Implementation target, **not normative**. Self-described as SCXML-*compatible*, and v5 dropped SCXML event semantics. Admitted cite-only for mapping examples; never an authority on semantics. |
| Harel & Politi, *Modeling Reactive Systems with Statecharts* (1998) | Commercial book, no open full text. Cite-only; the 1987 paper already covers the formalism's normative concepts. |
| statecharts.dev pages as gatherable corpus | No declared content license / no LICENSE in the source repo. Cannot be admitted as redistributable text; kept as cite-only reference snapshots with attribution. |
| Stately.ai blog / "state machines and statecharts" articles | Vendor educational content, secondary to the W3C Rec and Harel. Redundant. |
| Apache Commons SCXML (Java) | Maintained alternative interpreter, but 2.0 is still pre-release (alpha / `2.0-M0` milestone); JVM dependency is heavier than the JS oracle. Recorded as fallback, **not admitted** unless SCION proves unusable. |
| uSCXML (tklab-tud / alexzhornyak forks, C/C++) | Maintained native interpreter with multi-language bindings, but native build toolchain is a heavy dependency for this pipeline. Fallback only. |
| Qt SCXML Engine | Requires the Qt framework; impractical as a lightweight oracle. Fallback only. |
| scxmlrun, LXSC, JSSCxml, PySCXML, SCXML4Flex, etc. | Niche or inactive (last source change >2 yrs). Not competitive with SCION for completeness/IRP coverage. |
| Wikipedia "SCXML" article | Useful for discovery only; its "active implementations" list is itself stale (lists SCION as active despite its 2021 dormancy). Not an authority. |
| academia.edu / semanticscholar / archive.org copies of Harel 1987 | Duplicate copies of the admitted paper; the author-distributed PDF (state-machine.com) is the cleaner canonical store. |
| ScienceDirect copy of Harel 1987 | Paywalled publisher version. Canonical *citation* URL recorded in the table; the open author PDF is the stored artifact. |

## Authority alignment

1. **W3C SCXML Recommendation (`REC-scxml-20150901`) + its Errata** — the single
   **normative authority for SCXML syntax and execution semantics** (the
   Algorithm for SCXML Interpretation, microstep/macrostep semantics, event
   queues, `<parallel>`, `<history>`, `<datamodel>`, transition selection /
   optimal enablement). When any other source conflicts on *what the machine
   does*, the Rec wins.
2. **W3C SCXML IRP test suite** — the **executable expression of (1)**. Each
   `.txml` encodes a normative assertion; passing the suite *is* conformance.
   This is the oracle for validating generated `.scxml`.
3. **Harel 1987** — **normative for the formalism's concepts** (hierarchy /
   XOR-AND state decomposition, orthogonality/concurrency, broadcast
   communication, history, depth). Authority on *why* statecharts are shaped as
   they are and on terminology that predates SCXML. Does **not** override the
   W3C Rec on SCXML-specific execution semantics.
4. **statecharts.dev** — **community glossary / conceptual reference only**.
   Helpful for plain-language definitions; never overrides 1–3, and carries a
   license caveat (cite-only).
5. **XState docs** — **implementation reference only**. May inform how concepts
   map to a real library, but is not an authority on SCXML semantics.

### Contradictions found & ruling

- **Wikipedia vs. reality on SCION's status.** Wikipedia lists SCION as an
  *active* implementation (its cutoff is "last change >2 years ago"), but npm +
  GitLab evidence shows SCION's last release/commit was 2021 — **dormant** by a
  2026 vantage. **Ruling:** trust the primary registry/VCS evidence; admit SCION
  with an explicit staleness flag, not Wikipedia's "active" label.
- No semantic contradiction found between Harel 1987 and the W3C Rec; the Rec
  refines and operationalizes Harel's formalism rather than contradicting it.
  Where granularity differs (e.g. precise microstep ordering), the **Rec
  governs** for SCXML output.

## Concerns

- **Executable oracle is dormant.** SCION has had no maintenance since 2021.
  It still runs and was the IRP reference implementation, but a build step
  depending on it should pin exact versions (`@scion-scxml/core@2.6.24`,
  `@scion-scxml/scxml@4.3.27`) and budget for a fallback to Apache Commons SCXML
  or uSCXML if a modern Node toolchain breaks it.
- **Partial test slice stored.** Only 7 representative `.txml` tests are stored
  locally; the full ~200-test suite must be pulled from the W3C IRP URL at build
  time. The manifest (stored) is the authoritative index for that retrieval.
- **statecharts.dev license gap.** Treated cite-only out of caution; if the
  pipeline ever needs to redistribute its text, confirm licensing with the
  maintainers first.
