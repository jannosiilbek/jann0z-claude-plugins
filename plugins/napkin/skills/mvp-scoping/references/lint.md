# scope.md lint — the gate before you write or edit the feature list

`scope.md` is one thing: a list of features, each in the exact same template. The lint exists because
the list's value is that the rest of the pipeline (and you, on every future curation pass) can trust it
without re-reading the brief. Every inconsistency, every vague line, every leaked downstream fact is a
stall later.

Run the lint as a **double pass**: lint the draft (or the one block you just added/edited), fix every
hit, then re-read clean and confirm zero violations. In Phase 2 you lint the touched block *and* run the
consistency scan (§2) over the whole file — one drifted block poisons the list.

Run every rule. Any fail → fix and re-run the section.

## 1. The feature template (every block, identical)

Each feature is exactly:

```markdown
### F<n> · <verb-led name, 3–6 words>
- **Persona:** <one role>
- **In → Out:** <one input> → <one output>
- **Feasibility:** <verdict> — <≤6-word evidence>
```

- [ ] Header matches `### F<n> · <name>` — `F` + an integer, a `·` separator, then a verb-led name of
  3–6 words. No marketing adjectives in the name (revolutionary, seamless, smart, powerful, AI-powered).
- [ ] **Exactly three fields, in this order:** Persona, In → Out, Feasibility. None missing, none extra,
  no reordering, no stray sub-bullets.
- [ ] Field labels are written identically everywhere — `**Persona:**`, `**In → Out:**`,
  `**Feasibility:**` — same bold, same spelling, same colon.
- [ ] Every `F<n>` number is unique. Numbers are never reused after removal and never renumbered.

## 2. Consistency scan (the list reads as one hand)

- [ ] Every block matches §1. A reader cannot tell which feature was added most recently — same shape,
  same density, same voice.
- [ ] Names are parallel in form (all verb-led: "Generate…", "Export…", "Match…") — not a mix of
  verb-phrases and noun-blobs.
- [ ] No duplicate features (two blocks with the same In → Out).

## 3. Atomic & defined (the anti-vagueness gate)

Vagueness, not size, is the failure. Each feature must be handoff-ready — the next pipeline step never
has to ask a follow-up about it.

- [ ] **In → Out is atomic:** contains a literal `→`, one input, one output. No "depending on…", no
  "and/or" list standing in for branching, no "etc.". If it branches, it's two features — split it.
- [ ] **Persona is a single named role** traceable to the brief's `## Target user` — never "various
  users", "anyone", or two roles joined by "and".
- [ ] **Feasibility is a verdict + evidence**, not a restatement: a verdict word
  (`self-serve` / `partnership-gated` / `cost-gated` / `data-gated` / `research-gated` /
  `feasibility-unconfirmed`) then `— <short evidence>`. Never a bare integration name, never a numeric
  operational limit.
- [ ] No `TBD`, no "it depends", no "varies by customer". If a field can't be filled without a
  placeholder, the feature isn't ready — tighten or cut it, never pad.

## 4. Feasibility-validated (is each feature actually buildable?)

- [ ] Each feature ran through the **feasibility pass** (`references/feasibility.md`): every external
  system it touches exists and is self-serve reachable; the core work is doable on a vibecode stack; the
  data it needs is accessible.
- [ ] No feature on the list is silently listed `self-serve` when its load-bearing integration is
  partnership-/cost-/data-/research-gated. A gated feature is either flagged with the honest verdict (so
  the user can cut/re-route it) or removed — not disguised.
- [ ] Any doubt nothing could settle is written `feasibility-unconfirmed — <what to verify>` and
  surfaced to the user — never a silent pass.

## 5. DRY boundary (the list never carries a downstream-owned fact)

`brief.md` is consumed, not restated. `scope.md` references it by anchor and carries only the feature
list. See PIPELINE.md for the ownership split.

- [ ] **No restated brief sentence.** A brief fact is referenced by anchor, not re-transcribed.
- [ ] **None of the cut sections appear:** no pricing or business-model fact; no `## Screens` or UI
  detail; no `## Data model`; no `## Constraints` / hard-constraints; no `## Out of scope` / Non-goals;
  no `## Context (from brief)`; no standalone persona/JTBD prose block. Any of these → FAIL (owned
  downstream).
- [ ] **No numeric operational limit** (SLA, rate limit, quota, retention window) in any field — those
  are `nfr.md`'s. Feasibility carries a reachability verdict, not a limit.
- [ ] Features trace to the brief's core capability / thinnest slice — not re-invented against it, not
  exceeding the brief's scope boundary.

## 6. No AI slop

- [ ] No marketing adjectives anywhere (revolutionary, seamless, robust, game-changing, cutting-edge).
- [ ] No narrative preamble or bottom-line essay beyond the one-line file header. No meta-commentary,
  no hedge-stacks.

## 7. The file was written / edited correctly

- [ ] **Phase 1:** `./spec/scope.md` was actually written (created `./spec/` if missing; overwritten if
  it existed). Output is file-backed — an in-chat draft does not satisfy the lint.
- [ ] **Phase 2:** the change was a **single surgical edit** to the named feature only — no other block
  was reflowed, reformatted, or renumbered. The rest of the file is byte-for-byte unchanged except the
  target block.

---
If a feature can't be written in the template without "it depends", it isn't ready. Tighten it or cut
it — never pad the template to make it fit. Size may grow as long as every feature is atomic, feasible,
consistent, and non-vague.
