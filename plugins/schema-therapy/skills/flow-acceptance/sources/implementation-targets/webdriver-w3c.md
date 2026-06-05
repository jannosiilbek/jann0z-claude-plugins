# W3C WebDriver — implementation-target record

> Class: **cite-only / implementation-target.** NOT normative for the flow-acceptance artifact.
> The `.feature` files this skill emits are declarative Gherkin; WebDriver is recorded here only as
> the standard browser-command vocabulary a *downstream automation layer* (step definitions) may bind
> the screen-walk to. It is cited so the skill knows the realised-flow steps map to a real,
> standardised driver protocol — never so the skill writes WebDriver verbs into scenarios.
> Validation date: 2026-06-04.

## WebDriver Level 1 — the stable Recommendation (primary citation)

- Title: **WebDriver — Level 1**
- Status: **W3C Recommendation**
- This version: <https://www.w3.org/TR/2018/REC-webdriver1-20180605/>
- Latest published: <https://www.w3.org/TR/webdriver1/>
- Recommendation date: **5 June 2018**
- License: W3C Document License (free to store/redistribute with notice).

Defines the wire protocol and the command set that browser automation realises a flow with:
navigate (Go), element retrieval (Find Element / Find Elements by locator strategies incl. CSS
selector), element interaction (Element Click, Element Clear, Element Send Keys), state retrieval
(Get Element Text, Is Element Selected, Get Element Attribute/Property), and navigation/session
lifecycle. This is the standardised "step canon" the realised screen-walk ultimately compiles down to.

## WebDriver — Level 2 / BiDi era (newest, but not yet Recommendation)

- Title: **WebDriver — Level 2** (a.k.a. the BiDirectional-protocol-era revision)
- Status: **W3C Working Draft** (newest available; *not* a Recommendation)
- This version: <https://www.w3.org/TR/2026/WD-webdriver2-20260528/>
- Latest published: <https://www.w3.org/TR/webdriver2/>
- Draft date: **28 May 2026**

Recorded for currency double-check: Level 2 is actively drafted (latest WD 2026-05-28) but has NOT
reached Recommendation. For a *stable* citation the skill should reference **Level 1 (2018 REC)**;
Level 2 is noted as the live successor. Both are implementation-target context only.
