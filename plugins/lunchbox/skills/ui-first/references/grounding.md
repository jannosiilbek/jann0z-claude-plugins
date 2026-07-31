# Grounding lookup

Two web-grounded subagents that establish, from external evidence, the two things no
upstream artifact owns and no interview reliably produces: an actor's **cited obligations**
(the rare-but-critical work that earns a guaranteed path) and the **user's own nouns** in
the market's language. Read this before running the lookup. The gate that decides whether
it runs at all lives in SKILL.md's Intake section.

The lookup establishes **evidence**, never structure, and never the design. It does not ask
what should be first-class — that is this skill's own deliverable, and asking research for
it hands the model its own answer back with a citation attached.

---

## Why it is scoped this narrowly

Measured yield, across a common English-language trade and a small-market regulated
back office:

| Field | Yield | Consequence |
|---|---|---|
| Obligations with cadence + recipient + penalty | high in both | the lookup's primary product |
| User's own nouns | low in the common domain (vendor-captured search results), high in the small-market one | market-language nouns are the second product; English-language vocabulary is mostly vendor copy |
| Task existence | good, from employer and price-list sources | admissible, but never nav-eligible on its own |
| **Frequency** | poor — sources state cadence for regulated work and almost nothing else | **never `cited` without a verbatim rate** |
| **Criticality** | poor — essentially never stated, only inferable from consequence language | **never `cited` without a verbatim consequence** |
| Work environment, device, posture | poor and vendor-authored | out of scope |
| "Ideal workflow", "what must be first-class" | none | out of scope |

Frequency and criticality are the two columns nav slots are allocated by, and they are the
two least evidenced fields. A researched guess placed in a table beside real citations is
harder to challenge than an honest assumption, not easier. That asymmetry is the whole
reason for the per-cell provenance rule below.

---

## Prior-art firewall

Isolation, not instruction. Raw pages, product copy, screenshots, and IA diagrams stay
inside the subagents. The parent session receives only the tables and the `Not found` list.
A label cannot be un-seen; and unlike the domain model — which enters at design step 4 under
licence, after nav is drafted — there is no later step at which vendor navigation becomes
legitimate input.

An agent's return **must never contain**:

- any product's navigation item, sidebar entry, menu, tab, module, board, screen, or page name;
- any feature taxonomy, product tier, SKU, or add-on name;
- any structural recommendation — "the app should have an X screen", "the core modules are…", "best-practice IA for this category";
- any "every product in this category…" or "the industry standard is…" claim;
- any commercial product's proper noun in a table body.

Source class `vendor` may corroborate that an operation exists. It may never originate a
task, set a criticality, or supply a noun.

**Off-market rows are discarded, not downgraded.** Every row carries the market or
jurisdiction it was found in; a row from the wrong market is worse than no row, because it
reads as evidence while describing someone else's job.

There is no lexical denylist. `Schedule` is genuinely a dispatcher's word, and
`playbook.md`'s whose-word test already exempts coincidental matches. Enforcement is by
provenance and by isolation, not by banned strings.

---

## Source classes

Closed list; every row names one.

- `regulator` — statute, directive, agency guidance, licensing board, municipal or permitting authority, central bank, credit register. **The highest-yield class by a wide margin**, and the only one that reliably states a cadence, a recipient, and a penalty in the same document.
- `employer` — a job description published on the employing organisation's own domain; collective agreements; published internal process descriptions.
- `trade-body` — professional association material, certification or training syllabi, curricula.
- `price-list-or-terms` — a provider's own published fee schedule or standard terms. Underrated: every fee line is a discrete back-office operation someone performs often enough to price.
- `practitioner` — forum thread, interview, first-person account.
- `vendor` — any commercial product's own material. Corroboration only, per the firewall.

---

## The two agents

Spawn both in parallel, isolated, one mandate each, no shared state. No role-play personas:
all measured yield came from a handful of well-aimed queries, and a persona panel adds no
retrieval power while multiplying pressure to fill the grid.

### Agent 1 — Obligations

> Find every obligation the named actor carries that has (a) a stated cadence or deadline,
> (b) a named external recipient or authority, and (c) a stated consequence of failure.
> Search the stated market/jurisdiction, in its own language. Prefer `regulator`, then
> `trade-body`, then `employer`. Return each obligation with a verbatim quote from the
> source. A candidate missing any of the three parts is returned in a separate
> `partial` list, never as an obligation. Return the tables and the `Not found` list and
> nothing else — no page content, no product names, no recommendations.

### Agent 2 — Vocabulary and operations

> Find the operator's own nouns for the objects they handle, and the enumerable operations
> of the role, in the market's own language. Prefer `price-list-or-terms` and `employer`
> sources — a published fee schedule enumerates real operations, and an employer's own job
> description enumerates real duties. Return each noun with its source class and a verbatim
> quote. Return operations as candidate tasks only; do not assign a frequency or a
> criticality to any of them. Return the tables and the `Not found` list and nothing else —
> no page content, no product names, no recommendations.

---

## Provenance assignment

The four tokens and the nav-eligibility rule are defined in SKILL.md's output contracts.
This is how the lookup earns `cited`:

- A **task** cell is `cited` when a source states the actor performs it. Otherwise `assumed`.
- A **frequency** cell is `cited` **only when the source states a rate, cadence, or deadline verbatim** — "within 30 days of return to normal operating conditions", "monthly, at T+28 calendar days", "one call at a time". A rate the agent computed, estimated, or found plausible is `assumed`, even when the task itself is `cited`.
- A **criticality** cell is `cited` **only when the source states a consequence verbatim** — a penalty, a licence effect, a service cut-off. Inferred severity is `assumed`.

Task existence and cadence fabricate independently, which is why provenance is per cell and
not per row. A row reading `cited/assumed/assumed` is the normal, honest result.

A `cited` obligation carrying all three parts satisfies `playbook.md`'s rare-critical rule
as written and earns a **documented guaranteed path** immediately — via Direct access, or as
a tab on its parent object. It earns a **nav slot** only after the user promotes it to
`confirmed`.

A `cited` user noun may **name** a surface whose task is already `stated` or `confirmed`,
and fills the `User-facing name` column of the boundary translation table. It may never
originate a surface or a nav row: research supplies the label, never the justification.

---

## Not found

Every return ends with the fields the lookup could not evidence, per actor.

**An empty `Not found` list is a fabrication signal.** Discard that agent's return and re-run
it once; if the second return is also empty, treat the lookup as not run and say so. Given
how rarely sources state cadence outside regulated work, an honest return names frequency
almost every time.

Blocked domains, an empty result, or no research tool available are all reported exactly as
"not run", with the reason. Nothing is backfilled from the model's prior — that is the
failure this whole step exists to make visible.

---

## Budget and known dead ends

Roughly 4–8 searches and 3–5 fetches per agent. Both probes got their entire real yield
inside that budget; spending more produced vendor pages, not evidence.

Known dead ends — do not spend budget rediscovering them:

- **Reddit is refused outright** to this crawler (HTTP 400). Never name it as a source in a plan.
- **Trade forums are increasingly toll-walled** — vBulletin-era sites 307-redirect to an AI-crawler toll gate answering HTTP 402. Not a login wall; no workaround.
- **Job boards expire fast.** Aggregator postings for niche roles return 410/403 within weeks. Employer-hosted job-description PDFs on the organisation's own domain survive for years and are far richer.
- **Generic English queries drift occupations.** A search for a small-market role in English returns a differently-shaped job from a larger market, written in confident prose. Query in the market's language, or return nothing.
- **"Day in the life" and "ideal workflow" phrasings are vendor-capture magnets**, and in software-adjacent domains they also collide with engineering homonyms. Query the obligation or the fee, not the day.

---

## Worked return

```
### Cited obligations — Estonia (EU consumer & SME asset finance)
| Actor | Obligation | Cadence / deadline | External recipient | Consequence of failure | Source class | Verbatim |
| Back-office administrator | Credit-register reporting | monthly, T+28 calendar days | national central bank | supervisory finding | regulator | "…transmitted no later than the 28th calendar day…" |
| Compliance officer | Suspicious-transaction report | within 2 working days of detection | FIU | criminal liability | regulator | "…viivitamata, kuid mitte hiljem kui kahe tööpäeva jooksul…" |

### User nouns — Estonia
| Concept | User's word | Source class |
| payment holiday | maksepuhkus | price-list-or-terms |
| settlement statement | jäägitõend | price-list-or-terms |
| termination notice | ülesütlemisteade | price-list-or-terms |

Not found: back-office administrator — frequency for every non-regulated task; dealer agent — frequency, criticality.
```

Both obligation rows above are nav-*ineligible* until the user promotes them. They hold a
guaranteed path from the moment they are cited.
