---
description: Iterate on the scope (the 00 impact map) conversationally — distilled deltas, isolated amendment, leak-proof diff review; downstream staleness batched until the scope settles
argument-hint: "[<specs-dir>] [<intent-file>]"
---

# schema-therapy scope session — iterate the impact map without leaking the conversation

Run an interactive scope session over `specs/00-impact-map.md`. You (the main
session) host the discussion; the artifact is only ever touched by isolated
amendment runs of the `schema-therapy:impact-map` skill's **Amend mode**. The
boundary rule that makes this safe: **the only thing that crosses from this
conversation into an amendment is a confirmed scope delta** — never the chat.

## 1. Locate the workspace

- `<specs-dir>`: the project's flat `specs/` root (default `specs/`).
- `<intent-file>`: the product-intent file 00 fingerprints (default
  `product-intent.md` next to specs/).
- If `specs/00-impact-map.md` does not exist yet, there is nothing to iterate:
  run the `schema-therapy:impact-map` skill's normal Draft mode first, then
  return here.

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
