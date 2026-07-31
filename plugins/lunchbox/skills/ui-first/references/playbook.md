# UI-first playbook

Per-principle detail behind the closed fix-move list in SKILL.md: what each violation looks like in a real nav tree, route file, or CRUD screen; what looks like a violation but isn't; and which fix move to reach for. Read this before mapping any finding to a fix move.

---

## P1 — Design from the user's day, not the schema

### Smells

- A nav label is a bare singular/plural of a database table or model class — `Party Records`, `Case Files`, `Line Rows` — the label reads like a table listing, not a thing anyone would ask for by name.
- A route tree has exactly one top-level route per model in the schema (`routes/accounts.tsx`, `routes/orders.tsx`, `routes/line-items.tsx`, `routes/audit-log.tsx`): the nav count tracks the table count, not the number of distinct jobs any one role does.
- More than seven top-level items for one role's shell, and several only exist because "the model has that entity" — they were added the day the table was added, not the day a task was discovered.
- Near-zero traffic on a nav item (analytics, or plain team knowledge), and nobody on the team can name the recurring task it serves when asked directly.
- An admin/settings item that bundles three unrelated configuration screens because they share a foreign key in the schema, not because any one role visits them together.

### False positives

- **The rare-critical-nav-item rule (required check before flagging low-frequency items):** a nav item used rarely — weekly, monthly, or by only one role — can still earn a permanent slot when the design records a stated justification for why it needs a guaranteed path (e.g., a monthly compliance export a regulator requires every cycle). Before flagging any low-frequency item, check whether that justification is written down next to the item. Flag it only when no justification is recorded, or the justification is generic ("might need this someday", "in case someone asks") rather than a named recurring obligation. **A valid justification names three things: a cadence or deadline, a named external recipient or authority, and a stated consequence of failure** — "the test report is filed with the water purveyor within 10 business days, and a missed filing voids the certification". Missing any of the three, it is a gesture rather than an obligation; treat it as generic and flag it.
- **The attention-inbox row is not automatically an orphan.** On a shell with no persistent chrome slot — bottom tabs, a phone — the inbox legitimately holds one nav slot (SKILL.md's shell-decision rule). Test the `serves:` clause, not the row: it is an orphan only when the clause names the inbox or another surface instead of the recurring tasks whose work lands there.
- A nav label that happens to match a class name in the schema is not automatically a leak — the test is whose word it is, not whether the words match. When the user's own vocabulary for a concept genuinely is that word (they say "Invoices" and there's no other word for it), a coincidental match to the internal class name is not a P1 (or P2) violation.

### Fix moves

- `cut-nav-item` — the default move for an item with no attached task and no recorded rare-critical justification. Delete the entry from nav/route config. If the underlying records still need to be reachable by someone occasionally, route them through direct access (search/command palette) instead of restoring the nav slot.
- `rename-to-user-noun` — use instead of cutting when the item does serve a real, nameable task but is labeled with the schema's word rather than the word the task inventory uses for it.
- `stage-behind-precondition` — use when the item is legitimate but only becomes relevant once a later stage is reached (new account, no data yet) — it isn't a P1 violation of "no task", it's a P5 timing problem wearing a P1 costume; move it out of the day-one nav rather than cutting it outright.

---

## P2 — One concept, one place

### Smells

- Two nav sections whose CRUD forms carry nearly identical fields (name, contact info, status) with a lifecycle stage or foreign key as the only real distinguisher — e.g., a `Leads` section and a `Customers` section that are the same person before and after a sale closes.
- A route tree has two fully independent route pairs — `/vendors` and `/suppliers` — each backed by its own model, its own primary key, and its own CRUD screen, because the two classes arrived from separate integrations or separate legacy modules; no status field or lifecycle stage separates them, they are simply two different engine classes that every user interview calls by one shared word ("the people I buy from").
- The same real-world object has two different edit forms depending on which stage it's in, and the user must already know which section to open to find the version they need.
- A search inside the product surfaces two unrelated result rows for what the user considers one thing, because the concept is double-homed across two surfaces with no cross-link between them.
- A boundary check (reading the underlying model against the nav/surface labels) turns up two different classes mapped to two different user-facing names that any user in an interview would call the same word.

### False positives

- Two things that share a casual name in conversation but are genuinely different objects to the user — a `Product` and a `Product Bundle` might both get called "product" in passing, but if they have different owners, different lifecycles, and users would be surprised to learn they're "the same thing," they are not a merge candidate. Merge only when the user would be surprised to learn the two surfaces are different objects — not merely because both get called by an overlapping word sometimes.

### Fix moves

- `merge-to-tabs` — the primary move: combine the two surfaces into one, and move the split that used to separate them (lifecycle stage, status, subtype) into a tab or filter on the merged surface instead of a nav position.
- `rename-to-user-noun` — apply alongside the merge: once combined, the merged surface needs one label — the user's own word for the single concept — not a mash-up of both prior labels and not whichever engine class happened to be primary.

---

## P3 — Workflow states are queues, not destinations

### Smells

- A top-level nav item named after a status value rather than an object — `Pending Approvals`, `Open Requests`, `Flagged Items`, `Needs Review` — sitting in the same list as object-nav items like `Customers` or `Orders`.
- Two or more top-level entries that are the same object filtered by different status values, each promoted to its own nav row (`Approved Requests`, `Rejected Requests`, `Pending Requests`) instead of one object view with a status filter.
- A route file with one route per workflow state (`routes/pending.tsx`, `routes/approved.tsx`, `routes/rejected.tsx`) rather than one object route with a status parameter.
- No single place a user can visit to see everything currently needing their action across object types — work-in-progress is scattered across several object-specific screens with no shared rollup.
- A "queue" screen that behaves like a permanent destination with its own nav slot and its own distinct layout, rather than a tab living on the parent object plus a rollup row in one shared inbox.

### False positives

- A screen named after what looks like a status but that actually holds a permanently retired or terminal record set — an `Archive` or `Closed Cases` section for records nobody is still acting on is a resting state, not work-in-progress. Only flag status-shaped nav items that represent work someone still has to act on; a terminal/inactive resting state with its own long-lived home is not a P3 violation.

### Fix moves

- `demote-to-queue` — the only move here: remove the top-level slot, add the workflow state as a tab on its parent object, and roll every instance of it into the one shared attention inbox so a user sees all pending work in a single place regardless of object type.

---

## P4 — Show relationships, not tables

### Smells

- A list screen's columns are literally foreign keys or raw codes — `party_id`, `agreement_ref`, `warehouse_code` — instead of the related object's name or label.
- A detail page forces the user to open a second screen and cross-reference an ID to understand which related record a row belongs to — the "join" the UI should have performed is left as homework.
- A table dump mirrors the schema's columns one-for-one with no rendering of what each row derives from — e.g., a line-item list showing `order_id`, `sku_id`, `warehouse_id` but never the order's name, the product's name, or the warehouse's label.
- A dashboard tile shows a bare count or code with no link back to the records it summarizes, so the user has to go find the source list separately to act on it.
- Column headers copy the database column name verbatim into the UI — `created_at`, `assignee_id` — snake_case surviving straight from the schema.

### False positives

- A genuinely internal identifier deliberately exposed to a technical or support-facing audience for a stated task — e.g., a "copy support reference" affordance that reveals a raw record ID so a support agent can paste it into a ticket — is not a P4 violation. Check whether the raw value serves a named support/debug task before flagging; an escape hatch for a specific audience is not the same as a leaked join shown to the general user.

### Fix moves

- `derive-and-show` — the only move: replace the raw ID/column with the related object's rendered name, status, or short summary (with a link to the full record where useful), so the row reads as a sentence about the thing rather than a foreign-key lookup the user has to resolve by hand.

---

## P5 — Progressive disclosure

### Smells

- A feature or module sits in nav for every role from day one regardless of whether its precondition (a plan tier, a completed setup step, a prior workflow stage, existing data to act on) has been met.
- A settings page lists advanced options (webhooks, API keys, integrations) before the user has ever used the basic version of the feature — everything is switched on and visible immediately after signup.
- A reporting or compliance module is shown to every role from account creation, when in practice only one role ever opens it, and only once there is something to report on.
- Onboarding checklist items and the advanced screens they eventually unlock are both fully visible at once, with no staged reveal between "next step" and "everything else."
- A gated feature appears in nav grayed out or behind a paywall lock rather than being absent until the account actually qualifies — visible-but-disabled still counts as shown too early.

### False positives

- A feature that is cheap to show and causes no harm being visible before its "ideal" moment is not a violation — a `Help` link or a generic `Settings` entry visible to everyone from day one doesn't need gating. Flag only features whose early visibility either clutters the decision at the moment that matters for the first-shot task, or exposes capability the account isn't yet entitled to use; "would look tidier hidden" alone is not a precondition.

### Fix moves

- `stage-behind-precondition` — the only move: gate the feature so it appears only once its precondition is actually met (tier unlocked, prior step completed, data exists to act on). State the precondition explicitly next to the gate rather than just hiding the nav item with no rule attached — an unstated gate can't be checked later and tends to silently drift into "always show."

---

## P6 — Empty states teach the next action

### Smells

- A list/table screen with zero rows shows only "No records found" plus a `+ Add` button, with no explanation of what the object is or why the user would create one.
- The empty state reuses the exact layout of the populated state (same header, same empty grid), so the first-run screen reads as broken rather than as a deliberate onboarding surface.
- A queue or dashboard with nothing in it yet shows the identical blank view on every later visit, never distinguishing "empty because you haven't started" from "empty because you're caught up."
- An attention-inbox empty state has no copy at all — the screen silently shows nothing instead of confirming the queue is clear and naming what will land there next.
- A setup wizard's first screen is a blank form with no example or explanation, forcing the user to guess the shape of a first record before seeing any sample structure.

### False positives

- A rarely-empty internal/system screen (an audit log, a system-health page) whose empty case is not a real first-run moment because it's practically never reached, or a transient/self-explanatory empty case like a search-results screen showing "No matches for '<query>'" — that is expected search feedback, not an onboarding surface. Flag only empty states a new user will actually encounter as a meaningful first interaction with that object type.

### Fix moves

- `teach-empty-state` — the only move: replace the blank list/queue with copy that names the concrete next action the user should take, paired with a single affordance to do it (not a generic `+ Add` with no framing).

---

## Move index

- **`cut-nav-item`** — when it applies: a nav item serves no recurring task and carries no recorded rare-critical justification. Recipe: delete the entry from nav/route config; if the underlying records still need occasional reachability, expose them via direct access (search/command palette) instead of a nav slot.
- **`rename-to-user-noun`** — when it applies: an item serves a real task but is labeled with the schema's/engine's word instead of the word the task inventory uses. Recipe: relabel using the exact term from the actor-task inventory, not a paraphrase of the internal class name.
- **`merge-to-tabs`** — when it applies: two surfaces represent one concept in the user's mind, split only by an internal attribute (class boundary, status, subtype). Recipe: combine into one surface; turn the old split into a tab or filter control on that single surface.
- **`demote-to-queue`** — when it applies: a workflow/status state has its own top-level nav slot. Recipe: remove the top-level slot; add the state as a tab on its parent object and roll every instance into the one shared attention inbox.
- **`derive-and-show`** — when it applies: a screen renders raw joinless IDs/codes instead of the related object. Recipe: replace the raw value with the related object's name/status/summary (link to the full record where useful) so the row reads without a manual lookup.
- **`stage-behind-precondition`** — when it applies: a feature is visible before its precondition (tier, setup step, prior data) is actually met. Recipe: hide the feature entirely until the precondition holds, and state the precondition next to the gate so it stays checkable.
- **`teach-empty-state`** — when it applies: an empty list/queue shows a bare "no records" message. Recipe: replace it with copy naming the next concrete action, paired with the affordance to take it.
