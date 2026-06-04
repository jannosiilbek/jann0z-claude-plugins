# Empirical tooling probe — IFML headless validator hunt

**Date:** 2026-06-04 · **Probe dir:** `/tmp/ifml-probe` · **Node:** v24.13.0 · **Python:** 3.9.6 · **pip:** 21.2.4

Goal: find a runnable, headless IFML validator (npm / pip / standalone CLI) that ingests a
genuine OMG **IFML-XMI** model and reports conformance. Honest expected outcome: none exists;
oracle becomes a hand-rolled reader for a pinned IFML-XMI subset, with the metamodel files
(Ecore + moddle JSON) as the machine-shape conformance reference.

---

## 1. Registry sweep

### npm
- `npm view ifml version` → **E404** (no package named `ifml`).
- `npm search ifml` → real hits, all authored by community modelers (not OMG):
  - `ifml-js` 0.3.0 (2023-04-07) — "A IFML toolkit and web modeler" (browser modeler, not a CLI validator)
  - `ifml-moddle` 0.3.1 (2023-06-21) — "A moddle wrapper for IFML" (deps: `moddle-id`, `moddle-xmi`, `min-dash`) ← only credible validator lead
  - `ifml-font`, `ifml-js-types`, `direwolf-ifml-elements` — irrelevant (icons / types / UI elements)

### PyPI
- `GET https://pypi.org/pypi/ifml/json` → **HTTP 404** (no `ifml` PyPI package).

### Eclipse IFML editor headless prospects
- `github.com/ifml/ifml-editor` — Sirius/EMF GUI editor, **MIT**, last pushed **2015-08-26**, 44 commits.
  README documents no headless/CLI validation mode. Sirius is a GUI diagram runtime; driving it
  headlessly would require a full Eclipse/EMF RCP harness — out of scope and unrealistic for the
  skill harness. **Rejected as a runnable validator.** Its `.ecore`/`.genmodel` are kept as
  conformance reference only.

---

## 2. Deep probe of the one lead: `ifml-moddle@0.3.1`

Installed clean in an isolated dir:

```
$ mkdir moddle-test && cd moddle-test && npm init -y
$ npm install ifml-moddle moddle moddle-xmi
added 10 packages, audited 11 packages, 0 vulnerabilities
```

Ships moddle JSON schema descriptors under `resources/ifml/json/`:
`ifml.json` (the metamodel), `ifmldi.json`, `di.json`, `uml.json`, `xmi.json`, `primitivetypes.json`.

### 2a. Schema fidelity — GOOD
`ifml.json`: name `IFML`, prefix `ifml`, uri `http://www.omg.org/spec/IFML/20140301`, **77 types**.
Spot-check `ViewContainer` → `superClass: [ViewElement]`, props `[isLandmark, isDefault, isXOR,
viewElements, actions]` — matches the OMG metamodel exactly. Root type `IFMLModel` present.

### 2b. `moddle.create()` — STRICT (usable as a type oracle)
```
CREATE ifml:ViewContainer { id:'C1' }   -> OK  ($type = ifml:ViewContainer)
CREATE ifml:Nope {}                      -> THREW: unknown type <ifml:Nope>
```
The schema rejects unknown types ⇒ the moddle JSON descriptor is a real machine-readable
conformance reference for type names / superclasses / properties.

### 2c. `fromXML()` reader — UNRELIABLE on real IFML-XMI (disqualifying)
Ran the README's own example through `fromXML(xml, 'xmi:XMI')`:
```
[VALID] PARSED root=xmi:XMI
[VALID] warnings=2
  - unparsable content <ifml:iFMLModel> detected ... unexpected element <ifml:iFMLModel>
  - unparsable content <ifmldi:iFMLDiagram> detected ... unexpected element <ifmldi:iFMLDiagram>
[BOGUS] PARSED root=xmi:XMI  (bogus model also "parsed", 1 warning)
```
Even a trivial native round-trip (`create ViewContainer` → `toXML` → `fromXML`) emits 1 warning:
```
<ifml:ViewContainer xmlns:ifml="..." name="Home" id="C1" />
re-read type: ifml:ViewContainer  warnings: 1
```
moddle uses a **bespoke single-root, attribute-flavored XML dialect** — it does NOT consume genuine
OMG XMI document structure (multi-root `<xmi:XMI>` with `xmi:id` + association elements). It also
does not *reject* malformed models; it downgrades to non-fatal warnings and emits a partial tree.
That is parsing, not validation.

---

## VERDICT

**No scriptable validator ingests genuine OMG IFML-XMI.** Confirmed across npm (E404 + only a
browser modeler + a lenient moddle wrapper), PyPI (404), and the Eclipse editor (GUI-only, 2015).

`ifml-moddle`'s `fromXML` is a lenient, dialect-specific parser, not a conformance validator — it
warns instead of failing and does not match OMG XMI structure. Its `create()` path *is* strict, and
its `ifml.json` schema faithfully mirrors the metamodel, so the schema is retained as a **conformance
reference** (alongside the OMG Ecore/genmodel/XMI), NOT as the oracle.

⇒ **Oracle = hand-rolled reader/validator for a pinned IFML-XMI subset grammar** (the simulation
contract pins the subset from the OMG spec). Conformance references for the machine shape:
`IFML-Metamodel.ecore` + `IFML-Metamodel.xmi` (OMG normative) and `ifml-moddle.schema.json`
(community, MIT — convenient JSON form of the same metamodel).

### Reproduction
```
mkdir -p /tmp/ifml-probe/moddle-test && cd /tmp/ifml-probe/moddle-test
npm init -y && npm install ifml-moddle moddle moddle-xmi
# then run the probe.mjs / probe2.mjs snippets shown above
```
