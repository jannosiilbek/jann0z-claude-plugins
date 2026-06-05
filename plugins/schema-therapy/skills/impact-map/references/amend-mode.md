# Amend mode — iterating an existing 00

**Amend mode** is the impact-map skill's second path: instead of drafting
`specs/00-impact-map.md` from scratch (the Draft pipeline in SKILL.md §c), it
weaves a **scope delta** into an artifact that already exists. It applies **only**
when `specs/00-impact-map.md` **and** its product-intent file already exist and a
**scope delta** arrives. A scope delta is a distilled **1–3 line change
statement** — the **only** conversational input this mode ever sees; everything
else from the discussion stays **outside** the artifact. Amendment discipline is
**theme H** of `references/validation-rules.md` (do not restate it here — reference
it by pointer). The mechanical witness is the harness `--baseline` diff
(simulation §8.1, check XD1). Run this complete procedure in place of §c.

1. **Receive the delta verbatim.** If it is ambiguous (which impact does the new
   deliverable serve? a new actor or an existing one?), ask **ONE** clarifying
   question back — **never guess** (mirrors the Draft-mode ambiguity provision, §1).
2. **Amend the intent file first** (H1). Weave the delta into the product-intent
   file in plain business language — minimal edit, no conversational residue. The
   intent file stays the single source the artifact is faithful to.
3. **Re-derive 00, minimal-diff** (H2). Apply the intake table (§a) + catalog (incl.
   theme H) touching **only** what the delta demands; every untouched row stays
   byte-identical; re-pin the fingerprint over the new intent bytes.
4. **Delta-scoped professor gate** (H3). Dispatch a **fresh** reviewer subagent
   given **only**: the delta verbatim, the harness `--baseline` diff block, the full
   catalog, and the amended artifact — **NOT** the conversation, **NOT** the old
   drafts. Verdict per diff entry from the closed schema
   `traces-to-delta | leak | style-drift`; any `leak`/`style-drift` ⇒ fix and
   re-review. Bounded at **5**, non-pooled. (No-subagent fallback: a separate fresh
   cold pass over the **same inputs only**.)
5. **Lint + Simulation.** Before re-deriving (step 3), copy the pre-amendment 00 to
   `specs/.00-impact-map.prev.md`, then run:

   ```
   node scripts/harness.mjs specs/00-impact-map.md --baseline specs/.00-impact-map.prev.md
   ```

   Green required. **Delete `specs/.00-impact-map.prev.md` after the run** — it must
   not be left in `specs/`.
6. **Emit + amendment report** (fixed format):
   - the **delta verbatim**;
   - the **diff table** with per-entry professor verdicts (from step 4);
   - the harness **status line**;
   - `Iterations to convergence: N`;
   - the staleness note **verbatim**: "Artifacts 01–10 are now stale (doctrine §7).
     Batch further scope deltas, then run the downstream cascade and the drift
     police when the scope settles."
   - the drift-police handoff as an **invocation** (`schema-therapy:drift-police`)
     if available — a handoff, **not** a file dependency (unchanged from §c step 6).
