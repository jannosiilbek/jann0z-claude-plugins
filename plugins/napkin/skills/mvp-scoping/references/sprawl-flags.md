# Sprawl flags — what pushes an MVP spec to 🔴

Each flag adds pressure toward "sprawling." Counting rules:
- **0-1 hits** → 🟢 (still crisp)
- **2 hits** → 🟡 (workable but expect spec friction)
- **3+ hits** → 🔴 (sprawling, find the wedge)

## 1. Regulatory frameworks with version drift

Sprawling by definition — the regulation itself branches by sector, jurisdiction, or version:

- **NIS2** — 10+ sectors, 27 national transpositions, evidence schemas vary per regulator
- **GDPR** — Article 6 lawful bases × Article 9 special categories × DPIA branching × cross-border data flows
- **HIPAA** — covered entity rules × business associate agreements × state-level overlays
- **PCI-DSS as a product** — different requirement levels (1-4), service-provider vs. merchant variants
- **SOX** — Sections 302/404/409 each have different scoping by company size
- **ESG / CSRD / SFDR** — taxonomy alignment varies by sector, double materiality assessment
- **AI Act (EU)** — risk tiers (prohibited / high / limited / minimal) each have separate compliance paths

**The pattern:** the regulation isn't one spec; it's an N-dimensional matrix. Picking the matrix as your product = specing N products.

## 2. Feature-rich incumbents customers benchmark against

If buyers will mentally compare you to one of these, they expect parity on day 1:

| Category | Incumbents | Approximate feature count expected |
|---|---|---|
| CRM | Salesforce, HubSpot | 200+ |
| Accounting | QuickBooks, NetSuite, Xero | 150+ |
| HRIS | Workday, BambooHR, Rippling | 100+ |
| EHR | Epic, Cerner, athenahealth | 200+ |
| ERP | SAP, NetSuite, Microsoft Dynamics | 300+ |
| Compliance / GRC | Vanta, Drata, Secureframe | 80+ |
| Marketing automation | Marketo, HubSpot, Pardot | 100+ |
| DevOps platforms | GitLab, GitHub, Atlassian | 200+ |
| Project management | Asana, Monday, ClickUp | 100+ |

**The fix:** wedge to a single feature these don't do well (or at all) for a narrow persona. "QuickBooks for X" loses; "Bank reconciliation for crypto-paid freelancers" wins.

## 3. Multi-role branching flows

If your product has multiple user roles AND each role has a different *primary flow* (not just different permissions on the same flow), you're building multiple products at once:

- Two-sided marketplaces (supply + demand each have their own onboarding/management UX)
- Agency tools (agency admin + agency analyst + client + client viewer)
- Healthcare (provider + patient + admin + biller + family caregiver)
- Education (teacher + student + parent + admin)
- Legal (attorney + paralegal + client + opposing counsel)
- Property management (landlord + tenant + maintenance + accountant)

**Rule of thumb:** if you can't fit all roles' primary flows on one whiteboard, this is a 🔴 unless you sell to one role only.

## 4. Audit / evidence / reporting variance

If the output format must vary by buyer's regulator, sector, or auditor, you're building a workflow engine, not a product:

- "Auditor-ready" reports that mean different things per auditor
- "Compliance evidence" with no standard schema (varies per assessor)
- "Financial filings" — different per jurisdiction and entity type
- "Medical reports" — vary by payer, by specialty, by jurisdiction
- "Tax documents" — every country has its own forms

## 5. "Configurable" as a value prop

When the pitch is "configurable rules / workflows / fields / pricing / reports", you're selling a no-code builder. Building no-code builders is a quarter+ project minimum:

- "Configurable approval workflows"
- "Custom report builder"
- "Flexible pricing rules engine"
- "Rule-based routing"
- "Custom fields per customer"
- "User-defined automations"

**The fix:** pick the 3 most common configurations and ship those as fixed flows. Sell "we do these 3 things well" not "configure us for your case."

## 6. Output requires expert review

If the v1 output is a document a human expert must review before it's usable (lawyer reviews the contract, doctor reviews the diagnosis, CPA reviews the filing), then:

1. You can't sell the output as standalone value
2. The expert is your real customer (sell to them, not the end-user)
3. Liability/E&O risk if you don't position correctly

**The fix:** sell to the expert as a *speed-up* tool ("draft contracts 10× faster"), not as a replacement for them.

## 7. Domain knowledge gating

If you can't read up on the domain in an afternoon (compliance frameworks, medical specialties, niche regulatory regimes, derivatives trading, clinical workflows), you'll either:

- Build the wrong thing and never know
- Need an expert co-founder
- Spend weeks on customer-discovery before any code

**The fix:** find a co-founder in the domain, or wedge to a sub-domain you already know.

## 8. "It depends on the customer" for core flows

When describing how the product works and you find yourself saying "well, it depends on the customer" for the *core* flow, you're describing a consulting engagement, not a product.

**The fix:** pick ONE customer profile and design for them. The next customer profile is v2 (or never).

## Counting examples

- **"NIS2 compliance suite"** — hits flags 1 (NIS2), 2 (vs. Vanta/Drata), 3 (CISO + auditor + dept-head roles), 4 (audit evidence variance), 7 (deep compliance domain). **5 hits → 🔴 sprawling.**
- **"NIS2 supplier-questionnaire generator for Estonian energy MSPs"** — hits flag 1 (NIS2 still in scope) but only for one piece, no incumbent parity expectation, single role (compliance manager). **1 hit → 🟢 crisp.**
- **"AI meeting notes for sales calls"** — hits flag 2 (Gong, Fireflies, Otter loom large). **1 hit → 🟢 (assuming you have a real wedge angle within that flag).**
- **"Practice management for therapists"** — hits flag 2 (SimplePractice, Jane), flag 3 (provider + admin + patient + biller), flag 4 (insurance claim variance), flag 7 (insurance billing domain). **4 hits → 🔴.**
