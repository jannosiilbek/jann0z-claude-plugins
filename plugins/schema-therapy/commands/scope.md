---
description: The scope session — the pipeline's entry point. Gather a brand-new scope by interview (blank idea → first validated 00 impact map), then iterate it conversationally — distilled deltas, isolated amendment, leak-proof diff review; downstream staleness batched until the scope settles
argument-hint: "[<specs-dir>] [<intent-file>]"
---

# schema-therapy scope session — gather and iterate the impact map without leaking the conversation

Run an interactive scope session over `specs/00-impact-map.md`. You (the main
session) host the discussion; the artifact is only ever touched by isolated
runs of the `schema-therapy:impact-map` skill. The boundary rule that makes
this safe: **the only things that ever cross from this conversation into an
artifact run are a confirmed fact ledger (Gather) or a confirmed scope delta
(Amend)** — never the chat.

## 1. Locate the workspace

- `<specs-dir>`: the project's flat `specs/` root (default `specs/`).
- `<intent-file>`: the product-intent file 00 fingerprints (default
  `product-intent.md` next to specs/).
- If `specs/00-impact-map.md` does not exist yet, enter **Gather mode** (§1a)
  — the session starts the scope from nothing. Otherwise go straight to the
  amend loop (§2).

## 1a. Gather mode — start the scope from a blank idea

Interview the user along Adzic's four questions, in order. Keep it a
conversation, not a form; but each question has a discipline the answers must
land in (the catalog enforces it later — arriving pre-aligned saves loops):

1. **WHY — the goal.** One business goal. Push for a measurement: "how would
   you know it worked — a number, a percentage, a deadline?" (an unmeasurable
   goal will be rejected downstream).
2. **WHO — the business actors.** The parties who can produce, obstruct, or
   consume the goal — named in the domain's natural words, one line of
   description each.
3. **HOW — the impacts.** Per actor: what must they DO differently? Redirect
   feature-speak gently: "that sounds like a thing to build — whose behaviour
   does it change?" An impact is a behaviour change, never a feature.
4. **WHAT — the deliverables.** The capabilities to build, each tied to the
   impact it serves, by name. Options, not commitments.

Accumulate confirmed answers into the **fact ledger** (the only thing that
will cross the boundary):

```
goal: <one measurable statement>
actors:
  - <Name> — <one-line description>
impacts:
  - <Actor>: <behaviour change>
deliverables:
  - <Deliverable> → <serving impact, verbatim>
```

Rules: a fact enters the ledger only when the user has confirmed it (echo
back, let them edit); a user who already has prose can paste it — distill it
INTO the ledger and confirm exactly the same way (no special path).
**Minimum before dispatch:** 1 measurable goal, ≥1 actor, ≥1 impact, ≥1
deliverable. Orphan impacts are fine (backlog candidates by design).

**Dispatch:** when the ledger is confirmed complete, dispatch a FRESH subagent
carrying ONLY: the skill dir
(`plugins/schema-therapy/skills/impact-map/` — it reads SKILL.md), the
confirmed fact ledger verbatim, the intent-file path, and the specs dir. The
subagent composes the product-intent file from the ledger (plain business
prose; every fact present; nothing else) and executes the skill's **Draft
mode** end-to-end. Its report MUST include the composed intent verbatim —
show it to the user so they see exactly what was written.

On green: announce the first validated impact map (show the report) and fall
through to the amend loop (§2). Everything after this point is identical to a
session that started with an existing 00.

## 2. The session loop

Repeat until the user signals the scope is settled:

1. **Discuss freely.** Brainstorm, weigh options, talk Stripe fees or whatever
   — none of it touches the artifact. Nothing in this phase is an instruction
   to change scope.
2. **Distill.** When the user states a change ("it also needs Stripe
   payments"), distill it into a **scope delta**: 1–3 lines, plain business
   language, one concern (theme H4), zero conversational residue. Echo the
   delta back verbatim and ask for confirmation. The user edits or confirms.
3. **Dispatch in isolation.** On confirmation, dispatch a FRESH subagent
   carrying ONLY: the skill dir
   (`plugins/schema-therapy/skills/impact-map/` — it reads SKILL.md and
   executes Amend mode), the intent-file path, the specs dir, and the
   confirmed delta verbatim. The subagent gets no conversation history — that
   is the leak boundary, enforced by construction.
4. **Relay the amendment report.** Show the user: the delta, the harness
   `--baseline` diff table with the professor's per-entry verdicts
   (`traces-to-delta | leak | style-drift`), the harness status line, and
   `Iterations to convergence: N`. A non-green amendment is reported per the
   skill's own routing — never smoothed over.
5. **Ledger.** Append to the session ledger: delta, diff summary, verdict.
   Mark the suite stale (any accepted amendment makes 01–10 stale, doctrine
   §7).

Rules for the host: never edit the artifact or the intent file in this
session; never batch multiple concerns into one delta (sequential deltas
instead); never dispatch an unconfirmed delta.

## 3. Ending the session

When the user signals done ("that's the scope", "settled", "done"):

1. Print the session ledger (every delta applied, in order, with verdicts).
2. Remind: **artifacts 01–10 are now stale** (doctrine §7) — the scope moved,
   everything downstream must be re-verified before it can be trusted.
3. **Offer** the downstream cascade — re-run skills 1→10 in pipeline order on
   this workspace, then the drift police
   (`node plugins/schema-therapy/scripts/suite-drift.mjs <specs-dir>
   --domain <domain-file> --intent <intent-file>` plus the
   `schema-therapy:drift-police` agent) until ALIGNED. Run it only on an
   explicit yes; the user may keep iterating in a later session and cascade
   once at the very end. Never auto-cascade.
