# Brief lint — the second gate

The brief clears two gates: the three **content gates** (decide emit vs. refuse) and this **lint**
(decide emit vs. rewrite). Lint is a **double pass**: lint the draft, fix every hit, then re-read
the whole brief once more clean and confirm zero violations. Emit only on a clean second read — and
on a clean pass, the brief is **written to `./spec/brief.md`** (see *File written*, below).

This lint is **intelligent, not arithmetic**. Its job is not to count words or lines — it is to
exclude AI slop, demand defined (non-vague) structure, and confirm the thing is actually doable. A
long but concrete, justified, feasible brief passes; a short but vague or infeasible one fails. The
bar is **definiteness + feasibility + no slop**, never a raw count.

Run every rule against the draft. Any fail → fix that line, re-run the section.

## Structure
- [ ] Riskiest-assumption line is directly under the title: one sentence + risk-type + one "if wrong"
  clause. No second sentence.
- [ ] Every mandatory field for the stage is present (see `field-set.md`). No empty field, no `TBD`.
- [ ] Build seed has all four sub-lines filled with concrete content — no "it depends", no `TBD`.
- [ ] Field headings match the "Brief field anchors" subsection in `../../PIPELINE.md` **verbatim**
  (e.g. `## Build seed — what implementation needs to know`, `## Problem`, `## Target user`,
  `## Non-goals`) — they are the anchors mvp-scoping and collect-context parse. Do not rename or
  reorder them, and do not let two files independently define the strings: PIPELINE.md is the single
  authority.

## Tagging
- [ ] Every claim line ends with `[fact]` or `[assumption]` plus a provenance word. No untagged claim.
- [ ] No line is `[fact]` unless backed by observed past behaviour or a named capability. A
  compliment, prediction, or "people would love this" is `[assumption]`.

## No AI slop (anti-slop)
- [ ] No marketing adjectives (revolutionary, seamless, game-changing, robust, powerful, cutting-edge).
- [ ] No `Note:`, `Reframe:`, "Bottom line", or any meta-commentary / reframing paragraph anywhere.
- [ ] No field restates the idea back as prose, and no field restates another field's content.
- [ ] At most one parenthetical per field, and only if it carries a fact — no hedge-stacks, no filler.

## Only defined structure (the anti-vagueness gate)
Every field and every Build-seed sub-line must be concrete and handoff-ready — the kind of claim a
builder could act on without asking a follow-up question.
- [ ] One concrete, non-vague claim per field. Density and definiteness are the bar, **not** length;
  there is no word cap. A field fails when it is vague, not when it is long.
- [ ] `TBD`, `it depends`, `varies by customer`, or anything a downstream reader would have to ask
  about = vagueness = fail. (That is not the same as size.)
- [ ] Build seed is specific: **Key inputs / integrations** names the actual system(s); **Hard
  constraints** are testable; **Thinnest first slice** is one concrete shippable cut (one path,
  not a menu).

## Feasibility (is it doable?)
Feasibility rides on the skill's dynamic-verification step (see `dynamic-verification.md`, which now
carries feasibility as a first-class intent class). Before passing, confirm the **most
decision-relevant** named integrations / data sources / core capability actually exist and are
reachable, using whatever capabilities the environment offers (web search, MCP tools, sub-agents) —
do not assume.
- [ ] The named integrations / data sources in Build seed plausibly exist and are reachable (or the
  field is tagged `[assumption]` and called out for downstream verification — never passed as a
  silent `[fact]`).
- [ ] The core capability is technically achievable as stated; if verification **contradicted** a
  gate-field or a Build-seed feasibility claim (the named user/integration does not exist at scale or
  has no self-serve API, the market is saturated, the capability needs a custom model nobody ships),
  it is surfaced **loudly** in the riskiest-assumption line or the verification log — never buried.

## Honesty
- [ ] No false precision: a number with no source is `[assumption]`, never `[fact]`.
- [ ] Any contradicted gate-field is surfaced in the riskiest-assumption line or the verification log
  — never buried or softened.

## Counts are smell-tests, not gates
Counts never fail a brief on their own. A long field or a long verification log is a prompt to
re-check — is every line concrete, justified, and non-redundant? If yes, it passes; size is allowed
to grow as long as the whole stays definite and feasible. Flag bloat only when lines are redundant,
unjustified, or vague — judged intelligently, not by a number.

## File written
- [ ] On a clean second pass, the brief has been written to `./spec/brief.md` (relative to the
  current working directory; `./spec/` created if missing; existing `brief.md` overwritten).
- [ ] Output is file-only: report just the path; do **not** echo the full brief into chat.
- [ ] A blocked or refused brief (a content gate failed) is **never** written to file.

If a rule can't be satisfied because the input genuinely doesn't exist yet, that is a **content-gate
failure, not a lint failure** — return the blocked-response instead of padding the brief, and do not
write any file.
