---
name: shapeshot
description: Schema-first workflow for any task whose result is structured findings. Agree the exact output data shape with the user first (compact outline, loop until they say it fits), then lock it as a Zod 4 contract, fill it with an ingestion pipeline that validates and repairs, and present it through a data-driven template (JSON, Markdown or UI). Use for research, competitor or market analysis, comparisons, app page or flow design, data investigation, audits and inventories, and whenever the user wants findings they can check, reuse or re-render, even if they don't mention schemas or Zod. Also use it when the user is reviewing or changing a data shape or outline proposed earlier, or says an agreed shape "fits" and wants it built. Not for one-off quick answers the user will not check, reuse or re-render, or for designing an app's database schema.
---

# Shapeshot

Shape first, then shoot. Before any research, analysis or code, agree with the user on the exact data the result must hold. Then everything after that serves the shape: a Zod contract locks it, a pipeline fills it, a template shows it. Nothing outside the contract gets produced.

Why this works: most padding in agent output comes from not knowing what "done" looks like. A shape the user signed off on is a precise definition of done. It keeps the work focused, makes the result checkable by a machine, and lets the same data feed any number of views.

The workflow has two halves with a hard stop between them:

1. **Agree the shape** (steps 1 to 3): brief, propose, then loop with targeted questions until the shape is exact. Conversation only. No research, no files, no code.
2. **Build to the shape** (steps 4 to 7): only after the user says the shape fits.

When not to use it: a one-off question the user just wants answered ("which of these is cheapest?") with no wish to reuse, check or re-render the result. Answer it directly; the loop would cost more than the answer.

## 1. Brief: what the result is for

Start from what the user will do with the result: decide, build, compare, monitor, present. List the questions the result must answer for that. Every field you add later must answer one of them; if you can't say which, drop it.

Then name the grain: the things the result holds, and what one item of each list stands for ("one item = one pricing tier of one product"). Most shape mistakes are grain mistakes, and a user checks a grain in one glance, where a wrong field hides in twenty lines.

Don't do the research yet to find out what fields exist. A brief look is fine when you can't name the fields otherwise (for example, the columns of a data file the user gave you), but the work itself waits for agreement.

## 2. Propose the shape

Read `references/notation.md` (the Outline format the user agreed on) and `references/shaping.md` (grain, normalization, granularity) before you write the first shape.

Draft the shape, then run the shape check on it and fix what it finds before you show anything:

1. Each field answers a question from step 1. Fixed inputs from the user (the team size) go in the brief, not in fields.
2. Each list holds one kind of thing and has a count (`3..8`, `1+`). Open-ended lists invite padding.
3. Nothing is written twice. A thing used in two or more places becomes a top-level list with `id slug unique`, referenced with `→ list.id`. Things used once stay nested.
4. Each field the result will compare, sort, filter or compute is atomic, typed, and has its unit (`usdSeat num ≥0` plus `billing monthly | annual`, never `price str`). Enums where the values are known.
5. Free text only for what a person just reads, with a length cap.
6. Nothing finer than the questions need. No stored arithmetic: the template computes totals, ranks and picks.
7. `@src` on everything from research (prices, features, figures, strengths); not on facts the user gave or values computed from their data. Research shapes get `gaps? str 0+` at the root.
8. In proportion: a narrow question gets a narrow shape, often under 10 fields and one level deep; broad work 2 to 3 levels, rarely more.

Don't print the checklist; show its result. The reply has these parts, in this order, and nothing else:

1. **Brief**: what the result is for, as you read it, and the grain of each list. One or two lines.
2. **The shape** in Outline notation, in a code block.
3. **Decisions**: up to 3 one-line bullets on modelling calls the user might not expect (an entity split out, a value split into fields, something left coarse on purpose). Only when there are such calls.
4. **Questions**: up to 3, numbered, each targeted: it names a path, says what depends on it, and gives a default, so the user can answer in one word (`1. tiers.usdSeat — per seat or per workspace? Default: per seat.`). Only where the answer changes the shape.
5. **The presentation question**: *How should I present it: JSON only, a Markdown document, or a UI?* Only in the first round, and only if the user hasn't said.
6. **The closing ask**: *Does this shape fit? Say "fits", answer the questions, or tell me what to change.*

Fit the reply to the shape. A small, flat shape gets a one-line brief, no Decisions, and at most one question; the whole reply should be shorter than the shape. Spend the parts on broad or tricky shapes, where they pay off.

Example:

```
CompetitorAnalysis  — Pick a tracker for a 10-person startup
  asOf          date
  competitors   3
    name        str unique
    pricing     1+ @src
      tier      str
      usdSeat?  num ≥0          — per month; empty = contact sales
      billing   monthly | annual
    strengths   1..5  @src
      text      str ≤140
  verdict       str ≤400
  gaps?         str 0+
```

Then stop and wait. Don't start the work "to save time": if the shape changes, that work is wasted, and the user loses the chance to steer before it matters.

## 3. Loop until the shape fits

Each round makes the shape more exact. When the user answers or asks for changes:

1. Apply them. Read answers with defaults: "ok" or "yes" to a question means take the default.
2. Run the shape check again on what changed. If a requested change brings in duplication, a coarse field the result will sort or compare, or a field no question needs, apply it the way the user asked and flag it in one line with a better option. The user decides; you advise.
3. Show only what changed, as a change summary (format in `references/notation.md`):

```
~ competitors        3..8  →  5
+ competitors.share? pct @src     — market share estimate
- competitors.segment
```

4. Ask the questions still open, plus any the change raised, in the same targeted format. Don't ask again what the user answered, and don't repeat the presentation question. The list shrinks each round; when nothing is open, say so in a few words.
5. Ask the closing question again.

Show the full outline again only when the user asks, or when more than about a third of the lines changed. Don't add it "for reference" either: the user already has it, and a second copy makes them hunt for what changed.

When the user asks you to review or tighten a shape they wrote, treat it as the first proposal: run the shape check, and reply with Decisions (what you found, one line each), the change summary of your suggested fixes, targeted questions, and the closing ask.

Agreement means an explicit yes: "fits", "yes", "looks good", "go", "ship it", or a clear equivalent. Feedback that also says "otherwise fine" counts as a yes after you apply it, but still show the change summary. Silence, a new question, or "hmm" is not agreement. If the user agrees and asks for changes in one message, apply them, show the summary, and go on without asking again. Open questions at that point take their defaults; say which in one line.

If the user skips the loop ("just do it", "don't ask, pick a shape"), still run the shape check, show the shape in one block at the top of your reply, then go on. The shape stays the contract either way.

## 4. Lock it as a Zod contract

After agreement, read `references/zod-contract.md` and write `contract.ts`. It is a direct translation of the agreed outline: same names, same nesting, same counts, nothing added. Use Zod 4 (`zod@^4`, verified on 4.6):

- `z.strictObject` for every object, so unknown keys fail instead of slipping through.
- `.meta({ id, title, description, examples })` on named shapes and `.describe()` on fields, carrying the outline's `— descriptions`.
- `where` rules and `→` references become one `.superRefine()` on the root, with a `path` on every issue.
- Export the root schema (named and default) and its inferred type. Write `contract.schema.json` with `scripts/validate.mts contract.ts --schema contract.schema.json`, so non-TypeScript tools can use the contract too.

Save the agreed outline as `shape.md` beside it. The outline is the human source; the contract must match it line for line.

## 5. Fill it with an ingestion pipeline

Read `references/pipeline.md`. The pipeline's only job is to produce a `data.json` that passes the contract:

1. **Gather**: collect raw material (search, read files, query data) into `raw/`, keeping source URLs and timestamps for every `@src` claim.
2. **Normalize**: map raw material onto the contract's fields. Map, don't embellish: if the source doesn't say it, the field stays empty (when optional) and the question goes into `gaps`.
3. **Validate**: run `scripts/validate.mts` (or `safeParse` in your own ingest script).
4. **Repair**: fix only the paths the validator names, then validate again. Don't regenerate the whole file. Stop after 3 rounds and report what still fails.

Don't write anything the contract has no place for: no extra summary file, no notes section, no prose report outside the template. If you find something important that has no field, tell the user in one line and offer to extend the shape. Don't sneak it in.

## 6. Present it through a data-driven template

Use the presentation the user picked in step 2. If they didn't pick, ask now, in one line. Read `references/presentation.md` for the patterns.

- **JSON only**: `data.json` and `contract.schema.json` are the deliverable. Done.
- **Markdown**: write `render.ts`, which reads `data.json`, parses it with the contract, and writes `report.md`. Then run it.
- **UI**: write one self-contained `view.html` that renders whatever valid data it gets: data inlined in a `<script type="application/json" id="data">` block, or loaded from `data.json`.

The template is a function of the data. It holds layout, labels and formatting, never facts. No company names, numbers or findings appear in the template source. The test: swap in a different valid `data.json` and the output stays correct with no edits. Handle empty optional fields and empty lists in the template, so that gaps show as gaps.

## 7. Report back briefly

End with a short reply: the files and where they are, that `data.json` passes the contract (or what still fails), and the open `gaps`. Don't restate the findings in chat; the presentation does that. If the user wants a summary in chat, render it from the data like any other view.

## Files

Put everything in one folder. If the user names a place ("the current folder", a path), write the files directly there, with no extra subfolder. Otherwise use `shapeshot/<slug>/` in the working directory:

```
shape.md              agreed outline (human source)
contract.ts           Zod 4 contract (machine source)
contract.schema.json  JSON Schema emitted from the contract
ingest.ts             pipeline (when the data comes from code: files, APIs, queries)
raw/                  gathered material with sources
data.json             validated result
render.ts, report.md  Markdown presentation
view.html             UI presentation
```

When the agent gathers the data itself (for example, web research), `ingest.ts` is optional: write the records straight into `data.json` and validate it with `scripts/validate.mts`. The contract still decides what you collect.

## References

- `references/notation.md`: Outline notation, change summaries, worked examples. Read at step 2.
- `references/shaping.md`: grain, normalization, granularity, the shape check, targeted questions. Read at step 2, and again when a change touches entities or grain.
- `references/zod-contract.md`: outline to Zod 4 mapping and a contract template. Read at step 4.
- `references/pipeline.md`: gather, normalize, validate, repair. Read at step 5.
- `references/presentation.md`: Markdown and UI template patterns. Read at step 6.
- `scripts/validate.mts`: `npx -y tsx <skill-dir>/scripts/validate.mts contract.ts data.json` prints each failing path, or `OK`. Add `--schema contract.schema.json` to write the JSON Schema.
