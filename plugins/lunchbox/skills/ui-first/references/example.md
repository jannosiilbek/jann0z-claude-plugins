# UI-first — worked example (editorial CMS)

A worked instantiation of both output contracts against one product: *Longhand*, an editorial CMS used by writers, editors, and a publisher to move a story from pitch to print. Part 1 sketches the engine. Part 2 is the design-mode output done right. Part 3 audits a shipped version of the same product whose structure was generated straight off the schema.

**Part 1 — the engine model**

A minimal DDD sketch, modeled rigorously and in isolation before any UI decision is made.

- `PitchSubmission` — a contributor's proposed idea before any manuscript exists: pitch text, proposed section, contributor reference.
- `ManuscriptRecord` — the aggregate root for a story once drafting begins: content body, draft version, status enum, target-issue reference.
- `RevisionCycle` — one review round against a `ManuscriptRecord`: reviewer notes, requested changes, due date, resolved flag.
- `IssueAssembly` — the arrangement of `ManuscriptRecord`s within a numbered issue: section order, page allocation, a lineup-complete flag.
- `ContributorLedgerEntry` — created automatically the moment a `ManuscriptRecord` is marked approved-for-publication; records the payment obligation owed to the contributor and is exported on a fixed schedule to the finance system. **Engine-only: no screen in this application ever displays a `ContributorLedgerEntry`, individually or in aggregate.**

`PitchSubmission` and `ManuscriptRecord` are two different aggregates — different tables, different lifecycles, created by different commands — because the engine needs to represent "not yet accepted" separately from "being drafted." No writer or editor thinks in those terms; to them there is one thing, a story, which happens to pass through both engine representations on its way to print. That gap between engine shape and user concept is exactly what the boundary translation table below exists to close.

---

**Part 2 — design mode: the done-right output**

Same actors, same engine, designed from the task inventory first and read against the model only afterward.

## UI structure — Longhand
Form factor: sidebar ≤7
Shell decision: per-role shells — a writer's day is producing and revising copy; an editor's and publisher's day is moving copy through review to print, with the publisher holding a final-authority tier on top of the editor's day-to-day. Same underlying objects, different verbs, different attention inboxes → Writer gets its own shell; Editor and Publisher share one, with role-specific nav items and actions expressed as disclosure preconditions rather than a third shell.

### Actors and tasks
| Actor | Task | Frequency | Criticality |
|---|---|---|---|
| Writer | Pitch a new story idea | weekly | medium |
| Writer | Draft or revise a manuscript | daily | high |
| Writer | Respond to an editor's revision notes | daily | high |
| Writer | Update contributor profile and payment details | quarterly | medium |
| Editor | Review pitches and greenlight stories | daily | high |
| Editor | Send revision notes on a submitted draft | daily | high |
| Editor | Approve a manuscript for publication | weekly | high |
| Editor | Assemble the next issue's lineup | weekly | high |
| Publisher | Review the cross-issue release calendar | weekly | medium |
| Publisher | Give final sign-off on an issue | monthly | high |
| Publisher | Schedule an issue's release date | monthly | medium |
| Publisher | Run the annual contributor-compliance export | yearly | high |

### Nav map — Writer
| # | Label | Serves |
|---|---|---|
| N1 | My Stories | serves: pitch a new story idea; draft or revise a manuscript; respond to an editor's revision notes |
| N2 | Style Guide | serves: look up house style and formatting rules before submitting |
| N3 | My Profile | serves: update contributor profile and payment details |

### Attention inbox — Writer
Revision notes from an editor on any story, landing the moment a `RevisionCycle` opens against one of the writer's manuscripts; approaching submission deadlines. Actions available: open the story straight to the flagged tab, mark a note addressed, request a deadline extension.

### Nav map — Editor + Publisher
| # | Label | Serves |
|---|---|---|
| N1 | Story Queue | serves: review pitches and greenlight stories; send revision notes on a submitted draft; approve a manuscript for publication — editor permission |
| N2 | Issues | serves: assemble the next issue's lineup; give final sign-off on an issue; schedule an issue's release date |
| N3 | Release Calendar | serves: review the cross-issue release calendar — publisher permission |
| N4 | Compliance Export | serves: run the annual contributor-compliance export — rare-critical, justified: the export is a statutory filing a regulator requires every cycle, regardless of how few people touch it |

### Attention inbox — Editor + Publisher
Pitches awaiting a greenlight decision, drafts awaiting revision notes, manuscripts awaiting publication approval (editor-facing); issues awaiting final sign-off (publisher-facing, visible only to publisher-permission holders). Actions available: open the story or issue at the flagged stage, approve or reject inline, open an issue's Sign-off tab directly.

### Surface inventory
| Surface | Merges (user concepts) | Shows derived-from | Empty-state teaching line* |
|---|---|---|---|
| My Stories / Story Queue | `PitchSubmission` + `ManuscriptRecord` — one "story," staged by tabs (Idea / Drafting / In Review / Published) | each card renders the story's title, author, current stage, and open `RevisionCycle` note count — never a raw status code | "No stories yet — pitch your first idea to get started." (Writer) / "Nothing waiting on you — new pitches will land in Idea." (Editor + Publisher) |
| Issues | — (one `IssueAssembly` per issue; no merge) | each slot renders the story's title and author, not a manuscript reference; the Sign-off tab renders the full lineup, not a raw completeness flag | "No issue in progress — assemble the next lineup from stories approved for publication." |
| Release Calendar | — | renders each issue's title and scheduled date, not an issue reference | "No release dates scheduled yet — set one from an issue with a complete lineup." |
| Compliance Export | — | renders the contributor and amount owed per prior export run, not a raw ledger row count | "No export has run yet — the first is due at the next filing cycle." |
| Style Guide | — | static reference content | — |
| My Profile | — | renders the writer's own submitted details | — |

*only surfaces that can be empty on day one (lists, queues, dashboards, the inbox)

### Boundary translation table
| Engine concept | User-facing name | Home surface |
|---|---|---|
| `PitchSubmission` | Story — Idea stage | My Stories / Story Queue — Idea tab |
| `ManuscriptRecord` | Story — Drafting / In Review / Published stage | My Stories / Story Queue — matching tab |
| `RevisionCycle` | revision notes | tab on the story + Attention inbox |
| `IssueAssembly` | Issue | Issues |
| `ContributorLedgerEntry` | never surfaces | — |

### Direct access
Search / command palette reaches: any story by title or contributor name, at any stage; any issue by name or release date; a contributor's own profile. `ContributorLedgerEntry` rows are not reachable from search or anywhere else — they exist solely as the system's internal record of a publication event, exported to the finance system on a fixed schedule.

### Disclosure stages
| Feature | Appears when (precondition) |
|---|---|
| Story Queue nav item | the viewer holds editor permission |
| Story Queue / My Stories — "Submit for review" action | the story has a full draft saved, not just a bare pitch |
| Issues — Sign-off tab | the viewer holds publisher permission AND the issue's lineup is marked complete by an editor |
| Issues — Sign-off tab — "Approve for print" action | the viewer holds publisher permission AND the issue's lineup is marked complete by an editor (same precondition as the Sign-off tab it's nested in) |
| Release Calendar nav item | the viewer holds publisher permission |
| Release Calendar — "Schedule release date" action | the target issue's lineup is marked complete |
| Compliance Export nav item | the viewer holds publisher permission (shown permanently once granted — the rare-critical justification above is why it keeps a slot at all rather than being cut for low frequency) |

### Build plan (≤5 lines)
1. Ship My Stories / Story Queue first — it merges the two most-used engine concepts (`PitchSubmission`, `ManuscriptRecord`) into the one surface both shells depend on.
2. Ship Issues and Release Calendar together — editor assembly and publisher scheduling share the same `IssueAssembly` data.
3. Wire both Attention inboxes before shipping any workflow-state screen standalone — revision notes and sign-off must never get their own top-level nav slot.
4. Add Compliance Export last, with its rare-critical justification stated in the nav copy itself, not just in this doc.
5. Style Guide and My Profile ship whenever convenient — lowest task frequency, no workflow dependency.
Most at risk: P3 — Sign-off and revision notes are stateful and demo well as their own screens; the discipline to keep them as tabs-plus-inbox only is the easiest thing to lose under deadline pressure.

### First-shot test — Writer: draft or revise a manuscript
| Step | Sees | Does | Risk |
|---|---|---|---|
| 1 | "My Stories" in the sidebar | Clicks My Stories | low |
| 2 | Tabs: Idea / Drafting / In Review / Published, with story cards under each | Opens the story sitting in Drafting | low |
| 3 | The draft editor, current body text and word count | Edits the text, saves | low |
| 4 | A "Submit for review" action, present only now that a full draft is saved | Clicks Submit for review | medium |
Verdict: PASS — most-likely-to-fail step: Step 4 — a writer who has only ever saved partial notes before won't have seen Submit for review appear yet, and may hunt for it believing the app is missing a submit action.

### First-shot test — Editor: send revision notes on a submitted draft
| Step | Sees | Does | Risk |
|---|---|---|---|
| 1 | "Story Queue" in the sidebar, with a badge count on In Review | Clicks Story Queue | low |
| 2 | Tabs: Idea / Drafting / In Review / Published | Opens In Review | low |
| 3 | Submitted stories listed by title, author, and section — no ids | Opens one story | low |
| 4 | A "Revision Notes" tab on the story itself | Opens Revision Notes, writes feedback, sends back to the writer | medium |
Verdict: PASS — most-likely-to-fail step: Step 4 — an editor used to a separate "Revisions" section elsewhere may look for a top-level nav item before noticing notes live as a tab on the story.

### First-shot test — Publisher: give final sign-off on an issue
| Step | Sees | Does | Risk |
|---|---|---|---|
| 1 | "Issues" in the sidebar | Clicks Issues | low |
| 2 | The current issue flagged "Needs your sign-off" (same flag as in the Attention inbox) | Opens the flagged issue | low |
| 3 | The assembled lineup, and a Sign-off tab (visible because the lineup is complete and the viewer holds publisher permission) | Opens Sign-off | medium |
| 4 | An "Approve for print" action | Clicks Approve for print | high |
Verdict: PASS — most-likely-to-fail step: Step 4 — if an editor hasn't yet marked the lineup complete, the Sign-off tab is absent rather than disabled, and a publisher unaware of that precondition may read it as a bug instead of a blocked upstream step.

---

**Part 3 — review mode: auditing the schema-leaked version**

A different build of the same product, discovered by reading its route files and nav component. The router has one top-level route per engine model, no role split, and the ledger is on the sidebar for everyone.

## UI structure audit — Longhand (schema-leaked build)

### Findings
| Element | Evidence | Principle(s) | Fix move |
|---|---|---|---|
| "Pitch Submissions" nav item | `routes/pitch-submissions.tsx` renders raw `PitchSubmission` rows keyed by pitch id; no cross-link to a story's later manuscript stage | P1, P2 | merge-to-tabs |
| "Manuscript Records" nav item | `routes/manuscript-records.tsx` renders raw `ManuscriptRecord` rows; same person's story as Pitch Submissions, split only because it's a different engine class | P1, P2 | merge-to-tabs |
| "Pending Revisions" nav item | `routes/pending-revisions.tsx` lists every open `RevisionCycle` across all stories as its own top-level destination | P3 | demote-to-queue |
| Issue Assembly list columns | Columns read `manuscript_id`, `contributor_id`, `section_code` verbatim, no rendered title/author/section | P4 | derive-and-show |
| "Ledger Export" nav item | `routes/ledger-export.tsx`, visible to every role including Writer; columns `manuscript_id` / `contributor_id` / `amount_cents` / `created_at` — a direct dump of `ContributorLedgerEntry` | P1, P4 | cut-nav-item |
| "Compliance Export" nav item | `routes/compliance-export.tsx` visible to every authenticated user regardless of role, though only ever run by the publisher | P5 | stage-behind-precondition |

### Principle rollup
P1: FAIL — nav has one item per engine model (Pitch Submissions, Manuscript Records, Pending Revisions, Issue Assembly, Ledger Export), not one item per recurring task; several items serve no task any role can name, and no first-class path exists for the editor's "send revision notes" task.
P2: FAIL — Pitch Submissions and Manuscript Records are the same story to every actor, double-homed across two disconnected surfaces with no cross-link.
P3: FAIL — Pending Revisions sits as its own top-level destination instead of a tab on the story plus a rollup in a shared inbox.
P4: FAIL — Issue Assembly and Ledger Export render raw `manuscript_id` / `contributor_id` / `amount_cents` instead of the related story's title, author, or amount summary.
P5: FAIL — Compliance Export and Ledger Export are visible to every role from day one with no permission gate, though only the publisher ever uses either.
P6: PASS — Pitch Submissions' empty state reads "No pitches yet — use the pitch form to submit your first idea," naming the concrete next action rather than a bare "no records found."

### Observed boundary table
| Engine concept | User-facing name | Home surface(s) |
|---|---|---|
| `PitchSubmission` | "Pitch Submission" | Pitch Submissions |
| `ManuscriptRecord` | "Manuscript Record" | Manuscript Records |
| `RevisionCycle` | "Pending Revision" | Pending Revisions |
| `IssueAssembly` | "Issue Assembly" | Issue Assembly |
| `ContributorLedgerEntry` | "Ledger Export" | Ledger Export — defect: this engine-only concept has a home surface at all |

Defect: `PitchSubmission` and `ManuscriptRecord` are one user-facing concept (a story) double-homed across Pitch Submissions and Manuscript Records with no cross-link between the two rows — the double-homing itself is the P2 finding above.

### Ordered fixes
1. merge-to-tabs: combine "Pitch Submissions" and "Manuscript Records" into one surface with stage tabs (Idea / Drafting / In Review / Published) — clears the Pitch Submissions and Manuscript Records findings.
2. rename-to-user-noun: once merged, label the surface with the contributor's own word for the thing — "My Stories" / "Story Queue" — not either prior engine-class name.
3. demote-to-queue: remove "Pending Revisions" from top-level nav; add it as a tab on the story plus a rollup row in one shared attention inbox — clears the Pending Revisions finding.
4. derive-and-show: replace `manuscript_id` / `contributor_id` / `section_code` on Issue Assembly with the story's rendered title, author name, and section label — clears the Issue Assembly finding.
5. cut-nav-item: remove "Ledger Export" entirely; `ContributorLedgerEntry` is engine-only and should never have a screen — if a finance audience genuinely needs occasional access, route it through a scheduled export job outside this application, not a nav slot — clears the Ledger Export finding.
6. stage-behind-precondition: gate "Compliance Export" to publisher permission and state that precondition next to the nav entry so it stays checkable — clears the Compliance Export finding.

### First-shot test — Editor: send revision notes on a submitted draft
| Step | Sees | Does | Risk |
|---|---|---|---|
| 1 | Nav items "Pitch Submissions," "Manuscript Records," "Pending Revisions," "Issue Assembly," "Ledger Export," "Compliance Export" — none named for reviewing a draft | Guesses "Manuscript Records" is the closest match | medium |
| 2 | A raw table of manuscript rows: `id`, `status_code`, `contributor_id`, `target_issue_id` | Scans for the submitted draft by matching `contributor_id` — not a name | high |
| 3 | No action on this row to attach revision notes | Navigates to "Pending Revisions," hoping the note-writing path lives there instead | high |
| 4 | Pending Revisions lists cycles by `revision_id` and `manuscript_id`, no title or author rendered | Cross-references the `manuscript_id` from step 2 to guess which row matches | high |
Verdict: FAIL — most-likely-to-fail step: Step 4 — resolving which pending revision belongs to the draft found in step 2 requires manually matching a raw `manuscript_id` across two disconnected table dumps, exactly the mental join a domain-expert stranger cannot be expected to perform.
