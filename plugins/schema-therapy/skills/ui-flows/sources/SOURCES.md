# Sources — `ui-flows` (Skill #9, schema-therapy)

Grounded source-of-truth library for turning the domain model (02 glossary, 04 DBML + transition
tables, 05 SCXML), personas (07) and task models (08, KLM budgets) into per-persona IFML models at
`specs/09-ui-flows/<persona>.xml`. Authority for IFML = the OMG specification; authority for the
machine shape = the OMG metamodel XMI (mirrored by the community moddle JSON schema).

**Validation date for every row below: 2026-06-04.**

## Provenance rows

| Title | Version/Edition | Publication status | Publication date | Canonical URL | Class |
|---|---|---|---|---|---|
| Interaction Flow Modeling Language (IFML) Specification | 1.0 (doc `formal/15-02-05`) | OMG formal/published, current | 2015-02 (adopted 2014-03) | https://www.omg.org/spec/IFML/1.0/PDF | **gathered** → `ifml-1.0-formal-15-02-05.pdf` |
| IFML 1.0 Metamodel — XMI (UML/MOF) | 1.0 (`ptc/14-03-16`, ns `20140301`) | OMG normative machine artifact | 2014-03 | https://www.omg.org/spec/IFML/20140301/IFML-Metamodel.xmi | **gathered** → `IFML-Metamodel.xmi` |
| IFML Ecore metamodel (Eclipse IFML editor) | repo @ commit `fb9be76` | Open source (MIT), community impl. of OMG MM | committed 2014-12-02 | https://github.com/ifml/ifml-editor/blob/fb9be768890fa981ec55dd6b0aaad22c280da019/plugins/IFMLEditor/model/IFML-Metamodel.ecore | **gathered** → `IFML-Metamodel.ecore` (+ `.genmodel`) |
| `ifml-moddle` IFML metamodel — moddle JSON schema | npm `0.3.1` | Open source (MIT), community moddle wrapper | 2023-06-21 | https://www.npmjs.com/package/ifml-moddle | **gathered** → `ifml-moddle.schema.json` (+ `ifml-moddle.ifmldi.schema.json`, `ifml-moddle.LICENSE`) |
| Brambilla & Fraternali, *Interaction Flow Modeling Language: Model-Driven UI Engineering of Web and Mobile Apps with IFML* | 1st ed. | Commercial (Morgan Kaufmann) | 2014 | https://www.sciencedirect.com/book/9780128001080 | **cite-only** (copyright; pedagogical) |
| Nielsen — 10 Usability Heuristics for User Interface Design | 1994, rev. 2024 | Web article (NN/g) | 1994-04-24 (orig.) | https://www.nngroup.com/articles/ten-usability-heuristics/ | **cite-only** (NN/g copyright; heuristic review only) |
| Nielsen Norman Group — task-flow / heuristic-evaluation canon | — | Web articles (NN/g) | various | https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ | **cite-only** (NN/g copyright) |

## Gathered files (relative links)

- [`ifml-1.0-formal-15-02-05.pdf`](./ifml-1.0-formal-15-02-05.pdf) — OMG IFML 1.0 normative spec, complete (17 pp; compact metamodel spec, single PDF per OMG About-IFML).
- [`IFML-Metamodel.xmi`](./IFML-Metamodel.xmi) — OMG normative metamodel (UML/MOF XMI). 77+ classes; `ViewContainer`, `ViewComponent`, `InteractionFlow`, `Event`, `Action`, `ParameterBinding`, etc.
- [`IFML-Metamodel.ecore`](./IFML-Metamodel.ecore) — Eclipse EMF Ecore form (pinned commit `fb9be76`).
- [`IFML-Metamodel.genmodel`](./IFML-Metamodel.genmodel) — EMF genmodel companion (pinned commit `fb9be76`).
- [`ifml-moddle.schema.json`](./ifml-moddle.schema.json) — moddle JSON descriptor of the IFML metamodel (77 types; strict type names + superclasses + properties). Convenient machine-readable conformance reference for a hand-rolled reader. MIT.
- [`ifml-moddle.ifmldi.schema.json`](./ifml-moddle.ifmldi.schema.json) — IFML Diagram Interchange schema (moddle JSON). MIT.
- [`ifml-moddle.LICENSE`](./ifml-moddle.LICENSE) — MIT license for the moddle artifacts.
- [`PROBE-transcript.md`](./PROBE-transcript.md) — full empirical tooling-probe evidence.

## Exclusions

- **WebRatio docs** — commercial IFML implementation; closed/ToS-restricted. Excluded (not gathered, not authoritative).
- **`ifml-js` / `ifml-font` / `direwolf-ifml-elements`** (npm) — browser modeler / icon font / UI-element libs; no headless validation. Excluded as tooling; not source authorities.
- **Eclipse IFML editor as a *validator*** — Sirius/EMF GUI app, no headless mode (see Probe). Its metamodel files ARE gathered (conformance reference); the runnable editor is excluded.
- **Sparx Enterprise Architect IFML pages, Business Process Incubator, third-party blogs** — secondary/commercial summaries; superseded by the OMG normative PDF. Cite-only at most; not stored.
- **Brambilla & Fraternali book** & **NN/g articles** — copyrighted; cite-only, not stored.

## Authority alignment

1. **OMG IFML 1.0 spec PDF** (`formal/15-02-05`) — *normative* for the language: concepts, semantics,
   notation, the exact `ViewContainer`/`ViewComponent`/`Event`/`Action`/`InteractionFlow`/`ParameterBinding`
   vocabulary the skill must emit and annotate.
2. **OMG Metamodel XMI** (`ptc/14-03-16`) — *normative for the machine shape*: the authoritative
   class/association/property structure the pinned IFML-XMI subset reader validates against.
3. **Ecore/genmodel + `ifml-moddle.schema.json`** — *secondary machine references* (MIT). Same
   metamodel in EMF and JSON form; convenient for a hand-rolled reader. Subordinate to the OMG XMI on
   any conflict.
4. **Brambilla & Fraternali book** — *pedagogical* only (patterns, worked examples). Never overrides
   the spec.
5. **NN/g heuristics** — *heuristic-review lens* only (e.g. sanity-checking persona flows against
   usability principles); never a source of IFML structure.

## Validation notes

- **Version currency:** IFML **1.0** (`formal/15-02-05`, adopted 2014-03, published 2015-02) is the
  sole and current OMG formal version. No 1.1+ exists — confirmed via the OMG spec catalog
  (https://www.omg.org/spec/IFML/), the OMG issue tracker, and ifml.org news (latest milestone = "1.0
  approved by OMG board"). Double-checked 2026-06-04: still newest available.
- **Metamodel provenance pinned** to ifml-editor commit `fb9be768890fa981ec55dd6b0aaad22c280da019`
  (2014-12-02), MIT. moddle schema pinned to `ifml-moddle@0.3.1` (2023-06-21), MIT.
- **No contradictions** found between the OMG PDF, the OMG XMI, the Ecore, and the moddle JSON on
  core class names/superclasses/properties (spot-checked `ViewContainer` → superclass `ViewElement`,
  props `isLandmark/isDefault/isXOR/viewElements/actions` — consistent across all four). Ruling:
  none needed; the four agree. Where the moddle dialect differs from OMG XMI it is *serialization*,
  not *metamodel*, divergence (see Probe).

## Probe (empirical) — verdict + evidence

**Verdict: NO scriptable validator ingests genuine OMG IFML-XMI.** The oracle must be a hand-rolled
reader/validator for a pinned IFML-XMI subset; the gathered metamodel files (OMG XMI/Ecore + moddle
JSON) are the conformance reference for the machine shape.

Evidence (full transcript in [`PROBE-transcript.md`](./PROBE-transcript.md)):
- **npm** `ifml` → E404. Only relevant hit `ifml-moddle@0.3.1` (browser/Node moddle wrapper).
- **PyPI** `ifml` → HTTP 404. No pip validator.
- **Eclipse IFML editor** → GUI-only (Sirius/EMF), last touched 2015, no headless/CLI validation.
- **`ifml-moddle` deep probe** (installed clean, Node 24):
  - `moddle.create('ifml:ViewContainer')` ✓ ; `moddle.create('ifml:Nope')` → THREW `unknown type`
    ⇒ schema is strict for *type construction* → usable as a **type/shape reference**.
  - `fromXML()` on the package's own README example → 2 "unexpected element" **warnings**, no fatal
    error, partial tree; a bogus model also "parsed" with a warning; even a trivial native
    round-trip emits 1 warning. moddle uses a bespoke single-root attribute dialect, NOT OMG XMI
    multi-root `<xmi:XMI>`/`xmi:id`/association structure. It **parses leniently, it does not
    validate conformance.** ⇒ disqualified as the oracle, retained as a conformance reference.
