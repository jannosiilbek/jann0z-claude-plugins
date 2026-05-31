# Curation signals — what to cut, split, or add

These are advisory, not arithmetic. There is no score and no tier. Use them in Phase 2 (and as a sanity
check at the end of Phase 1) to tell the user *which* feature to cut or split, and *where* a gap needs a
new feature. Always name the specific feature and the specific signal — never a vague "this seems
broad." The user decides; you apply.

---

## Signals to CUT or SPLIT a feature

### 1. The feature branches by sector / jurisdiction / version

A single feature whose output changes shape per regulator, country, or framework version is not one
feature — it's N. Common offenders: anything built on **NIS2** (10+ sectors, 27 transpositions),
**GDPR** sub-articles, **HIPAA** state overlays, **PCI-DSS** levels, **SOX** sections, **CSRD/ESG**
taxonomies, **EU AI Act** risk tiers. *Advice:* narrow to one sector/jurisdiction/version, or cut.

### 2. The feature only exists to match a feature-rich incumbent

If a feature is on the list because "Salesforce/Vanta/QuickBooks/Epic/SAP has it", you'll be compared on
parity you can't win. Incumbents and rough parity expectations:

| Category | Incumbents | Parity features expected |
|---|---|---|
| CRM | Salesforce, HubSpot | 200+ |
| Accounting | QuickBooks, NetSuite, Xero | 150+ |
| HRIS | Workday, BambooHR, Rippling | 100+ |
| EHR | Epic, Cerner, athenahealth | 200+ |
| ERP | SAP, NetSuite, Dynamics | 300+ |
| Compliance / GRC | Vanta, Drata, Secureframe | 80+ |
| Project management | Asana, Monday, ClickUp | 100+ |

*Advice:* cut parity features; keep only the one thing the incumbent does badly for your narrow persona.

### 3. The feature needs a second user role with its own flow

If a feature implies a different primary flow for a different role (supplier *and* buyer, provider *and*
patient, teacher *and* parent), it's two products' worth of UX. *Advice:* keep the feature for one role;
the other role's version is a later feature or never.

### 4. The output must be reviewed by an expert before it's usable

If a lawyer/doctor/CPA must sign off before the output has value (contract, diagnosis, filing), you
can't sell the output standalone. *Advice:* reframe the feature as a *speed-up for the expert* ("draft
10× faster"), not a replacement — or cut.

### 5. "Configurable" is doing the work

A feature pitched as "configurable rules / custom report builder / flexible workflow / user-defined
fields" is a no-code builder — a quarter+ project. *Advice:* split into the 3 most common fixed flows
and list those; drop the builder.

### 6. "It depends on the customer"

If you can't describe the feature's In → Out without "it depends on the customer", it's a consulting
engagement, not a feature. *Advice:* pick one customer profile, define the feature for them, cut the
rest.

### 7. The feature needs domain knowledge you can't acquire in an afternoon

Deep compliance, clinical workflows, derivatives, niche regulation. *Advice:* wedge to a sub-domain you
know, or cut until you have a domain co-founder.

---

## Signal to ADD a feature

### A gap in the core job

Walk the brief's core job end to end as a user would. If there's a necessary step *between* two listed
features that no feature covers — the user would hit a dead end — propose a feature for that gap. Name
the gap ("nothing turns the matched ledger into something the bookkeeper can hand to a client") and
propose the feature in the template. Don't add it until the user says yes.

Be conservative: only propose adds that the brief's core job genuinely requires. A "nice to have" that
the brief doesn't imply is scope creep — leave it off.

---

## Worked examples (cut vs. keep)

- **"NIS2 compliance management"** as one feature → trips signals 1, 2, 3, 7. *Advice:* cut; replace
  with "Generate NIS2 supplier-risk questionnaire" for one sector/role (clean, atomic).
- **"Configurable approval workflows"** → trips signal 5. *Advice:* split into the 2–3 fixed approval
  flows actually needed.
- **"Practice management"** for therapists → trips 2 (SimplePractice), 3 (provider+admin+patient+biller),
  4 (insurance review). *Advice:* cut to one atomic feature, e.g. "Generate insurance superbill" for one
  role.
- **"AI meeting notes for sales calls"** → trips signal 2 (Gong, Fireflies) only. *Advice:* keep if it
  does one thing those do badly for a narrow persona; otherwise reconsider.
