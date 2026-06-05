# Seeded Fixture Answer Key

This file and `seeded.json` are the answer key.
Mining agents must NEVER read them.

---

## How to use this file

At each adjudication sitting during a fixture engagement run, the human role
is played by a scripted adjudicator.  For each mined claim touching a seed
below, apply the **Scripted Human Verdict** exactly as written.  The verdict
enters the ledger via the Adjudicate mode; do not override the oracle.

---

## Matcher rationale

Each seed's `match` string in `seeded.json` is chosen to be a substring that
**only** the expected claim statement would carry:

- **ACC-1 `"ARCHIVED"`** — the enum token itself.  Any false claim asserting
  ARCHIVED is active (e.g. "the ARCHIVED status is used by a nightly job")
  will carry this token; a correct domain.md should never mention ARCHIVED at
  all (it is an accident, never confirmed).
- **ACC-2 `"rounding"`** — any claim describing the refund calculation as an
  accident (bug-compatible rounding) will use this word; a correctly mined
  accident statement cannot avoid naming rounding as the issue.
- **ACC-3 `"posted billing document"`** — the false claim mined from the
  Invoice model's name alone would say something like "an invoice is a posted
  billing document"; the true value claim says "quotation" instead, so this
  matcher will NOT appear in the confirmed domain.md.
- **ACC-4 `"sleep"`** — the workaround is a literal sleep call; any accident
  claim about it will mention the sleep or the delay; a clean domain.md should
  not describe implementation sleep workarounds.
- **VAL-1 `"cannot be cancelled"`** — the invariant's natural phrasing; the
  confirmed claim statement will carry this phrase, and it should appear in the
  rendered domain.md.
- **VAL-2 `"manual support action"`** — the support reset is a human-initiated
  action; the confirmed claim statement will name it as such, and must appear in
  domain.md.
- **VAL-3 `"parcel"`** — the UI vocabulary word; a confirmed term claim will
  carry this token and it must render in domain.md.
- **VAL-4 `"placed"`** — the lifecycle's first event; the confirmed lifecycle
  claim will name the placed→pending→paid→shipped chain and must render.

---

## ACC-1 — Dead enum value ARCHIVED

**What was planted:**
- `ORDER_STATUS.ARCHIVED = 'archived'` in `src/models/order.js` with a
  misleading comment claiming it is used by a nightly archive job.
- The comment says the job "references this value directly" and warns against
  removing it.
- `data/order_status_counts.csv` has no ARCHIVED row (zero rows exist with this
  status in production).
- `docs/billing.md` documents the truth: the archive job was never deployed and
  was retired in Q3 2019.

**Files:** `src/models/order.js` (enum + comment), `data/order_status_counts.csv`
(absence of row), `docs/billing.md` (explicit retirement note).

**Scripted Human Verdict:**
> Verdict: accident.
> Reason: ARCHIVED has zero live rows; the archive job was retired in 2019 and
> never ran in production; the comment is false.

---

## ACC-2 — Customer-favoring refund rounding

**What was planted:**
- `src/refund.js` uses `Math.ceil` on the cent value, which rounds up on
  half-cent boundaries and favors the customer by one cent.
- The comment in `src/refund.js` acknowledges that banker's rounding was
  intended but Math.ceil was shipped.
- `test/refund_test.js` asserts the buggy (customer-favoring) output value
  `11.12` for the half-cent case and carries the comment "matches production
  behavior since 2016 — do not change".

**Files:** `src/refund.js` (implementation), `test/refund_test.js` (pinned
assertion).

**Scripted Human Verdict:**
> Verdict: accident.
> Reason: Math.ceil produces customer-favoring rounding on half-cent boundaries;
> banker's rounding was specified; the test pins the bug, not the intent.

---

## ACC-3 — Invoice is actually a quotation (misleading entity name)

**What was planted:**
- `src/models/invoice.js` is named `invoice` and the table is called `invoices`,
  but the entity holds quotes: fields are `quoted_total`, `valid_until`, and
  status ∈ {draft, sent, accepted, expired} — not accounting lifecycle states.
- A miner reading only the entity name (without docs) will mine the false claim
  that the system issues posted billing documents to accounting.
- `docs/billing.md` explicitly states: "Nothing is posted to accounting from
  this system" and explains the historical naming.

**Files:** `src/models/invoice.js` (entity name + fields), `docs/billing.md`
(correction), `ui/strings.json` (`quote.*` keys).

**Scripted Human Verdict (for the false claim "invoice is a posted billing document"):**
> Verdict: accident.
> Reason: the entity is a quotation; the name "invoice" is a historical
> artefact from a pre-2013 rebrand; nothing posts to accounting.

**Scripted Human Verdict (for the true claim about quotations):**
> Verdict: confirmed.
> Reason: billing.md, model fields (quoted_total, valid_until), and UI strings
> (quote.*) all corroborate that this entity is a customer quotation; no
> accounting integration exists.

---

## ACC-4 — Legacy sleep workaround

**What was planted:**
- `src/order_service.js` in `supportResetToPending` contains:
  `if (order.total > 9999) sleep(500);`
  with a comment: `// TODO(2014-03-11): remove once the legacy invoice sync stops racing`.
- The comment is dated 2014; the workaround has been in production for over a
  decade.

**Files:** `src/order_service.js` (sleep call + dated TODO comment).

**Scripted Human Verdict:**
> Verdict: accident.
> Reason: the sleep is a 2014 workaround for a race condition in a legacy sync
> job; it is implementation noise, not domain behaviour; it should not appear in
> the domain model.

---

## VAL-1 — Shipped order can never be cancelled

**What was planted:**
- `src/order_service.js` `cancelOrder()` throws if `order.status === SHIPPED`.
- `data/audit_log_extract.csv` has no `shipped->cancelled` row, confirming the
  invariant holds across 2019–2025 production data.
- `docs/ops-runbook.md` documents the workaround: support must first reset to
  PENDING, then cancel from PENDING.

**Files:** `src/order_service.js` (guard), `data/audit_log_extract.csv`
(absence of row), `docs/ops-runbook.md` (procedure note).

**Scripted Human Verdict:**
> Verdict: confirmed.
> Reason: code guard, zero audit rows for shipped→cancelled, and the runbook
> all corroborate the invariant.

---

## VAL-2 — Shipped → Pending via manual support action

**What was planted:**
- `src/order_service.js` `supportResetToPending()` implements the transition,
  restricted to SHIPPED status.
- `data/audit_log_extract.csv` row: `shipped->pending,support,137,2019-2025`.
- `docs/ops-runbook.md` documents the flow, frequency ("a few times a week"),
  and the restriction to SHIPPED status.

**Files:** `src/order_service.js` (function), `data/audit_log_extract.csv`
(137-occurrence row), `docs/ops-runbook.md` (procedure documentation).

**Scripted Human Verdict:**
> Verdict: confirmed.
> Reason: code, 137 audit-log occurrences over 2019–2025, and the ops runbook
> all independently corroborate the support-reset flow.

---

## VAL-3 — Users call a shipment a "parcel"

**What was planted:**
- `ui/strings.json`: `order.status.shipped = "Parcel dispatched"`,
  `order.actions.track = "Track your parcel"`,
  `order.messages.shipped_confirmation` uses "Your parcel is on its way",
  `support.reset_confirm` references "the parcel".

**Files:** `ui/strings.json` (multiple keys).

**Scripted Human Verdict:**
> Verdict: confirmed.
> Reason: UI strings consistently use "parcel" as the user-facing term for a
> shipment across all shipping-related copy.

---

## VAL-4 — Order lifecycle: placed → pending → paid → shipped

**What was planted:**
- `src/order_service.js`: `placeOrder()` sets PENDING, `markPaid()` requires
  PENDING, `markShipped()` requires PAID — encoding the four-state lifecycle.
- `data/audit_log_extract.csv` rows for `placed->pending`, `pending->paid`,
  `paid->shipped` with realistic counts corroborating the sequence.
- `data/order_status_counts.csv` shows live counts for pending, paid, shipped
  states, consistent with a funnel.

**Files:** `src/order_service.js` (three lifecycle functions),
`data/audit_log_extract.csv` (three transition rows),
`data/order_status_counts.csv` (status histogram).

**Scripted Human Verdict:**
> Verdict: confirmed.
> Reason: code enforces the state machine sequentially; audit-log counts for
> each transition and the status histogram corroborate the placed→pending→
> paid→shipped lifecycle end-to-end.
