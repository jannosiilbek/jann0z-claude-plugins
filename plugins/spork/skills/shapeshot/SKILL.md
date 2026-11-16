---
name: shapeshot
description: Schema-first workflow for any task whose result is structured findings. Agree the exact output data shape with the user first (compact outline, loop until they say it fits), then lock it as a Zod 4 contract, fill it with an ingestion pipeline that validates and repairs, and present it through a data-driven template (JSON, Markdown or UI). Use for research, competitor or market analysis, comparisons, app page or flow design, data investigation, audits and inventories, and whenever the user wants findings they can check, reuse or re-render, even if they don't mention schemas or Zod. Also use it when the user is reviewing or changing a data shape or outline proposed earlier, or says an agreed shape "fits" and wants it built.
---

# Shapeshot

Shape first, then shoot. Before any research, analysis or code, agree with the user on the exact data the result must hold. Then everything after that serves the shape: a Zod contract locks it, a pipeline fills it, a template shows it. Nothing outside the contract gets produced.

Why this works: most padding in agent output comes from not knowing what "done" looks like. A shape the user signed off on is a precise definition of done. It keeps the work focused, makes the result checkable by a machine, and lets the same data feed any number of views.

The workflow has two halves with a hard stop between them:

1. **Agree the shape** (steps 1 to 3): conversation only. No research, no files, no code.
2. **Build to the shape** (steps 4 to 7): only after the user says the shape fits.

## 1. Work out the shape

Start from what the user will do with the result: decide, build, compare, monitor, present. List the questions the result must answer for that, then derive the fields from those questions. Every field should answer one of them. If you can't say which question a field answers, drop it.

Keep it in proportion to the task:

- A narrow question gets a narrow shape: often under 10 fields, one level deep.
- A broad research or design task may need 2 to 3 levels, rarely more. Past 3 levels, flatten or split.
- Prefer enums over free text where the set of values is known; they make the data comparable.
- Put counts on lists (`3..8`, `1+`). An open-ended list invites padding.
- Mark everything that comes from research with `@src`: prices, plans, features, market figures, strengths and weaknesses, anything from the web or a document a reader may want to check. Facts the user gave you, and values computed from their data, don't need it.
- Fields describe what will be collected. Don't put expected values in descriptions (`name str — Linear, Jira`); fixed inputs from the user, like the team size, belong in the one-line reading above the shape, not as fields.
- Add a `gaps?` list at the root of research shapes, so unknowns have a place to go instead of being guessed.

Don't do the research yet to find out what fields exist. A brief look is fine when you can't name the fields otherwise (for example, the columns of a data file the user gave you), but the work itself waits for agreement.

## 2. Show the shape in Outline notation

Read `references/notation.md` before you write the first shape. It defines the Outline notation the user agreed on. In short:

```
CompetitorAnalysis  — Pick a tracker for a 10-person startup
  asOf          date
  competitors   3..8
    name        str unique
    segment     smb | mid | ent
    pricing     1+ @src
      tier      str
      usdSeat?  num ≥0          — empty = contact sales
    strengths   1..5  @src
      text      str ≤140
  verdict       str ≤400
  gaps?         str 0+
```

One field per line, nested by indent, a count after a name means a list of the fields below it. No braces, no colons, no Zod. The user should be able to read it in ten seconds and edit it by hand.

Your reply in this step has exactly these parts, and nothing else:

1. One line: what the result is for, as you read it.
2. The shape, in a code block.
3. At most 3 short questions, only where you are really unsure (a field you might be missing, a count, an enum's values). Skip this part when you're not unsure.
4. The presentation question, once: *How should I present it: JSON only, a Markdown document, or a UI?* Skip it if the user already said.
5. The closing ask: *Does this shape fit? Say "fits", or tell me what to change.*

Then stop and wait. Don't start the work "to save time": if the shape changes, that work is wasted, and the user loses the chance to steer before it matters.

## 3. Loop until the user says it fits

When the user asks for changes, apply them and show only what changed, as a change summary (format in `references/notation.md`):

```
~ competitors        3..8  →  5
+ competitors.share? pct @src     — market share estimate
- competitors.segment
```

Then ask the closing question again. Show the full outline again only when the user asks, or when more than about a third of the lines changed. Don't add it "for reference" either: the user already has it, and a second copy makes them hunt for what changed.

Agreement means an explicit yes: "fits", "yes", "looks good", "go", "ship it", or a clear equivalent. Feedback that also says "otherwise fine" counts as a yes after you apply it, but still show the change summary. Silence, a new question, or "hmm" is not agreement. If the user agrees and asks for changes in one message, apply them, show the summary, and go on without asking again.

If the user skips the loop ("just do it", "don't ask, pick a shape"), still show the shape in one block at the top of your reply, then go on. The shape stays the contract either way.

## 4. Lock it as a Zod contract

After agreement, read `references/zod-contract.md` and write `contract.ts`. It is a direct translation of the agreed outline: same names, same nesting, same counts, nothing added. Use Zod 4 (`zod@^4`, verified on 4.6):

- `z.strictObject` for every object, so unknown keys fail instead of slipping through.
- `.meta({ id, title, description, examples })` on named shapes and `.describe()` on fields, carrying the outline's `— descriptions`.
- `where` rules and `→` references become one `.superRefine()` on the root, with a `path` on every issue.
- Export the root schema, its inferred type, and write `contract.schema.json` with `z.toJSONSchema()` so non-TypeScript tools can use the contract too.

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
- `references/zod-contract.md`: outline to Zod 4 mapping and a contract template. Read at step 4.
- `references/pipeline.md`: gather, normalize, validate, repair. Read at step 5.
- `references/presentation.md`: Markdown and UI template patterns. Read at step 6.
- `scripts/validate.mts`: `npx -y tsx <skill-dir>/scripts/validate.mts contract.ts data.json` prints each failing path, or `OK`.
