---
description: The anamnesis bridge — OPTIONAL brownfield entry to the pipeline. Interview a capability brief, mine a legacy system into an evidence-gated claims ledger via parallel subagents (unattended-safe, all state on disk), adjudicate topic-by-topic, then render only confirmed claims into the domain.md the pipeline already consumes
argument-hint: "[<project-dir>]"
---

# schema-therapy anamnesis session — mine legacy value without leaking legacy accidents

Run a legacy-extraction engagement over `<project-dir>/anamnesis/`. You (the main
session) are the **orchestrator only — you never read legacy code**. The engagement
artifacts are only ever touched by isolated runs of the `schema-therapy:anamnesis`
skill, and the harness (gates G0–G5) is the sole mechanical authority. The boundary
doctrine that makes this safe:

> The only thing that ever crosses from the legacy system into the pipeline is the
> rendered set of confirmed claims — never code, never chat, never probe output.

Three fences, all mechanical: the orchestrator never holds legacy content; the
harness ensures the ledger never holds unauthorized content (gate G1); the render
gate ensures the pipeline never sees unconfirmed content (gate G4).

Harness (all gates): `node plugins/schema-therapy/skills/anamnesis/scripts/harness.mjs
<project-dir> --gate <g0|merge|dry|render|handoff> [--context <slug>]`.

## 1. Locate the workspace

- `<project-dir>`: the target project root (default `.`). The engagement lives in
  `<project-dir>/anamnesis/` — `brief.md` (capability manifest), `ledger.jsonl`
  (claims, the ONLY state), `probes.log` (probe + round journal), `context-map.md`
  (confirmed bounded contexts), `topics.md` + `queue.md` (regenerated views).
  Renders land at `<project-dir>/domain.md` (or `domain.<context>.md`). `specs/`
  is never written by this session — 01 is only ever written by event-storming.
- **Resume is a non-event:** if `anamnesis/` already exists, re-read the brief, the
  ledger digest (claim keys + statuses), and the journal (max round marker = current
  round); recompute gaps; continue at whatever phase the disk says. Nothing lives
  only in conversation.

## 2. Phase 0 — BRIEF (gate G0)

Interview the user, scope-Gather style (echo back each item, let them edit),
to inventory what THIS engagement provides:

1. **Evidence classes available**: code, tests, docs/UI-strings, data (DB/logs),
   probe (live API and/or browser).
2. **Per probe environment, a tier** from the closed set `none` | `browse-only` |
   `read-only` | `sandbox-full`. Only `sandbox-full` permits mutating probes;
   production is never `sandbox-full`.
3. **Access details per class** (repo path, DB connection, base URLs, credentials
   reference) — each becomes a named capability every piece of evidence will cite.

When the manifest is confirmed complete, dispatch a FRESH subagent carrying ONLY:
the skill dir (`plugins/schema-therapy/skills/anamnesis/` — it reads SKILL.md and
executes **Brief mode**), the project dir, and the confirmed capability manifest
verbatim. Gate: `--gate g0`. **No brief, no mining.** Bounded ≤ 5 draft↔gate
iterations.

## 3. Phase 1 — ROUNDS (repeat until dry; gates G1, G2, G3)

Each round:

1. **Assign.** Compute gaps from the ledger digest ONLY: unmined capability × scope
   slices, unconfirmed claims needing a second evidence class, recorded
   contradictions. Write narrow assignments.
2. **Mine.** Dispatch parallel subagents, one per evidence class × scope slice.
   Each carries ONLY: the brief, its assignment, and the claim-key digest (for
   dedup), plus the directive *"Do not invoke or read any installed skills or other
   plugins. Return ONLY new/updated claim lines in the ledger's closed JSON schema —
   never file contents, never transcripts, never commentary."*
3. **Probe** (hypothesis-driven, only where the brief's tier allows): each probeable
   unconfirmed claim becomes one targeted probe (API call or browser walk) executed
   by a probe subagent within its capability's tier; the result returns as a
   probe-class evidence line + a journal probe record. An attempt outside the
   brief's tier is a **bridge defect — surface it and stop; never judgment-call it.**
4. **Merge.** Dispatch a FRESH **Merge-mode** skill run carrying ONLY the collected
   claim lines + probe records. It parses claim lines (anything unparseable is
   discarded and logged — a sloppy miner cannot push slop into the ledger), dedups
   by claim key (same key = one claim, merged evidence; near-duplicates are flagged
   back to you for merge/split — never silently unioned), records detected
   contradictions as locks (never resolves them), appends the round marker, and
   runs `--gate merge`. Confirmation promotion is whatever the harness certifies
   legal — triangulation per the pinned independence matrix or a recorded human
   verdict; nothing else.
5. **Dry?** `--gate dry` — Phase 1 closes only when the harness certifies the last
   2 rounds added zero new/changed claims (G3).

Host rules: you hold only the brief, the ledger digest, and round state. Mining
rounds are bounded by the dry gate, not by an iteration cap. Adjudication (§5)
runs in parallel whenever the user is available — it never blocks mining.

## 4. Phase 1b — SEGMENT

After dry: cluster concepts from the ledger digest into candidate bounded contexts
(concepts whose states/rules/transitions reference each other cluster; thin,
ID-only seams mark boundaries). The proposed context map is itself an adjudication
item — echo it back; the user confirms or redraws. On confirmation, dispatch a
FRESH **Segment-mode** skill run carrying ONLY the confirmed map → writes
`anamnesis/context-map.md`. A single-context engagement may skip the map (the
implicit context renders `domain.md`). Bounded ≤ 5 draft↔gate iterations.

## 5. Phase 2 — TOPIC LOOP (adjudication at scale)

Work the ledger **one topic at a time** — topics are concept clusters within a
context, cut from the map, sized for one sitting. `topics.md` (the board) and
`queue.md` (the queue, ranked by blast radius: money, compliance, irreversible
actions, high-frequency data first; cosmetic and dead-code last) are **views** —
regenerated from the ledger by the Adjudicate-mode skill run, never state.

Each sitting:

1. Open with a **topic brief** (generated fresh from that topic's ledger slice,
   ≤ 1 page): **Settled** — one line per confirmed claim; **Open + impact** — each
   unresolved item with the specific question that resolves it AND its mechanical
   impact line (which lifecycles/rules/relations reference it; what it feeds:
   lifecycle → 04/05, rule → 03, relation → 04).
2. Work the open items queue-style. **Echo-back discipline:** propose a verdict
   with reasoning; the user confirms, overrides, or defers in a few words; a
   verdict enters the ledger only after confirmation — via a FRESH
   **Adjudicate-mode** skill run carrying ONLY the confirmed verdicts
   (claim id → confirmed/accident/deferred + one-line reason). Deferral is a
   verdict. Contradictions are resolved here and ONLY here — never by recency,
   confidence, or majority.
3. Close with the readiness check: **topic ready** = zero unconfirmed and zero
   contradiction-locked (deferred is allowed); **context ready** = all its topics
   ready. A long tail never adjudicated is safe by design — deferred claims become
   01 hotspots, not silent model content.

You load per sitting: the topic brief + that topic's ledger slice + the claim-key
digest — nothing else.

## 6. Phase 3 — HANDOFF (per context, independently; gates G5, G4)

When a context is ready:

1. Dispatch a FRESH **Handoff-mode** skill run carrying ONLY the context slug. It
   runs `--gate handoff --context <slug>`: readiness (G5), the deterministic
   render, then the render gate (G4 — the boundary oracle; nothing crosses until
   green). Bounded ≤ 5 iterations.
2. On green, the actor seam runs through 00, and order matters: **anamnesis mines →
   `/schema-therapy:scope` runs with the context map and actor claims on the
   table → the human decides which mined actors become 00 Business Actors →
   pipeline.** The legacy cannot dictate the future product's actors.
3. Then dispatch event-storming as the **normal pipeline entry** over the rendered
   domain file — the pipeline populates that context's `specs/` tree; the bridge
   never writes it. Other contexts may still be mining or in topic sessions —
   contexts hand off independently.

## 7. Rules for the host

- Never edit an engagement artifact or a domain file by hand — skill runs only;
  the renderer owns the domain file's bytes.
- Never put legacy file contents, probe output, or chat into a dispatch payload.
  The closed crossing payloads are: the confirmed capability manifest, claim
  lines, confirmed verdicts, the confirmed context map, a context slug.
- Bounded ≤ 5 iterations per draft↔gate cycle (brief, segmentation, render).
- Harness routing is binding: `fail` → fix the named artifact; `malformed` → fix
  the artifact's shape; `broken-test` → fix the script/env; never override the
  oracle, never smooth over a non-green result.
- The exit criterion is **value equivalence, not behavioral equivalence**: all
  triangulated domain truth captured; all divergence from legacy behavior
  deliberate and recorded as `accident` verdicts in the ledger.
