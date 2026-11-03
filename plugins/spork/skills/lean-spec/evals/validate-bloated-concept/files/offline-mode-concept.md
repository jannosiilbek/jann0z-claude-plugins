# Inspecto Offline Mode: Concept

**Status:** Concept for funding decision (next quarter)
**Audience:** Leadership, tech leads
**Date:** 2026-11-02

---

## 1. The decision we are asking for

Fund one quarter of work to let inspectors complete, sign and photograph inspections with no network connection, with everything syncing automatically once the device is back online.

The hard part isn't storing forms on the phone. It's keeping the legal guarantee intact: **once an inspector signs a form, that signed form can never be overwritten, by anyone, including the office.** This concept is built around that guarantee. If we can't deliver it, we shouldn't ship offline mode at all.

## 2. The problem

- Inspectors routinely work in basements, plant rooms and other places with no signal.
- Today, without signal they can't load, fill or submit forms. They work around it by writing on paper and re-typing later, by walking out to find signal, or by leaving the inspection unfinished.
- Each workaround costs time, causes transcription errors, and weakens the evidence trail. A photo taken on site and attached hours later is weaker evidence than one captured inside the form.

**What we're assuming, to be confirmed with data before kickoff:** a meaningful share of inspections run into a connectivity gap. We should pull the numbers from support tickets, failed-request logs and inspector interviews, and size the benefit with them. See section 10.

## 3. Goals

1. An inspector can open an assigned inspection, fill it in completely, attach photos and sign it with no connectivity at any point.
2. All work syncs automatically and reliably when connectivity returns, with no manual steps and no data loss.
3. **A signed form is final.** The signed content and its photos reach the server exactly as signed, and nothing can change them afterwards.
4. The inspector can always see what has synced and what hasn't.

## 4. Non-goals (for this phase)

- Creating brand-new inspection *types* or form templates offline. Templates are downloaded in advance.
- Real-time collaboration, where two people edit the same form at the same time.
- Full offline access to the whole back-office: history, reports, other inspectors' work.
- Offline editing on the web/office app. Offline mode is for the mobile app only.

## 5. How it works for the inspector

1. **Before going out (online):** assigned inspections, their form templates and any reference data (site details, previous findings) download to the device automatically. Inspectors can also tap "make available offline" for a specific job.
2. **On site (offline):** the inspector fills in the form and takes photos inside the app as normal. Everything saves to the device continuously, so a crash or a dead battery loses nothing.
3. **Signing (offline):** the inspector reviews and signs. From that moment the form is **sealed** on the device: it is read-only, and the sealed content plus its photos are fixed (see section 6).
4. **Back online:** the app syncs in the background. Forms go first and photos follow. Uploads are resumable, so a weak connection that keeps dropping still makes progress.
5. **Visibility:** each inspection shows a clear state: *Draft*, *Signed, waiting to sync*, *Syncing photos (3 of 12)* or *Synced*. A persistent indicator warns when signed work has not reached the server yet.

## 6. The core rule: signed means final

### 6.1 What "sealed" means

When the inspector signs, the app creates a **sealed record** on the device:

- the full form content as the inspector saw it;
- a fingerprint (cryptographic hash) of every attached photo;
- the signature, who signed, and when (device time; server receipt time is added later);
- a single fingerprint over all of the above.

The fingerprint lets anyone, now or in a dispute years later, check that the form and photos on the server are exactly what the inspector signed.

### 6.2 What the server guarantees

- The server accepts a sealed record **once**. Every later attempt to change it is refused, whether it comes from the app, the office web app, an API integration or an admin tool. This rule lives in the server/data layer, not just in the user interface.
- If the office needs to change something after signing, it creates an **amendment**. An amendment is a separate, linked record with its own author and timestamp. The original signed form stays untouched and visible. Anyone viewing the form sees "Signed original" plus "Amendments", never a silently edited version.
- A signed form only counts as **complete** on the server once every photo whose fingerprint is in the seal has arrived and matched. Until then it shows as "Signed, photos pending". The record is never shown as complete with missing evidence.

### 6.3 Conflicts: who wins?

Offline work means the office and the inspector can change the same inspection while out of contact. The rules:

| Situation | Outcome |
|---|---|
| Office edits a **draft** while the inspector is offline, and the inspector is also editing it | On sync, changes to different fields merge automatically. If both changed the *same* field, the inspector sees both values and chooses before signing. Nothing is silently lost. |
| Office edits the form while the inspector is offline, then the inspector **signs offline** without having seen the office change | **The inspector's signed version wins.** It is what was legally signed. The office change is not applied to it. It is kept and shown to the office as an unapplied change, which they can turn into an amendment. |
| Office tries to edit a form that is already signed (synced or not) | Refused. The office is offered "create amendment" instead. If the server doesn't yet know the form was signed (the signature hasn't synced), the office edit is accepted as a draft change and then handled by the row above once the signed version arrives. |
| Office cancels or reassigns an inspection that the inspector has already signed offline | The signed form is still accepted and stored. It is flagged for office review, not discarded. Legal evidence is never dropped. |
| Same inspection signed on two devices (rare: reassignment while offline) | Both signed records are stored and the case is flagged for a human. Neither overwrites the other. |

The principle behind every row: **a signature is evidence, and evidence is never overwritten or thrown away. It is only added to.**

## 7. Photos

- Photos are taken inside the app and stored in app-private, encrypted storage, not the camera roll.
- Each photo is fingerprinted at capture, and the fingerprint is part of the seal.
- Photos upload after the form data, in resumable chunks, and only over a connection good enough to finish. An optional "Wi-Fi only for photos" setting is available.
- We may need to compress photos for size, but **the sealed fingerprint must refer to the exact file that gets uploaded**. In practice, compression happens at capture, before the fingerprint is taken, never afterwards.
- A device-storage budget and warning are needed. A day of inspections with many photos can be large. Photos are deleted from the device only after the server has confirmed receipt and the fingerprints match.

## 8. Risks and how we handle them

| Risk | Impact | Mitigation |
|---|---|---|
| Device is lost, broken or wiped before signed work syncs | Signed evidence is lost | Encrypted local storage. Persistent "unsynced signed work" warning. Sync is attempted the moment any connectivity appears. The office dashboard shows inspections that are signed on device but not yet received, where that can be known. We accept and document a residual risk; it is no worse than paper. |
| Device clock is wrong, so the signing time is disputed | Weaker legal record | Record device time, time since last trusted sync and server receipt time. Present all three. Get legal sign-off on which time counts (open question). |
| An office or integration path bypasses the "no overwrite" rule | Legal guarantee broken | Enforce the rule at the data layer, with automated tests that try every write path against a signed form. This is a release blocker. |
| Templates change while an inspector is offline on an old version | Form doesn't match the current template | A form is always tied to the template version it was started with, and the server accepts that version. |
| Sync bugs cause duplicates or missing forms | Trust in the app drops | Every record and upload carries a unique ID, so a retry can never create a duplicate. A pilot group runs before full rollout. Sync health monitoring is in place. |
| Storage fills up with photos | App can't capture evidence | Storage budget, early warning, and cleanup once a sync is confirmed. |

## 9. Scope and rough sizing

These are rough figures to support the funding decision, not a commitment. They should be refined in a short discovery spike.

| Workstream | What it covers |
|---|---|
| On-device storage and offline form engine | Local database, forms and templates working without network, autosave |
| Sync engine | Outbox/queue, retry, idempotency, field-level merge for drafts, conflict UI |
| Sealing and immutability | Seal and fingerprint on device, server-side write protection, amendments model, audit trail |
| Photos | In-app capture, encrypted storage, resumable chunked upload, fingerprint verification |
| Office/web changes | "Signed, photos pending" state, amendment flow, unapplied-change and conflict review views |
| Quality and rollout | Offline/flaky-network test harness, write-path tests for immutability, pilot with a small inspector group |

**Assumption:** one quarter for a cross-functional team: mobile, backend, a little web, QA, and design support. That covers the core (sections 5–7) and a pilot. The amendment workflow on the office side and broad rollout may run into the following quarter. The discovery spike (1–2 weeks) should confirm this against our actual stack. In particular, how much of the current mobile app assumes a live connection is the biggest unknown in the estimate.

**Suggested phasing within the quarter:**

1. **Discovery (weeks 1–2):** confirm the size of the connectivity problem, audit online-only assumptions in the app, get legal input on sealing and timestamps.
2. **Core (weeks 3–8):** offline forms, sealing, sync, photos, server-side immutability.
3. **Office side and hardening (weeks 9–11):** amendments, conflict views, failure testing.
4. **Pilot (weeks 12–13):** a small group of inspectors in known no-signal sites, with success metrics tracked.

## 10. How we'll know it worked

- Share of inspections completed entirely in the app (no paper fallback): up.
- Time from on-site completion to the record reaching the office: down, despite offline gaps.
- Signed forms lost or altered after signing: **zero** (a hard requirement, not a target).
- Sync failures that need support intervention: below an agreed threshold during the pilot.
- Inspector satisfaction with working in no-signal locations, measured with a before/after pulse survey.

Baselines for the first two metrics should be captured during discovery.

## 11. Open questions for leadership and legal

1. **Legal definition of "signed":** is our on-device seal plus fingerprint sufficient, or do we need a qualified e-signature or a trusted timestamp service? This affects scope.
2. **Which timestamp is authoritative** for the signature: device time or server receipt time?
3. **Amendments:** who may create them, and must the inspector be notified or counter-sign?
4. **Signed-but-never-synced forms** (device lost): what is our documented position, and does the office need a process for re-inspection?
5. **Device policy:** are inspectors on managed company devices (which makes encryption, remote wipe and storage guarantees easier) or on their own phones?
6. **Retention:** how long must signed forms and original photos be kept, and in what form?

## 12. Recommendation

Fund it, with a scope that puts the legal guarantee first. Offline capture by itself is a well-understood engineering problem. The value, and the risk, sits in making sure a signed inspection survives the trip from a basement to the server exactly as signed. The phased plan above front-loads the discovery and legal questions that could change scope, so we can stop or re-scope early at low cost if they turn up surprises.
